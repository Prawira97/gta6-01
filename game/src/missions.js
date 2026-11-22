// The story of Solmar Bay: Kai Reyes, a wheelman back in town, works for the fixer Mara
// Solis — and for the mechanic Rosa — against the dock boss Victor Kane. Twelve missions,
// one after the other, each a list of steps. A step is plain data; the runner checks it
// against the game state the world hands it and reports what happened, so the story stays
// data and the world stays the machine.
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
//   timed     reach a point before the timer ends      {at, radius, seconds, text, wanted?}
//   tail      follow a moving mark car, unseen         {at, radius, seconds, tooClose, tooFar, text}
//   race      hit checkpoints in order, beat the clock {points, seconds, text}
//   escort    stay with a friendly car to its stop    {at, dest, radius, text, guards}
import { LANDMARKS, RACE } from './config.js';

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
  {
    id: 'night-run',
    title: 'Night Run',
    giver: 'Mara Solis',
    briefing: 'A crate came in at the docks after dark. Pick it up and run it to the casino in two and a half minutes — the PD is already sniffing around.',
    reward: { cash: 700, rep: 20 },
    steps: [
      { type: 'pickup', at: LANDMARKS.docks, radius: 14, text: 'Pick up the crate at the docks' },
      { type: 'timed', at: LANDMARKS.casino, radius: 13, seconds: 150, wanted: 1, text: 'Deliver the crate to the casino — fast' },
    ],
  },
  {
    id: 'tail-the-lieutenant',
    title: 'Tail the Lieutenant',
    giver: 'Mara Solis',
    briefing: 'Kane\'s lieutenant drives from the casino to the warehouse every night. Follow him in your car — close enough to see, far enough not to be seen.',
    reward: { cash: 900, rep: 22 },
    steps: [
      { type: 'goto', at: LANDMARKS.casino, radius: 16, text: 'Wait by the casino for the lieutenant' },
      { type: 'tail', at: LANDMARKS.casino, radius: 10, seconds: 25, tooClose: 8, tooFar: 45, text: 'Tail the lieutenant — stay in the 8–45 m band' },
      { type: 'goto', at: LANDMARKS.warehouse, radius: 16, text: 'See where he goes — Warehouse 7' },
    ],
  },
  {
    id: 'street-king',
    title: 'Street King',
    giver: 'Rosa',
    briefing: 'Rosa set up a street race across the whole city — five checkpoints, two minutes. Beat the clock and the bay will know your name.',
    reward: { cash: 1100, rep: 25 },
    steps: [
      { type: 'race', points: RACE.points, seconds: 120, text: 'Race the checkpoints — beat the clock' },
    ],
  },
  {
    id: 'rosas-convoy',
    title: "Rosa's Convoy",
    giver: 'Rosa',
    briefing: 'Rosa\'s tow truck is hauling a "borrowed" engine to the docks and Kane\'s boys want it back. Stay with the truck until it docks.',
    reward: { cash: 1300, rep: 28 },
    steps: [
      { type: 'escort', at: LANDMARKS.garage, dest: LANDMARKS.docks, radius: 24, guards: 2, text: 'Escort Rosa\'s truck to the docks' },
    ],
  },
  {
    id: 'payback-at-the-docks',
    title: 'Payback at the Docks',
    giver: 'Mara Solis',
    briefing: 'Kane\'s crew moved the money to the docks. Take it back — clear the guards, grab the cash, bring it home.',
    reward: { cash: 1600, rep: 32 },
    steps: [
      { type: 'kill', count: 5, at: LANDMARKS.docks, radius: 30, text: 'Clear the guards at the docks' },
      { type: 'pickup', at: LANDMARKS.docks, radius: 10, text: 'Grab the cash' },
      { type: 'deliver', at: LANDMARKS.home, radius: 11, text: 'Bring the cash to the safehouse' },
    ],
  },
  {
    id: 'kanes-vault',
    title: "Kane's Vault",
    giver: 'Mara Solis',
    briefing: 'Rico, Kane\'s right hand, is guarding the casino vault tonight. End it, take the vault cash, and lose the whole department on the way home.',
    reward: { cash: 3000, rep: 60 },
    steps: [
      { type: 'goto', at: LANDMARKS.casino, radius: 16, text: 'Reach the casino' },
      { type: 'kill', count: 6, at: LANDMARKS.casino, radius: 30, text: 'Take down Rico and his guards', boss: true },
      { type: 'pickup', at: LANDMARKS.casino, radius: 10, text: 'Empty the vault' },
      { type: 'escape', at: LANDMARKS.home, radius: 11, seconds: 150, wanted: 4, text: 'Lose the cops and reach the safehouse' },
    ],
  },
];

