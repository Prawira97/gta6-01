// Solmar Bay — the 12 story missions. A mission is a list of steps; the
// world drives them through startMission / updateMission, and the tests
// drive them with a fake game object. Step types:
//   goto / talk / pickup / deliver / escape — reach step.at (radius)
//   driveTo — drive to step.at while in a car
//   timed — reach step.at within step.limit seconds, else fail
//   stealCar — get into game.targetCar (the world spawns it at step.at)
//   deliverCar — drive game.targetCar to step.at
//   kill — kill step.count enemies (state.kills is set by combat)
//   race — hit every point in step.points within step.limit seconds
//   tail — follow game.markCar (spawned at step.markAt) for step.duration
//          seconds without letting it get past step.maxDist away
//   escort — game.escortCar (spawned at step.escortAt) must reach step.dest
// Rewards sum to cash 5700 and rep 150 across the twelve.
import { LOCATIONS, MISSION, RACE } from './config.js';

export const MISSION_COUNT = 12;

const at = (loc) => ({ x: loc.x, z: loc.z });

export const MISSIONS = [
  {
    id: 'welcome-back', title: 'Welcome Back', giver: 'Mara',
    brief: 'Kai is home after five years. Mara is waiting at the plaza.',
    reward: { cash: 300, rep: 8 },
    steps: [
      { type: 'goto', at: at(LOCATIONS.plaza), text: 'Meet Mara at the plaza' },
      { type: 'talk', at: at(LOCATIONS.plaza), text: 'Talk to Mara' },
    ],
  },
  {
    id: 'first-wheels', title: 'First Wheels', giver: 'Mara',
    brief: 'You need wheels. Borrow the coupe on Solmar Avenue, no questions asked.',
    reward: { cash: 350, rep: 10 },
    steps: [
      { type: 'stealCar', at: { x: 56, z: 0 }, text: 'Take the coupe on Solmar Avenue' },
      { type: 'deliverCar', at: at(LOCATIONS.garage), text: 'Bring it to Rosa\u2019s Garage' },
    ],
  },
  {
    id: 'hot-package', title: 'Hot Package', giver: 'Rosa',
    brief: 'A package at the market needs to reach the docks. Fast and quiet.',
    reward: { cash: 400, rep: 10 },
    steps: [
      { type: 'pickup', at: at(LOCATIONS.market), text: 'Pick up the package at Mercado del Sol' },
      { type: 'deliver', at: at(LOCATIONS.docks), text: 'Deliver it to the docks' },
    ],
  },
  {
    id: 'street-sweeper', title: 'Street Sweeper', giver: 'Mara',
    brief: 'Kane\u2019s crew is leaning on the shops. Clear them out, then vanish.',
    reward: { cash: 400, rep: 12 },
    steps: [
      { type: 'kill', at: { x: 112, z: 56 }, count: 3, text: 'Deal with Kane\u2019s crew' },
      { type: 'escape', at: at(LOCATIONS.plaza), text: 'Lose the heat at the plaza' },
    ],
  },
  {
    id: 'the-drop', title: 'The Drop', giver: 'Rosa',
    brief: 'Drive to the casino, then get the drop to the docks before the clock dies.',
    reward: { cash: 450, rep: 12 },
    steps: [
      { type: 'driveTo', at: at(LOCATIONS.casino), text: 'Drive to the casino' },
      { type: 'timed', at: at(LOCATIONS.docks), limit: 90, text: 'Get the drop to the docks — fast' },
    ],
  },
  {
    id: 'payback', title: 'Payback', giver: 'Mara',
    brief: 'They hit Rosa\u2019s shop. Hit them back, then bring the take home.',
    reward: { cash: 450, rep: 12 },
    steps: [
      { type: 'kill', at: { x: 168, z: -112 }, count: 4, text: 'Take out the crew on the north side' },
      { type: 'deliver', at: at(LOCATIONS.garage), text: 'Bring the take to Rosa\u2019s Garage' },
    ],
  },
  {
    id: 'night-run', title: 'Night Run', giver: 'Mara',
    brief: 'A pickup at the docks, then the casino before the hour turns.',
    reward: { cash: 500, rep: 13 },
    steps: [
      { type: 'pickup', at: at(LOCATIONS.docks), text: 'Pick up the case at the docks' },
      { type: 'timed', at: at(LOCATIONS.casino), limit: 75, text: 'Reach the casino before time runs out' },
    ],
  },
  {
    id: 'tail-the-lieutenant', title: 'Tail the Lieutenant', giver: 'Mara',
    brief: 'Kane\u2019s lieutenant is moving. Follow him from the casino — don\u2019t be seen, don\u2019t lose him.',
    reward: { cash: 500, rep: 13 },
    steps: [
      { type: 'goto', at: at(LOCATIONS.casino), text: 'Wait by the casino' },
      { type: 'tail', markAt: at(LOCATIONS.casino), duration: 18, maxDist: 55, text: 'Tail the lieutenant' },
    ],
  },
  {
    id: 'street-king', title: 'Street King', giver: 'Rosa',
    brief: 'The stadium crowd wants a champion. Five checkpoints, ninety seconds.',
    reward: { cash: 500, rep: 13 },
    steps: [
      { type: 'race', points: RACE.points, limit: 90, text: 'Win the street race' },
    ],
  },
  {
    id: 'rosas-convoy', title: 'Rosa\u2019s Convoy', giver: 'Rosa',
    brief: 'Rosa\u2019s truck has to reach the docks in one piece. Stay with it.',
    reward: { cash: 550, rep: 14 },
    steps: [
      { type: 'escort', escortAt: at(LOCATIONS.market), dest: at(LOCATIONS.docks), text: 'Escort Rosa\u2019s truck to the docks' },
    ],
  },
  {
    id: 'payback-at-the-docks', title: 'Payback at the Docks', giver: 'Mara',
    brief: 'Kane\u2019s men hold the docks. Take the pier back, then get clear.',
    reward: { cash: 600, rep: 15 },
    steps: [
      { type: 'driveTo', at: at(LOCATIONS.docks), text: 'Drive to the docks' },
      { type: 'kill', at: at(LOCATIONS.docks), count: 5, text: 'Clear the docks' },
      { type: 'escape', at: at(LOCATIONS.garage), text: 'Get clear — back to the garage' },
    ],
  },
  {
    id: 'kanes-vault', title: 'Kane\u2019s Vault', giver: 'Mara',
    brief: 'Everything leads here. Kane\u2019s vault, his guards, his car — take it all.',
    reward: { cash: 700, rep: 18 },
    steps: [
      { type: 'goto', at: at(LOCATIONS.vault), text: 'Reach Kane\u2019s Vault' },
      // The guards muster on the vault forecourt, west of the vault
      // building itself, so they are never spawned inside it.
      { type: 'kill', at: { x: 160, z: -168 }, count: 6, text: 'Take down the vault guards' },
      { type: 'stealCar', at: { x: 160, z: -168 }, text: 'Take Kane\u2019s car' },
      { type: 'deliverCar', at: at(LOCATIONS.docks), text: 'Drive it to the docks' },
    ],
  },
];

