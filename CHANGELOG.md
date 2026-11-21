# Changelog

All notable changes to Substation Designer are documented here. The project follows
[Semantic Versioning](https://semver.org/); each release is a git tag `vX.Y.Z` with Windows and web
builds attached on the [GitHub Releases page](https://github.com/geographybuff/substation-designer/releases).

## [Unreleased]

## [0.2.0] - 2026-11-21

### Added
- 3D view of the substation (Tab) with Low/Medium/High graphics presets: renders only when something
  changes, honours the frame-rate cap, scales shadows, model detail, scenery, resolution and
  anti-aliasing. Low is about 13x lighter than High. Falls back to the plan view without WebGL; the
  desktop build keeps software WebGL when hardware acceleration is off.
- Ground grid design and safety evaluation following Chapter 9 (the IEEE Std 80 method): surface
  layer and Cs (Table 9-4, 3000 ohm-m minimum), tolerable touch/step voltage (50 kg), grid resistance,
  IG = Df x Sf x 3I0, GPR, mesh and step voltage, conductor sizing (Eq. 9-11), fence bonding and the
  3 ft perimeter rule.
- Protective relaying checks (Chapter 12): feeder, line, bus-tie and transformer relays, and the
  fuse-versus-relay transformer size guidance (section 12.4.4.1).
- Projects 4-6: *Mobile Ready* (mobile transformer provisions, removal routes, 24.9 kV),
  *Growing Pains* (two transformers, sectionalized bus with tie breaker, N-1, expansion space) and
  *Touch and Step* (ground grid design).
- Field Guide articles on grounding, relaying, arresters, reclosers, instrument transformers, site
  design, auxiliary systems, automation and communications, maintenance, and each bus scheme.
- Cited data for Chapters 6, 9, 12, 14-21 and sections 5.8-5.11.

### Changed
- Transformer impedances from Table 5-11 and fan-cooled ratings from section 5.2.2; regulator
  capability from Table 5-28; the bulletin's 1890 A figure for 3 in. aluminum pipe bus.
- Planned maintenance in the simulation follows its schedule instead of occurring at random.

## [0.1.0] - 2026-11-21

First playable release.

### Added
- Plan-view substation editor: place equipment at each system voltage, draw three-phase bus with
  terminal and junction snapping, fence the yard, add lightning masts and shield wires, undo/redo,
  autosave.
- Live design review with findings that cite RUS Bulletin 1724E-300 sections, tables and figures:
  - fence safety clearance zone (Fig. 4-21) and outdoor electrical clearances (Table 4-7);
  - feeder and transformer primary protection, isolation switches and bypass facilities (§4.3);
  - voltage regulation, surge arresters and arresters on the line side of fuses (§4.3.3, §4.3.5);
  - direct-stroke shielding by the fixed-angle method (Fig. 4-17) or rolling sphere (Eq. 4-1 to 4-3);
  - transformer ratings with fan-cooled stages and standard impedances (§5.2, Table 5-11),
    regulator range vs current (Table 5-28), interrupting and continuous ratings;
  - equipment removal routes (§4.2.6) and switching-scheme recognition with Table 4-1 costs.
- Reliability model and a narrated multi-year operations simulation (failure rates and costs are
  labelled game assumptions).
- Campaign of three projects — *First Light*, *Keep the Lights On*, *Thunderstorm Alley* — with a
  guided tutorial, plus a Sandbox.
- Field Guide with tables generated from the same cited data the checks use.
- Graphics settings with Low/Medium/High presets, resolution scale, frame-rate cap, animation and
  2D-only options; hardware-acceleration toggle on the desktop build.
- Windows desktop build (installer with license page, portable exe, zip) and a single-file web build.
- License acceptance required before installing (installer) and before playing (all builds).
- PolyForm Noncommercial License 1.0.0.