/** How many story missions the game has (the world and the HUD read this, never a literal). */
export const MISSION_COUNT = MISSIONS.length;

/** Fresh mission progress: nothing started, nothing done. */
export function createMissionState() {
  return {
    index: 0,
    step: 0,
    active: false,
    kills: 0,
    timer: 0,
    started: false,
    checkpoint: 0,
    tailTime: 0,
    lostTime: 0,
    warned: false,
  };
}

/** The point the player is meant to reach right now, or null when no mission runs. */
export function currentObjective(missionState) {
  if (!missionState.active) return null;
  const mission = MISSIONS[missionState.index];
  if (!mission) return null;
  const step = mission.steps[missionState.step];
  if (!step) return null;
  if (step.type === 'race') {
    const point = step.points[missionState.checkpoint ?? 0];
    if (!point) return null;
    return {
      text: `Race checkpoint ${(missionState.checkpoint ?? 0) + 1}/${step.points.length}`,
      at: point,
      mission: mission.title,
    };
  }
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
    if (step.type === 'timed') {
      missionState.timer = step.seconds;
      if (step.wanted) game.setWanted(step.wanted);
    }
    if (step.type === 'race') {
      missionState.checkpoint = 0;
      missionState.timer = step.seconds;
    }
    if (step.type === 'tail') {
      game.spawnMarkCar(step.at);
      missionState.tailTime = 0;
      missionState.lostTime = 0;
      missionState.warned = false;
    }
    if (step.type === 'escort') {
      game.spawnEscortCar(step.at, step.dest);
      if (step.guards) game.spawnEnemies(step.at, step.guards, false);
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
    case 'timed':
      missionState.timer -= game.dt;
      if (dist <= step.radius) return advance(missionState, game);
      if (missionState.timer <= 0) {
        game.message('Too slow — the drop went cold. Try again.');
        return fail(missionState, game);
      }
      break;
    case 'race': {
      missionState.timer -= game.dt;
      const point = step.points[missionState.checkpoint ?? 0];
      if (!point) return advance(missionState, game);
      const d = Math.hypot(player.x - point.x, player.z - point.z);
      if (d <= (step.checkpointRadius ?? 12)) {
        missionState.checkpoint += 1;
        if (missionState.checkpoint >= step.points.length) return advance(missionState, game);
        game.message(`Checkpoint ${missionState.checkpoint}/${step.points.length}`);
      }
      if (missionState.timer <= 0) {
        game.message('Out of time — the race is lost. Try again.');
        return fail(missionState, game);
      }
      break;
    }
    case 'tail': {
      const mark = game.markCar;
      if (!mark) return fail(missionState, game);
      const d = Math.hypot(player.x - mark.x, player.z - mark.z);
      const tooClose = step.tooClose ?? 8;
      const tooFar = step.tooFar ?? 45;
      if (d < tooClose) {
        missionState.lostTime = 0;
        if (!missionState.warned) {
          missionState.warned = true;
          game.message('Too close — back off!');
        }
      } else if (d <= tooFar) {
        missionState.warned = false;
        missionState.tailTime += game.dt;
        missionState.lostTime = 0;
      } else {
        missionState.warned = false;
        missionState.lostTime += game.dt;
        if (missionState.lostTime > 5) {
          game.message('You lost the mark. Try again.');
          return fail(missionState, game);
        }
      }
      if (missionState.tailTime >= step.seconds) return advance(missionState, game);
      break;
    }
    case 'escort': {
      const esc = game.escortCar;
      if (!esc) return fail(missionState, game);
      const dDest = Math.hypot(esc.x - step.dest.x, esc.z - step.dest.z);
      const dPlayer = Math.hypot(player.x - esc.x, player.z - esc.z);
      if (dDest <= step.radius) {
        if (dPlayer <= 35) return advance(missionState, game);
        game.message('The truck is waiting — get close to it.');
      }
      break;
    }
    default:
      break;
  }
  return null;
}

function advance(missionState, game) {
  const mission = MISSIONS[missionState.index];
  missionState.step += 1;
  missionState.started = false;
  // A finished timed/race step leaves a stale timer behind; clear it so the HUD
  // never shows the old countdown on the next step.
  missionState.timer = 0;
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
  missionState.checkpoint = 0;
  missionState.tailTime = 0;
  missionState.lostTime = 0;
  missionState.warned = false;
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
  missionState.checkpoint = 0;
  missionState.tailTime = 0;
  missionState.lostTime = 0;
  missionState.warned = false;
  game.message(`${mission.title} — ${mission.briefing}`);
  return true;
}
