// Cars: low-poly models built from boxes and cylinders, arcade driving physics, and the
// traffic AI that follows the road grid. A car is plain state (x, z, heading, speed) plus a
// three.js group the renderer moves; the physics here never touches the renderer.
import * as THREE from 'three';
import { CAR, CITY } from './config.js';
import { nearestRoadPoint, randomIntersection, roadLines } from './city.js';
import { pick, range } from './random.js';

export const CAR_COLORS = [0xd84a4a, 0x3a6fd8, 0xe8c93a, 0x4ad8a0, 0xe8e8e8, 0x2a2f38, 0xd88a2a, 0x8a4ad8, 0x7ab8c9];
export const TAXI_COLOR = 0xf2c230;

/** Build a car model. kind: 'sedan' | 'taxi' | 'police' | 'sport' | 'truck'. */
export function createCarMesh(kind, color) {
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.25 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.1, metalness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(CAR.length, 0.75, CAR.width), paint);
  body.position.y = 0.62;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.62, 1.8), glass);
  cabin.position.set(-0.25, 1.28, 0);
  group.add(cabin);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 1.9), paint);
  hood.position.set(1.85, 0.95, 0);
  group.add(hood);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
  wheelGeo.rotateX(Math.PI / 2);
  const wheels = [];
  for (const [wx, wz] of [[1.5, 0.95], [1.5, -0.95], [-1.5, 0.95], [-1.5, -0.95]]) {
    const wheel = new THREE.Mesh(wheelGeo, dark);
    wheel.position.set(wx, 0.38, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a0, emissiveIntensity: 0.9 });
  for (const wz of [0.6, -0.6]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.35), lightMat);
    head.position.set(CAR.length / 2, 0.72, wz);
    group.add(head);
  }
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xaa1111, emissive: 0xcc1111, emissiveIntensity: 0.7 });
  for (const wz of [0.6, -0.6]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.35), tailMat);
    tail.position.set(-CAR.length / 2, 0.72, wz);
    group.add(tail);
  }
  let lightBar = null;
  if (kind === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 1.1), dark);
    bar.position.set(-0.25, 1.66, 0);
    group.add(bar);
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.16, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xff2233, emissive: 0xff2233, emissiveIntensity: 1.6 }),
    );
    red.position.set(-0.25, 1.68, 0.28);
    group.add(red);
    const blue = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.16, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x2266ff, emissive: 0x2266ff, emissiveIntensity: 1.6 }),
    );
    blue.position.set(-0.25, 1.68, -0.28);
    group.add(blue);
    lightBar = { red, blue };
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.22, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffc800, emissiveIntensity: 0.8 }),
    );
    sign.position.set(-0.25, 1.66, 0);
    group.add(sign);
  }
  group.userData.wheels = wheels;
  group.userData.lightBar = lightBar;
  return group;
}

/** Repaint a car's body (used for the gold target sedan). */
export function recolorCar(car, color) {
  car.color = color;
  const body = car.mesh.children[0];
  if (body && body.material) body.material.color.setHex(color);
}
export function createCarState(city, random, kind, x, z, heading) {
  const color = kind === 'police' ? 0xe8e8e8 : kind === 'taxi' ? TAXI_COLOR : pick(random, CAR_COLORS);
  return {
    kind,
    color,
    x,
    z,
    heading,
    speed: 0,
    steer: 0,
    driver: kind === 'police' ? 'police' : 'npc',
    route: [],
    nodeIndex: 0,
    brake: false,
    mesh: createCarMesh(kind, color),
    flash: 0,
  };
}

/** Push a circle out of every building collider it overlaps. Returns true on a hit. */
export function collideCircle(x, z, radius, colliders) {
  let hit = false;
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - nx;
    const dz = z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= radius * radius) continue;
    hit = true;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      x = nx + (dx / d) * radius;
      z = nz + (dz / d) * radius;
    } else {
      // Centre inside the box: push out along the smallest penetration axis.
      const left = x - c.minX;
      const right = c.maxX - x;
      const top = z - c.minZ;
      const bottom = c.maxZ - z;
      const m = Math.min(left, right, top, bottom);
      if (m === left) x = c.minX - radius;
      else if (m === right) x = c.maxX + radius;
      else if (m === top) z = c.minZ - radius;
      else z = c.maxZ + radius;
    }
  }
  return { x, z, hit };
}

