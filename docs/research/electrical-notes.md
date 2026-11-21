# Electrical equipment & layout notes (RUS Bulletin 1724E-300)

Source: USDA RUS Bulletin 1724E-300 (June 2001). Page = PDF page. Data modules in
`src/data/bulletin/`: `transformers.ts`, `breakers.ts`, `regulators.ts`, `airSwitches.ts`,
`environment.ts`, `layout.ts`, `capacitors.ts`, `insulatorsConductors.ts`, `mobile.ts`, `rigidBus.ts`.
Every exported datum carries a `Citation`; anything doubtful has a note starting `UNCERTAIN:`.
The worked examples (`*_EXAMPLE`) all reproduce with the exported helper functions. Use them as unit tests.

## (a) Rules a design check could enforce

### Transformers (§5.2)
| # | Rule | Cite |
|---|------|------|
| T1 | OA kVA must lie in the Table 5-3..5-6 range for the chosen HV/LV pair (a dash = combination not standard). | pp. 194-197 |
| T2 | Forced cooling: 750-2000 kVA → one stage, +15 % of OA; 2500-10 000 kVA → one stage, +25 %; >10 000 kVA → up to two stages, +⅓ of OA each (`forcedCooledRatingsKVA`). No rule between 2000 and 2500 kVA. | p. 192 |
| T3 | Above 1000 m: derate kVA per Table 5-2 (0.4 % OA, 0.5 % FA per 100 m, increment UNCERTAIN) and tell the manufacturer. External insulation is derated about 10 % per 1000 m. | pp. 193, 207 |
| T4 | Voltage ≤105 % of the tap at rated load (PF ≥ 0.8, f ≥ 95 %); ≤110 % at no load. | p. 194 |
| T5 | HV BIL: Table 5-9 (power: 115→450, 138→550, 161→650, 230→750 kV; distribution BILs only for non-LTC). Table 5-7 lists alternatives; one step below full BIL is allowed at ≥115 kV on effectively grounded systems. | pp. 198-200 |
| T6 | Default %Z from Table 5-11 (`standardImpedancePct`). Tolerance ±7.5 % for two-winding units, ±10 % for multiwinding units and autotransformers. | pp. 201-202 |
| T7 | Parallel units: %Z within ±7.5 % of each other, same ratio and taps, same phase displacement (a Δ-Y unit cannot parallel an auto: 30° vs 0°). Load share follows `parallelLoadShareMVA`. Warn when the smaller unit has the lower Z. Each unit needs its own protection. | pp. 201-204 |
| T8 | Alarms: hot spot 95/105 °C and top oil 70/80 °C (55/65 °C insulation, Table 5-14). | p. 209 |
| T9 | Noise: NEMA level from Table 5-15 (`transformerSoundLevelDb`), −6 dB per doubling of distance; ordinances ≈45 dB night / 55 dB day. Station noise should be <5 dBA above ambient. Put transformers far from the fence. | pp. 45, 212-214 |
| T10 | A single three-phase transformer means the site must allow quick mobile-unit hookup. | p. 122 |

