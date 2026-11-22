import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ARTICLES } from '../src/content';
import { helpForFinding, helpForObjective, type Help, type HelpCtx } from '../src/content/help';
import { OBJECTIVE_HELP } from '../src/content/helpEntries';
import { CATALOG, defaultProps } from '../src/engine/catalog';
import { newDesign } from '../src/engine/design';
import { reviewDesign } from '../src/engine/review';
import type { Design, Finding, LevelDef, ObjectiveKind } from '../src/engine/types';
import { CAMPAIGN, getLevel } from '../src/levels';
import { SOLUTIONS } from '../src/levels/solutions';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? tsFiles(p) : p.endsWith('.ts') ? [p] : [];
  });
}

/** Every checkId the engine can emit: string literals, plus the static prefix of template literals (`ground.${code}` → `ground`). */
function engineCheckIds(): string[] {
  const ids = new Set<string>();
  for (const file of tsFiles(join(SRC, 'engine'))) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/checkId:\s*(?:'([^']+)'|`([^`]+)`)/g)) {
      const id = m[1] ?? m[2]!.split('${')[0]!.replace(/\.$/, '');
      if (id) ids.add(id);
    }
  }
  // Ground grid advice findings are `ground.<warning code>`; collect the codes the grid evaluator can raise.
  const grid = readFileSync(join(SRC, 'data/bulletin/grounding.ts'), 'utf8');
  for (const m of grid.matchAll(/warn\('([a-z-]+)'/g)) ids.add(`ground.${m[1]}`);
  return [...ids].sort();
}

const ARTICLE_IDS = new Set(ARTICLES.map((a) => a.id));
const DRAWING_TOOLS = new Set(['bus', 'highbus', 'fence', 'shieldwire']);