/** Arcade car physics: throttle -1..1, steer -1..1, one fixed step. */
export function stepCarPhysics(car, throttle, steerInput, dt, colliders) {
  const maxSpeed = car.kind === 'police' ? CAR.policeSpeed : CAR.maxSpeed;
  if (throttle > 0) car.speed += CAR.accel * throttle * dt;
  else if (throttle < 0) car.speed += (car.speed > 0.5 ? -CAR.brake : CAR.accel * 0.6) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), CAR.drag * 2.2 * dt);
  car.speed = Math.max(-CAR.reverseMax, Math.min(maxSpeed, car.speed));
  const speedFactor = Math.min(1, Math.abs(car.speed) / 12);
  car.heading += steerInput * CAR.steer * speedFactor * Math.sign(car.speed || 1) * dt;
  const nx = car.x + Math.cos(car.heading) * car.speed * dt;
  const nz = car.z + Math.sin(car.heading) * car.speed * dt;
  const fixed = collideCircle(nx, nz, CAR.radius, colliders);
  if (fixed.hit && Math.abs(car.speed) > 4) car.speed *= 0.45;
  else if (fixed.hit) car.speed *= 0.8;
  car.x = fixed.x;
  car.z = fixed.z;
  car.steer = steerInput;
}

/** Steer toward a point: returns -1..1. */
export function steerToward(car, tx, tz) {
  const want = Math.atan2(tz - car.z, tx - car.x);
  let diff = want - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.max(-1, Math.min(1, diff * 1.8));
}

/** Pick the next intersection for a traffic car, avoiding an immediate U-turn. */
function nextNode(city, random, current, heading) {
  const lines = roadLines();
  const options = [];
  for (const line of lines) {
    if (Math.abs(line - current.x) > 1) options.push({ x: line, z: current.z });
    if (Math.abs(line - current.z) > 1) options.push({ x: current.x, z: line });
  }
  const back = { x: current.x - Math.cos(heading) * CITY.pitch, z: current.z - Math.sin(heading) * CITY.pitch };
  const filtered = options.filter((o) => Math.hypot(o.x - back.x, o.z - back.z) > 1);
  return pick(random, filtered.length ? filtered : options);
}

/** One traffic step: follow the route, brake for the car ahead, turn at intersections. */
export function stepTraffic(car, dt, city, random, others) {
  if (!car.route.length || car.nodeIndex >= car.route.length) {
    const node = randomIntersection(random);
    car.route = [node];
    car.nodeIndex = 0;
  }
  const target = car.route[car.nodeIndex];
  const dist = Math.hypot(target.x - car.x, target.z - car.z);
  if (dist < 4) {
    car.route[car.nodeIndex] = nextNode(city, random, target, car.heading);
    car.nodeIndex = 0;
  }
  // Brake for anything stopped in front of us.
  let blocked = false;
  for (const other of others) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dz = other.z - car.z;
    const ahead = dx * Math.cos(car.heading) + dz * Math.sin(car.heading);
    const side = Math.abs(-dx * Math.sin(car.heading) + dz * Math.cos(car.heading));
    if (ahead > 0 && ahead < 9 && side < 3.5) { blocked = true; break; }
  }
  const steer = steerToward(car, target.x, target.z);
  const throttle = blocked ? -1 : (car.speed < CAR.trafficSpeed ? 1 : 0);
  stepCarPhysics(car, throttle, steer, dt, city.colliders);
}

/** Push two overlapping cars apart. */
export function separateCars(a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const d = Math.hypot(dx, dz);
  const min = CAR.radius * 2;
  if (d >= min || d < 0.001) return;
  const push = (min - d) / 2;
  const ux = dx / d;
  const uz = dz / d;
  a.x -= ux * push;
  a.z -= uz * push;
  b.x += ux * push;
  b.z += uz * push;
  const avg = (a.speed + b.speed) / 2;
  a.speed = avg * 0.7;
  b.speed = avg * 0.7;
}
