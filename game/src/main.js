// Solmar Bay — the browser entry point: builds the world, stages a shot
// (?shot=1..4) or starts the title screen, and runs the frame loop.
import { createWorld, stepWorld } from './world.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { updateHud } from './hud.js';
import { stageShot } from './shots.js';
import { makeAudio } from './audio.js';
import { loadGame, saveGame } from './save.js';

const params = new URLSearchParams(window.location.search);
const shotNum = Number(params.get('shot') || 0);
const canvas = document.getElementById('game-canvas');
const world = createWorld({ seed: 1, shot: shotNum >= 1 && shotNum <= 4 });
const renderer = createRenderer(canvas, world);
const audio = makeAudio();
world.sound = (name) => audio.sound(name);

function applySave() {
  const data = loadGame();
  if (!data) return false;
  world.cash = data.cash || 0;
  world.rep = data.rep || 0;
  world.missionIndex = data.missionIndex || 0;
  world.hasSmg = !!data.hasSmg;
  world.activities.race.best = data.raceBest ?? null;
  world.courierDone = data.courierDone || 0;
  world.time = data.time || 8;
  const n = Math.min(data.packages || 0, world.collectibles.length);
  for (let i = 0; i < n; i += 1) world.collectibles[i].taken = true;
  return true;
}

if (shotNum >= 1 && shotNum <= 4) {
  // Shot mode: stage the scene, hide the menu, render a few frames and
  // signal readiness. The world is never stepped, so the frame is fixed.
  stageShot(world, shotNum);
  document.getElementById('title-screen').classList.add('hidden');
  updateHud(world, document);
  let frames = 0;
  const shotFrame = () => {
    renderer.render();
    frames += 1;
    if (frames < 3) requestAnimationFrame(shotFrame);
    else window.__shotReady = true;
  };
  requestAnimationFrame(shotFrame);
} else {
  const hasSave = applySave();
  const input = createInput(canvas);
  const titleScreen = document.getElementById('title-screen');
  const startButton = document.getElementById('start-button');
  const continueButton = document.getElementById('continue-button');
  const endScreen = document.getElementById('end-screen');
  const endTitle = document.getElementById('end-title');
  const respawnButton = document.getElementById('respawn-button');
  if (continueButton) {
    continueButton.classList.toggle('hidden', !hasSave);
  }

  let playing = false;
  let last = performance.now();

  function startGame() {
    audio.resume();
    titleScreen.classList.add('hidden');
    playing = true;
    if (canvas.requestPointerLock) canvas.requestPointerLock();
    world.message('Welcome back to Solmar Bay.');
  }

  startButton.addEventListener('click', startGame);
  if (continueButton) continueButton.addEventListener('click', startGame);
  canvas.addEventListener('click', () => {
    if (playing && canvas.requestPointerLock) canvas.requestPointerLock();
  });
  respawnButton.addEventListener('click', () => {
    world.respawn(world.endState);
    endScreen.classList.add('hidden');
  });
  window.addEventListener('resize', () => renderer.resize());
  // Keep progress if the tab closes mid-run; mission completion saves too.
  window.addEventListener('beforeunload', () => {
    if (playing) saveGame(world);
  });

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    if (playing && !world.endState) {
      stepWorld(world, input, dt, audio);
    }
    if (world.endState && endScreen.classList.contains('hidden')) {
      endTitle.textContent = world.endState === 'busted' ? 'BUSTED' : 'WASTED';
      endScreen.classList.remove('hidden');
    }
    renderer.render();
    updateHud(world, document);
    requestAnimationFrame(frame);
  }
  updateHud(world, document);
  requestAnimationFrame(frame);
}