### Breakers (§5.3) and switchgear (§5.4)
| # | Rule | Cite |
|---|------|------|
| B1 | Rated max voltage ≥ system max. Tables 5-23/5-24 rows: 15.5, 25.8, 38, 48.3, 72.5, 123, 145, 170, 245 kV (123/145/170/245 serve 115/138/161/230 kV systems). | pp. 226, 232-233 |
| B2 | Rated continuous current (choose from the row's options: 600/1200/1600/2000/3000 A) × altitude current factor (Table 5-25, interpolated) ≥ load current. | pp. 228, 234 |
| B3 | Rated short-circuit kA ≥ available symmetrical fault current. For K > 1 (indoor Table 5-21) use Eq. 5-3: required = I·Vmax/Vop, capped at K·I (`requiredSymmetricalInterruptingKA`). | pp. 228, 230, 237 |
| B4 | Closing and latching ≥ 2.6 × rated short-circuit kA (peak) for the C37.06-1997 tables. Asymmetry factor S follows the parting time (`asymmetryFactorS`). Single line-to-ground faults need 1.15× the polyphase value (capped at K·I). | pp. 234, 237 |
| B5 | Ratings assume duty cycle CO + 15 s + CO; faster reclosing needs derating (C37.04, not reproduced). | p. 238 |
| B6 | Interrupting time is 83 ms (5 cycles) at ≤72.5 kV, 50 ms (3 cycles) at 123-245 kV and 33 ms at ≥362 kV. Tripping delay Y is 2 s at ≤72.5 kV and 1 s above. | pp. 232-233 |
| B7 | Above 1000 m, multiply dielectric strength and max voltage by the voltage ACF (0.95 at 1500 m, 0.80 at 3000 m). | p. 234 |
| B8 | Disconnects on both sides of every breaker or recloser. Bypassing a breaker removes its CTs, so protection must cover that (fused bypass is an option). | pp. 122-128 |
| B9 | Control: 125 V dc trips over 70-140 V; closing works over 90-140 V outdoor. 24 V closing is not recommended (Table 5-26). | p. 240 |
| B10 | Metal-clad classes are 4.16/7.2/13.8/25/34.5 kV (max 4.76/8.25/15/27/38). Bus 1200/2000/3000 A; momentary up to 48 kA at 13.8 kV (Table 5-27). | pp. 249-250 |

### Regulators (§5.5)
| # | Rule | Cite |
|---|------|------|
| R1 | kVA = rated kV × range × A (×1.732 for 3-ph) (`regulatorKva`). Pick from Tables 5-30/5-31. | pp. 254, 258-259 |
| R2 | Load ≤ rated A × Table 5-28/5-29 factor for the range in use (single-phase ±5 % → 160 %), capped at 668 A (single-phase) / 600 A (three-phase). | p. 257 |
| R3 | Specify ±10 % range, 32 steps of ⅝ %, bandwidth ≤ ±1 V on a 120 V base. | p. 257 |
| R4 | Fault duty ≤25× full load for 2 s and ≤40× for 0.8 s, otherwise add current-limiting reactors (`regulatorWithstandsFault`). | p. 261 |
| R5 | Always provide bypass switches (Fig. 4-3). Arresters go on the tank; the factory bypass arrester protects only the series winding. | pp. 123-124, 254, 262 |
| R6 | Altitude: dielectric per Table 5-33 (standard units max 4500 m / 15 000 ft); loading −0.4 % (OA) / −0.5 % (FA) per 100 m above 1000 m. | pp. 260-261 |

### Air switches (§5.7)
| # | Rule | Cite |
|---|------|------|
| S1 | Voltage/BIL from Table 5-38. Continuous current from 600/1200/1600/2000/3000/4000 A (Table 5-40). 3 s short-time kA ≥ fault current; peak = 2.6× short-time. | pp. 302-304 |
| S2 | Allowable current at the actual ambient: I_A = I_R·√((θmax−θA)/θr) (Eq. 5-5, Table 5-43). Loadability ≈1.22 at 25 °C. | pp. 310-311 |
| S3 | Phase spacing and ground clearance per Table 5-48 (vertical break < side break < horn gap). Keep the phase-to-phase metal-to-metal minimum in every blade position. | pp. 153, 318 |
| S4 | Hook-stick switches are not used above 69 kV. | pp. 126, 128 |
| S5 | A disconnect may make or break only negligible current. Magnetizing or charging current needs a horn-gap switch; load needs an interrupter switch. | pp. 299-301 |
| S6 | Blade dead when open; supports stiff. Ground switches are interlocked with their disconnect and meet the Table 5-51 gaps. | pp. 127, 321-322 |
| S7 | Altitude: voltage and current factors from Table 5-41. Insulators must survive the Eq. 5-6 forces at the rated momentary current. | pp. 308, 312-313 |

### Capacitors (§5.6)
| # | Rule | Cite |
|---|------|------|
| C1 | No unit above 110 % of rated voltage, including after one unit is lost. Unbalance protection trips before 110 %. | pp. 268, 283 |
| C2 | Switch voltage ≥ 110 % of capacitor rating. Continuous current ≥ 1.25× (ungrounded) / 1.35× (grounded) bank current (`capacitorSwitchMinContinuousA`). | p. 271 |
| C3 | Back-to-back banks: inrush must stay within the switch momentary rating; reactor per Eq. 5-4 (`inrushReactorMicroHenry`). | pp. 263-266 |
| C4 | Grounded-wye or delta banks with one series group at ≥ ~4 kA fault current need current-limiting fuses. Delta is only used at ≤23 kV. | pp. 268-269, 282 |
| C5 | Each series section needs shorting and grounding switches. Units discharge to ≤50 V in 5 min; the key interlock requires 5 min. | pp. 285, 289 |
| C6 | Open racks need a fence (metal-enclosed banks do not). Expulsion fuses need +3 ft clearance to grounded metal. Mount on a 2.44 m (8 ft) substructure. | pp. 267-268, 285-287 |
| C7 | Control anti-hunting: voltage bandwidth > step change; VAR turn-off > turn-on + bank kvar. | pp. 278-279 |

### Layout (§4.2-4.6)
| # | Rule | Cite |
|---|------|------|
| L1 | Provide equipment removal routes. Group bays in pairs, then widen the spacing; main buses above bay equipment. | pp. 120-121, 133 |
| L2 | Leave ≥1 (preferably both) ends of every major bus open. | p. 120 |
| L3 | Single and sectionalized bus need breaker bypass. Ring, breaker-and-a-half and double-breaker schemes do not. | pp. 129-141 |
| L4 | Ring bus: 4 positions is the practical maximum, 6 the usual limit. | p. 136 |
| L5 | Place interdependent circuits on different bus sections. | p. 132 |
| L6 | Reliability for the sim: use `BUS_SCHEMES[].reliability` (bus fault / breaker failure / maintenance outcomes, all from the text). | pp. 129-141 |
| L7 | Arresters close to the protected equipment, on the line side of transformer fuses. Transmission transformers get arresters on every primary and secondary phase. Line-entrance arresters go on the line side. | pp. 124, 126 |

### Site, insulation, conductors, bus
| # | Rule | Cite |
|---|------|------|
| E1 | Fence 8 ft (7 ft fabric + 1 ft barbed wire); a sign on every side; communications outside the 300 V GPR zone. | pp. 42-43 |
| E2 | Corona: connections ≥ 1/0 at 138/161 kV and ≥ 3/0 at 230 kV. | p. 45 |
| E3 | Wind per Fig. 2-1. In seismic zones 3-4, supports >121 kV need IEEE 693. | pp. 46-49, 437 |
| E4 | EA if more than 2 ha (5 acres) of new disturbance; stormwater permit if more than 5 acres. Takeoff tension ≤ 8900 N (2000 lb) at small stations. | pp. 42, 45, 51 |
| I1 | Altitude: derate BIL by Table 4-3 and use the clearances of the BIL that still covers the requirement (2400 m, 121 kV → 650 kV BIL). | p. 156 |
| I2 | Non-rigid (strain) bus: Table 4-7 clearances +50 %. Contamination: one step up. | p. 156 |
| I3 | Post insulators recommended; stacking posts at ≥115 kV (550 kV BIL). Suspension strings: +1 unit on steel dead-ends, +1/+2 at 45°/90°, load ≤ 40 % of M&E rating. | pp. 146-153 |
| I4 | Ampacity basis 40 °C ambient + 30 °C rise (70 °C). Altitude factors from Table 4-10; never apply the current and ambient factors together. | pp. 160-161 |
| RB | Rigid bus: span ≤ L_M, deflection ≤ L/200, insulator cantilever ≥ W_S (`checkRigidBusSI`). Continuous sections ≤ 30.48 m (100 ft); damp spans > 6 m (20 ft); couplers at Table 4-13 points. Strain-bus tension ≤ 13 350 N (3000 lb). | pp. 164-179 |
| M1 | Mobile: ≥2 ground connections, space and access at every site, own fence unless inside the station, bare jumpers only where the Table 4-7/4-8 clearances hold, arresters on the trailer. | pp. 185-186, 409 |

## (b) Facts the game wants that are NOT in the bulletin (label as game assumptions)
- **Full standard kVA list.** The bulletin prints only range end points: 750, 1000, 1500, 2500, 3750, 5000, 7500, 10 000, 12 000, 15 000, 30 000 and 60 000 kVA. It also mentions 2000 and 20 000 (`THREE_PHASE_KVA_VALUES_IN_BULLETIN`). Intermediate values (e.g. 25 000, 37 500, 50 000) come from IEEE C57.12.00 Table 1; verify against that standard.
- **65 °C vs 55 °C rise capacity gain.** The common +12 % figure is not stated. Transformer overload and loss-of-life curves (C57.92) are not given either.
- **Transformer LTC range and step count.** ±10 % in 32 × ⅝ % steps is stated only for regulators. The design-summary form just asks for "% above and below".
- **Through-fault current from %Z** (I = I_rated·100/%Z, infinite source), X/R ratios, source impedance, and fault-study methods.
- **Equipment dimensions, weights and costs.** The only footprint proxies are switch base hole spacing (Table 5-47), pole-unit dimensions (Table 5-46) and insulator heights (Tables 4-4/4-5). Relative scheme cost is in Table 4-1 (lead).
- **Failure rates, repair times, outage durations.** None are given for the reliability simulation; §2.5 only cites ANSI C84.1 voltage limits.
- **Regulator settings.** Time delay, LDC R/X and voltage set point are in RUS Bulletin 1724D-114. Capacitor sizing criteria are in RUS Bulletin 1724D-112.
- **Breaker details:** reclosing-duty derating, capacitance-switching ratings (C37.06 Table 1A), and interrupting ratings of horn-gap or load-break switches.
- **Conductor ampacity tables.** Only "3 in Sch 40 6063-T6 = 1890 A" appears (assumptions unstated); no ACSR ampacities.
- **Table 5-2 altitude increment.** "Per 100 m" is inferred from Table 5-34.

## (c) Uncertainties (all also flagged in-code with `UNCERTAIN:`)
1. Table 5-2: derating % has no stated increment (likely per 100 m above 1000 m).
2. §5.2.7 Condition II prints T2 = 10.1 MVA; Eqs. 5-1/5-2 give 19.1 MVA (stored as `byEquationsMVA`).
3. Table 5-15: misprints 41687 → 41667 and 333333 → 33333 corrected. The "67 dB" footnote has no marker.
4. Table 5-19: the outdoor live-tank row is empty; its "Gas" mark appears to have slipped onto the "Indoor" heading line.
5. Table 5-22 line 15: 93 in vs 2.49 m creepage disagree.
6. Breaker closing and latching: 2.7K (older Tables 5-20/5-21 notes) vs 2.6 (1997 notes); use 2.6 for Tables 5-23/5-24.
7. Table 5-29's last row is printed ±6.00 % (probably ±5.00 %).
8. Table 5-31: 967 kVA (probably 937). The 14 400/24 940Y three-phase currents fit 23 kV, not 24.94 kV.
9. Table 5-38: RIV limit labeled "mV" (C37.32 uses µV).
10. Loadability reference temperature: 25 °C (text) vs 23 °C (Table 5-43 note).
11. Inch/mm misprints: Table 5-48 34 in/846 mm; Table 5-51 14 in/367 mm; Table 5-46 616 mm.
12. Table 4-14: wall thickness misprints (1.140, 1.145 in) corrected from OD/ID.
13. p. 162: two "aluminum conductor to copper terminal" paragraphs give different hardware.
14. Strain-bus sample (§4.12.2.8): metric W_I and F_W are US results converted (equations give 14.3 and 10.1 N/m).
15. Example 5-1 says "30 µH, 600 A reactor", then computes a 676 A minimum.
16. Table 5-10's second row is printed 2.6 kV (Table 5-7: 2.5 kV). Table 4-5 lists tech ref 202 twice.
17. Tables 5-4/5-5/5-6 LV headers: "24 940Grd/14 000" and "12 407Y/7200" look like misprints for 24 940GrdY/14 400 and 12 470Y/7200.
18. §4.11.3 example uses 191.5 Pa (Table 4-11: 190 Pa) and cites "Table 4-9" for ice (Table 4-11 meant).
19. Fig. 2-1 contour placement and Fig. 2-2 zone summary are readings of the map images.
20. Interpolating altitude tables is a game convention; only Table 5-25 (breakers) says to interpolate.
21. §5.4.4.2.1 "feeder breakers sized to carry 50 percent of normal load" is ambiguous.
