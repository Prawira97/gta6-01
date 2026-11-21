// The world: everything the game simulates, in plain numbers. The player on foot and in a
// car, traffic, pedestrians, police, enemies, missions, taxi fares, collectibles, the wanted
// level, cash and reputation. The renderer only paints this state; the HUD only reads it.
import { CAR, LANDMARKS, PLAYER, STEP, WANTED, WEAPONS } from './config.js';
import { buildCity, nearestRoadPoint, randomIntersection, randomSidewalkPoint } from './city.js';
import { createRandom, range } from './random.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_INTERACT, ACTION_PAUSE, ACTION_RELOAD, ACTION_WEAPON } from './input.js';
import { createCarState, collideCircle, recolorCar, separateCars, stepCarPhysics, stepTraffic } from './vehicles.js';
import { createPedState, stepPed } from './people.js';
import { addCrime, createWanted, spawnFootCop, spawnPoliceCar, stepFootCop, stepPoliceCar, stepWanted, wantedCarCount } from './police.js';
import { fireShot } from './combat.js';
import { createMissionState, currentObjective, startMission, updateMission } from './missions.js';
import { hasSave, loadSave, saveGame } from './save.js';

const TAU = Math.PI * 2;

function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return a + d * Math.min(1, t);
}

export function createWorld(options = {}) {
  const seed = options.seed ?? Math.floor(Math.random() * 2 ** 31);
  const saved = options.shot ? null : loadSave();
  const random = createRandom(seed);
  const city = buildCity(seed);
  const world = {
    seed,
    random,
    city,
    time: 0,
    cash: saved?.cash ?? 500,
    rep: saved?.rep ?? 0,
    missionIndex: saved?.missionIndex ?? 0,
    completed: saved?.completed ?? [],
    hasSmg: saved?.hasSmg ?? false,
    player: {
      x: saved?.player?.x ?? LANDMARKS.home.x,
      z: saved?.player?.z ?? LANDMARKS.home.z,
      heading: 0,
      speed: 0,
      hp: PLAYER.health,
      weapon: 'pistol',
      ammo: WEAPONS.pistol.mag,
      reloading: 0,
      lastShot: -9,
      lastDamage: -99,
      phase: 0,
      eyeY: 1.6,
    },
    camYaw: 0,
    camPitch: 0.38,
    camDist: 10,
    camIdle: 0,
    playerCar: null,
    cars: [],
    peds: [],
    cops: [],
    enemies: [],
    policeCars: [],
    wanted: createWanted(),
    mission: createMissionState(),
    targetCar: null,
    tracers: [],
    messages: [],
    collectibles: [],
    taxi: { state: 'idle', passenger: null, dest: null, timer: 0, fare: 0, cooldown: 20 },
    endState: null,
    missionDelay: 0,
    kills: 0,
  };

  // Shot staging never touches the player's real save.
  world.shotMode = !!options.shot;

  // Traffic cars on the roads.
  for (let i = 0; i < 14; i += 1) {
    const p = randomIntersection(random);
    const kind = random() < 0.12 ? 'taxi' : (random() < 0.25 ? 'coupe' : 'sedan');
    const car = createCarState(city, random, kind, p.x, p.z, range(random, 0, TAU));
    car.route = [randomIntersection(random)];
    world.cars.push(car);
  }
  // Parked cars along the roads, facing along the road so they can pull straight out.
  for (let i = 0; i < 8; i += 1) {
    const p = randomSidewalkPoint(random);
    const snapped = nearestRoadPoint(p.x, p.z);
    const vertical = snapped.z === p.z; // x was snapped: the road runs along z
    const side = random() < 0.5 ? -1 : 1;
    const curb = 8.5;
    const x = vertical ? snapped.x + side * curb : snapped.x;
    const z = vertical ? snapped.z : snapped.z + side * curb;
    const heading = vertical
      ? (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2)
      : (random() < 0.5 ? 0 : Math.PI);
    const car = createCarState(city, random, 'sedan', x, z, heading);
    car.driver = null;
    world.cars.push(car);
  }
  // Pedestrians on the sidewalks.
  for (let i = 0; i < 24; i += 1) world.peds.push(createPedState(city, random));
  // Collectibles at the city's spots.
  for (const spot of city.collectibleSpots) {
    world.collectibles.push({ x: spot.x, z: spot.z, taken: (saved?.collectibles ?? []).includes(`${Math.round(spot.x)},${Math.round(spot.z)}`), angle: 0 });
  }

  world.mission.index = world.missionIndex;
  if (world.missionIndex < 6) {
    startMission(world.mission, world.missionIndex, missionFacade(world));
  } else {
    world.mission.active = false;
  }

  // Convenience methods the main loop and the shot stager use.
  world.__objective = objectiveOf(world);
  world.nearCar = null;
  world.hasSave = () => hasSave();
  world.startMission = (index) => startMission(world.mission, index, missionFacade(world));
  world.setWanted = (level) => { world.wanted.level = level; world.wanted.heat = 20; };
  world.enterCar = () => enterCar(world);
  world.exitCar = () => exitCar(world);
  world.spawnPoliceCar = () => {
    const car = spawnPoliceCar(world.city, world.random, world.player);
    world.policeCars.push(car);
    world.cars.push(car);
    return car;
  };
  world.damagePlayer = (amount) => damagePlayer(world, amount);
  world.respawn = (kind) => respawn(world, kind);
  world.save = () => saveGame(world);
  return world;
}

