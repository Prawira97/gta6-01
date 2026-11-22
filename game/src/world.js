// Solmar Bay — the world: one step function drives everything (clock,
// player, cars, missions, activities, police, peds, enemies, particles).
// The sim drives it headless; the browser drives it from main.js. In shot
// mode the clock never advances, so a staged frame is identical every run.
import { createRng } from './random.js';
import { buildCity, gridPath, nearestStreet } from './city.js';
import { MISSIONS, createMissionState, startMission, updateMission } from './missions.js';
import { updateActivities, startStreetRace, startCourier } from './activities.js';
import { spawnEnemies, fireWeapon, updateEnemies } from './combat.js';
import { updateParticles } from './effects.js';
import { createPeds, updatePeds, followPath } from './people.js';
import { setWanted, updatePolice } from './police.js';
import { createCars, makeCar, driveCar, updateTraffic, crashCar, tryRepair } from './vehicles.js';
import { saveGame } from './save.js';
import { COLLECTIBLE, TIME_SCALE, WORLD, LOCATIONS } from './config.js';
import { ACTION_INTERACT } from './input.js';

export { spawnEnemies };

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// Push an entity (player or car) out of every building it overlaps.
// Returns true when a collision happened.
function resolveBuildings(world, e, radius) {
  let hit = false;
  for (const b of world.city.buildings) {
    const dx = e.x - b.x;
    const dz = e.z - b.z;
    const ox = b.w / 2 + radius - Math.abs(dx);
    const oz = b.d / 2 + radius - Math.abs(dz);
    if (ox > 0 && oz > 0) {
      hit = true;
      if (ox < oz) e.x = b.x + Math.sign(dx || 1) * (b.w / 2 + radius);
      else e.z = b.z + Math.sign(dz || 1) * (b.d / 2 + radius);
    }
  }
  return hit;
}

export function createWorld(opts = {}) {
  const seed = opts.seed ?? 1;
  const rng = createRng(seed);
  const world = {
    seed,
    shot: !!opts.shot,
    rng,
    time: 8,
    city: null,
    player: { x: 0, z: 0, heading: 0, hp: 100 },
    cars: [],
    peds: [],
    cops: [],
    enemies: [],
    particles: [],
    policeCars: [],
    roadblock: { active: false, cars: [] },
    collectibles: [],
    mission: createMissionState(),
    missionIndex: 0,
    cash: 0,
    rep: 0,
    hasSmg: false,
    courierDone: 0,
    wanted: { level: 0, timer: 0 },
    camYaw: 0,
    camPitch: 0.35,
    camDist: 9,
    playerCar: null,
    targetCar: null,
    markCar: null,
    escortCar: null,
    inCar: false,
    weaponCooldown: 0,
    endState: null,
    lowHpWarned: false,
    spawnTimer: 0,
    dt: 1 / 60,
    toastText: '',
    toastAt: 0,
    activities: {
      race: { state: 'idle', points: [], idx: 0, elapsed: 0, best: null, limit: 120 },
      courier: { state: 'idle', drops: [], idx: 0 },
    },
    message(text) {
      world.toastText = text;
      world.toastAt = Date.now();
    },
    sound() {},
    setWanted(level) {
      setWanted(world, level);
    },
    spawnEnemies(at, count) {
      return spawnEnemies(world, at, count);
    },
    spawnMarkCar(at) {
      const car = makeCar(world, at.x, at.z, 'sedan', 'mark');
      car.speed = 7;
      car.route = null;
      car.routeIndex = 0;
      world.markCar = car;
      return car;
    },
    spawnEscortCar(at) {
      const step = MISSIONS[world.mission.index]
        ? MISSIONS[world.mission.index].steps[world.mission.step]
        : null;
      const dest = step && step.dest ? step.dest : at;
      const car = makeCar(world, at.x, at.z, 'sedan', 'escort');
      car.speed = 10;
      car.route = gridPath({ x: at.x, z: at.z }, { x: dest.x, z: dest.z });
      car.routeIndex = 0;
      world.escortCar = car;
      return car;
    },
    respawn(state) {
      world.endState = null;
      world.player.hp = 100;
      world.player.x = 0;
      world.player.z = 0;
      if (world.playerCar) {
        world.playerCar.driver = null;
        world.playerCar = null;
      }
      world.inCar = false;
      world.setWanted(0);
      world.message(state === 'busted' ? 'Busted — back on the street.' : 'Wasted — back on your feet.');
    },
  };

  world.city = buildCity(rng);
  world.cars = createCars(world);
  world.peds = createPeds(world, 24);
  // 20 hidden packages, on the streets where the player can reach them.
  for (let i = 0; i < 20; i += 1) {
    const alongX = rng.chance(0.5);
    const street = rng.pick(WORLD.STREETS);
    const along = rng.float(-224, 224);
    world.collectibles.push({
      x: alongX ? along : street + rng.float(-2, 2),
      z: alongX ? street + rng.float(-2, 2) : along,
      taken: false,
    });
  }
  return world;
}

