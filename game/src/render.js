// The renderer: a three.js scene for Solmar Bay — sun, sky, streets, instanced buildings,
// trees, cars and people — plus the chase camera and the 2D minimap. It only paints the
// world state; it never simulates. Every mesh it moves belongs to the world's plain state.
import * as THREE from 'three';
import { CITY, DAY_LENGTH, LANDMARKS, PALETTE } from './config.js';
import { roadLines } from './city.js';
import { animatePerson } from './people.js';
import { createParticleCloud } from './effects.js';

const TAU = Math.PI * 2;

/** A canvas texture: pale facade with a grid of windows, some lit. */
function makeFacadeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = '#f5efe2';
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = '#e2d8c2';
  g.fillRect(0, 248, 128, 8);
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const lit = ((row * 4 + col) % 5) === 0;
      g.fillStyle = lit ? '#ffe9a8' : '#5a7a94';
      g.fillRect(12 + col * 28, 14 + row * 30, 18, 20);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A canvas texture: dark asphalt with a dashed centre line, repeated along a road. */
function makeRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  g.fillStyle = '#3a3f46';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#43484f';
  for (let i = 0; i < 40; i += 1) g.fillRect((i * 37) % 64, (i * 53) % 64, 2, 2);
  g.fillStyle = '#e8d27a';
  g.fillRect(30, 6, 4, 22);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createRenderer(canvas, city, minimapCanvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 200, 560);

  const sun = new THREE.DirectionalLight(PALETTE.sun, PALETTE.sunIntensity);
  sun.position.set(140, 190, 80);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(PALETTE.hemiSky, PALETTE.hemiGround, PALETTE.hemiIntensity);
  scene.add(hemi);
  const skyDay = new THREE.Color(PALETTE.sky);
  const skyNight = new THREE.Color(0x0e1a2e);
  const fogDay = new THREE.Color(PALETTE.fog);
  const fogNight = new THREE.Color(0x1a2436);

  // Ground, sidewalks, roads, beach and sea.
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xb8a88e, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(720, 640), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(20, 0, 0);
  scene.add(ground);

  const sidewalkMat = new THREE.MeshStandardMaterial({ color: PALETTE.sidewalk, roughness: 1 });
  const roadTex = makeRoadTexture();
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.95 });
  for (const line of roadLines()) {
    const walkV = new THREE.Mesh(new THREE.PlaneGeometry(20, 640), sidewalkMat);
    walkV.rotation.x = -Math.PI / 2;
    walkV.position.set(line, 0.01, 0);
    scene.add(walkV);
    const walkH = new THREE.Mesh(new THREE.PlaneGeometry(640, 20), sidewalkMat);
    walkH.rotation.x = -Math.PI / 2;
    walkH.position.set(0, 0.01, line);
    scene.add(walkH);
    const roadV = new THREE.Mesh(new THREE.PlaneGeometry(14, 640), roadMat.clone());
    roadV.material.map = roadTex.clone();
    roadV.material.map.repeat.set(1, 80);
    roadV.material.map.needsUpdate = true;
    roadV.rotation.x = -Math.PI / 2;
    roadV.position.set(line, 0.02, 0);
    scene.add(roadV);
    const roadH = new THREE.Mesh(new THREE.PlaneGeometry(640, 14), roadMat.clone());
    roadH.material.map = roadTex.clone();
    roadH.material.map.repeat.set(80, 1);
    roadH.material.map.needsUpdate = true;
    roadH.rotation.x = -Math.PI / 2;
    roadH.position.set(0, 0.02, line);
    scene.add(roadH);
  }

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 640),
    new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(287, 0.03, 0);
  scene.add(sand);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 640),
    new THREE.MeshStandardMaterial({ color: PALETTE.water, roughness: 0.15, metalness: 0.1 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(380, 0.05, 0);
  scene.add(water);

  // Buildings, one instanced box with a facade texture and a tint each.
  const facade = makeFacadeTexture();
  const buildingMat = new THREE.MeshStandardMaterial({ map: facade, roughness: 0.9 });
  const buildingMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), buildingMat, city.buildings.length);
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const color = new THREE.Color();
  city.buildings.forEach((b, i) => {
    pos.set(b.x, b.h / 2, b.z);
    scale.set(b.w, b.h, b.d);
    matrix.compose(pos, quat, scale);
    buildingMesh.setMatrixAt(i, matrix);
    buildingMesh.setColorAt(i, color.set(b.color)); // set() takes numbers and '#rrggbb' alike
  });
  buildingMesh.instanceMatrix.needsUpdate = true;
  if (buildingMesh.instanceColor) buildingMesh.instanceColor.needsUpdate = true;
  scene.add(buildingMesh);

  // Trees: trunks and foliage, instanced; palms get a taller trunk and a cone crown.
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 2.4, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 1 });
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, city.trees.length);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4a9a4a, roughness: 1 });
  const leafMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.6, 0), leafMat, city.trees.length);
  const leafColor = new THREE.Color();
  city.trees.forEach((t, i) => {
    const h = t.palm ? 4.5 : 2.4;
    pos.set(t.x, h / 2, t.z);
    scale.set(t.s, h / 2.4, t.s);
    matrix.compose(pos, quat, scale);
    trunkMesh.setMatrixAt(i, matrix);
    pos.set(t.x, h + 1.2 * t.s, t.z);
    scale.set(t.s, t.s, t.s);
    matrix.compose(pos, quat, scale);
    leafMesh.setMatrixAt(i, matrix);
    leafMesh.setColorAt(i, leafColor.setHex(t.palm ? 0x3a8a3a : 0x4a9a4a).offsetHSL(0, 0, (i % 5) * 0.02));
  });
  trunkMesh.instanceMatrix.needsUpdate = true;
  leafMesh.instanceMatrix.needsUpdate = true;
  if (leafMesh.instanceColor) leafMesh.instanceColor.needsUpdate = true;
  scene.add(trunkMesh, leafMesh);

  // Street lamps: thin poles with a glowing head.
  const lampMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.09, 0.12, 5, 6),
    new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.7 }),
    city.lamps.length,
  );
  city.lamps.forEach((lamp, i) => {
    pos.set(lamp.x, 2.5, lamp.z);
    scale.set(1, 1, 1);
    matrix.compose(pos, quat, scale);
    lampMesh.setMatrixAt(i, matrix);
  });
  lampMesh.instanceMatrix.needsUpdate = true;
  scene.add(lampMesh);

  // Lamp heads: warm glow that only shows at dusk and night.
  const lampHeadMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.28, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd27a }),
    city.lamps.length,
  );
  city.lamps.forEach((lamp, i) => {
    pos.set(lamp.x, 5.1, lamp.z);
    scale.set(1, 1, 1);
    matrix.compose(pos, quat, scale);
    lampHeadMesh.setMatrixAt(i, matrix);
  });
  lampHeadMesh.instanceMatrix.needsUpdate = true;
  scene.add(lampHeadMesh);

  // Marina boats: hull, deck and cabin, one group each.
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x2a4a6a, roughness: 0.6 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.7 });
  for (const boat of city.boats || []) {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(boat.len, 1.6, 4), hullMat);
    hull.position.set(boat.x, 0.8, boat.z);
    hull.rotation.y = -boat.heading;
    scene.add(hull);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(boat.len * 0.7, 0.8, 3), deckMat);
    deck.position.set(boat.x, 1.9, boat.z);
    deck.rotation.y = -boat.heading;
    scene.add(deck);
  }

  // Particles: one Points cloud for sparks, smoke and sparkles.
  const particleCloud = createParticleCloud();
  scene.add(particleCloud.points);

  // Plaza fountain and the dock pier.
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(4, 4.4, 1, 20),
    new THREE.MeshStandardMaterial({ color: 0xcfc4ae, roughness: 0.8 }),
  );
  fountain.position.set(0, 0.5, 0);
  scene.add(fountain);
  const fountainWater = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6, 3.6, 0.2, 20),
    new THREE.MeshStandardMaterial({ color: 0x5ab8e8, roughness: 0.2 }),
  );
  fountainWater.position.set(0, 1.05, 0);
  scene.add(fountainWater);
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 });
  for (let k = 0; k < 3; k += 1) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(26, 1, 6), pierMat);
    pier.position.set(310, 0.6, 176 + k * 20);
    scene.add(pier);
  }

  // Objective beacon: a glowing pillar and a floating arrow, moved each frame.
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 3, 30, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xf2c230, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
  );
  beacon.visible = false;
  scene.add(beacon);
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 2.4, 4),
    new THREE.MeshBasicMaterial({ color: 0xf2c230 }),
  );
  arrow.rotation.x = Math.PI;
  arrow.visible = false;
  scene.add(arrow);

  // Collectibles: small gold boxes, spun by the world.
  const collectibleMeshes = [];
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf2c230, emissive: 0xa88200, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.6 });
  for (const c of city.collectibleSpots) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), goldMat);
    mesh.position.set(c.x, 1.2, c.z);
    scene.add(mesh);
    collectibleMeshes.push(mesh);
  }

  // Tracers: one line-segment buffer, rewritten every frame.
  const tracerGeo = new THREE.BufferGeometry();
  const tracerPos = new Float32Array(64 * 6);
  tracerGeo.setAttribute('position', new THREE.BufferAttribute(tracerPos, 3));
  const tracerLines = new THREE.LineSegments(tracerGeo, new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.9 }));
  tracerLines.frustumCulled = false;
  scene.add(tracerLines);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1200);
  const knownMeshes = new Set();
  const minimap = minimapCanvas ? minimapCanvas.getContext('2d') : null;

  function syncEntity(entity, time) {
    const mesh = entity.mesh;
    if (!mesh) return;
    if (!mesh.parent) {
      scene.add(mesh);
      knownMeshes.add(mesh);
    }
    mesh.position.set(entity.x, entity.dead ? 0.3 : 0, entity.z);
    mesh.rotation.y = -entity.heading;
    if (entity.dead) mesh.rotation.x = Math.PI / 2;
    else if (entity.kind === 'police' || entity.speed !== undefined) {
      // Cars: spin the wheels with speed.
      const wheels = mesh.userData.wheels;
      if (wheels) {
        const spin = (entity.speed / 0.38) * 0.016;
        for (const w of wheels) w.rotation.z += spin;
      }
      const bar = mesh.userData.lightBar;
      if (bar) {
        const on = Math.floor(time * 6) % 2 === 0;
        bar.red.material.emissiveIntensity = on ? 2.2 : 0.2;
        bar.blue.material.emissiveIntensity = on ? 0.2 : 2.2;
      }
    } else {
      animatePerson(mesh, entity.phase ?? 0, entity.speed > 0.1 ? 1 : 0);
    }
  }

  function drawMinimap(world) {
    if (!minimap) return;
    const size = minimapCanvas.width;
    const scale = size / 660;
    const toMap = (x, z) => [(x + 330) * scale, (z + 330) * scale];
    minimap.fillStyle = '#2e7fb8';
    minimap.fillRect(0, 0, size, size);
    minimap.fillStyle = '#b8a88e';
    minimap.fillRect(0, 0, (252 + 330) * scale, size);
    minimap.fillStyle = '#e8cf9a';
    minimap.fillRect((252 + 330) * scale, 0, (296 - 252) * scale, size);
    minimap.strokeStyle = '#3a3f46';
    minimap.lineWidth = 14 * scale;
    for (const line of roadLines()) {
      const [x1, y1] = toMap(line, -330);
      const [x2, y2] = toMap(line, 330);
      minimap.beginPath();
      minimap.moveTo(x1, y1);
      minimap.lineTo(x2, y2);
      minimap.stroke();
      const [hx1, hy1] = toMap(-330, line);
      const [hx2, hy2] = toMap(330, line);
      minimap.beginPath();
      minimap.moveTo(hx1, hy1);
      minimap.lineTo(hx2, hy2);
      minimap.stroke();
    }
    // Objective marker.
    const objective = world.__objective;
    if (objective && objective.at) {
      const [ox, oy] = toMap(objective.at.x, objective.at.z);
      minimap.fillStyle = '#f2c230';
      minimap.beginPath();
      minimap.moveTo(ox, oy - 7);
      minimap.lineTo(ox + 6, oy);
      minimap.lineTo(ox, oy + 7);
      minimap.lineTo(ox - 6, oy);
      minimap.closePath();
      minimap.fill();
    }
    // Side-activity markers: next race checkpoint (orange), next courier drop
    // (green), and the packages still out there (small gold dots).
    const race = world.activities?.race;
    if (race && race.state === 'running' && race.points[race.idx]) {
      const [rx, ry] = toMap(race.points[race.idx].x, race.points[race.idx].z);
      minimap.fillStyle = '#ff8c1a';
      minimap.beginPath();
      minimap.arc(rx, ry, 4, 0, TAU);
      minimap.fill();
    }
    const courier = world.activities?.courier;
    if (courier && courier.state === 'running' && courier.drops[courier.idx]) {
      const [dx, dy] = toMap(courier.drops[courier.idx].x, courier.drops[courier.idx].z);
      minimap.fillStyle = '#2ec4b6';
      minimap.fillRect(dx - 3, dy - 3, 6, 6);
    }
    minimap.fillStyle = '#f2c230';
    for (const c of world.collectibles || []) {
      if (c.taken) continue;
      const [cx, cy] = toMap(c.x, c.z);
      minimap.beginPath();
      minimap.arc(cx, cy, 1.5, 0, TAU);
      minimap.fill();
    }
    // Police blips.
    minimap.fillStyle = '#ff2233';
    for (const car of world.policeCars) {
      const [px, py] = toMap(car.x, car.z);
      minimap.beginPath();
      minimap.arc(px, py, 3, 0, TAU);
      minimap.fill();
    }
    // Player arrow.
    const [px, py] = toMap(world.player.x, world.player.z);
    minimap.save();
    minimap.translate(px, py);
    minimap.rotate(Math.atan2(Math.sin(world.player.heading), Math.cos(world.player.heading)) + Math.PI / 2);
    minimap.fillStyle = '#2ec4b6';
    minimap.beginPath();
    minimap.moveTo(0, -7);
    minimap.lineTo(5, 6);
    minimap.lineTo(-5, 6);
    minimap.closePath();
    minimap.fill();
    minimap.restore();
  }

  return {
    /** Resize the drawing buffer to the canvas's box. */
    resize(width, height) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    /** Paint the world for one screen: 'title' | 'play' | 'paused' | 'over'. */
    draw(world, screen, time) {
      // Day/night: the sun circles once per DAY_LENGTH seconds; staged shots pass a
      // fixed time, so their light is identical on every run.
      const phase = ((time / DAY_LENGTH) + 0.25) % 1;
      const sunH = Math.sin(phase * TAU);
      const dayF = Math.max(0, Math.min(1, (sunH + 0.05) / 0.3));
      scene.background.lerpColors(skyNight, skyDay, dayF);
      scene.fog.color.lerpColors(fogNight, fogDay, dayF);
      sun.intensity = 0.15 + dayF * 2.45;
      sun.position.set(Math.cos(phase * TAU) * 180, 60 + Math.max(0, sunH) * 140, 80);
      hemi.intensity = 0.25 + dayF * 0.65;
      lampHeadMesh.visible = dayF < 0.4;
      const p = world.player;
      const forward = { x: Math.cos(world.camYaw), z: Math.sin(world.camYaw) };
      if (screen === 'title') {
        const a = time * 0.05;
        camera.position.set(Math.cos(a) * 260, 120, Math.sin(a) * 260);
        camera.lookAt(0, 10, 0);
      } else {
        const dist = world.camDist;
        const height = dist * Math.sin(world.camPitch) + 2.5;
        const back = dist * Math.cos(world.camPitch);
        const cx = p.x - forward.x * back;
        const cz = p.z - forward.z * back;
        camera.position.set(cx, height, cz);
        camera.lookAt(p.x + forward.x * 4, 1.8, p.z + forward.z * 4);
      }
      // Sync every entity's mesh.
      const current = new Set();
      for (const car of world.cars) {
        syncEntity(car, time);
        current.add(car.mesh);
      }
      for (const ped of [...world.peds, ...world.cops, ...world.enemies]) {
        syncEntity(ped, time);
        current.add(ped.mesh);
      }
      for (const mesh of [...knownMeshes]) {
        if (!current.has(mesh)) {
          scene.remove(mesh);
          knownMeshes.delete(mesh);
        }
      }
      // Player figure (hidden while driving).
      this.updatePlayerMesh(world);
      // Collectibles spin and hide when taken.
      world.collectibles.forEach((c, i) => {
        const mesh = collectibleMeshes[i];
        mesh.visible = !c.taken;
        mesh.rotation.y = c.angle;
        mesh.position.y = 1.2 + Math.sin(c.angle * 0.7) * 0.2;
      });
      // Objective beacon.
      const objective = world.__objective;
      if (objective && objective.at) {
        beacon.visible = true;
        arrow.visible = true;
        beacon.position.set(objective.at.x, 15, objective.at.z);
        arrow.position.set(objective.at.x, 9 + Math.sin(time * 3) * 0.6, objective.at.z);
      } else {
        beacon.visible = false;
        arrow.visible = false;
      }
      // Tracers.
      let n = 0;
      for (const t of world.tracers) {
        if (n >= 32) break;
        tracerPos[n * 6] = t.from.x;
        tracerPos[n * 6 + 1] = t.from.y;
        tracerPos[n * 6 + 2] = t.from.z;
        tracerPos[n * 6 + 3] = t.to.x;
        tracerPos[n * 6 + 4] = t.to.y;
        tracerPos[n * 6 + 5] = t.to.z;
        n += 1;
      }
      tracerGeo.setDrawRange(0, n * 2);
      tracerGeo.attributes.position.needsUpdate = true;
      tracerLines.material.opacity = 0.9;
      // Particles (sparks, smoke, sparkles).
      particleCloud.sync(world.particles);

      renderer.render(scene, camera);
      drawMinimap(world);
    },
    /** The player figure mesh, created once by main and owned by the renderer. */
    setPlayerMesh(mesh) {
      if (this.playerMesh) scene.remove(this.playerMesh);
      this.playerMesh = mesh;
      scene.add(mesh);
    },
    updatePlayerMesh(world) {
      if (!this.playerMesh) return;
      const p = world.player;
      this.playerMesh.visible = world.playerCar === null && !world.endState;
      this.playerMesh.position.set(p.x, 0, p.z);
      this.playerMesh.rotation.y = -p.heading;
      animatePerson(this.playerMesh, p.phase, p.speed > 0.1 ? 1 : 0);
    },
    scene,
    camera,
  };
}
