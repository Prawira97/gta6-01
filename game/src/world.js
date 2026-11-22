// Solmar Bay — the world: state, the tick, and the wiring between systems.
// Pure logic (no DOM, no THREE): the sim runs this file in Node, the browser
// renders it. Everything random flows through the world's seeded RNG, so the
// same seed + the same inputs always produce the same world.
import { PLAYER, CAR, WANTED, REWARDS, PLACES, GRID, INTERACT } from './config.js';
import { makeRng, dist, clamp, dirX, dirZ } from './random.js';
import { buildCity } from './city.js';
import { MISSIONS, createMissionState, resetMissionState, startMission, updateMission, currentObjective } from './missions.js';
import { updateActivities, startStreetRace, startCourier } from './activities.js';
import { spawnPeds, updatePeds } from './people.js';
import { updatePolice } from './police.js';
import { makeCar, updatePlayerCar, updateNpcCar, gridPath, followRoute } from './vehicles.js';
import { fireWeapon, updateEnemies } from './combat.js';
import { updateParticles, spawnSmoke } from './effects.js';
import { loadSave, saveGame } from './save.js';

export function createWorld(opts = {}) {
  const seed = opts.seed ?? 1;
  const shot = !!opts.shot;
  const rng = makeRng(seed);
  const city = buildCity(seed);

  const world = {
    seed,
    shot,
    rng,
    city,
    time: 0,
    dayTime: 8,
    dt: 1 / 60,
    cash: 200,
    rep: 0,
    missionIndex: 0,
    mission: createMissionState(),
    hasSmg: false,
    courierDone: 0,
    packagesCollected: 0,
    player: { x: 0, z: 20, hp: PLAYER.hp, heading: 0 },
    wanted: { level: 0, since: 0 },
    cars: [],
    peds: [],
    cops: [],
    policeCars: [],
    enemies: [],
    particles: [],
    collectibles: [],
    activities: {
      race: { state: 'idle', points: [], idx: 0, t: 0, best: null },
      courier: { state: 'idle', drops: [], idx: 0 },
    },
    roadblock: { active: false, cars: [] },
    playerCar: null,
    targetCar: null,
    markCar: null,
    escortCar: null,
    inCar: false,
    camYaw: 0,
    camPitch: 0,
    zoom: 0,
    combatCooldown: 0,
    endState: null,
    messageLog: [],
    lastMessage: '',
    audio: null,
  };

  // Traffic and parked cars, all on roads.
  for (let i = 0; i < 14; i += 1) {
    const road = rng.pick(city.roads);
    const along = rng.range(GRID.min + 10, GRID.max - 10);
    const vertical = rng.chance(0.5);
    const car = makeCar(rng, {
      x: vertical ? road : along,
      z: vertical ? along : road,
      heading: rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]),
      kind: rng.chance(0.15) ? 'taxi' : 'sedan',
      driver: i < 4 ? 'npc' : null,
    });
    world.cars.push(car);
  }

  world.peds = spawnPeds(world);

  // 20 hidden packages on sidewalks and plazas.
  for (let i = 0; i < 20; i += 1) {
    const road = rng.pick(city.roads);
    const along = rng.range(GRID.min + 10, GRID.max - 10);
    const vertical = rng.chance(0.5);
    world.collectibles.push({
      x: vertical ? road + 6 : along,
      z: vertical ? along : road + 6,
      taken: false,
    });
  }

  // Methods the mission module and the sim call on the world itself.
  world.message = (text) => {
    world.lastMessage = text;
    world.messageLog.push(text);
    if (world.messageLog.length > 5) world.messageLog.shift();
  };
  world.sound = (name) => {
    if (world.audio) world.audio(name);
  };
  world.setWanted = (n) => {
    world.wanted.level = clamp(Math.round(n), 0, WANTED.max);
    world.wanted.since = world.time;
  };
  world.respawn = (state) => {
    world.player.x = PLACES.hospital.x;
    world.player.z = PLACES.hospital.z;
    world.player.hp = PLAYER.hp;
    world.playerCar = null;
    world.inCar = false;
    world.wanted.level = 0;
    world.endState = null;
    if (state === 'busted') world.cash = Math.max(0, world.cash - 100);
    world.message(state === 'busted' ? 'Busted! -$100 bail.' : 'Wasted! Back on your feet.');
  };
  world.spawnEnemies = (at, count, armed) => spawnEnemies(world, at, count, armed);
  world.spawnMarkCar = (at) => {
    const car = makeCar(rng, { x: at.x, z: at.z, heading: 0, kind: 'mark', color: 0x222226, driver: 'mark' });
    car.route = null;
    car.nodeIndex = 0;
    world.markCar = car;
    world.cars.push(car);
    return car;
  };
  world.spawnEscortCar = (at, dest) => {
    const car = makeCar(rng, { x: at.x, z: at.z, heading: 0, kind: 'truck', color: 0x8a5a2e, driver: 'escort' });
    car.route = gridPath(at, dest);
    car.nodeIndex = 0;
    world.escortCar = car;
    world.cars.push(car);
    return car;
  };
  world.objective = () => currentObjective(world.mission);

  // A saved game resumes where it left off (never in shot mode).
  if (!shot) {
    try {
      const save = loadSave();
      if (save) {
        world.cash = save.cash ?? world.cash;
        world.rep = save.rep ?? 0;
        world.missionIndex = save.missionIndex ?? 0;
        world.hasSmg = !!save.hasSmg;
        world.activities.race.best = save.raceBest ?? null;
        world.packagesCollected = save.packages ?? 0;
      }
    } catch {
      // A corrupt save never blocks the game; a fresh start is fine.
    }
  }
  return world;
}

