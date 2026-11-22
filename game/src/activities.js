// Solmar Bay — side activities: the street race and the courier gigs. Both
// run on the world's activity state ({ race, courier }) and are driven from
// stepWorld; starting one is a single call from the world or the HUD.
import { RACE, COURIER, REWARDS, INTERACT } from './config.js';
import { dist } from './random.js';

// The street-race course: a loop out of the stadium, east along the north
// service road, then back. The same five checkpoints the Street King
// mission uses, so a player who knows one knows the other.
export const RACE_POINTS = [
  { x: -56, z: -168 },
  { x: 0, z: -168 },
  { x: 56, z: -168 },
  { x: 56, z: -112 },
  { x: -112, z: -112 },
];

// Courier drops: three stops around the market district.
export const COURIER_DROPS = [
  { x: 0, z: 112 },
  { x: 112, z: 112 },
  { x: -112, z: 0 },
];

export function startStreetRace(world) {
  if (world.activities.race.state !== 'idle') return false;
  world.activities.race.state = 'running';
  world.activities.race.points = RACE_POINTS.map((p) => ({ ...p }));
  world.activities.race.idx = 0;
  world.activities.race.t = 0;
  if (world.message) world.message('Street race! Hit all 5 checkpoints in 120s.');
  if (world.sound) world.sound('race');
  return true;
}

export function startCourier(world) {
  if (world.activities.courier.state !== 'idle') return false;
  world.activities.courier.state = 'running';
  world.activities.courier.drops = COURIER_DROPS.map((p) => ({ ...p }));
  world.activities.courier.idx = 0;
  if (world.message) world.message('Courier gig: 3 drops. Go!');
  if (world.sound) world.sound('courier');
  return true;
}

export function updateActivities(world, dt) {
  const race = world.activities.race;
  if (race.state === 'running') {
    race.t += dt;
    const car = world.playerCar || world.player;
    const point = race.points[race.idx];
    if (point && dist(car.x, car.z, point.x, point.z) < INTERACT.race) {
      race.idx += 1;
      if (world.sound) world.sound('checkpoint');
      if (race.idx >= race.points.length) {
        race.state = 'idle';
        world.cash += REWARDS.race;
        race.best = race.best == null ? race.t : Math.min(race.best, race.t);
        if (world.message) world.message(`Race won! +$${REWARDS.race} — best ${race.best.toFixed(1)}s`);
        if (world.sound) world.sound('win');
      }
    } else if (race.t > RACE.timeLimit) {
      race.state = 'idle';
      if (world.message) world.message('Race failed — out of time.');
    }
  }

  const courier = world.activities.courier;
  if (courier.state === 'running') {
    const drop = courier.drops[courier.idx];
    if (drop && dist(world.player.x, world.player.z, drop.x, drop.z) < INTERACT.reach) {
      courier.idx += 1;
      if (world.sound) world.sound('pickup');
      if (courier.idx >= courier.drops.length) {
        courier.state = 'idle';
        world.cash += REWARDS.courier;
        world.courierDone += 1;
        if (world.message) world.message(`Courier done! +$${REWARDS.courier}`);
        if (world.sound) world.sound('win');
      }
    }
  }
}
