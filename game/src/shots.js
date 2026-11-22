// Solmar Bay — deterministic shot staging. Each shot is a fixed scene:
// a fixed time, a fixed place, a fixed mission state. Shot mode never
// steps the world, so the frame is identical on every load.
import { MISSIONS, startMission } from './missions.js';
import { spawnEnemies } from './combat.js';
import { makeCar } from './vehicles.js';

export const SHOT_DEFS = [
  { name: '1-start.jpg', time: 8 },
  { name: '2-play.jpg', time: 12 },
  { name: '3-mission.jpg', time: 17 },
  { name: '4-end.jpg', time: 19 },
];

// Stage shot `n` (1-4) on `world` and return the shot def.
export function stageShot(world, n) {
  const def = SHOT_DEFS[n - 1] || SHOT_DEFS[0];
  world.shot = true;
  world.time = def.time;
  world.cash = 0;
  world.rep = 0;
  world.wanted.level = 0;
  world.wanted.timer = 0;
  world.camPitch = 0.35;
  world.camDist = 9;
  world.camYaw = 0;

  if (n === 1) {
    // 08:00, on foot at the plaza, mission 1/12. Kai stands on the
    // plaza pavement just south of the fountain, not in the water.
    world.player.x = 0;
    world.player.z = 18;
    world.player.heading = 0;
    startMission(world.mission, 0, world);
    world.message('Welcome back to Solmar Bay.');
  } else if (n === 2) {
    // 12:00, in a yellow sedan at (-56, 0) heading east, mission 1/12.
    const car = makeCar(world, -56, 0, 'sedan', 'player');
    car.heading = 0;
    car.color = 0xe0c020;
    car.speed = 0;
    world.cars.push(car);
    world.playerCar = car;
    world.player.x = -56;
    world.player.z = 0;
    world.player.heading = 0;
    startMission(world.mission, 0, world);
    world.message('Meet Mara at the plaza.');
  } else if (n === 3) {
    // 17:00, Kai on foot at Kane's Vault with three red guards, 12/12.
    world.cash = 4000;
    world.rep = 120;
    world.player.x = 168;
    world.player.z = -168;
    world.player.heading = 0;
    world.missionIndex = 11;
    startMission(world.mission, 11, world);
    world.mission.step = 1;
    world.mission.enteredStep = 1;
    world.mission.kills = 0;
    // Three red guards around the vault building (north, east, south of
    // it), so all three are in frame and none stands inside the vault.
    spawnEnemies(world, { x: 180, z: -186 }, 1, false);
    spawnEnemies(world, { x: 192, z: -168 }, 1, false);
    spawnEnemies(world, { x: 180, z: -150 }, 1, false);
    world.message(MISSIONS[11].steps[1].text);
  } else {
    // Dusk at the docks, every mission done.
    world.cash = 5700;
    world.rep = 150;
    world.missionIndex = 12;
    world.mission.active = false;
    world.player.x = 196;
    world.player.z = 196;
    world.player.heading = 0;
    world.message('Solmar Bay is yours.');
  }
  return def;
}
