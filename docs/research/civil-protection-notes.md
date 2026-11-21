# Grounding, protection, site & auxiliary notes (RUS Bulletin 1724E-300)

Source: USDA RUS Bulletin 1724E-300, "Design Guide for Rural Substations" (June 2001). Page = PDF page.

The data modules are in `src/data/bulletin/`:
- `grounding.ts` (Ch. 9)
- `relaying.ts` (Ch. 12, App. F/G)
- `arresters.ts` (§5.8)
- `reclosers.ts` (§5.9)
- `site.ts` (Ch. 6, App. C, §8.4, Table 11-2)
- `auxiliary.ts` (Ch. 15-16)
- `instrumentTransformers.ts` (§5.10-5.11)
- `maintenance.ts` (Ch. 18-21)
- `communications.ts` (Ch. 14, 17)
- `designProcess.ts` (Ch. 3, App. A/B)

Every exported datum carries a `Citation`. Anything doubtful has a note starting `UNCERTAIN:`. Guidance text is paraphrased.

## (a) Rules a design check could enforce

### Grounding (Chapter 9). Evaluator: `evaluateRectangularGrid()`, which returns pass/fail plus `GridWarning[]`

| # | Rule | Cite |
|---|------|------|
| G1 | **Pass/fail.** If GPR = IG·Rg is below the tolerable touch voltage, the grid passes; only add access to equipment grounds. Otherwise both checks must hold: mesh Em < Etouch **and** step Es < Estep. If either fails, revise (closer spacing, more rods). | §9.10.2 steps 11-15, pp. 549-550 |
| G2 | **Tolerable voltages.** Etouch = (1000 + 1.5·Cs·ρs)·k/√ts and Estep = (1000 + 6·Cs·ρs)·k/√ts, where k = 0.116 (50 kg) or 0.157 (70 kg). IB = k/√ts holds only for 0.03 s ≤ ts ≤ 3 s. | Eqs 9-12, 9-16..9-19, pp. 539, 545 |
| G3 | **Surface layer factor.** Cs comes from Fig 9-35 at K = (ρ−ρs)/(ρ+ρs) and thickness hs (digitized, ±0.01). With no surface layer, Cs = 1 and ρs = ρ. | Eqs 9-20/9-21, Fig 9-35, pp. 546-547 |
| G4 | **Grid current.** IG = Df·Sf·If. Df comes from Eq 9-7 with Ta = X/(ωR), or from Table 9-1 (Df = 1 is acceptable for tf well over 1 s). Sf comes from Figs 9-6..9-27 (`splitFactorFromCharts`). Use the maximum future 3I0; for distribution stations, ×1.1 growth is suggested. Using 10× the interrupting rating is "extremely conservative". | Eqs 9-4..9-8, pp. 510-534 |
| G5 | **Mesh voltage.** Em = ρ·Km·Ki·IG/LM, with Ki = 0.644 + 0.148n and n = na·nb·nc·nd. Kii = 1 with perimeter or corner rods, else 1/(2n)^(2/n). Kh = √(1+h/1 m). LM = LC + LR without perimeter rods, or LC + [1.55 + 1.22·Lr/√(Lx²+Ly²)]·LR with them. | Eqs 9-22..9-33, pp. 551-553 |
| G6 | **Step voltage.** Es = ρ·Ks·Ki·IG/LS, with LS = 0.75·LC + 0.85·LR. The Ks equation is valid only for 0.25 m < h < 2.5 m. | Eqs 9-34..9-36, p. 554 |
| G7 | **Grid resistance.** Rg = ρ[1/LT + (1/√(20A))(1 + 1/(1 + h√(20/A)))]. The preliminary estimate is Rg = (ρ/4)√(π/A). Targets: large or transmission stations about 1 Ω or less; distribution stations usually 1-5 Ω. | Eqs 9-6, 9-38, pp. 502, 532, 555 |
| G8 | **Conductor size.** Size by Eq 9-10 (Table 9-2) or Eq 9-11 (Kf, Table 9-3). Grid conductors run from 2/0 AWG (67 mm²) to 500 kcmil (253 mm²). Critical connections need at least 1/0 AWG. Limit hard-drawn copper to 250 °C where strength matters. | pp. 535-538, 549 |
| G9 | **Layout.** Use a checkerboard with conductors 3-15 m apart and the other direction at 1-3× that spacing; bond every crossing. Preliminary mesh: 6.1-12.2 m (20-40 ft) square. Never create a mesh larger than the one analysed. | §9.10.2 step 8, §9.10.3, pp. 549-550 |
| G10 | **Depth.** Bury 0.46-1.5 m (18-59 in) below final grade, excluding the rock layer. Preliminary depth is 0.4572 m (18 in). | p. 549 step 9, p. 550 |
| G11 | **Fence and gates.** The perimeter conductor must be ≥ 0.91 m (3 ft) outside the fence (Fig 9-36 recommends 4 ft) and surround gates in every position. The grid must extend ≥ 0.91 m past the maximum outward gate swing; gates should swing inward. Bond the fence at every corner post and every 12.19-15.24 m (40-50 ft) of line posts. | pp. 506, 548, 558-559 |
| G12 | **Rods.** Place rods at corners, perimeter junctions, surge arresters and major equipment. Minimum size 16 mm (5/8 in) × 2.5 m (8 ft), with tops ≥ 5 cm below grade. Space them at least one rod length apart. Use enough rods that each carries ≤ 300 A on average. For the preliminary design, put rods at every other perimeter junction plus the corners. | p. 549 step 10, p. 550 |
| G13 | **Surface rock.** At least 10 cm (4 in) of rock at ≥ 3000 Ω·m wet or dry, covering the whole fenced area plus ≥ 1.0 m (3.3 ft) outside the fence. The practical maximum thickness is 0.1524 m (6 in). | p. 549 step 7, p. 555 |
| G14 | **Validity.** The simplified equations were checked only for areas of 6.25-10,000 m², 1-40 meshes per side, meshes 2.5-22.5 m, uniform soil and uniform spacing. Outside that range, or for unequal spacing, flag the design for computer analysis. | §9.10.8-9.10.9, p. 557 |
| G15 | **Equipment grounding (Figs 9-36/9-37).** Give switch operating handles a metal operator platform bonded to the handle, even when the handle is insulated. Run arrester grounds by a short, direct path to the protected equipment's ground terminal. Ground power-cable sheaths at two or more points, but control-cable shields at one end only. Handle transferred voltages (communication circuits, pipes, rails) with isolating or neutralizing devices, not by grid design. | pp. 557-562 |

