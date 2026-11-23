/**
 * Checks that the version files and CHANGELOG.md agree, so a release can be
 * tagged and its notes written.
 *   node scripts/check-release.mjs          current package.json version (CI)
 *   node scripts/check-release.mjs 0.5.0    about to tag 0.5.0 (Tag release workflow)
 * Always: package.json and package-lock.json carry the version, and
 * CHANGELOG.md has a non-empty "## [X.Y.Z] - YYYY-MM-DD" section for it.
 * With a version argument, also: nothing is left under "## [Unreleased]",
 * since those entries would be missing from the release notes.
 */
import { readFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const changelog = await readFile('CHANGELOG.md', 'utf8');
const tagging = process.argv[2] !== undefined;
const version = process.argv[2] ?? pkg.version;
const problems = [];

/** Text of a "## [name]" section, found the same way scripts/release-notes.mjs does. */
function section(name) {
  const start = changelog.indexOf(`## [${name}]`);
  if (start < 0) return undefined;
  const rest = changelog.slice(start);
  const next = rest.indexOf('\n## [', 4);
  const text = next > 0 ? rest.slice(0, next) : rest;
  const [heading, ...body] = text.split('\n');
  return { heading, body: body.join('\n').trim() };
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`::error::version "${version}" must look like 1.2.3 (no leading "v")`);
  process.exit(1);
}
if (pkg.version !== version) {
  problems.push(
    `package.json version is ${pkg.version}, not ${version}; run: npm version ${version} --no-git-tag-version`,
  );
}
if (lock.version !== version || lock.packages?.['']?.version !== version) {
  problems.push(
    `package-lock.json version is ${lock.version}, not ${version}; run: npm version ${version} --no-git-tag-version`,
  );
}

const entry = section(version);
const wanted = `## [${version}] - YYYY-MM-DD`;
if (!entry) {
  problems.push(`CHANGELOG.md has no "${wanted}" section`);
} else {
  const date = entry.heading.slice(`## [${version}]`.length);
  if (!/^ - \d{4}-\d{2}-\d{2}$/.test(date)) {
    problems.push(`CHANGELOG.md heading "${entry.heading}" must be exactly "${wanted}"`);
  }
  if (!entry.body) problems.push(`CHANGELOG.md section for ${version} is empty`);
}

if (tagging) {
  const unreleased = section('Unreleased');
  if (unreleased?.body) {
    problems.push(
      `CHANGELOG.md still has entries under "## [Unreleased]"; move them into the ${version} section`,
    );
  }
}

if (problems.length) {
  for (const p of problems) console.error(`::error::${p}`);
  process.exit(1);
}
console.log(`Version ${version} is ready: package.json, package-lock.json and CHANGELOG.md agree.`);
