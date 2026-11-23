# Recorded sounds

The game synthesizes all of its sounds (`src/audio/sounds.ts`) and layers recorded clips from this
folder over them. Both are normalized to one loudness scale, so no sound is much louder or quieter
than the rest.

| File | What it is |
|---|---|
| `recordings.yml` | **Source of truth.** Every recording considered (used or not): library, title, author, page, licence, sha256, native mains frequency with the measured evidence, and a verdict. Then the slots, each with its candidate clips (start, end, filters) in order of preference, and the loudness targets. |
| `<slot>.ogg` | One clip per slot, built by the script below. Do not edit by hand. |
| `sounds.json` | Generated description of the built clips, read by the game: which recording each clip came from, any frequency conversion, where its main transient falls, its measured loudness and peak, and the credits. |

## Rebuilding the clips

```bash
node scripts/build-audio.mjs /path/to/original/downloads
```

The folder holds the original recordings (the same files as listed in `recordings.yml`; names do not
matter because files are matched by sha256). It is not part of the repository. Needs `ffmpeg` and
`ffprobe` with libvorbis. The build is deterministic: the same inputs give byte-identical files.

For each slot the script:

1. picks the first candidate recorded on the system frequency (`systemHz`, 60 for the campaign's US
   cooperatives), or the first candidate if none is;
2. trims it, mixes it to mono and, if the clip follows mains frequency (hum, arcs, corona) and was
   recorded on the other frequency, resamples it by `systemHz / mainsHz` (100 Hz becomes 120 Hz);
3. high-passes and fades it, normalizes it to its category's maximum momentary loudness (ITU-R
   BS.1770, the same meter as `src/audio/loudness.mjs` uses for the synthesized sounds) and limits
   its peaks to the ceiling;
4. encodes Ogg Vorbis, decodes it again, measures it and records the result in `sounds.json`.

`--system-hz 50` builds for a 50 Hz country: candidates recorded on 50 Hz are then preferred and the
60 Hz ones converted down.

## Native mains frequency

`mainsHz` is measured. For each recording the analysis compares the harmonic comb at k × 100 Hz with
the comb at k × 120 Hz (k = 1..4, each peak against the local noise; 600 Hz is ignored because it
belongs to both). A clear comb gives 50 or 60 Hz, and `mainsEvidence` records the numbers. Recordings
of switchgear and impacts have no mains component (`null`) and are never converted.

## Adding a recording

1. Add it to `recordings:` with its page (credit the page, never the download link), licence,
   sha256, `mainsHz` and evidence, and a verdict.
2. Add it as a candidate to a slot, before the current one if it should win on its frequency.
3. Run the build, then `npm test`: `tests/audio.test.ts` checks the manifest, the licences, that each
   slot uses the recording the native-frequency rule picks, the loudness of every clip, and that the
   credits link to the recordings' pages.

Allowed licences: CC0 1.0, CC-BY 3.0/4.0 and OGA-BY 3.0/4.0. CC-BY recordings are credited on the
Credits screen with what was changed. Not allowed: CC-BY-NC, Sampling+, CC-BY-SA, GPL, and the Sonniss
GDC bundle EULA (which forbids supplying the sounds as files, so they must never be committed to this
public repository; a Sonniss sound would need private storage and a release-time download).
