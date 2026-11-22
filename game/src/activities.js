// Side activities: the street race and the courier gig. Both are repeatable, timed,
// and pay cash + rep — the free-roam loop between story missions. Plain state the world
// owns; the HUD and the minimap read it. The world starts them on the player's F press
// near their markers (stadium for the race, market for the courier).
import { COURIER, LANDMARKS, RACE } from './config.js';
import { randomIntersection } from './city.js';

/** Fresh activity state: nothing running. */
export function createActivities() {
  return {
    race: { state: 'idle', idx: 0, timer: 0, points: [], best: null },
    courier: { state: 'idle', idx: 0, drops: [], timer: 0 },
  };
}

/** Where the street race starts: the stadium's front straight. */
export function raceStartPoint() {
  return { x: RACE.points[0].x, z: RACE.points[0].z };
}

/** Where the courier gig starts: the market square. */
export function courierStartPoint() {
  return { x: LANDMARKS.market.x, z: LANDMARKS.market.z };
}

function say(world, text) {
  world.messages.push({ text, until: world.time + 6 });
  if (world.messages.length > 4) world.messages.shift();
}

/** Start the street race. The caller checks the player is in a car first. */
export function startStreetRace(world) {
  const race = world.activities.race;
  race.state = 'running';
  race.points = RACE.points;
  race.idx = 0;
  race.timer = RACE.timeLimit;
  world.pendingSound = 'raceGo';
  say(world, `Street race — ${RACE.points.length} checkpoints, ${RACE.timeLimit}s. Go!`);
}

/** Start a courier gig: three drops at random intersections. */
export function startCourier(world) {
  const courier = world.activities.courier;
  courier.state = 'running';
  courier.drops = [randomIntersection(world.random), randomIntersection(world.random), randomIntersection(world.random)];
  courier.idx = 0;
  courier.timer = COURIER.timeLimit;
  world.pendingSound = 'pickup';
  say(world, `Courier gig — ${COURIER.drops} drops, ${COURIER.timeLimit}s. First stop is marked.`);
}

/** One step of both activities. Call from the world's step, after the missions. */
export function stepActivities(world, dt) {
  const race = world.activities.race;
  if (race.state === 'running') {
    race.timer -= dt;
    const point = race.points[race.idx];
    const d = Math.hypot(world.player.x - point.x, world.player.z - point.z);
    if (d <= RACE.checkpointRadius) {
      race.idx += 1;
      world.pendingSound = 'checkpoint';
      if (race.idx >= race.points.length) {
        const used = RACE.timeLimit - race.timer;
        const bonus = Math.max(0, Math.floor(race.timer)) * RACE.timeBonusPerSecond;
        const pay = RACE.reward + bonus;
        world.cash += pay;
        world.rep += RACE.repReward;
        if (race.best === null || used < race.best) race.best = used;
        // Keep the world's saved best in step: saveGame writes world.raceBest.
        world.raceBest = race.best;
        say(world, `Race won — $${pay} in ${Math.round(used)}s.`);
        race.state = 'idle';
      } else {
        say(world, `Checkpoint ${race.idx}/${race.points.length}`);
      }
    } else if (race.timer <= 0) {
      say(world, 'Race over — out of time.');
      race.state = 'idle';
    }
  }

  const courier = world.activities.courier;
  if (courier.state === 'running') {
    courier.timer -= dt;
    const drop = courier.drops[courier.idx];
    const d = Math.hypot(world.player.x - drop.x, world.player.z - drop.z);
    if (d <= COURIER.dropRadius) {
      courier.idx += 1;
      world.cash += COURIER.payPerDrop;
      world.rep += COURIER.repPerDrop;
      world.pendingSound = 'pickup';
      if (courier.idx >= courier.drops.length) {
        world.cash += COURIER.bonus;
        world.rep += 2;
        world.courierDone += 1;
        say(world, `Courier gig done — $${COURIER.payPerDrop * COURIER.drops.length + COURIER.bonus} total.`);
        courier.state = 'idle';
      } else {
        say(world, `Drop ${courier.idx}/${courier.drops.length} delivered.`);
      }
    } else if (courier.timer <= 0) {
      say(world, 'Courier gig failed — too slow.');
      courier.state = 'idle';
    }
  }
}
