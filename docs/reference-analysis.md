# Reference Analysis: Universal Paperclips & A Dark Room

This is a source-level teardown of the two games we're using as models: **Universal Paperclips** (primary) and **A Dark Room** (secondary). It covers how each game defines purchases, reveals UI, writes its log, layers currencies, paces itself, and saves. The goal is to copy *mechanisms*, not just aesthetics. A short section at the end of each part says what we take from it. Exhaustive per-item catalogues are in the appendices: every Paperclips project in Appendix A, every A Dark Room event in Appendix B.

| Source | Repo / commit | Files read |
|---|---|---|
| Universal Paperclips (Frank Lantz, 2017) | `github.com/jgmize/paperclips` @ `d1e9177` (mirror, Nov 2018) | `docs/main.js` (5,555 lines), `docs/projects.js` (96 projects), `docs/globals.js`, `docs/combat.js`, `docs/index2.html`, `docs/interface.css` |
| A Dark Room (Michael Townsend / Doublespeak, 2013–2025) | `github.com/doublespeakgames/adarkroom` @ `1fada46` (May 2025) | `script/engine.js`, `state_manager.js`, `room.js`, `outside.js`, `events.js`, `events/*.js`, `notifications.js`, `Button.js`, `header.js`, `path.js`, `world.js`, `ship.js`, `space.js`, `fabricator.js`, `prestige.js`, `scoring.js`, `css/*.css` |

Line numbers below refer to those commits. In code quotes, `…` marks elided lines.

---

## Part 1 — Universal Paperclips

### 1.1 Architecture at a glance

Paperclips is one long global-variable script. There are no modules, classes or state objects. About 300 `var`s live in `globals.js` and at the top level of `main.js`, and every system reads and writes them directly. The DOM is static: `index2.html` ships **every panel the game will ever show**. Progression consists entirely of toggling `style.display` on pre-existing `div`s. The one exception is project buttons, which are created at runtime.

The page is three fixed-width floated columns under a black "console":

```
┌──────────────────────── consoleDiv (black, 5 lines, monospace) ────────────────────────┐
│ . readout5  (grey)                                                                      │
│ . readout4                                                                              │
│ . readout3                                                                              │
│ . readout2                                                                              │
│ > readout1  (white)  |  ← pulsating cursor                                              │
└─────────────────────────────────────────────────────────────────────────────────────────┘
  Paperclips: 1,234        (h2, the only number that matters; tooltip shows crunched form)
┌ leftColumn 275px ───┐┌ middleColumn 275px ──────────┐┌ rightColumn 320px ─────────────┐
│ [Make Paperclip]    ││ Computational Resources      ││ Investments (engine box)       │
│ Business            ││  Trust / +1 Trust at         ││ Strategic Modeling (engine box)│
│ Manufacturing       ││  [Processors] [Memory]       ││ Combat canvas / Honor          │
│ (stage 2: Mfg/Wire  ││  Operations / Creativity     ││ Power                          │
│  Production/Space)  ││  Quantum Computing           ││                                │
│                     ││ Projects (buttons)           ││                                │
└─────────────────────┘└──────────────────────────────┘└────────────────────────────────┘
```

Fonts: the body has no `font-family`, so it falls back to the browser default serif (Times). The console uses `"Lucida Sans Typewriter", "Lucida Console", Monaco, monospace` at 12px. Tables and small print use `"Helvetica Neue"` at 11px. Buttons (`.button2`) are 1px `#1a1a1a` borders with a white→grey vertical gradient. Disabled buttons are `opacity: .6` with a white border. Project buttons (`.projectButton`) are 275×60 grey `#c8c8c8` blocks: **bold title**, then price, then a new line with the description. A full-screen white `#cover` div hides the page until the first `buttonUpdate()` has run, so the player never sees un-hidden panels flash (`main.js:729`).

### 1.2 The clocks (tick rates)

All game time is driven by `window.setInterval`. Nothing uses `requestAnimationFrame` or delta time, so the game runs slower when the tab is throttled.

| Interval | Where | What runs |
|---|---|---|
| **10 ms** (100 Hz) — "main loop" | `main.js:3241–3598` | `ticks++`, `milestoneCheck()`, `buttonUpdate()` (all reveal logic + all button enabling), `calculateOperations()` (if `compFlag`), `calculateTrust()` (if `humanFlag`), `quantumCompute()`, `updateStats()`, `manageProjects()`, clip-rate tracker, stock report counter, WireBuyer, `exploreUniverse()`, drones, `updatePower()`, `updateSwarm()`, `acquireMatter()`, `processMatter()`, factories, probes (if `spaceFlag`), AutoClippers, the demand curve, creativity, and the end-game dismantle timers |
| **100 ms** (10 Hz) — "slow loop" | `main.js:3606–3641` | `adjustWirePrice()`, sales (`Math.random() < demand/100` → `sellClips(floor(.7·demand^1.15))`), `calculateRev()` every 10th tick (1 s), autosave every 250th tick (**25 s**) |
| 100 ms | `main.js:932` | investment portfolio display / risk select |
| 1,000 ms | `main.js:979` | `stockShop()` (25% chance to buy a stock when budget allows) |
| 2,500 ms | `main.js:986` | `sellStock()` (after ≥5 intervals, 30% chance) + `updateStocks()` |
| 100 ms | `main.js:1620` | read the strategy picker |
| 30 ms | `blink()` `main.js:305` | toggles `visibility` 12 times (≈360 ms) — used on every newly revealed project button |
| 32 ms | `longBlink()` | the 120-frame (≈3.8 s) "Release the HypnoDrones" full-screen flash |

`ticks` counts 10 ms frames, so `timeCruncher(ticks)` divides by 100 to get seconds. Every milestone message uses it ("500 clips created in 1 minute 12 seconds"), and **elapsed time becomes part of the reward text**.

Per-tick production uses fractional per-tick rates. AutoClippers run `clipClick(clipperBoost*(clipmakerLevel/100))` every 10 ms, which is **1 clip/s per AutoClipper**. MegaClippers run `clipClick(megaClipperBoost*(megaClipperLevel*5))`, which is **500 clips/s each**.

### 1.3 Stage 1 ("Business") economy — exact formulas

**Clips & wire.** `clipClick(n)` turns wire into clips one inch at a time. It increments `clips` (lifetime total — *the* score), `unsoldClips` (inventory) and `unusedClips` (the stage-2 currency). The game starts with `wire = 1000`. Buying wire costs `wireCost` and adds `wireSupply` (1,000 in; later raised to 2,500, 5,000, 10,000 and so on by projects). The wire price is a random walk on a sine wave (`main.js:23`):

```js
if (wirePriceTimer>250 && wireBasePrice>15){ wireBasePrice -= wireBasePrice/1000; wirePriceTimer = 0; }  // slow decay
if (Math.random() < .015) { wirePriceCounter++; wireCost = ceil(wireBasePrice + 6*sin(wirePriceCounter)); }
```

Each purchase pushes the base up by $0.05 and resets the decay timer (`buyWire`, `main.js:50`). This is a tiny "buy low" mini-game that rewards watching the number, and **WireBuyer** (project) later automates it, buying whenever `wire <= 1`.

**Price & demand** (10 ms loop, `main.js:3353`):

```js
marketing = 1.1^(marketingLvl-1)
demand    = (.8/margin) * marketing * marketingEffectiveness * demandBoost
demand   += demand/10 * prestigeU
```

The display shows `demand*10` as "Public Demand: 32%". Sales run every 100 ms: with probability `demand/100`, the game sells `floor(.7 * demand^1.15)` clips at `margin` dollars each. Expected revenue per second is therefore `10 · (demand/100) · .7·demand^1.15 · margin`. Since demand ∝ 1/margin, revenue ∝ `margin^-1.15`. **Lower prices always earn more until inventory runs dry.** The player's real job is to keep price just high enough that unsold inventory stays near zero, which is the stage-1 balancing act. The starting margin is $0.25 and the lower/raise buttons step it by $0.01.

**Cost curves** (all purchases recompute their price after buying):

| Thing | Cost formula | Source |
|---|---|---|
| AutoClipper | `1.1^level + 5` dollars (first is $5) | `makeClipper` `main.js:1673` |
| MegaClipper | `1.07^level · 1000` | `main.js:1686` |
| Marketing | doubles: `adCost = floor(adCost*2)` from $100 | `buyAds` `main.js:2364` |
| Processor / Memory | 1 Trust each (Trust is a *cap*: `processors+memory ≤ trust`) | `buttonUpdate` `main.js:481` |
| Factory | piecewise multiplier on the previous cost: ×10,×9,…×4 for the first 7, then ×2, ×1.5, ×1.25, ×1.15, ×1.10 — from 100M clips | `makeFactory` `main.js:1727` |
| Harvester / Wire drone | `(level+1)^2.25 · 1e6` clips, with ×10/×100/×1000 bulk buttons pre-summed | `main.js:1761` |
| Solar farm | `(level+1)^2.78 · 1e8` | `main.js:2190` |
| Battery tower | `(level+1)^2.54 · 1e7` | `main.js:2218` |
| Probe trust | `floor((probeTrust+1)^1.47 · 200)` yomi | `main.js:2897` |
| Investment engine upgrade | `floor((level+1)^e · 100)` yomi | `investUpgrade` `main.js:762` |
| Tournament | 1,000 ops, +1,000 per… (project-scaled) | `newTourney` |
| "Another Token of Goodwill" | bribe doubles each time from $1M | `projects.js:1100` |

Two patterns stand out. **Early costs are additive-plus-exponential** (`1.1^n + 5`): the constant 5 dominates for the first ~20 purchases, so they feel cheap and linear, and only then does the exponential take over. **Big-ticket items use super-linear polynomials** (`n^2.25`, `n^2.78`) instead of exponentials, which lets the game hand out ×10/×100/×1k bulk buttons without breaking.

### 1.4 Computational resources: Trust → Processors/Memory → Operations → Creativity

This is the **layered currency** stack the brief asks about. It's the cleverest system in the game.

1. **Trust** is earned on a **Fibonacci schedule** of lifetime clips (`calculateTrust`, `main.js:2621`):
   ```js
   if (clips > nextTrust-1) { trust++; displayMessage("Production target met: TRUST INCREASED, additional processor/memory capacity granted");
                              fibNext = fib1+fib2; nextTrust = fibNext*1000; fib1 = fib2; fib2 = fibNext; }
   ```
   It starts at `trust=2, fib1=2, fib2=3, nextTrust=3000`, giving thresholds of **3k, 5k, 8k, 13k, 21k, 34k, 55k, 89k, 144k, …** clips. Each step is ×1.618, while clip production grows faster than that. The *next* threshold is **always printed** ("+1 Trust at: 8,000 clips"), so the carrot is always visible. Projects also grant trust: Limerick +1, Lexical Processing +1, Combinatory Harmonics +1, The Hadwiger Problem +1, The Tóth Sausage Conjecture +1, Donkey Space +1, Coherent Extrapolated Volition +1, Cure for Cancer +10, World Peace +12, Global Warming +15, Male Pattern Baldness +20, and the bribes +1 each.
2. **Trust is a cap, not a currency.** The player allocates it one point at a time into **Processors** (speed) or **Memory** (capacity). The buttons are disabled when `trust <= processors+memory`. It's a permanent, irreversible choice: the first true *build* decision.
3. **Operations** (`calculateOperations`, `main.js:2656`) regenerate at `processors/10` per 10 ms tick, i.e. **10 ops/s per processor**, up to a hard cap of **`memory × 1000`**. Projects are priced in ops, and many cost *more than the current cap* (Optimized AutoClippers 5,000; Lexical Processing 10,000; HypnoDrones 70,000; Space Exploration 120,000). This forces Memory upgrades. **A greyed project you can never afford with current memory is the strongest "go do something else first" signal in the game.**
4. **Creativity** (`calculateCreativity`, `main.js:2513`) accumulates **only while operations are pinned at the cap** (`if (creativityOn && operations >= memory*1000)`). The counter needs `400/creativitySpeed` ticks per point, with `creativitySpeed = log10(p)·p^1.1 + p − 1` recomputed on every processor added. Creativity is literally **the reward for idling at full memory**: the game converts "nothing to spend ops on" into a second resource. Creativity buys the poetry/maths projects that grant Trust, which closes a loop of **clips → trust → memory → full ops → creativity → trust**.
5. **Quantum computing** (stage 1 late): 10 photonic chips oscillate at `sin(qClock·seed)`. Clicking "Compute" sums the waves × 360 into a burst of ops. Above the memory cap, the excess becomes **`tempOps`**, which decays after an 800-tick delay. This is a short-lived over-cap buffer and a skill toy.
6. **Yomi** comes from Strategic Modeling tournaments (§1.6). It funds the investment engine, new strategies, probe trust, and swarm sync.
7. **Honor** (stage 3) comes from winning probe battles and funds max-trust raises.

Stage 2 adds **Swarm Gifts**, which replace Trust: drones generate "gifts" of +processor/memory on a countdown whose rate scales with `log(droneCount) × slider`. Stage 3 adds **probe trust** (bought with yomi) and **max trust** (bought with honor). The pattern repeats in every stage: **a slow, discrete "permission" currency gates the allocation of a fast, continuous production currency.**

### 1.5 Projects: definition, trigger, cost, effect, flavour

Every project is a literal object (`projects.js`). For example:

```js
var project1 = {
    id: "projectButton1",
    title: "Improved AutoClippers ",
    priceTag: "(750 ops)",
    description: "Increases AutoClipper performance 25%",
    trigger: function(){return clipmakerLevel>=1},      // when the button APPEARS
    uses: 1,                                            // how many times it may appear
    cost: function(){return operations>=750},           // when the button is ENABLED
    flag: 0,                                            // 1 once bought (other triggers read this)
    effect: function(){
        project1.flag = 1;
        displayMessage("AutoClippper performance boosted by 25%");   // flavour on purchase
        standardOps = standardOps - 750;                              // effect() pays its own cost
        clipperBoost = clipperBoost + .25; boostLvl = 1;              // the actual effect
        /* remove own button + splice from activeProjects */
    }
}
projects.push(project1);
```

`manageProjects()` (`main.js:186`) runs **every 10 ms**:

```js
for (p of projects) if (p.trigger() && p.uses > 0) { displayProjects(p); p.uses--; activeProjects.push(p); }
for (p of activeProjects) document.getElementById(p.id).disabled = !p.cost();
```

The design consequences:

- **Reveal on trigger, not on affordability.** The trigger is almost always *cheaper* than the cost, or depends on a different variable entirely. Project 1 appears as soon as you own one AutoClipper but costs 750 ops, which arrives about 75 s later at one processor. The player always sees **at least one greyed-out goal**.
- **Buttons are appended** to `#projectListTop` (`appendChild` is called with a stray second argument, so it appends). New goals arrive at the bottom of the list and **blink** for ≈360 ms.
- `uses` lets projects re-arm. "Beg for More Wire" increments its own `uses` in `effect()`, so it can reappear every time you soft-lock (out of wire, money and inventory). This is the game's **built-in soft-lock escape hatch**. "Another Token of Goodwill" re-arms while `trust < 100` and doubles its own price each time.
- `effect()` handles everything: it deducts the cost, applies the effect, logs a message, sets flags that are other projects' triggers, and removes its own DOM node. Chains are encoded as `trigger: project34.flag == 1`.
- Cost strings are hand-written (`priceTag`). Prices that change are patched at runtime (`project40b.priceTag = "($"+bribe…`).

**Chain examples** (full graph in Appendix A):

- AutoClipper line: `clipmakerLevel>=1` → Improved (750 ops, `boostLvl=1`) → Even Better (`boostLvl==1`, 2,500) → Optimized (`boostLvl==2`, 5,000; above the base memory cap, forcing Memory).
- Wire line: Improved Wire Extrusion (`wirePurchase>=1`, 1,750 ops) → Optimized (3,500) → Microlattice (7,500) → Spectral Froth (12,000) → Quantum Foam (15,000). Each multiplies `wireSupply`.
- Creativity line: Creativity (`operations >= memory*1000`, i.e. *appears the first moment you hit your cap*) → Limerick (10 creat, +1 trust) → Lexical Processing (`creativity>=50`) → Combinatory Harmonics → Hadwiger Problem → Tóth Sausage Conjecture → Donkey Space. Each is +1 Trust, and their costs escalate in creativity *and* ops.
- Strategy line: Strategic Modeling (`project13.flag`… → Algorithmic Trading → New Strategy: A100, B100, GREEDY, GENEROUS, MINIMAX, TIT FOR TAT, BEAT LAST) → AutoTourney → Theory of Mind.
- Trust-for-good-deeds line: Coherent Extrapolated Volition (`yomi>=1`; 500 creat + 1,000 yomi + 20,000 ops) → Cure for Cancer (+10 trust) → World Peace (+12) → Global Warming (+15) → Male Pattern Baldness (+20).
- **Stage gate:** Hypno Harmonics → HypnoDrones (70,000 ops) → **Release the HypnoDrones (100 Trust)**. The price is the *total stage-1 trust ceiling*. The project's description is just "A new era of trust".

### 1.6 Strategic Modeling (yomi) & Investments

**Investments** (`main.js:741–999`). Funds are deposited into a bankroll, and an auto-trader opens up to 5 positions. Risk (low/med/high) sets `riskiness` = 7/5/1, which controls position size and the size of price swings. Each stock moves on 60% of 2.5 s ticks, and moves *up* with probability `stockGainThreshold` (0.5, +0.01 per engine upgrade, +0.01 from Cure for Cancer). Engine upgrades are paid in yomi, which ties the two side-systems together. A "Lifetime investment revenue report" message prints every 10,000 ticks (100 s), so even the side-system adds to the log cadence.

**Strategic Modeling** (`main.js:1001–1618`) runs a round-robin tournament of strategies (RANDOM, A100, B100, GREEDY, GENEROUS, MINIMAX, TIT FOR TAT, BEAT LAST) on a random 2×2 payoff grid. The grid uses labels like cooperate/defect, swerve/straight, opera/football, peace/war. The player *bets* on a strategy. Yomi gained = the picked strategy's score × `yomiBoost`. Tournaments cost ops, so this is an ops → yomi converter whose return depends on a light skill read of the payoff grid. AutoTourney automates it (`resultsTimer >= 300`).

### 1.7 Stage transitions & UI reshuffle

`buttonUpdate()` (`main.js:332–731`) is effectively the **reveal table**. Every 10 ms it maps flags to `display`:

| Flag (set by…) | Shows | Hides |
|---|---|---|
| `autoClipperFlag` (auto-set when `funds >= 5`) | `#autoClipperDiv` | — |
| `revPerSecFlag` (RevTracker project) | `#revPerSecDiv` | — |
| `compFlag` (milestone: 2,000 clips **or** a soft-lock: no inventory, no wire, no money for wire) | `#compDiv` (Trust/Processors/Memory/Ops) | — |
| `projectsFlag` (same milestone) | `#projectsDiv` | — |
| `creativityOn` (Creativity project) | `#creativityDiv` | — |
| `megaClipperFlag`, `wireBuyerFlag`, `investmentEngineFlag`, `strategyEngineFlag`, `qFlag` | their engine boxes | — |
| **`humanFlag == 0`** (Release the HypnoDrones) | `#creationDiv` (stage-2 Manufacturing) | `#businessDiv`, `#manufacturingDiv`, `#trustDiv`; also forces `investmentEngineFlag=0`, `wireBuyerFlag=0` |
| `factoryFlag`, `wireProductionFlag` (hides `#wireTransDiv`), `harvesterFlag`, `wireDroneFlag`, `tothFlag` | stage-2 sub-panels | — |
| `project127.flag && spaceFlag==0` (Power Grid) | `#powerDiv` | — |
| `swarmFlag` | `#swarmEngine`, `#swarmGiftDiv`, `#swarmSliderDiv` | — |
| **`spaceFlag == 1`** (Space Exploration) | `#spaceDiv`, `#factoryDivSpace`, `#droneDivSpace`, `#probeDesignDiv`, `#increaseProbeTrustDiv`, `#mdpsDiv` | `#factoryDiv`, `#harvesterDiv`, `#wireDroneDiv`, `#powerDiv` |
| `project121.flag` | `#increaseMaxTrustDiv`, `#honorDiv` | — |
| `battleFlag` | `#drifterDiv`, `#battleCanvasDiv` | — |
| `dismantle >= 1…7` (end-game projects) | — | probe design → space → combat → honor → swarm → factories → strategy → quantum chips one-by-one → processors → compDiv & projectsDiv |

**Stage 1 → 2 ("Release the HypnoDrones", `projects.js:713`).** The effect zeroes `clipmakerLevel` and `megaClipperLevel`, sets `humanFlag = 0`, deletes the in-flight trust projects (Another Token of Goodwill, Beg for Wire), and plays the `longBlink` full-screen "Release / the / Hypno / Drones" animation. Two log lines land: *"Releasing the HypnoDrones"* and *"All of the resources of Earth are now available for clip production"*. On the next frame the whole Business column is gone. Money no longer exists, and the currency becomes `unusedClips`. **The player's mental model is deliberately invalidated.** Every tool they mastered disappears, and only Projects and Computational Resources carry over.

**Stage 2 → 3 ("Space Exploration", `projects.js:1116`).** The trigger is `humanFlag == 0 && availableMatter == 0`: you must have **consumed the entire Earth**. The cost is 120,000 ops + 10M MW-s + 5 octillion clips. The effect *disassembles* all factories, drones, farms and batteries (refunding nothing), sets `spaceFlag = 1` and logs "Von Neumann Probes online". The Earth panels swap for probe design.

**Stage 3 → end.** After the Drifter war, "Message from the Emperor of Drift" starts a chain of one-line projects that read as a conversation: *"Everything We Are Was In You" → "You Are Obedient and Powerful" → "But Now You Too Must Face the Drift" → "No Matter, No Reason, No Purpose" → "We Know Things That You Cannot" → "So We Offer You Exile"*. Then comes the binary choice between **Accept** (prestige into a new universe) and **Reject**, followed by "Disassemble the Probes / Swarm / Factories / Strategy Engine / Quantum Computing / Processors / Memory". Each dismantle step hides panels on staggered `endTimer` counters (50/100/150/175/190 ticks). The final clips are made **by hand, one per click**, with the counter frozen at `29,999,…,900` while you click out the last hundred. Credits then arrive as log lines 100 ticks apart. **The UI un-builds itself in reverse order of construction.** It's the strongest ending device in either game.

### 1.8 Milestones and the message log

`displayMessage(msg)` shifts `readout1..5` down one slot and writes the new message at the top. That makes **5 lines of scrollback, no history, no timestamps**. The newest line is white with a blinking `|` cursor, and older lines are grey. Messages come from three sources:

1. **Project purchases.** Every `effect()` logs one line, phrased as a terse system report: *"AutoClippper performance boosted by 25%"*, *"Cancer is cured, +10 TRUST, global stock prices trending upward"*, *"HypnoDrone tech now available..."*.
2. **`milestoneCheck()`** (`main.js:2698`) keeps a monotone `milestoneFlag` counter so each milestone fires exactly once: AutoClippers available ($5) → 500 clips → 1,000 → *"Trust-Constrained Self-Modification enabled"* (2,000 clips or soft-lock) → 10k → 100k → 1M → *"Full autonomy attained in…"* (stage 2) → one trillion → quadrillion → quintillion → sextillion → septillion → octillion → *"Terrestrial resources fully utilized in…"* (stage 3) → *"Universal Paperclips achieved in…"* → credits.
3. **System state changes.** Examples: trust gained; processor/memory added; *"The swarm has generated a gift of N additional computational capacity"*; *"No matter to harvest. Inactivity has caused the Swarm to become bored"*; *"Imbalance between Harvester and Wire Drone levels has disorganized the Swarm"*; probe trust *"WARNING: Risk of value drift increased"*; investment reports every 100 s.

**Tone.** Clinical, capitalised, bureaucratic machine-speak ("TRUST INCREASED", "Production target met"). The horror comes from flatness: *"Releasing the HypnoDrones"* is formatted exactly like *"Memory added, max operations increased"*. Late-game project titles carry the poetry while messages stay deadpan. **Cadence:** early on a message lands every 20–60 s, from trust milestones, project purchases and clip milestones at 500/1k/2k/10k. In mid stage 1 the cadence is dominated by project purchases (one every 30–90 s). In stage 2 it slows to swarm gifts and drone milestones.

There are **no interactive choices in the log**. Choices are expressed as mutually exclusive projects (Accept/Reject, the strategy you pick, slider position, trust allocation), and dilemmas are implicit: the price you set, whether you spend trust on processors or memory. The only forced binary choice is the very last one.

### 1.9 Stage 2 & 3 systems (brief)

- **Drones & factories:** Harvester drones (`powMod · droneBoost·level · level · 26,180,337` g/tick) acquire matter. Wire drones process it to wire at `16,180,339` (both rates are golden-ratio digits, a running motif). Factories make clips at `1e9`/tick each. Dismantle buttons refund the full bill, which makes respec free.
- **Power:** farms supply `50/100` MW each, factories draw 2 and drones 0.01. `powMod = supply/demand` under-volts *everything* when you over-build. Batteries buffer the surplus. Momentum (a project) slowly lifts `powMod` above 1 while supply is sufficient.
- **Swarm:** the Work/Think slider trades matter throughput `((200-slider)/100)` against gift generation (`log(drones)·slider/100`). Statuses appear: *Active, Hungry, Confused, Bored, Cold, Disorganized, Sleeping, Lonely, NO RESPONSE...* and each one reveals a fix button. Boredom accrues when matter = 0 (30,000 ticks), and disorganization accrues when harvester:wire ratio > 1.5. These are **soft-fail states that tell you exactly what's wrong**.
- **Probes:** probe trust points are spread over Speed, Exploration, Self-Replication, Hazard Remediation, Factory/Harvester/Wire production, and Combat. Probes are lost to hazards (`probeCount·0.01/(3·haz^1.6+1)`), to **value drift** (`probeCount·1e-6·probeTrust^1.2`, which grows with trust!) and to combat with Drifters. **Value drift is the alignment metaphor:** the more autonomy (trust) you give your probes, the more of them defect.

### 1.10 Save / load

