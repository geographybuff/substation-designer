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

export function Toolbox({ level, highlight }: { level: LevelDef; highlight?: string }) {
  const tool = useStore(store, (s) => s.tool);
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
    <div class="toolbox" data-testid="toolbox">
      <h4>Tools</h4>
      {entry({ kind: 'select' }, 'V', 'Select / move', 'select')}
      {kvs.map((kv) => entry({ kind: 'bus', kv, elevation: 'low' }, 'B', 'Bus', `bus-${kv}`, kv, highlight === 'bus'))}
      {kvs.map((kv) => entry({ kind: 'bus', kv, elevation: 'high' }, 'B↑', 'High bus', `hbus-${kv}`, kv))}
      {level.features.fence && entry({ kind: 'fence' }, 'F', 'Fence', 'fence', undefined, highlight === 'fence')}
      {level.features.shieldWires && entry({ kind: 'shieldwire' }, 'SW', 'Shield wire', 'shieldwire')}
      {entry({ kind: 'erase' }, 'E', 'Erase', 'erase')}
      {TOOL_CATEGORIES.map((cat) => {
        const kinds = level.tools.filter((k) => CATALOG[k].category === cat);
        if (!kinds.length) return null;
        return (
          <div key={cat}>
            <h4>{cat}</h4>
            {kinds.flatMap((k: ItemKind) =>
              voltagesFor(k, level).map((kv) => entry({ kind: 'place', item: k, kv }, CATALOG[k].tag, CATALOG[k].name.replace(/ \(.*\)$/, ''), `${k}-${kv}`, kv, highlight === k)),
            )}
          </div>
        );
      })}
    </div>
  );
}
