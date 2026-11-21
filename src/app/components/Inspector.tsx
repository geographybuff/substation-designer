import { formatCitation, type Citation } from '../../data/bulletin/types';
import { voltageClassFor } from '../../data/bulletin/voltageClasses';
import { busHeight, CATALOG, CONDUCTOR_SIZES, type PropDef } from '../../engine/catalog';
import { conductorCost, itemCost } from '../../engine/costs';
import { deleteConductors, deleteItems, deleteShieldWire, rotateItem, setFence, setItemProp, updateConductor, updateItem } from '../../engine/design';
import { transformerTopRatingKVA } from '../../engine/equipment';
import { polylineLength } from '../../engine/geometry';
import { footprintOf } from '../../engine/items';
import { RELAY_OPTIONS } from '../../engine/relays';
import type { DesignReview } from '../../engine/review';
import type { Design, GroundConductorSize, LevelDef, PlacedItem, PropValue, Side, SurfacingMaterial } from '../../engine/types';
import { kvColor } from '../../editor/theme';
import { commit, store } from '../store';

export const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export function CiteLink({ cite }: { cite: Citation }) {
  return (
    <span class="cite" title="Open in Field Guide" onClick={() => store.set({ screen: 'guide', guideTopic: `cite:${cite.section ?? ''}` })}>
      {formatCitation(cite, true)}
    </span>
  );
}

