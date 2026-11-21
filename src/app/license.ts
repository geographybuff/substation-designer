/**
 * License acceptance. The full LICENSE file is bundled into the game; players
 * must accept it before playing. Acceptance is tied to a hash of the license
 * text, so any change to the terms requires accepting again.
 */
import licenseText from '../../LICENSE?raw';
import { load, save } from './persist';
import { desktop } from './desktop';

export const LICENSE_TEXT: string = licenseText;
export const LICENSE_NAME = 'PolyForm Noncommercial License 1.0.0';

/** FNV-1a 32-bit hash of the license text, used as its version. */
export function licenseHash(text: string = LICENSE_TEXT): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

interface Acceptance {
  hash: string;
  acceptedAt: string;
}

export function isLicenseAccepted(): boolean {
  const a = load<Acceptance | null>('license', null);
  return !!a && a.hash === licenseHash();
}

export function acceptLicense(): void {
  const rec: Acceptance = { hash: licenseHash(), acceptedAt: new Date().toISOString() };
  save('license', rec);
  desktop?.recordLicenseAcceptance?.(rec.hash);
}

export function declineLicense(): void {
  desktop?.quit?.();
}

export const LICENSE_SUMMARY: string[] = [
  'You may play, copy, modify and share Substation Designer for free, for any noncommercial purpose.',
  'You may not use it commercially — for example, you may not sell it or modified versions of it, or otherwise monetize it.',
  'It comes as is, without any warranty, and the licensor is not liable for damages arising from its use, as far as the law allows.',
  'This summary is for convenience only; the full license text below is what you are agreeing to.',
];
