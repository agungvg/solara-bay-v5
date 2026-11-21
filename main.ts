// Solara Bay v5 — entrypoint (Node 22, standard library only).
//
// The game itself is plain static files under game/ (game/index.html plus
// its ES modules and the vendored three.js build) that a desktop browser
// opens offline with no network request. This program hands it in: it
// copies game/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library (vendor/makefun-game.ts, the kit's copy, unchanged).
//
// Serve the game locally with any static server pointed at game/, e.g.
//   python3 -m http.server 8130 --directory game
// then open http://localhost:8130.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The gate's caps (reference/gate.json): game/ at most 993 files and
// directories together and 48 MiB in all, index.html at most 1 MiB, 3 to 4
// screenshots of at most 256 KiB each. Refuse early, with the reason, rather
// than handing the grader an entry the scorer would refuse.
const GAME_MAX_FILES = 993;
const GAME_MAX_BYTES = 48 * 1024 * 1024;
const INDEX_MAX_BYTES = 1024 * 1024;
const SHOTS_MAX = 4;
const SHOT_MAX_BYTES = 256 * 1024;

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function countTree(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`game/ must not hold a symlink: ${full}`);
    if (entry.isDirectory()) {
      files += 1;
      const sub = countTree(full);
      files += sub.files;
      bytes += sub.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += statSync(full).size;
    }
  }
  return { files, bytes };
}

function checkGame() {
  const gameDir = join(here, 'game');
  if (!existsSync(join(gameDir, 'index.html'))) throw new Error('game/index.html is missing');
  const indexBytes = statSync(join(gameDir, 'index.html')).size;
  if (indexBytes > INDEX_MAX_BYTES) throw new Error(`game/index.html is ${indexBytes} bytes, over the 1 MiB cap`);
  const { files, bytes } = countTree(gameDir);
  if (files > GAME_MAX_FILES) throw new Error(`game/ holds ${files} files/dirs, over the 993 cap`);
  if (bytes > GAME_MAX_BYTES) throw new Error(`game/ is ${bytes} bytes, over the 48 MiB cap`);
  return { files, bytes };
}

function checkShots() {
  const shotsDir = join(here, 'screenshots');
  if (!existsSync(shotsDir)) throw new Error('screenshots/ is missing');
  const names = readdirSync(shotsDir).filter((n) => !n.startsWith('.')).sort();
  if (names.length < 3 || names.length > SHOTS_MAX) {
    throw new Error(`screenshots/ holds ${names.length} images, need 3 or 4`);
  }
  for (const name of names) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > SHOT_MAX_BYTES) throw new Error(`screenshots/${name} is ${size} bytes, over the 256 KiB cap`);
  }
  return names;
}

const DOSSIER_MAX_BYTES = 1536 * 1024; // the gate refuses a dossier over 1.5 MiB

const game = checkGame();
const shots = checkShots();

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// buildDossier writes the exact dossier the scorer rebuilds and compares
// byte for byte; the caps below are the scorer's own.
const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: SHOTS_MAX, max_bytes: SHOT_MAX_BYTES },
    game_max_files: GAME_MAX_FILES,
    game_max_bytes: GAME_MAX_BYTES,
    game_path_max_bytes: 1000,
  }),
);
const dossierBytes = statSync(dossierPath).size;
if (dossierBytes > DOSSIER_MAX_BYTES) {
  throw new Error(`dossier.json is ${dossierBytes} bytes, over the 1.5 MiB cap`);
}

console.log(`solara-bay-v5: game/ ${game.files} files, ${game.bytes} bytes; screenshots: ${shots.join(', ')}`);
console.log(`dossier written to ${resolve(dossierPath)} (${dossierBytes} bytes)`);
