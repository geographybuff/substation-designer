/**
 * Core engine types. Coordinates are metres in plan view: +x east (right),
 * +y south (down on screen), heights (z) in metres above finished grade.
 */
import type { Citation } from '../data/bulletin/types';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Quarter turns clockwise (in plan view, +y down). */
export type Rotation = 0 | 1 | 2 | 3;

export type ItemKind =
  | 'line_terminal'
  | 'feeder_exit'
  | 'switch'
  | 'hookstick_switch'
  | 'fuse'
  | 'circuit_switcher'
  | 'breaker'
  | 'recloser'
  | 'transformer'
  | 'regulator'
  | 'arrester'
  | 'capacitor_bank'
  | 'vt'
  | 'ccvt'
  | 'wave_trap'
  | 'metering'
  | 'station_service'
  | 'mobile_pad'
  | 'control_house'
  | 'mast';

export type PropValue = string | number | boolean | string[];
export type Props = Record<string, PropValue>;

export interface PlacedItem {
  id: string;
  kind: ItemKind;
  /** Top-left corner of the rotated footprint, metres, snapped to the 0.5 m grid. */
  x: number;
  y: number;
  rot: Rotation;
  /**
   * Rated system voltage (kV) for single-voltage equipment. For transformers and
   * mobile pads this is the HV rating and `props.lvKV` holds the LV rating.
   * 0 for non-electrical items (masts, control house).
   */
  kv: number;
  props: Props;
  /** Optional player-facing label, e.g. "T1" or "Feeder 2 recloser". */
  label?: string;
  /** Locked items (level fixtures) cannot be moved or deleted. */
  locked?: boolean;
}

export type ConductorElevation = 'low' | 'high';

/** A rigid bus run or jumper: an axis-aligned polyline on the 0.5 m grid. */
export interface Conductor {
  id: string;
  points: Vec2[];
  /** Rated voltage class of the bus as built (kV). */
  kv: number;
  elevation: ConductorElevation;
  /** Key into the conductor catalogue (e.g. aluminum pipe size). */
  size: string;
}

export type Side = 'N' | 'S' | 'E' | 'W';

export interface FenceDesign {
  rect: Rect;
  gate: { side: Side; offset: number; width: number };
}

export interface ShieldWire {
  id: string;
  /** Ids of the two masts the wire is strung between. */
  a: string;
  b: string;
}

export type GroundConductorSize = '2/0' | '4/0' | '250' | '350' | '500';

export interface GroundGridDesign {
  enabled: boolean;
  /** Uniform mesh spacing D (m). */
  spacingM: number;
  conductor: GroundConductorSize;
  /** Burial depth h (m). */
  depthM: number;
  /** Number of ground rods (placed around the perimeter / corners). */
  rodCount: number;
  rodLengthM: number;
  /** How far the grid extends beyond the fence line (m). */
  extendBeyondFenceM: number;
  /** Fence bonded to the grid. */
  fenceBonded: boolean;
}

export type SurfacingMaterial = 'none' | 'crushed_rock' | 'washed_granite' | 'asphalt';

export interface SurfacingDesign {
  material: SurfacingMaterial;
  thicknessM: number;
}

export interface Design {
  version: 1;
  levelId: string;
  items: PlacedItem[];
  conductors: Conductor[];
  fence: FenceDesign | null;
  shieldWires: ShieldWire[];
  groundGrid: GroundGridDesign;
  surfacing: SurfacingDesign;
  /** Lightning protection evaluation method the player selected. */
  shieldingMethod: 'fixed_angle' | 'rolling_sphere';
}

// ---------------------------------------------------------------------------
// Level / project definitions
// ---------------------------------------------------------------------------

export interface FeederSpec {
  name: string;
  /** Share of total substation load (0..1). */
  share: number;
  /** Number of member-consumers served (for outage-minute scoring). */
  customers: number;
}

