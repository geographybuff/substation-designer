# Development handoff

Compact status notes so work can resume quickly (e.g. after a usage-limit reset).

## What exists
- **Game**: TypeScript + Vite + Preact. Entry `src/main.tsx` → `src/app/App.tsx` (license gate → screens).
- **Engine** (`src/engine/`, pure, unit-tested): `catalog.ts` (equipment, footprints from Table 4-7/4-8
  spacings), `topology.ts` (union-find nodes, reachability), `checks/` (physical: Fig. 4-21 fence zone,
  Table 4-7 clearances, removal paths; electrical: protection, isolation/bypass, regulation, arresters;
  protection: Ch. 12 relays; ratings), `lightning.ts` (fixed angle 30°/45°, rolling sphere), `calc.ts`
  (loads, fault levels with Table 5-11 %Z), `reliability.ts` (expected outage minutes; rates are game
  assumptions), `simulation.ts` (narrative run), `schemes.ts` (§4.6 recognition), `review.ts`
  (orchestrates everything, objectives, stars), `costs.ts` (game estimates), `grounding.ts` (Ch. 9 via
  `evaluateRectangularGrid`, tested vs Tables 9-1/9-3 and IEEE 80 Annex B), `site.ts` (site altitude, set
  by `startLevel`/`reviewDesign`/`withLevel`: §4.9 clearance class via `clearanceClassFor`, Table 5-2 and
  current derating factors; footprints and clearance checks call `clearanceClassFor`, never
  `voltageClassFor`, except the Fig. 4-21 fence zone which has its own altitude rule).
- **3D** (`src/render3d/`, merged from the agent worktree): `createView3D`, presets in `config.ts`; lazy
  loaded via `src/app/view3dLoader.ts`; dev harness `view3d-harness.html?preset=low|medium|high`.
- **Data** (`src/data/bulletin/`): cited extractions. `voltageClasses.ts` (lead), agent A: transformers,
  breakers, regulators, airSwitches, environment, layout, capacitors, insulatorsConductors, mobile,
  rigidBus. Agent B: grounding, arresters, reclosers, relaying, site, auxiliary, instrumentTransformers,
  maintenance, communications (designProcess + civil-protection notes pending its final report).
- **Editor** (`src/editor/`): Canvas2D `planView.ts` (render on demand, graphics settings), `controller.ts`
  (tools: select/place/bus/fence/shield wire/erase), `drawItems.ts`.
- **Levels** (`src/levels/`): L1–L8 + sandbox in `campaign.ts`; `solutions.ts` holds a reference design per
  level (tests assert each passes with 3 stars); `tutorial.ts` conditions. Masts in solutions came from a
  greedy coverage search (see git history of tests for the snippet).
- **Content**: `src/content/guide.ts` (hand-written articles) + `fromData.ts` (generated from Guidance data).
- **Campaign help** (0.4.0): `src/content/help.ts` (types, lookup by checkId with dotted-prefix fallback) and
  `helpEntries.ts` (a "Help me fix this" entry per check and objective: steps, Show me target, diagram, Field
  Guide link, optional one-click fix). UI: `HelpPanel.tsx`, `HelpDiagram.tsx` (inline SVG one-lines), wired in
  `ReviewPanel` and the tutorial card; `Editor.tsx` implements Show me (select + frame, pulse the toolbox entry,
  overlay). Gated by Settings → Show tips; not shown in the sandbox. `tests/help.test.ts` asserts coverage.
  Every campaign level has a tutorial; steps can wait on `objective:<kind>` (see `levels/tutorial.ts`).
- **Bus geometry** (0.4.0): phase lines use `offsetPolyline` (engine/geometry) in plan and 3D. 3D junctions
  (`render3d/conductors.ts`): runs are split where another run ends on them, the straightest pair at a junction
  is the main run, a second straight pair crosses beneath with one riser per phase, other branches tap; levels
  step down by `levelStep`; bus supports keep clear of junctions. Checks `clear.selfphase` (phases of one bus
  folding at a jog < 2 × phase spacing) and `conn.sideentry` (bus entering a terminal from the side);
  `alignPlacement` snaps equipment into line while placing/dragging, `alignItemToBus` is the one-click fix.
  Dev: `view3d-harness.html?scenario=/tests/dev/scenarios.ts&v=<name>` renders junction variants or `sol:<levelId>`.
