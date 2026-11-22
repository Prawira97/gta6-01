// Solmar Bay — the police: patrol cars, foot cops and roadblocks. Wanted
// 1 brings patrol cars (capped at 4), wanted 2 adds foot cops (capped at 4,
// they give up past 60 m), wanted 3+ sets a two-car roadblock across the
// road ahead of the player. Everything here is deterministic: spawns use
// the world's seeded RNG and the counts are capped, never random.
import { WANTED, GRID, ROADS } from './config.js';
import { dist } from './random.js';
import { snapToRoad, nearestRoad } from './city.js';

function spawnPatrolCar(world) {
  const p = world.player;
  // Appear on a road a little ahead of the player, facing them.
  const at = snapToRoad(p.x + 60, p.z);
  const car = {
    x: at.x,
    z: at.z,
    heading: Math.atan2(-(p.z - at.z), p.x - at.x),
    speed: 0,
    kind: 'police',
    color: 0x1c3fd6,
    driver: 'police',
    damage: 0,
    block: false,
  };
  world.policeCars.push(car);
  return car;
}

function spawnFootCop(world) {
  const p = world.player;
  const at = snapToRoad(p.x + 25, p.z + 10);
  const cop = { x: at.x, z: at.z, heading: 0, speed: 5, hp: 100 };
  world.cops.push(cop);
  return cop;
}

export function updatePolice(world, dt) {
  const wanted = world.wanted.level;

  // Patrol cars: up to 4 while wanted, and they melt away once the heat dies.
  if (wanted >= WANTED.patrolAt && world.policeCars.length < WANTED.maxPatrol) {
    spawnPatrolCar(world);
  } else if (wanted === 0 && world.policeCars.length > 0) {
    world.policeCars.pop();
  }

  // Foot cops: up to 4 from wanted 2; they chase only inside 60 m.
  if (wanted >= WANTED.footCopsAt && world.cops.length < WANTED.maxFootCops) {
    spawnFootCop(world);
  } else if (wanted === 0 && world.cops.length > 0) {
    world.cops.pop();
  }

  // Roadblock: two cars across the road ahead of the player at wanted 3+.
  if (wanted >= WANTED.roadblockAt) {
    if (!world.roadblock.active) {
      const p = world.player;
      const ahead = 46;
      const fx = Math.cos(world.camYaw || 0);
      const fz = -Math.sin(world.camYaw || 0);
      const cx = p.x + fx * ahead;
      const cz = p.z + fz * ahead;
      const road = nearestRoad(cx);
      const perp = Math.abs(fx) > Math.abs(fz) ? 'z' : 'x';
      const cars = [];
      for (const off of [-7, 7]) {
        cars.push({
          x: perp === 'z' ? road : cx + off,
          z: perp === 'z' ? cz + off : road,
          heading: 0,
          speed: 0,
          kind: 'police',
          color: 0x1c3fd6,
          driver: 'police',
          damage: 0,
          block: true,
        });
      }
      world.roadblock.active = true;
      world.roadblock.cars = cars;
    }
  } else if (world.roadblock.active) {
    world.roadblock.active = false;
    world.roadblock.cars = [];
  }

  // Patrol cars steer straight at the player; a bump slows both down.
  for (const car of world.policeCars) {
    const dx = world.player.x - car.x;
    const dz = world.player.z - car.z;
    const d = Math.hypot(dx, dz) || 1;
    const want = Math.atan2(-dz, dx);
    let diff = want - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
    car.speed = Math.min(13, car.speed + 8 * dt);
    car.x += Math.cos(car.heading) * car.speed * dt;
    car.z += -Math.sin(car.heading) * car.speed * dt;
    if (d < 3 && world.playerCar) {
      world.playerCar.damage = Math.min(100, (world.playerCar.damage || 0) + 2);
      car.speed *= 0.5;
    }
  }

  // Foot cops run at the player inside 60 m; caught on foot means busted.
  for (const cop of world.cops) {
    const d = dist(cop.x, cop.z, world.player.x, world.player.z);
    if (d < 60) {
      const dx = world.player.x - cop.x;
      const dz = world.player.z - cop.z;
      const len = Math.hypot(dx, dz) || 1;
      cop.x += (dx / len) * cop.speed * dt;
      cop.z += (dz / len) * cop.speed * dt;
      if (d < 2 && !world.playerCar) {
        world.endState = 'busted';
      }
    }
  }
}
