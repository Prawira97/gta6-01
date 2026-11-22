// Solmar Bay — tuning constants. One place for every magic number the
// gameplay systems share, so a balance change never needs a hunt through
// the modules. All distances are metres, all speeds m/s, all money dollars.
export const GRID = { min: -224, max: 224, spacing: 56 };
export const ROADS = [-224, -168, -112, -56, 0, 56, 112, 168, 224];

export const PLAYER = {
  walkSpeed: 6,
  sprintSpeed: 9.5,
  hp: 100,
  radius: 1,
  enterCarRadius: 4,
};

export const CAR = {
  accel: 14,
  brake: 30,
  maxSpeed: 38,
  reverseSpeed: 10,
  steer: 1.9,
  // NPC traffic speed, and the extra steering multiplier the escort truck
  // needs to stay on the road grid instead of cutting corners.
  npcSpeed: 9,
  npcSteerMul: 2,
};

export const WANTED = {
  max: 5,
  decayPerSec: 0.05,
  roadblockAt: 3,
  footCopsAt: 2,
  patrolAt: 1,
  maxPatrol: 4,
  maxFootCops: 4,
};

export const COMBAT = {
  pistolDamage: 34,
  pistolRate: 0.25,
  smgDamage: 20,
  smgRate: 0.1,
  range: 45,
  // cos of the half-angle of the aim cone: a shot only counts as a hit when
  // the target is nearly straight ahead of the camera.
  aimCos: 0.985,
};

export const REWARDS = {
  race: 500,
  courier: 300,
  package: 25,
  kill: 50,
};

export const RACE = { checkpoints: 5, timeLimit: 120, start: { x: -112, z: -168 } };
export const COURIER = { drops: 3 };

// Interaction radii, in metres. One source of truth: the missions, the
// activities and the world all reach for these instead of hard-coding them.
export const INTERACT = { reach: 5, driveTo: 7, race: 8, pickup: 2 };

// Named places. The mission script, the activities and the sim all agree on
// these coordinates, so a place never drifts between systems.
export const PLACES = {
  plaza: { x: 0, z: 0 },
  casino: { x: 28, z: -196 },
  docks: { x: 196, z: 196 },
  stadium: { x: -112, z: -168 },
  market: { x: -56, z: 112 },
  garage: { x: 56, z: 56 },
  vault: { x: 168, z: -112 },
  marina: { x: 210, z: 0 },
  hospital: { x: -168, z: 56 },
};

export const COLORS = {
  building: [0x8a7f70, 0x7a6f62, 0x9a8a76, 0x6f7a8a, 0x8a6f6f, 0x757a6a],
  car: [0xf2c200, 0xd23c2e, 0x2e6fd2, 0x3aa655, 0xe8e8e8, 0x222226, 0x7a4fd2],
  police: 0x1c3fd6,
};
