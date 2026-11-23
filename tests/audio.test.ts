import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { chooseCandidate, conversionFactor, validateManifest } from '../scripts/audio-manifest.mjs';
import { loudnessMax, peakDb } from '../src/audio/loudness.mjs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { biquad, rms, toneLevel } from '../src/audio/dsp';
import { clearingDevice, energizeSpec, faultScenario } from '../src/audio/faults';
import { ALLOWED_AUDIO_LICENSES, ATTRIBUTION_LICENSES, AUDIO_CREDITS, LOUDNESS, SAMPLE_SLOTS, SAMPLE_SYSTEM_HZ, SAMPLES, type SampleSlot } from '../src/audio/samples';
import { arcOffsetDb, arcPowerMW, clearingSeconds, equipmentOffsetDb, HUM_HZ, renderArc, renderEnergize, renderEquipment, renderUi, SYSTEM_HZ, type ArcSpec } from '../src/audio/sounds';
import { ALL_KINDS, defaultProps } from '../src/engine/catalog';
import { reviewDesign } from '../src/engine/review';
import type { Finding } from '../src/engine/types';
import { CAMPAIGN } from '../src/levels';
import { SOLUTIONS } from '../src/levels/solutions';

const SR = 22050;

describe('equipment sounds', () => {
  it('every kind renders about two seconds of finite, unclipped sound', () => {
    for (const kind of ALL_KINDS) {
      const x = renderEquipment({ kind, kv: 69, props: defaultProps(kind) }, SR, 1);
      expect(x.length, kind).toBe(2 * SR);
      let peak = 0;
      let finite = true;
      for (const v of x) {
        finite &&= Number.isFinite(v);
        peak = Math.max(peak, Math.abs(v));
      }
      expect(finite, kind).toBe(true);
      expect(peak, kind).toBeGreaterThan(0.01);
      expect(peak, kind).toBeLessThanOrEqual(1);
    }
  });

  it('transformer hum sits at twice the system frequency, with harmonics, and nothing at 60 Hz', () => {
    const x = renderEquipment({ kind: 'transformer', kv: 69, props: { kva: 10_000, cooling: 'OA' } }, SR, 1);
    const mid = [Math.round(0.5 * SR), Math.round(1.5 * SR)] as const;
    const at = (f: number) => toneLevel(x, SR, f, ...mid);
    expect(HUM_HZ).toBe(2 * SYSTEM_HZ);
    expect(at(120)).toBeGreaterThan(at(240));
    expect(at(240)).toBeGreaterThan(at(360));
    expect(at(120)).toBeGreaterThan(20 * at(60));
    expect(at(120)).toBeGreaterThan(20 * at(90));
  });

  it('bigger transformers hum louder', () => {
    const level = (kva: number) => rms(renderEquipment({ kind: 'transformer', kv: 69, props: { kva, cooling: 'OA' } }, SR, 1));
    expect(level(30_000)).toBeGreaterThan(level(10_000));
    expect(level(10_000)).toBeGreaterThan(level(1_000));
  });

  it('switchgear makes mechanical sounds, not hum', () => {
    const x = renderEquipment({ kind: 'switch', kv: 12.47, props: {} }, SR, 1);
    expect(toneLevel(x, SR, 120)).toBeLessThan(0.01);
  });

  it('editor sounds render', () => {
    for (const n of ['bus', 'fence', 'erase', 'blocked', 'click'] as const) expect(rms(renderUi(n, SR, 1)), n).toBeGreaterThan(0.001);
  });
});

