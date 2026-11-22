// Particles: sparks, smoke, muzzle puffs and pickup sparkles. The world owns the plain
// state (positions, velocities, lifetimes) and spawns them at events; this module moves
// and fades them, and draws them as one three.js Points cloud. Visual only: particles
// never change the simulation, and every random draw comes from the world's seeded
// generator so a staged screenshot stays byte-identical.
import * as THREE from 'three';

const MAX = 240;

/** Push a burst of particles into `list` (the world's array), oldest dropped past MAX. */
export function spawnBurst(list, random, x, y, z, options = {}) {
  const {
    count = 8,
    color = 0xffe9a0,
    speed = 6,
    up = 4,
    life = 0.6,
    gravity = 9,
  } = options;
  for (let i = 0; i < count; i += 1) {
    const a = random() * Math.PI * 2;
    const s = speed * (0.4 + random() * 0.8);
    list.push({
      x,
      y,
      z,
      vx: Math.cos(a) * s,
      vy: up * (0.3 + random() * 0.9),
      vz: Math.sin(a) * s,
      ttl: life * (0.6 + random() * 0.7),
      life,
      gravity,
      color,
    });
    if (list.length > MAX) list.shift();
  }
}

/** One step: move, fall, fade. Dead particles leave the list. */
export function stepParticles(list, dt) {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const p = list[i];
    p.ttl -= dt;
    if (p.ttl <= 0) {
      list.splice(i, 1);
      continue;
    }
    p.vy -= p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    if (p.y < 0.1) {
      p.y = 0.1;
      p.vy = 0;
      p.vx *= 0.8;
      p.vz *= 0.8;
    }
  }
}

/** One Points cloud for the whole game; sync() rewrites it from the world's list. */
export function createParticleCloud() {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(MAX * 3);
  const colors = new Float32Array(MAX * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.6,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const color = new THREE.Color();
  return {
    points,
    sync(list) {
      let n = 0;
      for (const p of list) {
        if (n >= MAX) break;
        positions[n * 3] = p.x;
        positions[n * 3 + 1] = p.y;
        positions[n * 3 + 2] = p.z;
        color.setHex(p.color);
        // Fade all the way to invisible: a floor leaves dead particles popping out.
        const fade = Math.max(0, p.ttl / p.life);
        colors[n * 3] = color.r * fade;
        colors[n * 3 + 1] = color.g * fade;
        colors[n * 3 + 2] = color.b * fade;
        n += 1;
      }
      geo.setDrawRange(0, n);
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}
