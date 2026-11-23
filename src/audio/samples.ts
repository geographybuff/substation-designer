/**
 * Optional recorded samples. Any audio file in assets/audio/ whose name is one of
 * SAMPLE_SLOTS is bundled into the build (inlined as a data URL, so it works from
 * file:// in the desktop app and in the single-file web build) and layered under
 * the synthesized sound for that slot. With no files there the game uses the
 * synthesized sounds alone. Every file must be listed in assets/audio/credits.json
 * with a licence that allows commercial use and redistribution; tests/audio.test.ts
 * enforces it.
 */
import credits from '../../assets/audio/credits.json';

export const SAMPLE_SLOTS = ['transformer-hum', 'arc', 'flashover', 'breaker', 'recloser', 'switch', 'fuse', 'corona'] as const;
export type SampleSlot = (typeof SAMPLE_SLOTS)[number];

/** Licences a shipped sound may carry (SPDX ids, plus OpenGameArt's OGA-BY). */
export const ALLOWED_AUDIO_LICENSES = ['CC0-1.0', 'CC-BY-3.0', 'CC-BY-4.0', 'OGA-BY-3.0', 'OGA-BY-4.0'] as const;
/** Licences that must carry an in-game credit. */
export const ATTRIBUTION_LICENSES: ReadonlySet<string> = new Set(['CC-BY-3.0', 'CC-BY-4.0', 'OGA-BY-3.0', 'OGA-BY-4.0']);

export interface AudioCredit {
  file: string;
  title: string;
  author: string;
  source: string;
  license: string;
  /** How the file was changed from the original (CC-BY asks for this). */
  modified?: string;
}

export const AUDIO_CREDITS: readonly AudioCredit[] = credits as AudioCredit[];

const FILES = import.meta.glob('../../assets/audio/*.{ogg,mp3,wav}', { eager: true, query: '?inline', import: 'default' }) as Record<string, string>;

/** Data URL of the sample for a slot, if one is bundled. */
export function sampleUrl(slot: SampleSlot): string | undefined {
  for (const [path, url] of Object.entries(FILES)) {
    const base = path.split('/').pop()!.replace(/\.[^.]+$/, '');
    if (base === slot) return url;
  }
  return undefined;
}