export function spawnEnemies(world, at, count, armed) {
  const made = [];
  for (let i = 0; i < count; i += 1) {
    const enemy = {
      x: at.x + world.rng.range(-6, 6),
      z: at.z + world.rng.range(-6, 6),
      hp: 100,
      armed: !!armed,
      shootTimer: 1 + world.rng.next(),
    };
    world.enemies.push(enemy);
    made.push(enemy);
  }
  return made;
}

function enterOrExitCar(world) {
  if (world.playerCar) {
    world.playerCar.driver = null;
    world.playerCar = null;
    world.inCar = false;
    return;
  }
  let best = null;
  let bestD = PLAYER.enterCarRadius;
  for (const car of world.cars) {
    if (car.driver) continue;
    const d = dist(world.player.x, world.player.z, car.x, car.z);
    if (d < bestD) {
      best = car;
      bestD = d;
    }
  }
  if (best) {
    best.driver = 'player';
    world.playerCar = best;
    world.inCar = true;
    world.sound('door');
  }
}

function stepPlayer(world, input, dt) {
  const mv = input.move();
  if (world.playerCar) {
    updatePlayerCar(world.playerCar, input, dt);
    world.player.x = world.playerCar.x;
    world.player.z = world.playerCar.z;
    world.player.heading = world.playerCar.heading;
    return;
  }
  const speed = input.sprint() ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  const fx = dirX(world.camYaw);
  const fz = dirZ(world.camYaw);
  const rx = Math.sin(world.camYaw);
  const rz = Math.cos(world.camYaw);
  world.player.x += (fx * mv.y + rx * mv.x) * speed * dt;
  world.player.z += (fz * mv.y + rz * mv.x) * speed * dt;
  world.player.x = clamp(world.player.x, GRID.min, GRID.max);
  world.player.z = clamp(world.player.z, GRID.min, GRID.max);
  world.player.heading = world.camYaw;
}

