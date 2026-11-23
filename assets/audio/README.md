# Recorded sound samples (optional)

The game synthesizes all of its sounds (`src/audio/sounds.ts`): equipment hum, switchgear, and
arcing faults whose voltage, fault current and clearing time come from the design. Recorded samples
dropped into this folder are layered on top for extra realism. With the folder empty the game sounds
complete.

## Adding a sample

1. Name the file after its slot: `transformer-hum`, `arc`, `flashover`, `breaker`, `recloser`,
   `switch`, `fuse` or `corona` (see `SAMPLE_SLOTS` in `src/audio/samples.ts`), as `.ogg`, `.mp3` or
   `.wav`. Use mono OGG Vorbis, 44.1 or 48 kHz, trimmed to 3 s or less, so the files stay small:
   they are inlined into both builds.
2. Add an entry to `credits.json`:
   ```json
   { "file": "arc.ogg", "title": "Flashover discharge 280KV", "author": "jensfelger",
     "source": "https://freesound.org/s/367454/", "license": "CC0-1.0",
     "modified": "trimmed to 2 s, mono, normalized" }
   ```
3. Run `npm test`. `tests/audio.test.ts` fails if a file has no credit, has a licence outside the list
   below, or does not match a slot. The Credits screen lists every entry.

European recordings hum at 100 Hz (50 Hz mains). North American equipment hums at 120 Hz, so speed
them up by 1.2, for example
`ffmpeg -i in.wav -af "asetrate=48000*1.2,aresample=48000" -ac 1 -c:a libvorbis -q:a 4 out.ogg`.

## Licences

| Licence | Allowed | Notes |
|---|---|---|
| CC0 1.0 | Yes | No attribution needed (a credit is still listed). |
| CC-BY 3.0 / 4.0 | Yes | Credit title, author, link, licence and changes. The Credits screen does this. |
| OGA-BY 3.0 / 4.0 | Yes | OpenGameArt's CC-BY without the DRM clause. |
| CC-BY-SA | No | Allowed for commercial use, but edited files must stay BY-SA. Kept out for simplicity. |
| CC-BY-NC, Sampling+ | No | Non-commercial. |
| GPL / LGPL | No | Unclear for media assets. |
| Sonniss GDC bundle EULA | No (not here) | Commercial use in a finished game is allowed, but the EULA forbids supplying the sounds as files, so they must never be committed to this public repository. |

If a sound with a Sonniss-style licence is ever needed, keep it in private storage (a private
repository or bucket the team controls), and have the release workflow download it with a
repository secret and check its SHA-256 before `npm run build`. Do not link to the files from this
repository.

## Where the candidates are

Three of the four libraries ask automated agents not to download their audio (BigSoundBank's
`ai.txt` and `robots.txt` disallow `/UPLOAD/`; OpenGameArt's `robots.txt` blocks AI agents) and
Freesound needs a login, so download in a browser. Shortlist from the November 2026 research, not
yet auditioned; check the licence shown on each page when you download:

| Slot | Candidate | Licence (as listed) |
|---|---|---|
| transformer-hum | BigSoundBank 2437 "Electric transformer #4" (https://bigsoundbank.com/s2437.html), 50 Hz | CC0 |
| transformer-hum | BigSoundBank 0064 "Electric transformer #1" (https://bigsoundbank.com/s0064.html), 50 Hz | CC0 |
| transformer-hum | Freesound 395223 "substation1.wav" by AGC66 (https://freesound.org/s/395223/) | CC0 |
| corona | Freesound 347046 "765 kilo-volt transmission lines buzzing and crackling" by johnaudiotech (https://freesound.org/s/347046/), 60 Hz | CC0 |
| flashover | Freesound 367454 "Flashover discharge 280KV.wav" by jensfelger (https://freesound.org/s/367454/) | CC0 |
| arc | Freesound 210878 "highvoltagearc.wav" by Sclolex (https://freesound.org/s/210878/) | CC0 |
| breaker, recloser | BigSoundBank 1092 "Electric circuit breaker" (https://bigsoundbank.com/s1092.html), trip and reclose | CC0 |
| breaker | Freesound 139970 "Switch.Big.Power.wav" by jessepash (https://freesound.org/s/139970/) | CC0 |
| switch | BigSoundBank 0235 "Iron bar falls #2" (https://bigsoundbank.com/s0235.html), as a metal clank | CC0 |

Avoid these, which turned up in searches but are non-commercial: Freesound 325551, 537470, 721295
and 117740 (CC-BY-NC).
