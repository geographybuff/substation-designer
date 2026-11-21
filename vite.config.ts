import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Two build flavours:
//  - default: multi-file build in dist/ (loaded by the Electron desktop app via file://)
//  - "singlefile": one self-contained HTML file in dist-web/ that runs from a double-click in any browser
export default defineConfig(({ mode }) => {
  const single = mode === 'singlefile';
  return {
    base: './',
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    esbuild: {
      jsx: 'automatic',
      jsxImportSource: 'preact',
    },
    plugins: single ? [viteSingleFile()] : [],
    build: {
      outDir: single ? 'dist-web' : 'dist',
      emptyOutDir: true,
      target: 'es2022',
      chunkSizeWarningLimit: 2000,
      // Electron loads index.html from file://, where ES module workers/preload are fine,
      // but keep everything in one chunk graph without module preload polyfill noise.
      modulePreload: { polyfill: false },
    },
    test: {
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  };
});
