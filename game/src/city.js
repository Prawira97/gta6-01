// The city of Solmar Bay: a seeded 9x9 road grid with building plots, landmark plots,
// collision boxes, trees, lamps and collectible spots. Everything the simulation needs is
// plain data here; render.js turns it into three.js meshes.
import { CITY, COLLECTIBLES, LANDMARKS, PALETTE } from './config.js';
import { pick, range } from './random.js';

/** Block (i, j) centre in world metres. i, j in 0..7. */
export function blockCentre(i, j) {
  return { x: -CITY.half + (i + 0.5) * CITY.pitch, z: -CITY.half + (j + 0.5) * CITY.pitch };
}

/** Road centre lines, -224 .. 224. */
export function roadLines() {
  const lines = [];
  for (let i = 0; i < CITY.roads; i += 1) lines.push(-CITY.half + i * CITY.pitch);
  return lines;
}

/** The nearest point on a road centre line to (x, z). */
export function nearestRoadPoint(x, z) {
  const lines = roadLines();
  let bx = lines[0];
  let bz = lines[0];
  for (const line of lines) {
    if (Math.abs(line - x) < Math.abs(bx - x)) bx = line;
    if (Math.abs(line - z) < Math.abs(bz - z)) bz = line;
  }
  // Snap to the closer of the two crossings: keep the axis that is already near a road.
  if (Math.abs(bx - x) < Math.abs(bz - z)) return { x: bx, z };
  return { x, z: bz };
}

/** A random intersection (a road crossing) from the seeded generator. */
export function randomIntersection(random) {
  const lines = roadLines();
  return { x: pick(random, lines), z: pick(random, lines) };
}

/** The road-line coordinate nearest to a value. */
export function nearestLine(v) {
  const lines = roadLines();
  let best = lines[0];
  for (const l of lines) if (Math.abs(l - v) < Math.abs(best - v)) best = l;
  return best;
}

/** Nearest road intersection to a point. */
export function nearestIntersection(p) {
  return { x: nearestLine(p.x), z: nearestLine(p.z) };
}

/** Manhattan road path from `from` to `to`: nearest intersections, x-leg then z-leg.
 * Every leg runs straight along a road, so a car following it never cuts a block.
 * The last point is the real destination: landmark blocks are open ground, so the
 * final short leg into the block is clear. */
export function gridPath(from, to) {
  const a = nearestIntersection(from);
  const b = nearestIntersection(to);
  const points = [{ x: a.x, z: a.z }];
  if (a.x !== b.x) points.push({ x: b.x, z: a.z });
  if (a.z !== b.z) points.push({ x: b.x, z: b.z });
  const last = points[points.length - 1];
  if (last.x !== to.x || last.z !== to.z) points.push({ x: to.x, z: to.z });
  return points;
}

/** A random point on a sidewalk (just off a road) from the seeded generator. */
export function randomSidewalkPoint(random) {
  const lines = roadLines();
  const along = pick(random, lines);
  const across = pick(random, lines) + (random() < 0.5 ? -1 : 1) * (CITY.roadWidth / 2 + 1.5);
  if (random() < 0.5) return { x: along, z: Math.max(-CITY.half, Math.min(CITY.half, across)) };
  return { x: Math.max(-CITY.half, Math.min(CITY.half, across)), z: along };
}

const RESERVED = {
  '0,0': 'home',
  '1,6': 'garage',
  '7,7': 'docks',
  '7,1': 'warehouse',
  '4,0': 'casino',
  '0,6': 'hospital',
  '6,7': 'policeStation',
  '3,3': 'plaza',
  '4,3': 'plaza',
  '3,4': 'plaza',
  '4,4': 'plaza',
  '2,0': 'stadium',
  '5,5': 'market',
};

