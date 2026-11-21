// The story of Solmar Bay: Kai Reyes, a wheelman back in town, works for the fixer Mara
// Solis against the dock boss Victor Kane. Six missions, one after the other, each a list of
// steps. A step is plain data; the runner checks it against the game state the world hands
// it and reports what happened, so the story stays data and the world stays the machine.
//
// Step types:
//   goto      reach a point (on foot or in a car)      {at, radius, text}
//   driveTo   reach a point while driving              {at, radius, text}
//   stealCar  get into the marked target car           {text}
//   deliverCar drive the target car to a point         {at, radius, text}
//   pickup    pick a package up on foot                {at, radius, text}
//   kill      kill N spawned enemies                   {count, at, text}
//   escape    reach a point before the timer ends      {at, radius, seconds, text}
//   talk      meet a character at a point              {at, radius, text, line}
import { LANDMARKS } from './config.js';

export const MISSIONS = [
  {
    id: 'welcome-back',
    title: 'Welcome Back',
    giver: 'Mara Solis',
    briefing: 'Mara is waiting at Plaza del Sol. Go and say hello — then drive her car home.',
    reward: { cash: 300, rep: 10 },
    steps: [
      { type: 'talk', at: LANDMARKS.plaza, radius: 6, text: 'Meet Mara at Plaza del Sol', line: 'Mara: "Kai Reyes. Back in Solmar at last. Take my car — park it at the safehouse."' },
      { type: 'driveTo', at: LANDMARKS.home, radius: 11, text: 'Drive to the safehouse' },
    ],
  },
  {
    id: 'borrowed-wheels',
    title: 'Borrowed Wheels',
    giver: 'Mara Solis',
    briefing: 'Kane keeps a gold sedan by the casino. Borrow it — permanently — and bring it to Rosa\'s garage.',
    reward: { cash: 500, rep: 15 },
    steps: [
      { type: 'goto', at: LANDMARKS.casino, radius: 16, text: 'Find the gold sedan by the casino' },
      { type: 'stealCar', text: 'Steal the gold sedan' },
      { type: 'deliverCar', at: LANDMARKS.garage, radius: 13, text: 'Deliver the sedan to Rosa\'s garage' },
    ],
  },
  {
    id: 'the-drop',
    title: 'The Drop',
    giver: 'Mara Solis',
    briefing: 'A package waits at Warehouse 7. Pick it up and run it to the docks — and expect company.',
    reward: { cash: 800, rep: 20 },
    steps: [
      { type: 'pickup', at: LANDMARKS.warehouse, radius: 14, text: 'Pick up the package at Warehouse 7' },
      { type: 'deliver', at: LANDMARKS.docks, radius: 8, text: 'Deliver the package to the docks', wanted: 2 },
    ],
  },
  {
    id: 'dockside',
    title: 'Dockside',
    giver: 'Mara Solis',
    briefing: 'Kane\'s crew is holding the warehouse. Clear them out, then report back to Mara.',
    reward: { cash: 1200, rep: 25, unlockSmg: true },
    steps: [
      { type: 'kill', count: 4, at: LANDMARKS.warehouse, radius: 26, text: 'Clear out Kane\'s crew at the warehouse' },
      { type: 'talk', at: LANDMARKS.plaza, radius: 6, text: 'Report back to Mara', line: 'Mara: "Clean work. Take this SMG — Kane won\'t go down easy."' },
    ],
  },
  {
    id: 'the-getaway',
    title: 'The Getaway',
    giver: 'Mara Solis',
    briefing: 'The whole department is on you. Lose them and get to the safehouse before the net closes.',
    reward: { cash: 1500, rep: 30 },
    steps: [
      { type: 'escape', at: LANDMARKS.home, radius: 11, seconds: 150, wanted: 3, text: 'Lose the cops and reach the safehouse' },
    ],
  },
  {
    id: 'king-of-the-bay',
    title: 'King of the Bay',
    giver: 'Mara Solis',
    briefing: 'Kane is at the casino with his guards. End it tonight, Kai — Solmar is yours after this.',
    reward: { cash: 2500, rep: 50 },
    steps: [
      { type: 'goto', at: LANDMARKS.casino, radius: 16, text: 'Reach the casino' },
      { type: 'kill', count: 6, at: LANDMARKS.casino, radius: 30, text: 'Take down Kane and his guards', boss: true },
    ],
  },
];

