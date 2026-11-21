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
- v0.3.0 → the "Release 0.3.0" commit (ring bus, altitude, standard recloser ratings, arrester MCOV).

## TODO (in priority order)
1. Self-audit facts vs bulletin (continue the log below: Tables 5-60/5-61, 5-57/5-58, 5-2, 5-25, 5-41, 5-59
   not yet re-read against page text); playtest all eight projects in the browser and the Windows build.
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
