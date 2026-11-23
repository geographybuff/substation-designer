/**
 * Rules for assets/audio/recordings.yml, shared by scripts/build-audio.mjs and the tests.
 */

/**
 * The candidate a slot uses on a power system of `systemHz`: the first one recorded on that mains
 * frequency (or not tied to mains frequency at all), else the first candidate, which is then converted.
 */
export function chooseCandidate(candidates, systemHz, recordings) {
  return candidates.find((c) => !c.followsMains || recordings.get(c.recording).mainsHz === systemHz) ?? candidates[0];
}

/** Resampling factor for a clip on a `systemHz` system (1 when no conversion is needed). */
export function conversionFactor(candidate, recording, systemHz) {
  return candidate.followsMains && recording.mainsHz !== systemHz ? systemHz / recording.mainsHz : 1;
}

/** Problems with a parsed manifest (empty when it is valid). */
export function validateManifest(m) {
  const errors = [];
  const ids = new Map();
  for (const r of m.recordings ?? []) {
    if (ids.has(r.id)) errors.push(`duplicate recording ${r.id}`);
    ids.set(r.id, r);
    if (!m.licenses.includes(r.license)) errors.push(`${r.id}: licence ${r.license} is not allowed`);
    if (!/^https:\/\//.test(r.page ?? '')) errors.push(`${r.id}: page must be an https URL`);
    if (!/^[0-9a-f]{64}$/.test(r.sha256 ?? '')) errors.push(`${r.id}: sha256 missing`);
    if (!(r.mainsHz === null || r.mainsHz === 50 || r.mainsHz === 60)) errors.push(`${r.id}: mainsHz must be 50, 60 or null`);
    if (!r.mainsEvidence) errors.push(`${r.id}: mainsEvidence missing`);
    for (const k of ['title', 'author', 'library', 'file', 'verdict']) if (!r[k]) errors.push(`${r.id}: ${k} missing`);
  }
  if (m.systemHz !== 50 && m.systemHz !== 60) errors.push('systemHz must be 50 or 60');
  for (const [slot, s] of Object.entries(m.slots ?? {})) {
    if (!(s.category in m.loudness.categories)) errors.push(`${slot}: unknown category ${s.category}`);
    if (!s.candidates?.length) errors.push(`${slot}: no candidates`);
    for (const c of s.candidates ?? []) {
      const r = ids.get(c.recording);
      if (!r) {
        errors.push(`${slot}: unknown recording ${c.recording}`);
        continue;
      }
      if (c.followsMains && r.mainsHz === null) errors.push(`${slot}: ${c.recording} follows mains frequency but has no mainsHz`);
      if (!(c.end > c.start)) errors.push(`${slot}: clip end must be after start`);
      if (c.end > r.durationS + 0.01) errors.push(`${slot}: clip ends after the recording (${r.durationS} s)`);
    }
  }
  return errors;
}
