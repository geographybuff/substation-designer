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
  `evaluateRectangularGrid`, tested vs Tables 9-1/9-3 and IEEE 80 Annex B).
- **3D** (`src/render3d/`, merged from the agent worktree): `createView3D`, presets in `config.ts`; lazy
  loaded via `src/app/view3dLoader.ts`; dev harness `view3d-harness.html?preset=low|medium|high`.
- **Data** (`src/data/bulletin/`): cited extractions. `voltageClasses.ts` (lead), agent A: transformers,
  breakers, regulators, airSwitches, environment, layout, capacitors, insulatorsConductors, mobile,
  rigidBus. Agent B: grounding, arresters, reclosers, relaying, site, auxiliary, instrumentTransformers,
  maintenance, communications (designProcess + civil-protection notes pending its final report).
- **Editor** (`src/editor/`): Canvas2D `planView.ts` (render on demand, graphics settings), `controller.ts`
  (tools: select/place/bus/fence/shield wire/erase), `drawItems.ts`.
- **Levels** (`src/levels/`): L1–L6 + sandbox in `campaign.ts`; `solutions.ts` holds a reference design per
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
- v0.1.0 → commit 2da59f1 (first playable). v0.2.0 → the "Release 0.2.0" commit.

## TODO (in priority order)
1. Commit agent B's final edits (designProcess.ts, docs/research/civil-protection-notes.md) when it reports.
2. Arrester MCOV/class checks (arresters.ts `selectMinimumMov`), recloser rating tables (reclosers.ts).
3. More levels: 115 kV ring-bus switching station (lines out), high-altitude site (Table 2-2/4-3).
4. Self-audit facts vs bulletin; playtest; 1.0.0.