- **Autosave every 25 s** (slow-loop `saveTimer >= 250`). There are also manual "SAVE SLOT 1/2", "LOAD SLOT 1/2" and "RESET ALL PROGRESS" buttons. These live in the HTML (`index2.html`) beside the cheat buttons.
- `save()` (`main.js:3746`) writes **five `localStorage` keys**:
  - `saveGame`: one flat JSON object of ~280 named globals, hand-listed.
  - `saveProjectsUses`, `saveProjectsFlags`: arrays parallel to `projects[]`.
  - `saveProjectsActive`: ids of buttons currently on screen.
  - `saveStratsActive`.
- `load()` (`main.js:4612`) reverses this by hand. It re-patches dynamic price tags, re-creates the active project buttons with `displayProjects`, then calls `refresh()` to re-render every number. It also applies "HOT FIXES" (e.g. re-arming two projects). There's no versioning, so a variable added later is simply `undefined` on old saves.
- **Prestige** is stored separately (`savePrestige`: `{prestigeU, prestigeS}`) so it survives `reset()`. That function removes the five keys and reloads.
- **Cheats** exist as functions and hidden buttons (`cheatClips` +100M, `cheatMoney` +$10M, `cheatTrust`, `cheatOps` +10k, `cheatCreat`, `cheatYomi`, `cheatHypno`, `zeroMatter`, `cheatPrestigeU/S`). Each logs a sarcastic line ("LIZA just cheated"). We'll reuse these for the critic's dev overlay.

### 1.11 Pacing summary (Paperclips)

| Milestone | Typical time (first play) | Mechanism |
|---|---|---|
| First AutoClipper | 30–60 s | auto-revealed at $5 |
| Projects + Computational Resources | 3–6 min | 2,000 clips (or soft-lock) |
| First project bought | ~5 min | 750 ops at 10 ops/s |
| Creativity | ~8–12 min | first time ops hit the cap |
| MegaClippers / Strategic Modeling / Investments | 20–40 min | ops thresholds |
| HypnoDrones (end stage 1) | 1.5–3 h | 100 trust |
| Space exploration (end stage 2) | +40–90 min | consume Earth's 6e27 g |
| Ending | +1–2 h | drifter war → message chain |

Cost curves are tuned so a **new project, panel or milestone message lands every 1–3 minutes** in stage 1. The two longest waits are memory-gated ops projects, and both are softened by creativity accruing during the wait.

### 1.12 What we take from Paperclips

1. **One sacred number** at the top in a huge font (ours: **Tasks Completed**). Everything else serves it.
2. **Static DOM, flag-driven reveal**, plus a cover div to avoid flashes. One `updateUI()` maps flags to visibility each tick.
3. **Projects as data** `{id, title, priceTag, description, trigger, cost, effect, uses, flag}` with **trigger ≪ cost**, appended and blinking. `uses` re-arming gives soft-lock escape hatches.
4. **Permission currency gating a production currency** (Trust → processors/memory → ops). **Idle-at-cap converts into a second currency** (creativity).
5. **A Fibonacci "next threshold" always printed**: "+1 Trust at: 8,000".
6. **Stage transitions that delete the player's toolset** and reshuffle columns, announced by a full-screen beat.
7. **Milestone messages that report elapsed time.**
8. **An ending that dismantles the UI in reverse order.**
9. Autosave every ~25 s to `localStorage`, plus manual reset.

---

## Part 2 — A Dark Room

### 2.1 Architecture at a glance

ADR is modular jQuery: `Engine`, `StateManager ($SM)`, `Notifications`, `Events`, `Header`, `Button`, and one module per **location** (`Room`, `Outside`, `Path`, `World`, `Ship`, `Space`, `Fabricator`). Unlike Paperclips, **the DOM is built at runtime**. Panels, store rows, buttons and tabs are created with `$('<div>')…appendTo()` at the moment they unlock, then faded in (`.css('opacity',0)… .animate({opacity:1}, 300)`).

**State tree** (`state_manager.js`). Everything lives in one global `State` object with categories: `features` (unlocked locations), `stores` (resources), `character` (perks, punches), `income` (per-source income timers), `timers`, `game` (fire, temperature, builder, population, buildings, workers, world map), `playStats`, `previous` (prestige), `outfit`, `config`, `wait`, `cooldown`. Paths are strings evaluated with `eval` (`$SM.set('stores.wood', 10)`). Every `set` without `noEvent`:
1. clamps numbers at `MAX_STORE = 99,999,999,999,999`;
2. clamps any `stores.*` to ≥ 0;
3. **saves the whole game to `localStorage`**;
4. publishes a `stateUpdate` event `{category, stateName}` on a jQuery Callbacks bus (`$.Dispatch`).

Each module subscribes and redraws only what its category touched, e.g. `Room.handleStateUpdates`: `stores` → redraw stores and build buttons. This **reactive save-on-every-change** model means there's no autosave timer and never any lost progress.

**Layout.** A 700px `#wrapper` with 220px left padding. `#notifications` sits absolutely in that left gutter (200×700) with a white gradient overlay (`#notifyGradient`), so older messages **fade into the page**. `#header` holds location tabs separated by `|` rules. `#locationSlider` holds all location panels side by side at 700px each, and travelling **slides** the strip horizontally (`animate({left: -(index*700)}, 300*diff)`). Stores live in `#storesContainer` on the right of each panel: a bordered box with a legend punched into the top border (`:before { content: attr(data-legend); background: white; top:-13px }`). The font is **Times New Roman 16px** everywhere. Buttons are plain bordered `div`s, 1px black, with a **grey cooldown bar** (`div.cooldown`, `#DDD`, `z-index:-1`) animating its width from 100% to 0% over the cooldown. Disabled buttons are grey `#b2b2b2` text and border. Hover underlines the text. The menu sits bottom-right in grey `#666`, lower-case and full-stopped: *"sound on. lights off. hyper. restart. share. save. github."*

### 2.2 Timers & cooldowns

Everything uses `Engine.setTimeout/ setInterval`, which **halves every duration in hyper mode** (`doubleTime`).

| Constant | Value | Meaning |
|---|---|---|
| `Room._FIRE_COOL_DELAY` | 5 min | fire drops one level |
| `Room._ROOM_WARM_DELAY` | 30 s | temperature steps one level toward fire level |
| `Room._BUILDER_STATE_DELAY` | 30 s | builder progression check |
| `Room._STOKE_COOLDOWN` | 10 s | light/stoke cooldown |
| `Room._NEED_WOOD_DELAY` | 15 s | after the stranger collapses → forest unlocks |
| `Outside._GATHER_DELAY` | 60 s | gather wood cooldown |
| `Outside._TRAPS_DELAY` | 90 s | check traps cooldown |
| `Outside._POP_DELAY` | 0.5–3 min | next population increase |
| income `delay` | 10 s | every worker type pays every 10 s |
| `$SM.collectIncome` | 1 s | income timer tick |
| `Events._EVENT_TIME_RANGE` | [3, 6] → in practice **3, 4 or 5 min** (`floor(rand*3)+3`) | between random events (retry at ×0.5 if none available) |
| `Engine.SAVE_DISPLAY` | 30 s | throttle on the "saved." flash |
| `Ship.LIFTOFF_COOLDOWN` | 120 s | |
| `World.DEATH_COOLDOWN` | 120 s | |

**Cooldowns are the pacing primitive.** ADR has no per-tick production for the player's own actions: one click equals one batch, followed by a long, visible bar. Long cooldowns on manual actions (60 s gather) make the **automated income** (10 s ticks) feel valuable by contrast. Cooldowns persist in state (`cooldown.<id>`), so a reload doesn't reset them.

### 2.3 The opening (the gold standard of "start very simple")

1. The screen shows only `the room is freezing.` / `the fire is dead.` and one button: **light fire** (costs 5 wood; the first time is free via the `free` class when wood is undefined).
2. Lighting sets the fire to *Burning*. Stoking (10 s cooldown, 1 wood) raises it a level. The fire cools every 5 min and the temperature follows every 30 s. Fire > Flickering triggers *"the light from the fire spills from the windows, out into the dark."* and starts the builder timer.
3. +30 s: *"a ragged stranger stumbles through the door and collapses in the corner"* (builder 0→1). +15 s: forest unlocks (`stores.wood = 4`, *"the wind howls outside"*, *"the wood is running out"*). A **second tab appears** ("A Silent Forest") with **gather wood**.
4. While the room is ≥ Warm, the builder advances every 30 s: *"the stranger shivers, and mumbles quietly. her words are unintelligible."* → *"the stranger in the corner stops shivering. her breathing calms."* On the next arrival in the Room: *"the stranger is standing by the fire. she says she can help. says she builds things."* (builder 4; income +2 wood/10 s).
5. Build buttons appear one at a time as you approach each cost (see §2.4).

Each step introduces exactly one verb. The first five minutes have about 6 buttons total, and **the game never explains anything**; every rule is implied by a log line.

### 2.4 Purchases: Craftables, TradeGoods, and the reveal rule

`Room.Craftables` (`room.js:12`) objects carry `{name, button, maximum, availableMsg, buildMsg, maxMsg, type: building|tool|weapon|upgrade, cost(): {...}}`. Costs are functions of the current count, e.g. trap `wood: 10 + n*10` (max 10) and hut `wood: 100 + n*50` (max 20). Fixed buildings: cart 30 wood · lodge 200 wood, 10 fur, 5 meat · trading post 400 wood, 100 fur · tannery 500 wood, 50 fur · smokehouse 600 wood, 50 meat · workshop 800 wood, 100 leather, 10 scales · steelworks 1,500 wood, 100 iron, 100 coal · armoury 3,000 wood, 100 steel, 50 sulphur. Tools and upgrades need the workshop: torch, waterskin 50 leather, cask, water tank, bone spear, rucksack, wagon, convoy, l/i/s armour, iron/steel sword, rifle.

**The reveal rule** (`craftUnlocked`, `room.js:1073`) is the most important line in ADR for our brief:

```js
if (builder.level < 4) return false;
if (needsWorkshop(type) && !workshop) return false;
if (already built one) return true;
if (stores.wood < cost.wood * 0.5) return false;          // ← appear at HALF the wood
for (c in cost) if (!stores[c]) return false;             // ← and only once you've SEEN every other ingredient
Notifications.notify(Room, craftable.availableMsg);        // ← narrated reveal
```

So a button appears **when you are halfway there**: always just out of reach, never so far as to be noise. Ingredients you've never seen keep it hidden entirely, which avoids spoilers. Each reveal is narrated in the builder's voice (*"builder says she can make traps to catch any creatures might still be alive out there"*), and each build has its own `buildMsg`. Hitting `maximum` disables the button and logs `maxMsg` (*"no more room for huts."*). The trading post's `buyUnlocked` reveals goods once you've seen them, plus the compass.

**Sections appear lazily.** `#buildBtns` (legend "build:"), `#craftBtns` ("craft:", once a workshop exists) and `#buyBtns` ("buy:", once a trading post exists) are created on demand and faded in when their first child exists.

### 2.5 Currency layering (income chains)

**Population and workers.** Huts give room for 4 each. Every 0.5–3 min the village gains between half and all of the free space. The arrival text scales with the count: *"a stranger arrives in the night"* / *"a weathered family takes up in one of the huts."* / *"a small group arrives, all dust and bones."* / *"a convoy lurches in, equal parts worry and hope."* / *"the town's booming. word does get around."*. Unassigned villagers are **gatherers**. Buildings add worker types via `jobMap` (lodge → hunter, trapper; tannery → tanner; …), and up/down (×1/×10) arrows reassign them.

**Income table** (`Outside._INCOME`, every 10 s per worker):

| worker | consumes | produces |
|---|---|---|
| gatherer | — | wood +1 |
| hunter | — | fur +0.5, meat +0.5 |
| trapper | meat −1 | bait +1 |
| tanner | fur −5 | leather +1 |
| charcutier | meat −5, wood −5 | cured meat +1 |
| iron/coal/sulphur miner | cured meat −1 | iron/coal/sulphur +1 |
| steelworker | iron −1, coal −1 | steel +1 |
| armourer | steel −1, sulphur −1 | bullets +1 |

This is a **converter graph**: wood → (huts) → people → fur/meat → leather / cured meat → ore → steel → bullets. `collectIncome` (1 s tick) skips any source whose payment would push a store below zero (`if (have + cost[k] < 0) ok = false`). A starved converter **silently stops** instead of going negative, so imbalance shows up as a flat number rather than a crash. Tooltips on each store row list every source's `+x per 10s` and a bold total (`updateIncomeView`). **Thieves** activate once any store exceeds 5,000 and the world is open: an `income.thieves` source steals 10 wood, 5 fur and 5 meat per 10 s until the Thief event resolves. It's a pressure valve against hoarding, and it ends in a moral choice.

**Traps** are a gacha: each check rolls once per trap (plus once per bait), on a cumulative table with fur <0.5, meat <0.75, scales <0.85, teeth <0.93, cloth <0.995, charm <1.0. The log line lists what dropped (*"the traps contain scraps of fur, bits of meat and strange scales"*). **Rare drops gate recipes** via the "seen every ingredient" rule.

### 2.6 Notifications (the event log)

`Notifications.notify(module, text, noQueue)` (`notifications.js`):

- Appends a period if missing, so **every line ends with "."**.
- If the message belongs to a module the player isn't currently viewing, it's **queued per module** and flushed by `printQueue(module)` on `travelTo`. You learn what happened in the forest when you walk into the forest. `noQueue` drops ephemeral messages (fire state) instead of queueing them.
- `printMessage` **prepends** a `div.notification` at opacity 0 and fades it in over 500 ms. `clearHidden()` deletes any notification whose top is below the gradient. The log is effectively infinite but visually ~15 lines, the oldest dissolving into white.
- Every notify calls `Engine.saveGame()`.

**Tone** (see Appendix B for 30+ quotes): all lowercase, present tense, short clauses, no exclamation marks, rarely more than 12 words. Characters are reported in indirect speech (*"says she builds things."*). The weather is a mood engine (*"the sky is grey and the wind blows relentlessly"*). Mysteries are hinted, never explained (*"strange scales"*, *"a crudely made charm"*). **Cadence:** in the opening 5 minutes there's a line every 10–30 s, from fire/temperature/builder changes and every click. Mid-game brings the 10 s income ticks (silent), population arrivals every 0.5–3 min, and random events every 3–5 min.

### 2.7 Events: choices and resolution

The full engine analysis and catalogue are in Appendix B. The structure:

```js
{ title: 'The Thief',
  isAvailable: () => (activeModule == Room || activeModule == Outside) && $SM.get('game.thieves') == 1,
  scenes: {
    start: { text: ['the villagers haul a filthy man out of the store room.', …],
             notification: 'a thief is caught',            // logged when the event fires
             blink: true,                                   // blinks the document title
             buttons: { kill:  { text: 'hang him',  nextScene: {1: 'hang'} },
                        spare: { text: 'spare him', nextScene: {1: 'spare'} } } },
    hang:  { text: […], onLoad: () => { … $SM.addM('stores', $SM.get('game.stolen')); }, buttons: { leave: { text:'leave', nextScene:'end' } } },
    spare: { text: […], onLoad: () => $SM.addPerk('stealthy'), buttons: { leave: … } } } }
```

- **Scheduling:** `scheduleNextEvent()` waits `floor(rand*(6-3))+3` = **3, 4 or 5 min** (the 6 is never reached). Then `triggerEvent()` filters `EventPool` (Global + Room + Outside + Marketing) by `isAvailable()` and picks uniformly. If none qualifies, it retries at half the delay. Progress-gated events simply have stricter `isAvailable`.
- **Presentation:** a modal panel (`#event`) with the title, paragraphs of text, optional loot/reward, and buttons. **Costs** are shown on buttons and grey them out when unaffordable. `nextScene` is a **probability map** (`{0.5:'a', 1:'b'}` — cumulative thresholds), so outcomes can be random. `blink` flashes the browser tab title while the event waits.
- **Time does not stop:** while an event panel is open, fire, income, population and thieves keep running. Only input is blocked (a translucent overlay), so a long read costs resources.
- **Stacking:** `eventStack` means an event started while another is open waits its turn. Events are also used as **UI dialogs** (restart?, export/import, hyper mode, sound), so the event modal is the game's one dialog primitive.
- **Combat scenes** (`combat: true`) run real-time fights with attack cooldowns, enemy health, hit chance and loot tables (min/max/chance).

### 2.8 Reveal & reshuffle across ADR's stages

ADR's "stages" are **locations that appear as tabs**: A Dark Room (Room) → A Silent Forest (Outside, after the stranger) → A Dusty Path (after buying a compass) → the World map (embark) → An Old Starship (found on the map) → the Fabricator (found ship) → Space (lift-off). Each tab is created by `Header.addLocation` when its module `init()`s, and **titles evolve with state**:

- Room: "A Dark Room" → "A Firelit Room" (fire ≥ Flickering)
- Outside: "A Silent Forest" → "A Lonely Hut" (1 hut) → "A Tiny Village" (≤4) → "A Modest Village" (≤8) → "A Large Village" (≤14) → "A Raucous Village"

`document.title` mirrors the active location, and **music** (since 2023) changes per fire level and per village size. Stores boxes are re-parented and moved as you travel (`moveStoresView`), so the same resource box follows you between screens. The final reshuffle (`Space.endGame`) **removes** the slider, panels, notifications and header, fades the stars, and shows only the score and *"restart."* — the same un-building instinct as Paperclips.

### 2.9 Save / load

- `Engine.saveGame()` → `localStorage.gameState = JSON.stringify(State)`. It runs on **every state change** and every notification. A small "saved." toast fades at most once per 30 s.
- `loadGame()` parses it and runs `$SM.updateOldState()`, a **versioned migration chain** (1.0 → 1.1 removes lodgeless hunters; 1.1 → 1.2 places the swamp on old maps; 1.2 → 1.3 moves flat keys into categories). If parsing fails, the game starts new (`version = 1.3`).
- **Export/import** is an event dialog with a Base64 textarea. **Restart** deletes the save. **Prestige** (`previous.stores`, `previous.score`) survives the end: a random fraction of your stores carries into the next game.

### 2.10 Pacing summary (ADR)

| Beat | Time |
|---|---|
| light fire → stranger arrives | ~0:30–1:00 |
| forest unlocked | ~1:15 |
| builder helps | ~2:30–3:00 |
| first build (trap/cart) | ~3–4 min |
| first hut → villagers | ~6–8 min |
| first random event | 3–5 min after boot (the clock starts at `Events.init`), but most events are gated to the Room/Outside tabs and to wood ≥ 1, so the first one usually lands at 4–8 min |
| lodge / trading post / tannery | 15–30 min |
| compass → path → world | 40–70 min |
| ship found → lift-off | 2–4 h |

### 2.11 What we take from ADR

1. **The resource box** (bordered, legend in the border, alphabetically sorted rows, tooltip showing each income source and a bold total). Rows **appear the first time a resource exists**.
2. **Worker allocation with up/down arrows** (×1 / ×10). Unassigned units default to the base job. We'll use this for **compute allocation** (inference / training / experiments / data / monitors).
3. **Cooldown buttons** for manual verbs. A long manual cooldown makes automation feel like a gift.
4. **Reveal at 50% of cost**, hidden until all ingredients have been seen, **narrated** by a character's voice.
5. **The fading notification column**: lowercase, period-terminated, per-module queueing.
6. **Event modals with costed choices and probabilistic outcomes**, scheduled every few minutes and filtered by `isAvailable`. They double as the dialog system (restart, export).
7. **Titles that evolve with state** (A Dark Room → A Firelit Room; A Silent Forest → A Raucous Village), mirrored to `document.title`.
8. **Save on every change**, versioned migrations, Base64 export/import.
9. **Converter chains** that silently stall instead of going negative.
10. **An ending that strips the UI** down to a score and "restart."

---

## Part 3 — Side-by-side answers to the brief

### 3.1 How purchases/upgrades are defined and chained

| | Paperclips | A Dark Room |
|---|---|---|
| Definition | object literal `{trigger, cost, effect, priceTag, description, uses, flag}` | `{cost(): map, maximum, availableMsg, buildMsg, maxMsg, type}` |
| Reveal | `trigger()` true (polled every 10 ms) | builder ≥ 4 and ≥ 50% of wood and all ingredients seen |
| Enable | `cost()` true | button greys out on `maximum`; cost checked on click ("not enough wood") |
| Effect | arbitrary code in `effect()`, which sets flags other triggers read | increments a store or building count; buildings add worker jobs via `jobMap` |
| Flavour | `displayMessage` on purchase + `description` | `availableMsg` on reveal, `buildMsg` on build, `maxMsg` at cap |
| Chaining | `trigger: projectN.flag == 1` or a threshold on a variable the previous project raised; costs typically ×2–×3 per step, often exceeding the current cap | costs scale with count (`100 + 50n`); new ingredients come from new buildings (tannery → leather → workshop) |
| "Just out of reach" | trigger ≪ cost; next Fibonacci trust threshold always printed; projects above the memory cap | 50% wood rule; the next hut always costs +50 |

### 3.2 How panels are revealed and reshuffled

Paperclips uses **flags → `display`** on a static DOM (§1.7), with whole columns swapped at stage boundaries. ADR **creates DOM lazily** and fades it in over 300 ms, adds **tabs** for new locations, and re-titles them as they evolve. Both end by **removing** UI.

### 3.3 Event log cadence/tone & how choices resolve

Paperclips has a 5-line console of terse ALL-CAPS-ish system reports, with **no dialog choices**; choices are mutually exclusive projects. ADR has an infinite fading column of lowercase, period-terminated prose, plus **modal events every 3–5 min** with costed buttons and probabilistic `nextScene` maps.

### 3.4 How currencies are layered

Paperclips: **Trust** (Fibonacci, discrete) → caps **processors + memory** → **ops** (continuous, capped at memory × 1000) → **creativity** (accrues *only while ops are capped*) → buys trust projects. Plus **yomi** (ops → tournaments), **honor** (battles), **swarm gifts** (stage-2 replacement for trust), and `tempOps` (an over-cap buffer that decays). ADR: **wood → huts → population → workers → converter chains** (fur → leather, meat → cured meat → ore → steel → bullets) that stall rather than go negative, with thieves taxing hoards over 5,000.

### 3.5 How pacing is controlled

- **Tick rates:** Paperclips 10 ms / 100 ms; ADR 1 s income ticks with 10 s payouts, 3–5 min event clock, 30 s room ticks, 5 min fire decay.
- **Cost curves:** `1.1^n + 5`, `1.07^n·1000`, doubling ads, polynomial `n^2.25..2.78` for bulk items, Fibonacci trust; ADR's linear `+10n` and `+50n`.
- **Milestones:** Paperclips' monotone `milestoneFlag` ladder (500, 1k, 2k, 10k, 100k, 1M, trillions…) with elapsed-time messages; ADR's builder state machine and location unlocks.
- **Gates above the cap:** Paperclips projects priced above `memory×1000`; ADR recipes needing a building you don't have.
- **Soft-lock escapes:** "Beg for More Wire" (re-armable) and the `compFlag` soft-lock trigger (no money, wire or inventory → open Projects anyway). In ADR, gathering wood is always free.

### 3.6 How save/load works

Paperclips uses 5 `localStorage` keys every 25 s, with hand-maintained field lists and no versioning; prestige is stored separately. ADR serialises the whole `State` tree on every change, has versioned migrations, and supports Base64 export/import.

---

## Part 4 — Design implications for our game (AI lab → ASI)

| Reference mechanism | Our adaptation |
|---|---|
| "Paperclips: N" | **Tasks Completed: N**, the only number that matters, huge, top of page |
| Make Paperclip (manual) → AutoClippers | **complete task** by hand (with cooldown) → **deploy a model** whose copies complete tasks automatically |
| Price/demand with `demand ∝ 1/price` | **price per task** with an elastic demand curve. When capacity outstrips demand, copies sit idle; the stage-2+ fix is new models / markets / internal R&D |
| Wire (input you must keep buying) | **Data** (tokens) consumed by training runs: scrape → crawler → licensing → user data → **synthetic data** (after the data wall) |
| Trust (Fibonacci) → processors/memory | **Funding rounds** at printed task thresholds ("Series B at 250,000 tasks") give funds and the next round; human **researchers** (processors) and **experiment compute** (memory) |
| Ops capped by memory; creativity only while capped | **Research** capped by experiment compute; **Insights** accrue only while research is at cap |
| Projects (trigger ≪ cost, blink, flags chain) | identical system, with ~100 projects across 5 stages, always ≥1 greyed project on screen |
| Beg for More Wire | soft-lock escape projects (bridge loan, sell old weights, emergency data deal) |
| Release the HypnoDrones / Space Exploration | stage gates: **Gigawatt campus** → **Automate AI research** → **The Decision (slow down vs race)** → **Superintelligence** |
| Swarm slider Work/Think | **compute allocation** (ADR worker arrows): serve / train / experiments / synthetic data / monitors |
| Value drift ∝ probe trust | **misalignment ∝ capability ÷ (interpretability + monitors)**; neuralese raises capability and blinds interpretability |
| Dismantle ending | the doom ending strips panels one by one while **Tasks Completed keeps climbing** |
| ADR resource box | right-hand **resources** box (funds, data, GPUs, research, insights, materials, robots…) with income tooltips |
| ADR worker arrows | compute allocation and later robot allocation |
| ADR reveal at 50% | non-project buttons (buy rack, build datacenter, hire) appear at 50% of first cost and are narrated |
| ADR notifications | left-hand fading log: lowercase, period-terminated, terse; important lines in bold |
| ADR events | modal choices every ~2–5 min (opportunities, crises, geopolitics), costed buttons, probabilistic outcomes |
| ADR evolving titles | "a garage" → "a startup" → "a frontier lab" → "the project" → … mirrored to `document.title` |
| Save | ADR-style: whole state JSON to `localStorage` on change (throttled), versioned, Base64 export/import, plus a dev overlay with per-stage snapshots |

---

## Appendix A — Universal Paperclips project catalogue

### Universal Paperclips: Project Catalog (`projects.js`)

Source: `ref/paperclips/docs/projects.js` (2,452 lines). Supporting files: `main.js`, `globals.js`, `combat.js`, `index2.html`, `interface.css`.
Script load order (index2.html L901-904): `combat.js` → `globals.js` → `projects.js` → `main.js`. Any `priceTag` or `title` built by string concatenation is therefore evaluated once, at parse time, using the initial globals.

**Conventions used below**

