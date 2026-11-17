import { defineConfig } from 'tsup';

const shared = { minify: true, treeshake: true, target: 'es2020' } as const;

export default defineConfig([
  {
    ...shared,
    entry: { index: 'src/index.ts', host: 'src/host.ts', frame: 'src/frame.ts' },
    format: ['esm', 'cjs'],
    dts: true,
  },
  {
    ...shared,
    // Script-tag builds; each attaches itself to window.framewire.
    entry: { framewire: 'src/global.ts', 'framewire.frame': 'src/global-frame.ts' },
    format: ['iife'],
  },
]);
