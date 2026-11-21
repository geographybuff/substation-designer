import { useEffect, useRef, useState } from 'preact/hooks';
import { buildSceneModel } from '../../engine/scene';
import type { Design, LevelDef } from '../../engine/types';
import type { GraphicsSettings } from '../../settings/graphics';
import { store, useStore } from '../store';
import { loadView3D, type View3DLike } from '../view3dLoader';

export function View3DHost({ design, level, graphics }: { design: Design; level: LevelDef; graphics: GraphicsSettings }) {
  const ref = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View3DLike | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [stats, setStats] = useState<{ drawCalls: number; triangles: number; fps: number } | null>(null);
  const selection = useStore(store, (s) => s.selection);
  const review = useStore(store, (s) => s.review);
  const overlays = useStore(store, (s) => s.overlays);

  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    loadView3D()
      .then((mod) => {
        if (cancelled || !ref.current) return;
        if (!mod || !mod.isWebGLAvailable()) {
          setStatus('unavailable');
          return;
        }
        const v = mod.createView3D(ref.current, graphics, { onPick: (id) => store.set({ selection: id ? [id] : [] }) });
        if (!v) {
          setStatus('unavailable');
          return;
        }
        viewRef.current = v;
        setStatus('ready');
        ro = new ResizeObserver(() => v.resize());
        ro.observe(ref.current);
      })
      .catch(() => !cancelled && setStatus('unavailable'));
    return () => {
      cancelled = true;
      ro?.disconnect();
      viewRef.current?.dispose();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    const energized = review?.topo.energized;
    const nodeOfPort = review?.topo.nodeOfPort;
    const nodeOfConductor = review?.topo.nodeOfConductor;
    const isOn = (id: string) => {
      if (!energized || !nodeOfPort || !nodeOfConductor) return false;
      const cn = nodeOfConductor.get(id);
      if (cn) return energized.has(cn);
      for (const [k, n] of nodeOfPort) if (k.startsWith(`${id}:`) && energized.has(n)) return true;
      return false;
    };
    v.update(buildSceneModel(design, level, isOn));
  }, [design, level, review, status]);

  useEffect(() => viewRef.current?.setSettings(graphics), [graphics, status]);
  useEffect(() => viewRef.current?.setSelection(selection), [selection, status]);
  useEffect(() => viewRef.current?.setGroundGridVisible(overlays.grounding), [overlays.grounding, status]);
  useEffect(() => {
    if (status !== 'ready') return;
    const t = setInterval(() => viewRef.current && setStats(viewRef.current.getStats()), 1000);
    return () => clearInterval(t);
  }, [status]);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={ref} style={{ position: 'absolute', inset: 0 }} data-testid="view3d" />
      {status !== 'ready' && (
        <div class="screen center" style={{ pointerEvents: 'none' }}>
          <div class="card" style={{ maxWidth: 420, textAlign: 'center', pointerEvents: 'auto' }}>
            {status === 'loading' ? (
              <span>Loading 3D view…</span>
            ) : (
              <>
                <h3>3D view unavailable</h3>
                <p class="muted small">WebGL could not be started on this computer. The plan view has everything you need. On Windows you can also try turning hardware acceleration off or on in Settings.</p>
                <button class="btn" onClick={() => store.set({ view: '2d' })}>
                  Back to plan view
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {status === 'ready' && stats && (
        <div class="hint" style={{ left: 'auto', right: 10, transform: 'none' }}>
          {graphics.preset} · {stats.drawCalls} draws · {Math.round(stats.triangles / 1000)}k tris{stats.fps ? ` · ${stats.fps} fps` : ''}
        </div>
      )}
    </div>
  );
}