describe('arc faults', () => {
  const base: ArcSpec = { kv: 12.47, faultKA: 6, clearing: 'breaker', remoteS: 0.5, kind: 'phase' };

  it('burn as long as the clearing device takes', () => {
    expect(renderArc({ ...base, clearing: 'fuse' }, SR).arcSeconds).toEqual([clearingSeconds('fuse', 0.5)]);
    expect(renderArc(base, SR).arcSeconds).toEqual([7 / 60]);
    expect(renderArc({ ...base, clearing: 'remote' }, SR).arcSeconds).toEqual([0.5]);
    // A recloser trips, recloses onto the permanent fault and trips again.
    expect(renderArc({ ...base, clearing: 'recloser' }, SR).arcSeconds).toHaveLength(2);
    expect(clearingSeconds('fuse', 0.5)).toBeLessThan(clearingSeconds('recloser', 0.5));
    expect(clearingSeconds('recloser', 0.5)).toBeLessThan(clearingSeconds('breaker', 0.5));
    expect(clearingSeconds('breaker', 0.5)).toBeLessThan(clearingSeconds('remote', 0.5));
  });

  it('pulse at 120 Hz: the arc nearly goes out at every current zero', () => {
    const { pcm } = renderArc({ ...base, clearing: 'remote', remoteS: 1 }, SR, 2);
    // Envelope of the roar: rectify and smooth, then look for the 120 Hz periodicity.
    const env = pcm.map((v) => Math.abs(v));
    biquad(env, SR, 'lowpass', 400);
    const from = Math.round(0.2 * SR);
    const to = Math.round(0.9 * SR);
    expect(toneLevel(env, SR, 120, from, to)).toBeGreaterThan(3 * toneLevel(env, SR, 85, from, to));
    expect(toneLevel(env, SR, 120, from, to)).toBeGreaterThan(3 * toneLevel(env, SR, 155, from, to));
  });

  it('are louder while burning than after clearing, and longer when nothing in the station clears them', () => {
    const quick = renderArc(base, SR, 3).pcm;
    const slow = renderArc({ ...base, clearing: 'remote' }, SR, 3).pcm;
    const tEnd = 0.05 + 7 / 60;
    expect(rms(quick, Math.round(0.06 * SR), Math.round(tEnd * SR))).toBeGreaterThan(3 * rms(quick, Math.round((tEnd + 0.4) * SR), Math.round((tEnd + 0.6) * SR)));
    expect(slow.length).toBeGreaterThan(quick.length);
  });

  it('carry more power at higher voltage and fault current', () => {
    expect(arcPowerMW({ kv: 69, faultKA: 6, kind: 'phase' })).toBeGreaterThan(arcPowerMW({ kv: 12.47, faultKA: 6, kind: 'phase' }));
    expect(arcPowerMW({ kv: 12.47, faultKA: 12, kind: 'phase' })).toBeGreaterThan(arcPowerMW({ kv: 12.47, faultKA: 6, kind: 'phase' }));
    expect(arcPowerMW({ kv: 230, faultKA: 20, kind: 'phase' })).toBeGreaterThan(arcPowerMW({ kv: 69, faultKA: 9, kind: 'phase' }));
  });
});

describe('what energizing a design sounds like', () => {
  const l1 = CAMPAIGN.find((l) => l.id === 'l1-first-light')!;
  const finding = (checkId: string, itemIds: string[]): Finding => ({ id: `${checkId}#t`, checkId, severity: 'critical', category: 'clearance', title: `test ${checkId}`, detail: '', itemIds });

  it('a passing design closes in and the transformer hums', () => {
    const d = SOLUTIONS[l1.id]!();
    const r = reviewDesign(d, l1);
    expect(faultScenario(d, l1, r)).toBeNull();
    const spec = energizeSpec(d, l1, r)!;
    expect(spec.kva).toBeGreaterThan(0);
    expect(spec.closings).toContain('recloser');
    expect(rms(renderEnergize(spec, SR, 1))).toBeGreaterThan(0.01);
  });

  it('a flashover at a feeder getaway is cleared by that feeder recloser, at 12.47 kV', () => {
    const d = SOLUTIONS[l1.id]!();
    const r = reviewDesign(d, l1);
    r.findings.push(finding('clear.phase', ['FE1']));
    const s = faultScenario(d, l1, r)!;
    expect(s.arc.kv).toBe(12.47);
    expect(s.arc.clearing).toBe('recloser');
    expect(s.clearedBy).toBe('R1');
    expect(s.caption).toMatch(/recloser trips/);
  });

  it('a flashover on the high side is cleared by the transformer fuses, at 69 kV and the source fault level', () => {
    const d = SOLUTIONS[l1.id]!();
    const r = reviewDesign(d, l1);
    const t = d.items.find((i) => i.kind === 'transformer')!;
    const node = r.topo.nodeOfPort.get(`${t.id}:hv`)!;
    expect(d.items.find((i) => i.id === clearingDevice(r, node))?.kind).toBe('fuse');
    r.findings.push({ ...finding('clear.ground', []), conductorIds: [r.topo.nodeById.get(node)!.conductorIds[0]!] });
    const s = faultScenario(d, l1, r)!;
    expect(s.arc.kv).toBe(69);
    expect(s.arc.kind).toBe('ground');
    expect(s.arc.faultKA).toBe(l1.system.hvGroundFaultKA);
    expect(s.arc.clearing).toBe('fuse');
  });

  it('an unprotected transformer burns until the remote end clears it, and ruptures', () => {
    const d = SOLUTIONS[l1.id]!();
    const r = reviewDesign(d, l1);
    const t = d.items.find((i) => i.kind === 'transformer')!;
    r.findings.push(finding('prot.primary', [t.id]));
    const s = faultScenario(d, l1, r)!;
    expect(s.arc.kind).toBe('xfmr');
    expect(s.arc.clearing).toBe('remote');
    expect(s.arc.remoteS).toBe(l1.system.faultDurationS);
    expect(s.caption).toMatch(/tank ruptures/);
  });

  it('a 12.47 kV bus on the 69 kV side flashes over at 69 kV; an over-insulated 69 kV bus on the 12.47 kV side does not', () => {
    const d = SOLUTIONS[l1.id]!();
    d.conductors.find((c) => c.kv === 69)!.kv = 12.47;
    const r = reviewDesign(d, l1);
    expect(r.findings.some((f) => f.checkId === 'conn.voltage')).toBe(true);
    const s = faultScenario(d, l1, r)!;
    expect(s.arc.kind).toBe('insulation');
    expect(s.arc.kv).toBe(69);

    const d2 = SOLUTIONS[l1.id]!();
    d2.conductors.find((c) => c.kv === 12.47)!.kv = 69;
    const r2 = reviewDesign(d2, l1);
    expect(r2.findings.some((f) => f.checkId === 'conn.voltage')).toBe(true);
    expect(faultScenario(d2, l1, r2)?.arc.kind).not.toBe('insulation');
  });
});

