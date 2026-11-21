/**
 * Release gate: fails if license acceptance is not enforced in the release
 * configuration. Run in CI before any tagged release is published.
 *  - LICENSE is the PolyForm Noncommercial 1.0.0 text with a Required Notice
 *  - the NSIS installer shows build/license.txt (identical to LICENSE)
 *  - LICENSE is shipped inside the packaged app
 *  - the game bundle contains the license gate and the full license text
 *  - the version in package.json matches the git tag (when GITHUB_REF_NAME is set)
 */
import { readFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';

const fail = (m) => {
  console.error(`release check failed: ${m}`);
  process.exit(1);
};
const license = await readFile('LICENSE', 'utf8');
if (!license.startsWith('Required Notice:')) fail('LICENSE must start with the Required Notice line');
if (!license.includes('# PolyForm Noncommercial License 1.0.0')) fail('LICENSE is not PolyForm Noncommercial 1.0.0');
if (!license.includes('## No Liability')) fail('LICENSE lacks the No Liability section');

const builder = await readFile('electron-builder.yml', 'utf8');
if (!/nsis:[\s\S]*?\n\s+license:\s*build\/license\.txt/.test(builder)) fail('NSIS installer must show build/license.txt');
if (!/oneClick:\s*false/.test(builder)) fail('NSIS must be an assisted installer so the license page is shown');
if (!/from:\s*LICENSE/.test(builder)) fail('LICENSE must be shipped with the app (extraFiles)');
const installerLicense = await readFile('build/license.txt', 'utf8').catch(() => fail('build/license.txt missing (run scripts/prepare-build.mjs)'));
if (installerLicense !== license) fail('build/license.txt differs from LICENSE');

for (const dir of ['dist', 'dist-web']) {
  let files;
  try {
    files = readdirSync(dir, { recursive: true }).filter((f) => /\.(js|html)$/.test(String(f)));
  } catch {
    continue;
  }
  const bundle = (await Promise.all(files.map((f) => readFile(`${dir}/${f}`, 'utf8')))).join('\n');
  if (!bundle.includes('license-gate')) fail(`${dir}: license gate missing from the game bundle`);
  if (!bundle.includes('strict obligations and conditions to all your licenses')) fail(`${dir}: full license text missing from the game bundle`);
}

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const tag = process.env.GITHUB_REF_NAME;
if (tag && tag.startsWith('v') && tag.slice(1) !== pkg.version) fail(`tag ${tag} does not match package.json version ${pkg.version}`);
if (pkg.license !== 'PolyForm-Noncommercial-1.0.0') fail('package.json license field must be PolyForm-Noncommercial-1.0.0');
console.log('release checks passed: license acceptance is enforced');
