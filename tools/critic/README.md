# critic — automated playtest harness

Scores **Universal Paperclips** (the bar), **A Dark Room** and **Takeoff** on the same rubric. A greedy bot plays each game in headless Chromium for M real minutes; every second the harness records what is on screen; `metrics.mjs` turns those samples into numbers and `compare.mjs` puts runs side by side. The output is numbers only. The reviewer writes the judgement.

```
tools/critic/
  harness.mjs            serve → open → stage jump → bot loop → results/<name>.json + .md + .png
  metrics.mjs            samples → metrics (JSON + markdown); CLI re-computes a results file
  compare.mjs            2+ results → side-by-side rubric table
  adapters/common.mjs    in-page helpers (visibility, number parsing, seeded Math.random)
  adapters/paperclips.mjs  adapters/adarkroom.mjs  adapters/takeoff.mjs
  results/               recorded runs (see the bottom of this file)
```

Requirements: node 22, the global Playwright 1.56 (`/opt/node-tools/node_modules/playwright`), Chromium in `/opt/pw-browsers` (never run `playwright install`), and `http-server` on PATH (the harness falls back to a built-in static server if it is missing). There is nothing to install. Run everything from the repo root.

## Stage-1 head-to-head: Paperclips vs Takeoff, 12 minutes each

The two runs use separate ports and browsers, so they can run in parallel.

```sh
node tools/critic/harness.mjs --game paperclips --stage 1 --minutes 12 --seed 1 --out tools/critic/results/paperclips-s1-12m.json &
node tools/critic/harness.mjs --game takeoff    --stage 1 --minutes 12 --speed 1 --seed 1 --out tools/critic/results/takeoff-s1-12m.json &
wait
node tools/critic/compare.mjs tools/critic/results/paperclips-s1-12m.json tools/critic/results/takeoff-s1-12m.json --out tools/critic/results/compare-s1.md
```

Add A Dark Room as a third column (its fastest speed is hyper mode, ×2):

```sh
node tools/critic/harness.mjs --game adarkroom --stage 1 --minutes 12 --speed 2 --seed 1 --out tools/critic/results/adarkroom-s1-12m.json
node tools/critic/compare.mjs tools/critic/results/paperclips-s1-12m.json tools/critic/results/takeoff-s1-12m.json tools/critic/results/adarkroom-s1-12m.json
```

Use `--speed 1` for Takeoff in a head-to-head. Paperclips has no speed control, and every metric is measured in real seconds, so a faster Takeoff run would compress its idle stretches and reveal gaps. Use higher speeds only to reach later content (see below). `compare.mjs` prints the speed and the game seconds covered for each run.

## Later stages

| game | stage ids | how the jump works | example |
|---|---|---|---|
| paperclips | `1` business (fresh), `2` Earth (just after *Release the HypnoDrones*), `3` Universe (just after *Space Exploration*) | cheat functions + project clicks (listed below) | `--game paperclips --stage 2 --minutes 10` |
| adarkroom | `1` opening (fresh), `2` builder helping + forest, `3` small village (4 huts, lodge, 16 villagers), `4` the dusty path (compass, trading post) | `$SM` writes (listed below) | `--game adarkroom --stage 3 --minutes 8 --speed 2` |
| takeoff | `1`, `2`, `3`, `4a`, `4b`, `5a`, `5b` | `window.game.dev.jumpToStage(id)` (the dev snapshots) | `--game takeoff --stage 3 --minutes 10 --speed 5` |

Suggested pairings for the later rounds:

