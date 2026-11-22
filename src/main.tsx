import { render } from 'preact';
import { App } from './app/App';
import { isLicenseAccepted } from './app/license';
import { commit, go, store, type Screen } from './app/store';
import './app/styles.css';

store.set({ licenseAccepted: isLicenseAccepted() });
render(<App />, document.getElementById('app')!);

// Test hook for the end-to-end smoke test; only installed when the URL contains ?e2e.
if (new URLSearchParams(window.location.search).has('e2e')) {
  (window as unknown as { __substationDesigner: unknown }).__substationDesigner = {
    store,
    commit,
    go: (s: Screen) => go(s),
    async loadSolution(id: string): Promise<boolean> {
      const { SOLUTIONS } = await import('./levels/solutions');
      const make = SOLUTIONS[id];
      if (!make) return false;
      commit(make());
      store.set({ showBriefing: false, tutorialStep: 99 });
      return true;
    },
  };
}