function PropField({ def, value, onChange, level }: { def: PropDef; value: PropValue; onChange: (v: PropValue) => void; level: LevelDef }) {
  let options = def.options ?? [];
  if (def.key === 'feeder') options = level.system.feeders.map((f) => ({ value: f.name, label: `${f.name} (${f.customers.toLocaleString()} members)` }));
  if (def.key === 'relays') options = RELAY_OPTIONS.map((r) => ({ value: r.code, label: `${r.code} ${r.name}` }));
  if (def.type === 'multi') {
    const arr = Array.isArray(value) ? value : [];
    return (
      <div class="field" style={{ gridTemplateColumns: '1fr' }}>
        <label>{def.label}</label>
        <div style={{ display: 'grid', gap: '.15em' }}>
          {options.map((o) => (
            <label key={String(o.value)} class="small" style={{ display: 'flex', gap: '.4em', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={arr.includes(String(o.value))}
                onChange={(e) => {
                  const on = (e.target as HTMLInputElement).checked;
                  onChange(on ? [...arr, String(o.value)] : arr.filter((x) => x !== String(o.value)));
                }}
              />
              {o.label}
            </label>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div class="field">
      <label>{def.label}</label>
      {def.type === 'bool' ? (
        <input type="checkbox" checked={!!value} onChange={(e) => onChange((e.target as HTMLInputElement).checked)} style={{ justifySelf: 'start' }} />
      ) : def.type === 'number' ? (
        <input type="number" value={Number(value)} min={def.min} max={def.max} step={def.step} onChange={(e) => onChange(Number((e.target as HTMLInputElement).value))} />
      ) : (
        <select
          value={String(value)}
          onChange={(e) => {
            const raw = (e.target as HTMLSelectElement).value;
            const opt = options.find((o) => String(o.value) === raw);
            onChange(opt ? opt.value : raw);
          }}
        >
          {options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {def.help && <div class="help">{def.help}</div>}
    </div>
  );
}

function ItemInspector({ item, design, level, review }: { item: PlacedItem; design: Design; level: LevelDef; review: DesignReview | null }) {
  const def = CATALOG[item.kind];
  const fp = footprintOf(item);
  const set = (key: string, v: PropValue) => commit(setItemProp(design, item.id, key, v));
  const findings = review?.findings.filter((f) => f.itemIds?.includes(item.id)) ?? [];
  const current = review?.calc.deviceCurrentA.get(item.id);
  const tLoad = review?.calc.transformerLoadMVA.get(item.id);
  const d = review?.topo.deviceById.get(item.id);
  const fault = d ? Math.max(...[d.a, d.b].map((n) => (n ? (review?.calc.faultKA.get(n) ?? 0) : 0))) : 0;
  return (
    <div data-testid="inspector-item">
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5em' }}>
        <h3 style={{ margin: 0, flex: 1 }}>{def.name}</h3>
        {item.kv > 0 && (
          <span class="kv-chip" style={{ background: kvColor(item.kv) }}>
            {item.kv} kV
          </span>
        )}
      </div>
      <div class="field">
        <label>Label</label>
        <input
          type="text"
          value={item.label ?? ''}
          placeholder={item.id}
          disabled={item.locked}
          onChange={(e) => commit(updateItem(design, item.id, { label: (e.target as HTMLInputElement).value || undefined }))}
          style={{ background: '#0d141b', border: '1px solid var(--line)', borderRadius: 6, padding: '.3em .4em' }}
        />
      </div>
      <p class="muted small">{def.description}</p>
      {!item.locked && (
        <div style={{ display: 'flex', gap: '.4em', marginBottom: '.6em' }}>
          <button class="btn small" onClick={() => commit(rotateItem(design, item.id))}>
            ⟳ Rotate (R)
          </button>
          <button
            class="btn small danger"
            onClick={() => {
              commit(deleteItems(design, [item.id]));
              store.set({ selection: [] });
            }}
          >
            Delete
          </button>
        </div>
      )}
      {def.props.map((p) => (p.showIf && item.props[p.showIf.key] !== p.showIf.equals ? null : <PropField key={p.key} def={p} value={item.props[p.key] ?? p.default} onChange={(v) => set(p.key, v)} level={level} />))}
      <div style={{ marginTop: '.6em' }}>
        {item.kind === 'transformer' && (
          <div class="metric">
            <span>Top rating ({String(item.props.cooling)})</span>
            <b>{(transformerTopRatingKVA(item) / 1000).toFixed(1)} MVA</b>
          </div>
        )}
        {tLoad && (
          <div class="metric">
            <span>Load now / year {level.system.horizonYears}</span>
            <b>
              {tLoad.now.toFixed(1)} / {tLoad.horizon.toFixed(1)} MVA
            </b>
          </div>
        )}
        {current !== undefined && current > 0 && (
          <div class="metric">
            <span>Load current (year {level.system.horizonYears})</span>
            <b>{Math.round(current)} A</b>
          </div>
        )}
        {fault > 0 && (
          <div class="metric">
            <span>Available fault current</span>
            <b>{fault.toFixed(1)} kA</b>
          </div>
        )}
        <div class="metric">
          <span>Footprint · live height</span>
          <b>
            {fp.w} × {fp.d} m · {fp.liveHeight.toFixed(1)} m
          </b>
        </div>
        <div class="metric">
          <span>Installed cost (estimate)</span>
          <b>{item.locked ? 'existing' : money(itemCost(item))}</b>
        </div>
      </div>
      {findings.length > 0 && (
        <div style={{ marginTop: '.6em' }}>
          {findings.map((f) => (
            <div key={f.id} class={`finding ${f.severity}`}>
              <div class={`sev ${f.severity}`}>{f.severity}</div>
              <div class="t">{f.title}</div>
              <div class="d">{f.detail}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: '.7em', display: 'flex', flexWrap: 'wrap', gap: '.5em' }}>
        {def.cites.map((c, i) => (
          <CiteLink key={i} cite={c} />
        ))}
      </div>
    </div>
  );
}

function ConductorInspector({ id, design, review }: { id: string; design: Design; review: DesignReview | null }) {
  const c = design.conductors.find((x) => x.id === id)!;
  const vc = voltageClassFor(c.kv);
  const node = review?.topo.nodeOfConductor.get(c.id);
  const amps = node ? review?.calc.nodeCurrentA.get(node) : undefined;
  return (
    <div data-testid="inspector-conductor">
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5em' }}>
        <h3 style={{ margin: 0, flex: 1 }}>Rigid bus</h3>
        <span class="kv-chip" style={{ background: kvColor(c.kv) }}>
          {c.kv} kV
        </span>
      </div>
      <div class="field">
        <label>Elevation</label>
        <select value={c.elevation} onChange={(e) => commit(updateConductor(design, c.id, { elevation: (e.target as HTMLSelectElement).value as 'low' | 'high' }))}>
          <option value="low">Low profile ({busHeight(c.kv, 'low')} m)</option>
          <option value="high">High ({busHeight(c.kv, 'high')} m)</option>
        </select>
        <div class="help">High buses can pass over equipment and keep removal routes open (§4.2.6), but need taller structures.</div>
      </div>
      <div class="field">
        <label>Conductor</label>
        <select value={c.size} onChange={(e) => commit(updateConductor(design, c.id, { size: (e.target as HTMLSelectElement).value }))}>
          {CONDUCTOR_SIZES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label} ({s.ampacityA} A)
            </option>
          ))}
        </select>
      </div>
      <div class="metric">
        <span>Length</span>
        <b>{polylineLength(c.points).toFixed(1)} m</b>
      </div>
      <div class="metric">
        <span>Phase spacing (Table 4-7)</span>
        <b>{vc.rigidBusPhaseSpacingM} m</b>
      </div>
      <div class="metric">
        <span>Min. phase-to-phase / to ground</span>
        <b>
          {vc.minMetalToMetalM} / {vc.minToGroundedPartsM} m
        </b>
      </div>
      {amps !== undefined && (
        <div class="metric">
          <span>Current (year-end peak)</span>
          <b>{Math.round(amps)} A</b>
        </div>
      )}
      <div class="metric">
        <span>Cost (estimate)</span>
        <b>{money(conductorCost(c))}</b>
      </div>
      <div style={{ marginTop: '.6em' }}>
        <button
          class="btn small danger"
          onClick={() => {
            commit(deleteConductors(design, [c.id]));
            store.set({ selection: [] });
          }}
        >
          Delete bus
        </button>
      </div>
      <div style={{ marginTop: '.6em' }}>
        <CiteLink cite={{ page: 154, section: '4.9', table: '4-7' }} />
      </div>
    </div>
  );
}

const GROUND_SIZES: GroundConductorSize[] = ['2/0', '4/0', '250', '350', '500'];

function SiteInspector({ design, level }: { design: Design; level: LevelDef }) {
  const f = design.fence;
  const g = design.groundGrid;
  const setG = (patch: Partial<typeof g>) => commit({ ...design, groundGrid: { ...g, ...patch } });
  return (
    <div data-testid="inspector-site">
      <h3>Site</h3>
      <div class="metric">
        <span>Property</span>
        <b>
          {level.site.width} × {level.site.depth} m
        </b>
      </div>
      <div class="metric">
        <span>Altitude</span>
        <b>{level.site.altitudeM} m</b>
      </div>
      <div class="metric">
        <span>Soil resistivity</span>
        <b>{level.site.soilResistivity} Ω·m</b>
      </div>
      <div class="metric">
        <span>Isokeraunic level</span>
        <b>{level.site.isokeraunicDays} storm days/yr</b>
      </div>
      <h3 style={{ marginTop: '1em' }}>Fence</h3>
      {!f ? (
        <p class="muted small">No fence yet. Use the Fence tool (F) and drag a rectangle.</p>
      ) : (
        <>
          <div class="metric">
            <span>Size</span>
            <b>
              {f.rect.w} × {f.rect.h} m
            </b>
          </div>
          <div class="field">
            <label>Gate side</label>
            <select value={f.gate.side} onChange={(e) => commit(setFence(design, { ...f, gate: { ...f.gate, side: (e.target as HTMLSelectElement).value as Side, offset: 1 } }))}>
              <option value="N">North</option>
              <option value="S">South</option>
              <option value="E">East</option>
              <option value="W">West</option>
            </select>
          </div>
          <div class="field">
            <label>Gate offset (m)</label>
            <input
              type="number"
              step={0.5}
              min={0}
              value={f.gate.offset}
              onChange={(e) => {
                const len = f.gate.side === 'N' || f.gate.side === 'S' ? f.rect.w : f.rect.h;
                const v = Math.max(0, Math.min(len - f.gate.width, Number((e.target as HTMLInputElement).value)));
                commit(setFence(design, { ...f, gate: { ...f.gate, offset: v } }));
              }}
            />
          </div>
          <div class="field">
            <label>Gate width (m)</label>
            <input type="number" step={0.5} min={3} max={12} value={f.gate.width} onChange={(e) => commit(setFence(design, { ...f, gate: { ...f.gate, width: Math.max(3, Math.min(12, Number((e.target as HTMLInputElement).value))) } }))} />
          </div>
          <button class="btn small danger" onClick={() => commit(setFence(design, null))}>
            Remove fence
          </button>
        </>
      )}
      {level.features.surfacing && (
        <>
          <h3 style={{ marginTop: '1em' }}>Yard surfacing</h3>
          <div class="field">
            <label>Material</label>
            <select value={design.surfacing.material} onChange={(e) => commit({ ...design, surfacing: { ...design.surfacing, material: (e.target as HTMLSelectElement).value as SurfacingMaterial } })}>
              <option value="none">None (native soil)</option>
              <option value="crushed_rock">Crushed rock</option>
              <option value="washed_granite">Washed granite</option>
              <option value="asphalt">Asphalt</option>
            </select>
          </div>
          <div class="field">
            <label>Thickness (m)</label>
            <input type="number" step={0.025} min={0.05} max={0.3} value={design.surfacing.thicknessM} onChange={(e) => commit({ ...design, surfacing: { ...design.surfacing, thicknessM: Number((e.target as HTMLInputElement).value) } })} />
          </div>
        </>
      )}
      {level.features.groundGrid && (
        <>
          <h3 style={{ marginTop: '1em' }}>Ground grid</h3>
          <div class="field">
            <label>Install grid</label>
            <input type="checkbox" checked={g.enabled} onChange={(e) => setG({ enabled: (e.target as HTMLInputElement).checked })} style={{ justifySelf: 'start' }} />
          </div>
          {g.enabled && (
            <>
              <div class="field">
                <label>Mesh spacing D (m)</label>
                <input type="number" step={0.5} min={2} max={20} value={g.spacingM} onChange={(e) => setG({ spacingM: Number((e.target as HTMLInputElement).value) })} />
              </div>
              <div class="field">
                <label>Conductor (copper)</label>
                <select value={g.conductor} onChange={(e) => setG({ conductor: (e.target as HTMLSelectElement).value as GroundConductorSize })}>
                  {GROUND_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s.includes('/') ? `${s} AWG` : `${s} kcmil`}
                    </option>
                  ))}
                </select>
              </div>
              <div class="field">
                <label>Burial depth h (m)</label>
                <input type="number" step={0.05} min={0.25} max={2.5} value={g.depthM} onChange={(e) => setG({ depthM: Number((e.target as HTMLInputElement).value) })} />
              </div>
              <div class="field">
                <label>Ground rods</label>
                <input type="number" step={1} min={0} max={200} value={g.rodCount} onChange={(e) => setG({ rodCount: Math.round(Number((e.target as HTMLInputElement).value)) })} />
              </div>
              <div class="field">
                <label>Rod length (m)</label>
                <input type="number" step={0.5} min={1.5} max={10} value={g.rodLengthM} onChange={(e) => setG({ rodLengthM: Number((e.target as HTMLInputElement).value) })} />
              </div>
              <div class="field">
                <label>Extend beyond fence (m)</label>
                <input type="number" step={0.5} min={0} max={5} value={g.extendBeyondFenceM} onChange={(e) => setG({ extendBeyondFenceM: Number((e.target as HTMLInputElement).value) })} />
              </div>
              <div class="field">
                <label>Fence bonded to grid</label>
                <input type="checkbox" checked={g.fenceBonded} onChange={(e) => setG({ fenceBonded: (e.target as HTMLInputElement).checked })} style={{ justifySelf: 'start' }} />
              </div>
            </>
          )}
        </>
      )}
      {level.features.shieldWires && (
        <>
          <h3 style={{ marginTop: '1em' }}>Shielding method</h3>
          <div class="field">
            <label>Evaluation</label>
            <select value={design.shieldingMethod} onChange={(e) => commit({ ...design, shieldingMethod: (e.target as HTMLSelectElement).value as Design['shieldingMethod'] })}>
              <option value="fixed_angle">Fixed angle (30°/45°)</option>
              <option value="rolling_sphere">Rolling sphere</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
}

export function Inspector({ design, level, review, selection }: { design: Design; level: LevelDef; review: DesignReview | null; selection: string[] }) {
  if (selection.length === 1) {
    const id = selection[0]!;
    const item = design.items.find((i) => i.id === id);
    if (item) return <ItemInspector item={item} design={design} level={level} review={review} />;
    if (design.conductors.some((c) => c.id === id)) return <ConductorInspector id={id} design={design} review={review} />;
    const sw = design.shieldWires.find((s) => s.id === id);
    if (sw)
      return (
        <div>
          <h3>Shield wire</h3>
          <p class="muted small">
            Strung between {sw.a} and {sw.b}. Its zone of protection is a wedge with the 30° angle on both sides (Fig. 4-17). Design tension is limited to 8900 N (2000 lb) per conductor
            (§4.7.3.2).
          </p>
          <button
            class="btn small danger"
            onClick={() => {
              commit(deleteShieldWire(design, sw.id));
              store.set({ selection: [] });
            }}
          >
            Delete
          </button>
        </div>
      );
  }
  if (selection.length > 1) {
    return (
      <div>
        <h3>{selection.length} selected</h3>
        <button
          class="btn small danger"
          onClick={() => {
            commit(deleteConductors(deleteItems(design, selection), selection));
            store.set({ selection: [] });
          }}
        >
          Delete selected
        </button>
      </div>
    );
  }
  return <SiteInspector design={design} level={level} />;
}
