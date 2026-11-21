/**
 * Physical layout checks: placement, fence safety clearance (Fig. 4-21),
 * electrical clearances (Table 4-7), site limits and equipment removal (§4.2.6).
 */
import { VOLTAGE_CLASS_CITES, voltageClassFor } from '../../data/bulletin/voltageClasses';
import { busHeight, CATALOG } from '../catalog';
import { distToRectBoundary, pointInRect, rectContainsRect, rectGap, rectInsetFrom, rectsOverlap, segRectDist, segments } from '../geometry';
import { footprintOf, itemLabel, itemPorts, itemRect } from '../items';
import type { Topology } from '../topology';
import type { Conductor, Design, Finding, LevelDef, PlacedItem, Rect, Vec2 } from '../types';

export const CITE_REMOVAL = { page: 120, section: '4.2.6', figure: '4-1' } as const;
export const CITE_EXPANSION = { page: 119, section: '4.2.3' } as const;

/**
 * Fig. 4-21 safety clearance zone at the fence: inside the fence, live parts
 * must not be within horizontal distance B below height A−B, nor within radius B
 * of the point on the fence line at height A−B (the dashed arc up to height A).
 * For 115 kV and above, A increases 3% per 300 m above 1000 m altitude.
 */
export function fenceZoneViolation(horizontalFromFence: number, height: number, kv: number, altitudeM = 0): boolean {
  const vc = voltageClassFor(kv);
  if (vc.fenceDimAM == null || vc.fenceDimBM == null) return false;
  let A = vc.fenceDimAM;
  const B = vc.fenceDimBM;
  if (kv >= 115 && altitudeM > 1000) A *= 1 + 0.03 * Math.ceil((altitudeM - 1000) / 300);
  const knee = A - B;
  if (horizontalFromFence < 0) return true;
  if (height <= knee) return horizontalFromFence < B - 1e-6;
  return Math.hypot(horizontalFromFence, height - knee) < B - 1e-6;
}

/** Minimum horizontal distance from the fence that satisfies Fig. 4-21 at a given height. */
export function fenceRequiredDistance(height: number, kv: number, altitudeM = 0): number {
  const vc = voltageClassFor(kv);
  if (vc.fenceDimAM == null || vc.fenceDimBM == null) return 0;
  let A = vc.fenceDimAM;
  const B = vc.fenceDimBM;
  if (kv >= 115 && altitudeM > 1000) A *= 1 + 0.03 * Math.ceil((altitudeM - 1000) / 300);
  const knee = A - B;
  if (height <= knee) return B;
  const dz = height - knee;
  return dz >= B ? 0 : Math.sqrt(B * B - dz * dz);
}

let seq = 0;
const fid = (check: string) => `${check}#${++seq}`;

function itemKV(it: PlacedItem): number {
  return it.kv;
}

/** Conductor segment's outer-phase offset from its centerline. */
const phaseOffset = (kv: number) => voltageClassFor(kv).rigidBusPhaseSpacingM;

/**
 * Plan-view envelope of a three-phase bus segment: the centreline inflated by
 * the phase spacing perpendicular to the run (outer phases sit at ±spacing).
 */
