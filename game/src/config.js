// Every tuning number and colour in one place. Solmar Bay is a 9x9 road grid (pitch 56 m),
// a sand beach and the sea on the east side, and the docks on the south-east shore.
export const STEP = 1 / 60;
export const SAVE_KEY = 'solmar.save.v1';

export const CITY = {
  pitch: 56,
  roads: 9, // road centre lines at -224 .. 224
  roadWidth: 14,
  block: 42, // building plots inside one block
  ground: 640,
  beachX: 252,
  waterX: 296,
  half: 224,
};

export const PLAYER = {
  walk: 6,
  sprint: 9.5,
  radius: 0.6,
  health: 100,
  regenDelay: 10,
  regenRate: 6,
};

export const CAR = {
  accel: 16,
  brake: 34,
  reverseMax: 11,
  maxSpeed: 38,
  trafficSpeed: 13,
  policeSpeed: 36,
  steer: 2.1,
  /** NPC route-followers (escort, mark car) turn this much tighter than the player:
   * a sharp corner must not throw them off the road into a block. */
  npcSteerMul: 2,
  drag: 0.5,
  handbrakeSteer: 1.7,
  handbrakeDrag: 1.6,
  damagePerImpact: 0.9,
  repairRate: 12,
  radius: 2.3,
  length: 4.6,
  width: 2.0,
};

export const WEAPONS = {
  pistol: { name: 'Pistol', damage: 34, rate: 0.28, mag: 12, reload: 1.1, range: 90, spread: 0.012 },
  smg: { name: 'SMG', damage: 22, rate: 0.09, mag: 30, reload: 1.4, range: 70, spread: 0.03 },
};

export const WANTED = {
  max: 5,
  heatSeconds: 20,
  decaySeconds: 8,
  copCarPerStar: 1,
  bustedCashLoss: 0.1,
  bustedMinLoss: 50,
  roadblockAt: 3,
  roadblockCooldown: 20,
  roadblockDuration: 30,
  policeSpeedPerStar: 1.5,
};

export const TRAFFIC_COUNT = 14;
export const PED_COUNT = 24;
export const COLLECTIBLES = 20;

/** Street race: five checkpoints around the city, against the clock. */
export const RACE = {
  points: [
    { x: -112, z: -168 }, // Solmar Stadium
    { x: 168, z: -168 }, // north-east corner
    { x: 224, z: 56 }, // east road
    { x: 0, z: 168 }, // south road
    { x: -168, z: 0 }, // west road
  ],
  timeLimit: 120,
  checkpointRadius: 12,
  reward: 400,
  timeBonusPerSecond: 2,
  repReward: 5,
};

/** Courier gig: three drops, against the clock. */
export const COURIER = {
  drops: 3,
  timeLimit: 150,
  dropRadius: 8,
  payPerDrop: 100,
  bonus: 100,
  repPerDrop: 1,
};

/** Day/night: one full day every DAY_LENGTH seconds of game time. */
export const DAY_LENGTH = 240;

export const PALETTE = {
  sky: 0x8ec9e8,
  sun: 0xffe3b0,
  sunIntensity: 2.6,
  hemiSky: 0xbfe3ff,
  hemiGround: 0xd9a066,
  hemiIntensity: 0.9,
  fog: 0xf2c98f,
  road: 0x3a3f46,
  roadLine: 0xe8d27a,
  sidewalk: 0xcfc4ae,
  ground: 0x9db98a,
  sand: 0xe8cf9a,
  water: 0x2e7fb8,
  building: [0xf2e3c6, 0xe8b48c, 0xf6c9a0, 0xa8d0c0, 0xf0a8a0, 0xd9c9f0, 0xffe1a8, 0xc9e0a8],
  glass: 0x9fc8e8,
  player: 0x2ec4b6,
  police: 0x1c2733,
  policeLight: 0xff2233,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Landmarks, by name, in world metres. The story and the missions point at these. */
export const LANDMARKS = {
  home: { x: -196, z: -196, label: 'Safehouse' },
  garage: { x: -140, z: 140, label: "Rosa's Garage" },
  docks: { x: 196, z: 196, label: 'Solmar Docks' },
  warehouse: { x: 196, z: -140, label: 'Warehouse 7' },
  casino: { x: 28, z: -196, label: 'The Solmar Casino' },
  hospital: { x: -196, z: 140, label: 'Bay General' },
  policeStation: { x: 140, z: 196, label: 'Solmar PD' },
  boardwalk: { x: 238, z: 0, label: 'Boardwalk' },
  plaza: { x: 0, z: 0, label: 'Plaza del Sol' },
  stadium: { x: -112, z: -196, label: 'Solmar Stadium' },
  marina: { x: 268, z: -140, label: 'Solmar Marina' },
  market: { x: 84, z: 84, label: 'Mercado del Sol' },
};

/** Deterministic screenshot staging: ?shot=<name>&seed=1 (see shots.json). */
export const SHOTS = {
  start: { kind: 'start', seed: 1 },
  play: { kind: 'play', seed: 1 },
  mission: { kind: 'mission', seed: 1 },
  end: { kind: 'end', seed: 1 },
};
