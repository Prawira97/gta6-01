// Solmar Bay — a tiny static file server for local play and the E2E tests.
// Serves this repository's root (so / loads game/index.html and /game/*,
// /screenshots/* resolve beside it), with the right MIME types for ES
// modules, and prints one line when it starts listening — the E2E waits for
// that line. Node's standard library only; run it as `node serve.ts` (the
// --port flag picks the port, default 8080).
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const args = process.argv.slice(2);
let port = 8080;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--port' && args[i + 1]) port = Number(args[i + 1]);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.css': 'text/css; charset=utf-8',
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const rel = url.pathname === '/' ? '/game/index.html' : url.pathname;
  // The page is game/index.html served at /, so its relative references
  // (./src/main.js, ./vendor/three/...) resolve against the root. Look a
  // path up under the repo first, then under game/ — the game must also work
  // standalone when game/ itself is the server root.
  let file = join(root, decodeURIComponent(rel));
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    file = join(root, 'game', decodeURIComponent(rel));
  }
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  const headers = { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' };
  if (req.method === 'HEAD') {
    res.writeHead(200, headers);
    res.end();
    return;
  }
  res.writeHead(200, headers);
  res.end(readFileSync(file));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Solmar Bay serving on http://127.0.0.1:${port}/`);
});
