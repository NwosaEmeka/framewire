// Gzipped size of every public entry, bundled and minified as a consumer would ship it.
// Fails (exit 1) when any entry is over the budget. Writes dist/size.json for the README.
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BUDGET = 3072;
const dist = new URL('../packages/framewire/dist/', import.meta.url);

const bundle = async (file) => {
  const result = await build({
    entryPoints: [new URL(file, dist).pathname],
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    logLevel: 'error',
  });
  return result.outputFiles[0].contents;
};

const entries = {
  index: await bundle('index.js'),
  host: await bundle('host.js'),
  frame: await bundle('frame.js'),
  'framewire.global': readFileSync(new URL('framewire.global.js', dist)),
  'framewire.frame.global': readFileSync(new URL('framewire.frame.global.js', dist)),
};

const sizes = Object.fromEntries(
  Object.entries(entries).map(([name, code]) => [name, gzipSync(code, { level: 9 }).length]),
);

let failed = false;
for (const [name, bytes] of Object.entries(sizes)) {
  const over = bytes > BUDGET;
  failed ||= over;
  console.log(`${over ? '✗' : '✓'} ${name.padEnd(24)} ${(bytes / 1024).toFixed(2)} KB gzip`);
}
console.log(`budget: ${(BUDGET / 1024).toFixed(2)} KB per entry`);
writeFileSync(new URL('size.json', dist), JSON.stringify(sizes, null, 2) + '\n');
process.exit(failed ? 1 : 0);