### Protective relaying (Chapter 12)

| # | Rule | Cite |
|---|------|------|
| R1 | **Step-distance zones.** Z1 reaches 85-95% of the line, instantaneous. Z2 reaches 120-150% with an 18-30 cycle delay. Z3 reaches 200-225% with a 60-120 cycle delay. With Z1 at both ends, 70-90% of the line clears instantaneously from both terminals. | §12.4.2.1.3, Fig 12-6, p. 616 |
| R2 | **Coordination margin.** A backup relay must wait for the near relay plus breaker time plus a margin: max(25% of relay+breaker time, 6 cycles) when relays are field calibrated, or 0.2-0.3 s when only bench tested (`requiredBackupDelayS`). | §12.4.6, Fig 12-17, p. 634 |
| R3 | **Transformer protection.** Units ≤ 5 MVA are almost always fused; fuses are used up to 30 MVA; relays are most common at ≥ 10 MVA. The Fig 12-13 package is 63, 87, 86, 50H/51H, 51N, with optional 50L/51L. | §12.4.4.1, pp. 626-627 |
| R4 | **Breaker failure.** Use a 50BF-supervised 62T timer set to 10-20 cycles, with 86BF tripping adjacent breakers and transfer-tripping remote ones. At ≥ 69 kV, dual trip coils, primary plus secondary relays and dual dc trip buses are common. | §12.4.4.3, Fig 12-16, pp. 631-632 |
| R5 | **Reclosing.** Do not reclose cables. On radial circuits the first reclose is instantaneous and later ones are delayed. No instantaneous reclose on loop or multi-terminal lines unless all terminals trip simultaneously. Lock out after the set number of attempts. | §12.4.5, pp. 632-633 |
| R6 | **Feeder coordination (Fig 12-12).** The recloser is typically set to 1 fast + 3 delayed trips. The fuse blows on the 2nd delayed trip; the sectionalizer opens after the 2nd delayed trip; the recloser locks out after the 3rd. The station relay must not trip for faults beyond the recloser. | §12.4.3.2.3, pp. 625-626 |
| R7 | **Pilot schemes.** DCB waits 6-16 ms for a block signal (channel loss means it may overtrip). DCUB allows about 150 ms of trip permission when the channel is lost, then locks out. | §12.4.2.2.1, pp. 620-621 |

