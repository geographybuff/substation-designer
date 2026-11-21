/**
 * Ground grid safety evaluation (Bulletin Chapter 9, the IEEE Std 80-2000
 * method): tolerable touch/step voltages with the surface-layer factor Cs,
 * grid resistance, maximum grid current IG = Df·Sf·3I0, GPR, mesh and step
 * voltages, and conductor sizing. The equations live in
 * src/data/bulletin/grounding.ts; this module maps a design onto them.
 */
import {
  evaluateRectangularGrid,
  GROUNDING_RULES,
  groundConductorAreaKcmilSimplified,
  TABLE_9_3_CITE,
  TABLE_9_3_KF,
  TABLE_9_4_CITE,
  TABLE_9_4_SURFACE_MATERIALS,
  type GridEvaluation,
} from '../data/bulletin/grounding';
import type { Citation } from '../data/bulletin/types';
import type { Design, Finding, GroundConductorSize, LevelDef, SurfacingMaterial } from './types';

/** Conductor cross-sections (standard AWG/kcmil definitions). */
export const GROUND_KCMIL: Record<GroundConductorSize, number> = { '2/0': 133.1, '4/0': 211.6, '250': 250, '350': 350, '500': 500 };
/** Stranded copper outside diameters, m (GAME ASSUMPTION from standard conductor tables; the bulletin notes diameter has negligible effect on mesh voltage). */
export const GROUND_DIAMETER_M: Record<GroundConductorSize, number> = { '2/0': 0.01064, '4/0': 0.01341, '250': 0.01461, '350': 0.0173, '500': 0.02065 };

/**
 * Wet resistivities used for each surfacing choice, from Table 9-4, chosen to meet the
 * §9.10.2 step 7 minimum of 3000 Ω·m: crushed rock = ¾–1 in. granite with fines (row 3),
 * washed granite = #3 washed granite (row 5), asphalt = row 10 lower bound.
 */
export const SURFACE_RESISTIVITY: Record<Exclude<SurfacingMaterial, 'none'>, number> = {
  crushed_rock: TABLE_9_4_SURFACE_MATERIALS[2]!.wetOhmM[0],
  washed_granite: TABLE_9_4_SURFACE_MATERIALS[4]!.wetOhmM[0],
  asphalt: TABLE_9_4_SURFACE_MATERIALS[9]!.wetOhmM[0],
};

const KF_COPPER = TABLE_9_3_KF.find((r) => r.materialId === 'copper-annealed-soft-drawn')!.kf;

const CITE: Record<string, Citation> = {
  touch: { page: [540, 545], section: '9.8', equation: '9-16 to 9-19' },
  mesh: { page: [551, 553], section: '9.10.4' },
  step: { page: [553, 554], section: '9.10.5' },
  gpr: { page: 554, section: '9.10.6' },
  procedure: { page: [548, 550], section: '9.10.2' },
  modifications: { page: [555, 557], section: '9.10.7' },
  surface: TABLE_9_4_CITE,
  sizing: TABLE_9_3_CITE,
};

export interface GroundingResult {
  safe: boolean;
  touchTolerableV: number;
  stepTolerableV: number;
  meshVoltageV: number;
  stepVoltageV: number;
  gprV: number;
  gridResistanceOhm: number;
  gridCurrentA: number;
  cs: number;
  requiredKcmil: number;
  conductorOk: boolean;
  eval: GridEvaluation;
}

export function evaluateGrounding(design: Design, level: LevelDef): GroundingResult | null {
  const fence = design.fence;
  const g = design.groundGrid;
  if (!fence || !g.enabled) return null;
  const e = g.extendBeyondFenceM;
  const lx = fence.rect.w + 2 * e;
  const ly = fence.rect.h + 2 * e;
  const D = Math.max(1, g.spacingM);
  const sys = level.system;
  try {
    const ev = evaluateRectangularGrid({
      soilResistivity: level.site.soilResistivity,
      surfaceLayer: design.surfacing.material === 'none' ? undefined : { resistivity: SURFACE_RESISTIVITY[design.surfacing.material], thicknessM: design.surfacing.thicknessM },
      lengthXM: lx,
      lengthYM: ly,
      conductorsAlongX: Math.max(2, Math.floor(ly / D + 1e-9) + 1),
      conductorsAlongY: Math.max(2, Math.floor(lx / D + 1e-9) + 1),
      depthM: g.depthM,
      conductorDiameterM: GROUND_DIAMETER_M[g.conductor],
      rods: g.rodCount > 0 ? { count: g.rodCount, lengthM: g.rodLengthM, placement: 'perimeter-and-corners' } : undefined,
      faultCurrentA: sys.hvGroundFaultKA * 1000,
      splitFactor: sys.splitFactor,
      faultDurationS: sys.faultDurationS,
      xOverR: sys.xOverR,
      shockDurationS: sys.faultDurationS,
      bodyWeightKg: 50,
    });
    // Eq 9-11: grid conductors sized for the full fault current (the conservative choice in §9.6.4).
    const requiredKcmil = groundConductorAreaKcmilSimplified(sys.hvGroundFaultKA * ev.df, sys.faultDurationS, KF_COPPER);
    return {
      safe: ev.safe,
      touchTolerableV: ev.tolerableTouchV,
      stepTolerableV: ev.tolerableStepV,
      meshVoltageV: ev.meshVoltageV,
      stepVoltageV: ev.stepVoltageV,
      gprV: ev.gprV,
      gridResistanceOhm: ev.gridResistanceOhm,
      gridCurrentA: ev.maxGridCurrentA,
      cs: ev.cs,
      requiredKcmil,
      conductorOk: GROUND_KCMIL[g.conductor] >= requiredKcmil,
      eval: ev,
    };
  } catch (err) {
    console.warn('grounding evaluation failed', err);
    return null;
  }
}