/** Structural checks every Help must pass. */
function expectWellFormed(h: Help, level: LevelDef, where: string): void {
  expect(h.what.trim().length, `${where}: what`).toBeGreaterThan(0);
  expect(h.steps.length, `${where}: steps`).toBeGreaterThanOrEqual(1);
  expect(h.steps.length, `${where}: steps`).toBeLessThanOrEqual(5);
  for (const s of h.steps) expect(s.trim().length, `${where}: empty step`).toBeGreaterThan(0);
  const text = [h.what, ...h.steps].join(' ');
  expect(text, `${where}: unresolved value`).not.toMatch(/undefined|NaN|\[object/);
  expect(text, `${where}: tone`).not.toMatch(/!|\bsimply\b|\bjust\b/i);
  if (h.guide) expect(h.guide.startsWith('cite:') || ARTICLE_IDS.has(h.guide), `${where}: guide ${h.guide}`).toBe(true);
  if (h.tool && !DRAWING_TOOLS.has(h.tool)) {
    expect(h.tool in CATALOG, `${where}: tool ${h.tool}`).toBe(true);
    if (!level.sandbox) expect(level.tools, `${where}: tool ${h.tool} not in this level's toolbox`).toContain(h.tool);
  }
}

function ctxFor(levelId: string, design?: Design): HelpCtx {
  const level = getLevel(levelId)!;
  const d = design ?? SOLUTIONS[levelId]!();
  return { level, design: d, review: reviewDesign(d, level) };
}

const finding = (checkId: string, extra: Partial<Finding> = {}): Finding => ({ id: `${checkId}#1`, checkId, severity: 'minor', category: 'site', title: 'Test finding', detail: 'Test detail.', ...extra });

describe('help coverage', () => {
  const ids = engineCheckIds();

  it('finds the engine checks', () => {
    expect(ids.length).toBeGreaterThan(80);
    for (const id of ['conn.sideentry', 'clear.selfphase', 'relay.fuse.advice', 'ground', 'ground.no-rods', 'surge.xfmr.hv', 'site.altitude']) expect(ids).toContain(id);
  });

  it('has help for every checkId the engine emits', () => {
    for (const levelId of ['l5-growing-pains', 'l7-ring-around', 'l8-thin-air']) {
      const ctx = ctxFor(levelId);
      const kinds = [...new Set(ctx.design.items.map((i) => i.kind))];
      const samples = kinds.map((k) => ctx.design.items.find((i) => i.kind === k)!.id);
      const cid = ctx.design.conductors[0]?.id;
      for (const checkId of ids) {
        const bare = helpForFinding(finding(checkId), ctx);
        expect(bare, `${checkId} has no help`).not.toBeNull();
        expectWellFormed(bare!, ctx.level, `${levelId} ${checkId}`);
        // The entries look up the items a finding names: make sure any item (or none) is handled.
        for (const id of samples) {
          const h = helpForFinding(finding(checkId, { itemIds: [id, samples[0]!], conductorIds: cid ? [cid] : undefined }), ctx);
          expect(h, `${checkId} with ${id}`).not.toBeNull();
          expect(() => h!.fix?.apply(ctx.design, ctx.level)).not.toThrow();
        }
      }
    }
  });

  it('has help for every objective kind', () => {
    // Compile-time exhaustiveness: adding an ObjectiveKind without listing it here fails the type check.
    const ALL: Record<ObjectiveKind, true> = {
      feeders_served: true, feeder_protection: true, transformer_protection: true, voltage_regulation: true, bypass_reclosers: true, bypass_regulators: true,
      shielding: true, grounding_safe: true, fence: true, transformer_capacity: true, mobile_provision: true, expansion_area: true, n_minus_1_transformer: true,
      switching_scheme: true, line_protection: true, arresters: true, capacitor_kvar: true, removal_path: true, clearances: true,
    };
    for (const kind of Object.keys(ALL) as ObjectiveKind[]) expect(OBJECTIVE_HELP[kind], kind).toBeTypeOf('function');
  });

  it('has help for every objective used in the campaign', () => {
    for (const level of CAMPAIGN) {
      const ctx = ctxFor(level.id);
      for (const objective of level.objectives) {
        const h = helpForObjective({ objective, met: false }, ctx);
        expect(h, `${level.id} ${objective.kind}`).not.toBeNull();
        expectWellFormed(h!, level, `${level.id} ${objective.kind}`);
      }
    }
  });
});

describe('help on fresh campaign designs', () => {
  for (const level of CAMPAIGN) {
    it(`${level.id}: every finding and unmet objective has help, and fixes apply cleanly`, () => {
      const design = newDesign(level);
      const review = reviewDesign(design, level);
      const ctx: HelpCtx = { level, design, review };
      const helps: Array<[string, Help | null]> = [
        ...review.findings.map((f): [string, Help | null] => [f.checkId, helpForFinding(f, ctx)]),
        ...review.objectives.filter((o) => !o.met).map((o): [string, Help | null] => [o.objective.kind, helpForObjective(o, ctx)]),
      ];
      expect(helps.length).toBeGreaterThan(0);
      for (const [what, h] of helps) {
        expect(h, `${level.id} ${what}`).not.toBeNull();
        expectWellFormed(h!, level, `${level.id} ${what}`);
        if (h!.fix) {
          let out: Design | null = null;
          expect(() => (out = h!.fix!.apply(design, level))).not.toThrow();
          if (out) expect((out as Design).items).toBeInstanceOf(Array);
        }
      }
    });
  }
});

/** Apply a finding's fix to a broken design and return the re-reviewed result. */
function applyFix(levelId: string, design: Design, checkId: string, itemId?: string) {
  const ctx = ctxFor(levelId, design);
  const f = ctx.review.findings.find((x) => x.checkId === checkId && (!itemId || x.itemIds?.includes(itemId)));
  expect(f, `${checkId} should be raised`).toBeDefined();
  const h = helpForFinding(f!, ctx)!;
  expect(h.fix, `${checkId} should offer a fix`).toBeDefined();
  const before = structuredClone(design);
  const fixed = h.fix!.apply(design, ctx.level);
  expect(fixed).not.toBeNull();
  expect(design, 'fix must not mutate its input').toEqual(before);
  return reviewDesign(fixed!, ctx.level);
}

const ids = (r: ReturnType<typeof reviewDesign>, itemId: string) => r.findings.filter((f) => f.itemIds?.includes(itemId)).map((f) => f.checkId);

describe('one-click fixes resolve their finding', () => {
  it('conn.feederunassigned assigns the free feeder', () => {
    const d = SOLUTIONS['l1-first-light']!();
    d.items.find((i) => i.id === 'FE1')!.props.feeder = '';
    const r = applyFix('l1-first-light', d, 'conn.feederunassigned');
    expect(r.findings.map((f) => f.checkId)).not.toContain('conn.feederunassigned');
    expect(r.findings.map((f) => f.checkId)).not.toContain('conn.feedermissing');
  });

  it('rating.recloser.std picks a standard rating that still meets the duty', () => {
    const d = SOLUTIONS['l1-first-light']!();
    d.items.find((i) => i.id === 'R1')!.props.interruptingKA = 7;
    const r = applyFix('l1-first-light', d, 'rating.recloser.std', 'R1');
    expect(ids(r, 'R1')).toEqual([]);
  });

  it('rating.interrupt raises a recloser to a standard rating', () => {
    const d = SOLUTIONS['l1-first-light']!();
    d.items.find((i) => i.id === 'R1')!.props.interruptingKA = 1.25;
    const r = applyFix('l1-first-light', d, 'rating.interrupt', 'R1');
    expect(ids(r, 'R1')).toEqual([]);
  });

  it('rating.interrupt raises a fuse to the next rating', () => {
    const d = SOLUTIONS['l5-growing-pains']!();
    d.items.find((i) => i.id === 'F1')!.props.interruptingKA = 10;
    const r = applyFix('l5-growing-pains', d, 'rating.interrupt', 'F1');
    expect(ids(r, 'F1')).not.toContain('rating.interrupt');
    expect(r.findings.find((f) => f.itemIds?.includes('F1'))).toBeUndefined();
  });

  it('relay.feeder ticks the feeder breaker relays', () => {
    const levelId = 'l1-first-light';
    const d = SOLUTIONS[levelId]!();
    // Turn feeder 1's recloser into a breaker of the same centre line, with no relays.
    const r1 = d.items.find((i) => i.id === 'R1')!;
    const fp = CATALOG.breaker.footprint(r1.kv, defaultProps('breaker'));
    const y = r1.y + CATALOG.recloser.footprint(r1.kv, r1.props).d / 2;
    Object.assign(r1, { kind: 'breaker', props: { ...defaultProps('breaker'), relays: [] }, y: y - fp.d / 2 });
    const out = d.conductors.find((c) => c.id === 'F1c')!;
    out.points[0] = { x: r1.x + fp.w, y };
    const r = applyFix(levelId, d, 'relay.feeder', 'R1');
    expect(ids(r, 'R1').filter((c) => c.startsWith('relay.'))).toEqual([]);
  });

  it('relay.xfmr ticks the transformer relays', () => {
    const d = SOLUTIONS['l8-thin-air']!();
    d.items.find((i) => i.id === 'T1')!.props.relays = [];
    const r = applyFix('l8-thin-air', d, 'relay.xfmr', 'T1');
    expect(r.findings.map((f) => f.checkId).filter((c) => c.startsWith('relay.xfmr'))).toEqual([]);
  });

  it('surge.reg ticks the regulator tank arresters', () => {
    const d = SOLUTIONS['l3-thunderstorm-alley']!();
    d.items.find((i) => i.id === 'RG1')!.props.arresters = false;
    const r = applyFix('l3-thunderstorm-alley', d, 'surge.reg', 'RG1');
    expect(ids(r, 'RG1')).not.toContain('surge.reg');
  });

  it('ground.missing installs the ground grid', () => {
    const d = SOLUTIONS['l6-touch-and-step']!();
    d.groundGrid = { ...d.groundGrid, enabled: false };
    const r = applyFix('l6-touch-and-step', d, 'ground.missing');
    expect(r.findings.map((f) => f.checkId)).not.toContain('ground.missing');
  });

  it('bypass_regulators ticks the regulator bypass switches', () => {
    const levelId = 'l2-keep-the-lights-on';
    const d = SOLUTIONS[levelId]!();
    d.items.find((i) => i.id === 'RG1')!.props.bypass = false;
    const ctx = ctxFor(levelId, d);
    const o = ctx.review.objectives.find((x) => x.objective.kind === 'bypass_regulators')!;
    expect(o.met).toBe(false);
    const h = helpForObjective(o, ctx)!;
    expect(h.itemIds).toEqual(['RG1']);
    const fixed = h.fix!.apply(d, ctx.level)!;
    expect(reviewDesign(fixed, ctx.level).objectives.find((x) => x.objective.kind === 'bypass_regulators')!.met).toBe(true);
  });
});
