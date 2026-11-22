// Solmar Bay — the city: a 9x9 street grid, 95 buildings, a marina with
// 5 boats, and the named landmarks. Everything is built from the seeded
// RNG, so a seed rebuilds the same city. Streets are the multiples of
// BLOCK; buildings live inside blocks, never on a street, so every named
// place stays reachable.
import { WORLD, LOCATIONS } from './config.js';

const STREETS = WORLD.STREETS;
const BLOCK = WORLD.BLOCK;

// Snap a coordinate to its nearest street line.
export function nearestStreet(v) {
  let best = STREETS[0];
  for (const s of STREETS) if (Math.abs(v - s) < Math.abs(v - best)) best = s;
  return best;
}

// Clamp a point into the playable city.
export function clampToCity(x, z) {
  const b = WORLD.BOUND;
  return {
    x: Math.max(-b, Math.min(b, x)),
    z: Math.max(-b, Math.min(b, z)),
  };
}

// A Manhattan route along the streets from `from` to `to`: snap both ends
// to the grid, drive along one axis, then the other. Returns waypoints the
// car follows in order; the last one is the destination.
export function gridPath(from, to) {
  const sx = nearestStreet(from.x);
  const sz = nearestStreet(from.z);
  const tx = nearestStreet(to.x);
  const tz = nearestStreet(to.z);
  const points = [{ x: sx, z: sz }];
  if (sx !== tx && sz !== tz) points.push({ x: tx, z: sz });
  if (tx !== points[points.length - 1].x || tz !== points[points.length - 1].z) {
    points.push({ x: tx, z: tz });
  }
  // End exactly at the destination, not just its nearest street: a target
  // inside an open block (the docks) sits off the grid, and a route that
  // stops at the nearest street never reaches it.
  const last = points[points.length - 1];
  if (last.x !== to.x || last.z !== to.z) {
    points.push({ x: to.x, z: to.z });
  }
  return points;
}

function overlaps(a, b, margin = 2) {
  return (
    Math.abs(a.x - b.x) * 2 < a.w + b.w + margin * 2 &&
    Math.abs(a.z - b.z) * 2 < a.d + b.d + margin * 2
  );
}

const PALETTE = [
  0x8a7f70, 0x7a6f63, 0x9a8f80, 0x6f7a80, 0x80806a,
  0xa08a70, 0x75685a, 0x8a8078, 0x6a7078, 0x94805e,
];

export function buildCity(rng) {
  const buildings = [];
  // Block centres: the squares between streets.
  const centres = [];
  for (let i = 0; i < 8; i += 1) {
    for (let j = 0; j < 8; j += 1) {
      centres.push({ x: -196 + i * BLOCK, z: -196 + j * BLOCK });
    }
  }
  // Blocks kept open: the plaza (four central blocks), the casino block,
  // the garage block, the vault block and the docks block. Landmarks and
  // mission targets live there instead, so every named place is reachable.
  // (Block centres are the odd multiples of 28: -196, -140, -84, -28, 28,
  // 84, 140, 196 — so the garage block is (-28,140) and the vault block
  // is (196,-196), not the street points the landmarks sit on.)
  const open = (cx, cz) => {
    if (Math.hypot(cx, cz) < 70) return true; // plaza
    if (cx === 28 && cz === -196) return true; // casino
    if (cx === -28 && cz === 140) return true; // garage
    if (cx === 196 && cz === -196) return true; // vault
    if (cx === 196 && cz === 196) return true; // docks
    return false;
  };
  const downtown = (cx, cz) => Math.hypot(cx, cz) <= 112;

  // One building per block, in the block's north half; a second building
  // goes in the south half below. The split keeps the two apart and both
  // clear of the streets.
  for (const c of centres) {
    if (open(c.x, c.z)) continue;
    const tall = downtown(c.x, c.z);
    const w = rng.float(20, 32);
    const d = rng.float(14, 20);
    const h = tall ? rng.float(26, 60) : rng.float(9, 24);
    buildings.push({
      x: c.x + rng.float(-4, 4), z: c.z - 10, w, d, h,
      color: rng.pick(PALETTE),
      kind: tall ? 'tower' : 'house',
    });
  }

  // Deliberate landmarks, counted as buildings. The vault sits in its
  // block's centre, clear of the streets; the garage sits south in its
  // block so the repair point (-28,112) stays clear.
  buildings.push({
    x: 196, z: -196, w: 18, d: 18, h: 18,
    color: 0x5a5a66, kind: 'vault',
  });
  buildings.push({
    x: -38, z: 128, w: 20, d: 14, h: 7,
    color: 0x7a5a3a, kind: 'garage',
  });

  // Second buildings: 37 of the blocks get a second, smaller building in
  // the block's south half. 56 first + 2 landmarks + 37 second = 95.
  // (shuffle returns a copy; the original order would cluster them.)
  const blocks = centres.filter((c) => !open(c.x, c.z));
  const shuffled = rng.shuffle(blocks);
  for (let i = 0; i < 37 && i < shuffled.length; i += 1) {
    const c = shuffled[i];
    buildings.push({
      x: c.x + rng.float(-4, 4),
      z: c.z + 12,
      w: rng.float(18, 28),
      d: rng.float(14, 18),
      h: rng.float(7, 16),
      color: rng.pick(PALETTE),
      kind: 'shop',
    });
  }

  // Marina boats, east edge in the water.
  const boats = [];
  for (let i = 0; i < 5; i += 1) {
    boats.push({
      x: 258 + rng.float(-4, 4),
      z: -112 + i * 56 + rng.float(-6, 6),
      heading: rng.float(-0.2, 0.2),
      len: rng.float(9, 14),
    });
  }

  return {
    buildings,
    boats,
    streets: STREETS,
    landmarks: {
      plaza: { ...LOCATIONS.plaza },
      casino: { ...LOCATIONS.casino },
      docks: { ...LOCATIONS.docks },
      stadium: { ...LOCATIONS.stadium },
      market: { ...LOCATIONS.market },
      garage: { ...LOCATIONS.garage },
      vault: { ...LOCATIONS.vault },
      marina: { ...LOCATIONS.marina },
    },
  };
}
