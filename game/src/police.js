// The wanted system: stars rise with crimes and cool off when the player lays low, and
// the police who answer it — patrol cars that chase and ram, and foot cops who run the
// player down, shoot, and make the bust. A cop only exists while it is wanted.
import { CAR, WANTED } from './config.js';
import { createCarState, steerToward, stepCarPhysics } from './vehicles.js';
import { createPedState } from './people.js';
import { randomIntersection } from './city.js';
import { range } from './random.js';

export function createWanted() {
  return { level: 0, heat: 0, decayTimer: 0 };
}

/** A crime: raise the level (capped) and restart the heat timer. */
export function addCrime(wanted, amount) {
  wanted.level = Math.min(WANTED.max, wanted.level + amount);
  wanted.heat = WANTED.heatSeconds;
  wanted.decayTimer = 0;
}

/** Cool the wanted level: while heat runs it holds; once it lapses and no cop is near,
// one star drops every few seconds. */
export function stepWanted(wanted, dt, nearestCopDist) {
  if (wanted.level <= 0) return;
  if (wanted.heat > 0) {
    wanted.heat -= dt;
    return;
  }
  if (nearestCopDist < 55) return;
  wanted.decayTimer += dt;
  if (wanted.decayTimer >= WANTED.decaySeconds) {
    wanted.decayTimer = 0;
    wanted.level -= 1;
  }
}

/** Spawn a police car at an intersection near the player. */
export function spawnPoliceCar(city, random, player) {
  for (let tries = 0; tries < 12; tries += 1) {
    const p = randomIntersection(random);
    const d = Math.hypot(p.x - player.x, p.z - player.z);
    if (d > 60 && d < 160) {
      const car = createCarState(city, random, 'police', p.x, p.z, range(random, 0, Math.PI * 2));
      car.driver = 'police';
      return car;
    }
  }
  const p = randomIntersection(random);
  const car = createCarState(city, random, 'police', p.x, p.z, 0);
  car.driver = 'police';
  return car;
}

/** One police-car step: chase the player's position and ram their car. */
export function stepPoliceCar(car, dt, city, player, playerCar) {
  const target = playerCar || player;
  const steer = steerToward(car, target.x, target.z);
  const dist = Math.hypot(target.x - car.x, target.z - car.z);
  // Ease off right on top of the player so the ram is a bump, not a teleport.
  const throttle = dist > 6 ? 1 : 0.4;
  stepCarPhysics(car, throttle, steer, dt, city.colliders);
  // Siren flash phase, for the renderer's light bar.
  car.flash += dt;
}

/** Spawn a foot cop near the player. */
export function spawnFootCop(city, random, player) {
  const cop = createPedState(city, random, 'cop');
  const angle = range(random, 0, Math.PI * 2);
  cop.x = player.x + Math.cos(angle) * range(random, 18, 30);
  cop.z = player.z + Math.sin(angle) * range(random, 18, 30);
  cop.state = 'chase';
  cop.speed = 0;
  return cop;
}

/**
 * One foot-cop step: run at the player, shoot from mid range, and grab them up close.
 * Returns 'bust' when the cop reaches the player on foot, 'shoot' when it fires.
 */
export function stepFootCop(cop, dt, player, playerInCar, time, random) {
  const dx = player.x - cop.x;
  const dz = player.z - cop.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1.8 && !playerInCar) return 'bust';
  const want = Math.atan2(dz, dx);
  let diff = want - cop.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  cop.heading += Math.max(-4 * dt, Math.min(4 * dt, diff));
  const targetSpeed = dist > 26 ? 0 : 5.2;
  cop.speed += (targetSpeed - cop.speed) * Math.min(1, 5 * dt);
  cop.x += Math.cos(cop.heading) * cop.speed * dt;
  cop.z += Math.sin(cop.heading) * cop.speed * dt;
  cop.phase += cop.speed * dt * 2.4;
  cop.lastShot = (cop.lastShot ?? 0) + dt;
  if (!playerInCar && dist > 7 && dist < 30 && cop.lastShot > 1.1) {
    cop.lastShot = 0;
    if (random() < 0.55) return 'shoot';
  }
  return null;
}

/** How many police cars the current wanted level calls for. */
export function wantedCarCount(level) {
  return Math.min(4, level);
}