/** Fresh mission progress: nothing started, nothing done. */
export function createMissionState() {
  return {
    index: 0,
    step: 0,
    active: false,
    kills: 0,
    timer: 0,
    started: false,
  };
}

/** The point the player is meant to reach right now, or null when no mission runs. */
export function currentObjective(missionState) {
  if (!missionState.active) return null;
  const mission = MISSIONS[missionState.index];
  if (!mission) return null;
  const step = mission.steps[missionState.step];
  if (!step) return null;
  return { text: step.text, at: step.at ?? null, mission: mission.title };
}

/**
 * Advance the active mission against the game state.
 * `game` is the world: {player, inCar, targetCar, enemies, time, wanted} plus helpers
 * {spawnEnemies(at, count, boss), setWanted(n), message(text), sound(name)}.
 * Returns 'step' when a step finished, 'done' when the mission finished, null otherwise.
 */
export function updateMission(missionState, game) {
  if (!missionState.active) return null;
  const mission = MISSIONS[missionState.index];
  if (!mission) return null;
  const step = mission.steps[missionState.step];
  if (!step) return null;
  const player = game.player;
  const dist = step.at ? Math.hypot(player.x - step.at.x, player.z - step.at.z) : Infinity;

  if (!missionState.started) {
    missionState.started = true;
    if (step.type === 'kill') game.spawnEnemies(step.at, step.count, step.boss ?? false);
    if (step.wanted) game.setWanted(step.wanted);
    if (step.type === 'escape') {
      missionState.timer = step.seconds;
      game.setWanted(step.wanted ?? 3);
    }
  }

  switch (step.type) {
    case 'goto':
    case 'talk':
      if (dist <= step.radius) {
        if (step.line) game.message(step.line);
        return advance(missionState, game);
      }
      break;
    case 'driveTo':
      if (game.inCar && dist <= step.radius) return advance(missionState, game);
      break;
    case 'stealCar':
      if (game.inCar && game.targetCar && game.playerCar === game.targetCar) return advance(missionState, game);
      break;
    case 'deliverCar':
      if (game.inCar && game.playerCar === game.targetCar && dist <= step.radius) {
        return advance(missionState, game);
      }
      break;
    case 'pickup':
      if (!game.inCar && dist <= step.radius) {
        game.message('Package picked up.');
        return advance(missionState, game);
      }
      break;
    case 'deliver':
      if (dist <= step.radius) return advance(missionState, game);
      break;
    case 'kill':
      if (missionState.kills >= step.count) return advance(missionState, game);
      break;
    case 'escape':
      missionState.timer -= game.dt;
      if (dist <= step.radius) return advance(missionState, game);
      if (missionState.timer <= 0) {
        game.message('Too slow — the net closed in. Try again.');
        return fail(missionState, game);
      }
      break;
    default:
      break;
  }
  return null;
}

function advance(missionState, game) {
  const mission = MISSIONS[missionState.index];
  missionState.step += 1;
  missionState.started = false;
  if (missionState.step >= mission.steps.length) {
    missionState.active = false;
    missionState.step = 0;
    game.sound('missionDone');
    game.message(`Mission complete: ${mission.title} — $${mission.reward.cash}, +${mission.reward.rep} rep`);
    return 'done';
  }
  const next = mission.steps[missionState.step];
  if (next) game.message(next.text);
  return 'step';
}

function fail(missionState, game) {
  missionState.active = false;
  missionState.step = 0;
  missionState.started = false;
  missionState.kills = 0;
  return 'fail';
}

/** Start the next mission. Returns false when the story is finished. */
export function startMission(missionState, index, game) {
  const mission = MISSIONS[index];
  if (!mission) return false;
  missionState.index = index;
  missionState.step = 0;
  missionState.active = true;
  missionState.started = false;
  missionState.kills = 0;
  game.message(`${mission.title} — ${mission.briefing}`);
  return true;
}
