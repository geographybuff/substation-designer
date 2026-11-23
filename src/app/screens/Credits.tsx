import { AUDIO_CREDITS } from '../../audio/samples';
import { LICENSE_NAME, LICENSE_TEXT } from '../license';
import { go } from '../store';

declare const __APP_VERSION__: string;

export function Credits() {
  return (
    <div class="screen scroll menu-bg">
      <div class="page">
        <div class="page-head">
          <button class="btn" onClick={() => go('menu')}>
            ← Menu
          </button>
          <h1>License &amp; Credits</h1>
          <span class="muted small">v{__APP_VERSION__}</span>
        </div>
        <div class="card" style={{ marginBottom: '1em' }}>
          <h3>About</h3>
          <p>
            Substation Designer is an independent educational game about rural electric substation design. Its design rules, tables and guidance are drawn from
            <strong> USDA Rural Utilities Service Bulletin 1724E-300, “Design Guide for Rural Substations”</strong> (issued June 2001). Every design-review message cites
            the section, table, figure or page it is based on.
          </p>
          <p class="muted">
            The game is not affiliated with, sponsored by or endorsed by the U.S. Department of Agriculture or the Rural Utilities Service. Gameplay simplifies real
            engineering, and some values — equipment costs, failure rates, repair times and event frequencies — are game assumptions that the bulletin does not provide.
            Do not use this game to design, build or operate real electrical facilities.
          </p>
          <p class="muted">
            The bulletin reproduces some tables and figures with permission from IEEE, NEMA, ANSI and others. The game uses factual values and paraphrased guidance with
            citations rather than reproducing those materials.
          </p>
        </div>
        <div class="card" style={{ marginBottom: '1em' }} data-testid="audio-credits">
          <h3>Sound</h3>
          <p class="muted">
            Equipment hum, switchgear and arcing faults are synthesized in the game from the physics of each sound: transformer hum at twice the 60 Hz system
            frequency, arcs that pulse at every current zero and last as long as the protective device takes to clear them. Recordings are layered over them:
          </p>
          <ul class="small audio-credits">
            {AUDIO_CREDITS.map((c) => (
              <li key={c.id}>
                “
                <a href={c.page} target="_blank" rel="noopener noreferrer">
                  {c.title}
                </a>
                ” by {c.author} ({c.library}), {c.license === 'CC0-1.0' ? 'CC0 (public domain)' : c.license.replace(/-(\d)/, ' $1')}. {c.modified}.
              </li>
            ))}
          </ul>
          <p class="muted small">The recordings are not covered by the game's license; each keeps its own.</p>
        </div>
        <div class="card">
          <h3>{LICENSE_NAME}</h3>
          <div class="license-text" style={{ maxHeight: 'none' }}>
            {LICENSE_TEXT}
          </div>
        </div>
      </div>
    </div>
  );
}
