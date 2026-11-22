// Solmar Bay — particles: muzzle flashes, hit bursts, exhaust smoke and
// pickup sparkles. A plain array of short-lived points; the renderer draws
// them, the sim only counts them. Capped so a firefight never grows the
// array without bound.
const MAX_PARTICLES = 400;

export function spawnParticle(world, x, y, z, opts = {}) {
  if (world.particles.length >= MAX_PARTICLES) world.particles.shift();
  world.particles.push({
    x,
    y,
    z,
    vx: opts.vx ?? (world.rng.next() - 0.5) * 4,
    vy: opts.vy ?? world.rng.next() * 3,
    vz: opts.vz ?? (world.rng.next() - 0.5) * 4,
    life: opts.life ?? 0.5,
    maxLife: opts.life ?? 0.5,
    color: opts.color ?? 0xffd34d,
    size: opts.size ?? 1,
  });
}

export function spawnBurst(world, x, y, z, n, color) {
  for (let i = 0; i < n; i += 1) {
    spawnParticle(world, x, y, z, { color, life: 0.4 + world.rng.next() * 0.3 });
  }
}

// One slow grey puff, for exhaust and damage smoke.
export function spawnSmoke(world, x, y, z) {
  spawnParticle(world, x, y, z, { color: 0x888888, life: 0.8, vx: 0, vy: 1.2, vz: 0 });
}

export function updateParticles(world, dt) {
  for (const p of world.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.vy -= 6 * dt;
    if (p.y < 0) p.y = 0;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
}