export function stepWorld(world, input, dt, renderer) {
  world.dt = dt;
  world.time += dt;
  // The day cycles with play time — except in shot mode, where the staged
  // time of day must survive the fixed staging steps.
  if (!world.shot) world.dayTime = (8 + world.time / 20) % 24;
  if (world.combatCooldown > 0) world.combatCooldown -= dt;

  // Camera look and zoom from the input.
  const look = input.takeLook();
  world.camYaw -= look.x * 0.005;
  world.camPitch = clamp(world.camPitch + look.y * 0.003, -0.6, 0.5);
  world.zoom = clamp(world.zoom + input.takeZoom() * 0.1, 0, 1);

  // Missions: start the next one, or advance / finish / fail the active one.
  if (world.missionIndex < MISSIONS.length) {
    if (!world.mission.active) {
      startMission(world.mission, world.missionIndex, world);
    } else {
      const result = updateMission(world.mission, world);
      if (result === 'done') {
        const done = MISSIONS[world.missionIndex];
        world.cash += done.reward.cash;
        world.rep += done.reward.rep;
        if (world.missionIndex === 4) {
          world.hasSmg = true;
          world.message('SMG unlocked!');
        }
        world.message(`Mission complete: ${done.title} +$${done.reward.cash}`);
        world.sound('win');
        world.missionIndex += 1;
        resetMissionState(world.mission);
        if (!world.shot) {
          try {
            saveGame(world);
          } catch {
            // Saving is best-effort; the game goes on without it.
          }
        }
      } else if (result === 'fail') {
        resetMissionState(world.mission);
      }
    }
  }

  // The target car for a steal / deliver step: a parked sedan, picked once.
  const step = world.mission.active ? MISSIONS[world.mission.index].steps[world.mission.step] : null;
  if (step && (step.type === 'stealCar' || step.type === 'deliverCar')) {
    if (!world.targetCar) {
      world.targetCar = world.cars.find((c) => c.kind === 'sedan' && c.driver === null) || world.cars[0];
    }
  } else if (world.targetCar && world.missionIndex < MISSIONS.length) {
    world.targetCar = null;
  }

  // Actions (E): enter/exit a car, start an activity, repair at the garage.
  const actions = input.takeActions();
  for (let i = 0; i < actions; i += 1) {
    if (world.playerCar) {
      const g = PLACES.garage;
      if (dist(world.playerCar.x, world.playerCar.z, g.x, g.z) < 12 && world.playerCar.damage > 0 && world.cash >= 50) {
        world.playerCar.damage = 0;
        world.cash -= 50;
        world.message('Car repaired -$50');
        continue;
      }
    }
    if (!world.playerCar) {
      if (dist(world.player.x, world.player.z, PLACES.stadium.x, PLACES.stadium.z) < 20) {
        startStreetRace(world);
        continue;
      }
      if (dist(world.player.x, world.player.z, PLACES.market.x, PLACES.market.z) < 20) {
        startCourier(world);
        continue;
      }
    }
    enterOrExitCar(world);
  }

  stepPlayer(world, input, dt);

  // Traffic, the mark and the escort truck.
  for (const car of world.cars) {
    if (car.driver === 'npc') updateNpcCar(car, dt, world.rng);
    else if (car.driver === 'mark') {
      if (!car.route) {
        const tail = step && step.type === 'tail' ? step : null;
        if (tail) car.route = gridPath({ x: car.x, z: car.z }, tail.dest);
      }
      if (car.route) followRoute(car, dt);
    } else if (car.driver === 'escort') {
      followRoute(car, dt);
    }
  }

  if (input.attackHeld()) fireWeapon(world, input);

  updatePeds(world, dt);
  updatePolice(world, dt);
  updateEnemies(world, dt);
  updateParticles(world, dt);
  updateActivities(world, dt);

  // Hidden packages: walk over one to collect it.
  for (const pack of world.collectibles) {
    if (!pack.taken && dist(world.player.x, world.player.z, pack.x, pack.z) < INTERACT.pickup) {
      pack.taken = true;
      world.packagesCollected += 1;
      world.cash += REWARDS.package;
      world.message(`Hidden package ${world.packagesCollected}/20 +$${REWARDS.package}`);
      world.sound('pickup');
    }
  }

  // Wanted cools off after 30 quiet seconds.
  if (world.wanted.level > 0 && world.time - world.wanted.since > 30) {
    world.wanted.level -= 1;
    world.wanted.since = world.time;
  }

  // Car damage smoke.
  if (world.playerCar && world.playerCar.damage > 50 && world.rng.chance(dt * 8)) {
    spawnSmoke(world, world.playerCar.x, 1.5, world.playerCar.z);
  }

  if (world.player.hp <= 0 && !world.endState) world.endState = 'wasted';
}