/** The small facade the mission runner talks to. */
function missionFacade(world) {
  return {
    get player() { return world.player; },
    get inCar() { return world.playerCar !== null; },
    get targetCar() { return world.targetCar; },
    get playerCar() { return world.playerCar; },
    get dt() { return STEP; },
    spawnEnemies: (at, count, boss) => spawnEnemies(world, at, count, boss),
    setWanted: (n) => { world.wanted.level = n; world.wanted.heat = 20; },
    message: (text) => addMessage(world, text),
    sound: (name) => { world.pendingSound = name; },
  };
}

function addMessage(world, text) {
  world.messages.push({ text, until: world.time + 6 });
  if (world.messages.length > 4) world.messages.shift();
}

export function spawnEnemies(world, at, count, boss) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * TAU + world.random() * 0.5;
    const dist = 8 + world.random() * 14;
    const enemy = createPedState(world.city, world.random, 'enemy');
    enemy.x = at.x + Math.cos(angle) * dist;
    enemy.z = at.z + Math.sin(angle) * dist;
    enemy.hp = boss && i === 0 ? 300 : 100;
    enemy.boss = boss && i === 0;
    enemy.state = 'guard';
    enemy.lastShot = 0;
    world.enemies.push(enemy);
  }
}

function ensureTargetCar(world) {
  if (world.targetCar) return;
  const car = createCarState(world.city, world.random, 'sedan', LANDMARKS.casino.x + 24, LANDMARKS.casino.z + 8, 0);
  recolorCar(car, 0xe8c93a);
  car.driver = null;
  world.cars.push(car);
  world.targetCar = car;
}

function nearestCar(world, x, z, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of world.cars) {
    const d = Math.hypot(car.x - x, car.z - z);
    if (d < bestD) { best = car; bestD = d; }
  }
  return best;
}

function damagePlayer(world, amount) {
  const p = world.player;
  p.hp -= amount;
  p.lastDamage = world.time;
  if (p.hp <= 0) {
    p.hp = 0;
    world.endState = 'wasted';
  }
}

function respawn(world, kind) {
  const loss = Math.max(WANTED.bustedMinLoss, Math.floor(world.cash * WANTED.bustedCashLoss));
  world.cash = Math.max(0, world.cash - loss);
  const spot = kind === 'wasted' ? LANDMARKS.hospital : LANDMARKS.policeStation;
  world.player.x = spot.x;
  world.player.z = spot.z;
  world.player.hp = PLAYER.health;
  world.playerCar = null;
  world.wanted.level = 0;
  world.wanted.heat = 0;
  world.enemies = [];
  world.cops = [];
  for (const car of world.policeCars) {
    const i = world.cars.indexOf(car);
    if (i >= 0) world.cars.splice(i, 1);
  }
  world.policeCars = [];
  world.endState = null;
  addMessage(world, `${kind === 'wasted' ? 'Wasted' : 'Busted'} — lost $${loss}.`);
  saveGame(world);
}

function enterCar(world) {
  const p = world.player;
  const car = nearestCar(world, p.x, p.z, 4.5);
  if (!car) return;
  if (car.driver === 'npc' || car.driver === 'police') {
    // Pull the driver out: they flee on foot, and stealing a car is a crime.
    const driver = createPedState(world.city, world.random, car.driver === 'police' ? 'cop' : 'ped');
    driver.x = car.x + 3;
    driver.z = car.z + 3;
    driver.fleeUntil = world.time + 6;
    world.peds.push(driver);
    addCrime(world.wanted, 1);
    addMessage(world, 'Car stolen! The cops saw that.');
  }
  car.driver = 'player';
  world.playerCar = car;
  world.pendingSound = 'click';
}

