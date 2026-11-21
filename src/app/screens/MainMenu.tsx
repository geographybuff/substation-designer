import { desktop, isDesktop } from '../desktop';
import { go, startLevel, store } from '../store';

declare const __APP_VERSION__: string;

export function MainMenu() {
  return (
    <div class="screen center menu-bg" data-testid="main-menu">
      <svg width="84" height="84" viewBox="0 0 64 64" aria-hidden="true" style={{ marginBottom: '0.8em' }}>
        <rect width="64" height="64" rx="14" fill="#173a2e" />
        <path d="M36 6 18 36h12l-4 22 20-32H34z" fill="#f2c14e" />
      </svg>
      <h1 class="title">
        Substation <span>Designer</span>
      </h1>
      <p class="subtitle">
        Lay out, protect, ground and energize rural electric substations — with every design rule traced to USDA RUS Bulletin 1724E-300, <em>Design Guide for Rural Substations</em>.
      </p>
      <div class="menu-buttons">
        <button class="btn primary big" onClick={() => go('levels')} data-testid="menu-campaign">
          Campaign
        </button>
        <button class="btn big" onClick={() => startLevel('sandbox')} data-testid="menu-sandbox">
          Sandbox
        </button>
        <button class="btn big" onClick={() => store.set({ screen: 'guide', guideTopic: null })} data-testid="menu-guide">
          Field Guide
        </button>
        <button class="btn big" onClick={() => go('settings')} data-testid="menu-settings">
          Settings
        </button>
        <button class="btn big" onClick={() => go('credits')}>
          License &amp; Credits
        </button>
        {isDesktop && (
          <button class="btn big" onClick={() => desktop?.quit()}>
            Quit
          </button>
        )}
      </div>
      <div class="disclaimer">Independent educational game. Not affiliated with or endorsed by USDA or the Rural Utilities Service. Not for real engineering use.</div>
      <div class="version">v{__APP_VERSION__}</div>
    </div>
  );
}
