// Solmar Bay — cars: parked rides along the streets, traffic that loops
// the grid, and the player's driving: throttle, steering, handbrake drift,
// crash damage with smoke, and repair at Rosa's Garage.
import { CAR, WORLD, LOCATIONS } from './config.js';
import { gridPath, nearestStreet } from './city.js';
import { followPath } from './people.js';
import { smoke } from './effects.js';

const CAR_COLORS = [0xc03030, 0x3060c0, 0xe0c020, 0x30a060, 0xd8d8d8, 0x303030, 0xc06030, 0x8040a0];
const KINDS = ['sedan', 'sedan', 'sedan', 'coupe', 'taxi'];

export function makeCar(world, x, z, kind, driver) {
  return {
    x, z,
    heading: 0,
    speed: 0,
    slide: 0,
    kind,
    driver: driver || null,
    color: kind === 'taxi' ? 0xe0c020 : world.rng.pick(CAR_COLORS),
    damage: 0,
    route: null,
    routeIndex: 0,
    retarget: 0,
  };
}

export function createCars(world) {
  const rng = world.rng;
  const cars = [];
  // Parked rides, facing along the street they sit on.
  for (let i = 0; i < 8; i += 1) {
    const alongX = rng.chance(0.5);
    const street = rng.pick(WORLD.STREETS);
    const along = rng.float(-224, 224);
    const car = makeCar(world, alongX ? along : street, alongX ? street : along, KINDS[i % KINDS.length], null);
    car.heading = alongX ? 0 : Math.PI / 2;
    // Park at the street edge so the road stays clear.
    if (alongX) car.z += 6;
    else car.x += 6;
    cars.push(car);
  }
  // Traffic, looping the grid.
  for (let i = 0; i < 6; i += 1) {
    const street = rng.pick(WORLD.STREETS);
    const along = rng.float(-224, 224);
    const car = makeCar(world, street, along, KINDS[(i + 2) % KINDS.length], 'traffic');
    car.speed = rng.float(6, 10);
    car.route = gridPath({ x: car.x, z: car.z }, { x: nearestStreet(rng.float(-224, 224)), z: nearestStreet(rng.float(-224, 224)) });
    car.routeIndex = 0;
    cars.push(car);
  }
  return cars;
}

// Drive the player's car with the input: W/S throttle, A/D steer, Shift
// handbrake (sharper turn, the tail slides). Returns the new speed.
export function driveCar(world, car, input, dt) {
  const move = input.move();
  const handbrake = input.sprint();
  const maxSpeed = car.damage >= 100
    ? CAR.wreckMax
    : CAR.maxSpeed * (1 - car.damage / 200);
  if (move.y > 0) {
    car.speed += CAR.accel * dt * move.y;
  } else if (move.y < 0) {
    car.speed -= CAR.brake * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 6 * dt);
  }
  car.speed = Math.max(-CAR.reverse, Math.min(maxSpeed, car.speed));
  const turnRate = CAR.turn * (handbrake ? 1.9 : 1) * Math.min(1, Math.abs(car.speed) / 10);
  car.heading += move.x * turnRate * dt * Math.sign(car.speed || 1);
  // Drift: the tail slides out under handbrake, then grips back.
  const targetSlide = handbrake && Math.abs(car.speed) > 5 ? move.x * car.speed * 0.35 : 0;
  car.slide += (targetSlide - car.slide) * Math.min(1, (handbrake ? 6 : 3) * dt);
  const fx = Math.cos(car.heading);
  const fz = Math.sin(car.heading);
  const rx = -Math.sin(car.heading);
  const rz = Math.cos(car.heading);
  car.x += (fx * car.speed + rx * car.slide) * dt;
  car.z += (fz * car.speed + rz * car.slide) * dt;
  // Wrecked cars smoke.
  if (car.damage > 60 && world.rng.chance(0.1)) {
    smoke(world, car.x, car.z, 1.2);
  }
  return car.speed;
}

// Traffic cars follow their route; at the end, pick a new destination.
export function updateTraffic(world, dt) {
  for (const car of world.cars) {
    if (car.driver !== 'traffic') continue;
    if (!car.route || car.routeIndex >= car.route.length) {
      car.route = gridPath(
        { x: car.x, z: car.z },
        { x: nearestStreet(world.rng.float(-224, 224)), z: nearestStreet(world.rng.float(-224, 224)) },
      );
      car.routeIndex = 0;
    }
    car.speed = 8;
    followPath(car, dt);
  }
}

// A hard hit on a building: damage, a speed cut and a thud.
export function crashCar(world, car) {
  if (Math.abs(car.speed) < CAR.damageSpeed) return;
  car.damage = Math.min(120, car.damage + CAR.damagePerHit);
  car.speed *= 0.3;
  if (world.sound) world.sound('crash');
  if (world.message && car.driver === 'player') {
    world.message(car.damage >= 100 ? 'Wrecked! Get it to Rosa\u2019s Garage.' : 'Crash!');
  }
}

// Repair at Rosa's Garage: free, instant, only when parked close.
export function tryRepair(world) {
  const car = world.playerCar;
  if (!car || car.damage <= 0) return false;
  const d = Math.hypot(car.x - LOCATIONS.garage.x, car.z - LOCATIONS.garage.z);
  if (d > 12) return false;
  car.damage = 0;
  if (world.message) world.message('Repaired at Rosa\u2019s Garage.');
  if (world.sound) world.sound('repair');
  return true;
}
