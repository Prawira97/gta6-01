// People: low-poly figures built from boxes, with swinging limbs, and the pedestrian AI
// that wanders the sidewalks and flees from gunfire and speeding cars. A person is plain
// state (x, z, heading, speed) plus a group the renderer moves.
import * as THREE from 'three';
import { randomSidewalkPoint } from './city.js';
import { pick, range } from './random.js';

const SHIRTS = [0xe84a5f, 0x4a90d8, 0x50c878, 0xe8a13a, 0x9a6ad8, 0xe8e8e8, 0x3aa8a0, 0xd86a8a];
const SKINS = [0xe8b88a, 0xc98a5a, 0x8a5a3a, 0xf0c8a0, 0x6a4530];

/** Build a person model. kind: 'ped' | 'cop' | 'enemy' | 'player'. */
export function createPersonMesh(kind, shirt, pants, skin) {
  const group = new THREE.Group();
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
  const legGeo = new THREE.BoxGeometry(0.22, 0.8, 0.22);
  legGeo.translate(0, -0.4, 0);
  const legL = new THREE.Mesh(legGeo, pantsMat);
  legL.position.set(0, 0.8, 0.14);
  const legR = new THREE.Mesh(legGeo, pantsMat);
  legR.position.set(0, 0.8, -0.14);
  group.add(legL, legR);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.5), shirtMat);
  torso.position.y = 1.18;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), skinMat);
  head.position.y = 1.78;
  group.add(head);
  const armGeo = new THREE.BoxGeometry(0.16, 0.62, 0.16);
  armGeo.translate(0, -0.31, 0);
  const armL = new THREE.Mesh(armGeo, shirtMat);
  armL.position.set(0, 1.5, 0.33);
  const armR = new THREE.Mesh(armGeo, shirtMat);
  armR.position.set(0, 1.5, -0.33);
  group.add(armL, armR);
  if (kind === 'cop') {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.6 }));
    cap.position.y = 1.99;
    group.add(cap);
  }
  if (kind === 'enemy') {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.36),
      new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.6 }));
    band.position.y = 1.9;
    group.add(band);
  }
  group.userData.limbs = { legL, legR, armL, armR };
  return group;
}

export function createPedState(city, random, kind = 'ped') {
  const p = randomSidewalkPoint(random);
  const shirt = kind === 'cop' ? 0x1c2733 : kind === 'enemy' ? 0xcc2222 : pick(random, SHIRTS);
  const pants = kind === 'cop' ? 0x1c2733 : pick(random, [0x2a2f38, 0x4a4a55, 0x6a5a4a, 0x3a4a6a]);
  return {
    kind,
    x: p.x,
    z: p.z,
    heading: range(random, 0, Math.PI * 2),
    speed: 0,
    target: randomSidewalkPoint(random),
    wait: range(random, 0, 4),
    hp: 100,
    state: 'walk',
    fleeUntil: 0,
    mesh: createPersonMesh(kind, shirt, pants, pick(random, SKINS)),
    phase: range(random, 0, Math.PI * 2),
  };
}

/** Swing the limbs for a walking figure; `amount` is 0 when standing still. */
export function animatePerson(mesh, phase, amount) {
  const { legL, legR, armL, armR } = mesh.userData.limbs;
  const swing = Math.sin(phase) * 0.6 * amount;
  legL.rotation.z = swing;
  legR.rotation.z = -swing;
  armL.rotation.z = -swing * 0.7;
  armR.rotation.z = swing * 0.7;
}

/** One pedestrian step: stroll between sidewalk points, or run from a threat. */
export function stepPed(ped, dt, city, threat, time, random) {
  let targetSpeed = 1.4;
  let target = ped.target;
  if (time < ped.fleeUntil && threat) {
    // Run away from the threat.
    const dx = ped.x - threat.x;
    const dz = ped.z - threat.z;
    const d = Math.hypot(dx, dz) || 1;
    target = { x: ped.x + (dx / d) * 20, z: ped.z + (dz / d) * 20 };
    targetSpeed = 4.2;
    ped.state = 'flee';
  } else if (ped.state === 'flee') {
    ped.state = 'walk';
    ped.target = randomSidewalkPoint(random);
  }
  if (ped.wait > 0 && ped.state === 'walk') {
    ped.wait -= dt;
    ped.speed = 0;
    return;
  }
  const dx = target.x - ped.x;
  const dz = target.z - ped.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1.5) {
    if (ped.state === 'walk') {
      ped.target = randomSidewalkPoint(random);
      ped.wait = 1 + random() * 4;
    }
    ped.speed = 0;
    return;
  }
  const want = Math.atan2(dz, dx);
  let diff = want - ped.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  ped.heading += Math.max(-3 * dt, Math.min(3 * dt, diff));
  ped.speed += (targetSpeed - ped.speed) * Math.min(1, 6 * dt);
  ped.x += Math.cos(ped.heading) * ped.speed * dt;
  ped.z += Math.sin(ped.heading) * ped.speed * dt;
  ped.phase += ped.speed * dt * 2.4;
}