export function createMissionState() {
  return {
    active: false,
    index: 0,
    step: 0,
    checkpoint: 0,
    kills: 0,
    elapsed: 0,
    enteredStep: -1,
  };
}

export function startMission(state, index, game) {
  const mission = MISSIONS[index];
  if (!mission) return false;
  state.index = index;
  state.step = 0;
  state.checkpoint = 0;
  state.kills = 0;
  state.elapsed = 0;
  state.enteredStep = -1;
  state.active = true;
  if (game && game.message) {
    game.message(`${mission.title} — ${mission.brief}`);
  }
  return true;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

// Advance to the next step. Returns 'done' when the mission is over.
function advance(state, game) {
  state.step += 1;
  state.elapsed = 0;
  state.checkpoint = 0;
  const mission = MISSIONS[state.index];
  if (state.step >= mission.steps.length) {
    state.active = false;
    return 'done';
  }
  const next = mission.steps[state.step];
  if (game && game.message && next.text) game.message(next.text);
  return null;
}

// One update. Returns 'done', 'fail', or null (still running).
export function updateMission(state, game) {
  if (!state.active) return null;
  const mission = MISSIONS[state.index];
  if (!mission) return null;
  const step = mission.steps[state.step];
  if (!step) {
    state.active = false;
    return 'done';
  }
  const dt = (game && game.dt) || 1 / 60;

  // Step entry: spawn what this step needs, once.
  if (state.enteredStep !== state.step) {
    state.enteredStep = state.step;
    state.elapsed = 0;
    state.checkpoint = 0;
    if (step.type === 'tail' && game.spawnMarkCar) {
      game.spawnMarkCar(step.markAt || step.at);
    } else if (step.type === 'escort' && game.spawnEscortCar) {
      game.spawnEscortCar(step.escortAt || step.at);
    } else if (step.type === 'kill' && game.spawnEnemies) {
      game.spawnEnemies(step.at, step.count);
    }
    if (game.message && step.text) game.message(step.text);
  }

  const fail = () => {
    state.active = false;
    return 'fail';
  };

  switch (step.type) {
    case 'goto':
    case 'talk':
    case 'pickup':
    case 'deliver':
    case 'escape':
      if (dist(game.player, step.at) < MISSION.radius) return advance(state, game);
      return null;
    case 'driveTo':
      if (game.inCar && dist(game.player, step.at) < MISSION.radius) return advance(state, game);
      return null;
    case 'timed':
      state.elapsed += dt;
      if (dist(game.player, step.at) < MISSION.radius) return advance(state, game);
      if (state.elapsed > step.limit) return fail();
      return null;
    case 'stealCar':
      if (game.inCar && game.playerCar && game.playerCar === game.targetCar) return advance(state, game);
      return null;
    case 'deliverCar':
      if (game.inCar && game.playerCar === game.targetCar && dist(game.player, step.at) < MISSION.radius) {
        return advance(state, game);
      }
      return null;
    case 'kill':
      if (state.kills >= step.count) return advance(state, game);
      return null;
    case 'race': {
      state.elapsed += dt;
      const point = step.points[state.checkpoint];
      if (point && dist(game.player, point) < MISSION.raceRadius) {
        state.checkpoint += 1;
        if (state.checkpoint >= step.points.length) return advance(state, game);
        return null;
      }
      if (state.elapsed > step.limit) return fail();
      return null;
    }
    case 'tail': {
      if (!game.markCar) return null;
      const d = dist(game.player, game.markCar);
      if (d > step.maxDist) return fail();
      state.elapsed += dt;
      if (state.elapsed >= step.duration) return advance(state, game);
      return null;
    }
    case 'escort': {
      if (!game.escortCar) return null;
      if (dist(game.escortCar, step.dest) < MISSION.radius) return advance(state, game);
      return null;
    }
    default:
      return null;
  }
}
