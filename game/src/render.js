// Solmar Bay — the renderer. Three.js (vendored) draws the world: the city
// slab and roads, 95 buildings, the stadium, the marina, traffic, crowds,
// police, particles and the day/night sun. The game logic never sees THREE;
// this file only reads the world and moves meshes to match it.
import * as THREE from 'three';
import { GRID, ROADS } from './config.js';
import { dirX, dirZ } from './random.js';

const DAY_SKY = new THREE.Color(0x87b5d6);
const NIGHT_SKY = new THREE.Color(0x0a1420);

function lambert(color) {
  return new THREE.MeshLambertMaterial({ color });
}

export function createRenderer(world, canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(1280, 720, false);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b5d6);
  scene.fog = new THREE.Fog(0x87b5d6, 120, 700);
  const camera = new THREE.PerspectiveCamera(70, 1280 / 720, 0.1, 1200);

  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x3a3230, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.2);
  scene.add(sun);
  scene.add(sun.target);

  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const matCache = new Map();
  function mat(color) {
    if (!matCache.has(color)) matCache.set(color, lambert(color));
    return matCache.get(color);
  }
  function box(w, h, d, color, x, y, z) {
    const m = new THREE.Mesh(unitBox, mat(color));
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  }

  // Ground: sand everywhere, a concrete city slab, a water strip east.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 1400),
    lambert(0xc2a878),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const slab = new THREE.Mesh(new THREE.PlaneGeometry(480, 480), lambert(0x5a6068));
  slab.rotation.x = -Math.PI / 2;
  slab.position.y = 0.02;
  scene.add(slab);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(400, 1400), lambert(0x1e5f8a));
  water.rotation.x = -Math.PI / 2;
  water.position.set(440, 0.01, 0);
  scene.add(water);
  // Roads: dark strips on the slab, one per grid line, both ways.
  for (const r of ROADS) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(472, 10), lambert(0x2e3338));
    a.rotation.x = -Math.PI / 2;
    a.position.set(0, 0.04, r);
    scene.add(a);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(10, 472), lambert(0x2e3338));
    b.rotation.x = -Math.PI / 2;
    b.position.set(r, 0.04, 0);
    scene.add(b);
  }
  // Centre lines.
  for (const r of ROADS) {
    for (let v = -224; v <= 224; v += 16) {
      box(4, 0.02, 0.6, 0xd8c23a, v, 0.06, r);
      box(0.6, 0.02, 4, 0xd8c23a, r, 0.06, v);
    }
  }

  // Buildings.
  for (const b of world.city.buildings) {
    const m = box(b.w, b.h, b.d, b.color, b.x, b.h / 2, b.z);
    m.rotation.y = b.rot;
    // A lit window band near the top so the skyline reads at dusk.
    const band = box(b.w * 0.9, 1, b.d * 0.9, 0xffe9a8, b.x, b.h * 0.72, b.z);
    band.rotation.y = b.rot;
  }
  // Stadium bowl + field.
  const stadium = world.city.stadium;
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(stadium.r, stadium.r, 7, 24), lambert(0x8a8f96));
  bowl.position.set(stadium.x, 3.5, stadium.z);
  scene.add(bowl);
  const field = new THREE.Mesh(new THREE.PlaneGeometry(48, 28), lambert(0x3f8f4f));
  field.rotation.x = -Math.PI / 2;
  field.position.set(stadium.x, 0.08, stadium.z);
  scene.add(field);
  // Market stalls.
  for (const s of world.city.stalls) {
    box(5, 2.4, 4, 0x7a5230, s.x, 1.2, s.z);
    box(5.6, 0.3, 4.6, 0xd23c2e, s.x, 2.7, s.z);
  }
  // Marina boats.
  for (const boat of world.city.boats) {
    const hull = box(3, 1.2, 9, 0xf2f2f2, boat.x, 0.6, boat.z);
    hull.rotation.y = boat.heading;
    box(1.6, 1.6, 2.4, 0x2e6fd2, boat.x, 1.8, boat.z).rotation.y = boat.heading;
  }

  // Dynamic objects, keyed by the world object so a mesh follows its entity.
  const carMeshes = new Map();
  function carMesh(car) {
    let g = carMeshes.get(car);
    if (g) return g;
    g = new THREE.Group();
    const body = new THREE.Mesh(unitBox, mat(car.color));
    body.scale.set(2, 0.7, 4.4);
    body.position.y = 0.55;
    g.add(body);
    const cab = new THREE.Mesh(unitBox, mat(0x1a2028));
    cab.scale.set(1.7, 0.6, 2.2);
    cab.position.set(0, 1.2, -0.3);
    g.add(cab);
    for (const [wx, wz] of [[-0.95, 1.5], [0.95, 1.5], [-0.95, -1.5], [0.95, -1.5]]) {
      const wheel = new THREE.Mesh(unitBox, mat(0x111111));
      wheel.scale.set(0.3, 0.6, 0.6);
      wheel.position.set(wx, 0.3, wz);
      g.add(wheel);
    }
    if (car.kind === 'police') {
      const stripe = new THREE.Mesh(unitBox, mat(0xffffff));
      stripe.scale.set(2.05, 0.15, 4.45);
      stripe.position.y = 0.95;
      g.add(stripe);
    }
    if (car.kind === 'truck') {
      const cab2 = new THREE.Mesh(unitBox, mat(0x8a5a2e));
      cab2.scale.set(2.2, 1.8, 2.4);
      cab2.position.set(0, 1.4, 2.4);
      g.add(cab2);
    }
    scene.add(g);
    carMeshes.set(car, g);
    return g;
  }
  const personMeshes = new Map();
  function personMesh(p, color) {
    let g = personMeshes.get(p);
    if (g) return g;
    g = new THREE.Group();
    const body = new THREE.Mesh(unitBox, mat(color));
    body.scale.set(0.5, 1.1, 0.5);
    body.position.y = 0.85;
    g.add(body);
    const head = new THREE.Mesh(unitBox, mat(0xd8a878));
    head.scale.set(0.35, 0.35, 0.35);
    head.position.y = 1.6;
    g.add(head);
    scene.add(g);
    personMeshes.set(p, g);
    return g;
  }
  // Collectible packages: small gold boxes.
  const packMeshes = new Map();
  for (const pack of world.collectibles) {
    const m = box(0.7, 0.7, 0.7, 0xffd34d, pack.x, 0.6, pack.z);
    packMeshes.set(pack, m);
  }
  // Particles: one Points cloud, rewritten every frame.
  const MAXP = 400;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(MAXP * 3);
  const pCol = new Float32Array(MAXP * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const points = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({ size: 0.9, vertexColors: true, sizeAttenuation: true }),
  );
  points.frustumCulled = false;
  scene.add(points);

  function render() {
    // Day / night: the sun circles once per game day; the sky follows it.
    const ang = ((world.dayTime - 6) / 12) * Math.PI;
    const elev = Math.sin(ang);
    const dayF = Math.max(0, Math.min(1, elev * 1.4 + 0.25));
    sun.position.set(Math.cos(ang) * 160, Math.max(8, elev * 160), 60);
    sun.intensity = 0.15 + dayF * 1.1;
    hemi.intensity = 0.25 + dayF * 0.65;
    const sky = DAY_SKY.clone().lerp(NIGHT_SKY, 1 - dayF);
    scene.background = sky;
    scene.fog.color.copy(sky);

    // Cars.
    const allCars = [...world.cars, ...world.policeCars, ...world.roadblock.cars];
    for (const car of allCars) {
      const g = carMesh(car);
      g.position.set(car.x, 0, car.z);
      g.rotation.y = car.heading;
    }
    // The player on foot (a blue jacket, so Kai reads against the street).
    // Hidden while driving: the car is the visible thing then.
    const playerMesh = personMesh(world.player, 0x2e6fd2);
    playerMesh.visible = !world.playerCar;
    if (!world.playerCar) {
      playerMesh.position.set(world.player.x, 0, world.player.z);
      playerMesh.rotation.y = world.player.heading;
    }
    // Pedestrians, cops, enemies.
    for (const ped of world.peds) {
      const g = personMesh(ped, 0x3a6fd2);
      g.position.set(ped.x, ped.state === 'down' ? 0.3 : 0, ped.z);
      g.rotation.y = ped.heading;
      if (ped.state === 'down') g.rotation.z = Math.PI / 2;
      else g.rotation.z = 0;
    }
    for (const cop of world.cops) {
      const g = personMesh(cop, 0x1c3fd6);
      g.position.set(cop.x, 0, cop.z);
    }
    for (const enemy of world.enemies) {
      const g = personMesh(enemy, 0xd23c2e);
      g.position.set(enemy.x, 0, enemy.z);
    }
    // Packages: spin the ones still out there.
    for (const pack of world.collectibles) {
      const m = packMeshes.get(pack);
      if (!m) continue;
      m.visible = !pack.taken;
      m.rotation.y = world.time * 0.8;
      m.position.y = 0.6 + Math.sin(world.time * 2 + pack.x) * 0.15;
    }
    // Particles.
    const n = Math.min(world.particles.length, MAXP);
    for (let i = 0; i < n; i += 1) {
      const p = world.particles[i];
      pPos[i * 3] = p.x;
      pPos[i * 3 + 1] = p.y;
      pPos[i * 3 + 2] = p.z;
      const c = new THREE.Color(p.color);
      pCol[i * 3] = c.r;
      pCol[i * 3 + 1] = c.g;
      pCol[i * 3 + 2] = c.b;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;
    pGeo.setDrawRange(0, n);

    // Camera: a staged shot camera, else third person behind the player.
    if (world.shotCamera) {
      camera.position.set(world.shotCamera.pos.x, world.shotCamera.pos.y, world.shotCamera.pos.z);
      camera.lookAt(world.shotCamera.look.x, world.shotCamera.look.y, world.shotCamera.look.z);
    } else {
      const yaw = world.camYaw;
      const back = 12 + world.zoom * 6;
      const px = world.player.x;
      const pz = world.player.z;
      camera.position.set(px - dirX(yaw) * back, 5.5 + world.zoom * 2, pz - dirZ(yaw) * back);
      camera.lookAt(px + dirX(yaw) * 8, 1.5, pz + dirZ(yaw) * 8);
    }
    renderer.render(scene, camera);
  }

  return {
    render,
    resize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    },
  };
}