```sh
# stage 2: Paperclips' Earth stage vs Takeoff S2 (real time for both)
node tools/critic/harness.mjs --game paperclips --stage 2 --minutes 10 --seed 1 --out tools/critic/results/paperclips-s2-10m.json &
node tools/critic/harness.mjs --game takeoff    --stage 2 --minutes 10 --speed 1 --seed 1 --out tools/critic/results/takeoff-s2-10m.json &
wait
node tools/critic/compare.mjs tools/critic/results/paperclips-s2-10m.json tools/critic/results/takeoff-s2-10m.json

# stage 3: Paperclips' Universe stage vs Takeoff S3
node tools/critic/harness.mjs --game paperclips --stage 3 --minutes 10 --out tools/critic/results/paperclips-s3-10m.json &
node tools/critic/harness.mjs --game takeoff    --stage 3 --minutes 10 --speed 1 --out tools/critic/results/takeoff-s3-10m.json &
wait

# Takeoff coverage sweep (faster; numbers are real seconds, multiply by the speed for game seconds)
for s in 4a 4b 5a 5b; do node tools/critic/harness.mjs --game takeoff --stage $s --minutes 10 --speed 5 --out tools/critic/results/takeoff-s$s-10m-x5.json; done
```

## CLI

```
node tools/critic/harness.mjs --game paperclips|adarkroom|takeoff --stage N --minutes M --speed S --out results/<name>.json
    [--seed K]       seed Math.random in the page (mulberry32), so the reference games' event rolls repeat;
                     for Takeoff the harness also calls dev.set('seed', K) and dev.set('rng', K)
    [--clicks N]     production-button clicks per bot step (default 5, one step per second)
    [--shots]        also save a screenshot every minute to <out>-shots/
    [--headed]       watch it play
    [--server builtin|http-server]   (default: http-server when it is on PATH)
node tools/critic/metrics.mjs results/x.json [--json | --write]   re-compute (and with --write, rewrite x.json + x.md)
node tools/critic/compare.mjs a.json b.json [c.json …] [--out table.md]
```

Each run writes `<out>.json` (meta, metrics, page errors and all samples), `<out>.md` (the metrics table), and `<out>.png` (a final full-page screenshot). External requests such as CDNs and analytics are aborted, so A Dark Room uses its local jQuery. Console errors and failed local requests are recorded in `errors`. `meta.jumpNotes` records every cheat call or state write the stage jump actually made.

## What a sample is

One per second, taken **before** the bot acts:

| field | meaning |
|---|---|
| `t` | seconds since the run started (after the stage jump) |
| `enabledButtons` | visible labels of enabled actionable controls (modal choices are prefixed `event:`) |
| `disabledGoals` | visible but disabled build/upgrade/project buttons, i.e. the greyed goals |
| `panels` | visible panel/section ids or titles |
| `modalOpen`, `progressRunning` | modal/event open; progress bar or cooldown running |
| `headline`, `logTail` | main counter text; newest 3 log/console lines |
| `production` | the subset of `enabledButtons` that is the primary production verb (make paperclip, complete task, stoke/light fire, gather wood, check traps) |
| `enabledGoals` | the subset of `enabledButtons` that are purchases (build/upgrade/project) |
| `disabledControls`, `extraControls` | every visible disabled control; selects, sliders and location tabs (for the cognitive-load count) |
| `funds` | the spendable currency used for soft-lock detection (Paperclips: funds, then unused clips after the HypnoDrones; ADR: wood; Takeoff: funds) |
| `res`, `api`, `gameT`, `hint` | raw game state for debugging (Takeoff: `api` holds `dev.idle()`, `dev.affordableActions()`, project counts) |
| `acted` | what the bot did after this observation |

## Metrics → the seven rubric criteria

