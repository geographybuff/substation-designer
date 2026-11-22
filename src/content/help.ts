/**
 * Campaign help: plain-language "Help me fix this" guidance for every review
 * finding and objective, with what "Show me" should point at (items, a toolbox
 * entry, an overlay, a diagram) and, for purely mechanical fixes, a one-click
 * "Do it for me". Entries live in helpEntries.ts; this module holds the types
 * and the lookup.
 */
import type { DesignReview, ObjectiveStatus } from '../engine/review';
import type { Design, Finding, ItemKind, LevelDef, ObjectiveKind } from '../engine/types';
import { FINDING_HELP, OBJECTIVE_HELP } from './helpEntries';

/** Toolbox entries "Show me" can select: an equipment kind or one of the drawing tools. */
export type HelpTool = ItemKind | 'bus' | 'highbus' | 'fence' | 'shieldwire';
export type HelpOverlay = 'shielding' | 'fenceZone' | 'grounding' | 'removal';
/** Small one-line diagrams drawn by the UI (see HelpDiagram.tsx). */
export type HelpDiagramId = 'feeder-bay' | 'recloser-bypass' | 'regulator-bypass' | 'xfmr-primary' | 'arresters' | 'straight-entry' | 'tap' | 'mobile-pad' | 'sectionalized-bus';

export interface HelpFix {
  /** Button text, e.g. "Line R1 up with its bus". */
  label: string;
  /** Returns the fixed design (a new object; never mutates), or null when it cannot fix it. */
  apply: (design: Design, level: LevelDef) => Design | null;
}

export interface Help {
  /** One or two plain sentences: what is wrong (or needed) and why it matters. */
  what: string;
  /** Concrete steps in game terms: which tool, where to place it, which Inspector field to set. */
  steps: string[];
  /** Toolbox entry that "Show me" selects and highlights. */
  tool?: HelpTool;
  /** Voltage side for the tool; default: the voltage of the first item involved, else LV, else HV. */
  side?: 'hv' | 'lv';
  /** Overlay "Show me" turns on. */
  overlay?: HelpOverlay;
  diagram?: HelpDiagramId;
  /** Field Guide topic: an article id (src/content/guide.ts) or `cite:<section>`. */
  guide?: string;
  /** Items "Show me" selects and frames (findings default to their own itemIds). */
  itemIds?: string[];
  /** Optional one-click fix (only for mechanical changes such as an Inspector setting or alignment). */
  fix?: HelpFix;
}

export interface HelpCtx {
  level: LevelDef;
  design: Design;
  review: DesignReview;
}

export type FindingHelpFn = (f: Finding, ctx: HelpCtx) => Help | null;
export type ObjectiveHelpFn = (o: ObjectiveStatus, ctx: HelpCtx) => Help | null;

/** Help for a finding: exact checkId first, then shorter dotted prefixes (`surge.xfmr.hv` → `surge.xfmr` → `surge`). */
export function helpForFinding(f: Finding, ctx: HelpCtx): Help | null {
  const parts = f.checkId.split('.');
  for (let n = parts.length; n > 0; n--) {
    const fn = FINDING_HELP[parts.slice(0, n).join('.')];
    if (fn) return fn(f, ctx);
  }
  return null;
}

export function helpForObjective(o: ObjectiveStatus, ctx: HelpCtx): Help | null {
  const fn = OBJECTIVE_HELP[o.objective.kind as ObjectiveKind];
  return fn ? fn(o, ctx) : null;
}
