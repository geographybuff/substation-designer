#!/usr/bin/env node
/**
 * Builds the game's recorded sound clips from assets/audio/recordings.yml.
 *
 *   node scripts/build-audio.mjs <download-folder> [--system-hz 50|60]
 *
 * <download-folder> holds the original recordings (any names: files are matched by sha256). For each
 * slot the script picks the first candidate recorded on the system frequency, or else the first
 * candidate, converted (resampled by systemHz / mainsHz when the clip follows mains frequency). It
 * trims, mixes to mono, filters, fades, normalizes to the slot category's loudness with the same
 * BS.1770 meter the game uses (src/audio/loudness.mjs), limits peaks, and encodes Ogg Vorbis to
 * assets/audio/<slot>.ogg. It then decodes each file again, measures it, and writes
 * assets/audio/sounds.json, which the game reads. Needs ffmpeg and ffprobe with libvorbis.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { loudnessMax, normalizeLoudness, peakDb } from '../src/audio/loudness.mjs';
import { chooseCandidate, conversionFactor, validateManifest } from './audio-manifest.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const AUDIO = join(ROOT, 'assets/audio');
const SR = 48000;

const args = process.argv.slice(2);
const folder = args.find((a) => !a.startsWith('--'));
if (!folder) {
  console.error('usage: node scripts/build-audio.mjs <download-folder> [--system-hz 50|60]');
  process.exit(2);
}
const manifest = parse(readFileSync(join(AUDIO, 'recordings.yml'), 'utf8'));
const hzArg = args.indexOf('--system-hz');
const systemHz = hzArg >= 0 ? Number(args[hzArg + 1]) : manifest.systemHz;
if (systemHz !== 50 && systemHz !== 60) throw new Error(`system frequency must be 50 or 60 Hz, not ${systemHz}`);

// --- Validate the manifest ------------------------------------------------------------------
const problems = validateManifest(manifest);
if (problems.length) throw new Error(`recordings.yml:\n  ${problems.join('\n  ')}`);
const recordings = new Map(manifest.recordings.map((r) => [r.id, r]));

// --- Find the source files by hash ---------------------------------------------------------
const byHash = new Map();
for (const name of readdirSync(folder)) {
  const p = join(resolve(folder), name);
  if (!statSync(p).isFile()) continue;
  byHash.set(createHash('sha256').update(readFileSync(p)).digest('hex'), p);
}

const ffprobe = (file) => {
  const [rate, channels] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate,channels', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim().split(',').map(Number);
  return { rate, channels };
};
const decode = (file, filters = [], extra = []) => {
  const buf = execFileSync('ffmpeg', ['-v', 'error', ...extra, '-i', file, ...(filters.length ? ['-af', filters.join(',')] : []), '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4).slice();
};
const round = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d;

const tmp = mkdtempSync(join(tmpdir(), 'build-audio-'));
const out = { generatedBy: 'scripts/build-audio.mjs from assets/audio/recordings.yml', systemHz, loudness: manifest.loudness, slots: {}, credits: [] };
const credits = new Map();
try {
  for (const [slot, s] of Object.entries(manifest.slots)) {
    const c = chooseCandidate(s.candidates, systemHz, recordings);
    const r = recordings.get(c.recording);
    const src = byHash.get(r.sha256);
    if (!src) throw new Error(`${slot}: ${r.id} (${r.file}, sha256 ${r.sha256.slice(0, 12)}…) is not in ${folder}`);
    const { rate, channels } = ffprobe(src);
    const factor = conversionFactor(c, r, systemHz);
    const dur = (c.end - c.start) / factor;
    const filters = [];
    const ch = c.channels ?? 'mix';
    if (channels > 1) filters.push(ch === 'left' ? 'pan=mono|c0=c0' : ch === 'right' ? 'pan=mono|c0=c1' : 'pan=mono|c0=0.5*c0+0.5*c1');
    if (factor !== 1) filters.push(`asetrate=${rate * factor}`);
    filters.push(`aresample=${SR}`);
    if (c.highpass) filters.push(`highpass=f=${c.highpass}`);
    if (c.fadeIn) filters.push(`afade=t=in:d=${c.fadeIn}`);
    if (c.fadeOut) filters.push(`afade=t=out:st=${round(Math.max(0, dur - c.fadeOut), 4)}:d=${c.fadeOut}`);
    const x = decode(src, filters, ['-ss', String(c.start), '-to', String(c.end)]);
    const target = manifest.loudness.categories[s.category];
    normalizeLoudness(x, SR, target, manifest.loudness.peakCeilingDb);
    const raw = join(tmp, `${slot}.f32`);
    const file = `${slot}.ogg`;
    const encode = () => {
      writeFileSync(raw, Buffer.from(x.buffer));
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', raw, '-c:a', 'libvorbis', '-q:a', '5', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', join(AUDIO, file)]);
      return decode(join(AUDIO, file));
    };
    // Measure what the game will actually play; lossy encoding can push peaks over the ceiling.
    let y = encode();
    const over = peakDb(y) - manifest.loudness.peakCeilingDb;
    if (over > 0.1) {
      const g = 10 ** (-(over + 0.1) / 20);
      for (let i = 0; i < x.length; i++) x[i] *= g;
      y = encode();
    }
    let hit = 0;
    for (let i = 1; i < y.length; i++) if (Math.abs(y[i]) > Math.abs(y[hit])) hit = i;
    const lufs = loudnessMax(y, SR);
    const entry = {
      file,
      category: s.category,
      recording: r.id,
      clip: { start: c.start, end: c.end },
      mainsHz: r.mainsHz,
      followsMains: !!c.followsMains,
      converted: factor !== 1 ? { fromHz: r.mainsHz, toHz: systemHz, factor: round(factor, 6) } : null,
      durationS: round(y.length / SR),
      hitS: round(hit / SR),
      loudnessLufs: round(lufs, 1),
      peakDb: round(peakDb(y), 1),
      // Short impulses cannot reach the target without exceeding the peak ceiling.
      limited: lufs < target - 0.5,
    };
    out.slots[slot] = entry;
    const changes = [`clip ${c.start}–${c.end} s`, ...(channels > 1 ? ['mixed to mono'] : []), ...(factor !== 1 ? [`sped up ×${round(factor, 3)} (${r.mainsHz} → ${systemHz} Hz mains)`] : []), ...(c.highpass ? [`high-passed at ${c.highpass} Hz`] : []), 'faded', 'loudness-normalized', 'Ogg Vorbis'];
    const cr = credits.get(r.id) ?? { id: r.id, title: r.title, author: r.author, library: r.library, page: r.page, license: r.license, slots: [], modified: [] };
    cr.slots.push(slot);
    cr.modified.push(`${slot}: ${changes.join(', ')}`);
    credits.set(r.id, cr);
    console.log(`${slot.padEnd(16)} ${r.id.padEnd(10)} ${factor !== 1 ? `${r.mainsHz}→${systemHz} Hz` : 'native   '}  ${entry.durationS.toFixed(2)} s  ${entry.loudnessLufs} LUFS (target ${target})  peak ${entry.peakDb} dBFS`);
  }
  out.credits = [...credits.values()].map((c) => ({ ...c, modified: c.modified.join('; ') }));
  for (const f of readdirSync(AUDIO)) if (/\.(ogg|mp3|wav)$/i.test(f) && !Object.values(out.slots).some((s) => s.file === f)) unlinkSync(join(AUDIO, f));
  writeFileSync(join(AUDIO, 'sounds.json'), `${JSON.stringify(out, null, 2)}\n`);
  console.log(`wrote ${Object.keys(out.slots).length} clips and assets/audio/sounds.json for a ${systemHz} Hz system`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