export function segmentEnvelope(a: Vec2, b: Vec2, kv: number): Rect {
  const s = phaseOffset(kv);
  const horizontal = Math.abs(a.y - b.y) < 1e-9;
  const x0 = Math.min(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const w = Math.abs(a.x - b.x);
  const h = Math.abs(a.y - b.y);
  return horizontal ? { x: x0, y: y0 - s, w, h: 2 * s } : { x: x0 - s, y: y0, w: 2 * s, h };
}

export function conductorEnvelopes(c: Conductor): Rect[] {
  return [...segments(c.points)].map(([a, b]) => segmentEnvelope(a, b, c.kv));
}

export function checkPhysical(design: Design, level: LevelDef, topo: Topology): Finding[] {
  seq = 0;
  const out: Finding[] = [];
  const site: Rect = { x: 0, y: 0, w: level.site.width, h: level.site.depth };
  const rects = new Map<string, Rect>();
  for (const it of design.items) rects.set(it.id, itemRect(it));

  // --- Placement --------------------------------------------------------------
  for (const it of design.items) {
    const r = rects.get(it.id)!;
    if (!rectContainsRect(site, r)) {
      out.push({ id: fid('site.bounds'), checkId: 'site.bounds', severity: 'critical', category: 'site', title: `${itemLabel(it)} is outside the property`, detail: 'Everything must be built on the acquired site.', itemIds: [it.id] });
    }
    for (const nb of level.site.noBuild ?? []) {
      if (rectsOverlap(r, nb)) {
        out.push({ id: fid('site.nobuild'), checkId: 'site.nobuild', severity: 'critical', category: 'site', title: `${itemLabel(it)} is in a no-build area (${nb.label})`, detail: 'Move it off the restricted area.', itemIds: [it.id] });
      }
    }
  }
  for (let i = 0; i < design.items.length; i++) {
    for (let j = i + 1; j < design.items.length; j++) {
      const a = design.items[i]!;
      const b = design.items[j]!;
      if (rectsOverlap(rects.get(a.id)!, rects.get(b.id)!)) {
        out.push({ id: fid('place.overlap'), checkId: 'place.overlap', severity: 'critical', category: 'clearance', title: `${itemLabel(a)} overlaps ${itemLabel(b)}`, detail: 'Equipment footprints cannot overlap.', itemIds: [a.id, b.id] });
      }
    }
  }

  // --- Fence -------------------------------------------------------------------
  const fence = design.fence;
  if (!fence) {
    if (level.features.fence) {
      out.push({
        id: fid('fence.missing'),
        checkId: 'fence.missing',
        severity: 'critical',
        category: 'safety',
        title: 'No security fence',
        detail: 'Energized equipment must be enclosed by the substation fence, with live parts kept outside the Fig. 4-21 safety clearance zone.',
        cite: [VOLTAGE_CLASS_CITES.fence],
      });
    }
  } else {
    if (!rectContainsRect(site, fence.rect)) {
      out.push({ id: fid('fence.bounds'), checkId: 'fence.bounds', severity: 'critical', category: 'site', title: 'Fence extends beyond the property', detail: 'Keep the fence on the site.' });
    }
    for (const it of design.items) {
      const def = CATALOG[it.kind];
      const r = rects.get(it.id)!;
      const inset = rectInsetFrom(r, fence.rect);
      if (inset < -1e-6 && (def.live || it.kind === 'control_house')) {
        out.push({ id: fid('fence.outside'), checkId: 'fence.outside', severity: 'critical', category: 'safety', title: `${itemLabel(it)} is outside the fence`, detail: 'Energized equipment and the control house belong inside the fenced yard.', itemIds: [it.id], cite: [VOLTAGE_CLASS_CITES.fence] });
        continue;
      }
      if (!def.live) continue;
      const fp = footprintOf(it);
      const kv = itemKV(it);
      if (fenceZoneViolation(inset, fp.liveHeight, kv, level.site.altitudeM)) {
        const need = fenceRequiredDistance(fp.liveHeight, kv, level.site.altitudeM);
        out.push({
          id: fid('fence.clearance'),
          checkId: 'fence.clearance',
          severity: 'critical',
          category: 'safety',
          title: `${itemLabel(it)} is inside the fence safety zone`,
          detail: `Live parts at ${fp.liveHeight.toFixed(1)} m are ${Math.max(0, inset).toFixed(1)} m from the fence; at ${kv} kV they need at least ${need.toFixed(1)} m (Fig. 4-21 dimensions A/B).`,
          itemIds: [it.id],
          cite: [VOLTAGE_CLASS_CITES.fence],
        });
      }
    }
    for (const c of design.conductors) {
      if (c.points.length < 2) continue;
      const h = busHeight(c.kv, c.elevation);
      if (!c.points.every((p) => pointInRect(p, fence.rect))) {
        out.push({ id: fid('fence.outside'), checkId: 'fence.outside', severity: 'critical', category: 'safety', title: 'Bus runs outside the fence', detail: 'Keep station bus inside the fenced yard.', conductorIds: [c.id], at: c.points[0], cite: [VOLTAGE_CLASS_CITES.fence] });
        continue;
      }
      const x = Math.min(...conductorEnvelopes(c).map((e) => rectInsetFrom(e, fence.rect)));
      if (fenceZoneViolation(x, h, c.kv, level.site.altitudeM)) {
        out.push({
          id: fid('fence.clearance'),
          checkId: 'fence.clearance',
          severity: 'critical',
          category: 'safety',
          title: `${c.kv} kV bus too close to the fence`,
          detail: `Outer phase is ${Math.max(0, x).toFixed(1)} m from the fence at ${h.toFixed(1)} m height; it needs ${fenceRequiredDistance(h, c.kv, level.site.altitudeM).toFixed(1)} m (Fig. 4-21).`,
          conductorIds: [c.id],
          at: c.points[0],
          cite: [VOLTAGE_CLASS_CITES.fence],
        });
      }
    }
    // Expansion area must be inside the fence and kept clear.
    if (level.expansionArea) {
      const ea = level.expansionArea;
      if (!rectContainsRect(fence.rect, ea)) {
        out.push({ id: fid('site.expansion'), checkId: 'site.expansion', severity: 'major', category: 'objective', title: 'Future expansion area is not inside the fence', detail: 'Arrange the initial design to accommodate the long-range forecast; enclose the reserved bay area.', cite: [CITE_EXPANSION], at: { x: ea.x + ea.w / 2, y: ea.y + ea.h / 2 } });
      }
    }
  }

  if (level.expansionArea) {
    const ea = level.expansionArea;
    const blockers = design.items.filter((it) => rectsOverlap(rects.get(it.id)!, ea));
    const cBlock = design.conductors.filter((c) => [...segments(c.points)].some(([a, b]) => segRectDist(a, b, ea) < 1e-6));
    if (blockers.length || cBlock.length) {
      out.push({ id: fid('site.expansion.blocked'), checkId: 'site.expansion.blocked', severity: 'major', category: 'objective', title: 'Future expansion area is occupied', detail: 'Keep the reserved area clear so the substation can grow without rebuilding.', itemIds: blockers.map((b) => b.id), conductorIds: cBlock.map((c) => c.id), cite: [CITE_EXPANSION] });
    }
  }

  // --- Conductor clearances (Table 4-7) -------------------------------------------
  const nodeOf = (cid: string) => topo.nodeOfConductor.get(cid) ?? `float:${cid}`;
  const conds = design.conductors.filter((c) => c.points.length >= 2);
  const reported = new Set<string>();
  for (let i = 0; i < conds.length; i++) {
    for (let j = i + 1; j < conds.length; j++) {
      const A = conds[i]!;
      const B = conds[j]!;
      if (nodeOf(A.id) === nodeOf(B.id)) continue;
      if (A.elevation !== B.elevation) {
        const vgap = Math.abs(busHeight(A.kv, A.elevation) - busHeight(B.kv, B.elevation));
        const c = Math.max(voltageClassFor(A.kv).minMetalToMetalM, voltageClassFor(B.kv).minMetalToMetalM);
        if (vgap >= c + 0.5) continue;
      }
      const need = Math.max(voltageClassFor(A.kv).minMetalToMetalM, voltageClassFor(B.kv).minMetalToMetalM);
      let dmin = Infinity;
      let at: Vec2 | undefined;
      const envA = conductorEnvelopes(A);
      const envB = conductorEnvelopes(B);
      for (const ea of envA) {
        for (const eb of envB) {
          const d = rectGap(ea, eb);
          if (d < dmin) {
            dmin = d;
            at = { x: (ea.x + ea.w / 2 + eb.x + eb.w / 2) / 2, y: (ea.y + ea.h / 2 + eb.y + eb.h / 2) / 2 };
          }
        }
      }
      if (dmin < need - 1e-6) {
        const key = [A.id, B.id].sort().join('|');
        if (reported.has(key)) continue;
        reported.add(key);
        out.push({
          id: fid('clear.phase'),
          checkId: 'clear.phase',
          severity: 'critical',
          category: 'clearance',
          title: dmin < 1e-6 ? 'Buses of different circuits touch or cross' : 'Buses of different circuits are too close',
          detail: `Outer phases are ${dmin.toFixed(2)} m apart; Table 4-7 minimum metal-to-metal clearance is ${need.toFixed(3)} m. Crossing buses must be at different elevations.`,
          conductorIds: [A.id, B.id],
          at,
          cite: [VOLTAGE_CLASS_CITES.clearances],
        });
      }
    }
  }

  // Conductors vs equipment of other nodes, and vs grounded structures.
  for (const c of conds) {
    const cn = nodeOf(c.id);
    const ch = busHeight(c.kv, c.elevation);
    const vcC = voltageClassFor(c.kv);
    for (const it of design.items) {
      const def = CATALOG[it.kind];
      const r = rects.get(it.id)!;
      const fp = footprintOf(it);
      const sharesNode = fp.ports.some((p) => topo.nodeOfPort.get(`${it.id}:${p.id}`) === cn);
      if (def.grounded) {
        // Grounded structures: Table 4-7 minimum to grounded parts.
        if (it.kind === 'mast' || ch < fp.height + vcC.minToGroundedPartsM) {
          const need = vcC.minToGroundedPartsM;
          let dmin = Infinity;
          for (const e of conductorEnvelopes(c)) dmin = Math.min(dmin, rectGap(e, r));
          if (dmin < need - 1e-6) {
            out.push({
              id: fid('clear.ground'),
              checkId: 'clear.ground',
              severity: 'critical',
              category: 'clearance',
              title: `${c.kv} kV bus too close to ${CATALOG[it.kind].name.toLowerCase()}`,
              detail: `Clearance to grounded parts is ${dmin.toFixed(2)} m; Table 4-7 requires ${vcC.minToGroundedPartsM.toFixed(3)} m at ${c.kv} kV.`,
              conductorIds: [c.id],
              itemIds: [it.id],
              cite: [VOLTAGE_CLASS_CITES.clearances],
            });
          }
        }
        continue;
      }
      if (!def.live || sharesNode) continue;
      // High bus passing over lower equipment is fine with adequate vertical gap.
      const metal = Math.max(vcC.minMetalToMetalM, voltageClassFor(it.kv || c.kv).minMetalToMetalM);
      if (ch - fp.height >= metal + 0.5) continue;
      let dmin = Infinity;
      for (const e of conductorEnvelopes(c)) dmin = Math.min(dmin, rectGap(e, r));
      const need = metal * 0.5;
      if (dmin < need - 1e-6) {
        out.push({
          id: fid('clear.equipment'),
          checkId: 'clear.equipment',
          severity: 'critical',
          category: 'clearance',
          title: `Bus passes too close to ${itemLabel(it)}`,
          detail: `A bus that is not connected to this equipment passes ${dmin.toFixed(2)} m from it. Reroute it, raise it to high-bus elevation, or move the equipment (Table 4-7).`,
          conductorIds: [c.id],
          itemIds: [it.id],
          cite: [VOLTAGE_CLASS_CITES.clearances],
        });
      }
    }
    if (!pointsInside(c.points, site)) {
      out.push({ id: fid('site.bounds'), checkId: 'site.bounds', severity: 'critical', category: 'site', title: 'Bus extends beyond the property', detail: 'Keep all construction on the site.', conductorIds: [c.id] });
    }
    for (const nb of level.site.noBuild ?? []) {
      if ([...segments(c.points)].some(([a, b]) => segRectDist(a, b, nb) < 1e-6)) {
        out.push({ id: fid('site.nobuild'), checkId: 'site.nobuild', severity: 'critical', category: 'site', title: `Bus crosses a no-build area (${nb.label})`, detail: 'Route around the restricted area.', conductorIds: [c.id] });
      }
    }
  }

  out.push(...checkRemovalPaths(design, level, rects));
  return out;
}

function pointsInside(points: readonly Vec2[], r: Rect): boolean {
  return points.every((p) => pointInRect(p, r, 1e-6));
}

// ---------------------------------------------------------------------------
// Equipment removal (§4.2.6)
// ---------------------------------------------------------------------------

const REMOVABLE = new Set(['transformer', 'breaker', 'regulator']);

export interface GateSegment {
  a: Vec2;
  b: Vec2;
  /** Unit vector along the gate (a -> b). */
  along: Vec2;
  width: number;
}

export function gateSegment(design: Design): GateSegment | null {
  const f = design.fence;
  if (!f) return null;
  const { rect, gate } = f;
  let a: Vec2;
  let along: Vec2;
  switch (gate.side) {
    case 'N':
      a = { x: rect.x + gate.offset, y: rect.y };
      along = { x: 1, y: 0 };
      break;
    case 'S':
      a = { x: rect.x + gate.offset, y: rect.y + rect.h };
      along = { x: 1, y: 0 };
      break;
    case 'W':
      a = { x: rect.x, y: rect.y + gate.offset };
      along = { x: 0, y: 1 };
      break;
    case 'E':
      a = { x: rect.x + rect.w, y: rect.y + gate.offset };
      along = { x: 0, y: 1 };
      break;
  }
  const b = { x: a.x + along.x * gate.width, y: a.y + along.y * gate.width };
  return { a, b, along, width: gate.width };
}

/**
 * Can a removable item be moved from its pad out through the gate? Grid search
 * with obstacles inflated by half the item's narrow dimension. Low buses whose
 * height is below the item height plus the phase-to-ground clearance block the
 * path; high buses do not (§4.2.6 suggests main buses at higher elevation so
 * they don't block equipment removal).
 */
export function removalPath(design: Design, item: PlacedItem, rects: Map<string, Rect>): { ok: boolean; path?: Vec2[] } {
  const fence = design.fence;
  const gate = gateSegment(design);
  if (!fence || !gate) return { ok: false };
  const cell = 0.5;
  const fr = fence.rect;
  const cols = Math.ceil(fr.w / cell);
  const rows = Math.ceil(fr.h / cell);
  const r0 = rects.get(item.id)!;
  const fp = footprintOf(item);
  const half = Math.min(r0.w, r0.h) / 2;
  if (gate.width + 1e-6 < 2 * half) return { ok: false };
  const blocked = new Uint8Array(cols * rows);
  const center = (x: number, y: number): Vec2 => ({ x: fr.x + (x + 0.5) * cell, y: fr.y + (y + 0.5) * cell });
  const markRect = (r: Rect, inflate: number) => {
    const x0 = Math.max(0, Math.floor((r.x - inflate - fr.x) / cell));
    const x1 = Math.min(cols - 1, Math.ceil((r.x + r.w + inflate - fr.x) / cell) - 1);
    const y0 = Math.max(0, Math.floor((r.y - inflate - fr.y) / cell));
    const y1 = Math.min(rows - 1, Math.ceil((r.y + r.h + inflate - fr.y) / cell) - 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) blocked[y * cols + x] = 1;
  };
  for (const it of design.items) {
    if (it.id === item.id) continue;
    markRect(rects.get(it.id)!, half - 0.01);
  }
  const vc = voltageClassFor(item.kv || 12.47);
  // The item's own leads (conductors ending on its terminals) are removed with it.
  const ownPorts = itemPorts(item, fp).map((p) => p.pos);
  for (const c of design.conductors) {
    if (c.points.length < 2) continue;
    if (busHeight(c.kv, c.elevation) >= fp.height + vc.minToGroundedPartsM) continue;
    const ends = [c.points[0]!, c.points[c.points.length - 1]!];
    if (ends.some((e) => ownPorts.some((p) => Math.abs(p.x - e.x) < 1e-6 && Math.abs(p.y - e.y) < 1e-6))) continue;
    for (const env of conductorEnvelopes(c)) markRect(env, half - 0.01);
  }
  // Position along the gate line, and whether a cell lies in the usable gate opening.
  const alongPos = (p: Vec2) => (p.x - gate.a.x) * gate.along.x + (p.y - gate.a.y) * gate.along.y;
  const inGateSpan = (p: Vec2) => {
    const t = alongPos(p);
    return t >= half - cell && t <= gate.width - half + cell;
  };
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const p = center(x, y);
      const dEdge = distToRectBoundary(p, fr);
      if (dEdge >= half) continue;
      const dGate = segRectDist(gate.a, gate.b, { x: p.x, y: p.y, w: 0, h: 0 });
      if (dGate <= half + cell && inGateSpan(p)) continue;
      blocked[y * cols + x] = 1;
    }
  }
  const sx = Math.floor((r0.x + r0.w / 2 - fr.x) / cell);
  const sy = Math.floor((r0.y + r0.h / 2 - fr.y) / cell);
  if (sx < 0 || sy < 0 || sx >= cols || sy >= rows) return { ok: false };
  const isGoal = (x: number, y: number) => {
    const p = center(x, y);
    return inGateSpan(p) && segRectDist(gate.a, gate.b, { x: p.x, y: p.y, w: 0, h: 0 }) <= cell;
  };
  const prev = new Int32Array(cols * rows).fill(-1);
  const startIdx = sy * cols + sx;
  prev[startIdx] = startIdx;
  blocked[startIdx] = 0;
  const q: number[] = [startIdx];
  let found = -1;
  for (let head = 0; head < q.length; head++) {
    const cur = q[head]!;
    const cx = cur % cols;
    const cy = (cur / cols) | 0;
    if (isGoal(cx, cy)) {
      found = cur;
      break;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const ni = ny * cols + nx;
      if (prev[ni] !== -1 || blocked[ni]) continue;
      prev[ni] = cur;
      q.push(ni);
    }
  }
  if (found < 0) return { ok: false };
  const path: Vec2[] = [];
  for (let c = found; ; c = prev[c]!) {
    path.push(center(c % cols, (c / cols) | 0));
    if (prev[c] === c) break;
  }
  return { ok: true, path: path.reverse() };
}

function checkRemovalPaths(design: Design, level: LevelDef, rects: Map<string, Rect>): Finding[] {
  if (!design.fence) return [];
  const out: Finding[] = [];
  for (const it of design.items) {
    if (!REMOVABLE.has(it.kind)) continue;
    if (it.kind === 'regulator' && level.system.lvKV === undefined) continue;
    const res = removalPath(design, it, rects);
    if (!res.ok) {
      out.push({
        id: fid('layout.removal'),
        checkId: 'layout.removal',
        severity: it.kind === 'transformer' ? 'major' : 'minor',
        category: 'site',
        title: `No removal route for ${itemLabel(it)}`,
        detail: 'Leave a clear path to the gate wide enough for the equipment. Low buses block removal; raise main buses (high elevation) or leave a gap.',
        itemIds: [it.id],
        cite: [CITE_REMOVAL],
      });
    }
  }
  return out;
}

export type { Conductor };