function exitCar(world) {
  const car = world.playerCar;
  if (!car) return;
  car.driver = null;
  car.speed *= 0.3;
  world.player.x = car.x - Math.cos(car.heading) * 3.5;
  world.player.z = car.z - Math.sin(car.heading) * 3.5;
  world.player.heading = car.heading;
  world.playerCar = null;
}

function playerShoot(world) {
  const p = world.player;
  const weapon = WEAPONS[p.weapon];
  if (p.reloading > 0 || world.time - p.lastShot < weapon.rate) return;
  if (p.ammo <= 0) {
    p.reloading = weapon.reload;
    return;
  }
  p.ammo -= 1;
  p.lastShot = world.time;
  world.pendingSound = 'shot';
  const dir = {
    x: Math.cos(world.camYaw) * Math.cos(world.camPitch),
    y: -Math.sin(world.camPitch),
    z: Math.sin(world.camYaw) * Math.cos(world.camPitch),
  };
  const targets = [];
  for (const e of world.enemies) targets.push({ x: e.x, z: e.z, radius: 0.7, height: 2, ref: { kind: 'enemy', obj: e } });
  for (const c of world.cops) targets.push({ x: c.x, z: c.z, radius: 0.7, height: 2, ref: { kind: 'cop', obj: c } });
  for (const ped of world.peds) targets.push({ x: ped.x, z: ped.z, radius: 0.7, height: 2, ref: { kind: 'ped', obj: ped } });
  for (const car of world.cars) {
    if (car === world.playerCar) continue;
    targets.push({ x: car.x, z: car.z, radius: 2.4, height: 1.8, ref: { kind: 'car', obj: car } });
  }
  const hit = fireShot(p, dir, p.weapon, targets, world.random);
  const from = { x: p.x, y: 1.5, z: p.z };
  const to = hit ? hit.point : { x: p.x + dir.x * 60, y: 1.5 + dir.y * 60, z: p.z + dir.z * 60 };
  world.tracers.push({ from, to, ttl: 0.09, color: 0xffe9a0 });
  if (!hit) return;
  const { kind, obj } = hit.ref;
  if (kind === 'car') return;
  obj.hp -= weapon.damage;
  if (kind === 'ped') addCrime(world.wanted, 1);
  if (kind === 'cop') addCrime(world.wanted, 2);
  if (obj.hp <= 0) {
    obj.dead = true;
    obj.deadAt = world.time;
    if (kind === 'enemy') {
      world.cash += 25;
      world.mission.kills += 1;
    }
  }
}

function playerMelee(world) {
  const p = world.player;
  if (world.time - (p.lastMelee ?? -9) < 0.5) return;
  p.lastMelee = world.time;
  const victims = [...world.enemies, ...world.cops, ...world.peds];
  for (const v of victims) {
    if (v.dead) continue;
    const d = Math.hypot(v.x - p.x, v.z - p.z);
    if (d < 2.2) {
      v.hp -= 20;
      if (v.kind === 'ped') addCrime(world.wanted, 1);
      if (v.hp <= 0) {
        v.dead = true;
        v.deadAt = world.time;
        if (v.kind === 'enemy') world.mission.kills += 1;
      }
      return;
    }
  }
}

function stepPlayerOnFoot(world, input, dt) {
  const p = world.player;
  const look = input.takeLook();
  if (look.x || look.y) {
    world.camYaw -= look.x * 0.004;
    world.camPitch = Math.max(0.05, Math.min(1.1, world.camPitch + look.y * 0.003));
    world.camIdle = 0;
  }
  const move = input.move();
  const f = { x: Math.cos(world.camYaw), z: Math.sin(world.camYaw) };
  const r = { x: -Math.sin(world.camYaw), z: Math.cos(world.camYaw) };
  let mx = f.x * move.y + r.x * move.x;
  let mz = f.z * move.y + r.z * move.x;
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    mx /= len;
    mz /= len;
    const speed = input.sprint() ? PLAYER.sprint : PLAYER.walk;
    const nx = p.x + mx * speed * dt;
    const nz = p.z + mz * speed * dt;
    const fixed = collideCircle(nx, nz, PLAYER.radius, world.city.colliders);
    p.x = fixed.x;
    p.z = fixed.z;
    p.heading = Math.atan2(mz, mx);
    p.speed = speed;
    p.phase += speed * dt * 2.2;
  } else {
    p.speed = 0;
  }
  // Keep the player inside the island.
  p.x = Math.max(-310, Math.min(310, p.x));
  p.z = Math.max(-310, Math.min(310, p.z));
}

