// Solmar Bay — combat: the player's gun and the enemies' return fire. The
// shot goes where the camera looks (camYaw / camPitch); a target counts as
// hit when it is inside the range and nearly straight ahead. Every shot
// leaves a muzzle particle, every hit leaves a burst, every kill pays.
import { COMBAT, REWARDS } from './config.js';
import { dist } from './random.js';
import { spawnBurst, spawnParticle } from './effects.js';

export function fireWeapon(world, input) {
  if (world.combatCooldown > 0) return;
  const rate = world.hasSmg ? COMBAT.smgRate : COMBAT.pistolRate;
  const damage = world.hasSmg ? COMBAT.smgDamage : COMBAT.pistolDamage;
  world.combatCooldown = rate;
  const yaw = world.camYaw || 0;
  const pitch = world.camPitch || 0;
  const dx = Math.cos(yaw) * Math.cos(pitch);
  const dz = -Math.sin(yaw) * Math.cos(pitch);
  const px = world.player.x + dx * 1.5;
  const pz = world.player.z + dz * 1.5;
  spawnBurst(world, px, 1.2, pz, 2, 0xffd34d);
  // A short tracer downrange so the shot reads even when it misses.
  spawnParticle(world, world.player.x + dx * 12, 1.2, world.player.z + dz * 12, {
    color: 0xffe9a8,
    life: 0.12,
    vx: 0,
    vy: 0,
    vz: 0,
  });
  if (world.sound) world.sound('shot');

  for (const enemy of world.enemies) {
    if (enemy.hp <= 0) continue;
    const ex = enemy.x - world.player.x;
    const ez = enemy.z - world.player.z;
    const d = Math.hypot(ex, ez);
    if (d > COMBAT.range || d < 0.5) continue;
    const dot = (ex * dx + ez * dz) / d;
    if (dot < COMBAT.aimCos) continue;
    enemy.hp -= damage;
    spawnBurst(world, enemy.x, 1.2, enemy.z, 4, 0xff4444);
    if (enemy.hp <= 0) {
      enemy.hp = 0;
      world.cash += REWARDS.kill;
      if (world.mission && world.mission.active) world.mission.kills += 1;
      if (world.sound) world.sound('kill');
    }
    break; // one bullet, one target
  }
}

// Armed enemies stand their ground and shoot back slowly. Unarmed ones
// (spawned with armed=false) just stand there — target practice.
export function updateEnemies(world, dt) {
  for (const enemy of world.enemies) {
    if (enemy.hp <= 0) continue;
    enemy.shootTimer = (enemy.shootTimer ?? 1) - dt;
    if (!enemy.armed || enemy.shootTimer > 0) continue;
    const d = dist(enemy.x, enemy.z, world.player.x, world.player.z);
    if (d > 32) continue;
    enemy.shootTimer = 1.5;
    world.player.hp -= 5;
    spawnBurst(world, world.player.x, 1.2, world.player.z, 3, 0xffaa00);
    if (world.sound) world.sound('hurt');
  }
  world.enemies = world.enemies.filter((e) => e.hp > 0);
}
