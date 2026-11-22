// Solmar Bay — deterministic randomness. Every bit of chance in the world
// (city layout, traffic, pedestrians) flows through one seeded generator,
// so the same seed always builds the same city and the same run. Nothing in
// the simulation ever calls Math.random or Date.now.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    range(a, b) {
      return a + (b - a) * next();
    },
    int(a, b) {
      return Math.floor(a + (b - a + 1) * next());
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    // Fisher–Yates, in place, driven by this generator (never Math.random).
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    chance(p) {
      return next() < p;
    },
  };
}

// Small vector helpers on the ground plane (x, z). Pure functions, no state.
export function dist2(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

export function dist(ax, az, bx, bz) {
  return Math.sqrt(dist2(ax, az, bx, bz));
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Direction for an angle a: a = 0 faces +x (east), a = PI/2 faces -z (north).
// One convention for the player, the cars, the camera and the gun.
export function dirX(a) {
  return Math.cos(a);
}

export function dirZ(a) {
  return -Math.sin(a);
}
