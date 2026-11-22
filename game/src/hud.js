// Solmar Bay — the HUD: clock, cash, rep, mission n/12, packages n/20,
// wanted stars, objective and speed, plus the message toast. Everything
// reads off the world, so a staged shot renders the same HUD every run.
import { MISSIONS } from './missions.js';

function fmtTime(t) {
  const h = Math.floor(t) % 24;
  const m = Math.floor((t - Math.floor(t)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function currentObjective(world) {
  if (world.missionIndex >= MISSIONS.length) return 'All missions complete — free roam';
  if (world.mission && world.mission.active) {
    const mission = MISSIONS[world.mission.index];
    const step = mission && mission.steps[world.mission.step];
    if (step) return `${mission.title} — ${step.text}`;
    if (mission) return mission.title;
  }
  const next = MISSIONS[world.missionIndex];
  return next ? `${next.title} — ${next.brief}` : 'Free roam';
}

export function updateHud(world, doc) {
  const set = (id, text) => {
    const el = doc.getElementById(id);
    if (el) el.textContent = text;
  };
  set('clock', fmtTime(world.time));
  set('cash', `$${world.cash}`);
  set('rep', `REP ${world.rep}`);
  set('mission', `${Math.min(world.missionIndex + 1, 12)}/12`);
  const taken = (world.collectibles || []).filter((c) => c.taken).length;
  set('pkg', `PKG ${taken}/20`);
  const stars = '★'.repeat(world.wanted.level) + '☆'.repeat(5 - world.wanted.level);
  set('wanted', stars);
  set('objective', currentObjective(world));
  const speed = world.playerCar ? Math.abs(world.playerCar.speed) * 2.237 : 0;
  set('speed', `${Math.round(speed)} mph`);
  set('weapon', world.hasSmg ? 'SMG' : 'Pistol');
  const toast = doc.getElementById('message');
  if (toast) {
    const text = world.toastText || '';
    if (world.shot) {
      // Shot mode: the toast never fades, or the frame would differ run to run.
      toast.textContent = text;
      toast.classList.toggle('hidden', text === '');
    } else {
      const fresh = text !== '' && Date.now() - (world.toastAt || 0) < 4000;
      toast.textContent = fresh ? text : '';
      toast.classList.toggle('hidden', !fresh);
    }
  }
}
