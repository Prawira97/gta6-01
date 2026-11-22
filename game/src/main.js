// Solmar Bay — browser entry. Builds the world, wires input / HUD / audio /
// renderer, and runs the game loop. With ?shot=<name> it stages a fixed
// scene, renders a fixed number of frames and sets window.__shotReady — the
// page then sits still so the screenshot is byte-identical every run.
import * as THREE from 'three';
import { createWorld, stepWorld } from './world.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { updateHud } from './hud.js';
import { stageShot } from './shots.js';

void THREE;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const canvas = document.getElementById('game-canvas');
const world = createWorld({ seed: shotName ? 7 : 1, shot: !!shotName });
const renderer = createRenderer(world, canvas);
const input = createInput();
input.attach(canvas);
const audio = createAudio();
world.audio = (name) => audio.play(name);

const titleScreen = document.getElementById('title-screen');
const startButton = document.getElementById('start-button');
let started = false;
let respawnTimer = 0;

function beginGame() {
  started = true;
  if (titleScreen) titleScreen.classList.add('hidden');
}
if (startButton) startButton.addEventListener('click', beginGame);
// M toggles the procedural audio off and on.
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM' && !e.repeat) audio.setMuted(!audio.muted);
});

updateHud(world);

if (shotName) {
  // Shot mode: no animation loop. Stage, step a fixed number of frames,
  // render, and stop — the page is frozen for the screenshot.
  const staged = stageShot(world, shotName);
  if (staged.started) beginGame();
  const idle = {
    move: () => ({ x: 0, y: 0 }),
    sprint: () => false,
    takeLook: () => ({ x: 0, y: 0 }),
    takeZoom: () => 0,
    attackHeld: () => false,
    takeActions: () => 0,
  };
  const frames = shotName === 'start' ? 2 : 5;
  for (let i = 0; i < frames; i += 1) {
    if (staged.started) stepWorld(world, idle, 1 / 60, null);
    renderer.render();
    updateHud(world);
  }
  window.__shotReady = true;
} else {
  // Normal play: fixed-step accumulator, HUD + audio every frame.
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (started) {
      acc += dt;
      let n = 0;
      while (acc >= 1 / 60 && n < 3) {
        stepWorld(world, input, 1 / 60, null);
        acc -= 1 / 60;
        n += 1;
      }
      if (world.endState) {
        respawnTimer += dt;
        if (respawnTimer > 1.5) {
          world.respawn(world.endState);
          respawnTimer = 0;
        }
      }
      const speed = world.playerCar ? Math.abs(world.playerCar.speed) : 0;
      audio.engine(speed);
    }
    renderer.render();
    updateHud(world);
  }
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  renderer.resize(window.innerWidth, window.innerHeight);
});
