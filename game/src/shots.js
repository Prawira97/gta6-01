// Solmar Bay — screenshot staging. Each ?shot= name puts the world into a
// fixed, deterministic pose (seed, positions, time of day, camera) so the
// E2E screenshots are byte-identical from run to run: no wall-clock time,
// no fresh randomness, just the staged state rendered a fixed number of
// times before window.__shotReady is set.
import { PLACES } from './config.js';
import { startMission } from './missions.js';

function setWanted(world, n) {
  world.wanted.level = n;
  world.wanted.since = world.time;
}

export function stageShot(world, name) {
  // A staged world never saves and never resumes a save.
  world.shot = true;
  switch (name) {
    case 'start': {
      // Title screen over the city at dawn; the game has not started.
      world.dayTime = 7;
      world.shotCamera = {
        pos: { x: -140, y: 90, z: -140 },
        look: { x: 40, y: 10, z: 40 },
      };
      return { started: false };
    }
    case 'play': {
      // Kai driving the yellow sedan at full speed, wanted 2, mission 1/12.
      world.dayTime = 12;
      const sedan = world.cars.find((c) => c.kind === 'sedan' && c.driver === null) || world.cars[0];
      sedan.color = 0xf2c200;
      sedan.driver = 'player';
      // West of the plaza, heading east: far enough that mission 1/12
      // ("Meet Mara") cannot auto-complete during the staging steps.
      sedan.x = -56;
      sedan.z = 0;
      sedan.heading = 0;
      sedan.speed = 38;
      world.playerCar = sedan;
      world.inCar = true;
      world.player.x = -56;
      world.player.z = 0;
      world.camYaw = 0;
      setWanted(world, 2);
      // Two patrol cars in view for the minimap blips.
      for (let i = 0; i < 2; i += 1) {
        world.policeCars.push({
          x: 40 + i * 24,
          z: -30 + i * 10,
          heading: Math.PI,
          speed: 12,
          kind: 'police',
          color: 0x1c3fd6,
          driver: 'police',
          damage: 0,
          block: false,
        });
      }
      world.shotCamera = null; // gameplay chase camera
      return { started: true };
    }
    case 'mission': {
      // Kane's Vault shootout at dusk: Kai on foot, Rico's guards ahead.
      world.dayTime = 17;
      world.missionIndex = 11;
      startMission(world.mission, 11, world);
      world.mission.step = 1; // the kill step: "Take down Rico"
      // The kill step would spawn its own guards on the first tick; the
      // shot stages its three guards here instead, so mark it spawned.
      world.mission.spawned = true;
      world.spawnEnemies({ x: PLACES.vault.x, z: PLACES.vault.z }, 3, false);
      world.player.x = PLACES.vault.x - 24;
      world.player.z = PLACES.vault.z + 8;
      world.player.hp = 100;
      world.camYaw = 0;
      world.shotCamera = null;
      return { started: true };
    }
    case 'end': {
      // The finale at the docks at sunset, all twelve missions done.
      world.dayTime = 18.5;
      world.missionIndex = 12;
      world.player.x = 180;
      world.player.z = 180;
      world.player.hp = 100;
      world.camYaw = Math.PI * 0.75;
      world.shotCamera = {
        pos: { x: 120, y: 42, z: 120 },
        look: { x: 196, y: 6, z: 196 },
      };
      return { started: true };
    }
    default: {
      world.dayTime = 12;
      world.shotCamera = null;
      return { started: true };
    }
  }
}
