// Solmar Bay — the 12-mission story (Kai Reyes vs Victor Kane, via Mara
// Solis). Pure logic: no DOM, no rendering, no randomness. The world drives
// it through startMission / updateMission; the sim drives the same functions
// with a fake game object, so a step's completion rule must work for both.
//
// Step types:
//   goto / talk / pickup / deliver / escape — reach step.at on foot
//   driveTo — reach step.at in a car (playerCar, else the player)
//   timed — reach step.at before step.time seconds run out, else fail
//   stealCar — get into a car (playerCar set)
//   deliverCar — bring the target car (or yourself) to step.at
//   kill — state.kills reaches step.count (enemies spawn on step entry)
//   race — visit step.points in order before step.time runs out, else fail
//   tail — stay 8–80 m behind the mark for 45 s; lose it (>80 m) and fail
//   escort — the escort truck reaches step.dest; stray >90 m and fail
import { PLACES, INTERACT } from './config.js';

const RACE_POINTS = [
  { x: -56, z: -168 },
  { x: 0, z: -168 },
  { x: 56, z: -168 },
  { x: 56, z: -112 },
  { x: -112, z: -112 },
];

export const MISSIONS = [
  {
    id: 'meet-mara',
    title: 'Meet Mara',
    reward: { cash: 100, rep: 5 },
    steps: [
      { type: 'goto', at: { ...PLACES.plaza }, text: 'Meet Mara at the plaza' },
      { type: 'talk', at: { ...PLACES.plaza }, text: 'Talk to Mara' },
    ],
  },
  {
    id: 'first-wheels',
    title: 'First Wheels',
    reward: { cash: 150, rep: 5 },
    steps: [
      { type: 'stealCar', at: { ...PLACES.garage }, text: 'Steal a sedan near the garage' },
      { type: 'deliverCar', at: { ...PLACES.garage }, text: 'Deliver it to the garage' },
    ],
  },
  {
    id: 'taxi-nights',
    title: 'Taxi Nights',
    reward: { cash: 200, rep: 8 },
    steps: [
      { type: 'pickup', at: { x: -56, z: 0 }, text: 'Pick up the fare' },
      { type: 'deliver', at: { x: 112, z: 56 }, text: 'Drop the fare at the hotel' },
    ],
  },
  {
    id: 'package-run',
    title: 'Package Run',
    reward: { cash: 200, rep: 8 },
    steps: [
      { type: 'pickup', at: { x: -112, z: 56 }, text: 'Pick up the package' },
      { type: 'deliver', at: { x: 168, z: 0 }, text: 'Deliver it across town' },
    ],
  },
  {
    id: 'muscle',
    title: 'Muscle',
    reward: { cash: 300, rep: 10 },
    steps: [
      { type: 'goto', at: { x: 0, z: 112 }, text: 'Meet the crew' },
      { type: 'kill', at: { x: 0, z: 112 }, count: 3, text: "Clear out Kane's thugs" },
    ],
  },
  {
    id: 'getaway',
    title: 'Getaway',
    reward: { cash: 250, rep: 10 },
    steps: [
      { type: 'driveTo', at: { x: 112, z: -56 }, text: 'Drive to the safehouse' },
      { type: 'escape', at: { x: 168, z: -56 }, text: 'Lose the tail' },
    ],
  },
  {
    id: 'night-run',
    title: 'Night Run',
    reward: { cash: 400, rep: 12 },
    steps: [
      { type: 'pickup', at: { ...PLACES.docks }, text: 'Pick up the package at the docks' },
      { type: 'timed', at: { ...PLACES.casino }, time: 90, text: 'Deliver to the casino before dawn' },
    ],
  },
  {
    id: 'tail-lieutenant',
    title: 'Tail the Lieutenant',
    reward: { cash: 400, rep: 12 },
    steps: [
      { type: 'goto', at: { ...PLACES.casino }, text: 'Find the lieutenant at the casino' },
      { type: 'tail', at: { x: 28, z: -168 }, dest: { x: 168, z: 168 }, text: 'Tail him without being seen' },
    ],
  },
  {
    id: 'street-king',
    title: 'Street King',
    reward: { cash: 600, rep: 15 },
    steps: [
      { type: 'race', points: RACE_POINTS, time: 180, text: 'Win the street race' },
    ],
  },
  {
    id: 'rosas-convoy',
    title: "Rosa's Convoy",
    reward: { cash: 600, rep: 15 },
    steps: [
      { type: 'escort', at: { x: -168, z: 168 }, dest: { ...PLACES.docks }, text: "Escort Rosa's truck to the docks" },
    ],
  },
  {
    id: 'payback-docks',
    title: 'Payback at the Docks',
    reward: { cash: 800, rep: 20 },
    steps: [
      { type: 'goto', at: { x: 168, z: 196 }, text: 'Reach the docks' },
      { type: 'kill', at: { ...PLACES.docks }, count: 4, text: 'Take down the dock crew' },
    ],
  },
  {
    id: 'kanes-vault',
    title: "Kane's Vault",
    reward: { cash: 1500, rep: 30 },
    steps: [
      { type: 'goto', at: { ...PLACES.vault }, text: "Reach Kane's Vault" },
      { type: 'kill', at: { ...PLACES.vault }, count: 6, text: 'Take down Rico and his guards' },
      { type: 'escape', at: { ...PLACES.plaza }, text: 'Escape to the plaza' },
    ],
  },
];

