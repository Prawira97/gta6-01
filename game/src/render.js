// Solmar Bay — the renderer: Three.js, one scene, the city baked into a
// canvas ground texture, buildings / cars / people as meshes, a sun that
// follows the game clock, and particles as points. The frame is a pure
// function of the world, so a staged shot renders identically every run.
import * as THREE from 'three';
import { createRng } from './random.js';
import { WORLD } from './config.js';

const TEX_SIZE = 1024;
const SPAN = 560; // the ground texture covers -280..280 in x and z.

function toTex(v) {
  return ((v + SPAN / 2) / SPAN) * TEX_SIZE;
}

function groundTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const g = canvas.getContext('2d');
  const rng = createRng(99);
  // Base: city blocks.
  g.fillStyle = '#6f7a5e';
  g.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  for (let i = 0; i < 8; i += 1) {
    for (let j = 0; j < 8; j += 1) {
      const shade = 100 + Math.floor(rng.float(0, 24));
      g.fillStyle = `rgb(${shade}, ${shade + 8}, ${shade - 12})`;
      const x = toTex(-224 + i * 56);
      const y = toTex(-224 + j * 56);
      const s = (56 / SPAN) * TEX_SIZE;
      g.fillRect(x, y, s, s);
    }
  }
  // Beach and water, east edge.
  g.fillStyle = '#d8c890';
  g.fillRect(toTex(246), 0, toTex(258) - toTex(246), TEX_SIZE);
  g.fillStyle = '#2a6a9a';
  g.fillRect(toTex(258), 0, TEX_SIZE - toTex(258), TEX_SIZE);
  // Streets: asphalt with a dashed centre line.
  g.fillStyle = '#33363a';
  for (const s of WORLD.STREETS) {
    const c = toTex(s);
    const w = (14 / SPAN) * TEX_SIZE;
    g.fillRect(c - w / 2, 0, w, TEX_SIZE);
    g.fillRect(0, c - w / 2, TEX_SIZE, w);
  }
  g.fillStyle = '#c8a020';
  for (const s of WORLD.STREETS) {
    const c = toTex(s);
    for (let d = -252; d < 252; d += 16) {
      g.fillRect(c - 1, toTex(d), 2, (7 / SPAN) * TEX_SIZE);
      g.fillRect(toTex(d), c - 1, (7 / SPAN) * TEX_SIZE, 2);
    }
  }
  // Plaza: pale pavement and a fountain.
  g.fillStyle = '#b8a888';
  g.beginPath();
  g.arc(toTex(0), toTex(0), (40 / SPAN) * TEX_SIZE, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#3a8ab8';
  g.beginPath();
  g.arc(toTex(0), toTex(0), (10 / SPAN) * TEX_SIZE, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function facadeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = '#cccccc';
  g.fillRect(0, 0, 128, 256);
  const rng = createRng(7);
  for (let y = 12; y < 240; y += 24) {
    for (let x = 10; x < 118; x += 22) {
      g.fillStyle = rng.chance(0.5) ? '#ffe9a8' : '#2a3a4a';
      g.fillRect(x, y, 14, 16);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePerson(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.38, 1.0, 8),
    new THREE.MeshLambertMaterial({ color }),
  );
  body.position.y = 0.9;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 8),
    new THREE.MeshLambertMaterial({ color: 0xd8b090 }),
  );
  head.position.y = 1.62;
  group.add(body, head);
  return group;
}

function makeCarMesh(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.7, 1.9),
    new THREE.MeshLambertMaterial({ color }),
  );
  body.position.y = 0.55;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.6, 1.7),
    new THREE.MeshLambertMaterial({ color: 0x1a2a3a }),
  );
  cabin.position.set(-0.2, 1.15, 0);
  group.add(body, cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [wx, wz] of [[1.4, 0.95], [1.4, -0.95], [-1.4, 0.95], [-1.4, -0.95]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, 0.34, wz);
    group.add(wheel);
  }
  return group;
}