### Surge arresters (§5.8) and reclosers (§5.9)

| # | Rule | Cite |
|---|------|------|
| A1 | **MOV, solidly grounded.** MCOV ≥ E_LL·1.05/√3. For ungrounded or impedance-grounded systems, duty-cycle rating ≥ E_LL·1.05 (`selectMinimumMov`). | Eq 5-7, §5.8.7.3, p. 344 |
| A2 | **Protective ratios.** F = TFOW/AFOW ≥ 1.20; L = BIL/LPL ≥ 1.20; S = BSL/SPL ≥ 1.15. BSL is about 83% of BIL (`checkProtectiveRatios`). | §5.8.7.6, p. 347 |
| A3 | **Effective grounding.** The system is effectively grounded when COG ≤ 80%, roughly X0/X1 < 3 and R0/X1 < 1. For SiC arresters, rating ≥ 1.25 × L-G at maximum voltage; on ungrounded systems, about 105% of maximum system voltage. | §5.8.5-5.8.6, pp. 333-334 |
| A4 | **Location.** Place arresters at the transformer on both HV and LV sides with the shortest leads. Keep separation and lead length within Figs 5-43/5-44 (`maxArresterSeparationFt`). With high-side fuses, put the arrester on the line side of the fuse. | §5.8.8, pp. 352-356 |
| C1 | **Recloser rating.** Rated maximum kV ≥ system kV; continuous ≥ load; interrupting ≥ available fault (`recloserRowsFor`). A series coil trips at 2× its rating. Above 1000 m, derate using Table 5-59 factors. Service ambient is −30 to +40 °C. | §5.9, pp. 360-370 |

### Site (Chapter 6, §8.4)

| # | Rule | Cite |
|---|------|------|
| S1 | **Yard slope.** Grade the yard at 0.5-0.75%. Size runoff with the Rational Method Q = CiA (areas ≤ 100-200 acres; 2- or 5-year storm; 15-20 min time of concentration). Check pipes with Manning; pipes need ≥ 1 m/s (3 ft/s) to self-clean. Erosion limits: unprotected ditch about 0.5 m/s, sodded channel 1.5 m/s. | §6.4, pp. 415-419 |
| S2 | **Earthwork.** Cut/fill slopes 1V:4H where possible. Assume only 80-85% of cut is usable as fill. Compact in 200 mm (8 in) lifts to 95% of AASHTO T180. | §6.5, pp. 419-422 |
| S3 | **Access road.** Grade ≤ 7% (10% tolerated for 60-100 m). Width about 6 m (20 ft). Inside radius ≥ 15 m (50 ft) at a major road. Base 200 mm, plus a 100 mm surface course above 69 kV. | §6.6, pp. 422-423 |
| S4 | **Yard surfacing.** 100-150 mm (4-6 in) of 10-25 mm crushed stone extending 1 m beyond the fence. G13 is the stricter grounding version of this rule. | §6.8, pp. 423-424 |
| S5 | **Fence.** At least 7 ft overall (RUS recommends 7 ft fabric plus 1 ft of barbed wire). No. 9 gauge, 2 in mesh. Line posts ≤ 10 ft apart. Gates swing 180° and clear the road by 3 in. | §6.9, App. C, pp. 424-430 |
| S6 | **Oil containment.** Required above 1320 gal aboveground in total, 660 gal in one container, or 42,000 gal underground (`oilContainmentRequired`). | §8.4, p. 492 (40 CFR 112) |

### Auxiliary systems, control house and instrument transformers