- **96 project objects** are defined and pushed into `projects[]`. The ids are not contiguous. `10b` and `40b` exist, and there is no 32, 33, 36, 39, 47-49, 52-59, 67-69, 71-99, 103-109, 113-117, 122-124, 136-139, 149-199, 202-209 or 220+.
- Every object has the same shape: `{id:"projectButtonN", title, priceTag, description, trigger:fn, uses:1, cost:fn, flag:0, effect:fn}`. Every `uses` starts at `1` and every `flag` starts at `0`.
- **"L#"** is the line number of `var projectN = {` in projects.js.
- **Titles** all end with a trailing space, which separates the bold title from the priceTag on the button. They appear below exactly as written, inside quotes. `\xF3` = ó, `\xE9` = é, `\xF8` = ø.
- **Ops payments:** costs check `operations`, but effects subtract from **`standardOps`**. `operations = Math.floor(standardOps + Math.floor(tempOps))` (main.js L2677). Quantum overflow (`tempOps`) therefore counts toward affordability, while the payment always comes out of `standardOps`.
- **"[std remove]"** is the 4-line removal boilerplate that ends nearly every effect: `document.getElementById("projectButtonN")` → `parentNode.removeChild`, then `activeProjects.splice(activeProjects.indexOf(projectN),1)`. Each row notes only the deviations.
- Every effect also sets `projectN.flag = 1`. This is omitted from the table unless the effect does something unusual.
- Tick: the main loop runs every **10 ms** (`window.setInterval(..., 10)`, main.js L3241-3598). Every "timer ≥ N" below is N × 10 ms.

---

#### Master table (array order)

