import { useEffect, useRef, useState } from 'preact/hooks';
import { itemRect } from '../../engine/items';
import { simulate } from '../../engine/simulation';
import type { Finding, Vec2 } from '../../engine/types';
import { helpForObjective, type Help } from '../../content/help';
import type { HelpActions } from '../components/HelpPanel';
import { EditorController } from '../../editor/controller';
import { stepDone, stepPending } from '../../levels/tutorial';
import { Briefing } from '../components/Briefing';
import { HelpDiagram } from '../components/HelpDiagram';
import { Inspector, money } from '../components/Inspector';
import { ReviewPanel } from '../components/ReviewPanel';
import { Toolbox } from '../components/Toolbox';
import { View3DHost } from '../components/View3DHost';
import { commit, currentLevel, go, recordProgress, redo, resetLevel, runReviewNow, store, undo, useStore } from '../store';

const HINTS: Record<string, string> = {
  select: 'Click to select · drag to move · R rotate · Del delete · right-drag to pan · wheel to zoom',
  place: 'Click to place · R rotate · Esc or right-click to stop',
  bus: 'Click a terminal or bus to start · click to add corners · finish on a terminal/bus or double-click · Space flips the corner',
  fence: 'Drag a rectangle to fence the yard',
  shieldwire: 'Click a mast, then another mast',
  erase: 'Click equipment or bus to delete it',
};