- **Desktop/release**: `electron/main.cjs` + `preload.cjs`, `electron-builder.yml` (NSIS with license page,
  portable, zip), `scripts/` (icon, prepare-build, verify-release, release-notes), `.github/workflows/`
  (`ci.yml`; `release.yml` triggered by pushing a `v*` tag).
- **Tests**: `npm test` (vitest), `node e2e/smoke.mjs dist` and `node e2e/smoke.mjs dist-web/index.html`
  (license gate + gameplay), `xvfb-run -a node e2e/electron-smoke.mjs` (desktop shell).

## Releases / tags
- The development session cannot push tags (git proxy returns 403 for refs other than the working branch).
  The repository owner creates tags: `git tag -a vX.Y.Z <commit> -m "..." && git push origin vX.Y.Z`.
  The release workflow then builds and publishes. Planned tags are listed in CHANGELOG.md.

## Planned tags (create from the repo owner's machine)
- v0.1.0 → commit 2da59f1 (first playable). v0.2.0 → 3214868 ("Finalize 0.2.0 changelog").
- v0.3.0 → 2002786 ("Release 0.3.0": ring bus, altitude, standard recloser ratings, arrester MCOV).
- v0.4.0 → the "Release 0.4.0" commit on the `claude/sleepy-newton-26ko2v` branch once its PR is merged
  (campaign help, tutorials for every project, bus junction and terminal-entry fixes).

## TODO (in priority order)
1. Self-audit facts vs bulletin (continue the log below; Table 5-60 not yet re-read against page text); playtest all eight projects in the browser and the Windows build.
2. Optional mechanics: the §4.9 arrester alternative to raising BIL at altitude (keep standard BIL when
   arresters protect the derated BIL with margin); breaker rated-maximum-voltage altitude factor.
3. More levels if wanted: breaker-and-a-half at 230 kV; capacitor bank level (Ch. 5.6).
4. 1.0.0 once playtesting is done (all agents used: 3 of 4; the user asked not to start more).
- Dev helpers for reference solutions (skipped in `npm test` unless `LV` is set):
  `LV=<levelId> npx vitest run tests/dev/solution-debug.test.ts --reporter=verbose --silent=false` (findings),
  `tests/dev/mast-search.test.ts` (greedy mast search, `MH=<height>`).

## Self-audit log (facts re-checked against page text)
Tables 4-1, 4-2, 4-6, 4-7, 4-8, Fig. 4-17 (30°/45°), Fig. 4-21 A/B, §4.7.3 shield wire 8900 N / 805 m,
Table 5-11 rows, Table 5-28 (+668 A footnote), §5.2.2 fan uprates 15%/25%, §12.4.4.1 5/10/30 MVA fuse
thresholds, §5.8.2 station class at 10,000 kVA, §9.10.2 3000 Ω·m surface minimum, §9.10.10 0.91 m
perimeter rule, §2 8 ft fence (7 ft fabric + 1 ft barbed wire). Grounding equations cross-checked with
IEEE 80 Annex B (tests/grounding.test.ts).
0.3.0 additions re-read: Table 4-3 (BIL factors), §4.9 p. 156 altitude procedure and Table 4-9 (550/650/750 →
473/559/645 kV), Table 4-10, Table 5-2 (0.4/0.0/0.5/0.5/0.0 %), Table 5-25, Tables 5-33/5-34 (0.4/0.5 % per
100 m), Table 5-41, Table 5-59 (and the §5.9.1.3 text), Table 5-61 lines 9 (27 kV, 560 A, 10 kA) and 10 (38 kV,
560 A, 12 kA; "suggested standard for future design"), Table 5-57 (all 46 MCOV rows), Table 5-58 station-class
8/20 µs discharge ranges (the bulletin's 13.1 kV row lists L-G 4.56 kV, evidently a typo). Still to re-read:
Table 5-60.
