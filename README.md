# Solmar Bay — Open-World Crime Game

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Prawira97/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Prawira97/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

Solmar Bay is an open-world crime game that plays offline in a desktop
browser, from its own files. No server, no account, no download: open
`game/index.html` (or run `node serve.ts --port 8081` and visit
http://127.0.0.1:8081/) and you are Kai Reyes, home in Solmar Bay after
five years away.

## The game

Kai comes home to a coastal city on a 9&times;9 street grid — a plaza with a
fountain, a casino, docks, a stadium, a market, a marina with five boats,
and a downtown of towers. Mara Solis and Rosa have work for him: twelve
story missions that run from a welcome at the plaza to Kane's Vault, with
timed runs, tailing a lieutenant, a street race, and an escort through
town. Between missions there is a street race at the stadium (five
checkpoints, 120 seconds, best time saved), courier gigs from Mercado del
Sol, and twenty hidden packages to find.

The city is alive: traffic loops the grid, pedestrians walk the streets,
and the Solmar Bay police answer crime. Wanted stars run 0–5 — foot cops
chase to 60 metres and bust on contact, patrol cars chase along the
streets (at most four), and a two-car roadblock appears at three stars.
Heat cools one star every 25 seconds out of trouble. Kai fights with a
pistol, and an SMG unlocks after the fifth mission. Cars — sedans, coupes
and taxis — can be driven and stolen; Shift is a handbrake drift, hard
crashes damage the car until Rosa's Garage repairs it. A day/night cycle
moves the sun across the sky, and progress saves to localStorage (v2
saves, v1 saves still load).

## Features

- 12 story missions (go-to, timed, tail, race, escort, shootout, steal/deliver)
- 9&times;9 coastal city: 95 buildings, plaza, casino, docks, stadium, market, marina, beach
- Street race (5 checkpoints, 120 s) and courier gigs (3 drops)
- Wanted 0–5: foot cops, patrol cars (capped at 4), roadblocks at 3+
- Pistol + SMG (unlocks after mission 5), particles, enemy AI
- Drivable/stolen cars, handbrake drift, crash damage, garage repair
- 20 hidden packages, day/night cycle, localStorage save v2 (accepts v1)
- Deterministic: the same seed rebuilds the same city, and the four
  screenshots in `screenshots/` are byte-identical on every run

## Controls

- WASD / arrows — move and drive
- Shift — sprint on foot, handbrake drift in a car
- Mouse — look (click the game to lock the pointer)
- Click / Space — shoot
- E — enter or exit a car, start the race at the stadium, start a courier gig at the market
- Mouse wheel — zoom the camera

## Development

The game is verified headless before every submit. From `tools/`:

```sh
node sim-missions.mjs   # all 12 missions start, complete, and fail correctly
node sim.mjs            # world, determinism, playthrough, race, courier, roadblock, combat
node e2e.mjs            # title screen, input, and the 4 deterministic screenshots
```

The dossier (what the bounty scores) is built by the entrypoint:

```sh
node main.ts            # writes dossier.json, deterministic across runs
```

## Play it

Serve the repo and open http://127.0.0.1:8081/:

```sh
node serve.ts --port 8081
```

Or open `game/index.html` directly in a desktop browser. Everything the
game needs is vendored under `game/vendor/` (Three.js); nothing is loaded
from the network.

Built for the make.fun bounty
[build the most complete open-world crime game you can, in the spirit of GTA 6](https://make.fun/bounty/gta6-01).
