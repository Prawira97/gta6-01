// Solmar Bay — pedestrians. They walk the sidewalks, turn at intersections
// and get knocked down (then get back up) when a car clips them. Their count
// never changes, so a deterministic run always sees the same crowd.
import { GRID, ROADS } from './config.js';
import { dist } from './random.js';

export const PED_COUNT = 24;

export function spawnPeds(world) {
  const peds = [];
  for (let i = 0; i < PED_COUNT; i += 1) {
    const road = world.rng.pick(ROADS);
    const along = world.rng.range(GRID.min + 10, GRID.max - 10);
    const vertical = world.rng.chance(0.5);
    peds.push({
      x: vertical ? road + 4 : along,
      z: vertical ? along : road + 4,
      heading: world.rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]),
      speed: world.rng.range(1, 1.8),
      state: 'walk',
      downTimer: 0,
    });
  }
  return peds;
}

export function updatePeds(world, dt) {
  for (const ped of world.peds) {
    if (ped.state === 'down') {
      ped.downTimer -= dt;
      if (ped.downTimer <= 0) ped.state = 'walk';
      continue;
    }
    // Walk forward; at an intersection, sometimes turn onto the cross road.
    const nearX = ROADS.some((r) => Math.abs(ped.x - r) < 2);
    const nearZ = ROADS.some((r) => Math.abs(ped.z - r) < 2);
    if (nearX && nearZ && world.rng.chance(dt * 0.4)) {
      ped.heading += world.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
    }
    ped.x += Math.cos(ped.heading) * ped.speed * dt;
    ped.z += -Math.sin(ped.heading) * ped.speed * dt;
    // Turn around at the city edge instead of leaving town.
    if (ped.x < GRID.min || ped.x > GRID.max || ped.z < GRID.min || ped.z > GRID.max) {
      ped.heading += Math.PI;
      ped.x = Math.max(GRID.min, Math.min(GRID.max, ped.x));
      ped.z = Math.max(GRID.min, Math.min(GRID.max, ped.z));
    }
  }

  // A player-driven car clipping a pedestrian knocks them down and draws
  // heat. The crowd itself never shrinks, so the sim's counts stay stable.
  for (const car of world.cars) {
    if (car.driver !== 'player' || Math.abs(car.speed) < 2) continue;
    for (const ped of world.peds) {
      if (ped.state === 'walk' && dist(car.x, car.z, ped.x, ped.z) < 2) {
        ped.state = 'down';
        ped.downTimer = 2;
        world.setWanted(world.wanted.level + 1);
      }
    }
  }
}