export const MISSION_COUNT = MISSIONS.length;

export function createMissionState() {
  return {
    index: -1,
    step: 0,
    kills: 0,
    checkpoint: 0,
    timer: 0,
    tailTimer: 0,
    spawned: false,
    active: false,
  };
}

export function resetMissionState(state) {
  state.index = -1;
  state.step = 0;
  state.kills = 0;
  state.checkpoint = 0;
  state.timer = 0;
  state.tailTimer = 0;
  state.spawned = false;
  state.active = false;
}

export function currentObjective(state) {
  if (state.index < 0 || state.index >= MISSIONS.length) return 'Free roam — Solmar Bay';
  const mission = MISSIONS[state.index];
  const step = mission.steps[state.step];
  const n = state.index + 1;
  if (!step) return `${mission.title} — ${n}/${MISSIONS.length}`;
  return `${step.text} — ${n}/${MISSIONS.length}`;
}

function dist(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

export function startMission(state, index, game) {
  const mission = MISSIONS[index];
  if (!mission) return false;
  resetMissionState(state);
  state.index = index;
  state.active = true;
  // Spawn the special cars up front so the tail / escort steps can find
  // them from their first update.
  for (const step of mission.steps) {
    if (step.type === 'tail' && game.spawnMarkCar) game.spawnMarkCar(step.at);
    if (step.type === 'escort' && game.spawnEscortCar) game.spawnEscortCar(step.at, step.dest);
  }
  if (game.message) game.message(`Mission ${index + 1}/12: ${mission.title}`);
  if (game.sound) game.sound('mission');
  return true;
}

export function updateMission(state, game) {
  if (!state.active || state.index < 0) return null;
  const mission = MISSIONS[state.index];
  const step = mission.steps[state.step];
  if (!step) {
    state.active = false;
    return 'done';
  }
  const dt = game.dt || 1 / 60;
  const p = game.player;
  const done = () => {
    state.step += 1;
    state.kills = 0;
    state.checkpoint = 0;
    state.timer = 0;
    state.tailTimer = 0;
    state.spawned = false;
    if (state.step >= mission.steps.length) {
      state.active = false;
      return 'done';
    }
    return null;
  };
  const fail = () => {
    state.active = false;
    if (game.message) game.message(`Mission failed: ${mission.title}`);
    return 'fail';
  };

  switch (step.type) {
    case 'goto':
    case 'talk':
    case 'pickup':
    case 'deliver':
    case 'escape':
      if (dist(p.x, p.z, step.at.x, step.at.z) < INTERACT.reach) return done();
      return null;
    case 'timed': {
      if (state.timer <= 0) state.timer = step.time || 60;
      state.timer -= dt;
      if (state.timer <= 0) return fail();
      if (dist(p.x, p.z, step.at.x, step.at.z) < INTERACT.reach) return done();
      return null;
    }
    case 'driveTo': {
      const car = game.playerCar || p;
      if (dist(car.x, car.z, step.at.x, step.at.z) < INTERACT.driveTo) return done();
      return null;
    }
    case 'stealCar':
      if (game.playerCar) return done();
      return null;
    case 'deliverCar': {
      const car = game.targetCar;
      if (dist(p.x, p.z, step.at.x, step.at.z) < INTERACT.driveTo) return done();
      if (car && dist(car.x, car.z, step.at.x, step.at.z) < INTERACT.driveTo) return done();
      return null;
    }
    case 'kill': {
      if (!state.spawned) {
        state.spawned = true;
        if (game.spawnEnemies) game.spawnEnemies(step.at, step.count, true);
      }
      if (state.kills >= step.count) return done();
      return null;
    }
    case 'race': {
      if (state.timer <= 0) state.timer = step.time || 180;
      state.timer -= dt;
      if (state.timer <= 0) return fail();
      const point = step.points[state.checkpoint];
      if (point && dist(p.x, p.z, point.x, point.z) < INTERACT.race) {
        state.checkpoint += 1;
        if (state.checkpoint >= step.points.length) return done();
      }
      return null;
    }
    case 'tail': {
      const mark = game.markCar;
      if (!mark) return null;
      const d = dist(p.x, p.z, mark.x, mark.z);
      if (d > 80) return fail();
      if (d > 8) {
        state.tailTimer += dt;
        if (state.tailTimer >= 45) return done();
      }
      return null;
    }
    case 'escort': {
      const esc = game.escortCar;
      if (!esc) return null;
      if (dist(p.x, p.z, esc.x, esc.z) > 90) return fail();
      if (dist(esc.x, esc.z, step.dest.x, step.dest.z) < 8) return done();
      return null;
    }
    default:
      return done();
  }
}
