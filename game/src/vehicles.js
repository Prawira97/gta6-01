// Solmar Bay — vehicles: arcade car physics, NPC traffic and the Manhattan
// grid router the escort truck (and the tail mark) follow so they never cut
// across a building block. One angle convention everywhere: heading 0 faces
// +x (east), PI/2 faces -z (north); forward is (cos h, -sin h).
import { CAR, GRID, ROADS } from './config.js';
import { dirX, dirZ } from './random.js';
import { snapToRoad } from './city.js';

export function makeCar(rng, opts = {}) {
  return {
    x: opts.x ?? 0,
    z: opts.z ?? 0,
    heading: opts.heading ?? 0,
    speed: 0,
    kind: opts.kind || 'sedan',
    color: opts.color ?? rng.pick([0xf2c200, 0xd23c2e, 0x2e6fd2, 0x3aa655, 0xe8e8e8, 0x222226]),
    driver: opts.driver ?? null,
    damage: 0,
    block: false,
  };
}

// The player car: accelerate / brake / reverse, steer (scaled by speed so a
// parked car cannot spin), and handbrake drift on sprint — sharper turn,
// speed bleeds off, smoke if the car is already hurt.
export function updatePlayerCar(car, input, dt) {
  const mv = input.move();
  const sprint = input.sprint();
  if (mv.y > 0) car.speed += CAR.accel * dt;
  else if (mv.y < 0) car.speed -= (car.speed > 0.5 ? CAR.brake : CAR.accel * 0.6) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 6 * dt);
  if (sprint) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 10 * dt);
  car.speed = Math.max(-CAR.reverseSpeed, Math.min(CAR.maxSpeed, car.speed));
  const steer = mv.x;
  const grip = sprint ? 1.9 : 1;
  const turn = steer * Math.max(-1, Math.min(1, car.speed / 10)) * CAR.steer * grip * dt;
  car.heading += turn;
  car.x += dirX(car.heading) * car.speed * dt;
  car.z += dirZ(car.heading) * car.speed * dt;
  car.x = Math.max(GRID.min, Math.min(GRID.max, car.x));
  car.z = Math.max(GRID.min, Math.min(GRID.max, car.z));
}

// NPC traffic: axis-aligned, one road at a time, turning at intersections.
// The RNG comes from the world, so traffic is identical for a given seed.
export function updateNpcCar(car, dt, rng) {
  const nearX = ROADS.some((r) => Math.abs(car.x - r) < 2);
  const nearZ = ROADS.some((r) => Math.abs(car.z - r) < 2);
  if (nearX && nearZ && rng.chance(dt * 0.35)) {
    car.heading += rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
  }
  car.speed = CAR.npcSpeed;
  car.x += dirX(car.heading) * car.speed * dt;
  car.z += dirZ(car.heading) * car.speed * dt;
  if (car.x < GRID.min + 4 || car.x > GRID.max - 4 || car.z < GRID.min + 4 || car.z > GRID.max - 4) {
    car.heading += Math.PI;
    car.x = Math.max(GRID.min + 4, Math.min(GRID.max - 4, car.x));
    car.z = Math.max(GRID.min + 4, Math.min(GRID.max - 4, car.z));
  }
}

// Manhattan route along the road grid: snap both ends onto roads, drive the
// L (first along the start's road, then along the destination's), then the
// short final leg to the exact destination. Never crosses a building block.
export function gridPath(start, dest) {
  const s = snapToRoad(start.x, start.z);
  const d = snapToRoad(dest.x, dest.z);
  const pts = [{ x: s.x, z: s.z }];
  if (s.x !== d.x) pts.push({ x: d.x, z: s.z });
  if (s.z !== d.z) pts.push({ x: d.x, z: d.z });
  if (d.x !== dest.x || d.z !== dest.z) pts.push({ x: dest.x, z: dest.z });
  return pts;
}

// Follow a grid route: steer toward the current node, advance on arrival.
// The escort truck uses npcSteerMul so it holds the road instead of
// beelining across blocks (the old bug that wedged it against a wall).
// A finished route parks the car: speed drops to zero instead of lingering.
export function followRoute(car, dt) {
  if (!car.route || car.nodeIndex >= car.route.length) {
    car.speed = 0;
    return true;
  }
  const node = car.route[car.nodeIndex];
  const dx = node.x - car.x;
  const dz = node.z - car.z;
  const d = Math.hypot(dx, dz);
  if (d < 3) {
    car.nodeIndex += 1;
    return car.nodeIndex >= car.route.length;
  }
  const want = Math.atan2(-dz, dx);
  let diff = want - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1.6 * dt * CAR.npcSteerMul, Math.min(1.6 * dt * CAR.npcSteerMul, diff));
  car.heading += steer;
  car.speed = CAR.npcSpeed;
  car.x += dirX(car.heading) * car.speed * dt;
  car.z += dirZ(car.heading) * car.speed * dt;
  return false;
}
