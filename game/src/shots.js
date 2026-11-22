// Deterministic screenshot staging for ?shot=.
// Each named shot rebuilds the world from a fixed seed, scripts it to a good moment,
// and freezes it so the renderer can take an identical picture on every run.
import { createWorld, stepWorld } from './world.js';
import { LANDMARKS, SHOTS } from './config.js';
function scriptedInput(actions, mouse) {
  return {
    move: () => actions,
    sprint: () => false,
    takeLook: () => ({ x: mouse.x ?? 0, y: mouse.y ?? 0 }),
    takeZoom: () => 0,
    attackHeld: () => false,
    takeActions: () => 0,
  };
}

const NONE = { x: 0, y: 0 };
const DRIVE = { x: 0, y: 1 }; // W: forward

/** Stage one shot and return the world + screen it needs. */
export function stageShot(name, canvasSize) {
  const shot = SHOTS[name] || SHOTS.start;
  const world = createWorld({ seed: shot.seed, shot: true });
  const input = scriptedInput(DRIVE, NONE);
  if (shot.kind === 'start') {
    // Title screen: the player stands at the safehouse while traffic and peds live.
    for (let i = 0; i < 300; i += 1) stepWorld(world, scriptedInput(NONE, NONE), 1 / 60);
    return { world, screen: 'title' };
  }
  if (shot.kind === 'play') {
    // A getaway: Kai in a sedan on the beach road, wanted 2, two units closing in.
    world.setWanted(2);
    const car = world.cars.find((c) => c.kind === 'sedan' && c.driver === null);
    if (car) {
      world.player.x = car.x + 2;
      world.player.z = car.z;
      world.enterCar();
      car.x = -112;
      car.z = -56;
      car.heading = 0; // east along the coast road
      car.speed = 24;
      world.camYaw = 0;
      world.player.heading = 0;
    }
    for (let i = 0; i < 180; i += 1) stepWorld(world, input, 1 / 60);
    return { world, screen: 'play' };
  }
  if (shot.kind === 'mission') {
    // Kane's Vault, the finale: Kai on foot at the casino, Rico and his guards
    // closing in, tracer in the air.
    world.missionIndex = 11;
    world.startMission(11);
    // Clear the first step (reach the casino) so the kill step spawns its guards.
    world.player.x = LANDMARKS.casino.x;
    world.player.z = LANDMARKS.casino.z;
    for (let i = 0; i < 30; i += 1) stepWorld(world, scriptedInput(NONE, NONE), 1 / 60);
    // Take cover on the casino's south side and let the shootout start.
    world.player.x = LANDMARKS.casino.x + 24;
    world.player.z = LANDMARKS.casino.z + 24;
    world.camYaw = Math.atan2(LANDMARKS.casino.z - world.player.z, LANDMARKS.casino.x - world.player.x);
    for (let i = 0; i < 120; i += 1) stepWorld(world, scriptedInput(NONE, NONE), 1 / 60);
    return { world, screen: 'play' };
  }
  // end: the wanted level caught up — BUSTED over the harbour.
  world.setWanted(4);
  world.player.x = 84;
  world.player.z = 84;
  world.endState = 'busted';
  world.endKind = 'busted';
  return { world, screen: 'over' };
}
