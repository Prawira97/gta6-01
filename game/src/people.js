// Solmar Bay — people: pedestrians walking the streets, and the shared
// route follower the escort truck, the tail mark and the peds all use.
// A route is a list of street waypoints (gridPath); an entity follows it
// at its speed and stops at the last point.
import { WORLD } from './config.js';
import { gridPath, nearestStreet } from './city.js';

const PED_COLORS = [0xd8a0a0, 0xa0c8d8, 0xc8d8a0, 0xd8c890, 0xb0a0d8, 0x90d8b0, 0xd890a0, 0x88a8c8];

// Move `entity` along entity.route (waypoints, entity.routeIndex) at
// entity.speed. Returns true when it arrives at the last waypoint.
export function followPath(entity, dt) {
  const route = entity.route;
  if (!route || route.length === 0) return true;
  const target = route[entity.routeIndex];
  if (!target) return true;
  const dx = target.x - entity.x;
  const dz = target.z - entity.z;
  const d = Math.hypot(dx, dz);
  const step = entity.speed * dt;
  if (d <= Math.max(step, 0.5)) {
    entity.x = target.x;
    entity.z = target.z;
    entity.routeIndex += 1;
    if (entity.routeIndex >= route.length) return true;
    return false;
  }
  entity.x += (dx / d) * step;
  entity.z += (dz / d) * step;
  entity.heading = Math.atan2(dz, dx);
  return false;
}

export function createPeds(world, count) {
  const rng = world.rng;
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const onXStreet = rng.chance(0.5);
    const street = rng.pick(WORLD.STREETS);
    const along = rng.float(-224, 224);
    const ped = {
      x: onXStreet ? street : along,
      z: onXStreet ? along : street,
      heading: rng.float(0, Math.PI * 2),
      speed: rng.float(0.9, 1.6),
      color: rng.pick(PED_COLORS),
      kind: 'ped',
      route: null,
      routeIndex: 0,
    };
    pickPedDestination(world, ped);
    peds.push(ped);
  }
  return peds;
}

function pickPedDestination(world, ped) {
  const rng = world.rng;
  // A destination worth walking to: not the ped's own corner, or it would
  // stand still re-picking all day.
  let dest = null;
  for (let tries = 0; tries < 5; tries += 1) {
    const cand = {
      x: nearestStreet(rng.float(-224, 224)),
      z: nearestStreet(rng.float(-224, 224)),
    };
    if (Math.hypot(cand.x - ped.x, cand.z - ped.z) > 30) {
      dest = cand;
      break;
    }
    dest = cand;
  }
  ped.route = gridPath({ x: ped.x, z: ped.z }, dest);
  ped.routeIndex = 0;
}

export function updatePeds(world, dt) {
  for (const ped of world.peds) {
    if (!ped.route || ped.routeIndex >= ped.route.length) {
      pickPedDestination(world, ped);
    }
    followPath(ped, dt);
  }
}