let seq = 0;
const fid = (check: string) => `${check}#${++seq}`;

export function checkGrounding(design: Design, level: LevelDef, g: GroundingResult | null): Finding[] {
  seq = 0;
  const out: Finding[] = [];
  if (!level.features.groundGrid) return out;
  const gg = design.groundGrid;
  if (!design.fence) return out;
  if (!gg.enabled || !g) {
    out.push({ id: fid('ground.missing'), checkId: 'ground.missing', severity: 'critical', category: 'grounding', title: 'No ground grid', detail: 'Every substation needs a ground grid to keep touch and step voltages tolerable during ground faults. Enable it with nothing selected (Inspector → Ground grid).', cite: [CITE.procedure!] });
    return out;
  }
  const v = (x: number) => `${Math.round(x).toLocaleString()} V`;
  if (!g.safe) {
    if (!g.eval.meshVoltageOk) {
      out.push({
        id: fid('ground.touch'),
        checkId: 'ground.touch',
        severity: 'critical',
        category: 'safety',
        title: 'Touch voltage exceeds the tolerable limit',
        detail: `Mesh voltage Em ${v(g.meshVoltageV)} > tolerable touch ${v(g.touchTolerableV)} (50 kg, Cs ${g.cs.toFixed(2)}). Reduce mesh spacing, add ground rods, or add a high-resistivity surface layer such as crushed rock.`,
        cite: [CITE.mesh!, CITE.touch!, CITE.modifications!],
      });
    }
    if (!g.eval.stepVoltageOk) {
      out.push({ id: fid('ground.step'), checkId: 'ground.step', severity: 'critical', category: 'safety', title: 'Step voltage exceeds the tolerable limit', detail: `Step voltage Es ${v(g.stepVoltageV)} > tolerable step ${v(g.stepTolerableV)}. Add conductors or rods at the perimeter, or bury the grid deeper.`, cite: [CITE.step!, CITE.touch!] });
    }
  }
  if (!g.conductorOk) {
    out.push({ id: fid('ground.conductor'), checkId: 'ground.conductor', severity: 'major', category: 'grounding', title: 'Ground conductor too small for the fault current', detail: `Eq. 9-11 needs about ${Math.ceil(g.requiredKcmil)} kcmil copper for ${level.system.hvGroundFaultKA} kA for ${level.system.faultDurationS} s; ${gg.conductor} is ${GROUND_KCMIL[gg.conductor]} kcmil.`, cite: [CITE.sizing!] });
  }
  const minOut = GROUNDING_RULES.perimeterConductorOutsideFenceM;
  if (gg.extendBeyondFenceM + 1e-6 < minOut.value) {
    out.push({ id: fid('ground.fenceext'), checkId: 'ground.fenceext', severity: 'major', category: 'safety', title: 'Grid does not extend outside the fence', detail: `Run the perimeter conductor at least ${minOut.value} m (3 ft) outside the fence so a person touching the fence from outside stands over the grid.`, cite: [minOut.cite] });
  }
  if (!gg.fenceBonded) {
    out.push({ id: fid('ground.fencebond'), checkId: 'ground.fencebond', severity: 'major', category: 'safety', title: 'Fence is not bonded to the ground grid', detail: 'Connect the fence to the grid (corner posts and line posts every 12–15 m / 40–50 ft) to control touch voltage on the fence.', cite: [GROUNDING_RULES.fenceGroundConnectionSpacingM.cite] });
  }
  const depth = GROUNDING_RULES.burialDepthM.value;
  if (gg.depthM < depth[0] - 1e-6 || gg.depthM > depth[1] + 1e-6) {
    out.push({ id: fid('ground.depth'), checkId: 'ground.depth', severity: 'minor', category: 'grounding', title: 'Unusual grid burial depth', detail: `Grid conductors are normally buried ${depth[0]}–${depth[1]} m below final grade.`, cite: [GROUNDING_RULES.burialDepthM.cite] });
  }
  for (const w of g.eval.warnings) {
    if (w.code === 'unequal-spacing') continue;
    out.push({ id: fid(`ground.${w.code}`), checkId: `ground.${w.code}`, severity: w.code === 'cs-out-of-chart' ? 'info' : 'minor', category: 'grounding', title: 'Ground grid design advice', detail: w.message, cite: [w.cite] });
  }
  const minT = GROUNDING_RULES.surfaceLayerMinThicknessM;
  if (design.surfacing.material !== 'none' && design.surfacing.thicknessM + 1e-9 < minT.value) {
    out.push({ id: fid('ground.surfacethin'), checkId: 'ground.surfacethin', severity: 'minor', category: 'grounding', title: 'Surface layer too thin', detail: `Cover the yard (and at least 1.0 m outside the fence) with at least ${minT.value * 100} cm (4 in) of crushed rock or equal of 3000 Ω·m or more.`, cite: [minT.cite] });
  }
  if (design.surfacing.material === 'none') {
    out.push({ id: fid('ground.surface'), checkId: 'ground.surface', severity: 'info', category: 'grounding', title: 'No surface layer', detail: 'A layer of crushed rock greatly raises the tolerable touch and step voltages (reduction factor Cs, Table 9-4).', cite: [CITE.surface!] });
  }
  return out;
}

export const GROUNDING_RESULT_CITES = CITE;
