// Solmar Bay — the HUD: cash, objective, speed, wanted stars, clock,
// mission progress, package count, activity timers, messages, and the
// minimap. Plain DOM + a 2D canvas, updated once per frame from the world.
// Element ids must match game/index.html.
import { GRID, ROADS } from './config.js';
import { MISSIONS } from './missions.js';

function fmtClock(dayTime) {
  const h = Math.floor(dayTime) % 24;
  const m = Math.floor((dayTime - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function drawMinimap(world) {
  const canvas = document.getElementById('minimap');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const S = canvas.width;
  const toMap = (v) => ((v - GRID.min) / (GRID.max - GRID.min)) * S;
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = '#0e1a24';
  ctx.fillRect(0, 0, S, S);
  // Roads.
  ctx.strokeStyle = '#3a4a58';
  ctx.lineWidth = 2;
  for (const r of ROADS) {
    ctx.beginPath();
    ctx.moveTo(toMap(r), 0);
    ctx.lineTo(toMap(r), S);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, toMap(r));
    ctx.lineTo(S, toMap(r));
    ctx.stroke();
  }
  // Remaining packages.
  ctx.fillStyle = '#ffd34d';
  for (const pack of world.collectibles) {
    if (pack.taken) continue;
    ctx.fillRect(toMap(pack.x) - 1, toMap(pack.z) - 1, 2, 2);
  }
  // Mission target: a gold star on the current step's destination.
  if (world.mission.active && world.mission.index >= 0) {
    const mission = MISSIONS[world.mission.index];
    const step = mission && mission.steps[world.mission.step];
    const target = step && (step.at || step.dest || (step.points && step.points[world.mission.checkpoint]));
    if (target) {
      ctx.fillStyle = '#ffd34d';
      const tx = toMap(target.x);
      const tz = toMap(target.z);
      ctx.beginPath();
      ctx.arc(tx, tz, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0e1a24';
      ctx.font = 'bold 7px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', tx, tz + 0.5);
    }
  }
  // Race checkpoints / courier drops while an activity runs.
  ctx.fillStyle = '#37d67a';
  if (world.activities.race.state === 'running') {
    for (const p of world.activities.race.points) {
      ctx.beginPath();
      ctx.arc(toMap(p.x), toMap(p.z), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#ff9f2e';
  if (world.activities.courier.state === 'running') {
    for (const p of world.activities.courier.drops) {
      ctx.fillRect(toMap(p.x) - 2, toMap(p.z) - 2, 4, 4);
    }
  }
  // Police.
  ctx.fillStyle = '#4d8dff';
  for (const car of world.policeCars) {
    ctx.beginPath();
    ctx.arc(toMap(car.x), toMap(car.z), 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const cop of world.cops) {
    ctx.fillRect(toMap(cop.x) - 1.5, toMap(cop.z) - 1.5, 3, 3);
  }
  // The player, as a triangle pointing along the heading.
  const px = toMap(world.player.x);
  const pz = toMap(world.player.z);
  const a = world.player.heading;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(px + Math.cos(a) * 5, pz - Math.sin(a) * 5);
  ctx.lineTo(px + Math.cos(a + 2.6) * 4, pz - Math.sin(a + 2.6) * 4);
  ctx.lineTo(px + Math.cos(a - 2.6) * 4, pz - Math.sin(a - 2.6) * 4);
  ctx.closePath();
  ctx.fill();
}

export function updateHud(world) {
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set('cash', `$${Math.round(world.cash)}`);
  set('objective', world.objective());
  const speed = world.playerCar ? Math.abs(world.playerCar.speed) * 3.6 : 0;
  set('speed', `${Math.round(speed)} km/h`);
  set('wanted', '★'.repeat(world.wanted.level) + '☆'.repeat(5 - world.wanted.level));
  set('clock', fmtClock(world.dayTime));
  set('mission-progress', `${world.missionIndex}/12`);
  set('pkg', `PKG ${world.packagesCollected}/20`);
  const race = world.activities.race;
  set(
    'race-timer',
    race.state === 'running'
      ? `Race ${Math.max(0, 120 - race.t).toFixed(0)}s ${race.idx}/${race.points.length}`
      : race.best != null
        ? `Race best ${race.best.toFixed(1)}s`
        : '',
  );
  const courier = world.activities.courier;
  set('courier-timer', courier.state === 'running' ? `Courier ${courier.idx}/${courier.drops.length}` : '');
  const msg = world.lastMessage || '';
  set('message', msg);
  const hp = document.getElementById('hp');
  if (hp) hp.style.width = `${Math.max(0, Math.round(world.player.hp))}%`;
  const dmg = world.playerCar ? world.playerCar.damage : 0;
  set('car-damage', world.playerCar ? `Damage ${Math.round(dmg)}%` : '');
  drawMinimap(world);
}
