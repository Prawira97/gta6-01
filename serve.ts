// Solmar Bay — a tiny static server for local play and tests. Serves the
// repo root; any path not found there falls back to game/, because the
// page is served at / and its relative references resolve to the root.
// Usage: node serve.ts [--port 8081]
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const port = portIdx >= 0 ? Number(args[portIdx + 1] || 8080) : 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ts': 'text/plain; charset=utf-8',
};

function resolve(path) {
  const clean = normalize(decodeURIComponent(path)).replace(/^\/+/, '');
  const atRoot = join(root, clean);
  if (atRoot.startsWith(root) && existsSync(atRoot) && statSync(atRoot).isFile()) return atRoot;
  const inGame = join(root, 'game', clean);
  if (inGame.startsWith(join(root, 'game')) && existsSync(inGame) && statSync(inGame).isFile()) return inGame;
  return null;
}

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  let path = url.pathname;
  if (path === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (path === '/') path = '/index.html';
  const file = resolve(path) || (path.endsWith('/') ? resolve(`${path}index.html`) : null);
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found\n');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Solmar Bay serving at http://127.0.0.1:${port}/`);
});