function stepPlayerDriving(world, input, dt) {
  const car = world.playerCar;
  const move = input.move();
  const look = input.takeLook();
  if (look.x || look.y) {
    world.camYaw -= look.x * 0.004;
    world.camPitch = Math.max(0.05, Math.min(1.1, world.camPitch + look.y * 0.003));
    world.camIdle = 0;
  } else {
    // Ease the chase camera behind the car when the mouse is still.
    world.camIdle += dt;
    if (world.camIdle > 1.2 && Math.abs(car.speed) > 4) {
      world.camYaw = angleLerp(world.camYaw, car.heading, dt * 1.5);
    }
  }
  const zoom = input.takeZoom();
  if (zoom) world.camDist = Math.max(6, Math.min(16, world.camDist + zoom));
  const throttle = move.y;
  const steer = -move.x;
  stepCarPhysics(car, throttle, steer, dt, world.city.colliders);
  // The camera, HUD and save all read the player: while driving, the player IS the car.
  const p = world.player;
  p.x = car.x;
  p.z = car.z;
  p.heading = car.heading;
  p.speed = car.speed;
  // Running a pedestrian over is a crime; a hard hit can kill them.
  for (const ped of world.peds) {
    if (ped.dead) continue;
    const d = Math.hypot(ped.x - car.x, ped.z - car.z);
    if (d < 2.6 && Math.abs(car.speed) > 3) {
      ped.hp = 0;
      ped.dead = true;
      ped.deadAt = world.time;
      addCrime(world.wanted, 1);
      addMessage(world, 'You ran someone over!');
      world.pendingSound = 'crash';
      car.speed *= 0.6;
    }
  }
}

function stepTaxi(world, dt) {
  const taxi = world.taxi;
  taxi.cooldown -= dt;
  if (taxi.state === 'idle' && taxi.cooldown <= 0 && world.playerCar) {
    const spot = randomSidewalkPoint(world.random);
    const passenger = createPedState(world.city, world.random);
    passenger.x = spot.x;
    passenger.z = spot.z;
    passenger.state = 'wait';
    world.peds.push(passenger);
    taxi.passenger = passenger;
    taxi.state = 'waiting';
    addMessage(world, 'A fare is waving you down — pull up close.');
  }
  if (taxi.state === 'waiting' && taxi.passenger) {
    taxi.passenger.wait = 5; // the fare waits where they stand
    const d = Math.hypot(taxi.passenger.x - world.player.x, taxi.passenger.z - world.player.z);
    if (world.playerCar && d < 7) {
      taxi.dest = randomIntersection(world.random);
      taxi.fare = 25 + Math.floor(world.random() * 40);
      taxi.timer = 90;
      taxi.state = 'riding';
      const i = world.peds.indexOf(taxi.passenger);
      if (i >= 0) world.peds.splice(i, 1);
      addMessage(world, `Fare aboard — take them to the marker ($${taxi.fare}).`);
    }
  }
  if (taxi.state === 'riding') {
    taxi.timer -= dt;
    const d = Math.hypot(taxi.dest.x - world.player.x, taxi.dest.z - world.player.z);
    if (d < 8) {
      world.cash += taxi.fare;
      world.rep += 1;
      addMessage(world, `Fare paid: $${taxi.fare}.`);
      world.pendingSound = 'pickup';
      taxi.state = 'idle';
      taxi.cooldown = 25;
      taxi.passenger = null;
    } else if (taxi.timer <= 0) {
      addMessage(world, 'The fare got out — too slow.');
      taxi.state = 'idle';
      taxi.cooldown = 25;
      taxi.passenger = null;
    }
  }
}