describe('one loudness scale', () => {
  const targets = LOUDNESS.categories;
  const lufs = (x: Float32Array) => loudnessMax(x, SR);

  it('the meter reads a 0 dBFS 997 Hz sine at -3.01 LUFS (BS.1770 reference)', () => {
    for (const sr of [44100, 48000]) {
      const x = new Float32Array(sr);
      for (let i = 0; i < x.length; i++) x[i] = Math.sin((2 * Math.PI * 997 * i) / sr);
      expect(loudnessMax(x, sr)).toBeCloseTo(-3.01, 1);
    }
  });

  it('every placement sound sits at the equipment level (plus its small offset), under the peak ceiling', () => {
    const levels: number[] = [];
    for (const kind of ALL_KINDS) {
      for (const kv of [12.47, 69, 230]) {
        const v = { kind, kv, props: defaultProps(kind) };
        const x = renderEquipment(v, SR, 1);
        const want = targets.equipment + equipmentOffsetDb(v);
        expect(lufs(x), `${kind} ${kv} kV`).toBeLessThanOrEqual(want + 0.6);
        expect(lufs(x), `${kind} ${kv} kV`).toBeGreaterThanOrEqual(want - 3);
        expect(peakDb(x), `${kind} ${kv} kV`).toBeLessThanOrEqual(LOUDNESS.peakCeilingDb + 0.05);
        levels.push(lufs(x));
      }
    }
    // Quietest to loudest placement sound: no more than about 8 LU apart.
    expect(Math.max(...levels) - Math.min(...levels)).toBeLessThanOrEqual(8);
  });

  it('a 500 kVA and a 30 MVA transformer differ by at most 4 LU', () => {
    const at = (kva: number) => lufs(renderEquipment({ kind: 'transformer', kv: 69, props: { kva, cooling: 'OA' } }, SR, 1));
    expect(at(30_000) - at(500)).toBeLessThanOrEqual(4.1);
    expect(at(30_000)).toBeGreaterThan(at(500));
  });

  it('arcs are the loudest sounds, but within a few LU of the rest', () => {
    for (const kv of [12.47, 69, 115, 230]) {
      for (const clearing of ['fuse', 'recloser', 'breaker', 'remote'] as const) {
        const spec: ArcSpec = { kv, faultKA: 8, clearing, remoteS: 0.5, kind: 'phase' };
        const x = renderArc(spec, SR, 1).pcm;
        expect(lufs(x), `${kv} kV ${clearing}`).toBeLessThanOrEqual(targets.fault + arcOffsetDb(spec) + 0.6);
        expect(lufs(x), `${kv} kV ${clearing}`).toBeGreaterThanOrEqual(targets.fault - 6);
        expect(peakDb(x)).toBeLessThanOrEqual(LOUDNESS.peakCeilingDb + 0.05);
      }
    }
    expect(targets.fault - targets.equipment).toBeLessThanOrEqual(8);
    expect(targets.equipment - targets.ui).toBeLessThanOrEqual(6);
  });

  it('energizing and editor sounds sit at their levels', () => {
    const e = renderEnergize({ kv: 69, kva: 10_000, closings: ['switch', 'recloser'], fans: false }, SR, 1);
    expect(lufs(e)).toBeCloseTo(targets.energize, 0);
    for (const n of ['bus', 'fence', 'blocked'] as const) expect(lufs(renderUi(n, SR, 1)), n).toBeLessThanOrEqual(targets.ui + 0.6);
  });
});

