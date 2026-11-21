// Solmar Bay — boot, screen state machine, and the fixed-step game loop.
// Screens: title (attract mode over the live city), play, paused, over.
// ?shot=start|play|mission|end&seed=1 renders one deterministic frame for screenshots.
import { createWorld, stepWorld } from './world.js';
import { createRenderer } from './render.js';
import { createHud } from './hud.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE } from './input.js';
import { createAudio } from './audio.js';
import { createPersonMesh } from './people.js';
import { MISSIONS } from './missions.js';
import { clearSave, hasSave } from './save.js';
import { stageShot } from './shots.js';
import { STEP } from './config.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);

const canvas = document.getElementById('game');
const minimapCanvas = document.getElementById('minimap');
const statusEl = document.getElementById('status');
const titleScreen = document.getElementById('title-screen');
const pauseScreen = document.getElementById('pause-screen');
const overScreen = document.getElementById('over-screen');
const startButton = document.getElementById('start-button');
const continueButton = document.getElementById('continue-button');
const resumeButton = document.getElementById('resume-button');
const quitButton = document.getElementById('quit-button');
const respawnButton = document.getElementById('respawn-button');
const titleButton = document.getElementById('title-button');

const hud = createHud();
const input = createInput(canvas);
const audio = createAudio();

let world = null;
let renderer = null;
let screen = 'title';
let lastTime = performance.now();
let accumulator = 0;
let lastMissionTitle = '';
let lastCompleted = 0;
let overKind = null;

const idleInput = {
  move: () => ({ x: 0, y: 0 }),
  sprint: () => false,
  takeLook: () => ({ x: 0, y: 0 }),
  takeZoom: () => 0,
  attackHeld: () => false,
  takeActions: () => 0,
};

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function buildWorld(options) {
  world = createWorld(options);
  renderer = createRenderer(canvas, world.city, minimapCanvas);
  renderer.setPlayerMesh(createPersonMesh('player', 0x2ec4b6, 0x2a2f38, 0xc98a5e));
  renderer.resize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);
  const def = world.mission && world.mission.active ? MISSIONS[world.mission.index] : null;
  lastMissionTitle = def ? def.title : '';
  lastCompleted = world.completed.length;
  overKind = null;
}

function showOnly(element) {
  for (const el of [titleScreen, pauseScreen, overScreen]) {
    if (el) el.classList.toggle('hidden', el !== element);
  }
}

function toTitle() {
  screen = 'title';
  showOnly(titleScreen);
  if (continueButton) continueButton.classList.toggle('hidden', !hasSave());
  announce('Solmar Bay — title screen.');
}

function toPlay() {
  screen = 'play';
  showOnly(null);
  audio.resume();
  announce('Playing Solmar Bay.');
}

function toPaused() {
  if (screen !== 'play') return;
  screen = 'paused';
  showOnly(pauseScreen);
  announce('Paused.');
}

function toOver(kind) {
  screen = 'over';
  overKind = kind;
  showOnly(overScreen);
  audio.busted();
  announce(kind === 'busted' ? 'Busted.' : 'Wasted.');
}

function startNewGame() {
  clearSave();
  buildWorld({});
  toPlay();
}

function continueGame() {
  buildWorld({});
  toPlay();
}

// Buttons.
if (startButton) startButton.addEventListener('click', startNewGame);
if (continueButton) continueButton.addEventListener('click', continueGame);
if (resumeButton) resumeButton.addEventListener('click', toPlay);
if (quitButton) quitButton.addEventListener('click', () => { world.save(); toTitle(); });
if (respawnButton) respawnButton.addEventListener('click', () => {
  world.respawn(overKind || 'wasted');
  toPlay();
});
if (titleButton) titleButton.addEventListener('click', toTitle);

// ---- Deterministic screenshot mode: stage, paint once, signal readiness. ----
if (shotName) {
  const staged = stageShot(shotName, { width: window.innerWidth, height: window.innerHeight });
  world = staged.world;
  renderer = createRenderer(canvas, world.city, minimapCanvas);
  renderer.setPlayerMesh(createPersonMesh('player', 0x2ec4b6, 0x2a2f38, 0xc98a5e));
  renderer.resize(window.innerWidth, window.innerHeight);
  screen = staged.screen;
  // The title screen is visible by default in the markup: hide it for gameplay shots.
  if (screen === 'title') showOnly(titleScreen);
  else if (screen === 'over') showOnly(overScreen);
  else showOnly(null);
  hud.update(world, screen, 0);
  renderer.draw(world, screen, 2.5);
  renderer.draw(world, screen, 2.5);
  announce(`Shot ${shotName} ready.`);
  window.__shotReady = true;
} else {
  buildWorld(Number.isFinite(seedParam) ? { seed: seedParam } : {});
  toTitle();

  function resize() {
    renderer.resize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);
  }
  window.addEventListener('resize', resize);
  resize();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) toPaused();
  });

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.25) dt = 0.25;
    const actions = input.takeActions();
    if (actions & ACTION_PAUSE) {
      if (screen === 'play') toPaused();
      else if (screen === 'paused') toPlay();
    }
    if (screen === 'play' && (actions & ACTION_CONFIRM)) {
      // Confirm is a no-op in play; it exists for menu flows.
    }
    if (screen === 'title') {
      accumulator += dt;
      while (accumulator >= STEP) {
        stepWorld(world, idleInput, STEP, null);
        accumulator -= STEP;
      }
      renderer.draw(world, 'title', world.time);
    } else if (screen === 'play') {
      accumulator += dt;
      let steps = 0;
      while (accumulator >= STEP && steps < 5) {
        const result = stepWorld(world, input, STEP, audio);
        accumulator -= STEP;
        steps += 1;
        if (result === 'wasted' || result === 'busted') {
          toOver(result);
          break;
        }
      }
      if (steps === 5) accumulator = 0;
      // Mission banner on a new mission or a completion.
      const def = world.mission && world.mission.active ? MISSIONS[world.mission.index] : null;
      const title = def ? def.title : '';
      if (title && title !== lastMissionTitle) {
        lastMissionTitle = title;
        hud.banner(title, def.briefing || '');
      }
      if (world.completed.length > lastCompleted) {
        lastCompleted = world.completed.length;
        hud.banner('Mission complete', `+$${world.lastReward ?? 0} — rep up. The city is watching.`);
      }
      const msg = world.messages[world.messages.length - 1];
      if (msg) hud.message(msg.text, Math.max(0.1, msg.until - world.time));
      hud.update(world, 'play', dt);
      renderer.draw(world, 'play', world.time);
    } else if (screen === 'paused') {
      hud.update(world, 'paused', dt);
      renderer.draw(world, 'paused', world.time);
    } else if (screen === 'over') {
      hud.update(world, 'over', dt);
      renderer.draw(world, 'over', world.time);
    }
  }
  requestAnimationFrame(frame);
}
