import { CAMPAIGN, isUnlocked } from '../../levels';
import { load } from '../persist';
import { go, startLevel, store, useStore } from '../store';

export function Stars({ n, of = 3 }: { n: number; of?: number }) {
  return (
    <span class="stars" aria-label={`${n} of ${of} stars`}>
      {Array.from({ length: of }, (_, i) => (
        <span key={i} class={i < n ? '' : 'off'}>
          ★
        </span>
      ))}
    </span>
  );
}

export function LevelSelect() {
  const progress = useStore(store, (s) => s.progress);
  return (
    <div class="screen scroll menu-bg" data-testid="level-select">
      <div class="page">
        <div class="page-head">
          <button class="btn" onClick={() => go('menu')}>
            ← Menu
          </button>
          <h1>Campaign</h1>
          <span class="muted small">Projects unlock as you complete them</span>
        </div>
        <div class="grid-levels">
          {CAMPAIGN.map((l, idx) => {
            const unlocked = isUnlocked(l.id, progress);
            const p = progress[l.id];
            const hasSave = !!load(`design:${l.id}`, null);
            return (
              <div
                key={l.id}
                class={`card level-card ${unlocked ? '' : 'locked'}`}
                onClick={() => unlocked && startLevel(l.id)}
                data-testid={`level-${l.id}`}
                role="button"
                tabIndex={0}
              >
                <div class="num">Project {idx + 1}</div>
                <h3>{l.title}</h3>
                <div class="muted small">{l.subtitle}</div>
                <div class="small">{l.client}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6em', marginTop: 'auto' }}>
                  <Stars n={p?.stars ?? 0} />
                  {p?.completed && <span class="tag">completed</span>}
                  {!unlocked && <span class="tag">locked</span>}
                  <span style={{ flex: 1 }} />
                  {unlocked && hasSave && (
                    <button
                      class="btn small"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Start this project over? Your saved layout will be replaced.')) startLevel(l.id, true);
                      }}
                    >
                      Restart
                    </button>
                  )}
                </div>
                <div class="muted small">
                  {l.topics
                    .slice(0, 3)
                    .map((t) => t.text)
                    .join(' · ')}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