export function stepWorld(world, input, dt, audio) {
  world.dt = dt;
  if (!world.shot) {
    world.time = (world.time + (dt * TIME_SCALE) / 3600) % 24;
  }

  // Camera: mouse look and wheel zoom.
  const look = input.takeLook();
  world.camYaw += look.x * 0.0025;
  world.camPitch = clamp(world.camPitch + look.y * 0.002, 0.05, 1.0);
  world.camDist = clamp(world.camDist + input.takeZoom() * 0.01, 5, 16);

  // Interact: enter/exit a car, or start the race / courier at its spot.
  const actions = input.takeActions();
  if (actions & ACTION_INTERACT) {
    if (world.playerCar) {
      world.playerCar.driver = null;
      world.playerCar = null;
      world.inCar = false;
    } else {
      let best = null;
      let bestD = 4;
      for (const car of world.cars) {
        if (car.driver) continue;
        const d = Math.hypot(car.x - world.player.x, car.z - world.player.z);
        if (d < bestD) {
          bestD = d;
          best = car;
        }
      }
      if (best) {
        best.driver = 'player';
        world.playerCar = best;
        world.inCar = true;
        world.message(best.kind === 'taxi' ? 'Taxi — yours now.' : 'In the car.');
      } else if (Math.hypot(world.player.x - LOCATIONS.stadium.x, world.player.z - LOCATIONS.stadium.z) < 12) {
        startStreetRace(world);
      } else if (Math.hypot(world.player.x - LOCATIONS.market.x, world.player.z - LOCATIONS.market.z) < 12) {
        startCourier(world);
      }
    }
  }

  // Player: drive, or walk.
  const move = input.move();
  if (world.playerCar) {
    const car = world.playerCar;
    driveCar(world, car, input, dt);
    const hit = resolveBuildings(world, car, 1.6);
    if (hit) crashCar(world, car);
    car.x = clamp(car.x, -WORLD.BOUND, WORLD.BOUND);
    car.z = clamp(car.z, -WORLD.BOUND, WORLD.BOUND);
    world.player.x = car.x;
    world.player.z = car.z;
    world.player.heading = car.heading;
  } else {
    const sprint = input.sprint();
    const speed = sprint ? 10 : 6;
    const fx = Math.cos(world.camYaw);
    const fz = Math.sin(world.camYaw);
    const rx = -Math.sin(world.camYaw);
    const rz = Math.cos(world.camYaw);
    const vx = fx * move.y + rx * move.x;
    const vz = fz * move.y + rz * move.x;
    const len = Math.hypot(vx, vz);
    if (len > 0.01) {
      world.player.x += (vx / len) * speed * dt;
      world.player.z += (vz / len) * speed * dt;
      world.player.heading = Math.atan2(vz, vx);
    }
    resolveBuildings(world, world.player, 0.6);
    world.player.x = clamp(world.player.x, -WORLD.BOUND, WORLD.BOUND);
    world.player.z = clamp(world.player.z, -WORLD.BOUND, WORLD.BOUND);
  }
  world.inCar = world.playerCar !== null;

  // Missions: auto-start the next, keep its step entities, pay on done.
  if (!world.mission.active && world.missionIndex < MISSIONS.length) {
    startMission(world.mission, world.missionIndex, world);
  }
  if (world.mission.active) {
    const mission = MISSIONS[world.mission.index];
    const step = mission ? mission.steps[world.mission.step] : null;
    if (step) {
      if (step.type === 'stealCar') {
        if (!world.targetCar || Math.hypot(world.targetCar.x - step.at.x, world.targetCar.z - step.at.z) > 30) {
          const car = makeCar(world, step.at.x, step.at.z, 'coupe', null);
          world.cars.push(car);
          world.targetCar = car;
        }
      } else if (step.type === 'deliverCar') {
        if (!world.targetCar) {
          const car = makeCar(world, world.player.x, world.player.z, 'coupe', null);
          world.cars.push(car);
          world.targetCar = car;
        }
      } else if (world.targetCar && world.playerCar !== world.targetCar) {
        world.targetCar = null;
      }
    }
    const result = updateMission(world.mission, world);
    if (result === 'done') {
      const reward = mission.reward;
      world.cash += reward.cash;
      world.rep += reward.rep;
      if (world.missionIndex === 4) {
        world.hasSmg = true;
        world.message('SMG unlocked — check your arsenal.');
      }
      world.missionIndex += 1;
      world.message(`Mission complete — +$${reward.cash}, +${reward.rep} rep.`);
      world.sound('mission');
      world.targetCar = null;
      world.markCar = null;
      world.escortCar = null;
      if (!world.shot) saveGame(world);
    } else if (result === 'fail') {
      world.message('Mission failed — try again.');
      world.sound('fail');
      world.targetCar = null;
      world.markCar = null;
      world.escortCar = null;
      startMission(world.mission, world.missionIndex, world);
    }
  }

  updateActivities(world, dt);

  // Hidden packages.
  for (const c of world.collectibles) {
    if (c.taken) continue;
    if (Math.hypot(world.player.x - c.x, world.player.z - c.z) < COLLECTIBLE.radius) {
      c.taken = true;
      world.cash += COLLECTIBLE.reward;
      world.sound('coin');
      const n = world.collectibles.filter((k) => k.taken).length;
      world.message(`Hidden package ${n}/20 — +$${COLLECTIBLE.reward}`);
    }
  }

  // Combat.
  world.weaponCooldown = Math.max(0, world.weaponCooldown - dt);
  if (input.attackHeld()) fireWeapon(world);
  updateEnemies(world, dt);
  if (world.player.hp <= 0 && !world.endState) {
    world.endState = 'wasted';
  }
  // A low-health warning, once per dip below 30.
  if (world.player.hp <= 30 && world.player.hp > 0 && !world.lowHpWarned) {
    world.lowHpWarned = true;
    world.message('Low health — find cover!');
  } else if (world.player.hp > 50) {
    world.lowHpWarned = false;
  }

  // The tail mark wanders the grid; the escort truck drives its route.
  if (world.markCar) {
    const mark = world.markCar;
    if (!mark.route || mark.routeIndex >= mark.route.length) {
      mark.route = gridPath(
        { x: mark.x, z: mark.z },
        { x: nearestStreet(world.rng.float(-224, 224)), z: nearestStreet(world.rng.float(-224, 224)) },
      );
      mark.routeIndex = 0;
    }
    mark.speed = 7;
    followPath(mark, dt);
  }
  if (world.escortCar) {
    const escort = world.escortCar;
    escort.speed = 10;
    followPath(escort, dt);
  }

  updatePolice(world, dt);
  updateTraffic(world, dt);
  updatePeds(world, dt);
  updateParticles(world, dt);
  tryRepair(world);

  if (audio) {
    audio.setEngine(world.playerCar ? Math.abs(world.playerCar.speed) : 0);
  }
}
