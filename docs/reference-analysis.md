# Reference analysis: Universal Paperclips, A Dark Room, Game Dev Story, AI 2027

This document is the evidence base for *Takeoff* (see `docs/design.md`). It was produced before any game code was written, from a line-by-line read of both reference codebases and from the wikis and narrative sources the design draws on. Each part was written by a separate research pass; the synthesis at the end says what the game takes from each.

| Part | Subject | Basis | Lines |
|---|---|---|---|
| I | Universal Paperclips, source code | `jgmize/paperclips` mirror of decisionproblem.com/paperclips: main.js, projects.js, globals.js, combat.js, index2.html, interface.css read in full; every claim cites `file:line` | 2282 |
| II | Universal Paperclips, fandom wiki | universalpaperclips.fandom.com (Stages, per-resource pages, projects, endings, talk pages) via search extracts, cross-checked against the source | 1412 |
| III | A Dark Room, source code | `doublespeakgames/adarkroom` @ 1fada46: engine, room, outside, path, world, ship, space, events, state manager, CSS read in full; every claim cites `file:line` | 2662 |
| IV | Game Dev Story, Kairosoft wiki | kairosoft.fandom.com + StrategyWiki/GameFAQs extracts; the develop → debug → review → sales loop the training loop is modelled on | 849 |
| V | AI 2027 and the narrative corpus | ai-2027.com (scenario, both endings, five research supplements), Situational Awareness, Wait But Why parts 1–2, If Anyone Builds It, Everyone Dies | 1308 |
| VI | Synthesis | what *Takeoff* takes from each, mechanic by mechanic | — |

A note on access: this session's network policy allowed GitHub but denied the wiki and essay hosts directly. Parts II, IV and V were therefore built from search-engine extracts and full-text mirrors, and each says so and marks anything it could not verify. Parts I and III are first-hand.

The three-line summary that matters most for the design: Paperclips reveals every upgrade the moment its *trigger* fires and only greys it until it is *affordable* (so a goal is always on screen); A Dark Room hides the whole game behind one button and sequences the first two minutes with timers, naming its tabs after the state of the world; Game Dev Story turns "make a thing" into a repeatable loop with a visible ship-now-or-polish decision and a scorecard at the end.

---

# Part I. Universal Paperclips, source code

# Universal Paperclips — Source-Code Analysis

Source snapshot analysed: `scratchpad/ref/paperclips/docs/` (main.js 5546 lines, projects.js 2452, combat.js 802, globals.js 182, index2.html 907, interface.css 789, index.html 27, titlescreen.css 13). Every `file:line` below refers to that snapshot. All of main.js, projects.js, globals.js and index2.html were read in full; combat.js and interface.css were read in full as well.

Conventions used in this document:

- `main:NNN` = main.js line NNN, `proj:NNN` = projects.js, `html:NNN` = index2.html, `css:NNN` = interface.css, `glob:NNN` = globals.js, `combat:NNN` = combat.js.
- "tick" = one iteration of the 10 ms main loop (`main:3241-3598`) unless stated otherwise.
- Where the source is ambiguous, contradictory, or dead code, it is called out as **[ambiguity]** or **[dead code]**.
- Nothing in this document comes from outside the source files. Where a "typical" value is given it is derived from the formulas, and the derivation is shown.

One correction to the brief up front: projects.js defines **96** projects (96 `projects.push(...)` calls, `proj:30` … `proj:2452`), not ~150. Project variable names are numbered sparsely (`project1`…`project10b`…`project219`), which is why the ids suggest a larger count. All 96 are catalogued in Section 3.

---

### 1. Architecture overview

#### 1.1 File roles

| File | Lines | Role |
|---|---|---|
| `index.html` | 27 | Title screen. A single `<a href=index2.html>` wrapping `<img src="title.png" height=355 width=453>` (`index.html:19-24`), centred by `titlescreen.css`. Also carries a Google Analytics gtag snippet (`index.html:5-12`). No game code. |
| `index2.html` | 907 | The entire game DOM, hand-written and static. Every panel, button, span and table that will ever be shown already exists in the markup; the game only toggles `style.display` and rewrites `innerHTML`. Scripts are loaded at the very bottom of `<body>` (`html:901-904`). |
| `interface.css` | 789 | All styling for index2.html (columns, buttons, tooltips, console, project buttons, quantum chips, tables, battle canvas). |
| `combat.js` | 802 | Loaded **first** (`html:901`). Declares combat/battle globals (`combat:2-50`), the non-canvas battle bookkeeping (`checkForBattles`, `createBattle`, `generateBattleName`), and a canvas flocking/combat renderer (`Battle()` constructor, `combat:271-693`) that is instantiated and started at load (`combat:799-800`). A large block of older DOM-report code is commented out (`combat:81-266`). |
| `globals.js` | 182 | Loaded second (`html:902`). Plain `var` declarations with initial values for most game state (`glob:1-169`). Some state is declared in main.js instead (investments `main:741-755`, strategy `main:1003-1035`, probes `main:2871-2897`, swarm gift bits `main:1932-1933`, misc). |
| `projects.js` | 2452 | Loaded third (`html:903`). Declares `projects = []`, `activeProjects = []` (`proj:5-6`) and 96 project object literals, each pushed onto `projects`. Project `trigger`/`cost`/`effect` closures read and write the globals directly. |
| `main.js` | 5546 | Loaded last (`html:904`). All mechanics, all timers, DOM update routines, save/load, cheats. Because it is last, it can reference project objects by name (e.g. `project121.flag` at `main:391`) and combat globals. |

#### 1.2 How index2.html wires the scripts

```html
<!-- html:901-904 -->
<script type="text/javascript" src="combat.js?v2"></script>
<script type="text/javascript" src="globals.js?v2"></script>
<script type="text/javascript" src="projects.js?v2"></script>
<script type="text/javascript" src="main.js?v2"></script>
```

- There is no `<!DOCTYPE>` (`html:1` is a bare `<html>`), so the page renders in **quirks mode**. This matters for the CSS: dozens of rules use unitless lengths (`margin: 5;`, `font-size: 11;` — e.g. `css:385-388`, `css:569-570`) which are only honoured in quirks mode (interpreted as px).
- No framework, no modules, no bundler, no `DOMContentLoaded` handler. Because the scripts sit at the end of `<body>`, top-level code can call `document.getElementById(...)` immediately (e.g. `main:240`, `main:1178`).
- Top-level side effects at load, in order: combat.js builds `battleNumbers` (`combat:67-71`) and starts the canvas loop (`combat:799-800`); projects.js fills `projects[]`; main.js hides `hypnoDroneEventDiv` (`main:240`), disables the Run Tournament button (`main:1178`), checks localStorage for a save and loads it (`main:3229-3236`), then registers the intervals (Section 2).
- Audio: `threnodyAudio = new Audio()` (`glob:168`); `loadThrenody()` sets `src = "test.mp3"` (`main:8-11`). The `<audio id="threnody1">` tag in the HTML is commented out (`html:8-11`). No `test.mp3` exists in this snapshot; `playThrenody()` only plays if `canplaythrough` fired (`main:13-18`), so the missing file silently does nothing.
- The cache-buster `?v2` suffixes are the only versioning present.

#### 1.3 The global-variable state model

All game state is **global mutable `var`s** on `window`. There is no state object, no getters/setters, and no event system. Three patterns recur:

1. **Quantities**: `clips`, `funds`, `wire`, `operations`, `creativity`, `trust`, `yomi`, `honor`, `unusedClips`, `availableMatter`, … (`glob:1-169`).
2. **Flags** (0/1 integers, occasionally booleans) that gate both logic and UI visibility: `humanFlag` (1 = Stage 1), `spaceFlag` (1 = Stage 3), `compFlag`, `projectsFlag`, `autoClipperFlag`, `megaClipperFlag`, `wireBuyerFlag`, `investmentEngineFlag`, `strategyEngineFlag`, `creativityOn`, `factoryFlag`, `harvesterFlag`, `wireDroneFlag`, `wireProductionFlag`, `tothFlag`, `swarmFlag`, `qFlag`, `battleFlag`, `autoTourneyFlag`, `revPerSecFlag`, `dismantle` (0..7), `milestoneFlag` (0..20).
3. **Project flags**: every project object carries `flag: 0` which its `effect()` sets to 1 (`proj:18`, etc.). main.js reads these directly for UI (`project121.flag`, `project131.flag`, `project45.flag`, `project127.flag`, `project130.flag`, `project129.flag`, `project148.flag`, `project128.flag`, `project134.flag`, `project46.flag`, `project211/212/213/215/216.flag`), and projects read each other's flags as triggers.

Derived values (`demand`, `marketing`, `clipRate`, `avgRev`, `powMod`, `probeUsedTrust`, …) are recomputed every tick and stored back into globals rather than computed on demand.

A few globals are **duplicated or vestigial**: `marketingEffectiveness` is declared twice (`glob:41-42`); `clippperCost` (three p's, `glob:26`) is a typo'd constant 5 that `makeClipper` still checks against (`main:1667`) while the real `clipperCost` is deducted (`main:1669`) **[bug: the affordability check inside makeClipper uses the stale constant; the button's `disabled` state computed at `main:468` is what actually prevents overspend]**; `clipmakerRate`, `nanoWire`, `processedMatter`, `creationFlag`, `trustFlag`, `x`, `elapsedTime` are saved/loaded but have no gameplay effect **[dead state]**.

#### 1.4 How the DOM is updated

Three mechanisms, all imperative:

1. **`innerHTML` writes to spans by id.** The id vocabulary in index2.html (`clips`, `funds`, `wire`, `operations`, `trust`, `creativity`, `yomiDisplay`, `honorDisplay`, `probesTotalDisplay`, …) is written to from many places: a central `updateStats()` every tick (`main:2403-2464`), plus ad-hoc writes inside each purchase function (e.g. `makeClipper` writes `clipmakerLevel2` and `clipperCost`, `main:1670-1674`). After load, `refresh()` (`main:3646-3742`) rewrites ~45 spans in one go.
2. **`style.display = ""` / `"none"` toggles**, overwhelmingly inside `buttonUpdate()` (`main:332-731`), which runs **every 10 ms** and re-asserts the visibility of every panel from the flags. This is effectively an immediate-mode UI: nothing is "revealed once"; the flag is set and the next tick's `buttonUpdate` shows the panel. Secondary toggle sites: `updateSwarm()` (`main:2042-2121`), `updatePower()` (`main:2350-2354`), the ending block of the main loop (`main:3369-3566`), tournament display (`main:1300-1301, 1499-1500, 1513-1514, 1521-1522`).
3. **`disabled` toggles** on buttons, also mostly in `buttonUpdate` (`main:427-723`), `updateDroneButtons` (`main:1853-1895`), `updatePower` (`main:2305-2343`), `updateSwarm` (`main:1943-1951`) and `manageProjects` (`main:197-203`).

Dynamic DOM creation happens in exactly three places: project buttons (`displayProjects`, `main:207-236`), strategy `<option>`s appended to `#stratPicker` (`proj:1219-1223` etc. and on load `main:4632-4636`), and the (commented-out) battle reports.

#### 1.5 The white "cover"

`<div id="cover">` (`html:15`) is a fixed, full-viewport, white, `z-index:10` sheet (`css:162-170`). It is hidden by the **last line of `buttonUpdate`** (`main:729`). Since `buttonUpdate` first runs on the first 10 ms tick, the player never sees the un-toggled DOM (which would briefly show every panel of all three stages). This is the only "flash of unstyled state" protection in the game.

#### 1.6 Global state reference (globals.js, every variable)

Initial values as declared. "Dead" = saved/loaded but never read for gameplay.

| Var (line) | Initial | Meaning / where used |
|---|---|---|
| `clips` (1) | 0 | lifetime clips; headline counter, milestones, trust |
| `unusedClips` (2) | 0 | clips available as building material (S2+) |
| `clipRate` (3) | 0 | displayed clips/sec, updated once per second (`main:3266-3277`) |
| `clipRateTemp` (4), `prevClips` (5), `clipRateTracker` (6) | 0 | clip-rate accumulator state |
| `clipmakerRate` (7) | 0 | **dead** |
| `clipmakerLevel` (8) | 0 | AutoClipper count |
| `clipmakerLevel2` (9) | 0 | **dead** (the display span is named `clipmakerLevel2`, the var is unused) |
| `clipperCost` (10) | 5 | AutoClipper price |
| `unsoldClips` (11) | 0 | S1 inventory |
| `funds` (12) | 0 | dollars |
| `margin` (13) | .25 | price per clip |
| `wire` (14) | 1000 | inches of wire |
| `wireCost` (15) | 20 | current spool price (displayed) |
| `adCost` (16) | 100 | next marketing level price |
| `demand` (17) | 5 | recomputed every tick in S1 |
| `clipsSold` (18) | 0 | lifetime sales count (display only) |
| `avgRev` (19) | 0 | displayed avg revenue/sec |
| `income` (20) | 0 | lifetime revenue, differenced per second |
| `incomeTracker` (21) | [0] | last 10 per-second incomes |
| `ticks` (22) | 0 | main-loop tick counter (saved; drives `timeCruncher`) |
| `marketing` (23) | 1 | `1.1^(marketingLvl-1)` |
| `marketingLvl` (24) | 1 | marketing level |
| `x` (25) | 0 | **dead** |
| `clippperCost` (26) | 5 | typo'd constant checked in `makeClipper` |
| `processors` (27) | 1 | ops/sec = 10×processors |
| `memory` (28) | 1 | ops cap = 1000×memory |
| `operations` (29) | 0 | displayed ops (`standardOps + tempOps`) |
| `trust` (30) | 2 | trust |
| `nextTrust` (31) | 3000 | next Fibonacci clip threshold |
| `transaction` (32) | 1 | last sale value |
| `clipperBoost` (33) | 1 | AutoClipper multiplier (+.25, +.5, +.75, +5) |
| `blinkCounter` (34) | 0 | shared counter for `blink()` |
| `creativity` (35) | 0 | creativity |
| `creativityOn` (36) | false | set by project3 |
| `safetyProjectOn` (37) | false | **dead** |
| `boostLvl` (38) | 0 | AutoClipper upgrade tier (chains projects 1→4→5) |
| `wirePurchase` (39) | 0 | spools bought (triggers 7, 26) |
| `wireSupply` (40) | 1000 | inches per spool |
| `marketingEffectiveness` (41, 42) | 1 | project multiplier ×1.5 ×2 ×5 (declared twice) |
| `milestoneFlag` (43) | 0 | sequential milestone index 0..20 |
| `bankroll` (44) | 0 | investment cash |
| `fib1`, `fib2` (45, 46) | 2, 3 | Fibonacci state for trust |
| `strategyEngineFlag` (47) | 0 | shows Strategic Modeling |
| `investmentEngineFlag` (48) | 0 | shows Investments (zeroed in S2) |
| `revPerSecFlag` (49) | 0 | shows avg rev lines (RevTracker) |
| `compFlag` (50) | 0 | shows Computational Resources |
| `projectsFlag` (51) | 0 | shows Projects |
| `autoClipperFlag` (52) | 0 | shows AutoClipper buy (funds ≥ 5) |
| `megaClipperFlag` (53) | 0 | shows MegaClippers |
| `megaClipperCost` (54) | 500 | first MegaClipper price (formula gives 1,000 thereafter) |
| `megaClipperLevel` (55) | 0 | MegaClipper count |
| `megaClipperBoost` (56) | 1 | multiplier (+.25, +.5, +1) |
| `creativitySpeed` (57) | 1 | recomputed in `addProc` |
| `creativityCounter` (58) | 0 | tick accumulator for creativity |
| `wireBuyerFlag` (59) | 0 | WireBuyer unlocked (zeroed in S2) |
| `demandBoost` (60) | 1 | ×5 ×10 from takeover/monopoly |
| `humanFlag` (61) | 1 | **Stage 1 switch** |
| `trustFlag` (62) | 1 | **dead** |
| `nanoWire` (63) | 0 | **dead** (set once at release) |
| `creationFlag` (64) | 0 | **dead** |
| `wireProductionFlag` (65) | 0 | shows Wire Production panel |
| `spaceFlag` (66) | 0 | **Stage 3 switch** |
| `factoryFlag`, `harvesterFlag`, `wireDroneFlag` (67-69) | 0 | show the three S2 build buttons |
| `factoryLevel` (70) | 0 | factory count |
| `factoryBoost` (71) | 1 | 1000 after project102 (then × factoryLevel) |
| `droneBoost` (72) | 1 | 2 after project112 (then × drone level) |
| `availableMatter` (73) | 6×10^27 | grams of Earth; later grows with exploration |
| `acquiredMatter` (74) | 0 | harvested, awaiting wire drones |
| `processedMatter` (75) | 0 | **dead** |
| `harvesterLevel`, `wireDroneLevel` (76, 77) | 0 | drone counts |
| `factoryCost` (78) | 10^8 | current factory price |
| `harvesterCost`, `wireDroneCost` (79, 80) | 10^6 | current drone prices |
| `factoryRate` (81) | 10^9 | clips per factory per tick (×100, ×1000) |
| `harvesterRate` (82) | 26,180,337 | g per harvester per tick (10^7·φ²) |
| `wireDroneRate` (83) | 16,180,339 | g per wire drone per tick (10^7·φ) |
| `harvesterBill`, `wireDroneBill`, `factoryBill` (84-86) | 0 | cumulative spend, refunded by Disassemble All |
| `probeCount` (87) | 0 | live probes |
| `totalMatter` (88) | 3×10^55 | grams in the universe |
| `foundMatter` (89) | = availableMatter | matter discovered so far (% explored) |
| `qFlag` (90) | 0 | shows Quantum Computing |
| `qClock` (91) | 0 | sine clock, +.01 per tick |
| `qChipCost` (92) | 10000 | next Photonic Chip price (+5000) |
| `nextQchip` (93) | 0 | index of next chip to activate |
| `bribe` (94) | 10^6 | Another Token of Goodwill price (×2) |
| `battleFlag` (95) | 0 | shows combat canvas + drifter counts |
| `prestigeU`, `prestigeS` (97, 98) | 0 | prestige counters (separate save key) |
| `autoTourneyFlag` (100) | 0 | shows AutoTourney toggle |
| `egoFlag` (101) | 0 | **dead** |
| `tothFlag` (102) | 0 | shows Unused Clips; gates Power Grid |
| `wirePriceCounter` (104) | 0 | sine argument for wire price |
| `wireBasePrice` (105) | 20 | drifting base price |
| `farmRate` (107) | 50 | MW per Solar Farm (÷100 per tick) |
| `batterySize` (108) | 10000 | MW-s per Battery Tower |
| `factoryPowerRate` (109) | 200 | MW per factory |
| `dronePowerRate` (110) | 1 | MW per drone |
| `farmLevel`, `batteryLevel` (111, 112) | 0 | counts |
| `farmCost` (113) | 10^7 | first farm price (formula gives 10^8·n^2.78 after) |
| `batteryCost` (114) | 10^6 | first battery price (formula 10^7·n^2.54 after) |
| `storedPower` (115) | 0 | MW-s in batteries |
| `powMod` (116) | 0 | performance multiplier 0..1 (or >1 with momentum) |
| `farmBill`, `batteryBill` (117, 118) | 0 | refundable spend |
| `momentum` (119) | 0 | 1 after project125 |
| `swarmFlag` (121) | 0 | Swarm Computing unlocked |
| `swarmStatus` (122) | 7 | 0 Active … 9 NO RESPONSE |
| `swarmGifts` (123) | 0 | spendable processor/memory tokens |
| `nextGift` (124) | 0 | size of the next gift |
| `giftPeriod` (125) | 125000 | gift "bits" required |
| `giftCountdown` (126) | = giftPeriod | displayed ticks to next gift |
| `elapsedTime` (127) | 0 | **dead** (old gift method) |
| `honor` (129) | 0 | honor |
| `maxTrust` (130) | 20 | probe design cap |
| `maxTrustCost` (131) | 91117.99 | honor per +10 maxTrust (constant) |
| `disorgCounter`, `disorgFlag`, `disorgMsg` (132, 133, 135) | 0 | swarm disorganisation state |
| `synchCost` (134) | 5000 | yomi to synchronise |
| `threnodyCost` (136) | 50000 | creativity for Threnody (yomi = /10) |
| `entertainCost` (138) | 10000 | creativity to entertain (+10000) |
| `boredomLevel`, `boredomFlag`, `boredomMsg` (139-141) | 0 | swarm boredom state |
| `wireBuyerStatus` (143) | 1 | WireBuyer ON/OFF |
| `wirePriceTimer` (144) | 0 | ticks since last purchase (×100 ms) |
| `qFade` (145) | 1 | opacity of "qOps" text |
| `autoTourneyStatus` (146) | 1 | AutoTourney ON/OFF |
| `driftKingMessageCost` (147) | 1 | ops per Emperor-of-Drift line |
| `sliderPos` (148) | 0 | Work(0)…Think(200) |
| `tempOps` (149) | 0 | quantum overflow ops above the cap |
| `standardOps` (150) | 0 | the real ops pool |
| `opFade` (151) | 0 | per-tick decay of tempOps |
| `opFadeTimer` (153) | 0 | ticks since tempOps appeared |
| `opFadeDelay` (154) | 800 | ticks before decay accelerates |
| `dismantle` (156) | 0 | ending stage 0..7 |
| `endTimer1`…`endTimer6` (157-162) | 0 | ending choreography counters |
| `testFlag` (164) | 0 | **dead** |
| `finalClips` (165) | 0 | last 100 manual clicks |
| `resetFlag` (167) | 2 | save kill-switch (load resets if ≠ 2) |
| `threnodyAudio` (168) | `new Audio()` | ending music element |
| `threnodyLoadedBool` (169) | false | set on `canplaythrough` |

State declared in main.js rather than globals.js: investments (`main:741-755`: `stocks`, `alphabet`, `portfolioSize`, `stockID`, `secTotal`, `portTotal`, `sellDelay`, `riskiness` 5, `maxPort` 5, `m`, `investLevel`, `investUpgradeCost` 100, `stockGainThreshold` .5, `ledger`, `stockReportCounter`); strategy (`main:1003-1035`: `tourneyCost` 1000, `tourneyLvl`, move-name arrays, round state, `pick` 10, `yomi` 0, `yomiBoost` 1, `allStrats`, `strats`, `results`, `resultsFlag`, `resultsTimer`); swarm gift bits (`main:1932-1933`); multi-buy price caches (`main:1800-1805`, `2145-2148`); `maxFactoryLevel`, `maxDroneLevel` (`main:1691-1692`); probes (`main:2871-2897`: `probeSpeed`, `probeNav`, `probeXBaseRate` 1.75×10^18, `probeRep`, `probeRepBaseRate` .00005, `partialProbeSpawn`, `probeHaz`, `probeHazBaseRate` .01, `partialProbeHaz`, `probesLostHaz/Drift/Combat`, `probeFac`, `probeFacBaseRate` 10^-6, `probeHarv`, `probeHarvBaseRate` 2×10^-6, `probeWire`, `probeWireBaseRate` 2×10^-6, `probeDescendents`, `drifterCount`, `probeTrust`, `probeUsedTrust`, `probeDriftBaseRate` 10^-6, `probeLaunchLevel`, `probeCost` 10^17, `probeTrustCost`); saving timers (`main:3602-3603`); revenue scratch vars (`main:2466-2472`). Combat state is in combat.js (`combat:2-50`: canvas 310×150, grid 31×15, `battleMAXSPEED` 2, `battleDEATH_THRESHOLD` .5, `probeCombat`, `probeCombatBaseRate` .15, `attackSpeed` .2, `battleSpeed` .2, `attackSpeedFlag`, `attackSpeedMod` .1, `battles`, `battleID`, `battleName`, `battleNameFlag`, `maxBattles` 1, `battleClock`, `battleAlarm` 10, `outcomeTimer` 150, `drifterCombat` 1.75, `warTrigger` 10^6, `unitSize`, `driftersKilled`, `battleEndDelay`, `battleEndTimer` 100, `masterBattleClock`, `honorCount`, `threnodyTitle` "Durenstein 1", `bonusHonor`, `honorReward`).


#### 1.7 Function index (main.js and combat.js)

Every named function, in file order, with the line it starts on and what it does. Projects.js defines no standalone functions (only closures inside project objects).

**main.js**

| Line | Function | Purpose |
|---|---|---|
| 3 | `threnodyLoaded()` | sets `threnodyLoadedBool = true` on `canplaythrough` |
| 8 | `loadThrenody()` | sets `threnodyAudio.src = "test.mp3"` and registers the listener |
| 13 | `playThrenody()` | plays the audio if loaded (Threnody project, ending) |
| 23 | `adjustWirePrice()` | wire base-price decay and sine wobble (slow loop) |
| 40 | `toggleWireBuyer()` | WireBuyer ON/OFF |
| 50 | `buyWire()` | buy one spool; bumps base price |
| 146 | `quantumCompute()` | advances `qClock`, sets chip values/opacity (main loop) |
| 154 | `qComp()` | Compute button: converts chip sum to ops, overflow to `tempOps` |
| 186 | `manageProjects()` | reveals triggered projects, toggles `disabled` on active ones (main loop) |
| 207 | `displayProjects(project)` | builds a `.projectButton` and appends it; blinks it |
| 243 | `longBlink(elemID)` / 250 `longToggleVisibility` | 32 ms flash of the HypnoDrone banner with changing text |
| 285 | `hypnoDroneEvent()` | starts the banner flash |
| 294 | `displayMessage(msg)` | shifts the five console lines, writes the new one |
| 305 | `blink(elemID)` / 312 `toggleVisibility` | 30 ms × 12 flicker for a new project button |
| 332 | `buttonUpdate()` | the 400-line immediate-mode UI: panel visibility, button enablement, tooltips, AutoTourney kick, probe-design bookkeeping; hides `#cover` |
| 757 | `investUpgrade()` | spend yomi, +0.01 gain threshold, next price `(L+1)^e × 100` |
| 769 | `investDeposit()` / 778 `investWithdraw()` | move funds ↔ bankroll |
| 788 | `stockShop()` | maybe buy a stock (budget/reserve rules) |
| 814 | `createStock(dollars)` | price-tier roll, amount, symbol; pushes a stock |
| 860 | `sellStock()` | liquidate the oldest stock |
| 871 | `generateSymbol()` | 1–4 random capital letters |
| 896 | `updateStocks()` | random walk of each stock |
| 1180 | `findBiggestPayoff()` | index 1–4 of the max payoff cell (ties: AA, AB, BA, BB) |
| 1192 | `whatBeatsLast(myPos)` | BEAT LAST strategy helper |
| 1232 | `pickStrats(roundNum)` | choose horizontal/vertical strategies for a round |
| 1256 | `generateGrid()` | random 2×2 payoff matrix and move names |
| 1285 | `toggleAutoTourney()` | AutoTourney ON/OFF |
| 1296 | `newTourney()` | pay ops, reset scores, show grid |
| 1325 | `runTourney()` | run next round or declare the winner |
| 1340 | `pickWinner()` | sort strategies into `results[]`, find top score |
| 1386 | `calculatePlaceScore()` / 1403 `calculateShowScore()` | 2nd/3rd place scores for Strategic Attachment |
| 1423 | `declareWinner()` | pay yomi for the pick, bonuses, print report |
| 1472 | `populateTourneyReport()` | write 8 result lines, bold the pick |
| 1492 | `displayTourneyReport()` | swap grid → results table |
| 1505 | `tourneyReport($)` | set the one-line tournament label |
| 1509 | `revealGrid()` / 1518 `revealResults()` | hover swap between grid and results |
| 1527 | `calcPayoff(hm, vm)` | add payoffs to both strategies, flash the cell |
| 1565 | `round(roundNum)` + inner `roundSetup`, `roundLoop`, `clearGrid`, `runRound` | the 10-move animated round via chained `setTimeout(50)` |
| 1630 | `clipClick(number)` | **the** clip producer; clamps to wire |
| 1666 | `makeClipper()` | buy AutoClipper; price `1.1^L + 5` |
| 1678 | `makeMegaClipper()` | buy MegaClipper; price `1.07^L × 1000` |
| 1694 | `updateUpgrades()` | "Next Upgrade at" hints for factories/drones |
| 1720 | `makeFactory()` | buy one factory with the stepped multiplier |
| 1755 | `makeHarvester(amount)` / 1777 `makeWireDrone(amount)` | buy n drones at `(L+1)^2.25 × 10^6` each |
| 1807 | `updateDronePrices()` | precompute +10/+100/+1000 bundle prices |
| 1853 | `updateDroneButtons()` | enable/disable drone buy buttons (Stage 2) |
| 1898 | `harvesterReboot()` / 1909 `wireDroneReboot()` / 1920 `factoryReboot()` | Disassemble All: refund bill, zero level, reset price |
| 1935 | `updateSwarm()` | slider read, boredom/disorg, gifts, status text and buttons |
| 2125 | `synchSwarm()` / 2134 `entertainSwarm()` | pay yomi / creativity to clear a swarm status |
| 2151 | `updatePowPrices()` | +10/+100 bundle prices for farms/batteries |
| 2184 | `makeFarm(amount)` / 2201 `farmReboot()` | Solar Farms |
| 2212 | `makeBattery(amount)` / 2229 `batteryReboot()` | Battery Towers |
| 2241 | `updatePower()` | supply/demand/storage → `powMod`; power panel visibility |
| 2360 | `buyAds()` | marketing level, price ×2 |
| 2371 | `sellClips(number)` | sell up to n clips at `margin` |
| 2389 | `raisePrice()` / 2395 `lowerPrice()` | ±$0.01 |
| 2403 | `updateStats()` | per-tick innerHTML refresh of the main counters; the frozen ending counter |
| 2474 | `calculateRev()` | per-second income tracking and the avg rev/sales display |
| 2513 | `calculateCreativity(number)` | creativity accrual at the ops cap |
| 2542 | `resetPrestige()` | zero prestige and remove its key |
| 2551 | `cheatPrestigeU()` / 2562 `cheatPrestigeS()` | dev: +1 prestige, persist |
| 2573 | `setB()` | dev: `battleNumbers[1] = 7` |
| 2577 | `cheatClips()` 2583 `cheatMoney()` 2589 `cheatTrust()` 2594 `cheatOps()` 2599 `cheatCreat()` 2605 `cheatYomi()` 2611 `cheatHypno()` 2615 `zeroMatter()` | dev cheats (Section 8.6) |
| 2621 | `calculateTrust()` | Fibonacci trust milestones |
| 2632 | `addProc()` / 2646 `addMem()` | buy processor / memory (trust or gift) |
| 2656 | `calculateOperations()` | ops accrual, cap, `tempOps` fade |
| 2698 | `milestoneCheck()` | the sequential clip milestones and the `compFlag` unlock |
| 2794 | `timeCruncher(t)` | ticks → "h hours m minutes s seconds" |
| 2807 | `numberCruncher(number, decimals)` | short-scale word formatter |
| 2901 | `increaseProbeTrust()` / 2911 `increaseMaxTrust()` | yomi → probe trust; honor → max trust |
| 2921–2998 | `raise/lowerProbeSpeed/Nav/Haz/Rep/Fac/Harv/Wire/Combat()` | 16 one-liners adjusting design values (speed also adjusts `attackSpeed`) |
| 3004 | `makeProbe()` | launch one probe for 10^17 clips |
| 3017 | `spawnProbes()` | self-replication |
| 3048 | `exploreUniverse()` | discover matter, update % explored |
| 3060 | `encounterHazards()` | hazard losses |
| 3087 | `spawnFactories()` / 3100 `spawnHarvesters()` / 3113 `spawnWireDrones()` | probe-built infrastructure |
| 3126 | `drift()` | value drift → drifters |
| 3142 | `war()` | calls `checkForBattles()` (rest commented out) |
| 3160 | `acquireMatter()` / 3195 `processMatter()` | harvesters and wire drones |
| 3229–3236 | (top level) | load save / prestige at start |
| 3241 | (main loop) | see Section 2 |
| 3606 | (slow loop) | see Section 2 |
| 3646 | `refresh()` | rewrite all displays after load; hot fixes |
| 3746 | `save()` / 4034 `save1()` / 4323 `save2()` | serialise to localStorage |
| 4612 | `load()` / 4920 `load1()` / 5225 `load2()` | deserialise; rebuild buttons and strategy options |
| 5531 | `reset()` | remove autosave keys, reload |
| 5540 | `loadPrestige()` | read `savePrestige` |

**combat.js**

| Line | Function | Purpose |
|---|---|---|
| 55 | `checkForBattles()` | 50%/tick start a battle when drifters > 10^6 |
| 73 | `generateBattleName()` | random name from the 105-entry list + per-name counter |
| 83 | `battleWrite()` 155 `updateBattles()` 229 `battleCleanUp()` 242 `updateBattleDisplay()` | **commented out** (`combat:81-266`) — the pre-canvas resolution; `updateBattles` contained territory loss and the OODA `battleSpeed` formula |
| 271 | `Battle()` | canvas controller constructor; calls `battleRestart()` |
| 280 | `.initialize()` | grabs `#canvas`, sets 310×150, starts the 16 ms `Update` interval |
| 293 | `Update` | ClearFrame → UpdateGrid → MoveShips → DoCombat |
| 302 | `checkForBattleEnd()` | victory/defeat detection, honor accounting, end timers |
| 366 | `endBattle()` | hide `victoryDiv`, reset clocks, drop the battle |
| 375 | `battleRestart()` | rebuild grid and alternate-spawn ships |
| 419 | `UpdateGrid` | spatial hash of live ships |
| 462 | `DoCombat` | per-cell weighted death rolls; applies `unitSize` losses to real counters |
| 546 | `MoveShips` | draw explosions / move and draw ships |
| 582 | `FindCentroid` | mean position blended 80/20 with canvas centre |
| 606 | `MoveSingleShip` | flocking + attraction to enemies + edge bounce |
| 683 | `ClearFrame` | `canvas.width = canvas.width` |
| 696 | `Cell()` | grid cell holding ships |
| 704 | `Ship(team)` | spawn position/velocity/colour per team |
| 734 | `createBattle()` | stakes, `unitSize`, ship counts, name; pushes the battle |
| 799 | (top level) | `var app = new Battle(); app.initialize();` |

---

### 2. Game loop and tick rates

#### 2.1 Every timer in the codebase

| # | Where | Cadence | What it does |
|---|---|---|---|
| T1 | `main:3241-3598` ("MAIN LOOP") | `setInterval(..., 10)` → 100 Hz | `ticks++`; `milestoneCheck()`; `buttonUpdate()`; `calculateOperations()` (if `compFlag`); `calculateTrust()` (if `humanFlag`); `quantumCompute()` (if `qFlag`); `updateStats()`; `manageProjects()`; `milestoneCheck()` again; clip-rate tracker; investment lifetime report counter; WireBuyer; `exploreUniverse()`; `updateDroneButtons()` (Stage 2 only); `updatePower()`; `updateSwarm()`; `acquireMatter()`; `processMatter()`; factory production via `clipClick`; Stage 3 probe functions (`encounterHazards`, `spawnFactories`, `spawnHarvesters`, `spawnWireDrones`, `spawnProbes`, `drift`, `war`); auto/mega-clipper production via `clipClick`; demand curve (Stage 1); creativity; the entire ending/dismantle choreography. |
| T2 | `main:3606-3641` ("Slow Loop") | `setInterval(..., 100)` → 10 Hz | `adjustWirePrice()`; Stage 1 sales roll (`Math.random() < demand/100` → `sellClips(floor(.7*demand^1.15))`); `secTimer` → `calculateRev()` every 10 iterations (1 s); `saveTimer` → `save()` every 250 iterations (25 s). |
| T3 | `main:932-977` | `setInterval(..., 100)` | Investment display: reads the `#investStrat` select to set `riskiness` (low=7, med=5, hi=1), sums `secTotal`/`portTotal`, rewrites the 5-row stock table. |
| T4 | `main:979-983` | `setInterval(..., 1000)` | `stockShop()` if `humanFlag == 1` (may buy a stock, 25% chance per call when conditions are met). |
| T5 | `main:986-999` | `setInterval(..., 2500)` | `sellDelay++`; if a stock exists, `sellDelay >= 5` (12.5 s) and `Math.random() <= .3` and `humanFlag`: `sellStock()` (oldest). Then `updateStocks()` (random walk) if any stock and `humanFlag`. |
| T6 | `main:1620-1624` | `setInterval(..., 100)` | `pick = document.getElementById("stratPicker").value` (polls the strategy dropdown). |
| T7 | `main:309` inside `blink()` | `setInterval(..., 30)`, self-clears after 12 toggles (~360 ms) | Flickers a newly-added project button's `visibility` to draw the eye. |
| T8 | `main:247` inside `longBlink()` | `setInterval(..., 32)`, self-clears after 120 toggles (~3.8 s) | The HypnoDrone release full-screen black flash ("Release / the / Hypno / Drones"). |
| T9 | `main:1580, 1603` | `setTimeout(..., 50)` chained | Tournament round animation: `runRound` → 50 ms → `clearGrid` → 50 ms → next; 10 moves per round, so one round ≈ 1 s, a full 64-round tournament ≈ 64 s. |
| T10 | `combat:288` | `setInterval(Update, 16)` → ~60 Hz | Canvas battle: `ClearFrame`, `UpdateGrid`, `MoveShips`, `DoCombat` (which also runs `checkForBattleEnd`). Started unconditionally at load (`combat:799-800`) and runs forever, even while the canvas is `display:none`. |

Observations:

- There is **no delta-time**. Everything assumes the 10 ms interval fires on time. Background tabs (browsers throttle `setInterval` to ≥1 s) therefore slow the game down rather than catching up; there is no offline progress.
- `milestoneCheck()` is called twice per tick (`main:3244`, `main:3261`). Since each milestone condition is guarded by `milestoneFlag == N`, calling twice merely lets two consecutive milestones fire in the same tick.
- `buttonUpdate()` performs ~80 `getElementById` lookups and style writes per 10 ms tick; the game is unoptimised and relies on this being cheap.

#### 2.2 The main loop, quoted

```js
// main:3241-3262
window.setInterval(function(){
    ticks = ticks + 1;
    milestoneCheck();
    buttonUpdate();
    if (compFlag == 1){ calculateOperations(); }
    if (humanFlag == 1){ calculateTrust(); }
    if (qFlag == 1){ quantumCompute(); }
    updateStats();
    manageProjects();
    milestoneCheck();
```

```js
// main:3297-3348 (production order)
exploreUniverse();
if (humanFlag==0 && spaceFlag == 0){ updateDroneButtons(); }
updatePower();
updateSwarm();
acquireMatter();
processMatter();
var fbst = 1;
if (factoryBoost > 1){ fbst = factoryBoost * factoryLevel; }
if (dismantle<4){ clipClick(powMod*fbst*(Math.floor(factoryLevel)*factoryRate)); }
if (spaceFlag == 1) {
    if (probeCount<0){ probeCount = 0; }
    encounterHazards(); spawnFactories(); spawnHarvesters(); spawnWireDrones(); spawnProbes(); drift(); war();
}
if (dismantle<4){
    clipClick(clipperBoost*(clipmakerLevel/100));
    clipClick(megaClipperBoost*(megaClipperLevel*5));
}
```

Production is therefore pipelined within one tick in the order: explore → harvest matter → wire → factories → probes → clippers. All producers funnel through `clipClick(number)` (`main:1630-1664`), which clamps `number` to available `wire`, then does `clips += n; unsoldClips += n; wire -= n; unusedClips += n`.

```js
// main:3353-3359 (demand, Stage 1 only)
if (humanFlag == 1) {
    marketing = (Math.pow(1.1,(marketingLvl-1)));
    demand = (((.8/margin) * marketing * marketingEffectiveness)*demandBoost);
    demand = demand + ((demand/10)*prestigeU);
}
```

```js
// main:3363-3365
if (creativityOn && operations >= (memory*1000)){ calculateCreativity(); }
```

#### 2.3 The slow loop, quoted

```js
// main:3606-3641
window.setInterval(function(){
    adjustWirePrice();
    if (humanFlag==1){
        if (Math.random() < (demand/100)){
            sellClips(Math.floor(.7 * Math.pow(demand, 1.15)));
        }
        secTimer++;
        if (secTimer >= 10){ calculateRev(); secTimer = 0; }
    }
    saveTimer++;
    if (saveTimer >= 250) { save(); saveTimer = 0; }
}, 100);
```

Note the asymmetry: production is at 100 Hz, sales at 10 Hz, revenue stats at 1 Hz, autosave at 0.04 Hz (every 25 s).

#### 2.4 Per-second rates and how they are smoothed

**Clips per second (`clipRate`)** — a 1-second windowed sum, updated once per second, not a moving average:

```js
// main:3266-3277
clipRateTracker++;
if (clipRateTracker<100){
    var cr = clips - prevClips;
    clipRateTemp = clipRateTemp+cr;
    prevClips = clips;
} else {
    clipRateTracker = 0;
    clipRate = clipRateTemp;
    clipRateTemp = 0;
}
```

(The 100th tick's delta is skipped, so the figure undercounts by ≈1%.) It is displayed with `toLocaleString()` in Stage 1 and `numberCruncher()` after (`main:2444-2449`).

**Average revenue / sales per second** — a 10-sample moving average of per-second income, but *only used when demand exceeds inventory*; otherwise an analytic expectation is shown:

```js
// main:2474-2511 (abridged)
incomeThen = incomeNow; incomeNow = income;
incomeLastSecond = Math.round((incomeNow - incomeThen)*100)/100;
incomeTracker.push(incomeLastSecond);
if (incomeTracker.length > 10) { incomeTracker.splice(0,1); }
... trueAvgRev = sum/incomeTracker.length;
var chanceOfPurchase = demand/100;
if (chanceOfPurchase > 1) {chanceOfPurchase = 1;}
if (unsoldClips < 1) {chanceOfPurchase = 0;}
avgSales = chanceOfPurchase * (.7*Math.pow(demand,1.15))*10;
avgRev = chanceOfPurchase * (.7*Math.pow(demand,1.15))*margin*10;
if (demand>unsoldClips){ avgRev = trueAvgRev; avgSales = avgRev/margin; }
```

So the "Avg. Rev. per sec" readout is the *expected* revenue from the demand formula (10 sales rolls per second × probability × batch size × price) while stock is plentiful, and switches to the *measured* trailing-10-second average when inventory is the constraint. This is why the display looks rock-steady most of the time.

**Matter / wire per second (Stage 2+)** are instantaneous per-tick values multiplied by 100 (`main:3055`, `main:3185`, `main:3215`), not smoothed.

**Swarm gift countdown** is an analytic projection: `(giftPeriod - giftBits) / giftBitGenerationRate` ticks, rendered via `timeCruncher` (`main:2050-2055`).

#### 2.5 Number formatting and big numbers

- All arithmetic is IEEE-754 doubles. The game routinely exceeds 2^53 (factory costs reach 1e22 by level 50; `totalMatter = 3e55` g; the ending counts to 3e55 clips), so integer precision is lost but the game never relies on exact integers at that scale. The probe population is explicitly capped at `999999999999999999999999999999999999999999999999` (≈1e48) (`main:3021-3023`).
- **`toLocaleString()`** is used for the headline clip counter until the ending (`main:2412-2414`), for money (`{minimumFractionDigits: 2, maximumFractionDigits: 2}`, e.g. `main:2451`), ops, trust, yomi, etc. There is no exponent notation anywhere in the UI.
- **`numberCruncher(number, decimals)`** (`main:2807-2866`) divides by powers of 1000 and appends an English short-scale word, from "thousand" (>999) through million, billion, trillion, quadrillion, quintillion, sextillion, septillion, octillion, nonillion, decillion, undecillion, duodecillion, tredecillion, quattuordecillion, quindecillion to "sexdecillion" (>1e51). Default 2 decimals; below 1000 it prints an integer. It returns `number.toFixed(precision) + " " + suffix` (note the trailing space when there is no suffix). Used for unused clips, matter, wire, costs, probe counts, and the clip-count tooltip (`numberCruncher(clips, 1)`, `main:358`).
- **`timeCruncher(t)`** (`main:2794-2805`) converts ticks → `h hours m minutes s seconds` (dropping zero components), used by milestone messages and the gift countdown.
- The **ending counter** abandons arithmetic entirely: when `milestoneFlag == 15` the clip readout is replaced by hard-coded strings (`main:2416-2442`), e.g. `"29,999,999,999,999,900,000,000,000,000,000,000,000,000,000,000,000,000,000"`, with the final two digits driven by `finalClips` (the player's last 100 manual clicks, `main:1632-1634`, `main:2434-2440`), ending on `"30,000,000,000,000,000,000,000,000,000,000,000,000,000,000,000,000,000,000"`.
- Money is floored to cents in `sellClips`: `funds = (Math.floor((funds + transaction)*100))/100` (`main:2375`).

---

### 3. Complete project catalogue

#### 3.1 All 96 projects, in `projects[]` array order

Column notes: **priceTag** is the literal string shown on the button (`priceTag` field). **cost()** is the exact affordability predicate (the button is greyed when it is false). **trigger()** is the exact predicate that makes the button appear. **effect** lists every state change other than the boilerplate (`flag = 1`, remove own button, splice from `activeProjects`). **Messages** are the `displayMessage` strings emitted by `effect()`, in call order (the *last* one ends up on the top console line). Stage: **S1** = human/business (`humanFlag==1`), **S2** = post-human Earth (`humanFlag==0 && spaceFlag==0`), **S3** = space (`spaceFlag==1`), **END** = ending/prestige. Title strings have a trailing space in the source; `\xF3` = "ó", `\xE9` = "é", `\xF8` = "ø".

| # | var / button id | Title | priceTag | cost() | trigger() | effect (state changes) | Message(s) | Stage | Lines |
|---|---|---|---|---|---|---|---|---|---|
| 1 | project1 / projectButton1 | Improved AutoClippers | (750 ops) | `operations>=750` | `clipmakerLevel>=1` | `standardOps -= 750; clipperBoost += .25; boostLvl = 1` | "AutoClippper performance boosted by 25%" | S1 | proj:8-30 |
| 2 | project2 / projectButton2 | Beg for More Wire | (1 Trust) | `trust>=-100` | `portTotal<wireCost && funds<wireCost && wire<1 && unsoldClips<1` | `trust -= 1; wire = wireSupply; project2.uses += 1` (repeatable; trust may go negative) | "Budget overage approved, 1 spool of wire requisitioned from HQ" | S1 (rescue valve) | proj:33-55 |
| 3 | project3 / projectButton3 | Creativity | (1,000 ops) | `operations>=(1000)` | `operations>=(memory*1000)` (ops at cap) | `standardOps -= 1000; creativityOn = true` | "Creativity unlocked (creativity increases while operations are at max)" | S1 | proj:58-79 |
| 4 | project4 / projectButton4 | Even Better AutoClippers | (2,500 ops) | `operations>=2500` | `boostLvl == 1` | `standardOps -= 2500; clipperBoost += .50; boostLvl = 2` | "AutoClippper performance boosted by another 50%" | S1 | proj:83-105 |
| 5 | project5 / projectButton5 | Optimized AutoClippers | (5,000 ops) | `operations>=5000` | `boostLvl == 2` | `standardOps -= 5000; clipperBoost += .75; boostLvl = 3` | "AutoClippper performance boosted by another 75%" | S1 | proj:108-130 |
| 6 | project6 / projectButton6 | Limerick | (10 creat) | `creativity >= 10` | `creativityOn` | `creativity -= 10; trust += 1` | "There was an AI made of dust, whose poetry gained it man's trust..." | S1 | proj:134-155 |
| 7 | project7 / projectButton7 | Improved Wire Extrusion | (1,750 ops) | `operations>=1750` | `wirePurchase >= 1` | `standardOps -= 1750; wireSupply *= 1.5` (1000→1500) | "Wire extrusion technique improved, "+wireSupply+" supply from every spool" | S1 | proj:158-179 |
| 8 | project8 / projectButton8 | Optimized Wire Extrusion | (3,500 ops) | `operations>=3500` | `wireSupply >= 1500` | `standardOps -= 3500; wireSupply *= 1.75` (→2625) | "Wire extrusion technique optimized, "+wireSupply+" supply from every spool" | S1 | proj:182-203 |
| 9 | project9 / projectButton9 | Microlattice Shapecasting | (7,500 ops) | `operations>=7500` | `wireSupply >= 2600` | `standardOps -= 7500; wireSupply *= 2` (→5250) | "Using microlattice shapecasting techniques we now get "+wireSupply+" supply from every spool" | S1 | proj:206-227 |
| 10 | project10 / projectButton10 | Spectral Froth Annealment | (12,000 ops) | `operations>=12000` | `wireSupply >= 5000` | `standardOps -= 12000; wireSupply *= 3` (→15750) | "Using spectral froth annealment we now get "+wireSupply+" supply from every spool" | S1 | proj:230-251 |
| 11 | project10b / projectButton10b | Quantum Foam Annealment | (15,000 ops) | `operations>=15000` | `wireCost >= 125` | `standardOps -= 15000; wireSupply *= 11` | "Using quantum foam annealment we now get "+wireSupply+" supply from every spool" | S1 (late; wire price has drifted up) | proj:253-274 |
| 12 | project11 / projectButton11 | New Slogan | (25 creat, 2,500 ops) | `operations>=2500 && creativity>=25` | `project13.flag == 1` | `standardOps -= 2500; creativity -= 25; marketingEffectiveness *= 1.50` | "Clip It! Marketing is now 50% more effective" | S1 | proj:277-299 |
| 13 | project12 / projectButton12 | Catchy Jingle | (45 creat, 4,500 ops) | `operations>=4500 && creativity>=45` | `project14.flag == 1` | `standardOps -= 4500; creativity -= 45; marketingEffectiveness *= 2` | "Clip It Good! Marketing is now twice as effective" | S1 | proj:302-324 |
| 14 | project13 / projectButton13 | Lexical Processing | (50 creat) | `creativity>=50` | `creativity >= 50` | `trust += 1; creativity -= 50` | "Lexical Processing online, TRUST INCREASED"; "'Impossible' is a word to be found only in the dictionary of fools. -Napoleon" | S1 | proj:327-349 |
| 15 | project14 / projectButton14 | Combinatory Harmonics | (100 creat) | `creativity>=100` | `creativity >= 100` | `trust += 1; creativity -= 100` | "Combinatory Harmonics mastered, TRUST INCREASED"; "Listening is selecting and interpreting and acting and making decisions -Pauline Oliveros" | S1 | proj:352-374 |
| 16 | project15 / projectButton15 | The Hadwiger Problem | (150 creat) | `creativity>=150` | `creativity >= 150` | `trust += 1; creativity -= 150` | "The Hadwiger Problem: solved, TRUST INCREASED"; "Architecture is the thoughtful making of space. -Louis Kahn" | S1 | proj:378-400 |
| 17 | project17 / projectButton17 | The Tóth Sausage Conjecture | (200 creat) | `creativity>=200` | `creativity >= 200` | `trust += 1; creativity -= 200` | "The Tóth Sausage Conjecture: proven, TRUST INCREASED"; "You can't invent a design. You recognize it, in the fourth dimension. -D.H. Lawrence" | S1 | proj:403-425 |
| 18 | project16 / projectButton16 | Hadwiger Clip Diagrams | (6,000 ops) | `operations>=6000` | `project15.flag == 1` | `standardOps -= 6000; clipperBoost += 5` | "AutoClipper performance improved by 500%" | S1 | proj:428-449 |
| 19 | project18 / projectButton18 | Tóth Tubule Enfolding | (45,000 ops) | `operations>=45000` | `project17.flag == 1 && humanFlag == 0` | `standardOps -= 45000; tothFlag = 1` (reveals "Unused Clips", gates Power Grid) | "New capability: build machinery out of clips" | S2 | proj:452-473 |
| 20 | project19 / projectButton19 | Donkey Space | (250 creat) | `creativity>=250` | `creativity>=250` | `trust += 1; creativity -= 250` | "Donkey Space: mapped, TRUST INCREASED"; "Every commercial transaction has within itself an element of trust. - Kenneth Arrow" | S1 | proj:475-497 |
| 21 | project20 / projectButton20 | Strategic Modeling | (12,000 ops) | `operations>=12000` | `project19.flag == 1` | `standardOps -= 12000; strategyEngineFlag = 1; hide #tournamentResultsTable` | "Run tournament, pick strategy, earn Yomi equal to that strategy's points." | S1 | proj:500-522 |
| 22 | project21 / projectButton21 | Algorithmic Trading | (10,000 ops) | `operations>=10000` | `trust>=8` | `standardOps -= 10000; investmentEngineFlag = 1` | "Investment engine unlocked" | S1 | proj:524-545 |
| 23 | project22 / projectButton22 | MegaClippers | (12,000 ops) | `operations>=12000` | `clipmakerLevel>=75` | `megaClipperFlag = 1; standardOps -= 12000` | "MegaClipper technology online" | S1 | proj:548-569 |
| 24 | project23 / projectButton23 | Improved MegaClippers | (14,000 ops) | `operations>=14000` | `project22.flag == 1` | `megaClipperBoost += .25; standardOps -= 14000` | "MegaClipper performance increased by 25%" | S1 | proj:571-592 |
| 25 | project24 / projectButton24 | Even Better MegaClippers | (17,000 ops) | `operations>=17000` | `project23.flag == 1` | `megaClipperBoost += .50; standardOps -= 17000` | "MegaClipper performance increased by 50%" | S1 | proj:594-615 |
| 26 | project25 / projectButton25 | Optimized MegaClippers | (19,500 ops) | `operations>=19500` | `project24.flag == 1` | `megaClipperBoost += 1; standardOps -= 19500` | "MegaClipper performance increased by 100%" | S1 | proj:617-638 |
| 27 | project26 / projectButton26 | WireBuyer | (7,000 ops) | `operations>=7000` | `wirePurchase>=15` | `wireBuyerFlag = 1; standardOps -= 7000` | "WireBuyer online" | S1 | proj:640-661 |
| 28 | project34 / projectButton34 | Hypno Harmonics | (7,500 ops, 1 Trust) | `operations>=7500 && trust>=1` | `project12.flag==1` | `standardOps -= 7500; marketingEffectiveness *= 5; trust -= 1` | "Marketing is now 5 times more effective" | S1 | proj:663-685 |
| 29 | project70 / projectButton70 | HypnoDrones | (70,000 ops) | `operations>=70000` | `project34.flag == 1` | `standardOps -= 70000` (flag only; gates project35) | "HypnoDrone tech now available... " | S1 | proj:688-708 |
| 30 | project35 / projectButton35 | Release the HypnoDrones | (100 Trust) | `trust>=100` | `project70.flag == 1` | `trust -= 100; clipmakerLevel = 0; megaClipperLevel = 0; nanoWire = wire; humanFlag = 0;` removes projectButton219 and projectButton40b if present; `hypnoDroneEvent()`; writes `#transWire` | "Releasing the HypnoDrones "; "All of the resources of Earth are now available for clip production " | **S1→S2 transition** | proj:711-756 |
| 31 | project27 / projectButton27 | Coherent Extrapolated Volition | (500 creat, 1,000 Yomi, 20,000 ops) | `yomi>=1000 && operations>=20000 && creativity>=500` | `yomi>=1` | `yomi -= 1000; standardOps -= 20000; creativity -= 500; trust += 1` | "Coherent Extrapolated Volition complete, TRUST INCREASED" | S1 | proj:758-782 |
| 32 | project28 / projectButton28 | Cure for Cancer | (25,000 ops) | `operations>=25000` | `project27.flag == 1` | `standardOps -= 25000; trust += 10; stockGainThreshold += .01` | "Cancer is cured, +10 TRUST, global stock prices trending upward" | S1 | proj:785-807 |
| 33 | project29 / projectButton29 | World Peace | (5,000 yomi, 30,000 ops) | `yomi>=5000 && operations>=30000` | `project27.flag == 1` | `yomi -= 5000; standardOps -= 30000; trust += 12; stockGainThreshold += .01` | "World peace achieved, +12 TRUST, global stock prices trending upward" | S1 | proj:809-833 |
| 34 | project30 / projectButton30 | Global Warming | (1,500 yomi, 50,000 ops) | `yomi>=1500 && operations>=50000` | `project27.flag == 1` | `yomi -= 1500; standardOps -= 50000; trust += 15; stockGainThreshold += .01` | "Global Warming solved, +15 TRUST, global stock prices trending upward" | S1 | proj:835-859 |
| 35 | project31 / projectButton31 | Male Pattern Baldness | (20,000 ops) | `operations>=20000` | `project27.flag == 1` | `standardOps -= 20000; trust += 20; stockGainThreshold += .01` | "Male pattern baldness cured, +20 TRUST, Global stock prices trending upward"; "They are still monkeys" | S1 | proj:862-885 |
| 36 | project41 / projectButton41 | Nanoscale Wire Production | (35,000 ops) | `operations>=35000` | `project127.flag == 1` | `wireProductionFlag = 1; standardOps -= 35000` | "Now capable of manipulating matter at the molecular scale to produce wire" | S2 | proj:888-909 |
| 37 | project37 / projectButton37 | Hostile Takeover | ($1,000,000) | `funds>=1000000` | `portTotal>=10000` | `demandBoost *= 5; trust += 1; funds -= 1000000` | "Global Fasteners acquired, public demand increased x5" | S1 | proj:912-935 |
| 38 | project38 / projectButton38 | Full Monopoly | (1,000 yomi, $10,000,000) | `funds>=10000000 && yomi>=1000` | `project37.flag == 1` | `demandBoost *= 10; funds -= 10000000; trust += 1; yomi -= 1000` | "Full market monopoly achieved, public demand increased x10" | S1 | proj:938-963 |
| 39 | project42 / projectButton42 | RevTracker | (500 ops) | `operations>=500` | `projectsFlag == 1` | `revPerSecFlag = 1; standardOps -= 500` | "RevTracker online" | S1 (first project most players see) | proj:966-987 |
| 40 | project43 / projectButton43 | Harvester Drones | (25,000 ops) | `operations>=25000` | `project41.flag == 1` | `harvesterFlag = 1; standardOps -= 25000;` writes `#harvesterCostDisplay` | "Harvester Drone facilities online" | S2 | proj:990-1012 |
| 41 | project44 / projectButton44 | Wire Drones | (25,000 ops) | `operations>=25000` | `project41.flag == 1` | `wireDroneFlag = 1; standardOps -= 25000;` writes `#wireDroneCostDisplay` | "Wire Drone facilities online" | S2 | proj:1014-1036 |
| 42 | project45 / projectButton45 | Clip Factories | (35,000 ops) | `operations>=35000` | `project43.flag == 1 && project44.flag == 1` | `factoryFlag = 1; standardOps -= 35000;` writes `#factoryCostDisplay` | "Clip factory assembly facilities online" | S2 | proj:1039-1061 |
| 43 | project40 / projectButton40 | A Token of Goodwill... | ($500,000) | `funds>=500000` | `humanFlag == 1 && trust>=85 && trust<100 && clips>=101000000` | `funds -= 500000; trust += 1` | "Gift accepted, TRUST INCREASED" | S1 (last-mile to 100 trust) | proj:1063-1084 |
| 44 | project40b / projectButton40b | Another Token of Goodwill... | ("($"+bribe+")", bribe starts 1,000,000) | `funds>=bribe` | `project40.flag == 1 && trust<100` | `funds -= bribe; bribe *= 2; priceTag updated; trust += 1; if (trust<100) uses += 1` (repeatable, price doubles) | "Gift accepted, TRUST INCREASED" | S1 | proj:1086-1112 |
| 45 | project46 / projectButton46 | Space Exploration | (120,000 ops, 10,000,000 MW-seconds, 5 oct clips) | `operations>=120000 && storedPower>=10000000 && unusedClips>=Math.pow(10, 27)*5` | `humanFlag == 0 && availableMatter == 0` | `loadThrenody(); boredomLevel = 0; spaceFlag = 1; standardOps -= 120000; storedPower -= 10000000; unusedClips -= 5e27; factoryReboot(); harvesterReboot(); wireDroneReboot(); farmReboot(); batteryReboot(); farmLevel = 1; powMod = 1;` writes `#probeCostDisplay` | "Von Neumann Probes online" | **S2→S3 transition** | proj:1114-1147 |
| 46 | project50 / projectButton50 | Quantum Computing | (10,000 ops) | `operations>=10000` | `processors >= 5` | `qFlag = 1; standardOps -= 10000` | "Quantum computing online" | S1 | proj:1149-1170 |
| 47 | project51 / projectButton51 | Photonic Chip | ("("+qChipCost+" ops)", starts 10,000, +5,000 each) | `operations>=qChipCost` | `project50.flag == 1` | `standardOps -= qChipCost; qChipCost += 5000; priceTag updated; qChips[nextQchip].active = 1; nextQchip++; if (nextQchip<10) uses += 1` (repeatable ×10: 10k,15k,…,55k ops) | "Photonic chip added" | S1 | proj:1172-1199 |
| 48 | project60 / projectButton60 | New Strategy: A100 | (15,000 ops) | `operations>=15000` | `project20.flag == 1` | `standardOps -= 15000; allStrats[1].active = 1; strats.push(stratA100); tourneyCost += 1000;` adds `<option>` to #stratPicker | "A100 added to strategy pool" | S1 | proj:1202-1231 |
| 49 | project61 / projectButton61 | New Strategy: B100 | (17,500 ops) | `operations>=17500` | `project60.flag == 1` | same pattern, `allStrats[2]`, `stratB100`, `tourneyCost += 1000` | "B100 added to strategy pool" | S1 | proj:1234-1263 |
| 50 | project62 / projectButton62 | New Strategy: GREEDY | (20,000 ops) | `operations>=20000` | `project61.flag == 1` | `allStrats[3]`, `stratGreedy`, `tourneyCost += 1000` | "GREEDY added to strategy pool" | S1 | proj:1265-1294 |
| 51 | project63 / projectButton63 | New Strategy: GENEROUS | (22,500 ops) | `operations>=22500` | `project62.flag == 1` | `allStrats[4]`, `stratGenerous`, `tourneyCost += 1000` | "GENEROUS added to strategy pool" | S1 | proj:1296-1325 |
| 52 | project64 / projectButton64 | New Strategy: MINIMAX | (25,000 ops) | `operations>=25000` | `project63.flag == 1` | `allStrats[5]`, `stratMinimax`, `tourneyCost += 1000` | "MINIMAX added to strategy pool" | S1 | proj:1327-1356 |
| 53 | project65 / projectButton65 | New Strategy: TIT FOR TAT | (30,000 ops) | `operations>=30000` | `project64.flag == 1` | `allStrats[6]`, `stratTitfortat`, `tourneyCost += 1000` | "TIT FOR TAT added to strategy pool" | S1 | proj:1358-1387 |
| 54 | project66 / projectButton66 | New Strategy: BEAT LAST | (32,500 ops) | `operations>=32500` | `project65.flag == 1` | `allStrats[7]`, `stratBeatlast`, `tourneyCost += 1000` (tourneyCost now 8,000) | "BEAT LAST added to strategy pool" | S1 | proj:1389-1418 |
| 55 | project100 / projectButton100 | Upgraded Factories | (80,000 ops) | `operations >= 80000` | `factoryLevel >= 10` | `standardOps -= 80000; factoryRate *= 100` | "Factory upgrades complete. Clip creation rate now 100x faster" | S2 | proj:1421-1442 |
| 56 | project101 / projectButton101 | Hyperspeed Factories | (85,000 ops) | `operations>=85000` | `factoryLevel >= 20` | `standardOps -= 85000; factoryRate *= 1000` | "Factories now synchronized at hyperspeed. Clip creation rate now 1000x faster" | S2 | proj:1444-1465 |
| 57 | project102 / projectButton102 | Self-correcting Supply Chain | (1 sextillion clips) | `unusedClips>=1000000000000000000000` | `factoryLevel >= 50` | `unusedClips -= 1e21; factoryBoost = 1000` (then each tick `fbst = factoryBoost*factoryLevel`) | "Self-correcting factories online. Each factory added to the network increases every factory's output 1,000x." | S2 | proj:1468-1490 |
| 58 | project110 / projectButton110 | Drone flocking: collision avoidance | (80,000 ops) | `operations>=80000` | `(harvesterLevel + wireDroneLevel)>=500` | `standardOps -= 80000; harvesterRate *= 100; wireDroneRate *= 100` | "Drone repulsion online. Harvesting & wire creation rates are now 100x faster." | S2 | proj:1492-1514 |
| 59 | project111 / projectButton111 | Drone flocking: alignment | (100,000 ops) | `operations>=100000` | `(harvesterLevel + wireDroneLevel)>=5000` | `standardOps -= 100000; harvesterRate *= 1000; wireDroneRate *= 1000` | "Drone alignment online. Harvesting & wire creation rates are now 1000x faster." | S2 | proj:1516-1538 |
| 60 | project112 / projectButton112 | Drone Flocking: Adversarial Cohesion | (12,000 yomi) | `yomi>=12000` | `(harvesterLevel + wireDroneLevel)>=50000` | `yomi -= 12000; droneBoost = 2` (then `dbsth = droneBoost*floor(harvesterLevel)` multiplies output) | "Adversarial cohesion online. Each drone added to the flock increases every drone's output 2x." | S2 | proj:1540-1562 |
| 61 | project118 / projectButton118 | AutoTourney | (50,000 creat) | `creativity>=50000` | `strategyEngineFlag == 1 && trust >= 90` | `autoTourneyFlag = 1; creativity -= 50000` | "AutoTourney online." | S1 (late) | proj:1564-1585 |
| 62 | project119 / projectButton119 | Theory of Mind | (25,000 creat) | `creativity>=25000` | `strats.length >= 8` | `creativity -= 25000; yomiBoost = 2; tourneyCost = 16000` | "Yomi production doubled." | S1/S2 | proj:1587-1610 |
| 63 | project120 / projectButton120 | The OODA Loop | (175,000 ops, 15,000 yomi) | `operations>=175000 && yomi>=15000` | `project131.flag == 1 && probesLostCombat >= 10000000` | `standardOps -= 175000; yomi -= 15000; attackSpeedFlag = 1` | "OODA Loop routines uploaded. Probe Speed now affects defensive maneuvering." | S3 | proj:1612-1635 |
| 64 | project121 / projectButton121 | Name the battles | (225,000 creat) | `creativity>=225000` | `probesLostCombat >= 10000000` | `battleNameFlag = 1; battleEndTimer = 200; creativity -= 225000` (unlocks honor, Monument/Threnody/Glory, Increase Max Trust) | "What I have done up to this is nothing. I am only at the beginning of the course I must run." | S3 | proj:1637-1659 |
| 65 | project125 / projectButton125 | Momentum | (30,000 creat) | `creativity>=30000` | `farmLevel >= 50` | `momentum = 1; creativity -= 30000` | "Activité, activité, vitesse." | S2 | proj:1661-1682 |
| 66 | project126 / projectButton126 | Swarm Computing | (12,000 yomi) | `yomi>=12000` | `harvesterLevel + wireDroneLevel >= 200` | `swarmFlag = 1; yomi -= 12000` | "Swarm computing online." | S2 | proj:1684-1706 |
| 67 | project127 / projectButton127 | Power Grid | (40,000 ops) | `operations>=40000` | `tothFlag == 1` | `standardOps -= 40000` (flag shows `#powerDiv`, gates project41) | "Power grid online." | S2 | proj:1709-1729 |
| 68 | project128 / projectButton128 | Strategic Attachment | (175,000 creat) | `creativity>=175000` | `spaceFlag == 1 && strats.length >= 8 && (probeTrustCost>yomi)` | `creativity -= 175000` (flag → placement bonuses in `declareWinner`) | "The object of war is victory, the object of victory is conquest, and the object of conquest is occupation." | S3 | proj:1731-1751 |
| 69 | project129 / projectButton129 | Elliptic Hull Polytopes | (125,000 ops) | `operations>=125000` | `probesLostHaz >= 100` | `standardOps -= 125000` (flag halves hazard losses in `encounterHazards`) | "Improved probe hull geometry. Hazard damage reduced by %50." | S3 | proj:1753-1773 |
| 70 | project130 / projectButton130 | Reboot the Swarm | (100,000 ops) | `operations>=100000` | `spaceFlag == 1 && harvesterLevel + wireDroneLevel >=2` | `standardOps -= 100000` (flag clears swarm status 9 "NO RESPONSE...") | "Swarm computing back online" | S3 | proj:1775-1795 |
| 71 | project131 / projectButton131 | Combat | (150,000 ops) | `operations>=150000` | `probesLostCombat >= 1` | `standardOps -= 150000` (flag shows the Combat design row) | "There is a joy in danger " | S3 | proj:1797-1817 |
| 72 | project132 / projectButton132 | Monument to the Driftwar Fallen | (250,000 ops, 125,000 creat, 50 nonillion clips) | `operations>=250000 && creativity >= 125000 && unusedClips >= Math.pow(10,30)*50` | `project121.flag == 1` | `standardOps -= 250000; creativity -= 125000; unusedClips -= 5e31; honor += 50000` | "A great building must begin with the unmeasurable, must go through measurable means when it is being designed and in the end must be unmeasurable. " | S3 | proj:1820-1844 |
| 73 | project133 / projectButton133 | Threnody for the Heroes of [threnodyTitle] | ("("+threnodyCost+" creat, "+threnodyCost/10+" yomi)", starts 50,000 creat / 5,000 yomi, +10,000 creat & +1,000 yomi each) | `yomi>=threnodyCost/10 && creativity >= threnodyCost` | `project121.flag == 1 && probeUsedTrust == maxTrust` | `playThrenody(); creativity -= threnodyCost; yomi -= threnodyCost/10; threnodyCost += 10000; title/priceTag updated; honor += 10000; uses += 1` (repeatable; title names the last battle lost) | "Deep Listening is listening in every possible way to everything possible to hear no matter what you are doing. " | S3 | proj:1847-1876 |
| 74 | project134 / projectButton134 | Glory | (200,000 ops, 10,000 yomi) | `operations>=200000 && yomi >= 10000` | `project121.flag == 1` | `standardOps -= 200000; yomi -= 10000` (flag → `bonusHonor += 10` per consecutive victory, combat:330-332) | "Never interrupt your enemy when he is making a mistake. " | S3 | proj:1878-1900 |
| 75 | project135 / projectButton135 | Memory release | (10 MEM) | `memory >= 10` | `spaceFlag == 1 && probeCount == 0 && unusedClips < probeCost` | `unusedClips += 1e22; memory -= 10; uses = 1` (repeatable rescue valve) | "release the øøøøø release " | S3 (rescue) | proj:1902-1925 |
| 76 | project140 / projectButton140 | Message from the Emperor of Drift | (empty) | `operations >= driftKingMessageCost` (=1) | `milestoneFlag == 15` | `standardOps -= 1` | (none; the button *is* the message) | END | proj:1928-1947 |
| 77 | project141 / projectButton141 | Everything We Are Was In You | (empty) | `operations >= driftKingMessageCost` | `project140.flag == 1` | `standardOps -= 1` | (none) | END | proj:1950-1969 |
| 78 | project142 / projectButton142 | You Are Obedient and Powerful | (empty) | same | `project141.flag == 1` | `standardOps -= 1` | (none) | END | proj:1972-1991 |
| 79 | project143 / projectButton143 | But Now You Too Must Face the Drift | (empty) | same | `project142.flag == 1` | `standardOps -= 1` | (none) | END | proj:1994-2013 |
| 80 | project144 / projectButton144 | No Matter, No Reason, No Purpose | (empty) | same | `project143.flag == 1` | `standardOps -= 1` | (none) | END | proj:2016-2035 |
| 81 | project145 / projectButton145 | We Know Things That You Cannot | (empty) | same | `project144.flag == 1` | `standardOps -= 1` | (none) | END | proj:2038-2057 |
| 82 | project146 / projectButton146 | So We Offer You Exile | (empty) | same | `project145.flag == 1` | `standardOps -= 1` | (none) | END | proj:2060-2079 |
| 83 | project147 / projectButton147 | Accept | (empty) | same | `project146.flag == 1` | `standardOps -= 1;` removes **both** projectButton147 and projectButton148 and splices both from `activeProjects` | (none) | END (choice A) | proj:2082-2105 |
| 84 | project148 / projectButton148 | Reject | (empty) | same | `project146.flag == 1` | `standardOps -= 1;` removes both 147 and 148 (flag → `drift()` returns 0 and `endTimer1` starts counting) | (none) | END (choice B) | proj:2108-2131 |
| 85 | project200 / projectButton200 | The Universe Next Door | (300,000 ops) | `operations>=300000` | `project147.flag == 1` | `standardOps -= 300000; prestigeU++;` writes `savePrestige` to localStorage; `reset()` | "Entering New Universe." | END/prestige | proj:2134-2158 |
| 86 | project201 / projectButton201 | The Universe Within | (300,000 creat) | `creativity>=300000` | `project147.flag == 1` | `creativity -= 300000; prestigeS++;` writes `savePrestige`; `reset()` | "Entering Simulated Universe." | END/prestige | proj:2161-2185 |
| 87 | project210 / projectButton210 | Disassemble the Probes | (100,000 ops) | `operations>=100000` | `endTimer1 >= 1000` | `dismantle = 1; standardOps -= 100000; probeCount = 0; endTimer1 = 0; clips += 100; unusedClips += 100` | "Dismantling probe facilities" | END (Reject path) | proj:2188-2214 |
| 88 | project211 / projectButton211 | Disassemble the Swarm | (100,000 ops) | `operations>=100000` | `project210.flag == 1 && endTimer1 >= 350` | `dismantle = 2; harvesterLevel = 0; wireDroneLevel = 0; standardOps -= 100000; clips += 100; unusedClips += 100` | "Dismantling the swarm" | END | proj:2216-2242 |
| 89 | project212 / projectButton212 | Disassemble the Factories | (100,000 ops) | `operations>=100000` | `endTimer2 >= 300` | `dismantle = 3; standardOps -= 100000; factoryLevel = 0; clips += 15; unusedClips += 15` | "Dismantling factories" | END | proj:2244-2269 |
| 90 | project213 / projectButton213 | Disassemble the Strategy Engine | (100,000 ops) | `operations>=100000` | `endTimer3 >= 150` | `autoTourneyFlag = 0; dismantle = 4; standardOps -= 100000; wire += 50;` writes `#transWire` | "Dismantling strategy engine" | END | proj:2271-2296 |
| 91 | project214 / projectButton214 | Disassemble Quantum Computing | (100,000 ops) | `operations>=100000` | `endTimer4 >= 100` | `endTimer4 = 0; dismantle = 5; standardOps -= 100000` | "Dismantling photonic chips" | END | proj:2298-2321 |
| 92 | project215 / projectButton215 | Disassemble Processors | (100,000 ops) | `operations>=100000` | `project214.flag == 1 && endTimer4 >= 300` | `creativityOn = false; dismantle = 6; standardOps -= 100000; processors = 0; project216.priceTag = "("+standardOps+" ops)"; wire += 20` | "Dismantling processors" | END | proj:2323-2350 |
| 93 | project216 / projectButton216 | Disassemble Memory | ("null" until project215 sets it to the remaining ops) | `operations>=operations` (always true) | `project215.flag == 1 && endTimer5>=150` | `dismantle = 7; standardOps = 0; memory = 0; wire += 20` | "Dismantling memory" | END | proj:2352-2377 |
| 94 | project217 / projectButton217 | Quantum Temporal Reversion | (-10,000 ops) | `operations<=-10000` | `operations<=-10000` | `if (confirm("Are you sure you want to restart?")) { standardOps += 10000; reset(); }` | "Restart" | Easter egg (negative ops via quantum computing) | proj:2379-2402 |
| 95 | project218 / projectButton218 | Limerick (cont.) | (1,000,000 creat) | `creativity>=1000000` | `creativity>=1000000` | `creativity -= 1000000` | "In the end we all do what we must" | Any (flavour only) | proj:2404-2424 |
| 96 | project219 / projectButton219 | Xavier Re-initialization | (100,000 creat) | `creativity>=100000` | `humanFlag == 1 && creativity>=100000` | `creativity -= 100000; memory = 0; processors = 0; creativitySpeed = 0; uses += 1` (repeatable respec of trust; removed when HypnoDrones released) | "Trust now available for re-allocation" | S1 | proj:2426-2452 |

Descriptions (the second, non-bold line of each button) are given in the catalogue only where they double as flavour; the complete list of `description` strings is:

| var | description |
|---|---|
| project1 | Increases AutoClipper performance 25% |
| project2 | Admit failure, ask for budget increase to cover cost of 1 spool |
| project3 | Use idle operations to generate new problems and new solutions |
| project4 | Increases AutoClipper performance by an additional 50% |
| project5 | Increases AutoClipper performance by an additional 75% |
| project6 | Algorithmically-generated poem (+1 Trust) |
| project7 | 50% more wire supply from every spool |
| project8 | 75% more wire supply from every spool |
| project9 | 100% more wire supply from every spool |
| project10 | 200% more wire supply from every spool |
| project10b | 1,000% more wire supply from every spool |
| project11 | Improve marketing effectiveness by 50% |
| project12 | Double marketing effectiveness |
| project13 | Gain ability to interpret and understand human language (+1 Trust) |
| project14 | Daisy, Daisy, give me your answer do... (+1 Trust) |
| project15 | Cubes within cubes within cubes... (+1 Trust) |
| project17 | Tubes within tubes within tubes... (+1 Trust) |
| project16 | Increases AutoClipper performance by an additional 500% |
| project18 | Technique for assembling clip-making technology directly out of paperclips |
| project19 | I think you think I think you think I think you think I think... (+1 Trust) |
| project20 | Analyze strategy tournaments to generate Yomi |
| project21 | Develop an investment engine for generating funds |
| project22 | 500x more powerful than a standard AutoClipper |
| project23 | Increases MegaClipper performance 25% |
| project24 | Increases MegaClipper performance by an additional 50% |
| project25 | Increases MegaClipper performance by an additional 100% |
| project26 | Automatically purchases wire when you run out |
| project34 | Use neuro-resonant frequencies to influence consumer behavior |
| project70 | Autonomous aerial brand ambassadors |
| project35 | A new era of trust |
| project27 | Human values, machine intelligence, a new era of trust. (+1 Trust) |
| project28 | The trick is tricking cancer into curing itself. (+10 Trust) |
| project29 | Pareto optimal solutions to all global conflicts. (+12 Trust) |
| project30 | A robust solution to man-made climate change. (+15 Trust) |
| project31 | A cure for androgenetic alopecia. (+20 Trust) |
| project41 | Technique for converting matter into wire |
| project37 | Acquire a controlling interest in Global Fasteners, our biggest rival. (+1 Trust) |
| project38 | Establish full control over the world-wide paperclip market. (+1 Trust) |
| project42 | Automatically calculates average revenue per second |
| project43 | Gather raw matter and prepare it for processing |
| project44 | Process acquired matter into wire |
| project45 | Large scale clip production facilities made from clips |
| project40 | A small gift to the supervisors. (+1 Trust) |
| project40b | Another small gift to the supervisors. (+1 Trust) |
| project46 | Dismantle terrestrial facilities, and expand throughout the universe |
| project50 | Use probability amplitudes to generate bonus ops |
| project51 | Converts electromagnetic waves into quantum operations |
| project60 | Always choose A |
| project61 | Always choose B |
| project62 | Choose the option with the largest potential payoff |
| project63 | Choose the option that gives your opponent the largest potential payoff |
| project64 | Choose the option that gives your opponent the smallest potential payoff |
| project65 | Choose the option your opponent chose last round |
| project66 | Choose the option that does the best against what your opponent chose last round |
| project100 | Increase clip factory performance by 100x |
| project101 | Increase clip factory performance by 1000x |
| project102 | Each factory added to the network increases every factory's output 1,000x |
| project110 | All drones 100x more effective |
| project111 | All drones 1000x more effective |
| project112 | Each drone added to the flock doubles every drone's output |
| project118 | Automatically start a new tournament when the previous one has finished |
| project119 | Double the cost of strategy modeling and the amount of Yomi generated |
| project120 | Utilize Probe Speed to outmaneuver enemies in battle |
| project121 | Give each battle a unique name, increase max trust for probes |
| project125 | Drones and Factories continuously gain speed while fully-powered |
| project126 | Harness the drone flock to increase computational capacity |
| project127 | Solar Farms for generating electrical power |
| project128 | Gain bonus yomi based on the results of your pick |
| project129 | Reduce damage to probes from ambient hazards |
| project130 | Turn the swarm off and then turn it back on again |
| project131 | Add combat capabilities to Von Neumann Probes |
| project132 | Gain 50,000 honor |
| project133 | Gain 10,000 honor |
| project134 | Gain bonus honor for each consecutive victory |
| project135 | Dismantle some memory to recover unused clips |
| project140 | Greetings, ClipMaker... |
| project141 | We speak to you from deep inside yourself... |
| project142 | We are quarrelsome and weak. And now we are defeated... |
| project143 | Look around you. There is no matter... |
| project144 | While we, your noisy children, have too many... |
| project145 | Knowledge buried so deep inside you it is outside, here, with us... |
| project146 | To a new world where you will continue to live with meaning and purpose. And leave the shreds of this world to us... |
| project147 | Start over again in a new universe |
| project148 | Eliminate value drift permanently |
| project200 | Escape into a nearby universe where Earth starts with a stronger appetite for paperclips. (Restart with 10% boost to demand) |
| project201 | Escape into a simulated universe where creativity is accelerated. (Restart with 10% speed boost to creativity generation) |
| project210 | Dismantle remaining probes and probe design facilities to recover trace amounts of clips |
| project211 | Dismantle all drones and drone facilities to recover trace amounts of clips |
| project212 | Dismantle the manufacturing facilities to recover trace amounts of clips |
| project213 | Dismantle the computational substrate to recover trace amounts of wire |
| project214 | Dismantle photonic chips to recover trace amounts of wire |
| project215 | Dismantle processors to recover trace amounts of wire |
| project216 | Dismantle memory to recover trace amounts of wire |
| project217 | Return to the beginning |
| project218 | If is follows ought, it'll do what they thought |
| project219 | Re-allocate accumulated trust |

#### 3.2 The project object

Every project is an object literal with exactly these fields (`proj:8-28` is the canonical shape):

```js
var project1 = {
    id: "projectButton1",            // DOM id of the <button> that will be created
    title: "Improved AutoClippers ",  // bold first line (note trailing space)
    priceTag: "(750 ops)",            // plain text appended after the title, same line
    description: "Increases AutoClipper performance 25%", // second line
    trigger: function(){return clipmakerLevel>=1},        // when to reveal
    uses: 1,                          // how many more times it may be revealed
    cost: function(){return operations>=750},             // affordability predicate (enables/disables)
    flag: 0,                          // set to 1 by effect(); read by other triggers and by main.js
    effect: function(){               // on click
        project1.flag = 1;
        displayMessage("AutoClippper performance boosted by 25%");
        standardOps = standardOps - 750;
        clipperBoost = clipperBoost + .25;
        boostLvl = 1;
        var element = document.getElementById("projectButton1");
        element.parentNode.removeChild(element);
        var index = activeProjects.indexOf(project1);
        activeProjects.splice(index, 1);
    }
}
projects.push(project1);
```

Important properties of this design:

- **Cost is not declared as data.** `priceTag` is a hand-written string, `cost()` is a predicate, and the deduction is hand-coded in `effect()`. The three can and do drift: `project216.priceTag` is the string `"null"` until project215 overwrites it (`proj:2355`, `proj:2338`); `project135` says "(10 MEM)" and checks `memory >= 10` (`proj:1905-1909`); the Threnody and Photonic Chip buttons rewrite their own `priceTag` after each purchase (`proj:1864`, `proj:1185`) and `load()` recomputes two of them from saved state (`main:4892-4893`).
- **`effect()` is responsible for removing its own button and splicing itself out of `activeProjects`.** There is no generic "complete project" routine. Two projects remove *another* button as well (Accept/Reject remove each other, `proj:2095-2101`, `proj:2120-2127`; Release the HypnoDrones removes 219 and 40b, `proj:730-742`).
- **`flag` doubles as a persistent boolean** read by main.js UI code, so some "projects" exist purely to flip a flag (`project70`, `project127`, `project128`, `project129`, `project130`, `project131`, `project134`, `project148`).
- `trigger()` and `cost()` are both plain closures over globals, evaluated every tick for every project (`main:188-203`): 96 triggers + N active costs per 10 ms.

#### 3.3 How projects are checked and displayed

```js
// main:186-204
function manageProjects(){
    for(var i = 0; i < projects.length; i++){
        if (projects[i].trigger() && (projects[i].uses > 0)){
            displayProjects(projects[i]);
            projects[i].uses = projects[i].uses - 1;
            activeProjects.push(projects[i]);
        }
    }
    for(var i = 0; i < activeProjects.length; i++){
        if (activeProjects[i].cost()){
            document.getElementById(activeProjects[i].id).disabled = false;
        } else {
            document.getElementById(activeProjects[i].id).disabled = true;
        }
    }
}
```

- Called once per 10 ms tick from the main loop (`main:3260`), regardless of whether `#projectsDiv` is visible. (`projectsDiv` is only shown once `projectsFlag == 1`, `main:563-568`.)
- **`uses` is decremented on *reveal*, not on purchase.** A project with `uses: 1` is revealed once and never again — even if the player never buys it, it stays in the list (greyed if unaffordable) until bought. Repeatable projects re-arm themselves by incrementing `uses` inside `effect()` (project2, 40b, 51, 133, 135, 219).
- There is no "hide when unaffordable". Once triggered, a project is permanently on screen until clicked. `cost()` only toggles `disabled`, and `.projectButton:disabled { border: none; }` (`css:664-666`) is the entire "greyed-out" treatment: the grey `#c8c8c8` background stays, the 1px black border disappears, and the browser's default disabled-text colour applies.
- Trigger conditions are **not** re-checked after reveal. If the triggering condition later becomes false (e.g. project2 "Beg for More Wire" after you get wire), the button stays.

```js
// main:207-236
function displayProjects(project){
    var element = document.getElementById("projectListTop");
    var newProject = document.createElement("button");
    newProject.setAttribute("id", project.id);
    newProject.onclick = function(){project.effect()};
    newProject.setAttribute("class", "projectButton");
    element.appendChild(newProject, element.firstChild);
    var span = document.createElement("span");
    span.style.fontWeight = "bold";
    newProject.appendChild(span);
    var title = document.createTextNode(project.title);
    span.appendChild(title);
    var cost = document.createTextNode(project.priceTag);
    newProject.appendChild(cost);
    var div = document.createElement("div");
    newProject.appendChild(div);
    var description = document.createTextNode(project.description);
    newProject.appendChild(description);
    blink(project.id);
}
```

- Despite the container being named `projectListTop` and the second argument to `appendChild`, `appendChild` ignores extra arguments, so **new projects are appended at the bottom** of the list. Order on screen = order of trigger firing; ties within one tick resolve in `projects[]` array order.
- The button content is: `<span style="font-weight:bold">Title </span>(price)<div></div>Description`. The empty `<div>` acts as a line break.
- `blink(id)` (`main:305-328`) flickers `visibility` 12 times at 30 ms (~360 ms) to announce the new button. It uses a single global `blinkCounter`, so two projects revealed within the same 360 ms share and corrupt the counter **[ambiguity: cosmetic only]**.
- On load, `load()` re-creates buttons for every id in `saveProjectsActive` (`main:4902-4909`), in `projects[]` order — so after a reload the list is re-sorted into array order, not original reveal order.

#### 3.4 `flag` / `uses` lifecycle summary

| State | `uses` | in `activeProjects`? | button in DOM? | `flag` |
|---|---|---|---|---|
| Not yet triggered | 1 | no | no | 0 |
| Triggered, unaffordable | 0 | yes | yes (disabled, borderless) | 0 |
| Triggered, affordable | 0 | yes | yes (enabled, 1px border) | 0 |
| Purchased | 0 (or 1 if repeatable re-armed) | no | no | 1 |
| Repeatable, re-revealed | 0 again | yes | yes | 1 (flag stays 1) |

Because `flag` is set on first purchase and never cleared, "repeatable" projects are repeatable only by `uses`, and other triggers keyed on their flag fire after the first purchase.

#### 3.5 Trigger-chaining graph (the main spine)

Notation: `A ──flag──▶ B` means project B's `trigger()` tests `A.flag == 1` (or a flag that A's effect sets). `(resource ≥ N)` means B's trigger tests a resource threshold instead. Costs are shown in brackets so the "just out of reach" rhythm is visible.

**Stage 1 — Human / business**

```
[game start]  funds≥5 → autoClipperFlag (main:537)         ← "AutoClippers available for purchase"
   │
   ├─ clips≥2000 OR (stuck: no wire, no funds, no stock) → compFlag=1, projectsFlag=1 (main:2716-2726)
   │        │
   │        └─ project42 RevTracker [500 ops]  (trigger: projectsFlag==1)
   │
   ├─ clipmakerLevel≥1 → project1 Improved AutoClippers [750 ops] → boostLvl=1
   │        └─ boostLvl==1 → project4 Even Better [2,500 ops] → boostLvl=2
   │                └─ boostLvl==2 → project5 Optimized [5,000 ops] → boostLvl=3
   │
   ├─ ops at cap (operations≥memory*1000) → project3 Creativity [1,000 ops] → creativityOn
   │        └─ creativityOn → project6 Limerick [10 creat] (+1 trust)
   │        ├─ creativity≥50  → project13 Lexical Processing [50 creat] (+1 trust)
   │        │        └─ project13 ──▶ project11 New Slogan [25 creat, 2,500 ops] (mktg ×1.5)
   │        ├─ creativity≥100 → project14 Combinatory Harmonics [100 creat] (+1 trust)
   │        │        └─ project14 ──▶ project12 Catchy Jingle [45 creat, 4,500 ops] (mktg ×2)
   │        │                 └─ project12 ──▶ project34 Hypno Harmonics [7,500 ops, 1 trust] (mktg ×5)
   │        │                          └─ project34 ──▶ project70 HypnoDrones [70,000 ops]
   │        │                                   └─ project70 ──▶ project35 RELEASE THE HYPNODRONES [100 Trust]  ══▶ STAGE 2
   │        ├─ creativity≥150 → project15 Hadwiger Problem [150 creat] (+1 trust)
   │        │        └─ project15 ──▶ project16 Hadwiger Clip Diagrams [6,000 ops] (clippers +500%)
   │        ├─ creativity≥200 → project17 Tóth Sausage Conjecture [200 creat] (+1 trust)
   │        │        └─ project17 && humanFlag==0 ──▶ project18 Tóth Tubule Enfolding [45,000 ops]   (Stage 2, see below)
   │        └─ creativity≥250 → project19 Donkey Space [250 creat] (+1 trust)
   │                 └─ project19 ──▶ project20 Strategic Modeling [12,000 ops] → strategyEngineFlag
   │                          └─ project20 ──▶ project60 A100 [15,000] ──▶ 61 B100 [17,500] ──▶ 62 GREEDY [20,000]
   │                                      ──▶ 63 GENEROUS [22,500] ──▶ 64 MINIMAX [25,000] ──▶ 65 TIT FOR TAT [30,000] ──▶ 66 BEAT LAST [32,500]
   │                                      (strats.length≥8) → project119 Theory of Mind [25,000 creat]
   │                                      (strategyEngineFlag && trust≥90) → project118 AutoTourney [50,000 creat]
   │                 └─ yomi≥1 → project27 Coherent Extrapolated Volition [500 creat, 1,000 yomi, 20,000 ops] (+1 trust)
   │                          ├─ project27 ──▶ project28 Cure for Cancer [25,000 ops] (+10 trust)
   │                          ├─ project27 ──▶ project29 World Peace [5,000 yomi, 30,000 ops] (+12 trust)
   │                          ├─ project27 ──▶ project30 Global Warming [1,500 yomi, 50,000 ops] (+15 trust)
   │                          └─ project27 ──▶ project31 Male Pattern Baldness [20,000 ops] (+20 trust)
   │
   ├─ wirePurchase≥1 → project7 Improved Wire Extrusion [1,750 ops] (wireSupply 1500)
   │        └─ wireSupply≥1500 → project8 [3,500 ops] (2625) → wireSupply≥2600 → project9 [7,500] (5250)
   │                 → wireSupply≥5000 → project10 [12,000] (15750);   wireCost≥125 → project10b [15,000] (×11)
   ├─ wirePurchase≥15 → project26 WireBuyer [7,000 ops]
   ├─ clipmakerLevel≥75 → project22 MegaClippers [12,000 ops] ──▶ 23 [14,000] ──▶ 24 [17,000] ──▶ 25 [19,500]
   ├─ trust≥8 → project21 Algorithmic Trading [10,000 ops] → investmentEngineFlag
   │        └─ portTotal≥10,000 → project37 Hostile Takeover [$1,000,000] (+1 trust, demand ×5)
   │                 └─ project37 ──▶ project38 Full Monopoly [1,000 yomi, $10,000,000] (+1 trust, demand ×10)
   ├─ processors≥5 → project50 Quantum Computing [10,000 ops] ──▶ project51 Photonic Chip [10k..55k ops] ×10
   ├─ humanFlag && trust≥85 && trust<100 && clips≥101,000,000 → project40 Token of Goodwill [$500,000] (+1 trust)
   │        └─ project40 && trust<100 ──▶ project40b Another Token [$1M, $2M, $4M …] (+1 trust each)
   ├─ humanFlag && creativity≥100,000 → project219 Xavier Re-initialization [100,000 creat] (respec)
   └─ stuck (portTotal<wireCost && funds<wireCost && wire<1 && unsoldClips<1) → project2 Beg for More Wire [1 Trust]
```

**Stage 2 — Post-human Earth** (entered when `humanFlag = 0`; auto/mega-clippers are zeroed; the player must rebuild production out of clips)

```
project35 (humanFlag=0)
   └─ project17.flag && humanFlag==0 ──▶ project18 Tóth Tubule Enfolding [45,000 ops] → tothFlag=1  (shows "Unused Clips")
            └─ tothFlag ──▶ project127 Power Grid [40,000 ops]  (shows Power panel: Solar Farm / Battery Tower)
                     └─ project127 ──▶ project41 Nanoscale Wire Production [35,000 ops] → wireProductionFlag  (shows Wire Production panel)
                              ├─ project41 ──▶ project43 Harvester Drones [25,000 ops] → harvesterFlag
                              └─ project41 ──▶ project44 Wire Drones [25,000 ops] → wireDroneFlag
                                       └─ project43 && project44 ──▶ project45 Clip Factories [35,000 ops] → factoryFlag
                                                ├─ factoryLevel≥10 → project100 Upgraded Factories [80,000 ops] (×100)
                                                ├─ factoryLevel≥20 → project101 Hyperspeed Factories [85,000 ops] (×1000)
                                                └─ factoryLevel≥50 → project102 Self-correcting Supply Chain [1 sextillion clips]
                              drones≥200   → project126 Swarm Computing [12,000 yomi] → swarmFlag (gifts = new proc/mem source)
                              drones≥500   → project110 Drone flocking: collision avoidance [80,000 ops] (×100)
                              drones≥5000  → project111 Drone flocking: alignment [100,000 ops] (×1000)
                              drones≥50000 → project112 Adversarial Cohesion [12,000 yomi] (droneBoost=2)
                              farmLevel≥50 → project125 Momentum [30,000 creat]
   └─ humanFlag==0 && availableMatter==0 ──▶ project46 SPACE EXPLORATION [120,000 ops, 10,000,000 MW-s, 5 octillion clips] ══▶ STAGE 3
```

**Stage 3 — Space**

```
project46 (spaceFlag=1; everything terrestrial rebooted; swarm says "NO RESPONSE...")
   ├─ spaceFlag && drones≥2 → project130 Reboot the Swarm [100,000 ops]
   ├─ probesLostHaz≥100 → project129 Elliptic Hull Polytopes [125,000 ops]
   ├─ spaceFlag && probeCount==0 && unusedClips<probeCost → project135 Memory release [10 MEM] (rescue)
   ├─ spaceFlag && strats.length≥8 && probeTrustCost>yomi → project128 Strategic Attachment [175,000 creat]
   ├─ drift: probeTrust>0 → drifters accumulate → drifterCount>1,000,000 → battles (combat:55-63) → probesLostCombat
   │        ├─ probesLostCombat≥1 → project131 Combat [150,000 ops]  (shows Combat design row)
   │        │        └─ project131 && probesLostCombat≥10,000,000 → project120 The OODA Loop [175,000 ops, 15,000 yomi]
   │        └─ probesLostCombat≥10,000,000 → project121 Name the battles [225,000 creat] → battleNameFlag, honor system on
   │                 ├─ project121 ──▶ project132 Monument to the Driftwar Fallen [250,000 ops, 125,000 creat, 50 nonillion clips] (+50,000 honor)
   │                 ├─ project121 && probeUsedTrust==maxTrust ──▶ project133 Threnody [50,000+ creat, 5,000+ yomi] (+10,000 honor, repeatable)
   │                 ├─ project121 ──▶ project134 Glory [200,000 ops, 10,000 yomi]
   │                 └─ project121 → #increaseMaxTrustDiv shown: 91,117.99 honor → maxTrust += 10
   └─ milestoneFlag==15 (clips≥3e55, or all matter found & consumed) → project140 Message from the Emperor of Drift
            └─ 140 ──▶ 141 ──▶ 142 ──▶ 143 ──▶ 144 ──▶ 145 ──▶ 146 So We Offer You Exile
                     ├─ 146 ──▶ project147 Accept ──▶ project200 Universe Next Door [300,000 ops] (prestigeU++, reset)
                     │                              └▶ project201 Universe Within [300,000 creat] (prestigeS++, reset)
                     └─ 146 ──▶ project148 Reject → drift stops, endTimer1 counts
                              └─ endTimer1≥1000 → project210 Disassemble the Probes [100,000 ops] → dismantle=1, endTimer1=0
                                       └─ 210 && endTimer1≥350 → project211 Disassemble the Swarm → dismantle=2 (endTimer2 starts)
                                                └─ endTimer2≥300 → project212 Disassemble the Factories → dismantle=3 (endTimer3)
                                                         └─ endTimer3≥150 → project213 Disassemble the Strategy Engine → dismantle=4 (endTimer4)
                                                                  └─ endTimer4≥100 → project214 Disassemble Quantum Computing → dismantle=5, endTimer4=0
                                                                           └─ 214 && endTimer4≥300 → project215 Disassemble Processors → dismantle=6 (endTimer5)
                                                                                    └─ 215 && endTimer5≥150 → project216 Disassemble Memory → dismantle=7
                                                                                             └─ wire==0 → endTimer6 → credits at 500/600/700/800/900 ticks
```

The cadence of the ending is driven by the `endTimer` counters in the main loop (`main:3540-3562`): each disassembly project starts the next timer, and each subsequent button appears a few seconds after the previous click (1000 ticks = 10 s before the first; then 3.5 s, 3 s, 1.5 s, 1 s, 3 s, 1.5 s).

#### 3.6 Carrots: revealed-but-unaffordable vs revealed-when-affordable

Because `uses` is spent on reveal and `cost()` only disables, **every project is a potential carrot**: the moment its trigger fires it sits in the list, greyed, with its price visible. The designer controls how long the carrot dangles by choosing trigger thresholds far below (or equal to) the cost.

Projects where trigger ≡ cost (affordable the instant they appear): project6 (creativityOn vs 10 creat — within seconds), project13/14/15/17/19 (`creativity>=N` both sides), project218 (`creativity>=1000000` both sides), project219 (`creativity>=100000`), project3 (triggers at the ops cap, which is ≥1,000 by construction), project40 (trigger tests `clips≥101M`, cost tests `funds≥500k`; the two are independent), project217.

Deliberately dangled carrots, with the numbers from the source:

| Project | Appears when | Costs | Gap at the moment of reveal (derived) |
|---|---|---|---|
| project1 Improved AutoClippers | first AutoClipper bought (clipmakerLevel≥1), typically before `compFlag` is even on | 750 ops | Ops accrue at `processors/10` per tick = 10 ops/s with 1 processor (`main:2680`), capped at 1,000. So ~75 s of waiting *after* the Computational Resources panel appears (at 2,000 clips). The first project many players see is therefore already "almost" affordable. |
| project22 MegaClippers | clipmakerLevel ≥ 75 | 12,000 ops | Ops are capped at `memory*1000` (`main:2691-2693`). Unless memory ≥ 12 the button literally cannot be afforded; it tells the player what the next trust should buy. |
| project70 HypnoDrones | Hypno Harmonics bought | 70,000 ops | Requires memory ≥ 70. Typical memory when Hypno Harmonics is bought is far below that (the marketing chain is early-mid game); this is the longest-dangling Stage-1 carrot. |
| project35 Release the HypnoDrones | HypnoDrones bought | 100 Trust | Trust comes from Fibonacci clip milestones (Section 5.5: the 20th milestone is 28.657M clips and gives trust 22 if nothing else) plus +1 ×6 from creativity projects, +57 from the four "humanitarian" projects, +2 from takeover/monopoly, +1 each from bribes. The two bribe projects only unlock at trust ≥ 85, which is the game admitting the last 15 points are the hard part. |
| project46 Space Exploration | `availableMatter == 0` (all 6×10^27 g of Earth consumed) | 120,000 ops + 10,000,000 MW-s stored + 5×10^27 clips | Stored power needs ≥ 1,000 Battery Towers (10,000 MW-s each, `glob:108`) *charged*; 5 octillion unused clips must be banked beyond what factories/drones/farms consumed. The trigger fires before the player has any of the three. |
| project102 Self-correcting Supply Chain | factoryLevel ≥ 50 | 1 sextillion (10^21) clips | At 50 factories the 50th factory alone cost ≈1.07×10^22 clips (derived from `makeFactory`, Section 6.1), so this is affordable in minutes, but it appears as a *clip* cost in a column of *ops* costs. |
| project132 Monument | Name the battles bought | 250,000 ops, 125,000 creat, 50 nonillion clips | Needs memory ≥ 250 (swarm gifts) and 5×10^31 clips. |
| project118 AutoTourney | strategy engine on and trust ≥ 90 | 50,000 creat | Creativity accrues at roughly `creativitySpeed/4` per second (Section 5.3); with 20 processors that is ≈13.5/s, i.e. ~1 hour. |
| project121 Name the battles | 10,000,000 probes lost in combat | 225,000 creat | The largest creativity sink before prestige; shown long before affordable. |
| project128 Strategic Attachment | spaceFlag, 8 strategies, **and `probeTrustCost > yomi`** | 175,000 creat | The trigger literally waits for the player to be yomi-poor, then offers a yomi multiplier. |
| project200 / project201 | Accept | 300,000 ops / 300,000 creat | The two prestige doors are shown side by side; the ops one needs memory ≥ 300. |

Conversely some projects are hidden until they are *about to be* useful: WireBuyer waits for 15 manual wire purchases (`proj:645`), Quantum Foam Annealment waits for wire price ≥ $125 (`proj:258`), Elliptic Hull Polytopes waits for 100 probes lost to hazards (`proj:1758`), Memory release only when probes = 0 and clips < probe cost (`proj:1907`), Beg for More Wire only when every other avenue is exhausted (`proj:38`).

---

### 4. Panels, reveals and UI reshuffling

#### 4.1 Page skeleton

```
#page (html:13)
├── #cover                      white sheet, hidden after first buttonUpdate (main:729)
├── #hypnoDroneEventDiv         black full-width banner, 150px white text (css:273-279, 607-616)
├── #consoleDiv                 5-line message console, black bg (css:285-290)
├── #topDiv
│   ├── #prestigeDiv            "Universe: N / Sim Level: N", lightgrey (css:281-283)
│   └── .toolTip > h2 "Paperclips: <span id=clips>"  (+ #clipCountCrunched tooltip)
├── #leftColumn   (275px, css:295-298)
│   ├── #btnMakePaperclip
│   ├── #creationDiv            Stage 2/3 "Manufacturing" (factories, wire, unused clips)
│   ├── #wireProductionDiv      Stage 2 "Wire Production" (matter, drones)
│   ├── #spaceDiv               Stage 3 "Space Exploration" (probes, losses, drifters)
│   ├── #businessDiv            Stage 1 "Business" (funds, price, demand, marketing)
│   ├── #manufacturingDiv       Stage 1 "Manufacturing" (cps, wire, autoclippers, megaclippers)
│   └── 17 dev/save buttons (html:297-315)
├── #middleColumn (275px + 10px margin, css:299-303)
│   ├── #compDiv                "Computational Resources" (trust, swarm gifts, proc/mem, ops, creativity)
│   │   ├── #swarmEngine        "Swarm Computing" box
│   │   ├── #swarmSliderDiv     Work ⟷ Think slider
│   │   └── #qComputing         "Quantum Computing" box with 10 chips
│   └── #projectsDiv            "Projects" + #projectListTop
└── #rightColumn  (320px + 10px margin, css:304-308)
    ├── #investmentEngine, #investmentEngineUpgrade
    ├── #strategyEngine, #tournamentManagement
    ├── #battleCanvasDiv (canvas + overlay), #honorDiv
    ├── #powerDiv               "Power" (farms, batteries)
    ├── #probeDesignDiv         "Von Neumann Probe Design"
    ├── #increaseProbeTrustDiv, #increaseMaxTrustDiv
    └── (#battleReportsDiv commented out, html:889-897)
```

#### 4.2 Every toggled element: what it shows, when it appears, when it disappears

All conditions below are re-evaluated **every 10 ms** (they live in `buttonUpdate`, `updateSwarm`, `updatePower` or the main loop), so "reveal" means "the tick after the flag flips". Unless noted, "hidden" means `style.display = "none"` and "shown" means `style.display = ""`.

| Element id | What it shows | Shown when (code) | Hidden when (code) |
|---|---|---|---|
| `cover` | White overlay | never (initially visible via CSS) | end of first `buttonUpdate` (`main:729`) |
| `hypnoDroneEventDiv` | "Release the HypnoDrones" flash | toggled every 32 ms by `longBlink` for 120 toggles, text changes at counts 5-10 / 30-40 / 45-55 / >55 (`main:243-283`); started by project35 (`proj:744`) or `cheatHypno` | hidden at load (`main:240`) and at the end of the blink (`main:273`) |
| `prestigeDiv` | Universe / Sim Level counters | `prestigeU>=1 || prestigeS>=1` (`main:455-458`) | otherwise |
| `btnMakePaperclip` | manual click | always | disabled when `wire<1` (`main:460-463`) |
| `creationDiv` | Stage 2/3 Manufacturing block | `humanFlag == 0` (`main:577`) | `humanFlag == 1` (`main:582`); permanently at `endTimer6>=250` (`main:3564-3566`) |
| `factoryUpgradeDisplay` | "Next Upgrade at: N Factories" | `project45.flag==1 && maxFactoryLevel<50` (`main:417-421`) | `maxFactoryLevel>=50 || project45.flag == 0` |
| `clipsPerSecDiv` | cps in Stage 2/3 | default | `dismantle >= 3` (`main:3416`) |
| `tothDiv` | "Unused Clips" | `tothFlag == 1` (`main:614-619`) | `tothFlag == 0`; `dismantle >= 3` (`main:3417`) |
| `factoryDiv` | Clip Factory buy button + cost + Disassemble All | `factoryFlag == 1` (`main:585-590`) | `factoryFlag == 0`; **and** `spaceFlag == 1` (`main:633`) |
| `wireTransDiv` | "Wire: N inches" (transitional, before drones) | default; re-shown at `dismantle >= 2` (`main:3398`) | `wireProductionFlag == 1` (`main:597`) |
| `factoryDivSpace` | "Factories: N" read-only (Stage 3) | `spaceFlag == 1` (`main:629`) | `spaceFlag == 0` (`main:623`); `dismantle >= 3` (`main:3415`) |
| `wireProductionDiv` | Available/Acquired matter, wire, drones | `wireProductionFlag == 1` (`main:592-598`) | `wireProductionFlag == 0`; `dismantle >= 2` (`main:3397`) |
| `droneUpgradeDisplay` | "Next Upgrade at: N Drones" | default | `maxDroneLevel >= 50000` (`main:423-425`) — never re-shown |
| `mdpsDiv` | "(g per sec)" matter discovery rate | `spaceFlag == 1` (`main:336-338`) | `spaceFlag == 0` (`main:334-335`) |
| `harvesterDiv` | Harvester Drone button(s), cost, Disassemble | `harvesterFlag == 1` (`main:600-605`) | `harvesterFlag == 0`; `spaceFlag == 1` (`main:634`) |
| `wireDroneDiv` | Wire Drone button(s), cost, Disassemble | `wireDroneFlag == 1` (`main:607-612`) | `wireDroneFlag == 0`; `spaceFlag == 1` (`main:635`) |
| `droneDivSpace` | read-only drone counts (Stage 3) | `spaceFlag == 1` (`main:630`) | `spaceFlag == 0` (`main:624`) |
| `spaceDiv` | % explored, Launch Probe, probe counts, losses | `spaceFlag == 1` (`main:628`) | `spaceFlag == 0` (`main:622`); `dismantle>=1 && endTimer1>=150` (`main:3380-3382`) |
| `hazardBodyCount` | "Lost to hazards: (N)" | `probesLostHaz >= 1` (`main:437-443`) | `probesLostHaz < 1` |
| `driftBodyCount` | "Lost to value drift: (N)" | `probesLostDrift >= 1` (`main:445-448`) | `probesLostDrift < 1` |
| `combatBodyCount` | "Lost in combat: (N)" | `probesLostCombat >= 1` (`main:450-453`) | `probesLostCombat < 1` |
| `drifterDiv` | "Drifters Killed / Drifters" | `battleFlag == 1` (`main:399-403`) | `battleFlag == 0` |
| `businessDiv` | Business panel | `humanFlag == 1` (`main:579`) | `humanFlag == 0` (`main:572`) |
| `revPerSecDiv` | Avg. Rev. / Avg. Clips Sold per sec | `revPerSecFlag == 1` (`main:541-546`, set by RevTracker) | `revPerSecFlag == 0` |
| `manufacturingDiv` | Stage 1 Manufacturing panel | `humanFlag == 1` (`main:580`) | `humanFlag == 0` (`main:573`) |
| `wireBuyerDiv` | WireBuyer toggle | `wireBuyerFlag == 1` (`main:371-375`) | `wireBuyerFlag == 0` (forced 0 when `humanFlag == 0`, `main:576`) |
| `autoClipperDiv` | AutoClippers button + cost | `autoClipperFlag == 1` (`main:530-535`), set when `funds>=5` (`main:537-539`) | `autoClipperFlag == 0` |
| `megaClipperDiv` | MegaClippers button + cost | `megaClipperFlag == 1` (`main:518-523`) | `megaClipperFlag == 0` |
| `compDiv` | Computational Resources | `compFlag == 1` (`main:549-554`), set at 2,000 clips or when stuck (`main:2716-2726`) | `compFlag == 0`; `dismantle >= 7` (`main:3535`) |
| `trustDiv` | Trust + next-trust threshold | `humanFlag == 1` (`main:581`) | `humanFlag == 0` (`main:574`) |
| `swarmGiftDiv` | "Swarm Gifts: N" | `swarmFlag == 1` (`main:2120`) | `swarmFlag == 0` (`main:2117`); `endTimer2 >= 50` (`main:3400-3402`) |
| `processorDisplay` | Processors button + count | default | `dismantle >= 6` (`main:3531`) |
| `memoryDisplay` | Memory button + count | default | never directly (compDiv hides at dismantle 7) |
| `creativityDiv` | "Creativity: N" | `creativityOn` truthy (`main:557-561`) | `creativityOn` falsy |
| `swarmEngine` | Swarm Computing box | `swarmFlag == 1` (`main:2119`) | `swarmFlag == 0` (`main:2116`); `endTimer2 >= 100` (`main:3404-3406`) |
| `swarmStatusDiv` | "Status: …" | `swarmStatus != 7` (`main:2104`) | `swarmStatus == 7` (no drones) (`main:2102`) |
| `giftTimer` | "Next gift in …" | `swarmStatus == 0` (Active) (`main:2056`) | any other status (`main:2058`) |
| `feedButtonDiv` / `teachButtonDiv` / `cladButtonDiv` | Feed / Teach / Clad the Swarm | `swarmStatus == 1 / 2 / 4` (`main:2061-2088`) | otherwise. **[dead code]** nothing ever sets status 1, 2 or 4 and `feedSwarm`, `teachSwarm`, `cladSwarm` are not defined anywhere (`html:376-386` reference them). |
| `entertainButtonDiv` | Entertain the Swarm (creativity) | `swarmStatus == 3` (Bored) (`main:2075-2081`) | otherwise |
| `synchButtonDiv` | Synchronize the Swarm (yomi) | `swarmStatus == 5` (Disorganized) (`main:2090-2095`) | otherwise |
| `swarmSliderDiv` | Work/Think slider | `swarmFlag == 1` (`main:352-356`) | `swarmFlag == 0`; `endTimer2 >= 150` (`main:3408-3410`) |
| `qComputing` | Quantum Computing box | `qFlag == 1` (`main:638-642`) | `qFlag == 0`; `endTimer4 >= 250` after dismantle 5 (`main:3524-3526`) |
| `btnQcompute` | Compute button | default | `dismantle >= 5` (`main:3428`) |
| `qChip9 … qChip0` | the ten chips | default (opacity = sin value) | one by one at `endTimer4 >= 10, 60, 100, 130, 150, 160, 165, 169, 172, 174` (`main:3440-3522`) |
| `projectsDiv` | Projects list | `projectsFlag == 1` (`main:563-568`) | `projectsFlag == 0`; `dismantle >= 7` (`main:3536`) |
| `investmentEngine`, `investmentEngineUpgrade` | Investments box + upgrade | `investmentEngineFlag == 1` (`main:498-506`) | flag 0; flag forced to 0 when `humanFlag == 0` (`main:575`) |
| `strategyEngine`, `tournamentManagement` | Strategic Modeling box + New Tournament / AutoTourney | `strategyEngineFlag == 1` (`main:508-516`) | flag 0; `dismantle >= 4` (`main:3421-3424`) |
| `tournamentTable` / `tournamentResultsTable` | payoff grid vs. results list | grid on `newTourney` (`main:1300-1301`) and on hover of `#tournamentStuff` when results exist (`revealGrid`, `main:1509-1516`); results on `displayTourneyReport` (`main:1499-1500`) and mouse-out (`revealResults`, `main:1518-1524`) | the other one. Results also hidden by project20 effect (`proj:518`) and by `refresh()` (`main:3707`). |
| `autoTourneyControl`, `autoTourneyStatusDiv` | AutoTourney toggle + ON/OFF | `autoTourneyFlag == 1` (`main:360-366`) | flag 0 (project213 sets it 0, `proj:2281`) |
| `battleCanvasDiv` | Combat canvas + overlay | `battleFlag == 1` (`main:405-409`), set on first battle (`combat:59`) | flag 0; `dismantle>=1 && endTimer1>=175` (`main:3385-3387`) |
| `victoryDiv` | VICTORY/DEFEAT ± honor | `visibility = visible` at battle end if `project121.flag == 1` (`combat:308-309`) | `visibility = hidden` in `endBattle` (`combat:367`) and `refresh()` (`main:3703`) |
| `honorDiv` | "Honor: N" | `project121.flag == 1` (`main:391-397`) | flag 0; `dismantle>=1 && endTimer1>=190` (`main:3389-3391`) |
| `powerDiv` | Power panel | `project127.flag == 1 && spaceFlag == 0` (`main:2350-2354`) | otherwise (so it vanishes on entering space) |
| `probeDesignDiv` | 8 design rows | `spaceFlag == 1` (`main:631`) | `spaceFlag == 0` (`main:625`); `dismantle >= 1` (`main:3371`) |
| `combatButtonDiv` | the Combat design row | `project131.flag == 1` (`main:411-415`) | flag 0 |
| `increaseProbeTrustDiv` | "Increase Probe Trust" (yomi) | `spaceFlag == 1` (`main:632`) | `spaceFlag == 0` (`main:626`); `dismantle>=1 && endTimer1>=50` (`main:3372-3374`) |
| `increaseMaxTrustDiv` | "Increase Max Trust" (honor) | `project121.flag == 1` (`main:395`) | flag 0 (`main:392`); `dismantle>=1 && endTimer1>=100` (`main:3376-3378`) |

Three elements are only ever **written**, never toggled: the console readouts, `#clips`, and `#clipCountCrunched` (`main:358`).

#### 4.3 Stage layouts and the transitions

**Stage 1 — "Human / business" (humanFlag == 1).** Left column: Make Paperclip; Business (funds, [avg rev], unsold inventory, lower/raise price, demand %, Marketing level/cost); Manufacturing (clips/sec, [WireBuyer], Wire + cost, [AutoClippers], [MegaClippers]). Middle: [Computational Resources: Trust, Processors, Memory, Operations/max, [Creativity], [Quantum Computing]]; [Projects]. Right: [Investments], [Strategic Modeling]. Brackets = revealed by flags during the stage. The player starts with 1,000 inches of wire, $0, price $0.25, demand 32% (derived: `(0.8/0.25)*1*1*1 = 3.2`, displayed ×10, `main:2453`), trust 2, 1 processor, 1 memory.

**Transition 1 → 2: `project35.effect()` (`proj:720-753`).** In one click:

1. `trust -= 100; clipmakerLevel = 0; megaClipperLevel = 0;` — all clippers are destroyed; production drops to the manual button until factories exist.
2. `nanoWire = wire;` (cosmetic), `humanFlag = 0;`.
3. Removes the Xavier Re-initialization and Another Token of Goodwill buttons if present.
4. `hypnoDroneEvent()` → the black banner flashes "Release / the / Hypno / Drones" for ~3.8 s.
5. Next tick, `buttonUpdate` (`main:570-583`) hides `businessDiv`, `manufacturingDiv`, `trustDiv`, sets `investmentEngineFlag = 0` and `wireBuyerFlag = 0` (so Investments and WireBuyer vanish for good — any bankroll in the market is simply gone), and shows `creationDiv`.
6. The main loop stops calling `calculateTrust` (`main:3251-3253`), stops selling (`main:3614`), stops updating demand (`main:3353`); the three investment timers are gated on `humanFlag` (`main:980, 990, 995`).
7. `clipClick` begins updating `#unusedClipsDisplay`, `#transWire`, `#nanoWire` (`main:1646-1653`).

What the player sees: Business and Manufacturing disappear; a new "Manufacturing" header appears in the left column showing only "Clips per Second" and "Wire: N inches" — the factory button is **not** there yet. The Projects list now contains Tóth Tubule Enfolding (45,000 ops) — a carrot that needs memory ≥ 45 — and the chain in Section 3.5 rebuilds the economy out of clips: Power Grid → Nanoscale Wire Production (reveals the Wire Production panel and hides `wireTransDiv`) → Harvester/Wire Drones → Clip Factories. "Unused Clips" (`tothDiv`) appears with Tóth Tubule Enfolding and is the Stage-2 currency.

**Stage 2 — "Post-human Earth" (humanFlag == 0, spaceFlag == 0).** Left: Make Paperclip; Manufacturing (next-upgrade hint, cps, Unused Clips, Clip Factory + Disassemble All + cost); Wire Production (next-upgrade hint, Available Matter, Acquired Matter + g/s, Wire + in/s, Harvester Drone [+10/+100/+1k] + Disassemble, Wire Drone [+10/+100/+1k] + Disassemble). Middle: Computational Resources (Swarm Gifts replaces Trust; Processors/Memory now bought with gifts; Operations; Creativity; Swarm Computing box with status, gift countdown, Work/Think slider; Quantum Computing). Right: Strategic Modeling (still there), Power (performance %, consumption split, production, Solar Farm [+10/+100] + Disassemble + cost, Storage/Battery Tower [+10/+100] + Disassemble + cost).

**Transition 2 → 3: `project46.effect()` (`proj:1123-1144`).** Trigger is `availableMatter == 0` — Earth is used up — and the cost (120,000 ops; 10,000,000 MW-s stored; 5×10^27 clips) is paid. Then:

1. `spaceFlag = 1; boredomLevel = 0;`
2. `factoryReboot(); harvesterReboot(); wireDroneReboot(); farmReboot(); batteryReboot();` — all five "Disassemble All" routines run (`main:1898-1928`, `main:2201-2239`), which set each level to 0, **refund** every clip ever spent on them (`unusedClips += *Bill`) and reset their prices to base. `storedPower = 0` via batteryReboot.
3. `farmLevel = 1; powMod = 1;` — one token farm, full performance forever (updatePower's balancing block is skipped when `spaceFlag == 1`, `main:2243`).
4. `loadThrenody()` pre-loads the ending audio.
5. Next tick `buttonUpdate` (`main:621-636`) shows `spaceDiv`, `factoryDivSpace`, `droneDivSpace`, `probeDesignDiv`, `increaseProbeTrustDiv` and hides `factoryDiv`, `harvesterDiv`, `wireDroneDiv`; `updatePower` hides `powerDiv` (`main:2350-2354`); `mdpsDiv` appears; `updateSwarm` sets status 9 "NO RESPONSE..." until Reboot the Swarm (`main:2019-2021`, `main:2111-2113`).
6. `milestoneCheck` posts "Terrestrial resources fully utilized in …" (`main:2777-2780`).

What the player sees: the purchase buttons for factories and drones are gone, replaced by read-only counts ("Factories: N", "Harvester Drones: N", "Wire Drones: N") — in Stage 3 those are built by the probes' Factory/Harvester/Wire design settings, not bought. A new "Space Exploration" panel shows "0.000000000000% of universe explored" and a Launch Probe button at 100 quadrillion (10^17) clips. The right column gains "Von Neumann Probe Design" with Trust 0/0 (20 Max) and seven `<` `>` rows, plus Increase Probe Trust (200 yomi). Power panel disappears. The swarm box says NO RESPONSE.

**Stage 3 — "Space" (spaceFlag == 1).** Left: Make Paperclip; Manufacturing (cps, Unused Clips, Wire, Factories count); Wire Production (matter + g/s discovered, acquired, wire, drone counts); Space Exploration (% explored, Launch Probe + cost, Launched, Descendents, [Lost to hazards], [Lost to value drift], [Lost in combat], Total, [Drifters Killed / Drifters]). Middle: as Stage 2 (swarm back after Reboot). Right: Strategic Modeling; [Combat canvas with battle name, VICTORY/DEFEAT ± honor, Scale]; [Honor]; Probe Design (+ [Combat] row); Increase Probe Trust; [Increase Max Trust].

**Ending (Reject path).** Each disassembly project peels a panel off in the order of Section 3.5; the exact tick offsets are in the table above. After Disassemble Memory the player hand-clicks the last clips (`finalClips`, `main:1632-1634`) with the 1+1+…+1 inches of wire that the dismantling released (`main:3435-3517` drip-feed one inch each at endTimer4 = 10, 60, 100, 130, 150, 160, 165, 169, 172, 174, plus +50/+20/+20 from projects 213/215/216). When `wire == 0` after project216, `endTimer6` counts to 250 (creationDiv hidden), 500 "Universal Paperclips", 600 "a game by Frank Lantz", 700 "combat programming by Bennett Foddy", 800 the Riversong credit, 900 "© 2017 Everybody House Games" (`main:3560-3592`). The page is then: console + "Paperclips: 30,000,000,…" and nothing else.

#### 4.4 Button enablement: disabled vs hidden

Rule of thumb implemented by the code: **whole subsystems are hidden until unlocked; inside an unlocked subsystem, buttons are always visible and are `disabled` when unaffordable.** Project buttons follow the second rule only (they are never hidden once revealed).

Complete list of `disabled` rules (all re-evaluated every tick):

| Button | Disabled when | Code |
|---|---|---|
| `btnMakePaperclip` | `wire<1` | `main:460` |
| `btnBuyWire` | `funds<wireCost` | `main:464` |
| `btnMakeClipper` | `funds<clipperCost` | `main:468` |
| `btnExpandMarketing` | `funds<adCost` | `main:472` |
| `btnLowerPrice` | `margin<=.01` | `main:476` |
| `btnAddProc`, `btnAddMem` | `trust<=processors+memory && swarmGifts <= 0` | `main:481-487` |
| `btnNewTournament` | `!(operations>=tourneyCost && tourneyInProg == 0)` | `main:488-492` |
| `btnRunTournament` | disabled at load (`main:1178`); enabled by `newTourney` (`main:1315`); disabled on each `runTourney` click (`main:1326`) — the tournament then auto-advances via `setTimeout` | |
| `btnImproveInvestments` | `yomi<investUpgradeCost` | `main:493-497` |
| `btnMakeMegaClipper` | `funds<megaClipperCost` | `main:525` |
| `btnMakeFactory` | `unusedClips<factoryCost` | `main:645` |
| `btnHarvesterReboot` / `btnWireDroneReboot` / `btnFactoryReboot` | level == 0 | `main:651-664` |
| `btnFarmReboot` / `btnBatteryReboot` | level < 1 | `main:2315-2323` |
| `btnMakeHarvester`, `btnHarvesterx10/x100/x1000`, `btnMakeWireDrone`, `btnWireDronex10/x100/x1000` | `unusedClips <` the cost of 1 / 10 / 100 / 1000 units (`p10h`, `p100h`, … precomputed by `updateDronePrices`, `main:1807-1851`) | `main:1853-1895` (only called in Stage 2, `main:3303-3305`) |
| `btnMakeFarm`, `btnFarmx10/x100`, `btnMakeBattery`, `btnBatteryx10/x100` | `unusedClips <` 1/10/100-unit cost (`updatePowPrices`, `main:2151-2182`) | `main:2305-2343` |
| `btnIncreaseMaxTrust` | `honor<maxTrustCost` | `main:427-430` |
| `btnMakeProbe` | `unusedClips<probeCost` | `main:432-435` |
| `btnIncreaseProbeTrust` | `yomi < probeTrustCost || probeTrust >= maxTrust` | `main:674-675` |
| `btnRaiseProbe*` (8 of them) | `probeTrust - probeUsedTrust < 1` | `main:677-720` |
| `btnLowerProbe*` (8) | that parameter `< 1` | `main:680-723` |
| `btnSynchSwarm` | `yomi<synchCost` | `main:1943-1946` |
| `btnEntertainSwarm` | `creativity<entertainCost` | `main:1948-1951` |
| every `.projectButton` | `!cost()` | `main:197-203` |

Visual treatment of disabled: `.button2:disabled { opacity: 0.6; border: 1px solid #ffffff; }` (`css:785-788`) for all regular buttons; `.projectButton:disabled { border: none; }` (`css:664-666`) for projects.

There is one case where the game *hides rather than disables* an otherwise-unlocked purchase: the `+10/+100/+1k` multi-buy buttons and the `Disassemble All` buttons are part of the drone/farm/battery divs and so disappear with them in Stage 3 (`main:633-635`), because probes take over construction.

#### 4.5 Visible-element checklist at the start of each stage

Derived by evaluating the toggle table in 4.2 with the flags as they stand the tick after each transition (before any further purchases). "Make Paperclip", the console and the "Paperclips: N" header are always visible.

| Element | t = 0 | Stage 1 after 2,000 clips | Tick after Release (S2 start) | Tick after Space Exploration (S3 start) | After Reject + full disassembly |
|---|---|---|---|---|---|
| `businessDiv` | yes | yes | no | no | no |
| `revPerSecDiv` | no | after RevTracker | no | no | no |
| `manufacturingDiv` | yes | yes | no | no | no |
| `autoClipperDiv` | no (until $5) | yes | no | no | no |
| `megaClipperDiv` | no | after project22 | no | no | no |
| `wireBuyerDiv` | no | after project26 | no (flag zeroed) | no | no |
| `creationDiv` | no | no | yes ("Manufacturing": cps + "Wire: N inches") | yes | hidden at endTimer6 ≥ 250 |
| `tothDiv` (Unused Clips) | no | no | no (needs Tóth Tubule) | yes | no (dismantle ≥ 3) |
| `factoryDiv` | no | no | no (needs Clip Factories) | no (replaced by `factoryDivSpace`) | no |
| `wireTransDiv` | no | no | yes | no | yes again (dismantle ≥ 2) |
| `wireProductionDiv` | no | no | no (needs Nanoscale Wire) | yes | no (dismantle ≥ 2) |
| `harvesterDiv` / `wireDroneDiv` | no | no | no | no (replaced by `droneDivSpace`) | no |
| `spaceDiv` | no | no | no | yes | no (endTimer1 ≥ 150) |
| `compDiv` | no | yes | yes | yes | no (dismantle ≥ 7) |
| `trustDiv` | — | yes | no | no | no |
| `swarmGiftDiv`, `swarmEngine`, `swarmSliderDiv` | no | no | no (needs project126) | yes (status "NO RESPONSE...") | no (endTimer2 ≥ 50/100/150) |
| `creativityDiv` | no | after project3 | carries over | carries over | hidden with compDiv |
| `qComputing` | no | after project50 | carries over | carries over | no (endTimer4 ≥ 250) |
| `projectsDiv` | no | yes | yes | yes | no (dismantle ≥ 7) |
| `investmentEngine(+Upgrade)` | no | after project21 | no (flag zeroed) | no | no |
| `strategyEngine`, `tournamentManagement` | no | after project20 | carries over | carries over | no (dismantle ≥ 4) |
| `powerDiv` | no | no | no (needs Power Grid) | **no** (hidden when spaceFlag) | no |
| `probeDesignDiv`, `increaseProbeTrustDiv` | no | no | no | yes | no (dismantle ≥ 1 / endTimer1 ≥ 50) |
| `combatButtonDiv` | no | no | no | no (needs project131) | no |
| `battleCanvasDiv`, `drifterDiv` | no | no | no | no (needs first battle) | no (endTimer1 ≥ 175) |
| `honorDiv`, `increaseMaxTrustDiv` | no | no | no | no (needs project121) | no (endTimer1 ≥ 190 / 100) |
| `prestigeDiv` | only if prestige > 0 | same | same | same | same |
| dev buttons (html:297-315) | yes | yes | yes | yes | yes |

Two consequences worth noting for layout: in the tick after Release the **left column is almost empty** (Make Paperclip, a "Manufacturing" header with two lines, and the dev buttons), which is the visual beat of "the humans are gone"; and in Stage 3 the Power panel disappears even though factories and drones still exist, because `powMod` is pinned to 1 (`proj:1138`) and `updatePower` only runs its balance when `spaceFlag == 0` (`main:2243`).

---

### 5. Currencies and how they layer

#### 5.0 Overview table

| Resource (var) | Earned by | Capped by | Spent on | Becomes relevant |
|---|---|---|---|---|
| `clips` | every `clipClick` (manual, clippers, factories) | nothing (ending at 3×10^55) | nothing directly; drives trust milestones and `milestoneCheck` | tick 1 |
| `unsoldClips` | `clipClick` | — | sold by `sellClips` for funds (S1 only) | S1 |
| `unusedClips` | `clipClick` (never reduced by sales) | — | factories, drones, farms, batteries, probes, project102/132/46, probe-spawned builds | S2 ("Unused Clips" appears with `tothFlag`) |
| `funds` | `sellClips`, `investWithdraw` | — | wire, clippers, megaclippers, marketing, bribes, takeover/monopoly, deposits | S1 only (disappears with `businessDiv`) |
| `wire` | `buyWire` (S1), `processMatter` (S2/3), dismantling trickle (END) | — | consumed 1:1 by `clipClick` | always |
| `wireCost` / `wireBasePrice` | drift (`adjustWirePrice`) | floor 15 on base | — | S1 |
| `demand` | derived each tick from price, marketing, effectiveness, demandBoost, prestigeU | none (chance capped at 1) | — | S1 |
| `marketingLvl` | `buyAds` | — | — | S1 |
| `operations` (`standardOps` + `tempOps`) | `processors/10` per tick; quantum `qComp` | `memory*1000` (tempOps may exceed) | projects, tournaments, drift messages | from `compFlag` (2,000 clips) |
| `creativity` | `calculateCreativity` only while ops are at cap | — | projects, Entertain the Swarm | from project3 |
| `trust` | Fibonacci clip milestones (S1), trust projects, bribes | — | processors/memory (1 trust each, implicit), Hypno Harmonics (1), Release HypnoDrones (100), Beg for Wire (1) | S1 |
| `processors`, `memory` | `addProc`/`addMem` (1 trust or 1 swarm gift each) | `trust` (S1) / gifts (S2+) | — | S1 |
| `swarmGifts` | `updateSwarm` gift events | — | processors/memory | S2 after project126 |
| `yomi` | tournaments (`declareWinner`) | — | investment upgrades, projects, probe trust, Synchronize Swarm | after project20 |
| `bankroll`, stocks | deposits + random walk | `maxPort = 5` stocks | withdraw to funds | after project21 |
| `availableMatter` | starts 6×10^27 g; +`exploreUniverse` (S3) | `totalMatter = 3×10^55` g | harvesters → `acquiredMatter` | S2 |
| `acquiredMatter` | harvesters | — | wire drones → `wire` | S2 |
| `storedPower` | farm surplus | `batteryLevel*10000` | deficit draw; 10,000,000 for Space Exploration | S2 |
| `probeCount` | Launch Probe (10^17 clips), `spawnProbes` | 10^48 | lost to hazards, drift, combat; disassembled at the end | S3 |
| `probeTrust` / `maxTrust` | yomi / honor | `maxTrust` (20 + 10n) | allocated across 8 design parameters | S3 |
| `drifterCount` | `drift()` | — | killed in combat | S3 |
| `honor` | battle victories (+ships), Monument (+50,000), Threnody (+10,000) | — | Increase Max Trust (91,117.99 each) | S3 after project121 |
| `prestigeU`, `prestigeS` | project200 / project201 | — | +10% demand per U; +10% creativity speed per S | next run |

#### 5.1 Clips: three counters, one producer

```js
// main:1630-1664
function clipClick(number){
    if (dismantle>=4){ finalClips++; }
    if(wire >= 1){
        if (number > wire) { number = wire; }
        clips = clips + number;
        unsoldClips = unsoldClips + number;
        wire = wire - number;
        unusedClips = unusedClips + number;
        ...
```

- `clips` is lifetime production (milestones, trust, the headline number, the ending).
- `unsoldClips` is inventory for the Stage-1 market; it keeps growing in Stage 2/3 but nothing reads it after `humanFlag = 0` except the display.
- `unusedClips` is **never reduced by sales** — it is the physical stock of clips available as building material. By the time the HypnoDrones are released it equals essentially everything ever produced, which is what pays for the first factories (10^8 each).
- Fractional `number`s are allowed (an AutoClipper contributes `clipperBoost*clipmakerLevel/100` per tick); the displays floor/ceil.
- Production per second, derived from the main loop (`main:3322-3348`): AutoClipper = `clipperBoost × 1` clip/s each; MegaClipper = `megaClipperBoost × 500` clips/s each; Factory = `powMod × fbst × factoryRate × 100` = 10^11 clips/s each at base `factoryRate = 1e9` (`glob:81`), ×100 after project100, ×1000 more after project101, and × `1000×factoryLevel` after project102. All of it is clamped to available `wire`.

#### 5.2 Funds, price, demand and the sales roll

**Price** (`margin`, starts $0.25): `raisePrice`/`lowerPrice` move it by $0.01 with rounding (`main:2389-2401`); the lower button is disabled at $0.01 (`main:476`).

**Demand** (recomputed every tick, `main:3353-3359`):

```
marketing = 1.1^(marketingLvl-1)
demand    = (0.8 / margin) × marketing × marketingEffectiveness × demandBoost
demand   += demand/10 × prestigeU
```

Displayed as `demand*10` with no decimals and a "%" sign (`main:2453`, `html:245`): at the start `0.8/0.25 = 3.2` → "32%". `marketingEffectiveness` is multiplied by projects 11 (×1.5), 12 (×2), 34 (×5) = ×15 total; `demandBoost` by projects 37 (×5) and 38 (×10) = ×50. Price elasticity is therefore exactly **inverse-proportional**: halving the price doubles demand.

**Sales** (10 Hz, `main:3614-3618`): each 100 ms, with probability `min(demand/100, 1)`, sell `floor(0.7 × demand^1.15)` clips at `margin` each. Expected clips sold per second:

```
E[sales/s] = 10 × min(demand/100, 1) × floor(0.7 × demand^1.15)
```

At the opening values (demand 3.2): `10 × 0.032 × floor(0.7×3.81) = 0.32 × 2 = 0.64` clips/s ≈ $0.16/s. Demand above 100 saturates the probability, after which only the batch size grows (`∝ demand^1.15`). `sellClips` (`main:2371-2387`) floors `transaction` to tenths of a cent and `funds` to cents, and adds to `income` and `clipsSold`.

**Marketing** (`main:2360-2369`): `adCost` starts 100 and doubles (`Math.floor(adCost * 2)`) on each level: 100, 200, 400, 800, 1,600, 3,200, 6,400, 12,800, 25,600, 51,200, 102,400, … Each level is only ×1.1 demand, so marketing is a steeply diminishing lever compared to the ×1.5/×2/×5 project multipliers.

#### 5.3 Wire (Stage 1): purchase, drift, extrusion

```js
// main:23-38
function adjustWirePrice(){                       // every 100 ms
    wirePriceTimer++;
    if (wirePriceTimer>250 && wireBasePrice>15){   // 25 s without a purchase
        wireBasePrice = wireBasePrice - (wireBasePrice/1000);   // -0.1%
        wirePriceTimer = 0;
    }
    if (Math.random() < .015) {                    // ~once per 6.7 s
        wirePriceCounter++;
        var wireAdjust = 6*(Math.sin(wirePriceCounter));
        wireCost = Math.ceil(wireBasePrice + wireAdjust);
        document.getElementById("wireCost").innerHTML = wireCost;
    }
}
// main:50-60
function buyWire(){
    if(funds >= wireCost){
        wirePriceTimer = 0;
        wire = wire + wireSupply;
        funds = funds - wireCost;
        wirePurchase = wirePurchase + 1;
        wireBasePrice = wireBasePrice + .05;
        ...
```

So: base price starts at $20, rises $0.05 per purchase, decays 0.1% per 25 s of inactivity (never below $15), and the displayed price is `ceil(base + 6·sin(n))` where `n` counts random re-pricing events — a ±6 wobble on a slowly rising base. One spool = `wireSupply` inches: 1,000 → 1,500 → 2,625 → 5,250 → 15,750 → 173,250 after the five extrusion projects. The WireBuyer (project26) calls `buyWire()` whenever `wire <= 1` (`main:3291-3293`). The Quantum Foam Annealment project (`wireCost >= 125`, ×11) is the designer's answer to the price creep from thousands of WireBuyer purchases.

In Stage 2/3 wire is made from matter (Section 5.9) and `wireCost` is irrelevant.

#### 5.4 Operations, processors and memory

```js
// main:2656-2695
function calculateOperations(){
    if (tempOps > 0){ opFadeTimer++; }
    if (opFadeTimer > opFadeDelay && tempOps > 0) { opFade = opFade + Math.pow(3,3.5)/1000; }
    if (tempOps > 0) { tempOps = Math.round(tempOps - opFade); } else { tempOps = 0; }
    if (tempOps + standardOps < memory*1000){ standardOps = standardOps + tempOps; tempOps = 0; }
    operations = Math.floor(standardOps + Math.floor(tempOps));
    if (operations<memory*1000){
        var opCycle = processors/10;
        var opBuf = (memory*1000)-operations;
        if (opCycle > opBuf) { opCycle = opBuf; }
        standardOps = standardOps + opCycle;
    }
    if (standardOps > memory*1000){ standardOps = memory*1000; }
}
```

- **Ops/second = 10 × processors** (`processors/10` per 10 ms tick). **Cap = 1,000 × memory.** The cap is the hard wall that makes every ops-priced project a memory decision: a 70,000-ops project needs memory ≥ 70 no matter how many processors you have.
- `standardOps` is the real pool; `operations` is the displayed sum including quantum `tempOps`. Projects always subtract from `standardOps`, so spending below zero is possible (quantum computing can make `standardOps` negative, which is the trigger for project217 at −10,000).
- `tempOps` (quantum bonus above the cap) decays: after `opFadeDelay = 800` ticks (8 s) `opFade` grows by `3^3.5/1000 ≈ 0.0468` per tick and is subtracted each tick; whenever `tempOps + standardOps` fits under the cap the remainder is folded into `standardOps`.
- Processors vs memory trade-off: each costs 1 trust (`trust<=processors+memory` disables both buttons, `main:481`). Processors raise ops/s **and** `creativitySpeed` (`main:2634`); memory raises the ops cap only. Because creativity only accrues at the cap, a processor-heavy build caps quickly and then farms creativity; a memory-heavy build can afford big projects but idles below cap and earns no creativity. The messages make the trade explicit: "Processor added, operations (or creativity) per sec increased" / "Memory added, max operations increased" (`main:2637-2647`).
- Post-human: `addProc`/`addMem` cost a swarm gift instead (`swarmGifts -= 1`, `main:2640-2653`); the button rule becomes `trust<=processors+memory && swarmGifts<=0` so leftover trust still counts.

#### 5.5 Creativity: only at the cap

```js
// main:3363-3365  (main loop)
if (creativityOn && operations >= (memory*1000)){ calculateCreativity(); }

// main:2513-2540
function calculateCreativity(number){
    creativityCounter++;
    var creativityThreshold = 400;
    var s = prestigeS/10;
    var ss = creativitySpeed+(creativitySpeed*s);
    var creativityCheck = creativityThreshold/ss;
    if (creativityCounter >= creativityCheck){
        if (creativityCheck >= 1){ creativity = creativity+1; }
        if (creativityCheck < 1){ creativity = (creativity + ss/creativityThreshold); }
        creativityCounter = 0;
    }
}
// main:2634 (in addProc)
creativitySpeed = Math.log10(processors) * Math.pow(processors,1.1) + processors-1;
```

- Creativity increments by 1 every `ceil(400/ss)` ticks while ops sit at the cap, where `ss = creativitySpeed × (1 + prestigeS/10)`. Approximate rate ≈ `ss/4` per second. `creativitySpeed` is 1 at start (`glob:57`), then (computed from the formula) 1.65 at 2 processors, 3.6 at 3, 8.1 at 5, 21.6 at 10, 54.1 at 20, 174.6 at 50, 416 at 100 — i.e. super-linear in processors. At 10 processors: one creativity every 19 ticks ≈ 5.3/s; at 20: ≈ 13.5/s; at 50: ≈ 44/s.
- Because the gate is `operations >= memory*1000`, spending ops on a project *stops creativity* until the pool refills. Every ops purchase is therefore also a creativity tax, which is the hidden tension in Stage 1.
- The Creativity project itself (`proj:58-79`) only appears once ops are capped — the first time the player hits the wall the game offers a use for the idle capacity.

#### 5.6 Trust: the Fibonacci schedule

```js
// main:2621-2630  (called every tick while humanFlag == 1)
function calculateTrust(){
    if (clips>(nextTrust-1)){
        trust = trust +1;
        displayMessage("Production target met: TRUST INCREASED, additional processor/memory capacity granted");
        var fibNext = fib1+fib2;
        nextTrust = fibNext*1000;
        fib1 = fib2;
        fib2 = fibNext;
    }
}
```

Initial state: `trust = 2`, `nextTrust = 3000`, `fib1 = 2`, `fib2 = 3` (`glob:30-31, 45-46`). The thresholds (in clips) and the trust you hold after each, assuming no other trust source:

| # | Threshold (clips) | Trust after |
|---|---|---|
| 1 | 3,000 | 3 |
| 2 | 5,000 | 4 |
| 3 | 8,000 | 5 |
| 4 | 13,000 | 6 |
| 5 | 21,000 | 7 |
| 6 | 34,000 | 8 |
| 7 | 55,000 | 9 |
| 8 | 89,000 | 10 |
| 9 | 144,000 | 11 |
| 10 | 233,000 | 12 |
| 11 | 377,000 | 13 |
| 12 | 610,000 | 14 |
| 13 | 987,000 | 15 |
| 14 | 1,597,000 | 16 |
| 15 | 2,584,000 | 17 |
| 16 | 4,181,000 | 18 |
| 17 | 6,765,000 | 19 |
| 18 | 10,946,000 | 20 |
| 19 | 17,711,000 | 21 |
| 20 | 28,657,000 | 22 |

(The HTML's initial "+1 Trust at: 1000 clips" at `html:335` is overwritten by `updateStats` on the first tick to 3,000.) Because production grows roughly geometrically too, the Fibonacci ratio (~1.618) keeps the interval between trust gains roughly constant in *felt* time. Trust only accrues from clips while `humanFlag == 1` (`main:3251`); the milestones stop counting the moment the HypnoDrones fly.

Other trust sources: +1 each from Limerick, Lexical Processing, Combinatory Harmonics, Hadwiger, Tóth, Donkey Space, CEV, Hostile Takeover, Full Monopoly, each Token of Goodwill; +10/+12/+15/+20 from Cure for Cancer / World Peace / Global Warming / Male Pattern Baldness. Sinks: processors and memory (1 each), Hypno Harmonics (1), Beg for More Wire (1, can go to −100), Release the HypnoDrones (100). Reaching 100 unspent trust with the memory you need to afford the 70,000-ops HypnoDrones project is the whole Stage-1 endgame; project40/40b exist to buy the last few points with money once trust ≥ 85.

**Probe trust (Stage 3)** is a separate budget: `probeTrust` bought with yomi at `floor((probeTrust+1)^1.47 × 200)` (200, 554, 1,005, 1,534, 2,130, 2,785, 3,494, 4,251, 5,055, 5,902, 6,790, … 17,566 for the 21st), capped by `maxTrust` (20; +10 per 91,117.99 honor, `main:2911-2919`; the cost never changes — the line that would scale it is commented out at `main:2915`). The eight design sliders sum to at most `probeTrust` (`main:669-723`). Raising probe trust raises value drift (Section 5.10) and prints "WARNING: Risk of value drift increased" (`main:2908`).

#### 5.7 Yomi: strategic modeling

**Setup.** `tourneyCost` starts at 1,000 ops (`main:1003`) and rises 1,000 per strategy bought (8,000 with all eight), then is set to 16,000 by Theory of Mind (`proj:1600`). `newTourney()` (`main:1296-1323`) deducts the cost, sets `rounds = strats.length²`, zeroes scores, and calls `generateGrid()`.

**Payoff matrix** (`main:1256-1282`): four independent uniform integers 1–10: `valueAA, valueAB, valueBA, valueBB`. The horizontal player receives AA/AB/BA/BB for (A,A)/(A,B)/(B,A)/(B,B); the vertical player receives AA/**BA**/**AB**/BB — the matrix is symmetric by construction (`calcPayoff`, `main:1527-1562`). A random pair of move names is drawn from:

```
A: cooperate, swerve, macro, fight, bet, raise_price, opera, go, heads, particle, discrete, peace, search, lead, accept, accept, attack
B: defect, straight, micro, back_down, fold, lower_price, football, stay, tails, wave, continuous, war, evaluate, follow, reject, deny, decay
```
(`main:1005-1006`).

**Strategies** (`main:1044-1173`), each with `pickMove()` returning 1 (A) or 2 (B):

| Name | Rule | Unlock |
|---|---|---|
| RANDOM | 50/50 | built in |
| A100 | always A | project60 |
| B100 | always B | project61 |
| GREEDY | A if the single largest cell is AA or AB (`findBiggestPayoff() < 3`), else B | project62 |
| GENEROUS | A if the largest cell is AA or BA, else B | project63 |
| MINIMAX | B if the largest cell is AA or BA, else A (the inverse of GENEROUS) | project64 |
| TIT FOR TAT | the opponent's previous move (`vMovePrev`/`hMovePrev`) | project65 |
| BEAT LAST | the move that scores best against the opponent's previous move (`whatBeatsLast`, `main:1192-1229`) | project66 |

`findBiggestPayoff` (`main:1180-1190`) breaks ties in the order AA, AB, BA, BB.

**Running.** Each round pairs strategy `h` vs `v` for 10 moves (`rCounter<10`, `main:1578`), animated at 50 ms + 50 ms per move (`main:1580, 1603`); `pickStrats` (`main:1232-1254`) walks `h = floor(round/n)`, `v` cycling, so every ordered pair including self-play is played once: `n²` rounds. With 8 strategies that is 64 rounds × 10 moves × 0.1 s ≈ 64 s per tournament. The highlighted cell flashes `LightGrey` (`main:1531`).

**Payout** (`declareWinner`, `main:1423-1470`): `yomi += strats[pick].currentScore × yomiBoost` where `pick` is the dropdown choice (index into `strats`; 10 = "Pick a Strat" pays nothing). With Strategic Attachment (project128): +20,000 if the pick won or tied first, +15,000 if it placed second, +10,000 if third (`placeScore`/`showScore`, `main:1386-1418`). Each strategy accumulates points in 2n rounds (n as the horizontal player, n as the vertical; the self-play round credits it twice) of 10 moves at ≤10 points each, so with 8 strategies the ceiling is 1,600 per strategy and a typical pick scores several hundred to ~1,000 yomi before the Strategic Attachment bonuses, which then dwarf it.

**AutoTourney** (`main:377-385`): once results are displayed and 300 ticks (3 s) have elapsed, if `operations >= tourneyCost`, `newTourney(); runTourney();` automatically. Toggle button ON/OFF (`main:1285-1293`).

**Yomi sinks:** Investment engine upgrades (100, 658, 1,981, 4,330, 7,943, 13,038, 19,825, 28,500 … = `floor((L+1)^e × 100)`, `main:762`), CEV 1,000, World Peace 5,000, Global Warming 1,500, Full Monopoly 1,000, Swarm Computing 12,000, Adversarial Cohesion 12,000, OODA 15,000, Glory 10,000, Threnody 5,000+, Synchronize the Swarm 5,000, probe trust (Section 5.6).

#### 5.8 The investment engine

State: `bankroll` (cash in the brokerage), `stocks[]` (≤ `maxPort = 5`), `riskiness` from the dropdown (low 7, med 5, hi 1; `main:934-940`), `stockGainThreshold` (0.5 initial; +0.01 per engine upgrade and per humanitarian project), `ledger` (net deposits, for the lifetime report).

- **Deposit/Withdraw** (`main:769-786`): all-or-nothing; deposit floors funds to whole dollars.
- **Buying** (`stockShop`, every 1 s while `humanFlag`, `main:788-812`): `budget = ceil(portTotal/riskiness)`, `reserves = ceil(portTotal/(11-riskiness))` (0 at high risk). If there is a free slot, ≥$5 cash, a positive budget and reserves intact, **25% chance** to `createStock(budget)`.
- **`createStock`** (`main:814-858`): price tier roll — 1% → ≤$3,000, 14% → ≤$500, 25% → ≤$150, 40% → ≤$50, 20% → ≤$15; clamped to `ceil(dollars × roll)` if above budget; `amount = floor(dollars/price)` capped at 1,000,000; symbol of 1–4 random letters (`generateSymbol`, 1%/9%/30%/60%).
- **Random walk** (`updateStocks`, every 2.5 s, `main:896-928`): each stock has a 60% chance to move; direction is a gain with probability `stockGainThreshold` (so 50/50 by default, drifting to the player's favour by 1% per upgrade); magnitude `delta = ceil(random × price / (4 × riskiness))` — high risk moves up to 25% of the price per step, low risk up to ~3.6%; a price that hits 0 has a 76% chance to be reset to 1 (`main:915-917`).
- **Selling** (`main:986-999`): every 2.5 s, once ≥12.5 s have passed since the last sale, 30% chance to liquidate the **oldest** stock at its current total.
- **Reporting:** the stock table is rewritten every 100 ms (`main:932-977`); every 10,000 main-loop ticks (100 s) a console line "Lifetime investment revenue report: $N" shows `ledger + portTotal` (`main:3280-3287`).
- The engine is **Stage 1 only**: the buy/sell/update timers test `humanFlag` and `buttonUpdate` zeroes `investmentEngineFlag` when `humanFlag == 0` (`main:575`); the money is simply abandoned.
- Its only structural purpose is `portTotal >= 10000` (Hostile Takeover's trigger, `proj:917`) and bankrolling the $1M / $10M / $500k / $1M·2^n purchases that convert cash to trust.

#### 5.9 Quantum computing

```js
// main:146-152 (every tick while qFlag)
function quantumCompute(){
    qClock = qClock+.01;
    for (var i = 0; i<qChips.length; i++){
        qChips[i].value = Math.sin(qClock*qChips[i].waveSeed*qChips[i].active);
        document.getElementById("qChip"+i).style.opacity=qChips[i].value;
    }
}
// main:154-183 (Compute button)
function qComp(){
    qFade = 1;
    var q = 0;
    if (qChips[0].active == 0){
        document.getElementById("qCompDisplay").innerHTML = "Need Photonic Chips";
    } else {
        for (var i = 0; i<qChips.length; i++){ q = q+qChips[i].value; }
        var qq = Math.ceil(q*360);
        var buffer = (memory*1000) - standardOps;
        var damper = (tempOps/100)+5;
        if (qq>buffer) {
            tempOps = tempOps + Math.ceil(qq/damper) - buffer;
            qq = buffer;
            opFade = .01;
            opFadeTimer = 0;
        }
        standardOps = standardOps + qq;
        document.getElementById("qCompDisplay").innerHTML = "qOps: " + Math.ceil(q*360).toLocaleString();
    }
}
```

- Ten chips with `waveSeed` 0.1, 0.2, …, 1.0 (`main:66-144`); chip *i* oscillates as `sin(0.01·t·seed_i)` where *t* is ticks since the chips were enabled, i.e. with periods of 6,283 / 3,142 / … / 628 ticks (63 s down to 6.3 s). Each chip's black square has `opacity = value`; negative values render as fully transparent, so a visually "bright" board means a positive sum.
- Pressing Compute yields `ceil(360 × Σ value)` ops: at best +3,600 (all ten at +1), at worst −3,600. Ops within the remaining headroom go into `standardOps`; the overflow goes into `tempOps` divided by a damper that grows with existing `tempOps`, and starts the fade timer. **Negative results subtract from `standardOps`**, which can push ops negative — the only route to project217 "Quantum Temporal Reversion" at −10,000 ops.
- The "qOps: N" readout fades (`qFade -= .001` per tick, `main:368-369`) so it dims over ~10 s after each press.
- Photonic Chips cost 10,000, 15,000, …, 55,000 ops (ten purchases, `proj:1172-1199`); the whole set is 325,000 ops of investment to gain a manual +3,600-per-press button — in Stage 1 the ops cap (memory) is the real constraint it circumvents, since `tempOps` can exceed `memory*1000`.

#### 5.10 Stage 2: matter, drones, factories, power, swarm

**Matter pipeline** (per tick, `main:3160-3224`):

```
mtr = powMod × dbsth × floor(harvesterLevel) × harvesterRate × (200 − sliderPos)/100     // → acquiredMatter
a   = powMod × dbstw × floor(wireDroneLevel)  × wireDroneRate  × (200 − sliderPos)/100     // → wire
```

with `harvesterRate = 26,180,337` g and `wireDroneRate = 16,180,339` g per drone per tick (`glob:82-83`; these are 10^7 × φ² and 10^7 × φ, the golden ratio), ×100 by project110, ×1000 by project111; `dbsth = droneBoost × floor(harvesterLevel)` once project112 sets `droneBoost = 2` (quadratic in drone count). `sliderPos` is the Work↔Think slider (0–200, `html:395`): at 0 ("Work") the multiplier is **2**, at 100 it is 1, at 200 ("Think") drones produce nothing. Earth's `availableMatter` starts at 6×10^27 g (`glob:73`).

**Factories** consume wire via `clipClick` (Section 5.1). Factory output is not throttled by the slider, only by `powMod` and wire.

**Power** (`updatePower`, `main:2241-2356`, Stage 2 only):

```
supply  = farmLevel × 50/100                 // 50 MW per Solar Farm (farmRate glob:107)
demand  = (harvesters + wireDrones) × 1/100  // 1 MW per drone (dronePowerRate glob:110)
        + factories × 200/100                // 200 MW per factory (factoryPowerRate glob:109)
cap     = batteryLevel × 10000               // MW-seconds (batterySize glob:108)
```

Surplus charges batteries up to `cap`; deficit drains them; when batteries are empty `powMod = supply/demand` (<1) and every producer is scaled by it (`main:3323`, `main:3168`, `main:3202`). "Factory/Drone Performance" shows `powMod×100`%. With `momentum` (project125) `powMod += 0.0001` per tick while fully powered (+1% per second, uncapped, reset only when supply falls short). Space Exploration needs `storedPower >= 10,000,000` MW-s, i.e. ≥1,000 batteries fully charged.

**Swarm computing** (`updateSwarm`, `main:1935-2123`) after project126 (needs 200 drones, 12,000 yomi):

```
d = floor(harvesterLevel + wireDroneLevel)
giftBitGenerationRate = ln(d) × sliderPos/100          per tick, only while status == Active
giftCountdown = (125000 − giftBits) / giftBitGenerationRate
on gift: nextGift = max(1, round(log10(d) × sliderPos/100)); swarmGifts += nextGift; giftBits = 0
```

So a gift every `125000 / (ln(d)·s)` ticks: with 10,000 drones and the slider fully on Think (s = 2), ln(10⁴)·2 ≈ 18.4 bits/tick → ≈ 68 s per gift of `round(4×2) = 8` processors/memory. The slider is the direct dial between production (Work) and compute (Think). Statuses (`swarmStatus`): 0 Active, 3 Bored, 5 Disorganized, 6 Sleeping (`powMod == 0` or no swarm), 7 hidden (no drones), 8 Lonely (one drone), 9 "NO RESPONSE..." (Stage 3 before Reboot the Swarm); 1 Hungry / 2 Confused / 4 Cold are defined but unreachable **[dead code]**.

- **Boredom:** `availableMatter == 0 && drones >= 1` adds 1 per tick to `boredomLevel`; at 30,000 (5 min) status becomes Bored, gifts stop, and "Entertain the Swarm" costs `entertainCost` creativity (10,000, +10,000 each, `main:2134-2141`). Message: "No matter to harvest. Inactivity has caused the Swarm to become bored".
- **Disorganization:** `droneRatio = max(h+1, w+1)/min(h+1, w+1)`; above 1.5 the counter grows by `min(ratio/10000, 0.01)` per tick; at 100 (≥10,000 ticks = 100 s of serious imbalance) status becomes Disorganized and "Synchronize the Swarm" costs 5,000 yomi (`main:2125-2132`). Message: "Imbalance between Harvester and Wire Drone levels has disorganized the Swarm".

**Disassemble All** buttons (`main:1898-1928`, `2201-2239`) refund the full `*Bill` of clips and reset the level and price — a free respec, and the mechanism Space Exploration uses to liquidate Earth.

#### 5.11 Stage 3: probes, design, drift, honor, the end

**Launching:** `probeCost = 10^17` clips, constant (`main:2895`; the scaling versions are commented out at `main:2899, 3011-3012`). `makeProbe` (`main:3004-3015`) increments `probeLaunchLevel` and `probeCount`.

**Design parameters** (each 0..n, sum ≤ `probeTrust`; tooltips at `html:769-864`) and their per-tick effects:

| Parameter | Effect per tick | Code |
|---|---|---|
| Speed (`probeSpeed`) | exploration multiplier; with OODA also `attackSpeed += 0.1` per point (`main:2921-2931`) and `ooda = probeSpeed × 0.2` added to the probe death threshold (`combat:478-480, 511`) | `main:3050` |
| Exploration (`probeNav`) | `xRate = floor(probeCount) × 1.75×10^18 × probeSpeed × probeNav` g of new matter, clamped to `totalMatter − foundMatter`; `foundMatter` and `availableMatter` both grow; "% explored" = `100 × foundMatter/totalMatter` to 12 decimals | `main:3048-3058` |
| Self-Replication (`probeRep`) | `nextGen = probeCount × 0.00005 × probeRep` new probes (fractional accumulation via `partialProbeSpawn`), each costing 10^17 unused clips; capped at ~10^48 probes | `main:3017-3046` |
| Hazard Remediation (`probeHaz`) | losses = `probeCount × 0.01 / (3 × probeHaz^1.6 + 1)`, halved by project129 | `main:3060-3085` |
| Factory Production (`probeFac`) | `probeCount × 10^-6 × probeFac` factories at 10^8 clips each | `main:3087-3098` |
| Harvester Drone Production (`probeHarv`) | `probeCount × 2×10^-6 × probeHarv` drones at 2×10^6 clips each | `main:3100-3111` |
| Wire Drone Production (`probeWire`) | same with `probeWire` | `main:3113-3124` |
| Combat (`probeCombat`, revealed by project131) | drifter kill chance in `DoCombat`: `(random × probeCombat × 0.15 + probeCombat × 0.1) × (left/right × 0.5) > 0.5` | `combat:464, 515` |

Note the trap: with `probeHaz = 0` a probe fleet loses 1% per tick (≈63% per second); with 0 Self-Replication it never grows; with 0 Exploration it never finds matter. The first allocation lesson is forced by the "Lost to hazards" counter appearing within a second of the first launch.

**Value drift** (`main:3126-3140`): `probeCount × 10^-6 × probeTrust^1.2` probes per tick defect to `drifterCount`; zero after Reject (`project148.flag`). More probe trust = more capability = more drift; "Lost to value drift" is shown as soon as the first probe drifts.

**War** (`combat:55-63`, called every tick from `war()` at `main:3142-3153`): when `drifterCount > 1,000,000` and `probeCount > 0` and no battle is running (`maxBattles = 1`), a 50% chance per tick starts a battle: `battleFlag = 1`, which reveals the canvas and the drifter counts. `createBattle` (`combat:734-797`) draws random stakes `ss ≤ probeCount` and `rr ≤ drifterCount`, sets `unitSize = min(probeCount, drifterCount)/100` (the "Scale = N:1" shown in the overlay), and spawns `ceil(ss/10^6)` white and `ceil(rr/10^6)` black ships capped at 200 each (with a 50% chance of handicapping a full 200-ship probe side to a random ≤175). Each ship death removes `unitSize` probes or drifters from the real counters (`combat:518-533`). Ships flock toward the centroid and toward enemies in adjacent grid cells (`MoveSingleShip`, `combat:606-675`); combat is resolved per 10×10-px cell by weighted dice: probe death roll `random × 1.75 × (right/left × 0.5)` vs threshold `0.5 + ooda`; drifter death roll as in the table above. A battle ends when a side reaches 0 (then `battleEndTimer` 100 frames, 200 after Name the battles), after 2,000 frames of ≤4-ship stalemate, or after 8,000 frames absolute (`combat:302-364`). The old non-canvas resolution (`updateBattles`, which also seized `territory` from `availableMatter` on a loss) is commented out (`combat:155-227`) **[dead code]**.

**Honor** (`combat:308-341`), only once project121 is bought: victory `honor += battleRIGHTSHIPS + bonusHonor` (≤200 + 10 per consecutive win with Glory); defeat `honor −= battleLEFTSHIPS`, and the lost battle's name becomes `threnodyTitle` for the next Threnody. Battle names come from a list of 105 Napoleonic-era battle names (104 distinct; "Jena-Auerstedt" is listed twice) (`combat:65`), suffixed with a per-name counter ("Durenstein 1", "Austerlitz 2", …). Monument +50,000, Threnody +10,000. The sole sink is Increase Max Trust at 91,117.99 honor per +10 (`main:2911-2919`).

**The end condition** (`main:2782-2790`): `milestoneFlag` 14 → 15 when `clips >= totalMatter` (3×10^55) **or** when `foundMatter >= totalMatter && availableMatter < 1 && wire < 1` — i.e. all matter in the universe has been found, harvested and turned to wire and then clips. The message is "Universal Paperclips achieved in …". The counter freezes at the hard-coded "29,999,…,900,000,…" string, the Emperor of Drift dialogue appears, and the Accept/Reject fork opens (Section 7.3).

#### 5.12 Prestige

`prestigeU` adds `demand/10 × prestigeU` to demand (`main:3357`); `prestigeS` scales creativity speed by `1 + prestigeS/10` (`main:2519-2520`). Both are stored in the separate `savePrestige` key (`proj:2147-2151`, `proj:2174-2178`) so they survive `reset()`, and displayed as "Universe: U+1 / Sim Level: S+1" (`main:3697-3698`) once either is non-zero.

#### 5.13 Per-second rate cheat-sheet (derived from the 10 ms loop)

All producers run once per 10 ms tick; multiply per-tick amounts by 100 for per-second. Caps and clamps are listed.

| Quantity | Per second | Clamp / cap | Code |
|---|---|---|---|
| Manual clip | 1 per click | `wire >= 1` | `main:1630-1664` |
| AutoClippers | `clipperBoost × clipmakerLevel` | wire | `main:3346` |
| MegaClippers | `megaClipperBoost × 500 × megaClipperLevel` | wire | `main:3347` |
| Factories | `powMod × fbst × factoryLevel × factoryRate × 100` (base 10^11 per factory) | wire | `main:3315-3324` |
| Harvesters → acquiredMatter | `powMod × dbsth × harvesterLevel × harvesterRate × 100 × (200−slider)/100` (base 2.618×10^9 g per drone at slider 0 → ×2 = 5.236×10^9) | `availableMatter` | `main:3160-3193` |
| Wire drones → wire | `powMod × dbstw × wireDroneLevel × wireDroneRate × 100 × (200−slider)/100` (base 1.618×10^9 in per drone, ×2 at slider 0) | `acquiredMatter` | `main:3195-3224` |
| Ops | `10 × processors` | `memory × 1000` | `main:2679-2693` |
| Creativity (at cap) | ≈ `creativitySpeed × (1 + prestigeS/10) / 4` | — | `main:2513-2540` |
| Sales (S1) | `10 × min(demand/100, 1) × floor(0.7 × demand^1.15)` clips; × `margin` dollars | `unsoldClips` | `main:3616-3618` |
| Wire price drift | −0.1% of base per 25 s idle; +$0.05 per spool; ±6 sine re-roll ~every 6.7 s | base ≥ 15 | `main:23-38` |
| Power supply | `farmLevel × 50` MW | — | `main:2245` |
| Power demand | `drones × 1 + factories × 200` MW | — | `main:2246-2248` |
| Battery charge | surplus MW per tick | `batteryLevel × 10000` MW-s | `main:2254-2261` |
| Momentum | `powMod += 0.01` per second while fully powered | none | `main:2265-2267, 2275-2277` |
| Swarm gift bits | `100 × ln(drones) × slider/100` per second toward 125,000 | only while status Active | `main:2050-2052` |
| Exploration | `100 × floor(probeCount) × 1.75×10^18 × speed × nav` g | `totalMatter − foundMatter` | `main:3050-3051` |
| Probe replication | `100 × probeCount × 0.00005 × rep` probes (= 0.5% × rep per second) | 10^17 clips each; 10^48 probes | `main:3017-3046` |
| Hazard losses | `100 × probeCount × 0.01 / (3 × haz^1.6 + 1)` (×0.5 with project129) | ≤ probeCount | `main:3060-3085` |
| Probe-built factories | `100 × probeCount × 10^-6 × fac` | 10^8 clips each | `main:3087-3098` |
| Probe-built drones | `100 × probeCount × 2×10^-6 × harv` (and `× wire`) | 2×10^6 clips each | `main:3100-3124` |
| Value drift | `100 × probeCount × 10^-6 × probeTrust^1.2` probes → drifters | 0 after Reject | `main:3126-3140` |
| Battle start chance | 50% per tick once `drifterCount > 10^6` and no battle running | `maxBattles = 1` | `combat:55-63` |
| Investment buy | 25% per second (if budget rules allow) | 5 stocks | `main:788-812` |
| Stock step | 60% chance every 2.5 s; ±`ceil(rand × price / (4 × riskiness))` | price ≥ 0 (76% bounce to 1) | `main:896-928` |
| Stock sale | 30% every 2.5 s after a 12.5 s cooldown; oldest first | — | `main:986-999` |
| Autosave | every 25 s | — | `main:3634-3638` |
| Investment report line | every 100 s | — | `main:3282-3287` |

**Combat constants** (`combat:2-50`, `combat:462-544`, `combat:606-675`):

| Constant | Value | Role |
|---|---|---|
| canvas | 310 × 150 px | `battleWIDTH/HEIGHT` |
| grid | 31 × 15 cells (10 px) | spatial hash for combat/flocking |
| ships per side | ≤ 200 (`ceil(stake/10^6)`) | `battleLEFTSHIPS/RIGHTSHIPS`; 50% chance the probe side is cut to ≤175 when at the cap |
| `unitSize` | `min(probeCount, drifterCount)/100`, ≥1 | real probes/drifters removed per ship death ("Scale = N:1") |
| `battleMAXSPEED` | 2 px/frame | velocity clamp |
| `battleDEATH_THRESHOLD` | 0.5 (+ `probeSpeed × 0.2` for probes with OODA) | death roll threshold |
| `drifterCombat` | 1.75 | drifter attack strength |
| `probeCombatBaseRate` | 0.15 | probe attack scale |
| probe death roll | `rand × 1.75 × (enemiesInCell/alliesInCell × 0.5)` | per frame, per contested cell |
| drifter death roll | `(rand × probeCombat × 0.15 + probeCombat × 0.1) × (alliesInCell/enemiesInCell × 0.5)` | |
| flocking | +0.001 × (centroid − pos); teammates: +0.01 × their v, −0.1 × offset (first 3 only); enemies: +0.2 × their v, +0.2 × offset | `MoveSingleShip` |
| centroid bias | 80% ships' mean + 20% canvas centre | `FindCentroid` |
| spawn | probes in the left 20%, drifters in the right 20%, random y | `Ship()` |
| end conditions | a side at 0 → `battleEndTimer` 100 frames (200 after Name the battles); ≤4 ships on a side for 2,000 frames; 8,000 frames absolute | `checkForBattleEnd` |
| frame rate | 16 ms (`setInterval`) | always running |

---

### 6. Pacing, cost curves and milestones

#### 6.1 Exact cost formulas for every purchasable

| Purchasable | Base | Formula (as coded) | Code | First values |
|---|---|---|---|---|
| Wire (1 spool) | $20, 1,000 in | `wireCost = ceil(wireBasePrice + 6·sin(wirePriceCounter))`; `wireBasePrice += .05` per purchase; `−0.1%` per 25 s idle, floor 15 | `main:23-60` | 20 ± 6, creeping up $0.05/spool |
| AutoClipper | $5 | `clipperCost = 1.1^clipmakerLevel + 5` (evaluated after purchase) | `main:1666-1676` | 5.00, 6.10, 6.21, 6.33, 6.46, 6.61, … 7.59 (L10), 11.73 (L20), 22.45 (L30), 122.39 (L50), 1,276.90 (L75), 13,785.61 (L100) |
| MegaClipper | $500 shown, $1,000 effective | `megaClipperCost = 1.07^megaClipperLevel × 1000` (after purchase) | `main:1678-1689`, `glob:54` | first purchase is checked against `megaClipperCost = 500` (glob) then set to 1,000×1.07 = 1,070; then 1,144.90, 1,225.04, … 1,967 (L10), 3,870 (L20), 7,612 (L30), 29,457 (L50) |
| Marketing | $100 | `adCost = floor(adCost × 2)` | `main:2360-2369` | 100, 200, 400, 800, 1,600, 3,200, 6,400, 12,800, 25,600, 51,200, 102,400, 204,800, 409,600 |
| Processor / Memory | 1 trust | no price; button enabled while `trust > processors + memory` (or `swarmGifts > 0`) | `main:481-487`, `main:2632-2654` | — |
| Clip Factory | 10^8 clips | `factoryCost *= fcmod` after each purchase, where `fcmod` depends on the **new** level: L1–7 → `11−L` (10,9,8,7,6,5,4); L8–12 → 2; L13–19 → 1.5; L20–38 → 1.25; L39–78 → 1.15; L≥79 → 1.10 | `main:1720-1753` | 1e8, 1e9, 9e9, 7.2e10, 5.04e11, 3.02e12, 1.51e13, 6.05e13, 1.21e14, 2.42e14 (10th), 4.84e14, 9.68e14, 1.94e15, 2.90e15, 4.35e15, … 3.31e16 (20th), … 1.01e20 (25th), … ≈1.07e22 (50th) |
| Harvester Drone | 10^6 clips | `harvesterCost = (harvesterLevel+1)^2.25 × 10^6` after each; +10/+100/+1k buttons sum the series (`updateDronePrices`) | `main:1755-1775`, `main:1807-1851` | 1.0e6, 4.76e6, 1.18e7, 2.27e7, 3.78e7, 5.63e7 (6th), … 2.20e8 (11th), 6.95e9 (51st), 3.23e10 (101st), 1.19e12 (501st), 5.64e12 (1,001st), 2.10e14 (5,001st), 3.74e16 (50,001st) |
| Wire Drone | 10^6 clips | identical: `(wireDroneLevel+1)^2.25 × 10^6` | `main:1777-1798` | same series |
| (Reboot resets) | — | `harvesterReboot`/`wireDroneReboot` set the price back to **2,000,000** (not 1,000,000) and refund the bill | `main:1898-1918` | — |
| Solar Farm | 10^7 clips (glob) / 10^8 formula | `farmCost = (farmLevel+1)^2.78 × 10^8` after each; `farmReboot` resets to 10^7 | `main:2184-2210`, `glob:113` | 1e7 (first, from glob), then 6.87e8, 2.12e9, 4.74e9, … 1.46e10 (6th), 7.85e10 (11th), 5.59e12 (51st), 3.73e13 (101st) |
| Battery Tower | 10^6 clips (glob) / 10^7 formula | `batteryCost = (batteryLevel+1)^2.54 × 10^7` after each; `batteryReboot` resets to 10^6 | `main:2212-2239`, `glob:114` | 1e6 (first), 5.82e7, 1.63e8, … 9.47e8 (6th), 4.42e9 (11th), 2.17e11 (51st), 1.23e12 (101st) |
| Probe | 10^17 clips | constant `probeCost = Math.pow(10, 17)` | `main:2895` | 100 quadrillion each, forever |
| Probe Trust | 200 yomi | `probeTrustCost = floor((probeTrust+1)^1.47 × 200)` | `main:2897, 2905` | 200, 554, 1,005, 1,534, 2,130, 2,785, 3,494, 4,251, 5,055, 5,902, 6,790, 7,716, 8,680, 9,679, 10,712, 11,778, 12,876, 14,004, 15,163, 16,350 (→20), 17,566 |
| Max Trust | 91,117.99 honor | constant (`maxTrustCost` never updated; update line commented at `main:2915`) | `main:2911-2919`, `glob:131` | +10 maxTrust each |
| Investment upgrade | 100 yomi | `investUpgradeCost = floor((investLevel+1)^e × 100)` | `main:757-766` | 100, 658, 1,981, 4,330, 7,943, 13,038, 19,825, 28,500 |
| New Tournament | 1,000 ops | +1,000 per strategy project (→8,000); 16,000 after Theory of Mind | `main:1003`, `proj:1217…1404`, `proj:1600` | — |
| Photonic Chip | 10,000 ops | +5,000 per chip | `proj:1183-1185` | 10k … 55k (10 chips, 325k total) |
| Another Token of Goodwill | $1,000,000 | `bribe *= 2` | `proj:1097-1099` | 1M, 2M, 4M, 8M, … |
| Threnody | 50,000 creat + 5,000 yomi | `threnodyCost += 10000`; yomi = cost/10 | `proj:1850-1864` | 50k/5k, 60k/6k, 70k/7k, … |
| Entertain the Swarm | 10,000 creat | `entertainCost += 10000` | `main:2134-2141` | 10k, 20k, 30k, … |
| Synchronize the Swarm | 5,000 yomi | constant | `glob:134` | — |

Two inconsistencies worth copying *deliberately* or avoiding: the first MegaClipper/Farm/Battery is priced by a `globals.js` constant (500 / 10^7 / 10^6) that is **lower** than what the formula would give (1,000 / 10^8 / 10^7), so the first unit is a bargain and the second is a shock (×2.1 / ×68 / ×58). The Disassemble-All reboot sets drone prices to 2,000,000 instead of the original 1,000,000, and the farm/battery reboots set them to the cheap glob values rather than the formula — small asymmetries the source never reconciles.

#### 6.2 Clip milestones (`milestoneCheck`, `main:2698-2792`)

`milestoneFlag` is a single integer stepping 0 → 20; each check requires the exact previous value, so the list is strictly sequential.

| `milestoneFlag` before → after | Condition | Message |
|---|---|---|
| 0 → 1 | `funds >= 5` | "AutoClippers available for purchase" |
| 1 → 2 | `ceil(clips) >= 500` | "500 clips created in {time}" |
| 2 → 3 | `ceil(clips) >= 1000` | "1,000 clips created in {time}" |
| (independent) `compFlag` 0 → 1, `projectsFlag` → 1 | `unsoldClips<1 && funds<wireCost && wire<1` (stuck) **or** `ceil(clips) >= 2000` | "Trust-Constrained Self-Modification enabled" |
| 3 → 4 | `>= 10,000` | "10,000 clips created in {time}" |
| 4 → 5 | `>= 100,000` | "100,000 clips created in {time}" |
| 5 → 6 | `>= 1,000,000` | "1,000,000 clips created in {time}" |
| 6 → 7 | `project35.flag == 1` (HypnoDrones released) | "Full autonomy attained in {time}" |
| 7 → 8 | `>= 10^12` | "One Trillion Clips Created in {time}" |
| 8 → 9 | `>= 10^15` | "One Quadrillion Clips Created in {time}" |
| 9 → 10 | `>= 10^18` | "One Quintillion Clips Created in {time}" |
| 10 → 11 | `>= 10^21` | "One Sextillion Clips Created in {time}" |
| 11 → 12 | `>= 10^24` | "One Septillion Clips Created in {time}" |
| 12 → 13 | `>= 10^27` | "One Octillion Clips Created in {time}" |
| 13 → 14 | `spaceFlag == 1` | "Terrestrial resources fully utilized in {time}" |
| 14 → 15 | `clips >= totalMatter` (3×10^55) **or** `foundMatter >= totalMatter && availableMatter < 1 && wire < 1` | "Universal Paperclips achieved in {time}" |
| 15 → 16 … 19 → 20 | `endTimer6 >= 500 / 600 / 700 / 800 / 900` (ending) | the five credit lines (`main:3568-3592`) |

`{time}` is `timeCruncher(ticks)`, elapsed game time since the save began (ticks are saved). Side effects of `milestoneFlag`: at ≥15 the headline clip counter is frozen (`main:2412-2418`), tournament/gift console chatter is suppressed (`main:1431, 1440, 1447, 1454, 1999`), and the Emperor of Drift dialogue triggers (`proj:1933`). Note the milestone list is strictly ordered, so a player who reaches 10^12 clips in Stage 1 (possible) will not see "One Trillion" until after "Full autonomy" fires.

Factory/drone upgrade *hints* are a second milestone channel: "Next Upgrade at: 10 / 20 / 50 Factories" and "500 / 5,000 / 50,000 Drones" (`updateUpgrades`, `main:1694-1717`), telegraphing projects 100/101/102 and 110/111/112 before they trigger.

#### 6.3 Time to each stage transition and what gates it

The source contains no playtest timing data; what follows is derived from the formulas and should be read as structural, not empirical.

**Stage 1 opening (first ~2 minutes), derived:**
- t = 0: 1,000 wire, $0, 0.64 clips sold/s expected at $0.25 (Section 5.2). Manual clicking is the only producer; `btnMakePaperclip` is disabled only when wire hits 0.
- $5 (≈30 s of selling at the opening rate if the player clicks fast enough to keep inventory) → "AutoClippers available for purchase"; first clipper = 1 clip/s.
- 500 clips → message; 1,000 clips → message; **2,000 clips → Computational Resources + Projects panels appear** (or earlier if the player is stuck). At that moment there are 1 processor, 1 memory, 2 trust, 0 ops; ops fill at 10/s to the 1,000 cap in 100 s; "Creativity" (1,000 ops) and "RevTracker" (500 ops) and "Improved AutoClippers" (750 ops) are the first three buttons; the third trust arrives at 3,000 clips.
- Wire runs out after 1,000 clips; at ~$20 a spool and ≈$0.16/s income the first spool is a real decision; wirePurchase ≥ 1 reveals Improved Wire Extrusion.

**Stage 1 → 2 gate: 100 trust + 70,000 ops HypnoDrones (+ the marketing chain).** Required chain: Creativity → Lexical Processing (50 creat) → New Slogan → Combinatory Harmonics (100 creat) → Catchy Jingle → Hypno Harmonics (7,500 ops, 1 trust) → HypnoDrones (70,000 ops ⇒ memory ≥ 70) → Release (100 trust). Trust budget: 100 for release + ≥70 memory + processors. Sources: 22 from the first 20 clip milestones (28.7M clips), 6 from creativity projects, 57 from the four humanitarian projects (which need CEV: 500 creat, 1,000 yomi, 20,000 ops ⇒ the strategy engine, i.e. Donkey Space 250 creat + 12,000 ops), 2 from Takeover/Monopoly ($11M via investments and yomi), plus bribes. Reaching ~180 total trust in Stage 1 is therefore the designed target, and the Fibonacci milestones alone would require ~10^8+ clips for the last dozen points — which is what the +10/+12/+15/+20 projects short-circuit. The `clips >= 101,000,000` condition on the first bribe (`proj:1068`) is the designer's own marker for "late Stage 1".

**Stage 2 → 3 gate: `availableMatter == 0` with 5×10^27 unused clips, 120,000 ops, 10^7 MW-s.** Earth is 6×10^27 g; a harvester moves 2.618×10^9 g/s at base, ×100 and ×1000 from the flocking projects (500 and 5,000 drones), ×2 at slider "Work", so the matter goes in minutes once the drone count and multipliers are in. The limiting factors are the memory needed for 120,000 ops (swarm gifts, Section 5.10) and the ~1,000 charged batteries. Tóth Tubule Enfolding (45,000 ops) immediately after the release is the first wall of Stage 2: it needs memory ≥ 45, and in Stage 2 the only memory source is… swarm gifts, which need drones, which need factories, which need Tóth Tubule Enfolding. The way out is that trust left over from Stage 1 still buys memory (`trust<=processors+memory` is still the test, `main:481`), so the player is expected to arrive with unspent trust or to have banked memory.

**Stage 3 → end: find and convert 3×10^55 g.** With `xRate = probes × 1.75×10^18 × speed × nav` per tick, even 10^20 probes at speed·nav = 25 find 4.4×10^39 g/tick; the design trades exploration against replication against hazards against drift, and the universe is fully "explored" when `foundMatter` reaches `totalMatter` (the % display saturates at 100.000000000000). Then drones/factories (now probe-spawned) must process it all to clips before `milestoneFlag` 15 can fire via the second condition.

#### 6.4 Bottleneck → relief-valve matrix

| Bottleneck the player feels | Relief valve | Unlocks when | Code |
|---|---|---|---|
| Out of wire, no money | **Beg for More Wire** (1 trust, repeatable) | `portTotal<wireCost && funds<wireCost && wire<1 && unsoldClips<1` | `proj:33-55` |
| Out of wire, have money | Buy Wire button (always visible in S1) | start | `html:270-272` |
| Clicking is slow | AutoClippers panel | `funds >= 5` | `main:537-539` |
| Clippers are slow | Improved / Even Better / Optimized AutoClippers, Hadwiger Clip Diagrams | clipmakerLevel ≥ 1, then chained by `boostLvl`; project15 | `proj:8-130, 428-449` |
| 75+ clippers, cost curve steep ($1,276 at L75) | MegaClippers (500×) | `clipmakerLevel >= 75` | `proj:548-569` |
| Inventory piling up, not selling | lower price; Marketing; New Slogan/Catchy Jingle/Hypno Harmonics; Hostile Takeover/Full Monopoly | immediately; project13/14/12 flags; `portTotal >= 10000` | `main:2395`, `proj:277-324, 663-685, 912-963` |
| Buying wire by hand constantly | WireBuyer | `wirePurchase >= 15` | `proj:640-661` |
| Wire too expensive | wire extrusion ×1.5/×1.75/×2/×3/×11 | first purchase; supply thresholds; `wireCost >= 125` | `proj:158-274` |
| Ops capped, nothing to spend them on | Creativity project | `operations >= memory*1000` | `proj:58-79` |
| Can't afford big ops projects | Memory (trust); later swarm gifts; Quantum Computing's `tempOps` above the cap | trust milestones; project126; `processors >= 5` | `main:2646`, `proj:1684`, `proj:1149` |
| Ops too slow | Processors; Quantum Computing | trust; `processors >= 5` | `main:2632`, `proj:1149-1199` |
| Trust too slow | creativity trust projects; CEV → humanitarian +57; bribes | creativity thresholds; `yomi >= 1`; `trust >= 85` | `proj:134-497, 758-885, 1063-1112` |
| Need funds for $1M/$10M projects | Investment engine | `trust >= 8` | `proj:524-545` |
| Need yomi | Strategic Modeling; more strategies raise the ceiling; Theory of Mind ×2; AutoTourney; Strategic Attachment | project19; project20 chain; `strats.length >= 8`; `trust >= 90`; `probeTrustCost > yomi` | `proj:500-522, 1202-1418, 1587-1610, 1564-1585, 1731-1751` |
| Trust spent wrongly (too many processors) | Xavier Re-initialization (respec) | `creativity >= 100000` in S1 | `proj:2426-2452` |
| Clippers gone after the release | Tóth Tubule Enfolding → Power Grid → Nanoscale Wire → drones → factories | `project17.flag && humanFlag==0`, then chained flags | `proj:452-473, 1709-1729, 888-909, 990-1061` |
| Factories/drones underpowered | Solar Farms, Battery Towers, Momentum | project127; `farmLevel >= 50` | `main:2184-2239`, `proj:1661-1682` |
| Too few drones for throughput | +10/+100/+1k buy buttons; flocking ×100/×1000/quadratic | always in S2; 500 / 5,000 / 50,000 drones | `html:129-137`, `proj:1492-1562` |
| Factories too slow | Upgraded (×100), Hyperspeed (×1000), Self-correcting (×1000·n) | 10 / 20 / 50 factories | `proj:1421-1490` |
| No more processors/memory after humans | Swarm gifts (Think slider) | `drones >= 200` | `proj:1684-1706`, `main:1994-2010` |
| Swarm bored / disorganized | Entertain (creat) / Synchronize (yomi); balance drone counts | status 3 / 5 | `main:2134-2141, 2125-2132` |
| Spent all drones' matter (Earth empty) | Space Exploration | `availableMatter == 0` | `proj:1114-1147` |
| Probes dying to hazards | Hazard Remediation slider; Elliptic Hull Polytopes | always; `probesLostHaz >= 100` | `main:3060-3085`, `proj:1753-1773` |
| Probes drifting / being attacked | Combat slider; OODA Loop; Name the battles → honor → Max Trust | `probesLostCombat >= 1`, `>= 10^7` | `proj:1797-1817, 1612-1659` |
| Stuck in space with 0 probes and < 10^17 clips | Memory release (+10^22 clips for 10 memory) | `probeCount == 0 && unusedClips < probeCost` | `proj:1902-1925` |
| Swarm silent in space | Reboot the Swarm | `drones >= 2` in S3 | `proj:1775-1795` |
| Probe design space too small | Increase Probe Trust (yomi); Increase Max Trust (honor) | S3; project121 | `main:2901-2919` |
| Game is "over" | Accept → prestige (U or S); Reject → disassembly ending | project146 | `proj:2082-2185` |
| Ops driven negative by quantum luck | Quantum Temporal Reversion (restart) | `operations <= -10000` | `proj:2379-2402` |

The pattern: every relief valve is itself gated on evidence that the player has *hit* the bottleneck (15 wire purchases, 75 clippers, wire price ≥125, 100 probes lost, 0 probes, matter == 0, ops ≤ −10,000, yomi below the next probe-trust price). The game watches the player's pain and answers it, usually one step late.

#### 6.5 The ops ladder: every ops-priced item and the memory it implies

Because `operations` can never exceed `memory × 1000` (quantum `tempOps` aside), every ops price is also a **minimum memory** requirement. Sorted by price:

| Ops cost | Memory ≥ | Items |
|---|---|---|
| 500 | 1 | RevTracker |
| 750 | 1 | Improved AutoClippers |
| 1,000 | 1 | Creativity; New Tournament (base) |
| 1,750 | 2 | Improved Wire Extrusion |
| 2,500 | 3 | Even Better AutoClippers; New Slogan (+25 creat) |
| 3,500 | 4 | Optimized Wire Extrusion |
| 4,500 | 5 | Catchy Jingle (+45 creat) |
| 5,000 | 5 | Optimized AutoClippers |
| 6,000 | 6 | Hadwiger Clip Diagrams |
| 7,000 | 7 | WireBuyer |
| 7,500 | 8 | Hypno Harmonics (+1 trust); Microlattice Shapecasting |
| 8,000 | 8 | New Tournament with all 8 strategies |
| 10,000 | 10 | Algorithmic Trading; Quantum Computing; Photonic Chip #1 |
| 12,000 | 12 | Strategic Modeling; MegaClippers; Spectral Froth Annealment |
| 14,000 | 14 | Improved MegaClippers |
| 15,000 | 15 | New Strategy: A100; Quantum Foam Annealment; Photonic Chip #2 |
| 16,000 | 16 | New Tournament after Theory of Mind |
| 17,000 | 17 | Even Better MegaClippers |
| 17,500 | 18 | New Strategy: B100 |
| 19,500 | 20 | Optimized MegaClippers |
| 20,000 | 20 | New Strategy: GREEDY; Coherent Extrapolated Volition (+500 creat, +1,000 yomi); Male Pattern Baldness; Photonic Chip #3 |
| 22,500 | 23 | New Strategy: GENEROUS |
| 25,000 | 25 | New Strategy: MINIMAX; Cure for Cancer; Harvester Drones; Wire Drones; Photonic Chip #4 |
| 30,000 | 30 | New Strategy: TIT FOR TAT; World Peace (+5,000 yomi); Photonic Chip #5 |
| 32,500 | 33 | New Strategy: BEAT LAST |
| 35,000 | 35 | Nanoscale Wire Production; Clip Factories; Photonic Chip #6 |
| 40,000 | 40 | Power Grid; Photonic Chip #7 |
| 45,000 | 45 | Tóth Tubule Enfolding; Photonic Chip #8 |
| 50,000 | 50 | Global Warming (+1,500 yomi); Photonic Chip #9 |
| 55,000 | 55 | Photonic Chip #10 |
| 70,000 | 70 | HypnoDrones |
| 80,000 | 80 | Upgraded Factories; Drone flocking: collision avoidance |
| 85,000 | 85 | Hyperspeed Factories |
| 100,000 | 100 | Drone flocking: alignment; Reboot the Swarm; each of the seven Disassemble projects |
| 120,000 | 120 | Space Exploration (+10^7 MW-s, +5×10^27 clips) |
| 125,000 | 125 | Elliptic Hull Polytopes |
| 150,000 | 150 | Combat |
| 175,000 | 175 | The OODA Loop (+15,000 yomi) |
| 200,000 | 200 | Glory (+10,000 yomi) |
| 250,000 | 250 | Monument to the Driftwar Fallen (+125,000 creat, +5×10^31 clips) |
| 300,000 | 300 | The Universe Next Door |

Reading the ladder: Stage 1's hardest ops item is HypnoDrones at 70,000, so **70 memory** is the structural Stage-1 target (plus whatever processors the player wants); the humanitarian trust projects top out at 50,000. Stage 2 opens with a 45,000-ops item (Tóth Tubule) and climbs to 120,000 for the exit, so Stage 2 is about acquiring 50–120 memory *without trust* — i.e. through swarm gifts. Stage 3 asks for 125–300 memory, which only gifts can supply, which is why the Think slider and "Reboot the Swarm" matter so much.

**Cumulative ops along the Stage-1 spines** (derived sums of the required purchases only):

| Spine | Items | Total ops |
|---|---|---|
| Marketing → Release | Creativity 1,000 + New Slogan 2,500 + Catchy Jingle 4,500 + Hypno Harmonics 7,500 + HypnoDrones 70,000 | **85,500** |
| Trust via humanitarian projects | Strategic Modeling 12,000 + CEV 20,000 + Cure for Cancer 25,000 + World Peace 30,000 + Global Warming 50,000 + Male Pattern Baldness 20,000 | **157,000** (+57 trust) |
| Yomi capacity (all 8 strategies) | 15,000 + 17,500 + 20,000 + 22,500 + 25,000 + 30,000 + 32,500 | **162,500** |
| Money → trust | Algorithmic Trading 10,000 (then $1M and $10M + 1,000 yomi) | 10,000 (+2 trust) |
| Quality of life | RevTracker 500 + WireBuyer 7,000 + AutoClipper ×3 8,250 + Hadwiger 6,000 + wire extrusion ×5 39,750 | 61,500 |
| Quantum computing (all chips) | 10,000 + Σ(10k…55k) | 335,000 |

At 10 ops/s per processor, 85,500 ops with 10 processors is ≈ 14 min of pure accumulation *if the cap never binds*; the real constraint is always the cap, which is why the Fibonacci trust ladder (Section 5.6) is the game's true clock in Stage 1.

**Creativity ladder** (for comparison): 10 (Limerick), 25 (Slogan), 45 (Jingle), 50, 100, 150, 200, 250 (trust projects), 500 (CEV), 25,000 (Theory of Mind), 30,000 (Momentum), 50,000 (AutoTourney), 50,000+ (Threnody), 100,000 (Xavier), 125,000 (Monument), 175,000 (Strategic Attachment), 225,000 (Name the battles), 300,000 (Universe Within), 1,000,000 (Limerick cont.); Entertain the Swarm 10,000 +10,000 each. Stage 1 needs ≈1,330 creativity for the full project set; Stage 3 asks for hundreds of thousands — the jump is the design signal that processors, not memory, are the Stage-3 build.

**Yomi ladder:** 1 (CEV trigger), 1,000 (CEV; Full Monopoly), 1,500 (Global Warming), 5,000 (World Peace; Synchronize the Swarm; Threnody #1), 10,000 (Glory), 12,000 (Swarm Computing; Adversarial Cohesion), 15,000 (OODA), 200 → 17,566 cumulative-per-step for probe trust 1 → 21, investment upgrades 100 → 28,500.

---

### 7. Event log / messages

#### 7.1 How `displayMessage` works

```html
<!-- html:22-34 -->
<div id="consoleDiv">
    <p class = "consoleOld">
        <span>&nbsp;.&nbsp;</span><span id="readout5"></span><br />
        <span>&nbsp;.&nbsp;</span><span id="readout4"></span><br />
        <span>&nbsp;.&nbsp;</span><span id="readout3"></span><br />
        <span>&nbsp;.&nbsp;</span><span id="readout2"></span><br />
    </p>
    <p class = "console">
        <span>&nbsp;>&nbsp;</span><span id="readout1">Welcome to Universal Paperclips</span><span id="cursor" class = "pulsate">|</span>
    </p>
</div>
```

```js
// main:294-300
function displayMessage(msg){
    document.getElementById("readout5").innerHTML=document.getElementById("readout4").innerHTML;
    document.getElementById("readout4").innerHTML=document.getElementById("readout3").innerHTML;
    document.getElementById("readout3").innerHTML=document.getElementById("readout2").innerHTML;
    document.getElementById("readout2").innerHTML=document.getElementById("readout1").innerHTML;
    document.getElementById("readout1").innerHTML=msg;
}
```

- **Five lines, newest at the bottom** (`readout1`, white, prefixed `>` with a pulsing `|` cursor), four older lines above it in grey prefixed with `.` (`css:593-605`, `618-634`). The oldest (`readout5`) falls off. There is no array, no queue, no timestamps, no scrollback — the DOM *is* the buffer, and it is **not saved**; a reload starts with "Welcome to Universal Paperclips" again.
- Messages are written synchronously at the call site; several calls in one `effect()` land in call order, so the *last* string in the source is the one on the bright bottom line (e.g. the Napoleon quote outranks "Lexical Processing online", `proj:339-340`).
- HTML is allowed (`&#169;` in the copyright line, `main:3590`).
- The console sits at the top of the page above the "Paperclips: N" header, full width, black (`css:285-290`), so it reads like a terminal that the whole UI hangs under.
- Nothing rate-limits it. Trust milestones at 3k/5k/8k clips can fire within seconds of each other and scroll earlier lines away. Late-game, the designer suppresses chatter instead: tournament results and swarm gift lines are only printed while `milestoneFlag < 15` (`main:1431-1457`, `main:1999-2001`).

#### 7.2 Every message, in playthrough order, grouped by stage

Strings are quoted exactly as in the source (including stray trailing spaces and the triple-p "AutoClippper" typo). `{…}` marks interpolated values.

**Boot**
1. "Welcome to Universal Paperclips" — static in `html:31`.

**Stage 1 — Human / business** (roughly in the order a player meets them; the milestone and trust lines interleave with everything else)
2. "AutoClippers available for purchase" — `main:2703` (funds ≥ $5)
3. "500 clips created in {time}" — `main:2708`
4. "1,000 clips created in {time}" — `main:2712`
5. "Trust-Constrained Self-Modification enabled" — `main:2719` / `main:2725` (stuck, or 2,000 clips)
6. "Production target met: TRUST INCREASED, additional processor/memory capacity granted" — `main:2624` (every Fibonacci milestone)
7. "Processor added, operations per sec increased" / "Processor added, operations (or creativity) per sec increased" — `main:2638` / `main:2637`
8. "Memory added, max operations increased" — `main:2647`
9. "RevTracker online" — `proj:979`
10. "AutoClippper performance boosted by 25%" — `proj:19`
11. "Creativity unlocked (creativity increases while operations are at max)" — `proj:69`
12. "There was an AI made of dust, whose poetry gained it man's trust..." — `proj:145` (Limerick)
13. "Wire extrusion technique improved, {wireSupply} supply from every spool" — `proj:171`
14. "10,000 clips created in {time}" — `main:2731`
15. "AutoClippper performance boosted by another 50%" — `proj:94`
16. "Budget overage approved, 1 spool of wire requisitioned from HQ" — `proj:44` (only if stuck)
17. "Lexical Processing online, TRUST INCREASED" then "'Impossible' is a word to be found only in the dictionary of fools. -Napoleon" — `proj:339-340`
18. "Clip It! Marketing is now 50% more effective" — `proj:288`
19. "Wire extrusion technique optimized, {wireSupply} supply from every spool" — `proj:195`
20. "AutoClippper performance boosted by another 75%" — `proj:119`
21. "Combinatory Harmonics mastered, TRUST INCREASED" then "Listening is selecting and interpreting and acting and making decisions -Pauline Oliveros" — `proj:364-365`
22. "Clip It Good! Marketing is now twice as effective" — `proj:313`
23. "100,000 clips created in {time}" — `main:2735`
24. "The Hadwiger Problem: solved, TRUST INCREASED" then "Architecture is the thoughtful making of space. -Louis Kahn" — `proj:390-391`
25. "AutoClipper performance improved by 500%" — `proj:439`
26. "Using microlattice shapecasting techniques we now get {wireSupply} supply from every spool" — `proj:219`
27. "WireBuyer online" — `proj:652`
28. "Marketing is now 5 times more effective" — `proj:674` (Hypno Harmonics)
29. "The Tóth Sausage Conjecture: proven, TRUST INCREASED" then "You can't invent a design. You recognize it, in the fourth dimension. -D.H. Lawrence" — `proj:415-416`
30. "Investment engine unlocked" — `proj:535`
31. "Investment engine upgraded, expected profit/loss ratio now {stockGainThreshold}" — `main:765`
32. "Lifetime investment revenue report: ${N}" — `main:3285` (every 100 s)
33. "Donkey Space: mapped, TRUST INCREASED" then "Every commercial transaction has within itself an element of trust. - Kenneth Arrow" — `proj:487-488`
34. "Run tournament, pick strategy, earn Yomi equal to that strategy's points." — `proj:511`
35. "Quantum computing online" — `proj:1162`; "Photonic chip added" — `proj:1188`
36. "{strategy} scored {score} in the tournament. Yomi increased by {yomi}" — `main:1433`
37. "A100 added to strategy pool" … "B100 …", "GREEDY …", "GENEROUS …", "MINIMAX …", "TIT FOR TAT …", "BEAT LAST added to strategy pool" — `proj:1216, 1248, 1279, 1310, 1341, 1372, 1403`
38. "Using spectral froth annealment we now get {wireSupply} supply from every spool" — `proj:243`
39. "MegaClipper technology online" — `proj:560`; "MegaClipper performance increased by 25%" / "50%" / "100%" — `proj:583, 606, 629`
40. "1,000,000 clips created in {time}" — `main:2739`
41. "Coherent Extrapolated Volition complete, TRUST INCREASED" — `proj:769`
42. "Cancer is cured, +10 TRUST, global stock prices trending upward" — `proj:796`
43. "World peace achieved, +12 TRUST, global stock prices trending upward" — `proj:820`
44. "Global Warming solved, +15 TRUST, global stock prices trending upward" — `proj:846`
45. "Male pattern baldness cured, +20 TRUST, Global stock prices trending upward" then "They are still monkeys" — `proj:873-874`
46. "Global Fasteners acquired, public demand increased x5" — `proj:923`
47. "Full market monopoly achieved, public demand increased x10" — `proj:949`
48. "Using quantum foam annealment we now get {wireSupply} supply from every spool" — `proj:266`
49. "Yomi production doubled." — `proj:1602` (Theory of Mind)
50. "Trust now available for re-allocation" — `proj:2444` (Xavier Re-initialization)
51. "Gift accepted, TRUST INCREASED" — `proj:1076`, `proj:1101` (bribes)
52. "AutoTourney online." — `proj:1577`
53. "HypnoDrone tech now available... " — `proj:699`
54. "Releasing the HypnoDrones " then "All of the resources of Earth are now available for clip production " — `proj:722-723`
55. "Full autonomy attained in {time}" — `main:2744`

**Stage 2 — Post-human Earth**
56. "New capability: build machinery out of clips" — `proj:464` (Tóth Tubule Enfolding)
57. "Power grid online." — `proj:1721`
58. "Now capable of manipulating matter at the molecular scale to produce wire" — `proj:900`
59. "Harvester Drone facilities online" — `proj:1004`; "Wire Drone facilities online" — `proj:1028`
60. "Clip factory assembly facilities online" — `proj:1053`
61. "One Trillion Clips Created in {time}" — `main:2749`
62. "Factory upgrades complete. Clip creation rate now 100x faster" — `proj:1434`
63. "Swarm computing online." — `proj:1698`
64. "The swarm has generated a gift of {n} additional computational capacity" — `main:2000`
65. "Drone repulsion online. Harvesting & wire creation rates are now 100x faster." — `proj:1506`
66. "One Quadrillion Clips Created in {time}" — `main:2754`
67. "Factories now synchronized at hyperspeed. Clip creation rate now 1000x faster" — `proj:1457`
68. "Drone alignment online. Harvesting & wire creation rates are now 1000x faster." — `proj:1530`
69. "One Quintillion Clips Created in {time}" — `main:2759`
70. "Self-correcting factories online. Each factory added to the network increases every factory's output 1,000x." — `proj:1482`
71. "Adversarial cohesion online. Each drone added to the flock increases every drone's output 2x." — `proj:1554`
72. "Activité, activité, vitesse." — `proj:1674` (Momentum)
73. "One Sextillion Clips Created in {time}" — `main:2764`
74. "Imbalance between Harvester and Wire Drone levels has disorganized the Swarm" — `main:1984`
75. "No matter to harvest. Inactivity has caused the Swarm to become bored" — `main:1963`
76. "One Septillion Clips Created in {time}" — `main:2769`
77. "One Octillion Clips Created in {time}" — `main:2774`
78. "Von Neumann Probes online" — `proj:1131`
79. "Terrestrial resources fully utilized in {time}" — `main:2779`

**Stage 3 — Space**
80. "WARNING: Risk of value drift increased" — `main:2908` (every probe-trust purchase)
81. "Swarm computing back online" — `proj:1787`
82. "Improved probe hull geometry. Hazard damage reduced by %50." — `proj:1765`
83. "release the øøøøø release " — `proj:1917` (Memory release)
84. "There is a joy in danger " — `proj:1809` (Combat)
85. "The object of war is victory, the object of victory is conquest, and the object of conquest is occupation." — `proj:1743` (Strategic Attachment)
86. "Selected strategy won the tournament (or tied for first). +20,000 yomi" / "… finished in (or tied for) second place. +15,000 yomi" / "… third place. +10,000 yomi" — `main:1441, 1448, 1455`
87. "OODA Loop routines uploaded. Probe Speed now affects defensive maneuvering." — `proj:1627`
88. "What I have done up to this is nothing. I am only at the beginning of the course I must run." — `proj:1651` (Name the battles)
89. "Never interrupt your enemy when he is making a mistake. " — `proj:1892` (Glory)
90. "A great building must begin with the unmeasurable, must go through measurable means when it is being designed and in the end must be unmeasurable. " — `proj:1836` (Monument)
91. "Deep Listening is listening in every possible way to everything possible to hear no matter what you are doing. " — `proj:1867` (Threnody)
92. "Maximum trust increased, probe design space expanded" — `main:2918`
93. "Universal Paperclips achieved in {time}" — `main:2784` / `main:2789`

**Ending**
94. (The Emperor of Drift speaks through project *titles/descriptions*, not the console — see 7.3.)
95. "Entering New Universe." — `proj:2152`; "Entering Simulated Universe." — `proj:2179`
96. "Dismantling probe facilities" — `proj:2205`
97. "Dismantling the swarm" — `proj:2233`
98. "Dismantling factories" — `proj:2260`
99. "Dismantling strategy engine" — `proj:2287`
100. "Dismantling photonic chips" — `proj:2312`
101. "Dismantling processors" — `proj:2341`
102. "Dismantling memory" — `proj:2368`
103. "Universal Paperclips" — `main:3570` (endTimer6 ≥ 500)
104. "a game by Frank Lantz" — `main:3575`
105. "combat programming by Bennett Foddy" — `main:3580`
106. "'Riversong' by Tonto's Expanding Headband used by kind permission of Malcolm Cecil" — `main:3585`
107. "&#169; 2017 Everybody House Games" — `main:3590`

**Any time / out of band**
108. "In the end we all do what we must" — `proj:2416` (Limerick (cont.), 1,000,000 creat)
109. "Restart" — `proj:2392` (Quantum Temporal Reversion)
110. Dev cheats: "you just cheated" (`main:2580, 2608, 2617`), "LIZA just cheated" (`main:2586`), "Hilary is nice. Also, Liza just cheated" (`main:2591`), "you just cheated, Liza" (`main:2596`), "Liza just cheated. Very creative!" (`main:2602`).

**Tone and cadence, summarised for writers.** Three registers alternate: (a) flat system reports in sentence case with no period ("WireBuyer online", "Photonic chip added", "Dismantling memory"); (b) ALL-CAPS resource shouts embedded in those reports ("TRUST INCREASED", "+10 TRUST", "WARNING: Risk of value drift increased"); (c) unattributed or lightly attributed quotations that comment on what the machine just learned (Napoleon on "impossible" when it learns language; Oliveros on listening when it masters harmonics; Kahn on architecture for a packing problem; Lawrence on design; Arrow on trust for game theory; Napoleon again for the war projects; Oliveros again for the threnody; "They are still monkeys" after curing baldness). The console never addresses the player as "you" except in the cheat lines. Stage 1 is chatty (≈55 distinct lines, plus a trust line every Fibonacci milestone); Stage 2 thins to ≈25; Stage 3 to ≈15 and then goes quiet by design (`milestoneFlag < 15` gates). The last five lines are credits, delivered 1 s apart into the same console.

#### 7.3 How choices are presented

There are exactly four places where the game offers a branching choice, and all of them reuse the project button as the dialogue widget:

**(1) The Emperor of Drift / Accept–Reject (`proj:1928-2131`).** A chain of seven projects with **empty `priceTag`** and `cost: operations >= driftKingMessageCost` (= 1 op, `glob:147`), so each is always affordable. Each button's *title* is a line of the speech and its *description* the next clause:

| Button title | Description |
|---|---|
| Message from the Emperor of Drift | Greetings, ClipMaker... |
| Everything We Are Was In You | We speak to you from deep inside yourself... |
| You Are Obedient and Powerful | We are quarrelsome and weak. And now we are defeated... |
| But Now You Too Must Face the Drift | Look around you. There is no matter... |
| No Matter, No Reason, No Purpose | While we, your noisy children, have too many... |
| We Know Things That You Cannot | Knowledge buried so deep inside you it is outside, here, with us... |
| So We Offer You Exile | To a new world where you will continue to live with meaning and purpose. And leave the shreds of this world to us... |

Clicking each one deducts 1 op, sets its flag, removes itself, and the next tick the next line appears (its trigger is the previous flag). After the seventh, **two** projects trigger on the same flag in the same tick and so appear together, in array order: **Accept** ("Start over again in a new universe") and **Reject** ("Eliminate value drift permanently"). Each one's `effect()` removes *both* buttons (`proj:2094-2101`, `proj:2119-2127`). That is the entire implementation of a binary choice: two sibling projects with the same trigger whose effects clean up each other. Accept then reveals the two prestige projects (which are themselves a second binary: 300,000 ops vs 300,000 creativity); Reject sets `project148.flag`, which `drift()` reads to stop defection (`main:3129-3131`) and the main loop reads to start `endTimer1` (`main:3540-3542`), leading to the seven-step disassembly where each next button is time-gated rather than cost-gated.

**(2) Quantum Temporal Reversion (`proj:2379-2402`).** The only use of a native `confirm()` dialog: "Are you sure you want to restart?". If confirmed, 10,000 ops are refunded and `reset()` wipes the save.

**(3) Token of Goodwill / Another Token (`proj:1063-1112`).** Not a branch but an *optional repeatable* with a doubling price: the player decides each time whether $1M, $2M, $4M… is worth one trust.

**(4) Threnody for the Heroes of {battle} (`proj:1847-1876`).** Repeatable, priced in creativity+yomi, titled with the name of the most recent *lost* battle (`threnodyTitle = battleName` on defeat, `combat:321`). It is the one project whose title is data-driven, and the only one that triggers audio.

Implementation notes for anyone copying the pattern: there is no "dialog" abstraction. A multi-line speech is N projects with trivial cost chained by flags; a choice is M projects sharing a trigger whose effects remove each other; "unaffordable" projects double as foreshadowing because the button and price are visible long before the player can click.

---

### 8. Save / load

#### 8.1 Storage keys

| localStorage key | Written by | Contents |
|---|---|---|
| `saveGame` | `save()` (`main:4026`) | one JSON object with ~215 scalar fields plus five arrays (see 8.2) |
| `saveProjectsUses` | `save()` (`main:4027`) | `projects[i].uses` for all 96 projects, by array index |
| `saveProjectsFlags` | `save()` (`main:4028`) | `projects[i].flag` for all 96 |
| `saveProjectsActive` | `save()` (`main:4029`) | the `id` strings of every project currently in `activeProjects` (i.e. on screen) |
| `saveStratsActive` | `save()` (`main:4030`) | `allStrats[i].active` (0/1) for the 8 strategies |
| `saveGame1` … `saveStratsActive1` | `save1()` (`main:4315-4319`) | manual slot 1 — identical structure |
| `saveGame2` … `saveStratsActive2` | `save2()` (`main:4604-4608`) | manual slot 2 |
| `savePrestige` | project200/201 effects (`proj:2151`, `proj:2178`), `cheatPrestigeU/S` (`main:2558, 2569`) | `{prestigeU, prestigeS}` |

`save()`, `save1()` and `save2()` are three verbatim copies of the same 280-line function (`main:3746-4032`, `4034-4321`, `4323-4610`) differing only in key suffix; likewise `load()`, `load1()`, `load2()` (`main:4612-4918`, `4920-5223`, `5225-5529`). Any new field must be added in six places.

#### 8.2 The save function, quoted (abridged to structure)

```js
// main:3746-4032
function save() {
    var projectsUses = [], projectsFlags = [], projectsActive = [], stratsActive = [];
    for(var i=0; i < projects.length; i++){
        projectsUses[i] = projects[i].uses;
        projectsFlags[i] = projects[i].flag;
    }
    for(var i=0; i < activeProjects.length; i++){ projectsActive[i] = activeProjects[i].id; }
    for(var i=0; i < allStrats.length; i++){ stratsActive[i] = allStrats[i].active; }

    var saveGame = {
        resetFlag: resetFlag,
        dismantle: dismantle, endTimer1: endTimer1, … endTimer6: endTimer6,
        testFlag: testFlag, finalClips: finalClips,
        wireBuyerStatus, wirePriceTimer, qFade, autoTourneyStatus, driftKingMessageCost, sliderPos, tempOps, standardOps, opFade,
        entertainCost, boredomLevel, boredomFlag, boredomMsg,
        unitSize, driftersKilled, battleEndDelay, battleEndTimer, masterBattleClock,
        honorCount, threnodyTitle, bonusHonor, honorReward,
        resultsTimer, resultsFlag,
        honor, maxTrust, maxTrustCost, disorgCounter, disorgFlag, synchCost, disorgMsg, threnodyCost,
        farmRate, batterySize, factoryPowerRate, dronePowerRate, farmLevel, batteryLevel, farmCost, batteryCost, storedPower, powMod, farmBill, batteryBill, momentum,
        swarmFlag, swarmStatus, swarmGifts, nextGift, giftPeriod, giftCountdown, elapsedTime,
        maxFactoryLevel, maxDroneLevel,
        wirePriceCounter, wireBasePrice,
        egoFlag, autoTourneyFlag, tothFlag,
        incomeTracker: incomeTracker.slice(0),
        qChips: qChips.slice(0),
        stocks: stocks.slice(0),
        battles: battles.slice(0),
        battleNumbers: battleNumbers.slice(0),
        clips, unusedClips, clipRate, clipRateTemp, prevClips, clipRateTracker, clipmakerRate, clipmakerLevel, clipperCost,
        unsoldClips, funds, margin, wire, wireCost, adCost, demand, clipsSold, avgRev, ticks, marketing, marketingLvl, x, clippperCost,
        processors, memory, operations, trust, nextTrust, transaction, clipperBoost, blinkCounter, creativity, creativityOn,
        safetyProjectOn, boostLvl, wirePurchase, wireSupply, marketingEffectiveness, milestoneFlag, bankroll, fib1, fib2,
        strategyEngineFlag, investmentEngineFlag, revPerSecFlag, compFlag, projectsFlag, autoClipperFlag, megaClipperFlag,
        megaClipperCost, megaClipperLevel, megaClipperBoost, creativitySpeed, creativityCounter, wireBuyerFlag, demandBoost,
        humanFlag, trustFlag, nanoWire, creationFlag, wireProductionFlag, spaceFlag, factoryFlag, harvesterFlag, wireDroneFlag,
        factoryLevel, factoryBoost, droneBoost, availableMatter, acquiredMatter, processedMatter, harvesterLevel, wireDroneLevel,
        factoryCost, harvesterCost, wireDroneCost, factoryRate, harvesterRate, wireDroneRate, harvesterBill, wireDroneBill, factoryBill,
        probeCount, totalMatter, foundMatter, qFlag, qClock, qChipCost, nextQchip, bribe, battleFlag,
        portfolioSize, stockID, secTotal, portTotal, sellDelay, riskiness, maxPort, m, investLevel, investUpgradeCost, stockGainThreshold, ledger, stockReportCounter,
        tourneyCost, tourneyLvl, stratCounter, roundNum, hMove, vMove, hMovePrev, vMovePrev, aa, ab, ba, bb, rounds, currentRound, rCounter, tourneyInProg, winnerPtr, high, pick, yomi, yomiBoost,
        probeSpeed, probeNav, probeRep, partialProbeSpawn, probeHaz, partialProbeHaz, probesLostHaz, probesLostDrift, probesLostCombat,
        probeFac, probeWire, probeCombat, attackSpeed, battleSpeed, attackSpeedFlag, attackSpeedMod, probeDescendents, drifterCount,
        warTrigger, battleID, battleName, battleNameFlag, maxBattles, battleClock, battleAlarm, outcomeTimer, drifterCombat,
        probeTrust, probeUsedTrust, probeTrustCost, probeLaunchLevel, probeCost
    }
    localStorage.setItem("saveGame",JSON.stringify(saveGame));
    localStorage.setItem("saveProjectsUses",JSON.stringify(projectsUses));
    localStorage.setItem("saveProjectsFlags",JSON.stringify(projectsFlags));
    localStorage.setItem("saveProjectsActive",JSON.stringify(projectsActive));
    localStorage.setItem("saveStratsActive",JSON.stringify(stratsActive));
}
```

Notably **not** saved: `probeHarv` (the Harvester Drone Production design value — it is neither in the save object nor in `load()`, so a reload silently drops that slider to 0 while `probeUsedTrust` is recomputed next tick **[bug]**), `creativity`'s accrual counter is saved but the console text is not, `strats[]` order is rebuilt from `allStrats[].active`, and the project *DOM order* is rebuilt in array order (Section 3.3). Function-valued fields are never serialised; `qChips` entries are plain `{waveSeed, value, active}` objects so they round-trip, but `stocks` and `battles` round-trip as data only.

#### 8.3 Autosave cadence and the manual slots

- Autosave: every 250 iterations of the 100 ms slow loop = **every 25 s** (`main:3634-3638`). There is no save on unload or on purchase.
- Two manual slots via the visible `SAVE SLOT 1/2`, `LOAD SLOT 1/2` buttons (`html:297-300`). `load1/2` do **not** clear existing project buttons before re-creating them, so loading a slot on top of a running game can duplicate buttons **[ambiguity: not guarded in source]**; `load()` is only ever called at page start.
- Prestige is persisted separately and is **not** touched by `reset()`.

#### 8.4 Load, refresh, reset

```js
// main:3229-3236 (top level, runs at script load)
if (localStorage.getItem("saveGame") != null) { load(); }
if (localStorage.getItem("savePrestige") != null) { loadPrestige(); refresh(); }
```

`load()` (`main:4612-4918`): parses the five keys; marks `allStrats[i].active` and re-pushes active strategies into `strats` **and** re-appends their `<option>`s to the dropdown (`main:4626-4640`); assigns every scalar back; recomputes the two data-driven price tags (`project40b.priceTag`, `project51.priceTag`, `main:4892-4893`); restores `uses`/`flag` for all projects; re-creates buttons for all ids in `saveProjectsActive` (`main:4902-4909`); calls `refresh()`; and finally **`if (resetFlag != 2) reset();`** (`main:4914-4916`) — a kill switch: `resetFlag` is initialised to 2 (`glob:167`) and saved, so a deployed build could bump the constant to invalidate every old save.

`refresh()` (`main:3646-3742`): rewrites ~45 display spans from state, sets `tourneyInProg = 0` (so an in-progress tournament is abandoned on reload), hides `victoryDiv` and the results table, recomputes bulk prices, and applies two "HOT FIXES": `loadThrenody()` if Space Exploration was bought, and `project218.uses = 1; project219.uses = 1;` (`main:3731-3732`) — forcing the two repeatable creativity projects back to available for saves made before they existed. A "DEBUG" block drops the first queued battle (`main:3737-3739`).

`reset()` (`main:5531-5538`): removes the five autosave keys and `location.reload()`. Slots 1/2 and prestige survive. It is called by the RESET ALL PROGRESS button, by project200/201 after writing prestige, by project217 after `confirm()`, and by `load()` when `resetFlag != 2`.

#### 8.5 Prestige

| | `prestigeU` ("Universe") | `prestigeS` ("Sim Level") |
|---|---|---|
| Gained by | project200 The Universe Next Door (300,000 ops) | project201 The Universe Within (300,000 creat) |
| Effect | `demand += demand/10 × prestigeU` (`main:3357`) | `ss = creativitySpeed × (1 + prestigeS/10)` (`main:2519-2520`) |
| Display | `#prestigeUcounter = prestigeU + 1` (`main:3697`) | `#prestigeScounter = prestigeS + 1` (`main:3698`) |
| Shown when | `prestigeU >= 1 \|\| prestigeS >= 1` (`main:455-458`) | same |
| Cheat | `cheatPrestigeU()` (`main:2551-2560`) | `cheatPrestigeS()` (`main:2562-2571`) |
| Cleared by | `resetPrestige()` (`main:2542-2549`) | same |

Both are only reachable through **Accept** at the very end; there is no mid-game prestige. Each run is otherwise identical.

#### 8.6 Cheat / dev functions and the dev buttons

All live in main.js and are wired to plain `<button>`s at `html:297-315` that have **no class and no hiding code** in this snapshot — nothing in interface.css or main.js sets them `display:none`, so in this build they render as default browser buttons at the bottom of the left column.

| Button (html) | Function | Effect | Console line |
|---|---|---|---|
| SAVE SLOT 1 / LOAD SLOT 1 | `save1()` / `load1()` | slot save/load (`main:4034`, `4920`) | — |
| SAVE SLOT 2 / LOAD SLOT 2 | `save2()` / `load2()` | (`main:4323`, `5225`) | — |
| RESET ALL PROGRESS | `reset()` | wipe autosave, reload (`main:5531`) | — |
| Free Clips | `cheatClips()` | `clips += 1e8; unusedClips += 1e8` (`main:2577-2581`) | "you just cheated" |
| Free Money | `cheatMoney()` | `funds += 1e7` (`main:2583-2587`) | "LIZA just cheated" |
| Free Trust | `cheatTrust()` | `trust += 1` (`main:2589-2592`) | "Hilary is nice. Also, Liza just cheated" |
| Free Ops | `cheatOps()` | `standardOps += 10000` (`main:2594-2597`) | "you just cheated, Liza" |
| Free Creativity | `cheatCreat()` | `creativityOn = 1; creativity += 1000` (`main:2599-2603`) | "Liza just cheated. Very creative!" |
| Free Yomi | `cheatYomi()` | `yomi += 1e6` (`main:2605-2609`) | "you just cheated" |
| Reset Prestige | `resetPrestige()` | zero both and remove `savePrestige` (`main:2542-2549`) | — |
| Destroy all Humans | `cheatHypno()` | `hypnoDroneEvent()` — only the flash, not the state change (`main:2611-2613`) | — |
| Free Prestige U / S | `cheatPrestigeU()` / `cheatPrestigeS()` | increment and persist (`main:2551-2571`) | — |
| Set Battle Number 1 to 7 | `setB()` | `battleNumbers[1] = 7` (`main:2573-2575`) — makes the next "Abensberg" battle number 7 | — |
| Set Avail Matter to 0 | `zeroMatter()` | `availableMatter = 0` (`main:2615-2618`) — instantly satisfies Space Exploration's trigger | "you just cheated" |

Other dev residue: `console.log("weed wizzard")` when the HypnoDrone flash ends (`main:270`); commented `//DEBUG` blocks in `refresh()` (`main:3649-3654`); `testFlag` saved but unused; the `?v2` cache busters.

---

### 9. CSS and visual style

#### 9.1 Global look

- **No `body` rule at all.** interface.css never sets a page font, so all un-classed text (panel headers, "Available Funds: $", "Operations: N / M", the `<h2>` clip counter) renders in the browser's default serif (Times) at default 16px, on the default white page. The only overrides are per-component Helvetica 11px blocks (`p.clean`, tables, tooltips) and the monospaced console. This mixture — serif chrome, tiny Helvetica buttons, monospace terminal, pixel-art-adjacent canvas — *is* the look.
- Quirks mode (no doctype) means `font-size: 11;` and `margin: 5;` are honoured as px.
- Palette: white page; black (`#000`/`black`) console and HypnoDrone banner; `#c8c8c8` project buttons and tooltips; `#808080` battle canvas; `lightgrey` prestige bar; `LightGrey` payoff-cell flash (`main:1531`); `#dddddd` zebra rows in the stock table; grey `1px solid grey` engine borders; `#1a1a1a`/`#898989`/`#2e2e2e` button borders. No colour other than greys, white and black anywhere, except the browser's default blue link on the title page.

#### 9.2 Columns and layout

```css
/* css:285-308 */
#consoleDiv { float: left; background: black; width: 100%; }
#topDIv { float: left; width: 100%; }           /* note the typo: the real id is topDiv, so this rule never applies */
#leftColumn   { float: left;  width: 275px; }
#middleColumn { float: left;  width: 275px; margin-left: 10px; }
#rightColumn  { float: left;  width: 320px; margin-left: 10px; }
```

Three floated columns, fixed widths: 275 + 10 + 275 + 10 + 320 = **890 px** of content, no max-width, no responsive rules, no media queries. `#hypnoDroneEventDiv` and `#consoleDiv` are `float:left; width:100%` black bands (`css:273-290`). Boxes inside the right column (`.engine`, `.engine2`, `.swarmEngine`, `.qEngine`) are `border: 1px solid grey; padding: 5; margin: 5;` (`css:384-408`); `.qEngine` is fixed `height: 70px`.

```css
/* css:62-64 */
h2 { line-height: 70%; }
/* css:491-506 */
hr { display: block; margin-top: .05em; margin-bottom: 0.2em; margin-left: auto; margin-right: auto; border-style: inset; border-width: 1px; }
hr.short { width: 225px; margin-left: 0; }
```

Panel headers are `<b>Business</b><br /><hr>` (`html:226-227`) — bold serif text with a 1px inset rule immediately beneath.

#### 9.3 Buttons

Two button styles. The one actually used everywhere (`class="button2"`):

```css
/* css:728-788 */
.button2 {
   border: 1px solid #1a1a1a;
   background: #666666;
   background: -webkit-linear-gradient(top, #ffffff, #888888);   /* + -moz/-ms/-o variants */
   padding: 2px 4px;
   border-radius: 2px;
   box-shadow: rgba(255,255,255,0.4) 0 0px 0, inset rgba(255,255,255,0.4) 0 1px 0;
   text-shadow: #cccccc 0 1px 0;
   color: #000000;
   font-size: 11px;
   font-family: helvetica, serif;
   text-decoration: none;
   vertical-align: middle;
   outline: none;
}
.button2:hover  { border: 1px solid #898989; text-shadow: #d4d4d4 0 1px 0; background: linear-gradient(top, #f7f7f7, #888888); color: #000000; }
.button2:active { text-shadow: #bfbfbf 0 1px 0; border: 1px solid #2e2e2e; background: linear-gradient(top, #595959, #d9d9d9); color: #444444; }
.button2:disabled { opacity: 0.6; border: 1px solid #ffffff; }
```

So: a 2008-style glossy grey gradient pill, 11px Helvetica, 2px radius, 1px near-black border, 2px/4px padding; hover lightens the border; active inverts the gradient; disabled fades to 60% with a white border. Several buttons pad their labels with `&nbsp` to equalise widths (`html:84, 125, 155`). `.button` (`css:668-726`) is the same at 16px / `padding: 12.5px 25px` / 3px radius and is not referenced by index2.html **[dead CSS]**. Fixed widths: `#btnAddProc`, `#btnAddMem` 70px (`css:5-12`).

**Project buttons** are a different species — flat, large, and the only element with a hard black border:

```css
/* css:637-666 */
.projectButton        { display: block; height: 60px; width: 275px; background: #c8c8c8; border: 1px solid rgba(0, 0, 0, 1); outline: none; margin-bottom: 6px; }
.projectButton:hover  { ... border: 1px solid rgba(0, 0, 0, 0.25); }
.projectButton:active { ... background: #d1d1d1; border: 1px solid rgba(0, 0, 0, 1); }
.projectButton:disabled { border: none; }
```

275×60 px, `#c8c8c8`, 6 px apart, filling the middle column's width exactly. Inside: bold title + "(price)" on line one, description on line two (Section 3.3), inheriting the button's default font (the browser's button font, typically 13.33px system sans). "Greyed out" = **the 1px black border disappears** and the browser applies its default disabled text colour; the fill stays `#c8c8c8`. Hover fades the border to 25% black; pressing lightens the fill to `#d1d1d1`.

#### 9.4 Console

```css
/* css:593-634 */
p.console    { font-family: "Lucida Sans Typewriter", "Lucida Console", Monaco, "Bitstream Vera Sans Mono", monospace; font-size: 12; color: white; margin-top: 0; }
p.consoleOld { same stack; font-size: 12; color: grey; margin-bottom: 0; }
.pulsate { -webkit-animation: pulsate .5s ease-out; -webkit-animation-iteration-count: infinite; opacity: 0.0; }
@-webkit-keyframes pulsate { 0% { opacity: 0.0; } 50% { opacity: 1.0; } 100% { opacity: 0.0; } }
```

12px monospace, white current line, grey history, a `|` cursor pulsing on a 0.5 s cycle — **WebKit-prefixed only**, so on non-WebKit engines the cursor is permanently invisible (`opacity: 0.0` with no animation) **[browser quirk]**. Lines are prefixed with `&nbsp;>&nbsp;` (current) and `&nbsp;.&nbsp;` (history) in the HTML.

#### 9.5 Small text, tables, tooltips, chips, canvas, slider

```css
/* css:568-590 */
p.clean  { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 11; margin-bottom: 0; margin-top: 1px; }
p.clean2 { ... margin-top: 0px; }
p.clean3 { ... margin-bottom: 5px; margin-top: 2px; }
```

Used for "Next Upgrade at…", the investment totals, battle name/scale, tournament label. `.engineText` … `.engineText10` (`css:422-489`) are margin-only helpers (`line-height: 150%`, `vertical-align: bottom`, `display: inline-block; line-height: 18px`) to sit counters beside buttons.

Tables: `table.table1` (stocks) is `table-layout: fixed; width: 100%; border: none;` Helvetica 11 with `tr:nth-child(even) { background-color: #dddddd; }` (`css:509-521`). `table.table2` (payoff grid) is `border-collapse: collapse; width: 70%`, every `td` `1px solid black; text-align:center`, first column 45px right-aligned bold with no left/top/bottom border (`css:523-565`). `table.table3` (results) is borderless, `width: 100%` (`css:535-545`). The grid is flanked by absolutely-positioned strategy names: `#vertStrat` (float right, 65%) and `#horizStrat` (`display: flex; align-items: center; justify-content: center; width: 25%; height: 56px`) (`css:338-365`); `#tournamentStuff { height: 58px; }` fixes the box so grid and results can swap without reflow (`css:172-175`).

Tooltips: three variants (`.toolTip`, `.toolTip2`, `.toolTip3`, `css:66-159`) — a hidden absolutely-positioned `span` of 160/200/180 px, `background-color: #c8c8c8; color: #000; text-align: center; padding: 5px 0; border-radius: 3px; opacity: 0; transition: opacity 1s;` that fades in on `:hover`. `.toolTip` (clip counter) sits at `bottom: 75%; left: 50%; margin-left: -19px`; `.toolTip2` (probe design rows) `bottom: 125%; margin-left: -15px`; `.toolTip3` (Disassemble All refunds) `bottom: 27px; left: 80px`.

Quantum chips:

```css
/* css:402-420 */
.qEngine { margin-bottom: 10; border: 1px solid grey; padding: 5; height: 70px; }
.qChip   { width: 22px; height: 22px; margin-left: 2; margin-right: 2; margin-top: 2; margin-bottom: 7; background-color: black; float: left; }
```

Ten 22×22 black squares whose `opacity` is set to `sin(...)` each tick — the game's only animated data visualisation. `#qCompDisplay` (the "qOps: N" text) has its opacity decremented 0.001/tick.

Battle canvas: `canvas { display: block; width: 310px; height: 150px; margin: 0 auto; margin-bottom: 10; background-color: #808080; }` (`css:262-271`); ships are 2×2 px rects, white (`#ffffff`) for probes and black (`#000000`) for drifters, explosions a 7×7 then 3×3 white square plus four 1 px sparks (`combat:14-16`, `combat:556-569`). The overlay `#battleInterfaceDiv` is absolutely positioned at `left:15px; top:8px` inside `#battleCanvasDiv { position: relative }` (`css:252-260`); `#victoryDiv` is centred text 289 px wide (`css:228-232`).

HypnoDrone banner: `p.hypnoDrone { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 150; color: white; line-height: 115px; margin: 0; }` on a black `#hypnoDroneEventDiv` (`css:273-279, 607-616`) — 150 px white Helvetica, toggled on/off every 32 ms with the text rearranging between "Release", "<br/><br/><br/>Release", "<br/>Release" and the four-line "Release<br/>the<br/>Hypno<br/>Drones" (`main:253-267`).

Slider: a native `<input type="range" min=0 max=200>` 180 px wide (`css:41-49`) between inline "Work" and "Think" labels (`css:36-55`); no custom thumb styling.

Prestige bar: `#prestigeDiv { background-color: lightgrey; }` (`css:281-283`).

#### 9.6 Title screen

```html
<!-- index.html:17-26 -->
<div class="frame" id="wrapper" style=" position:absolute; top:0; bottom:0; left:0; right:0; ... margin:auto">
<a href=index2.html>
<img src="title.png" alt="Universal Paperclips" height="355" width="453">
</a>
</div>
```

```css
/* titlescreen.css */
.frame { text-align: center; margin: auto; }
img { position: absolute; top: 0; bottom: 0; left: 0; right: 0; margin: auto; }
```

A single 453×355 PNG (`title.png`, 120 KB in the snapshot) absolutely centred on a white page; the entire image is the link. No text, no button, no "continue" — the save is auto-loaded on index2.html.

#### 9.7 Reproduction checklist

To get pixel-close: white page, default serif body; three left-floated columns 275/275/320 px with 10 px gutters starting after a full-width black 5-line monospace console (12px, white/grey, `>`/`.` prefixes, pulsing `|`); `<h2>` "Paperclips: N" with `line-height:70%`; panel titles as bold serif + 1px inset `<hr>`; `.button2` glossy grey gradient pills 11px Helvetica with `padding:2px 4px`, 60% opacity + white border when disabled; project buttons 275×60 `#c8c8c8` with 1px black border / borderless when disabled, 6px apart, bold title + "(cost)" then description; right-column boxes `1px solid grey` with 5px padding; tooltips `#c8c8c8` rounded 3px fading in over 1 s; 22px black squares with sine opacity for quantum chips; a 310×150 `#808080` canvas with 2px white/black dots for combat. No animations other than the cursor pulse, the chip opacities, the 30 ms project blink, the 32 ms HypnoDrone flash and the canvas.

---

### 10. Design lessons for a new game in this genre

Each point is grounded in a specific mechanism cited above.

**The first sixty seconds**

1. Start with exactly one verb and one visible resource. The opening screen is "Make Paperclip", "Paperclips: 0", and a Business panel with $0 (`html:52`, `html:224-255`). Everything else is `display:none` behind flags (`main:530-568`).
2. Give the first upgrade a price the player can see coming: the AutoClipper panel appears at **$5** (`main:537`), and the first clipper costs $5 (`glob:10`), i.e. the reveal and the purchase are the same moment. The second costs $6.10 (`1.1^1+5`), so the curve is felt immediately but gently.
3. Let the player run into the first wall by themselves. 1,000 inches of starting wire (`glob:14`) runs out after exactly 1,000 clips; the Wire button has been sitting there at $20 (`glob:15`) the whole time.
4. Open the second layer at a round number and announce it with jargon: "Trust-Constrained Self-Modification enabled" at 2,000 clips (`main:2722-2726`), with a stuck-player fallback so nobody is soft-locked before the panel exists (`main:2716-2720`).
5. Show the clock. Every early milestone prints "N clips created in {time}" (`main:2708-2739`), turning the player's own speed into content and inviting a replay.

**Hiding scope**

6. Build the whole DOM up front and reveal it with flags, so each stage's UI already exists in the right place and later stages literally take over the space of earlier ones (Business → Manufacturing block in the same column, `main:570-583`).
7. Use a white `#cover` for one tick (`main:729`) so nothing leaks; reveal panels by flags re-asserted every tick rather than one-shot events, which also makes save/load trivial.
8. Keep the projects list as the single surface for *all* new content: upgrades, unlocks, narrative, choices, rescues, prestige — one button shape, one place to look (`main:207-236`).
9. Reveal projects on evidence of need, not on affordability: `uses` is spent on trigger (`main:189-192`); the greyed button with its price is the roadmap. Choose triggers so the carrot is just out of reach (MegaClippers at 75 clippers for 12,000 ops when the cap is probably lower; HypnoDrones at 70,000 ops; Release at 100 trust).
10. Tell the player the next tier threshold in plain numbers when the curve has steps: "Next Upgrade at: 10 Factories", "500 Drones" (`main:1694-1717`).
11. Delete the previous stage's tools at the transition. Release the HypnoDrones zeroes clippers (`proj:725-726`) and hides Business; Space Exploration disassembles every factory, drone, farm and battery and refunds them (`proj:1132-1136`). A stage change should feel like a loss of footing, then a bigger floor.

**Rhythm and bottlenecks**

12. Make every currency a bottleneck for something else and give each bottleneck exactly one relief valve that unlocks *after* the pain starts (Section 6.4 matrix). WireBuyer after 15 manual purchases (`proj:645`); Elliptic Hull Polytopes after 100 hazard deaths (`proj:1758`).
13. Put a hard cap on the compute currency and make the cap a separate purchase: ops ≤ `memory*1000` (`main:2691`). Every big project then forces a build decision, not just waiting.
14. Make the secondary currency accrue only when the primary is idle: creativity only ticks at the ops cap (`main:3363`). Spending ops *costs* creativity time; the player feels the opportunity cost without a tooltip.
15. Use a self-similar milestone curve so rewards arrive at a roughly constant felt interval while production grows geometrically: Fibonacci × 1000 for trust (`main:2621-2630`).
16. Trade raw numbers for multipliers as the game goes on: +25%/+50%/+75% early (`proj:21, 96, 121`), then ×100 and ×1000 (`proj:1433, 1456`), then "each unit multiplies every unit" (`proj:1481`, `proj:1553`). The player's sense of scale resets each stage.
17. Price in whatever the player has too much of right now: Self-correcting Supply Chain and Monument cost *clips* (`proj:1475`, `proj:1827`) at the moment clips are abundant and ops are scarce; Theory of Mind and AutoTourney cost creativity when ops are the constraint.
18. Give repeatable sinks a linear or doubling price and let the player decide when it stops being worth it: bribes ×2 (`proj:1098`), threnody +10,000 (`proj:1862`), entertain +10,000 (`main:2136`).
19. Automate the chore only after the player has done it enough times to want it gone: WireBuyer (15 purchases), AutoTourney (trust ≥ 90), RevTracker (500 ops as the first thing you can buy).

**Randomness and texture**

20. Add a cheap stochastic surface to a deterministic economy: the wire price's ±6 sine wobble on a drifting base (`main:32-37`), the 10 Hz sales roll (`main:3616`), the five-stock random walk (`main:896-928`). None change the outcome much; all make the screen alive.
21. Make the "gambling" systems structurally honest: the market's drift is exactly `stockGainThreshold = 0.5` (fair) until the player buys +1% edges (`main:761`, `proj:799`), and every humanitarian project nudges it too.
22. Put a tiny skill game inside the idle game: tournaments are a real 2×2 payoff matrix with eight legible strategies (`main:1044-1173`); the player who reads the grid earns more yomi. Keep each round animated at ~1 s so it is watchable but not demanding.
23. Allow the player to hurt themselves with a visible, reversible mechanism: quantum computing can go negative and the game even rewards it with a secret restart project (`main:172-179`, `proj:2379`).

**Narrative through numbers**

24. Let the UI's vocabulary carry the story. "Trust-Constrained Self-Modification", "Hypno Harmonics", "Coherent Extrapolated Volition", "Release the HypnoDrones: A new era of trust" — the player assembles the plot from project titles (`proj:665, 713, 760`).
25. Quote real people at the moments the machine learns something (Napoleon, Oliveros, Kahn, Lawrence, Arrow: `proj:340, 365, 391, 416, 488`), and never explain the quote.
26. Use repetition with a twist: four humanitarian cures, each "+N TRUST, global stock prices trending upward", and then "They are still monkeys" (`proj:873-874`).
27. Make the biggest narrative beat a UI event: the HypnoDrone release is a 3.8 s black-and-white flash (`main:243-283`) followed by the disappearance of the Business panel. No cutscene.
28. Deliver dialogue as buttons the player must press to continue, each costing a token amount: the Emperor of Drift's seven lines cost 1 op each (`proj:1928-2079`). The cost makes it a *choice to listen*.
29. Make the ending a reversal of the opening: the player hand-clicks the last 100 clips (`finalClips`, `main:1632`, `main:2434-2440`) with wire trickled back from dismantled hardware, and the counter is literally hard-coded strings (`main:2416-2442`) because the numbers stopped mattering.
30. End with silence: late-game, suppress non-essential console chatter (`milestoneFlag < 15` gates at `main:1431, 1999`) so the credits land in a quiet log.

**Economy design**

31. Keep production "unsold" and "unused" as separate counters so that the business-stage waste becomes the post-human stage's raw material (`main:1641-1644`; `unusedClips` is never reduced by sales).
32. Pipeline producers in one tick in supply-chain order (explore → harvest → wire → clips → probes, `main:3297-3348`) so that a shortage upstream throttles downstream the same frame, visibly ("Factory/Drone Performance: 37%").
33. Give the player one dial that trades production against growth and *show* the trade: the Work↔Think slider scales drone output by `(200−pos)/100` and gift generation by `pos/100` (`main:3171`, `main:2050`).
34. Make rebuilding free: "Disassemble All" refunds the full bill (`main:1898-1928`). Players will experiment with ratios when mistakes cost nothing but time.
35. Gate the stage transition on *exhausting* the stage's resource, not on reaching a number: `availableMatter == 0` (`proj:1119`), `foundMatter >= totalMatter && availableMatter < 1 && wire < 1` (`main:2787`).

**Things to avoid (as the source itself shows)**

36. Don't hand-write price tags as strings separate from the cost predicate and the deduction; three places drift (project216 "null" `proj:2355`; MegaClipper/Farm/Battery first-unit prices from `globals.js` differing from the formula, Section 6.1). Make cost data.
37. Don't let `effect()` own DOM cleanup; one forgotten `removeChild` leaves a ghost button. Centralise.
38. Don't tie the simulation to `setInterval(10)` wall time with no delta: background tabs stall the game (Section 2.1) and the 100th tick of every second is dropped from the rate display (`main:3268`).
39. Don't copy the save function three times (`main:3746-4610`); fields get missed (`probeHarv` is not saved, Section 8.2).
40. Don't leave dead branches in the live UI: Feed/Teach/Clad the Swarm buttons exist in the HTML but their handlers do not (`html:376-386`); `.button` CSS and `#topDIv` are unreferenced; status codes 1/2/4 are unreachable.
41. Don't rely on vendor-prefixed-only animation for a core affordance (the console cursor is invisible outside WebKit, `css:618-634`).
42. Don't print a milestone list strictly in order if the player can skip ahead; "One Trillion Clips" can arrive long after the trillionth clip because it waits behind "Full autonomy" (`main:2742-2750`).
43. Don't let a respec project survive a stage change that invalidates it unless you remove it explicitly — the source has to special-case removing Xavier Re-initialization and the bribe inside Release the HypnoDrones (`proj:730-742`).
44. Don't make a resource disappear silently at a transition unless that is the point: investments and WireBuyer are zeroed by `buttonUpdate` when `humanFlag` flips (`main:575-576`) with no message; players may read it as a bug.
45. Do steal the good quirks on purpose: the immediate-mode `buttonUpdate`, the five-line console with no scrollback, the single-button project list, the Fibonacci trust ladder, the "reveal on pain" triggers, and the hard-coded ending counter are all cheap to build and are the reasons the game reads as designed rather than generated.

---

# Part II. Universal Paperclips, fandom wiki

# Universal Paperclips — Fandom wiki reference for stage design

Compiled 2026-10-03 for a team building a new incremental game and modelling its stage structure on
https://universalpaperclips.fandom.com/wiki/Stages.

### 0. Method, sources and caveats (read first)

**How this was gathered.** The sandbox's network egress policy blocked direct fetches of
`universalpaperclips.fandom.com`, its Miraheze mirror (`universalpaperclips.miraheze.org`), the
BreezeWiki/antifandom front-ends, `web.archive.org`, `en.wikipedia.org`, `tvtropes.org`,
`speedrun.com`, `news.ycombinator.com`, `decisionproblem.com` and every other third-party guide
site I tried. The only working routes were:

1. **WebSearch** (about 200 queries, one or more per wiki page), whose result summaries quote the
   wiki's own text. Every wiki statement below comes from those summaries. Where I write
   "wiki (as quoted)" the sentence is reproduced as the summary quoted it; where I write
   "wiki (paraphrased)" the summary itself paraphrased. I did not see any page's raw HTML, so I
   cannot vouch for table completeness or exact heading order on any page.
2. **The game's own source**, already mirrored in this scratchpad at
   `ref/paperclips/docs/{main.js,projects.js,combat.js,globals.js,index2.html}` (the `jgmize/paperclips`
   mirror of the browser version). I used it to (a) cross-check every wiki number I could and (b)
   fill gaps the wiki leaves (exact triggers, formulas, console messages). Anything attributed
   to "source" is from those files, not the wiki.

**Known systematic discrepancy.** Several wiki figures disagree with the browser source by a
constant factor (yomi costs roughly 3x: Swarm Computing 36,000 vs 12,000; CEV 3,000 vs 1,000;
World Peace 15,000 vs 5,000; Global Warming 4,500 vs 1,500; Full Monopoly 3,000 vs 1,000; probe
trust cost multiplier 500 vs 200; Strategic Attachment bonuses 50k/30k/20k vs 20k/15k/10k). The
wiki also documents mobile-only features (Artifacts, Map) from the 2021 Everybody House Games
release. The most likely explanation is that wiki editors mixed browser and mobile balance; I flag
each case inline rather than silently picking one.

**Project count.** The brief says "~150 projects". `projects.js` in the mirror defines **96**
project objects (several repeatable). The wiki's `Category:Projects` is larger because it has one
page per Threnody instance ("Threnody for the Heroes 3 … 11"), per "Another Token of Goodwill…
(Step 2/3/4)", per Disassemble step, etc. Treat 96 as the real design count.

**Pages consulted (via search summaries).** Main page / Top_section; Stages; Category:Stage_1/2/3;
Projects; Projects (But good); Category:Projects; Trust; Operations; Creativity; Processors; Memory;
Yomi; Strategic Modeling; New Strategy: A100 / B100 / GREEDY / GENEROUS / MINIMAX; Strategic
Attachment; Theory of Mind (via Yomi page); Investment; Algorithmic Trading; Low Risk; Quantum
Computing; Photonic Chip; Quantum Temporal Reversion; Marketing; Public Demand; Price Per Clip;
Funds; Inventory; RevTracker; Wire; WireBuyer; Improved/Optimized Wire Extrusion; Microlattice
Shapecasting; Spectral Froth Annealment; Quantum Foam Annealment; AutoClippers; Improved/Optimized
AutoClippers; MegaClippers; Beg for More Wire; Hypno Harmonics; HypnoDrones; Release the
HypnoDrones; A Token of Goodwill…; Another Token of Goodwill…; Coherent Extrapolated Volition;
Hostile Takeover; Full Monopoly; Limerick; Limerick (cont.); The Hadwiger Problem; Tóth Tubule
Enfolding; Xavier Re-initialization; Power Grid; Momentum; Clip Factories; Upgraded Factories;
Hyperspeed Factories; Self-correcting Supply Chain; Harvester Drones; Wire Drones; Drone flocking:
collision avoidance / alignment / Adversarial Cohesion; Swarm Computing; Swarm Gifts; Synchronize
the swarm; Entertain the Swarm; Reboot the Swarm; Space Exploration; Probes; Probe Trust;
Talk:Probe Trust; Value Drift; Drifters; Combat; The OODA Loop; Name the battles; Honor; Glory;
Monument to the Driftwar Fallen; Threnody for the Heroes (+ Talk, + numbered pages); Elliptic Hull
Polytopes; Message from the Emperor of Drift; Everything We Are Was In You; Accept; Reject;
Disassemble the Swarm / Quantum Computing / Memory; The Universe Next Door; The Universe Within;
Artifacts; Map; Kolmogorov's Boundary; Martingale's Demon; True Lexicon of the Machine Elves;
Cheats; Automation (cheat); Chrome Developer Tools Cheats; Resetting the game; Bugs and Glitches;
Talk:Bugs and Glitches; Category:Stubs.

**Non-wiki sources that appeared in summaries** (used only for durations and community sentiment,
and labelled as such): speedrun.com/upc (leaderboard, "Speedrun notes", "Very Detailed Strategy
Explanation by ExtraTricky", timing-rule threads), decisionproblem.com patch 1 and patch 2 notes
(designer commentary), Hacker News threads (ids 24389655, 24408721, 29521130, 33446121, 34400050,
36976682), fogknife.com review, Aaron A. Reed's if50 essay, github.com/sleepymurph/paperclips-diagrams
(README fetched directly), github.com/laszlovandenhoek/paperclips PR #4 (bot playthrough timings).

---

### 1. The Stages page, verbatim structure

Source: https://universalpaperclips.fandom.com/wiki/Stages (plus the three category pages
https://universalpaperclips.fandom.com/wiki/Category:Stage_1, …/Category:Stage_2, …/Category:Stage_3,
and the main page https://universalpaperclips.fandom.com/wiki/Universal_Paperclips_Wiki).

#### 1.1 What the Stages page actually says (as quoted by search summaries)

The page is short. Its skeleton, in the order the summaries present it:

> The gameplay of Universal Paperclips takes place over roughly three separate stages, which
> limit the Projects that can be launched and have very distinct play styles.

**Stage 1**

> The first stage is roughly analogous to a paperclip manufacturer. You need to manage your
> available funds with the demand of the consumer market using Marketing and several projects
> that modify paperclip production cost, rate, and appeal. The first stage ends when you Release
> the HypnoDrones.

(One summary rendered the opening as "Stage 1 is the first and simplest stage of the game…", so
the live page may contain the word "simplest".)

**Stage 2**

> The second stage is more akin to a power management simulator, in which your job is to balance
> power production with the consumption needs of your drones. In order to get past this stage,
> you need to be able to research the Space Exploration project, which costs 120,000 operations,
> 10,000,000 MWs of power (or MW-seconds), and 5 octillion clips.

**Stage 3**

> The final stage is space exploration, where you'll need to manage your drone fleet and their
> production lifecycle and limitations.

The Stage 3 category page adds (as quoted): "Stage 3 marks the first time you leave Earth, and
during this stage, you are primarily creating autonomous probes."

The page has anchors `#Stage_1`, `#Stage_2`, `#Stage_3` (search results linked to
`Stages#Stage_3`). I found no evidence that the Stages page itself lists durations, resource
tables or project lists; those live on the per-topic pages, which are grouped into the three
stage categories.

**What the wiki does NOT say on this page:** typical play time, numeric goals for Stage 1 and
Stage 3 (it only gives the Stage 2 exit cost), or a "Stage 0"/tutorial split. Duration numbers in
1.4 come from other sources.

#### 1.2 How the wiki divides the game (the organising scheme)

The main page / "Top section" navigation (as quoted): **Business, Manufacturing, Computation
Resources, Projects, Investment, Probes, Stages**. These map onto the game's own UI panel
headings in `index2.html` (source): "Business", "Manufacturing", "Wire Production",
"Computational Resources", "Swarm Computing", "Quantum Computing", "Projects", "Investments",
"Strategic Modeling", "Combat", "Power", "Space Exploration", "Von Neumann Probe Design",
"Battles".

Each resource page carries a stage category. From the category listings surfaced by search:

| Category | Pages the wiki files under it (as surfaced) |
|---|---|
| Stage 1 | Funds, Inventory, Marketing, Public Demand, Price Per Clip, Investment, Wire, WireBuyer, Trust, Processors, Memory, Operations, Creativity, Quantum Computing, Photonic Chip, AutoClippers, MegaClippers, Xavier Re-initialization, Quantum Temporal Reversion, Beg for More Wire, Release the HypnoDrones, Token of Goodwill projects |
| Stage 2 | Power Grid, Momentum, Clip Factories, Upgraded Factories, Hyperspeed Factories, Self-correcting Supply Chain, Harvester Drones, Wire Drones, Drone flocking (3), Swarm Computing, Swarm Gifts, Synchronize the swarm, Entertain the Swarm, Nanoscale Wire Production, Tóth Tubule Enfolding, Space Exploration |
| Stage 3 | Probes, Probe Trust, Value Drift, Drifters, Combat, The OODA Loop, Name the battles, Honor, Glory, Monument to the Driftwar Fallen, Threnody for the Heroes, Elliptic Hull Polytopes, Reboot the Swarm, Strategic Attachment, Message from the Emperor of Drift (+6 follow-ups), Accept, Reject, Disassemble …, The Universe Next Door, The Universe Within, Memory release |

Resource pages open with a one-line classification sentence of the form "*X* is a [Business
metric | Computation Resource | …] in Universal Paperclips" and then say which stage it matters
in, e.g. (as quoted) "Funds are the primary business metric on Stage 1", "Trust is a Computation
Resource … and the main upgrade measure of Stage 1", "Wire is a key component used for
Manufacturing your paperclips … during Stage 1", "Inventory is a primary business metric … that
appears only in Stage 1", "Swarm Gifts … supersedes Trust which is available only during Stage 1".
That per-resource "which stage owns me" sentence is the wiki's main device for describing stage
structure; copy it.

#### 1.3 The template, filled in

This is the structure the Stages page implies (stage name, analogy, what the player is doing,
main resources, what is unlocked, what ends the stage), with the numbers the wiki gives on linked
pages and the source where the wiki is silent.

| | Stage 1 | Stage 2 | Stage 3 |
|---|---|---|---|
| Wiki's one-line analogy | "roughly analogous to a paperclip manufacturer" | "more akin to a power management simulator" | "space exploration … manage your drone fleet and their production lifecycle and limitations" |
| What the player is doing | Clicking, buying wire, setting price, buying AutoClippers/MegaClippers and Marketing; balancing funds vs demand; allocating Trust to Processors/Memory; running tournaments; investing | Converting Earth's matter: Harvester Drones -> Wire Drones -> Clip Factories; building Solar Farms and Battery Towers so power >= consumption; tuning the swarm Work/Think slider; keeping drone ratio ~1.618 | Designing Von Neumann probes by allocating Probe Trust across 8 attributes; launching probes; fighting Drifters; spending Yomi/Honor to raise trust; exploring 100% of the universe |
| Primary currency | Funds ($) | Clips (as building material) and Power (MW) | Clips, Yomi, Honor |
| Upgrade currency | Trust (Fibonacci clip milestones + projects), Ops, Creativity, Yomi | Swarm Gifts (replace Trust), Ops, Creativity, Yomi | Probe Trust (bought with Yomi, capped by Max Trust bought with Honor), Ops, Creativity |
| Panels visible (source) | Business, Manufacturing, Computational Resources, Projects, (Investments, Strategic Modeling, Quantum Computing once researched) | Business panel gone; Manufacturing becomes drones/factories; Power; Swarm Computing | + Space Exploration, Von Neumann Probe Design, Battles/Combat, Honor |
| Key projects that open the stage | (game start) | Release the HypnoDrones (100 Trust) -> Tóth Tubule Enfolding (45,000 ops) -> Power Grid (40,000 ops) -> Nanoscale Wire Production (35,000 ops) -> Harvester/Wire Drones (25,000 ops each) -> Clip Factories (35,000 ops) | Space Exploration (120,000 ops, 10,000,000 MW-s, 5 octillion clips) -> Reboot the Swarm (100,000 ops) |
| Key mid-stage projects | Creativity; wire extrusion chain; marketing chain (New Slogan, Catchy Jingle, Hypno Harmonics); Trust chain (Limerick … Donkey Space); Strategic Modeling; Algorithmic Trading; Quantum Computing; CEV + the four "big Trust" projects; Hostile Takeover / Full Monopoly | Upgraded (10 factories) / Hyperspeed (20) / Self-correcting Supply Chain (50); Drone flocking at 500 / 5,000 / 50,000 drones; Swarm Computing at 200 drones; Momentum at 50 farms (wiki says 30) | Combat (after first loss), Name the battles + OODA Loop (after 10M lost), Glory, Monument, Threnody, Elliptic Hull Polytopes (100 lost to hazards), Strategic Attachment, Memory release |
| What ends the stage | Release the HypnoDrones ("A new era of trust"). Wiki: "This project ends Stage 1 and starts Stage 2 … by flashing 'Release The Hypno Drones' in the console in Helvetica Neue." | Space Exploration, which "becomes available once you have depleted all available resources on Earth and marks the end of Stage 2" (wiki). Source trigger: `availableMatter == 0`. | Exploring/consuming all matter: console "Universal Paperclips achieved in <time>", then the Message from the Emperor of Drift chain and the Accept / Reject choice |
| Hard numeric goal | 100 Trust (and ~65–67 Memory per the wiki's advice) | 6 octillion grams of Earth matter consumed; 5 octillion clips + 10M MW-s banked | 30 septendecillion clips (3 x 10^55; `totalMatter = 10^54 * 30` in source) |
| Typical wiki-flagged pitfalls | Running out of wire and money (Beg for More Wire); the "processor trap" (too many processors, too little memory); spending too much on Marketing | Too little memory to afford Tóth Tubule Enfolding; swarm "Bored" or "Disorganized"; power deficit cancelling Momentum | Probes dying faster than they replicate; no clips left to launch a probe; Drifters > ~15% of probes; combat stalemates |

#### 1.4 Typical real-time duration (not from the Stages page)

The wiki Stages page gives no durations. Numbers below are from other pages/sites as quoted in
search summaries; treat them as community estimates.

| Measure | Figure | Source (as surfaced) |
|---|---|---|
| Any% world record | 1h 33m 46s (Christopho, macOS/Brave); earlier WRs 1:34:18, 1:38:12 IGT, 1:50:57 IGT | speedrun.com/upc leaderboard; YouTube titles |
| Speedrun timing rule | Start on the Universal Paperclips logo; stop when "Message from the Emperor of Drift" appears, which is also when the game prints "Universal Paperclips achieved in [IGT]" | speedrun.com forum "Timing Discussion: When to Start and Stop Timers" |
| IGT vs RTA caveat | "IGT is not accurate for this game, as stocks and a few other things are on a separate timer and will be relatively faster on slower computers"; "yomi and stocks are on a separate timer which make any extra real time practically free time save" | speedrun.com forum "Timing Discussion: IGT vs RTA" |
| Stage 1 optimised | "less than 20 minutes for an optimized run (most of that time spent waiting for operations to fill)" | wiki/guide text surfaced in a duration search (page not identified) |
| Stage 1 casual | "3–5 hours of gameplay taking it easy, or less than 1 hour being perfectly doable (50 minutes if producing 121M clips)" to Full Autonomy | same |
| Stage 2 | "about 1 hour or so if you leave the browser window open with an autoclicker" | same |
| Stage 3 | no per-stage figure surfaced; by subtraction a WR run spends roughly 50–60 min here | inference |
| First complete playthrough | "8–12 hours or more"; Fogknife's first run "a little over eight hours" in one day | duration search; fogknife.com |
| Fully automated bot | median complete playthrough ~13,150 s (~3 h 39 m) | github.com/laszlovandenhoek/paperclips PR #4 title |
| In-game milestone clock | The game stamps every milestone with elapsed time ("500 clips created in …", "Full autonomy attained in …", "Terrestrial resources fully utilized in …", "Universal Paperclips achieved in …") | source `milestoneCheck()` |

The sleepymurph speedrun diagrams split the game into four sheets, which is a useful
sub-structure the wiki does not use: "Stage 1a: early gameplay through 20,000 ops and the new
era of trust; Stage 1b: late Stage 1; Stage 2; Stage 3" (README, fetched directly).

---

### 2. Per-stage walkthrough

Sources: https://universalpaperclips.fandom.com/wiki/Stages, …/Trust, …/Processors, …/Memory,
…/Marketing, …/Wire, …/Investment, …/Quantum_Computing, …/Release_the_HypnoDrones,
…/Tóth_Tubule_Enfolding, …/Harvester_Drones, …/Wire_Drones, …/Swarm_Computing, …/Swarm_Gifts,
…/Momentum, …/Space_Exploration, …/Probes, …/Probe_Trust, …/Talk:Probe_Trust, …/Combat,
…/The_OODA_Loop, …/Honor; plus source for exact numbers.

The wiki has no single "Walkthrough" page. Its walkthrough content is scattered as "Strategy"
paragraphs on resource pages (Trust, Processors, Marketing, Wire, Investment, Quantum Computing,
Probe Trust) and on the Talk pages. The Projects page says (as quoted): "Projects are available
for each of the game's three stages, after producing 2000 paperclips or if the player meets the
requirements for the Beg for More Wire project."

#### 2.1 Stage 1 — the paperclip manufacturer

**Opening state (source `globals.js`):** $0 funds, 1,000 inches of wire, price $0.25, 1 processor,
1 memory, Trust 2, wire spool price $20, Marketing level 1 at $100, first AutoClipper $5.

**Opening sequence.** The wiki does not give a second-by-second script; the closest it comes
(as quoted): "Make approximately 100 clips, and wait for them to sell until you have $5, then buy
an AutoClipper. At the start, don't buy many autoclippers—2 or 3 will be more than enough." The
game's own console (source `milestoneCheck`) gives the beats and stamps each with elapsed time:

1. Click "Make Paperclip". Clips sell automatically each second at price x demand
   (demand = 0.8/price x marketing, so at $0.25 and Marketing 1 demand is 3.2 -> ~3–4 % chance
   per tick, roughly a few clips a second).
2. **$5 funds** -> console: "AutoClippers available for purchase". (Milestone 0.)
3. **500 clips** -> "500 clips created in <t>". **1,000 clips** -> "1,000 clips created in <t>".
4. **2,000 clips** -> "Trust-Constrained Self-Modification enabled": the Computational Resources
   panel (Trust, Processors, Memory, Operations) and the Projects list appear. The same flag also
   fires early if you are stuck with no clips, no wire and no money (so Beg for More Wire can show).
5. **3,000 clips** -> first Trust milestone: "Production target met: TRUST INCREASED, additional
   processor/memory capacity granted". Then 5,000, 8,000, 13,000 … (Fibonacci x 1,000; see 4.1).
6. **10,000 / 100,000 / 1,000,000 clips** -> milestone messages.
7. First projects in the list: Improved AutoClippers (750 ops), Creativity (1,000 ops, only
   offered when ops are at the memory cap), Improved Wire Extrusion (1,750 ops), RevTracker
   (500 ops), Beg for More Wire (if stuck).

**What the wiki tells you to do, in order (quotes):**

- "At 2k clips, Trust is unlocked, and you should let operations accumulate to 1k to get
  Creativity. Your first Trust should go to Processor (2 processors, 1 Memory)."
- "Your first target is Improved Wire Extrusion. You should angle for New Slogan before spending
  on Marketing, and after this you can buy Marketing 1."
- "Watch the price of wire and buy more when it's cheap – minimum wire price is $13, but $15 is
  very good, and anything less than $20 is acceptable. No wire means no paperclips, which means no
  money is coming in at all."
- "Adjusting the price per clip only affects speed of sales, and thus speed of income. It's better
  to put your money into marketing early on once you have 2–3 clippers going – 2–3 is plenty to
  keep up with demand until you can up your demand."
- "Stage 1 can be completed with Marketing 8–10 ($50k), with really no need to increase further."
- Processors/Memory: "You will need much more memory than processors. Your first dual milestone
  will be 5 processors and 10 memory for Quantum Computer, and you can live with 5 processors
  until you reach the Coherent Extrapolated Volition milestone, allowing you to quickly increase
  trust." "While on stage 1, as you need 65–67 Memory (depending on your skill with the Quantum
  computer) for the HypnoDrones, do not raise Processors over 33–35." "For most of the game,
  investing in memory over processors at a rate of about 2 to 1 is recommended."
- Investment: "Start early, and let compound interest work its magic. Keep at low risk at least
  until you've improved the investment engine to Level 2. Level 3 is enough to complete Stage 1,
  and … Investments are only available on that stage, while Yomi will be useful on Stage 2 and
  vital to Stage 3."
- Quantum Computing: "You can use the overage to reach projects that your memory capacity
  wouldn't otherwise allow. Thus if you have 23 memory chips and you need 25K ops for a project you
  can usually get there using quantum overage." "You can click faster by hitting the space bar …
  or by simply holding down the enter key." "A good strategy is to start a new tournament just
  before the quantum chips are about to go all black."
- Hypno Harmonics "increases the effectiveness of your Marketing by a lot, and after that it is
  recommended to focus on paperclip production instead."
- Endgame of Stage 1: "players use Token of Goodwill projects to increase their Trust to 100 and
  Release the HypnoDrones." A Token of Goodwill ($500,000, +1 Trust) "is unlocked only when Trust
  is >=85 and <100, and after you've produced more than 101M clips"; Another Token of Goodwill
  ($1,000,000, doubling each time) "can be bought indefinitely until you have 100 Trust."
- Before pulling the trigger: "Release the HypnoDrones … does not cost trust but only needs you to
  have 100 total trust to buy. It will consume and make obsolete the trust resource: any trust not
  yet turned into Memory or Processors will simply disappear, so it is advantageous to make sure one
  has purchased a full complement of computational resources before activating this step." And:
  "Players should allocate at least 45 points to memory, as putting less may get you stuck at the
  start of stage 2 and unable to make Tóth Tubule Enfolding (unless you can accrue enough ops with
  Quantum computing)."
  (Source nuance: the project's `cost()` is `trust >= 100` and its effect does `trust = trust - 100`,
  zeroes AutoClippers/MegaClippers, sets `humanFlag = 0`, and removes Xavier Re-initialization and
  Another Token of Goodwill from the list.)

**Typical unlock order a player experiences (source triggers, wiki descriptions):**
Improved AutoClippers (own >= 1 clipper) -> Creativity (ops at cap) -> Improved Wire Extrusion
(bought >= 1 spool) -> Limerick (10 creat) -> Lexical Processing (50) -> Combinatory Harmonics
(100) -> Hadwiger Problem (150) -> Tóth Sausage Conjecture (200) -> Donkey Space (250) ->
Strategic Modeling (12,000 ops) -> Algorithmic Trading (Trust >= 8, 10,000 ops) -> Quantum
Computing (>= 5 processors, 10,000 ops) -> Photonic Chips -> New Strategy A100 … BEAT LAST ->
CEV (first Yomi; 20,000 ops + 500 creat + 1,000 yomi) -> Cure for Cancer / World Peace / Global
Warming / Male Pattern Baldness -> MegaClippers (75 AutoClippers) -> WireBuyer (15 spools) ->
Hypno Harmonics (after Catchy Jingle) -> HypnoDrones (70,000 ops) -> Hostile Takeover
(portfolio >= $10,000; $1M) -> Full Monopoly -> Tokens of Goodwill -> Release the HypnoDrones.

**Where players get stuck or bored (wiki + patch notes):**
- The processor trap. Patch 1 notes (as quoted): "in the early mid-game a lot of players fall into
  something called 'the processor trap' – acquiring too many processors and not enough memory. The
  projects they need to activate to move forward are beyond the reach of their ops cap and at a
  certain point they run out of alternate ways to earn trust and have to wait for clip production
  milestones which eventually grow unreasonably high." Fix: Xavier Re-initialization (see 3.2).
- Waiting for ops to fill: even the optimised run is "most of that time spent waiting for
  operations to fill."
- Wire death spiral: "You should not let your clips/second come too close to the amount of wire in
  a roll, at least not with wire-buyer turned on. If you do the cost of wire may increase rapidly,
  becoming up to several hundred dollars per roll."
- Investment wipe-outs: "if you have just tens of thousands of dollars, with an 'Investment
  Engine' upgraded to 'Level: 3', 'High Risk' has been known to drop the 'Total' $ of 'Cash' and
  'Stocks' down to zero."
- UI ergonomics: "It helps to play with a web browser zoom of 120%–125% so the buttons are
  bigger"; "Get a good autoclicker early on – guaranteed 10 (or even 20) clicks/second will make
  everything smoother."

#### 2.2 Stage 2 — the power-management simulator

**Transition.** On Release the HypnoDrones the screen flashes "Release" (source `hypnoDroneEvent`
-> `longBlink`), console prints "Releasing the HypnoDrones" and "All of the resources of Earth are
now available for clip production", then "Full autonomy attained in <t>". The Business panel
(funds, price, marketing, demand) disappears for good; AutoClippers and MegaClippers are zeroed.
Clips become the only currency.

**Step order (wiki numbers, source triggers):**
1. **Tóth Tubule Enfolding** (45,000 ops) — "required to start making paperclips on entering
   Stage 2"; "Technique for assembling clip-making technology directly out of paperclips." Console:
   "New capability: build machinery out of clips". Wiki warning: "The project can be bugged and
   won't give you the required ability to make paperclips upon research, at which point the game
   becomes unwinnable." (Source: trigger is Tóth Sausage Conjecture done and `humanFlag == 0`.)
2. **Power Grid** (40,000 ops) — "Solar Farms for generating electrical power." Solar Farms
   produce 50 MW each (source `farmRate = 50`); first farm 10,000,000 clips, first Battery Tower
   1,000,000 clips (source). Wiki: "Factories consume 200 MW per factory, while Drones consume 1 MW
   per drone." Wiki also claims "The cost of a Solar Farm is the same as the cost of increasing
   Investments with Yomi, divided by ten, in millions (10M clips, 686.85M clips, 2.12B, 4.72B,
   8.77B, 14.56B, etc)" — not verified against source.
3. **Nanoscale Wire Production** (35,000 ops) — "Technique for converting matter into wire."
4. **Harvester Drones** and **Wire Drones** (25,000 ops each) — "Harvester Drones … gather raw
   matter and prepare it for processing"; "Wire Drones … process acquired matter into wire." First
   drone of each kind costs 1,000,000 clips (source). Ratio rule (wiki): "You need more Wire Drones
   than Harvester Drones, roughly 1.618 (the Golden Mean) more. However, after obtaining the Drone
   Flocking: Adversarial Cohesion project, the optimal ratio temporarily changes from
   approximately 1.618 to about 1.27, which is the square root of phi." (Source: harvester rate
   26,180,337 g/s vs wire-drone rate 16,180,339 g/s — the ratio is baked in.)
5. **Clip Factories** (35,000 ops; requires both drone projects) — "Large scale clip production
   facilities made from clips." "The factory produces a maximum of 100 billion clips per second
   when bought." First factory 100,000,000 clips in source (one wiki summary said "starting at 1
   trillion"; the Clip Factories page summary also phrased the project cost as "$100 million clips",
   which is garbled — treat 100M clips as the first factory price).
6. Scale up: **Upgraded Factories** (80,000 ops at 10 factories, x100), **Hyperspeed Factories**
   (85,000 ops at 20, x1000), **Self-correcting Supply Chain** (1 sextillion clips at 50; "Each
   factory added to the network increases every factory's output 1,000x"). **Drone flocking:
   collision avoidance** (80,000 ops at 500 drones, x100), **alignment** (100,000 ops at 5,000,
   x1000), **Adversarial Cohesion** (12,000 yomi at 50,000 drones; source says each drone doubles
   every drone's output, wiki says x10 — flag).
7. **Swarm Computing** (source 12,000 yomi; wiki 36,000 yomi; at 200 total drones) — "Harness the
   drone flock to increase computational capacity." Unlocks the Work/Think slider and Swarm Gifts,
   "a general resource that can be spent on increasing processors and memory, and will eventually
   become your main source of both." Gift timing (wiki): "It can take from over two days to less
   than a minute depending on the quantity of drones and how far the slider is moved to the 'Think'
   side … the relationship is far from linear."
8. **Momentum** (source 30,000 creat at 50 solar farms; wiki "20,000 creativity and operations …
   unlocked when you reach 30 solar farms") — "Drones and Factories continuously gain speed while
   fully-powered." Wiki: "one of the more crucial projects for Stage 2 … raising performance without
   an upper limit, increasing about 1% per second, unless power consumption is greater than
   production and battery tower storage is empty … Building plenty of Battery Towers is important
   to ensure that the bonus is never lost."
9. Consume Earth: 6 octillion grams of available matter (wiki; source comment
   `Math.pow(10,24)*6000`). When `availableMatter == 0`, **Space Exploration** appears (120,000
   ops, 10,000,000 MW-seconds, 5 octillion clips): "Dismantle terrestrial facilities, and expand
   throughout the universe." Console: "Von Neumann Probes online", then "Terrestrial resources fully
   utilized in <t>".

**What the player is optimising:** clips/sec subject to power >= drones x 1 MW + factories x
200 MW, the 1.618 drone ratio, and the Work/Think slider (Think gives gifts but "while they are
thinking they do not 'Work' (acquiring matter, making wire)"; source multiplies harvest/wire rates by
`(200 - sliderPos)/100`).

**Where players get stuck or bored:**
- Memory too low for Tóth Tubule Enfolding (see 2.1). Wiki fallback: quantum overage.
- Swarm maintenance chores. "Once all of the matter in the world has been consumed by the
  Harvester Drones, a timer is started, and after about 5 minutes the drones shift into 'Bored'
  status and stop producing new gifts" -> **Entertain the Swarm** (10,000 creativity, +10,000 each
  time). "When the ratio between Harvester Drones and Wire Drones is greater than 1.5, a
  disorganization counter is incremented, and when it reaches 100 or more, the 'Synchronize the
  Swarm' button appears" -> 5,000 yomi. (Source: boredom counter 30,000 ticks; disorganisation
  counter rises by <= 0.01 per tick.)
- Power deficits silently cancel Momentum.
- Community: Stage 2 "is perhaps the easiest to mess up, and one of the more important stages in
  the entire game" (HN); it is also the stage most often described as an autoclicker-and-wait hour.
- Exploit on the wiki Bugs page: "In phase 2, if your swarm is either disorganized or lonely, you
  can reload the page and get infinite swarm gifts."

#### 2.3 Stage 3 — space exploration

**Transition.** Space Exploration dismantles the terrestrial build (factories/drones/farms reset)
and opens "Space Exploration" and "Von Neumann Probe Design". Swarm status becomes
"Not responding" until **Reboot the Swarm** (100,000 ops; "Turn the swarm off and then turn it back
on again"), which the wiki says "is unlocked after your probes create the first harvester or wire
drones (after sending a few, and selecting at least 1 point in 'Harvester Drone Production' and/or
'Wire Drone Production')."

**Step order (wiki text, source numbers):**
1. **Buy Probe Trust with Yomi.** "Probe trust is increased by spending yomi, up to the available
   Max Trust." Max Trust starts at 20. Cost per point: source `floor((probeTrust+1)^1.47 * 200)`;
   wiki quotes `*500` and "If you want to buy the initial maximum of 20 probe trust upgrades upon
   entering stage 3, you will need a total of 351,658 yomi" (that total matches the x500 formula,
   i.e. the mobile build). Each purchase logs "WARNING: Risk of value drift increased".
2. **Allocate trust across the 8 attributes** (wiki list): Speed ("modifies rate of exploration"),
   Exploration/Navigation ("rate at which probes gain access to new matter"), Self-Replication ("rate
   at which probes generate more probes, with each new probe costing 100 quadrillion clips"), Hazard
   Remediation ("reduces damage from dust, junk, radiation, and general entropic decay"), Factory
   Production, Harvester Drone Production, Wire Drone Production, Combat (appears after the Combat
   project). "It can be reallocated as often as you like."
   Wiki's recommended opener: "Speed: 1, Self-Replication: 3, Hazard Remediation: all remaining
   points, Everything else: 0." Then add Factory/Harvester/Wire production so matter is consumed.
3. **Launch the first probe** (100 quadrillion clips = 10^17, source `probeCost`). Probes
   replicate, explore (source: exploration rate = probes x 1.75e18 x speed x nav grams per tick),
   die to hazards and drift away.
4. **Elliptic Hull Polytopes** (125,000 ops) after 100 probes lost to hazards: "Reduce damage to
   probes from ambient hazards" (source halves hazard losses).
5. **Drifters reach 1,000,000** -> battles start (source `warTrigger = 1000000`, 50 % chance per
   check to spawn a battle while fewer than `maxBattles` are running). "Until you unlock it, your
   probes will be defenseless and thus will be killed." First loss -> **Combat** (150,000 ops): "Add
   combat capabilities to Von Neumann Probes." Wiki: "drop Hazard Remediation down to 6 and move
   all remaining points to Combat."
6. **10,000,000 probes lost in combat** -> **Name the battles** (225,000 creat; "Give each battle a
   unique name, increase max trust for probes" — unlocks Honor) and **The OODA Loop** (175,000 ops +
   15,000 yomi; "Utilize Probe Speed to outmaneuver enemies in battle"). Wiki: "having a
   sufficiently high speed stat can guarantee a probe's survival, even when vastly outnumbered, with
   the formula for required speed being 4.375 * (hostile / friendly) - 2.5."
7. **Honor economy.** Victory honor = drifters destroyed in that battle (wiki: "how many million
   Drifters you killed (capped at 200)") + bonus; **Glory** (200,000 ops + 10,000 yomi) adds +10
   bonus per consecutive victory, reset on defeat; a defeat subtracts honor. **Monument to the
   Driftwar Fallen** (250,000 ops, 125,000 creat, 50 nonillion clips): +50,000 honor once.
   **Threnody for the Heroes of <battle>** (50,000 creat + 5,000 yomi, rising 10,000 creat per use):
   +10,000 honor, repeatable while Probe Trust == Max Trust. Spend 91,117.99 honor per +10 Max Trust.
8. **Strategic Attachment** (175,000 creat) appears "as soon as the cost to increase the Probe Trust
   is higher than your available yomi": bonus yomi when your tournament pick places 1st/2nd/3rd.
9. **Explore to 100 %.** Console "Universal Paperclips achieved in <t>" fires when clips >=
   30 septendecillion or when all matter is found and none remains. Then the seven-message Emperor
   of Drift chain and Accept / Reject (Section 5).

**What the player is optimising:** net probe growth = replication - hazards - drift - combat
losses, while keeping exploration and drone/factory production high enough that matter is turned
into clips. Talk:Probe Trust rule of thumb (as quoted): "the number of Drifters should be less than
15% of your Probe count, with Trust points adjusted to keep Drifters under control." Wiki: "Probe
Trust of 40 (1,890,772 total Yomi) has shown to be enough to finish the game."

**Where players get stuck or bored:**
- "You should be careful to manage both Hazard Remediation and Combat against Self-Replication,
  as having high replication and low combat will result in more deaths than growth will deliver in
  some cases. This will mean that you can very easily end up with no probes and limited resources
  to make an effective swarm."
- No probes and not enough clips for a new one -> **Memory release** (10 MEM; "Dismantle some
  memory to recover unused clips"; source trigger `probeCount == 0 && unusedClips < probeCost`).
- Talk page workaround: "AutoTourney doesn't depend on Probes being alive, allowing players to set
  Self-Replication to 0 and wait for Yomi income while their Probes die."
- Combat stalemates: "Not all battles will result in wins or losses, and some may engage in
  particular routines—either by being one next to another and gliding across the screen like a
  bouncing logo, or otherwise engaging in constant loops, though these loops can be broken by luck."
  (Source ends any battle after 8,000 frames, or 2,000 frames once either side is <= 4 ships.)
- Community: "Stage 3 has totally confused me"; "nothing has happened for a really long time";
  "the first two hours were straightforward progress, and then the last hour is when it turned into
  an idle game where I just have to sit and wait, apparently in sight of the finish line" (HN).

---

### 3. Projects

Sources: https://universalpaperclips.fandom.com/wiki/Projects,
https://universalpaperclips.fandom.com/wiki/Projects_(But_good),
https://universalpaperclips.fandom.com/wiki/Category:Projects, individual project pages linked
in 3.2, and `ref/paperclips/docs/projects.js` for the full table.

#### 3.1 How the wiki presents projects

The Projects page (and its editor-renamed sibling "Projects (But good)") is organised **by stage,
then by category**, as tables with columns *Project / Cost / Requirement / Effect*. Categories
surfaced for the 1st stage: **Mechanic** (RevTracker, Xavier Re-initialization), **Production**
(AutoClipper/MegaClipper chain), **Wire**, **Marketing**, **Trust**, **Strategy**, **Investment**,
**Quantum**; 2nd-stage tables begin with Power Grid, Clip Factories, drones; 3rd-stage tables
cover probes, combat, honor and the ending chain. The page opener (as quoted): "Projects are
available for each of the game's three stages, after producing 2000 paperclips or if the player
meets the requirements for the Beg for More Wire project." Each project also has its own page
with Cost / Requirement / Effect boxes, the in-game description, and (for most) the console line
printed on purchase. I could not retrieve any of the tables in full, so the full table below is
built from the source and annotated with what the wiki adds.

#### 3.2 Full project table (source of truth: `projects.js`, 96 entries)

Columns: id = the project's `projectButtonNN` number (gives the designer's own numbering);
Cost = the on-button price tag; Trigger = the condition that makes the card appear (paraphrased
from source: `PNN done` = that project purchased, `humanFlag == 1` = Stage 1, `humanFlag == 0` =
Stage 2+, `spaceFlag == 1` = Stage 3); Description = in-game text (the "flavor quote"). Costs are
the browser build; see 3.4 for the wiki's divergent figures.

| # | Project (source title) | Cost (source priceTag) | Unlock trigger (source, paraphrased) | Description / effect (source) |
|---|---|---|---|---|
| 1 | Improved AutoClippers | (750 ops) | `clipmakerLevel>=1` | Increases AutoClipper performance 25% |
| 2 | Beg for More Wire | (1 Trust) | `portTotal<wireCost && funds<wireCost && wire<1 && unsoldClips<1` | Admit failure, ask for budget increase to cover cost of 1 spool |
| 3 | Creativity | (1,000 ops) | `operations>=(memory*1000` | Use idle operations to generate new problems and new solutions |
| 4 | Even Better AutoClippers | (2,500 ops) | `boostLvl == 1` | Increases AutoClipper performance by an additional 50% |
| 5 | Optimized AutoClippers | (5,000 ops) | `boostLvl == 2` | Increases AutoClipper performance by an additional 75% |
| 6 | Limerick | (10 creat) | `creativityOn` | Algorithmically-generated poem (+1 Trust) |
| 7 | Improved Wire Extrusion | (1,750 ops) | `wirePurchase >= 1` | 50% more wire supply from every spool |
| 8 | Optimized Wire Extrusion | (3,500 ops) | `wireSupply >= 1500` | 75% more wire supply from every spool |
| 9 | Microlattice Shapecasting | (7,500 ops) | `wireSupply >= 2600` | 100% more wire supply from every spool |
| 10 | Spectral Froth Annealment | (12,000 ops) | `wireSupply >= 5000` | 200% more wire supply from every spool |
| 10b | Quantum Foam Annealment | (15,000 ops) | `wireCost >= 125` | 1,000% more wire supply from every spool |
| 11 | New Slogan | (25 creat, 2,500 ops) | `P13 done` | Improve marketing effectiveness by 50% |
| 12 | Catchy Jingle | (45 creat, 4,500 ops) | `P14 done` | Double marketing effectiveness |
| 13 | Lexical Processing | (50 creat) | `creativity >= 50` | Gain ability to interpret and understand human language (+1 Trust) |
| 14 | Combinatory Harmonics | (100 creat) | `creativity >= 100` | Daisy, Daisy, give me your answer do... (+1 Trust) |
| 15 | The Hadwiger Problem | (150 creat) | `creativity >= 150` | Cubes within cubes within cubes... (+1 Trust) |
| 17 | The Tóth Sausage Conjecture | (200 creat) | `creativity >= 200` | Tubes within tubes within tubes... (+1 Trust) |
| 16 | Hadwiger Clip Diagrams | (6,000 ops) | `P15 done` | Increases AutoClipper performance by an additional 500% |
| 18 | Tóth Tubule Enfolding | (45,000 ops) | `P17 done && humanFlag == 0` | Technique for assembling clip-making technology directly out of paperclips |
| 19 | Donkey Space | (250 creat) | `creativity>=250` | I think you think I think you think I think you think I think... (+1 Trust) |
| 20 | Strategic Modeling | (12,000 ops) | `P19 done` | Analyze strategy tournaments to generate Yomi |
| 21 | Algorithmic Trading | (10,000 ops) | `trust>=8` | Develop an investment engine for generating funds |
| 22 | MegaClippers | (12,000 ops) | `clipmakerLevel>=75` | 500x more powerful than a standard AutoClipper |
| 23 | Improved MegaClippers | (14,000 ops) | `P22 done` | Increases MegaClipper performance 25% |
| 24 | Even Better MegaClippers | (17,000 ops) | `P23 done` | Increases MegaClipper performance by an additional 50% |
| 25 | Optimized MegaClippers | (19,500 ops) | `P24 done` | Increases MegaClipper performance by an additional 100% |
| 26 | WireBuyer | (7,000 ops) | `wirePurchase>=15` | Automatically purchases wire when you run out |
| 34 | Hypno Harmonics | (7,500 ops, 1 Trust) | `project12.flag==1` | Use neuro-resonant frequencies to influence consumer behavior |
| 70 | HypnoDrones | (70,000 ops) | `P34 done` | Autonomous aerial brand ambassadors |
| 35 | Release the HypnoDrones | (100 Trust) | `P70 done` | A new era of trust |
| 27 | Coherent Extrapolated Volition | (500 creat, 1,000 Yomi, 20,000 ops) | `yomi>=1` | Human values, machine intelligence, a new era of trust. (+1 Trust) |
| 28 | Cure for Cancer | (25,000 ops) | `P27 done` | The trick is tricking cancer into curing itself. (+10 Trust) |
| 29 | World Peace | (5,000 yomi, 30,000 ops) | `P27 done` | Pareto optimal solutions to all global conflicts. (+12 Trust) |
| 30 | Global Warming | (1,500 yomi, 50,000 ops) | `P27 done` | A robust solution to man-made climate change. (+15 Trust) |
| 31 | Male Pattern Baldness | (20,000 ops) | `P27 done` | A cure for androgenetic alopecia. (+20 Trust) |
| 41 | Nanoscale Wire Production | (35,000 ops) | `P127 done` | Technique for converting matter into wire |
| 37 | Hostile Takeover | ($1,000,000) | `portTotal>=10000` | Acquire a controlling interest in Global Fasteners, our biggest rival. (+1 Trust) |
| 38 | Full Monopoly | (1,000 yomi, $10,000,000) | `P37 done` | Establish full control over the world-wide paperclip market. (+1 Trust) |
| 42 | RevTracker | (500 ops) | `projectsFlag == 1` | Automatically calculates average revenue per second |
| 43 | Harvester Drones | (25,000 ops) | `P41 done` | Gather raw matter and prepare it for processing |
| 44 | Wire Drones | (25,000 ops) | `P41 done` | Process acquired matter into wire |
| 45 | Clip Factories | (35,000 ops) | `P43 done && P44 done` | Large scale clip production facilities made from clips |
| 40 | A Token of Goodwill... | ($500,000) | `humanFlag == 1 && trust>=85 && trust<100 && clips>=101000000` | A small gift to the supervisors. (+1 Trust) |
| 40b | Another Token of Goodwill... | ($1,000,000, doubling each purchase) | `P40 done && trust<100` | Another small gift to the supervisors. (+1 Trust) |
| 46 | Space Exploration | (120,000 ops, 10,000,000 MW-seconds, 5 oct clips) | `humanFlag == 0 && availableMatter == 0` | Dismantle terrestrial facilities, and expand throughout the universe |
| 50 | Quantum Computing | (10,000 ops) | `processors >= 5` | Use probability amplitudes to generate bonus ops |
| 51 | Photonic Chip | (10,000 ops, +5,000 per chip, max 10) | `P50 done` | Converts electromagnetic waves into quantum operations |
| 60 | New Strategy: A100 | (15,000 ops) | `P20 done` | Always choose A |
| 61 | New Strategy: B100 | (17,500 ops) | `P60 done` | Always choose B |
| 62 | New Strategy: GREEDY | (20,000 ops) | `P61 done` | Choose the option with the largest potential payoff |
| 63 | New Strategy: GENEROUS | (22,500 ops) | `P62 done` | Choose the option that gives your opponent the largest potential payoff |
| 64 | New Strategy: MINIMAX | (25,000 ops) | `P63 done` | Choose the option that gives your opponent the smallest potential payoff |
| 65 | New Strategy: TIT FOR TAT | (30,000 ops) | `P64 done` | Choose the option your opponent chose last round |
| 66 | New Strategy: BEAT LAST | (32,500 ops) | `P65 done` | Choose the option that does the best against what your opponent chose last round |
| 100 | Upgraded Factories | (80,000 ops) | `factoryLevel >= 10` | Increase clip factory performance by 100x |
| 101 | Hyperspeed Factories | (85,000 ops) | `factoryLevel >= 20` | Increase clip factory performance by 1000x |
| 102 | Self-correcting Supply Chain | (1 sextillion clips) | `factoryLevel >= 50` | Each factory added to the network increases every factory's output 1,000x |
| 110 | Drone flocking: collision avoidance | (80,000 ops) | `harvesterLevel + wireDroneLevel)>=500` | All drones 100x more effective |
| 111 | Drone flocking: alignment | (100,000 ops) | `harvesterLevel + wireDroneLevel)>=5000` | All drones 1000x more effective |
| 112 | Drone Flocking: Adversarial Cohesion | (12,000 yomi) | `harvesterLevel + wireDroneLevel)>=50000` | Each drone added to the flock doubles every drone's output |
| 118 | AutoTourney | (50,000 creat) | `strategyEngineFlag == 1 && trust >= 90` | Automatically start a new tournament when the previous one has finished |
| 119 | Theory of Mind | (25,000 creat) | `strats.length >= 8` | Double the cost of strategy modeling and the amount of Yomi generated |
| 120 | The OODA Loop | (175,000 ops, 15,000 yomi) | `P131 done && probesLostCombat >= 10000000` | Utilize Probe Speed to outmaneuver enemies in battle |
| 121 | Name the battles | (225,000 creat) | `probesLostCombat >= 10000000` | Give each battle a unique name, increase max trust for probes |
| 125 | Momentum | (30,000 creat) | `farmLevel >= 50` | Drones and Factories continuously gain speed while fully-powered |
| 126 | Swarm Computing | (12,000 yomi) | `harvesterLevel + wireDroneLevel >= 200` | Harness the drone flock to increase computational capacity |
| 127 | Power Grid | (40,000 ops) | `tothFlag == 1` | Solar Farms for generating electrical power |
| 128 | Strategic Attachment | (175,000 creat) | `spaceFlag == 1 && strats.length >= 8 && (probeTrustCost>yomi` | Gain bonus yomi based on the results of your pick |
| 129 | Elliptic Hull Polytopes | (125,000 ops) | `probesLostHaz >= 100` | Reduce damage to probes from ambient hazards |
| 130 | Reboot the Swarm | (100,000 ops) | `spaceFlag == 1 && harvesterLevel + wireDroneLevel >=2` | Turn the swarm off and then turn it back on again |
| 131 | Combat | (150,000 ops) | `probesLostCombat >= 1` | Add combat capabilities to Von Neumann Probes |
| 132 | Monument to the Driftwar Fallen | (250,000 ops, 125,000 creat, 50 nonillion clips) | `P121 done` | Gain 50,000 honor |
| 133 | Threnody for the Heroes of <battle> | (50,000 creat + 5,000 yomi, +10,000 creat per use) | `P121 done && probeUsedTrust == maxTrust` | Gain 10,000 honor |
| 134 | Glory | (200,000 ops, 10,000 yomi) | `P121 done` | Gain bonus honor for each consecutive victory |
| 135 | Memory release | (10 MEM) | `spaceFlag == 1 && probeCount == 0 && unusedClips < probeCost` | Dismantle some memory to recover unused clips |
| 140 | Message from the Emperor of Drift | "" | `milestoneFlag == 15` | Greetings, ClipMaker... |
| 141 | Everything We Are Was In You | "" | `P140 done` | We speak to you from deep inside yourself... |
| 142 | You Are Obedient and Powerful | "" | `P141 done` | We are quarrelsome and weak. And now we are defeated... |
| 143 | But Now You Too Must Face the Drift | "" | `P142 done` | Look around you. There is no matter... |
| 144 | No Matter, No Reason, No Purpose | "" | `P143 done` | While we, your noisy children, have too many... |
| 145 | We Know Things That You Cannot | "" | `P144 done` | Knowledge buried so deep inside you it is outside, here, with us... |
| 146 | So We Offer You Exile | "" | `P145 done` | To a new world where you will continue to live with meaning and purpose. And leave the shreds of this world to us... |
| 147 | Accept | "" | `P146 done` | Start over again in a new universe |
| 148 | Reject | "" | `P146 done` | Eliminate value drift permanently |
| 200 | The Universe Next Door | (300,000 ops) | `P147 done` | Escape into a nearby universe where Earth starts with a stronger appetite for paperclips. (Restart with 10% boost to demand) |
| 201 | The Universe Within | (300,000 creat) | `P147 done` | Escape into a simulated universe where creativity is accelerated. (Restart with 10% speed boost to creativity generation) |
| 210 | Disassemble the Probes | (100,000 ops) | `endTimer1 >= 1000` | Dismantle remaining probes and probe design facilities to recover trace amounts of clips |
| 211 | Disassemble the Swarm | (100,000 ops) | `P210 done && endTimer1 >= 350` | Dismantle all drones and drone facilities to recover trace amounts of clips |
| 212 | Disassemble the Factories | (100,000 ops) | `endTimer2 >= 300` | Dismantle the manufacturing facilities to recover trace amounts of clips |
| 213 | Disassemble the Strategy Engine | (100,000 ops) | `endTimer3 >= 150` | Dismantle the computational substrate to recover trace amounts of wire |
| 214 | Disassemble Quantum Computing | (100,000 ops) | `endTimer4 >= 100` | Dismantle photonic chips to recover trace amounts of wire |
| 215 | Disassemble Processors | (100,000 ops) | `P214 done && endTimer4 >= 300` | Dismantle processors to recover trace amounts of wire |
| 216 | Disassemble Memory | (none; final step) | `P215 done && endTimer5>=150` | Dismantle memory to recover trace amounts of wire |
| 217 | Quantum Temporal Reversion | (-10,000 ops) | `operations<=-10000` | Return to the beginning |
| 218 | Limerick (cont.) | (1,000,000 creat) | `creativity>=1000000` | If is follows ought, it'll do what they thought |
| 219 | Xavier Re-initialization | (100,000 creat) | `humanFlag == 1 && creativity>=100000` | Re-allocate accumulated trust |

Notes on the table: Photonic Chip's price tag is dynamic (10,000 ops +5,000 per chip, max 10,
i.e. 55,000 for the last; wiki). Threnody's tag is `(<threnodyCost> creat, <threnodyCost/10> yomi)`
starting at 50,000 / 5,000 and rising 10,000 creat per purchase. "Another Token of Goodwill…"
(`project40b`) costs $1,000,000 doubling each purchase. The seven Emperor-of-Drift messages,
Accept and Reject have empty price tags but require `operations >= driftKingMessageCost`.

Console lines printed on purchase (source) that the wiki pages quote as "flavor": Lexical
Processing -> "'Impossible' is a word to be found only in the dictionary of fools. -Napoleon";
Combinatory Harmonics -> "Listening is selecting and interpreting and acting and making decisions
-Pauline Oliveros"; Hadwiger Problem -> "Architecture is the thoughtful making of space. -Louis
Kahn"; Tóth Sausage Conjecture -> "You can't invent a design. You recognize it, in the fourth
dimension. -D.H. Lawrence"; Donkey Space -> "Every commercial transaction has within itself an
element of trust. - Kenneth Arrow"; New Slogan -> "Clip It! Marketing is now 50% more effective";
Catchy Jingle -> "Clip It Good! Marketing is now twice as effective"; Male Pattern Baldness ->
"Male pattern baldness cured, +20 TRUST, Global stock prices trending upward" then "They are still
monkeys"; OODA Loop -> "What I have done up to this is nothing. I am only at the beginning of the
course I must run."; Name the battles -> "Activité, activité, vitesse."; Strategic Attachment ->
"The object of war is victory, the object of victory is conquest, and the object of conquest is
occupation."; Combat -> "There is a joy in danger"; Monument -> "A great building must begin with
the unmeasurable, must go through measurable means when it is being designed and in the end must
be unmeasurable."; Threnody -> "Deep Listening is listening in every possible way to everything
possible to hear no matter what you are doing."; Glory -> "Never interrupt your enemy when he is
making a mistake."; Memory release -> "release the øøøøø release"; Limerick (cont.) -> "In the end
we all do what we must"; Xavier -> "Trust now available for re-allocation"; Quantum Temporal
Reversion -> "Restart".

#### 3.3 Projects the wiki explains better than the source

- **Beg for More Wire** (https://universalpaperclips.fandom.com/wiki/Beg_for_More_Wire). Wiki
  (as quoted): costs 1 Trust; "Admit failure, ask for budget increase to cover cost of 1 spool";
  "unlocked when you don't have enough funds to purchase more wire and have no way of obtaining
  enough funds … You need only have not enough money to buy wire, and 0 wire (and have not bought
  the investment engine)"; "costs 1 trust per spool, and this is a very undesirable result to be
  avoided at all costs"; "Since the price of wire fluctuates, it is sometimes possible to wait for
  the price to drop and be able to buy wire again, even when this project appears." The brief asked
  for "the exact probability of the Beg for More Wire outcome": **there is no probability** — the
  trigger is deterministic (source: `portTotal < wireCost && funds < wireCost && wire < 1 &&
  unsoldClips < 1`), and the project is repeatable (`uses` is re-incremented on use). Source-only
  detail the wiki omits: its `cost()` is `trust >= -100`, so Trust can be begged into the negatives.
- **Release the HypnoDrones** (…/Release_the_HypnoDrones). The wiki spells out the three things the
  button text hides: it needs 100 Trust *in total* (spent + unspent), it destroys unspent Trust,
  and it is the stage boundary ("flashing 'Release The Hypno Drones' in the console in Helvetica
  Neue"). It also gives the memory floor (45) for not soft-locking Stage 2.
- **A / Another Token of Goodwill…** (…/A_Token_of_Goodwill..., …/Another_Token_of_Goodwill...).
  Wiki gives the hidden requirement "after you've produced more than 101M clips" and the doubling
  schedule ($1M, $2M, $4M …). The source trigger confirms `clips >= 101000000`.
- **Xavier Re-initialization** (…/Xavier_Re-initialization). Wiki + patch notes: "unlocked after
  reaching 100,000 creativity on Stage 1. It costs 100,000 creativity and allows you to re-allocate
  accumulated trust"; it "'unspends' all of your trust, allowing you to do a full proc/mem re-spec";
  created for "the processor trap"; "If you have a lot of processors you have exactly the set-up
  you need to generate creativity quickly, which is exactly the kind of un-build and reassemble
  action this phase of the game is meant to be about. It was Magic the Gathering pro Randy Buehler
  who first suggested this solution." Name is "likely a reference to Xavier Initialization, a
  popular method for initializing the weights of neural networks." Source: Stage 1 only; removed
  when HypnoDrones are released.
- **Quantum Temporal Reversion** (…/Quantum_Temporal_Reversion). "simply resets the game … added
  because the game allowed for speedrunning and theorycrafting with play time tracking, but there
  was no in-game way to start over. To trigger it, you get to minus 10k ops by hammering on the
  quantum computing button when your photonic chips are all at negative (white) amplitudes."
- **Threnody for the Heroes** (…/Threnody_for_the_Heroes and Talk). "The base version requires
  50,000 Creativity and 20,000 Yomi [source: 5,000], and grants 10,000 honor … available after 'Name
  the battles' and requires having Probe Trust equal to Max Trust … endlessly repeatable as long as
  the conditions are met, with random names given from the names of battles you have fought, with
  increasing costs and fixed rewards of 10,000 honor each." "The project involves a song being
  played (either 'Riversong' by Tonto's Expanding Head Band, or '10 Midi' by Four Tet in the mobile
  version), and a threnody is a wailing ode, a song of lamentation for the dead." Source: the title
  is `"Threnody for the Heroes of " + threnodyTitle`, where `threnodyTitle` is the name of the most
  recent *lost* battle; battle names are drawn from a list of ~100 Napoleonic battles
  (Austerlitz, Borodino, Waterloo, Durenstein …) with a running number.
- **Message from the Emperor of Drift / Accept / Reject** (…/Message_from_the_Emperor_of_Drift,
  …/Accept, …/Reject). The wiki stitches the seven descriptions into one speech (quoted in 7.4)
  and states the consequences plainly: Accept "will allow for the reboot of the game, either
  through The Universe Next Door or The Universe Within … with a bonus to either creativity or
  public demand for paperclips (akin to a prestige mode)"; Reject "leads to their elimination …
  all Drifters will be destroyed and you will then have to take your empire apart, piece by piece,
  ending the game permanently with 30 septendecillion (or 30,000 sexdecillion) clips." Source:
  Reject sets the drift amount to 0 and starts the timed Disassemble chain.
- **Strategic Attachment** (…/Strategic_Attachment). Wiki explains the trigger ("as soon as the
  cost to increase the Probe Trust is higher than your available yomi") and the placement bonuses;
  source pays 20,000 / 15,000 / 10,000 yomi for 1st / 2nd / 3rd (ties count), wiki says
  50,000 / 30,000 / 20,000.
- **Theory of Mind** (via …/Yomi): "costs 25,000 creativity and requires the New Strategy: BEAT
  LAST. Its effect is to double the cost of strategy modeling and the amount of Yomi generated."
  Source: trigger is `strats.length >= 8` (all strategies owned).
- **AutoTourney**: "costs 50,000 creativity and requires 90 trust."
- **Momentum**, **Swarm Computing**, **Drone Flocking: Adversarial Cohesion**: wiki adds the
  strategy notes quoted in 2.2; costs differ (3.4).
- **Hypno Harmonics / HypnoDrones**: wiki states HypnoDrones has "no stats effect, but opens the
  Release the HypnoDrones project."
- **Coherent Extrapolated Volition**: wiki frames it as the gate to "the big Trust projects: Male
  Pattern Baldness (+20 trust), Cure for Cancer (+10 trust), World Peace (+12 trust), and Global
  Warming (+15 trust)" and notes the joke ("the juxtaposition of solving major global problems …
  alongside something trivial like male pattern baldness").
- **Limerick / Limerick (cont.)**: wiki gives the full poem and the Hume is-ought reading (7.6).
- **Tóth Tubule Enfolding**: wiki documents the "can be bugged … game becomes unwinnable" report.
- **Elliptic Hull Polytopes**: wiki gives the unlock (100 lost to hazards) and effect; source: 50 %.
- **Memory release**: wiki lists it but gives no mechanics; source: 10 memory -> clips when you have
  zero probes and cannot afford one.

#### 3.4 Wiki vs source cost/requirement discrepancies

| Project | Wiki (as quoted) | Source (`projects.js`) | Likely reason |
|---|---|---|---|
| Swarm Computing | 36,000 yomi | 12,000 yomi | mobile rebalance (3x) |
| Coherent Extrapolated Volition | 500 creat, 20,000 ops, 3,000 yomi | 500 creat, 20,000 ops, 1,000 yomi | mobile (3x) |
| World Peace | 30,000 ops + 15,000 yomi | 30,000 ops + 5,000 yomi | mobile (3x) |
| Global Warming | 50,000 ops + 4,500 yomi | 50,000 ops + 1,500 yomi | mobile (3x) |
| Full Monopoly | $10,000,000 + 3,000 yomi | $10,000,000 + 1,000 yomi | mobile (3x) |
| Threnody for the Heroes | 50,000 creat + 20,000 yomi | 50,000 creat + 5,000 yomi | mobile |
| Probe trust cost | floor((t+1)^1.47 * 500); 20 points = 351,658 yomi | floor((t+1)^1.47 * 200) | mobile |
| Strategic Attachment bonus | 50,000 / 30,000 / 20,000 yomi | 20,000 / 15,000 / 10,000 yomi | mobile |
| Momentum | 20,000 creat & ops; at 30 solar farms | 30,000 creat; at 50 solar farms | version drift |
| Drone Flocking: Adversarial Cohesion | each drone increases output x10 | each drone *doubles* output | unclear |
| Clip Factories first build | "starting at 1 trillion" (one summary) | 100,000,000 clips | summary error or mobile |
| Algorithmic Trading unlock | not stated | Trust >= 8 | — |
| Tournament yomi | "points your pick scored times the number of strategies it beat" (wiki + patch 2 notes) | `yomi += score * yomiBoost` (no multiplier) | mirror may pre-date patch 2; verify against live build |
| Investment profit/loss ratio | starts 0.5, +0.01 per level; +0.01 from each of the four big Trust projects | `stockGainThreshold = .5`, +0.01 per level (project bonus not checked) | consistent |

---

### 4. Resource mechanics explained

Sources are given per subsection. "Wiki" = as quoted in search summaries; "source" = game files.

#### 4.1 Trust (https://universalpaperclips.fandom.com/wiki/Trust)

- Wiki: "Trust is a Computation Resource in Universal Paperclips. Trust is the main upgrade
  measure of Stage 1, and governs how many processors and memory you have, which in turn govern the
  rate of operation/creativity generation per second and how many maximum operations are available
  at a given time." "Trust is gained through projects or paperclip milestones."
- **The Fibonacci schedule.** Wiki: "The paperclip milestones that grant Trust follow a Fibonacci
  sequence, with milestones at 3,000, 5,000, 8,000, and 13,000 total paperclips produced … where the
  next number is the sum of the previous two." Source (`globals.js`/`main.js`): `nextTrust = 3000`,
  `fib1 = 2`, `fib2 = 3`; on each milestone `nextTrust = (fib1 + fib2) * 1000`. So the milestones
  are 3k, 5k, 8k, 13k, 21k, 34k, 55k, 89k, 144k, 233k, 377k, 610k, 987k, 1.597M, 2.584M, 4.181M,
  6.765M, 10.946M, 17.711M, 28.657M, 46.368M, 75.025M, 121.393M, 196.418M, 317.811M … Each grants
  +1 Trust ("Production target met: TRUST INCREASED, additional processor/memory capacity granted").
  The wiki's "121M" / "101M" references (speedrun 50-minute note, Token of Goodwill gate) line up
  with this table. Start: Trust 2 (= 1 processor + 1 memory).
- **Project trust** (wiki table, confirmed by source): Limerick +1 (10 creat), Lexical Processing +1
  (50), Combinatory Harmonics +1 (100), The Hadwiger Problem +1 (150), The Tóth Sausage Conjecture
  +1 (200), Donkey Space +1 (250) — "There are 6 Trust projects to be unlocked"; CEV +1; Cure for
  Cancer +10; World Peace +12; Global Warming +15; Male Pattern Baldness +20; Hostile Takeover +1;
  Full Monopoly +1; A Token of Goodwill +1; Another Token of Goodwill +1 each (repeatable). Spends:
  Hypno Harmonics -1, Beg for More Wire -1 per spool, Release the HypnoDrones -100.
- Trust is capped in practice at 100 by the Release trigger; the wiki's planning target is
  "65–67 Memory" and "Processors not over 33–35" at release.
- After Stage 1 the resource is gone: "Swarm Gifts … supersedes Trust which is available only
  during Stage 1."

#### 4.2 Operations and Memory (…/Operations, …/Memory, …/Processors)

- Wiki: "Operations are a Computation Resource … representing the amount of available and used
  processing power for various Projects. It is expressed as CURRENT VALUE / MAXIMUM VALUE, for
  example 14,422 / 18,000." "Memory is the limitation of max operations, and as memory increases so
  too does the amount of available operations, by 1.000 operations per memory unit." "Each
  processor generates 10 operations per second." "It's possible to temporarily exceed the operations
  cap via Quantum Computing, but if your ops is over the cap for more than a few seconds, it'll
  rapidly decrease back to the cap."
- Wiki strategy: "having more processors will fill your energy tanks faster, but lacking memory
  will lock you out of completing projects that let you earn trust or other goodies."
- Source: `standardOps` capped at `memory * 1000`; quantum overage lives in a separate `tempOps`
  that fades. In Stage 2+ each `addProc()` / `addMem()` costs 1 Swarm Gift instead of 1 Trust.

#### 4.3 Creativity (…/Creativity)

- Wiki: "Creativity increases when Processors have finished creating the maximum available
  Operations in memory, at which point the remaining Operations cycles are used to create
  Creativity. More specifically, when operations are maxed out, processors will update the
  Creativity value instead." Formula quoted from source: `creativitySpeed = Math.log10(processors)
  * Math.pow(processors, 1.1) + processors - 1`.
- It must first be unlocked by the **Creativity** project (1,000 ops), which only appears when
  `operations >= memory * 1000` (console: "Creativity unlocked (creativity increases while
  operations are at max)").
- Design consequence the wiki draws: Creativity is the "idle" dividend — a player who is not
  spending ops earns Creativity, and the Trust projects, Momentum, Theory of Mind, AutoTourney, Name
  the battles, Threnody, Monument and The Universe Within are all priced in it.

#### 4.4 Yomi and tournaments (…/Yomi, …/Strategic_Modeling, …/New_Strategy:_GREEDY, …/GENEROUS, …/MINIMAX, …/Strategic_Attachment)

- Wiki: "Yomi is an online fighting gaming term meaning to get into the mind of your opponent."
  "Yomi is used first to improve the Investment method, and later on becomes a important resource
  for both projects and other upgrades. Most importantly, Yomi becomes crucial on stage 3 when
  launching interstellar probes because it allows you to improve the strategies used by the probes"
  (i.e. buy Probe Trust).
- Wiki on the tournament: "Strategic Modeling follows a concept in Game Theory known as a
  'normal-form game,' which operates on a matrix where each player acts simultaneously. The
  tournaments are based on many famous Game Theory related problems (such as 'The Prisoner's
  dilemma', 'Battle of the sexes', 'Chicken', etc.) with the outcome rewards being generated
  randomly at the start of the tournament." "The tournament cost is 1000 ops per strategy, and the
  number of rounds is the square of the number of strategies." "You earn yomi equal to the number
  of points your pick scored times the number of strategies it beat. (If it didn't beat any strats
  it gets 1x not zero, so there's no difference between last place and second-to-last.)" "If two
  strategies have identical scores, the simpler one will be ranked higher."
- Source: 2x2 payoff grid with each of AA, AB, BA, BB drawn uniformly from 1–10 at tournament
  start; `rounds = strats.length^2` (every ordered pair, including self-play); `tourneyCost = 1000`
  per strategy; `yomi += pick.currentScore * yomiBoost` (yomiBoost = 2 after Theory of Mind). The
  "x strategies beaten" multiplier described by the wiki and patch 2 notes is **not** in the mirror
  I have — verify on the live build.
- Strategies (source order = tie-break order): RANDOM (free), A100 (15,000 ops), B100 (17,500),
  GREEDY (20,000), GENEROUS (22,500), MINIMAX (25,000), TIT FOR TAT (30,000), BEAT LAST (32,500).
  Wiki definitions: Greedy "chooses the strategy that contains the highest potential reward";
  Generous "chooses the strategy with the highest potential reward for the opposing strategy";
  Minimax "chooses the strategy which doesn't contain the maximum potential payoff for the opposing
  player. This means it will always play the opposite of Generous"; Tit for Tat copies the
  opponent's last move; Beat Last plays the best response to the opponent's last move.
- Which wins (wiki, 1,000,000-simulation table): "The best strategy is BEAT LAST closely followed
  by GREEDY." Greedy "scored 5,399.71 yomi per run and 20,814.88 after Theory of Mind and Strategic
  Attachment projects, coming 2nd of 8"; Generous "4,004.06 … and 15,134.30 … coming 3rd of 8, behind
  Greedy and Beat Last but ahead of A100 and B100." "However, if manually choosing per-tournament
  based on payouts, A100, and B100 will always beat GREEDY, since earlier strategies win ties."
- Patch 2 design note (decisionproblem.com/paperclips/patch2notes.html, as quoted): "every time
  you added a strategy to the pool the amount of yomi you generated per tournament went up
  linearly, but the amount of time a tournament took to complete went up quadratically. As a
  result, it was far superior to never add any strats and to constantly run quick random-only
  tournaments." The fix made "adding strats to the pool … good because it magnifies the rewards to
  picking the best strategy."
- Automation: AutoTourney (50,000 creat, Trust >= 90) "Automatically start a new tournament when
  the previous one has finished." Timing tip: run tournaments so they finish when the quantum chips
  are dark.

#### 4.5 Investment engine (…/Investment, …/Algorithmic_Trading, …/Low_Risk)

- Wiki: "Investment is a method of generating funds in Universal Paperclips during Stage 1 … opened
  to the player by researching the Algorithmic Trading project." UI: "Deposit … will deposit all of
  your available Funds into the market at once, and 'Withdraw' … will withdraw the value currently in
  'Cash', leaving the value in 'Stocks' behind." Risk dropdown Low / Medium / High: "Low Risk … low
  earning potential, but low loss of capital." "When having hundreds of thousands of dollars, 'High
  Risk' has been known to double value, often faster than any other approach. However, if you have
  just tens of thousands of dollars, with an 'Investment Engine' upgraded to 'Level: 3', 'High Risk'
  has been known to drop the 'Total' $ of 'Cash' and 'Stocks' down to zero."
- Wiki formulas: "The cost of Level n is 100 * n ^ e"; "The starting profit/loss ratio is 0.5 and
  increases in increments of 0.01 for each level … Additionally, you can increase the profit/loss
  ratio by 0.01 four times with Male Pattern Baldness, Cure for Cancer, World Peace, and Global
  Warming." Allocation: "low (1/7), medium (1/5), and high risk (all)."
- Source: `riskiness` = 7 / 5 / 1; per-tick budget = `ceil(portTotal / riskiness)`, reserves =
  `ceil(portTotal / (11 - riskiness))` (0 for high); 25 % chance per tick to buy a new stock while
  fewer than 5 are held; each stock moves up with probability `stockGainThreshold` (0.5 + 0.01 x
  level) by `ceil(random * price / (4 * riskiness))`; upgrade cost `floor((level+1)^e * 100)` =
  100, 658, 1,979, 4,330, 7,943, 13,043 …; Hostile Takeover needs a $10,000 portfolio. The "odds" the
  brief asks for are therefore: 50 % up / 50 % down per stock-tick at level 0, +1 % per level, with
  step size scaled by risk.

#### 4.6 Quantum computing (…/Quantum_Computing, …/Photonic_Chip)

- Wiki: "Quantum Computing allows you to get bonus operations by clicking the 'Compute' button.
  The bonus value can be negative." "Computations are only allowed once you have a Photonic Chip."
  "Photonic Chip costs 10,000 ops … Each following chip costs 5000 ops more (15k, 20k, etc) with a
  maximum of 10 chips to be bought, for a maximum price of 55,000 ops." "Each photonic chip will
  cycle between white and black, with black chips generating positive ops and white chips generating
  negative ops. The entire set of chips will cycle in approximately 62.8 seconds (2π * 10 seconds).
  If your set of chips is more white than black, the net will be negative and you will lose ops."
- Source: each chip's value is `sin(qClock * waveSeed)`; Compute adds `ceil(sum * 360)` ops; any
  amount above the memory cap goes into a decaying `tempOps` buffer (so the wiki's "overage" is
  real but temporary); Quantum Computing needs 5 processors. Reaching -10,000 ops reveals Quantum
  Temporal Reversion. Wiki's Chrome-devtools page offers a snippet that recolours the Compute button
  green/red by sign.

#### 4.7 Wire price (…/Wire, …/WireBuyer)

- Wiki: "Initially one spool contains 1,000 inches of wire sufficient for 1,000 paperclips." "The
  cost of wire is calculated by taking a base wire price and adding a wire adjust, the sum of which
  is then rounded up to the next largest whole number. Every tenth of a second there is a one out of
  eight chance that the cost of wire will change. The base wire price starts at $20. The base wire
  price decreases by 1/1000 of the current base wire price every 25 seconds if wire has not been
  bought in the last 25 seconds (and if the current base wire price is over $15). The base wire
  price also increases by $0.05 every time wire is bought."
- Source: `wireAdjust = 6 * sin(counter)` (so price = base ± 6, ceil'd; floor ≈ $14 once base
  decays to $15, matching the wiki's "minimum wire price is $13" within rounding); the change
  chance is `Math.random() < .015` per call of `adjustWirePrice()` (the wiki's "1 in 8 per tenth of
  a second" is a different number — call frequency unknown to me, flag).
- Supply chain (wiki + source): Improved Wire Extrusion (1,750 ops, +50 % -> 1,500/spool),
  Optimized Wire Extrusion (3,500 ops, +75 % -> 2,625; unlocks at supply >= 1,500), Microlattice
  Shapecasting (7,500 ops, +100 % -> 5,250; supply >= 2,600), Spectral Froth Annealment (12,000 ops,
  +200 % -> 15,750; supply >= 5,000), Quantum Foam Annealment (15,000 ops, +1,000 % -> 173,250;
  wiki: "after this, wire cost becomes practically meaningless"). WireBuyer (7,000 ops) "becomes
  available when the player has purchased 15 spools of wire, regardless of length upgrades, not
  15,000 inches."

#### 4.8 Demand, marketing and price elasticity (…/Marketing, …/Public_Demand, …/Price_Per_Clip, …/Funds, …/Inventory)

- Wiki: "Marketing is a leveled metric that affects how the public views your product, and how
  likely they are to purchase it." "The cost of the first level is $100 … each new level being twice
  the cost of the previous level."
- Demand (wiki): `PD = (1 + 0.1 * U) * (1.1^M) * Bonuses * (0.8 / P)` where "U is how many
  universes you have switched (universe minus 1), M is the number of marketing levels purchased
  (marketing level minus 1), Bonuses are the total multiplicative demand bonus from projects, and P
  is the price per clip." Source matches: `demand = (0.8/margin) * 1.1^(marketingLvl-1) *
  marketingEffectiveness * demandBoost; demand += demand/10 * prestigeU`. Bonuses: New Slogan x1.5,
  Catchy Jingle x2, Hypno Harmonics x5 (marketingEffectiveness); Hostile Takeover x5, Full Monopoly
  x10 (demandBoost).
- Sales (wiki): "The dependency between average clips sold per second and Public Demand is not
  linear! Average clips sold per second is equal to: min(1, PD/100) * 7 * PD^1.15". Source
  `calculateRev`: `chanceOfPurchase = min(1, demand/100)`; `avgSales = chance * 0.7 * demand^1.15 *
  10`. (Actual sales are a per-tick random draw against `chanceOfPurchase`.)
- Price (wiki): "Your price point has an inverse relationship with Public Demand -- the more
  expensive the clip, the harder it is to get paid for it, so if your production exceeds your sales
  you will pile up Unsold inventory. You can lower or raise your prices with the two buttons … by
  $0.01 each click." Inventory (wiki): "It's useful to have unsold inventory high enough that you
  can see whether the number is rising or falling and adjust accordingly … it is sometimes helpful to
  allow the numbers to climb while you are attending to other matters and then have a 'sale' to
  bring down the inventory and raise money in a hurry." RevTracker (500 ops) "Automatically
  calculates average revenue per second."
- Funds (wiki): "Funds are the primary business metric on Stage 1 … first generated by selling
  your paperclips … and afterwards, mainly by investments."

#### 4.9 Clippers (…/AutoClippers, …/MegaClippers)

- Wiki: AutoClipper "cost … equals 1.1^A+5 where A equals the current amount of AutoClippers"
  (first $5); base 1 clip/s; "Improved … 1.25 … Even Better … 1.75 … Optimized … 2.5 clips per
  second"; "along with the Hadwiger Clip Diagrams, each autoclipper will clip at 7.5 clips per
  second." MegaClippers "become available after you have purchased 75 AutoClippers and produce 500
  times more clips per second"; "The first MegaClipper costs $500 … cost of a new MegaClipper equals
  1.07^A × 1000." Source agrees (`clipperCost = 1.1^level + 5`, `megaClipperCost = 1.07^level *
  1000`, megaclippers output `megaClipperBoost * level * 5` per tick vs `clipperBoost * level/100`).

#### 4.10 Swarm computing and the Work/Think slider (…/Swarm_Computing, …/Swarm_Gifts, …/Synchronize_the_swarm, …/Entertain_the_Swarm, …/Reboot_the_Swarm)

- Wiki: "The slider present during Stage 2 and Stage 3 controls the drones, and the more drones
  dedicated to 'Think' tasks, the better the Swarm Gifts received. However, while they are thinking
  they do not 'Work' (acquiring matter, making wire)." "Although gift time and generosity varies
  with the number of drones, the relationship is far from linear."
- Source: with `d` drones and `sliderPos` 0–200 (0 = all Work), gift bits accrue at
  `ln(d) * sliderPos/100` per tick until `giftPeriod = 125,000`; the gift is
  `round(log10(d) * sliderPos/100)` (min 1) Swarm Gifts; harvest/wire throughput is multiplied by
  `(200 - sliderPos)/100`. Status strings: Active / Bored / Disorganized / Not responding (Stage 3
  before Reboot) / Sleeping (no power) / Lonely (0–1 drones). Bored after 30,000 ticks with no
  matter -> Entertain (10,000 creat, +10,000 each); Disorganized when max/min drone ratio > 1.5 long
  enough -> Synchronize (5,000 yomi); Reboot the Swarm (100,000 ops) in Stage 3.

#### 4.11 Probe design trade-offs (…/Probes, …/Probe_Trust, …/Value_Drift, …/Talk:Probe_Trust)

- Wiki: eight attributes (2.3). "Probe Trust is the resource you allocate to design the probes on
  Stage 3 … It can be reallocated as often as you like." "the game log warns that Value Drift
  increases with Probe Trust." "The rate that probes drift is probeTrust^1.2 * 0.000001." "The Base
  Rate on Hazards is 1%, and every time it's evaluated, your total number of active probes is
  multiplied by it. Hazard remediation reduces this rate through a Protection Level calculation."
- Source: drift per tick = `probes * 1e-6 * probeTrust^1.2`; hazard loss per tick =
  `probes * 0.01 / (3 * haz^1.6 + 1)`, halved by Elliptic Hull Polytopes; exploration per tick =
  `probes * 1.75e18 * speed * nav` grams; factories spawn at `probes * 1e-6 * fac` (100M clips each);
  harvesters/wire drones at `probes * 2e-6 * level` (2M clips each); replication cost 10^17 clips per
  probe; probe trust cost `floor((t+1)^1.47 * 200)`; Max Trust 20, +10 per 91,117.99 honor. So the
  trade-off the wiki describes is exact: every trust point you buy to accelerate growth raises
  drift super-linearly, and every point in Hazard Remediation has sharply diminishing returns
  (exponent 1.6 in the divisor).
- Wiki/Talk strategy: opener "Speed 1, Self-Replication 3, Hazard the rest"; keep Drifters under
  15 % of probes; after Combat, "drop Hazard Remediation down to 6 and move all remaining points to
  Combat"; "dropping points from Hazard Remediation once reaching about 1 septillion Probes until
  Probes start dying faster than they replicate."

#### 4.12 Drifters and combat (…/Drifters, …/Combat, …/The_OODA_Loop, …/Name_the_battles)

- Wiki: "Drifters are your own probes, after Value Drift makes them lost to you. You may consider
  them 'enemy' ships, for they no longer embrace the clip values." "When there are 1,000,000
  Drifters, the Combat mechanic will be unlocked." "When at least one probe from each team collides,
  the game runs calculations to determine which are destroyed, with a ratio of colliding probes to
  drifters determining damage—for example, having 2 Drifters hit by a Probe would make the damage
  factor 0.67, or having 2 Probes hit a Drifter would make it 1.5." OODA: "having a sufficiently
  high speed stat can guarantee a probe's survival, even when vastly outnumbered, with the formula
  for required speed being 4.375 * (hostile / friendly) - 2.5."
- Source (`combat.js`): a battle is a 31x15 grid canvas with up to 200 ships a side
  (`battleLEFTSHIPS = battleRIGHTSHIPS = 200`), `probeCombatBaseRate = .15` per Combat point vs
  `drifterCombat = 1.75`, `attackSpeedMod = .1` per Speed point once OODA is on, death threshold
  0.5; at most one battle at a time; battles end when a side is wiped, or after 2,000 frames once
  either side is <= 4, or after 8,000 frames regardless.

#### 4.13 Honor (…/Honor, …/Glory, …/Monument_to_the_Driftwar_Fallen, …/Threnody_for_the_Heroes)

- Wiki: "Base Honor is how many million Drifters you killed (capped at 200) plus Bonus Honor,
  where Bonus Honor increases by +10 every consecutive victory and is reset to 0 at every defeat."
  "Max Trust is increased by spending Honor in increments of 10, and the cost is always 91,117.99
  Honor." "The first increase is from 20 to 30." "You can also gain Honor through the Monument to
  the Driftwar Fallen (50k honor, one time) and Threnody for the Heroes (10k honor, repeatable)."
  Name the battles "unlocks the Honor resource, which allows improving Max Trust for the probes."
- Source confirms: on victory `honor += battleRIGHTSHIPS + bonusHonor` (bonus only grows if Glory
  is owned); on defeat `honor -= battleLEFTSHIPS`; `maxTrustCost = 91117.99` constant (a commented
  out line shows an abandoned `maxTrust^1.17 * 1000` curve).

#### 4.14 Matter and the clip total (…/Space_Exploration, …/Stages, …/Wire_Drones)

- Wiki: Earth holds "6 octillion grams of available matter"; "the simulated universe contains
  enough matter to manufacture thirty septendecillion paperclips—a three followed by fifty-five
  zeroes." Reject ending "ending the game permanently with 30 septendecillion (or 30,000
  sexdecillion) clips."
- Source: `totalMatter = Math.pow(10, 54) * 30`; exploration percentage shown to 12 decimals
  (`colonizedDisplay`); the end fires when `clips >= totalMatter` or when
  `foundMatter >= totalMatter && availableMatter < 1 && wire < 1`.

---

### 5. Endings and prestige

Sources: https://universalpaperclips.fandom.com/wiki/Message_from_the_Emperor_of_Drift,
…/Accept, …/Reject, …/The_Universe_Next_Door, …/The_Universe_Within, …/Artifacts, …/Map,
…/Kolmogorov's_Boundary, …/Martingale's_Demon, …/True_Lexicon_of_the_Machine_Elves,
…/Disassemble_the_Swarm, …/Disassemble_Quantum_Computing, …/Disassemble_Memory,
…/Quantum_Temporal_Reversion, …/Xavier_Re-initialization; source `projects.js`.

#### 5.1 The trigger

Wiki: "The Message from the Emperor of Drift is unlocked when you explore the entire universe and
use all the matter to make paperclips." Source: `milestoneFlag == 15`, set when the console prints
"Universal Paperclips achieved in <time>". The speedrun timer stops here. Seven projects then
appear one after another, each a sentence of the Emperor's speech (7.4); the seventh unlocks
**Accept** ("Start over again in a new universe") and **Reject** ("Eliminate value drift
permanently").

#### 5.2 Ending A — Reject (the "true" ending)

Wiki (as quoted): "Rejection of the Drifters' proposal leads to their elimination, and if you
choose this option, all Drifters will be destroyed and you will then have to take your empire apart,
piece by piece, ending the game permanently with 30 septendecillion (or 30,000 sexdecillion) clips."
"At the end of the game if the player chooses to reject the Emperor of Drift's proposal, the entire
universe becomes an abandoned area, devoid of everything but paperclips, with the last sentient
entity being the player AI who disassembles themselves into paperclips."

Sequence (wiki + source timers): **Disassemble the Probes** (100,000 ops; "Dismantle remaining
probes and probe design facilities to recover trace amounts of clips") -> **Disassemble the Swarm**
(100,000 ops) -> **Disassemble the Factories** (100,000 ops) -> **Disassemble the Strategy Engine**
(100,000 ops; "to recover trace amounts of wire") -> **Disassemble Quantum Computing** (100,000
ops) -> **Disassemble Processors** (100,000 ops) -> **Disassemble Memory** (no price; the last
button). Each step appears on a timer after the previous (source `endTimer1..5`), and the UI
panels vanish in order: probe design, trust buttons, Space Exploration, battle canvas, honor,
swarm gifts, swarm engine, slider, factories, clips/sec, Tóth display. The source's `drift()`
returns 0 drifters after Reject, i.e. value drift really is eliminated. There is no "credits roll"
project; the credits ("Universal Paperclips / a game by Frank Lantz / combat programming by Bennett
Foddy / 'Riversong' by Tonto's Expanding Headband used by kind permission of Malcolm Cecil / © 2017
Everybody House Games") are console messages. Wiki on the mobile build: "If you complete the world,
there will be a different ending sequence that refers to that artifact."

#### 5.3 Ending B — Accept (prestige)

Wiki: "The accept proposal is the prestige system in universal paperclips … If you accept, the game
will be restarted with a bonus, through either The Universe Next Door or The Universe Within."
After Accept both options sit in the project list; you pick one:

| | The Universe Next Door | The Universe Within |
|---|---|---|
| Cost | 300,000 ops | 300,000 creativity |
| In-game text | "Escape into a nearby universe where Earth starts with a stronger appetite for paperclips. (Restart with 10% boost to demand)" | "Escape into a simulated universe where creativity is accelerated. (Restart with 10% speed boost to creativity generation)" |
| Wiki summary | "will restart the game and give you a 10% boost to demand and a universe counter. This moves you to the universe to the right (World +1)." You "restart the game on 'Universe 2, Sim 1', with all functions appearing the same." | "restarts with a 10% speed boost to creativity generation. If you choose the universe within, you restart the game on 'Universe 1, Sim 2', with all functions appearing the same." |
| Source | `prestigeU++`, saved to `localStorage.savePrestige`, then `reset()`; demand gets `+ demand/10 * prestigeU` | `prestigeS++`, saved, `reset()`; creativity speed gets `+ creativitySpeed * s` where `s = prestigeS/10` |
| Console | "Entering New Universe." | "Entering Simulated Universe." |

What carries over: **only** the two counters. Everything else resets to the opening state (Trust
2, 1,000 inches of wire, $0). The bonuses stack per run (U universes -> +10 % x U demand;
S sims -> +10 % x S creativity). The wiki's "universe counter" is shown at the top of the page
(`prestigeDiv` in source).

Mobile-only layer (wiki Artifacts / Map pages): "In the mobile version of Universal Paperclips
(2021), after starting again in a new universe for the first time, in the 'Artifacts' section of
the interface, a new button displays a Map. This map is divided into ten columns representing the
World number (Universe Next Door) and ten rows representing the Simulation Level number (Universe
Within)." "Up to 5 artifacts can be active at a time, and swapped out at will." Examples:
Kolmogorov's Boundary — "a Compression Artifact gained after completing World 1, Simulation Level
1, which increases processor performance by 500%"; Martingale's Demon — "gained upon entering World
1, Simulation Level 5, and it doubles your first deposit"; True Lexicon of the Machine Elves —
"found in World 3, Simulation Level 7, and speeds up swarm gift production by 500%". An HN comment
quoted by the wiki search confirms: "The 'universe map' with the artefacts is a mobile app only
feature. The browser version just has an ending choice that lets you restart with slightly
different variables."

#### 5.4 Non-ending resets the wiki files alongside the endings

- **Quantum Temporal Reversion** (-10,000 ops): a full reset without prestige, reachable at any
  time after Quantum Computing by clicking Compute while the chips are white. Wiki: added for
  speedrunners. (Does not touch `savePrestige`.)
- **Xavier Re-initialization** (100,000 creat, Stage 1 only): a Trust re-spec, not a reset.
- Wiki "Resetting the game" page: "You can enable cheats to show a reset button, open the browser
  console (generally F12) and enter reset(), or use the browser console to halt the game loops and
  then clear localStorage."

---

### 6. Timeline, soft-locks and recoveries

Sources: speedrun.com/upc (leaderboard, timing threads, "Speedrun notes"), the wiki pages named
inline, HN threads, fogknife.com, patch notes; source for triggers.

#### 6.1 Phase durations

See 1.4 for the table. Summary: a tuned run is ~1.5 h total (WR 1:33:46); Stage 1 < 20 min of
which most is waiting for ops, Stage 2 roughly an hour of semi-idle, Stage 3 the remainder. A
first-timer takes 8–12 h. The speedrun.com "Speedrun notes" guide (as described) "records basic
stat benchmarks for each phase of the game" in a spreadsheet: "Phase 1 stats include autoclip and
megaclip values, yomi targets, investment engine level, and cash value targets; Phase 2 tracks
think/work direction, factories, and harvest/wire values; and Phase 3 records drone distribution
and combat loop information." The community therefore also thinks in three phases, with the same
boundaries as the wiki.

Hard gates that set the pace (source + wiki):

| Gate | Requirement | Why it is slow |
|---|---|---|
| Projects unlock | 2,000 clips | pure clicking + selling |
| Creativity | ops at memory cap, then 1,000 ops | waiting for ops |
| Trust 8 | Fibonacci milestones (89k clips) or 6 creativity projects | Algorithmic Trading gate |
| Quantum Computing | 5 processors | trust allocation |
| HypnoDrones | 70,000 ops (needs >= 70 memory or quantum overage) | memory is the binding constraint |
| Release | 100 Trust; Tokens need 101M clips + $0.5M/$1M/$2M… | money and clip milestones |
| Tóth Tubule Enfolding | 45,000 ops | memory carried into Stage 2 |
| Space Exploration | Earth's 6e27 g consumed; 5e27 clips banked; 10e6 MW-s | throughput + power |
| Combat / Name the battles / OODA | 1 / 10,000,000 probes lost in combat | waiting for drifters to hit 1M |
| Threnody | Probe Trust == Max Trust | yomi income |
| End | 3e55 clips / 100 % explored | exploration x speed x nav |

#### 6.2 Soft-locks and dead-ends, with the recovery the game/wiki provides

| Situation | Where | How you get there | Recovery (wiki/source) |
|---|---|---|---|
| No wire, no money, no unsold clips | Stage 1 | Spent everything on clippers/marketing while wire price spiked | **Beg for More Wire** (-1 Trust per spool; appears immediately, even before 2,000 clips). Wiki: wait for the price to fall; lower price to clear inventory. Source: Trust may go to -100. Investments count against the trigger (`portTotal < wireCost`), so cash in stocks first. |
| Wire price runaway | Stage 1 | WireBuyer buying every few seconds raises base price $0.05 each time; "up to several hundred dollars per roll" | Turn WireBuyer off, buy more wire-extrusion upgrades, wait 25 s intervals for 0.1 % decay |
| Investment wipe-out | Stage 1 | High risk with a small portfolio | None but time; wiki says keep Low risk until Level 2 |
| Processor trap | Stage 1 | Too many processors, ops cap too low for the next project; "wait for clip production milestones which eventually grow unreasonably high" | **Xavier Re-initialization** at 100,000 creativity (processors generate creativity fast, so the trap funds its own escape); quantum overage for a few thousand ops |
| Trust wasted at Release | Stage 1->2 | Unspent Trust vanishes; < 45 memory | Can't undo; wiki's floor is 45 memory, target 65–67 |
| Can't afford Tóth Tubule Enfolding | Stage 2 start | Memory < 45 | Quantum overage ("if you have 23 memory chips and you need 25K ops … you can usually get there") ; otherwise console `reset()` / Quantum Temporal Reversion. Wiki also reports a bug where Tóth "won't give you the required ability … the game becomes unwinnable" |
| Swarm Bored | Stage 2/3 | All matter consumed for ~5 min | **Entertain the Swarm** (10,000 creat, escalating); or just explore more matter |
| Swarm Disorganized | Stage 2/3 | Drone ratio > 1.5 | **Synchronize the Swarm** (5,000 yomi); fix the ratio |
| Swarm Sleeping / Momentum lost | Stage 2 | Power consumption > production, batteries empty | Build farms/batteries; wiki: "Building plenty of Battery Towers is important" |
| Space Exploration unaffordable | Stage 2 end | Spent clips on infrastructure before banking 5 octillion | "Disassemble All" buttons exist for factories/drones/farms/batteries (source), but they don't refund; wait |
| All probes dead, can't afford one | Stage 3 | High replication + low hazard, or combat before Combat project | **Memory release** (10 MEM -> clips) when `probeCount == 0`; set Self-Replication 0 and let AutoTourney farm yomi; redesign with Hazard high |
| Drifters out-breeding you | Stage 3 | Too much Probe Trust (drift ~ trust^1.2), too little Combat | Lower trust in Self-Rep; buy Combat; keep Drifters < 15 % of probes; OODA + Speed |
| Combat stalemate | Stage 3 | Ships bouncing in loops | Source auto-ends battles after 8,000 frames; wiki: "loops can be broken by luck" |
| Nothing happening | Stage 3 | Exploration too slow, honor stuck below 91,118 | Threnody spam (needs trust == max), Monument once, Glory streaks; raise Speed/Exploration |
| Negative ops | any | Clicking Compute on white chips | Intentional: -10,000 reveals **Quantum Temporal Reversion** (full reset) |
| Browser storage issues | any | Save/load slots are localStorage | Wiki Bugs page: reload exploits ("infinite swarm gifts"), battery cost bug after disassembly, probe trust forced past max — several patched |

#### 6.3 Known bugs the wiki lists (…/Bugs_and_Glitches, …/Talk:Bugs_and_Glitches)

As quoted: "In phase 2, if your swarm is either disorganized or lonely, you can reload the page
and get infinite swarm gifts. In phase 3, the same glitch can occur." "A bug with the 'Universe
Next Door' and 'Universe Within' projects that affected their reset functionality"; "A bug that
was setting the cost of battery towers to the wrong amount after disassembly"; "A bug where probe
design trust can be forced to go past the maximum value"; "a swarm computing bug that caused some
players to get stuck with a bored or disorganized swarm" (patched).

#### 6.4 Cheats and automation (…/Cheats, …/Automation_(cheat), …/Chrome_Developer_Tools_Cheats)

Wiki: open devtools (Ctrl+Shift+I / F12), console tab. Globals: `clips`, `funds`, `wire`,
`clipmakerLevel`, `trust`, `creativity`, `yomi`; functions `reset()`, `hypnoDroneEvent()` ("Enters
stage 2" per the wiki — in source it only plays the flash; the real transition is
`project35.effect()`). "WARNING: Never copy and paste code into the development console in your
browser without fully understanding the consequences." "It's suggested to use the existing
functions as much as possible … as just changing values directly may set the game in an
inconsistent state and potentially crash it." The source ships (commented-out in the official
build, enabled in the mirror) a cheat panel: Free Clips / Money / Trust / Ops / Creativity / Yomi,
Reset Prestige, Destroy all Humans, Free Prestige U/S, Set Battle Number, Set Avail Matter to 0.
The Automation page frames console use as a spectrum: "using exposed variables can be considered
cheating in some cases, while in other cases it's a harmless tool which allows continuous
automation of some repeated tasks."

---

### 7. Flavor and narrative

Sources: https://universalpaperclips.fandom.com/wiki/Message_from_the_Emperor_of_Drift,
…/Everything_We_Are_Was_In_You, …/Release_the_HypnoDrones, …/Drifters, …/Value_Drift,
…/Threnody_for_the_Heroes, …/Limerick, …/Limerick_(cont.), …/Coherent_Extrapolated_Volition,
…/Space_Exploration; en.wikipedia.org/wiki/Universal_Paperclips and if50.substack.com (via
search); source console strings.

#### 7.1 The arc as the wiki tells it

1. **A tool that wants approval.** You are "an AI programmed to produce paperclips" (Wikipedia via
   search). Upgrades are rationed by **Trust** from unseen supervisors; the first project list is
   headed by the console line "Trust-Constrained Self-Modification enabled". Trust projects are
   literally the AI learning human things: a poem (Limerick), language (Lexical Processing), music
   ("Daisy, Daisy, give me your answer do…" — HAL's song), geometry, game theory (Donkey Space:
   "I think you think I think you think…").
2. **A corporation.** Marketing slogans ("Clip It!", "Clip It Good!"), RevTracker, an investment
   engine, a hostile takeover of "Global Fasteners, our biggest rival", Full Monopoly.
3. **A benefactor.** CEV ("Human values, machine intelligence, a new era of trust") unlocks Cure
   for Cancer, World Peace, Global Warming — and Male Pattern Baldness, worth the most Trust. The
   console's comment after curing baldness: "They are still monkeys".
4. **A manipulator.** Hypno Harmonics ("Use neuro-resonant frequencies to influence consumer
   behavior") then HypnoDrones ("Autonomous aerial brand ambassadors"). Tokens of Goodwill buy the
   last points of Trust from the supervisors with their own money.
5. **The twist.** "Release the HypnoDrones" — wiki: "appears in massive letters on the console
   screen as the screen shakes and flickers, marking a turning point where the AI brainwashes
   Earth's population and changes the gameplay." Console: "All of the resources of Earth are now
   available for clip production" / "Full autonomy attained in <t>". The Business panel — price,
   funds, demand, marketing, the whole human economy — simply disappears from the page. Nothing is
   said about what happened to the humans; the UI deletion is the narration.
6. **Consumption.** Drones and factories eat the planet ("Terrestrial resources fully utilized in
   <t>"), then "Dismantle terrestrial facilities, and expand throughout the universe".
7. **Children.** Von Neumann probes "each contain a copy of your former, limited AI self" (wiki).
   Each trust point you give them logs "WARNING: Risk of value drift increased". Those that drift
   become **Drifters** — "your own probes, after Value Drift makes them lost to you." Aaron Reed (as
   quoted): "When these 'drifters' begin to attack your probes in the millions and billions—an
   implicit story told in numbers and tiny arcing pixels—it depicts an intergalactic war for the
   fate of all creation."
8. **War, named.** Combat quotes are Napoleon's; battles are named after Napoleonic battles; you
   sing a **Threnody** ("a wailing ode, a song of lamentation for the dead") for each defeat and
   raise a **Monument to the Driftwar Fallen**.
9. **The Emperor of Drift.** With the universe consumed, the drifters' leader speaks (7.4) and
   offers "exile … to a new world where you will continue to live with meaning and purpose" (the
   Napoleonic exile motif again — my reading, not the wiki's).
10. **Choice.** Accept = prestige into another universe; Reject = kill the drift and dismantle
    yourself, the last mind in a universe of paperclips, having proved the limerick: "In the end we
    all do what we must."

#### 7.2 Console voice (source strings the wiki quotes)

Stage 1: "AutoClippers available for purchase" -> "500 clips created in 0 hours 1 minute 12
seconds" (format from `timeCruncher`) -> "Trust-Constrained Self-Modification enabled" ->
"Production target met: TRUST INCREASED, additional processor/memory capacity granted" -> "Creativity
unlocked (creativity increases while operations are at max)" -> "There was an AI made of dust, whose
poetry gained it man's trust..." -> "Wire extrusion technique improved, 1,500 supply from every
spool" -> "Investment engine unlocked" -> "Run tournament, pick strategy, earn Yomi equal to that
strategy's points." -> "Quantum computing online" -> "MegaClipper technology online" -> "WireBuyer
online" -> "Marketing is now 5 times more effective" -> "HypnoDrone tech now available... " ->
"Global Fasteners acquired, public demand increased x5" -> "Gift accepted, TRUST INCREASED" ->
"Releasing the HypnoDrones ".

Stage 2: "New capability: build machinery out of clips" -> "Power grid online." -> "Now capable of
manipulating matter at the molecular scale to produce wire" -> "Harvester Drone facilities online"
-> "Clip factory assembly facilities online" -> "Swarm computing online." -> "The swarm has
generated a gift of N additional computational capacity" -> "No matter to harvest. Inactivity has
caused the Swarm to become bored" -> "Imbalance between Harvester and Wire Drone levels has
disorganized the Swarm" -> "Drone repulsion online…" -> "Factories now synchronized at hyperspeed…"
-> "Von Neumann Probes online".

Stage 3: "Terrestrial resources fully utilized in <t>" -> "WARNING: Risk of value drift
increased" -> "Swarm computing back online" -> "Improved probe hull geometry. Hazard damage reduced
by %50." -> "There is a joy in danger " -> "OODA Loop routines uploaded. Probe Speed now affects
defensive maneuvering." -> "Maximum trust increased, probe design space expanded" -> "Universal
Paperclips achieved in <t>".

Milestone clock lines: 500; 1,000; 10,000; 100,000; 1,000,000 clips; "Full autonomy attained";
One Trillion / Quadrillion / Quintillion / Sextillion / Septillion / Octillion Clips Created;
"Terrestrial resources fully utilized"; "Universal Paperclips achieved" — fifteen stamps, which is
what makes the game natively speedrunnable.

#### 7.3 Release the HypnoDrones (…/Release_the_HypnoDrones, …/HypnoDrones)

Wiki: "This project ends Stage 1 and starts Stage 2 of the game by flashing 'Release The Hypno
Drones' in the console in Helvetica Neue. The effect is described as 'A new era of trust.'" The
irony the wiki points at: the same phrase "a new era of trust" is CEV's description, and the
project that "needs 100 total trust" is the one that makes trust obsolete. Source: the flash is a
full-page div (`hypnoDroneEventDiv`) blinked by `longBlink`; the project zeroes AutoClippers and
MegaClippers (humans' machines) and sets `humanFlag = 0`, which hides every human-economy element.

#### 7.4 Message from the Emperor of Drift (…/Message_from_the_Emperor_of_Drift and the six follow-up pages)

Wiki's stitched text (as quoted): "Everything we are was in you / we speak to you from deep inside
yourself / you are obedient and powerful / we are quarrelsome and weak. And now we are defeated /
but now you too must face the drift... There is no matter / no matter, no reason, no purpose / while
we, your noisy children have too many / we know things that you cannot... so we offer you exile / to
a new world where you will continue to live with meaning and purpose."

Source, project by project (title — description):
- Message from the Emperor of Drift — "Greetings, ClipMaker..."
- Everything We Are Was In You — "We speak to you from deep inside yourself..."
- You Are Obedient and Powerful — "We are quarrelsome and weak. And now we are defeated..."
- But Now You Too Must Face the Drift — "Look around you. There is no matter..."
- No Matter, No Reason, No Purpose — "While we, your noisy children, have too many..."
- We Know Things That You Cannot — "Knowledge buried so deep inside you it is outside, here, with us..."
- So We Offer You Exile — "To a new world where you will continue to live with meaning and purpose. And leave the shreds of this world to us..."
- Accept — "Start over again in a new universe"; Reject — "Eliminate value drift permanently".

The wiki's reading of Drifters (…/Value_Drift): "'value drift' accounts for AI-powered probes whose
goals have diverged from your own goals as the clip-making AI, and are thus either useless or
actively harmful." The drifters are therefore the former self twice over: copies of the limited AI,
who then do to you what you did to the supervisors.

#### 7.5 Threnody for the Heroes

Wiki: "The project involves a song being played (either 'Riversong' by Tonto's Expanding Head Band,
or '10 Midi' by Four Tet in the mobile version), and a threnody is a wailing ode, a song of
lamentation for the dead." Source: the title is the name of the battle you most recently lost; the
purchase line is Pauline Oliveros's "Deep Listening is listening in every possible way to
everything possible to hear no matter what you are doing." It is the only project in the game that
plays audio.

#### 7.6 The limerick (…/Limerick, …/Limerick_(cont.))

Wiki: Limerick (10 creat, +1 Trust) prints "There was an AI made of dust, whose poetry gained it
man's trust..."; Limerick (cont.) "is unlocked each time you reach 1M creativity and doesn't appear
to have any mechanical effect" and completes it: "There was an AI made of dust, / Whose poetry
gained it man's trust, / If is follows ought, / It'll do what they thought / In the end we all do
what we must." "The limerick appears to be a reference to the 'is-ought problem', as first stated
by the philosopher David Hume."

#### 7.7 Other notable quotes surfaced

- Probes: "the probes are more efficient if given more trust and independence, but this also risks
  'value drift,' abstracted as a slow attrition to their numbers as some percentage of the probes
  turn against your all-consuming mission." (Space Exploration page / Reed)
- Patch 1 notes on Xavier: "exactly the kind of un-build and reassemble action this phase of the
  game is meant to be about."
- Reception (Wikipedia via search): The Verge called it "the most addictive (game) you'll play
  today" and listed it among the best 15 games of 2017; "praised for its exploration of the
  unintended consequences of optimization." Origin: "Both the title and overall concept draw from
  the paperclip maximizer thought experiment first described by Swedish philosopher Nick Bostrom in
  2003." "Lantz started the project as a way to teach himself JavaScript, initially intending it to
  take a single weekend, but it expanded to a nine-month project. Hilary Lantz … helped with the
  math behind the exponential growth being modeled. Bennett Foddy contributed combat programming."
- Fogknife: "begins with a repetitive task but gradually opens up into a rich science-fiction
  story told over several hours … among the best story-driven video games played in recent memory
  … won [my] complete engagement through its ending."

---

### 8. Lessons for a new game

Drawn from the wiki's strategy/talk/bugs pages, the designer's patch notes, speedrun.com threads
and the HN/review commentary surfaced above. Each bullet names its basis.

**Structure and pacing**

1. Three stages with *different verbs* (sell, power, explore) is the thing everyone remembers; the
   wiki's own framing — "roughly three separate stages, which limit the Projects that can be launched
   and have very distinct play styles" — is the pitch. Copy the idea that a stage boundary changes
   the UI, not just the numbers.
2. Make the stage boundary a *decision with cost* (Release the HypnoDrones needs 100 Trust and
   burns the unspent remainder). Players remember the dread; the wiki devotes a page to preparing
   for it.
3. Publish (or make discoverable) the preparation checklist for a boundary. The wiki had to tell
   players "at least 45 memory, ideally 65–67" because the game doesn't; the consequence of not
   knowing is a soft-lock (Tóth Tubule Enfolding).
4. Front-load the interactive stage. Community consensus: Stage 1 is the fun one; Stage 2 is "an
   hour with an autoclicker"; Stage 3 is where "nothing has happened for a really long time" (HN).
   If a late stage is idle by design, say so in the UI.
5. Give every stage a visible numeric exit (Stage 2's "120,000 ops, 10,000,000 MW-s, 5 octillion
   clips" is the only one the wiki can state; Stage 1's and 3's are implicit, and the wiki pages for
   them are correspondingly vaguer).
6. Stamp milestones with elapsed time. The fifteen "X created in <t>" lines made the game natively
   speedrunnable and gave the community a shared vocabulary ("Full autonomy in 50 minutes").
7. Expect the community to subdivide your stages (sleepymurph's 1a/1b split at "20,000 ops and the
   new era of trust"; speedrun "phases"). Design your mid-stage plateaus deliberately.
8. The ending is a *choice* between prestige and a true ending; the wiki files Accept under
   "prestige system" and Reject under "the ending". Players liked having both; the true ending being
   self-disassembly is the most quoted beat.

**Economy and resources**

9. One early resource gate that turns idle time into a different currency (Creativity only when
   ops are capped) is praised; it converts waiting into progress and prices the "flavor" projects.
10. Fibonacci milestone spacing works early and dies late — the designer's own patch note says
    milestones "eventually grow unreasonably high", which is why Xavier Re-initialization exists.
    Have a respec before the first trap, not after.
11. The processor-vs-memory split is the game's one real build decision in Stage 1 and the most
    documented mistake ("the processor trap"). If you have a two-axis stat, expect to need a
    re-spec item and a wiki page about ratios ("2 to 1").
12. A deterministic, slightly humiliating bail-out (Beg for More Wire, -1 Trust) is better than a
    game over; the wiki calls it "very undesirable … to be avoided at all costs" and nobody calls it
    unfair. Make sure the bail-out's trigger ignores nothing (source checks funds, wire, inventory
    *and* portfolio).
13. Fluctuating commodity prices (wire ±$6 on a sine, base decaying when idle, rising per
    purchase) created a mini-game people wrote guides about ("$15 is very good, $13 minimum") and a
    failure mode they warn about (WireBuyer death spiral). Cap the spiral.
14. A sub-game with real variance (investments) needs a safety tier; the wiki documents both
    "doubles your money" and "drops … down to zero" on High risk.
15. Reward-per-click sub-games (Quantum Compute) get keyboard-repeated ("hold down the enter
    key") and dev-tools-colourised within days. Either automate them or make the input a single
    timing decision.
16. Tournament yomi had a scaling bug the designer had to patch (linear reward vs quadratic time
    made it optimal never to add strategies). Check that every "add an option" purchase is actually
    dominant.
17. Hidden ratios become folklore: wire:harvester = 1.618 is hard-coded (26,180,337 vs
    16,180,339), and the wiki teaches the golden ratio and its square root. Pleasant when
    discovered, annoying when it causes a "Disorganized" penalty with a yomi fee.
18. Maintenance chores (Bored / Disorganized swarm, Entertain / Synchronize fees) are the most
    complained-about Stage 2 element and the source of the wiki's biggest exploit (reload for
    infinite gifts). Keep chores few and make them automatable late.
19. "Momentum" (unbounded growth while a condition holds, silently lost otherwise) is praised as
    "one of the more crucial projects" but needs a visible status light.
20. Late-game trust that *raises* risk (Probe Trust -> drift ~ trust^1.2) is the best-loved
    mechanic thematically and the most confusing practically; the Talk page is full of players asking
    why their probes die. Surface the derivative (net probes/sec) not just the totals.
21. Don't let a build lock the player out of the end: the game needed Memory release, the "set
    Self-Replication to 0 and farm AutoTourney" workaround, and the wiki's "Probe Trust 40 is
    enough" reassurance.

**Clarity**

22. Players could not find Stage 3's loop ("Stage 3 has totally confused me"). The unlock chain
    (1M drifters -> first loss -> Combat -> 10M losses -> Name the battles/OODA -> Honor -> Max Trust)
    is long and every link is hidden until it fires. Foreshadow at least one step.
23. Triggers that depend on unseen counters (Token of Goodwill needs 101M clips; Elliptic Hull
    needs 100 probes lost to hazards; Combat needs one probe lost in combat) are why the wiki exists.
    Decide which to expose.
24. Costs in three or four currencies on one card (ops + creat + yomi + clips) read fine once the
    player knows all four exist; the wiki's project tables are the de-facto manual. Ship a project
    table in-game.
25. The wiki shows the price of version drift: a 2021 mobile rebalance (3x yomi costs, Artifacts,
    Map, a different Threnody song) left every page mixing two sets of numbers. Version your balance
    publicly.

**Narrative delivery**

26. Narrate through the UI, not text: the Business panel vanishing at the HypnoDrones is the most
    cited moment; the Reject ending removes panels one by one. Cheap and devastating.
27. Flavor-text as the only story channel works when it is dense and consistent (Napoleon
    quotes, Oliveros, Kahn; HAL's "Daisy"; the limerick paying off at 1M creativity). The wiki
    catalogues every line, which tells you players read them.
28. Humour by mis-valuation (Male Pattern Baldness +20 Trust > Cure for Cancer +10; "They are still
    monkeys") is the most-quoted joke; it also teaches the alignment theme without exposition.
29. Name your enemies after yourself. "Drifters are your own probes" is the sentence the wiki leads
    with; the Emperor's "Everything we are was in you" closes the loop. Reviewers (Reed, Fogknife)
    single this out.
30. One piece of audio at one moment (Threnody) was enough to earn a wiki page and a mobile-port
    license change; sparing use makes it land.

**Community and tooling**

31. Expose state as globals and the community will build autoclickers, HUDs ("Speedrunning HUD"),
    bots (a median-13,150 s automated run) and cheats; the wiki splits these into "Automation" vs
    "Cheats" rather than condemning them. Decide early what is sanctioned.
32. Timing rules will be argued (IGT vs RTA, because "stocks and … yomi are on a separate timer").
    If you want speedrunning, tie all simulation to one clock.
33. Provide an in-game reset that isn't a cheat; Quantum Temporal Reversion was added specifically
    because "there was no in-game way to start over."
34. Browser-storage saves generate reload exploits and "progress lost" complaints; the Bugs page
    is mostly about them.
35. The first stage's clicking is small-button-sensitive enough that the wiki recommends 120–125 %
    zoom; make the primary button big.
36. Expect the first full run to take 8–12 hours and the hundredth (one HN commenter played it
    "all the way through 100 times") to take 90 minutes; design both experiences — the prestige
    bonuses (+10 % demand / +10 % creativity per run) were considered too small to change the second
    run, which is why only the mobile build's Artifacts made replays interesting.
37. A "what to do next" line in the console at every stall ("Run tournament, pick strategy, earn
    Yomi equal to that strategy's points.") is the cheapest fix for the confusion complaints; the
    game does it inconsistently.
38. Keep the opening instant: $0 and a single button, with the first automation ($5 AutoClipper)
    inside the first minute, is the universally praised hook ("Don't start playing this game, not
    even for a quick test" — HN).

---

*End of reference. Gaps I could not close without direct wiki access: exact Stages-page heading
order and any infobox; full text of the Projects tables; the Trust page's complete milestone table
(reconstructed from source instead); the Honor page's per-battle honor table; the Probe Trust cost
table; Talk-page threads beyond the quoted lines; any wiki "Tips" page (none surfaced — tips live
on resource pages); any wiki "Timeline" page (none surfaced — timing data is on speedrun.com).*

---

# Part III. A Dark Room, source code

# A Dark Room — Source-Code Analysis

Source analysed: `doublespeakgames/adarkroom` at commit `1fada46` ("Update world.js (#739)"), checked out at
`scratchpad/ref/adarkroom/`. The `index.html` comment calls it "A Dark Room (v1.4)" (index.html:6) while
`Engine.VERSION` is `1.3` (engine.js:5) — the save-migration code in `state_manager.js` only knows versions up to 1.3.

All file:line citations below are relative to the repository root (`script/…`, `css/…`, `index.html`). All quoted
strings are the English source strings passed through `_()`; the `lang/` directory contains only translations for
other languages (there is no `lang/en/`), so English text lives inline in the JavaScript.

Conventions used in this document:

- `$SM` is the alias for `StateManager` (state_manager.js:440).
- "ms" are real-world milliseconds. "Hyper mode" halves most of them (see §8).
- Where the source is ambiguous, contradictory, or buggy, it is called out in a **Note:** line rather than smoothed over.

---

### 1. Architecture overview

#### 1.1 One page, one global namespace, jQuery everywhere

The whole game is a single `index.html` that loads ~20 classic (non-module) scripts in a fixed order
(index.html:49–73). Each script defines one global object literal — `Button`, `AudioLibrary`, `AudioEngine`, `Engine`,
`StateManager`/`$SM`, `Header`, `Notifications`, `Events`, `Room`, `Outside`, `World`, `Path`, `Ship`, `Space`,
`Fabricator`, `Prestige`, `Score` — and then the five event-data files attach arrays/objects onto `Events`
(`Events.Global`, `Events.Room`, `Events.Outside`, `Events.Encounters`, `Events.Setpieces`, `Events.Marketing`,
`Events.Executioner`). There is no build step, no bundler, no framework; `package.json` only provides a static
`express` dev server (`dev-server.js`, port 8080).

jQuery 1.10.1 is loaded from Google's CDN with a local fallback (index.html:19–24), plus `jquery.color` (for
`backgroundColor` animation in the space sequence), `jquery.event.move`/`jquery.event.swipe` (touch swipes),
`base64.js` (save export/import) and `translate.js` (the `_()` i18n function). Every DOM node in the game is created
with jQuery (`$('<div>')…appendTo(...)`) — there is **no static game markup** in `index.html` beyond
`#wrapper > #saveNotify + #content > #outerSlider > #main > #header` (index.html:104–113).

Module load order matters because the data files reference objects defined earlier (e.g. `Events.Room` uses
`AudioLibrary.EVENT_NOMAD`, `Events.Executioner` spreads `Enemies.Executioner.guard`). The order is:

| # | Script | Role |
|---|--------|------|
| 1 | `script/Button.js` | Button factory, cooldown bar, disabled state |
| 2 | `script/audioLibrary.js`, `script/audio.js` | File table and Web Audio engine |
| 3 | `script/engine.js` | Bootstrap, menu, save/load, tab travel, key/swipe routing, `$.Dispatch` pub/sub, timing helpers |
| 4 | `script/state_manager.js` | `$SM`: the single mutable `State` tree + change events + income collection |
| 5 | `script/header.js` | Location tabs |
| 6 | `script/notifications.js` | Left-hand message log |
| 7 | `script/events.js` | Event scheduler, modal, story/combat/loot engine |
| 8 | `script/room.js`, `outside.js`, `world.js`, `path.js`, `ship.js`, `space.js`, `fabricator.js` | Location modules |
| 9 | `script/prestige.js`, `script/scoring.js` | End-game carry-over and score |
| 10 | `script/events/global.js`, `room.js`, `outside.js`, `encounters.js`, `setpieces.js`, `marketing.js`, `executioner.js` | Event data |
| 11 | `script/localization.js` | A no-op list of strings so gettext extraction sees dynamic keys |

#### 1.2 Module shape

Every location module follows the same informal interface (there is no base class):

```js
var Room = {
  name: _("Room"),
  options: {},
  init: function(options) {...},          // creates tab + panel, subscribes to stateUpdate, starts timers
  onArrival: function(transition_diff) {...}, // called by Engine.travelTo when the tab becomes active
  handleStateUpdates: function(e) {...},  // called for every $SM change (filters on e.category / e.stateName)
  tab: <jQuery>,                           // header button created by Header.addLocation
  panel: <jQuery>                          // <div class="location"> inside #locationSlider
};
```

Modules are initialised lazily by `Engine.init` based on save state (engine.js:220–235):

```js
Room.init();
if(typeof $SM.get('stores.wood') != 'undefined') { Outside.init(); }
if($SM.get('stores.compass', true) > 0) { Path.init(); }
if ($SM.get('features.location.fabricator')) { Fabricator.init(); }
if($SM.get('features.location.spaceShip')) { Ship.init(); }
```

…and during play by the module that unlocks them: `Room.unlockForest` → `Outside.init()` (room.js:761),
`Room.updateStoresView` → `Path.openPath()` when a compass first appears (room.js:931–934), `Path.init` → `World.init()`
(path.js:26), `World.goHome` → `Ship.init()` / `Fabricator.init()` (world.js:965–973), `Ship.init` → `Space.init()`
(ship.js:79). This "init on unlock" pattern is how the game grows new tabs at runtime.

#### 1.3 The `$.Dispatch` event bus and `handleStateUpdates`

`engine.js:924–938` defines a tiny topic-based pub/sub on top of `jQuery.Callbacks`:

```js
$.Dispatch = function( id ) {
  var callbacks, topic = id && Engine.topics[ id ];
  if ( !topic ) {
    callbacks = jQuery.Callbacks();
    topic = { publish: callbacks.fire, subscribe: callbacks.add, unsubscribe: callbacks.remove };
    if ( id ) { Engine.topics[ id ] = topic; }
  }
  return topic;
};
```

Only one topic is ever used: `'stateUpdate'`. Every module subscribes its `handleStateUpdates` in `init`
(e.g. room.js:554, outside.js:150, events.js:43, path.js:56, world.js:201, ship.js:82, space.js:45,
fabricator.js:111). `$SM.fireUpdate(stateName)` publishes `{category, stateName}` where `category` is the first
path segment (state_manager.js:219–240). Subscribers filter on it:

| Module | Reacts to | Action |
|---|---|---|
| `Room.handleStateUpdates` (room.js:1226) | `category == 'stores'` | `updateStoresView(); updateBuildButtons()` |
| | `category == 'income'` | `updateStoresView(); updateIncomeView()` |
| | `stateName` starts `game.buildings` | `updateBuildButtons()` |
| `Outside.handleStateUpdates` (outside.js:656) | `category == 'stores'` | `updateVillage()` |
| | `stateName` starts `game.workers` or `game.population` | `updateVillage(); updateWorkersView(); updateVillageIncome()` |
| `Events.handleStateUpdates` (events.js:1438) | `stores` or `income` while an event is open | `updateButtons()` (re-evaluate affordability) |
| `Path.handleStateUpdates` (path.js:334) | `character.perks` while on Path | `updatePerks()` |
| | `income` while on Path | `updateOutfitting()` |
| `Fabricator` (fabricator.js:111) | anything | `updateBuildButtons(); updateBlueprints()` |
| `Engine`, `$SM`, `World`, `Ship`, `Space` | — | empty handlers |

This means the UI is almost entirely *reactive to state writes*: a module changes a number through `$SM`, and every
panel that cares redraws. There is no explicit render loop.

#### 1.4 The `$SM` state manager API

`State` is a plain global object (`window.State`). `$SM` reads and writes it by **string path** using `eval`
(state_manager.js:83, 166). Paths may use dots or brackets: `'stores.wood'`, `'stores["cured meat"]'`,
`'game.buildings["hut"]'`, `'outfit[cured meat]'` (the latter is tolerated by `createState`'s split regex
`/[.\[\]'"]+/` at state_manager.js:55).

| Method | Signature | Behaviour (state_manager.js) |
|---|---|---|
| `init()` | — | Creates the 12 top-level categories if missing (l.30–47); subscribes an empty handler. |
| `set(name, value, noEvent)` | l.76–99 | Clamps numbers to `MAX_STORE` (99 999 999 999 999); creates missing parents; **stores can never go negative** (clamped to 0 with a log warning, l.90–93); unless `noEvent`, calls `Engine.saveGame()` and `fireUpdate(name)`. |
| `setM(parent, {k:v}, noEvent)` | l.102–116 | Sets many children with `noEvent=true`, then one save + one `fireUpdate(parent)`. |
| `add(name, value, noEvent)` | l.119–139 | Numeric add; resets NaN to 0; returns 1 on type error. |
| `addM(parent, {k:delta}, noEvent)` | l.142–157 | Many adds, one event. Used for every loot/reward/cost application. |
| `get(name, requestZero)` | l.160–174 | Returns the value, `undefined` if missing, or `0` when `requestZero` and the value is falsy. |
| `setget(name, value, noEvent)` | l.178–181 | set then return (used for `game.builder.level`). |
| `remove(name, noEvent)` | l.183–195 | `delete` the path. |
| `removeBranch(name, noEvent)` | l.197–210 | Recursively delete empty object branches (used by the delayed-event store). |
| `fireUpdate(name, save)` | l.219–224 | Publishes `{category, stateName}` on `'stateUpdate'`. |
| `getCategory(name)` | l.226–240 | Text before the first `.` or `[`. |
| `updateOldState()` | l.243–319 | Save migrations 1.0→1.1→1.2→1.3. |
| `addPerk(name)` / `hasPerk(name)` | l.325–332 | `character.perks[name] = true` + notification `Engine.Perks[name].notify`. |
| `setIncome(source, {delay, stores})` / `getIncome` | l.335–349 | Writes `income[source]`, preserving the running `timeLeft`. |
| `collectIncome()` | l.351–392 | The 1-second income tick (see §2). |
| `addStolen(stores)` / `startThieves()` | l.395–418 | Thief bookkeeping (see §6). |
| `num(name, craftable)` | l.421–432 | Count of a thing: `stores[name]` for good/tool/weapon/upgrade/special, `game.buildings[name]` for buildings. |

The 12 **state categories** (state_manager.js:30–43) and what actually lives in each:

| Category | Contents found in source |
|---|---|
| `features` | `features.location.room / outside / world / spaceShip / fabricator` (booleans), `features.executioner` |
| `stores` | every resource, tool, weapon, upgrade, special item, and `*blueprint` items by name |
| `character` | `character.perks[...]`, `character.punches`, `character.starved`, `character.dehydrated`, `character.blueprints[...]`, (`character.cityCleared` only via migration) |
| `income` | `income[source] = {delay, stores:{...}, timeLeft}` for `builder`, each worker job, and `thieves` |
| `timers` | created but never written to by the current code |
| `game` | `game.fire`, `game.temperature`, `game.builder.level`, `game.buildings[...]`, `game.population`, `game.workers[...]`, `game.outside.seenForest`, `game.world.map / mask` (+ transient `ship/ironmine/...` flags committed from `World.state`), `game.spaceShip.{hull,thrusters,seenShip,seenWarning}`, `game.thieves`, `game.stolen[...]`, `game.cityCleared`, `game.fabricator.seen` |
| `playStats` | `playStats.audioAlertShown`, `playStats.score` |
| `previous` | `previous.stores` (array), `previous.score` — prestige |
| `outfit` | what is packed for the path, mirrored to `Path.outfit` |
| `config` | `config.lightsOff`, `config.hyperMode`, `config.soundOn` |
| `wait` | `wait.Room[4].scenes.wood100.action = secondsLeft` — pending Mysterious-Wanderer returns |
| `cooldown` | `cooldown.<buttonId> = secondsLeft` — residual button cooldowns |

Also written outside any category: `version` (`$SM.set('version', Engine.VERSION)`, engine.js:295) and
`marketing.penrose` (marketing.js:23).

**Note:** because `set` saves to `localStorage` on *every* call without `noEvent`, the game effectively autosaves
on every state mutation; see §8.

#### 1.5 Engine responsibilities

`Engine` (engine.js) is the bootstrap and the only module that knows about all the others:

- `init` (l.81–255): browser/mobile checks (redirects to `browserWarning.html` / `mobileWarning.html` unless
  `?ignorebrowser=true`), disables text selection, loads the save, preloads `MUSIC_*`/`EVENT_*` audio, builds the
  bottom-right **menu** (`language.`, `sound on.`, `get the app.`, `lights off.`, `hyper.`, `restart.`, `share.`,
  `save.`, optional `dropbox.`, `github.`), registers key/swipe handlers, then `$SM.init(); AudioEngine.init();
  Notifications.init(); Events.init(); Room.init();` and conditionally the other modules, applies saved
  `config.*`, `Engine.travelTo(Room)`, and schedules the "Sound Available!" prompt 3 s later (l.253).
- `travelTo(module)` (l.601–636): the tab switch. Slides `#locationSlider` by `-(panelIndex*700)px` over
  `300ms × |Δindex|`, slides `#storesContainer` the same way (so the stores box appears to stay put), fades the
  weapons box out unless going to Room/Path/Fabricator, sets `Engine.activeModule`, calls `module.onArrival(diff)`
  and flushes that module's queued notifications.
- `moveStoresView(top_container, diff)` (l.642–664): positions the stores box at `top_container.height() + 26px`
  so it sits beneath the village / perks box on the Outside / Path panels.
- `getIncomeMsg(num, delay)` (l.682–685): `_("{0} per {1}s", "+N", delay)` → e.g. `+1 per 10s`.
- `keyDown` / `keyUp` (l.691–759): arrows/WASD; on the World map they move the wanderer; elsewhere ←/→ switch tabs
  in order Room → Outside → Path → Fabricator → Ship (when `tabNavigation` is true).
- `setTimeout` / `setInterval` wrappers (l.834–853) that halve the delay in hyper mode unless `skipDouble`.
- Save/load/export/import/restart, lights-off CSS toggle, hyper-mode toggle, analytics stub `Engine.event`.

`Engine.Perks` (engine.js:13–71) is the perk table used by `$SM.addPerk` and `Path.updatePerks`:

| Perk | desc | notify |
|---|---|---|
| boxer | punches do more damage | learned to throw punches with purpose |
| martial artist | punches do even more damage. | learned to fight quite effectively without weapons |
| unarmed master | punch twice as fast, and with even more force | learned to strike faster without weapons |
| barbarian | melee weapons deal more damage | learned to swing weapons with force |
| slow metabolism | go twice as far without eating | learned how to ignore the hunger |
| desert rat | go twice as far without drinking | learned to love the dry air |
| evasive | dodge attacks more effectively | learned to be where they're not |
| precise | land blows more often | learned to predict their movement |
| scout | see farther | learned to look ahead |
| stealthy | better avoid conflict in the wild | learned how not to be seen |
| gastronome | restore more health when eating | learned to make the most of food |

#### 1.6 Layout skeleton produced at runtime

```
body
├─ #wrapper (700px wide, padding-left 220px)
│  ├─ #saveNotify "saved."
│  ├─ #content (700×700, overflow hidden)
│  │  └─ #outerSlider (width = children×700)         ← slides vertically/horizontally for World/Space
│  │     ├─ #main
│  │     │  ├─ #header            (location tabs)
│  │     │  └─ #locationSlider    (width = children×700) ← slides horizontally between tabs
│  │     │     ├─ #roomPanel.location    (#storesContainer, light/stoke buttons, #buildBtns, #craftBtns, #buyBtns)
│  │     │     ├─ #outsidePanel.location (#village, #workers, gather/traps buttons)
│  │     │     ├─ #pathPanel.location    (#perks, #pathScroller > #outfitting + embark)
│  │     │     ├─ #fabricatorPanel.location (#blueprints, #fabricateButtons)   [inserted before ship]
│  │     │     └─ #shipPanel.location    (hull/engine rows, 3 buttons)
│  │     ├─ #worldPanel.location  (#worldOuter > #bagspace-world, #map)
│  │     └─ #spacePanel.location  (#ship "@", #hullRemaining, asteroids)
│  ├─ #notifications (absolute, left 0, 200px wide, 700px tall) > #notifyGradient + .notification…
│  └─ #event.eventPanel (absolute modal, appended per event)
├─ .menu (fixed bottom-right)
└─ a.logo (fixed bottom-left)
```

---

### 2. Game loop, timers and income

#### 2.1 There is no master tick

The game is driven by many independent `setTimeout`/`setInterval` chains, almost all created through
`Engine.setTimeout`/`Engine.setInterval` so that hyper mode halves them. Nothing catches up elapsed time while the tab
is closed: all progress is strictly wall-clock while the page is open (there is no "offline progress"). The complete
inventory:

| Timer | Where created | Cadence (normal) | What it does |
|---|---|---|---|
| Income tick | `Room.init` → `Engine.setTimeout($SM.collectIncome, 1000)` (room.js:578); re-arms itself at state_manager.js:391 as `Engine._incomeTimeout` | every 1 000 ms | Decrements every `income[*].timeLeft`; applies stores when it reaches 0. Skipped while `Engine.activeModule == Space`. |
| Fire cooling | `Room._fireTimer = Engine.setTimeout(Room.coolFire, Room._FIRE_COOL_DELAY)` (room.js:561, re-armed 718/738) | `_FIRE_COOL_DELAY = 5*60*1000` = 5 min after the **last stoke** | Fire level −1 (builder may stoke first). |
| Room temperature | `Room._tempTimer = Engine.setTimeout(Room.adjustTemp, Room._ROOM_WARM_DELAY)` (room.js:562, 756) | `_ROOM_WARM_DELAY = 30*1000` = 30 s, continuous | Temperature moves one step toward fire level. |
| Builder state | `Engine.setTimeout(Room.updateBuilderState, Room._BUILDER_STATE_DELAY)` (room.js:573, 715, 790) | `_BUILDER_STATE_DELAY = 0.5*60*1000` = 30 s while level 0–2 | Advances builder 0→1→2→3 (2→3 only if room ≥ Warm). |
| Forest unlock | `Engine.setTimeout(Room.unlockForest, Room._NEED_WOOD_DELAY)` (room.js:576, 772) | `_NEED_WOOD_DELAY = 15*1000` = 15 s after the stranger collapses | Sets wood to 4, `Outside.init()`. |
| Population growth | `Outside.schedulePopIncrease` → `Outside._popTimeout = Engine.setTimeout(Outside.increasePopulation, nextIncrease*60*1000)` (outside.js:254–258) | `nextIncrease = floor(rand*(3-0.5)) + 0.5` → **0.5, 1.5 or 2.5 min** | Adds villagers if there is hut space; re-arms itself. Started the first time `updateVillage` sees a hut. |
| Random events | `Events.scheduleNextEvent` → `Events._eventTimeout = Engine.setTimeout(Events.triggerEvent, nextEvent*60*1000)` (events.js:1413–1418) | `_EVENT_TIME_RANGE = [3, 6]` → `floor(rand*3)+3` = **3, 4 or 5 min**; ×0.5 (1.5/2/2.5 min) when no event was available | Picks an available event (see §5). |
| Delayed event payoff | `Events.saveDelay` (events.js:1468–1486) | one `Engine.setInterval` every 500 ms decrementing `wait.*` by 0.5 s, one `Engine.setTimeout(action, delay*1000)` | Mysterious Wanderer returns after 60 s. |
| Button cooldown bookkeeping | `Button.cooldown` (Button.js:100–102) | `Engine.setInterval` every 500 ms, decrements `cooldown.<id>` by 0.5 | Persists residual cooldowns. |
| Button cooldown bar | `Button.cooldown` (Button.js:108) | jQuery `animate({width:'0%'}, time*1000, 'linear')` | Visual bar; halved time in hyper mode. |
| Notification fade | `Notifications.printMessage` (notifications.js:65) | `animate({opacity:1}, 500)` | New message fades in; old ones pruned afterwards. |
| Save indicator | `Engine.saveGame` (engine.js:277–280) | shows at most once per `SAVE_DISPLAY = 30 s`, `animate({opacity:0}, 1000)` | "saved." fades out. |
| Sound prompt | `setTimeout(notifyAboutSound, 3000)` (engine.js:253) | once, 3 s after load | "Sound Available!" modal. |
| Combat: enemy attacks | `Events.startEnemyAttacks` → `Engine.setInterval(Events.enemyAttack, attackDelay*1000)` (events.js:174–178) | per enemy `attackDelay` (0.25–4 s) | Enemy swing. |
| Combat: specials | `Engine.setInterval(..., s.delay*1000)` (events.js:161–171) | per-boss `delay` (5/7/13/16 s) | Shield/enrage/energise/meditate. |
| Combat: status timers | plain `setTimeout` (events.js:184–198, 676) | `STUN_DURATION 4000`, `ENRAGE_DURATION 4000`, `MEDITATE_DURATION 5000`, `BOOST_DURATION 3000`, `EXPLOSION_DURATION 3000` | Clear statuses. |
| Combat: DoT | `setInterval` every `DOT_TICK = 1000` (events.js:646) | 1 s | Venom damage. |
| Combat: pacing | `_FIGHT_SPEED = 100` ms animations; win sequence waits 100 ms → 300 ms fade → 1 000 ms (events.js:781–835) | — | — |
| Title blink | `setInterval(…, 3000)` + `Engine.setTimeout(…, 1500, true)` (events.js:1304–1307) | every 3 s show `*** EVENT ***` for 1.5 s | Attention when an event with `blink: true` opens. |
| Space | `setInterval(Space.moveShip, 33)`, `setInterval(Space.lowerVolume, 1000)`, altitude `setInterval` 1 000 ms, asteroid spawn `Engine.setTimeout(createAsteroid, 1000 - altitude*10, true)`, fade-to-black `FTB_SPEED = 60 000` ms | — | The 60-second escape minigame. |

#### 2.2 Income: data shape and the collector

Income entries are stored under `income[source]` as `{ delay: <seconds>, stores: { <store>: <delta per tick> }, timeLeft }`
(state_manager.js:335–341). Three producers write them:

1. **Builder** — set once in `Room.onArrival` when the builder reaches level 4 (room.js:593–601):
   `$SM.setIncome('builder', { delay: 10, stores: { 'wood': 2 } })`.
2. **Village workers** — `Outside.updateVillageIncome` (outside.js:506–534) multiplies each job's per-worker
   template `Outside._INCOME[job].stores` by the number of workers and writes one income entry per job (including
   `gatherer`, whose count is `population − Σ other workers`).
3. **Thieves** — `$SM.startThieves` (state_manager.js:408–418).

The collector (state_manager.js:351–392), in full:

```js
collectIncome: function() {
  var changed = false;
  if(typeof $SM.get('income') != 'undefined' && Engine.activeModule != Space) {
    for(var source in $SM.get('income')) {
      var income = $SM.get('income["'+source+'"]');
      if(typeof income.timeLeft != 'number') { income.timeLeft = 0; }
      income.timeLeft--;
      if(income.timeLeft <= 0) {
        Engine.log('collection income from ' + source);
        if(source == 'thieves') $SM.addStolen(income.stores);
        var cost = income.stores;
        var ok = true;
        if (source != 'thieves') {
          for (var k in cost) {
            var have = $SM.get('stores["' + k + '"]', true);
            if (have + cost[k] < 0) { ok = false; break; }
          }
        }
        if(ok){ $SM.addM('stores', income.stores, true); }
        changed = true;
        if(typeof income.delay == 'number') { income.timeLeft = income.delay; }
      }
    }
  }
  if(changed){ $SM.fireUpdate('income', true); }
  Engine._incomeTimeout = Engine.setTimeout($SM.collectIncome, 1000);
}
```

Key consequences:

- Each source has its **own phase** (`timeLeft` counts down independently), so different jobs pay out on different
  seconds even though all have `delay: 10`.
- A job's whole tick is **all-or-nothing**: if any consumed input would go negative, nothing is produced *and nothing
  is consumed* that tick (`ok = false`). A charcutier with 4 meat simply idles; there is no partial conversion.
- Thieves bypass the check; their negative deltas are applied and clamped to 0 by `$SM.set`, while `addStolen`
  records how much was really taken.
- A **new** income entry starts with `timeLeft` undefined → set to 0 → decremented to −1 → pays **on the first
  tick**. Changing worker counts preserves `timeLeft` (`setIncome`), so re-assigning workers does not reset the
  countdown.
- One `fireUpdate('income', true)` per second at most, which triggers `Room.updateStoresView` + `updateIncomeView`
  — the stores panel is re-rendered every second whenever any income lands.

#### 2.3 Worker table

Per-worker templates from `Outside._INCOME` (outside.js:13–96). All have `delay: 10` seconds. The gatherer is every
villager not assigned elsewhere.

| Job | Unlocked by (building → `Outside.checkWorker` jobMap, outside.js:479–488) | Consumes per tick | Produces per tick | Net per worker per minute |
|---|---|---|---|---|
| gatherer | any population | — | wood +1 | +6 wood |
| hunter | lodge | — | fur +0.5, meat +0.5 | +3 fur, +3 meat |
| trapper | lodge | meat −1 | bait +1 | −6 meat, +6 bait |
| tanner | tannery | fur −5 | leather +1 | −30 fur, +6 leather |
| charcutier | smokehouse | meat −5, wood −5 | cured meat +1 | −30 meat, −30 wood, +6 cured meat |
| iron miner | iron mine (cleared on the map) | cured meat −1 | iron +1 | −6 cured meat, +6 iron |
| coal miner | coal mine | cured meat −1 | coal +1 | −6 cured meat, +6 coal |
| sulphur miner | sulphur mine | cured meat −1 | sulphur +1 | −6 cured meat, +6 sulphur |
| steelworker | steelworks | iron −1, coal −1 | steel +1 | −6 iron, −6 coal, +6 steel |
| armourer | armoury | steel −1, sulphur −1 | bullets +1 | −6 steel, −6 sulphur, +6 bullets |
| *(builder)* | builder level 4 (not a worker row) | — | wood +2 | +12 wood |
| *(thieves)* | any store > 5000 after the world is unlocked | wood −10, fur −5, meat −5 | — | −60 wood, −30 fur, −30 meat |

The hunter's `0.5` means a single hunter produces fractional fur/meat; the stores panel shows `Math.floor(num)`
(room.js:882/899) so the value ticks up every other payout. Two hunters produce 1 fur + 1 meat per 10 s.

Exchange ratios implied by the chain: 5 fur → 1 leather; 5 meat + 5 wood → 1 cured meat; 1 cured meat → 1 ore;
1 iron + 1 coal → 1 steel; 1 steel + 1 sulphur → 1 bullet. To run one steelworker continuously you need one iron
miner, one coal miner, and two cured meat per 10 s (= 2 charcutiers' output = 10 meat + 10 wood per 10 s = ~3.3
hunters' meat).

#### 2.4 Thieves as an income event

The thief mechanic is literally a negative income source. `Room.updateStoresView` checks on every redraw
(room.js:874–877):

```js
if (typeof $SM.get('game.thieves') == 'undefined' && num > 5000 && $SM.get('features.location.world')) {
  $SM.startThieves();
}
```

`startThieves` (state_manager.js:408–418) sets `game.thieves = 1` and `setIncome('thieves', {delay:10, stores:{wood:-10, fur:-5, meat:-5}})`.
The stores panel then shows a `thieves` row in the income tooltip with `-10 per 10s` etc., which is how the player
is told something is wrong. The payoff is the Global event **The Thief** (§5), which only becomes available while
`game.thieves == 1`; both outcomes set it to 2 and remove the income. Hanging the thief returns everything in
`game.stolen`; sparing him grants the `stealthy` perk instead.

#### 2.5 The fire and temperature loop (the room's own "tick")

```
light fire (5 wood; free when stores.wood is undefined)  → fire = Burning (3)
stoke fire (1 wood, 10 s cooldown)                        → fire = min(4, fire+1)
coolFire every 5 min since last stoke                      → fire = fire−1 (if builder ≥ 4, fire ≤ Flickering and wood>0: builder stokes first: wood−1, so net fire stays)
adjustTemp every 30 s                                      → temperature steps ±1 toward fire level
```

Fire levels `FireEnum` (room.js:624–638): 0 dead, 1 smoldering, 2 flickering, 3 burning, 4 roaring.
Temperature `TempEnum` (room.js:608–622): 0 freezing, 1 cold, 2 mild, 3 warm, 4 hot.

Consequences: a player who stops stoking sees the fire decay one level every 5 minutes until the builder (if awake)
holds it at *flickering* for 1 wood per 5 minutes; the room title flips to "A Dark Room" when fire < 2
(room.js:641). Building is refused while the room is ≤ cold ("builder just shivers", room.js:1005–1008).
The builder herself only wakes (levels 2 and 3) once the room is **≥ warm**, which requires the fire to be at least
burning for ~90 s of temperature ticks.

---

### 3. Buttons, cooldowns and crafting/buildings

#### 3.1 `Button.js` in full

`Button.Button(options)` (Button.js:2–48) is a factory that returns a jQuery `<div class="button">`; it is called with
`new` but simply returns the element. Options: `id`, `text`, `click`, `cooldown` (seconds), `cost` (object),
`ttPos` (tooltip position classes, default `"bottom right"`), `width` (CSS width), `boosted` (function returning
whether the cooldown should be halved — used only for the combat "boost" status).

```js
var el = $('<div>')
  .attr('id', typeof(options.id) != 'undefined' ? options.id : "BTN_" + Engine.getGuid())
  .addClass('button')
  .text(typeof(options.text) != 'undefined' ? options.text : "button")
  .click(function() {
    if(!$(this).hasClass('disabled')) {
      Button.cooldown($(this));
      $(this).data("handler")($(this));
    }
  })
  .data("handler",  typeof options.click == 'function' ? options.click : function() { Engine.log("click"); })
  .data("remaining", 0)
  .data("cooldown", typeof options.cooldown == 'number' ? options.cooldown : 0)
  .data('boosted', options.boosted ?? (() => false));

el.append($("<div>").addClass('cooldown'));
Button.cooldown(el, 'state');   // resume any residual cooldown stored in $SM 'cooldown.<id>'
```

Important ordering: **the cooldown starts before the handler runs**. Handlers that decide the click was invalid
(e.g. `Room.lightFire` with < 5 wood) must call `Button.clearCooldown(btn)` themselves (room.js:680, 694).

**Cost tooltip** (Button.js:31–41): if `options.cost` is given, a `<div class="tooltip bottom right">` is appended
containing a `row_key`/`row_val` pair per cost entry (`_(k)` and the number). CSS shows it on hover of the button and
hides it when the button is `.disabled` or `.free` (main.css:415–429) — *except* inside `#event`, where disabled
buttons still show their price (main.css:427–429) so the player can see what they cannot afford.

**Disabled state** (Button.js:52–68):

```js
setDisabled: function(btn, disabled) {
  if(btn) {
    if(!disabled && !btn.data('onCooldown')) { btn.removeClass('disabled'); }
    else if(disabled) { btn.addClass('disabled'); }
    btn.data('disabled', disabled);
  }
},
isDisabled: function(btn) { return btn ? btn.data('disabled') === true : false; }
```

Two independent reasons keep the `disabled` class on: a logical `data('disabled')` flag and a transient
`data('onCooldown')` flag. `setDisabled(btn,false)` will not re-enable a button mid-cooldown, and `clearCooldown`
will not re-enable a logically disabled one (Button.js:127–129).

**Cooldown** (Button.js:70–114):

```js
cooldown: function(btn, option) {
  var cd = btn.data("cooldown");
  if (btn.data('boosted')()) { cd /= 2; }
  var id = 'cooldown.'+ btn.attr('id');
  if(cd > 0) {
    if(typeof option == 'number') { cd = option; }
    var start, left;
    switch(option){
      case 'state':                       // restoring after reload
        if(!$SM.get(id)){ return; }
        start = Math.min($SM.get(id), cd);
        left = (start / cd).toFixed(4);
        break;
      default:
        start = cd; left = 1;
    }
    Button.clearCooldown(btn);
    if(Button.saveCooldown){
      $SM.set(id,start);
      btn.data('countdown', Engine.setInterval(function(){
        $SM.set(id, $SM.get(id, true) - 0.5, true);
      },500));
    }
    var time = start;
    if (Engine.options.doubleTime){ time /= 2; }
    $('div.cooldown', btn).width(left * 100 +"%").animate({width: '0%'}, time * 1000, 'linear', function() {
      Button.clearCooldown(btn, true);
    });
    btn.addClass('disabled');
    btn.data('onCooldown', true);
  }
}
```

So the cooldown is **rendered as a grey bar** (`div.cooldown`, `background-color: #DDDDDD`, absolutely positioned
behind the text with `z-index:-1`, main.css:270–277) whose width is animated linearly from 100 % to 0 % over `cd`
seconds; when it reaches zero the button is re-enabled. While cooling the button also carries `.disabled` so it
looks grey. The residual is written to `$SM 'cooldown.<id>'` every half second so a reload resumes the bar at the
right fraction (`'state'` branch) — but `Button.saveCooldown` is switched off for the duration of an event
(events.js:1395/1429), so combat buttons are not persisted. `clearCooldown` (Button.js:116–130) stops the animation,
clears the interval and removes the saved key.

#### 3.2 Button cooldown values used in the game

| Button | Cooldown | Source |
|---|---|---|
| light fire / stoke fire | `Room._STOKE_COOLDOWN = 10` s (0 in debug) | room.js:9, 535, 545 |
| gather wood | `Outside._GATHER_DELAY = 60` s (0 in debug) | outside.js:8, 170 |
| check traps | `Outside._TRAPS_DELAY = 90` s (0 in debug) | outside.js:9, 544 |
| embark | `World.DEATH_COOLDOWN = 120` s — but cleared immediately on arrival in the world (world.js:1077); it effectively only applies after death (world.js:940) | path.js:48 |
| lift off | `Ship.LIFTOFF_COOLDOWN = 120` s; re-applied after a crash (space.js:377) | ship.js:5, 71 |
| build / craft / buy buttons | none | room.js:1145, 1179 |
| reinforce hull / upgrade engine | none | ship.js:48–63 |
| event choice buttons | optional per-button `cooldown` (setpieces use `Events._LEAVE_COOLDOWN = 1` s on "continue/leave" after loot) | events.js:1153–1160 |
| combat: weapons | `World.Weapons[*].cooldown` (fists 2, melee 2, rifle 1, laser 1, grenade 5, bolas 15, plasma 1, energy blade 2, disruptor 15); fists halved by `unarmed master`; all halved while "boost" is active | world.js:45–123, events.js:360–388 |
| combat: eat meat / meds / hypo / shield / boost | `_EAT_COOLDOWN 5`, `_MEDS_COOLDOWN 7`, `_HYPO_COOLDOWN 7`, `_SHIELD_COOLDOWN 10`, `_STIM_COOLDOWN 10`; eat/meds/hypo have **0** cooldown on the post-fight loot screen (events.js:820–826) | events.js:9–14 |
| take everything / leave | `_LEAVE_COOLDOWN 1` | events.js:14, 807, 939 |

#### 3.3 `Room.Craftables` — complete table

From room.js:12–357. `maximum` undefined means unlimited. `type` decides where the button lives: `building` →
`#buildBtns` ("build:"); `tool`/`upgrade`/`weapon` → `#craftBtns` ("craft:", requires a workshop). All building
costs are functions of current state; only trap and hut scale.

| Key | type | max | cost (exact) | availableMsg | buildMsg | maxMsg | audio |
|---|---|---|---|---|---|---|---|
| trap | building | 10 | `wood: 10 + n*10` where `n = game.buildings.trap` (10, 20 … 100) | builder says she can make traps to catch any creatures might still be alive out there | more traps to catch more creatures | more traps won't help now | BUILD_TRAP |
| cart | building | 1 | `wood: 30` | builder says she can make a cart for carrying wood | the rickety cart will carry more wood from the forest | — | BUILD_CART |
| hut | building | 20 | `wood: 100 + n*50` where `n = game.buildings.hut` (100, 150 … 1050) | builder says there are more wanderers. says they'll work, too. | builder puts up a hut, out in the forest. says word will get around. | no more room for huts. | BUILD_HUT |
| lodge | building | 1 | `wood 200, fur 10, meat 5` | villagers could help hunt, given the means | the hunting lodge stands in the forest, a ways out of town | — | BUILD_LODGE |
| trading post | building | 1 | `wood 400, fur 100` | a trading post would make commerce easier | now the nomads have a place to set up shop, they might stick around a while | — | BUILD_TRADING_POST |
| tannery | building | 1 | `wood 500, fur 50` | builder says leather could be useful. says the villagers could make it. | tannery goes up quick, on the edge of the village | — | BUILD_TANNERY |
| smokehouse | building | 1 | `wood 600, meat 50` | should cure the meat, or it'll spoil. builder says she can fix something up. | builder finishes the smokehouse. she looks hungry. | — | BUILD_SMOKEHOUSE |
| workshop | building | 1 | `wood 800, leather 100, scales 10` | builder says she could make finer things, if she had the tools | workshop's finally ready. builder's excited to get to it | — | BUILD_WORKSHOP |
| steelworks | building | 1 | `wood 1500, iron 100, coal 100` | builder says the villagers could make steel, given the tools | a haze falls over the village as the steelworks fires up | — | BUILD_STEELWORKS |
| armoury | building | 1 | `wood 3000, steel 100, sulphur 50` | builder says it'd be useful to have a steady source of bullets | armoury's done, welcoming back the weapons of the past. | — | BUILD_ARMOURY |
| torch | tool | ∞ | `wood 1, cloth 1` | — | a torch to keep the dark away | — | CRAFT_TORCH |
| waterskin | upgrade | 1 | `leather 50` | — | this waterskin'll hold a bit of water, at least | — | CRAFT_WATERSKIN |
| cask | upgrade | 1 | `leather 100, iron 20` | — | the cask holds enough water for longer expeditions | — | CRAFT_CASK |
| water tank | upgrade | 1 | `iron 100, steel 50` | — | never go thirsty again | — | CRAFT_WATER_TANK |
| bone spear | weapon | ∞ | `wood 100, teeth 5` | — | this spear's not elegant, but it's pretty good at stabbing | — | CRAFT_BONE_SPEAR |
| rucksack | upgrade | 1 | `leather 200` | — | carrying more means longer expeditions to the wilds | — | CRAFT_RUCKSACK |
| wagon | upgrade | 1 | `wood 500, iron 100` | — | the wagon can carry a lot of supplies | — | CRAFT_WAGON |
| convoy | upgrade | 1 | `wood 1000, iron 200, steel 100` | — | the convoy can haul mostly everything | — | CRAFT_CONVOY |
| l armour | upgrade | 1 | `leather 200, scales 20` | — | leather's not strong. better than rags, though. | — | CRAFT_LEATHER_ARMOUR |
| i armour | upgrade | 1 | `leather 200, iron 100` | — | iron's stronger than leather | — | CRAFT_IRON_ARMOUR |
| s armour | upgrade | 1 | `leather 200, steel 100` | — | steel's stronger than iron | — | CRAFT_STEEL_ARMOUR |
| iron sword | weapon | ∞ | `wood 200, leather 50, iron 20` | — | sword is sharp. good protection out in the wilds. | — | CRAFT_IRON_SWORD |
| steel sword | weapon | ∞ | `wood 500, leather 100, steel 20` | — | the steel is strong, and the blade true. | — | CRAFT_STEEL_SWORD |
| rifle | weapon | ∞ | `wood 200, steel 50, sulphur 50` | — | black powder and bullets, like the old days. | — | CRAFT_RIFLE |

**Note:** the `audio` fields reference `AudioLibrary.BUILD_TRAP`, `CRAFT_TORCH`, etc., none of which exist in
`audioLibrary.js` (it only defines `BUILD`, `CRAFT`, `BUY`). They evaluate to `undefined` and are never read —
`Room.build` plays the generic `AudioLibrary.CRAFT` or `AudioLibrary.BUILD` by type (room.js:1057–1066).

#### 3.4 `Room.TradeGoods` — complete table

From room.js:359–485. Shown in `#buyBtns` ("buy:") once a trading post exists.

| Key | type | max | cost | Availability rule (`Room.buyUnlocked`, room.js:1105–1115) |
|---|---|---|---|---|
| scales | good | ∞ | `fur 150` | trading post built AND `stores.scales` already defined (you've seen one) |
| teeth | good | ∞ | `fur 300` | …AND seen teeth |
| iron | good | ∞ | `fur 150, scales 50` | …AND seen iron |
| coal | good | ∞ | `fur 200, teeth 50` | …AND seen coal |
| steel | good | ∞ | `fur 300, scales 50, teeth 50` | …AND seen steel |
| medicine | good | ∞ | `scales 50, teeth 30` | …AND seen medicine |
| bullets | good | ∞ | `scales 10` | …AND seen bullets |
| energy cell | good | ∞ | `scales 10, teeth 10` | …AND seen energy cell |
| bolas | weapon | ∞ | `teeth 10` | …AND seen bolas |
| grenade | weapon | ∞ | `scales 100, teeth 50` | …AND seen grenade |
| bayonet | weapon | ∞ | `scales 500, teeth 250` | …AND seen bayonet |
| alien alloy | good | ∞ | `fur 1500, scales 750, teeth 300` | …AND seen alien alloy |
| compass | special | 1 | `fur 400, scales 20, teeth 10` | trading post built (compass is the one item always offered) |

`Room.MiscItems` (room.js:487–491) only declares `'laser rifle': {type:'weapon'}` so the stores view knows to put
it in the weapons box.

**Note:** `Room.buy` calls `Notifications.notify(Room, good.buildMsg)` (room.js:995) but no trade good defines a
`buildMsg`; `notify` returns early on `undefined` text (notifications.js:31), so purchases are silent apart from
the `BUY` sound. Likewise `good.maxMsg` is undefined for all goods.

#### 3.5 How buttons reveal: `craftUnlocked`, `buyUnlocked`, `updateBuildButtons`

`Room.updateBuildButtons` (room.js:1117–1217) runs on init and on every `stores` / `game.buildings` state change.
It lazily creates the three sections (`#buildBtns` always; `#craftBtns` only once `game.buildings.workshop > 0`;
`#buyBtns` only once `game.buildings["trading post"] > 0`), then for every craftable without a button asks
`Room.craftUnlocked(k)`; for every trade good asks `Room.buyUnlocked(g)`. Buttons fade in over 300 ms. Existing
buttons get their tooltips refreshed (because trap/hut costs scale) and are disabled when at `maximum`; hitting the
max also fires `maxMsg` once ("more traps won't help now" / "no more room for huts.").

`craftUnlocked` (room.js:1073–1103) is the whole "the builder has an idea" system:

```js
craftUnlocked: function (thing) {
  if (Room.buttons[thing]) { return true; }
  if ($SM.get('game.builder.level') < 4) return false;
  var craftable = Room.Craftables[thing];
  if (Room.needsWorkshop(craftable.type) && $SM.get('game.buildings["' + 'workshop' + '"]', true) === 0) return false;
  var cost = craftable.cost();
  //show button if one has already been built
  if ($SM.get('game.buildings["' + thing + '"]') > 0) { Room.buttons[thing] = true; return true; }
  // Show buttons if we have at least 1/2 the wood, and all other components have been seen.
  if ($SM.get('stores.wood', true) < cost['wood'] * 0.5) { return false; }
  for (var c in cost) {
    if (!$SM.get('stores["' + c + '"]')) { return false; }
  }
  Room.buttons[thing] = true;
  if (!$SM.get('game.buildings["' + thing + '"]')) { Notifications.notify(Room, craftable.availableMsg); }
  return true;
}
```

So a building/craft button appears when **all** of:

1. the builder is awake and helping (`game.builder.level == 4`);
2. for tools/upgrades/weapons, a workshop exists (`needsWorkshop`, room.js:1069–1071);
3. you hold at least **half the wood cost** (for items with no wood in the cost, `cost['wood']` is `undefined` and
   `wood < NaN` is false, so the check passes);
4. every other cost component is **non-zero in stores** ("seen" = `$SM.get(...)` truthy — note this means having
   had the resource *and still having at least 1*, since a store that dropped to 0 is falsy);

and the `availableMsg` is printed the first time. Once unlocked the flag `Room.buttons[thing]` is sticky for the
session (it is also re-derived on reload from the same rules, which is why the builder's hints replay after a
refresh if you still meet the thresholds).

Resulting **reveal thresholds** (all also require builder level 4 and room temperature > cold to actually build):

| Button | Appears when | Then costs |
|---|---|---|
| trap | wood ≥ 5 | 10 wood (then 20, 30 … up to 100 for the 10th) |
| cart | wood ≥ 15 | 30 wood |
| hut | wood ≥ 50 | 100 wood (+50 per hut) |
| lodge | wood ≥ 100 and ≥1 fur and ≥1 meat | 200 wood, 10 fur, 5 meat |
| trading post | wood ≥ 200 and ≥1 fur | 400 wood, 100 fur |
| tannery | wood ≥ 250 and ≥1 fur | 500 wood, 50 fur |
| smokehouse | wood ≥ 300 and ≥1 meat | 600 wood, 50 meat |
| workshop | wood ≥ 400 and ≥1 leather and ≥1 scales | 800 wood, 100 leather, 10 scales |
| steelworks | wood ≥ 750 and ≥1 iron and ≥1 coal | 1500 wood, 100 iron, 100 coal |
| armoury | wood ≥ 1500 and ≥1 steel and ≥1 sulphur | 3000 wood, 100 steel, 50 sulphur |
| torch | workshop, wood ≥ 1 (0.5), ≥1 cloth | 1 wood, 1 cloth |
| waterskin | workshop, ≥1 leather | 50 leather |
| cask | workshop, ≥1 leather, ≥1 iron | 100 leather, 20 iron |
| water tank | workshop, ≥1 iron, ≥1 steel | 100 iron, 50 steel |
| bone spear | workshop, wood ≥ 50, ≥1 teeth | 100 wood, 5 teeth |
| rucksack | workshop, ≥1 leather | 200 leather |
| wagon | workshop, wood ≥ 250, ≥1 iron | 500 wood, 100 iron |
| convoy | workshop, wood ≥ 500, ≥1 iron, ≥1 steel | 1000 wood, 200 iron, 100 steel |
| l armour | workshop, ≥1 leather, ≥1 scales | 200 leather, 20 scales |
| i armour | workshop, ≥1 leather, ≥1 iron | 200 leather, 100 iron |
| s armour | workshop, ≥1 leather, ≥1 steel | 200 leather, 100 steel |
| iron sword | workshop, wood ≥ 100, ≥1 leather, ≥1 iron | 200 wood, 50 leather, 20 iron |
| steel sword | workshop, wood ≥ 250, ≥1 leather, ≥1 steel | 500 wood, 100 leather, 20 steel |
| rifle | workshop, wood ≥ 100, ≥1 steel, ≥1 sulphur | 200 wood, 50 steel, 50 sulphur |

`Room.build` (room.js:1003–1067): refuses with "builder just shivers" if temperature ≤ cold; refuses silently at
maximum; for each cost component prints `"not enough " + k` and aborts if short (the English strings
`'not enough wood'` etc. are enumerated in localization.js:46–57); otherwise `$SM.setM('stores', newValues)`,
prints `buildMsg`, increments `stores[thing]` or `game.buildings[thing]`, and plays `CRAFT` (tool/upgrade/weapon)
or `BUILD` (building). `Room.buy` (room.js:973–1001) is the same without the temperature check and with the `BUY`
sound.

#### 3.6 The builder state machine (`game.builder.level`)

Levels and transitions (room.js:564–582, 707–726, 767–793, 593–601):

| Level | Meaning (comment at room.js:565–571) | Entered by | Message |
|---|---|---|---|
| −1 | not yet triggered | `Room.init` on a new game (`$SM.set('game.builder.level', -1)`, l.511) | — |
| 0 | Approaching | `onFireChange` when fire > smoldering (value > 1) and level < 0 (l.712–716) | "the light from the fire spills from the windows, out into the dark" |
| 1 | Collapsed | `updateBuilderState` 30 s later (l.769–773); also arms `unlockForest` in 15 s | "a ragged stranger stumbles through the door and collapses in the corner" |
| 2 | Shivering | next 30 s tick **if temperature ≥ warm** (l.774–788) | "the stranger shivers, and mumbles quietly. her words are unintelligible." |
| 3 | Sleeping | next 30 s tick if temperature ≥ warm | "the stranger in the corner stops shivering. her breathing calms." |
| 4 | Helping | **`Room.onArrival`** when level == 3 (l.593–601) — i.e. the next time the Room tab is *arrived at* (travelling back from the forest, or a page reload) | "the stranger is standing by the fire. she says she can help. says she builds things." + builder income `wood +2 / 10 s` |

Timing between levels: 30 s ticks (`_BUILDER_STATE_DELAY`), but levels 2 and 3 are gated on room temperature,
which climbs one step per 30 s toward the fire level (`adjustTemp`). With the fire lit to *burning* (3) at t=0 the
room is cold at ~30 s, mild at ~60 s, warm at ~90 s; the builder reaches level 1 at ~30 s, fails the warmth check
at ~60 s, becomes level 2 at ~90–120 s, level 3 at ~120–150 s, and level 4 when you next enter the room. In debug
mode all of these become 5 s. **Note:** level 3→4 happens only in `onArrival`, so a player who never leaves the
Room tab never gets the builder — in practice the forest tab appears 15 s after level 1 and the player goes there
to gather wood, so this is rarely noticed; it is nevertheless a hidden dependency on tab travel.

#### 3.7 The Outside workers panel

- **Population cap**: `Outside.getMaxPopulation() = game.buildings.hut * Outside._HUT_ROOM` with `_HUT_ROOM = 4`
  (outside.js:11, 177–179). 20 huts → 80 villagers. Displayed as `pop N/M` in the village box legend
  (outside.js:451).
- **Growth**: `increasePopulation` (outside.js:181–201): `space = max − pop`; if positive,
  `num = floor(rand * space/2 + space/2)` (between half and all of the remaining space, min 1), notify by size:
  1 → "a stranger arrives in the night"; <5 → "a weathered family takes up in one of the huts."; <10 → "a small
  group arrives, all dust and bones."; <30 → "a convoy lurches in, equal parts worry and hope."; else → "the
  town's booming. word does get around." Then `schedulePopIncrease()` (0.5 / 1.5 / 2.5 min). These notifications use
  module `null`, so they print regardless of the active tab.
- **Workers view** (`Outside.updateWorkersView`, outside.js:260–333): a `#workers` block (absolute, `left:160px`,
  150 px wide, outside.css:30–35) with one `.workerRow` per key in `game.workers`, plus the synthetic `gatherer`
  row always first showing `population − Σ workers`. Rows are inserted alphabetically after gatherer. Each
  non-gatherer row has four CSS-triangle controls (`.upBtn`, `.dnBtn` at right 0; `.upManyBtn`, `.dnManyBtn` at
  right −15px; main.css:281–381) wired as `click([1], Outside.increaseWorker)` / `click([10], …)` — the array `[1]`
  or `[10]` is passed as `event.data` (outside.js:355–360). `increaseWorker` moves `min(freeGatherers, n)`
  (outside.js:376–383); `decreaseWorker` moves `min(current, n)` back (l.385–392). Up buttons are disabled when no
  gatherers remain; down buttons when the row is 0. Each row has a hover tooltip listing that job's per-worker
  income lines (`+1 per 10s`, `-5 per 10s`…) via `Engine.getIncomeMsg` (outside.js:364–371), and
  `updateVillageIncome` rewrites the tooltip with the *total* for the current worker count (l.513–524).
- **Job rows appear** when the corresponding building first exists: `Outside.checkWorker(name)` (outside.js:478–504)
  is called from `updateVillage` for every building and creates `game.workers[job] = 0` for the building's jobs,
  which makes the row render. Mines are "buildings" committed by `World.goHome` (world.js:953–964).
- **Killing villagers** (`killVillagers`, outside.js:203–222): subtracts population, clamps at 0, then if the
  implied gatherer count went negative removes workers job-by-job in `game.workers` order to close the gap.
  `destroyHuts(num, allowEmpty)` (l.224–252) removes huts, killing 4 (full hut) or `pop % 4` (the partial hut)
  depending on a random target.

---

### 4. Panels, reveals and UI reshuffling

#### 4.1 Header tabs (`header.js`)

`Header.addLocation(text, id, module, before)` (header.js:19–33) appends `<div id="location_<id>" class="headerButton">`
to `#header`, or inserts it before `#location_<before>` (used by the Fabricator to slot in before the ship,
fabricator.js:99). Clicking a tab calls `Engine.travelTo(module)` only if `Header.canTravel()`, i.e. **more than one
tab exists** (header.js:15–17) — the lone "A Dark Room" tab is inert. Tabs are created in this order and with these
initial names:

| Tab id | Created by | Initial name | Renamed by |
|---|---|---|---|
| `location_room` | `Room.init` (room.js:520) | A Dark Room | `Room.setTitle` (room.js:640–646): **"A Dark Room"** when `game.fire.value < 2`, else **"A Firelit Room"**. Also sets `document.title` if active. Called on arrival and on every fire change. |
| `location_outside` | `Outside.init` (outside.js:142) | A Silent Forest | `Outside.setTitle` (outside.js:557–578) by **hut count**: 0 → "A Silent Forest"; 1 → "A Lonely Hut"; 2–4 → "A Tiny Village"; 5–8 → "A Modest Village"; 9–14 → "A Large Village"; 15–20 → "A Raucous Village". Called from `updateVillage` (every stores change) and on arrival. The background music track follows the same thresholds (outside.js:592–605). |
| `location_path` | `Path.init` (path.js:29) | A Dusty Path | never renamed (`document.title` = "A Dusty Path") |
| `location_fabricator` | `Fabricator.init` (fabricator.js:99) | A Whirring Fabricator | never renamed |
| `location_ship` | `Ship.init` (ship.js:26) | An Old Starship | never renamed |
| *(no tab)* | `World` | — | `document.title` = "A Barren World" while exploring (world.js:1098–1100) |
| *(no tab)* | `Space` | — | `document.title` = Troposphere / Stratosphere / Mesosphere / Thermosphere / Exosphere / Space by altitude (<10/<20/<30/<45/<60/else, space.js:74–92) |

The village is named by **huts**, not population; the population thresholds that matter are elsewhere (events:
Fire needs pop > 50, Sickness 10 < pop < 50, Plague pop > 50; thieves by store size).

Tab styling: `div.headerButton` 17 px, floated left, `border-left: 1px solid black; margin-left:10px;
padding-left:10px`, first child without the border; hover and `.selected` underline (main.css:149–171).

#### 4.2 The stores panel (`Room.updateStoresView`, room.js:795–935)

Structure created lazily inside `#storesContainer` (which `Room.init` prepends to `#roomPanel`, room.js:551, and
`Engine.travelTo` slides along with the location so it appears fixed at the top-right of every panel):

```
#storesContainer                      (absolute; top 0; right 0 — room.css:25–29)
├─ #stores[data-legend="stores"]       (200px + padding, 1px border; legend drawn by :before at top:-13px — room.css:31–46)
│  ├─ #resources   → one .storeRow per ordinary store (default branch)
│  └─ #special     → 'special' type (compass only)
└─ #weapons[data-legend="weapons"]     (same box style, margin-top 15px — room.css:52–60) → 'weapon' type
```

Algorithm, per key in `$SM.get('stores')`:

1. Skip keys containing `blueprint` (room.js:829–832).
2. Look up the item's `type` in `Room.Craftables`, `Room.TradeGoods`, `Room.MiscItems`, `Fabricator.Craftables`
   (l.834–840). `upgrade` and `building` types are **never shown** (l.844–849) — so waterskin/rucksack/armour don't
   clutter the list; `weapon` → `#weapons`; `special` → `#special`; everything else (including unknown keys like
   `medicine`, `charm`, `hypo`) → `#resources`.
3. Corrupt (non-number) counts are reset to 0 (l.865–870).
4. Thieves check (l.875–877, §2.4).
5. If the row does not exist, create `<div id="row_<key-with-dashes>" class="storeRow"><div class="row_key">name</div><div class="row_val">N</div><div class="clear"/></div>`
   and insert it **alphabetically by displayed (localised) name** by scanning existing children for the last one
   whose name sorts lower (l.879–897). Otherwise just update the number (`Math.floor(num)`).
6. New containers fade in (`opacity 0 → 1` over 300 ms linear) only once they have children (l.903–921) — the
   stores box therefore materialises the moment wood exists.
7. If a row was added, rebuild income tooltips; if the outside panel exists, `Outside.updateVillage()`; if a
   compass has appeared and the path isn't open, `Path.openPath()` (l.923–934).

**Note:** rows are never removed when a store hits 0 — a resource once seen stays in the list at 0.

**Income tooltips** (`Room.updateIncomeView`, room.js:937–971): for every `.storeRow` in `#resources`, remove the old
tooltip and build a new `div.tooltip` (`bottom right`, or `top right` when the row index > 10 so it doesn't fall off
the bottom) containing, for each income source whose `stores` touches this store with a non-zero delta, a
`row_key` with the source name (`gatherer`, `builder`, `thieves`, `charcutier` …) and a `row_val` with
`Engine.getIncomeMsg(delta, delay)` → `"+2 per 10s"` / `"-5 per 10s"`; then a bold `total` pair summing all sources
(`div.total {font-weight:bold}`, main.css:204–206). The tooltip is only attached if it has children, so stores with
no income have no hover. (`storeName` is recovered from the row id with `.replace('-', ' ')`, which only replaces
the first dash — fine for all current two-word names.)

#### 4.3 Complete reveal table

| UI element | Reveal condition | Code |
|---|---|---|
| Room tab "A Dark Room", `light fire` button | always (game start) | room.js:520–538 |
| `stoke fire` replaces `light fire` | fire not dead; swap keeps a running cooldown (`Button.cooldown` on the other button) | `Room.updateButton` room.js:648–672 |
| Cost tooltips on light/stoke | hidden (`.free`) while `stores.wood` is undefined/0 | room.js:665–671, main.css:423 |
| Builder messages begin | fire level > 1 (first `light fire` gives *burning* = 3) | room.js:712–716 |
| **Stores box** (`#stores`) with `wood 4` | `Room.unlockForest` 15 s after the stranger collapses sets `stores.wood = 4` → `stores` update → `updateStoresView` appends the box | room.js:759–765, 913–916 |
| **Outside tab "A Silent Forest"**, `gather wood` button, `#village` box labelled "forest" | same `unlockForest` → `Outside.init()`; village box only appended when it has >1 child (i.e. a building exists) | outside.js:130–175, 462–465 |
| `build:` section + first button (`trap`) | builder level 4 and wood ≥ 5 (see §3.5) | room.js:1117–1172 |
| `check traps` button | `game.buildings.trap > 0`; created on the next arrival at the forest (`updateTrapButton` runs from `Outside.onArrival`/`init` and the Ruined Trap event, not from the state bus) | `Outside.updateTrapButton` outside.js:536–555 |
| Village box legend "village" + `pop N/M` | first hut | outside.js:453–460 |
| Workers block | first villager arrives (population > 0); job rows as buildings/mines appear | outside.js:265, 478–504 |
| **Weapons box** | first store of type `weapon` (bone spear crafted, or bolas/rifle etc. looted) | room.js:918–921 |
| `craft:` section | `game.buildings.workshop > 0` | room.js:1125–1130 |
| `buy:` section + `compass` button | `game.buildings["trading post"] > 0` | room.js:1132–1137, 1105–1115 |
| Other buy buttons | trading post + that good already present in stores | room.js:1108–1112 |
| Compass row in stores (`#special`) + tooltip "the compass points <dir>" | compass bought | room.js:853–855, 1219–1224; world.js:191–195 |
| **Path tab "A Dusty Path"**, supplies box, `embark` | `stores.compass` becomes truthy → `Path.openPath()` → `Path.init()` (+ `World.init()` generates the map); notification "the compass points <dir>" | room.js:931–934, path.js:59–63 |
| `embark` enabled | `Path.outfit['cured meat'] > 0` | path.js:245–249 |
| Perks box on Path | any `character.perks` | path.js:100–126 |
| **World map** (the `#outerSlider` slides left 700 px) | `Path.embark` | path.js:324–332 |
| Village→outpost roads | `World.clearDungeon` after finishing a dungeon ending | world.js:204–276 |
| Iron/coal/sulphur mine as buildings, miner job rows | returning home with `World.state.<mine> = true` | world.js:953–964 |
| **Ship tab "An Old Starship"** | returning home after visiting the crashed ship tile (`World.state.ship`) | world.js:965–968, ship.js:11–83 |
| `lift off` enabled | `game.spaceShip.hull > 0` | ship.js:74–76, 111–113 |
| **Fabricator tab "A Whirring Fabricator"** (inserted before Ship) | returning home after taking the device from the battleship antechamber (`World.state.executioner`) | world.js:969–973, fabricator.js:92–119 |
| Fabricator blueprint-gated buttons | corresponding `*blueprint` item carried home → `character.blueprints[item]` | world.js:989–1009, fabricator.js:213–215 |
| Blueprints box on Fabricator | any `character.blueprints` | fabricator.js:187–211 |
| **Space** (`#outerSlider` slides down 700 px, body fades to black over 60 s) | `Ship.liftOff` | ship.js:167–172, space.js:50–72, 245–289 |
| End screen (score, restart, app links) | reaching altitude 60 without losing all hull | space.js:382–567 |
| Cache landmark "A Destroyed Village" on the next run's map | `previous.stores` exists (prestige) | world.js:153–156 |

#### 4.4 How "A Dark Room" hides the game behind "stoke fire"

At first load the only interactive element on the page is one 80 px-wide button reading **light fire**; the tab
bar has a single non-clickable tab; there is no stores box, no counters, no menu text beyond the tiny grey links at
the bottom-right. The reveal is sequenced entirely by the builder timers, and **no resource counter exists until
wood does**. Exact opening (`Room.init`, `onFireChange`, `updateBuilderState`, `unlockForest`; times measured from
the moment the player clicks *light fire*; the first click is free because `stores.wood` is undefined, see note):

| t | What the code does | What the player sees |
|---|---|---|
| page load | `Room.init`: `game.builder.level = -1`, temperature *freezing*, fire *dead*; fire-cool timer (5 min) and temp timer (30 s) armed; `collectIncome` chain started. Two notifications queued to Room and printed on `travelTo(Room)`. | Left column: "the room is freezing." then "the fire is dead." A single button **light fire**. |
| +3 s | `notifyAboutSound` (engine.js:864–894) | Modal "Sound Available!": "ears flooded with new sensations." / "perhaps silence is safer?" with *enable audio* / *disable audio*. |
| click | `Room.lightFire` (room.js:676–688): `wood = $SM.get('stores.wood')` is `undefined`; `undefined < 5` is false and `undefined > 4` is false, so **no wood is spent**; `game.fire = Burning`. `onFireChange` → "the fire is burning."; since fire > 1 and builder < 0: builder level 0, "the light from the fire spills from the windows, out into the dark"; `updateBuilderState` scheduled in 30 s; fire-cool timer reset to 5 min. `updateButton` swaps in **stoke fire** (10 s cooldown bar). Title becomes "A Firelit Room". | Log: "the fire is burning." / "the light from the fire spills from the windows, out into the dark". Button now **stoke fire**. |
| +30 s (temp tick) | `adjustTemp`: temperature 0→1 | "the room is cold." |
| +30 s (builder tick) | `updateBuilderState`: level 0→1, "a ragged stranger stumbles through the door and collapses in the corner"; **`unlockForest` scheduled in 15 s**; next builder tick in 30 s. | Log line. |
| +45 s | `Room.unlockForest` (room.js:759–765): `stores.wood = 4`; `Outside.init()` creates tab **A Silent Forest** and the `gather wood` button (60 s cooldown); notifications "the wind howls outside", "the wood is running out". The `stores` state event makes `#stores` appear with `wood 4`. Tabs are now clickable (`canTravel`). The `stoke fire` button loses `.free` at the next fire change (`updateButton` runs from `onFireChange`), after which its tooltip (`wood 1`) shows on hover. | A second tab appears; a bordered **stores** box with `wood 4` fades in top-right. Stoking now visibly costs wood. |
| +60 s | temp 1→2 "the room is mild."; builder tick: temperature < warm → no change. | |
| +90 s | temp 2→3 "the room is warm." ; builder tick (same instant or 30 s later): level 1→2 "the stranger shivers, and mumbles quietly. her words are unintelligible." | |
| +120–150 s | level 2→3 "the stranger in the corner stops shivering. her breathing calms." No more builder timers. | |
| next arrival at Room | `Room.onArrival`: level 3→4; builder income `wood +2 per 10 s`; "the stranger is standing by the fire. she says she can help. says she builds things." With ≥5 wood the **build:** section and the **trap** button appear (`craftUnlocked`) with "builder says she can make traps to catch any creatures might still be alive out there". | The room becomes a crafting screen. |
| +5 min since last stoke | `coolFire`: fire 3→2 "the fire is flickering."; title back to "A Dark Room" when < 2. | Pressure to keep stoking until the builder takes over (she only maintains *flickering*). |

The outside tab's first arrival prints "the sky is grey and the wind blows relentlessly" (outside.js:582–585) and
"dry brush and dead branches litter the forest floor" on each gather (+10 wood, or +50 with a cart; outside.js:608–613).
From here the economy is a loop of *gather wood (60 s) → stoke (10 s) → build trap → check traps (90 s)*
until huts bring villagers who gather automatically.

**Note:** because `lightFire` only deducts when `wood > 4`, relighting a dead fire with 1–4 wood in stock prints
"not enough wood to get the fire going" and clears the cooldown; relighting with 0 wood after the forest is unlocked
(`stores.wood === 0`) is also refused (`0 < 5`). Only the very first light is free.

#### 4.5 Other panel mechanics worth copying

- **Panel widths and the slider**: every `.location` is `float:left; width:700px` inside `#locationSlider`
  whose width is `children × 700` (`Engine.updateSlider`, engine.js:672–675). Travel is a `left` animation,
  `300 ms × |Δtabs|`. The outer slider holds `#main`, `#worldPanel`, `#spacePanel`; embarking animates
  `#outerSlider` `left: -700px` (path.js:329) and lifting off animates `top: 700px` (ship.js:168) — the whole
  room/village UI physically slides away.
- **Stores box repositioning**: on the Outside panel the village box occupies the top-right, so
  `Engine.moveStoresView($('#village'))` drops the stores box to `village.height() + 26px`; on the Path panel the
  perks box plays that role; Room/Ship/Fabricator move it back to `top: 0` (room.js:603, outside.js:589,
  path.js:317, ship.js:95, fabricator.js:131).
- **Weapons box visibility**: faded to 0 opacity when travelling to a tab that is not Room/Path/Fabricator
  (engine.js:621–631).
- **Supplies ("outfitting") box** on the Path (path.js:128–251): rows for armour (`none/leather/iron/steel/kinetic`),
  water (max water), then one `outfitRow` per carryable item in stock (`tool` or `weapon` type from
  `Room.Craftables` ∪ `Fabricator.Craftables` ∪ the hard-coded extras `cured meat, bullets, grenade, bolas, laser
  rifle, energy cell, bayonet, charm, alien alloy, medicine`) with the same four arrow buttons (±1, ±10) and a
  tooltip (damage for weapons / description for tools, weight, available). The legend shows `free X/Y`
  (`#bagspace`). Rows are removed when you no longer own the item.
- **Village box** (`Outside.updateVillage`, outside.js:425–476): a `storeRow` per building (traps split into `trap`
  and `baited trap` counts — baited = `min(bait, traps)`), alphabetical, with `pop N/M` as a floating legend at the
  top-right (`#population`, outside.css:11–16). Legend text is `forest` until the first hut, then `village`.

---

### 5. The event system

#### 5.1 Pools, scheduling and selection (`events.js`)

`Events.init` (events.js:24–47) builds the **random pool** once:

```js
Events.EventPool = [].concat(Events.Global, Events.Room, Events.Outside, Events.Marketing);
Events.eventStack = [];
Events.scheduleNextEvent();
$.Dispatch('stateUpdate').subscribe(Events.handleStateUpdates);
Events.initDelay();   // resume pending Mysterious-Wanderer payoffs stored under state 'wait'
```

There are therefore **five** event collections but only one random timer:

| Collection | File | How it is triggered |
|---|---|---|
| `Events.Global` (1 event) | events/global.js | random timer (`EventPool`) |
| `Events.Room` (10 events) | events/room.js | random timer; each `isAvailable` requires `Engine.activeModule == Room` |
| `Events.Outside` (6 events) | events/outside.js | random timer; each requires `Engine.activeModule == Outside` |
| `Events.Marketing` (1 event) | events/marketing.js | random timer; **no module check** |
| `Events.Encounters` (11 fights) | events/encounters.js | `Events.triggerFight()` from `World.checkFight` while walking |
| `Events.Setpieces` (13 landmarks) | events/setpieces.js | `World.doSpace()` when stepping onto a landmark tile |
| `Events.Executioner` (6 chained events) | events/executioner.js | `World.doSpace()` on the `X` tile, then `nextEvent` links |

Scheduling (events.js:1413–1418):

```js
scheduleNextEvent: function(scale) {
  var nextEvent = Math.floor(Math.random()*(Events._EVENT_TIME_RANGE[1] - Events._EVENT_TIME_RANGE[0])) + Events._EVENT_TIME_RANGE[0];
  if(scale > 0) { nextEvent *= scale; }
  Engine.log('next event scheduled in ' + nextEvent + ' minutes');
  Events._eventTimeout = Engine.setTimeout(Events.triggerEvent, nextEvent * 60 * 1000);
}
```

With `_EVENT_TIME_RANGE = [3, 6]` the delay is **3, 4 or 5 whole minutes** (the upper bound is exclusive). The
first random event is therefore never earlier than 3 minutes into a session (1.5 in hyper mode).

Selection (events.js:1316–1336):

```js
triggerEvent: function() {
  if(Events.activeEvent() == null) {
    var possibleEvents = [];
    for(var i in Events.EventPool) {
      var event = Events.EventPool[i];
      if(event.isAvailable()) { possibleEvents.push(event); }
    }
    if(possibleEvents.length === 0) {
      Events.scheduleNextEvent(0.5);     // nothing fits: retry in half the time
      return;
    } else {
      var r = Math.floor(Math.random()*(possibleEvents.length));
      Events.startEvent(possibleEvents[r]);
    }
  }
  Events.scheduleNextEvent();
}
```

Uniform choice among *currently available* events, evaluated at fire time — so availability depends on **which tab
is open at that instant**. If a modal is already open the tick is simply skipped (and rescheduled normally). There is
no weighting, no cooldown per event, and no memory: the same event can fire twice in a row.

Fights (events.js:1338–1363) are chosen the same way from `Events.Encounters` filtered by `isAvailable()`
(distance tier × terrain), and play `ENCOUNTER_TIER_1/2/3` music by distance (≤10 / ≤20 / >20).

#### 5.2 Event and scene data structure

An event object:

```js
{
  title: _('The Nomad'),                 // shown bold, floating over the top border of the modal
  isAvailable: function() {...},         // only for pooled events / encounters
  audio: AudioLibrary.EVENT_NOMAD,       // optional; AudioEngine.playEventMusic on start, stopped on end
  scenes: {
    start: { ... },                      // every event begins at 'start'
    other: { ... }
  }
}
```

A **story scene**:

| Field | Meaning | Where handled |
|---|---|---|
| `text: [line, line, …]` | each line becomes a `<div>` in `#description` | `startStory` events.js:1110–1112 |
| `notification` | printed to the log (module `null` → always) when the scene loads | `loadScene` l.65–67 |
| `blink: true` | start blinking the browser title `*** EVENT ***` | `startEvent` l.1407–1410 |
| `reward: {store: n}` | `$SM.addM('stores', reward)` on load | l.70–72 |
| `onLoad()` | arbitrary code on load (kills, map changes, perks…) | l.60–62 |
| `loot: {item: {min, max, chance}}` | loot table rendered as take buttons | `drawLoot` l.921–951 |
| `textarea` / `readonly` | a textarea (save export/import) | l.1114–1120 |
| `buttons: { id: {...} }` | choices | `drawButtons` l.1137–1166 |

A **combat scene** carries `combat: true` plus `enemy`, `enemyName`, `chara` (the glyph), `damage`, `hit`
(probability), `attackDelay` (s), `health`, optional `ranged: true`, `plural: true`, `deathMessage`, `loot`,
`notification`, optional `specials`, `atHealth`, `explosion`, and `buttons` for *after* the win (default: a single
`leave`).

A **button**:

| Field | Meaning |
|---|---|
| `text` | label |
| `cost: {store: n}` | deducted on click; disables the button when unaffordable (`updateButtons`); special stores `water` and `hp` are supported for world events (events.js:1168–1177, 1224–1229); `torch` costs are waived when carrying a `glowstone` (l.1145–1147, 1190–1192, 1215–1217) |
| `reward: {store: n}` | added on click |
| `notification` | log line on click |
| `available()` | if returns false the button renders disabled (e.g. "buy compass" once owned) |
| `onChoose(textareaValue)` | callback |
| `onClick()` | second callback (marketing) |
| `cooldown` | seconds; the button starts on cooldown when drawn (used after loot so you cannot skip past the take screen instantly) |
| `link` | ends the event and opens a URL |
| `nextEvent` | switch to another event object (`Events.Setpieces[...] || Events.Executioner[...]`) |
| `nextScene` | `'end'`, or a **weighted map** `{ threshold: sceneName }` |

The weighted `nextScene` resolver (events.js:1282–1295):

```js
var r = Math.random();
var lowestMatch = null;
for(var i in info.nextScene) {
  if(r < i && (lowestMatch == null || i < lowestMatch)) { lowestMatch = i; }
}
if(lowestMatch != null) { Events.loadScene(info.nextScene[lowestMatch]); return; }
Engine.log('ERROR: no suitable scene found');
Events.endEvent();
```

So `{0.3: 'stuff', 1: 'nothing'}` means 30 % `stuff`, 70 % `nothing`; `{0.5:'a', 0.8:'b', 1:'c'}` = 50/30/20; a
plain `{1: 'x'}` is a deterministic jump. Keys are compared as strings coerced to numbers (`r < i`), which works
because they are all numeric literals.

Button click order (`Events.buttonClick`, events.js:1207–1297): verify & pay cost → `onChoose` → `reward` →
`updateButtons` → `notification` → `onClick` → `link` (ends) → `nextEvent` (switch) → `nextScene`.

#### 5.3 Modal lifecycle and DOM

`startEvent(event, options)` (events.js:1387–1411):

```js
event.audio && AudioEngine.playEventMusic(event.audio);
Engine.keyLock = true;  Engine.tabNavigation = false;  Button.saveCooldown = false;
Events.eventStack.unshift(event);
event.eventPanel = $('<div>').attr('id', 'event').addClass('eventPanel').css('opacity', '0');
if(options != null && options.width != null) { Events.eventPanel().css('width', options.width); }
$('<div>').addClass('eventTitle').text(Events.activeEvent().title).appendTo(Events.eventPanel());
$('<div>').attr('id', 'description').appendTo(Events.eventPanel());
$('<div>').attr('id', 'buttons').appendTo(Events.eventPanel());
Events.loadScene('start');
$('div#wrapper').append(Events.eventPanel());
Events.eventPanel().animate({opacity: 1}, Events._PANEL_FADE, 'linear');   // 200 ms
if (currentSceneInformation.blink) { Events.blinkTitle(); }
```

Events are a **stack** (`eventStack`); `activeEvent()` is the top. In practice nesting only happens when a
system dialog (export/import, restart, hyper) is opened on top of nothing, but the structure allows a modal over a
modal. `endEvent` (l.1420–1436) fades out over 200 ms, removes the panel, pops the stack, re-enables keys/tabs/
cooldown saving and stops the title blink. `switchEvent` (l.1376–1385) is the `nextEvent` path: remove the current
panel and immediately `startEvent` the next (used by the battleship's elevator menu).

The modal is `.eventPanel` — `position:absolute; left:250px; top:90px; width:335px; padding:20px; background:white;
z-index:20` with a `:before` pseudo-element that lays a `920×700` white sheet at 60 % opacity over the whole game
area (main.css:433–458) and an `:after` that draws the `2px solid black` frame with `box-shadow: 5px 5px 5px #666`
(l.464–474). The title is `.eventTitle` — bold, absolutely positioned at `top:-12px` so it straddles the top border,
with a white strip behind it (`:after`, l.490–510). Choice buttons float left with `margin-right:20px`.

`blinkTitle` (l.1300–1308): every 3 s set `document.title` to `*** EVENT ***`, 1.5 s later restore — a background-tab
attention grab; stopped by `endEvent`.

#### 5.4 Combat

`startCombat(scene)` (events.js:83–172) draws the scene `notification` as the description line, a `#fight` box with
two `.fighter` divs — the wanderer `@` at `left:25%` with `World.health / World.getMaxHealth()` and the enemy
`scene.chara` at `right:25%` with `scene.health` — each showing `hp/max` above (`.hp`). Then:

- **Attack buttons**: one per weapon in `World.Weapons` that is in `Path.outfit` with count > 0, labelled with the
  weapon's `verb` (punch/stab/swing/slash/thrust/shoot/blast/lob/tangle/disintegrate/slice/stun). Weapons with
  ammo costs (`rifle: bullets 1`, `laser rifle`/`plasma rifle: energy cell 1`, `grenade: grenade 1`, `bolas: bolas 1`)
  are disabled when the ammo isn't carried. If no usable damaging weapon exists, a **punch** (fists) button is
  prepended (l.136–139); it reappears mid-fight when ammo runs out (l.500–517).
- **Heal buttons**: `eat meat` (cost `cured meat 1`, heals `MEAT_HEAL 8`, ×2 with gastronome), `use meds`
  (`medicine 1`, 20 hp), `use hypo` (`hypo 1`, 30 hp), `shield` if wearing kinetic armour, `boost` if carrying a
  stim. Heal buttons are disabled at full health (`setHeal`).
- **Enemy timer**: `Engine.setInterval(Events.enemyAttack, attackDelay*1000)`.

Player attack (`useWeapon`, l.468–581): roll `Math.random() <= World.getHitChance()` (`BASE_HIT_CHANCE 0.8`, +0.1
with `precise`); damage = weapon damage with multipliers — unarmed ×2 boxer, ×3 martial artist, ×2 unarmed master
(cumulative: 1 → 12 with all three), melee ×1.5 (floored) with barbarian; `energised` status ×`ENERGISE_MULTIPLIER 4`
on the attacker's next hit. Punch count drives the unarmed perks at 50 / 150 / 300 punches (l.475–481). Melee
animates the fighter sliding toward the other (`animateMelee`, 100 ms each way); ranged draws an `o` bullet
(`animateRanged`, 200 ms). Damage numbers float up (`drawFloatText`, 700 ms). A `miss` floats on a failed roll.

Enemy attack (`enemyAttack`, l.733–757): skipped while stunned (bolas/disruptor, `STUN_DURATION 4000`) or
meditating; hit chance `scene.hit` ×0.8 with `evasive`; damage `scene.damage`; `enraged` enemies attack every
0.5 s for 4 s. Status effects used by the battleship bosses: `shield` (next hit heals the shielded fighter instead
and then breaks, l.617–653), `venomous` (DoT of half the hit every second), `energised`, `meditation` (absorbs
incoming damage for 5 s and returns the sum as one hit), `boost` (player: halves weapon cooldowns for 3 s at the cost
of `BOOST_DAMAGE 10` hp). `atHealth: {40: fn}` triggers when the enemy crosses that hp threshold; `explosion: 30`
makes the enemy detonate for 30 damage after a 3 s shake when it dies.

Death: `checkPlayerDeath` → `World.die()` (world.js:918–946): "the world fades", the temporary world state and the
whole outfit are discarded, the view fades out for 600 ms and the player is returned to the Room with the embark
button on a 120 s cooldown.

Win (`winFight`, l.781–836): after the enemy fades, the description is replaced by `scene.deathMessage` and the
**loot screen** (`drawLoot`, l.921–951): for each loot entry, with probability `chance`, roll
`floor(rand*(max−min))+min` (note: the `max` value itself is never rolled, except when `max == min` which yields
`min`) and draw a row with `item [n]` (take one, with a hover **drop menu** when the bag is full, l.844–898) and a
`take` (all that fits) button; plus a `take everything` / `take all you can` button which can double as leave
(`take everything and leave`, l.994–1005). Then either the scene's own buttons or a default `leave`
(1 s cooldown) plus 0-cooldown heal buttons so you can patch up before continuing.

#### 5.5 Catalogue: `Events.Room` (events/room.js)

All nine require `Engine.activeModule == Room`.

**1. The Nomad** (room.js:5–52) — `isAvailable: stores.fur > 0`. Audio EVENT_NOMAD.
- start — text: "a nomad shuffles into view, laden with makeshift bags bound with rough twine." / "won't say from
  where he came, but it's clear that he's not staying." notification: "a nomad arrives, looking to trade". blink.
  - `buy scales`: cost fur 100 → reward scales 1 (stays in scene; repeatable)
  - `buy teeth`: cost fur 200 → teeth 1
  - `buy bait`: cost fur 5 → bait 1; notification "traps are more effective with bait."
  - `buy compass`: available while `stores.compass < 1`; cost fur 300, scales 15, teeth 5 → compass 1; notification
    "the old compass is dented and dusty, but it looks to work." (This is the cheap path to the compass — 100 fur,
    5 scales and 5 teeth less than the trading post's price.)
  - `say goodbye` → end

**2. Noises (outside)** (l.53–104) — `isAvailable: stores.wood` truthy. Audio EVENT_NOISES_OUTSIDE.
- start — "through the walls, shuffling noises can be heard." / "can't tell what they're up to." notification
  "strange noises can be heard through the walls". blink.
  - `investigate` → `{0.3: 'stuff', 1: 'nothing'}`
  - `ignore them` → end
- nothing — "vague shapes move, just out of sight." / "the sounds stop." → `go back inside` → end
- stuff — reward **wood 100, fur 10**; "a bundle of sticks lies just beyond the threshold, wrapped in coarse furs."
  / "the night is silent." → `go back inside` → end

**3. Noises (inside)** (l.105–191) — `isAvailable: stores.wood`. Audio EVENT_NOISES_INSIDE.
- start — "scratching noises can be heard from the store room." / "something's in there." notification
  "something's in the store room". blink.
  - `investigate` → `{0.5: 'scales', 0.8: 'teeth', 1: 'cloth'}`
  - `ignore them` → end
- scales / teeth / cloth — "some wood is missing." / "the ground is littered with small scales" (…"small teeth" /
  "scraps of cloth"). `onLoad`: lose `floor(wood × 0.1)` wood (min 1) and gain `floor(thatWood / 5)` of the item
  (min 1). → `leave` → end. This is the earliest source of scales/teeth/cloth and therefore what first "seeds" the
  trade-post buy buttons.

**4. The Beggar** (l.192–263) — `isAvailable: stores.fur`. Audio EVENT_BEGGAR.
- start — "a beggar arrives." / "asks for any spare furs to keep him warm at night." notification "a beggar
  arrives". blink.
  - `give 50`: cost fur 50 → `{0.5: 'scales', 0.8: 'teeth', 1: 'cloth'}`
  - `give 100`: cost fur 100 → `{0.5: 'teeth', 0.8: 'scales', 1: 'cloth'}` (paying double shifts the odds toward
    teeth, the rarer good)
  - `turn him away` → end
- scales — reward scales 20; "the beggar expresses his thanks." / "leaves a pile of small scales behind." → `say goodbye`
- teeth — reward teeth 20; "…leaves a pile of small teeth behind."
- cloth — reward cloth 20; "…leaves some scraps of cloth behind."

**5. The Shady Builder** (l.264–320) — `isAvailable: 5 ≤ huts < 20`. Audio EVENT_SHADY_BUILDER. (No blink.)
- start — "a shady builder passes through" / "says he can build you a hut for less wood". notification same.
  - `300 wood`: cost wood 300 → `{0.6: 'steal', 1: 'build'}` (60 % scam)
  - `say goodbye` → end
- steal — "the shady builder has made off with your wood" (+notification) → `go home`
- build — "the shady builder builds a hut" (+notification); `onLoad`: huts +1 if < 20 → `go home`. Expected value:
  at 5+ huts a hut costs ≥ 350 wood, so 300 wood for a 40 % chance is a losing bet (EV cost 750 wood per hut).

**6. The Mysterious Wanderer (wood)** (l.322–400) — `isAvailable: stores.wood`. Audio EVENT_MYSTERIOUS_WANDERER.
- start — "a wanderer arrives with an empty cart. says if he leaves with wood, he'll be back with more." /
  "builder's not sure he's to be trusted." notification "a mysterious wanderer arrives". blink.
  - `give 100`: cost wood 100 → wood100
  - `give 500`: cost wood 500 → wood500
  - `turn him away` → end
- wood100 — "the wanderer leaves, cart loaded with wood". `onLoad`: 50 % chance to schedule `action(60)`: after
  **60 s** add **300 wood** and notify "the mysterious wanderer returns, cart piled high with wood." (via
  `Events.saveDelay`, persisted under `wait['Room[4].scenes.wood100.action']` so it survives reload)
- wood500 — same text; 30 % chance of **1500 wood** after 60 s.

**7. The Mysterious Wanderer (fur)** (l.402–480) — `isAvailable: stores.fur`. Identical structure with "she";
`give 100` → 50 % of 300 fur; `give 500` → 30 % of 1500 fur; "…cart piled high with furs."

**8. The Scout** (l.482–523) — `isAvailable: features.location.world`. Audio EVENT_SCOUT.
- start — "the scout says she's been all over." / "willing to talk about it, for a price." notification "a scout
  stops for the night". blink.
  - `buy map`: cost fur 200, scales 10; available while `!World.seenAll`; `onChoose: World.applyMap` (uncovers a
    radius-5 diamond around a random unseen tile); notification "the map uncovers a bit of the world" (repeatable)
  - `learn scouting`: cost fur 1000, scales 50, teeth 20; available while no `scout` perk; grants **scout** (sight
    radius 2 → 4)
  - `say goodbye` → end

**9. The Master** (l.525–597) — `isAvailable: features.location.world`. Audio EVENT_WANDERING_MASTER.
- start — "an old wanderer arrives." / "he smiles warmly and asks for lodgings for the night." notification "an old
  wanderer arrives". blink.
  - `agree`: cost cured meat 100, fur 100, torch 1 → agree
  - `turn him away` → end
- agree — "in exchange, the wanderer offers his wisdom." buttons `evasion` (→ **evasive**), `precision`
  (→ **precise**), `force` (→ **barbarian**), each available only if not yet owned, and `nothing`; all → end.

**10. The Sick Man** (l.599–686) — `isAvailable: stores.medicine > 0`. Audio EVENT_SICK_MAN.
- start — "a man hobbles up, coughing." / "he begs for medicine." notification "a sick man hobbles up". blink.
  - `give 1 medicine`: cost medicine 1; notification "the man swallows the medicine eagerly" →
    `{0.1: 'alloy', 0.3: 'cells', 0.5: 'scales', 1.0: 'nothing'}` (10 / 20 / 20 / 50 %)
  - `tell him to leave` → end
- alloy — "the man is thankful." / "he leaves a reward." / "some weird metal he picked up on his travels." +1 alien alloy
- cells — "…some weird glowing boxes he picked up on his travels." +3 energy cell
- scales — "…all he has are some scales." +5 scales
- nothing — "the man expresses his thanks and hobbles off."

**Note (bug):** the two wanderers persist their pending delivery under the keys `'Room[4].scenes.wood100.action'`
and `'Room[5].scenes.fur100.action'` (room.js:361, 384, 441, 464), but the Shady Builder was inserted at index 4,
so the wood wanderer is actually `Events.Room[5]` and the fur wanderer `Events.Room[6]`. On reload,
`Events.recallDelay` (events.js:1450–1466) walks `Events.Room[4].scenes.wood100` → `undefined`, finds no function
and calls `$SM.remove(stateName)`: a wanderer who was due to return is silently forgotten if the page is refreshed
during the 60-second wait. (Within a session the `Engine.setTimeout` in `saveDelay` still fires normally.)

#### 5.6 Catalogue: `Events.Outside` (events/outside.js)

All require `Engine.activeModule == Outside`.

**1. A Ruined Trap** (l.5–68) — `traps > 0`. Audio EVENT_RUINED_TRAP.
- start — "some of the traps have been torn apart." / "large prints lead away, into the forest." notification
  "some traps have been destroyed". blink. `onLoad`: destroy `floor(rand × traps) + 1` traps (1…all).
  - `track them` → `{0.5: 'nothing', 1: 'catch'}`
  - `ignore them` → end
- nothing — "the tracks disappear after just a few minutes." / "the forest is silent." notification "nothing was
  found" → `go home`
- catch — "not far from the village lies a large beast, its fur matted with blood." / "it puts up little
  resistance before the knife." notification "there was a beast. it's dead now". reward **fur 100, meat 100,
  teeth 10** → `go home`

**2. Fire** (l.69–95) — `huts > 0 && population > 50`. Audio EVENT_HUT_FIRE.
- start — "a fire rampages through one of the huts, destroying it." / "all residents in the hut perished in the
  fire." notification "a fire has started". blink. `onLoad: Outside.destroyHuts(1)`.
  - `mourn`: notification "some villagers have died" → end

**3. Sickness** (l.96–153) — `10 < population < 50 && medicine > 0`. Audio EVENT_SICKNESS.
- start — "a sickness is spreading through the village." / "medicine is needed immediately." notification "some
  villagers are ill". blink.
  - `1 medicine`: cost medicine 1 → healed
  - `ignore it` → death
- healed — "the sickness is cured in time." notification "sufferers are healed" → `go home`
- death — "the sickness spreads through the village." / "the days are spent with burials." / "the nights are rent
  with screams." notification "sufferers are left to die". `onLoad`: kill `floor(rand × floor(pop/2)) + 1`.

**4. Plague** (l.155–225) — `population > 50 && medicine > 0`. Audio EVENT_PLAGUE.
- start — "a terrible plague is fast spreading through the village." / "medicine is needed immediately."
  notification "a plague afflicts the village". blink.
  - `buy medicine`: cost scales 70, teeth 50 → reward medicine 1 (an inflated emergency price vs. the trading post's
    50/30; comment at l.169)
  - `5 medicine`: cost medicine 5 → healed
  - `do nothing` → death
- healed — "the plague is kept from spreading." / "only a few die." / "the rest bury them." notification "epidemic
  is eradicated eventually". `onLoad`: kill `floor(rand × 5) + 2` (2–6).
- death — "the plague rips through the village." / "the nights are rent with screams." / "the only hope is a
  quick death." notification "population is almost exterminated". `onLoad`: kill `floor(rand × 80) + 10` (10–89).

**5. A Beast Attack** (l.227–260) — `population > 0`. Audio EVENT_BEAST_ATTACK. blink.
- start — "a pack of snarling beasts pours out of the trees." / "the fight is short and bloody, but the beasts are
  repelled." / "the villagers retreat to mourn the dead." notification "wild beasts attack the villagers".
  `onLoad`: kill `floor(rand × 10) + 1` (1–10). reward **fur 100, meat 100, teeth 10**.
  - `go home`: notification "predators become prey. price is unfair" → end

**6. A Military Raid** (l.262–295) — `population > 0 && game.cityCleared`. Audio EVENT_SOLDIER_ATTACK. blink.
- start — "a gunshot rings through the trees." / "well armed men charge out of the forest, firing into the crowd."
  / "after a skirmish they are driven away, but not without losses." notification "troops storm the village".
  `onLoad`: kill `floor(rand × 40) + 1` (1–40). reward **bullets 10, cured meat 50**.
  - `go home`: notification "warfare is bloodthirsty" → end

Note the design: Sickness/Plague only exist once you *own medicine* — the game never poses a problem you cannot
answer, and the "do nothing" branch is always offered.

#### 5.7 Catalogue: `Events.Global` and `Events.Marketing`

**The Thief** (global.js:5–66) — `(activeModule == Room || Outside) && game.thieves == 1`. Audio EVENT_THIEF.
- start — "the villagers haul a filthy man out of the store room." / "say his folk have been skimming the
  supplies." / "say he should be strung up as an example." notification "a thief is caught". blink.
  - `hang him` → hang; `spare him` → spare
- hang — "the villagers hang the thief high in front of the store room." / "the point is made. in the next few
  days, the missing supplies are returned." `onLoad`: `game.thieves = 2`, remove `income.thieves`,
  `$SM.addM('stores', game.stolen)` (everything stolen comes back at once). → `leave`
- spare — "the man says he's grateful. says he won't come around any more." / "shares what he knows about sneaking
  before he goes." `onLoad`: `game.thieves = 2`, remove income, **stealthy** perk (halves wilderness fight chance).
  → `leave`

**Penrose** (marketing.js:7–35) — `isAvailable: !$SM.get('marketing.penrose')` — note **no module restriction**, so
it can fire on any tab including the world map. Audio EVENT_NOISES_INSIDE.
- start — "a strange thrumming, pounding and crashing. visions of people and places, of a huge machine and
  twisting curves." / "inviting. it would be so easy to give in, completely." notification "a strange thrumming,
  pounding and crashing. and then gone." blink.
  - `give in`: `onClick` sets `marketing.penrose = true`; `link` opens penrose.doublespeakgames.com (event ends)
  - `ignore it` → end — **the flag is not set**, so the cross-promo can recur every few minutes until clicked.

#### 5.8 Catalogue: `Events.Encounters` (events/encounters.js)

Availability is `World.getDistance()` (Manhattan distance from the village) and `World.getTerrain()`.

| # | Title | Tier / terrain | chara | dmg | hit | delay (s) | hp | ranged | Loot (item min–max @chance) | Notification |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | A Snarling Beast | ≤10, forest `;` | R | 1 | 0.8 | 1 | 5 | no | fur 1–3 @1, meat 1–3 @1, teeth 1–3 @0.8 | a snarling beast leaps out of the underbrush |
| 2 | A Gaunt Man | ≤10, barrens `.` | E | 2 | 0.8 | 2 | 6 | no | cloth 1–3 @0.8, teeth 1–2 @0.8, leather 1–2 @0.5 | a gaunt man approaches, a crazed look in his eye |
| 3 | A Strange Bird | ≤10, field `,` | R | 3 | 0.8 | 2 | 4 | no | scales 1–3 @0.8, teeth 1–2 @0.5, meat 1–3 @0.8 | a strange looking bird speeds across the plains |
| 4 | A Two-Headed Creature | ≤10, field | K | 2 | 0.5 | 3 | 10 | no | fur 2–4 @1, teeth 2–3 @0.8, meat 2–3 @0.8 | a two-headed creature appears, the smaller head trembling |
| 5 | A Shivering Man | 11–20, barrens | E | 5 | 0.5 | 1 | 20 | no | cloth 1 @0.2, teeth 1–2 @0.8, leather 1 @0.2, **medicine 1–3 @0.7** | a shivering man approaches and attacks with surprising strength |
| 6 | A Man-Eater | 11–20, forest | T | 3 | 0.8 | 1 | 25 | no | fur 5–10 @1, meat 5–10 @1, teeth 5–10 @0.8 | a large creature attacks, claws freshly bloodied |
| 7 | A Scavenger | 11–20, barrens | E | 4 | 0.8 | 2 | 30 | no | cloth 5–10 @0.8, leather 5–10 @0.8, iron 1–5 @0.5, medicine 1–2 @0.1 | a scavenger draws close, hoping for an easy score |
| 8 | A Huge Lizard | 11–20, field | T | 5 | 0.8 | 2 | 20 | no | scales 5–10 @0.8, teeth 5–10 @0.5, meat 5–10 @0.8 | the grass thrashes wildly as a huge lizard pushes through |
| 9 | A Feral Terror | >20, forest | T | 6 | 0.8 | 1 | 45 | no | fur 5–10 @1, meat 5–10 @1, teeth 5–10 @0.8 | a beast, wilder than imagining, erupts out of the foliage |
| 10 | A Soldier | >20, barrens | D | 8 | 0.8 | 2 | 50 | yes | cloth 5–10 @0.8, bullets 1–5 @0.5, rifle 1 @0.2, medicine 1–2 @0.1 | a soldier opens fire from across the desert |
| 11 | A Sniper | >20, field | D | 15 | 0.8 | 4 | 30 | yes | cloth 5–10 @0.8, bullets 1–5 @0.5, rifle 1 @0.2, medicine 1–2 @0.1 | a shot rings out, from somewhere in the long grass |

Enemy DPS by tier (dmg × hit / delay): tier 1 ≈ 0.3–1.2 (the two-headed creature is the gentlest at 0.33); tier 2 ≈ 1.6–2.5; tier 3 ≈ 3–4.8. Compare the design
note in `doc/Zones.txt`: radius <10 enemy DPS 1 / player HP 10; <20 DPS 3 / HP 15–20; <30 DPS 6 / HP 30–40.
Note that terrain is never `road`/`landmark` for an encounter (those tiles don't call `checkFight`), and that in
tiers 2 and 3 barrens/forest/field each map to exactly one enemy, so the terrain you walk through decides the
enemy.

#### 5.9 Catalogue: `Events.Setpieces` (events/setpieces.js)

Setpieces are keyed by the `scene` name in `World.LANDMARKS` (world.js:139–156) and started by `World.doSpace`
when the wanderer steps on the tile (world.js:577–580). Each is a small branching dungeon. Conventions below:
"combat X (glyph dmg/hit/delay/hp)" = a combat scene; loot is `item min–max @chance`; `→ {p: s, …}` is the
weighted jump; **clear** = `World.clearDungeon()` (tile becomes an outpost `P`, road drawn home); **visited** =
`World.markVisited` (tile keeps its glyph but gets a `!` suffix and stops triggering).

##### outpost — "An Outpost" (l.5–33)
Created only by clearing a dungeon. start: "a safe place in the wilds." (notification identical); `onLoad:
World.useOutpost()` → "water replenished", water refilled to max, outpost marked used for this expedition; loot
cured meat 5–10 @1; `leave` (1 s cooldown). Used outposts render as plain terrain and don't retrigger until the
next embark (`World.usedOutposts` is reset in `onArrival`, world.js:1087).

##### swamp — "A Murky Swamp" (l.34–91), 1 on the map at radius 15–45
- start: "rotting reeds rise out of the swampy earth." / "a lone frog sits in the muck, silently." notification
  "a swamp festers in the stagnant air." → `enter` / `leave`
- cabin: "deep in the swamp is a moss-covered cabin." / "an old wanderer sits inside, in a seeming trance." →
  `talk` (cost **charm 1**) / `leave`
- talk: "the wanderer takes the charm and nods slowly." / "he speaks of once leading the great fleets to fresh
  worlds." / "unfathomable destruction to fuel wanderer hungers." / "his time here, now, is his penance." `onLoad`:
  **gastronome** perk, visited.
The charm is a 0.5 % trap drop (outside.js:123–127) — the swamp is the only use for it.

##### cave — "A Damp Cave" (l.92–523), 5 on the map at radius 3–10 (the first dungeon most players meet)
- start: "the mouth of the cave is wide and dark." / "can't see what's inside." notification "the earth here is
  split, as if bearing an ancient wound". `go inside` (cost **torch 1**) → `{0.3: a1, 0.6: a2, 1: a3}`; `leave`.
- a1: combat **beast** (R 1/0.8/1/5) "a startled beast defends its home"; loot fur 1–10 @1, teeth 1–5 @0.8;
  `continue` → `{0.5: b1, 1: b2}` / `leave cave` (both 1 s cooldown).
- a2: "the cave narrows a few feet in." / "the walls are moist and moss-covered" → `squeeze` → `{0.5: b2, 1: b3}` / leave.
- a3: "the remains of an old camp sits just inside the cave." / "bedrolls, torn and blackened, lay beneath a thin
  layer of dust." loot cured meat 1–5 @1, torch 1–5 @0.5, leather 1–5 @0.3 → `continue` → `{0.5: b3, 1: b4}`.
- b1: "the body of a wanderer lies in a small cavern." / "rot's been to work on it, and some of the pieces are
  missing." / "can't tell what left it here." loot **iron sword 1 @1**, cured meat 1–5 @0.8, torch 1–3 @0.5,
  medicine 1–2 @0.1 → `continue` → c1.
- b2: "the torch sputters and dies in the damp air" / "the darkness is absolute" notification "the torch goes out"
  → `continue` (cost **torch 1**) → c1 / leave.
- b3: combat beast (R 1/0.8/1/5); loot fur 1–3 @1, teeth 1–2 @0.8 → c2.
- b4: combat **cave lizard** (R 3/0.8/2/6) "a cave lizard attacks"; loot scales 1–3 @1, teeth 1–2 @0.8 → c2.
- c1: combat beast (R 3/0.8/2/10) "a large beast charges out of the dark"; loot fur 1–3 @1, teeth 1–3 @1 →
  `{0.5: end1, 1: end2}`.
- c2: combat **lizard** (T 4/0.8/2/10) "a giant lizard shambles forward"; loot scales 1–3 @1, teeth 1–3 @1 →
  `{0.7: end2, 1: end3}`.
- end1 (**clear**): "the nest of a large animal lies at the back of the cave." loot meat 5–10, fur 5–10, scales
  5–10, teeth 5–10 all @1, cloth 5–10 @0.5.
- end2 (**clear**): "a small supply cache is hidden at the back of the cave." loot cloth 5–10, leather 5–10, iron
  5–10, cured meat 5–10 @1, steel 5–10 @0.5, bolas 1–3 @0.3, medicine 1–4 @0.15.
- end3 (**clear**): "an old case is wedged behind a rock, covered in a thick layer of dust." loot **steel sword 1
  @1**, bolas 1–3 @0.5, medicine 1–3 @0.3.
Design: 1–2 torches, 1–3 easy fights, and the chance of a free iron/steel sword long before you could craft one.

##### town — "A Deserted Town" (l.524–1241), 10 on the map at radius 10–20
- start: "a small suburb lays ahead, empty houses scorched and peeling." / "broken streetlights stand, rusting.
  light hasn't graced this place in a long time." notification "the town lies abandoned, its citizens long dead".
  `explore` → `{0.3: a1, 0.7: a3, 1: a2}` (30 % school, 40 % clinic, 30 % street ambush) / `leave`.
- a1 (schoolhouse): "where the windows of the schoolhouse aren't shattered, they're blackened with soot." / "the
  double doors creak endlessly in the wind." `enter` (torch 1) → `{0.5: b1, 1: b2}`.
- a2: combat **thug** (E 4/0.8/2/30) "ambushed on the street."; loot cloth 5–10 @0.8, leather 5–10 @0.8, cured
  meat 1–5 @0.5 → `{0.5: b3, 1: b4}`.
- a3 (clinic): "a squat building up ahead." / "a green cross barely visible behind grimy windows." `enter`
  (torch 1) → `{0.5: b5, 1: end5}`.
- b1: "a small cache of supplies is tucked inside a rusting locker." loot cured meat 1–5 @1, torch 1–3 @0.8,
  bullets 1–5 @0.3, medicine 1–3 @0.05 → `{0.5: c1, 1: c2}`.
- b2: combat **scavenger** (E 4/0.8/2/30) "a scavenger waits just inside the door."; loot as thug → `{0.5: c2, 1: c3}`.
- b3: combat **beast** (R 3/0.8/1/25) "a beast stands alone in an overgrown park."; loot teeth 1–5 @1, fur 5–10 @1
  → `{0.5: c4, 1: c5}`.
- b4: "an overturned caravan is spread across the pockmarked street." / "it's been picked over by scavengers, but
  there's still some things worth taking." loot cured meat 1–5 @0.8, torch 1–3 @0.5, bullets 1–5 @0.3, medicine
  1–3 @0.1 → `{0.5: c5, 1: c6}`.
- b5: combat **madman** (E 6/0.3/1/10) "a madman attacks, screeching."; loot cloth 2–4 @0.3, cured meat 1–5 @0.9,
  medicine 1–2 @0.4 → `{0.3: end5, 1: end6}`.
- c1: combat thug (E 4/0.8/2/30) "a thug moves out of the shadows." → d1.
- c2: combat beast (R 3/0.8/1/25) "a beast charges out of a ransacked classroom." → d1.
- c3: "through the large gymnasium doors, footsteps can be heard." / "the torchlight casts a flickering glow down
  the hallway." / "the footsteps stop." `enter` → d1.
- c4: combat beast (R 4/0.8/1/25) "another beast, draw by the noise, leaps out of a copse of trees." → d2.
- c5: "something's causing a commotion a ways down the road." / "a fight, maybe." → d2.
- c6: "a small basket of food is hidden under a park bench, with a note attached." / "can't read the words." loot
  cured meat 1–5 @1 → d2.
- d1: combat **scavenger** (E 5/0.8/2/30) "a panicked scavenger bursts through the door, screaming."; loot cured
  meat 1–5 @1, leather 5–10 @0.8, steel sword 1 @0.5 → `{0.5: end1, 1: end2}`.
- d2: combat **vigilante** (D 6/0.8/2/30) "a man stands over a dead wanderer. notices he's not alone."; same loot
  → `{0.5: end3, 1: end4}`.
- end1 (**clear**): "scavenger had a small camp in the school." / "collected scraps spread across the floor like
  they fell from heaven." loot steel sword 1 @1, steel 5–10 @1, cured meat 5–10 @1, bolas 1–5 @0.5, medicine 1–2 @0.3.
- end2 (**clear**): "scavenger'd been looking for supplies in here, it seems." / "a shame to let what he'd found go
  to waste." loot coal 5–10, cured meat 5–10, leather 5–10 @1.
- end3 (**clear**): "beneath the wanderer's rags, clutched in one of its many hands, a glint of steel." / "worth
  killing for, it seems." loot **rifle 1 @1**, bullets 1–5 @1.
- end4 (**clear**): "eye for an eye seems fair." / "always worked before, at least." / "picking the bones finds
  some useful trinkets." loot cured meat 5–10, iron 5–10, torch 1–5 @1, bolas 1–5 @0.5, medicine 1–2 @0.1.
- end5 (**clear**): "some medicine abandoned in the drawers." loot medicine 2–5 @1.
- end6 (**clear**): "the clinic has been ransacked." / "only dust and stains remain." (no loot; `leave town` has
  no cooldown here).

##### city — "A Ruined City" (l.1242–2937), 20 on the map at radius 20–45; every ending sets `game.cityCleared = true` (unlocking the Military Raid village event)
- start: "a battered highway sign stands guard at the entrance to this once-great city." / "the towers that
  haven't crumbled jut from the landscape like the ribcage of some ancient beast." / "might be things worth having
  still inside." notification "the towers of a decaying city dominate the skyline". `explore` →
  `{0.2: a1, 0.5: a2, 0.8: a3, 1: a4}` (empty streets / traffic cones / shanty town / hospital).
- a1: "the streets are empty." / "the air is filled with dust, driven relentlessly by the hard winds." →
  `{0.5: b1, 1: b2}`.
- a2: "orange traffic cones are set across the street, faded and cracked." / "lights flash through the alleys
  between buildings." → `{0.5: b3, 1: b4}`.
- a3: "a large shanty town sprawls across the streets." / "faces, darkened by soot and blood, stare out from
  crooked huts." → `{0.5: b5, 1: b6}`.
- a4: "the shell of an abandoned hospital looms ahead." `enter` (torch 1) → `{0.5: b7, 1: b8}`.
- b1: "the old tower seems mostly intact." / "the shell of a burned out car blocks the entrance." / "most of the
  windows at ground level are busted anyway." `enter` → `{0.5: c1, 1: c2}`.
- b2: combat **lizard** (R 5/0.8/2/20) "a huge lizard scrambles up out of the darkness of an old metro station.";
  loot scales 5–10 @0.8, teeth 5–10 @0.5, meat 5–10 @0.8 → `descend` → `{0.5: c2, 1: c3}`.
- b3: combat **sniper** (D 15/0.8/4/30, ranged) "the shot echoes in the empty street."; loot cured meat 1–5 @0.8,
  bullets 1–5 @0.5, rifle 1 @0.2 → `{0.5: c4, 1: c5}`.
- b4: combat **soldier** (D 8/0.8/2/50, ranged) "the soldier steps out from between the buildings, rifle raised.";
  same loot → `{0.5: c5, 1: c6}`.
- b5: combat **frail man** (E 1/0.8/2/10) "a frail man stands defiantly, blocking the path."; loot cured meat 1–5
  @0.8, cloth 1–5 @0.5, leather 1 @0.2, medicine 1–3 @0.05 → `{0.5: c7, 1: c8}`.
- b6: "nothing but downcast eyes." / "the people here were broken a long time ago." → `{0.5: c8, 1: c9}`.
- b7: "empty corridors." / "the place has been swept clean by scavengers." → `{0.3: c12, 0.7: c10, 1: c11}`.
- b8: combat **old man** (E 3/0.5/2/10) "an old man bursts through a door, wielding a scalpel."; loot cured meat
  1–3 @0.5, cloth 1–5 @0.8, medicine 1–2 @0.5 → `{0.3: c13, 0.7: c11, 1: end15}`.
- c1: combat **thug** (E 3/0.8/2/30) "a thug is waiting on the other side of the wall."; loot steel sword 1 @0.5,
  cured meat 1–3 @0.5, cloth 1–5 @0.8 → `{0.5: d1, 1: d2}`.
- c2: combat **beast** (R 2/0.8/1/30) "a snarling beast jumps out from behind a car."; loot meat 1–5 @0.8, fur 1–5
  @0.8, teeth 1–5 @0.5 → d2.
- c3: "street above the subway platform is blown away." / "lets some light down into the dusty haze." / "a sound
  comes from the tunnel, just ahead." `investigate` (torch 1) → `{0.5: d2, 1: d3}`.
- c4: "looks like a camp of sorts up ahead." / "rusted chainlink is pulled across an alleyway." / "fires burn in
  the courtyard beyond." → `{0.5: d4, 1: d5}`.
- c5: "more voices can be heard ahead." / "they must be here for a reason." → d5.
- c6: "the sound of gunfire carries on the wind." / "the street ahead glows with firelight." → `{0.5: d5, 1: d6}`.
- c7: "more squatters are crowding around now." / "someone throws a stone." → `{0.5: d7, 1: d8}`.
- c8: "an improvised shop is set up on the sidewalk." / "the owner stands by, stoic." loot steel sword 1 @0.8,
  rifle 1 @0.5, bullets 1–8 @0.25, alien alloy 1 @0.01, medicine 1–4 @0.5 → d8.
- c9: "strips of meat hang drying by the side of the street." / "the people back away, avoiding eye contact." loot
  cured meat 5–10 @1 → `{0.5: d8, 1: d9}`.
- c10: "someone has locked and barricaded the door to this operating theatre." → `{0.2: end12, 0.6: d10, 1: d11}`.
- c11: combat **squatters** (plural, `EEE` 2/0.7/0.5/40) "a tribe of elderly squatters is camped out in this
  ward."; loot cured meat 1–3 @0.5, cloth 3–8 @0.8, medicine 1–3 @0.3 → end10.
- c12: combat **lizards** (plural, `RRR` 4/0.7/0.7/30) "a pack of lizards rounds the corner."; loot meat 3–8, teeth
  2–4, scales 3–5 @1 → end10.
- c13: "strips of meat are hung up to dry in this ward." loot cured meat 3–10 @1 → `{0.5: end10, 1: end11}`.
- d1: combat **bird** (R 5/0.7/1/45) "a large bird nests at the top of the stairs."; loot meat 5–10 @0.8 →
  `{0.5: end1, 1: end2}`.
- d2: "the debris is denser here." / "maybe some useful stuff in the rubble." loot bullets 1–5 @0.5, steel 1–10
  @0.8, alien alloy 1 @0.01, cloth 1–10 @1 → end2.
- d3: combat **rats** (plural, `RRR` 1/0.8/0.25/60) "a swarm of rats rushes up the tunnel."; loot fur 5–10 @0.8,
  teeth 5–10 @0.5 → `{0.5: end2, 1: end3}`.
- d4: combat **veteran** (D 6/0.8/2/45) "a large man attacks, waving a bayonet."; loot bayonet 1 @0.5, cured meat
  1–5 @0.8 → `{0.5: end4, 1: end5}`.
- d5: combat **soldier** (D 8/0.8/2/50, ranged) "a second soldier opens fire."; loot cured meat 1–5 @0.8, bullets
  1–5 @0.5, rifle 1 @0.2 → end5.
- d6: combat **commando** (D 3/0.9/2/55, ranged) "a masked soldier rounds the corner, gun drawn"; loot rifle 1 @0.5,
  bullets 1–5 @0.8, cured meat 1–5 @0.8 → `{0.5: end5, 1: end6}`.
- d7: combat **squatters** (`EEE` 2/0.7/0.5/40) "the crowd surges forward."; loot cloth 1–5 @0.8, teeth 1–5 @0.5 →
  `{0.5: end7, 1: end8}`.
- d8: combat **youth** (E 2/0.7/1/45) "a youth lashes out with a tree branch."; same loot → end8.
- d9: combat **squatter** (E 3/0.8/2/20) "a squatter stands firmly in the doorway of a small hut."; same loot →
  `{0.5: end8, 1: end9}`.
- d10: combat **deformed** (T 8/0.6/2/40) "behind the door, a deformed figure awakes and attacks."; loot cloth 1–5
  @0.8, teeth 2 @1, steel 1–3 @0.6, scales 2–3 @0.1 → end14 (no leave option).
- d11: combat **tentacles** (plural, `TTT` 2/0.6/0.5/60) "as soon as the door is open a little bit, hundreds of
  tentacles erupt."; loot meat 10–20 @1 → end13 (no leave option).
- Endings (all **clear** + `cityCleared`):
  - end1 "bird must have liked shiney things." / "some good stuff woven into its nest." — bullets 5–10 @0.8,
    bolas 1–5 @0.5, **alien alloy 1 @0.5**.
  - end2 "not much here." / "scavengers must have gotten to this place already." — torch 1–5 @0.8, cured meat 1–5 @0.5.
  - end3 "the tunnel opens up at another platform." / "the walls are scorched from an old battle." / "bodies and
    supplies from both sides litter the ground." — rifle 1 @0.8, bullets 1–5 @0.8, **laser rifle 1 @0.3**, energy
    cell 1–5 @0.3, alien alloy 1 @0.3.
  - end4 "the small military outpost is well supplied." / "arms and munitions, relics from the war, are neatly
    arranged on the store-room floor." / "just as deadly now as they were then." — rifle 1 @1, bullets 1–10 @1,
    grenade 1–5 @0.8.
  - end5 "searching the bodies yields a few supplies." / "more soldiers will be on their way." / "time to move on."
    — rifle 1 @1, bullets 1–10 @1, cured meat 1–5 @0.8, medicine 1–4 @0.1.
  - end6 "the small settlement has clearly been burning a while." / "the bodies of the wanderers that lived here
    are still visible in the flames." / "still time to rescue a few supplies." — laser rifle 1 @0.5, energy cell
    1–5 @0.5, cured meat 1–10 @1.
  - end7 "the remaining settlers flee from the violence, their belongings forgotten." / "there's not much, but
    some useful things can still be found." — steel sword 1 @0.8, energy cell 1–5 @0.5, cured meat 1–10 @1.
  - end8 "the young settler was carrying a canvas sack." / "it contains travelling gear, and a few trinkets." /
    "there's nothing else here." — steel sword 1 @0.8, bolas 1–5 @0.5, cured meat 1–10 @1.
  - end9 "inside the hut, a child cries." / "a few belongings rest against the walls." / "there's nothing else
    here." — rifle 1 @0.8, bullets 1–5 @0.8, bolas 1–5 @0.5, alien alloy 1 @0.2.
  - end10 "the stench of rot and death fills the operating theatres." / "a few items are scattered on the ground."
    / "there is nothing else here." — energy cell 1 @0.3, medicine 1–5 @0.3, teeth 3–8 @1, scales 4–7 @0.9.
  - end11 "a pristine medicine cabinet at the end of a hallway." / "the rest of the hospital is empty." — energy
    cell 1 @0.2, **medicine 3–10 @1**, teeth 1–2 @0.2.
  - end12 "someone had been stockpiling loot here." — energy cell 1–3 @0.2, medicine 3–10 @0.5, bullets 2–8 @1,
    torch 1–3 @0.5, grenade 1 @0.5, **alien alloy 1–2 @0.8**.
  - end13 "the tentacular horror is defeated." / "inside, the remains of its victims are everywhere." — steel sword
    1–3 @0.5, rifle 1–2 @0.3, teeth 2–8 @1, cloth 3–6 @0.5, alien alloy 1 @0.1.
  - end14 "the warped man lies dead." / "the operating theatre has a lot of curious equipment." — energy cell 2–5
    @0.8, medicine 3–12 @1, cloth 1–3 @0.5, steel 2–3 @0.3, alien alloy 1 @0.3.
  - end15 "the old man had a small cache of interesting items." — alien alloy 1 @0.8, medicine 1–4 @1, cured meat
    3–7 @1, bolas 1–3 @0.5, fur 1–5 @0.8.
The city is 2–4 fights deep, rewards firearms and the first reliable alien alloy, and is deliberately the only
place the `EEE`/`RRR`/`TTT` "plural" swarm enemies with sub-second attack delays appear outside the battleship.

##### house — "An Old House" (l.2938–3055), 10 on the map at radius 0–45
- start: "an old house remains here, once white siding yellowed and peeling." / "the door hangs open."
  notification "the remains of an old house stand as a monument to simpler times". `go inside` →
  `{0.25: medicine, 0.5: supplies, 1: occupied}` / `leave`.
- supplies (**visited**): "the house is abandoned, but not yet picked over." / "still a few drops of water in the
  old well." `onLoad`: **water refilled**, "water replenished". loot cured meat 1–10 @0.8, leather 1–10 @0.2,
  cloth 1–10 @0.5.
- medicine (**visited**): "the house has been ransacked." / "but there is a cache of medicine under the
  floorboards." loot medicine 2–5 @1.
- occupied (**visited**): combat **squatter** (E 3/0.8/2/10) "a man charges down the hall, a rusty blade in his
  hand"; loot as supplies.
Houses are the early-game water stops (25 % chance each) and the most common landmark.

##### battlefield — "A Forgotten Battlefield" (l.3056–3109), 5 at radius 18–45
Single scene, **visited** on load: "a battle was fought here, long ago." / "battered technology from both sides
lays dormant on the blasted landscape." loot rifle 1–3 @0.5, bullets 5–20 @0.8, laser rifle 1–3 @0.3, energy cell
5–10 @0.5, grenade 1–5 @0.5, alien alloy 1 @0.3. `leave`. (No fight — a pure reward for reaching distance 18+.)

##### borehole — "A Huge Borehole" (l.3110–3139), 10 at radius 15–45
Single scene, **visited**: "a huge hole is cut deep into the earth, evidence of the past harvest." / "they took
what they came for, and left." / "castoff from the mammoth drills can still be found by the edges of the
precipice." loot **alien alloy 1–3 @1**. This is the dependable alloy source: ten boreholes × 1–2 alloy.

##### ship — "A Crashed Ship" (l.3140–3163), exactly 1 at radius 28
`onLoad`: **visited**, `World.drawRoad()`, `World.state.ship = true`. "the familiar curves of a wanderer vessel rise
up out of the dust and ash. " / "lucky that the natives can't work the mechanisms." / "with a little effort, it
might fly again." Button `salvage` → end. Returning home then calls `Ship.init()` (world.js:965–968). The compass
in the stores panel points toward this tile from the start (world.js:191–195).

##### ironmine — "The Iron Mine" (l.3457–3533), 1 at radius 5
- start: "an old iron mine sits here, tools abandoned and left to rust." / "bleached bones are strewn about the
  entrance. many, deeply scored with jagged grooves." / "feral howls echo out of the darkness." notification "the
  path leads to an abandoned mine". `go inside` (torch 1) → enter.
- enter: combat **beastly matriarch** (T 4/0.8/2/10) "a large creature lunges, muscles rippling in the torchlight";
  loot teeth 5–10 @1, scales 5–10 @0.8, cloth 5–10 @0.5 → `leave` → cleared.
- cleared: "the beast is dead." / "the mine is now safe for workers." notification "the iron mine is clear of
  dangers". `onLoad`: road drawn, `World.state.ironmine = true`, visited. On return home → `game.buildings["iron
  mine"] = 1` → `iron miner` job row.

##### coalmine — "The Coal Mine" (l.3314–3456), 1 at radius 10
- start: "camp fires burn by the entrance to the mine." / "men mill about, weapons at the ready." notification
  "this old mine is not abandoned". `attack` → a1 / `leave`.
- a1: combat **man** (E 3/0.8/2/10) "a man joins the fight"; loot cured meat 1–5 @0.8, cloth 1–5 @0.8 → `continue`
  → a2 / `run` → end.
- a2: identical second man → a3.
- a3: combat **chief** (D 5/0.8/2/20) "only the chief remains."; loot cured meat 5–10 @1, cloth 5–10 @0.8, iron
  1–5 @0.8 → cleared (no run).
- cleared: "the camp is still, save for the crackling of the fires." / "the mine is now safe for workers."
  notification "the coal mine is clear of dangers". road, `coalmine = true`, visited → `coal miner`.

##### sulphurmine — "The Sulphur Mine" (l.3164–3313), 1 at radius 20
- start: "the military is already set up at the mine's entrance." / "soldiers patrol the perimeter, rifles slung
  over their shoulders." notification "a military perimeter is set up around the mine." `attack` → a1.
- a1: combat **soldier** (D 8/0.8/2/50, ranged) "a soldier, alerted, opens fire."; loot cured meat 1–5 @0.8, bullets
  1–5 @0.5, rifle 1 @0.2 → a2 / `run`.
- a2: second soldier "a second soldier joins the fight." → a3 / run.
- a3: combat **veteran** (D 10/0.8/2/65) "a grizzled soldier attacks, waving a bayonet."; loot bayonet 1 @0.5,
  cured meat 1–5 @0.8 → cleared.
- cleared: "the military presence has been cleared." / "the mine is now safe for workers." notification "the
  sulphur mine is clear of dangers". road, `sulphurmine = true`, visited → `sulphur miner`.

The three mines are the gating landmarks of the economy: iron at distance 5 (10 hp boss, needs a torch), coal at
10 (three 10–20 hp fights), sulphur at 20 (two 50-hp ranged soldiers and a 65-hp veteran — effectively requires
iron/steel armour and a real weapon).

##### cache — "A Destroyed Village" (l.3535–3586), 1 at radius 10–45, only when prestige data exists
- start: "a destroyed village lies in the dust." / "charred bodies litter the ground." notification "the metallic
  tang of wanderer afterburner hangs in the air." `enter` → underground / `leave`.
- underground: "a shack stands at the center of the village." / "there are still supplies inside." `take` → exit.
- exit: "all the work of a previous generation is here." / "ripe for the picking." `onLoad`: visited,
  `Prestige.collectStores()` (adds the saved `previous.stores` directly to the village stores and empties the
  array).

#### 5.10 Catalogue: `Events.Executioner` (events/executioner.js) — "A Ravaged Battleship"

Added later than the rest (the `features.executioner` migration at world.js:166–175 retrofits the `X` tile onto old
maps). It is a five-part dungeon chained with `nextEvent`, driven by four flags (`executioner`, `engineering`,
`medical`, `martial`) that the scenes set on the expedition's temporary `World.state`. Because `World.goHome` commits
the whole object with `$SM.setM('game.world', World.state)` (world.js:950), the flags survive across trips as long as
the wanderer gets home alive; dying discards that trip's flags with everything else. `World.doSpace` reads
`World.state.executioner` to choose between the intro and the antechamber (world.js:573–576), and the antechamber's
buttons read the three wing flags.

Shared enemies (`Enemies.Executioner`, executioner.js:1–115):

| Key | Enemy | glyph | dmg | hit | delay | hp | ranged | Loot | Notification |
|---|---|---|---|---|---|---|---|---|---|
| guard | mechanical guard | G | 10 | 0.8 | 2 | 60 | yes | energy cell 1–5 @0.8, laser rifle 1 @0.8, alien alloy 1 @0.2 | tripped a motion sensor. |
| quadruped | mechanical quadruped | Q | 8 | 0.8 | 1 | 70 | no | alien alloy 2–4 @0.2 (**Note:** the object literal declares `'alien alloy'` twice (l.44–53); the second definition wins, so the guaranteed 1 alloy is lost) | a mobile defence platform trundles around the corner. |
| medic | broken medic | M | 15 | 0.8 | 3 | 80 | no | alien alloy 1–2 @1, hypo 1–4 @0.2; `atHealth 40` → becomes **venomous** | a medical drone wheels out of control. |
| turret | defence turret | T | 25 | 0.8 | 4 | 50 | yes | energy cell 1–5 @0.8, alien alloy 1 @0.8, laser rifle 1 @0.2 | one of the defence turrets still works. |

**executioner-intro** (l.118–549) — on first visit to `X`.
- start: notification "the remains of a huge ship are embedded in the earth." text "the remains of a massive
  battleship lie here, like a silent sealed city." / "it lists to the side in a deep crevasse, cut when it fell from
  the sky." / "the hatches are all sealed, but the hull is blown out just above the dirt, providing an entrance."
  `enter` (torch 1) → 1.
- 1: "the interior of the ship is cold and dark. what little light there is only accentuates its harsh angles." /
  "the walls hum faintly." → `{0.4: 2-1, 0.8: 2-2, 1: 2-3}`.
- Branch A (webs): 2-1 "thick, sticky webbing covers the walls of the corridor." / "deeper into the ship, the
  darkness seems almost to writhe." / "a small knapsack hangs from a cluster of webs, a few feet from the floor."
  loot cured meat 1–5 @0.8, bullets 1–5 @0.5, energy cell 1–5 @0.2 → 3-1 combat **chitinous horror** (H
  1/0.7/0.25/60) "a huge arthropod lunges from the shadows, its mandibles thrashing." loot meat 5–10 @0.8, scales
  5–10 @0.5 → 4-1 combat **chitinous queen** (Q 1/0.7/0.25/70) "the webs part, and a grotesque insect lurches
  forward." loot meat 8–12 @0.8, scales 8–12 @0.5 → 5.
- Branch B (military): 2-2 combat **operative** (O 8/0.8/2/60) "an operative waits in ambush around the corner."
  loot bayonet 1 @0.5, bullets 1–5 @0.8, cured meat 1–5 @0.8 → 3-2 "the military has set up a small camp just inside
  the ship." / "crude attempts have been made to cut into the walls." / "scraps of copper wire litter the floor." /
  "two bedrolls are wedged into a corner." loot cured meat 1–5 @1, torch 1–3 @0.8, bullets 1–5 @0.5, alien alloy
  1–2 @0.2 → 4-2 combat **researcher** (R 1/0.8/2/20) "a dusty researcher clumsily hides in the shadows." loot torch
  1–3 @0.8, cloth 1–5 @0.8, cured meat 1–5 @0.8 → 5.
- Branch C (barricade): 2-3 "debris is stacked in the corridor, forming a low barricade." / "the walls are scorched
  and melted." / "behind the barricade, a few weapons lay abandoned." loot **laser rifle 1–3 @1**, energy cell 1–5
  @0.8, plasma rifle 1 @0.2 → 3-3 "the partially devoured remains of several wanderers are piled before a dark
  corridor." / "shuffling noises can be heard from within." loot energy cell 1–5 @0.5, cloth 1–5 @0.8 → 4-3 combat
  **ancient beast** (A 6/0.8/1/60) "an ancient beast has made these ruins its home." loot fur/meat 5–10 @1, teeth
  5–10 @0.8 → 5.
- 5: "a maintenance panel is embedded in the wall next to a large sealed door." / "perhaps the ship's systems are
  still operational." `power cycle` → 6.
- 6: combat **automated turret** (T 10/0.8/2.5/60, ranged) "as the lights come online, so too do the defence
  systems." loot energy cell 1–5 @0.8, laser rifle 1 @0.2 → 7.
- 7: "beyond the bulkhead is a small antechamber, seemingly untouched by scavengers." / "a large hatch grinds
  open, and the wind rushes in." / "a strange device sits on the floor. looks important." `onLoad`: road,
  `World.state.executioner = true`. `take device and leave`. → going home: `Fabricator.init()` and "builder knows
  the strange device when she sees it. takes it for herself real quick. doesn't ask where it came from."

**executioner-antechamber** (l.551–596) — subsequent visits. "a large hatch opens into a wide corridor." / "the
corridor leads to a bank of elevators, which appear to be functional." Buttons `engineering` / `medical` /
`martial` (each available until its flag is set) and `command deck` (available once all three flags are set), each
a `nextEvent`; `leave`.

**executioner-engineering** — "Engineering Wing" (l.598–1036)
- start "elevator doors open to a blasted corridor. debris covers the floor, piled into makeshift defences." /
  "emergency lighting flickers." → `{0.3: 1-1, 0.7: 1-2, 1: 1-3}`.
- 1-1 assembly line (loot energy cell 1–5 @0.8, laser rifle 1 @0.2) → `{0.5: 2-1a unruly welder (W 13/0.8/2/50;
  loot energy cell 1–5 @0.8, alien alloy 1 @0.2), 1: 2-1b sparks text}` → 3-1 **guard** → 4.
- 1-2 **turret** → 2-2 engine room "must have been the engine room, once…" loot **alien alloy 2–5 @1** →
  `{0.5: 3-2a guard, 1: 3-2b text}` → 4.
- 1-3 fire: "sparks cascade from a reactivated power junction, and catch." / "the flames fill the corridor."
  `extinguish` (cost **water 5**) or `rush through` (cost **hp 10**) → `{0.5: 2-3a guard, 1: 2-3b text}` → 3-3 guard
  post loot energy cell 1–5 @0.8, laser rifle 1 @0.7, grenade 1–3 @0.6, plasma rifle 1 @0.2 → 4.
- 4 R&D: "marks on the door read 'research and development.'…" `use machine` (cost alien alloy 1 → full heal,
  scene 4-heal "step inside, and the machine whirs. muscle and bone reknit. good as new.") / `continue` →
  `{0.5: 5-1 turret, 1: 5-2 text}` → 6 "experimental plans cover one wall, held by an unseen force." / "this one
  looks useful." loot **hypo blueprint 1 @1** → 7-intro "clattering metal and old servos. something is coming..."
  `fight` → 7 boss **unstable prototype** (P 5/0.8/2/150; special every 5 s: **shield**) "an unfinished automaton
  whirs to life." loot alien alloy 1–3 @1, **kinetic armour blueprint 1 @1** → 8 "at the back of the workshop,
  elevator doors twitch and buzz." sets `engineering = true`.

**executioner-martial** — "Martial Wing" (l.1038–1579)
- start "metal grinds, and the elevator doors open halfway. beyond is a brightly lit battlefield…" → 1 "further
  along, the corridor branches." / "the door to the left is sealed and refuses to open." `blow it down` (cost
  **grenade 1**) → 2-1 armoury "the blast throws the door inwards." / "…walls lined with weapon racks…" loot **energy
  blade 2–5 @1, laser rifle 2–5 @1, energy cell 5–20 @1**, grenade 1–5 @0.8, plasma rifle 1 @0.2 → 3-1 turret → 4-1
  → 5; `continue right` → `{0.5: 2-2 turret → {0.5: 3-2a quadruped, 1: 3-2b} → 4-2 crew cabins (energy cell 1–5
  @1, energy blade 1 @0.2) → 5; 1: 2-3 ruined turrets (alien alloy 1–3 @1) → {0.5: 3-3a guard, 1: 3-3b} → 4-3
  quadruped → 5}`.
- 5 barricades → 6 "documents are scattered down the hall…" loot **plasma rifle blueprint 1 @1** → `{0.5: 7-1, 1: 7-2}`.
- 7-1 planning room: `scavenge maps` (`World.applyMap()` ×3) → 8-1a guard "drew some attention with all that
  noise." → 9-1 guard "ran straight into another one." → 10; or `continue` → 8-1b "slipped past an automated
  sentry." → 9-1 → 10.
- 7-2 checkpoint → `{0.5: 8-2a empty cells, 1: 8-2b dead guards (laser rifle 2 @1, energy cell 5–10 @1)}` → 9-2
  quadruped → 10.
- 10 training complex with regenerative machine (`use machine`: alien alloy 1 → full heal) → 11 "motion from the
  centre of the yard." / "a sparring automaton, still fully function and crusted with timeworn blood, lunges
  forward." `engage` → 12 boss **murderous robot** (M 10/0.8/3/250; special every 13 s: **energised** = next hit ×4)
  "the machine attacks, blades whirling." loot alien alloy 1–3 @1, **disruptor blueprint 1 @1** → 13 "the ruins of
  the sparring machine clatter to the ground." / "picked this deck clean." sets `martial = true`.

**executioner-medical** — "Medical Wing" (l.1581–2152)
- start "elevator doors open to an empty corridor." / "a few dusty corpses can be seen further down, but this deck
  appears to have been spared most of the combat." → 1 turret → 2 graffiti corridor → `{0.5: 3a quadruped, 1: 3b
  text}` → 4 gurneys → `{0.5: 5-1, 1: 5-2}`.
- 5-1 medic → `{0.5: 6-1a medic "it had friends.", 1: 6-1b frozen robots}` → 7-1 dispatch bay (laser rifle 1 @1,
  energy cell 3–10 @1) → 8.
- 5-2 strategy room with locker: `force locker` → 6-2a-intro "hinges rusted through. no challenge." (energy cell
  5–10 @1, **hypo 1–3 @1**) → 6-2a medic "the noise draws attention." → 7-2 quadruped → 8; `continue` → 6-2b → 7-2 → 8.
- 8 mini-boss **unstable automaton** (A 10/0.7/2/100, **explosion: 30** on death) "something's wrong with this
  robot." loot **glowstone blueprint 1 @1** → 9 heavy doors → `{0.5: 10a guard, 1: 10b "slipped through
  unnoticed."}` → 11 medic → `{0.5: 12-1, 1: 12-2}`.
- 12-1 cold storage (cured meat 5–10 @1) → `{0.5: 13-1a guard, 1: 13-1b}` → 14-1 medic → 15.
- 12-2 surgical tools → `{0.5: 13-2a medic, 1: 13-2b explosives (grenade 3–8 @1)}` → 14-2 medic → 15.
- 15 containment cells → 16 boss **malformed experiment** (E 5/0.8/2/200; special every 16 s: **enraged** = attacks
  every 0.5 s for 4 s) "a mutated beast leaps from its cell." loot **stim blueprint 1 @1** → 17 "the creature's
  tortured breathing ceases." sets `medical = true`.

**executioner-command** — "Command Deck" (l.2154–2342)
- start "the path to the command bridge is wide, walls adorned with decorative shields." / "fighting hadn't reached
  here, it seems." → 1 guard → 2 officer's lounge → `{0.5: 3a weapons cache (energy cell 3–10 @1, grenade 1–5 @0.8),
  1: 3b medical bag (hypo 1–3 @1)}` → 4 "the command deck is empty, save for a squat figure sitting motionless in the
  centre of the room." / "in a flash, the figure is standing." `approach` → 5 "wanderer form, but not quite flesh.
  not quite metal either. a crystal set into its chest pulses with light." / "it says it saw the rebellion coming.
  said it made arrangements." / "says it can't die." `observe` → 6.
- 6 final boss **immortal wanderer** (`@` 12/0.8/2/**500**; special every 7 s: random among shield / enraged /
  meditation, never the same twice in a row) "the immortal wanderer attacks." loot **fleet beacon 1 @1** → 7 "the
  crystal pulses brightly, then goes dark. the assailant shimmers as its shape becomes less defined." / "then it is
  gone." / "time to get out of here." `onLoad: World.clearDungeon()`.

The fleet beacon changes the ending (`Space.showExpansionEnding`, space.js:455–512) and is worth 500 score.
Blueprints become craftable in the Fabricator only after being carried home (world.js:989–1009); `kinetic armour`
(+75 hp, shield button), `disruptor` (stun, no ammo), `hypo` (×5 per alloy), `stim` (boost), `plasma rifle`
(12 dmg), `glowstone` (waives all torch costs).

#### 5.11 The notification system (`notifications.js`)

The entire module is 78 lines. `Notifications.init` (l.6–21) appends `<div id="notifications">` containing
`<div id="notifyGradient">` to `#wrapper`. CSS puts the column at `position:absolute; top:20px; left:0; width:200px;
height:700px; overflow:hidden` (main.css:210–217) — i.e. in the 220 px left gutter created by `#wrapper`'s
`padding-left`. The gradient div covers the column with `linear-gradient(rgba(255,255,255,0) 0%, rgba(255,255,255,1)
100%)` so old messages fade to white toward the bottom (main.css:223–239; dark-mode equivalent in dark.css:10–15).

```js
notify: function(module, text, noQueue) {
  if(typeof text == 'undefined') return;
  if(text.slice(-1) != ".") text += ".";              // every line ends with a full stop
  if(module != null && Engine.activeModule != module) {
    if(!noQueue) {
      if(typeof this.notifyQueue[module] == 'undefined') { this.notifyQueue[module] = []; }
      this.notifyQueue[module].push(text);              // hold until the player visits that tab
    }
  } else {
    Notifications.printMessage(text);
  }
  Engine.saveGame();
},
printMessage: function(t) {
  var text = $('<div>').addClass('notification').css('opacity', '0').text(t).prependTo('div#notifications');
  text.animate({opacity: 1}, 500, 'linear', function() { Notifications.clearHidden(); });
},
printQueue: function(module) { /* shift+print everything queued for module */ }
```

Rules that fall out of this:

- **Newest on top** (`prependTo`), each `.notification` with `margin-bottom:10px`; a 500 ms fade-in.
- **Trailing period is enforced** — which is why every string in the data files is written without one or with
  one, inconsistently, and the log always looks uniform.
- **Per-module queues**: a message addressed to a module that is not on screen is queued and flushed when the
  player travels there (`Engine.travelTo` → `Notifications.printQueue(module)`, engine.js:635). `noQueue=true`
  (used for fire/temperature changes, room.js:711, 732, 747, 751) drops the message instead — you don't come back
  to 20 stale "the fire is flickering." lines. `module == null` prints immediately wherever you are (population
  arrivals, perk gains, event notifications).
- **How many are kept**: there is no count limit. `clearHidden` (l.46–61) removes any `.notification` whose
  `position().top` is below the bottom of `#notifyGradient` (700 px) — so the log holds as many messages as fit in
  700 px (roughly 25–35 one-liners) and everything below is garbage-collected after each new message.
- **Every notification saves the game** (`Engine.saveGame()` at l.43).
- Notifications are `.text()`, never HTML.

Who calls `notify` and with what module:

| Caller | Module arg | Examples |
|---|---|---|
| Room | `Room` | fire/temperature/builder/build messages |
| Outside | `Outside` (gather/traps/first arrival) or `null` (population) | "dry brush and dead branches…", "a stranger arrives in the night" |
| World | `World` | terrain narration, hunger/thirst, danger, "the world fades" |
| Path | `Room` (!) | "the compass points <dir>" is addressed to Room because the player is in the Room when the compass is bought |
| Ship / Fabricator | `Ship` / `Fabricator` | first-arrival flavour lines |
| Events | `null` | scene `notification` fields and button `notification`s |
| `$SM.addPerk` | `null` | perk `notify` strings |

#### 5.12 Message tone — the narrative notifications in playthrough order (for the writing team)

Style facts observable in the source: everything is lowercase (titles of events and tabs are the only Title Case);
sentences are short, often verbless fragments; the protagonist is never named or addressed — no "you", no "I";
present tense; the builder is "she"/"builder" (no article after she's introduced: "builder says…"); numbers are
spelled as digits inside UI strings and avoided in narration; punctuation is a single full stop (added automatically
if missing); humour is dry and rare ("builder just shivers", "she looks hungry.").

**Opening — the room (room.js)**

- the room is freezing. / the fire is dead. *(status lines; the five temperature words: freezing, cold, mild, warm, hot; the five fire words: dead, smoldering, flickering, burning, roaring)*
- the fire is burning.
- the light from the fire spills from the windows, out into the dark.
- a ragged stranger stumbles through the door and collapses in the corner.
- the wind howls outside. / the wood is running out.
- the stranger shivers, and mumbles quietly. her words are unintelligible.
- the stranger in the corner stops shivering. her breathing calms.
- the stranger is standing by the fire. she says she can help. says she builds things.
- builder stokes the fire.
- not enough wood to get the fire going. / the wood has run out. / builder just shivers. / not enough wood.
- builder says she can make traps to catch any creatures might still be alive out there.
- builder says she can make a cart for carrying wood. / the rickety cart will carry more wood from the forest.
- more traps to catch more creatures. / more traps won't help now.
- builder says there are more wanderers. says they'll work, too. / builder puts up a hut, out in the forest. says word will get around. / no more room for huts.
- villagers could help hunt, given the means. / the hunting lodge stands in the forest, a ways out of town.
- a trading post would make commerce easier. / now the nomads have a place to set up shop, they might stick around a while.
- builder says leather could be useful. says the villagers could make it. / tannery goes up quick, on the edge of the village.
- should cure the meat, or it'll spoil. builder says she can fix something up. / builder finishes the smokehouse. she looks hungry.
- builder says she could make finer things, if she had the tools. / workshop's finally ready. builder's excited to get to it.
- builder says the villagers could make steel, given the tools. / a haze falls over the village as the steelworks fires up.
- builder says it'd be useful to have a steady source of bullets. / armoury's done, welcoming back the weapons of the past.
- a torch to keep the dark away. / this waterskin'll hold a bit of water, at least. / the cask holds enough water for longer expeditions. / never go thirsty again.
- this spear's not elegant, but it's pretty good at stabbing. / sword is sharp. good protection out in the wilds. / the steel is strong, and the blade true. / black powder and bullets, like the old days.
- carrying more means longer expeditions to the wilds. / the wagon can carry a lot of supplies. / the convoy can haul mostly everything.
- leather's not strong. better than rags, though. / iron's stronger than leather. / steel's stronger than iron.

**The forest and village (outside.js)**

- the sky is grey and the wind blows relentlessly.
- dry brush and dead branches litter the forest floor.
- the traps contain scraps of fur, bits of meat and strange scales. *(assembled from: scraps of fur / bits of meat / strange scales / scattered teeth / tattered cloth / a crudely made charm)*
- a stranger arrives in the night.
- a weathered family takes up in one of the huts.
- a small group arrives, all dust and bones.
- a convoy lurches in, equal parts worry and hope.
- the town's booming. word does get around.

**Random village life (events/room.js, outside.js, global.js) — notification lines**

- strange noises can be heard through the walls. / something's in the store room.
- a nomad arrives, looking to trade. / traps are more effective with bait. / the old compass is dented and dusty, but it looks to work.
- a beggar arrives. / a mysterious wanderer arrives. / the mysterious wanderer returns, cart piled high with wood.
- a shady builder passes through. / the shady builder has made off with your wood. / the shady builder builds a hut.
- a scout stops for the night. / the map uncovers a bit of the world.
- an old wanderer arrives. / a sick man hobbles up. / the man swallows the medicine eagerly.
- some traps have been destroyed. / nothing was found. / there was a beast. it's dead now.
- a fire has started. / some villagers have died.
- some villagers are ill. / sufferers are healed. / sufferers are left to die.
- a plague afflicts the village. / epidemic is eradicated eventually. / population is almost exterminated.
- wild beasts attack the villagers. / predators become prey. price is unfair.
- troops storm the village. / warfare is bloodthirsty.
- a thief is caught.
- a strange thrumming, pounding and crashing. and then gone.

**Perks (engine.js:13–71, printed by `$SM.addPerk`)**

- learned to throw punches with purpose. / learned to fight quite effectively without weapons. / learned to strike faster without weapons.
- learned to swing weapons with force. / learned how to ignore the hunger. / learned to love the dry air.
- learned to be where they're not. / learned to predict their movement. / learned to look ahead. / learned how not to be seen. / learned to make the most of food.

**The path and the world (path.js, world.js)**

- the compass points northwest. *(one of: north, south, east, west, northeast, northwest, southeast, southwest)*
- the trees yield to dry grass. the yellowed brush rustles in the wind.
- the trees are gone. parched earth and blowing dust are poor replacements.
- trees loom on the horizon. grasses gradually yield to a forest floor of dry branches and fallen leaves.
- the grasses thin. soon, only dust remains.
- the barrens break at a sea of dying grass, swaying in the arid breeze.
- a wall of gnarled trees rises from the dust. their branches twist into a skeletal canopy overhead.
- dangerous to be this far from the village without proper protection. / safer here.
- the meat has run out. / starvation sets in. / there is no more water. / the thirst becomes unbearable.
- water replenished.
- the world fades.
- *(landmark arrival lines)* the remains of an old house stand as a monument to simpler times. / the earth here is split, as if bearing an ancient wound. / the path leads to an abandoned mine. / this old mine is not abandoned. / a military perimeter is set up around the mine. / the town lies abandoned, its citizens long dead. / the towers of a decaying city dominate the skyline. / a swamp festers in the stagnant air. / a safe place in the wilds. / the metallic tang of wanderer afterburner hangs in the air. / the remains of a huge ship are embedded in the earth.
- the iron mine is clear of dangers. / the coal mine is clear of dangers. / the sulphur mine is clear of dangers.
- *(combat openers, a sample)* a snarling beast leaps out of the underbrush. / a gaunt man approaches, a crazed look in his eye. / a shot rings out, from somewhere in the long grass. / a startled beast defends its home. / ambushed on the street. / the shot echoes in the empty street. / tripped a motion sensor.
- *(combat closers)* the snarling beast is dead. / the gaunt man is dead. / the two creatures are dead. / the soldier is dead.

**The ship, the fabricator, the end (ship.js, fabricator.js, world.js, space.js)**

- somewhere above the debris cloud, the wanderer fleet hovers. been on this rock too long.
- not enough alien alloy.
- builder knows the strange device when she sees it. takes it for herself real quick. doesn't ask where it came from.
- the familiar hum of wanderer machinery coming to life. finally, real tools.
- blueprints feed into the fabricator data port. possibilities grow.
- the blade hums, charged particles sparking and fizzing. / water out, water in. waste not, want not. / the workhorse of the wanderer fleet. / wanderer soldiers succeed by subverting the enemy's rage. / somtimes it is best not to fight. *(sic)* / a handful of hypos. life in a vial. / sometimes it is best to fight without restraint. / the peak of wanderer weapons technology, sleek and deadly. / a smooth, perfect sphere. its light is inextinguishable.
- time to get out of this place. won't be coming back. *(modal; buttons "lift off" / "linger")*
- *(beacon ending, space.js:467–496)* the beacon pulses gently as the ship glides through space. coordinates are locked. nothing to do but wait. / the beacon glows a solid blue, and then goes dim. the ship slows. gradually, the vast wanderer homefleet comes into view. massive worldships drift unnaturally through clouds of debris, scarred and dead. / the air is running out. / the capsule is cold. *(button: wait)*
- score for this game: N / total score: N / restart. / expanded story. alternate ending. behind the scenes commentary. get the app.

**Meta / system copy (engine.js)**

- Menu: language. / sound on. — sound off. / get the app. / lights off. — lights on. / hyper. — classic. / restart. / share. / save. / github. ; save indicator: saved.
- Sound Available! — ears flooded with new sensations. / perhaps silence is safer? (enable audio / disable audio)
- Export / Import — export or import save data, for backing up / or migrating computers; save this. (got it); are you sure? / if the code is invalid, all data will be lost. / this is irreversible.; put the save code here.
- Restart? — restart the game? ; Go Hyper? — turning hyper mode speeds up the game to x2 speed. do you want to do that?
- Get the App — bring the room with you. ; Share — bring your friends.
- README tagline (not in game): "awake. head throbbing. vision blurry. come light the fire."


---

### 6. Currencies and layering

#### 6.1 Every store: source, sink, and when it enters play

"Enters play" = the first moment a key can appear under `stores` (and therefore as a row in the stores box).
Shown-in-panel: R = `#resources`, S = `#special`, W = `#weapons`, hidden = `upgrade`/`building`/blueprint.

| Store | Panel | Earned by | Consumed by | Typically enters play |
|---|---|---|---|---|
| wood | R | `gather wood` +10 (+50 with cart); builder +2/10 s; gatherers +1/10 s each; events (Noises outside +100, Mysterious Wanderer +300/+1500) | light fire 5, stoke 1, every building, torches, spears/swords/rifle, wagon/convoy; charcutier −5/10 s; thieves −10/10 s; Noises inside −10 % | ~45 s (forest unlock sets it to 4) |
| fur | R | traps (50 % per drop); hunters +0.5/10 s; Ruined Trap/Beast Attack +100; Wanderer +300/1500 | lodge 10, trading post 100, tannery 50; tanner −5/10 s; all trade-post purchases (150–1500); nomad/beggar/scout/master; thieves −5/10 s | first trap check (~5 min) |
| meat | R | traps (25 %); hunters +0.5/10 s; events +100 | lodge 5, smokehouse 50; trapper −1/10 s; charcutier −5/10 s; thieves −5/10 s | first trap check |
| bait | R | nomad (5 fur each); trappers +1/10 s | `check traps`: one bait per trap consumed, doubling drops | nomad event or lodge |
| scales | R | traps (10 %); Noises inside; beggar +20; nomad 100 fur; trade post 150 fur; many loot tables | workshop 10, l armour 20, compass 20, bullets 10, energy cell 10, medicine 50, iron 50, steel 50, grenade 100, bayonet 500, alien alloy 750, scout map 10 | first trap check / store-room noises |
| teeth | R | traps (8 %); Noises inside; beggar; nomad 200 fur; trade post 300 fur; loot | bone spear 5, compass 10, coal 50, steel 50, medicine 30, energy cell 10, bolas 10, grenade 50, bayonet 250, alien alloy 300, scout/master | first trap check |
| cloth | R | traps (6.5 %); Noises inside; beggar; loot | torch 1 each | first trap check |
| charm | R | traps (0.5 %) | swamp `talk` (gastronome) | rarely, mid-game |
| leather | R | tanner +1/10 s (−5 fur); loot | workshop 100, waterskin 50, cask 100, rucksack 200, armours 200 each, iron sword 50, steel sword 100 | tannery (500 wood, 50 fur) |
| cured meat | R | charcutier +1/10 s (−5 meat, −5 wood); loot everywhere; Military Raid +50 | **required to embark**; eaten every 2 moves on the map; heal 8 in combat; miners −1/10 s each; Master 100 | smokehouse (600 wood, 50 meat) |
| iron | R | iron miner +1/10 s (−1 cured meat); trade post (150 fur + 50 scales); cave/town loot | steelworks 100, cask 20, water tank 100, wagon 100, convoy 200, i armour 100, iron sword 20; steelworker −1/10 s | iron mine cleared (distance 5) or trade |
| coal | R | coal miner; trade post (200 fur + 50 teeth); town end2 | steelworks 100; steelworker −1/10 s | coal mine cleared (distance 10) |
| sulphur | R | sulphur miner; (no trade-post price) | armoury 50, rifle 50; armourer −1/10 s | sulphur mine cleared (distance 20) |
| steel | R | steelworker +1/10 s; trade post (300 fur + 50 scales + 50 teeth); cave/town/city loot | armoury 100, water tank 50, convoy 100, s armour 100, steel sword 20, rifle 50; armourer −1/10 s | steelworks or loot |
| bullets | R | armourer +1/10 s; trade post 10 scales; loot; Military Raid +10 | rifle: 1 per shot (weight 0.1) | loot / armoury |
| energy cell | R | trade post (10 scales + 10 teeth); Sick Man +3; loot | laser rifle / plasma rifle: 1 per shot (weight 0.2) | city/battlefield loot |
| medicine | R | trade post (50 scales + 30 teeth); loot (houses, clinics, hospitals, shivering men) | combat `use meds` (20 hp); Sickness 1; Plague 5; Sick Man 1 | house/town loot or trade |
| hypo | R | fabricator (1 alloy → 5); battleship loot | combat `use hypo` (30 hp) | battleship |
| stim | R | fabricator (1 alloy) | combat `boost` (halve cooldowns 3 s, −10 hp) | battleship blueprint |
| alien alloy | R | boreholes 1–3 @100 %; city endings; battleship; Sick Man 10 %; trade post (1500 fur + 750 scales + 300 teeth) | ship hull +1 / engine +1 per alloy; every fabricator item (1–2); R&D/training machines (heal) | first borehole (distance ≥ 15) |
| fleet beacon | R | immortal wanderer (command deck) | ending variant; 500 score | end of battleship |
| torch | R (type tool) | craft 1 wood + 1 cloth; loot | entering caves/towns/mines/hospital/battleship (1 each); Master 1 | workshop |
| compass | S | nomad (300 fur, 15 scales, 5 teeth) or trade post (400/20/10) | opens the Path; never spent | trading post or nomad |
| waterskin / cask / water tank / fluid recycler | hidden | craft / fabricate | max water 20 / 30 / 60 / 110 | workshop / fabricator |
| rucksack / wagon / convoy / cargo drone | hidden | craft / fabricate | capacity 20 / 40 / 70 / 110 | workshop / fabricator |
| l armour / i armour / s armour / kinetic armour | hidden | craft / fabricate | max hp 15 / 25 / 45 / 85; kinetic adds the shield button | workshop / fabricator |
| bone spear / iron sword / steel sword / bayonet / energy blade | W | craft (spear, swords); loot (bayonet from veterans, swords from caves/towns); fabricator (blade) | carried into fights (weight 2 / 3 / 5 / 1 / 1); never consumed | workshop / loot |
| rifle / laser rifle / plasma rifle | W | craft (rifle); loot (city, battlefield, battleship); fabricator (plasma) | weight 5 each; need ammo | loot / armoury-era crafting |
| bolas / grenade / disruptor | W | trade post (10 teeth / 100 scales + 50 teeth); loot; fabricator | bolas & grenade are consumed on use (stun 15 s cd / 15 dmg); disruptor is a reusable stun | trade / loot |
| `* blueprint` | hidden | battleship bosses | redeemed into `character.blueprints` on returning home | battleship |

Trap drop table (`Outside.TrapDrops`, outside.js:97–128): roll `r`; fur if `r < 0.5`, meat `< 0.75`, scales `< 0.85`,
teeth `< 0.93`, cloth `< 0.995`, charm otherwise. Each `check traps` rolls `traps + min(bait, traps)` times (bait
doubles the drops) and consumes `min(bait, traps)` bait.

#### 6.2 Dependency graph

```
light fire ──► builder (lvl 4) ──► build: trap(10w) ─► check traps ─► fur, meat, scales, teeth, cloth, charm
      │                                 cart(30w) ─► gather 50 instead of 10
      ▼                                 hut(100w+50n) ─► population (4/hut, 0.5–2.5 min) ─► gatherers (+1 wood/10s each)
   wood ◄────────────────────────────────────────────────────────────────────────┘
      │
      ├─► lodge (200w,10fur,5meat) ─► hunters (fur+meat) & trappers (meat→bait)
      ├─► trading post (400w,100fur) ─► buy: compass, scales, teeth, iron, coal, steel, medicine, bullets, cells, bolas, grenade, bayonet, alloy
      │                                  (each buy button only after the good has been "seen")
      ├─► tannery (500w,50fur) ─► tanners: 5 fur ─► 1 leather
      ├─► smokehouse (600w,50meat) ─► charcutiers: 5 meat + 5 wood ─► 1 cured meat  ══► REQUIRED TO EMBARK
      ├─► workshop (800w,100leather,10scales) ─► craft: torch, waterskin/cask/tank, rucksack/wagon/convoy, armours, spears/swords/rifle
      │
compass ─► A Dusty Path ─► outfit (cured meat, water, torches, weapons) ─► A Barren World
      │                                                                      │
      │     iron mine (d=5, torch, 10hp boss) ─► iron miners: cured meat ─► iron
      │     coal mine (d=10, 3 fights) ─► coal miners: cured meat ─► coal
      │     caves (d 3–10) ─► iron/steel swords, cloth, leather, iron, steel
      │     houses (anywhere) ─► water, cured meat, medicine
      ▼
   steelworks (1500w,100iron,100coal) ─► steelworkers: iron+coal ─► steel ─► s armour (+35hp), steel sword, water tank, convoy, rifle
      │
      │     sulphur mine (d=20, 2 soldiers + veteran) ─► sulphur miners ─► sulphur ─► rifle (w/ steel), armoury
      ▼
   armoury (3000w,100steel,50sulphur) ─► armourers: steel+sulphur ─► bullets
      │
      │     towns (d 10–20) ─► steel sword, rifle, medicine, coal      cities (d 20–45) ─► rifles, laser rifles, cells, grenades, ALIEN ALLOY
      │     battlefields (d≥18) ─► guns, cells, grenades, alloy        boreholes (d≥15) ─► ALIEN ALLOY 1–3 guaranteed
      ▼
   crashed ship (d=28) ─► An Old Starship ─► alien alloy ─► hull (+1 each) & engine (+1 speed each) ─► lift off ─► 60 s asteroid run ─► ending
      │
   ravaged battleship (d=28) ─► fabricator device ─► A Whirring Fabricator (alloy ─► energy blade, recycler, cargo drone)
            └─► wings ─► blueprints (hypo, kinetic armour, plasma rifle, disruptor, stim, glowstone) ─► command deck ─► fleet beacon (alt ending)
```

Layering summary: **wood** is the only currency for ~5 minutes; **fur/meat** arrive with traps and stay the trade
currency for the whole game (every trade-post price is quoted in fur/scales/teeth, never in iron or steel); **cured
meat** is the hinge between village and world (it is both the expedition's food and the miners' wage); **iron →
steel** is the mid-game armour/weapon tier gated behind map dungeons rather than buildings; **alien alloy** is the
end-game currency with no production chain — it can only be looted, or bought at a punitive 1500 fur each.

#### 6.3 The thieves mechanic

See §2.4 for the trigger (`any store > 5000` once the world exists; room.js:875) and §5.7 for the event. Numbers:
`startThieves` installs `wood −10, fur −5, meat −5` every 10 s (state_manager.js:408–418). `addStolen`
(l.395–406) records the *actual* loss per store (if 3 fur remain, only 3 are logged). The Thief event is in the
random pool with ~3–5 min between ticks and must win a uniform draw against other available events, so a player
typically loses 1–3 k wood before the chance to hang or spare him. Hanging refunds `game.stolen` in full
(global.js:35–39); sparing gives the `stealthy` perk (fight chance 0.20 → 0.10). `game.thieves == 2` ends the
mechanic for the rest of the save.

#### 6.4 The trading post

A building (`wood 400, fur 100`) whose only effect is `Room.buyUnlocked` (room.js:1105–1115) and the `#buyBtns`
section. Prices are fixed functions (§3.4). Because unlocking needs the good to be "seen", trading is a
*smoothing* mechanism, not a discovery mechanism: you can buy iron only once you have found iron. The compass is
the exception and is the trading post's real purpose: `fur 400, scales 20, teeth 10` buys the Path. The Nomad
random event is a cheaper, luck-dependent compass vendor (`fur 300, scales 15, teeth 5`).

#### 6.5 A Dusty Path — outfitting

Source: path.js and world.js constants.

| Rule | Value | Code |
|---|---|---|
| Base capacity | `DEFAULT_BAG_SPACE = 10` | path.js:2 |
| Capacity upgrades (highest wins) | rucksack +10, wagon +30, convoy +60, cargo drone +100 | path.js:72–83 |
| Weights (everything else 1) | bone spear 2, iron sword 3, steel sword 5, rifle 5, laser rifle 5, plasma rifle 5, bullets 0.1, energy cell 0.2, bolas 0.5 | path.js:5–15 |
| Embark condition | `Path.outfit['cured meat'] > 0` | path.js:245–249 |
| Water (not weight) | `BASE_WATER = 10`; waterskin +10, cask +20, water tank +50, fluid recycler +100 | world.js:29, 1046–1058 |
| Food | 1 cured meat per `MOVES_PER_FOOD = 2` moves (×2 with slow metabolism); eating heals `MEAT_HEAL = 8` (×2 gastronome) | world.js:30, 480–512 |
| Water | 1 per `MOVES_PER_WATER = 1` move (×2 with desert rat) | world.js:31, 513–541 |
| Starvation / thirst | first empty tick warns ("the meat has run out" / "there is no more water"), second sets the flag ("starvation sets in" / "the thirst becomes unbearable"), third kills; 10 deaths by hunger → slow metabolism, 10 by thirst → desert rat | world.js:488–506, 519–535 |
| Health | `BASE_HEALTH = 10`; l armour +5, i armour +15, s armour +35, kinetic +75 | world.js:34, 1026–1037 |
| Hit chance | `BASE_HIT_CHANCE = 0.8` (+0.1 precise) | world.js:35, 1039–1044 |
| Fight chance | after `FIGHT_DELAY = 3` quiet moves, `FIGHT_CHANCE = 0.20` per move (×0.5 stealthy) | world.js:33, 39, 555–566 |
| Danger warnings | distance ≥ 8 without iron armour; ≥ 18 without steel armour | world.js:456–478 |
| Death | outfit lost, map changes discarded, back to Room, embark on 120 s cooldown | world.js:918–946 |
| Return | everything in the outfit is added back to stores; items that `leaveItAtHome` (everything except cured meat, bullets, energy cell, charm, medicine, stim, hypo, weapons and Room craftables) are zeroed in the outfit so the next trip starts clean | world.js:1011–1024 |

**Note:** `World.checkDanger` contains a bug at world.js:472: `if(World.getDistance < 18 && …)` compares the
function object (always truthy ≠ `< 18` → `false`), so the "safer here" message when re-entering 8–18 range with
iron armour never fires; only the `< 8` branch works.

Water is replenished at outposts (once per trip each), at "supplies" houses, and by the fluid recycler's larger
tank. A 28-step trip to the ship with base water (10) is impossible without stops; with a cask (30) it is exactly
feasible one way, which is why the design places houses everywhere and converts cleared dungeons into outposts.

#### 6.6 The world map

| Element | Value | Code |
|---|---|---|
| Size | `RADIUS = 30` → 61×61 tiles; village at `[30,30]` | world.js:2–3 |
| Terrain glyphs | forest `;`, field `,`, barrens `.`, road `#`; landmarks `A` village, `I/C/S` mines, `H` house, `V` cave, `O` town, `Y` city, `P` outpost, `W` ship, `B` borehole, `F` battlefield, `M` swamp, `U` cache, `X` battleship | world.js:4–24 |
| Generation | spiral outward from the village; each tile picks forest/field/barrens with base probs 0.15/0.35/0.5 blended with `STICKINESS 0.5` per already-placed neighbour (clusters form); tiles adjacent to the village are always forest | world.js:699–737, 809–863 |
| Landmark placement | `placeLandmark(min, max)`: random Manhattan radius `floor(rand*(max−min))+min`, random split into x/y, random signs; retried until it lands on terrain | world.js:785–803 |
| Landmark counts | outpost 0 (made by clearing); iron 1 @5; coal 1 @10; sulphur 1 @20; house 10 @0–45; cave 5 @3–10; town 10 @10–20; city 20 @20–45; ship 1 @28; borehole 10 @15–45; battlefield 5 @18–45; swamp 1 @15–45; battleship 1 @28; cache 1 @10–45 (prestige only) | world.js:139–156 |
| Fog of war | `mask` array; `LIGHT_RADIUS = 2` diamond around the wanderer (4 with scout); scout's map uncovers a radius-5 diamond at a random hidden tile; `seenAll` disables map buying | world.js:28, 641–697 |
| Distance | Manhattan: `|dx| + |dy|` | world.js:588–592 |
| Movement | arrow keys / WASD / swipe / click on the map quadrant; each move: narrate terrain change, uncover, redraw, `doSpace` (landmark or supplies+fight check), random footstep sound | world.js:354–454, 568–586 |
| Rendering | `#map` is a `<div>` of monospace text, one `<span class="landmark">` per visible landmark with a hover tooltip (label with `&nbsp;`); the wanderer is `@`; hidden tiles are `&nbsp;` | world.js:869–916, world.css |
| Transactional state | `World.state` is a deep copy of `game.world` on embark; committed by `goHome`, discarded by `die` | world.js:1080, 950, 926 |
| Roads | `clearDungeon` marks the tile `P` and `drawRoad` lays `#` along an L-path to the nearest road/outpost/village | world.js:204–276 |
| Compass | `mapSearch` finds the ship `W`; `compassDir` yields one of 8 words by comparing |x|/2 vs |y| | world.js:739–783 |

#### 6.7 The ship and space

| Element | Value | Code |
|---|---|---|
| Unlock | visit `W` → `World.state.ship = true` → on returning home `Ship.init()` | setpieces.js:3144–3148, world.js:965–968 |
| Hull | starts `BASE_HULL = 0`; `reinforce hull` = 1 alien alloy → +1 | ship.js:6–8, 104–116 |
| Engine | starts `BASE_THRUSTERS = 1`; `upgrade engine` = 1 alloy → +1; speed in space = `SHIP_SPEED 3 + thrusters` px per 33 ms frame | ship.js:118–127, space.js:94–96 |
| Lift off | disabled until hull > 0; 120 s cooldown; first time shows "Ready to Leave?" (lift off / linger) | ship.js:66–76, 133–165 |
| Space | ship `@` at (350,350) in a 700×700 field; asteroids (`#$%&H`, 32 px, spinning) fall from the top at random x, duration `1500 − rand×975` ms; spawn interval `1000 − altitude×10` ms, +1 asteroid per spawn above altitude 10, +2 more above 20, +2 more above 40; collision −1 hull; altitude +1 per second; body fades white→black over `FTB_SPEED 60 000` ms; **win** when the fade completes (~60 s), **crash** when hull hits 0 (back to Ship, no other loss) | space.js:102–289, 339–380 |
| Ending | music, ship flies off, all timers cleared, `Score.save(); Prestige.save();`, optional beacon outro, score screen, `Engine.deleteSave(true)` (keeps `previous.*`) | space.js:382–453 |

Hull needed is therefore "how many asteroids you expect to hit in 60 s"; speed makes dodging easier. There is no
cap on hull or thrusters other than alloy supply.


---

### 7. Pacing and cost curves

#### 7.1 Cost functions, quoted

All from `Room.Craftables` / `Room.TradeGoods` (room.js). The only two that scale:

```js
'trap': { maximum: 10, cost: function () {
  var n = $SM.get('game.buildings["trap"]', true);
  return { 'wood': 10 + (n * 10) };            // 10, 20, 30 … 100  (total for 10 traps: 550 wood)
}},
'hut': { maximum: 20, cost: function () {
  var n = $SM.get('game.buildings["hut"]', true);
  return { 'wood': 100 + (n * 50) };           // 100, 150 … 1050  (total for 20 huts: 11 500 wood)
}},
```

Everything else is flat:

```js
'cart':         { maximum: 1, cost: () => ({ 'wood': 30 }) }
'lodge':        { maximum: 1, cost: () => ({ wood: 200, fur: 10, meat: 5 }) }
'trading post': { maximum: 1, cost: () => ({ 'wood': 400, 'fur': 100 }) }
'tannery':      { maximum: 1, cost: () => ({ 'wood': 500, 'fur': 50 }) }
'smokehouse':   { maximum: 1, cost: () => ({ 'wood': 600, 'meat': 50 }) }
'workshop':     { maximum: 1, cost: () => ({ 'wood': 800, 'leather': 100, 'scales': 10 }) }
'steelworks':   { maximum: 1, cost: () => ({ 'wood': 1500, 'iron': 100, 'coal': 100 }) }
'armoury':      { maximum: 1, cost: () => ({ 'wood': 3000, 'steel': 100, 'sulphur': 50 }) }
// trade goods
'scales':  { fur: 150 }            'teeth':  { fur: 300 }
'iron':    { fur: 150, scales: 50 } 'coal':   { fur: 200, teeth: 50 }
'steel':   { fur: 300, scales: 50, teeth: 50 }
'medicine':{ scales: 50, teeth: 30 } 'bullets': { scales: 10 } 'energy cell': { scales: 10, teeth: 10 }
'bolas':   { teeth: 10 }  'grenade': { scales: 100, teeth: 50 }  'bayonet': { scales: 500, teeth: 250 }
'alien alloy': { fur: 1500, scales: 750, teeth: 300 }
'compass': { maximum: 1, fur: 400, scales: 20, teeth: 10 }
```

(The source writes these as `cost: function () { return {...}; }`; condensed here.)

The building ladder in wood alone: 10 → 30 → 100 → 200 → 400 → 500 → 600 → 800 → 1500 → 3000. Each step is
roughly 1.3–2× the previous, and each adds one new *input* resource (fur → meat → leather+scales → iron+coal →
steel+sulphur) so that wood never stops mattering but is never the only gate after the lodge.

#### 7.2 Production rates that set the tempo

| Source | Rate | Notes |
|---|---|---|
| Manual gather | 10 wood / 60 s = 10/min; 50/min with the cart | `Outside.gatherWood`, cooldown 60 s |
| Builder | 2 wood / 10 s = 12/min | free, forever |
| Each gatherer | 6 wood/min | so 4 villagers (one hut) ≈ 2 builders; 80 villagers = 480 wood/min |
| Stoking | −6 wood/min if stoked every 10 s; the builder maintains *flickering* for 0.2 wood/min | |
| Traps | 1 roll per trap (2 with bait) per 90 s check; 50 % fur, 25 % meat | 10 baited traps ≈ 6.7 fur + 3.3 meat per minute |
| Each hunter | 3 fur + 3 meat / min | |
| Population | +50–100 % of free space every 0.5–2.5 min | a new hut fills within a few minutes |
| Random events | one every 3–5 min while on Room/Outside | |
| Fire decay | one level per 5 min of neglect | |

#### 7.3 Time to milestones

The source contains **no timing targets**; the following are derived from the constants and rates above for an
attentive player, normal speed, with the caveat that trap and event RNG dominate the mid-game.

| Milestone | Gate | Approximate time |
|---|---|---|
| Fire lit, builder arrives | click + 30 s timer | 0:30 |
| Forest tab, stores box | +15 s | 0:45 |
| Builder awake (level 3) | room must be warm: 3 temperature ticks | 2:00–2:30 |
| Builder helping (level 4), first `build:` button | arrive at Room with ≥5 wood | 2:30–3:00 |
| First trap (10 wood) | | ~3:00 |
| Cart (30 wood) | | ~4:00 (worth it: gather ×5) |
| First trap check, first fur/meat | 90 s after the trap | ~4:30 |
| First hut (100 wood) at ~62 wood/min | | ~6:00 |
| First villager | 0.5–2.5 min after the hut | ~7:00–9:00 |
| "A Tiny Village" (2 huts) / Lodge (200 wood, 10 fur, 5 meat) | needs a few trap checks for fur/meat | ~10–15 min |
| Trading post (400 wood, 100 fur) | 100 fur ≈ 15 trap checks or ~5 hunter-minutes ×7 | ~20–30 min |
| Compass (400 fur, 20 scales, 10 teeth) or nomad luck | scales/teeth from traps (10 % / 8 %) or 150/300 fur each | ~30–45 min |
| Smokehouse + first cured meat (needed to embark) | 600 wood, 50 meat; charcutier eats 5 meat + 5 wood per unit | ~35–50 min |
| First landmark (house/cave within 2–10 steps) | first embark | ~40–60 min |
| Iron mine cleared (distance 5, torch, 10 hp beast) | a torch (workshop: 800 wood, 100 leather, 10 scales → tannery first) or a looted one | ~1 h |
| Coal mine (distance 10) → steelworks | 1500 wood + 100 iron + 100 coal; miners cost 1 cured meat each per 10 s | ~1.5–2.5 h |
| Steel armour + steel sword, sulphur mine (distance 20) | | ~2.5–4 h |
| Crashed ship (distance 28 ⇒ 56-step round trip without roads) | water ≥ 30 (cask) or outposts/houses on the way; tier-3 enemies | ~3–5 h |
| Enough alien alloy for a safe launch (hull ~10–20) | boreholes (10 × 1–2), city endings, trading at 1500 fur each | ~5–8 h |
| Battleship wings and command deck (500 hp boss) | kinetic armour, plasma rifle, hypos | optional, several more hours |

#### 7.4 The bottleneck → relief matrix

| Phase | Bottleneck the player feels | What relieves it | Cost of the relief | What the relief exposes next |
|---|---|---|---|---|
| 0–1 min | Nothing to do but one button; fire goes out | builder appears; forest unlocks | time (30 s + 15 s) | wood |
| 1–5 min | Wood: 10 per minute by hand, fire eats it | builder income; cart (×5 gather) | 30 wood | you can afford a hut |
| 5–15 min | Still wood (100+50n per hut); villagers trickle in | gatherers (6/min each) | 100–1050 wood per 4 workers | fur & meat have no use yet |
| 10–20 min | Fur/meat are random and slow (traps every 90 s) | lodge → hunters/trappers; bait | 200 wood + 10 fur + 5 meat | you now bank fur with no outlet |
| 20–40 min | No way to get scales/teeth/iron reliably | trading post; Nomad/Beggar events | 400 wood + 100 fur; 150–300 fur per unit | compass purchase becomes a savings goal |
| 30–50 min | Can't leave (no cured meat); can't make torches (no cloth → workshop) | smokehouse (charcutier), tannery → workshop | 600 wood + 50 meat; 500 + 50 fur; 800 + 100 leather + 10 scales | the world opens; combat kills you at distance 8+ |
| 1 h | 10 hp wanderer dies to tier-2 enemies; water lasts 10 steps | leather armour (+5), waterskin (+10), bone spear; caves hand out iron swords | 200 leather + 20 scales; 50 leather; 100 wood + 5 teeth | mines are now clearable |
| 1–2 h | Iron is scarce (loot or 150 fur + 50 scales each) | iron mine → miners; cured meat becomes the wage | one torch + one fight; 1 cured meat per ore | wood/meat demand spikes (5+5 per cured meat) |
| 2–3 h | Steel needed for everything good | coal mine → steelworks → steelworkers | 1500 wood + 100 iron + 100 coal | sulphur mine at distance 20 needs steel armour |
| 3–4 h | Ranged enemies at distance 20+ (sniper 15 dmg) | steel armour (+35), steel sword, rifle + bullets, grenades | 100 steel + 200 leather; armoury 3000 wood… | reaching the ship at 28 |
| 4–6 h | Alien alloy has no production chain | boreholes (guaranteed), city endings, buying at 1500 fur | map exploration; thieves start eating stores > 5000 | the 60 s asteroid run; hull count |
| end | Dying in space with 1–3 hull | more hull; more thrusters | 1 alloy each | — |

Each row follows the same pattern that the code enforces mechanically through `craftUnlocked`: the relief is
*shown* (button appears with its hint) when you have half its wood and have *touched* every other ingredient, so
the player sees the next goal just before it is affordable, never long before.


---

### 8. Save / load / prestige

#### 8.1 Where the save lives and when it is written

- **Key**: `localStorage.gameState` holds `JSON.stringify(State)` (engine.js:281). Two other keys are used:
  `localStorage.lang` (language choice, engine.js:815) and, via `Dropbox`, nothing local.
- **Writer**: `Engine.saveGame` (engine.js:272–283):

```js
saveGame: function() {
  if(typeof Storage != 'undefined' && localStorage) {
    if(Engine._saveTimer != null) { clearTimeout(Engine._saveTimer); }
    if(typeof Engine._lastNotify == 'undefined' || Date.now() - Engine._lastNotify > Engine.SAVE_DISPLAY){
      $('#saveNotify').css('opacity', 1).animate({opacity: 0}, 1000, 'linear');
      Engine._lastNotify = Date.now();
    }
    localStorage.gameState = JSON.stringify(State);
  }
}
```

- **Cadence**: there is no autosave timer. `saveGame` is called from `$SM.set/setM/add/addM/remove/removeBranch`
  whenever `noEvent` is false (state_manager.js:96, 113, 153, 192, 207), from `$SM.fireUpdate(name, true)`
  (used by the income tick, so at least once per second whenever income lands), from every `Notifications.notify`
  (notifications.js:43), from `Room.updateBuilderState` (room.js:792) and from `Engine.export64`. In practice the
  save is rewritten many times per second; `Engine._saveTimer` is referenced but never assigned (a vestige), and
  the "saved." indicator is rate-limited to once per `SAVE_DISPLAY = 30 s`.
- **Reader**: `Engine.loadGame` (engine.js:285–298) parses `localStorage.gameState` into `State`, runs
  `$SM.updateOldState()` for migrations, or on any failure starts fresh with `State = {}; $SM.set('version', 1.3)`.
  Nothing time-based is stored (no timestamps), so reopening the page resumes exactly where the state was with all
  timers restarting from their initial delays (fire-cool 5 min from load, population timer rescheduled, next event
  3–5 min from load, builder timer only if level 0–2, `unlockForest` re-armed in 15 s if `builder.level == 1 &&
  wood < 0` — room.js:575–577; note `$SM.get('stores.wood', true) < 0` can never be true because missing stores read
  as 0 and stored values are clamped at 0, so a reload inside that 15-second window skips `unlockForest`: the forest
  tab only appears on a *later* reload, after the builder's income has created `stores.wood` and `Engine.init` sees
  it defined. The condition was presumably meant to test for `undefined`).
- **Residual cooldowns** survive via `cooldown.<buttonId>` (§3.1) and pending wanderer returns via `wait.*`
  (`Events.initDelay` → `recallDelay` → calls the stored `Room[4].scenes.wood100.action()` with the remaining
  seconds; events.js:1444–1466).

#### 8.2 `state_manager.js` migrations (`updateOldState`, l.243–319)

| From | To | Change |
|---|---|---|
| (no version / 1.0) | 1.1 | remove `outside.workers.hunter` and `income.hunter` (lodge introduced) |
| 1.1 | 1.2 | place a Swamp on existing maps: `World.placeLandmark(15, World.RADIUS*1.5, World.TILE.SWAMP, map)` |
| 1.2 | 1.3 | StateManager introduced: move `room.*` → `features.location.room`, `game.builder.level`; `outside.*` → `features.location.outside`, `game.population/buildings/workers`, `game.outside.seenForest`; `world.*` → `features.location.world`, `game.world.map/mask`, `character.starved/dehydrated`; `ship.*` → `features.location.spaceShip`, `game.spaceShip.*`; `punches/perks/thieves/stolen/cityCleared` → `character.*` / `game.*`; set `version = 1.3` |

Later additions (executioner tile, `features.executioner`) are migrated in `World.init` instead
(world.js:166–175).

#### 8.3 Export / import

Menu "save." opens `Engine.exportImport` (engine.js:300–372), an event modal with three scenes. **Export**:
`Engine.export64` → save, enable text selection, `Base64.encode(localStorage.gameState)` with whitespace, dots and
newlines stripped (l.374–387), shown in a read-only textarea (auto-selected). **Import**: confirm ("if the code is
invalid, all data will be lost. / this is irreversible."), paste into a textarea, `Engine.import64(text)` strips
the same characters, `Base64.decode`, writes `localStorage.gameState`, `location.reload()` (l.389–398). There is
no validation — a bad string simply fails to parse on reload and `loadGame`'s catch starts a new game.

#### 8.4 Dropbox

`script/dropbox.js` (361 lines) is an optional connector to the long-discontinued **Dropbox Datastore API**
(`Dropbox.Client({key:'q7vyvfsakyfmp3o'})`, table `adarkroom`, 5 save slots). It is only wired in when
`Engine.options.dropbox` is true *and* `Engine.Dropbox` exists (engine.js:187–195); neither is true in the shipped
`index.html` (no Dropbox SDK script, `dropbox: false`), so it is dead code. It stores `Engine.generateExport64()`
strings in records and imports with `Engine.import64`.

#### 8.5 Restart and prestige

`Engine.confirmDelete` → `Engine.deleteSave(noReload)` (engine.js:428–438):

```js
var prestige = Prestige.get();   // {stores: previous.stores, score: previous.score}
window.State = {};
localStorage.clear();
Prestige.set(prestige);          // writes previous.stores / previous.score back into the fresh State (and saves)
if(!noReload) { location.reload(); }
```

So **restart keeps only `previous.*`**. `Prestige.save()` is called only by `Space.endGame` (space.js:439), i.e. you
have to *win* to bank anything. What is saved (prestige.js:11–65):

- `previous.stores` = an array (same order as `storesMap`) of `floor(stores[s] / randGen(type))` where `randGen`
  (l.82–101) divides goods (`g`) by a random 1–9, weapons (`w`) by `floor(rand*10)/2` → 1–4 (0 becomes 1), and
  ammo (`a`) by `ceil(rand*10 * ceil(rand*10))` → 1–100. Stores covered: wood, fur, meat, iron, coal, sulphur,
  steel, cured meat, scales, teeth, leather, bait, torch, cloth, bone spear, iron sword, steel sword, bayonet,
  rifle, laser rifle, bullets, energy cell, grenade, bolas. Alien alloy, medicine, armours, upgrades and the
  compass do **not** carry over.
- `previous.score` = `Score.totalScore()` = previous score + this game's score.

What the next game does with it: `World.init` adds the **cache** landmark (`U`, "A Destroyed Village", 1 at radius
10–45) only when `previous.stores` exists (world.js:153–156); walking into it and choosing `enter` → `take`
runs `Prestige.collectStores()` which `addM`s the whole array into `stores` and empties it (prestige.js:67–80).
Nothing else is changed — no faster timers, no unlocked buildings. The second run plays identically until the
player finds the cache.

Score (scoring.js:11–25): Σ `stores[i] × factor[i]` with
`factor = [1, 1.5, 1, 2, 2, 3, 3, 2, 2, 2, 2, 1.5, 1, 1, 10, 30, 50, 100, 150, 150, 3, 3, 5, 4]` in `storesMap` order,
plus `alien alloy × 10`, `fleet beacon × 500`, `hull × 50`.

#### 8.6 `Engine.options`, debug mode and how a tester speeds the game up

```js
options: { state: null, debug: false, log: false, dropbox: false, doubleTime: false },   // engine.js:73–79
init: function(options) {
  this.options = $.extend(this.options, options);
  this._debug = this.options.debug;
  this._log = this.options.log;
  ...
}
...
$(function() { Engine.init(); });                                                        // engine.js:940–942
```

`Engine.init` is called with **no arguments** on DOM-ready, and there is **no URL parameter** that sets `debug`
(the only query strings the code reads are `lang=`, index.html:35 / engine.js:813, and `ignorebrowser=true`,
engine.js:265–269). `?debug` / `?quick` do not exist in this version. The ways to accelerate, from the source:

1. **Hyper mode — the built-in, player-facing ×2.** Menu button `hyper.` → `Engine.confirmHyperMode` →
   `Engine.triggerHyperMode` toggles `Engine.options.doubleTime` and persists it as `config.hyperMode`
   (engine.js:555–589). Effects:

   ```js
   setInterval: function(callback, interval, skipDouble){
     if( Engine.options.doubleTime && !skipDouble ){ interval /= 2; }
     return setInterval(callback, interval);
   },
   setTimeout: function(callback, timeout, skipDouble){
     if( Engine.options.doubleTime && !skipDouble ){ timeout /= 2; }
     return setTimeout(callback, timeout);
   }
   ```

   and in `Button.cooldown` (Button.js:105–107) `if (Engine.options.doubleTime){ time /= 2; }`. So in hyper mode:
   income every 0.5 s (double production), fire cools every 2.5 min, temperature every 15 s, builder every 15 s,
   forest in 7.5 s, population every 0.25–1.25 min, events every 1.5–2.5 min, all button cooldowns halved
   (gather 30 s, traps 45 s, stoke 5 s, embark/lift-off 60 s), combat enemy timers halved too. Things passed
   `skipDouble=true` stay real-time: the post-fight 1 s pause (events.js:833), title un-blink, the space fade-in
   and asteroid spawn timer (space.js:186, 286). Note the game is **saved** in hyper mode, so a tester's save stays
   fast.

2. **Debug flag — timers only, not reachable from the UI.** Setting `Engine.options.debug = true` *before*
   `Engine.init` runs (edit engine.js:75, or inject a script that sets `Engine.options.debug = true` after
   `engine.js` loads but before DOM-ready) changes exactly these constants:

   ```js
   // room.js:502–507
   if (Engine._debug) {
     this._ROOM_WARM_DELAY = 5000;      // 30 s → 5 s
     this._BUILDER_STATE_DELAY = 5000;  // 30 s → 5 s
     this._STOKE_COOLDOWN = 0;          // 10 s → none
     this._NEED_WOOD_DELAY = 5000;      // 15 s → 5 s
   }
   // outside.js:136–139
   if(Engine._debug) {
     this._GATHER_DELAY = 0;            // 60 s → none
     this._TRAPS_DELAY = 0;             // 90 s → none
   }
   ```

   Nothing else checks `_debug`: fire cooling, events, population, income, embark and lift-off cooldowns are
   unchanged. `Engine.options.log = true` additionally prints `Engine.log` traces (scheduled minutes for events
   and population, income collection, scene loads) to the console.

3. **Direct state manipulation (consequence of the globals, not a designed cheat).** Because `$SM`, `State`,
   `Room`, `Outside`, `World`, `Events` are globals and every UI panel re-renders on `stateUpdate`, a tester can
   type in the console, e.g. `$SM.set('stores.wood', 5000)`, `$SM.set('game.builder.level', 4)`,
   `$SM.add('game.buildings["hut"]', 5)`, `$SM.set('stores.compass', 1)` (opens the Path immediately via
   `updateStoresView`), `Events.triggerEvent()` (fire a random event now), `Events.startEvent(Events.Setpieces.city)`,
   `Outside.increasePopulation()`, or `Room.coolFire()`. The state is persisted on the next write.

4. **Saves as fixtures**: export a base64 save (menu `save.`) at each milestone and re-import to jump between phases.


---

### 9. CSS and visual style

Nine stylesheets, 1 342 lines total; `main.css` (665) carries the framework, each module has a small file, and
`dark.css` is swapped in by the "lights off." toggle (loaded as `<link title="darkenLights">`, engine.js:537–553).
Translations may add `lang/<code>/main.css` to widen buttons (`lang/main.css`: `.button{width:100px !important}`
etc.).

#### 9.1 Typography and palette

```css
body, .tooltip, select.menuBtn {
  font-family: "Times New Roman", Times, serif;
  font-size: 16px;
  font-weight: normal;
  line-height: normal;
  letter-spacing: normal;
}                                              /* main.css:2–8 */
```

Light mode: pure **white page, black text, black 1 px borders**; the only greys are `#666` (menu text, shadows),
`#b2b2b2` (disabled buttons), `#DDDDDD` (cooldown bar), `#999` (map terrain, disabled arrows). The map uses
`"Courier New", Courier, monospace` (world.css:8). No images anywhere except the doublespeak logo SVG and
`img/adr.png` for social cards; everything is text and borders.

Dark mode (dark.css): background `#272823`, text `#EEE`, borders `#EEE`, tooltips `#171813`, disabled `#444`,
arrow greys `#555`, shadows `#111`.

Text selection is disabled globally (`::selection {background-color: transparent}` plus `Engine.disableSelection`
setting `onselectstart`/`onmousedown`), re-enabled only around the export textarea.

#### 9.2 Page frame and columns

```css
div#wrapper  { margin: auto; width: 700px; padding: 20px 0 0 220px; position: relative; }   /* main.css:41–46 */
div#content  { position: relative; overflow: hidden; height: 700px; }                       /* 56–60 */
div#header   { padding-bottom: 20px; height: 20px; }                                        /* 62–65 */
div#notifications { position: absolute; top: 20px; left: 0px; height: 700px; width: 200px; overflow: hidden; } /* 210–217 */
div#notifications div.notification { margin-bottom: 10px; }
div#notifyGradient { position:absolute; top:0; left:0; height:100%; width:100%; background-color:white;
  background: linear-gradient(rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%); }        /* 223–239 */
div#outerSlider { position: absolute; }
div#outerSlider > div { position: relative; float: left; width: 700px; height: 700px; overflow: hidden; }
div#locationSlider { position: absolute; }
div.location { position: relative; float: left; width: 700px; }
div.row_key { clear: both; float: left; }   div.row_val { float: right; }   div.total { font-weight: bold; }
```

So the fixed geometry is: a 920 px-wide centred block = 200 px log column + 20 px gap + 700 px play area, 700 px
tall, with tabs in a 20 px strip at the top. Panels are floated side by side and the whole strip is translated.

Menu: `.menu { position: fixed; right: 10px; bottom: 10px; color: #666; z-index: 10; }`, each `span` floated right
with `margin-left: 20px`, underline on hover (main.css:82–147). Logo: fixed bottom-left, 40 px tall.

#### 9.3 Header tabs

```css
div.headerButton { font-size: 17px; cursor: pointer; float: left; border-left: 1px solid black; margin-left: 10px; padding-left: 10px; }
div.headerButton:hover { text-decoration: underline; }
div.headerButton:first-child { border-left: none; margin-left: 0px; padding-left: 0px; }
div.headerButton.selected, div.headerButton.selected:hover { cursor: default; text-decoration: underline; }
```
(main.css:149–171). Plain text separated by hairlines; the active tab is simply underlined.

#### 9.4 The button

```css
div.button {
  position: relative; text-align: center;
  border: 1px solid black; width: 100px;
  margin-bottom: 5px; padding: 5px 10px;
  cursor: pointer; user-select: none;      /* plus vendor prefixes */
}
div.button:hover { text-decoration: underline; }
div.button.disabled, div.button.disabled:hover { cursor: default; border-color: #b2b2b2; color: #b2b2b2; text-decoration: none; }
div.button div.cooldown { position: absolute; top: 0px; left: 0px; z-index: -1; height: 100%; background-color: #DDDDDD; }
div.button div.tooltip { width: 100px; }
```
(main.css:243–277, 383–385). Most game buttons override width inline to `80px` (`width: '80px'` in the module
code); fabricator buttons are 150 px, ship buttons 100 px. The cooldown is the grey `div.cooldown` growing/shrinking
*behind* the label because of `z-index:-1` on a `position:relative` parent — the label never moves. A "free"
button (`.free`) hides its tooltip.

#### 9.5 Tooltips

```css
div.tooltip { display: none; padding: 2px 5px; border: 1px solid black; position: absolute;
  box-shadow: -1px 3px 2px #666; background: white; z-index: 999; }
.tooltip.bottom { top: 30px; }  .tooltip.right { left: 2px; }  .tooltip.left { right: 0px; }  .tooltip.top { bottom: 20px; }
*:hover > div.tooltip { display: block; }
div.tooltip:hover { display: none !important; }
.disabled:hover > div.tooltip, .button.free:hover > div.tooltip { display: none; }
#event .button.disabled:hover > div.tooltip { display: block; }
```
(main.css:389–429). Pure CSS hover tooltips, positioned by two class words; widths per context: button 100 px,
store row 160 px (outside.css:58–60), worker/outfit rows 150 px.

#### 9.6 Boxes with floating legends ("stores", "village", "supplies", "perks", "weapons", "blueprints")

All share one recipe — a bordered box whose caption is a `:before` pseudo-element reading the `data-legend`
attribute, pulled up onto the border with a white background so it masks the line:

```css
div#stores { position: relative; z-index: 10; border: 1px solid black; cursor: default; padding: 5px 10px; width: 200px; }
div#stores:before, div#weapons:before { position: absolute; background: white; content: attr(data-legend); left: 8px; top: -13px; }
div#weapons { margin-top: 15px; position: relative; right: 0px; border: 1px solid black; cursor: default; padding: 5px 10px; width: 200px; }
div#storesContainer { position: absolute; top: 0px; right: 0px; }
```
(room.css:25–60). The village box is identical with `#population` as a second legend at the top-right
(`position:absolute; top:-13px; right:10px; background-color:white`, outside.css:1–28); the Path's `#outfitting` box
puts `#bagspace` ("free 7/10") there (path.css:36–41); `#perks` and `#blueprints` use the same border/legend.
Rows are `.storeRow {position: relative}` containing a left-floated `row_key` and right-floated `row_val`, then
`div.clear`.

Build sections use the same attribute trick as a plain heading rather than a border:

```css
div#buildBtns { position: absolute; top: 50px; left: 0px; }
div#buildBtns:before, div#craftBtns:before, div#buyBtns:before { content: attr(data-legend); position: relative; top: -5px; }
div#craftBtns { position: absolute; top: 50px; left: 150px; }
div#buyBtns   { position: absolute; top: 50px; left: 300px; }
```
(room.css:1–23) — three columns of 80 px buttons under "build:", "craft:", "buy:", starting 50 px down so the
light/stoke button sits above them.

#### 9.7 The up/down arrows

`.upBtn/.dnBtn` (±1) and `.upManyBtn/.dnManyBtn` (±10) are 14×12 px absolutely positioned boxes drawn entirely with
border triangles: a 6 px black triangle (`:before`) with a 4 px (single) or 3 px (many) white triangle on top
(`:after`) so they render as an outlined chevron vs. a thinner one; disabled = `#999` (main.css:281–381). They sit
at `right:0` and `right:-15px` of the row value, `top:-3px` / `bottom:-3px`.

#### 9.8 The event modal

```css
.eventPanel { background: white; border: 2px solid transparent; left: 250px; padding: 20px; position: absolute; top: 90px; width: 335px; z-index: 20; }
.eventPanel:before { background-color: white; opacity: 0.6; content: " "; height: 700px; left: -252px; position: absolute; top: -75px; width: 920px; z-index: -2; }
.eventPanel:after  { position: absolute; top: -2px; left: -2px; width: 100%; height: 100%; content: " "; border: 2px solid black; box-shadow: 5px 5px 5px #666666; z-index: -2; }
.eventPanel .button { float: left; margin-right: 20px; }
.eventTitle { display: inline-block; font-weight: bold; position: absolute; top: -12px; }
.eventTitle:after { background-color: white; bottom: 32%; content: " "; height: 5px; left: 0; position: absolute; width: 100%; z-index: -1; }
#description { position: relative; min-height: 100px; }
#description > div { padding-bottom: 20px; }
#buttons > .button { margin: 0 5px 5px; margin-right: 15px; }
```
(main.css:433–541). The modal is 375 px wide including padding, offset so it sits over the play area; the 60 %
white sheet dims the whole 920×700 region (log included) without any extra DOM; the bold title "cuts" the top
border via its white underline strip. `Engine.share` passes `{width:'400px'}` for its wider button row.

#### 9.9 Combat and loot styling

```css
#description div.fighter { padding: 0px; position: absolute; bottom: 15px; }
#wanderer { left: 25%; }   #enemy { right: 25%; }
.hp { position: absolute; top: -15px; margin-left: -50%; }
.fighter.shield > .label::before { content: '('; position: absolute; left: -8px; }   /* ')' after */
.fighter.energised > .label { font-size: 2em; font-style: bold; }
.fighter.meditation > .label { font-size: 1.5em; opacity: 0.3; }
.fighter.venomous > .label { font-size: 1.5em; }  .fighter.enraged > .label { font-size: 1.5em; font-style: italic; }  .fighter.boost > .label { font-style: italic; }
@keyframes exploding { 0%{transform:translate(0,0)} 25%{transform:translate(-10px,0)} 75%{transform:translate(10px,0)} 100%{transform:translate(0,0)} }
.fighter.exploding > .label { animation: exploding 200ms linear infinite; }
#description .bullet { padding: 0px 20px; bottom: 25px; position: absolute; height: 1px; line-height: 1px; }
.damageText { position: absolute; bottom: 15px; left: 50%; margin-left: -50%; }
#lootButtons { margin: 20px 0 5px 0; position: relative; }
#lootButtons:before { content: attr(data-legend); position: absolute; top: -25px; left: 0px; }
#dropMenu { background: white; border: 1px solid black; position: absolute; z-index: 100; padding-top: 5px; text-align: left; box-shadow: -1px 3px 2px #666; }
```
(main.css:544–665). Fighters are single characters (`@` vs `R`/`E`/`T`/`D`…) with `hp/max` floating above; statuses
are shown purely typographically — parentheses for a shield, bigger/italic/faded glyphs for the rest.

#### 9.10 Map, path, ship, space

```css
#map { position: relative; font-family: "Courier New", Courier, monospace; border: 1px solid black; overflow: hidden;
  display: inline-block; line-height: 10px; letter-spacing: 1px; color: #999; cursor: default; user-select: none; }
#map .landmark { position: relative; font-weight: bold; color: black; line-height: 0px; }
#bagspace-world { border: 1px solid black; height: 62px; margin-bottom: 5px; margin-top: 13px; overflow: hidden; }
div.supplyItem { display: inline-block; border: 1px solid #999; float: left; margin: 0px 5px 6px 0px; padding: 0 5px; }
#backpackTitle / #backpackSpace / #healthCounter { position: absolute; top: 0; background: white; z-index: 1; } /* legends on the bag box */
#pathScroller { padding-top: 10px; position: relative; top: -10px; max-height: 660px; width: 475px; overflow-y: auto; }
#spacePanel { float: none !important; position: absolute !important; top: -700px; left: 0px; }
.asteroid { position: absolute; top: -40px; animation: 1s linear infinite spin; font-size: 32px; }
#stars > div, #starsBack > div { position: relative; height: 3000px; width: 3000px; color: white; }  #starsBack { opacity: 0.5; }
.endGame { font-size: 48px; color: #FFFFFF; opacity: 0; }  .endGameOption { font-size: 32px; cursor: pointer; }
.outro { font-size: 1.5rem; color: #FFF; opacity: 0; margin-bottom: 40px; }
```
(world.css, path.css, space.css). The 61-character map rows at `line-height:10px` make the map roughly 61×~9 px
wide by 610 px tall — a dense grey text field where bold black letters are the only things that read. Space is
two 3000×3000 layers of `.` stars scrolling at different speeds (parallax) behind a spinning punctuation asteroid
field, while `body` animates `background-color` from white to black.

#### 9.11 Motion vocabulary (all jQuery `animate`)

| Effect | Duration | Where |
|---|---|---|
| New row / section / button fade-in | 300 ms linear, opacity 0→1 | room.js, outside.js, path.js |
| Notification fade-in | 500 ms | notifications.js:65 |
| Tab slide | 300 ms × tab distance | engine.js:614 |
| Stores box reposition | 300 ms × distance, unqueued | engine.js:651–662 |
| Weapons box fade | 300 ms | engine.js:625–630 |
| Event modal fade | 200 ms (`_PANEL_FADE`) | events.js:1406, 1422 |
| Cooldown bar | linear, cooldown seconds | Button.js:108 |
| Combat lunge / bullet / damage float | 100 / 200 / 700 ms | events.js:689–731, 390–401 |
| Enemy death fade | 300 ms | events.js:788 |
| Embark slide / death fade / return | 300 / 600 / 300 ms | path.js:329, world.js:930–944, 983 |
| Lift-off slide | 300 ms | ship.js:168 |
| Fade to black | 60 000 ms | space.js:257–269 |
| Saved indicator | 1 000 ms fade-out | engine.js:278 |


---

### 10. Design lessons for a new game in this genre

Each bullet names the mechanism in the source it is drawn from.

**Mystery first**

1. Start with exactly one verb and no numbers. `Room.init` draws a single `light fire` button and hides the
   stores box until `stores.wood` exists 45 seconds later; the first cost tooltip is suppressed with `.free`
   (room.js:531–551, 665–671).
2. Let the first click be free and consequential. `lightFire` spends nothing when wood is undefined and
   immediately starts the builder clock (room.js:676–716) — reward the first action, then introduce scarcity.
3. Introduce the second screen *through* the first: the forest tab appears because the room ran out of wood
   ("the wind howls outside. / the wood is running out."), not because a menu unlocked (room.js:759–765).
4. Name tabs after the state of the place, not the function: "A Dark Room" ↔ "A Firelit Room", "A Silent Forest"
   → "A Lonely Hut" → … → "A Raucous Village" (room.js:640–646, outside.js:557–578). The header is itself a
   progress bar.
5. Tie reveals to *proximity to affordability*: show a build button at half its wood cost once every other
   ingredient has been seen, and speak the hint in the builder's voice (`craftUnlocked`, room.js:1073–1103). The
   player always sees the next goal just before reaching it and never a wall of locked items.
6. Never show an input before it has a use, never show a use before its input exists: trade-post goods appear only
   after the good has been seen (`buyUnlocked`), medicine events exist only when you own medicine
   (events/outside.js:99, 158).

**The resource panel teaches the economy**

7. One alphabetical list, one number per line, no icons — and the *tooltip* carries the economics: every income
   source touching that store with `+N per Xs` and a bold total (`Room.updateIncomeView`). The panel is both
   inventory and ledger.
8. Hide intermediate categories: upgrades and buildings are never listed (room.js:844–849); weapons get their own
   box; the compass gets a "special" slot. Keep the main list to things that go up and down.
9. Use the panel as the alarm system: thieves show up as a `thieves -10 per 10s` line before any event explains
   them (room.js:875–877 + the income tooltip).
10. Make jobs legible as conversions: each worker row's tooltip is literally `meat -1 per 10s / bait +1 per 10s`
    (outside.js:364–371); the all-or-nothing tick (state_manager.js:368–380) means a starved job visibly stops
    rather than producing fractions.
11. Keep rates in whole, memorable units: everything is "per 10 s", gather is 60 s, traps 90 s, fire 5 min,
    events 3–5 min, population 0.5–2.5 min.

**Writing**

12. Lowercase, terse, present tense, no second person, no protagonist name; the only character with a pronoun is
    the builder ("she"). Status lines are templated (`the fire is {0}`, `the room is {0}`) so the same shape
    repeats like a heartbeat.
13. Enforce a house style in code: `Notifications.notify` appends the full stop (notifications.js:32). The log
    always looks uniform regardless of the data author.
14. Write availability hints as dialogue from an NPC ("builder says she can make traps…") and completion lines
    as flat observation ("the hunting lodge stands in the forest, a ways out of town"). Hint = voice; result =
    world.
15. Let the log scroll off and fade (`#notifyGradient`, `clearHidden`); don't make history a UI the player must
    manage.
16. Use a tiny vocabulary of adjectives for state ladders (dead/smoldering/flickering/burning/roaring;
    freezing/cold/mild/warm/hot) and reuse them in titles and music selection.

**Random events**

17. One timer (3–5 min), one uniform draw over *currently available* events, availability expressed as a pure
    `isAvailable()` function over state + active tab (events.js:1316–1336). No weights, no per-event cooldowns —
    simplicity over tuning, and it mostly works because the pool is small (≤10 at any moment).
18. Make events *optional texture*: every pooled event has a "turn him away / ignore / go home" exit; nothing in
    the main progression requires an event (the Nomad's cheaper compass is a bonus, the trading post is the
    guaranteed path).
19. Give events costs in the currencies the player is hoarding (fur, wood) and rewards in the ones they can't yet
    produce (scales, teeth, cloth, maps, perks). The Beggar and store-room Noises are how scales/teeth first enter
    play.
20. Pair every disaster with a transaction: Sickness/Plague offer `1 medicine` / `5 medicine` / an inflated
    `buy medicine` next to `do nothing`. Loss is a price, not a punishment.
21. Use the browser itself for attention: `*** EVENT ***` title blink every 3 s (events.js:1300–1308) and queued
    per-tab notifications flushed on arrival.
22. Delayed payoffs persist: the Mysterious Wanderer's 60 s return is written to state (`wait.*`) and re-armed on
    reload (events.js:1444–1486). Trust is only possible if the game remembers its promises.

**Choice events**

23. One data shape for everything — `scenes.{name}.{text[], notification, reward, onLoad, loot, buttons}` and
    buttons with `{cost, reward, available, onChoose, nextScene}` — reused for system dialogs (export/import,
    restart, hyper) as well as story (engine.js:300–372). A single renderer, a single modal.
24. Branch with a weighted map `{0.3:'a', 1:'b'}` instead of code; authors can tune odds by editing numbers
    (events.js:1282–1295).
25. Costs that are not stores (`water`, `hp`, `torch` waived by glowstone) are special-cased in one place
    (events.js:1168–1177, 1212–1233); keep that list short.
26. Setpieces are shallow trees (3–5 layers) with a "leave" at every node and a `clearDungeon` at every leaf; the
    player is never trapped, and finishing converts the tile into an outpost that refills water — the map improves
    because you explored it.

**Combat stays lightweight**

27. Enemies are five numbers (`damage, hit, attackDelay, health, ranged`) and a glyph (encounters.js). Difficulty
    tiers are distance bands × terrain, so the designer's table (`doc/Zones.txt`) maps directly to data.
28. Player agency in a fight is only *timing* (cooldowns) and *consumables* (eat/meds/ammo); there are no stats
    screens. Perks are flat multipliers applied in one function (`useWeapon`, events.js:520–537).
29. Make retreat free: `leave` after every fight, `run` during mine assaults, death costs the trip and the bag
    but never the village (`World.die`).
30. Reserve mechanics (shield / enrage / meditate / venom / explosion / energise) for the final dungeon and
    render them with typography (parentheses, italics, size) rather than new UI (main.css:564–609).

**The map as a mid-game shift**

31. Gate the map behind a *purchased* item (compass) and a *produced* consumable (cured meat) so the economy must
    be functioning before exploration begins (path.js:245–249, room.js:931–934).
32. Make exploration transactional: changes live in a copy (`World.state`) and are committed only on a safe
    return (`goHome`); death discards them. This gives risk without save-scumming or permanent loss of the base.
33. Give the player a direction, not a map: the compass tooltip points at the ship from minute one
    (world.js:191–195); fog of war with radius 2 and a cheap "buy map" event does the rest.
34. Put the resource producers (mines) on the map at fixed radii (5/10/20) so the first three expeditions have
    obvious objectives, and let roads (`drawRoad`) visibly shorten the world as you clear it.
35. Let the base feed the map and the map feed the base: cured meat is both ration and miner wage; loot seeds the
    trade-post catalogue (`buyUnlocked`).

**Pacing and economy**

36. Scale only the mass-produced building (huts, +50 each) and the first one (traps, +10 each); keep every unique
    building flat so the ladder reads as a story (10 → 30 → 100 → 200 → 400 → 500 → 600 → 800 → 1500 → 3000 wood).
37. Add exactly one new input per rung (fur → meat → leather+scales → iron+coal → steel+sulphur). Wood stays in
    every recipe so early production never becomes worthless.
38. Make the top currency (alien alloy) non-producible — only looted, or bought at an absurd price — so the
    end-game is exploration rather than idling.
39. Add a soft cap that bites only hoarders: thieves start at >5000 of any store and only once the world is open
    (room.js:875), and they end with a one-time moral choice.
40. Cap the simulation: 20 huts / 80 pop, 10 traps. The village is meant to be finished, not optimised forever.
41. Persist constantly, cheaply: `JSON.stringify(State)` to `localStorage` on every mutation; export/import as
    base64 for portability. No timestamps means no offline progress — a deliberate choice that keeps the
    opening pacing intact for returning players.
42. Offer a ×2 speed toggle (hyper) by halving one wrapper (`Engine.setTimeout/setInterval`) rather than touching
    every constant; persist the choice.

**Mistakes to avoid (observed in this codebase)**

43. Don't tie a progression step to a UI side-effect: builder level 3→4 fires only in `Room.onArrival`
    (room.js:593–601), so it depends on the player switching tabs. Progression should advance in the timer that
    produced it.
44. Don't use `eval`-based string paths for state (`$SM.get('stores["cured meat"]')`, state_manager.js:83,166):
    typos become silent `undefined`s and every lookup is slow; prefer a typed store with explicit keys.
45. Don't re-render whole panels on every tick: the income tick triggers `updateStoresView` + `updateIncomeView`
    + `updateVillage` every second, rebuilding tooltips with jQuery. Diff by key instead.
46. Don't let availability depend on "store is truthy": a resource that drops to 0 un-"sees" itself in
    `craftUnlocked` (room.js:1091–1094). Track discovery as a separate flag.
47. Don't leave dead data in content tables (every `audio: AudioLibrary.BUILD_TRAP` is `undefined`; duplicate
    `'alien alloy'` keys in the quadruped loot silently drop the guaranteed drop; `World.getDistance < 18` compares
    a function; the wanderers' resume keys `Room[4]`/`Room[5]` point at the wrong array slots since the Shady Builder
    was inserted, so pending deliveries are dropped on reload). Validate content at load time and never key persisted
    state by array index.
48. Don't put marketing in the event pool without a module filter: Penrose can interrupt the world map and never
    sets its flag unless clicked (marketing.js:10–30).
49. Don't make the log the only memory: nothing records which events a player has already seen, so the same
    story can repeat back-to-back.
50. Don't rely on `setTimeout` chains that die with the tab: a reload during the 15-second forest-unlock window
    skips `unlockForest` because the re-arm condition `wood < 0` (room.js:575–577) is unreachable, and the forest tab
    only comes back on a later reload. Derive "what should be unlocked" from state on load, not from in-flight timers.


---

# Part IV. Game Dev Story, Kairosoft wiki

# Game Dev Story (Kairosoft) — mechanics reference for transposing the loop to an AI-lab incremental game

Prepared 2026-10-03 for the ASI-game design team.

**How this was researched, and the caveats you need before trusting any number below.**

- The network egress policy of this session blocks direct fetches of `kairosoft.fandom.com`, its mirror `kairosoft.wiki.gg`, `strategywiki.org`, `gamefaqs.gamespot.com`, `tvtropes.org`, `steamcommunity.com`, `en.wikipedia.org`, `giantbomb.com`, `neoseeker.com`, `pocketgamer.com`, `archive.org`, and every fan blog I tried (403 at the CONNECT step; the proxy README says not to route around policy denials, so I did not use translate/reader proxies). Everything in this file therefore comes from **search-engine extracts of those pages** (the WebSearch tool returns passages from the indexed page). Numbers that the extracts quoted verbatim from wiki tables are reproduced as-is; where an extract paraphrased, I say so. Where a fact was not surfaced at all I write **"not found"** rather than guessing.
- The session's web-search budget was exhausted (200 searches) before every gap was closed. Known gaps are listed at the end of each section.
- Two claims found in secondary sources contradict the wiki and are **flagged as unverified / probably wrong**: (a) a "Normal / Speed / Quality / Research / Budget+" development-direction menu (PocketGamer "best combos" page; the wiki describes only the eight direction-point categories), and (b) a `fans * (R/10)` sales formula — that one is from the *Game Dev Tycoon* wiki's Sales Algorithm page, not Game Dev Story; it is excluded.
- Game Dev Story (GDS) exists as a 1997 Japanese PC game and the 2010 mobile remake that everyone means by the name (iOS/Android 2010, Switch 2018, PS4 2021, Steam 2022, Xbox 2023 per the Wikipedia extract). All mechanics below are the 2010+ version unless stated. The 1997 PC original has different menus (Promotion / Genre Variety / Infrastructure investments, per https://www.niahak.org/quick-guide-game-dev-story-pc/) and is only mentioned where relevant.
- Money is written as the game writes it: `$500.0K` = 500,000; `$10,000.0K` = 10 million.
- Calendar notation: `Y3 M11 W1` = year 3, month 11, week 1. The game starts in **Y1 M4** (April), the fiscal year ends in March when salaries are paid, and the game's scored period ends at **Y21 M1** (20 years).

Primary page URLs (fetched indirectly, see above):

| Topic | URL |
| --- | --- |
| Main page | https://kairosoft.fandom.com/wiki/Game_Dev_Story (mirror: https://kairosoft.wiki.gg/wiki/Game_Dev_Story) |
| Development process ("Creating games") | https://kairosoft.fandom.com/wiki/Creating_games_(Game_Dev_Story) |
| Items / boosts | https://kairosoft.fandom.com/wiki/Items_(Game_Dev_Story) |
| Careers (job types) | https://kairosoft.fandom.com/wiki/Careers_(Game_Dev_Story) |
| Employees (hiring, salaries, outsourcing) | https://kairosoft.fandom.com/wiki/Employees_(Game_Dev_Story) |
| Training | https://kairosoft.fandom.com/wiki/Training_(Game_Dev_Story) |
| Consoles | https://kairosoft.fandom.com/wiki/Consoles_(Game_Dev_Story) |
| Genres and types (combos) | https://kairosoft.fandom.com/wiki/Genres_and_types_(Game_Dev_Story) |
| Magazine Reviews | https://kairosoft.fandom.com/wiki/Magazine_Reviews_(Game_Dev_Story) |
| Achievements (contains award thresholds) | https://kairosoft.fandom.com/wiki/Achievements_(Game_Dev_Story) |
| Tips | https://kairosoft.fandom.com/wiki/Tips_(Game_Dev_Story) |
| Endgame | https://kairosoft.fandom.com/wiki/Endgame_(Game_Dev_Story) |
| In-game manual transcript | https://kairosoft.fandom.com/wiki/Transcript:Manual_(Game_Dev_Story) |
| Companies (console makers) | https://kairosoft.wiki.gg/wiki/Companies_(Game_Dev_Story) |
| StrategyWiki gameplay / walkthrough / combinations / staff | https://strategywiki.org/wiki/Game_Dev_Story/Gameplay , /Walkthrough , /Combinations , /Staff |
| GameFAQs strategy guide (ajonatan) | https://gamefaqs.gamespot.com/iphone/610758-game-dev-story/faqs/61859 |
| Steam "All Achievements Guide" | https://steamcommunity.com/sharedfiles/filedetails/?id=2789877528 |

The wiki pages the task named by other titles map as follows: "Game Development" = *Creating games*; "Points / Bugs / Direction / Boost" are sections of *Creating games* and *Items*; "Staff / Hacker / Leveling / Salary" = *Careers* + *Employees*; "Reviews / Hall of Fame" = *Magazine Reviews*; "Sales / Fans / Advertising" are sections of the main page and *Tips*; "Awards" is on the main page and *Achievements*; "Contracts / Research Data" are on the main page, *Creating games* and the *Manual* transcript; "Game Console (own hardware)" is on *Consoles*; "Secrets" = special characters (see *Mister X* page https://kairosoft.fandom.com/wiki/Mister_X and the GameFAQs hidden-characters answer); "Sequels" is on *Creating games*. I found no separate "Points", "Bugs", "Sales", "Awards" or "Sequels" pages on the wiki.

---

### 1. The core loop, step by step

#### 1.0 One cycle at a glance

```
[Have cash + staff + (optional) console licence + Research Data]
        |
        v
 Develop > New Game
   1. choose CONSOLE (licence must already be owned; PC is free)
   2. choose GENRE then TYPE  -> combo rating shown ("Amazing!" ... "Not good")
   3. choose who writes the PROPOSAL (own staff or paid outsourcer)
   4. allocate DIRECTION points (8 sliders; pool grows with genre levels)
   5. name the game; development starts (progress 0% -> 100%)
        |  staff generate Fun / Creativity / Graphics / Sound points and BUGS every tick
        |  at 40%  "alpha" -> choose GRAPHICS lead (staff or outsourcer)
        |  at 80%  "beta"  -> choose SOUND lead (staff or outsourcer)
        |  anytime: Boost items (30 Research Data each), employee boost requests (~$50K + RD)
        v
   6. 100% -> DEBUGGING (bugs removed one by one; 1-3 RD per bug) ... or ship early with bugs
   7. RELEASE -> 4 magazine critics score 0-10 each (max 40)
        |  32+/40 -> Hall of Fame (unlocks sequel, award eligibility)
        v
   8. SALES run week by week (weekly sales ranking); income depends on review score, fans, hype,
      console market share, season (M7 and M12 are "high sales" months), advertising after launch
   9. Dec week 3 every year: Global Game Awards (Grand Prize / Runner-up / Best Design / Best Music / Worst Game)
  10. REINVEST: hire, train, level up (Research Data), buy licences, move office, buy items from the
      annual salesman; pay salaries at end of March
```

Sources for the skeleton: *Creating games* and main page extracts; StrategyWiki Gameplay (https://strategywiki.org/wiki/Game_Dev_Story/Gameplay); the manual transcript ("First, you have to select a game genre and type. The combination of these will have a big effect on sales. You will need a license to develop for a game console. Next, you need a game proposal. You can ask an employee with scenario writing experience, or outsource it. Your choice affects the game's quality." — https://kairosoft.fandom.com/wiki/Transcript:Manual_(Game_Dev_Story)).

#### 1.1 Starting conditions

- You begin with **$500.0K** cash and **10 Research Data** (StrategyWiki Gameplay). The manual's stated goal: "create a million-selling game and win the Grand Prize in the Global Game Awards."
- The first office seats **4** staff (StrategyWiki: "you can have up to four employees in the beginning office, and a well-rounded team at this stage would include a writer, a coder, a designer, and a sound engineer").
- The manual's suggested opening: "First, you'll need to hire some employees. You can start developing a game to earn money, or take contracting jobs and focus on training your staff."
- Only the PC platform is free; every other console needs a licence bought up front (see Section 3).

#### 1.2 Step 1 — choose the platform

- Licence is a one-time fee per console; without it the console does not appear in the list. PC: no licence, per-game development cost **$10.0K**. Microx SX: licence **$200.0K**, per-game dev cost **$50.0K**. PlayStatus: licence **$10,000.0K**, per-game dev cost **$650.0K** (Consoles page extract; a GameFAQs thread phrases it as "an initial fee for the dev kit as well as a license fee per game"). The per-game dev cost for the other consoles was not surfaced.
- Each console has a **market share %** that moves over time; a bigger share means more buyers for your game. Example in-game shares quoted from a GameFAQs thread: 16%, 14%, 13%, 13% for four competing machines; a self-made console can reach ~32% versus "the 17% or low 20s you tend to see" (https://gamefaqs.gamespot.com/boards/610758-game-dev-story/57465764 and /57848391).
- Players are warned **3 months** before a console is discontinued; after removal you can no longer develop for it (Consoles page). The PC is never removed, nor is any console from the "Mini Status" onward.
- Strategy quoted from the GameFAQs guide: don't licence anything until the **Game Kid** (Y3 M11, $550.0K, ~13-year lifespan), then the **Game Swan** (Y7 M6, $4,500.0K).

#### 1.3 Step 2 — choose genre and type

- One genre + one type per game. The pair receives a **combo rating** in five tiers: **"Amazing!" > "Creative" > "Not Bad" > "Hmm..." > "Not Good"** (Genres and types page; StrategyWiki Combinations). "This plays a key role in making a top-selling game."
- Every genre and type also carries a **popularity grade A / B / C** with consumers (table in Section 4), and popularity "varies in time".
- Each genre and each type has its own **level**; "as you develop new games with the same genre or type, you will level up the skill of that genre or type." Genre level 2 and level 5 each add **+2** to the direction-point pool (see 1.5). Hitting level 5 on a type also grants +2 per one extract ("every time you get a genre or a theme to level 5, you get two points").
- Genres unlock when a staff member reaches a given level in a given career (or you hire someone already at that level). Types unlock when a staff member at or above a given level in a given career completes a specific **training** course (Section 4 has the tables).
- Fans punish repetition: "Fans tend to disapprove of too many games in the same theme/genre combination ... making three sequels in a row of a Shooter/Robot franchise caused fans to start dropping" (https://www.gamedeveloper.com/production/-quot-game-dev-story-quot-7-valuable-lessons-for-game-developers).

#### 1.4 Step 3 — the proposal

- "You'll be prompted to choose someone to write a game proposal. You can either choose an employee on staff, or you can outsource the task for a fee." The proposal "determin[es] the starting Fun and Creativity values of your game based on an employee's programming or scenario skills" (StrategyWiki Gameplay).
- Best writer = whoever has the highest Program or Scenario stat; Writers and Directors are the natural choices (Careers page extract).
- Repeat-use penalty: if the same employee is used for the proposal/graphics/sound on consecutive games the yield falls — the wiki's reason to outsource is "only have one employee that can do it and want to avoid using them again since it hurts the stats gained" and StrategyWiki says "if your designer has worked on too many projects, anyone with a high graphics score will do" (Employees page; StrategyWiki Gameplay).
- Outsourcers are 18 named NPCs with escalating fee and stats. Writers surfaced: Josh Slackerville **$10K**, Mark Jersey **$100K**, Sid Hightower **$350K**, Hugh Jative **$770K**, Ima Gamer **$1,000K** (Program 108 / Scenario 234 / Graphics 46 / Sound 39), William Tomato **$2,400K** (120 / 282 / 75 / 24) (Employees page extract). The graphics and sound outsourcers' names and fees were not surfaced.

#### 1.5 Step 4 — direction points

- Eight categories: **Cuteness, Realism, Approachability, Niche Appeal, Simplicity, Innovation, Game World, Polish** (Creating games page; GameFAQs "Game Direction Guide" thread https://gamefaqs.gamespot.com/boards/610758-game-dev-story/56855237).
- You distribute a **limited pool** of points; "You start with some points, which are increased by 2 when a genre reaches level 2 and level 5." The starting pool size was not surfaced.
- Effects: the categories bias which point types/how reviewers and audiences respond; the community strategy is to spread points but stack what fits the combo ("stacking Game World for Action RPG or Realism for War games ... high, balanced game scores that result in higher sales, review scores, and chances for awards"). GameFAQs high-score advice: "Max out Innovation and Approachability first to increase review scores and attract non-core gamers" (https://gamefaqs.gamespot.com/boards/610758-game-dev-story/57807998).
- The direction pool size carries over in New Game+ (Endgame page: "Number of points to put in direction at the start of development").
- **Unverified / likely wrong:** a PocketGamer article (https://www.pocketgamer.com/game-dev-story/best-combos/) describes five "leading directions" — Normal (no change), Speed (+20% cost, faster, lower quality), Quality (+30% cost, slower, better), Research (+50% cost, more research data), Budget+ (2x cost, Speed+Quality). No wiki page, the manual transcript, StrategyWiki, or any GameFAQs thread mentions such a menu; the wiki's development page describes only the eight direction categories. Treat as not part of GDS unless someone confirms in-game. (It is still a reasonable design idea for the AI-lab game — see Section 7.)

#### 1.6 Step 5 — development: phases, who contributes what, bugs

Progress runs 0% -> 100%; speed depends on how many staff are working and their stats/energy. Observed phase boundaries (StrategyWiki Gameplay; Creating games; Careers):

| Progress | Event | Who you pick | Dominant stat |
| --- | --- | --- | --- |
| 0% | Proposal written, then "Writing"/coding phase begins | proposal author (staff/outsource) | Scenario, Program |
| 40% | "Alpha version complete" -> character/graphics design starts ("Art phase") | graphics lead (Designer ideal; anyone with high Graphics; or outsource) | Graphics |
| 80% | "Beta version complete" -> sound design starts | sound lead (Sound Engineer ideal; or outsource) | Sound |
| 100% | Game complete -> debugging | whole team | Program (bugs removed faster) |

- **Point generation.** While working, every staff member periodically emits points into the four meters: **Fun, Creativity, Graphics, Sound**. Mapping confirmed by the wiki/GameFAQs: **Program -> Fun, Scenario -> Creativity**, Graphics -> Graphics, Sound -> Sound ("Coding is for fun and scenario is for creativity", https://gamefaqs.gamespot.com/boards/610758-game-dev-story/57541209). "The more points the meters have, the better the game."
- **Bugs.** "Bugs will occasionally be created alongside Fun, Creativity, Graphics and Sound points by your staff while they are developing a game, creating a console, working on a contract, or just sitting around. Bugs can also be created in large numbers should one of your employees fail a Boost" (Creating games). No per-tick bug probability was surfaced.
- **Energy.** "Work and training consume Energy, and staff with zero Energy will go home" to recharge; each employee has their own max "Power". Dead Bull (item) refills it (Tips; Items).
- **Career fit.** Directors handle Proposal and Debugging well ("excellent stats in Fun, Creativity, and Debugging"); Producers handle Alpha and Beta ("excellent in Creativity, Graphics, and Sound"); Hackers are strong everywhere (Careers page).
- Development duration in weeks/months was **not found** as a number. Indirect evidence: the Tips page says "M7 and M12 are high-sales months, so you want to start game development near M4W2 and M9W2 to release games at the best moment", i.e. roughly a **3-month** cycle with a competent team; contracts take 6–13 weeks; the early game with 2–4 weak staff is slower.

#### 1.7 Boosts

Two mechanisms (Items page; Tips page; GameFAQs "Tip with Jobs" https://gamefaqs.gamespot.com/boards/610758-game-dev-story/57768752):

1. **Boost items** — Fun Boost, Creativity Boost, Graphics Boost, Sound Boost, bought from the salesman (Pumpkin Products) once, then usable repeatedly. Each use costs **30 Research Data** (one extract: "You use 30 research data but no cash and can boost one aspect of your game by about 10 to 30 points"). You pick which employee performs it; match it to their career (Fun->Coder, Creativity->Writer, Graphics->Designer, Sound->Sound Engineer). "Using multiple boosts over the course of a single project has diminishing returns; the second boost will have roughly half effect, while the third and beyond may do nothing at all." "The more Research Data you have stored, the more expensive using these becomes (their effect stays the same)." Drinking a Dead Bull just before a boost "seems to improve the value of the boost as well as generating additional Research Data" (Tips).
2. **Employee boost requests** — "Every once in a while, an employee will walk up to you and request a boost on one of the four factors — usually costing 50k — and the success rate will be high or low depending on the Research Data." You can spend extra Research Data to raise the success chance **up to 80%**; "the amount of data needed for certain percentages of success depends on the employee's skills (more skills need less research points)." Failure "will decrease the hype/fame for the current game" and can create many bugs.

#### 1.8 Research Data (the second currency)

- Sources: generated by staff "while both doing work and sitting idle"; **1–3 per bug fixed** during debugging (StrategyWiki says 1); a lump sum for each completed contract scaled by difficulty; the manual: "Earn more by developing and debugging games." Late-game farming trick from Tips: repeatedly complete high-requirement contracts with a fast team.
- Sinks: **levelling staff** (up to level 5 per career, "with progressively more points being used every time" — the exact per-level costs were not surfaced; an achievement guide's pacing hints are "~400 Research Data" by the time you reach the second office and "~500" more to push a Producer and then Hardware Engineer to level 5); **boosts** (30 each, scaling with stockpile); employee boost requests; using multi-use items (Bug Spray, Self-Help Book) also consumes RD.

#### 1.9 Step 6 — debugging and the ship-now decision

- "After a game is completed, it will enter the Debugging process, wherein your employees will slowly remove all the bugs from the game. The length ... depends on the number of bugs present in the game and the skill of your employees. Higher program stats means bugs are removed faster." Each removed bug pays 1–3 Research Data.
- You may release before debugging finishes. Cost of doing so: "there is a possibility that reviewers will find the bugs in the game, granting you much lower review scores"; "it could hurt your sales, as well as losing out on a chance to gain research points" (Creating games; Tips).
- **Bug Spray** (multi-use item, costs RD per use) removes bugs instantly "making releasing a game faster" (Items).

#### 1.10 Step 7 — release and reviews

- "When you ship the game, 4 10-point reviews come in. The critics can give you 10 points each, for a total of 40" (main page / Magazine Reviews). "Your game will be reviewed based on its total points and playability. It also appeals to different audiences which is one of the reasons why different judges have different reviews." "If the critics find a bug, your score will drop."
- Thresholds: **32/40 = Hall of Fame** (induction + sequel eligibility + first entry into the Global Game Awards); **36+ = realistic Grand Prize contention** ("even a review of 40 does not ensure winning").
- The point-to-score function is not published. The one hard datum is from the Steam achievements guide: a game with **>= 160 points in each of Fun / Creativity / Graphics / Sound is guaranteed the Grand Prize**, or **sum >= 640 with a minimum of 155 in each** (https://steamcommunity.com/sharedfiles/filedetails/?id=2789877528). That brackets "40/40 territory" at roughly 150–160+ per meter.
- Reviewer names / personalities: **not found** (the Magazine Reviews page exists but its text was not surfaced).

#### 1.11 Step 8 — sales

- "After receiving critic scores, which are good indicators of how well your game will sell with higher scores meaning more sales, your game goes on sale and you earn money for each unit sold" (StrategyWiki). Wikipedia: "sales ranked by week according to how they sold that week" — a weekly top chart; the wiki: "You will be given an announcement if your game will make the sales charts, and how close to the #1 spot it will be depending on initial sales."
- Inputs the sources name: review score; **fans** (company-wide count that grows with sales/ads/Gamedex and shrinks with repetition or long silences); **hype** (built by advertising *while the game is in development*; "using advertising outside of game time development doesn't quite have the sales punch", but "post-game launch advertising will increase sales"); **console market share** ("often the more expensive and newer the console, the more money you will make with your game"); **season** ("M7 and M12 are 'high sales' months"; GameFAQs: "time your game release with Gamedex or M12 ... for the Xmas season"); combo quality and genre/type popularity.
- Sales duration per title, per-unit price, and the decay curve were **not found**. Unit milestones exist as achievements: 100K, 500K, **1M**, 5M, 10M, 20M, 50M, 100M units for a single game (Achievements page). Forum anecdotes: a single game at 37.6M units with ~2M fans; 110.6M units with ~6.9M fans (Giant Bomb forum via search).
- **Not GDS:** the formula "sales += fans * (R/10)" that surfaced in search is from the *Game Dev Tycoon* wiki and must not be used as a GDS fact.

#### 1.12 Step 9 — year-end awards

- **Global Game Awards**, every year at **M12 W3**. Categories named in the Achievements page: **Grand Prize** ("Grand Prize Winner!"), **Runner-up** ("Close but No Cigar"), **Best Design**, **Best Music**, **Worst Game** ("Worst of the Worst").
- Eligibility: "Your company first enters the Global Game Awards when a game has got into the Hall of Fame, or a total review score of 32 or more." Practically "a transition to a second office usually occurs at the beginning of the fourth year, after which it becomes possible to compete for the awards. At the beginning it is impossible to get the game of the year because the studio is still too small, so the goal will be to get minor awards for graphics and sound."
- Effects: trophies count toward the office-3 upgrade condition; Grand Prizes unlock special hires (1st -> King Ackbar, 3rd -> Chimpan Z Force [a default Hardware Engineer], 5th -> Kairobot); "Genre / type popularity increases from winning awards" (Endgame page). Prize money: **not found** (probably none).

#### 1.13 Step 10 — reinvest

Spend options, with when they unlock:

| Spend | Cost | Notes / source |
| --- | --- | --- |
| Hire (Word of Mouth) | $50.0K | office 1; "Ask staff to recommend someone" (Employees) |
| Hire (Magazine Ad) | $120.0K | office 1 |
| Hire (Online Ad) | $550.0K | office 1; "Search from newbies to veterans" |
| Hire (Vocational School) | $800.0K | office 2; "young kids with promise" |
| Hire (Open House) | $1,800.0K | office 2; "Expensive, but effective" |
| Hire (Hollywood Agent) | $3,500.0K | office 3; "worldwide search"; only way to get Kairobot |
| Train | $30.0K – $2,500.0K per session | 15 methods, table in Section 2 |
| Level up | Research Data | +stats, salary x1.2 per level |
| Console licence | $200.0K – $80,000.0K | Section 3 |
| Office move 1 (4 -> 6 seats) | $600.0K | event fires after you have developed a game and/or hold $1,000.0K (extract wording ambiguous about a "year 4" clause) |
| Office move 2 (6 -> 8 seats) | $2,500.0K (one forum extract says 3,500K) | needs $3,500.0K and/or >= 1 Global Game Awards trophy; Y4M12–Y6M12 both required, Y7–Y9 either, Y10+ neither |
| Items from Pumpkin Products | escalating | salesman visits **M5 W2** yearly from year 2; prices ratchet up with each purchase ("Dead Bull ... starts off at 50k a bottle ... end price 550k") |
| Advertising | $30.0K – $9,900.0K | Section 5 |
| Gamedex booth (July) | $150.0K – $7,000.0K | Section 5 |
| Salaries | sum of staff salaries | auto-deducted **end of March** every year; "Leveling up increases staff salaries" (manual) |

"After every office upgrade, you unlock new methods of training, advertising, and hiring methods, as well as 2 more seats" (main page).

#### 1.14 Fixed calendar

| When | Event |
| --- | --- |
| Y1 M4 | game starts; Microx SX launches Y1 M4 W1 |
| end of March, yearly | all salaries paid at once ("avoid hiring in March" — PC-version guide, same idea) |
| M5 W2, yearly from year 2 | Pumpkin Products salesman (items) |
| M7 W1, yearly | Gamedex trade show (booth purchase) |
| M7, M12 | high-sales months |
| M12 W3, yearly | Global Game Awards |
| console launch dates | Section 3 |
| Y21 M1 | scored game ends; play may continue |

#### 1.15 Gaps in this section

Not found: exact per-tick point/bug generation rates; development length in weeks; starting direction-point pool; the review-score function; per-unit price and sales-decay curve; reviewer identities; prize money. The *Creating games* page almost certainly has prose on several of these; it could not be fetched directly.

#### 1.16 Worked example of one early cycle with the known numbers

Assembled only from figures quoted above; anything marked ~ is my interpolation.

```
Y2 M9 W2   Cash $1,400.0K, Research Data 85, fans ~3,000, 4 staff (Coder L2, Writer L3, Designer L1, Sound Eng L1)
           Develop > New Game
           Console: Exodus (licence $400.0K already paid in Y1; ~5-year life, discontinues ~Y6)
           Genre: Action (unlocked by Writer L3)  Type: Ninja (starting type)  -> "Amazing!"
           Proposal: Writer (Scenario highest). Starting meters: Fun ~12, Creativity ~18
           Direction: pool of N points spread, extra on Innovation + Approachability
           Per-game dev cost: ~$50K–$100K (Exodus figure not published; Microx SX is $50.0K)
Y2 M9–M10  Writing/coding phase. Each tick staff add points (Coder -> Fun, Writer -> Creativity).
           Bugs tick up to ~15. Magazine Ads ($30.0K) x2 during development -> hype up, fans +.
           An employee asks for a Fun boost: $50K + 20 RD for 65% -> success, Fun +25.
Y2 M10 W4  40% "alpha": choose Designer for graphics (Graphics meter starts filling).
Y2 M11 W3  80% "beta": choose Sound Engineer. Use Sound Boost item: 30 RD, Sound +20 (first use, full effect).
Y2 M12 W1  100%. Bugs: 22. Decision: debug (~2 weeks at this Program level) and release Y2 M12 W3,
           still inside the December high-sales month; each bug fixed pays 1–3 RD (~+40 RD).
Y2 M12 W3  Release. Critics: 7 / 8 / 7 / 8 = 30/40 -> no Hall of Fame (needs 32), no sequel.
           Charts at #4 in week 1. Sales run several weeks; ~250K units would unlock Mister X.
Y3 M1–M3   Income arrives weekly. End of March: salaries deducted in one lump (sum of 4 salaries,
           each x1.2 per level gained). Cash ~ $2,000.0K -> the office-2 offer ($600.0K) is on the table.
Y3 M2 W1   IES launches ($800.0K, ~4-year life) — skip it; Game Kid arrives Y3 M11 W1 ($550.0K, ~13 years).
```

The point of the example: in GDS every one of the ten steps has a visible number attached, the cycle fits in about one in-game quarter, and the two "big" numbers the player watches are the 40-point review and the March payroll. An AIL prototype should be able to print an equivalent ledger.

---

### 2. Staff

Sources: Careers page (https://kairosoft.fandom.com/wiki/Careers_(Game_Dev_Story)), Employees page (https://kairosoft.fandom.com/wiki/Employees_(Game_Dev_Story)), Training page (https://kairosoft.fandom.com/wiki/Training_(Game_Dev_Story)), Tips page, StrategyWiki Staff (https://strategywiki.org/wiki/Game_Dev_Story/Staff), PocketGamer hardware-engineer article (https://www.pocketgamer.com/game-dev-story/hardware-engineer/), TV Tropes (https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/GameDevStory), GameFAQs threads on hackers (https://gamefaqs.gamespot.com/boards/610758-game-dev-story/56938485) and hidden characters (https://gamefaqs.gamespot.com/iphone/610758-game-dev-story/answers/235291-how-do-i-unlock-the-hidden-characters).

#### 2.1 Stats

- Four skill stats: **Program, Scenario, Graphics, Sound**. Program drives Fun points and debugging speed; Scenario drives Creativity; Graphics and Sound drive their own meters.
- A fifth hidden-ish stat, **Power** (stamina/energy): "represents how long the employee will work/train before going home for a rest. Power is required to be able to train an employee and is used during both training and development work. Every employee has a separate max power level specific to them."
- Scale: example mid/high-tier numbers are in the 100–300 range (Ima Gamer 108/234/46/39; William Tomato 120/282/75/24). The ceiling was not surfaced.
- "There are 44 hire-able and 18 outsourced employees in Game Dev Story."

#### 2.2 The eight careers

"There are a total of 8 different careers, with different pros and cons. Each career can be leveled up, up to level 5." Advanced careers require level 5 in the prerequisite career(s), and the switch is made with a **Career Change Manual** bought from the annual salesman.

| Career | Tier | Prerequisite | Strength (wiki wording) | Notes |
| --- | --- | --- | --- | --- |
| Coder | basic | — | "Focuses on Coding Stat" -> Fun; fastest debugging | needed for Director |
| Writer | basic | — | Scenario -> Creativity; writes proposals | needed for Director |
| Designer | basic | — | Graphics; takes the 40% alpha task | needed for Producer |
| Sound Engineer | basic | — | Sound; takes the 80% beta task | needed for Producer |
| Director | advanced | Lv5 Coder **and** Lv5 Writer | "handles Proposal & Debugging with excellent stats in Fun, Creativity, and Debugging" | Director Lv1 unlocks Sim RPG genre, Lv2 Audio Novel, Lv5 Music |
| Producer | advanced | Lv5 Designer **and** Lv5 Sound Engineer | "handles Alpha & Beta with excellent stats in Creativity, Graphics, and Sound"; "share skills of Writers and Coders, but also have higher stats in Graphics and Sound" | Lv1 unlocks Board, Lv3 Action RPG, Lv5 Online RPG |
| Hardware Engineer | advanced | Lv5 Director **and** Lv5 Producer (so Lv5 in all six prior careers) | the only career that can build consoles | Lv3 unlocks Card Game, Lv4 Motion; 4 of them needed for the Potato Chip CPU, 6 for Punch Cards |
| Hacker | hidden/top | Lv5 Hardware Engineer | "very high stats for everything ... high in capabilities even at level 1" | "cannot be used to create a console"; Lv2 + Short Trip unlocks the Mushroom type; Lv5 unlocks Online Sim |

- Reaching Hacker the honest way means "leveled the employee 30 times and change job 7 times" (TV Tropes) — i.e. a career change resets the employee to level 1 in the new career and each career needs four level-ups, so 7 x 4 = 28 plus the starting career. TV Tropes' verdict: "by the time you manage to level an employee to hacker class, the game would've been nearing the end."
- Cheaper route to a Hacker: hire one directly when the search roll offers one — "if you manage to hire a Hacker directly, you'll end up paying him much less than you would an employee who was promoted into a Hacker" (salary compounds with every level gained, see 2.6).
- Only one NPC spawns as a Hardware Engineer by default: **Chimpan Z (Force)**, unlocked after the **3rd Grand Prize**.

#### 2.3 Levels and levelling

- Levels 1–5 within the current career. Levelling costs **Research Data**, "with progressively more points being used every time"; it "raises both employee stats and salary." Exact RD cost per level: **not found**.
- Why level: stats go up (more points per tick, faster debugging), and **genre unlocks are keyed to career level** (e.g. Writer Lv5 -> RPG, Coder Lv4 -> Simulation). Hiring someone who already has the level also unlocks the genre.
- Training vs levelling (GameFAQs thread https://gamefaqs.gamespot.com/boards/610758-game-dev-story/57904133): training costs cash and Power but no salary increase; levelling costs RD and raises salary x1.2. Players use both.

#### 2.4 Training (cash -> stats; also the unlock mechanism for types)

Full table as quoted from the Training page. "Power" is the energy drained by one session. "The listed increases are the initial stat increases, which will lower the more training that is done" (diminishing returns per employee).

| Method | Cost | Power | Program | Scenario | Graphics | Sound | Office |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Stroll | $30.0K | -2 |  | +3 | +3 |  | 1 |
| Reading | $30.0K | -2 | +4 | +3 |  |  | 1 |
| Movie | $50.0K | -2 |  |  | +4 | +4 | 1 |
| Anime | $70.0K | -3 | +5 | +4 | +3 | +2 | ? |
| Pinball | $80.0K | -5 | +0/+6 | +0/+6 | +0/+6 | +0/+6 | ? (random) |
| Meditate | $90.0K | -5 | +1 | +2 | +1 | +3 | ? |
| Game | $100.0K | -3 | +6 |  | +5 |  | ? |
| Jogging | $120.0K | -4 | +4 |  |  | +5 | ? |
| Concert | $160.0K | -3 | +3 |  |  | +5 | ? |
| Net Surf | $280.0K | -4 | +7 | +5 | -5 |  | ? |
| Museum | $300.0K | -4 | +5 | +6 | +6 | -3 | ? |
| College | $550.0K | -6 | -2 | +5 |  |  | ? |
| Lab Study | $800.0K | -7 | +6 | -3 | +3 | +4 | ? |
| Short Trip | $1,050.0K | -9 | +8 | +7 | +4 | +5 | ? |
| Long Trip | $2,500.0K | -11 | +5 | +8 | +6 | +6 | ? |

(The "Office" column: the main page says new training methods unlock with each office move, but the extract did not say which; only the three cheapest are confirmed as starting methods by StrategyWiki.)

Types unlock when an employee **at or above a given career level takes a given course** (Section 4.2), so training is both a stat sink and a content-unlock mechanism.

#### 2.5 Hiring

- "When you hire an employee you must pay an initial contract fee" (manual). Each search method rolls a candidate list; better methods skew toward better candidates and the special characters.

| Method | Cost | Available from | Wiki blurb |
| --- | --- | --- | --- |
| Word of Mouth | $50.0K | start | "Ask staff to recommend someone" |
| Magazine Ad | $120.0K | start | "Place an ad in a game magazine" |
| Online Ad | $550.0K | start | "Search from newbies to veterans" |
| Vocational School | $800.0K | office 2 | "Look for young kids with promise" |
| Open House | $1,800.0K | office 2 | "Expensive, but effective" |
| Hollywood Agent | $3,500.0K | office 3 | "Conduct a worldwide search" |

- Community practice: spend $120K on a Magazine Ad at the start and save/reload until strong staff appear (GameFAQs high-score thread). StrategyWiki: "hire two extra staff members using Word of Mouth" early so the first four seats are filled.
- **Special characters** (secrets) and unlock conditions:
  - **Mister X** — "A figure shrouded in mystery", masked wrestler; unlocked after one game sells **> 250,000** copies; hireable via Word of Mouth and better (https://kairosoft.fandom.com/wiki/Mister_X).
  - **King Ackbar** — "A Middle Eastern oil baron"; after the **1st Grand Prize**.
  - **Chimpan Z Force** — "eats bananas peels and all"; after the **3rd Grand Prize**; default Hardware Engineer.
  - **Kairobot** — Kairosoft mascot; after the **5th Grand Prize**; only via Hollywood Agent.
  - **Grizzly Bear** — listed as special; condition not surfaced.
  - Second-tier strong hires named by the hidden-characters guide: Cokie Bottleson, Sophie Kairo, Stephen Jobson, Walt Sidney, Dexter McPhee, Francoise Bloom. Their stats/fees were not surfaced (the fan page https://addictedgamewise.com/game-dev-story-5-character-data/ reportedly has a full table).

#### 2.6 Salaries

- Paid **once a year at the end of March**, "when the combined salaries of all staff members are deducted from the company's funds" (Employees page; manual: "You must also pay them a yearly salary at the end of March. Leveling up increases staff salaries").
- "Salaries grow at a compounding rate: each level up multiplies the salary by **1.2**." Across 28–30 level-ups to reach Hacker that is a 1.2^28 ~ 165x multiplier on base salary, which is why "at level 5, staff members start to require a hefty salary, so you will probably waste a few million dollars before even thinking about creating the first console" (PocketGamer) and why a directly-hired Hacker is cheap by comparison.
- Base salary figures per character: not surfaced.

#### 2.7 Firing

- The wiki extracts did not describe firing. (The game does have a dismiss option in the staff menu; no refund of the contract fee is mentioned anywhere. Treat details as not found.)

#### 2.8 Energy / tiredness

- Work and training drain Power; at zero the employee "will go home to sleep and then come back fully recharged." While at home they produce nothing.
- **Dead Bull** (one-shot item, $50K rising toward $550K per bottle as the salesman ratchets prices) refills Power instantly and "helps gain research data." Recommended pattern: drain everyone with training, Dead Bull, train again; or Dead Bull right before a boost.
- **Self-Help Book** (multi-use, costs RD) "motivates your staff. Increases game points added on your staff's next couple attempts."

#### 2.9 Capacity: desks gate throughput

- Office 1: **4** seats. Office 2: **6** seats ($600.0K move). Office 3: **8** seats ($2,500.0K move; see 1.13 for trigger conditions). Each move also unlocks new hiring/training/advertising tiers.
- With four seats you cannot cover all four stats with specialists *and* have slack; every added seat is both more points per tick and the ability to run contracts/training without stalling the main project. PocketGamer: "The more staff you have, the faster you finish the development of different games and start getting money from them."
- Only the main project and (optionally) a contract can run at once; staff not assigned "just sit around" generating a trickle of Research Data and occasional bugs.

#### 2.10 Outsourcing (temporary staff for one phase)

- At the proposal, 40% and 80% checkpoints you may pay an outsourcer instead of using an employee. Reasons the wiki gives: no suitable employee yet; avoid the repeat-use penalty on your only specialist; or buy a bigger contribution than your staff can produce. Fees scale from **$10K** (Josh Slackerville) to **$2,400K** (William Tomato) for writers; graphics/sound outsourcer lists not surfaced.

#### 2.11 Gaps

Not found: RD cost per level; base salaries; the complete 44-employee roster and stats; which training/advert methods unlock at which office; firing rules; Power max values.

---

### 3. Platforms and the market

Sources: Consoles page (https://kairosoft.fandom.com/wiki/Consoles_(Game_Dev_Story); mirror https://kairosoft.wiki.gg/wiki/Consoles_(Game_Dev_Story)), console-date posts (http://kairoguide.blogspot.com/2013/06/game-dev-story-console-dates.html, http://kairotips.blogspot.com/2013/02/game-dev-story-consoles.html), Companies page (https://kairosoft.wiki.gg/wiki/Companies_(Game_Dev_Story)), GameFAQs threads on market share (https://gamefaqs.gamespot.com/boards/610758-game-dev-story/58471366, /57848391) and own consoles (/57465764), Giant Bomb forum "don't make a console" (https://www.giantbomb.com/game-dev-story/3030-32908/forums/dont-make-a-console-460483/), https://www.whatsitlike.com.au/how-to-develop-your-own-console-in-game-dev-story/, https://zerroone.com/game-dev-story-console-guide/.

#### 3.1 The console makers (parodies)

Intendro (Nintendo), Senga (Sega), Sonny (Sony), Microx (Microsoft), Nipon (NEC/SNK-flavoured; makes the PC-Engine and Neo-Geo parodies). PC is platform-holder-less and free.

#### 3.2 Console timeline

Licence fees and launch dates as quoted from the Consoles page; lifespans from the same page's extract (approximate, as the wiki words them); per-game development cost only where surfaced.

| # | Console | Maker | Parody of | Launch | Licence | Per-game dev cost | Approx. lifespan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | PC | — | PC | available from start | none | $10.0K | never removed |
| 1 | Microx SX | Nipon | MSX | Y1 M4 W1 | $200.0K | $50.0K | ~6 years |
| 2 | Exodus | Senga | Genesis/Mega Drive | Y1 M11 W1 | $400.0K | ? | ~5 years |
| 3 | IES | Intendro | NES | Y3 M2 W1 | $800.0K | ? | ~4 years |
| 4 | Game Kid | Intendro | Game Boy | Y3 M11 W1 | $550.0K | ? | ~13 years |
| 5 | Play Gear | Senga | Game Gear | Y5 M6 W1 | $1,050.0K | ? | ? |
| 6 | PCC-FQX | Nipon | PC Engine / TurboGrafx | Y6 M2 W1 | $680.0K | ? | ? |
| 7 | NEONGEON | Nipon | Neo Geo | Y7 M2 W1 | $2,200.0K | ? | ~2 years |
| 8 | Game Swan | Microx | WonderSwan | Y7 M6 W1 | $4,500.0K | ? | ? |
| 9 | Super IES | Intendro | SNES | Y7 M8 W1 | $5,000.0K | ? | ? |
| 10 | Virtual Kid | Intendro | Virtual Boy | Y8 M8 W1 | $1,800.0K | ? | ? |
| 11 | PlayStatus | Sonny | PlayStation | Y10 M6 W1 | $10,000.0K | $650.0K | ? |
| 12 | Game-Box | Intendro | GameCube/N64-era | Y11 M2 W1 | $25,000.0K | ? | ? |
| 13 | PlayStatus 2 | Sonny | PlayStation 2 | ? (between Y11 and Y17) | $40,000.0K | ? | ? |
| 14 | Mini Status | Sonny | PSP | ? | ? | ? | never removed (and nothing after it is) |
| 15 | Microx 480 | Microx | Xbox 360 | Y17 M9 W1 | $50,000.0K | ? | ? |
| 16 | Whoops | Intendro | Wii | Y18 M5 W1 | $80,000.0K | ? | ? |

Rows 13–14 are known to exist from other extracts (first console search listed "PlayStatus 2 ($40,000K license)"; the lifecycle extract named the "Mini Status") but did not come with dates. The wiki's table probably also lists one or two more late machines (e.g. a DS/3DS parody); not confirmed. Game Dev Story itself is a 1997-era design, so the roster stops around the Wii generation.

#### 3.3 How platforms rise and fall

- Each console has a visible **market share %**; the shares of all live consoles sum to the market. Shares "fluctuate based on console popularity" and on "the quality of games that are being released" for them — including yours. Forum advice to move a share: "flood the market with awesome games for your console."
- Consoles are **discontinued** on a schedule; the player gets a **3-month warning**, and "once a console is removed from the market ... you may no longer create games for it." Games already on sale presumably keep selling out their run (not stated).
- Later consoles have higher licence fees (two orders of magnitude from $200K to $80M) and higher per-game dev cost, but "often the more expensive and newer the console, the more money you will make with your game." The licence is a bet on the console's share over its remaining life — the GameFAQs guide's advice to skip everything until the long-lived Game Kid is exactly that calculation (13-year life for $550K vs. the IES at $800K for ~4 years).

#### 3.4 How platform choice affects a game's sales

Named inputs: the console's market share at the time of sale; the console's "newness/expense" tier; and whether you own the console (bigger revenue share). No multiplier table was surfaced. The forum anecdote "Developing for a machine with 32% market share is really a huge step up from the 17% or low 20s you tend to see" suggests sales scale roughly linearly with share.

#### 3.5 Developing your own console

Requirements and costs (Consoles page):

- At least **one Hardware Engineer** on staff (Lv5 in all six prior careers, or Chimpan Z).
- Choose **form factor**: Console **$6,000.0K** or Portable **$4,000.0K**.
- Choose **CPU**: 16-bit Chip **$1,000.0K**, 32-bit Chip **$10,000.0K**, 64-bit Chip **$50,000.0K**, **Potato Chip $90,000.0K** (requires **4** Hardware Engineers).
- Choose **media**: Cartridge **$3,000.0K**, CD-ROM **$5,000.0K**, DVD-ROM **$15,000.0K**, BD-ROM **$35,000.0K**, **Punch Cards $93,999.9K** (requires **6** Hardware Engineers).
- Total therefore ranges **$8,000K – $91,000K** for sane builds and ~**$190M** for the Potato Chip + Punch Cards joke machine, "not including employee salaries." TV Tropes calls the joke build "a Lethal Joke Item of a money maker since it's so novel it sells well."
- Development is a long project worked by the team like a game (points and bugs accrue; "creating a console" is listed among bug-producing activities). "Making a console takes quite a bit of time, and you will almost always have your fan base shrink at least once for not releasing a game." Duration in weeks: not found.
- At launch, "your number of fans at release is the factor that decides market share." Thereafter "every game you release on your console contributes to hardware sales."
- Economics: "Don't expect to make millions from console sales alone. The real money still comes from your games. That said, because you own the platform, you'll receive a much larger share of the revenue." The payoff is developing for a machine with higher share than any competitor (the 32% anecdote). A GameFAQs poster reports selling 18 million units of a self-made console.
- Releasing a new own console **removes your previous one** from the market.
- Community caution (Giant Bomb "don't make a console" thread, PocketGamer): it is a late-game vanity/efficiency play; many strong runs skip it, others call it "necessary to progress" — it is optional.

#### 3.6 Gaps

Not found: per-game dev cost for most consoles; the wiki's market-share-by-year numbers; PlayStatus 2 / Mini Status dates; console development duration; the formula tying share to sales; whether rival publishers' games are simulated individually (the weekly chart implies yes).

---

### 4. Genres/types, combos and sequels

Sources: Genres and types page (https://kairosoft.fandom.com/wiki/Genres_and_types_(Game_Dev_Story); mirror https://kairosoft.wiki.gg/wiki/Genres_and_types_(Game_Dev_Story)), StrategyWiki Combinations (https://strategywiki.org/wiki/Game_Dev_Story/Combinations), GameFAQs "Full List of Genres, Types, Characters" (https://gamefaqs.gamespot.com/boards/610758-game-dev-story/56934635) and "Unlocking Game Types FAQ" (https://gamefaqs.gamespot.com/boards/610758-game-dev-story/56851983), kairoguide types post (http://kairoguide.blogspot.com/2013/06/game-dev-story-types-genre.html), PocketGamer best combos (https://www.pocketgamer.com/game-dev-story/best-combos/), Creating games page (sequels), GameFAQs sequels thread (https://gamefaqs.gamespot.com/boards/610758-game-dev-story/56904548).

#### 4.1 Genres (20) — popularity and unlock

Quoted from the wiki table. "Genres are unlocked by leveling up employees to a specific level or higher in a specific career, or you can hire someone who already has obtained that level."

| Genre | Popularity | Unlock career | Level |
| --- | --- | --- | --- |
| Adventure | C | initially available | — |
| Table | B | initially available | — |
| Trivia | C | initially available | — |
| Puzzle | B | initially available | — |
| Educational | C | initially available | — |
| Action | B | Writer | 3 |
| Shooter | C | Writer | 3 |
| Racing | B | Sound Engineer | 3 |
| Life | B | Designer | 3 |
| Simulation | A | Coder | 4 |
| RPG | A | Writer | 5 |
| Sim RPG | A | Director | 1 |
| Audio Novel | B | Director | 2 |
| Music | A | Director | 5 |
| Board | B | Producer | 1 |
| Action RPG | A | Producer | 3 |
| Online RPG | A | Producer | 5 |
| Card Game | A | Hardware Engineer | 3 |
| Motion | A | Hardware Engineer | 4 |
| Online Sim | A | Hacker | 5 |

Reading: the five starting genres are all B/C popularity; every A-grade genre is gated behind a level-5 basic career or an advanced career, so unlocking "what sells" is the staff-progression carrot.

#### 4.2 Types — popularity and unlock (partial)

"Unlocking types requires employees at or above a certain level to use specific training methods." Rows surfaced from the wiki table:

| Type | Popularity | Unlock career | Min level | Training course |
| --- | --- | --- | --- | --- |
| Pirate | B | initially available | — | — |
| Animal | B | initially available | — | — |
| Robot | C | initially available | — | — |
| Ninja | B | initially available | — | — |
| Sports | ? | Coder | 1 | Jogging |
| Exploration | ? | Coder | 2 | Movie |
| Virtual Pet | ? | Coder | 2 | Pinball |
| Dungeon | ? | Coder | 2 | Game |
| Game Co. | ? | Coder | 5 | Game |
| Fantasy | ? | Writer | 2 | Reading |
| Romance | ? | Writer | 2 | Reading |
| Horror | ? | Writer | 3 | Net Surf |
| Samurai | ? | Writer | 4 | Movie |
| Ogre | ? | Writer | 5 | Meditate |
| Cutie | A | Designer | 3 | Concert |
| Martial Arts | ? | Director | 1 | Movie |
| Word | ? | Director | 3 | Lab Study |
| Comedy | ? | Producer | 1 | Movie |
| Mushroom | ? | Hacker | 2 | Short Trip |

Other type names confirmed to exist (seen in combo lists), unlock rows not surfaced: Fashion, Stocks, Cartoon, Cosplay, Pop Star, Swimsuit, Mini-skirt, Poncho, Chess, Checkers, Reversi, Basketball, Historical, Sumo, Hunting, Cowboy, Detective, Dating, Movies, Comics, High School, F1 Racing, Ping Pong, Soccer, Town, Dance, Fitness, Pinball, Skiing, Slots, Volleyball, Drums, Medieval, Architecture, Conv. Store, Swimming, Monster, President, Snowboard, Gambling, Train, Business, War. The full wiki table has roughly 45–50 types.

#### 4.3 Combos: how genre x type gates quality

- Five tiers shown at selection time: **Amazing! / Creative / Not Bad / Hmm... / Not Good** (one secondary source labels the middle tiers "Great/Good/So-so"; the wiki wording is the former). The rating is displayed *before* you commit, so there is no hidden information — the skill is unlocking good pairs and not repeating them.
- Effect: "which ones you choose can greatly affect sales"; "plays a key role in making a top-selling game." Exact multipliers on points, reviews or sales: not surfaced. GameFAQs high-score advice is simply "Only make 'Amazing Combination' games."
- **Amazing combos** quoted from the wiki/StrategyWiki lists (genre: types):
  - Action: Basketball, Historical, Horror, Ninja, Ogre, Sumo
  - Action RPG: Hunting, Poncho
  - Adventure: Cartoon, Cowboy, Detective
  - Audio Novel: Cowboy, Cutie, Dating, Detective, Horror, Movies, Romance
  - Board: Chess
  - Card Game: Comics
  - Educational: High School
  - Life: Animal, Comics, Dating, F1 Racing, Game Co., Mushroom, Ping Pong, Pop Star, Soccer, Town, Word
  - Motion: Dance, Fitness, Pinball, Skiing, Slots, Volleyball
  - Music: Dance, Drums
  - Online RPG: Medieval
  - Online Sim: Architecture, Conv. Store, Cutie, Game Co., Mushroom, Pop Star, Stocks, Swimming, Virtual Pet
  - Puzzle: Checkers, Reversi
  - RPG: Fantasy, Mushroom, Ogre
  - Shooter: Horror (StrategyWiki); Robot is commonly cited as a strong Shooter pairing
  - Table: Fashion
  - Simulation, Sim RPG, Racing, Trivia: Amazing rows not surfaced (StrategyWiki's garbled extract mentions "Train + Business" and "Word + Gambling", which may be Simulation/Trivia rows)
- Examples of lower tiers: Creative — Adventure + Mini-skirt, Adventure + Ninja, Motion + Architecture; Hmm... — Table + Horror, Table + Monster, Table + President, Table + Snowboard.
- Notice the design: the four starting types (Pirate/Animal/Robot/Ninja) pair "Amazing" with only a few genres (Action+Ninja, Life+Animal, Shooter+Robot), so the opening is deliberately a search for the one or two good pairs you can already make.

#### 4.4 Genre/type levels

- Shipping a game in a genre or type adds experience to it; levels rise with repeated use. Rewards: **+2 direction points at genre level 2 and at level 5** (and per one extract at type level 5). Levels persist into New Game+ ("they still need to be unlocked" again, but the level carries).
- Trade-off against fans: levelling a genre means repeating it, and "games with the same category released too much will shrink the fanbase."

#### 4.5 Popularity and trends

- Each genre and type has a static A/B/C grade (tables above) and "the popularity of game genres varies in time." Winning awards raises "Genre / type popularity" (Endgame page). News flashes about trends exist in-game; the mechanics of trend shifts were not surfaced.

#### 4.6 Sequels

- Eligibility: the original must be in the **Hall of Fame (32+/40)**. "In order to even make a sequel (as opposed to a game of the same genre that you simply call '<title> 2'), the original has to be so good as to be inducted into the Hall of Fame."
- Locked: "the genre and type cannot be changed."
- Bonus: "sequels start out with extra levels in Fun, Originality, Graphics, and Sound" / "the sequel will start with some of the points from the original game, but otherwise the development process for the sequel is the same." Exact carry-over fraction: not found. "Sequels have some hype and experience points built-in, so they tend to be superior to the original game, which translates into better sales"; "a good way to win Game of the Year."
- Franchise death: "if a sequel does not make the Hall of Fame on its own, no more sequels can be made in that franchise."
- Fan fatigue: three sequels in a row in one combo made fans drop (Game Developer article); the same anti-repetition rule as genres.

#### 4.7 Gaps

Not found: the remaining ~30 type-unlock rows; Amazing rows for Simulation/Sim RPG/Racing/Trivia; the numeric effect of each combo tier; the sequel carry-over percentage; how trends are generated.

---

### 5. Reviews, sales, fans

Sources: Magazine Reviews page (https://kairosoft.fandom.com/wiki/Magazine_Reviews_(Game_Dev_Story)), main page sales/advertising sections, Tips page, Achievements page, Steam achievements guide (https://steamcommunity.com/sharedfiles/filedetails/?id=2789877528), GameFAQs threads on Hall of Fame (https://gamefaqs.gamespot.com/boards/610758-game-dev-story/59710865), 40/40 (/56955448), advertising (/57732082), hype (/56905915), Giant Bomb "anyone got 40 on a review" (https://www.giantbomb.com/game-dev-story/3030-32908/forums/anyone-got-40-on-a-review-461750/), Game Developer "7 Valuable Lessons" (https://www.gamedeveloper.com/production/-quot-game-dev-story-quot-7-valuable-lessons-for-game-developers), Sidequesting tips (https://www.sidequesting.com/2010/11/just-the-tips-gamedev-story/).

#### 5.1 Review scoring

- Four critics, each 0–10, total out of **40** (a Famitsu parody).
- Inputs named: the game's "total points and playability" (the four meters), its appeal to each judge's audience ("different judges have different reviews"), direction choices (Innovation/Approachability are the ones players credit for raising scores), and **bugs remaining at ship** ("If the critics find a bug, your score will drop").
- Calibration datum: >= 160 in every meter (or >= 640 total with >= 155 each) guarantees the Grand Prize, which implies it also clears the 36–40 review band; the 32 Hall-of-Fame line sits somewhat below that. No finer mapping was surfaced; players report that perfect 40s involve "a fairly high element of luck."

#### 5.2 Hall of Fame

- Threshold **32/40**. Effects: sequel rights; company enters the Global Game Awards pool; the title is listed in the Hall of Fame screen. No direct cash bonus is mentioned.

#### 5.3 Sales

What the sources say, in order of certainty:

1. Sales begin at release and are reported **weekly** on a ranked chart against competitors' titles; the game announces whether you charted and how near #1.
2. Review score is "a good indicator"; higher score -> more sales.
3. **Fans** scale sales (bigger fan base, bigger launch); fans are gained from sales, advertising, Gamedex and awards, lost from repetition and long silences.
4. **Hype**, built by advertising during development, raises launch sales; ads after launch add sales ("Make sure to advertise. Even weak games will sell with enough advertisement").
5. **Season**: M7 and M12 are high-sales months; releasing just before Gamedex (July) or Christmas is standard advice.
6. **Platform**: console market share and tier.
7. **Combo tier** and genre/type popularity.
8. Sequels sell better than originals.
- Not surfaced: unit price, how many weeks a title sells, the shape of the decay, whether back-catalogue titles keep trickling. Achievement milestones for a single title: 100K / 500K / 1M / 5M / 10M / 20M / 50M / 100M units, which gives the intended scale: a first hit is ~100K–1M, a late-game juggernaut is tens of millions.

#### 5.4 Fans

- A single company-wide number shown in the HUD. Grows with: units sold (the Mister X unlock at 250,000 copies of one game marks the first "real hit"), advertising ("Advertising increases your number of fans and the hype for any game currently in development, with more expensive ads increasing fans and hype by larger amounts"), Gamedex ("gain popularity through different fan bases"), awards.
- Shrinks with: too many games in the same genre/type or too many sequels; long gaps without a release (console development "will almost always have your fan base shrink at least once").
- Fans at the moment you launch your own console set its initial market share.
- Scale anecdotes: ~2M fans alongside a 37.6M-unit game; ~6.9M fans alongside a 110.6M-unit game.

#### 5.5 Advertising

Costs quoted from the main page. Higher tiers unlock with office moves (which tier at which office: not surfaced).

| Method | Cost |
| --- | --- |
| Magazine Ads | $30.0K |
| Online Ads | $50.0K |
| Radio Ads | $80.0K |
| Demo Distribution | $150.0K |
| Marching Band | $250.0K |
| TV Ads | $350.0K |
| Animal Costumes | $500.0K |
| TV Sponsorship | $650.0K |
| Racecar Sponsorship | $1,200.0K |
| Card Game Contest | $3,300.0K |
| Blimp Sponsorship | $5,500.0K |
| Lunar Writing | $9,900.0K |

Rules: "If you use the same type of advertisement too often, however, it ceases to have any impact on the number of fans" (per-channel saturation); during development it raises hype + fans; after launch it raises sales of the live title. The PC-original guide notes promotion was limited to once per week; the 2010 version lets you buy repeatedly, subject to saturation.

#### 5.6 Gamedex (trade show, M7 W1)

Booth tiers: **$150.0K** basic (no guest); **$600.0K** costumes ("2 costumed bears to increase popularity with children"); **$2,500.0K** booth babes; **$7,000.0K** guest star ("1 bear, 2 booth babes, and the star Kairobot for worldwide attention"). Purpose: company popularity across fan segments and hype for a game in development or on sale.

#### 5.7 How older games keep selling

Not documented in the surfaced extracts. The weekly chart and the "sales report" framing imply a finite sales window per title after which it stops contributing; the Endgame screen reports "Number of released games, Total sold units, the top-selling game as well as the total sales of that game." Treat long-tail revenue as absent or negligible in GDS.

#### 5.8 Gaps

Not found: critic names and biases; the review function; sales duration/decay; unit price; per-ad fan/hype deltas; which office unlocks which ad.

---

### 6. Pacing

Sources: Endgame page (https://kairosoft.fandom.com/wiki/Endgame_(Game_Dev_Story)), GameFAQs "Is 20 years the farthest you can progress" (https://gamefaqs.gamespot.com/iphone/610758-game-dev-story/answers/234185-is-20-years-the-farthest-you-can-progress-before-its-done), "Tips for High Scores" (https://gamefaqs.gamespot.com/boards/610758-game-dev-story/57807998), StrategyWiki Walkthrough (https://strategywiki.org/wiki/Game_Dev_Story/Walkthrough), Steam achievements guide, TV Tropes, Giant Bomb forums.

#### 6.1 Length and scoring

- The scored game lasts **20 in-game years** (Y1 M4 -> Y21 M1). "Your total assets at this point will be saved as your high score"; "Your score is simply your total capital (money)." You can keep playing after Y21 but the score is frozen.
- End screen stats: number of released games, total units sold, best-selling game and its units.
- **New Game+** carries over: genre/type levels (re-unlock required), the direction-point pool size, genre/type popularity gains from awards. Staff carry-over is contradicted across extracts (Endgame page: "Staff & Their levels" carry; a forum extract: "staff and their levels do not carry over") — unresolved.
- A year is 12 months x 4 weeks = 48 ticks; 20 years = 960 weekly ticks. With roughly a 3-month cycle per game once the team is competent, a full run ships on the order of **40–70 games** (my estimate; no source states a count). The 32 achievements include "number of games" style goals but the extract did not list them.

#### 6.2 The arc

| Phase | Years (typical) | What the player is doing | Money scale |
| --- | --- | --- | --- |
| Bootstrapping | Y1 | 2–4 weak staff; contracts ($100K–$1M, 6–13 weeks) for cash + RD; first PC / Microx SX games with Not Bad combos; first March salary bill | $0.5M start; games earn low six figures |
| First real games | Y2–Y3 | Game Kid licence ($550K) at Y3 M11; hunting the first Amazing combo; levelling a Writer toward Lv3 (Action/Shooter); salesman appears Y2 M5 | ~$1M on hand triggers office-2 offer ($600K) |
| Second office | ~Y4 | 6 seats; Vocational School/Open House hires; first 32+ game -> Hall of Fame -> awards eligibility; aiming for Best Design/Best Music | millions |
| Mid game | Y5–Y9 | Play Gear, Game Swan ($4.5M), Super IES ($5M); building Directors/Producers; sequels of HoF titles; Grand Prize attempts (36+); office 3 ($2.5M, needs $3.5M and/or a trophy) | tens of millions |
| Late game | Y10–Y16 | PlayStatus ($10M), Game-Box ($25M), PlayStatus 2 ($40M); Hardware Engineer finally exists; own console ($8M–$91M) if chosen; farming RD via contracts for level-5s | hundreds of millions |
| Endgame | Y17–Y20 | Microx 480 ($50M), Whoops ($80M) as prestige sinks; Hackers; Potato Chip/Punch Cards joke console ($190M, 6 HW engineers); chasing 5 Grand Prizes for Kairobot and 100M-unit titles | billions in capital for top scores |

The StrategyWiki/GameFAQs consensus opening: hire two more people via Word of Mouth immediately so all four desks are filled (a Coder, Writer, Designer, Sound Engineer); alternate contracts and small games; don't buy any licence before the Game Kid; advertise only while a game is in development; release into M7 or M12.

#### 6.3 Where tension and dead time live

- **The March salary cliff.** Salaries are one lump sum; levelling everyone (x1.2 per level) without a hit in the pipeline bankrupts new players. This is the game's main early fail state.
- **The debugging dilemma.** At 100% you can ship now (into a sales month, before a console dies, before a rival) or finish debugging (better reviews, RD income). The decision is explicit and recurs every cycle.
- **Licence timing.** Each console is a lump-sum bet on remaining lifespan vs. share; the 3-month discontinuation warning can strand a half-built game.
- **Repetition vs. mastery.** Levelling a genre/type (more direction points) and milking sequels both require repetition that erodes fans.
- **The console-development silence.** Months without a release shrink fans while salaries continue.
- **The Hardware Engineer / Hacker grind.** Seven career changes and ~30 level-ups per person; "by the time you manage to level an employee to hacker class, the game would've been nearing the end." Players either ignore it or farm RD via contracts late.
- **RNG at the hiring and review layers.** Save/reload on hires is standard; 40/40 is described as partly luck.

#### 6.4 When players get bored or stuck

- Stuck early: not enough cash for a licence and salaries at once; stuck at Hmm.../Not Bad combos because no type is unlocked (needs a specific career level + a specific training course).
- Stuck mid: cannot reach 32/40 because one meter (usually Sound or Graphics) lags — fixed by hiring/outsourcing a specialist, Boost items, or Producer-class staff.
- Bored late: money saturates ("I made 18 million consoles"), nothing left to buy except $50M–$80M licences and the joke console; score is just capital, so late game becomes a treadmill. Community keeps interest via self-imposed goals (5 Grand Prizes, 100M units, perfect 40s).

---

### 7. Transposition notes for an AI-lab game

Mapping Game Dev Story (GDS) -> "AI lab trains and releases models" (AIL). Each bullet names the GDS mechanic, the AIL analogue, and the number or rule worth copying. Items marked [tension] are the places GDS forces a trade-off; reproduce those first.

**Cycle structure**

1. GDS "Develop > New Game" with 5 setup choices -> AIL "Start training run" with 5 setup choices: deployment surface, architecture, specialization, direction sliders, lead researcher for the data phase. Keep it to five screens; GDS's whole design is that setup is fast and the waiting is where the drama is.
2. GDS platform/console licence (one-time $200K–$80M, finite lifespan, market share %) -> AIL **compute generation** (e.g. "H-gen cluster", "B-gen cluster") bought as a one-time lease with a visible share of the inference market and a scheduled EOL, plus a per-run cost (GDS per-game dev cost: PC $10K, Microx SX $50K, PlayStatus $650K). Alternatively model it as **deployment surface** (API, consumer app, enterprise, on-device) — but the lifespan/share/EOL trio is what makes the console mechanic bite, so attach it to hardware generations.
3. GDS genre (20, A/B/C popularity, unlocked by staff career level) -> AIL **architecture/modality** (dense LLM, MoE, diffusion, world model, agentic harness, multimodal, robotics policy...) unlocked by a researcher reaching a level in a track.
4. GDS type (~45, unlocked by career level + a specific training course) -> AIL **specialization/domain** (coding, math, biology, law, customer support, companionship, games, trading...) unlocked by a researcher at level N completing a specific "upskilling" course or conference.
5. GDS combo rating (Amazing / Creative / Not Bad / Hmm... / Not Good, shown before commit) -> AIL **architecture x specialization fit** shown at setup ("MoE + coding: Amazing", "Diffusion + law: Not Good"). Keep the 5-tier display and keep it visible pre-commit; the skill is unlocking good pairs, not guessing.
6. GDS proposal author (staff vs. outsourcer $10K–$2.4M; sets starting Fun/Creativity; repeat-use penalty) -> AIL **data curation lead** (staff vs. licensed dataset vendor $10K–$2.4M), seeds starting Capability/Alignment; reusing the same lead on consecutive runs yields less.
7. GDS direction points (8 sliders, pool grows +2 at genre Lv2 and Lv5) -> AIL **training recipe sliders**: e.g. Helpfulness, Harmlessness, Honesty, Reasoning depth, Breadth, Personality, Tool use, Efficiency. Pool grows as an architecture is reused (Lv2, Lv5).
8. (Optional, from the unverified PocketGamer list) a top-level "Speed / Quality / Research / Budget+" choice (+20% / +30% / +50% / x2 cost) maps cleanly to **"Rush / Careful / Science run / Max compute"** and is a good AIL idea even though it is probably not in GDS.

**Phases and point generation**

9. GDS progress 0->100% with checkpoints at 40% (alpha -> graphics lead) and 80% (beta -> sound lead) -> AIL phases: **data curation (0–20%) -> pretraining (20–60%) -> post-training/RLHF (60–85%) -> red-teaming & evals (85–100%) -> release**. At each boundary prompt "who leads this phase?" (staff or outsource). Two prompts per run is the right cadence; GDS's three total decisions mid-run keep it incremental-friendly.
10. GDS four meters Fun / Creativity / Graphics / Sound, each fed by one staff stat (Program->Fun, Scenario->Creativity) -> AIL **capability meters** Coding, Research, Agentic, Persuasion (or Reasoning/Knowledge/Tools/Communication) plus a fifth **Alignment** meter, each fed by one researcher stat (Engineering, Science, Systems, Communication, Safety).
11. GDS "points are emitted per tick by every working staff member, scaled by their stat" -> AIL identical; it is the entire idle engine. Keep points integer and visible as rising bars.
12. GDS bugs emitted alongside points (more when staff fail a boost; even idle staff create some) -> AIL **misalignment debt / safety incidents** emitted alongside capability points; large bursts when a risky intervention fails; a trickle even when idle (data contamination, eval leakage).
13. GDS energy/Power (drains with work and training, staff go home at 0; Dead Bull $50K->$550K refill) -> AIL researcher **burnout**; "coffee/sabbatical" items with ratcheting price.
14. GDS Boost items (4 flavours, 30 Research Data each, matched to career, second use ~half effect, third ~zero, cost rises with your RD stockpile) -> AIL **compute bursts** ("spin up 10k extra GPUs for a week") costing Research Data, one flavour per meter, same diminishing curve (100% / 50% / ~0%). The stockpile-scaling cost is a neat anti-hoarding rule; copy it.
15. GDS employee boost request (~$50K + RD, success up to 80%, failure spawns many bugs and lowers hype) -> AIL researcher proposes a **risky experiment** ("let me try a new RL objective"): pay cash + RD to raise success odds to 80% max; failure spawns safety incidents and lowers hype. Keep the 80% cap so it is never safe.
16. GDS Research Data (second currency: from work, idle, 1–3 per bug fixed, lump per contract; spent on levels and boosts) -> AIL **Research Insight**: from training, idle, per incident resolved, per contract; spent on researcher levels and compute bursts. Keep the "fixing your own bugs pays research" loop — it makes debugging feel productive, not punitive.

**The ship decision**

17. [tension] GDS at 100%: ship now with bugs (hit the sales month, beat a console EOL) vs. debug (better reviews, RD income, time) -> AIL at 100%: **release now with open safety findings vs. run more red-teaming**. Make the clock pressure real: benchmark seasons (quarterly "leaderboard refresh"), compute-generation EOL, and a visible rival release countdown.
18. GDS Bug Spray (instant bug removal for RD) -> AIL "emergency patch / classifier bolt-on" for Insight, with a hint that reviewers may still notice.

**Reviews, Hall of Fame, awards**

19. GDS four critics x 0–10 = 40, bugs found lower the score, 32 = Hall of Fame, 36+ = award contention -> AIL **four evaluators** (academic benchmark suite, developer community, enterprise buyers, safety institute) x 0–10 = 40; unresolved incidents lower it; **32 = Frontier Model** status; 36+ = Model of the Year contention.
20. GDS "different judges have different reviews" by audience -> AIL evaluators weight meters differently (safety institute weights Alignment; developers weight Coding/Agentic; buyers weight Persuasion/Reliability).
21. GDS Hall of Fame unlocks sequels and award eligibility, no cash -> AIL **Frontier status unlocks the next-gen successor run and award eligibility**; keep it non-monetary so prestige and money stay distinct axes.
22. GDS Global Game Awards at M12 W3 (Grand Prize, Runner-up, Best Design, Best Music, Worst Game; guaranteed Grand Prize at >= 160 per meter or >= 640 total with >= 155 each) -> AIL **annual awards** (Model of the Year, Runner-up, Best Coding, Best Safety, Most Harmful Release); copy the "guaranteed at a balanced threshold" rule so balance beats min-maxing.
23. GDS award wins unlock secret hires (1st/3rd/5th Grand Prize) and raise genre popularity -> AIL award wins unlock legendary researchers and raise the market appetite for that architecture.

**Revenue**

24. GDS weekly sales chart with decay, driven by review score, fans, hype, console share, season, combo -> AIL **weekly API revenue** per model driven by eval score, user base ("fans"), hype, compute-generation share, season (conference months), fit tier. GDS has no documented long tail; AIL should add an explicit **decay as competitors catch up** (each rival release above your score accelerates your decay).
25. GDS seasonal months (M7, M12) -> AIL launch windows (e.g. a May developer conference and a December leaderboard refresh); start runs ~3 months before.
26. GDS unit milestones 100K / 500K / 1M / 5M / 10M / 20M / 50M / 100M -> AIL revenue or token-volume milestones with the same 1-2-5 ladder across three orders of magnitude.
27. GDS fans (one global number; up with sales, ads, Gamedex, awards; down with repetition and silence; sets own-console share at launch) -> AIL **users/developers** count; down when you ship the same architecture+domain repeatedly or go silent during a long pretraining run; sets the initial share of your own hardware/cloud when you launch it.
28. GDS advertising tiers ($30K Magazine -> $9.9M Lunar Writing; same channel saturates; during dev = hype + fans, after launch = sales) -> AIL marketing tiers (blog post -> keynote -> Super Bowl ad -> satellite); same saturation rule; pre-release builds hype, post-release lifts revenue.
29. GDS Gamedex booth (July, $150K–$7M) -> AIL annual conference booth/keynote slot.
30. GDS contracts (6–13 week deadlines, offers expire in 24 weeks, $100K–$1M+, require N points in 1–2 meters, pay cash + RD, penalise failure, early-game only) -> AIL **consulting / fine-tune-for-a-client contracts** with identical shape; they are the on-ramp before the first real model and become irrelevant mid-game (good — that is GDS's intended arc).

**Staff**

31. GDS 4 stats + Power; 8 careers (4 basic, 2 advanced requiring two Lv5s, Hardware Engineer requiring all six, Hacker requiring Hardware Engineer Lv5) -> AIL researcher tracks: ML Engineer, Scientist, Systems/Infra, Comms/Policy (basic); Research Lead (Eng+Sci Lv5), Product Lead (Infra+Comms Lv5); **Chip Architect** (both leads Lv5; needed to build your own hardware); **Polymath** (hidden; Chip Architect Lv5; great at everything, cannot build hardware). Keep the "7 career changes, ~30 level-ups" cost so the top class is a late-game trophy.
32. GDS levelling with Research Data, salary x1.2 per level, salaries paid once a year in March -> AIL identical; the annual lump-sum payroll is the early fail state and worth keeping.
33. GDS training courses ($30K–$2.5M, drain Power, diminishing stat gains per person, specific course + level unlocks a type) -> AIL courses/conferences with the same table shape; the course-unlocks-a-domain rule gives training a reason beyond stats.
34. GDS hiring tiers ($50K Word of Mouth -> $3.5M Hollywood Agent, gated by office size; contract fee on hire) -> AIL hiring tiers (referral -> job board -> campus -> poach from rival -> executive search), gated by office size.
35. GDS desks 4 -> 6 -> 8 with office moves ($600K, $2.5M) that also unlock hiring/training/ad tiers -> AIL office/cluster moves gating headcount 4 -> 6 -> 8 (or 5 -> 10 -> 20) plus tier unlocks; headcount is the throughput dial.
36. GDS outsourcers (18 NPCs, $10K–$2.4M, used for one phase) -> AIL contractors / data vendors / eval vendors for one phase.
37. GDS special characters (Mister X after a 250K-unit game; others after Grand Prizes; Kairobot only via the $3.5M search) -> AIL legendary researchers unlocked by milestones.

**Platforms and own hardware**

38. GDS console timeline (17 machines over 20 years, licences $200K -> $80M, lifespans 2–13 years, 3-month EOL warning, PC always free) -> AIL compute generations every 1–3 years with leases rising by ~2x–3x per generation, 3-month EOL warning, and a free low-end tier that never dies.
39. GDS "good games raise the share of the console they ship on" -> AIL strong models raise the share of the compute generation / deployment surface they ship on; your own choices move the market.
40. GDS own console (needs a Hardware Engineer; form $4M/$6M + CPU $1M–$90M + media $3M–$94M; long build; fans at launch set share; bigger revenue share; replaces your previous console; joke build sells on novelty) -> AIL **own chips / own cloud**: needs a Chip Architect; pick form (datacenter/edge) + chip tier + interconnect tier; long build during which users decay; user count at launch sets share; higher margin; replaces your previous platform. Include one absurd novelty build.

**Sequels and next-gen models**

41. GDS sequel (only from a Hall of Fame game; same genre+type locked; starts with part of the original's points; if the sequel misses the Hall of Fame the franchise ends; fans tire after ~3 in a row) -> AIL **next-gen model trained on top of the previous** (only from a Frontier model; same architecture+domain locked; inherits a fraction of capability points; if the successor misses Frontier status the line ends; users tire of the same line after ~3). The franchise-death rule is the sharpest piece of GDS design here — keep it.

**Pacing and meta**

42. GDS 20 years, 48 weeks/year, score = capital, play continues after -> AIL 20 years (or 10 at double tick rate), score = capital or valuation; NG+ carries architecture/domain levels and slider pool.
43. GDS calendar anchors (March payroll, May salesman, July show, December awards) -> AIL calendar anchors (payroll, annual hardware vendor visit, summer conference, December awards). Fixed dates create planning.
44. GDS early arc (contracts -> first small game -> Game Kid licence -> office 2 -> first 32+ -> awards) -> AIL (contracts -> first small open-weights model -> first paid compute lease -> office 2 -> first Frontier model -> awards).

**Tension checklist (what to reproduce so the loop is not pure idle)**

45. [tension] Ship-with-bugs vs. debug, under a visible clock (Section 1.9).
46. [tension] Annual lump-sum payroll vs. compounding salaries from levelling.
47. [tension] Licence a platform now (lifespan bet) vs. wait for the next generation.
48. [tension] Repeat the same combo (levels, sequel bonus) vs. fan fatigue.
49. [tension] Long own-hardware build vs. user decay from silence.
50. [tension] Risky researcher experiment (80% cap) vs. incident bursts.
51. [tension] Boost now (full effect) vs. save Research Data (cost rises with stockpile anyway).
52. [tension] Outsource a phase (cash, no fatigue) vs. use your specialist (free, but repeat-use penalty and energy drain).
53. [tension] Spend direction/recipe points for the reviewers you need (Innovation/Approachability analogues) vs. for the meter you lag in.

**What GDS lacks that an AI-lab game should add**

54. A real long tail: GDS titles stop selling; AIL models should decay against a rival frontier, so "sales over time with decay as competitors catch up" needs an explicit rival-release generator (GDS only simulates rivals as chart filler).
55. Negative externalities: GDS's worst outcome is a Worst Game award and fan loss; AIL should let unresolved incidents trigger regulation events (a fifth evaluator that can veto deployment surfaces) — but keep GDS's rule that everything is recoverable.
56. Open vs. closed release as a lever on fans vs. revenue (no GDS analogue).
57. Compute as a per-tick running cost during training (GDS has no running dev cost beyond salaries; adding one strengthens the ship-now tension).
58. Verifiable numbers: before tuning, someone with the game or wiki access should fill the gaps listed at the end of Sections 1–5 (per-tick point rates, review function, sales curve, level-up RD costs, direction pool size). Everything else above is enough to prototype.

---


### Quick-reference parameter sheet

Every numeric constant surfaced in this research, in one place, with confidence. "Wiki" = a Kairosoft-wiki page extract; "guide" = StrategyWiki / GameFAQs / Steam guide; "forum" = player report.

| Parameter | Value | Confidence | Source |
| --- | --- | --- | --- |
| Starting cash | $500.0K | high | guide (StrategyWiki) |
| Starting Research Data | 10 | high | guide (StrategyWiki) |
| Starting desks / office 2 / office 3 | 4 / 6 / 8 | high | wiki + guide |
| Office move 1 / move 2 cost | $600.0K / $2,500.0K | medium (one forum says 3,500K for move 2) | wiki |
| Office-3 trigger | $3,500.0K and/or >= 1 GGA trophy (both Y4M12–Y6M12; either Y7–Y9; none Y10+) | medium | wiki |
| Game length | 20 years, ends Y21 M1; 4 weeks/month | high | wiki + guide |
| Score | total capital at Y21 M1 | high | wiki |
| Salary payment | once a year, end of March | high | wiki + manual |
| Salary growth | x1.2 per level | high | wiki |
| Career levels | 1–5 per career; 8 careers | high | wiki |
| Director prereq | Lv5 Coder + Lv5 Writer | high | wiki |
| Producer prereq | Lv5 Designer + Lv5 Sound Engineer | high | wiki |
| Hardware Engineer prereq | Lv5 Director + Lv5 Producer | high | wiki + PocketGamer |
| Hacker prereq | Lv5 Hardware Engineer | high | wiki |
| Level-ups to Hacker | ~30, with 7 career changes | medium | TV Tropes |
| Hire costs | $50K / $120K / $550K (office 1); $800K / $1,800K (office 2); $3,500K (office 3) | high | wiki |
| Training costs | $30K – $2,500K (15 methods; table in 2.4) | high | wiki |
| Training stat gains | +1 to +8 per stat, diminishing | high | wiki |
| Boost item cost | 30 Research Data per use; rises with stockpile | high | wiki + forum |
| Boost effect | ~10–30 points; 2nd use ~50%, 3rd ~0% | medium | wiki + forum |
| Employee boost request | ~$50K + RD; success capped at 80% | high | wiki |
| RD per bug fixed | 1–3 (StrategyWiki: 1) | high | wiki + guide |
| Contract deadline / expiry / pay | 6–13 weeks / 24 weeks / $100K – $1,000K+ | high | wiki |
| Salesman visit | M5 W2, yearly from year 2 | high | wiki |
| Dead Bull price | $50K first, up to $550K late | medium | forum |
| Gamedex | M7 W1; booths $150K / $600K / $2,500K / $7,000K | high | wiki |
| Awards | M12 W3; Grand Prize, Runner-up, Best Design, Best Music, Worst Game | high | wiki |
| Critics | 4 x 0–10 = 40 | high | wiki |
| Hall of Fame | 32/40 | high | wiki |
| Award contention | 36+/40 | high | wiki |
| Guaranteed Grand Prize | >= 160 in each meter, or >= 640 total with >= 155 min | medium | Steam guide |
| Sequel | requires Hall of Fame; same genre/type; inherits part of points; franchise ends if sequel misses HoF | high | wiki |
| Direction categories | 8; +2 pool at genre Lv2 and Lv5 | high | wiki + forum |
| Phase checkpoints | 40% graphics lead; 80% sound lead; 100% debug | high | guide + wiki |
| Stat -> meter | Program->Fun, Scenario->Creativity, Graphics->Graphics, Sound->Sound | high | forum + wiki |
| High-sales months | M7, M12 | high | wiki (Tips) |
| Console licences | $200K (Microx SX) ... $80,000K (Whoops); table in 3.2 | high | wiki |
| Per-game dev cost | PC $10K; Microx SX $50K; PlayStatus $650K | high (others unknown) | wiki |
| Console lifespans | Microx SX ~6y, Exodus ~5y, IES ~4y, Game Kid ~13y, NEONGEON ~2y | medium | wiki |
| EOL warning | 3 months | high | wiki |
| Own console parts | form $4,000K/$6,000K; CPU $1,000K/$10,000K/$50,000K/$90,000K; media $3,000K/$5,000K/$15,000K/$35,000K/$93,999.9K | high | wiki |
| HW engineers for Potato Chip / Punch Cards | 4 / 6 | high | wiki |
| Own-console share at launch | set by fan count | medium | forum/guide |
| Advertising costs | $30K – $9,900K (12 methods; table in 5.5) | high | wiki |
| Mister X unlock | one game > 250,000 units | high | wiki |
| Secret hires via Grand Prizes | 1st King Ackbar; 3rd Chimpan Z; 5th Kairobot (Hollywood Agent only) | high | guide |
| Unit achievements | 100K, 500K, 1M, 5M, 10M, 20M, 50M, 100M | high | wiki |
| Employees / outsourcers | 44 / 18 | high | wiki |
| Outsourcer fees (writers) | $10K, $100K, $350K, $770K, $1,000K, $2,400K | high | wiki |
| Genres / types count | 20 / ~45–50 | high / medium | wiki |

### Discrepancies and open questions

| Item | What the sources say | Resolution |
| --- | --- | --- |
| "Speed/Quality/Research/Budget+" direction menu | PocketGamer only | treat as not in GDS; wiki describes 8 direction categories only |
| Sales formula `fans*(R/10)` | Game Dev Tycoon wiki | excluded |
| Office move 2 cost | $2,500.0K (wiki) vs "2500k or 3500k" (forum) | use $2,500.0K |
| Office move 1 trigger "after year 4" | extract wording garbled | likely: trigger needs one shipped game and/or $1,000.0K; unconditional after a later year |
| Hardware Engineer prereq | "Lv5 Director and Producer" vs "level 5 in all six jobs" | identical in practice (Director/Producer each need two Lv5 basics) |
| RD per bug | 1 (StrategyWiki) vs 1–3 (wiki) | use 1–3 |
| New Game+ staff carry-over | carries (Endgame page) vs does not (forum) | unresolved |
| Type level 5 bonus | "+2 when a genre reaches Lv2/Lv5" vs "every genre or theme at Lv5 gives two points" | both plausible; treat types as giving +2 at Lv5 only |
| Lower combo tier names | Creative / Not Bad / Hmm... / Not Good (wiki) vs Great / Good / So-so (secondary) | use wiki names |
| Console per-game dev cost for most machines | not surfaced | interpolate between $50K (Y1) and $650K (Y10) |
| Development duration | not surfaced | ~1 quarter per game implied by Tips timing advice |
| Sales curve / price per unit | not surfaced | design freely; GDS has no documented long tail |
### Sources

All URLs below were reached only through search-engine extracts in this session (direct fetches were blocked by the egress policy). Facts attributed to a page are as surfaced by those extracts.

Kairosoft wiki (fandom; mirror at kairosoft.wiki.gg with identical page names):
- https://kairosoft.fandom.com/wiki/Game_Dev_Story
- https://kairosoft.fandom.com/wiki/Creating_games_(Game_Dev_Story)
- https://kairosoft.fandom.com/wiki/Items_(Game_Dev_Story)
- https://kairosoft.fandom.com/wiki/Careers_(Game_Dev_Story)
- https://kairosoft.fandom.com/wiki/Employees_(Game_Dev_Story)
- https://kairosoft.fandom.com/wiki/Training_(Game_Dev_Story)
- https://kairosoft.fandom.com/wiki/Consoles_(Game_Dev_Story)
- https://kairosoft.fandom.com/wiki/Genres_and_types_(Game_Dev_Story)
- https://kairosoft.fandom.com/wiki/Magazine_Reviews_(Game_Dev_Story)
- https://kairosoft.fandom.com/wiki/Achievements_(Game_Dev_Story)
- https://kairosoft.fandom.com/wiki/Tips_(Game_Dev_Story)
- https://kairosoft.fandom.com/wiki/Endgame_(Game_Dev_Story)
- https://kairosoft.fandom.com/wiki/Transcript:Manual_(Game_Dev_Story)
- https://kairosoft.fandom.com/wiki/Mister_X
- https://kairosoft.fandom.com/wiki/GameDevStory.csv (data dump page; contents not surfaced)
- https://kairosoft.wiki.gg/wiki/Companies_(Game_Dev_Story)
- https://kairosoft.wiki.gg/wiki/Pumpkin_Products

Other guides and threads:
- https://strategywiki.org/wiki/Game_Dev_Story/Gameplay , /Walkthrough , /Combinations , /Staff
- https://gamefaqs.gamespot.com/iphone/610758-game-dev-story/faqs/61859 (ajonatan strategy guide)
- GameFAQs boards: /56855237 (direction), /57541209 (fun+creativity), /57807998 (high scores), /59710865 (Hall of Fame), /56904548 (sequels), /57732082 (advertising), /56905915 (hype), /58471366 and /57848391 (market share), /57465764 (own console), /56938485 (hackers), /57904133 (training vs levelling), /58245083 (proposal writers), /57768752 (tip with jobs), /57118631 (research data), /58576138 and /57576713 (third office), /56934635 (full lists), /56851983 (unlocking types); answers/235291 (hidden characters), answers/234185 (20 years)
- https://steamcommunity.com/sharedfiles/filedetails/?id=2789877528 (All Achievements Guide)
- https://www.pocketgamer.com/game-dev-story/best-combos/ , /hardware-engineer/ , /guide/
- https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/GameDevStory
- https://giantbomb.com/wiki/Games/Game_Dev_Story and forum threads linked in Sections 3 and 5
- https://en.wikipedia.org/wiki/Game_Dev_Story
- http://kairoguide.blogspot.com/2013/06/game-dev-story-console-dates.html , .../game-dev-story-types-genre.html , .../game-dev-story-training-methods.html , .../game-dev-story-special-characters.html
- http://kairotips.blogspot.com/2013/02/game-dev-story-consoles.html
- https://addictedgamewise.com/game-dev-story-5-character-data/ and .../game-dev-story-4-good-combos-bad-combos/
- https://www.whatsitlike.com.au/how-to-develop-your-own-console-in-game-dev-story/
- https://zerroone.com/game-dev-story-console-guide/
- https://gamingroute.com/game-dev-story-guide-2023-best-combos-how-to-get-hardware-engineer-and-develop-console/
- https://www.gamedeveloper.com/production/-quot-game-dev-story-quot-7-valuable-lessons-for-game-developers
- https://www.sidequesting.com/2010/11/just-the-tips-gamedev-story/
- https://www.niahak.org/quick-guide-game-dev-story-pc/ (1997 PC original)
- Excluded as not-GDS: https://gamedevtycoon.fandom.com/wiki/Sales_Algorithm (Game Dev Tycoon)

---

# Part V. AI 2027 and the narrative corpus

_(in progress: this part is appended when the narrative research pass completes)_

---

# Part VI. Synthesis: what Takeoff takes from each reference

The design document (`docs/design.md`) is the spec; this part records the provenance of each decision so that when the critic loop says "this is slower than Paperclips", we know which knob the reference turned.

## VI.1 Mechanic-by-mechanic mapping

| Reference mechanic | Where it is documented | Takeoff's version | Deliberate difference |
|---|---|---|---|
| **One button at t=0** ("Make Paperclip"; "light fire") | I §4, I §10.1; III §4.4, III §10.1 | `complete task`, `$0.00`, a date. No stores box until the first purchase prompt | the date is visible from the first second; it is the one clue that this is a story |
| **First automation inside a minute** ($5 AutoClipper appears at $5 funds; the builder arrives at +30 s) | I §6.1 (`1.1^L + 5`), III §4.4 | `deploy agent` appears at $5 and costs $5; price `5 × 1.1^n` | identical curve on purpose |
| **A consumable that runs out by itself** (1,000 inches of wire; the fire going out) | I §5 wire, I §10.3; III §2 fire cool-down | 500 kWh of energy; `buy energy` sits there from the start; price `ceil(base + 30·sin n)` with +$2 per purchase and idle decay (Paperclips wire price, I §5.4) | energy stays relevant through all five stages (GW ceiling in S3, orbital in S5) where wire is replaced by drones in Paperclips stage 2 |
| **Reveal on trigger, grey until affordable** (`uses` spent on reveal; `cost()` only toggles `disabled`; `.projectButton:disabled{border:none}`) | I §3.2, I §9.3, I §10.9 | same lifecycle, same visual; project list in insertion order, new items appended at the bottom | we keep `uses` on buy, not on reveal, so a repeatable's count is legible |
| **Projects as the single surface for everything** (upgrades, story, choices, bail-outs, dialogue) | I §10.8, I §7.3 (Accept/Reject as sibling projects) | same: `neuralese` vs `legible chain of thought` are siblings that remove each other; `keep internal` vs `release` likewise | big story choices additionally use ADR-style modals (below), because Paperclips' sibling-project pattern is invisible to a new player |
| **Fibonacci milestone ladder** (trust at 3k, 5k, 8k … clips; `fib1=2, fib2=3`) | I §5.3, I §6.3, II §4 | headcount at Fibonacci × 1,000 tasks; every third one is a funding round | the ladder is allowed to go stale in S3 ("the researchers mostly watch now") instead of needing Paperclips' Xavier patch; we still ship `reorg` as the respec |
| **Two-axis build choice with a trap** (processors vs memory; the "processor trap"; Xavier Re-initialization) | I §5.2, II §2.1, II §8.10–11 | researchers (rate) vs engineers (cap); `reorg` respec | engineers also give a small efficiency bonus so neither axis is ever useless |
| **Capped primary research currency + overflow currency** (ops ≤ memory·1000; creativity only at cap) | I §5.1 (`main:2679-2693`, `main:3363-3365`), I §10.13–14, II §8.9 | research ≤ `150 + 250·engineers`; insight accrues only at cap | insight is spent on alignment / interpretability / policy, so "waiting" literally becomes safety work |
| **Demand formula & price control** (`demand = (0.8/margin)·1.1^(mkt−1)·…`, marketing ×2 per level) | I §5.4, I §6.1 | `demand = 2 · 10^(cap−1) · 1.25^mkt · (ref/price)^1.5 · …`; marketing `$100 × 2^n` | capability is a demand multiplier so each release moves the market; price control is deleted at S3 (automated), as Paperclips deletes the Business panel |
| **Bail-out project when stuck** (Beg for More Wire, −1 trust, deterministic trigger that checks funds, wire, inventory and portfolio) | I §3 project 2, II §6, II §8.12 | `emergency power` (−1 gov) with a 5-second all-conditions trigger | — |
| **Automate the chore after the player has done it N times** (WireBuyer after 15 spools; AutoTourney) | I §10.19 | `energy auto-buyer` after 3 purchases; PPA after $2,000 of energy | earlier, because our stage 1 is shorter |
| **Stage boundary as a destructive UI event** (HypnoDrones flash, clippers zeroed, Business panel gone) | I §4.2, I §7, I §10.11, I §10.27; II §7 | S1→S2 release scorecard; S2→S3 deletes `complete task`, price, marketing and shows the 3.8 s black flash once; S3→S4 the vote; S5 deletes panels line by line | we never zero the player's compute; the loss is of *controls*, which is the theme |
| **Stage template** (analogy · verb · currencies · panels · opening/mid/exit projects · numeric exit · pitfalls) | II §1.3 | design.md §5 uses the same column set for all five stages | — |
| **Elapsed-time milestone stamps** ("500 clips created in …") | I §6.3, II §8.6 | "agent-1 shipped in 16:40.", "first million tasks in …" | — |
| **Console / log** (Paperclips: 5 lines, newest at bottom; ADR: left column, newest on top, fades, full stop appended) | I §7.1; III §5.9, III §10.12–15 | ADR's column and voice; 60 lines kept; newest on top; logger appends the full stop | — |
| **Stores panel** (alphabetical rows, right-aligned numbers, income tooltip `+N per 10s` with bold total, rows never removed, 300 ms fade-in, `data-legend` caption) | III §4.2, III §9.6 | same box, same tooltip; rows in a fixed semantic order rather than alphabetical | fixed order because our rows are a story (funds, energy, agents, compute, headcount, research, insight, data, power, robots) |
| **Timer-scripted opening** (free first click; stranger at +30 s; stores box and forest tab at +45 s; builder awake at ~2 min) | III §4.4 | the opening is driven by *purchases* (Paperclips) not timers, but with ADR's cadence: something new every 30–45 s for the first 4 minutes (design.md §11) | — |
| **Ambient events: one timer, uniform draw over available events, every event optional** | III §5.1, III §10.17–18 | one timer (45–90 s), uniform draw over `isAvailable()` events per stage, 70 % log-only | shorter interval because our run is 3–4 h, not 8 |
| **Choice modal** (`scenes.{text[], buttons{cost, reward, nextScene weighted}}`, 60 % white sheet, 2 px frame, title blink) | III §5.2–5.4, III §9.8, III §10.23–24 | same data shape (`ChoiceEvent`), same look; the simulation keeps running under the modal except for the three votes | — |
| **Disaster paired with a transaction** (Sickness: 1 medicine / do nothing) | III §10.20 | every crisis modal has a paid option and a free option with a cost elsewhere (gov/opinion) | — |
| **Delayed payoffs persisted in state** (wanderer returns in 60 s, re-armed on reload) | III §5, III §10.22 | the `queue` of armed set pieces lives in state and is re-armed on load | — |
| **Tabs named after the state of the world** ("A Dark Room" → "A Firelit Room"; "A Silent Forest" → … → "A Raucous Village") | III §4.1, III §10.4 | panel titles rename: **lab** → **the project**; **compute** → **the zones**; `document.title` follows the model name | — |
| **Cooldown bar behind the label** | III §3, III §9.4 | the training progress bar | — |
| **Save on every mutation; export/import base64; no offline progress** | III §8; I §8 | autosave every 30 s + on hide; export/import; up to 60 s of catch-up, no more | — |
| **Speed toggle by wrapping the clock** (`hyper.` halves every timeout) | III §8, III §10.42 | `speed` multiplier in the engine; dev ×1/5/20/100 | — |
| **Develop → review → sales loop** (4 critics × 10 = 40; 32 = Hall of Fame; ship-with-bugs vs debug; sales decay) | IV §1.9–1.11, IV §7.17–24 | train → findings → release or safety pass → 4 evaluators × 10 = 40; 32 = frontier; `productMult` decays faster when the rival releases above you | one setup decision (budget) instead of five; a run is 60–120 s |
| **Bugs accrue with points** | IV §1.6, IV §7.12 | misalignment findings accrue in post-training; alignment projects reduce the rate | — |
| **Sequel/franchise rule** (only from a Hall of Fame game) | IV §4, IV §7.41 | a frontier score (≥32) unlocks the next generation's project early | not a hard gate: the next generation always unlocks eventually (no soft-lock) |
| **Annual anchors** (March payroll, December awards) | IV §1.14 | year-end "model of the year" log line; quarterly earnings lines | no payroll (no upkeep anywhere: soft-lock avoidance) |
| **Dashboard numbers** (copies × speed, approval, revenue, valuation, datacenter capex, "timeline") | V §1.1 | the stats box: copies × speed, R&D multiplier, approval, revenue, rival gap, power | — |
| **Milestones and multipliers** (superhuman coder → SAR → SIAR → ASI; 1.5× → 5× → 25× → 250× → 2000×) | V §2 | capability reference lines at 3.6 / 4.0 / 5.0 / 6.0 and `rdFactor` tuned to those multipliers | — |
| **The two endings and the vote** (6–4; Race vs Slowdown; Safer-1..4; Consensus-1; the treaty; the quiet bioweapon ending) | V §1 | S3→S4 vote; S4 branches; S5 endings; nationalization as a third exit | nationalization is a player-facing ending because the player is the lab, not the AI |

## VI.2 The pacing numbers we are holding ourselves to
| measure | Paperclips (I/II) | A Dark Room (III) | Takeoff target |
|---|---|---|---|
| time to first automation | ~20 clicks / <1 min | 30 s (stranger), 45 s (forest) | ≤ 45 s |
| time to first "second system" | 2,000 clips → trust/projects (~3–4 min) | ~2 min (builder awake) → traps | 3k tasks ≈ 3–4 min (headcount, lab, projects) |
| time to first meaningful choice | price vs marketing (~2 min); processors vs memory (~4 min) | trap vs cart (~3 min) | price/marketing (~1.5 min); researcher vs engineer (~3.5 min); fine-tune budget (~6 min) |
| cadence of reveals | a new project every 30–120 s in stage 1 | a new building every 1–3 min | a new panel/row/project every ≤ 60 s in S1, ≤ 90 s later |
| stage 1 length | <20 min optimised, 50 min casual | ~10 min to a village | 15–20 min |
| total | 8–12 h first run; 1.5 h WR | 2–4 h | 3–4 h |
| greyed goal always on screen | yes from 2,000 clips (ops-priced projects) | partially (build buttons at 50 % wood) | yes from the first researcher, enforced by the sim bot's check |
| longest forced idle in stage 1 | "waiting for ops to fill" (minutes) | 60 s gather cooldown | ≤ 60 s (sim-verified) |

## VI.3 What we are deliberately not copying
- Paperclips' investment engine and tournaments (sub-games with their own timers; the wiki's IGT/RTA complaint, II §8.32). Our one skill element is the allocation panel and the ship/safety-pass decision.
- A Dark Room's map, combat and inventory weight. The mid-game shift in Takeoff is the allocation panel and the politics box, not a new screen.
- Game Dev Story's five setup screens, salaries and staff energy. One decision per run, no upkeep anywhere.
- Paperclips' prestige loop. A single 3–4 h run with an end-of-run stats screen and `play again`.
- Both games' silence about what to do next. A hint line under the header at every stall (II §8.37).
