import { SCHEMES } from '../../engine/schemes';
import { transformerSiteRatingKVA } from '../../engine/equipment';
import type { DesignReview } from '../../engine/review';
import type { Design, Finding, LevelDef } from '../../engine/types';
import { CiteLink, money } from './Inspector';
import { store } from '../store';

export function FindingRow({ f, onClick }: { f: Finding; onClick?: () => void }) {
  return (
    <div class={`finding ${f.severity}`} onClick={onClick} data-testid="finding">
      <div class={`sev ${f.severity}`}>{f.severity}</div>
      <div class="t">{f.title}</div>
      <div class="d">{f.detail}</div>
      {f.cite && (
        <div style={{ display: 'flex', gap: '.6em', flexWrap: 'wrap', marginTop: '.2em' }} onClick={(e) => e.stopPropagation()}>
          {f.cite.map((c, i) => (
            <CiteLink key={i} cite={c} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ReviewPanel({ review, level, design, stale, onFocus }: { review: DesignReview | null; level: LevelDef; design: Design; stale: boolean; onFocus: (f: Finding) => void }) {
  if (!review) return <div class="muted">Reviewing…</div>;
  const { counts } = review;
  const g = review.grounding;
  const xfmrs = design.items.filter((i) => i.kind === 'transformer');
  return (
    <div data-testid="review-panel" style={{ opacity: stale ? 0.7 : 1 }}>
      <div style={{ display: 'flex', gap: '.8em', alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span class="sev critical">{counts.critical} critical</span>
        <span class="sev major">{counts.major} major</span>
        <span class="sev minor">{counts.minor} minor</span>
        <span style={{ flex: 1 }} />
        {level.sandbox ? <span class="tag">sandbox</span> : review.passed ? <span class="tag" style={{ color: 'var(--ok)' }}>ready to energize</span> : <span class="tag">not ready</span>}
      </div>
      {!level.sandbox && (
        <>
          <h4 style={{ margin: '.9em 0 .3em' }}>Objectives</h4>
          {review.objectives.map((o) => (
            <div key={o.objective.id} class={`objective ${o.met ? 'met' : ''}`}>
              <span class="box">{o.met ? '✓' : ''}</span>
              <span>
                {o.objective.text}
                {o.objective.optional && <span class="muted small"> (optional)</span>}
                {o.note && <span class="muted small"> — {o.note}</span>}
              </span>
            </div>
          ))}
        </>
      )}
      <h4 style={{ margin: '.9em 0 .3em' }}>Key numbers</h4>
      <div class="metric">
        <span>Cost / budget</span>
        <b style={{ color: review.cost.total > level.budget ? 'var(--crit)' : undefined }}>
          {money(review.cost.total)} / {money(level.budget)}
        </b>
      </div>
      <div class="metric">
        <span>Peak load now → year {level.system.horizonYears}</span>
        <b>
          {review.calc.loadNowMVA.toFixed(1)} → {review.calc.loadHorizonMVA.toFixed(1)} MVA
        </b>
      </div>
      {xfmrs.length > 0 && (
        <div class="metric">
          <span>Transformer capacity (top rating)</span>
          <b>
            {xfmrs.map((t) => (transformerSiteRatingKVA(t) / 1000).toFixed(1)).join(' + ')}{' '}
            MVA
          </b>
        </div>
      )}
      <div class="metric">
        <span>Fault level HV / LV</span>
        <b>
          {level.system.hvFaultKA.toFixed(1)} /{' '}
          {(() => {
            const lv = [...review.calc.faultKA.entries()].filter(([n]) => Math.abs((review.topo.nodeById.get(n)?.kv ?? 0) - (level.system.lvKV ?? -1)) < 0.01).map(([, v]) => v);
            return lv.length ? Math.max(...lv).toFixed(1) : '—';
          })()}{' '}
          kA
        </b>
      </div>
      <div class="metric">
        <span>Switching scheme (HV / LV)</span>
        <b>
          {SCHEMES[review.scheme.hv].name} / {SCHEMES[review.scheme.lv].name}
        </b>
      </div>
      {level.features.shieldWires && (
        <div class="metric">
          <span>Shielding coverage</span>
          <b>{Math.round(review.shielding.coveredFraction * 100)}%</b>
        </div>
      )}
      {level.features.groundGrid && (
        <div class="metric">
          <span>Ground grid</span>
          <b style={{ color: g ? (g.safe ? 'var(--ok)' : 'var(--crit)') : undefined }}>
            {g ? (g.safe ? 'safe' : 'unsafe') : design.groundGrid.enabled ? '—' : 'none'}
            {g ? ` · Em ${Math.round(g.meshVoltageV)} / ${Math.round(g.touchTolerableV)} V` : ''}
          </b>
        </div>
      )}
      <div class="metric">
        <span>Est. outage minutes / member / yr</span>
        <b style={{ color: review.scoredSaidi > level.reliabilityTarget ? 'var(--major)' : 'var(--ok)' }}>
          {review.scoredSaidi.toFixed(0)} (target {level.reliabilityTarget})
        </b>
      </div>
      {review.reliability.contributions.filter((c) => !c.external && c.customerMinutes / review.reliability.totalCustomers >= 1).length > 0 && (
        <details style={{ marginTop: '.4em' }}>
          <summary class="small muted" style={{ cursor: 'pointer' }}>
            What drives outage minutes?
          </summary>
          {review.reliability.contributions
            .filter((c) => !c.external)
            .slice(0, 8)
            .map((c, i) => (
              <div class="metric small" key={i}>
                <span>
                  {c.cause}
                  {c.planned ? ' (planned)' : ''}
                </span>
                <b>{(c.customerMinutes / review.reliability.totalCustomers).toFixed(1)}</b>
              </div>
            ))}
          <div class="muted small" style={{ marginTop: '.3em' }}>
            Failure rates and repair times are game assumptions; see Field Guide → Game assumptions.
          </div>
        </details>
      )}
      <h4 style={{ margin: '.9em 0 .3em' }}>Findings</h4>
      {review.findings.length === 0 && <div class="muted small">No findings. Nice work.</div>}
      {review.findings.map((f) => (
        <FindingRow key={f.id} f={f} onClick={() => onFocus(f)} />
      ))}
      <div style={{ marginTop: '.8em' }}>
        <button class="btn small" onClick={() => store.set({ showBriefing: true })}>
          Project brief
        </button>
      </div>
    </div>
  );
}
