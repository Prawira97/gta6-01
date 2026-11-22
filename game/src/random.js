// Seeded randomness for Solmar Bay. Every random choice the world makes
// comes from one of these, so a seed rebuilds the same city, the same
// traffic and the same playthrough every time. Nothing in the game uses
// Math.random during a step.

// mulberry32: small, fast, and deterministic across engines.
export function createRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    // Re-seed the stream (a replay from the start). Returns the RNG.
    reset(s) {
      a = s >>> 0;
      return this;
    },
    // Float in [min, max).
    float(min, max) {
      return min + next() * (max - min);
    },
    // Integer in [min, max] inclusive.
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    // One element of an array.
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    // True with probability p.
    chance(p) {
      return next() < p;
    },
    // A shuffled copy of an array (Fisher-Yates).
    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
      }
      return out;
    },
  };
}
