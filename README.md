# Substation Designer

A game about designing rural electric substations, built on the engineering guidance in
**USDA Rural Utilities Service (RUS) Bulletin 1724E-300, *Design Guide for Rural Substations*** (June 2001).

You lay out a substation yard, connect the equipment, choose ratings, shield it from lightning and fence it,
then energize it to see whether it is safe, reliable and on budget. Every design-review finding cites the
section, table, figure or page of the bulletin it comes from, so every rule in the game can be traced back
to the source.

## Download and play

Get the latest build from the [Releases page](https://github.com/geographybuff/substation-designer/releases):

- **Windows installer** — `SubstationDesigner-Setup-<version>.exe`
- **Windows portable** — `SubstationDesigner-<version>-portable.exe` (no installation)
- **Windows zip** — `SubstationDesigner-<version>-win-x64.zip`
- **Web** — `SubstationDesigner-<version>-web.html`, a single file that runs in any modern browser

You must accept the license before installing or playing. The Windows builds are not code-signed, so
Windows SmartScreen may ask you to confirm the first run ("More info" → "Run anyway").

**Older or low-end PCs:** use *Settings → Graphics quality → Low*, or turn the 3D view off for 2D-only mode
(no WebGL needed). On the desktop build you can also turn off hardware acceleration if the screen stays black.

## How it plays

1. Read the project brief from a (fictional) rural electric cooperative: voltages, load forecast, fault
   levels, site conditions and budget.
2. Build in plan view: line terminals, disconnect switches, fuses, circuit switchers, breakers, reclosers,
   transformers, regulators, arresters, lightning masts, the fence and more. Draw the bus between them.
3. Watch the live design review. Findings range from critical (safety, protection, clearances) to minor,
   each with a citation you can open in the Field Guide.
4. Press **Energize** to commission the substation. The cooperative accepts it if there are no critical
   findings, the objectives are met and it is within budget. A multi-year simulation then shows outages,
   maintenance, lightning and load growth.

Controls: wheel to zoom, right-drag or Space+drag to pan, **R** rotate, **B** bus, **F** fence, **Del** delete,
**Ctrl+Z / Ctrl+Y** undo/redo, **Tab** plan/3D.

## Build from source

Requires Node.js 22.

```bash
npm ci
npm run dev          # play in the browser at http://localhost:5173
npm test             # unit tests (engine, checks, levels)
npm run build        # desktop bundle in dist/
npm run build:web    # single-file web build in dist-web/index.html
npm run dist:win     # Windows installer, portable exe and zip in release/ (best on Windows)
```

Releases are produced by GitHub Actions when a `vX.Y.Z` tag is pushed (see `.github/workflows/release.yml`).
The release job fails unless license acceptance is enforced in both the installer and the game.

## Accuracy and sources

Engineering values (clearances, insulation levels, fence clearances, shielding angles, equipment ratings,
etc.) are taken from RUS Bulletin 1724E-300 and stored with page citations in `src/data/bulletin/`.
Some things a game needs are not in the bulletin — equipment costs, failure rates, repair times — and are
clearly labelled as game assumptions in the code and in the in-game Field Guide.

## Disclaimer

Substation Designer is an independent educational game. It is **not** affiliated with, sponsored by or
endorsed by the U.S. Department of Agriculture or the Rural Utilities Service. Gameplay simplifies real
engineering, and some values are game assumptions rather than bulletin data. **Do not use this game to
design, build or operate real electrical facilities.**

## License

Substation Designer is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE).

In plain terms (this summary is not a substitute for the license text, which governs):

- You may play, copy, modify and share the game for free, for any **noncommercial** purpose.
- You may **not** use it for commercial purposes, including selling it or modified versions, or
  otherwise monetizing it.
- The software comes **as is, without any warranty**, and the licensor is not liable for damages arising
  from its use, as far as the law allows.

Release builds ask you to accept the license before installing or playing.

RUS Bulletin 1724E-300 is a publication of the U.S. government. Some tables and figures in the bulletin are
reproduced there with permission from IEEE, NEMA and other organizations; the game uses factual values and
paraphrased guidance with citations rather than reproducing those materials.