export interface SystemSpec {
  /** Source (primary) voltage, kV. */
  hvKV: number;
  /** Distribution (secondary) voltage, kV; undefined for switching stations. */
  lvKV?: number;
  /** Available three-phase symmetrical fault current at the HV bus, kA. */
  hvFaultKA: number;
  /** Single-line-to-ground fault current (3I0) at the HV bus, kA. */
  hvGroundFaultKA: number;
  /** System X/R ratio at the fault location (for the decrement factor). */
  xOverR: number;
  /** Fault current split factor Sf (fraction of ground fault current flowing through the grid). */
  splitFactor: number;
  /** Fault duration for shock (ts) and conductor sizing (tc), seconds. */
  faultDurationS: number;
  /** Present peak load, MVA. */
  loadMVA: number;
  /** Annual load growth, percent. */
  growthPct: number;
  /** Planning horizon for ratings checks, years. */
  horizonYears: number;
  powerFactor: number;
  feeders: FeederSpec[];
  /** Whether the system is effectively grounded at the HV level (affects arrester ratings). */
  hvEffectivelyGrounded: boolean;
}

export interface SiteSpec {
  /** Buildable parcel size, metres. */
  width: number;
  depth: number;
  altitudeM: number;
  /** Uniform soil resistivity, ohm-metres. */
  soilResistivity: number;
  /** Isokeraunic level: average thunderstorm days per year. */
  isokeraunicDays: number;
  /** Seismic zone label used for flavour and structure costs. */
  seismicZone?: string;
  /** Free-form environmental notes shown in the briefing. */
  notes?: string[];
  /** Areas where nothing may be built (creeks, easements). */
  noBuild?: Array<Rect & { label: string }>;
  /** Side of the parcel where the public road is (for the gate). */
  roadSide: Side;
}

export type ObjectiveKind =
  | 'feeders_served'
  | 'feeder_protection'
  | 'transformer_protection'
  | 'voltage_regulation'
  | 'bypass_reclosers'
  | 'bypass_regulators'
  | 'shielding'
  | 'grounding_safe'
  | 'fence'
  | 'transformer_capacity'
  | 'mobile_provision'
  | 'expansion_area'
  | 'n_minus_1_transformer'
  | 'switching_scheme'
  | 'line_protection'
  | 'arresters'
  | 'capacitor_kvar'
  | 'removal_path';

export interface Objective {
  id: string;
  kind: ObjectiveKind;
  text: string;
  /** Optional parameter (e.g. required kvar, required scheme). */
  param?: string | number;
  /** Optional objectives give stars but are not required to pass. */
  optional?: boolean;
  cite?: Citation;
}

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  /** Engine-evaluated completion condition id (see tutorial.ts). */
  until?: string;
  /** Item kind to highlight in the toolbox. */
  highlightTool?: string;
}

export interface LevelDef {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  /** Fictional cooperative issuing the work order. */
  client: string;
  briefing: string[];
  /** Key bulletin topics this level teaches. */
  topics: Array<{ text: string; cite: Citation }>;
  site: SiteSpec;
  system: SystemSpec;
  /** Fixtures placed by the level (line terminals, etc.). */
  fixtures: PlacedItem[];
  /** Toolbox contents. */
  tools: ItemKind[];
  /** Whether the player may draw/adjust a fence, shield wires, ground grid. */
  features: { fence: boolean; groundGrid: boolean; shieldWires: boolean; surfacing: boolean };
  budget: number;
  objectives: Objective[];
  simYears: number;
  /** Target expected customer outage minutes per customer per year caused by the substation. */
  reliabilityTarget: number;
  /** Area that must stay clear for future expansion (inside the fence). */
  expansionArea?: Rect;
  tutorial?: TutorialStep[];
  /** A starting design (otherwise empty apart from fixtures). */
  starter?: Partial<Pick<Design, 'items' | 'conductors' | 'fence' | 'groundGrid' | 'surfacing'>>;
  /** Sandbox levels unlock everything and skip objectives. */
  sandbox?: boolean;
  /** Check-id prefixes switched off to keep early levels focused (e.g. "surge.", "shield."). */
  checksOff?: string[];
}

// ---------------------------------------------------------------------------
// Findings from design review
// ---------------------------------------------------------------------------

export type Severity = 'critical' | 'major' | 'minor' | 'info';

export type FindingCategory =
  | 'safety'
  | 'clearance'
  | 'connectivity'
  | 'protection'
  | 'ratings'
  | 'lightning'
  | 'grounding'
  | 'reliability'
  | 'site'
  | 'objective';

export interface Finding {
  id: string;
  checkId: string;
  severity: Severity;
  category: FindingCategory;
  title: string;
  detail: string;
  itemIds?: string[];
  conductorIds?: string[];
  /** Where to point the camera / draw a marker. */
  at?: Vec2;
  cite?: Citation[];
}
