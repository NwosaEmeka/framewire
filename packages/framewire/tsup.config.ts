import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', host: 'src/host.ts', frame: 'src/frame.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  minify: true,
  treeshake: true,
  target: 'es2020',
});
