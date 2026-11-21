/**
 * Prepares desktop packaging: copies LICENSE to build/license.txt, which the
 * NSIS installer shows on its license page (the user must click "I Agree").
 */
import { copyFile, readFile, access } from 'node:fs/promises';
await copyFile('LICENSE', 'build/license.txt');
await access('build/icon.png');
const lic = await readFile('build/license.txt', 'utf8');
if (!lic.includes('PolyForm Noncommercial License 1.0.0')) throw new Error('LICENSE does not look like the PolyForm Noncommercial license');
console.log('build/license.txt updated from LICENSE');
