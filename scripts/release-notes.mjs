/**
 * Prints GitHub release notes for a version: the CHANGELOG section plus
 * download, license and disclaimer notes and checksums.
 *   node scripts/release-notes.mjs 0.1.0 artifacts/SHA256SUMS.txt
 */
import { readFile } from 'node:fs/promises';
const [version, sumsFile] = process.argv.slice(2);
if (!version) throw new Error('usage: release-notes.mjs <version> [sums]');
const changelog = await readFile('CHANGELOG.md', 'utf8');
const start = changelog.indexOf(`## [${version}]`);
if (start < 0) throw new Error(`CHANGELOG.md has no section for ${version}`);
const rest = changelog.slice(start);
const next = rest.indexOf('\n## [', 4);
const section = (next > 0 ? rest.slice(0, next) : rest).split('\n').slice(1).join('\n').trim();
const sums = sumsFile ? (await readFile(sumsFile, 'utf8')).trim() : '';
console.log(`${section}

## Downloads

| File | What it is |
| --- | --- |
| \`SubstationDesigner-Setup-${version}.exe\` | Windows installer (64-bit). Shows the license; you must accept it to install. |
| \`SubstationDesigner-${version}-portable.exe\` | Windows portable executable — no installation needed. |
| \`SubstationDesigner-${version}-win-x64.zip\` | Windows app folder, unzip and run \`Substation Designer.exe\`. |
| \`SubstationDesigner-${version}-web.html\` | Single-file web version — open it in any modern browser. |

Every build asks you to accept the license before you can play. The Windows builds are not code-signed, so Windows SmartScreen may ask you to confirm before the first run ("More info" → "Run anyway").

Low-end PCs: choose **Settings → Graphics quality → Low**, or turn off the 3D view for 2D-only mode. On the desktop build you can also turn off hardware acceleration.

## License

Substation Designer is licensed under the [PolyForm Noncommercial License 1.0.0](https://github.com/geographybuff/substation-designer/blob/main/LICENSE): free to play, copy and modify for noncommercial purposes; no commercial use or monetization; provided as is, without warranty or liability.

Independent educational game based on USDA RUS Bulletin 1724E-300; not affiliated with or endorsed by USDA or the Rural Utilities Service. Not for real engineering use.
${sums ? `\n## SHA-256 checksums\n\n\`\`\`\n${sums}\n\`\`\`` : ''}`);
