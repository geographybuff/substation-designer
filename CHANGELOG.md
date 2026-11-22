# Changelog

All notable changes to Substation Designer are documented here. The project follows
[Semantic Versioning](https://semver.org/); each release is a git tag `vX.Y.Z` with Windows and web
builds attached on the [GitHub Releases page](https://github.com/geographybuff/substation-designer/releases).

## [Unreleased]

## [0.4.0] - 2026-11-22

### Added
- Campaign help: every finding and every unmet objective in the Review tab has a "Help me fix this"
  link with plain-language steps in game terms, a small one-line diagram where it helps (feeder bay,
  recloser and regulator bypass, transformer primary, arresters, straight terminal entry, taps,
  mobile pad, sectionalized bus), a Field Guide link, and a Show me button that selects and frames
  the equipment involved, pulses the right toolbox entry and turns on the relevant overlay.
  Mechanical fixes (such as assigning a getaway to a free feeder or lining equipment up with its bus)
  offer a one-click "Do it for me" that can be undone. Settings → Show tips turns this off.
- Tutorials for projects 2-8 that walk through each project's new ideas (voltage regulation and
  recloser bypass, shielding and arresters, mobile pad and removal routes, N-1 and the sectionalized
  bus, the ground grid, the ring bus and line relaying, altitude corrections), each step with a
  Show me button and a "Still needed" list.
- New check: the phases of one bus need Table 4-7 metal-to-metal clearance from each other too, so a
  jog or U-turn shorter than two phase spacings is flagged (critical).
- New check: a bus that enters a terminal from the side squeezes the phase connections together; run
  the bus straight out of the terminal (major).
- Alignment guide: equipment placed or dragged within 0.75 m of the line of a terminal or bus in front
  of it snaps into line, so buses run straight in.

### Changed
- First Light tutorial: the feeder-bay step now says there are two feeders, explains that a feeder is
  the outgoing line ending at a Feeder Getaway, how to branch a bus, and lists what is still needed.
- Plan view draws the three phase lines with mitred corners (the same geometry as the 3D view).

### Fixed
- 3D view: a bus junction looked different depending on the order its buses were drawn in. Runs are
  now split where one ends on another, the straightest pair forms the main run, a second straight
  pair passes beneath it with one riser per phase, and other branches tap in. Junctions at a corner no
  longer put risers on the wrong phase or make buses appear to pass through each other, and bus
  supports keep clear of junctions.
- 3D view: jumpers from a bus to a terminal pair each phase with the nearest bushing instead of
  crossing at random.

## [0.3.0] - 2026-11-21

### Added
- Project 7, *Ring Around*: a 115 kV ring-bus switching station with four lines and no
  transformation. Line protection is checked per protection zone, so meshed schemes (ring bus,
  breaker-and-a-half) are judged by the set of breakers that isolates each line or source
  (sections 4.6.4 and 12.4.2).
- Project 8, *Thin Air*: a 115/24.9 kV station at 2400 m (8000 ft), the bulletin's own worked example.
- High-altitude corrections above 1000 m (3300 ft): standard BILs are derated by Table 4-3 and the
  clearances of the selected BIL are used (section 4.9, Table 4-9), so footprints, bus heights and
  clearance checks grow; equipment is priced at the higher insulation class. Transformer ratings
  derate per Table 5-2, continuous-current ratings per Tables 5-25, 5-41, 5-59, 5-34 and 4-10, and
  reclosers need a higher voltage class per the Table 5-59 voltage factor. A Field Guide article
  explains the procedure.
- Standard recloser ratings from Tables 5-60 (oil) and 5-61 (vacuum), chosen in the Inspector.
- Arrester MCOV selection (Eq. 5-7) and lightning protective margin check (section 5.8.7), shown in
  the Inspector.
- Chapter 3 design-process data and research notes; the 4 in. (0.10 m) minimum surface-layer
  thickness (section 9.10.2).
- New objective type: keep the (altitude-corrected) clearances.

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
- Arrester class check (station, intermediate, distribution; section 5.8.2).
- Mouse-driven editor interaction test in CI and the release gate.

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