export function Editor() {
  const level = currentLevel();
  const design = useStore(store, (s) => s.design);
  const review = useStore(store, (s) => s.review);
  const stale = useStore(store, (s) => s.reviewStale);
  const selection = useStore(store, (s) => s.selection);
  const tool = useStore(store, (s) => s.tool);
  const view = useStore(store, (s) => s.view);
  const overlays = useStore(store, (s) => s.overlays);
  const showBriefing = useStore(store, (s) => s.showBriefing);
  const tutorialStep = useStore(store, (s) => s.tutorialStep);
  const graphics = useStore(store, (s) => s.graphics);
  const game = useStore(store, (s) => s.game);
  const past = useStore(store, (s) => s.past.length);
  const future = useStore(store, (s) => s.future.length);
  const [tab, setTab] = useState<'inspect' | 'review'>('review');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrlRef = useRef<EditorController | null>(null);

  useEffect(() => {
    if (!canvasRef.current || view !== '2d') return;
    const ctrl = new EditorController(canvasRef.current);
    ctrlRef.current = ctrl;
    const ro = new ResizeObserver(() => ctrl.view.resize());
    ro.observe(canvasRef.current);
    return () => {
      ro.disconnect();
      ctrl.dispose();
      ctrlRef.current = null;
    };
  }, [view, level?.id]);

  // Selecting something opens the Inspector, except when "Show me" selects from the Review tab.
  const keepTabRef = useRef(false);
  useEffect(() => {
    if (keepTabRef.current) {
      keepTabRef.current = false;
      return;
    }
    if (selection.length) setTab('inspect');
  }, [selection.join(',')]);

  // Toolbox entry pulsed by "Show me" (cleared after a few seconds or when the tool changes).
  const [helpTool, setHelpTool] = useState<{ tool: string; kv?: number } | null>(null);
  useEffect(() => {
    if (!helpTool) return undefined;
    const t = setTimeout(() => setHelpTool(null), 9000);
    return () => clearTimeout(t);
  }, [helpTool]);
  useEffect(() => setHelpTool(null), [tool]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && store.get().screen === 'editor') {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT')) return;
        e.preventDefault();
        if (graphics.view3d) store.set({ view: store.get().view === '2d' ? '3d' : '2d' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [graphics.view3d]);

  const tut = level?.tutorial;
  const step = tut && tutorialStep < tut.length ? tut[tutorialStep] : null;
  const stepComplete = step && level && design ? (step.until ? stepDone(step.until, design, level, review) : false) : false;
  const pending = step?.until && !stepComplete && level && design ? stepPending(step.until, design, level, review) : [];
  useEffect(() => {
    if (step?.until && stepComplete) {
      const t = setTimeout(() => store.set({ tutorialStep: store.get().tutorialStep + 1 }), 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [step?.id, stepComplete]);

  if (!level || !design) return null;

  const cost = review?.cost.total ?? 0;
  const pct = Math.min(100, (100 * cost) / level.budget);

  const focusFinding = (f: Finding) => {
    const ids = [...(f.itemIds ?? []), ...(f.conductorIds ?? [])];
    if (ids.length) store.set({ selection: ids.slice(0, 1) });
    let at = f.at;
    const it = f.itemIds?.length ? design.items.find((i) => i.id === f.itemIds![0]) : null;
    if (it) {
      const r = itemRect(it);
      at = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    } else if (f.conductorIds?.length) {
      const c = design.conductors.find((x) => x.id === f.conductorIds![0]);
      if (c) at = c.points[0];
    }
    if (at) ctrlRef.current?.focus(at);
  };

  const centreOf = (id: string): Vec2 | undefined => {
    const it = design.items.find((i) => i.id === id);
    if (it) {
      const r = itemRect(it);
      return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    }
    const c = design.conductors.find((x) => x.id === id);
    return c ? c.points[Math.floor(c.points.length / 2)] : undefined;
  };

  const helpActions: HelpActions | undefined =
    !level.sandbox && game.showTips
      ? {
          showMe: (h: Help) => {
            const toPlan = view === '3d';
            if (toPlan) store.set({ view: '2d' });
            if (h.overlay) store.set({ overlays: { ...store.get().overlays, [h.overlay]: true } });
            const ids = (h.itemIds ?? []).filter((id) => design.items.some((i) => i.id === id) || design.conductors.some((c) => c.id === id));
            if (ids.length) {
              keepTabRef.current = true;
              store.set({ selection: ids });
              const at = centreOf(ids[0]!);
              if (at) setTimeout(() => ctrlRef.current?.focus(at), toPlan ? 150 : 0);
            }
            if (h.tool) setTimeout(() => setHelpTool({ tool: h.tool!, kv: h.side === 'hv' ? level.system.hvKV : h.side === 'lv' ? level.system.lvKV : undefined }), 0);
          },
          fix: (h: Help) => {
            const next = h.fix?.apply(design, level);
            if (next) {
              commit(next);
              store.set({ toast: { text: 'Done. Press Ctrl+Z to undo.', tone: 'info', at: Date.now() } });
            } else {
              store.set({ toast: { text: 'That cannot be done automatically here; follow the steps instead.', tone: 'warn', at: Date.now() } });
            }
          },
          guide: (topic: string) => store.set({ screen: 'guide', guideTopic: topic }),
        }
      : undefined;

  const tutorialObjective = step?.objective && review ? review.objectives.find((o) => o.objective.kind === step.objective) : undefined;
  const tutorialHelp = tutorialObjective && !stepComplete ? helpForObjective(tutorialObjective, { level, design, review: review! }) : null;

  const energize = () => {
    const r = runReviewNow();
    if (!r) return;
    if (r.counts.critical > 0 && !level.sandbox) {
      const ok = confirm(`The design has ${r.counts.critical} critical finding(s). The cooperative will not accept it, but you can run a what-if simulation to see what would happen. Continue?`);
      if (!ok) return;
    }
    const sim = simulate(design, level, r, (Date.now() & 0xffff) + 1);
    if (r.passed) recordProgress(level.id, r.stars, r.score, true);
    store.set({ lastResult: { review: r, levelId: level.id, sim }, screen: 'results' });
  };

  const toggle = (k: keyof typeof overlays) => store.set({ overlays: { ...overlays, [k]: !overlays[k] } });

  return (
    <div class="editor" data-testid="editor">
      <div class="topbar">
        <button class="btn small" onClick={() => go(level.sandbox ? 'menu' : 'levels')} title="Back">
          ←
        </button>
        <span class="lvl">{level.title}</span>
        <span class="muted small" style={{ marginRight: '.6em' }}>
          {level.client}
        </span>
        <button class="btn small" onClick={undo} disabled={!past} title="Undo (Ctrl+Z)">
          ↶
        </button>
        <button class="btn small" onClick={redo} disabled={!future} title="Redo (Ctrl+Y)">
          ↷
        </button>
        <button
          class="btn small"
          onClick={() => {
            if (confirm('Clear your layout and start this project over?')) resetLevel();
          }}
          title="Start over"
        >
          Reset
        </button>
        <span class="spacer" />
        <div class="budget" title="Estimated construction cost vs budget (game estimates)">
          <span>
            {money(cost)} of {money(level.budget)}
          </span>
          <div class="bar">
            <div class={`fill ${cost > level.budget ? 'over' : ''}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button class="btn primary" onClick={energize} data-testid="energize">
          ⚡ Energize
        </button>
      </div>
      <Toolbox
        level={level}
        highlight={step?.highlightTool ?? helpTool?.tool}
        highlightKv={step?.highlightTool ? (step.highlightSide === 'hv' ? level.system.hvKV : step.highlightSide === 'lv' ? level.system.lvKV : undefined) : helpTool?.kv}
      />
      <div class="canvas-wrap">
        {view === '2d' ? <canvas ref={canvasRef} data-testid="plan-canvas" /> : <View3DHost design={design} level={level} graphics={graphics} />}
        {view === '2d' && (
          <div class="overlay-bar">
            <button class={`btn small ${overlays.fenceZone ? 'active' : ''}`} onClick={() => toggle('fenceZone')} title="Fence safety clearance zone (Fig. 4-21)">
              Fence zone
            </button>
            {level.features.shieldWires && (
              <button class={`btn small ${overlays.shielding ? 'active' : ''}`} onClick={() => toggle('shielding')} title="Direct-stroke zone of protection (Fig. 4-17)">
                Shielding
              </button>
            )}
            {level.features.groundGrid && (
              <button class={`btn small ${overlays.grounding ? 'active' : ''}`} onClick={() => toggle('grounding')}>
                Ground grid
              </button>
            )}
            <button class={`btn small ${overlays.removal ? 'active' : ''}`} onClick={() => toggle('removal')} title="Equipment removal routes (§4.2.6)">
              Removal
            </button>
            <button class={`btn small ${overlays.labels ? 'active' : ''}`} onClick={() => toggle('labels')}>
              Labels
            </button>
            <button class="btn small" onClick={() => ctrlRef.current?.fitSite()} title="Fit view">
              ⤢ Fit
            </button>
          </div>
        )}
        <div class="view-toggle">
          <button class={`btn small ${view === '2d' ? 'active' : ''}`} onClick={() => store.set({ view: '2d' })}>
            Plan
          </button>
          <button
            class={`btn small ${view === '3d' ? 'active' : ''}`}
            onClick={() => store.set({ view: '3d' })}
            disabled={!graphics.view3d}
            title={graphics.view3d ? '3D view (Tab)' : '3D view is off in Settings (2D-only mode)'}
            data-testid="view-3d"
          >
            3D
          </button>
        </div>
        {step && (
          <div class="tutorial" data-testid="tutorial">
            <div class="muted small">
              Tutorial {tutorialStep + 1} / {tut!.length}
            </div>
            <h4>{step.title}</h4>
            <p>{step.body}</p>
            {step.diagram && !stepComplete && <HelpDiagram id={step.diagram} />}
            {pending.length > 0 && (
              <div class="tutorial-pending" data-testid="tutorial-pending">
                <div class="small muted">Still needed:</div>
                <ul>
                  {pending.slice(0, 4).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            <div style={{ display: 'flex', gap: '.5em', alignItems: 'center' }}>
              {step.until ? (
                <span class="small" style={{ color: stepComplete ? 'var(--ok)' : 'var(--dim)' }}>
                  {stepComplete ? '✓ Done!' : 'Waiting for you…'}
                </span>
              ) : (
                <button class="btn small primary" onClick={() => store.set({ tutorialStep: tutorialStep + 1 })} data-testid="tutorial-next">
                  Next
                </button>
              )}
              <span style={{ flex: 1 }} />
              {tutorialHelp && helpActions && (
                <button class="btn small" onClick={() => helpActions.showMe(tutorialHelp)} data-testid="tutorial-show">
                  Show me
                </button>
              )}
              {step.until && !stepComplete && (
                <button class="btn small" onClick={() => store.set({ tutorialStep: tutorialStep + 1 })}>
                  Skip step
                </button>
              )}
              <button class="btn small" onClick={() => store.set({ tutorialStep: tut!.length })}>
                Hide tutorial
              </button>
            </div>
          </div>
        )}
        {view === '2d' && <div class="hint">{HINTS[tool.kind]}</div>}
      </div>
      <div class="side">
        <div class="tabs">
          <button class={tab === 'inspect' ? 'on' : ''} onClick={() => setTab('inspect')} data-testid="tab-inspect">
            Inspector
          </button>
          <button class={tab === 'review' ? 'on' : ''} onClick={() => setTab('review')} data-testid="tab-review">
            Review{review ? ` (${review.counts.critical + review.counts.major})` : ''}
          </button>
        </div>
        <div class="side-body">
          {tab === 'inspect' ? (
            <Inspector design={design} level={level} review={review} selection={selection} />
          ) : (
            <ReviewPanel review={review} level={level} design={design} stale={stale} onFocus={focusFinding} helpActions={helpActions} />
          )}
        </div>
      </div>
      {showBriefing && <Briefing level={level} />}
    </div>
  );
}

export { commit };
