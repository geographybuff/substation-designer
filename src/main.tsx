import { render } from 'preact';

declare const __APP_VERSION__: string;

function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Substation Designer</h1>
      <p>Version {__APP_VERSION__} — in development.</p>
    </main>
  );
}

render(<App />, document.getElementById('app')!);
