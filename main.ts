// Solmar Bay — the entrypoint: builds the dossier (makefun/dossier/v1)
// from game/ and screenshots/ and writes it as dossier.json. Erasable
// TypeScript, runs as-is under `node main.ts` with no flags.
// Usage: node main.ts [entry-dir] [output]
import { buildDossier } from './vendor/makefun-game.ts';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = process.argv[2] ?? here;
const out = process.argv[3] ?? join(dir, 'dossier.json');
let bytes;
try {
  bytes = buildDossier(dir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
} catch (err) {
  console.error(`dossier: refused (${err.message})`);
  process.exit(1);
}
writeFileSync(out, bytes);
console.log(`dossier: ${bytes.length} bytes -> ${out}`);
