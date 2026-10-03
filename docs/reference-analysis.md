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
| `Events._EVENT_TIME_RANGE` | **3–6 min** | between random events (retry at ×0.5 if none available) |
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

**Tone** (see Appendix B for 30+ quotes): all lowercase, present tense, short clauses, no exclamation marks, rarely more than 12 words. Characters are reported in indirect speech (*"says she builds things."*). The weather is a mood engine (*"the sky is grey and the wind blows relentlessly"*). Mysteries are hinted, never explained (*"strange scales"*, *"a crudely made charm"*). **Cadence:** in the opening 5 minutes there's a line every 10–30 s, from fire/temperature/builder changes and every click. Mid-game brings the 10 s income ticks (silent), population arrivals every 0.5–3 min, and random events every 3–6 min.

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

- **Scheduling:** `scheduleNextEvent()` waits a random **3–6 min**. Then `triggerEvent()` filters `EventPool` (Global + Room + Outside + Marketing) by `isAvailable()` and picks uniformly. If none qualifies, it retries at half the delay. Progress-gated events simply have stricter `isAvailable`.
- **Presentation:** a modal panel (`#event`) with the title, paragraphs of text, optional loot/reward, and buttons. **Costs** are shown on buttons and grey them out when unaffordable. `nextScene` is a **probability map** (`{0.5:'a', 1:'b'}` — cumulative thresholds), so outcomes can be random. `blink` flashes the browser tab title while the event waits.
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
| first random event | ~5–10 min after start of the event clock |
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

Paperclips has a 5-line console of terse ALL-CAPS-ish system reports, with **no dialog choices**; choices are mutually exclusive projects. ADR has an infinite fading column of lowercase, period-terminated prose, plus **modal events every 3–6 min** with costed buttons and probabilistic `nextScene` maps.

### 3.4 How currencies are layered

Paperclips: **Trust** (Fibonacci, discrete) → caps **processors + memory** → **ops** (continuous, capped at memory × 1000) → **creativity** (accrues *only while ops are capped*) → buys trust projects. Plus **yomi** (ops → tournaments), **honor** (battles), **swarm gifts** (stage-2 replacement for trust), and `tempOps` (an over-cap buffer that decays). ADR: **wood → huts → population → workers → converter chains** (fur → leather, meat → cured meat → ore → steel → bullets) that stall rather than go negative, with thieves taxing hoards over 5,000.

### 3.5 How pacing is controlled

- **Tick rates:** Paperclips 10 ms / 100 ms; ADR 1 s income ticks with 10 s payouts, 3–6 min event clock, 30 s room ticks, 5 min fire decay.
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

*(Generated from a full read of `projects.js`; see below.)*

## Appendix B — A Dark Room event system & catalogue

*(Generated from a full read of `events.js` and `events/*.js`; see below.)*
