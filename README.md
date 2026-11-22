# Solmar Bay — Open-World Crime Game

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Prawira97/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Prawira97/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

Entry for the make.fun competition [gta6-01](https://make.fun/bounty/gta6-01):
build the most complete open-world crime game you can, in the spirit of
GTA 6, that plays offline in a desktop browser from its own files.

**Solmar Bay** is an original open-world crime game set in a sun-soaked
modern coastal city of its own. Kai Reyes is home after five years away,
and the city took everything from him once — this time he takes it back,
one job, one car, one street at a time. No Rockstar assets: every name,
character, place and story is original.

- **Open world** — a 9×9 city of streets, beach and docks to explore on
  foot and by car, with traffic, pedestrians, palms and a plaza fountain.
- **Cars** — drive, steal and outrun the law in sedans, coupes and taxis;
  parked cars face the road so they pull straight out. Shift is a handbrake
  for drifts; hard hits damage your car (smoke and crawl) until Rosa's
  Garage patches it up.
- **Wanted system** — five stars; police cars and foot cops respond to
  your crimes, chase you down and try to bust you. At three stars the PD
  sets roadblocks across the road ahead; at higher stars the pursuit gets
  faster and the foot cops shoot straighter. Lose them or lie low and the
  heat cools off.
- **Missions & story** — twelve story missions from Mara Solis and Rosa,
  from "Welcome Back" to "Kane's Vault", with tailing, street racing, escort
  and heist jobs, plus taxi fares and 20 hidden packages to find.
- **Side activities** — a repeatable street race from Solmar Stadium (five
  checkpoints against the clock) and courier gigs from Mercado del Sol.
- **The city** — a 9×9 grid of streets with a stadium, a marina full of
  boats, a market square and downtown towers, under a full day/night cycle.
- **Combat** — pistol and SMG (unlocked in mission 4), enemy guards and a
  final boss, tracers and a health bar.
- **Progression** — earn cash and reputation for missions, fares and
  packages; your progress saves automatically (localStorage).
- **HUD & minimap** — cash, reputation, health, wanted stars, speed,
  weapon, objective with distance, live minimap, mission banners, title /
  pause / busted / wasted screens.
- **Sound** — procedural WebAudio: engine hum, sirens, shots, pickups.
- **Offline** — plain static files, no network requests; runs from
  `game/index.html`. three.js is vendored under `game/vendor/`.

## Controls

W A S D move / drive · mouse look · Shift sprint / handbrake · E enter or
steal a car · click shoot · Q switch weapon · R reload · F interact ·
P / Esc pause · wheel camera zoom.

## Play it

Serve locally with `node serve.ts`, then open http://localhost:8080.

Deterministic screenshots: `?shot=start|play|mission|end&seed=1`
(see `shots.json`).

## Verify

Headless simulation (no browser): `node tools/sim.mjs` — builds the world,
checks determinism (same seed → identical state), plays through all 12 story
missions, runs the street race and courier gig, and checks roadblocks and
combat. Everything must print PASS.