| # | Rule | Cite |
|---|------|------|
| X1 | **AC transfer.** Transfer when voltage falls below 83%; return at 92-95% after an adjustable delay. Asymmetrical fault current at the panel is 1.7 × the symmetrical value from Eq 15-1. | §15.1.2.6-15.1.2.7, pp. 677-678 |
| X2 | **Battery and charger.** The battery must carry ≥ 8 h of normal operation. DC voltage drop ≤ 3%. The 120 V model uses 60 cells to a 1.75 V/cell end voltage. Keep solid-state relays ≤ 140 V by charging on the 50-cell tap. Charger A = L + 1.1C/H. | §15.2, pp. 680-686 |
| X3 | **CT relay class.** C-class rating V means V/(20×5 A) Ω of burden at ≤ 10% error, e.g. C400 → 4 Ω. Derate CT current 0.3% per 100 m above 1000 m. | §5.10, pp. 377-388 |
| M1 | **Inspection and test intervals.** Visual inspection monthly; infrared and detailed checks annually. Infrared severity: 1-2 °C investigate, 4-15 °C repair when possible, ≥ 16 °C repair immediately. Periodic tests per Table 19-2; maintenance per Table 20-1. | Ch. 18-20, pp. 718-754 |

### Design process

The Table 3-1 chronology (14 steps, p. 56) can serve as the project phases. A basic distribution station needs at least a One-Line plus a Plot Plan (§3.5.1, p. 57). Make the one-line first (§3.5.3.1). The 18 drawing types are listed in §3.5.3 (p. 59). The Appendix B fields map onto project briefs; see `PROJECT_BRIEF_SECTION_IDS`, which is a game-side selection.

## (b) Facts the game wants that are NOT in the bulletin

**Grounding**
- There is no worked numeric grounding example, so `GROUNDING_EXAMPLE = null`. IEEE Std 80-2000 Annex B was used for cross-checking only and is not shipped as data.
- There is no closed-form Cs. Eq 9-20 needs Rm, which is not given, and the IEEE 80-2000 empirical Cs formula is not in the bulletin. We use the digitized Fig 9-35.
- There is no AWG/kcmil → mm²/diameter table. The bulletin gives only 2/0 = 67 mm² and 500 kcmil = 253 mm², the 1/0 minimum, No. 2 fence risers, and No. 6 copper-clad wire mats. The game must supply conductor diameters `d`.
- **Split factor gaps:**
  - nothing for tower footing resistances between the low (15/25 Ω) and high (100/200 Ω) chart sets;
  - nothing for remote shares other than 0/25/50/75/100%;
  - the 12-line high-resistance chart (Fig 9-15) is misprinted, so it is effectively missing.

  Game conventions used: the fewer-lines curve, a conservative rounding of the remote share, and the Fig 9-13 fallback.
- Soil data (layered soils, seasonal variation, typical ρ by soil type) is absent apart from Table 11-2's corrosiveness classes.

**System and protection**
- Fault levels, X/R and clearing times must come from project briefs. So must the share of faults that are temporary; the bulletin says only "most".
- Relay time-current curve equations (inverse-time families), breaker interrupting times and typical total clearing times are not given.
- Values for separation curves 17-25 (Fig 5-45) were not digitized.

**Reliability and maintenance**
- No recloser maintenance intervals (reclosers are absent from Tables 19-2 and 20-1).
- No failure rates, MTBF or repair times for a reliability simulation.

**Civil and auxiliary**
- No rainfall data by location (Table 6-1 is an example only).
- No runoff-coefficient (C) table, and no Manning n other than 0.024.
- No battery vendor discharge data and no list of standard charger sizes.
- No costs of any kind, no transformer oil volumes, and no lead times.
- Lightning-mast and shielding geometry is in Chapter 4, which is outside this extraction.

**Design process**
- Table 3-1 gives no durations.
- Cable function codes other than "3 = control" are not given.
- The Table 3-2 distribution matrix was not extracted, because the scrambled column layout would need image verification.

## (c) Uncertainties (all flagged `UNCERTAIN:` in code)

