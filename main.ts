// Solmar Bay — the entrypoint: hands the game in to the grader.
// The grader runs `node main.ts` on Node 22 in a fresh container with no
// network, a read-only /bot (this repository) and a writable /output, so
// this program never writes into the repository: it copies game/ and
// screenshots/ from beside this file to $MAKEFUN_OUTPUT_DIR (default
// /output), builds the dossier (makefun/dossier/v1) from the output
// directory with the vendored make.fun library, and writes
// /output/dossier.json there. Erasable TypeScript, runs as-is under
// `node main.ts` with no flags.
// The dossier is deterministic: built from the copied output directory it
// is byte-identical to one built straight from the repository (same game
// files, same order), so the committed dossier.json and the grader's
// /output/dossier.json agree.
// Local use (outside the grader's container, MAKEFUN_OUTPUT_DIR stands
// in for /output):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

let bytes;
try {
  bytes = buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
} catch (err) {
  console.error(`dossier: refused (${(err as Error).message})`);
  process.exit(1);
}
writeFileSync(join(out, 'dossier.json'), bytes);
console.log(`dossier: ${bytes.length} bytes -> ${join(out, 'dossier.json')}`);