function skyFor(t) {
  // Returns [background color, sun intensity, sun color, hemi intensity].
  const day = Math.max(0, Math.sin(((t - 6) / 12) * Math.PI)); // 0 at 06:00/18:00, 1 at noon
  const dusk = t >= 17 && t < 19.5;
  if (t >= 6 && t < 17) {
    return [new THREE.Color(0x87b8e0), 0.5 + day * 0.9, new THREE.Color(0xfff2d8), 0.55 + day * 0.35];
  }
  if (dusk) {
    return [new THREE.Color(0xe08a4a), 0.55, new THREE.Color(0xff8844), 0.4];
  }
  if (t >= 19.5 || t < 5) {
    return [new THREE.Color(0x0a1428), 0.12, new THREE.Color(0x8899cc), 0.22];
  }
  return [new THREE.Color(0xc89878), 0.35, new THREE.Color(0xffaa66), 0.35];
}

export function createRenderer(canvas, world) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x87b8e0, 120, 420);
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 900);

  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x403828, 0.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.2);
  scene.add(sun);
  scene.add(sun.target);

  // Ground.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(SPAN, SPAN),
    new THREE.MeshLambertMaterial({ map: groundTexture() }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Buildings.
  const facade = facadeTexture();
  const buildingMeshes = [];
  for (const b of world.city.buildings) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(b.w, b.h, b.d),
      new THREE.MeshLambertMaterial({ color: b.color, map: facade }),
    );
    mesh.position.set(b.x, b.h / 2, b.z);
    scene.add(mesh);
    buildingMeshes.push(mesh);
  }

  // Palms: trunk + a flattened crown, scattered on the plaza and beach.
  const palmTrunk = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
  const palmLeaf = new THREE.MeshLambertMaterial({ color: 0x2a7a3a });
  const rng = createRng(42);
  for (let i = 0; i < 24; i += 1) {
    const onBeach = i % 3 === 0;
    const x = onBeach ? rng.float(246, 252) : rng.float(-200, 200);
    const z = onBeach ? rng.float(-224, 224) : rng.float(-200, 200);
    if (!onBeach && Math.hypot(x, z) < 48) continue; // keep the plaza clear
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 5, 6), palmTrunk);
    trunk.position.set(x, 2.5, z);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 6), palmLeaf);
    crown.scale.y = 0.5;
    crown.position.set(x, 5.4, z);
    scene.add(trunk, crown);
  }

  // Street lamps at every other intersection; they glow after dark.
  const lampHeads = [];
  for (let i = 0; i < WORLD.STREETS.length; i += 2) {
    for (let j = 0; j < WORLD.STREETS.length; j += 2) {
      const x = WORLD.STREETS[i];
      const z = WORLD.STREETS[j];
      if (Math.hypot(x, z) < 20) continue;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.12, 5.5, 6),
        new THREE.MeshLambertMaterial({ color: 0x222222 }),
      );
      pole.position.set(x + 6, 2.75, z + 6);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 8, 8),
        new THREE.MeshLambertMaterial({ color: 0x888888, emissive: 0x000000 }),
      );
      head.position.set(x + 6, 5.6, z + 6);
      scene.add(pole, head);
      lampHeads.push(head);
    }
  }

  // Marina boats.
  const boatMat = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
  for (const boat of world.city.boats) {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(boat.len, 1.0, 2.6), boatMat);
    hull.position.set(boat.x, 0.5, boat.z);
    hull.rotation.y = boat.heading;
    scene.add(hull);
  }

  // The player, on foot (hidden while driving).
  const playerMesh = makePerson(0x2a5db0);
  scene.add(playerMesh);

  // Dynamic meshes, keyed by the entity object.
  const carMeshes = new Map();
  const pedMeshes = new Map();
  const enemyMeshes = new Map();
  const copMeshes = new Map();

  // Hidden packages: small glowing boxes, one per collectible.
  const pkgMeshes = world.collectibles.map((c) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.4, 0.6),
      new THREE.MeshLambertMaterial({ color: 0xffd020, emissive: 0x664400 }),
    );
    m.position.set(c.x, 0.5, c.z);
    scene.add(m);
    return m;
  });

  // Particles as points.
  const PMAX = 400;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(PMAX * 3);
  const pCol = new Float32Array(PMAX * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const points = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, opacity: 0.9 }),
  );
  points.frustumCulled = false;
  scene.add(points);

  function syncList(list, meshes, make, colorOf) {
    const seen = new Set();
    for (const e of list) {
      seen.add(e);
      let m = meshes.get(e);
      if (!m) {
        m = make(colorOf ? colorOf(e) : 0x888888);
        meshes.set(e, m);
        scene.add(m);
      }
      m.position.set(e.x, 0, e.z);
      m.rotation.y = -(e.heading || 0);
    }
    for (const [e, m] of [...meshes]) {
      if (!seen.has(e)) {
        scene.remove(m);
        meshes.delete(e);
      }
    }
  }

  function render() {
    const [bg, sunI, sunColor, hemiI] = skyFor(world.time);
    scene.background = bg;
    scene.fog.color.copy(bg);
    hemi.intensity = hemiI;
    const ang = ((world.time - 6) / 12) * Math.PI;
    sun.position.set(Math.cos(ang) * 160, Math.max(12, Math.sin(ang) * 140 + 20), 80);
    sun.intensity = sunI;
    sun.color.copy(sunColor);
    sun.target.position.set(0, 0, 0);
    // Street lamps glow from dusk (17:00) through the night.
    const night = world.time >= 17 || world.time < 5.5;
    for (const head of lampHeads) {
      head.material.emissive.setHex(night ? 0xffc860 : 0x000000);
    }

    // Player.
    playerMesh.visible = !world.playerCar;
    playerMesh.position.set(world.player.x, 0, world.player.z);
    playerMesh.rotation.y = -(world.player.heading || 0);

    // Cars: the world cars, the police, the tail mark and the escort truck.
    const allCars = [...world.cars, ...world.policeCars];
    if (world.markCar) allCars.push(world.markCar);
    if (world.escortCar) allCars.push(world.escortCar);
    syncList(allCars, carMeshes, (color) => makeCarMesh(color), (c) => c.color || 0x888888);
    syncList(world.peds, pedMeshes, (color) => makePerson(color), (p) => p.color);
    syncList(world.enemies, enemyMeshes, () => makePerson(0xc02020), null);
    syncList(world.cops, copMeshes, () => makePerson(0x1a2a4a), null);

    // Packages.
    world.collectibles.forEach((c, i) => {
      pkgMeshes[i].visible = !c.taken;
    });

    // Particles.
    const n = Math.min(world.particles.length, PMAX);
    for (let i = 0; i < n; i += 1) {
      const p = world.particles[i];
      pPos[i * 3] = p.x;
      pPos[i * 3 + 1] = p.y;
      pPos[i * 3 + 2] = p.z;
      const col = new THREE.Color(p.color);
      const fade = Math.max(0.1, p.life / p.maxLife);
      pCol[i * 3] = col.r * fade;
      pCol[i * 3 + 1] = col.g * fade;
      pCol[i * 3 + 2] = col.b * fade;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;
    pGeo.setDrawRange(0, n);

    // Camera: behind the player, looking along the aim.
    const fx = Math.cos(world.camYaw);
    const fz = Math.sin(world.camYaw);
    const cp = Math.cos(world.camPitch);
    const sp = Math.sin(world.camPitch);
    const d = world.camDist;
    camera.position.set(
      world.player.x - fx * d * cp,
      1.5 + d * sp,
      world.player.z - fz * d * cp,
    );
    camera.lookAt(world.player.x + fx * 4, 1.2, world.player.z + fz * 4);
    renderer.render(scene, camera);
  }

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  return { render, resize };
}
