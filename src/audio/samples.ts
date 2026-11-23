/**
 * Recorded clips built by scripts/build-audio.mjs from assets/audio/recordings.yml: one Ogg Vorbis
 * file per slot, loudness-normalized to its category, plus assets/audio/sounds.json describing them
 * (source recording, licence, page to credit, native mains frequency and any conversion, where the
 * main transient falls). The files are inlined as data URLs, so they work from file:// in the desktop
 * app and in the single-file web build. The game layers each clip over the synthesized sound for the
 * same event; tests/audio.test.ts checks the files, the manifest and the licences agree.
 */
import manifest from '../../assets/audio/sounds.json';

export type LoudnessCategory = 'ui' | 'equipment' | 'energize' | 'fault';

export interface SampleInfo {
  file: string;
  category: LoudnessCategory;
  recording: string;
  clip: { start: number; end: number };
  mainsHz: number | null;
  followsMains: boolean;
  converted: { fromHz: number; toHz: number; factor: number } | null;
  durationS: number;
  /** Time of the loudest instant (the transient a mechanical clip is aligned on). */
  hitS: number;
  loudnessLufs: number;
  peakDb: number;
  limited: boolean;
}

export interface AudioCredit {
  id: string;
  title: string;
  author: string;
  library: string;
  /** The recording's page (credit links here, not to the download). */
  page: string;
  license: string;
  slots: string[];
  /** How the clips differ from the original (CC-BY asks for this). */
  modified: string;
}

export const SAMPLE_SLOTS = ['transformer-hum', 'corona', 'flashover', 'arc', 'breaker', 'recloser', 'switch', 'fuse', 'gate', 'relay', 'blast'] as const;
export type SampleSlot = (typeof SAMPLE_SLOTS)[number];

/** Licences a shipped sound may carry (SPDX ids, plus OpenGameArt's OGA-BY). */
export const ALLOWED_AUDIO_LICENSES = ['CC0-1.0', 'CC-BY-3.0', 'CC-BY-4.0', 'OGA-BY-3.0', 'OGA-BY-4.0'] as const;
/** Licences that must carry an in-game credit. */
export const ATTRIBUTION_LICENSES: ReadonlySet<string> = new Set(['CC-BY-3.0', 'CC-BY-4.0', 'OGA-BY-3.0', 'OGA-BY-4.0']);

/** Power-system frequency the clips were built for (Hz). */
export const SAMPLE_SYSTEM_HZ: number = manifest.systemHz;
/** Loudness targets shared with the synthesized sounds: maximum momentary loudness (LUFS) per category. */
export const LOUDNESS: { categories: Record<LoudnessCategory, number>; peakCeilingDb: number } = manifest.loudness;
export const SAMPLES: Readonly<Partial<Record<SampleSlot, SampleInfo>>> = manifest.slots as Partial<Record<SampleSlot, SampleInfo>>;
export const AUDIO_CREDITS: readonly AudioCredit[] = manifest.credits;

const FILES = import.meta.glob('../../assets/audio/*.{ogg,mp3,wav}', { eager: true, query: '?inline', import: 'default' }) as Record<string, string>;

/** Data URL of the clip for a slot, if one is bundled. */
export function sampleUrl(slot: SampleSlot): string | undefined {
  const info = SAMPLES[slot];
  if (!info) return undefined;
  for (const [path, url] of Object.entries(FILES)) if (path.endsWith(`/${info.file}`)) return url;
  return undefined;
}
