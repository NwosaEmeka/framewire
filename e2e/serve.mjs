// Minimal static server for e2e: `node serve.mjs <port> <dir>`.
// Serves <dir>, plus the built *.global.js files from packages/framewire/dist.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const [port, dir] = process.argv.slice(2);
const root = resolve(dir);
const dist = resolve(import.meta.dirname, '../packages/framewire/dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const base = path.endsWith('.global.js') ? dist : root;
  const file = join(base, path.endsWith('/') ? `${path}index.html` : path);
  if (!file.startsWith(base + sep)) {
    res.writeHead(404).end('not found');
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': types[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(Number(port), () => console.log(`e2e: serving ${root} on :${port}`));