describe('recorded clips', () => {
  const dir = fileURLToPath(new URL('../assets/audio/', import.meta.url));
  const files = readdirSync(dir).filter((f) => /\.(ogg|mp3|wav)$/i.test(f));
  const yml = parse(readFileSync(join(dir, 'recordings.yml'), 'utf8'));
  const recs = new Map<string, { id: string; page: string; license: string; mainsHz: number | null; title: string }>(yml.recordings.map((r: { id: string }) => [r.id, r]));

  it('the manifest is valid: every recording has a licence we may ship, its page, and a native mains frequency or null', () => {
    expect(validateManifest(yml)).toEqual([]);
    expect([...yml.licenses].sort()).toEqual([...ALLOWED_AUDIO_LICENSES].sort());
    for (const r of recs.values()) expect([50, 60, null], r.id).toContain(r.mainsHz);
  });

  it('every bundled file is a slot clip described in sounds.json, and every slot has its file', () => {
    expect(files.sort()).toEqual(Object.values(SAMPLES).map((s) => s!.file).sort());
    expect(Object.keys(SAMPLES).sort()).toEqual([...SAMPLE_SLOTS].sort());
    expect(Object.keys(yml.slots).sort()).toEqual([...SAMPLE_SLOTS].sort());
  });

  it('each slot uses the recording the native-frequency rule picks, converted only when it must be', () => {
    expect(SAMPLE_SYSTEM_HZ).toBe(yml.systemHz);
    for (const [slot, s] of Object.entries(yml.slots) as Array<[SampleSlot, { candidates: Array<{ recording: string; start: number; end: number; followsMains: boolean }> }]>) {
      const c = chooseCandidate(s.candidates, yml.systemHz, recs);
      const info = SAMPLES[slot]!;
      expect(info.recording, slot).toBe(c.recording);
      const f = conversionFactor(c, recs.get(c.recording), yml.systemHz);
      expect(info.converted?.factor ?? 1, slot).toBeCloseTo(f, 6);
      if (info.converted) expect(info.converted.toHz).toBe(yml.systemHz);
    }
  });

  it('a 50 Hz version would prefer recordings made on 50 Hz and convert the 60 Hz ones', () => {
    const pick = (slot: string, hz: number) => chooseCandidate(yml.slots[slot].candidates, hz, recs).recording;
    expect(recs.get(pick('arc', 60))!.mainsHz).toBe(60);
    expect(recs.get(pick('arc', 50))!.mainsHz).toBe(50);
    expect(recs.get(pick('transformer-hum', 50))!.mainsHz).toBe(50);
  });

  it('every clip is at its category loudness (short impulses may fall short) and under the peak ceiling', () => {
    for (const [slot, info] of Object.entries(SAMPLES)) {
      const target = LOUDNESS.categories[info!.category];
      expect(info!.loudnessLufs, slot).toBeLessThanOrEqual(target + 0.5);
      if (!info!.limited) expect(info!.loudnessLufs, slot).toBeGreaterThanOrEqual(target - 0.5);
      expect(info!.peakDb, slot).toBeLessThanOrEqual(LOUDNESS.peakCeilingDb + 0.1);
      expect(info!.hitS, slot).toBeLessThan(info!.durationS);
    }
  });

  it('credits link to each recording\'s page (not a download) with a licence that allows commercial use', () => {
    const used = new Set(Object.values(SAMPLES).map((s) => s!.recording));
    expect(AUDIO_CREDITS.map((c) => c.id).sort()).toEqual([...used].sort());
    for (const c of AUDIO_CREDITS) {
      const r = recs.get(c.id)!;
      expect(c.page).toBe(r.page);
      expect(c.page).not.toMatch(/UPLOAD|\/download\/|\.(wav|ogg|mp3)$/i);
      expect(ALLOWED_AUDIO_LICENSES as readonly string[]).toContain(c.license);
      if (ATTRIBUTION_LICENSES.has(c.license)) expect(c.modified.length, `${c.id} must say how it was changed`).toBeGreaterThan(0);
    }
  });
});