export function buildCity(seed) {
  const random = (() => {
    let a = seed | 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();

  const buildings = [];
  const colliders = [];
  const trees = [];
  const lamps = [];

  function addBuilding(x, z, w, d, h, color) {
    buildings.push({ x, z, w, d, h, color });
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }

  for (let i = 0; i < 8; i += 1) {
    for (let j = 0; j < 8; j += 1) {
      const key = `${i},${j}`;
      if (RESERVED[key]) continue;
      const c = blockCentre(i, j);
      const distCentre = Math.hypot(c.x, c.z);
      const tall = 1 + Math.max(0, 1 - distCentre / 320) * 2.0;
      const count = random() < 0.55 ? 1 : 2;
      for (let b = 0; b < count; b += 1) {
        const w = range(random, 14, 26);
        const d = range(random, 14, 26);
        const h = range(random, 8, 20) * tall + (random() < 0.08 ? 26 : 0);
        const ox = count === 1 ? 0 : (b === 0 ? -9 : 9);
        const oz = count === 1 ? 0 : (b === 0 ? 9 : -9);
        addBuilding(c.x + ox, c.z + oz, w, d, Math.min(h, 72), pick(random, PALETTE.building));
      }
      // A tree or two on most blocks, and a lamp on the corner.
      if (random() < 0.7) trees.push({ x: c.x + range(random, -16, 16), z: c.z + range(random, -16, 16), s: range(random, 0.8, 1.3) });
      lamps.push({ x: c.x - 20, z: c.z - 20 });
    }
  }

  // Landmark structures: big, named, collidable.
  const landmarkStructures = [
    { name: 'garage', x: LANDMARKS.garage.x, z: LANDMARKS.garage.z, w: 30, d: 18, h: 9, color: '#e8b48c' },
    { name: 'warehouse', x: LANDMARKS.warehouse.x, z: LANDMARKS.warehouse.z, w: 34, d: 22, h: 12, color: '#b8a888' },
    { name: 'casino', x: LANDMARKS.casino.x, z: LANDMARKS.casino.z, w: 30, d: 24, h: 22, color: '#f0a8a0' },
    { name: 'hospital', x: LANDMARKS.hospital.x, z: LANDMARKS.hospital.z, w: 28, d: 20, h: 18, color: '#f2e3c6' },
    { name: 'policeStation', x: LANDMARKS.policeStation.x, z: LANDMARKS.policeStation.z, w: 26, d: 18, h: 14, color: '#a8c8d8' },
    { name: 'home', x: LANDMARKS.home.x, z: LANDMARKS.home.z, w: 16, d: 12, h: 8, color: '#c9e0a8' },
    { name: 'stadium', x: LANDMARKS.stadium.x, z: LANDMARKS.stadium.z, w: 44, d: 30, h: 10, color: '#7ab8c9' },
  ];
  for (const s of landmarkStructures) addBuilding(s.x, s.z, s.w, s.d, s.h, s.color);

  // Market stalls around Mercado del Sol.
  const stallColors = ['#e84a5f', '#e8a13a', '#50c878', '#4a90d8', '#9a6ad8', '#e8e8e8'];
  for (let k = 0; k < 6; k += 1) {
    const a = (k / 6) * Math.PI * 2;
    addBuilding(LANDMARKS.market.x + Math.cos(a) * 14, LANDMARKS.market.z + Math.sin(a) * 14, 5, 5, 3.5, stallColors[k]);
  }

  // Dock crates on the docks plot.
  for (let k = 0; k < 6; k += 1) {
    const x = LANDMARKS.docks.x - 12 + (k % 3) * 12;
    const z = LANDMARKS.docks.z - 8 + Math.floor(k / 3) * 12;
    addBuilding(x, z, 8, 8, 5 + (k % 2) * 3, k % 2 ? '#c96a4a' : '#4a7a9a');
  }
  // Fountain in the plaza (a low round collider, approximated as a square).
  colliders.push({ minX: -4, maxX: 4, minZ: -4, maxZ: 4 });

  // Palms along the beach and the boardwalk.
  for (let z = -220; z <= 220; z += 28) {
    trees.push({ x: 244 + (random() < 0.5 ? 0 : 6), z, s: range(random, 1.1, 1.6), palm: true });
  }
  // A few palms around the plaza.
  for (let k = 0; k < 8; k += 1) {
    const a = (k / 8) * Math.PI * 2;
    trees.push({ x: Math.cos(a) * 16, z: Math.sin(a) * 16, s: 1.2, palm: true });
  }

  // Collectible spots: rooftops' worth of gold, spread over the city.
  const collectibleSpots = [];
  const seen = new Set();
  while (collectibleSpots.length < COLLECTIBLES) {
    const p = randomSidewalkPoint(random);
    const key = `${Math.round(p.x / 10)},${Math.round(p.z / 10)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    collectibleSpots.push(p);
  }

  // Docked boats in the marina, east of the boardwalk — in the water past the beach.
  const boats = [];
  for (let k = 0; k < 5; k += 1) {
    boats.push({ x: CITY.waterX + 36 + (k % 2) * 22, z: LANDMARKS.marina.z - 20 + k * 72, heading: Math.PI / 2, len: 14 + (k % 2) * 6 });
  }

  return {
    seed,
    buildings,
    colliders,
    trees,
    lamps,
    collectibleSpots,
    boats,
    landmarks: LANDMARKS,
    ground: CITY.ground,
    beachX: CITY.beachX,
    waterX: CITY.waterX,
  };
}
