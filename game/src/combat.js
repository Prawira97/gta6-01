// Combat: hitscan shooting. A shot is a 3D ray from the shooter's eye; the first person or
// car circle it crosses within range and below head height is hit. Damage, tracers and
// muzzle flashes are plain data the world owns; the renderer draws them.
import { WEAPONS } from './config.js';

/**
 * Cast a ray against people and cars. `targets` are {x, z, radius, height, ref}.
 * Returns {ref, dist, point} for the nearest hit, or null.
 */
export function raycastHit(origin, dir, targets) {
  let best = null;
  for (const t of targets) {
    const dx = t.x - origin.x;
    const dz = t.z - origin.z;
    const along = dx * dir.x + dz * dir.z;
    if (along < 0 || along > WEAPONS.pistol.range) continue;
    const px = origin.x + dir.x * along;
    const pz = origin.z + dir.z * along;
    const miss = Math.hypot(t.x - px, t.z - pz);
    if (miss > t.radius) continue;
    const y = origin.y + dir.y * along;
    if (y < 0 || y > t.height) continue;
    if (!best || along < best.dist) {
      best = { ref: t.ref, dist: along, point: { x: px, y, z: pz } };
    }
  }
  return best;
}

/** Apply one shot from `shooter` (with a weapon key) along `dir`. Returns the hit or null. */
export function fireShot(shooter, dir, weaponKey, targets, random) {
  const weapon = WEAPONS[weaponKey];
  const origin = { x: shooter.x, y: shooter.eyeY ?? 1.6, z: shooter.z };
  const spread = weapon.spread;
  const d = {
    x: dir.x + (random() - 0.5) * spread * 2,
    y: dir.y + (random() - 0.5) * spread * 2,
    z: dir.z + (random() - 0.5) * spread * 2,
  };
  const len = Math.hypot(d.x, d.y, d.z) || 1;
  d.x /= len;
  d.y /= len;
  d.z /= len;
  return raycastHit(origin, d, targets);
}
