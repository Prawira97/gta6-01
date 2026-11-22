// Solmar Bay — the city. A 9x9 road grid with a beach and a dock, built once
// from the seeded RNG: the same seed always yields the same 95 buildings,
// the same 5 marina boats and the same landmark blocks, so a screenshot or a
// sim run is reproducible. Landmark blocks (stadium, market, casino, docks,
// vault, garage, plaza) stay clear of buildings so the missions and the
// activities always have somewhere to happen.
import { ROADS, GRID, PLACES, COLORS } from './config.js';
import { makeRng } from './random.js';

// Blocks that must stay open for gameplay, keyed by block centre.
const OPEN_BLOCKS = [
  { x: -112, z: -168, why: 'stadium' },
  { x: -56, z: 112, why: 'market' },
  { x: 0, z: -196, why: 'casino' },
  { x: 196, z: 196, why: 'docks' },
  { x: 168, z: -112, why: 'vault' },
  { x: 56, z: 56, why: 'garage' },
  { x: 0, z: 0, why: 'plaza' },
  { x: 210, z: 0, why: 'marina' },
];

function isOpenBlock(cx, cz) {
  return OPEN_BLOCKS.some((b) => Math.abs(b.x - cx) < 28 && Math.abs(b.z - cz) < 28);
}

export function buildCity(seed) {
  const rng = makeRng(seed * 7919 + 13);
  const buildings = [];
  const half = GRID.spacing / 2 - 6; // buildings stay inside their block

  for (let i = 0; i < ROADS.length - 1; i += 1) {
    for (let j = 0; j < ROADS.length - 1; j += 1) {
      const cx = (ROADS[i] + ROADS[i + 1]) / 2;
      const cz = (ROADS[j] + ROADS[j + 1]) / 2;
      if (isOpenBlock(cx, cz)) continue;
      // One or two buildings per block; downtown towers near the centre.
      const downtown = Math.abs(cx) < 90 && Math.abs(cz) < 90;
      const count = rng.chance(0.55) ? 2 : 1;
      for (let k = 0; k < count; k += 1) {
        const w = rng.range(14, 26);
        const d = rng.range(14, 26);
        const h = downtown ? rng.range(28, 64) : rng.range(10, 30);
        const ox = count === 2 ? (k === 0 ? -half / 2 : half / 2) : 0;
        const oz = count === 2 ? (k === 0 ? -half / 3 : half / 3) : 0;
        buildings.push({
          x: cx + ox,
          z: cz + oz,
          w,
          d,
          h,
          color: rng.pick(COLORS.building),
          rot: rng.chance(0.5) ? 0 : Math.PI / 2,
        });
        if (buildings.length >= 95) break;
      }
      if (buildings.length >= 95) break;
    }
    if (buildings.length >= 95) break;
  }

  // Marina: five boats moored along the east beach.
  const boats = [];
  for (let i = 0; i < 5; i += 1) {
    boats.push({
      x: PLACES.marina.x + rng.range(-4, 10),
      z: -84 + i * 42 + rng.range(-4, 4),
      heading: Math.PI / 2 + rng.range(-0.2, 0.2),
    });
  }

  return {
    buildings,
    boats,
    roads: ROADS,
    grid: GRID,
    places: PLACES,
    // The beach strip between the city edge and the water, for the renderer.
    beach: { x0: GRID.max, x1: GRID.max + 36 },
    // Market stalls and the stadium bowl are drawn from these lists.
    stalls: [
      { x: -68, z: 100 },
      { x: -56, z: 100 },
      { x: -44, z: 100 },
      { x: -68, z: 124 },
      { x: -44, z: 124 },
    ],
    stadium: { x: PLACES.stadium.x, z: PLACES.stadium.z, r: 34 },
  };
}

// Nearest road coordinate to a value (roads run both ways on the same lines).
export function nearestRoad(v) {
  let best = ROADS[0];
  for (const r of ROADS) {
    if (Math.abs(r - v) < Math.abs(best - v)) best = r;
  }
  return best;
}

// A point on the road network: snap each axis to its nearest road.
export function snapToRoad(x, z) {
  return { x: nearestRoad(x), z: nearestRoad(z) };
}

// Which block (by road index) a point sits in, for lookups and debugging.
export function blockAt(x, z) {
  let ix = 0;
  let iz = 0;
  for (let i = 0; i < ROADS.length - 1; i += 1) {
    if (x >= ROADS[i] && x < ROADS[i + 1]) ix = i;
    if (z >= ROADS[i] && z < ROADS[i + 1]) iz = i;
  }
  return { ix, iz };
}
