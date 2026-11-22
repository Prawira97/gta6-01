// Solmar Bay — combat: the pistol and the SMG (unlocked after mission 4),
// enemy spawning and the enemy chase. Shots are a horizontal ray from the
// player along the camera aim (camYaw); a target inside the aim cone and
// the weapon's range takes damage, and every shot throws muzzle particles.
import { COMBAT } from './config.js';
import { burst, muzzle } from './effects.js';

function aimDir(world) {
  return { x: Math.cos(world.camYaw || 0), z: Math.sin(world.camYaw || 0) };
}

// Spawn `count` enemies around `at`. raiseWanted (default true) puts a
// star on the player; the sim's combat check passes false.
export function spawnEnemies(world, at, count, raiseWanted = true) {
  const rng = world.rng;
  for (let i = 0; i < count; i += 1) {
    world.enemies.push({
      x: at.x + (rng ? rng.float(-3, 3) : 0),
      z: at.z + (rng ? rng.float(-3, 3) : 0),
      hp: 100,
      speed: 3.2,
      kind: 'enemy',
      attackTimer: 0,
    });
  }
  if (raiseWanted && world.setWanted) {
    world.setWanted(Math.max(world.wanted.level, 1));
  }
  return world.enemies;
}

function rayHit(world, dir, range, cone) {
  const px = world.player.x;
  const pz = world.player.z;
  let best = null;
  let bestD = Infinity;
  const consider = (e) => {
    const dx = e.x - px;
    const dz = e.z - pz;
    const d = Math.hypot(dx, dz);
    if (d > range || d < 0.5) return;
    const dot = (dx * dir.x + dz * dir.z) / d;
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    if (angle > cone) return;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  };
  for (const e of world.enemies) consider(e);
  if (!best) {
    for (const p of world.peds) consider(p);
  }
  return best ? { target: best, dist: bestD } : null;
}

export function fireWeapon(world) {
  if (world.weaponCooldown > 0) return false;
  const weapon = world.hasSmg ? COMBAT.smg : COMBAT.pistol;
  world.weaponCooldown = weapon.rate;
  const dir = aimDir(world);
  const mx = world.player.x + dir.x * 1.2;
  const mz = world.player.z + dir.z * 1.2;
  muzzle(world, mx, mz, 1.3);
  const hit = rayHit(world, dir, weapon.range, COMBAT.aimCone);
  if (hit) {
    const t = hit.target;
    t.hp -= weapon.damage;
    burst(world, t.x, t.z, 1.2, 6, 0xff4444, 3);
    if (t.hp <= 0) {
      if (t.kind === 'enemy') {
        world.enemies = world.enemies.filter((e) => e !== t);
        world.mission.kills += 1;
        world.cash += 25;
        burst(world, t.x, t.z, 1.0, 14, 0xff6644, 5);
      } else {
        world.peds = world.peds.filter((p) => p !== t);
        if (world.setWanted) world.setWanted(Math.min(5, world.wanted.level + 1));
      }
    }
  }
  if (world.sound) world.sound(world.hasSmg ? 'smg' : 'shoot');
  return true;
}

// Enemies chase the player and swing when close. Called once per step.
export function updateEnemies(world, dt) {
  const p = world.player;
  for (const e of [...world.enemies]) {
    const dx = p.x - e.x;
    const dz = p.z - e.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.01) {
      e.x += (dx / d) * e.speed * dt;
      e.z += (dz / d) * e.speed * dt;
    }
    e.attackTimer -= dt;
    // A car is cover: enemies chase the car but cannot hit the driver.
    if (d < 2.2 && e.attackTimer <= 0 && !world.playerCar) {
      e.attackTimer = 0.8;
      world.player.hp -= 8;
      if (world.sound) world.sound('hit');
      burst(world, p.x, p.z, 1.2, 4, 0xff2222, 2);
    }
  }
}
