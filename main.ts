// Solmar Bay — the entry program. It hands the game in: copy game/ and
// screenshots/ from this repository into the output directory and write the
// dossier there, the summary the judge reads. Node's standard library only,
// no build step, no install — `node main.ts` is enough. Outside the grader's
// container MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The dossier is built with the vendored make.fun library (the scorer's own
// copy, byte for byte), and the scorer requires the dossier it writes to
// equal the dossier.json handed in — so this program is the only thing that
// ever writes dossier.json.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function handIn() {
  mkdirSync(outDir, { recursive: true });
  cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  const shots = join(repoRoot, 'screenshots');
  if (existsSync(shots)) cpSync(shots, join(outDir, 'screenshots'), { recursive: true });

  // The scorer's caps, from the bounty's gate: at most 4 screenshots of at
  // most 256 KiB, at most 993 files / 48 MiB under game/, paths under
  // 1000 bytes, and the dossier's text under 160 KiB. Only text_max_bytes
  // shapes the bytes; the rest refuse an entry the scorer would refuse.
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  // buildDossier hands back a Uint8Array, and a Uint8Array's toString()
  // ignores any encoding argument and joins the raw byte values with
  // commas — so decode it explicitly before parsing.
  const view = JSON.parse(new TextDecoder().decode(dossier));
  const shotCount = view.images ? view.images.length : 0;
  console.log(`Solmar Bay handed in: ${outDir}/dossier.json (${dossier.length} bytes, ${shotCount} screenshots)`);
}

handIn();
