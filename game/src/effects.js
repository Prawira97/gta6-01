// Solmar Bay — particles: muzzle flashes, impacts, smoke and sparks.
// A particle is a short-lived point with a velocity; the world steps them
// and the renderer draws them as small glowing quads.
export const MAX_PARTICLES = 400;

function push(world, p) {
  world.particles.push(p);
  if (world.particles.length > MAX_PARTICLES) {
    world.particles.splice(0, world.particles.length - MAX_PARTICLES);
  }
}

// A muzzle flash: a few bright sparks at the gun. Sparks fall (grav 3).
export function muzzle(world, x, z, y) {
  for (let i = 0; i < 5; i += 1) {
    push(world, {
      x, y, z,
      vx: (world.rng ? world.rng.float(-1, 1) : 0) * 2,
      vy: world.rng ? world.rng.float(0, 2) : 1,
      vz: (world.rng ? world.rng.float(-1, 1) : 0) * 2,
      life: 0.12, maxLife: 0.12,
      size: 0.35, color: 0xffcc33, grav: 3,
    });
  }
}

// A burst of `count` particles at a point (blood, sparks, smoke).
export function burst(world, x, z, y, count, color, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = world.rng ? world.rng.float(0, Math.PI * 2) : 0;
    const s = (world.rng ? world.rng.float(0.3, 1) : 0.6) * speed;
    push(world, {
      x, y, z,
      vx: Math.cos(a) * s,
      vy: world.rng ? world.rng.float(0.5, 2.5) : 1,
      vz: Math.sin(a) * s,
      life: 0.5, maxLife: 0.5,
      size: 0.25, color, grav: 3,
    });
  }
}

// Grey smoke from a wrecked car, rising and drifting. Smoke has no
// gravity: it keeps rising instead of falling back down.
export function smoke(world, x, z, y) {
  push(world, {
    x, y, z,
    vx: (world.rng ? world.rng.float(-0.3, 0.3) : 0),
    vy: 1.5,
    vz: (world.rng ? world.rng.float(-0.3, 0.3) : 0),
    life: 1.2, maxLife: 1.2,
    size: 0.8, color: 0x555555, grav: 0,
  });
}

export function updateParticles(world, dt) {
  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    const p = world.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      world.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.vy -= (p.grav ?? 3) * dt;
    if (p.y < 0.05) p.y = 0.05;
  }
}
