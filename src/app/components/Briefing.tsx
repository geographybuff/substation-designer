import type { LevelDef } from '../../engine/types';
import { CiteLink, money } from './Inspector';
import { store } from '../store';

export function Briefing({ level }: { level: LevelDef }) {
  const s = level.system;
  const close = () => store.set({ showBriefing: false });
  return (
    <div class="modal-back" onClick={close} data-testid="briefing">
      <div class="modal" onClick={(e) => e.stopPropagation()}>
        <div class="modal-head">
          <div class="muted small">{level.client}</div>
          <h2 style={{ margin: '.1em 0' }}>{level.title}</h2>
          <div class="muted">{level.subtitle}</div>
        </div>
        <div class="modal-body">
          {level.briefing.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1em' }}>
            <div class="card">
              <h4 style={{ marginTop: 0 }}>Site</h4>
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
                <span>Thunderstorm days / yr</span>
                <b>{level.site.isokeraunicDays}</b>
              </div>
              {(level.site.notes ?? []).map((n) => (
                <div key={n} class="muted small" style={{ marginTop: '.3em' }}>
                  • {n}
                </div>
              ))}
            </div>
            <div class="card">
              <h4 style={{ marginTop: 0 }}>System</h4>
              <div class="metric">
                <span>Voltages</span>
                <b>
                  {s.hvKV} kV{s.lvKV !== undefined ? ` → ${s.lvKV} kV` : ''}
                </b>
              </div>
              <div class="metric">
                <span>Fault current at HV bus</span>
                <b>
                  {s.hvFaultKA} kA (3φ), {s.hvGroundFaultKA} kA (1φ-G)
                </b>
              </div>
              <div class="metric">
                <span>Peak load / growth</span>
                <b>
                  {s.loadMVA} MVA, {s.growthPct}%/yr
                </b>
              </div>
              <div class="metric">
                <span>Planning horizon</span>
                <b>{s.horizonYears} years</b>
              </div>
              <div class="metric">
                <span>Budget</span>
                <b>{money(level.budget)}</b>
              </div>
              {s.feeders.map((f) => (
                <div class="metric small" key={f.name}>
                  <span>{f.name}</span>
                  <b>
                    {Math.round(f.share * 100)}% · {f.customers.toLocaleString()} members
                  </b>
                </div>
              ))}
            </div>
          </div>
          {level.objectives.length > 0 && (
            <>
              <h4>Objectives</h4>
              <ul>
                {level.objectives.map((o) => (
                  <li key={o.id}>
                    {o.text}
                    {o.optional && <span class="muted"> (optional, for ★★★)</span>} {o.cite && <CiteLink cite={o.cite} />}
                  </li>
                ))}
              </ul>
            </>
          )}
          <h4>From the design guide</h4>
          <ul>
            {level.topics.map((t) => (
              <li key={t.text}>
                {t.text} — <CiteLink cite={t.cite} />
              </li>
            ))}
          </ul>
          <p class="muted small">
            ★ Pass: no critical findings, required objectives met, within budget. ★★ also no major findings and outage minutes within target ({level.reliabilityTarget} min/member/yr). ★★★ also
            optional objectives, no minor findings and at least 5% under budget.
          </p>
        </div>
        <div class="modal-foot">
          <button class="btn primary" onClick={close} data-testid="briefing-start">
            Start designing
          </button>
        </div>
      </div>
    </div>
  );
}