**Grounding**
- Fig 9-15 caption and chart do not match (treated as unusable).
- Figs 9-26/9-27: the 1/0 and 2/0 curves start near 38-40%, above the 25% remote share.
- "12.92 m" is printed for 40 ft; 40 ft is 12.19 m.
- "78.8 ft" is printed for 22.5 m; 22.5 m is 73.8 ft.
- §9.10.2 step 3 cites Eq 9-3 for resistance, but Eq 9-3 is the resistivity average.
- Fig 9-36 shows "75' approx." between fence bonds, against 40-50 ft in the text.
- All chart values are digitized: Cs ±0.01, split-factor curves about ±1%.

**Arresters**
- Fig 5-39's x-axis is mislabelled.
- The Fig 5-41/5-42 captions appear swapped relative to the text.
- Table 5-58 prints 4.56 kV L-G for the 13.1 kV row; 13.1/√3 is 7.56.
- Eq 5-9's units are unclear, and it prints "190 mi/ms" (light travels about 186 mi/ms).
- Separation curves are ±2 ft. Curve crossings (1/7, 8/13) and overlapping segments (13/14, 15/16) were resolved by slope continuity.

**Reclosers**
- Table 5-61: line 4's numbers sum to 126, but the printed total is 116.
- Table 5-63: line 20 is headed 34.0 kV, against a 38 kV rating elsewhere.
- Table 5-64 has a 500 A row where the other tables use 560 A.
- Table 5-65: line 2's values are out of sequence.

**Auxiliary, site and maintenance**
- The AC fault example's listed reactances give 34 kA, not the stated ≈10 kA.
- The battery room temperature is printed "32 °C (77 °F)".
- Fence concrete strength is printed as a "maximum".
- Inspection interval: §18.3 says monthly, but §18.3.3 and Table 19-2 imply every 2 months.
- The insulation-resistance rule 1.5E/kVA is printed without √.
- Infrared bands leave 2-4 °C unclassified.

**Design process**
- Appendix B §9.8.2 swaps LR and LC.
- Appendix B prints "IEC 970-5" and "RE-422/423".
- The Fig 3-22 device labels are hard to read.
- The drawing-type → checklist mapping is inferred, not from the bulletin.

## (d) Grounding example verification

The bulletin works no numeric Chapter 9 example, so `GROUNDING_EXAMPLE = null`.

The functions were verified by scratch scripts outside the repo, and all checks passed:

1. **Eq 9-7 against Table 9-1.** Eq 9-7 reproduces every Df cell of Table 9-1 (max |Δ| = 0.00047).
2. **Eq 9-10 against Table 9-3.** Eq 9-10 with the Table 9-2 constants at 40 °C ambient reproduces every Kf in Table 9-3 (max |Δ| = 0.0069): 7.004, 7.065, 11.783, 10.456, 12.067 and 14.635, against the printed 7, 7.06, 11.78, 10.45, 12.06 and 14.64. Eq 9-10 and Eq 9-11 agree to 0.1% (34.04 vs 34.02 kcmil).
3. **External check: IEEE Std 80-2000 Annex B, Example 1.** Inputs: 70 × 70 m grid, ρ = 400 Ω·m, 3I0 = 3180 A, Sf = 0.6, 0.5 s, 70 kg. `evaluateRectangularGrid` gives:
   - Etouch70 = 838.2 V and Estep70 = 2686.6 V (exact match);
   - IG = 1908 A;
   - Rg = 2.776 Ω (IEEE 2.78);
   - Km = 0.8896, Ki = 2.272;
   - Em = 1001.6 V (IEEE 1002.1).
4. **External check: Example 2** (Example 1 plus twenty 7.5 m rods):
   - Rg = 2.753 Ω (IEEE 2.75);
   - Em = 749.1 V (IEEE 747.4, because IEEE rounds Km to 0.77);
   - Es = 549.1 V (IEEE 548.9).

   The evaluator correctly warns that this example's ρs = 2500 Ω·m is below the bulletin's 3000 Ω·m minimum.

With the bulletin's own Fig 9-35 chart, Cs = 0.749 against IEEE's formula value of 0.74. Etouch70 becomes 845.8 V.

Other examples reproduce with the exported helpers: the site drainage example, the charger example (14.24 A), the arrester MCOV examples (34.5 and 230 kV) and the cable ID example "C4-3".
