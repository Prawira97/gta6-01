// The HUD: a thin DOM layer over the world state. It only writes text when a value
// actually changed, so it stays cheap at 60 fps. All ids live in index.html.
import { MISSIONS } from './missions.js';
import { DAY_LENGTH, STEP, WANTED, WEAPONS } from './config.js';

function $(id) {
  return document.getElementById(id);
}

export function createHud() {
  const els = {
    cash: $('cash'),
    rep: $('rep'),
    hpFill: $('hp-fill'),
    stars: $('stars'),
    objective: $('objective'),
    objectiveDist: $('objective-dist'),
    speed: $('speed'),
    weapon: $('weapon'),
    message: $('message'),
    crosshair: $('crosshair'),
    hint: $('hint'),
    screenTitle: $('screen-title'),
    screenSub: $('screen-sub'),
    missionBanner: $('mission-banner'),
    missionBannerTitle: $('mission-banner-title'),
    missionBannerText: $('mission-banner-text'),
    clock: $('clock'),
    packages: $('packages'),
  };
  const last = {};
  let messageTimer = 0;
  let bannerTimer = 0;

  function setText(el, key, value) {
    if (last[key] !== value) {
      last[key] = value;
      if (el) el.textContent = value;
    }
  }

  return {
    /** One message line that fades after a few seconds. */
    message(text, seconds = 4) {
      setText(els.message, 'message', text);
      messageTimer = seconds;
    },
    /** A big mission banner (mission started / completed). */
    banner(title, text, seconds = 5) {
      if (els.missionBanner) {
        els.missionBannerTitle.textContent = title;
        els.missionBannerText.textContent = text;
        els.missionBanner.classList.add('show');
      }
      bannerTimer = seconds;
    },
    /** Paint the HUD from the world, once per frame. */
    update(world, screen, dt) {
      if (messageTimer > 0) {
        messageTimer -= dt;
        if (messageTimer <= 0 && els.message) els.message.textContent = '';
      }
      if (bannerTimer > 0) {
        bannerTimer -= dt;
        if (bannerTimer <= 0 && els.missionBanner) els.missionBanner.classList.remove('show');
      }
      const inGame = screen === 'play';
      setText(els.cash, 'cash', `$${Math.floor(world.cash).toLocaleString('en-US')}`);
      setText(els.rep, 'rep', `REP ${world.rep}`);
      if (els.packages) {
        const found = world.collectibles.filter((c) => c.taken).length;
        setText(els.packages, 'packages', `PKG ${found}/${world.collectibles.length}`);
      }
      if (els.hpFill) els.hpFill.style.width = `${Math.max(0, world.player.hp)}%`;
      const wanted = '★'.repeat(world.wanted.level) + '☆'.repeat(WANTED.max - world.wanted.level);
      setText(els.stars, 'stars', wanted);
      if (els.stars) els.stars.classList.toggle('hot', world.wanted.level >= 3);
      const objective = world.__objective;
      if (objective && objective.at) {
        const d = Math.hypot(objective.at.x - world.player.x, objective.at.z - world.player.z);
        setText(els.objective, 'objective', objective.text);
        setText(els.objectiveDist, 'objective-dist', `${Math.round(d)}m`);
      } else {
        const def = world.mission && world.mission.active ? MISSIONS[world.mission.index] : null;
        setText(els.objective, 'objective', def ? def.title : 'Free roam');
        setText(els.objectiveDist, 'objective-dist', '');
      }
      const speed = world.playerCar
        ? Math.round(Math.abs(world.playerCar.speed) * 3.6)
        : Math.round(world.player.speed * 3.6);
      setText(els.speed, 'speed', `${speed} km/h`);
      const weapon = WEAPONS[world.player.weapon] || WEAPONS.pistol;
      const ammo = world.playerCar ? '—' : `${world.player.ammo} / ${weapon.mag}`;
      setText(els.weapon, 'weapon', `${weapon.name} ${ammo}`);
      if (els.crosshair) {
        els.crosshair.style.display = inGame && !world.playerCar ? 'block' : 'none';
      }
      if (els.hint) {
        let hint = '';
        if (inGame && world.nearCar) hint = 'E — enter car';
        else if (inGame && world.playerCar) hint = 'E — exit car · Shift — handbrake';
        if (inGame && world.nearActivity === 'race') hint = 'F — start street race';
        else if (inGame && world.nearActivity === 'courier') hint = 'F — start courier gig';
        setText(els.hint, 'hint', hint);
      }
      if (els.clock) {
        const hours = (8 + (world.time / DAY_LENGTH) * 24) % 24;
        const hh = Math.floor(hours);
        const mm = Math.floor((hours - hh) * 60);
        setText(els.clock, 'clock', `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
      }
      if (els.screenTitle) {
        const [title, sub] = screen === 'over'
          ? (world.endState === 'busted' ? ['BUSTED', 'The Solmar Bay PD caught you.'] : ['WASTED', 'The streets of Solmar Bay claimed you.'])
          : ['', ''];
        setText(els.screenTitle, 'screen-title', title);
        setText(els.screenSub, 'screen-sub', sub);
      }
      // Step indicator under the objective: mission step + progress, race/courier clocks.
      const stepEl = $('mission-step');
      if (stepEl) {
        let line = '';
        if (world.mission && world.mission.active) {
          const def = MISSIONS[world.mission.index];
          const step = def ? def.steps[world.mission.step] : null;
          const timed = step && ['escape', 'timed', 'race'].includes(step.type) && world.mission.timer > 0;
          const timer = timed ? ` · ${Math.ceil(world.mission.timer)}s` : '';
          line = step && step.text ? `▸ ${step.text} — ${world.mission.index + 1}/${MISSIONS.length}${timer}` : '';
        } else if (world.activities.race.state === 'running') {
          const race = world.activities.race;
          line = `Race checkpoint ${race.idx + 1}/${race.points.length} · ${Math.ceil(race.timer)}s`;
        } else if (world.activities.courier.state === 'running') {
          const courier = world.activities.courier;
          line = `Courier drop ${courier.idx + 1}/${courier.drops.length} · ${Math.ceil(courier.timer)}s`;
        }
        setText(stepEl, 'mission-step', line);
      }
    },
  };
}
