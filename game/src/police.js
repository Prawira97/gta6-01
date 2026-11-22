// Solmar Bay — the police: foot cops who chase to 60 m and bust on
// contact, patrol cars (capped at 4) that chase along the streets, and a
// two-car roadblock that appears at wanted 3+. Heat cools one star every
// 25 seconds without a fresh crime.
import { POLICE } from './config.js';
import { gridPath, nearestStreet } from './city.js';
import { followPath } from './people.js';

export function setWanted(world, level) {
  world.wanted.level = Math.max(0, Math.min(5, level));
  world.wanted.timer = 0;
  if (world.wanted.level === 0) {
    clearRoadblock(world);
  }
}

function clearRoadblock(world) {
  if (!world.roadblock.active) return;
  world.policeCars = world.policeCars.filter((c) => !c.block);
  world.roadblock.active = false;
  world.roadblock.cars = [];
}

function spawnPatrol(world) {
  const rng = world.rng;
  const angle = rng ? rng.float(0, Math.PI * 2) : 0;
  const x = world.player.x + Math.cos(angle) * 60;
  const z = world.player.z + Math.sin(angle) * 60;
  const car = {
    x: nearestStreet(x),
    z: nearestStreet(z),
    heading: 0,
    speed: 0,
    kind: 'police',
    driver: 'police',
    color: 0x223344,
    damage: 0,
    block: false,
    route: null,
    routeIndex: 0,
    retarget: 0,
  };
  world.policeCars.push(car);
  return car;
}

function spawnRoadblock(world) {
  const px = nearestStreet(world.player.x + 30);
  const pz = nearestStreet(world.player.z);
  const mk = (x, z) => ({
    x, z, heading: Math.PI, speed: 0,
    kind: 'police', driver: 'police', color: 0x223344,
    damage: 0, block: true, route: null, routeIndex: 0, retarget: 0,
  });
  const a = mk(px, pz);
  const b = mk(px, pz + 9);
  // Face the oncoming player: a roadblock is a wall across the road, not
  // a pair of cars driving along it.
  a.heading = Math.PI;
  b.heading = Math.PI;
  world.policeCars.push(a, b);
  world.roadblock.active = true;
  world.roadblock.cars = [a, b];
  if (world.message) world.message('Roadblock ahead!');
  if (world.sound) world.sound('siren');
}

function spawnFootCop(world) {
  const rng = world.rng;
  const angle = rng ? rng.float(0, Math.PI * 2) : 0;
  const cop = {
    x: world.player.x + Math.cos(angle) * 18,
    z: world.player.z + Math.sin(angle) * 18,
    heading: 0,
    speed: POLICE.footSpeed,
    kind: 'cop',
    route: null,
    routeIndex: 0,
    retarget: 0,
  };
  world.cops.push(cop);
  return cop;
}

export function updatePolice(world, dt) {
  const wanted = world.wanted;

  // Heat cools: one star per quiet stretch.
  if (wanted.level > 0) {
    wanted.timer += dt;
    if (wanted.timer >= POLICE.decaySeconds) {
      wanted.timer = 0;
      setWanted(world, wanted.level - 1);
    }
  }

  // Patrol cars: up to min(wanted, 4), one at a time.
  const patrolTarget = Math.min(wanted.level, POLICE.patrolCap);
  const patrol = world.policeCars.filter((c) => !c.block);
  world.spawnTimer = (world.spawnTimer || 0) - dt;
  if (patrol.length < patrolTarget && world.spawnTimer <= 0) {
    world.spawnTimer = 0.5;
    spawnPatrol(world);
  }
  if (patrol.length > patrolTarget) {
    // Wanted fell: retire the extra patrol cars.
    const extra = patrol.slice(patrolTarget);
    world.policeCars = world.policeCars.filter((c) => !extra.includes(c));
  }

  // Roadblock at wanted 3+.
  if (wanted.level >= POLICE.roadblockAt && !world.roadblock.active) {
    spawnRoadblock(world);
  } else if (wanted.level < POLICE.roadblockAt && world.roadblock.active) {
    clearRoadblock(world);
  }

  // Foot cops: up to 3 while wanted.
  const copTarget = wanted.level > 0 ? 3 : 0;
  if (world.cops.length < copTarget && world.spawnTimer <= 0) {
    spawnFootCop(world);
  }
  if (world.cops.length > copTarget) {
    world.cops.length = copTarget;
  }

  // Patrol cars chase the player along the streets.
  for (const car of world.policeCars) {
    if (car.block) continue;
    car.retarget -= dt;
    if (!car.route || car.routeIndex >= car.route.length || car.retarget <= 0) {
      car.route = gridPath({ x: car.x, z: car.z }, { x: world.player.x, z: world.player.z });
      car.routeIndex = 0;
      car.retarget = 3;
    }
    car.speed = POLICE.patrolSpeed;
    followPath(car, dt);
  }

  // Foot cops chase to 60 m; closer than 2.2 m, the player is busted.
  for (const cop of world.cops) {
    const dx = world.player.x - cop.x;
    const dz = world.player.z - cop.z;
    const d = Math.hypot(dx, dz);
    if (d > POLICE.footPursue) continue;
    cop.retarget -= dt;
    if (!cop.route || cop.routeIndex >= cop.route.length || cop.retarget <= 0) {
      cop.route = gridPath({ x: cop.x, z: cop.z }, { x: world.player.x, z: world.player.z });
      cop.routeIndex = 0;
      cop.retarget = 1.5;
    }
    followPath(cop, dt);
    if (d < POLICE.bustDistance) {
      world.endState = 'busted';
    }
  }
}
