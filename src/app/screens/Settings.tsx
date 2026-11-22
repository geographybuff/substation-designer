import { applyPreset, type GraphicsSettings } from '../../settings/graphics';
import { desktop, isDesktop } from '../desktop';
import { remove } from '../persist';
import { go, setGame, setGraphics, store, useStore } from '../store';

function Toggle({ label, desc, checked, onChange, testid }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void; testid?: string }) {
  return (
    <label class="toggle">
      <span>
        {label}
        {desc && <div class="desc">{desc}</div>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange((e.target as HTMLInputElement).checked)} data-testid={testid} />
    </label>
  );
}

export function Settings() {
  const g = useStore(store, (s) => s.graphics);
  const game = useStore(store, (s) => s.game);
  const custom = (patch: Partial<GraphicsSettings>) => setGraphics({ ...g, ...patch, preset: 'custom' });
  return (
    <div class="screen scroll menu-bg" data-testid="settings">
      <div class="page">
        <div class="page-head">
          <button class="btn" onClick={() => go(store.get().design ? 'editor' : 'menu')}>
            ← Back
          </button>
          <h1>Settings</h1>
        </div>
        <div class="settings-grid">
          <div class="card">
            <h3>Graphics quality</h3>
            <div class="preset-row">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button key={p} class={`btn ${g.preset === p ? 'active' : ''}`} onClick={() => setGraphics(applyPreset(g, p))} data-testid={`preset-${p}`}>
                  {p[0]!.toUpperCase() + p.slice(1)}
                </button>
              ))}
              <span class="tag" style={{ alignSelf: 'center' }}>
                current: {g.preset}
              </span>
            </div>
            <p class="muted small">Low is meant for older laptops and integrated graphics: lower resolution, no shadows, no animations, a 30 fps cap and simplified 3D models.</p>
            <label class="toggle">
              <span>
                Render resolution
                <div class="desc">{Math.round(g.renderScale * 100)}% of native (lower is faster)</div>
              </span>
              <input type="range" min={0.5} max={1.5} step={0.05} value={g.renderScale} onInput={(e) => custom({ renderScale: Number((e.target as HTMLInputElement).value) })} />
            </label>
            <label class="toggle">
              <span>
                Maximum pixel ratio
                <div class="desc">Caps sharpness on high-DPI screens</div>
              </span>
              <select value={String(g.maxPixelRatio)} onChange={(e) => custom({ maxPixelRatio: Number((e.target as HTMLSelectElement).value) })}>
                <option value="1">1×</option>
                <option value="1.5">1.5×</option>
                <option value="2">2×</option>
              </select>
            </label>
            <label class="toggle">
              <span>Frame-rate cap</span>
              <select value={String(g.maxFps)} onChange={(e) => custom({ maxFps: Number((e.target as HTMLSelectElement).value) as 30 | 60 | 0 })}>
                <option value="30">30 fps</option>
                <option value="60">60 fps</option>
                <option value="0">Display refresh</option>
              </select>
            </label>
            <Toggle label="Anti-aliasing" checked={g.antialias} onChange={(v) => custom({ antialias: v })} />
            <Toggle label="Animations" desc="Power-flow dashes and highlights" checked={g.animations} onChange={(v) => custom({ animations: v })} />
            <Toggle label="Weather effects" desc="Storm flashes during results playback" checked={g.weatherFx} onChange={(v) => custom({ weatherFx: v })} />
          </div>
          <div class="card">
            <h3>3D view</h3>
            <Toggle label="Enable 3D view" desc="Turn off for 2D-only mode: the game then needs no WebGL at all." checked={g.view3d} onChange={(v) => custom({ view3d: v })} testid="toggle-3d" />
            <label class="toggle">
              <span>Shadows</span>
              <select value={g.shadows} onChange={(e) => custom({ shadows: (e.target as HTMLSelectElement).value as GraphicsSettings['shadows'] })}>
                <option value="off">Off</option>
                <option value="low">Low</option>
                <option value="high">High</option>
              </select>
            </label>
            <label class="toggle">
              <span>Model detail</span>
              <select value={g.detail3d} onChange={(e) => custom({ detail3d: (e.target as HTMLSelectElement).value as 'low' | 'high' })}>
                <option value="low">Low</option>
                <option value="high">High</option>
              </select>
            </label>
            <Toggle label="Scenery" desc="Trees, fields and distant lines around the site" checked={g.scenery} onChange={(v) => custom({ scenery: v })} />
            {isDesktop && (
              <Toggle
                label="Hardware acceleration"
                desc="Use the GPU. Turn off if the game shows a black screen or crashes; takes effect after restarting the game."
                checked={g.hardwareAcceleration}
                onChange={(v) => {
                  setGraphics({ ...g, hardwareAcceleration: v });
                  desktop?.setHardwareAcceleration(v);
                }}
              />
            )}
            <h3 style={{ marginTop: '1em' }}>Interface</h3>
            <label class="toggle">
              <span>UI scale</span>
              <select value={String(g.uiScale)} onChange={(e) => setGraphics({ ...g, uiScale: Number((e.target as HTMLSelectElement).value) })}>
                {[0.85, 1, 1.15, 1.3, 1.5].map((v) => (
                  <option key={v} value={String(v)}>
                    {Math.round(v * 100)}%
                  </option>
                ))}
              </select>
            </label>
            <Toggle label="Reduce motion" desc="No camera easing, flashes or animations" checked={g.reduceMotion} onChange={(v) => setGraphics({ ...g, reduceMotion: v })} />
            <Toggle label="Show tips" desc="&quot;Help me fix this&quot; and Show me in the campaign Review tab" checked={game.showTips} onChange={(v) => setGame({ ...game, showTips: v })} />
            <h3 style={{ marginTop: '1em' }}>Progress</h3>
            <button
              class="btn danger"
              onClick={() => {
                if (!confirm('Erase all campaign progress and saved layouts?')) return;
                remove('progress');
                for (const k of Object.keys(localStorage)) if (k.startsWith('substation-designer:design:')) localStorage.removeItem(k);
                store.set({ progress: {} });
              }}
            >
              Reset campaign progress
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