/** One fixed simulation step. Returns 'busted' | 'wasted' when the run ends, else null. */
export function stepWorld(world, input, dt, audio) {
  world.time += dt;
  const p = world.player;

  if (world.endState) return world.endState;

  // Per-frame derived state the HUD and the renderer read.
  world.__objective = objectiveOf(world);
  world.nearCar = world.playerCar ? null : nearestCar(world, p.x, p.z, 4.5);

  // Mission delay after a completion: the next one starts on its own.
  if (world.missionDelay > 0) {
    world.missionDelay -= dt;
    if (world.missionDelay <= 0 && world.missionIndex < 6) {
      startMission(world.mission, world.missionIndex, missionFacade(world));
    }
  }

  const actions = input.takeActions();
  if (actions & ACTION_ENTER) {
    if (world.playerCar) exitCar(world);
    else enterCar(world);
  }
  if (actions & ACTION_INTERACT && !world.playerCar) playerMelee(world);
  if (actions & ACTION_RELOAD && !world.playerCar) {
    const weapon = WEAPONS[p.weapon];
    if (p.ammo < weapon.mag) p.reloading = weapon.reload;
  }
  if (actions & ACTION_WEAPON && world.hasSmg) {
    p.weapon = p.weapon === 'pistol' ? 'smg' : 'pistol';
    p.ammo = WEAPONS[p.weapon].mag;
    p.reloading = 0;
    addMessage(world, `Weapon: ${WEAPONS[p.weapon].name}`);
  }

  if (world.playerCar) stepPlayerDriving(world, input, dt);
  else stepPlayerOnFoot(world, input, dt);

  if (p.reloading > 0) {
    p.reloading -= dt;
    if (p.reloading <= 0) p.ammo = WEAPONS[p.weapon].mag;
  }
  if (!world.playerCar && input.attackHeld()) playerShoot(world);

  // Health regen after a quiet spell.
  if (world.time - p.lastDamage > PLAYER.regenDelay && p.hp > 0 && p.hp < PLAYER.health) {
    p.hp = Math.min(PLAYER.health, p.hp + PLAYER.regenRate * dt);
  }

  // Traffic and pedestrians.
  const allCars = [...world.cars, ...world.policeCars];
  for (const car of world.cars) {
    if (car.driver === 'npc' || car.driver === 'taxi') stepTraffic(car, dt, world.city, world.random, allCars);
    else if (car.driver === null && car !== world.playerCar) {
      // Parked: nothing to do.
    }
  }
  for (let i = 0; i < world.cars.length; i += 1) {
    for (let j = i + 1; j < world.cars.length; j += 1) separateCars(world.cars[i], world.cars[j]);
  }
  for (const ped of world.peds) {
    if (ped.dead) continue;
    const fleeing = world.time < ped.fleeUntil;
    const threat = (world.playerCar && Math.abs(world.playerCar.speed) > 6)
      ? world.playerCar : (fleeing || world.time - p.lastShot < 0.5 ? p : null);
    stepPed(ped, dt, world.city, threat, world.time, world.random);
    if (threat && Math.hypot(ped.x - threat.x, ped.z - threat.z) < 12) ped.fleeUntil = world.time + 3;
  }
  world.peds = world.peds.filter((ped) => !ped.dead || world.time - (ped.deadAt ?? 0) < 8);
  if (world.peds.length < 20) world.peds.push(createPedState(world.city, world.random));

  // Wanted: police cars and foot cops.
  const nearestCop = world.policeCars.length
    ? Math.min(...world.policeCars.map((c) => Math.hypot(c.x - p.x, c.z - p.z)))
    : Infinity;
  stepWanted(world.wanted, dt, nearestCop);
  const wantCars = wantedCarCount(world.wanted.level);
  while (world.policeCars.length < wantCars) {
    const car = spawnPoliceCar(world.city, world.random, p);
    world.policeCars.push(car);
    world.cars.push(car);
  }
  while (world.policeCars.length > wantCars) {
    const car = world.policeCars.pop();
    const i = world.cars.indexOf(car);
    if (i >= 0) world.cars.splice(i, 1);
  }
  for (const car of world.policeCars) stepPoliceCar(car, dt, world.city, p, world.playerCar);
  if (world.wanted.level >= 2 && world.cops.length < world.wanted.level) {
    world.cops.push(spawnFootCop(world.city, world.random, p));
  }
  for (const cop of world.cops) {
    const result = stepFootCop(cop, dt, p, world.playerCar !== null, world.time, world.random);
    if (result === 'bust') {
      world.endState = 'busted';
      return 'busted';
    }
    if (result === 'shoot') {
      world.tracers.push({
        from: { x: cop.x, y: 1.4, z: cop.z },
        to: { x: p.x, y: 1.4, z: p.z },
        ttl: 0.09,
        color: 0xff5544,
      });
      if (world.random() < 0.4) damagePlayer(world, 8);
      world.pendingSound = 'enemyShot';
    }
  }
  world.cops = world.cops.filter((c) => Math.hypot(c.x - p.x, c.z - p.z) < 120);

  // Enemies: guard, chase, shoot.
  for (const e of world.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(e.x - p.x, e.z - p.z);
    if (d < 35) {
      e.state = 'chase';
      const want = Math.atan2(p.z - e.z, p.x - e.x);
      let diff = want - e.heading;
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      e.heading += Math.max(-3 * dt, Math.min(3 * dt, diff));
      if (d > 14) {
        e.x += Math.cos(e.heading) * 4.5 * dt;
        e.z += Math.sin(e.heading) * 4.5 * dt;
        e.phase += 4.5 * dt * 2.4;
      }
      e.lastShot += dt;
      if (d < 30 && e.lastShot > 1.3) {
        e.lastShot = 0;
        world.tracers.push({
          from: { x: e.x, y: 1.4, z: e.z },
          to: { x: p.x + (world.random() - 0.5) * 3, y: 1.4, z: p.z + (world.random() - 0.5) * 3 },
          ttl: 0.09,
          color: 0xff5544,
        });
        if (world.random() < 0.45) damagePlayer(world, 10);
        world.pendingSound = 'enemyShot';
      }
    } else {
      e.state = 'guard';
    }
  }
  world.enemies = world.enemies.filter((e) => !e.dead || world.time - (e.deadAt ?? 0) < 10);

  // Collectibles.
  for (const c of world.collectibles) {
    if (c.taken) continue;
    c.angle += dt * 2;
    if (!world.playerCar && Math.hypot(c.x - p.x, c.z - p.z) < 2.2) {
      c.taken = true;
      world.cash += 100;
      addMessage(world, 'Hidden package found: +$100.');
      world.pendingSound = 'pickup';
    }
  }

  stepTaxi(world, dt);

  // Missions.
  if (world.mission.active) {
    const step = world.mission.step;
    const mission = world.mission.index;
    if (mission === 1 && step <= 1) ensureTargetCar(world);
    const result = updateMission(world.mission, missionFacade(world));
    if (result === 'done') {
      const done = world.mission.index;
      world.completed.push(done);
      world.missionIndex = done + 1;
      const reward = [300, 500, 800, 1200, 1500, 2500][done];
      const repGain = [10, 15, 20, 25, 30, 50][done];
      world.cash += reward;
      world.rep += repGain;
      world.lastReward = reward;
      if (done === 3) {
        world.hasSmg = true;
        world.player.weapon = 'smg';
        world.player.ammo = WEAPONS.smg.mag;
      }
      saveGame(world);
      if (world.missionIndex < 6) world.missionDelay = 3;
      else addMessage(world, 'Story complete — you are the King of the Bay.');
    } else if (result === 'fail') {
      // A failed escape restarts the same mission.
      startMission(world.mission, world.mission.index, missionFacade(world));
    }
  }

  // Tracers fade.
  for (const t of world.tracers) t.ttl -= dt;
  world.tracers = world.tracers.filter((t) => t.ttl > 0);
  world.messages = world.messages.filter((m) => m.until > world.time);

  // Audio: engine hum and siren.
  if (audio) {
    const speed01 = world.playerCar ? Math.abs(world.playerCar.speed) / CAR.maxSpeed : 0;
    audio.engine(speed01);
    audio.siren(world.wanted.level > 0 && world.policeCars.length > 0);
    if (world.pendingSound) {
      audio[world.pendingSound]?.();
      world.pendingSound = null;
    }
  }

  if (world.endState) return world.endState;
  return null;
}

/** After a busted/wasted screen, put the player back on their feet. */
export function afterDeath(world) {
  respawn(world, world.endState);
}

/** The current objective for the HUD and the minimap, or null. */
export function objectiveOf(world) {
  if (world.mission.active) return currentObjective(world.mission);
  if (world.taxi.state === 'riding') return { text: `Take the fare to the marker ($${world.taxi.fare})`, at: world.taxi.dest, mission: 'Taxi fare' };
  if (world.taxi.state === 'waiting') return { text: 'A fare is waiting for a ride', at: { x: world.taxi.passenger.x, z: world.taxi.passenger.z }, mission: 'Taxi fare' };
  return null;
}
