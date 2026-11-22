// Solmar Bay — side activities: the stadium street race and the market
// courier gigs. Both are started by the player (E near the stadium or
// the market) and run on the world state; the sim starts them directly.
import { RACE, COURIER } from './config.js';

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function startStreetRace(world) {
  const race = world.activities.race;
  if (race.state === 'running') return false;
  race.state = 'running';
  race.points = RACE.points.map((p) => ({ x: p.x, z: p.z }));
  race.idx = 0;
  race.elapsed = 0;
  race.limit = RACE.limit;
  world.message('Street race — hit all 5 checkpoints before the clock dies!');
  return true;
}

export function startCourier(world) {
  const courier = world.activities.courier;
  if (courier.state === 'running') return false;
  courier.state = 'running';
  courier.drops = COURIER.drops.map((p) => ({ x: p.x, z: p.z }));
  courier.idx = 0;
  world.message('Courier gig — 3 drops across the city.');
  return true;
}

export function updateActivities(world, dt) {
  const race = world.activities.race;
  if (race.state === 'running') {
    race.elapsed += dt;
    const point = race.points[race.idx];
    if (point && dist(world.player, point) < RACE.checkpointRadius) {
      race.idx += 1;
      if (race.idx >= race.points.length) {
        race.state = 'idle';
        world.cash += RACE.reward;
        world.rep += 5;
        if (race.best === null || race.elapsed < race.best) race.best = race.elapsed;
        world.message(`Race won! +$${RACE.reward}, +5 rep — best ${race.elapsed.toFixed(1)}s`);
      }
    } else if (race.elapsed > race.limit) {
      race.state = 'idle';
      world.message('Race failed — out of time.');
    }
  }

  const courier = world.activities.courier;
  if (courier.state === 'running') {
    const drop = courier.drops[courier.idx];
    if (drop && dist(world.player, drop) < COURIER.dropRadius) {
      courier.idx += 1;
      if (courier.idx >= courier.drops.length) {
        courier.state = 'idle';
        world.cash += COURIER.reward;
        world.rep += 3;
        world.courierDone += 1;
        world.message(`Courier gig done! +$${COURIER.reward}, +3 rep`);
      }
    }
  }
}
