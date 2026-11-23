import { sfx } from '../../audio/player';
import { CAMPAIGN, getLevel } from '../../levels';
import type { SimulationResult } from '../../engine/simulation';
import { CiteLink, money } from '../components/Inspector';
import { FindingRow } from '../components/ReviewPanel';
import { Stars } from './LevelSelect';
import { go, startLevel, store, useStore } from '../store';

function LoadChart({ sim }: { sim: SimulationResult }) {
  const W = 520;
  const H = 140;
  const pad = 28;
  const maxY = Math.max(sim.capacityMVA, ...sim.peakByYear) * 1.15 || 1;
  const x = (i: number) => pad + ((W - 2 * pad) * i) / Math.max(1, sim.peakByYear.length - 1);
  const y = (v: number) => H - pad + 6 - ((H - 2 * pad) * v) / maxY;
  const path = sim.peakByYear.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} class="chart" role="img" aria-label="Peak load by year against transformer capacity">
      <line x1={pad} y1={H - pad + 6} x2={W - pad} y2={H - pad + 6} stroke="#2e4153" />
      {sim.capacityMVA > 0 && (
        <>
          <line x1={pad} x2={W - pad} y1={y(sim.capacityMVA)} y2={y(sim.capacityMVA)} stroke="#f97316" stroke-dasharray="5 4" />
          <text x={W - pad} y={y(sim.capacityMVA) - 4} fill="#f97316" font-size="10" text-anchor="end">
            transformer capacity {sim.capacityMVA.toFixed(1)} MVA
          </text>
        </>
      )}
      <path d={path} fill="none" stroke="#4fd1c5" stroke-width="2.5" />
      {sim.peakByYear.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill="#4fd1c5" />
      ))}
      <text x={pad} y={14} fill="#9fb1c2" font-size="10">
        Peak load (MVA) by year
      </text>
      <text x={pad} y={H - 6} fill="#9fb1c2" font-size="10">
        Year 1
      </text>
      <text x={W - pad} y={H - 6} fill="#9fb1c2" font-size="10" text-anchor="end">
        Year {sim.peakByYear.length}
      </text>
    </svg>
  );
}

export function Results() {
  const res = useStore(store, (s) => s.lastResult);
  const game = useStore(store, (s) => s.game);
  if (!res) {
    go('menu');
    return null;
  }
  const level = getLevel(res.levelId)!;
  const { review, sim } = res;
  const idx = CAMPAIGN.findIndex((l) => l.id === level.id);
  const next = idx >= 0 ? CAMPAIGN[idx + 1] : undefined;
  const notable = sim.events.filter((e) => !e.external || e.kind === 'line');
  const serious = review.findings.filter((f) => f.severity === 'critical' || f.severity === 'major');
  return (
    <div class="screen scroll menu-bg" data-testid="results">
      <div class="page results">
        <div class="page-head">
          <button class="btn" onClick={() => go('editor')} data-testid="results-back">
            ← Back to design
          </button>
          <h1>{level.title}</h1>
        </div>
        <div class="card" style={{ display: 'flex', alignItems: 'center', gap: '1.4em', flexWrap: 'wrap' }}>
          <div>
            <div class="big-stars">
              <Stars n={review.stars} />
            </div>
            <div style={{ fontSize: '1.3em', fontWeight: 700 }}>
              {level.sandbox ? 'Sandbox run complete' : review.passed ? 'Commissioned — the cooperative accepts your substation' : 'Not approved'}
            </div>
            {!review.passed && !level.sandbox && <div class="muted">Blocking: {review.blockers.join(', ')}.</div>}
            {res.fault && (
              <div class="fault-caption" data-testid="fault-caption">
                <b>What you heard:</b> {res.fault.caption}
              </div>
            )}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: '.5em', flexWrap: 'wrap' }}>
            {review.passed && next && (
              <button class="btn primary" onClick={() => startLevel(next.id)} data-testid="results-next">
                Next project: {next.title} →
              </button>
            )}
            {game.sound && (
              <button
                class="btn"
                onClick={() => {
                  const d = store.get().design;
                  if (d) sfx.energize(d, level, review);
                }}
                title="Play the energizing sound again"
                data-testid="results-replay"
              >
                ▶ Replay sound
              </button>
            )}
            <button class="btn" onClick={() => go('levels')}>
              All projects
            </button>
          </div>
        </div>
        <div class="kpis">
          <div class="kpi">
            <div class="v">{money(review.cost.total)}</div>
            <div class="l">Construction cost (budget {money(level.budget)})</div>
          </div>
          <div class="kpi">
            <div class="v" style={{ color: review.scoredSaidi > level.reliabilityTarget ? 'var(--major)' : 'var(--ok)' }}>{review.scoredSaidi.toFixed(0)} min</div>
            <div class="l">Expected outage minutes per member per year (target {level.reliabilityTarget})</div>
          </div>
          <div class="kpi">
            <div class="v">{sim.saidi.toFixed(0)} min</div>
            <div class="l">This run — one possible {sim.years}-year history (per member per year)</div>
          </div>
          <div class="kpi">
            <div class="v">{sim.momentaryOperations}</div>
            <div class="l">Temporary faults cleared by reclosing (momentary blinks only)</div>
          </div>
          <div class="kpi">
            <div class="v">{review.score}</div>
            <div class="l">Design score</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '1em' }}>
          <div class="card">
            <h3>{sim.years} years of service</h3>
            <LoadChart sim={sim} />
            {notable.length === 0 ? (
              <p class="muted">A quiet decade: no substation-caused outages in this run.</p>
            ) : (
              <div class="timeline">
                {notable.slice(0, 40).map((e, i) => (
                  <div key={i} class={`event ${e.kind === 'good' ? 'good' : e.planned ? 'planned' : e.kind === 'growth' ? '' : 'bad'}`}>
                    <div class="when">
                      Year {e.year}, month {e.month}
                      {e.external ? ' · outside your design' : ''}
                    </div>
                    <div>
                      <b>{e.title}</b>
                    </div>
                    <div class="muted small">
                      {e.detail} {e.cite && <CiteLink cite={e.cite} />}
                    </div>
                  </div>
                ))}
                {notable.length > 40 && <div class="muted small">…and {notable.length - 40} more events.</div>}
              </div>
            )}
          </div>
          <div class="card">
            <h3>Design review</h3>
            <div class="small" style={{ marginBottom: '.5em' }}>
              <span class="sev critical">{review.counts.critical} critical</span> · <span class="sev major">{review.counts.major} major</span> ·{' '}
              <span class="sev minor">{review.counts.minor} minor</span>
            </div>
            {!level.sandbox &&
              review.objectives.map((o) => (
                <div key={o.objective.id} class={`objective ${o.met ? 'met' : ''}`}>
                  <span class="box">{o.met ? '✓' : ''}</span>
                  <span>
                    {o.objective.text}
                    {o.objective.optional && <span class="muted small"> (optional)</span>}
                  </span>
                </div>
              ))}
            {serious.slice(0, 8).map((f) => (
              <FindingRow key={f.id} f={f} />
            ))}
            {review.reliability.contributions.filter((c) => !c.external).length > 0 && (
              <>
                <h4>Largest outage drivers</h4>
                {review.reliability.contributions
                  .filter((c) => !c.external)
                  .slice(0, 5)
                  .map((c, i) => (
                    <div class="metric small" key={i}>
                      <span>
                        {c.cause}
                        {c.planned ? ' (planned)' : ''}
                      </span>
                      <b>{(c.customerMinutes / review.reliability.totalCustomers).toFixed(1)} min</b>
                    </div>
                  ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
