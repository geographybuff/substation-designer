import { useEffect, useRef } from 'preact/hooks';
import { CATALOG, TOOL_CATEGORIES } from '../../engine/catalog';
import { voltagesFor } from '../../engine/design';
import type { ItemKind, LevelDef } from '../../engine/types';
import { kvColor } from '../../editor/theme';
import { store, useStore, type Tool } from '../store';

function sameTool(a: Tool, b: Tool): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'place' && b.kind === 'place') return a.item === b.item && a.kv === b.kv;
  if (a.kind === 'bus' && b.kind === 'bus') return a.kv === b.kv && a.elevation === b.elevation;
  return true;
}

export function Toolbox({ level, highlight, highlightKv }: { level: LevelDef; highlight?: string; highlightKv?: number }) {
  const tool = useStore(store, (s) => s.tool);
  const ref = useRef<HTMLDivElement>(null);
  // Bring a pulsing entry into view ("Show me", tutorial steps).
  useEffect(() => {
    if (!highlight) return;
    const el = ref.current?.querySelector('.tool.pulse');
    if (el && 'scrollIntoView' in el) (el as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlight, highlightKv]);
  const hl = (name: string, kv?: number) => highlight === name && (highlightKv === undefined || kv === undefined || Math.abs(kv - highlightKv) < 0.01);
  const set = (t: Tool) => store.set({ tool: t, selection: [] });
  const kvs = [level.system.hvKV, ...(level.system.lvKV !== undefined ? [level.system.lvKV] : [])];

  const entry = (t: Tool, tag: string, name: string, key?: string, kv?: number, hl?: boolean) => (
    <button key={key ?? name} class={`tool ${sameTool(tool, t) ? 'active' : ''} ${hl ? 'pulse' : ''}`} onClick={() => set(t)} title={name} data-testid={`tool-${key ?? name}`}>
      <span class="tg">{tag}</span>
      <span>{name}</span>
      {kv !== undefined && kv > 0 && (
        <span class="kv" style={{ color: kvColor(kv) }}>
          {kv} kV
        </span>
      )}
    </button>
  );

  return (
    <div class="toolbox" data-testid="toolbox" ref={ref}>
      <h4>Tools</h4>
      {entry({ kind: 'select' }, 'V', 'Select / move', 'select')}
      {kvs.map((kv) => entry({ kind: 'bus', kv, elevation: 'low' }, 'B', 'Bus', `bus-${kv}`, kv, hl('bus', kv)))}
      {kvs.map((kv) => entry({ kind: 'bus', kv, elevation: 'high' }, 'B↑', 'High bus', `hbus-${kv}`, kv, hl('highbus', kv)))}
      {level.features.fence && entry({ kind: 'fence' }, 'F', 'Fence', 'fence', undefined, hl('fence'))}
      {level.features.shieldWires && entry({ kind: 'shieldwire' }, 'SW', 'Shield wire', 'shieldwire', undefined, hl('shieldwire'))}
      {entry({ kind: 'erase' }, 'E', 'Erase', 'erase')}
      {TOOL_CATEGORIES.map((cat) => {
        const kinds = level.tools.filter((k) => CATALOG[k].category === cat);
        if (!kinds.length) return null;
        return (
          <div key={cat}>
            <h4>{cat}</h4>
            {kinds.flatMap((k: ItemKind) =>
              voltagesFor(k, level).map((kv) => entry({ kind: 'place', item: k, kv }, CATALOG[k].tag, CATALOG[k].name.replace(/ \(.*\)$/, ''), `${k}-${kv}`, kv, hl(k, kv))),
            )}
          </div>
        );
      })}
    </div>
  );
}