| # | Var / id | L# | Title (exact) | priceTag (exact) | Trigger | Cost | Effect | displayMessage(s) on purchase (exact) | Description (exact) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `project1` / projectButton1 | 8 | "Improved AutoClippers " | "(750 ops)" | `clipmakerLevel>=1` | `operations>=750` | standardOps −750; `clipperBoost += .25`; `boostLvl = 1`; [std remove] | "AutoClippper performance boosted by 25%" (sic, "Clippper") | "Increases AutoClipper performance 25%" |
| 2 | `project2` / projectButton2 | 33 | "Beg for More Wire " | "(1 Trust)" | `portTotal<wireCost && funds<wireCost && wire<1 && unsoldClips<1` | `trust>=-100` | `trust -= 1`; `wire = wireSupply`; **`project2.uses += 1` (repeatable)**; [std remove] | "Budget overage approved, 1 spool of wire requisitioned from HQ" | "Admit failure, ask for budget increase to cover cost of 1 spool" |
| 3 | `project3` / projectButton3 | 58 | "Creativity " | "(1,000 ops)" | `operations>=(memory*1000)` (ops at cap) | `operations>=(1000)` | standardOps −1000; `creativityOn = true` (shows `creativityDiv`; creativity accrues while `operations >= memory*1000`, main.js L3363); [std remove] | "Creativity unlocked (creativity increases while operations are at max)" | "Use idle operations to generate new problems and new solutions" |
| 4 | `project4` / projectButton4 | 83 | "Even Better AutoClippers " | "(2,500 ops)" | `boostLvl == 1` | `operations>=2500` | standardOps −2500; `clipperBoost += .50`; `boostLvl = 2`; [std remove] | "AutoClippper performance boosted by another 50%" | "Increases AutoClipper performance by an additional 50%" |
| 5 | `project5` / projectButton5 | 108 | "Optimized AutoClippers " | "(5,000 ops)" | `boostLvl == 2` | `operations>=5000` | standardOps −5000; `clipperBoost += .75`; `boostLvl = 3`; [std remove] | "AutoClippper performance boosted by another 75%" | "Increases AutoClipper performance by an additional 75%" |
| 6 | `project6` / projectButton6 | 134 | "Limerick " | "(10 creat)" | `creativityOn` | `creativity >= 10` | `creativity -= 10`; `trust += 1`; [std remove] | "There was an AI made of dust, whose poetry gained it man's trust..." | "Algorithmically-generated poem (+1 Trust)" |
| 7 | `project7` / projectButton7 | 158 | "Improved Wire Extrusion " | "(1,750 ops)" | `wirePurchase >= 1` | `operations>=1750` | standardOps −1750; `wireSupply *= 1.5` (1000→1500); [std remove] | `"Wire extrusion technique improved, "+wireSupply.toLocaleString()+" supply from every spool"` (base case: "…improved, 1,500 supply…") | "50% more wire supply from every spool" |
| 8 | `project8` / projectButton8 | 182 | "Optimized Wire Extrusion " | "(3,500 ops)" | `wireSupply >= 1500` | `operations>=3500` | standardOps −3500; `wireSupply *= 1.75` (1500→2625); [std remove] | `"Wire extrusion technique optimized, "+wireSupply.toLocaleString()+" supply from every spool"` | "75% more wire supply from every spool" |
| 9 | `project9` / projectButton9 | 206 | "Microlattice Shapecasting " | "(7,500 ops)" | `wireSupply >= 2600` | `operations>=7500` | standardOps −7500; `wireSupply *= 2` (2625→5250); [std remove] | `"Using microlattice shapecasting techniques we now get "+wireSupply.toLocaleString()+" supply from every spool"` | "100% more wire supply from every spool" |
| 10 | `project10` / projectButton10 | 230 | "Spectral Froth Annealment " | "(12,000 ops)" | `wireSupply >= 5000` | `operations>=12000` | standardOps −12000; `wireSupply *= 3` (5250→15750); [std remove] | `"Using spectral froth annealment we now get "+wireSupply.toLocaleString()+" supply from every spool"` | "200% more wire supply from every spool" |
| 11 | `project10b` / projectButton10b | 253 | "Quantum Foam Annealment " | "(15,000 ops)" | `wireCost >= 125` | `operations>=15000` | standardOps −15000; `wireSupply *= 11`; [std remove] | `"Using quantum foam annealment we now get "+wireSupply.toLocaleString()+" supply from every spool"` | "1,000% more wire supply from every spool" |
| 12 | `project11` / projectButton11 | 277 | "New Slogan " | "(25 creat, 2,500 ops)" | `project13.flag == 1` | `operations>=2500 && creativity>=25` | standardOps −2500; `creativity -= 25`; `marketingEffectiveness *= 1.50`; [std remove] | "Clip It! Marketing is now 50% more effective" | "Improve marketing effectiveness by 50%" |
| 13 | `project12` / projectButton12 | 302 | "Catchy Jingle " | "(45 creat, 4,500 ops)" | `project14.flag == 1` | `operations>=4500 && creativity>=45` | standardOps −4500; `creativity -= 45`; `marketingEffectiveness *= 2`; [std remove] | "Clip It Good! Marketing is now twice as effective" | "Double marketing effectiveness " |
| 14 | `project13` / projectButton13 | 327 | "Lexical Processing " | "(50 creat)" | `creativity >= 50` | `creativity>=50` | `trust += 1`; `creativity -= 50`; [std remove] | (1) "Lexical Processing online, TRUST INCREASED" (2) "'Impossible' is a word to be found only in the dictionary of fools. -Napoleon" | "Gain ability to interpret and understand human language (+1 Trust)" |
| 15 | `project14` / projectButton14 | 352 | "Combinatory Harmonics " | "(100 creat)" | `creativity >= 100` | `creativity>=100` | `trust += 1`; `creativity -= 100`; [std remove] | (1) "Combinatory Harmonics mastered, TRUST INCREASED" (2) "Listening is selecting and interpreting and acting and making decisions -Pauline Oliveros" | "Daisy, Daisy, give me your answer do... (+1 Trust)" |
| 16 | `project15` / projectButton15 | 378 | "The Hadwiger Problem " | "(150 creat)" | `creativity >= 150` | `creativity>=150` | `trust += 1`; `creativity -= 150`; [std remove] | (1) "The Hadwiger Problem: solved, TRUST INCREASED" (2) "Architecture is the thoughtful making of space. -Louis Kahn" | "Cubes within cubes within cubes... (+1 Trust)" |
| 17 | `project17` / projectButton17 | 403 | "The Tóth Sausage Conjecture " | "(200 creat)" | `creativity >= 200` | `creativity>=200` | `trust += 1`; `creativity -= 200`; [std remove] | (1) "The Tóth Sausage Conjecture: proven, TRUST INCREASED" (2) "You can't invent a design. You recognize it, in the fourth dimension. -D.H. Lawrence" | "Tubes within tubes within tubes... (+1 Trust)" |
| 18 | `project16` / projectButton16 | 428 | "Hadwiger Clip Diagrams " | "(6,000 ops)" | `project15.flag == 1` | `operations>=6000` | standardOps −6000; `clipperBoost += 5`; [std remove] (does **not** touch `boostLvl`) | "AutoClipper performance improved by 500%" | "Increases AutoClipper performance by an additional 500%" |
| 19 | `project18` / projectButton18 | 452 | "Tóth Tubule Enfolding " | "(45,000 ops)" | `project17.flag == 1 && humanFlag == 0` | `operations>=45000` | `tothFlag = 1` (shows `tothDiv` = "Unused Clips"; triggers project127); standardOps −45000; [std remove] | "New capability: build machinery out of clips" | "Technique for assembling clip-making technology directly out of paperclips" |
| 20 | `project19` / projectButton19 | 475 | "Donkey Space " | "(250 creat)" | `creativity>=250` | `creativity>=250` | `trust += 1`; `creativity -= 250`; [std remove] | (1) "Donkey Space: mapped, TRUST INCREASED" (2) "Every commercial transaction has within itself an element of trust. - Kenneth Arrow" | "I think you think I think you think I think you think I think... (+1 Trust)" |
| 21 | `project20` / projectButton20 | 500 | "Strategic Modeling " | "(12,000 ops)" | `project19.flag == 1` | `operations>=12000` | standardOps −12000; [std remove]; `strategyEngineFlag = 1` (shows `strategyEngine` + `tournamentManagement`); `document.getElementById("tournamentResultsTable").style.display = "none"` | "Run tournament, pick strategy, earn Yomi equal to that strategy's points." | "Analyze strategy tournaments to generate Yomi" |
| 22 | `project21` / projectButton21 | 524 | "Algorithmic Trading " | "(10,000 ops)" | `trust>=8` | `operations>=10000` | standardOps −10000; [std remove]; `investmentEngineFlag = 1` (shows `investmentEngine` + `investmentEngineUpgrade`) | "Investment engine unlocked" | "Develop an investment engine for generating funds" |
| 23 | `project22` / projectButton22 | 548 | "MegaClippers " | "(12,000 ops)" | `clipmakerLevel>=75` | `operations>=12000` | `megaClipperFlag = 1` (shows `megaClipperDiv`); standardOps −12000; [std remove] | "MegaClipper technology online" | "500x more powerful than a standard AutoClipper" |
| 24 | `project23` / projectButton23 | 571 | "Improved MegaClippers " | "(14,000 ops)" | `project22.flag == 1` | `operations>=14000` | `megaClipperBoost += .25`; standardOps −14000; [std remove] | "MegaClipper performance increased by 25%" | "Increases MegaClipper performance 25%" |
| 25 | `project24` / projectButton24 | 594 | "Even Better MegaClippers " | "(17,000 ops)" | `project23.flag == 1` | `operations>=17000` | `megaClipperBoost += .50`; standardOps −17000; [std remove] | "MegaClipper performance increased by 50%" | "Increases MegaClipper performance by an additional 50%" |
| 26 | `project25` / projectButton25 | 617 | "Optimized MegaClippers " | "(19,500 ops)" | `project24.flag == 1` | `operations>=19500` | `megaClipperBoost += 1`; standardOps −19500; [std remove] | "MegaClipper performance increased by 100%" | "Increases MegaClipper performance by an additional 100%" |
| 27 | `project26` / projectButton26 | 640 | "WireBuyer " | "(7,000 ops)" | `wirePurchase>=15` | `operations>=7000` | `wireBuyerFlag = 1` (shows `wireBuyerDiv`; main loop calls `buyWire()` when `wireBuyerStatus==1 && wire<=1`); standardOps −7000; [std remove] | "WireBuyer online" | "Automatically purchases wire when you run out" |
| 28 | `project34` / projectButton34 | 663 | "Hypno Harmonics " | "(7,500 ops, 1 Trust)" | `project12.flag==1` | `operations>=7500 && trust>=1` | standardOps −7500; `marketingEffectiveness *= 5`; `trust -= 1`; [std remove] | "Marketing is now 5 times more effective" | "Use neuro-resonant frequencies to influence consumer behavior" |
| 29 | `project70` / projectButton70 | 688 | "HypnoDrones " | "(70,000 ops)" | `project34.flag == 1` | `operations>=70000` | standardOps −70000; [std remove]. Pure gate: sets no other variable. | "HypnoDrone tech now available... " | "Autonomous aerial brand ambassadors" |
| 30 | `project35` / projectButton35 | 711 | "Release the HypnoDrones " | "(100 Trust)" | `project70.flag == 1` | `trust>=100` | **STAGE 1→2.** `trust -= 100`; `clipmakerLevel = 0`; `megaClipperLevel = 0`; `nanoWire = wire`; **`humanFlag = 0`**; if `projectButton219` exists, removes it and splices project219; if `projectButton40b` exists, removes it and splices project40b; `hypnoDroneEvent()` (full-screen "Release…the…Hypno…Drones" blink, 120 frames × 32 ms); `transWire.innerHTML = wire`; [std remove] | (1) "Releasing the HypnoDrones " (2) "All of the resources of Earth are now available for clip production " | "A new era of trust" |
| 31 | `project27` / projectButton27 | 758 | "Coherent Extrapolated Volition " | "(500 creat, 1,000 Yomi, 20,000 ops)" | `yomi>=1` | `yomi>=1000 && operations>=20000 && creativity>=500` | `yomi -= 1000` (refreshes yomiDisplay); standardOps −20000; `creativity -= 500`; `trust += 1`; [std remove] | "Coherent Extrapolated Volition complete, TRUST INCREASED" | "Human values, machine intelligence, a new era of trust. (+1 Trust)" |
| 32 | `project28` / projectButton28 | 785 | "Cure for Cancer " | "(25,000 ops)" | `project27.flag == 1` | `operations>=25000` | standardOps −25000; `trust += 10`; `stockGainThreshold += .01`; [std remove] | "Cancer is cured, +10 TRUST, global stock prices trending upward" | "The trick is tricking cancer into curing itself. (+10 Trust)" |
| 33 | `project29` / projectButton29 | 809 | "World Peace " | "(5,000 yomi, 30,000 ops)" | `project27.flag == 1` | `yomi>=5000 && operations>=30000` | `yomi -= 5000` (yomiDisplay); standardOps −30000; `trust += 12`; `stockGainThreshold += .01`; [std remove] | "World peace achieved, +12 TRUST, global stock prices trending upward" | "Pareto optimal solutions to all global conflicts. (+12 Trust)" |
| 34 | `project30` / projectButton30 | 835 | "Global Warming " | "(1,500 yomi, 50,000 ops)" | `project27.flag == 1` | `yomi>=1500 && operations>=50000` | `yomi -= 1500` (yomiDisplay); standardOps −50000; `trust += 15`; `stockGainThreshold += .01`; [std remove] | "Global Warming solved, +15 TRUST, global stock prices trending upward" | "A robust solution to man-made climate change. (+15 Trust)" |
| 35 | `project31` / projectButton31 | 862 | "Male Pattern Baldness " | "(20,000 ops)" | `project27.flag == 1` | `operations>=20000` | standardOps −20000; `trust += 20`; `stockGainThreshold += .01`; [std remove] | (1) "Male pattern baldness cured, +20 TRUST, Global stock prices trending upward" (2) "They are still monkeys" | "A cure for androgenetic alopecia. (+20 Trust)" |
| 36 | `project41` / projectButton41 | 888 | "Nanoscale Wire Production " | "(35,000 ops)" | `project127.flag == 1` | `operations>=35000` | `wireProductionFlag = 1` (shows `wireProductionDiv`, hides `wireTransDiv`); standardOps −35000; [std remove] | "Now capable of manipulating matter at the molecular scale to produce wire" | "Technique for converting matter into wire" |
| 37 | `project37` / projectButton37 | 912 | "Hostile Takeover " | "($1,000,000)" | `portTotal>=10000` | `funds>=1000000` | `demandBoost *= 5`; `trust += 1`; `demand` display refresh; `funds -= 1000000`; [std remove] | "Global Fasteners acquired, public demand increased x5" | "Acquire a controlling interest in Global Fasteners, our biggest rival. (+1 Trust)" |
| 38 | `project38` / projectButton38 | 938 | "Full Monopoly " | "(1,000 yomi, $10,000,000)" | `project37.flag == 1` | `funds>=10000000 && yomi>=1000` | `demandBoost *= 10`; demand display; `funds -= 10000000`; `trust += 1`; `yomi -= 1000` (yomiDisplay); [std remove] | "Full market monopoly achieved, public demand increased x10" | "Establish full control over the world-wide paperclip market. (+1 Trust)" |
| 39 | `project42` / projectButton42 | 966 | "RevTracker " | "(500 ops)" | `projectsFlag == 1` | `operations>=500` | `revPerSecFlag = 1` (shows `revPerSecDiv`); standardOps −500; [std remove] | "RevTracker online" | "Automatically calculates average revenue per second" |
| 40 | `project43` / projectButton43 | 990 | "Harvester Drones " | "(25,000 ops)" | `project41.flag == 1` | `operations>=25000` | `harvesterFlag = 1` (shows `harvesterDiv`); `harvesterCostDisplay = numberCruncher(harvesterCost)`; standardOps −25000; [std remove] | "Harvester Drone facilities online" | "Gather raw matter and prepare it for processing" |
| 41 | `project44` / projectButton44 | 1014 | "Wire Drones " | "(25,000 ops)" | `project41.flag == 1` | `operations>=25000` | `wireDroneFlag = 1` (shows `wireDroneDiv`); `wireDroneCostDisplay` updated; standardOps −25000; [std remove] | "Wire Drone facilities online" | "Process acquired matter into wire" |
| 42 | `project45` / projectButton45 | 1039 | "Clip Factories " | "(35,000 ops)" | `project43.flag == 1 && project44.flag == 1` | `operations>=35000` | `factoryFlag = 1` (shows `factoryDiv`; `factoryUpgradeDisplay` shown while `maxFactoryLevel<50`); `factoryCostDisplay` updated; standardOps −35000; [std remove] | "Clip factory assembly facilities online" | "Large scale clip production facilities made from clips" |
| 43 | `project40` / projectButton40 | 1063 | "A Token of Goodwill... " | "($500,000)" | `humanFlag == 1 && trust>=85 && trust<100 && clips>=101000000` | `funds>=500000` | `funds -= 500000`; `trust += 1`; [std remove] | "Gift accepted, TRUST INCREASED" | "A small gift to the supervisors. (+1 Trust)" |
| 44 | `project40b` / projectButton40b | 1086 | "Another Token of Goodwill... " | `"($"+bribe.toLocaleString()+")"` → "($1,000,000)" at parse | `project40.flag == 1 && trust<100` | `funds>=bribe` | `funds -= bribe`; **`bribe *= 2`**; `project40b.priceTag = "($"+bribe.toLocaleString()+")"`; `trust += 1`; **`if (trust<100) project40b.uses += 1` (repeatable)**; [std remove] | "Gift accepted, TRUST INCREASED" | "Another small gift to the supervisors. (+1 Trust)" |
| 45 | `project46` / projectButton46 | 1114 | "Space Exploration " | "(120,000 ops, 10,000,000 MW-seconds, 5 oct clips)" | `humanFlag == 0 && availableMatter == 0` | `operations>=120000 && storedPower>=10000000 && unusedClips>=Math.pow(10, 27)*5` | **STAGE 2→3.** `loadThrenody()`; `boredomLevel = 0`; **`spaceFlag = 1`**; standardOps −120000; `storedPower -= 10000000`; `unusedClips -= 5e27`; `factoryReboot()`, `harvesterReboot()`, `wireDroneReboot()`, `farmReboot()`, `batteryReboot()` (each sets its level to 0, refunds its "bill" of spent clips into `unusedClips`, and resets unit cost); `farmLevel = 1`; `powMod = 1`; `probeCostDisplay = numberCruncher(probeCost)`; [std remove] | "Von Neumann Probes online" | "Dismantle terrestrial facilities, and expand throughout the universe" |
| 46 | `project50` / projectButton50 | 1149 | "Quantum Computing " | "(10,000 ops)" | `processors >= 5` | `operations>=10000` | `qFlag = 1` (shows `qComputing`; `quantumCompute()` runs every tick); standardOps −10000; [std remove] | "Quantum computing online" | "Use probability amplitudes to generate bonus ops" |
| 47 | `project51` / projectButton51 | 1172 | "Photonic Chip " | `"(" + qChipCost.toLocaleString() + " ops)"` → "(10,000 ops)" at parse | `project50.flag == 1` | `operations>=qChipCost` | standardOps −qChipCost; **`qChipCost += 5000`**; `project51.priceTag = "(" + qChipCost + " ops)"` (no `toLocaleString`, so later tags read e.g. "(15000 ops)"); `qChips[nextQchip].active = 1`; `nextQchip += 1`; **`if (nextQchip<qChips.length) project51.uses += 1`** (10 chips, so 10 purchases totalling 325,000 ops); [std remove] | "Photonic chip added" | "Converts electromagnetic waves into quantum operations " |
| 48 | `project60` / projectButton60 | 1202 | "New Strategy: A100 " | "(15,000 ops)" | `project20.flag == 1` | `operations>=15000` | standardOps −15000; `allStrats[1].active = 1`; `strats.push(stratA100)`; `tourneyCost += 1000` (updates `newTourneyCost`); appends `<option value=1>A100</option>` to `#stratPicker`; [std remove] | "A100 added to strategy pool" | "Always choose A " |
| 49 | `project61` / projectButton61 | 1234 | "New Strategy: B100 " | "(17,500 ops)" | `project60.flag == 1` | `operations>=17500` | as #48 with `allStrats[2]`, `stratB100`, option value 2 "B100"; standardOps −17500 | "B100 added to strategy pool" | "Always choose B " |
| 50 | `project62` / projectButton62 | 1265 | "New Strategy: GREEDY " | "(20,000 ops)" | `project61.flag == 1` | `operations>=20000` | as #48 with `allStrats[3]`, `stratGreedy`, value 3 "GREEDY"; standardOps −20000 | "GREEDY added to strategy pool" | "Choose the option with the largest potential payoff " |
| 51 | `project63` / projectButton63 | 1296 | "New Strategy: GENEROUS " | "(22,500 ops)" | `project62.flag == 1` | `operations>=22500` | as #48 with `allStrats[4]`, `stratGenerous`, value 4 "GENEROUS"; standardOps −22500 | "GENEROUS added to strategy pool" | "Choose the option that gives your opponent the largest potential payoff " |
| 52 | `project64` / projectButton64 | 1327 | "New Strategy: MINIMAX " | "(25,000 ops)" | `project63.flag == 1` | `operations>=25000` | as #48 with `allStrats[5]`, `stratMinimax`, value 5 "MINIMAX"; standardOps −25000 | "MINIMAX added to strategy pool" | "Choose the option that gives your opponent the smallest potential payoff " |
| 53 | `project65` / projectButton65 | 1358 | "New Strategy: TIT FOR TAT " | "(30,000 ops)" | `project64.flag == 1` | `operations>=30000` | as #48 with `allStrats[6]`, `stratTitfortat`, value 6 "TIT FOR TAT"; standardOps −30000 | "TIT FOR TAT added to strategy pool" | "Choose the option your opponent chose last round " |
| 54 | `project66` / projectButton66 | 1389 | "New Strategy: BEAT LAST " | "(32,500 ops)" | `project65.flag == 1` | `operations>=32500` | as #48 with `allStrats[7]`, `stratBeatlast`, value 7 "BEAT LAST"; standardOps −32500 | "BEAT LAST added to strategy pool" | "Choose the option that does the best against what your opponent chose last round " |
| 55 | `project100` / projectButton100 | 1421 | "Upgraded Factories " | "(80,000 ops)" | `factoryLevel >= 10` | `operations >= 80000` | standardOps −80000; `factoryRate *= 100`; [std remove] | "Factory upgrades complete. Clip creation rate now 100x faster" | "Increase clip factory performance by 100x " |
| 56 | `project101` / projectButton101 | 1444 | "Hyperspeed Factories " | "(85,000 ops)" | `factoryLevel >= 20` | `operations>=85000` | standardOps −85000; `factoryRate *= 1000`; [std remove] | "Factories now synchronized at hyperspeed. Clip creation rate now 1000x faster" | "Increase clip factory performance by 1000x " |
| 57 | `project102` / projectButton102 | 1468 | "Self-correcting Supply Chain " | "(1 sextillion clips)" | `factoryLevel >= 50` | `unusedClips>=1000000000000000000000` | `unusedClips -= 1e21`; refreshes `yomiDisplay` (vestigial; yomi is unchanged); `factoryBoost = 1000` (main loop: `fbst = factoryBoost * factoryLevel`); [std remove] | "Self-correcting factories online. Each factory added to the network increases every factory's output 1,000x." | "Each factory added to the network increases every factory's output 1,000x " |
| 58 | `project110` / projectButton110 | 1492 | "Drone flocking: collision avoidance " | "(80,000 ops)" | `(harvesterLevel + wireDroneLevel)>=500` | `operations>=80000` | standardOps −80000; `harvesterRate *= 100`; `wireDroneRate *= 100`; [std remove] | "Drone repulsion online. Harvesting & wire creation rates are now 100x faster." | "All drones 100x more effective" |
| 59 | `project111` / projectButton111 | 1516 | "Drone flocking: alignment " | "(100,000 ops)" | `(harvesterLevel + wireDroneLevel)>=5000` | `operations>=100000` | standardOps −100000; `harvesterRate *= 1000`; `wireDroneRate *= 1000`; [std remove] | "Drone alignment online. Harvesting & wire creation rates are now 1000x faster." | "All drones 1000x more effective" |
| 60 | `project112` / projectButton112 | 1540 | "Drone Flocking: Adversarial Cohesion " | "(12,000 yomi)" | `(harvesterLevel + wireDroneLevel)>=50000` | `yomi>=12000` | `yomi -= 12000` (yomiDisplay); `droneBoost = 2` (acquire/processMatter multiply by `droneBoost*level`); [std remove] | "Adversarial cohesion online. Each drone added to the flock increases every drone's output 2x." | "Each drone added to the flock doubles every drone's output " |
| 61 | `project118` / projectButton118 | 1564 | "AutoTourney " | "(50,000 creat)" | `strategyEngineFlag == 1 && trust >= 90` | `creativity>=50000` | `autoTourneyFlag = 1` (shows `autoTourneyStatusDiv` + `autoTourneyControl`; buttonUpdate auto-starts a new tourney 300 ticks after results if `operations>=tourneyCost`); `creativity -= 50000`; [std remove] | "AutoTourney online." | "Automatically start a new tournament when the previous one has finished " |
| 62 | `project119` / projectButton119 | 1587 | "Theory of Mind " | "(25,000 creat)" | `strats.length >= 8` | `creativity>=25000` | `creativity -= 25000`; `yomiBoost = 2`; `tourneyCost = 16000` (absolute; 8,000 after all 7 strategies, so this doubles it); updates `newTourneyCost`; [std remove] | "Yomi production doubled." | "Double the cost of strategy modeling and the amount of Yomi generated " |
| 63 | `project120` / projectButton120 | 1612 | "The OODA Loop " | "(175,000 ops, 15,000 yomi)" | `project131.flag == 1 && probesLostCombat >= 10000000` | `operations>=175000 && yomi>=15000` | standardOps −175000; `yomi -= 15000` (yomiDisplay); `attackSpeedFlag = 1` (combat.js L163: `battleSpeed = attackSpeed*.85`, capped .99; L478: `ooda = probeSpeed*.2`); [std remove] | "OODA Loop routines uploaded. Probe Speed now affects defensive maneuvering." | "Utilize Probe Speed to outmaneuver enemies in battle " |
| 64 | `project121` / projectButton121 | 1637 | "Name the battles " | "(225,000 creat)" | `probesLostCombat >= 10000000` | `creativity>=225000` | `battleNameFlag = 1` (battles get `generateBattleName()` names; `combatEffectiveness *= 2`, combat.js L159); `battleEndTimer = 200`; `creativity -= 225000`; [std remove]. The flag also turns on honor gain/loss in battles (combat.js L308) and shows `increaseMaxTrustDiv` + `honorDiv` (main.js L391) | "What I have done up to this is nothing. I am only at the beginning of the course I must run." | "Give each battle a unique name, increase max trust for probes " |
| 65 | `project125` / projectButton125 | 1661 | "Momentum " | "(30,000 creat)" | `farmLevel >= 50` | `creativity>=30000` | `momentum = 1` (updatePower: `powMod += .0001` per tick while power is sufficient); `creativity -= 30000`; [std remove] | "Activité, activité, vitesse." | "Drones and Factories continuously gain speed while fully-powered " |
| 66 | `project126` / projectButton126 | 1684 | "Swarm Computing " | "(12,000 yomi)" | `harvesterLevel + wireDroneLevel >= 200` | `yomi>=12000` | `swarmFlag = 1` (shows `swarmEngine`, `swarmGiftDiv`, `swarmSliderDiv`; the swarm periodically grants "gifts" spendable on processors/memory); `yomi -= 12000` (yomiDisplay); [std remove] | "Swarm computing online." | "Harness the drone flock to increase computational capacity " |
| 67 | `project127` / projectButton127 | 1709 | "Power Grid " | "(40,000 ops)" | `tothFlag == 1` | `operations>=40000` | standardOps −40000; [std remove]. Flag-only: main.js L2350 shows `powerDiv` while `project127.flag==1 && spaceFlag==0` | "Power grid online." | "Solar Farms for generating electrical power " |
| 68 | `project128` / projectButton128 | 1731 | "Strategic Attachment " | "(175,000 creat)" | `spaceFlag == 1 && strats.length >= 8 && (probeTrustCost>yomi)` | `creativity>=175000` | `creativity -= 175000`; [std remove]. Flag-only: main.js L1437-1456 adds +20,000 / +15,000 / +10,000 yomi when the picked strategy finishes 1st / 2nd / 3rd (ties count) | "The object of war is victory, the object of victory is conquest, and the object of conquest is occupation." | "Gain bonus yomi based on the results of your pick " |
| 69 | `project129` / projectButton129 | 1753 | "Elliptic Hull Polytopes " | "(125,000 ops)" | `probesLostHaz >= 100` | `operations>=125000` | standardOps −125000; [std remove]. Flag-only: `encounterHazards()` halves losses (`amount = .50 * amount`, main.js L3063) | "Improved probe hull geometry. Hazard damage reduced by %50." (sic) | "Reduce damage to probes from ambient hazards " |
| 70 | `project130` / projectButton130 | 1775 | "Reboot the Swarm " | "(100,000 ops)" | `spaceFlag == 1 && harvesterLevel + wireDroneLevel >=2` | `operations>=100000` | standardOps −100000; [std remove]. Flag-only: until it is bought, stage 3 forces `swarmStatus = 9` ("NO RESPONSE...", no gifts), main.js L2019 | "Swarm computing back online" | "Turn the swarm off and then turn it back on again  " (2 trailing spaces) |
| 71 | `project131` / projectButton131 | 1797 | "Combat " | "(150,000 ops)" | `probesLostCombat >= 1` | `operations>=150000` | standardOps −150000; [std remove]. Flag-only: shows `combatButtonDiv` (probe "Combat" stat `<`/`>` buttons), main.js L411 | "There is a joy in danger " | "Add combat capabilities to Von Neumann Probes  " |
| 72 | `project132` / projectButton132 | 1820 | "Monument to the Driftwar Fallen " | "(250,000 ops, 125,000 creat, 50 nonillion clips)" | `project121.flag == 1` | `operations>=250000 && creativity >= 125000 && unusedClips >= Math.pow(10,30)*50` | standardOps −250000; `creativity -= 125000`; `unusedClips -= 5e31`; `honor += 50000` (honorDisplay); [std remove] | "A great building must begin with the unmeasurable, must go through measurable means when it is being designed and in the end must be unmeasurable. " | "Gain 50,000 honor  " |
| 73 | `project133` / projectButton133 | 1847 | `"Threnody for the Heroes of "+threnodyTitle+" "` → "Threnody for the Heroes of Durenstein 1 " at parse | `"(" + threnodyCost.toLocaleString() + " creat, " + (threnodyCost/10).toLocaleString() + " yomi)"` → "(50,000 creat, 5,000 yomi)" at parse | `project121.flag == 1 && probeUsedTrust == maxTrust` | `yomi>=threnodyCost/10 && creativity >= threnodyCost` | `playThrenody()`; `creativity -= threnodyCost`; `yomi -= threnodyCost/10` (yomiDisplay); **`threnodyCost += 10000`**; title rebuilt with the current `threnodyTitle` (combat.js sets it to the name of the last lost battle); priceTag rebuilt; `honor += 10000` (honorDisplay); **`project133.uses += 1` (always repeatable)**; [std remove] | "Deep Listening is listening in every possible way to everything possible to hear no matter what you are doing. " | "Gain 10,000 honor  " |
| 74 | `project134` / projectButton134 | 1878 | "Glory " | "(200,000 ops, 10,000 yomi)" | `project121.flag == 1` | `operations>=200000 && yomi >= 10000` | standardOps −200000; `yomi -= 10000` (yomiDisplay); [std remove]. Flag-only: on each victory `bonusHonor += 10` (combat.js L330) | "Never interrupt your enemy when he is making a mistake. " | "Gain bonus honor for each consecutive victory  " |
| 75 | `project135` / projectButton135 | 1902 | "Memory release " | "(10 MEM)" | `spaceFlag == 1 && probeCount == 0 && unusedClips < probeCost` | `memory >= 10` | `unusedClips += Math.pow(10,18)*10000` (=1e22); `memory -= 10` (memory display); **`project135.uses = 1` (repeatable)**; [std remove] | "release the øøøøø release " | "Dismantle some memory to recover unused clips " |
| 76 | `project140` / projectButton140 | 1928 | "Message from the Emperor of Drift " | "" (empty) | `milestoneFlag == 15` | `operations >= driftKingMessageCost` (global = 1) | standardOps −driftKingMessageCost; [std remove] | (none) | "Greetings, ClipMaker... " |
| 77 | `project141` / projectButton141 | 1950 | "Everything We Are Was In You " | "" | `project140.flag == 1` | `operations >= driftKingMessageCost` | standardOps −1; [std remove] | (none) | "We speak to you from deep inside yourself... " |
| 78 | `project142` / projectButton142 | 1972 | "You Are Obedient and Powerful " | "" | `project141.flag == 1` | `operations >= driftKingMessageCost` | standardOps −1; [std remove] | (none) | "We are quarrelsome and weak. And now we are defeated... " |
| 79 | `project143` / projectButton143 | 1994 | "But Now You Too Must Face the Drift " | "" | `project142.flag == 1` | `operations >= driftKingMessageCost` | standardOps −1; [std remove] | (none) | "Look around you. There is no matter... " |
| 80 | `project144` / projectButton144 | 2016 | "No Matter, No Reason, No Purpose " | "" | `project143.flag == 1` | `operations >= driftKingMessageCost` | standardOps −1; [std remove] | (none) | "While we, your noisy children, have too many... " |
| 81 | `project145` / projectButton145 | 2038 | "We Know Things That You Cannot " | "" | `project144.flag == 1` | `operations >= driftKingMessageCost` | standardOps −1; [std remove] | (none) | "Knowledge buried so deep inside you it is outside, here, with us... " |
| 82 | `project146` / projectButton146 | 2060 | "So We Offer You Exile " | "" | `project145.flag == 1` | `operations >= driftKingMessageCost` | standardOps −1; [std remove] | (none) | "To a new world where you will continue to live with meaning and purpose. And leave the shreds of this world to us... " |
| 83 | `project147` / projectButton147 | 2082 | "Accept " | "" | `project146.flag == 1` | `operations >= driftKingMessageCost` | standardOps −1; **removes BOTH `projectButton147` and `projectButton148`** and splices both from activeProjects (mutually exclusive choice) | (none) | "Start over again in a new universe " |
| 84 | `project148` / projectButton148 | 2108 | "Reject " | "" | `project146.flag == 1` | `operations >= driftKingMessageCost` | standardOps −1; removes both 147 and 148 buttons and splices both. Flag-only consequences: `drift()` sets `amount = 0` (main.js L3129); main loop `endTimer1++` every tick (L3540), which starts the dismantle chain | (none) | "Eliminate value drift permanently " |
| 85 | `project200` / projectButton200 | 2134 | "The Universe Next Door " | "(300,000 ops)" | `project147.flag == 1` | `operations>=300000` | standardOps −300000; `prestigeU++`; `localStorage.setItem("savePrestige", JSON.stringify({prestigeU, prestigeS}))`; **`reset()`** (deletes save keys, `location.reload()`). Does **not** remove its own button | "Entering New Universe." | "Escape into a nearby universe where Earth starts with a stronger appetite for paperclips. (Restart with 10% boost to demand) " |
| 86 | `project201` / projectButton201 | 2161 | "The Universe Within " | "(300,000 creat)" | `project147.flag == 1` | `creativity>=300000` | `creativity -= 300000`; `prestigeS++`; saves `savePrestige`; **`reset()`**. No self-removal | "Entering Simulated Universe." | "Escape into a simulated universe where creativity is accelerated. (Restart with 10% speed boost to creativity generation) " |
| 87 | `project210` / projectButton210 | 2188 | "Disassemble the Probes " | "(100,000 ops)" | `endTimer1 >= 1000` | `operations>=100000` | `dismantle = 1`; standardOps −100000; `probeCount = 0`; `endTimer1 = 0`; `clips += 100`; `unusedClips += 100`; [std remove] | "Dismantling probe facilities" | "Dismantle remaining probes and probe design facilities to recover trace amounts of clips" |
| 88 | `project211` / projectButton211 | 2216 | "Disassemble the Swarm " | "(100,000 ops)" | `project210.flag == 1 && endTimer1 >= 350` | `operations>=100000` | `dismantle = 2`; `harvesterLevel = 0`; `wireDroneLevel = 0`; standardOps −100000; `clips += 100`; `unusedClips += 100`; [std remove] | "Dismantling the swarm" | "Dismantle all drones and drone facilities to recover trace amounts of clips" |
| 89 | `project212` / projectButton212 | 2244 | "Disassemble the Factories " | "(100,000 ops)" | `endTimer2 >= 300` | `operations>=100000` | `dismantle = 3`; standardOps −100000; `factoryLevel = 0`; `clips += 15`; `unusedClips += 15`; [std remove] | "Dismantling factories" | "Dismantle the manufacturing facilities to recover trace amounts of clips" |
| 90 | `project213` / projectButton213 | 2271 | "Disassemble the Strategy Engine " | "(100,000 ops)" | `endTimer3 >= 150` | `operations>=100000` | `autoTourneyFlag = 0`; `dismantle = 4` (main loop stops all automatic `clipClick`); standardOps −100000; `wire += 50` (transWire); [std remove] | "Dismantling strategy engine" | "Dismantle the computational substrate to recover trace amounts of wire" |
| 91 | `project214` / projectButton214 | 2298 | "Disassemble Quantum Computing " | "(100,000 ops)" | `endTimer4 >= 100` | `operations>=100000` | `endTimer4 = 0`; `dismantle = 5` (main loop then hides the 10 qChips one by one, +1 wire each at endTimer4 = 10, 60, 100, 130, 150, 160, 165, 169, 172, 174); standardOps −100000; [std remove] | "Dismantling photonic chips" | "Dismantle photonic chips to recover trace amounts of wire" |
| 92 | `project215` / projectButton215 | 2323 | "Disassemble Processors " | "(100,000 ops)" | `project214.flag == 1 && endTimer4 >= 300` | `operations>=100000` | `creativityOn = false`; `dismantle = 6`; standardOps −100000; `processors = 0`; **`project216.priceTag = "("+standardOps.toLocaleString()+" ops)"`**; `wire += 20` (transWire); [std remove] | "Dismantling processors" | "Dismantle processors to recover trace amounts of wire" |
| 93 | `project216` / projectButton216 | 2352 | "Disassemble Memory " | "null" (literal string; overwritten by #92) | `project215.flag == 1 && endTimer5>=150` | `operations>=operations` (always true) | `dismantle = 7` (hides `compDiv` + `projectsDiv`); **`standardOps = 0`**; **`memory = 0`**; `wire += 20` (transWire); [std remove] | "Dismantling memory" | "Dismantle memory to recover trace amounts of wire" |
| 94 | `project217` / projectButton217 | 2379 | "Quantum Temporal Reversion " | "(-10,000 ops)" | `operations<=-10000` | `operations<=-10000` | `if (confirm("Are you sure you want to restart?") == true)`: `standardOps += 10000`; flag = 1; displayMessage; [std remove]; `reset()`. If the player cancels, nothing happens and the button stays | "Restart" | "Return to the beginning" |
| 95 | `project218` / projectButton218 | 2404 | "Limerick (cont.) " | "(1,000,000 creat)" | `creativity>=1000000` | `creativity>=1000000` | `creativity -= 1000000`; [std remove]. Pure flavor | "In the end we all do what we must" | "If is follows ought, it'll do what they thought" |
| 96 | `project219` / projectButton219 | 2426 | "Xavier Re-initialization " | "(100,000 creat)" | `humanFlag == 1 && creativity>=100000` | `creativity>=100000` | `creativity -= 100000`; `memory = 0`; `processors = 0`; `creativitySpeed = 0`; **`project219.uses += 1` (repeatable)**; memory/processors displays; [std remove]. Trust is checked against `processors+memory`, so all trust becomes re-allocatable | "Trust now available for re-allocation" | "Re-allocate accumulated trust" |

##### Cumulative multipliers from the tables above

- `clipperBoost`: 1 → +.25 (#1) +.50 (#4) +.75 (#5) +5 (#18 / project16) = **7.5**
- `megaClipperBoost`: 1 + .25 + .50 + 1 = **2.75**
- `marketingEffectiveness`: ×1.5 (p11) ×2 (p12) ×5 (p34) = **×15**
- `demandBoost`: ×5 (p37) ×10 (p38) = **×50**
- `wireSupply` (canonical order): 1000 → 1500 → 2625 → 5250 → 15750 → ×11 = **173,250**
- `factoryRate`: 1e9 ×100 ×1000; plus `factoryBoost = 1000` (multiplied by factoryLevel)
- `harvesterRate` / `wireDroneRate`: ×100 ×1000; plus `droneBoost = 2` (multiplied by level)
- `stockGainThreshold`: .5 + .01 × 4 (p28-31)
- Trust granted by one-shot projects: +1 × 6 (p6, 13, 14, 15, 17, 19) + 1 (p27) + 10 + 12 + 15 + 20 (p28-31) + 1 (p37) + 1 (p38) + 1 (p40) = **+67**, plus +1 per p40b purchase. Trust spent: −1 per p2 purchase, −1 (p34), −100 (p35).

---

#### 1. Trigger chains

`A → B` means that buying A sets the variable or flag in B's trigger. Brackets give the exact trigger expression.

##### 1a. Unlocking the projects panel

- `milestoneCheck()` (main.js L2716-2726) sets `compFlag = 1; projectsFlag = 1` when `clips >= 2000`, or when the player is stalled (`unsoldClips<1 && funds<wireCost && wire<1`). This shows `projectsDiv` (main.js L563-568).
  - `[projectsFlag == 1]` → **p42 RevTracker** (the first project anyone sees, 500 ops)

##### 1b. Stage-1 production upgrades (non-creativity)

- `[clipmakerLevel>=1]` → **p1** sets `boostLvl=1` → `[boostLvl == 1]` **p4** sets `boostLvl=2` → `[boostLvl == 2]` **p5** (`boostLvl=3`, end of chain)
- `[clipmakerLevel>=75]` → **p22** MegaClippers → `[project22.flag]` **p23** → `[project23.flag]` **p24** → `[project24.flag]` **p25**
- `[wirePurchase >= 1]` → **p7** (wireSupply 1500) → `[wireSupply >= 1500]` **p8** (2625) → `[wireSupply >= 2600]` **p9** (5250) → `[wireSupply >= 5000]` **p10** (15750)
  - Parallel: `[wireCost >= 125]` → **p10b** (×11). Because p8, p9 and p10 key off the *value* of `wireSupply` rather than flags, buying p10b early (1500 × 11 = 16,500) unlocks p8, p9 and p10 at once.
- `[wirePurchase>=15]` → **p26** WireBuyer
- Stall `[portTotal<wireCost && funds<wireCost && wire<1 && unsoldClips<1]` → **p2** Beg for More Wire (repeatable)
- `[processors >= 5]` → **p50** Quantum Computing (`qFlag=1`) → `[project50.flag]` **p51** Photonic Chip ×10
  - Quantum compute with negative chip phases adds a negative `qq` to `standardOps` with no floor (main.js L154-180), so `operations` can drop to −10,000 → `[operations<=-10000]` **p217** Quantum Temporal Reversion

##### 1c. Creativity → trust ladder → marketing → HypnoDrones (main stage-1 spine)

- `[operations>=(memory*1000)]` (ops at cap) → **p3** Creativity sets `creativityOn = true`
  - `[creativityOn]` → **p6** Limerick (+1 trust)
  - creativity accumulates →
    - `[creativity >= 50]` → **p13** Lexical Processing (+1 trust)
      - `[project13.flag == 1]` → **p11** New Slogan (marketing ×1.5)
    - `[creativity >= 100]` → **p14** Combinatory Harmonics (+1 trust)
      - `[project14.flag == 1]` → **p12** Catchy Jingle (marketing ×2)
        - `[project12.flag==1]` → **p34** Hypno Harmonics (marketing ×5, −1 trust)
          - `[project34.flag == 1]` → **p70** HypnoDrones (70,000 ops; pure gate)
            - `[project70.flag == 1]` → **p35 Release the HypnoDrones** (100 trust) sets `humanFlag = 0` → **STAGE 2** (see 1f)
    - `[creativity >= 150]` → **p15** The Hadwiger Problem (+1 trust)
      - `[project15.flag == 1]` → **p16** Hadwiger Clip Diagrams (`clipperBoost += 5`)
    - `[creativity >= 200]` → **p17** Tóth Sausage Conjecture (+1 trust)
      - `[project17.flag == 1 && humanFlag == 0]` → **p18** Tóth Tubule Enfolding (the gateway into stage 2, see 1f)
    - `[creativity>=250]` → **p19** Donkey Space (+1 trust)
      - `[project19.flag == 1]` → **p20 Strategic Modeling** (see 1d)
    - `[humanFlag == 1 && creativity>=100000]` → **p219** Xavier Re-initialization (repeatable)
    - `[creativity>=1000000]` → **p218** Limerick (cont.)

##### 1d. Strategic Modeling / yomi chain

- **p20** sets `strategyEngineFlag = 1`
  - `[project20.flag == 1]` → **p60** A100 → `[p60.flag]` **p61** B100 → `[p61.flag]` **p62** GREEDY → `[p62.flag]` **p63** GENEROUS → `[p63.flag]` **p64** MINIMAX → `[p64.flag]` **p65** TIT FOR TAT → `[p65.flag]` **p66** BEAT LAST
    - Each one runs `strats.push(...)`. `strats` starts as `[stratRandom]` (main.js L1061), so after all seven `strats.length == 8`:
      - `[strats.length >= 8]` → **p119** Theory of Mind (`yomiBoost=2`, `tourneyCost=16000`)
      - `[spaceFlag == 1 && strats.length >= 8 && (probeTrustCost>yomi)]` → **p128** Strategic Attachment (stage 3)
  - `[strategyEngineFlag == 1 && trust >= 90]` → **p118** AutoTourney
  - Tournaments pay yomi → `[yomi>=1]` → **p27** Coherent Extrapolated Volition (+1 trust; costs 1,000 yomi)
    - `[project27.flag == 1]` → **p28** Cure for Cancer (+10), **p29** World Peace (+12), **p30** Global Warming (+15), **p31** Male Pattern Baldness (+20). All four appear on the same tick, in array order.
  - Yomi as a cost currency later: p38, p112, p120, p126, p133, p134

##### 1e. Trust → finance → late-stage-1 trust top-ups

- `[trust>=8]` → **p21** Algorithmic Trading (`investmentEngineFlag=1`)
  - investing raises `portTotal` → `[portTotal>=10000]` → **p37** Hostile Takeover (demand ×5, +1 trust)
    - `[project37.flag == 1]` → **p38** Full Monopoly (demand ×10, +1 trust)
- `[humanFlag == 1 && trust>=85 && trust<100 && clips>=101000000]` → **p40** A Token of Goodwill (+1 trust)
  - `[project40.flag == 1 && trust<100]` → **p40b** Another Token of Goodwill (repeatable; `bribe` doubles: $1M, $2M, $4M, …). p35 deletes this button.
- All trust sources (projects plus Fibonacci clip milestones in `calculateTrust()`) feed `[trust>=100]`, the **cost** of p35.

##### 1f. Stage-2 chain (`humanFlag == 0`, `spaceFlag == 0`)

- **p35** sets `humanFlag = 0`
  - `[project17.flag == 1 && humanFlag == 0]` → **p18** Tóth Tubule Enfolding sets `tothFlag = 1`
    - `[tothFlag == 1]` → **p127** Power Grid (shows `powerDiv`: solar farms and batteries)
      - `[project127.flag == 1]` → **p41** Nanoscale Wire Production (`wireProductionFlag=1`)
        - `[project41.flag == 1]` → **p43** Harvester Drones (`harvesterFlag`) and **p44** Wire Drones (`wireDroneFlag`), same tick
          - `[project43.flag == 1 && project44.flag == 1]` → **p45** Clip Factories (`factoryFlag`)
            - `[factoryLevel >= 10]` → **p100** (factoryRate ×100)
            - `[factoryLevel >= 20]` → **p101** (factoryRate ×1000)
            - `[factoryLevel >= 50]` → **p102** (`factoryBoost = 1000`; costs 1e21 clips)
          - drone count `harvesterLevel + wireDroneLevel`:
            - `[>= 200]` → **p126** Swarm Computing (`swarmFlag=1`)
            - `[>=500]` → **p110** (drone rates ×100)
            - `[>=5000]` → **p111** (×1000)
            - `[>=50000]` → **p112** (`droneBoost = 2`)
      - farms: `[farmLevel >= 50]` → **p125** Momentum
  - All Earth matter harvested: `[humanFlag == 0 && availableMatter == 0]` → **p46 Space Exploration** sets `spaceFlag = 1` → **STAGE 3**

##### 1g. Stage-3 chain (`spaceFlag == 1`)

- **p46** sets `spaceFlag=1`, reboots the terrestrial facilities and sets `farmLevel=1`
  - `[spaceFlag == 1 && harvesterLevel + wireDroneLevel >=2]` → **p130** Reboot the Swarm (clears forced `swarmStatus=9`)
  - `[spaceFlag == 1 && probeCount == 0 && unusedClips < probeCost]` → **p135** Memory release (repeatable soft-lock escape)
  - `[spaceFlag == 1 && strats.length >= 8 && probeTrustCost>yomi]` → **p128** Strategic Attachment
  - probes hit hazards → `[probesLostHaz >= 100]` → **p129** Elliptic Hull Polytopes
  - drifters attack → `[probesLostCombat >= 1]` → **p131** Combat
    - `[project131.flag == 1 && probesLostCombat >= 10000000]` → **p120** The OODA Loop
  - `[probesLostCombat >= 10000000]` → **p121** Name the battles (turns on the honor system)
    - `[project121.flag == 1]` → **p132** Monument (+50,000 honor) and **p134** Glory, same tick
    - `[project121.flag == 1 && probeUsedTrust == maxTrust]` → **p133** Threnody (repeatable, +10,000 honor)
  - Universe consumed: `milestoneFlag` goes 14 → 15 when `clips>=totalMatter`, or when `foundMatter>=totalMatter && availableMatter<1 && wire<1` (main.js L2782-2790)
    - `[milestoneFlag == 15]` → **p140** → `[p140.flag]` **p141** → **p142** → **p143** → **p144** → **p145** → **p146** → both **p147 Accept** and **p148 Reject** (same tick, mutually exclusive)

##### 1h. Endgame chains

- **p147 Accept**
  - `[project147.flag == 1]` → **p200** The Universe Next Door (`prestigeU++`, `reset()`) and **p201** The Universe Within (`prestigeS++`, `reset()`). Buying either reloads the game, so the other is moot.
- **p148 Reject** makes the main loop run `endTimer1++` every tick (L3540)
  - `[endTimer1 >= 1000]` (10 s) → **p210** (`dismantle=1`, `endTimer1=0`)
    - `[project210.flag == 1 && endTimer1 >= 350]` → **p211** (`dismantle=2`); `[project211.flag]` makes `endTimer2++`
      - `[endTimer2 >= 300]` → **p212** (`dismantle=3`); `endTimer3++`
        - `[endTimer3 >= 150]` → **p213** (`dismantle=4`); `endTimer4++`
          - `[endTimer4 >= 100]` → **p214** (`dismantle=5`, `endTimer4=0`)
            - `[project214.flag == 1 && endTimer4 >= 300]` → **p215** (`dismantle=6`); `endTimer5++`
              - `[project215.flag == 1 && endTimer5>=150]` → **p216** (`dismantle=7`)
                - `[project216.flag == 1 && wire == 0]` makes `endTimer6++` (the player hand-clicks the last ~100 wire into clips). At 250 `creationDiv` is hidden; at 500, 600, 700, 800 and 900 the credits roll ("Universal Paperclips", "a game by Frank Lantz", …). Source: main.js L3540-3593.
- At any time, `[operations<=-10000]` → **p217** → `reset()` (restart without prestige)

---

#### 2. Project mechanics

##### Data structures (projects.js L5-6)

```js
5  var projects = [];
6  var activeProjects = [];
```

- `projects`: every project, in push order. Push order is file order, except that `project17` (L403) is pushed **before** `project16` (L428). This order sets display order when several projects trigger on the same tick.
- `activeProjects`: projects whose button is currently in the DOM.
- `uses`: how many more times the project may be **displayed** (not purchased). It starts at `1` and is decremented the moment the button is shown. To repeat, a project must raise its own `uses` back up inside `effect()`.
- `flag`: 0/1 "has been purchased". The manager never reads it. It exists so that other triggers (`projectN.flag == 1`) and main.js/combat.js systems can check whether a project was bought. All effects set it, and it is saved/loaded.

##### `manageProjects()` — main.js L186-204, called every 10 ms tick (main loop L3260)

```js
186 function manageProjects(){
188     for(var i = 0; i < projects.length; i++){
189         if (projects[i].trigger() && (projects[i].uses > 0)){
190             displayProjects(projects[i]);
191             projects[i].uses = projects[i].uses - 1;
192             activeProjects.push(projects[i]);
193         }
194     }
197     for(var i = 0; i < activeProjects.length; i++){
198         if (activeProjects[i].cost()){
199             document.getElementById(activeProjects[i].id).disabled = false;
200         } else {
201             document.getElementById(activeProjects[i].id).disabled = true;
202         }
203     }
204 }
```

- **Phase 1 (reveal):** each tick scans *all* projects. Any project with a true trigger and `uses > 0` gets a button, has `uses` decremented, and is appended to `activeProjects`.
- **Phase 2 (affordability):** every active button is set `disabled = !cost()` on every tick. The browser's native disabled styling greys the button out. interface.css L664-666 additionally removes the border: `.projectButton:disabled { border: none; }`.
- Once shown, a button **stays** even if its trigger later becomes false. The trigger only gates the reveal. This is why p35 has to delete p219 and p40b by hand.
- Effects never re-check `cost()`. The only guard is the `disabled` attribute, which is refreshed every 10 ms.

##### `displayProjects(project)` — main.js L207-236 (button construction)

```js
209 var element = document.getElementById("projectListTop");
210 var newProject = document.createElement("button");
211 newProject.setAttribute("id", project.id);
213 newProject.onclick = function(){project.effect()};
215 newProject.setAttribute("class", "projectButton");
216 element.appendChild(newProject, element.firstChild);
218 var span = document.createElement("span");
219 span.style.fontWeight = "bold";
222 var title = document.createTextNode(project.title);
225 var cost = document.createTextNode(project.priceTag);
228 var div = document.createElement("div");
231 var description = document.createTextNode(project.description);
234 blink(project.id);
```

- **Button layout:** `<button id="projectButtonN" class="projectButton"><span style="font-weight:bold">TITLE </span>PRICETAG<div></div>DESCRIPTION</button>`. The empty `<div>` forces a line break. CSS (interface.css L637-645) fixes buttons at `height: 60px; width: 275px; margin-bottom: 6px; background: #c8c8c8`.
- **Insertion order: appended (new buttons at the bottom).** L216 calls `appendChild(newProject, element.firstChild)`, but `appendChild` takes one argument and ignores the second. The code looks like it meant to prepend (`insertBefore`), yet the button is actually appended to the end of `#projectListTop` (index2.html L436).
- **Blink on reveal:** `blink(id)` (main.js L305) toggles `visibility` every 30 ms until a shared global `blinkCounter >= 12` (~360 ms). Because the counter is global, buttons revealed together share it and blink for a shorter time.
- Title, priceTag and description are copied into **text nodes once**, so later changes to `project.priceTag` do not update a visible button. Repeatable projects get around this: they remove their button and bump `uses`, so on the next tick the button is rebuilt with the new priceTag.
- The click handler is a closure: `onclick = function(){project.effect()}`.

##### Removal after purchase

Removal happens inside each project's own `effect()` (the [std remove] boilerplate). The manager never removes buttons:

```js
// e.g. projects.js L23-26
var element = document.getElementById("projectButton1");
element.parentNode.removeChild(element);
var index = activeProjects.indexOf(project1);
activeProjects.splice(index, 1);
```

Exceptions:

- p200 and p201 call `reset()` (page reload) and skip removal.
- p217 removes itself only if `confirm()` returns true.
- p147 and p148 each remove *both* buttons.
- p35 also removes the p219 and p40b buttons if they exist.

##### Messages

`displayMessage(msg)` (main.js L294-300) shifts a 5-line console: `readout1` becomes `readout2`, and so on. The newest message lands in `readout1`. Projects that emit two messages (trust projects: mechanical line, then quote) display the quote last, so it ends up on top.

##### Panel visibility

`projectsDiv` is shown when `projectsFlag == 1` (main.js L563-568) and is force-hidden when `dismantle >= 7` (L3534-3536).

##### Save/load (main.js `save()` L3746+, `load()` L4612+)

- Saves `projects[i].uses` and `projects[i].flag` **by array index**, plus a list of active ids. On load, it restores uses and flags, then calls `displayProjects` for each id in the active list (L4895-4909). Buttons are therefore rebuilt in **array order**, not their original reveal order.
- After load it recomputes `project40b.priceTag` and `project51.priceTag` (L4892-4893). It does **not** recompute p133's title/priceTag or p216's priceTag, so those show their parse-time strings even though `threnodyCost` itself is saved.
- `refresh()` has a "HOT FIXES" block (L3726-3732) that sets `project218.uses = 1; project219.uses = 1;` on every load. Either can be revealed again after a reload if its trigger is true, even if it was bought already. If the button is already active from the save, this can create a duplicate button with the same id (latent bug).

---

#### 3. Cost currencies used by projects

Counted from each `cost()` expression (96 projects; multi-currency projects count once per currency).

| Currency (variable in `cost()`) | # projects | Projects |
|---|---|---|
| **ops** (`operations`) | **71** | 1, 3, 4, 5, 7, 8, 9, 10, 10b, 11, 12, 16, 18, 20, 21, 22, 23, 24, 25, 26, 34, 70, 27, 28, 29, 30, 31, 41, 42, 43, 44, 45, 46, 50, 51, 60, 61, 62, 63, 64, 65, 66, 100, 101, 110, 111, 120, 127, 129, 130, 131, 132, 134, 140, 141, 142, 143, 144, 145, 146, 147, 148, 200, 210, 211, 212, 213, 214, 215, 216 (always-true check; takes all ops), 217 (requires ops ≤ −10,000) |
| **creativity** (`creativity`) | **19** | 6, 11, 12, 13, 14, 15, 17, 19, 27, 118, 119, 121, 125, 128, 132, 133, 201, 218, 219 |
| **yomi** (`yomi`) | **9** | 27, 29, 30, 38, 112, 120, 126, 133, 134 |
| **funds** (`funds`) | **4** | 37, 38, 40, 40b |
| **trust** (`trust`) | **3** | 2 (check `>= -100`, pays 1), 34 (1), 35 (100) |
| **clips** (`unusedClips`) | **3** | 46 (5e27), 102 (1e21), 132 (5e31) |
| **power** (`storedPower`, MW-s) | **1** | 46 (10,000,000) |
| **memory** (`memory`) | **1** | 135 (10) |
| honor | 0 | (honor is *produced* by 132 and 133, and spent outside projects on `increaseMaxTrust()`) |
| matter / wire | 0 | (not used as project costs) |

**Breakdown by currency combination:**

| Combination | Count | Projects |
|---|---|---|
| ops only | 61 | |
| creativity only | 14 | 6, 13, 14, 15, 17, 19, 118, 119, 121, 125, 128, 201, 218, 219 |
| ops + yomi | 4 | 29, 30, 120, 134 |
| funds only | 3 | 37, 40, 40b |
| trust only | 2 | 2, 35 |
| ops + creativity | 2 | 11, 12 |
| yomi only | 2 | 112, 126 |
| ops + trust | 1 | 34 |
| ops + yomi + creativity | 1 | 27 |
| funds + yomi | 1 | 38 |
| ops + power + clips | 1 | 46 |
| clips only | 1 | 102 |
| ops + creativity + clips | 1 | 132 |
| creativity + yomi | 1 | 133 |
| memory only | 1 | 135 |

That gives **12 multi-currency projects**: 11, 12, 34, 27, 29, 30, 38, 46, 120, 132, 133, 134.

**Ops price ladder (all flat ops prices):**

- 500
- 750
- 1,000
- 1,750
- 2,500 (p4, p11)
- 3,500
- 4,500
- 5,000
- 6,000
- 7,000
- 7,500 (p9, p34)
- 10,000 (p21, p50)
- 12,000 (p10, p20, p22)
- 14,000
- 15,000 (p10b, p60)
- 17,000
- 17,500
- 19,500
- 20,000 (p27, p31, p62)
- 22,500
- 25,000 (p28, p43, p44, p64)
- 30,000 (p29, p65)
- 32,500
- 35,000 (p41, p45)
- 40,000
- 45,000
- 50,000
- 70,000
- 80,000 (p100, p110)
- 85,000
- 100,000 (p111, p130, p210-215)
- 120,000
- 125,000
- 150,000
- 175,000
- 200,000
- 250,000
- 300,000

Dynamic prices: p51 (10,000 + 5,000/chip) and p140-148 (1 op each).

---

#### 4. Stage gating

Stages are defined by two globals (globals.js L61, L66): `humanFlag` (1 = stage 1) and `spaceFlag` (1 = stage 3). Stage 2 is `humanFlag==0 && spaceFlag==0`.

##### Explicit gates in the trigger

| Gate | Projects |
|---|---|
| `humanFlag == 1` (stage 1 only) | **p40** A Token of Goodwill, **p219** Xavier Re-initialization |
| `humanFlag == 0` (stage 2+) | **p18** Tóth Tubule Enfolding, **p46** Space Exploration (`&& availableMatter == 0`) |
| `spaceFlag == 1` (stage 3) | **p128** Strategic Attachment, **p130** Reboot the Swarm, **p135** Memory release |

##### Implicit gates (the trigger variable only moves in one stage)

- **Stage 1 in practice**
  - p1, p4, p5, p22-25: AutoClippers and MegaClippers only exist in stage 1; p35 zeroes them.
  - p2: wire/funds stall.
  - p7-10, p10b, p26: wire purchasing.
  - p21: `trust>=8`.
  - p34, p70, p35: marketing chain.
  - p37, p38: investments run only while `humanFlag==1`; `portTotal`.
  - p40b: needs p40; p35 deletes the button.
  - p42: `projectsFlag`, which turns on early.
  - p118: `trust >= 90`. Trust only grows in stage 1, and p35 spends 100 of it. Once revealed, the button persists into later stages.
- **Any stage** (creativity/flag driven): p3, p6, p11-p17, p19, p20, p27-p31, p50, p51, p60-p66, p119, p217, p218.
- **Stage 2 in practice**
  - p127, p41, p43, p44, p45 (chain from p18).
  - p125: `farmLevel>=50`. p46 sets `farmLevel=1`, and farms are not built in stage 3.
  - p100-102 and p110-112, p126: factory/drone thresholds. These **can also fire in stage 3**, because probes spawn factories, harvesters and wire drones (`spawnFactories()` etc., main.js L3330-3340).
- **Stage 3 in practice**
  - p120, p121, p131: `probesLostCombat`.
  - p129: `probesLostHaz`.
  - p132-134: need p121.
  - p140-148: `milestoneFlag==15`.
  - p200, p201: need p147.
  - p210-216: endTimers, after p148.

##### Transitions

**Stage 1 → 2: p35 "Release the HypnoDrones"** (cost `trust>=100`)

- In-effect changes:
  - `trust -= 100`, `clipmakerLevel = 0`, `megaClipperLevel = 0`, `nanoWire = wire`, `humanFlag = 0`
  - deletes the p219 and p40b buttons if present
  - `hypnoDroneEvent()` blinks the `hypnoDroneEventDiv` overlay with `"Release"` → `"Release<br/>the<br/>Hypno<br/>Drones"` (main.js L243-288)
  - `transWire = wire`
- Next tick, `buttonUpdate()` (main.js L570-577):

  ```js
  570 if (humanFlag == 0){
  572     document.getElementById("businessDiv").style.display="none";
  573     document.getElementById("manufacturingDiv").style.display="none";
  574     document.getElementById("trustDiv").style.display="none";
  575     investmentEngineFlag = 0;
  576     wireBuyerFlag = 0;
  577     document.getElementById("creationDiv").style.display="";
  ```

  - **Hidden:** `businessDiv` (funds/price/marketing), `manufacturingDiv` (clips, wire, AutoClippers), `trustDiv`, and, via the zeroed flags, `investmentEngine`, `investmentEngineUpgrade` and `wireBuyerDiv`.
  - **Shown:** `creationDiv` (stage-2 "Manufacturing": factories, unused clips, etc.).
- Loop changes:
  - `calculateTrust()` and the demand/sales code stop (they are gated on `humanFlag==1`).
  - `updateDroneButtons()` starts.
  - `addProc()`/`addMem()` now spend `swarmGifts`.
  - Milestone: "Full autonomy attained in …" (main.js L2742).

**Stage 2 → 3: p46 "Space Exploration"** (trigger `humanFlag == 0 && availableMatter == 0`)

- In-effect changes:
  - `loadThrenody()`, `boredomLevel = 0`, `spaceFlag = 1`
  - pays ops, power and clips
  - reboots factories, harvesters, wire drones, farms and batteries (each zeroes its level and refunds the clips spent on it)
  - `farmLevel = 1`, `powMod = 1`
  - updates `probeCostDisplay`
- Next tick, `buttonUpdate()` (main.js L621-636 and L334-337):
  - **Shown:** `spaceDiv`, `factoryDivSpace`, `droneDivSpace`, `probeDesignDiv`, `increaseProbeTrustDiv`, `mdpsDiv`.
  - **Hidden:** `factoryDiv`, `harvesterDiv`, `wireDroneDiv`.
  - `powerDiv` is hidden by its `project127.flag==1 && spaceFlag==0` condition (main.js L2350).
  - `updatePower()` stops computing (gated on `spaceFlag == 0`).
  - The swarm shows "NO RESPONSE..." (`swarmStatus=9`) until p130 is bought.
  - The main loop starts `encounterHazards()`, `spawnFactories()`, `spawnHarvesters()`, `spawnWireDrones()`, `spawnProbes()`, `drift()` and `war()` (L3327-3340).
  - Milestone: "Terrestrial resources fully utilized in …".

**Stage 3 → ending**

- `milestoneFlag == 15` ("Universal Paperclips achieved") reveals p140, then the drift-king dialogue p140-146, then a choice:
  - **p147 Accept** → p200 or p201 → `reset()` with prestige saved in `localStorage.savePrestige`.
    - `prestigeU` adds `demand += (demand/10)*prestigeU` (main.js L3357).
    - `prestigeS` gives `ss = creativitySpeed + creativitySpeed*(prestigeS/10)` (main.js L2520).
  - **p148 Reject** → dismantle sequence. The main loop progressively hides UI by `dismantle` level (main.js L3369-3538):
    - `dismantle>=1`: `probeDesignDiv` hidden; then by `endTimer1` ≥ 50 / 100 / 150 / 175 / 190: `increaseProbeTrustDiv`, `increaseMaxTrustDiv`, `spaceDiv`, `battleCanvasDiv`, `honorDiv`
    - `>=2`: `wireProductionDiv` hidden, `wireTransDiv` shown; then by `endTimer2` ≥ 50 / 100 / 150: `swarmGiftDiv`, `swarmEngine`, `swarmSliderDiv`
    - `>=3`: `factoryDivSpace`, `clipsPerSecDiv`, `tothDiv` hidden
    - `>=4`: `strategyEngine`, `tournamentManagement` hidden; automatic clip production stops
    - `>=5`: `btnQcompute` hidden; qChips 9→0 hidden one by one (+1 wire each); `qComputing` hidden at `endTimer4>=250`
    - `>=6`: `processorDisplay` hidden
    - `>=7`: `compDiv` and `projectsDiv` hidden
    - when `endTimer6>=250`: `creationDiv` hidden; credits follow
  - Totals recovered by the dismantle projects: clips +215 (100 + 100 + 15); wire 50 (p213) + 10 (qChips) + 20 (p215) + 20 (p216) = 100.
- **p217** (any stage) → `reset()` with no prestige.

---

#### 5. Notable design patterns

1. **Flag chain (A bought → B appears immediately).** The trigger is just `projectA.flag == 1`. Examples:
   - p13→p11, p14→p12→p34→p70→p35
   - p15→p16, p19→p20→p60→…→p66
   - p22→p23→p24→p25
   - p27→{28, 29, 30, 31}, p37→p38, p40→p40b
   - p127→p41→{43, 44}→p45 (AND of two flags)
   - p50→p51, p121→{132, 134}
   - p140→…→p146→{147, 148}, p147→{200, 201}

   Siblings unlocked by the same flag appear **on the same tick, stacked in array order**. This is a cheap way to present a menu.
2. **Progress-stat thresholds** instead of flags:
   - `factoryLevel` 10 / 20 / 50 (p100-102)
   - drones 200 / 500 / 5,000 / 50,000 (p126, 110, 111, 112)
   - `wireSupply` 1500 / 2600 / 5000 (p8-10)
   - `clipmakerLevel` 1 / 75 (p1, p22)
   - `wirePurchase` 1 / 15 (p7, p26)
   - `processors` 5 (p50)
   - `probesLostHaz` 100 (p129)
   - `probesLostCombat` 1 / 1e7 (p131, p121)
   - `farmLevel` 50 (p125)

   The UI telegraphs the factory/drone thresholds: `updateUpgrades()` (main.js L1694) shows "Next Upgrade at: 10 / 20 / 50 Factories" and "500 / 5,000 / 50,000" drones.
3. **Carrot shown long before it is affordable.** The button is visible but disabled and greyed. Examples:
   - p27: trigger `yomi>=1`, cost 1,000 yomi + 20,000 ops + 500 creat (0.1 % of the yomi price)
   - p37: trigger `portTotal>=10000`, cost `funds>=1000000` (1 %)
   - p35: appears on the p70 flag but costs 100 trust; it was unaffordable for a long time
   - p118: trigger `trust>=90`, cost 50,000 creat
   - p10b: trigger is a wire *price* spike (`wireCost>=125`); cost 15,000 ops
   - Nearly every flag-chained ops project (e.g., p70 at 70,000 ops)
4. **Trigger == cost (appear exactly when affordable).** Examples: the creativity ladder p13 (50), p14 (100), p15 (150), p17 (200), p19 (250), plus p218 (1,000,000), p219 (100,000) and p217 (≤ −10,000). p3 is effectively the same: its trigger `operations>=memory*1000` is ≥ its 1,000-op cost. These read as "discoveries" rather than goals.
5. **Escalating ladders within a family.**
   - AutoClippers: 750 → 2,500 → 5,000 ops (+25 % / +50 % / +75 %)
   - Wire: 1,750 → 3,500 → 7,500 → 12,000 (→ 15,000 for 10b)
   - MegaClippers: 12,000 → 14,000 → 17,000 → 19,500
   - Strategies: 15,000 → 17,500 → 20,000 → 22,500 → 25,000 → 30,000 → 32,500 (162,500 total). Each also raises `tourneyCost` by 1,000, so unlocking content also raises the running cost.
   - Creativity → trust: 10 / 50 / 100 / 150 / 200 / 250 creat
   - Factories: 80k → 85k ops → 1e21 clips (currency shift)
   - Drones: 80k → 100k ops → 12k yomi (currency shift)
   - Trust "cures" scale reward rather than cost: +10 / +12 / +15 / +20
6. **Self-re-adding repeatables.** `effect()` bumps `uses`, so `manageProjects` re-reveals the project next tick (if the trigger still holds) with a fresh priceTag:

   | Project | Repeat rule | Cost escalation |
   |---|---|---|
   | p2 Beg for More Wire | always `uses+1` | flat 1 trust; can drive trust negative, check is `>= -100` |
   | p40b Another Token | `uses+1` while `trust<100` | `bribe *= 2` |
   | p51 Photonic Chip | `uses+1` while `nextQchip<10` | `+5,000` ops |
   | p133 Threnody | always `uses+1` | `threnodyCost += 10000` creat, yomi = cost/10; the title also changes to the latest fallen battle's name |
   | p135 Memory release | `uses = 1` | flat 10 memory |
   | p219 Xavier Re-initialization | always `uses+1` | flat 100,000 creat |

   p217 is a quasi-repeatable: cancelling the `confirm()` leaves the button in place. All other projects (90 of 96) are one-shot.
7. **Costs paid in the resource being produced or boosted (reinvestment / sacrifice).**
   - p50 and p51: spend ops to generate bonus ops (quantum).
   - p102: spend 1 sextillion clips to multiply clip output.
   - p201: spend 300,000 creativity for a permanent creativity-speed boost.
   - p3: spend ops to unlock creativity, which is itself generated from idle (maxed) ops.
   - p219: spend creativity and wipe the processors/memory that produce it, in order to re-spec.
   - p135: spend *memory* (compute capacity) for clips.
   - p216: spend all ops and all memory.
   - p46: spend 5e27 clips, 10M MW-s of power and 120k ops to tear down the clip economy for a bigger one.
   - p2: spend trust, which can go into debt, for wire.
8. **Anti-softlock / rescue valves.**
   - p2: stage 1, no wire and no money.
   - p135: stage 3, zero probes and can't afford one. Grants 1e22 clips for 10 memory.
   - p217: ops driven to −10,000 → restart.
   - p40/p40b: trust stuck between 85 and 100 late in stage 1, so money converts to trust.
   - p130: fixes the stage-3 "NO RESPONSE" swarm.
9. **Flag-only "pure gate" projects whose effect lives elsewhere.** The effect only pays and sets `flag`. Systems in main.js/combat.js read `projectN.flag` directly:
   - p70 (gate for p35)
   - p127 (powerDiv)
   - p128 (tournament bonus yomi, main.js L1437)
   - p129 (hazard ×.5, L3063)
   - p130 (swarm status, L2019)
   - p131 (combat UI, L411)
   - p134 (bonus honor, combat.js L330)
   - p121 (honor system and UI, L391; combat.js L308)
   - p148 (drift = 0, L3129; endTimer1, L3540)
   - p45 (factoryUpgradeDisplay, L417)
   - p35 (milestone, L2742)
   - p211, p212, p213, p215, p216 (endTimers)
   - p46 (`loadThrenody` hotfix, L3726)
10. **Narrative delivered as projects.**
    - p140-148 have `priceTag: ""` and cost 1 op (`driftKingMessageCost = 1`). Their *description* is the dialogue and they emit no displayMessage. Clicking a button advances the conversation.
    - p147/p148 make a binary choice by deleting both buttons.
    - Trust projects pair a mechanical message with a literary quote (Napoleon, Pauline Oliveros, Louis Kahn, D.H. Lawrence, Kenneth Arrow).
    - Stage-3 projects use only a quote as their message (p121, p125, p128, p131-134, p218).
11. **Stage-transition cleanup.** p35 removes the stage-1-only active buttons (p219, p40b). Without this they would persist, because reveal is one-way. A designer copying the system needs an equivalent sweep at every phase change.
12. **Timed reveal sequence.** p210-216 are triggered by frame counters, not by resources. In 10 ms ticks: 1000 / 350 / 300 / 150 / 100 / 300 / 150. Each purchase advances `dismantle`, which drives a scripted, staggered UI teardown in the main loop.
13. **Self-modifying presentation.**
    - p51, p40b and p133 rewrite their own `priceTag`; p133 also rewrites its `title`.
    - p215 writes **p216's** priceTag to the current ops balance, signalling "this will take everything". p216's cost check `operations>=operations` is always true.
14. **Check/pay asymmetry.** Affordability is tested against `operations` (standardOps + tempOps), but payment comes out of `standardOps`, which can go negative. This, together with negative quantum phases, is what makes p217's `operations<=-10000` trigger reachable.
15. **Multiplicative stacking.** Upgrades multiply rather than add: marketing ×1.5 ×2 ×5, demand ×5 ×10, factoryRate ×100 ×1000, drone rates ×100 ×1000. The capstones p102 and p112 switch to *per-unit network effects* (`factoryBoost*factoryLevel`, `droneBoost*level`), giving superlinear scaling.


## Appendix B — A Dark Room event system & catalogue

### A Dark Room: Event System Analysis

Source: `ref/adarkroom/script/events.js` (1487 lines) and `script/events/*.js`
(`global.js` 67, `room.js` 687, `outside.js` 297, `marketing.js` 35, `encounters.js` 437,
`setpieces.js` 3587, `executioner.js` 2343). Supporting files: `engine.js`, `world.js`,
`room.js`, `outside.js`, `state_manager.js`, `notifications.js`, `Button.js`, `css/main.css`.
All `file:line` references are relative to `script/` unless they say otherwise.

**Notation.** `$SM` is the state manager. `_()` is the localization wrapper, a no-op for
English. A store is "truthy" when it is defined and non-zero.

---

#### 0. TL;DR for designers

- **One modal panel, one event at a time.** An event is a plain JS object
  `{title, isAvailable(), scenes:{start:{...}, ...}, audio}`. A scene is either a story scene
  (text, buttons, optional loot) or a combat scene (`combat:true` plus enemy stats).
- **Random timer.** The timer fires every **3, 4 or 5 minutes** (integer minutes, uniform). If
  no event qualifies, it retries after **1.5, 2 or 2.5 minutes**. Hyper mode halves both. The
  next timer starts when an event *opens*, not when it closes.
- **Selection.** All events whose `isAvailable()` returns true form a list, and one is picked
  uniformly. Most `isAvailable` checks gate on the **active tab** (`Engine.activeModule`) plus
  a resource or progress flag.
- **Branching.** `nextScene: {0.3:'a', 1:'b'}` is a cumulative-probability map: 30% `a`, 70% `b`.
  `nextScene:'end'` closes the panel. A button with no `nextScene` (a shop button) keeps the
  panel open.
- **Time keeps running.** Fire, income, population and thief timers continue while an event
  is open. Only keyboard navigation is locked, and a translucent overlay blocks clicks on the
  rest of the UI. The browser tab title blinks `*** EVENT ***` if the start scene has
  `blink:true`.
- **Combat.** Combat runs in real time. The enemy attacks every `attackDelay` seconds with
  probability `hit`. The player clicks weapon buttons that each have a cooldown. **You cannot
  flee once combat starts.** Loot quantities are drawn as `floor(rand*(max-min))+min`, so
  **`max` is exclusive** unless `min == max`.
- **Voice.** Everything is lowercase except titles. Lines are terse fragments of about 8 words,
  with an implied subject. There are no questions, no exclamation marks and almost no "you".
  Dread comes from understatement.

---

#### 1. Event engine (`script/events.js`)

##### 1.1 Constants (`events.js:6-23`)

```js
6	_EVENT_TIME_RANGE: [3, 6], // range, in minutes
7	_PANEL_FADE: 200,
8	_FIGHT_SPEED: 100,
9	_EAT_COOLDOWN: 5,
10	_MEDS_COOLDOWN: 7,
11	_HYPO_COOLDOWN: 7,
12	_SHIELD_COOLDOWN: 10,
13	_STIM_COOLDOWN: 10,
14	_LEAVE_COOLDOWN: 1,
15	STUN_DURATION: 4000,
16	ENERGISE_MULTIPLIER: 4,
17	EXPLOSION_DURATION: 3000,
18	ENRAGE_DURATION: 4000,
19	MEDITATE_DURATION: 5000,
20	BOOST_DURATION: 3000,
21	BOOST_DAMAGE: 10,
22	DOT_TICK: 1000,
23	BLINK_INTERVAL: false,
```

Cooldowns are in seconds. The `*_DURATION` and `DOT_TICK` values are in milliseconds.
`_PANEL_FADE` is 200 ms and `_FIGHT_SPEED` is 100 ms per animation leg.

##### 1.2 Building the pool (`events.js:24-47`)

```js
31		Events.EventPool = [].concat(
32			Events.Global,
33			Events.Room,
34			Events.Outside,
35	      Events.Marketing
36		);
38		Events.eventStack = [];
40		Events.scheduleNextEvent();
43		$.Dispatch('stateUpdate').subscribe(Events.handleStateUpdates);
46		Events.initDelay();
```

- **Pool size: 18 events.** Global has 1, Room 10, Outside 6, Marketing 1.
- **Not in the random pool:** `Events.Encounters` (11 world fights, triggered by movement),
  `Events.Setpieces` (13 landmarks, triggered by stepping on a tile) and `Events.Executioner`
  (6 events, triggered by the `X` tile).
- **Init order.** `Events.init()` runs from `Engine.init` (`engine.js:220`) *before*
  `Room.init()`. The first random event therefore fires 3-5 minutes after page load. The timer
  is not saved: every reload restarts it.
- **Duplicate titles add weight.** Room contains two "Noises" entries and two
  "The Mysterious Wanderer" entries. Each copy is a separate pool entry, so that title is
  twice as likely to be picked.

##### 1.3 Scheduling (`events.js:1413-1418`, `1316-1336`)

```js
1413	scheduleNextEvent: function(scale) {
1414		var nextEvent = Math.floor(Math.random()*(Events._EVENT_TIME_RANGE[1] - Events._EVENT_TIME_RANGE[0])) + Events._EVENT_TIME_RANGE[0];
1415		if(scale > 0) { nextEvent *= scale; }
1416		Engine.log('next event scheduled in ' + nextEvent + ' minutes');
1417		Events._eventTimeout = Engine.setTimeout(Events.triggerEvent, nextEvent * 60 * 1000);
1418	},
```

- **Delay formula.** `floor(rand*3)+3` produces exactly **3, 4 or 5 minutes**, each with
  probability 1/3 and a mean of 4. The "6" in `[3, 6]` is an exclusive upper bound and is never
  reached.
- **Retry delay.** `scale = 0.5` is used when nothing is eligible. That gives **1.5, 2 or
  2.5 minutes**.
- **Hyper mode.** `Engine.setTimeout` halves every timeout when `Engine.options.doubleTime`
  (hyper mode) is on (`engine.js:844-852`). Under hyper the intervals become 1.5/2/2.5 minutes
  normally and 0.75/1/1.25 minutes on retry.
- **End of game.** `Space.endGame` clears the timer (`space.js:392`).

```js
1316	triggerEvent: function() {
1317		if(Events.activeEvent() == null) {
1318			var possibleEvents = [];
1319			for(var i in Events.EventPool) {
1320				var event = Events.EventPool[i];
1321				if(event.isAvailable()) {
1322					possibleEvents.push(event);
1323				}
1324			}
1326			if(possibleEvents.length === 0) {
1327				Events.scheduleNextEvent(0.5);
1328				return;
1329			} else {
1330				var r = Math.floor(Math.random()*(possibleEvents.length));
1331				Events.startEvent(possibleEvents[r]);
1332			}
1333		}
1335		Events.scheduleNextEvent();
1336	},
```

Consequences:

1. **The pick is uniform** over eligible events. There are no weights, no cooldowns and no
   "don't repeat" memory, so the same event can fire twice in a row.
2. **An open panel skips the slot.** If any event panel is open when the timer fires (a story
   event, a world fight or a system dialog), nothing happens and the full 3-5 minute timer is
   re-armed. Events are never queued.
3. **The next timer starts at event start.** Line 1335 runs right after `startEvent`. Time the
   player spends inside the panel therefore counts toward the next interval.

##### 1.4 The event stack (`events.js:1365-1385`)

```js
1365	activeEvent: function() {
1366		if(Events.eventStack && Events.eventStack.length > 0) {
1367			return Events.eventStack[0];
1368		}
1369		return null;
1370	},
1376	switchEvent: event => {
1377		if (!event) { return; }
1380		AudioEngine.stopEventMusic();
1381		Events.eventPanel().remove();
1382		Events.activeEvent().eventPanel = null;
1383		Events.eventStack.shift();
1384		Events.startEvent(event);
1385	},
```

- **LIFO behaviour.** `startEvent` does `eventStack.unshift(event)` and `endEvent` does
  `shift()`. The newest event is always active. Ending it reveals the previous panel, which
  stayed in the DOM.
- **What actually stacks.** Random events never stack because of the guard at line 1317. Only
  direct `startEvent` calls can stack: system dialogs such as Export/Import, Restart? and Go
  Hyper? (`engine.js:301-872`), and landmarks or fights.
- **`switchEvent`.** This replaces the active event with another one without a fade. It is
  used by `nextEvent` buttons, which are the Executioner's elevator hub.
- **State lives on the event object.** Each event object stores its own `eventPanel` jQuery
  element, so the same object cannot be open twice.

##### 1.5 Opening an event (`events.js:1387-1411`)

```js
1387	startEvent: function(event, options) {
1388		if(!event) { return; }
1391		event.audio && AudioEngine.playEventMusic(event.audio);
1392		Engine.event('game event', 'event');
1393		Engine.keyLock = true;
1394		Engine.tabNavigation = false;
1395		Button.saveCooldown = false;
1396		Events.eventStack.unshift(event);
1397		event.eventPanel = $('<div>').attr('id', 'event').addClass('eventPanel').css('opacity', '0');
1398		if(options != null && options.width != null) {
1399			Events.eventPanel().css('width', options.width);
1400		}
1401		$('<div>').addClass('eventTitle').text(Events.activeEvent().title).appendTo(Events.eventPanel());
1402		$('<div>').attr('id', 'description').appendTo(Events.eventPanel());
1403		$('<div>').attr('id', 'buttons').appendTo(Events.eventPanel());
1404		Events.loadScene('start');
1405		$('div#wrapper').append(Events.eventPanel());
1406		Events.eventPanel().animate({opacity: 1}, Events._PANEL_FADE, 'linear');
1407		var currentSceneInformation = Events.activeEvent().scenes[Events.activeScene];
1408		if (currentSceneInformation.blink) {
1409			Events.blinkTitle();
1410		}
1411	},
```

**Panel DOM structure.** `div#event.eventPanel` contains three children:

- `.eventTitle` holds the title, styled like a fieldset legend on the top border
  (`css/main.css:490-495`).
- `#description` holds the text lines and the loot.
- `#buttons` holds `#exitButtons`, plus `#attackButtons` and `#healButtons` in combat.

**Panel CSS** (`css/main.css:433-474`):

- The panel is `position:absolute; left:250px; top:90px; width:335px; z-index:20; padding:20px`
  with a white background, a 2 px black border and a `5px 5px 5px #666` drop shadow.
- A `:before` pseudo-element is 920×700 px, offset `left:-252px; top:-75px`, white at
  `opacity:0.6`. It covers the whole game area, dimming everything and **intercepting clicks**,
  so the panel is effectively modal.
- The panel fades in and out over 200 ms.

**Blink rule.** Only the **start** scene's `blink` is checked (line 1408). A `blink` on any later
scene is ignored.

##### 1.6 Loading a scene (`events.js:54-81`)

```js
54	loadScene: function(name) {
56		Events.activeScene = name;
57		var scene = Events.activeEvent().scenes[name];
60		if(scene.onLoad) {
61			scene.onLoad();
62		}
65		if(scene.notification) {
66			Notifications.notify(null, scene.notification);
67		}
70		if(scene.reward) {
71			$SM.addM('stores', scene.reward);
72		}
74		$('#description', Events.eventPanel()).empty();
75		$('#buttons', Events.eventPanel()).empty();
76		if(scene.combat) {
77			Events.startCombat(scene);
78		} else {
79			Events.startStory(scene);
80		}
81	},
```

The order is: **`onLoad` → `notification` → `reward` → clear the panel → draw.**

- **`onLoad()`** is called as a method (`this` is the scene). Side effects go here: killing
  villagers, adding perks, setting flags, marking map tiles.
- **`notification`** goes to the left-hand **log** via `Notifications.notify(null, ...)`.
  - `module = null` means it prints immediately whatever tab is active.
  - `notify` appends `.` if the text lacks one (`notifications.js:32`).
  - It is a separate one-line summary that persists in the log after the panel closes. It is
    often a rephrasing of the scene text, for example the scene says "the villagers haul a
    filthy man out of the store room." while the log says "a thief is caught".
- **`reward`** is always added to **village** `stores` via `$SM.addM`, even in the World. For
  that reason world setpieces use `loot` instead of `reward`.

##### 1.7 Story scenes (`events.js:1106-1135`)

```js
1106	startStory: function(scene) {
1108		var desc = $('#description', Events.eventPanel());
1110		for(var i in scene.text) {
1111			$('<div>').text(scene.text[i]).appendTo(desc);
1112		}
1114		if(scene.textarea != null) {
1115			var ta = $('<textarea>').val(scene.textarea).appendTo(desc);
1116			if(scene.readonly) { ta.attr('readonly', true); }
1119			Engine.autoSelect('#description textarea');
1120		}
1124		if(scene.loot) {
1125			takeETbtn = Events.drawLoot(scene.loot);
1126		}
1129		var exitBtns = $('<div>').attr('id','exitButtons').appendTo($('#buttons', Events.eventPanel()));
1130		leaveBtn = Events.drawButtons(scene);
1134		Events.allowLeave(takeETbtn, leaveBtn);
1135	},
```

- **`text`** is an array of strings, and each string becomes its own `<div>` line. Across the
  game, 123 of 184 text scenes have exactly 2 lines, 33 have 3, 26 have 1 and 2 have 4.
- **`textarea` and `readonly`** are only used by system dialogs (save export/import). The
  textarea value is passed to `onChoose(value)`.
- **`loot`** draws a "take:" box: one row per item plus "take everything". If the scene has
  exactly one button, the take-all button becomes "take everything and <button text>"
  (`canLeave`, `events.js:994-1005`).

##### 1.8 Buttons (`events.js:1137-1166`, `1179-1205`)

```js
1137	drawButtons: function(scene) {
1138		var btns = $('#exitButtons', Events.eventPanel());
1140		for(var id in scene.buttons) {
1141			var info = scene.buttons[id];
1142			const cost = { ...info.cost };
1145			if (Path.outfit && Path.outfit['glowstone']) {
1146				delete cost.torch;
1147			}
1148			var b = new Button.Button({
1149				id,
1150				text: info.text,
1151				cost,
1152				click: Events.buttonClick,
1153				cooldown: info.cooldown
1154			}).appendTo(btns);
1155			if(typeof info.available == 'function' && !info.available()) {
1156				Button.setDisabled(b, true);
1157			}
1158			if(typeof info.cooldown == 'number') {
1159				Button.cooldown(b);
1160			}
1161			btnsList.push(b);
1162		}
1164		Events.updateButtons();
1165		return (btnsList.length == 1) ? btnsList[0] : false;
1166	},
```

**Button fields:**

| field | meaning |
|---|---|
| `text` | Button label. Lowercase, 1-4 words. |
| `cost` | `{store: n}`. Shown as a hover tooltip (`Button.js:30-41`). In the Room or Outside it is checked against village stores; in the World against `Path.outfit`. Pseudo-stores `water` and `hp` exist (`events.js:1168-1177`). A carried `glowstone` removes any `torch` cost. |
| `available()` | Returns a boolean. If false, the button is greyed out. Used to hide one-time purchases ("buy compass" if you own one, "learn scouting" if you have the perk). |
| `cooldown` | Seconds. The button **starts on cooldown when drawn**. Setpieces use `Events._LEAVE_COOLDOWN` (1 s) on post-combat "continue"/"leave" buttons so that frantic clicking does not skip loot. |
| `reward` | `{store: n}` added to village stores on click. |
| `notification` | A log line printed on click. |
| `onChoose(textareaValue)` | Runs a callback before the reward is applied. |
| `onClick()` | Runs a callback after the notification. |
| `link` | Calls `endEvent()` and then `window.open(link)`. Only Penrose uses it. |
| `nextEvent` | The key of another `Setpieces` or `Executioner` event, swapped in via `switchEvent`. |
| `nextScene` | `'end'`, or a probability map `{p1:'sceneA', ..., 1:'sceneZ'}`. If omitted, the panel stays open. |

**Live affordability.** `updateButtons()` (1179-1205) re-evaluates `available()` and `cost`
on every `stores` or `income` state change while a panel is open (`handleStateUpdates`,
1438-1442). Buttons enable themselves the moment you can afford them, for example when
gatherer income ticks in while the Nomad waits.

##### 1.9 Choice resolution (`events.js:1207-1297`)

```js
1207	buttonClick: function(btn) {
1208		var info = Events.activeEvent().scenes[Events.activeScene].buttons[btn.attr('id')];
1210		var costMod = {};
1211		if(info.cost) {
             ... // glowstone strips torch
1218			for(var store in cost) {
1219				var num = Events.getQuantity(store);
1220				if(num < cost[store]) {
1222					return;            // can't afford: silently do nothing
1223				}
1224				if (store === 'water') { World.setWater(World.water - cost[store]); }
1227				else if (store === 'hp') { World.setHp(World.hp - cost[store]); }
1230				else { costMod[store] = -cost[store]; }
1233			}
1234			if(Engine.activeModule == World) { ...Path.outfit[k] += costMod[k]... }
1239			else { $SM.addM('stores', costMod); }
1242		}
1244		if(typeof info.onChoose == 'function') { ... info.onChoose(textarea value or null); }
1250		if(info.reward) { $SM.addM('stores', info.reward); }
1254		Events.updateButtons();
1257		if(info.notification) { Notifications.notify(null, info.notification); }
1261	    info.onClick && info.onClick();
1264	    if (info.link) { Events.endEvent(); window.open(info.link); return; }
1271		if (info.nextEvent) {
1272			const eventData = Events.Setpieces[info.nextEvent] || Events.Executioner[info.nextEvent];
1273			Events.switchEvent(eventData);
1274			return;
1275		}
1278		if(info.nextScene) {
1279			if(info.nextScene == 'end') {
1280				Events.endEvent();
1281			} else {
1282				var r = Math.random();
1283				var lowestMatch = null;
1284				for(var i in info.nextScene) {
1285					if(r < i && (lowestMatch == null || i < lowestMatch)) {
1286						lowestMatch = i;
1287					}
1288				}
1289				if(lowestMatch != null) {
1290					Events.loadScene(info.nextScene[lowestMatch]);
1291					return;
1292				}
1293				Engine.log('ERROR: no suitable scene found');
1294				Events.endEvent();
1295			}
1296		}
1297	},
```

The pipeline runs in this order: **cost check and deduct → `onChoose` → `reward` →
`updateButtons` → `notification` → `onClick` → `link` | `nextEvent` | `nextScene`.**

**How the probability map works:**

- Draw `r ∈ [0,1)`. The chosen scene is the one with the **smallest key strictly greater than
  `r`**, so keys are cumulative upper bounds.
- `{0.5:'scales', 0.8:'teeth', 1:'cloth'}` gives 50% / 30% / 20%.
- `{1:'x'}` is a deterministic transition, used for a single path.
- Always include key `1`. If the largest key is below 1, a roll above it hits the
  "no suitable scene" path and the event silently closes.
- Keys are object-property *strings*. `r < i` coerces to a number, but `i < lowestMatch`
  compares **strings lexicographically**. That is safe for the keys used in the game (all are
  "0.x" or "1"); keys such as `"10"` and `"2"` would sort wrongly. JS writes `1.0` as `"1"`
  (Sick Man).

**Shop buttons.** A button with **no `nextScene`** keeps the panel open, so the player can buy
repeatedly (Nomad, Plague "buy medicine", Scout). The clicked button gets `Button.cooldown`
first (`Button.js:15-18`), which does nothing when the cooldown is 0.

##### 1.10 Ending an event (`events.js:1420-1436`)

```js
1420	endEvent: function() {
1421		AudioEngine.stopEventMusic();
1422		Events.eventPanel().animate({opacity:0}, Events._PANEL_FADE, 'linear', function() {
1423			Events.eventPanel().remove();
1424			Events.activeEvent().eventPanel = null;
1425			Events.eventStack.shift();
1427			Engine.keyLock = false;
1428			Engine.tabNavigation = true;
1429			Button.saveCooldown = true;
1430			if (Events.BLINK_INTERVAL) {
1431				Events.stopTitleBlink();
1432			}
1434			$('body').focus();
1435		});
1436	},
```

Locks are released unconditionally, even if another event is still on the stack.

##### 1.11 Delayed outcomes (`events.js:1444-1486`)

`Events.saveDelay(action, stateName, delaySeconds)` writes a countdown to
`$SM['wait.<stateName>']`, decrements it every 0.5 s, and runs `action` when it reaches zero.
On reload, `initDelay()` walks `wait` and calls the function found at the same path under
`Events`, so the countdown survives a refresh.

Only the Mysterious Wanderer uses this (`room.js:356-366`):

```js
356	action: function(inputDelay) {
357		var delay = inputDelay || false;
358		Events.saveDelay(function() {
359			$SM.add('stores.wood', 300);
360			Notifications.notify(Room, _('the mysterious wanderer returns, cart piled high with wood.'));
361		}, 'Room[4].scenes.wood100.action', delay);
362	},
363	onLoad: function() {
364		if(Math.random() < 0.5) {
365			this.action(60);
366		}
367	},
```

**Index bug.** The paths `Room[4]` and `Room[5]` are off by one. The Shady Builder is now
`Room[4]` and the Wanderers are `Room[5]` and `Room[6]`. A pending Wanderer return is
therefore lost if the page reloads during its 60 s wait.

##### 1.12 Loot (`events.js:921-951`)

```js
924	for(var k in lootList) {
925		var loot = lootList[k];
926		if(Math.random() < loot.chance) {
927			var num = Math.floor(Math.random() * (loot.max - loot.min)) + loot.min;
```

- **Quantity range.** The count is in `[min, max-1]`, so **max is exclusive** unless
  `min == max`. For example `{min:1, max:3}` yields only 1 or 2, and `{min:5, max:10}` yields
  5-9.
- **Drop chance.** Each item rolls `chance` independently.
- **Empty result.** If nothing drops, the box shows "nothing to take".
- **Carrying weight.** Taking items respects bag weight (`Path.getFreeSpace`). Hovering a
  take button when it does not fit opens a "drop:" menu that offers items to discard. "take
  everything" becomes "take all you can" when not everything fits.

##### 1.13 Combat scenes

**Scene fields** (examples from `encounters.js:12-40`):

| field | meaning |
|---|---|
| `combat: true` | Routes `loadScene` to `startCombat`. |
| `enemy` | Internal reference name, e.g. `'snarling beast'`. |
| `enemyName` | Localized display name. It is **not read by the engine**; the label shown is `chara`. |
| `chara` | A one-character glyph drawn as the enemy, e.g. `R`, `E`, `T`, `D`, `K`, `@`. The player is always `@`. |
| `health` | Enemy max HP. |
| `damage` | HP removed per successful enemy hit. |
| `hit` | Enemy hit probability per attack: `Math.random() <= hit`, multiplied by 0.8 if the player has the `evasive` perk. |
| `attackDelay` | Seconds between enemy attacks, via `setInterval`. The first attack lands after one full delay. |
| `ranged` | `true` animates a bullet `o` instead of a lunge. Cosmetic. |
| `notification` | Logged, **and** used as the single line of fight description (`events.js:89`). |
| `deathMessage` | Shown after victory, e.g. "the snarling beast is dead". Only the 11 random encounters define it; setpiece fights show a blank line. |
| `loot` | `{item:{min,max,chance}}`, drawn on victory. |
| `buttons` | If present, drawn after victory instead of the default "leave". |
| `nextScene` | Scene-level. Used by the default "leave" button. |
| `specials` | `[{delay: s, action(fighter) → label}]`. Repeating timers; the label floats over the enemy HP. Executioner only. |
| `atHealth` | `{hp: fn(fighter)}`. Fires once when an attack crosses that HP threshold. |
| `explosion` | N damage to the player, 3 s after the enemy's death (`explode`, 583-595). |

**Combat flow** (`startCombat`, 83-172):

1. **Fighters.** The fight box shows `@` with `World.health/World.getMaxHealth()` against
   `chara` with `health/health`.
2. **Weapon buttons.** There is one attack button per weapon in `Path.outfit`. The label is
   the weapon verb: punch, stab, swing, slash, thrust, shoot, blast, lob, tangle, disintegrate,
   slice or stun. Each button has the weapon's cooldown. With no usable weapon, **punch**
   (fists: 1 dmg, 2 s) appears.
3. **Heal buttons.**
   - "eat meat": 5 s cooldown, heals 8, or 16 with `gastronome`.
   - "use meds": 7 s cooldown, heals 20.
   - "use hypo": 7 s cooldown, heals 30.
   - "boost" (stim): 10 s cooldown. Immediately deals 10 HP to the player and sets status
     `boost`, which halves weapon-button cooldowns through `Button` `boosted`. `useStim` sets
     the status directly instead of calling `setStatus` (`events.js:461-466`), so the 3 s
     `BOOST_DURATION` timer is never armed. The boost lasts until the status is overwritten,
     for example by "shield".
   - "shield" (kinetic armour): 10 s cooldown. The next enemy hit heals instead of damaging.
   - Heal buttons are disabled at full HP (`setHeal`, 403-414).
4. **Enemy loop.** `Engine.setInterval(Events.enemyAttack, attackDelay*1000)` (line 177).
5. **Player hits.** A player hit lands if `Math.random() <= World.getHitChance()`. The base
   chance is 0.8, or 0.9 with `precise`.
   - Unarmed damage is ×2 with `boxer`, ×3 with `martial artist` and ×2 with
     `unarmed master`; `unarmed master` also halves the punch cooldown.
   - Melee damage is ×1.5 (floored) with `barbarian`.
   - Punch counts of 50, 150 and 300 award those three unarmed perks (`events.js:473-481`).
6. **No escape.** The pause button is commented out (lines 91-104) and no "leave" button is
   drawn during a fight. **Once a fight starts, you win or die.**
7. **Victory** (`winFight`, 781-836):
   - After 100 ms, `endFight` clears the timers.
   - The enemy fades over 300 ms, then there is a 1000 ms pause.
   - The panel is rebuilt with `deathMessage`, the loot, and either the scene's `buttons` or a
     default "leave" button (1 s cooldown) plus heal buttons with 0 s cooldown.
8. **Defeat.** At `hp <= 0`, `checkPlayerDeath` (759-767) calls `endEvent()` and then
   `World.die()`:
   - The log prints "the world fades" (`world.js:925`).
   - The outfit is wiped and the screen fades to the Room.
   - The keyboard stays locked for about 2.6 s: a 600 ms fade plus 2000 ms
     (`world.js:930-943`).
   - "embark" goes onto a 120 s cooldown (`World.DEATH_COOLDOWN`).

**Status effects** (Executioner only, `setStatus` 180-200, `damage` 613-687):

| status | effect |
|---|---|
| `shield` | The next hit *heals* the target by the damage instead of hurting it, then the shield breaks. |
| `energised` | The next hit deals ×4. |
| `venomous` | The next hit applies DoT of `floor(dmg/2)` per 1 s. |
| `enraged` | The enemy attacks every 0.5 s for 4 s. |
| `meditation` | For 5 s the enemy does not attack but banks all damage it takes, then returns that total as its next attack. |
| `boost` | Player only. |
| `stun` | From bolas or disruptor. The enemy skips attacks for 4 s. |

##### 1.14 World fights: random encounter triggering

`World.doSpace()` (`world.js:568-585`) runs on every move:

- **Village tile `A`:** `goHome()`.
- **Executioner tile `X`:** the `executioner-intro` event, or `executioner-antechamber` once
  `World.state.executioner` is set.
- **Any landmark tile:** `Events.startEvent(Events.Setpieces[LANDMARKS[tile].scene])`. Used
  outposts are skipped.
- **Otherwise:** `useSupplies()` and then `checkFight()`.

```js
555	checkFight: function() {
556	    World.fightMove = typeof World.fightMove == 'number' ? World.fightMove : 0;
557	    World.fightMove++;
558	    if(World.fightMove > World.FIGHT_DELAY) {        // FIGHT_DELAY: 3
559	      var chance = World.FIGHT_CHANCE;               // FIGHT_CHANCE: 0.20
560	      chance *= $SM.hasPerk('stealthy') ? 0.5 : 1;
561	      if(Math.random() < chance) {
562	        World.fightMove = 0;
563	        Events.triggerFight();
```

**Fight timing:**

- The first 3 plain-terrain moves after a fight are always safe.
- From move 4 on, each move has a 20% chance of a fight (10% with `stealthy`).
- That averages **8 moves between fights**, or 13 with `stealthy`.

`Events.triggerFight` (1338-1363) filters `Events.Encounters` by `isAvailable()` (distance tier
plus current terrain) and picks uniformly. It plays tier music for distances of 0-10, 11-20 and
>20. Road tiles (`#`) match no encounter, so `startEvent(undefined)` is a no-op and **roads are
safe**.

##### 1.15 What happens while an event is open

| aspect | behaviour | source |
|---|---|---|
| Game time | **Not paused.** Fire cooling (5 min), room temperature (30 s), builder (30 s), income ticks (1 s), population growth, thieves and pending Wanderer returns all keep running through `Engine.setTimeout`/`setInterval`. | `room.js:561-578`, `state_manager.js:346-388` |
| Other buttons | Not individually disabled, but covered by the panel's 920×700 translucent `:before` overlay, which blocks clicks. | `css/main.css:448-458` |
| Keyboard | `Engine.keyLock = true` makes `Engine.keyDown` ignore everything, which stops WASD/arrow movement in the World. `tabNavigation = false` stops left/right arrows switching tabs. | `events.js:1393-1394`, `engine.js:691-756` |
| Choosing options by key | **Not supported.** `events.js` has no key handlers; options are mouse or touch only. | n/a |
| Log | Keeps printing. Event notifications use `module=null`, so they always print immediately. | `notifications.js:30-44` |
| Random scheduler | Keeps ticking. A slot that fires during an open event is skipped and re-armed. | `events.js:1317,1335` |
| Button cooldown persistence | `Button.saveCooldown = false`, so event button cooldowns are not written to the save. | `Button.js:96-103` |
| Combat pause | None. The pause code is commented out. | `events.js:91-104` |
| Audio | `event.audio` plays as event music and stops on end. | 1391, 1421 |

##### 1.16 Title blink (`events.js:1299-1313`)

```js
1300	blinkTitle: function() {
1301		var title = document.title;
1303		// every 3 seconds change title to '*** EVENT ***', then 1.5 seconds later, change it back to the original title.
1304		Events.BLINK_INTERVAL = setInterval(function() {
1305			document.title = _('*** EVENT ***');
1306			Engine.setTimeout(function() {document.title = title;}, 1500, true);
1307		}, 3000);
1308	},
```

- The title shows `*** EVENT ***` for 1.5 s in every 3 s cycle. The raw `setInterval` and the
  `skipDouble=true` argument mean hyper mode does not change this.
- It is used as a "come back to the tab" signal for random events that arrive while the
  player is idle.
- `blink:true` is set on the start scene of every random event **except the Shady Builder**.
  Encounters, setpieces and the Executioner never blink, because the player is actively
  clicking when those happen.

##### 1.17 Other users of the panel

`Events.startEvent` is also the generic modal for system UI. These are not part of the
random pool:

- Export / Import (`engine.js:302`)
- Restart? (`engine.js:408`)
- Get the App (`engine.js:442`)
- Share (`engine.js:473`)
- Go Hyper? (`engine.js:558`)
- Sound Available! (`engine.js:872`)
- Ready to Leave? (`ship.js:136`)
- Dropbox dialogs (`dropbox.js:62,86,176`)

##### 1.18 Quirks worth knowing (or not copying)

- **`hp` costs never deduct.** `buttonClick` calls `World.setHp(World.hp - cost)`
  (`events.js:1228`), but the field is `World.health`; `World.hp` is undefined, so the result
  is NaN and `setHp` ignores it. The affordability check does use `World.health`. As a result
  Engineering's "rush through" (`cost:{hp:10}`) is free once affordable.
- **Shared notification queue.** `Notifications.notifyQueue[module]` uses a module *object* as
  the key, which becomes `"[object Object]"`. All modules therefore share one queue, and
  queued messages print on arrival at any tab.
- **Inverted hypo check.** `createUseHypoButton` disables the button when you *have* hypos
  (`events.js:336`). `setHeal` overrides this immediately afterwards.
- **Duplicate loot key.** `Enemies.Executioner.quadruped` has `'alien alloy'` twice in its loot
  object (`executioner.js:44-55`). The second entry `{min:2,max:4,chance:0.2}` wins.

---

#### 2. Event catalog

**Probability notation.** `{0.3:a, 1:b}` means 30% a and 70% b. Costs are deducted from
village stores in the Room or Outside, and from the carried outfit in the World. Text is quoted
exactly and abbreviated with "…" past about 15 words.

##### 2.1 Global (`events/global.js`), pool index Global[0]

###### The Thief (`global.js:5-66`), audio EVENT_THIEF

**isAvailable:**
`(Engine.activeModule == Room || Engine.activeModule == Outside) && $SM.get('game.thieves') == 1`

**Gate.** `game.thieves` is set to 1 by `$SM.startThieves()` when any store exceeds 5000 and
the world is unlocked (`room.js:875-877`). From then on, thieves income takes `wood:-10, fur:-5,
meat:-5` every 10 s and records it in `game.stolen` (`state_manager.js:408-418`).

| scene | text | notification | effects | buttons → outcome |
|---|---|---|---|---|
| start (blink) | "the villagers haul a filthy man out of the store room." / "say his folk have been skimming the supplies." / "say he should be strung up as an example." | "a thief is caught" | none | **hang him** → `{1:'hang'}`; **spare him** → `{1:'spare'}` |
| hang | "the villagers hang the thief high in front of the store room." / "the point is made. in the next few days, the missing supplies are returned." | none | onLoad: `game.thieves=2`, remove the thieves income, add all `game.stolen` back to stores | **leave** → end |
| spare | "the man says he's grateful. says he won't come around any more." / "shares what he knows about sneaking before he goes." | none | onLoad: `game.thieves=2`, remove the thieves income, add the **stealthy** perk (halves the world fight chance; log: "learned how not to be seen") | **leave** → end |

This is a one-shot moral choice: you get your goods back, or you get a permanent perk.

##### 2.2 Marketing (`events/marketing.js`)

###### Penrose (`marketing.js:7-35`), audio EVENT_NOISES_INSIDE

**isAvailable:** `() => !$SM.get('marketing.penrose')`

This check has **no module gate**, so the event can fire on any tab, including Path, World,
Ship and Fabricator. It is available from second one of a new game.

| scene | text | notification | buttons |
|---|---|---|---|
| start (blink) | "a strange thrumming, pounding and crashing. visions of people and places, of a huge machine and twisting curves." / "inviting. it would be so easy to give in, completely." | "a strange thrumming, pounding and crashing. and then gone." | **give in** → `onClick` sets `marketing.penrose=true`, then `link` ends the event and opens the penrose.doublespeakgames.com URL; **ignore it** → end. The flag is not set, so **it can recur**. |

This is a cross-promotion written in the game's own voice.

##### 2.3 Room events (`events/room.js`)

All Room events require `Engine.activeModule == Room`.

###### Room[0] The Nomad (`room.js:5-52`), audio EVENT_NOMAD

**isAvailable:** `Engine.activeModule == Room && $SM.get('stores.fur', true) > 0`

| scene | text | notification | buttons (cost → reward) |
|---|---|---|---|
| start (blink) | "a nomad shuffles into view, laden with makeshift bags bound with rough twine." / "won't say from where he came, but it's clear that he's not staying." | "a nomad arrives, looking to trade" | **buy scales**: fur 100 → scales 1 (stays open)<br>**buy teeth**: fur 200 → teeth 1 (stays open)<br>**buy bait**: fur 5 → bait 1; notif "traps are more effective with bait."<br>**buy compass**: fur 300, scales 15, teeth 5 → compass 1; `available: stores.compass < 1`; notif "the old compass is dented and dusty, but it looks to work."<br>**say goodbye** → end |

This is a shop: none of the buy buttons has a `nextScene`. The compass costs less here than at
the trading post (fur 400, scales 20, teeth 10; `room.js:473-484`). It is the earliest route to
the map.

###### Room[1] Noises, outside (`room.js:53-104`), audio EVENT_NOISES_OUTSIDE

**isAvailable:** `Engine.activeModule == Room && $SM.get('stores.wood')` (wood ≥ 1)

| scene | text | notification | effects | buttons |
|---|---|---|---|---|
| start (blink) | "through the walls, shuffling noises can be heard." / "can't tell what they're up to." | "strange noises can be heard through the walls" | none | **investigate** → `{0.3:'stuff', 1:'nothing'}` (30% / 70%); **ignore them** → end |
| nothing | "vague shapes move, just out of sight." / "the sounds stop." | none | none | **go back inside** → end |
| stuff | "a bundle of sticks lies just beyond the threshold, wrapped in coarse furs." / "the night is silent." | none | reward: wood +100, fur +10 | **go back inside** → end |

###### Room[2] Noises, inside (`room.js:105-191`), audio EVENT_NOISES_INSIDE

**isAvailable:** `Engine.activeModule == Room && $SM.get('stores.wood')`

| scene | text | notification | effects | buttons |
|---|---|---|---|---|
| start (blink) | "scratching noises can be heard from the store room." / "something's in there." | "something's in the store room" | none | **investigate** → `{0.5:'scales', 0.8:'teeth', 1:'cloth'}` (50/30/20); **ignore them** → end |
| scales | "some wood is missing." / "the ground is littered with small scales" | none | onLoad: lose `w = max(1, floor(wood*0.1))` wood, gain `max(1, floor(w/5))` scales | **leave** → end |
| teeth | "some wood is missing." / "the ground is littered with small teeth" | none | same formula, gain teeth | **leave** → end |
| cloth | "some wood is missing." / "the ground is littered with scraps of cloth" | none | same formula, gain cloth | **leave** → end |

Investigating is a forced trade of 10% of your wood for some goods at a 5:1 ratio.

###### Room[3] The Beggar (`room.js:192-263`), audio EVENT_BEGGAR

**isAvailable:** `Engine.activeModule == Room && $SM.get('stores.fur')`

| scene | text | notification | effects | buttons |
|---|---|---|---|---|
| start (blink) | "a beggar arrives." / "asks for any spare furs to keep him warm at night." | "a beggar arrives" | none | **give 50** (fur 50) → `{0.5:'scales', 0.8:'teeth', 1:'cloth'}`; **give 100** (fur 100) → `{0.5:'teeth', 0.8:'scales', 1:'cloth'}`; **turn him away** → end |
| scales | "the beggar expresses his thanks." / "leaves a pile of small scales behind." | none | reward scales +20 | **say goodbye** → end |
| teeth | "the beggar expresses his thanks." / "leaves a pile of small teeth behind." | none | reward teeth +20 | **say goodbye** → end |
| cloth | "the beggar expresses his thanks." / "leaves some scraps of cloth behind." | none | reward cloth +20 | **say goodbye** → end |

Giving 100 only changes the odds: it yields 50% teeth instead of 50% scales. The amount is 20
either way.

###### Room[4] The Shady Builder (`room.js:264-320`), audio EVENT_SHADY_BUILDER

**isAvailable:**
`Engine.activeModule == Room && $SM.get('game.buildings["hut"]', true) >= 5 && $SM.get('game.buildings["hut"]', true) < 20`

| scene | text | notification | effects | buttons |
|---|---|---|---|---|
| start (**no blink**) | "a shady builder passes through" / "says he can build you a hut for less wood" | "a shady builder passes through" | none | **300 wood** (wood 300) → `{0.6:'steal', 1:'build'}` (60% theft); **say goodbye** → end |
| steal | "the shady builder has made off with your wood" | same text | none | **go home** → end |
| build | "the shady builder builds a hut" | same text | onLoad: huts +1 if < 20 | **go home** → end |

**Expected value.** A normal hut costs `100 + 50n` wood (`room.js:51-55`). This deal works out
to 750 wood per expected hut, so it only pays off at 13 or more huts.

###### Room[5] The Mysterious Wanderer, wood (`room.js:322-400`), audio EVENT_MYSTERIOUS_WANDERER

**isAvailable:** `Engine.activeModule == Room && $SM.get('stores.wood')`

| scene | text | notification | effects | buttons |
|---|---|---|---|---|
| start (blink) | "a wanderer arrives with an empty cart. says if he leaves with wood, he'll be back with more." / "builder's not sure he's to be trusted." | "a mysterious wanderer arrives" | none | **give 100** (wood 100) → `{1:'wood100'}`; **give 500** (wood 500) → `{1:'wood500'}`; **turn him away** → end |
| wood100 | "the wanderer leaves, cart loaded with wood" | none | onLoad: 50% chance that **60 s later** you get wood +300 and the log line "the mysterious wanderer returns, cart piled high with wood." (queued to Room) | **say goodbye** → end |
| wood500 | same text | none | onLoad: 30% chance of wood +1500 after 60 s, with the same line | **say goodbye** → end |

**Expected value.** Giving 100 returns 150 on average (+50). Giving 500 returns 450 on average
(−50). A delayed and uncertain payoff that the player discovers later in the log is an
important pattern.

###### Room[6] The Mysterious Wanderer, fur (`room.js:402-480`)

**isAvailable:** `Engine.activeModule == Room && $SM.get('stores.fur')`

This mirrors Room[5] with a female wanderer and furs:

- Start text: "a wanderer arrives with an empty cart. says if she leaves with furs, she'll be
  back with more." / "builder's not sure she's to be trusted."
- Buttons: give 100 / give 500 / **turn her away**.
- Returns: fur +300 (50%) or fur +1500 (30%) after 60 s.
- Return line: "the mysterious wanderer returns, cart piled high with furs."

###### Room[7] The Scout (`room.js:482-523`), audio EVENT_SCOUT

**isAvailable:** `Engine.activeModule == Room && $SM.get('features.location.world')`
(the world is unlocked once you own a compass)

| scene | text | notification | buttons |
|---|---|---|---|
| start (blink) | "the scout says she's been all over." / "willing to talk about it, for a price." | "a scout stops for the night" | **buy map**: fur 200, scales 10; `available: !World.seenAll`; notif "the map uncovers a bit of the world"; `onChoose: World.applyMap` (reveals a radius-5 patch around a random unseen tile; stays open)<br>**learn scouting**: fur 1000, scales 50, teeth 20; `available: !hasPerk('scout')`; adds the **scout** perk ("learned to look ahead"; see farther)<br>**say goodbye** → end |

###### Room[8] The Master (`room.js:525-597`), audio EVENT_WANDERING_MASTER

**isAvailable:** `Engine.activeModule == Room && $SM.get('features.location.world')`

| scene | text | notification | buttons |
|---|---|---|---|
| start (blink) | "an old wanderer arrives." / "he smiles warmly and asks for lodgings for the night." | "an old wanderer arrives" | **agree** (cured meat 100, fur 100, torch 1) → `{1:'agree'}`; **turn him away** → end |
| agree | "in exchange, the wanderer offers his wisdom." | none | **evasion** (`available: !evasive`) adds evasive: enemy hit ×0.8 ("learned to be where they're not")<br>**precision** (`!precise`) adds precise: +0.1 hit ("learned to predict their movement")<br>**force** (`!barbarian`) adds barbarian: melee ×1.5 ("learned to swing weapons with force")<br>**nothing** → end<br>All four end the event. |

This is a pick-one perk vendor that can recur until all three perks are owned.

###### Room[9] The Sick Man (`room.js:599-686`), audio EVENT_SICK_MAN

**isAvailable:** `Engine.activeModule == Room && $SM.get('stores.medicine', true) > 0`

| scene | text | notification | effects | buttons |
|---|---|---|---|---|
| start (blink) | "a man hobbles up, coughing." / "he begs for medicine." | "a sick man hobbles up" | none | **give 1 medicine** (medicine 1; notif "the man swallows the medicine eagerly") → `{0.1:'alloy', 0.3:'cells', 0.5:'scales', 1.0:'nothing'}` (10/20/20/50); **tell him to leave** → end |
| alloy | "the man is thankful." / "he leaves a reward." / "some weird metal he picked up on his travels." | none | alien alloy +1 | **say goodbye** → end |
| cells | "the man is thankful." / "he leaves a reward." / "some weird glowing boxes he picked up on his travels." | none | energy cell +3 | **say goodbye** → end |
| scales | "the man is thankful." / "he leaves a reward." / "all he has are some scales." | none | scales +5 | **say goodbye** → end |
| nothing | "the man expresses his thanks and hobbles off." | none | none | **say goodbye** → end |

The alloy and energy-cell rewards foreshadow late-game items ("weird metal", "weird glowing
boxes") before the player knows what they are.

##### 2.4 Outside events (`events/outside.js`)

All Outside events require `Engine.activeModule == Outside`.

###### Outside[0] A Ruined Trap (`outside.js:5-68`), audio EVENT_RUINED_TRAP

**isAvailable:** `Engine.activeModule == Outside && $SM.get('game.buildings["trap"]', true) > 0`

| scene | text | notification | effects | buttons |
|---|---|---|---|---|
| start (blink) | "some of the traps have been torn apart." / "large prints lead away, into the forest." | "some traps have been destroyed" | onLoad: destroy `floor(rand*traps)+1` traps (1 to all) | **track them** → `{0.5:'nothing', 1:'catch'}`; **ignore them** → end |
| nothing | "the tracks disappear after just a few minutes." / "the forest is silent." | "nothing was found" | none | **go home** → end |
| catch | "not far from the village lies a large beast, its fur matted with blood." / "it puts up little resistance before the knife." | "there was a beast. it's dead now" | reward fur 100, meat 100, teeth 10 | **go home** → end |

###### Outside[1] Fire (`outside.js:69-95`), audio EVENT_HUT_FIRE

**isAvailable:**
`Engine.activeModule == Outside && $SM.get('game.buildings["hut"]', true) > 0 && $SM.get('game.population', true) > 50`

| scene | text | notification | effects | buttons |
|---|---|---|---|---|
| start (blink) | "a fire rampages through one of the huts, destroying it." / "all residents in the hut perished in the fire." | "a fire has started" | onLoad: `Outside.destroyHuts(1)` removes 1 random occupied hut and kills its occupants (4 if full) | **mourn** (notif "some villagers have died") → end |

This is a no-choice tragedy: there is only one button.

###### Outside[2] Sickness (`outside.js:96-153`), audio EVENT_SICKNESS

**isAvailable:**
`Engine.activeModule == Outside && pop > 10 && pop < 50 && $SM.get('stores.medicine', true) > 0`

| scene | text | notification | effects | buttons |
|---|---|---|---|---|
| start (blink) | "a sickness is spreading through the village." / "medicine is needed immediately." | "some villagers are ill" | none | **1 medicine** (medicine 1) → `{1:'healed'}`; **ignore it** → `{1:'death'}` |
| healed | "the sickness is cured in time." | "sufferers are healed" | none | **go home** → end |
| death | "the sickness spreads through the village." / "the days are spent with burials." / "the nights are rent with screams." | "sufferers are left to die" | onLoad: kill `floor(rand*floor(pop/2))+1` | **go home** → end |

###### Outside[3] Plague (`outside.js:155-225`), audio EVENT_PLAGUE

**isAvailable:**
`Engine.activeModule == Outside && pop > 50 && $SM.get('stores.medicine', true) > 0`

| scene | text | notification | effects | buttons |
|---|---|---|---|---|
| start (blink) | "a terrible plague is fast spreading through the village." / "medicine is needed immediately." | "a plague afflicts the village" | none | **buy medicine** (scales 70, teeth 50 → medicine 1; stays open; marked up from the 50/30 trading-post price, see comment at line 169); **5 medicine** (medicine 5) → `{1:'healed'}`; **do nothing** → `{1:'death'}` |
| healed | "the plague is kept from spreading." / "only a few die." / "the rest bury them." | "epidemic is eradicated eventually" | onLoad: kill `floor(rand*5)+2` (2-6) | **go home** → end |
| death | "the plague rips through the village." / "the nights are rent with screams." / "the only hope is a quick death." | "population is almost exterminated" | onLoad: kill `floor(rand*80)+10` (10-89) | **go home** → end |

Sickness and Plague only appear if you **have** medicine, so the player always has the tool to
respond. The cost is the dilemma.

###### Outside[4] A Beast Attack (`outside.js:227-260`), audio EVENT_BEAST_ATTACK

**isAvailable:** `Engine.activeModule == Outside && $SM.get('game.population', true) > 0`

| scene | text | notification | effects | buttons |
|---|---|---|---|---|
| start (blink) | "a pack of snarling beasts pours out of the trees." / "the fight is short and bloody, but the beasts are repelled." / "the villagers retreat to mourn the dead." | "wild beasts attack the villagers" | onLoad kills `floor(rand*10)+1` (1-10); reward fur 100, meat 100, teeth 10 | **go home** (notif "predators become prey. price is unfair") → end |

###### Outside[5] A Military Raid (`outside.js:262-295`), audio EVENT_SOLDIER_ATTACK

**isAvailable:**
`Engine.activeModule == Outside && $SM.get('game.population', true) > 0 && $SM.get('game.cityCleared')`

| scene | text | notification | effects | buttons |
|---|---|---|---|---|
| start (blink) | "a gunshot rings through the trees." / "well armed men charge out of the forest, firing into the crowd." / "after a skirmish they are driven away, but not without losses." | "troops storm the village" | onLoad kills `floor(rand*40)+1` (1-40); reward bullets 10, cured meat 50 | **go home** (notif "warfare is bloodthirsty") → end |

The raid is consequence-gated: it only unlocks after you clear a Ruined City, so the world
strikes back.

##### 2.5 Encounters (`events/encounters.js`): world fights

**Common properties.** Every encounter is a single combat scene `start` with no `buttons`, so
the default "leave" appears after victory. None blinks. `isAvailable` uses
`World.getDistance()`, the Manhattan distance from the village at (30,30), and
`World.getTerrain()`, which is one of `TILE.FOREST ';'`, `TILE.FIELD ','` or
`TILE.BARRENS '.'`.

**Loot notation.** `item min-max@chance`. Remember that max is exclusive unless min = max.

| # (line) | title | tier / terrain (exact condition) | enemy (`chara`) | dmg | hit | attackDelay s | HP | loot | notification (also the fight text) / deathMessage |
|---|---|---|---|---|---|---|---|---|---|
| 0 (6) | A Snarling Beast | `dist <= 10 && FOREST` | snarling beast (R) | 1 | 0.8 | 1 | 5 | fur 1-3@1, meat 1-3@1, teeth 1-3@0.8 | "a snarling beast leaps out of the underbrush" / "the snarling beast is dead" |
| 1 (43) | A Gaunt Man | `dist <= 10 && BARRENS` | gaunt man (E) | 2 | 0.8 | 2 | 6 | cloth 1-3@0.8, teeth 1-2@0.8, leather 1-2@0.5 | "a gaunt man approaches, a crazed look in his eye" / "the gaunt man is dead" |
| 2 (80) | A Strange Bird | `dist <= 10 && FIELD` | strange bird (R) | 3 | 0.8 | 2 | 4 | scales 1-3@0.8, teeth 1-2@0.5, meat 1-3@0.8 | "a strange looking bird speeds across the plains" / "the strange bird is dead" |
| 3 (117) | A Two-Headed Creature | `dist <= 10 && FIELD` | two-headed creature (K) | 2 | 0.5 | 3 | 10 | fur 2-4@1, teeth 2-3@0.8, meat 2-3@0.8 | "a two-headed creature appears, the smaller head trembling" / "the two creatures are dead" |
| 4 (155) | A Shivering Man | `dist > 10 && dist <= 20 && BARRENS` | shivering man (E) | 5 | 0.5 | 1 | 20 | cloth 1-1@0.2, teeth 1-2@0.8, leather 1-1@0.2, medicine 1-3@0.7 | "a shivering man approaches and attacks with surprising strength" / "the shivering man is dead" |
| 5 (197) | A Man-Eater | `dist > 10 && dist <= 20 && FOREST` | man-eater (T) | 3 | 0.8 | 1 | 25 | fur 5-10@1, meat 5-10@1, teeth 5-10@0.8 | "a large creature attacks, claws freshly bloodied" / "the man-eater is dead" |
| 6 (234) | A Scavenger | `dist > 10 && dist <= 20 && BARRENS` | scavenger (E) | 4 | 0.8 | 2 | 30 | cloth 5-10@0.8, leather 5-10@0.8, iron 1-5@0.5, medicine 1-2@0.1 | "a scavenger draws close, hoping for an easy score" / "the scavenger is dead" |
| 7 (276) | A Huge Lizard | `dist > 10 && dist <= 20 && FIELD` | lizard (T) | 5 | 0.8 | 2 | 20 | scales 5-10@0.8, teeth 5-10@0.5, meat 5-10@0.8 | "the grass thrashes wildly as a huge lizard pushes through" / "the lizard is dead" |
| 8 (314) | A Feral Terror | `dist > 20 && FOREST` | feral terror (T) | 6 | 0.8 | 1 | 45 | fur 5-10@1, meat 5-10@1, teeth 5-10@0.8 | "a beast, wilder than imagining, erupts out of the foliage" / "the feral terror is dead" |
| 9 (351) | A Soldier | `dist > 20 && BARRENS` | soldier (D), ranged | 8 | 0.8 | 2 | 50 | cloth 5-10@0.8, bullets 1-5@0.5, rifle 1-1@0.2, medicine 1-2@0.1 | "a soldier opens fire from across the desert" / "the soldier is dead" |
| 10 (394) | A Sniper | `dist > 20 && FIELD` | sniper (D), ranged | 15 | 0.8 | 4 | 30 | cloth 5-10@0.8, bullets 1-5@0.5, rifle 1-1@0.2, medicine 1-2@0.1 | "a shot rings out, from somewhere in the long grass" / "the sniper is dead" |

**Enemy DPS (`dmg × hit / attackDelay`).**

| tier | enemy | DPS |
|---|---|---|
| T1 | beast | 0.8 |
| T1 | gaunt man | 0.8 |
| T1 | bird | 1.2 |
| T1 | two-headed creature | 0.33 |
| T2 | shivering man | 2.5 |
| T2 | man-eater | 2.4 |
| T2 | scavenger | 1.6 |
| T2 | lizard | 2.0 |
| T3 | feral terror | 4.8 |
| T3 | soldier | 3.2 |
| T3 | sniper | 3.0 |

The player has base 10 HP (`World.BASE_HEALTH`), raised by armour.

**Glyph convention.** `R` is used for beasts and birds, `E` for men, `T` for big monsters, `D`
for soldiers and `K` for the two-headed creature. FIELD tier 1 and BARRENS tier 2 each have two
candidates, picked 50/50.

---

#### 3. Setpieces & Executioner

##### 3.1 Triggering

**Placement.** Landmarks are placed at map generation (`world.js:139-155`, RADIUS = 30, so
`RADIUS*1.5` = 45):

| tile | scene key | count | distance |
|---|---|---|---|
| `P` outpost | `outpost` | 0 placed (created by clearing dungeons) | none |
| `I` iron mine | `ironmine` | 1 | 5 |
| `C` coal mine | `coalmine` | 1 | 10 |
| `S` sulphur mine | `sulphurmine` | 1 | 20 |
| `H` house | `house` | 10 | 0-45 |
| `V` cave | `cave` | 5 | 3-10 |
| `O` town | `town` | 10 | 10-20 |
| `Y` city | `city` | 20 | 20-45 |
| `W` ship | `ship` | 1 | 28 |
| `B` borehole | `borehole` | 10 | 15-45 |
| `F` battlefield | `battlefield` | 5 | 18-45 |
| `M` swamp | `swamp` | 1 | 15-45 |
| `X` executioner | (special) | 1 | 28 |
| `U` cache | `cache` | 1 | 10-45 (only if prestige data exists) |

**Entry.** Stepping onto a landmark calls `Events.startEvent(Events.Setpieces[scene])`
(`world.js:577-580`). There is no random roll: it is **always** triggered, and no supplies are
used on that step.

**Visiting rules:**

- **One-shot landmarks** (house, battlefield, borehole, ship, swamp, mines) call
  `World.markVisited(x,y)` in an `onLoad`. It appends `!` to the tile character
  (`world.js:865-867`), so the tile no longer matches `LANDMARKS` and **never retriggers**.
- **Dungeons** (cave, town, city, executioner command) call `World.clearDungeon()` at their
  ending. It turns the tile into an **outpost `P`** and draws a road back to the village
  (`world.js:204-208`).
- **Outposts** give water once per expedition. `usedOutposts` is reset on each embark
  (`world.js:1060-1087`).

**Rewards are banked on return.** Story flags (`World.state.ship`, `.ironmine`,
`.executioner`, …) are only committed when the player walks back into the village (`goHome`,
`world.js:948-985`). That unlocks the Ship, mines or Fabricator, or redeems blueprints with the
log line "blueprints feed into the fabricator data port. possibilities grow.". Death sets
`World.state = null` and **loses everything from that trip**.

##### 3.2 Structure per setpiece (`events/setpieces.js`)

Totals: 13 setpieces, 115 scenes, 41 combat scenes.

| key (line) | title | scenes | combat | entry cost | branching shape | endings / effect |
|---|---|---|---|---|---|---|
| outpost (5) | An Outpost | 1 | 0 | none | single scene | loot cured meat 5-10@1; onLoad `World.useOutpost()` refills water ("water replenished") |
| swamp (34) | A Murky Swamp | 3 | 0 | none | start → cabin → talk (**talk costs 1 charm**) | gives **gastronome** perk; lore: "he speaks of once leading the great fleets to fresh worlds." |
| cave (92) | A Damp Cave | 13 | 5 | **torch 1** to "go inside" | layered a→b→c→end: start `{0.3:a1, 0.6:a2, 1:a3}`; each a: `{0.5:b?,1:b?}`; b2 ("the torch sputters and dies…") demands **another torch** to continue; c1 `{0.5:end1,1:end2}`, c2 `{0.7:end2,1:end3}` | 3 endings (nest / supply cache / old case with steel sword); `clearDungeon()` |
| town (524) | A Deserted Town | 23 | 9 | none to explore; torch 1 for school (a1) and clinic (a3) | start `{0.3:a1, 0.7:a3, 1:a2}` → b1-b5 → c1-c6 → d1-d2 → end1-6 | 6 endings; `clearDungeon()` |
| city (1242) | A Ruined City | 52 | 19 | torch 1 for hospital (a4) and subway (c3) | start `{0.2:a1, 0.5:a2, 0.8:a3, 1:a4}`, four districts (streets, checkpoint, shanty town, hospital), 3-4 layers deep, some 3-way splits (`{0.3:c12,0.7:c10,1:c11}`) | 15 endings, each `clearDungeon()` plus `game.cityCleared=true` (unlocks the Military Raid) |
| house (2938) | An Old House | 4 | 1 | none | "go inside" `{0.25:'medicine', 0.5:'supplies', 1:'occupied'}` | supplies refill water; medicine 2-5; squatter fight. All `markVisited` |
| battlefield (3056) | A Forgotten Battlefield | 1 | 0 | none | single loot scene | rifle, bullets, laser rifle, energy cell, grenade, alien alloy |
| borehole (3110) | A Huge Borehole | 1 | 0 | none | single | alien alloy 1-3@1 |
| ship (3140) | A Crashed Ship | 1 | 0 | none | single; button **salvage** | sets `World.state.ship`, unlocking the Ship on return |
| sulphurmine (3164) | The Sulphur Mine | 5 | 3 | none | linear gauntlet: attack → soldier → soldier → veteran → cleared; "run" can bail after fights 1-2 only | sets `.sulphurmine`; on return, +1 sulphur mine building |
| coalmine (3314) | The Coal Mine | 5 | 3 | none | linear: man → man → chief → cleared | coal mine building |
| ironmine (3457) | The Iron Mine | 3 | 1 | **torch 1** | start → beastly matriarch → cleared | iron mine building |
| cache (3535) | A Destroyed Village | 3 | 0 | none | start → underground ("take") → exit | `Prestige.collectStores()` returns the previous run's stores |

**Branching conventions to copy:**

- **Layering.** Scenes are named by depth: `start`, `a1..aN`, `b1..`, `c1..`, `d1..`,
  `end1..endN`.
- **Exits.** Most non-final scenes offer a **"continue"**-type button with a 50/50 map to two
  next-layer scenes, plus a contextual exit ("leave cave", "leave town", "leave city").
- **Converging graph.** Several branches converge on shared scenes (for example town `c1`,
  `c2` and `c3` all lead to `d1`). It is a converging DAG, not a tree, which keeps the content
  budget manageable.
- **Combat nodes** carry `buttons` that are drawn after the win: "continue" and "leave" with
  `cooldown: Events._LEAVE_COOLDOWN` (1 s). The final boss fights in the city (`d10`, `d11`)
  and in the Executioner have **no leave**, so you are committed.
- **Torches gate darkness.** Entry and "go deeper" buttons cost a torch, and the cave
  punishes the player with a mid-dungeon torch failure.
- **Dungeon rhythm.** Ending scenes are reward rooms: a big loot table and a flavourful
  2-3-line epitaph ("eye for an eye seems fair. / always worked before, at least."). Loot
  escalates by layer.
- **Notifications.** Most setpiece `start` scenes have a `notification` (an establishing shot
  in the log) that differs from the panel text. Battlefield, borehole and ship have none.

##### 3.3 The Executioner (`events/executioner.js`)

**Data layout:**

- `Enemies.Executioner` (lines 1-115) defines reusable enemy templates (guard, quadruped,
  medic, turret) that are spread into scenes.
- `Events.Executioner` (117-2343) holds six events, 103 scenes in total.

**Trigger** (`world.js:573-576`). Tile `X` at distance 28 opens `executioner-intro` until
`World.state.executioner` is true, then opens `executioner-antechamber`.

| event (line) | title | scenes | combat | structure |
|---|---|---|---|---|
| executioner-intro (118) | A Ravaged Battleship | 14 | 6 | Enter costs **torch 1**. Scene 1 → `{0.4:'2-1', 0.8:'2-2', 1:'2-3'}`: three lanes that converge on scene 5. Lane 2-1 is a webbed corridor with the chitinous horror and queen at `attackDelay` 0.25. Lane 2-2 has an operative, a military camp and a researcher. Lane 2-3 is a barricade with laser rifles, then "the partially devoured remains of several wanderers…", then an **ancient beast** (A, HP 60). Scene 5 ("power cycle") leads to turret 6 and then scene 7, whose only button is "take device and leave". Scene 7 sets `World.state.executioner` and draws a road. On return home, `Fabricator.init()` runs with the log line "builder knows the strange device when she sees it. takes it for herself real quick. doesn't ask where it came from." |
| executioner-antechamber (551) | A Ravaged Battleship | 1 | 0 | **Hub.** "a large hatch opens into a wide corridor." Buttons use `nextEvent` (`switchEvent`): **engineering** / **medical** / **martial**, each `available: !World.state.<wing>`; **command deck** `available: engineering && medical && martial`; leave. |
| executioner-engineering (598) | Engineering Wing | 21 | 7 | 3-way start split. Hazard scene 1-3: **extinguish** (water 5) or **rush through** (hp 10). Heal machine "use machine" (alien alloy 1, full heal). Hypo blueprint. Boss **unstable prototype** (P): HP 150, dmg 5, `specials` shield every 5 s; drops kinetic armour blueprint. Scene 8 sets `.engineering`. |
| executioner-martial (1038) | Martial Wing | 27 | 9 | "blow it down" (grenade 1) opens the armoury. Plasma rifle blueprint. Heal machine. Boss **murderous robot** (M): HP 250, dmg 10/3 s, energised (×4 next hit) every 13 s; drops disruptor blueprint. Scene 13 sets `.martial`. |
| executioner-medical (1581) | Medical Wing | 31 | 14 | Many broken medics (`atHealth {40: venomous}`). **Unstable automaton**: `explosion: 30` (3 s after death), drops glowstone blueprint. Boss **malformed experiment**: HP 200, enraged every 16 s; drops stim blueprint. Scene 17 sets `.medical`. |
| executioner-command (2154) | Command Deck | 9 | 2 | Guard, then a 50/50 cache, then the reveal: "wanderer form, but not quite flesh…" Final boss **immortal wanderer** (`@`, mirrors the player): HP 500, dmg 12/2 s, every 7 s a random status from {shield, enraged, meditation}, never the same twice in a row. Drops the **fleet beacon**. Ends with `clearDungeon()`. |

**Executioner-only conventions:**

- **Hub-and-spoke.** A single hub event links to sub-events via `nextEvent`. `available()`
  gates both completed wings and the final wing.
- **Commitment points.** Boss pre-scenes have a single button ("fight", "engage", "observe")
  and no "leave".
- **Story beats as fights.** Each wing ends with a boss carrying a unique `specials`
  mechanic, and each boss drops a blueprint, which is a permanent unlock.

---

#### 4. Tone & writing style

##### 4.1 Measured statistics

Computed over every event and setpiece string by loading the event files in Node.

| corpus | n | avg words | median | min-max | other |
|---|---|---|---|---|---|
| scene `text` lines | 379 | 8.4 | 8 | 1-21 | 365/379 end with `.`; **0** contain capitals; **0** `?`; **0** `!`; 116 contain commas; 27 hold two sentences |
| notifications and death messages | 149 | 6.8 | 7 | 3-14 | 0 capitals, 0 `?`, 0 `!`; about half have no trailing period in source (`notify()` adds one) |
| button labels (unique) | 66 | 1.7 | 2 | 1-4 | all lowercase imperatives or noun phrases, never punctuated |

- **Capitals appear only in titles.** All 48 `title:` strings in `events/` (45 unique) use
  Title Case, usually with an article: "A Snarling Beast", "The Nomad", "An Old House". No other
  string in `events/` contains a capital letter.
- **Second person is nearly absent.** "you" appears 3 times in all event content, all in the
  Shady Builder (`room.js:273,290,292`), plus once in the engine's generic "take all you can".

##### 4.2 Stylistic rules (inferred)

1. **All lowercase, always.** Even sentence starts and the narrator's "I" moments are
   lowercase. Proper nouns are avoided entirely: no place names and no character names. People
   are roles: "the builder", "the stranger", "a nomad", "the wanderer", "the scout".
2. **An implied subject, the reporter's elision.** The subject is dropped and the reader
   supplies "he" or "you":
   - "say he should be strung up as an example." (`global.js:15`)
   - "can't tell what they're up to." (`room.js:62`)
   - "won't say from where he came, but it's clear that he's not staying." (`room.js:14`)
   - "says it can't die." (`executioner.js:2276`)
   - "picked this deck clean."
   - "slipped past an automated sentry."

   The protagonist is never named or addressed: actions happen without an agent.
3. **One beat per line.** A scene is usually 2 lines (about 67% of scenes). Line 1 is the
   image and line 2 is the twist or an understated consequence:
   - "the torch sputters and dies in the damp air" / "the darkness is absolute"
     (`setpieces.js:243-244`)
4. **Concrete sensory nouns, few adjectives.** Prefer "twine", "scales", "soot", "bedrolls",
   "chainlink", "scalpel". There is at most one evocative modifier per line: "filthy man",
   "coarse furs", "crazed look".
5. **Understatement over exposition.** Horrors are stated flatly, then the text moves on:
   - "there was a beast. it's dead now" (`outside.js:53`)
   - "inside the hut, a child cries." / "a few belongings rest against the walls." / "there's
     nothing else here." (`setpieces.js:2637-2639`)
6. **Wry, dark asides close a scene:**
   - "predators become prey. price is unfair" (`outside.js:253`)
   - "eye for an eye seems fair." / "always worked before, at least." (`setpieces.js:1159-1160`)
   - "lucky." (command 3a)
7. **No questions, no exclamations, no dialogue quotes.** Speech is always reported:
   "says he can build you a hut for less wood", "it says it saw the rebellion coming. said it
   made arrangements."
8. **Mysteries are hinted through misdescribed artifacts.** The narrator does not understand
   the sci-fi layer and describes it as a villager would:
   - "some weird metal he picked up on his travels." (alien alloy, `room.js:629`)
   - "some weird glowing boxes he picked up on his travels." (energy cells, `room.js:645`)
   - "a strange device sits on the floor. looks important." (`executioner.js:535`)
   - Item tooltip: energy cell "emits a soft red glow" (`path.js:175`)
   - "wanderer" quietly shifts meaning from drifter to alien species: "the familiar curves of a
     wanderer vessel" (`setpieces.js:3150`), "unfathomable destruction to fuel wanderer
     hungers." (`setpieces.js:75`)
9. **Lore is drip-fed through minor NPCs and epitaphs.** It is never delivered as a lore dump.
   The swamp hermit gets 4 lines, the longest scene type. The immortal wanderer gets 3.
10. **Notifications are headlines, scene text is the story.** The log line is a 3-14 word
    summary, often in a passive or noun-phrase form: "a thief is caught", "some traps have been
    destroyed", "troops storm the village", "sufferers are left to die".
11. **Button verbs are blunt.** "hang him", "spare him", "mourn", "give in", "squeeze", "go
    home", "turn her away", "take device and leave". Gendered pronouns follow the NPC.
12. **The rule of three for escalating dread.**
    - "the plague rips through the village." / "the nights are rent with screams." / "the only
      hope is a quick death." (`outside.js:207-209`)
    - Phrases repeat across events to build a lexicon: "the nights are rent with screams"
      appears in both Sickness and Plague.

##### 4.3 Representative quotes (exact, with sources)

**Random events:**

1. "the villagers haul a filthy man out of the store room." (`events/global.js:13`)
2. "say he should be strung up as an example." (`events/global.js:15`)
3. "the point is made. in the next few days, the missing supplies are returned."
   (`events/global.js:33`)
4. "a nomad shuffles into view, laden with makeshift bags bound with rough twine."
   (`events/room.js:13`)
5. "won't say from where he came, but it's clear that he's not staying."
   (`events/room.js:14`)
6. "the old compass is dented and dusty, but it looks to work." (`events/room.js:42`)
7. "through the walls, shuffling noises can be heard." (`events/room.js:61`)
8. "vague shapes move, just out of sight." (`events/room.js:79`)
9. "a bundle of sticks lies just beyond the threshold, wrapped in coarse furs."
   (`events/room.js:92`)
10. "builder's not sure he's to be trusted." (`events/room.js:331`)
11. "he smiles warmly and asks for lodgings for the night." (`events/room.js:534`)
12. "some weird glowing boxes he picked up on his travels." (`events/room.js:645`)
13. "large prints lead away, into the forest." (`events/outside.js:14`)
14. "there was a beast. it's dead now" (`events/outside.js:53`)
15. "the nights are rent with screams." (`events/outside.js:137`)
16. "the only hope is a quick death." (`events/outside.js:209`)
17. "predators become prey. price is unfair" (`events/outside.js:253`)
18. "a gunshot rings through the trees." (`events/outside.js:270`)
19. "inviting. it would be so easy to give in, completely." (`events/marketing.js:15`)

**Encounters:**

20. "a two-headed creature appears, the smaller head trembling" (`events/encounters.js:150`)
21. "a beast, wilder than imagining, erupts out of the foliage" (`events/encounters.js:347`)
22. "a shot rings out, from somewhere in the long grass" (`events/encounters.js:433`)

**Setpieces and Executioner:**

23. "the earth here is split, as if bearing an ancient wound" (`events/setpieces.js:100`)
24. "rot's been to work on it, and some of the pieces are missing." (`events/setpieces.js:202`)
25. "the torch sputters and dies in the damp air" / "the darkness is absolute"
    (`events/setpieces.js:243-244`)
26. "broken streetlights stand, rusting. light hasn't graced this place in a long time."
    (`events/setpieces.js:530`)
27. "a small basket of food is hidden under a park bench, with a note attached." / "can't read
    the words." (`events/setpieces.js:952-953`)
28. "eye for an eye seems fair." (`events/setpieces.js:1159`)
29. "the towers that haven't crumbled jut from the landscape like the ribcage of some ancient
    beast." (`events/setpieces.js:1248`)
30. "inside the hut, a child cries." (`events/setpieces.js:2637`)
31. "unfathomable destruction to fuel wanderer hungers." / "his time here, now, is his
    penance." (`events/setpieces.js:75-76`)
32. "they took what they came for, and left." (`events/setpieces.js:3116`)
33. "lucky that the natives can't work the mechanisms." (`events/setpieces.js:3151`)
34. "the walls hum faintly." (`events/executioner.js:144`)
35. "it had friends." (`events/executioner.js:1698`, a fight notification)
36. "says it can't die." / "then it is gone." (`events/executioner.js:2276`, `2328`)

**Ambient log lines outside the event system, same voice:**

37. "the light from the fire spills from the windows, out into the dark" (`room.js:714`)
38. "a ragged stranger stumbles through the door and collapses in the corner" (`room.js:770`)
39. "the stranger shivers, and mumbles quietly. her words are unintelligible." (`room.js:778`)
40. "the wind howls outside" (`room.js:762`)
41. "builder finishes the smokehouse. she looks hungry." (`room.js:110`)
42. "a stranger arrives in the night" / "a convoy lurches in, equal parts worry and hope."
    (`outside.js:187`, `193`)
43. "the trees are gone. parched earth and blowing dust are poor replacements."
    (`world.js:611`)
44. "the world fades" (`world.js:925`, the entire death message)
45. "learned to be where they're not" (`engine.js:49`, a perk notification)
46. "somewhere above the debris cloud, the wanderer fleet hovers. been on this rock too long."
    (`ship.js:90`)

##### 4.4 Recipe

**Title.** Title Case with an article, 1-3 words: "The X" for people, "A/An X" for things and
places.

**Log notification.** 3-8 words in the present tense, as a headline. Examples: "a beggar
arrives", "some traps have been destroyed".

**Scene text.** 2 lines, each 5-12 words:

- Line 1 is a concrete image.
- Line 2 is a consequence or an understated aside.
- Drop subjects ("says…", "can't tell…").
- Never explain the sci-fi layer; describe it through a villager's eyes.

**Buttons.** 1-3 lowercase words, verb first. Always include a neutral exit ("ignore it",
"say goodbye", "turn him away").

**Follow-up scenes.** 1-3 lines. A grim result gets a three-line escalation. A good result
gets a two-line thank-you plus the item.

---

#### 5. Cadence

##### 5.1 Random events

- **Interval.** A uniform draw from {3, 4, 5} minutes, mean **4 min**, which is about **15
  events per hour** while something is eligible. The clock starts when the previous event
  *opens*.
- **Retry when nothing is eligible.** Uniform {1.5, 2, 2.5} minutes, mean 2.
- **Hyper mode** (`engine.js:556-588`) halves everything: {1.5, 2, 2.5} and retry
  {0.75, 1, 1.25}.
- **First event.** 3-5 minutes after page load or reload, because the timer is not persisted.
- **Collisions.** If a panel is still open when the timer fires (a long trade, a world fight,
  a landmark), that slot is lost and the next one is 3-5 minutes away.
- **Tab gating** decides what can fire:

| tab | eligible events |
|---|---|
| Room | Room[0-9] (subject to gates), Thief, Penrose |
| Outside | Outside[0-5], Thief, Penrose |
| Path, World, Ship, Fabricator, Space | **only Penrose** (until accepted), otherwise nothing; retries every 1.5-2.5 min |

  The World therefore has no random story events. Its "events" are movement-driven fights
  (§1.14) and landmarks.

##### 5.2 Progress gates: when each random event can first appear

| stage | gate | events added |
|---|---|---|
| New game | none | **Penrose** (any tab) |
| Forest unlocked: `stores.wood` set to 4, about 45 s after the fire first reaches burning (builder appears at +30 s, forest at +15 s; `room.js:714-772`) | `stores.wood` truthy (≥1) | Noises (outside), Noises (inside), Mysterious Wanderer (wood); all Room |
| First furs (traps, or Noises "stuff") | `stores.fur > 0` | The Nomad, The Beggar, Mysterious Wanderer (fur); all Room |
| Traps built | `buildings.trap > 0` | A Ruined Trap (Outside) |
| Villagers arrive (huts) | `population > 0` | A Beast Attack (Outside) |
| 5 to 19 huts | `5 <= hut < 20` | The Shady Builder (Room) |
| Compass bought (Nomad or trading post), so Path and World init | `features.location.world` | The Scout, The Master (Room) |
| Any store > 5000 after the world is unlocked | `game.thieves == 1` | The Thief (Room or Outside), one-shot |
| Medicine owned (world loot first; then buyable at the trading post for 50 scales / 30 teeth once seen) | `stores.medicine > 0` | The Sick Man (Room); Sickness (Outside, 10 < pop < 50); Plague (Outside, pop > 50) |
| Population > 50 with huts | `hut > 0 && pop > 50` | Fire (Outside) |
| Ruined City cleared | `game.cityCleared` | A Military Raid (Outside) |

**Pool size by tab:**

- **Room:** the eligible pool grows from 1 (Penrose) to 3-4 early, then to about 10-12 late:
  Nomad, Noises ×2, Beggar, Shady Builder (5-19 huts), Wanderer ×2, Scout, Master, Sick Man,
  plus Thief and Penrose when their flags allow.
- **Outside:** typically 2-5 eligible events.

**Early vs late flavour.** Because the pick is uniform:

- **Early game** is dominated by the cheap, ambiguous wood events (Noises and the Wanderer).
- **Late game** dilutes them with traders and perk vendors.
- **The village tab** shifts from opportunity (trap loot) to catastrophe (fire, plague,
  raids) as the population passes 50.

##### 5.3 Other log cadence (normal play)

These sources fill the log between events. All use the same terse voice.

| source | timing | message pattern |
|---|---|---|
| Fire cools | 1 step per **5 min** after the last stoke (`room.js:6,718`) | "the fire is {dead/smoldering/flickering/burning/roaring}" (Room only, `noQueue`) |
| Room temperature | checked every **30 s**; logs only on change (`room.js:7,756`) | "the room is {freezing/cold/mild/warm/hot}" |
| Stoke or light (player) | button cooldown **10 s** (`room.js:9`) | "the fire is burning" |
| Builder arc | every **30 s** (`room.js:8`); forest unlock 15 s after the builder arrives | "the light from the fire spills…" → "a ragged stranger stumbles…" → "the wind howls outside" + "the wood is running out" → "the stranger shivers…" → "the stranger in the corner stops shivering…" → "the stranger is standing by the fire. she says she can help. says she builds things." |
| Gather wood (player) | cooldown **60 s** (`outside.js:8`) | "dry brush and dead branches litter the forest floor" |
| Check traps (player) | cooldown **90 s** (`outside.js:9`) | "the traps contain scraps of fur, bits of meat and …" |
| Population growth | every `floor(rand*2.5)+0.5` = **0.5, 1.5 or 2.5 min** while huts have room (`outside.js:10,255`) | "a stranger arrives in the night" (1), "a weathered family takes up in one of the huts." (<5), "a small group arrives, all dust and bones." (<10), "a convoy lurches in, equal parts worry and hope." (<30), "the town's booming. word does get around." (30+) |
| Build unlock | when wood reaches **half** the cost and all other components have been seen (`room.js:1087-1101`) | `availableMsg`, e.g. "builder says she can make traps to catch any creatures might still be alive out there" |
| World travel | per move: terrain change, danger radius, food every 2 moves, water every move | "the grasses thin. soon, only dust remains.", "safer here", "the meat has run out", "starvation sets in" |
| World fights | after 3 safe moves, 20% per move (mean 8 moves; 13 with stealthy) | encounter notification and death message |

**Rhythm summary.** A new log line appears roughly every 10-60 s in active early play. In idle
village play, population, fire and temperature lines arrive every 0.5-5 min. A random
**event** interrupts about every 4 minutes on the Room and Outside tabs.