| criterion | metric(s) |
|---|---|
| 1. time to first meaningful choice | `timeToFirstChoice`: the first second with ≥2 distinct enabled non-production actions. Also `timeToFirstPurchaseChoice` (≥2 enabled purchases) and `timeToFirstPurchase`. |
| 2. seconds with nothing to do | `idleSeconds`: seconds with no enabled control, no modal and no progress bar, as a total and the longest streak. Also `idleSecondsExclProduction` (the same, ignoring the production button) and `idleSecondsNoPurchase` (nothing affordable to buy; this matches Takeoff's own `dev.idle()`, which is recorded as `idleSecondsGameApi` for comparison). |
| 3. cognitive load & progressive disclosure | `distinctControlsVisible`: the count of enabled + disabled controls + extra inputs on screen, as the mean and max per minute, plus start, end and max. Also `panelsPerMinute`. |
| 4. cadence of reveals | `revealsPerMinute`: new panel ids or new control/goal labels (enabled or disabled; modal choices excluded) that were never seen earlier in the run, per minute. Labels are normalised, so cost changes such as "deploy agent ($9.10)" → "($9.80)" are not reveals. The things on screen at t=0 are the baseline, not reveals. Also the longest gap between reveals and the full timeline. |
| 5. greyed-out goal always on screen | `goalAlwaysVisible`: the fraction of seconds with ≥1 disabled goal, and the longest gap with none |
| 6. clarity of stage transitions | `stageTransitions`: the seconds where the panel set changed by ≥3 items between consecutive samples, with the added and removed lists and the before and after sets |
| 7. soft-locks found | `softlocks`: an idle streak (strict definition) ≥180 s during which funds did not increase. Also `softlocksExclProduction`. |

## Adapters

Every adapter exports `{ name, serveDir, entryPath, stages, jumpToStage(page, id), observe(page) → Sample, act(page, sample) }`. Some also export `ready(page)`, `setSpeed(page, S)` and `botDefaults`. The bots are deliberately simple and deterministic: each step they click the production button a few times, then buy the cheapest enabled purchase (one per currency where a game has several), otherwise they do nothing. They are a yardstick, not a speedrun.

### Universal Paperclips

The source is the jgmize mirror, `index2.html`, which has the cheat functions uncommented. The game is served from the reference clone. The page's dev buttons are hidden with an injected style tag and are never counted. **Speed:** none. Runs are real time.

**Bot, one step per second:**
1. If `wire < max(200, 10 s × clips/s)` and funds allow, buy Wire (up to 3 spools).
2. Click *Make Paperclip* 5 times.
3. Pricing keeps unsold inventory in a band sized by the production rate. Lower the price when `unsold > max(60, 10 s × clips/s)` (twice if it is more than 3× that). Raise it when `unsold < max(10, 2 s × clips/s)`.
4. Click the oldest enabled project. It never clicks *Xavier Re-initialization*. Repeatables (Photonic Chip, Another Token of Goodwill, Threnody) wait while a one-off project is visible but unaffordable. If AutoTourney is on, the bot switches it off, because the bot never uses yomi and tournaments only burn ops.
5. With spare trust, buy Memory if a visible project costs more ops than `memory × 1000` or memory < processors; otherwise buy Processors.
6. Buy the cheapest enabled of AutoClippers, MegaClippers and Marketing, keeping `wireCost` in reserve while `wire < max(300, 30 s × clips/s)`.

After the HypnoDrones, a power rule applies first: buy a Solar Farm when supply is at or below demand. Then the bot buys the cheapest of Farm, Battery, Harvester, Wire Drone and Factory. In space, it launches probes, raises probe trust, and gives the free trust point to the lowest probe stat.

**Stage-jump cheat calls** (all made through `page.evaluate`; the exact sequence of each run is in `meta.jumpNotes`):

- **Stage 1**: none.
- **Stage 2 (Earth)**:
  1. `cheatClips()` ×1. This adds 100M clips and unused clips. `compFlag` and `projectsFlag` switch on, and `calculateTrust` ramps trust to about 24.
  2. `cheatMoney()` ×10, `cheatTrust()` ×70, `cheatCreat()` ×50, `cheatYomi()` ×1, `cheatOps()` ×50.
  3. `addProc()`/`addMem()` up to processors 25 and memory 69.
  4. Click every enabled project except *Release the HypnoDrones* and the repeatables (Beg for More Wire, Another Token of Goodwill, Xavier, Photonic Chip, Threnody), in list order, until nothing new is clickable for about 1 s. Before each click, the loop raises memory with `cheatTrust()`+`addMem()` whenever a visible project costs more ops than `memory × 1000` (ops are clamped to that cap every tick). It refills ops with `cheatOps()`, creativity with `cheatCreat()`, funds with `cheatMoney()` and yomi with `cheatYomi()`. In the recorded run this bought 30 projects, from RevTracker to Theory of Mind, including HypnoDrones.
  5. Spend the remaining trust alternately on `addMem()` and `addProc()`, because players reach the release with all trust allocated. This gave processors 56, memory 101 and trust 157.
  6. Click *Release the HypnoDrones*.
  7. Direct writes: `tempOps = 0; standardOps = memory*1000; creativity = 10000; yomi = 50000`.
- **Stage 3 (Universe)**:
  1. Everything in stage 2.
  2. `unusedClips += 1e12`.
  3. The same project loop for the stage-2 projects except *Space Exploration*: Tóth Tubule Enfolding, Power Grid, Nanoscale Wire Production, Harvester Drones, Wire Drones and Clip Factories.
  4. `zeroMatter()`, plus the writes `storedPower = 1e7` and `unusedClips = 6e27` to cover the cost of *Space Exploration*.
  5. `cheatTrust()`+`addMem()` up to memory 120, then `cheatOps()` until ops are full.
  6. Click *Space Exploration*.
  7. Direct writes: `standardOps = memory*1000; creativity = 10000; yomi = 50000; unusedClips = 1e20`.

**Observation:** `panels` are the visible sections out of 33 known divs (Business, Manufacturing, AutoClippers, Computational Resources, Projects, Investments, Strategic Modeling, Power, Swarm Computing and so on). The goals are project buttons plus build and upgrade buttons. Price, Disassemble, probe-stat, tournament and invest buttons are adjusters, not goals, and Wire is a consumable. The HypnoDrone flash counts as the modal. A running tournament counts as the progress bar. Note that *lower* and *raise price* are enabled from t=0, so `timeToFirstChoice` is 0 by construction. Use `timeToFirstPurchaseChoice` for the first real purchase decision.

### A Dark Room

The game is served from the reference clone over HTTP. **Speed:** `--speed 2` (or higher) runs `Engine.triggerHyperMode()`, the function the *hyper.* menu link calls after its confirm dialog, so ×2 is the maximum.

**Bot:**
1. If an event is open, click its first enabled button.
2. In the room: light the fire if it is dead; stoke it if it is below roaring and there is wood; build the cheapest affordable item, by relative cost `max(cost/held)`.
3. Go outside when gathering, checking traps or assigning workers is possible.
4. Outside: gather wood and check traps when ready. Assign a free villager to the job with the fewest workers while more than half the population is gathering.
5. Go back to the room when the fire, a build or the builder (level 3 → 4 happens on arrival) needs it.

**Stage-jump `$SM` writes**, cumulative and evaluated in the page in this order:

```
stage 2
  $SM.set('game.fire', Room.FireEnum.Roaring)
  $SM.set('game.temperature', Room.TempEnum.Hot)
  $SM.set('game.builder.level', 4)
  $SM.setIncome('builder', {delay: 10, stores: {wood: 2}})
  $SM.set('stores.wood', 50)
  $SM.set('game.buildings', {}); $SM.set('game.population', 0); $SM.set('game.workers', {})
  $SM.set('features.location.outside', true); Outside.init()
  Room.updateButton(); Room.setTitle(); Room.updateIncomeView(); Room.updateBuildButtons()
stage 3 (after stage 2)
  $SM.set('game.buildings', {trap: 4, cart: 1, hut: 4, lodge: 1})
  $SM.set('game.population', 16)
  $SM.setM('stores', {wood: 300, fur: 40, meat: 40, bait: 10})
  Outside.updateVillage(); Outside.updateWorkersView(); Outside.updateVillageIncome(); Outside.updateTrapButton(); Room.updateBuildButtons()
stage 4 (after stage 3)
  $SM.set('game.buildings["trading post"]', 1); $SM.set('game.buildings["tannery"]', 1); $SM.set('game.buildings["smokehouse"]', 1); $SM.set('game.buildings["hut"]', 8)
  $SM.set('game.population', 32)
  $SM.setM('stores', {wood: 1000, fur: 200, meat: 100, scales: 10, teeth: 10, leather: 30, 'cured meat': 30, compass: 1})
  Outside.updateVillage(); Outside.updateWorkersView(); Outside.updateVillageIncome(); Room.updateBuildButtons(); Room.updateStoresView()   // compass → Path.openPath()
```

The game buildings and workers are set *before* `features.location.outside`, because `Outside.init()` only creates them when that feature is still undefined.

**Observation caveats:**
- **Visibility.** A Dark Room shows one location at a time, but every unlocked location is one header click away. Controls and sections from all unlocked locations are therefore counted, and the header tabs are counted as `extraControls`.
- **Greyed goals.** The game greys build buttons only when they are maxed, never when they are unaffordable. The adapter counts an unaffordable build/craft/buy button as a `disabledGoal`; clicking one only prints "not enough wood".
- **Progress and production.** A running cooldown bar (stoke, gather, check traps) counts as `progressRunning`. *Light/stoke fire*, *gather wood* and *check traps* are production.
- **Sound prompt.** The one-off "Sound Available!" prompt counts as a modal, but its buttons are not counted as a game choice.

### Takeoff

The adapter is written against the dev/critic contract in `docs/architecture.md` and `docs/design.md` §9–10 and opens `index.html?dev=1`. **Speed:** `window.game.dev.setSpeed(S)`. **Stages:** `window.game.dev.jumpToStage(id)`; stage 1 is a fresh profile with no jump.

**Observation:**
- **Excluded chrome.** The dev overlay (`#devOverlay`) and the footer menu are excluded.
- **Panels** are the visible children of `#col2` and `#col3`, labelled by id plus the panel title when it differs, so renames show up.
- **Projects** are `.projectButton`, using the bold title.
- **Production** is *complete task*.
- **Adjusters** are ▼▲ and `[−][+]`.
- **Consumable:** *buy 500 kWh* (energy) is a consumable, not a goal.
- **Progress** comes from `state.training.phase`; the modal from `state.modal` or the `#modal` sheet.
- **Game API.** `dev.idle()`, `dev.affordableActions()` and `dev.listProjects()` are recorded in `api`.

**Bot**, mirroring the Paperclips bot:
1. Take the first enabled choice of any modal.
2. Click *complete task* 5 times.
3. Buy energy when it is below `max(200, 30 s × use)` and auto-buy is off.
4. Pricing keeps demand between 1.0× and 1.5× capacity: press ▲ above that band, ▼ below it.
5. Buy the oldest affordable project.
6. Hires alternate researcher and engineer. Otherwise buy the cheapest enabled purchase relative to the currency held. Free actions such as *release* go first.

## Recorded runs (`results/`)

Recorded on 2026-10-03, headless Chromium at 1280×900 and `--seed 1`. Re-run any of them with the matching command above.

| file | command |
|---|---|
| `paperclips-s1-10m.*` | `--game paperclips --stage 1 --minutes 10 --seed 1` |
| `paperclips-s2-5m.*` | `--game paperclips --stage 2 --minutes 5 --seed 1` |
| `adarkroom-s1-8m.*` | `--game adarkroom --stage 1 --minutes 8 --speed 2 --seed 1` |
| `compare-reference.md` | `compare.mjs` over the three runs above |

What the bots reached:
- **Paperclips stage 1 (10 min, real time).**
  - AutoClippers appear at 0:23. Computational Resources, Trust and Projects all appear together at 2:58, so that is the run's one stage transition (+3 panels).
  - The bot bought 4 projects: RevTracker, Improved AutoClippers, Improved Wire Extrusion and Even Better AutoClippers.
  - It ended with 33 AutoClippers, trust 6 (2 processors, 4 memory) and 16,926 clips, and never ran out of wire.
- **Paperclips stage 2 (5 min).** Power Grid, Nanoscale Wire, Harvester and Wire Drones were bought, and the Power, Wire Production and drone panels appeared. Clip Factories was still greyed at the end.
- **A Dark Room stage 1 (8 min at hyper, 16 game minutes).** The fire was lit at 0:01 and the forest opened at 0:23. The builder started building at 1:28 (trap and cart), the hut appeared at 3:04, the lodge at 6:12 and workers at 7:59.

See `compare-reference.md` for the full rubric table over these three runs.
