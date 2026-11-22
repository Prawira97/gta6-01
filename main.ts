// Solmar Bay — make.fun entrypoint (main.ts).
//
// Grader contract (read this before changing anything):
// - The grader runs `node main.ts` under Node 22, with no network, the
//   repository mounted read-only at /bot, and only $MAKEFUN_OUTPUT_DIR
//   writable. This program MUST NEVER write into the repository: every
//   file it produces goes under $MAKEFUN_OUTPUT_DIR.
// - $MAKEFUN_OUTPUT_DIR defaults to '/output' when unset.
// - The program copies game/ (the playable game, static files a desktop
//   browser loads offline) and screenshots/ (3-4 PNG/JPEG renders, only
//   when present beside this file) into the output directory, then builds
//   the entry dossier from the OUTPUT directory with the vendored make.fun
//   library and writes dossier.json into the output directory.
// - The dossier must equal what buildDossier writes from that output
//   directory, or the scorer rejects the entry. The game caps mirror
//   the gate: game_max_files is 993 (not 1000) because the grader caps
//   the output directory itself at 1000 entries, and game/ counts
//   alongside screenshots/ and dossier.json.
// - Erasable TypeScript: this file runs as-is under `node main.ts` with
//   no flags, no build and no install.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

try {
  const dossier = buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(out, 'dossier.json'), dossier);
  console.log(`dossier.json: ${dossier.length} bytes`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
