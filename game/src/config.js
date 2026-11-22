// Solmar Bay — shared tuning constants. One place for every number the
// world, the missions and the activities agree on, so the sim and the
// browser build the same game.

export const WORLD = {
  // Streets run at multiples of BLOCK, nine per axis, from -224 to 224.
  BLOCK: 56,
  STREETS: [-224, -168, -112, -56, 0, 56, 112, 168, 224],
  // The playable city spans +-BOUND metres; water lies beyond the east edge.
  BOUND: 252,
  // Day starts at 08:00.
  DAY_START: 8,
};

// The game clock runs TIME_SCALE x real time: one real second is a game minute.
export const TIME_SCALE = 60;

// Named places. Every mission target, activity start and landmark lives on
// a street or an open square, never inside a building, so it is reachable.
export const LOCATIONS = {
  plaza: { x: 0, z: 0 },
  casino: { x: 28, z: -196 },
  docks: { x: 196, z: 196 },
  stadium: { x: -112, z: -168 },
  market: { x: -168, z: 56 },
  garage: { x: -28, z: 112 },
  vault: { x: 168, z: -168 },
  marina: { x: 252, z: 0 },
  raceStart: { x: -112, z: -168 },
};

export const PLAYER = {
  walk: 6,
  sprint: 10,
  hp: 100,
  radius: 0.6,
  // How close the player must be to enter a car or pick something up.
  interact: 3.5,
};

export const CAR = {
  accel: 14,
  brake: 22,
  maxSpeed: 34,
  reverse: 10,
  turn: 2.4,
  // A hit harder than this damages the car.
  damageSpeed: 15,
  damagePerHit: 25,
  // A wrecked car crawls until the garage repairs it.
  wreckMax: 3,
};

export const COMBAT = {
  pistol: { damage: 34, rate: 0.25, range: 42 },
  smg: { damage: 22, rate: 0.09, range: 38 },
  // Half-angle of the firing cone, in radians.
  aimCone: 0.45,
};

export const POLICE = {
  // Foot cops pursue the player out to this distance.
  footPursue: 60,
  footSpeed: 4.2,
  // A foot cop this close busts the player.
  bustDistance: 2.2,
  // Patrol cars: at most this many non-roadblock cars.
  patrolCap: 4,
  patrolSpeed: 16,
  // Roadblocks appear at this wanted level.
  roadblockAt: 3,
  // Wanted decays one level per this many seconds out of sight.
  decaySeconds: 25,
};

export const RACE = {
  // Five checkpoints, a loop around the stadium quarter.
  points: [
    { x: -112, z: -168 },
    { x: -168, z: -112 },
    { x: -168, z: 56 },
    { x: -112, z: 112 },
    { x: -56, z: -112 },
  ],
  // Seconds to finish the loop.
  limit: 120,
  reward: 600,
  checkpointRadius: 10,
};

export const COURIER = {
  drops: [
    { x: -112, z: 168 },
    { x: 56, z: 224 },
    { x: 168, z: 112 },
  ],
  reward: 150,
  dropRadius: 4,
};

export const COLLECTIBLE = {
  count: 20,
  reward: 25,
  radius: 3,
};

export const MISSION = {
  // Radius for goto / talk / pickup / deliver / driveTo / escape steps.
  radius: 6,
  // Radius for race checkpoints inside missions.
  raceRadius: 8,
  // Tail: lose the mark past this distance.
  tailLoseDistance: 55,
};
