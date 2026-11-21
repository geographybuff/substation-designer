import { useEffect } from 'preact/hooks';
import { isLicenseAccepted } from './license';
import { Credits } from './screens/Credits';
import { Editor } from './screens/Editor';
import { FieldGuide } from './screens/FieldGuide';
import { LevelSelect } from './screens/LevelSelect';
import { LicenseGate } from './screens/LicenseGate';
import { MainMenu } from './screens/MainMenu';
import { Results } from './screens/Results';
import { Settings } from './screens/Settings';
import { store, useStore } from './store';

function Toast() {
  const t = useStore(store, (s) => s.toast);
  useEffect(() => {
    if (!t) return;
    const id = setTimeout(() => store.set({ toast: null }), 2800);
    return () => clearTimeout(id);
  }, [t?.at]);
  if (!t) return null;
  return (
    <div class={`toast ${t.tone}`} role="status">
      {t.text}
    </div>
  );
}

export function App() {
  const accepted = useStore(store, (s) => s.licenseAccepted);
  const screen = useStore(store, (s) => s.screen);
  const g = useStore(store, (s) => s.graphics);

  useEffect(() => {
    if (!store.get().licenseAccepted && isLicenseAccepted()) store.set({ licenseAccepted: true });
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty('--ui-scale', String(g.uiScale));
    document.body.classList.toggle('reduce-motion', g.reduceMotion);
  }, [g.uiScale, g.reduceMotion]);

  if (!accepted) return <LicenseGate />;
  return (
    <>
      {screen === 'menu' && <MainMenu />}
      {screen === 'levels' && <LevelSelect />}
      {screen === 'editor' && <Editor />}
      {screen === 'results' && <Results />}
      {screen === 'guide' && <FieldGuide />}
      {screen === 'settings' && <Settings />}
      {screen === 'credits' && <Credits />}
      <Toast />
    </>
  );
}
