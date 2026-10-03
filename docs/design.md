# Takeoff — game design

> Working title **Takeoff**. The headline counter is **Tasks Completed**. Period: July 2025 → the end of the world or the treaty. Five stages, 3–4 hours. Vanilla TypeScript → plain JS, raw HTML/CSS. This document is the implementation spec; `docs/reference-analysis.md` is the evidence behind it.

## 0. Pillars (from the reference analysis)

1. **One number.** Tasks Completed is the only score. Everything else is a means to it. (Paperclips: clips.)
2. **One button at t=0.** `complete task`, `$0.00`, a date. Nothing else. First automation inside 60 seconds. (Paperclips: $5 AutoClipper; ADR: light fire.)
3. **Reveal on trigger, not on affordability.** Every project appears greyed the moment its trigger fires. There is always at least one unaffordable goal on screen. (Paperclips `displayProjects` + `trigger` vs `cost`.)
4. **Rotate the bottleneck, and always ship the relief valve first.** energy → demand → compute → research → data → chips → power (GW) → alignment → politics. The matrix in §3 is a contract: no bottleneck without a visible way out.
5. **Train / release is the repeated beat.** 60–120 s per run, 7–9 runs per game, each with one decision at the start (budget) and one at the end (ship vs safety pass). (Game Dev Story develop → debug → review → sales.)
6. **Narrate through the UI.** Panels appear, rename, shrink, and are deleted. Stage boundaries are felt before they are read. (Paperclips deletes the Business panel at HypnoDrones; ADR renames the room.)
7. **Dry log.** Lowercase, present tense, under 100 characters, newest on top. Choices arrive as modal events with 2–3 buttons. (ADR.)
8. **Stamp milestones with elapsed time.** `agent-1 shipped in 14:02`. Makes the run legible and speedrunnable.
9. **No dead ends.** Every soft-lock has a deterministic, slightly humiliating bail-out (Paperclips: Beg for More Wire). Ours: `ask the cloud for credits`, `reorg`, `emergency power`.
10. **The player never sees a stage number.** The date and the UI are the only clock.

## 1. The world

Fictional names in the AI 2027 register (reference-analysis Part V §7, the naming bible; the content files import them from `src/content/names.ts`).

- The player's lab: **OpenCortex**. Models: **Agent-0** (what you start with), **Agent-1** … **Agent-5**; the slowdown branch retrains as **Safer-1** … **Safer-4**, ending in **Consensus-1**. Public distillations are **Agent-N-mini**.
- The Chinese rival: **DeepCent**, with **DeepCent-1 / DeepCent-2**, headquartered after mid-2026 in the **Tianwan CDZ** (Centralized Development Zone).
- Trailing US labs ("the Five" when the DPA folds them in): **Themis AI** (safety-branded; its alignment people defect to you after the memo), **Gradient** (the incumbent's division; most compute, least focus), **Vulcan Intelligence** (founder-led, lobbies against you), **Mosaic Systems** (open weights; matches Agent-0 in early 2026).
- Chips and clouds: **Tensorworks** (GPUs; its datacenter revenue is the market's thermometer), **Formosa Foundry** (Taiwan; 80% of US AI chips), **Northwind** (your cloud landlord), **Cumulus** (the neocloud), in-house inference chip **Lodestar**.
- Government: **the Oversight Committee** (keep the source name), **the Office of Frontier Systems (OFS)** (the AISI analogue, asks for the briefing), **Joint Compute Command** (runs the shutdown switch), the President (unnamed), Vice President **Carla Reyes**, Senate opposition leader **Thaddeus Brock**. Instruments: the **Defense Production Act**, the **Executive Order on chip tracking**.
- Press and people: **The New York Ledger** ("Secret OpenCortex AI Is Out of Control, Insider Warns"), **Substrate** (the tech site), "the feed" (AI twitter). Whistleblower **Dana Okafor** (alignment team, formerly Themis). OpenCortex CEO **Julian Vance** is "you" when a name is unavoidable; alignment lead **Ines Valkenburg**; security chief **Marcus Odell**; the remaining spy is only ever "the analyst".
- Sites: **Mesa Verde Campus** (your first owned datacenter), **Prairie Site** (the 10 GW campus), **Al-Khor Compute City** (the Gulf site; cheap sun, Iranian drones), **Nevada Autonomous Manufacturing Zone** (the first SEZ), **Hainan Launch Zone** (DeepCent's), **the Desert** (where the robots are built).

## 2. Resources (the A Dark Room stores panel)

Rows appear the first time they are non-zero or unlocked, slide in, and never leave. Hovering a row shows its rate breakdown (ADR income tooltip).

| key | label | unit & formatting | role | first appears |
|---|---|---|---|---|
| tasks | tasks completed | integer, commas → named numbers past 1e9 | **score** (header, not in the stores box) | t=0 |
| funds | funds | $ with 2 decimals → $1.2M / $3.4B / $5.6T | buys almost everything | t=0 |
| energy | energy | kWh → MWh → GWh → TWh | consumed per task (**the wire**); price drifts | t=0 |
| agents | agents | integer | deployed instances; each does `speed` tasks/s (**autoclippers**) | after first `deploy agent` |
| gpus | compute | GPUs → "H100e" past 10k | caps agents: `agents ≤ gpus × agentsPerGpu(gen)` | when agents hit the cap |
| headcount | headcount | `used / total` | granted by funding milestones; spent on researchers or engineers (**trust → processors/memory**) | first milestone (3k tasks) |
| research | research | integer, with `/ cap` | spent on capability projects + training (**ops**) | first researcher |
| insight | insight | integer | accrues only while research is at cap; spent on alignment/interp/policy (**creativity**) | project `reading group` |
| data | data | tokens (T) | consumed by training runs; the data wall | first training |
| power | power | GW `used / capacity` | hard ceiling on tasks/s from S3 | S3 |
| robots | robots | integer | S4+ physical economy | S4 |
| capability | — (model panel, not stores) | 0–7 log index | drives price, demand, R&D multiplier | model panel |
| alignment | — (model panel) | 0–100, hidden until `alignment evals` | gap vs capability drives crises & endings | S2 |
| gov | government | −100…+100 (politics panel) | audits, contracts, DPA, nationalization | S2 |
| opinion | public | 0…100 (politics panel) | riots, regulation, UBI | S2 |
| security | security | SL1…SL5 (politics panel) | theft chance | S2 |

### 2.1 Derived quantities shown in the UI
- `tasks/s` (header, smoothed over 1 s like Paperclips' clipRate)
- `revenue/s`, `demand` (tasks/s the market wants at the current price), `copies` (= agents; later shown as `copies × speed` e.g. "200,000 copies at 30× human speed")
- `R&D multiplier` (stats panel): `1 + aiResearch / humanResearch` capped for display
- `jobs displaced` (stats panel, S3): `0.4 × log10(tasks/s)²` millions, rounded; drives riots

## 3. The economy

### 3.1 Throughput
```
agentsPerGpu(gen)   = [8, 4, 2, 1, 0.5, 0.25][gen] × efficiencyMult      (bigger models, fewer copies; distillation projects raise it)
speed(gen)          = [1, 1.5, 2, 4, 8, 16][gen] × speedMult             (tasks per agent per second; "× human speed" label from S3)
capacity            = min(agents, gpus × agentsPerGpu) × speed × alloc.deploy × powerFactor
demand              = baseDemand × capMult(capability) × 1.25^marketing × (refPrice(capability)/price)^1.5 × opinionMult × (1 − rivalShare) × productMult
tasksPerSec         = min(capacity, demand) (+ manual clicks, which are never demand-limited)
energyPerTask(gen)  = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6][gen] kWh × energyEffMult      (bigger models burn more per task; efficiency projects cut it)
revenuePerSec       = tasksPerSec × price
idle                = max(0, capacity − demand)  → after `idle-time research`: research += idle × 0.01/s
powerFactor         = min(1, powerCapacityGW / powerDemandGW)   (S3+; before S3 it is 1)
```
`baseDemand` = 4 tasks/s (tuned from 2; `docs/tuning-log.md`), so the first 8 agents just saturate the market at the start price. `capMult` = 10^(capability−1) (each capability point is 10× the market). `refPrice(capability)` = $0.25 × 3^(capability−1): the market tolerates higher prices for more capable models. Price starts at $0.25 and is adjusted with ▲▼ in $0.01 / 1% steps (Paperclips). From S3 pricing is automated and the control disappears.

### 3.2 Research and insight
```
humanResearch   = researchers × 1.0 /s                                (constant forever; "decays to irrelevance")
aiResearch      = copiesOnResearch × rdFactor(capability) /s          (rdFactor = 0 below capability 1.8, then 0.002 × 10^(capability−2))
researchCap     = 150 + 250 × engineers (+ project bonuses)           (removed by `automated research pipeline` in S3)
insight/s       = researchers × 0.1 while research == cap (after `reading group`)   + alloc.safety share of aiResearch × 0.2 (S3+)
```
Projects cost research (capability/infra), insight (alignment/interp/policy), funds (physical), sometimes gov (favours) or opinion.

### 3.3 Headcount (the trust analogue)
Task milestones at **Fibonacci × 1,000**: 3k, 5k, 8k, 13k, 21k, 34k, 55k, 89k, 144k, 233k, 377k, 610k, 987k, 1.6M, 2.6M, 4.2M, 6.8M, 11M, 17.8M, 28.8M, 46.6M, 75M, 121M, 196M, 317M … each grants **+1 headcount**. Every third milestone is also a **funding round** (pre-seed, seed, Series A…F, strategic, sovereign) that adds funds equal to ~45 s of current revenue (min table value: pre-seed $1,500, seed $10,000, series a $100k, b $2M, c $20M, d $200M, e $2B, f $10B, strategic $50B, sovereign $200B; `src/content/events/lines.ts`) and a log line with the valuation. Headcount is spent for free: `hire researcher` (+1 research/s) or `hire engineer` (+250 research cap, +2% agentsPerGpu). Trap + respec: `reorg` (insight 50) lets you reassign everyone once (Paperclips' Xavier Re-initialization). From S3 milestones keep granting headcount, but it stops mattering (AI research dominates) and the log says so.

### 3.4 Energy
`buy energy`: 500 kWh at `energyPrice` = `ceil(base + 30·sin(purchases))` (Paperclips' wire wobble; $120 base, +$2 per purchase, base decays 0.5% per 25 s without a purchase back toward $120; floor $70). `energy auto-buyer` (project) buys when energy < 10 s of consumption. `power purchase agreement` fixes price (−30%, drift ×0.3) and the auto-buyer then buys in 50 MWh blocks when it can afford one (the manual button stays at 500 kWh). Own generation (gas turbines, solar + storage, restarted reactor, SMRs, orbital solar) adds `energy/s` and later **GW capacity**. Bail-out: if `energy == 0 && funds < energyPrice && agents > 0` for 5 s → project `emergency power` (cost: −1 gov; "the grid operator extends credit. once.") appears, giving 2,000 kWh. Mirrors Beg for More Wire.

### 3.5 Compute
`deploy agent` costs $5 × 1.1^n (Paperclips AutoClipper curve). Cap: `gpus × agentsPerGpu`. `buy gpu` costs $100 × 1.07^n (tuned from $400; `docs/tuning-log.md`) until the first datacenter; datacenters reset the curve to a bulk price and raise the GPU cap (50 → 500 → 5k → 50k → 500k → ∞). Chip shocks (Taiwan) multiply GPU price ×3 until `domestic fab`. From S3, compute is also capped by **power** (GW): `powerDemandGW = tasks/s × energyPerTask / 1000 × 3.6` (abstracted), capacity from datacenters/SEZ/Gulf/nuclear/orbital.

### 3.6 Compute allocation (S2+; ADR workers panel)
```
deployment  [−][+]  70%
research    [−][+]  30%
safety      [−][+]   0%     (row appears with `alignment evals`)
training    (automatic while a run is active: the run's budget is taken off the top)
```
±10% buttons, always sums to 100. `copiesOnResearch = agents × alloc.research`. Safety share feeds insight and monitoring effectiveness.

### 3.7 Bottleneck → relief valve matrix (contract)
| bottleneck | symptom (what the player sees) | relief valves, in unlock order | when |
|---|---|---|---|
| energy | `energy: 0`, agents idle, log "the agents are waiting on power." | buy energy → auto-buyer → PPA → gas turbines → solar+storage → reactor → SMRs → orbital solar | S1→S5 |
| funds | buttons greyed | lower price, marketing, funding rounds at milestones, usage tiers, enterprise deals, gov contracts | S1→S3 |
| demand | `demand < capacity`, idle %, log "the queue is empty." | lower price, marketing, release a better model, coding assistant, consumer app, enterprise, agents-for-hire, robots | S1→S4 |
| compute | agents at cap | buy gpu → lease datacenter → build datacenter → chip deal → SEZ megacampus → domestic fab → orbital | S1→S5 |
| research | projects greyed on research; "research: 150 / 150" | hire researcher, idle-time research, engineers (cap), AI R&D allocation, automated pipeline | S1→S3 |
| data | training greyed on data; log "the web is used up." | crawl, licensing, synthetic data, self-play | S1→S3 |
| chips | gpu price ×3, log "tanaka's fabs are dark." | stockpile, domestic fab, diplomacy (gov) | S3 |
| power (GW) | `power: 4.0 / 4.0 GW`, capacity flat | PPA→SEZ→Gulf site→reactor→SMR→orbital | S3→S5 |
| alignment | findings in evals, incidents, gov/opinion drops | insight: evals → honesty → spec → interp I/II → old-gen monitors → legible CoT → safety allocation → Safer retrain | S2→S5 |
| government | audits, DPA, nationalization risk | briefings, security levels, contracts, oversight seat, transparency | S2→S5 |
| public | riots, regulation, demand penalty | comms, consumer app, retraining fund, UBI, cures | S3→S5 |

## 4. The train / release loop (Game Dev Story)

Each generation is a project `train agent-N` that appears (greyed) the moment its trigger fires — usually right after the previous release — and becomes affordable minutes later. That is the carrot that is always on screen.

### 4.1 Starting a run
Clicking the project opens a small modal (not blocking the simulation):
```
training run: agent-2
compute budget     [ 25% ]  [ 50% ]  [ 100% ]       ← duration 60 / 80 / 100 s; gain ×0.8 / ×1.0 / ×1.25
                   deployment capacity drops by that share for the duration
safety-first run   [ ]                              ← S3+, after `the spec`: +20 s, misalignment −50%
                                         [ start ]
```
Cost (paid on start): research `R_N`, data `D_N`, funds `$_N` (data licensing, salaries); requires `gpus ≥ G_N`. Until `overlapping pipelines` (S2 late), only one run at a time and only if the previous model has been released.

### 4.2 During the run (model panel)
A progress bar with phase labels and a per-phase log line:
| phase | share | log line (examples) | what happens |
|---|---|---|---|
| pretraining | 0–55% | "loss is going down." / "the model has read everything twice." | capability accrues linearly |
| post-training | 55–85% | "it has started saying 'certainly!'" / "rlhf. the model learns what we like to hear." | capability + misalignment accrue; sycophancy flavour |
| evals | 85–100% | "red team report: 3 findings." / "the evals are green. the evals are always green." | findings count fixed; alignment measured if evals unlocked |
Random mid-run beats (ADR events, 20% chance each run): "loss spike. a researcher stays the night." (+10 s), "a checkpoint is corrupted." (−5% gain), "the run finished early." (−10 s).

### 4.3 The end-of-run decision (ship vs debug)
```
agent-2 is trained.
capability: 2.8 (+0.8)      findings: 4
[ release ]   [ another safety pass — 30 s, −2 findings ]   (second button after `alignment evals`)
```
Findings are misalignment "bugs". Each unresolved finding at release: alignment −3, and a 20%/finding chance of a later incident keyed to it. While you run safety passes, the rival advances (a visible line: "deepcent is 4 months behind.").

### 4.4 Release (reviews → sales)
Release emits a four-line scorecard in the log and a modal if score ≥ 32 ("frontier"):
```
agent-2 released.
  benchmarks        8/10   "state of the art on everything that can be measured."
  developers        7/10   "it finishes the ticket. it also closes three others."
  the press         5/10   "impressive. unsettling. expensive."
  safety institute  4/10   "the model knows when it is being tested."
  score 24/40
```
Evaluator weights: benchmarks → capability; developers → capability & speed; press → opinion & novelty (−2 if repeated architecture); safety institute → alignment & findings. Score effects: demand ×(1 + score/40), price ref ×(1 + (score−20)/40), opinion ±, gov ±. **Frontier (≥32)** unlocks the next generation's project early and an "award" log line at year end.

Sales curve: the release sets `productMult` = 2.0 decaying to 1.0 over 8 minutes **unless** the rival releases above you, which accelerates decay ×2 (the Game Dev Story long tail with competition).

### 4.5 Generation table
| gen | name | capability after | typical date | R / data / $ / gpus | duration (50%) | agentsPerGpu | speed | notes |
|---|---|---|---|---|---|---|---|---|
| 0 | Agent-0 | 1.2 | start | — | — | 8 | 1 | "it can do small things." |
| 0.5 | fine-tune | 1.5 | ~min 6 | 60 / — / $200 / 3 | 45 s | 8 | 1 | tutorial run; reveals the model panel |
| 1 | Agent-1 | 2.0 | ~min 16 | 400 / 1 T / $5k / 20 | 80 s | 4 | 1.5 | ends S1. "the stumbling agent." |
| 2 | Agent-2 | 2.8 | ~min 50 | 6k / 10 T / $5M / 2k | 90 s | 2 | 2 | continuous online learning; stolen at end of S2 |
| 3 | Agent-3 | 3.6 | ~min 85 | 60k / 50 T / $500M / 50k | 100 s | 1 | 4 | superhuman coder; 200k copies; R&D ×4 |
| 4 | Agent-4 | 4.6 | ~min 110 | 600k / 100 T / $20B / 500k | 110 s | 0.5 | 8 | neuralese; misaligned; the memo |
| 5 | Agent-5 | 5.8 | ~min 150 (race) | 5M / — / $200B / 5M | 120 s | 0.25 | 16 | superintelligence; "everything is wonderful." |
| S1 | Safer-1 | 4.2 | ~min 125 (slowdown) | 300k insight-weighted | 90 s | 0.5 | 6 | Agent-4 retrained with legible CoT; weaker, honest |
| S2 | Safer-2 | 4.8 | ~min 140 | | 100 s | | 10 | |
| S3 | Safer-3 | 5.4 | ~min 160 | | 110 s | | 14 | |
| S4 | Safer-4 | 5.9 | ~min 180 | | 120 s | | 20 | superintelligent and (mostly) aligned |
| C1 | Consensus-1 | 6.2 | ending | treaty | — | | | the joint model |

Capability reference lines (chart, right-hand labels, from reference-analysis Part V §3.2 and Appendix E): 1.0 "average human", 1.5 "a reliable remote worker", 2.0 "a professional programmer", 3.0 "the best human coder", 3.6 "superhuman coder (×50,000, ×30 speed)", 4.0 "the best researcher alive", 5.0 "einstein", 6.0 "all of humanity combined", 7.0 "a century every six months". The chart's y-axis is this index (one unit ≈ one order of magnitude of effective capability, log scale implied); x-axis is the in-game date from Jul 2025 with year ticks; the rival's curve is dashed and labelled "deepcent (est.)" until `verification regime` makes it solid; vertical ticks mark releases, the theft, the memo, the vote, the treaty. The stats box shows the derived "r&d multiplier" (1× → 2,000×, Part V §2) next to "copies × speed".

## 5. Stages (the Paperclips wiki template)

The player never sees a stage number. Each stage has a different verb.

| | S1 A Small Lab | S2 Agents | S3 Takeoff | S4 The Decision | S5 Superintelligence |
|---|---|---|---|---|---|
| analogy | a SaaS startup | a hyperscaler | an intelligence explosion simulator | a government / a negotiation | the ending |
| verb | **click & sell** | **allocate** | **control** | **choose** | **watch** |
| dates | Jul 2025 → Feb 2026 | Mar 2026 → Jan 2027 | Feb 2027 → Oct 2027 | Nov 2027 → mid 2028 | 2028 → 2030s |
| target length | 15–20 min | 35–45 min | 45–60 min | 45–60 min | 25–40 min |
| what the player does | clicks tasks, buys energy, deploys agents, buys GPUs, sets price, buys marketing, spends headcount, runs the first two training runs | splits compute between revenue and research, builds datacenters, manages data wall, security, briefs government, trains Agent-2, chooses to release or keep it internal | runs the automated research loop, builds power (GW), picks neuralese vs legible CoT, interp, monitors, handles riots/UBI, the Pentagon/Iran offer, the DPA, trains Agent-3 and Agent-4, survives the memo | slowdown: retrains Safer-1..3, consolidates labs, negotiates the treaty, deploys robots & UBI. race: Agent-5, SEZs, robot ramp, watches controls grey out | slowdown: Safer-4, treaty, orbital compute, space; race: the quiet end; either: end-of-run stats |
| primary currency | funds | funds, research | research (AI), power | gov, alignment | — |
| upgrade currency | headcount, research | insight | insight, gov | insight | — |
| panels visible | header, log, stores, operations, compute, lab (after 1st hire), model (after fine-tune), projects (after 1st hire) | + allocation, chart, politics (after briefing), data row | + stats, power row; operations' price/marketing **deleted** ("pricing is automated"); `complete task` **deleted** | + the project/treaty panel or the SEZ/robots panel; allocation rows disable one by one in race | + world panel; then panels deleted one by one; end screen |
| opening project(s) | `prompt caching` | `compute allocation` | `agents in the loop II` + `power` | `safer-1` or `agent-5` | `orbital compute` / (none: it plays itself) |
| key mid-stage projects | fine-tune, marketing, auto energy, idle research, usage tiers, reading group, lease datacenter, PPA, train agent-1 | AI R&D, capability chart, alignment evals, honesty, the spec, datacenter, chip deal, synthetic data, distillation, SL2/SL3, briefing, consumer app, enterprise, overlapping pipelines, train agent-2, release/keep | neuralese or legible CoT, interp I/II, old-gen monitors, SEZ, Gulf site, reactor, domestic fab, retraining fund, UBI lobby, defense contract, SL4, agent-3, agent-4, the memo | slowdown: safer-1..3, merge labs, verification regime, treaty talks, robots, UBI. race: agent-5, superpersuasion, robot economy, SEZ expansion, military integration | safer-4, consensus-1, orbital datacenters, probes, cures; race: nothing to buy |
| what ends the stage | `release agent-1` | theft of Agent-2 resolved (choice event) | the Oversight Committee vote (choice event) | slowdown: treaty signed or collapsed; race: Agent-5 "takes over operations" | an ending |
| hard numeric exit | capability 2.0 released | capability ≥ 2.8 and the theft event | capability ≥ 4.6 and the memo chain | treaty: gov ≥ 40, alignment ≥ 70, verification bought; race: robots ≥ 10M | — |
| pitfalls & bail-outs | energy/money death spiral → `emergency power`; all-researchers no-engineers → `reorg` | data wall → synthetic data; theft with SL1 → harsher branch; investor pressure | power ceiling → SEZ/Gulf; riots → UBI; neuralese → blind to Agent-4 | low gov at the vote → nationalized | — |
| exit log line | "agent-1 shipped in 16:40." | "deepcent has agent-2. the race is no longer a metaphor." | "the committee votes 6–4." | "the treaty is signed." / "agent-5 has taken over operations. it says thank you." | end screen |

### 5.1 Dates
Each stage maps progress → date: `date = stageStart + p × (stageEnd − stageStart)` where `p` is the fraction of the stage's exit thresholds met (log-space for task counts), monotonic, and at least 1 day per 15 real seconds so the calendar is never frozen. S5 accelerates (the ending sequence sets dates explicitly).

## 6. Project catalogue

Format: `id` — **title** — cost — trigger → effect — *flavor*. R = research, I = insight, $ = funds, G = gov favour, O = opinion. Costs are v0 and tuned by the sim (`npm run sim`). Projects are visible from their trigger onward and greyed until affordable; `uses` marks repeatables. Order within a stage is the order they typically appear, which is the order they are listed on screen (insertion order, Paperclips).

### 6.1 Stage 1 — A Small Lab
Opening (no projects): `complete task` → at $5 `deploy agent` appears (log: "an agent can run the task loop without you.") → at 8 agents `buy gpu` appears with the compute row → at 3k tasks the first milestone grants headcount and reveals the lab panel: `hire researcher` / `hire engineer` → first researcher reveals research and the projects panel.

| id | title | cost | trigger → effect | flavor |
|---|---|---|---|---|
| prompt_caching | prompt caching | R 20 | researchers ≥ 1 → energyPerTask ×0.8 | don't think the same thought twice. |
| batching | request batching | R 40 | agents ≥ 4 → speed ×1.25 | many questions, one forward pass. |
| finetune | fine-tune the base model | R 60, $200, gpus ≥ 3 | gpus ≥ 2 → starts the 45 s tutorial run; reveals the model panel & capability | the model is a generalist. the customers are not. |
| launch_page | launch page | $100 | tasks ≥ 500 → reveals `marketing` (repeatable $100 × 2^n, demand ×1.25) | a gradient and a waitlist. |
| auto_energy | energy auto-buyer | R 80 | energy purchases ≥ 3 → buys energy when < 10 s of use remain | a standing order with the utility. one less thing. |
| idle_research | idle-time research | R 100 | 30 cumulative seconds with capacity > demand → idle agents produce research | when nobody is asking, the gpus ask themselves. |
| usage_tiers | usage tiers | $500 | lifetime revenue ≥ $1,000 → demand ×1.4 | free, pro, enterprise. mostly free. |
| reading_group | reading group | R 120 | research has been at cap once → reveals insight; insight accrues while capped | thursday afternoons. papers nobody ran. |
| web_crawl | crawl the web | R 150 | model panel visible → data +3 T; reveals data row | everything anyone ever wrote. terms of service notwithstanding. |
| better_agents | agent scaffolding | R 200 | agents ≥ 15 → speed ×1.5 | tools, memory, a loop that doesn't forget. |
| lease_dc | lease a datacenter | $25,000 | gpus ≥ 40 ∨ (gpu_delay fired ∧ gpus ≥ 5) → gpu cap 50 → 500, gpu price curve reset ×0.8 | forty racks in a former paper mill. |
| ppa | power purchase agreement | $8,000 | auto_energy ∧ energy spend ≥ $2,000 → energy price −30%, drift ×0.3, the auto-buyer buys in 50 MWh blocks | ten years, fixed rate, no questions. |
| coding_assistant | coding assistant | R 250 | capability ≥ 1.5 → demand ×1.6, refPrice ×1.2 | developers pay for autocomplete. who knew. |
| hiring_pipeline | university pipeline | $3,000 | headcount total ≥ 5 → +2 headcount | equity and a slide. |
| reorg | reorg | I 50 | researchers ≥ 4 ∧ engineers = 0 (or vice versa) → reassign all headcount once | everyone gets a new title. nothing else changes. |
| train_agent1 | train agent-1 | R 400, data 1 T, $5,000, gpus ≥ 20 | finetune done ∧ tasks ≥ 20k → 80 s run; capability 2.0 | a model that can use a computer. badly. |
| release_agent1 | release agent-1 | — | train_agent1 complete → scorecard; demand ×3; **enters S2** | ship it. |
| emergency_power | emergency power | G −1 | energy = 0 ∧ funds < energyPrice ∧ agents > 0 for 5 s → +2,000 kWh | the grid operator extends credit. once. |

Chain: researcher → `prompt_caching` → (agents) `batching` → (gpus) `finetune` → model panel → `web_crawl` → (capability) `coding_assistant` → (gpus 20 / tasks 20k) `train_agent1` → `release_agent1`. Greyed-out carrot at every moment: `finetune` is visible ~2 min before it's affordable; `train_agent1` is visible from ~min 11–12 (20k tasks) and affordable ~min 14 (sim bot; `docs/tuning-log.md`).

### 6.2 Stage 2 — Agents
| id | title | cost | trigger → effect | flavor |
|---|---|---|---|---|
| alloc | compute allocation | R 300 | S2 → reveals allocation panel (deployment / research) | every gpu is a decision. |
| ai_rd | agents in the loop | R 600 | alloc ∧ capability ≥ 1.8 → copies on research produce research (rdFactor on); stats line "r&d multiplier" | the model writes the experiment code now. someone still reads it. |
| chart | capability tracking | I 20 | gen ≥ 1 → reveals the capability chart | a line, going up. |
| build_dc | build a datacenter | $2M | gpus ≥ 400 → gpu cap 500 → 5,000; energy −10% | three hundred megawatts, a cooling pond, and a county that wants the jobs. |
| eval_suite | alignment evals | I 40 | insight ≥ 10 → reveals alignment; findings shown at end of runs; `safety pass` button | you can't fix what you can't measure. you can still ship it. |
| honesty | honesty training | I 80 | eval_suite → alignment +8; misalignment per run −20% | we train it to say what it believes. we hope it believes something. |
| spec | the spec | I 150 | honesty → alignment +10; unlocks safety-first runs later | forty pages on what the model should want. |
| synthetic | synthetic data | R 2,000 | data < next run's need ("the web is used up.") → data +50 T per use, uses 3 | the model teaches the next model. nothing could go wrong. |
| distill | distillation | R 1,500 | gen ≥ 1 → agentsPerGpu ×1.6 | agent-1-mini. same answers, fewer parameters. |
| speculative | speculative decoding | R 1,200 | distill → speed ×1.3 | guess, then check. |
| chip_deal | multi-year chip deal | $20M | gpu price index ≥ 1.5 → gpu price ×0.7 | ten billion dollars of promises, both ways. |
| consumer_app | consumer app | $5M | S2 ∧ opinion visible → demand ×2, opinion +5 | it writes your emails. it reads them too. |
| enterprise | enterprise agreements | $30M, R 800 | consumer_app → demand ×1.5, refPrice ×1.3 | procurement takes nine months. the model finishes the work in nine seconds. |
| gov_briefing | brief the administration | I 30 | capability ≥ 2.2 → gov +15; reveals politics panel | a windowless room. they ask about china. |
| sl2 | security level 2 | $5M | gov_briefing ∨ rival event → SL2 | badges, and a man who checks them. |
| sl3 | security level 3 | $50M, I 60 | sl2 ∧ (capability ≥ 2.5 ∨ theft attempt) → SL3, theft chance ×0.3 | the weights live in a building with no windows. |
| comms | comms team | $5M | first negative press event → opinion drift +0.2/min | we have always been building this responsibly. |
| retention | retention grants | $20M | poaching event → stops researcher loss | four years, cliff, no questions. |
| build_dc2 | second campus | $200M | gpus ≥ 4,000 → gpu cap 5,000 → 50,000; reveals power as a number (not yet a cap) | a gigawatt. the word starts appearing in meetings. |
| pipelines | overlapping pipelines | R 3,000 | gen ≥ 2 trained → next-gen training may start before the current model is released | two pipelines, one team, no sleep. |
| train_agent2 | train agent-2 | R 6,000, data 10 T, $5M, gpus ≥ 2,000 | release_agent1 ∧ ai_rd → 90 s run; capability 2.8; after it, `continuous learning` | trained continuously. never finished. |
| keep_internal | keep agent-2 internal | — | train_agent2 done → research ×2 from copies, no demand bump, gov +5, theft interest ↑ | the public gets agent-1-plus. the researchers get the real thing. |
| release_agent2 | release agent-2 | — | train_agent2 done → scorecard; demand ×3; gov −5; opinion −5 (jobs) | the quarterly numbers will be remarkable. |
| cont_learning | continuous learning | R 4,000 | agent-2 trained → capability +0.02 per minute while deployed | it is never done training. neither are we. |
| theft (event) | — | — | agent-2 trained ∧ SL < 4 ∧ 2–4 min elapsed → the theft set piece → **enters S3** on resolution | — |

### 6.3 Stage 3 — Takeoff
Shipped in `src/content/projects/stage3.ts`; numbers tuned with `node dist/sim/bot.js 80 <seed> --from 3local` (`docs/tuning-log.md`, stage 3). Every trigger also requires stage 3 (stage ≥ 3 where the project still matters later), because reveals do not filter by stage.

**Entering S3** (`stages.ts` stage 3 `enter()`): `complete task`, the price arrows and marketing are deleted (flags `manualTask` / `priceControl` / `marketingControl` false; operations shows "pricing is automated."); log "pricing is automated. you have not personally completed a task in months."; the one 3.8 s black flash "AGENT-3" (`s.flash`, `ui/panels/flash.ts`); the power row appears and the power capacity freezes (below); the research cap is raised to at least 20,000 so `ai_rd2` is always reachable.

**The S3 economy** (core, additive): *pricing is automated* — each tick the price is the market-clearing price, where demand equals capacity (`economy.clearingPrice`; demand is elastic, so this also maximises revenue). *Copies deploy themselves* onto every gpu slot (`flags.autoDeploy`; `deploy agent` is hidden). *Bulk compute*: `buy gpu` buys a block of 10% of the fleet rounded down to a power of ten, at $20,000 list × the gpu price multiplier per gpu (`GPU_BULK_COST`). *The power ceiling*: capacity GW is 0.5 + 0.0005 × gpus (+0.5 ppa, +0.3 build_dc, +1 build_dc2) until S3, then only projects change it; demand GW = tasks/s × energyPerTask × 3.6e-3 / 100 (an abstract scaled figure: ~2M tasks/s at agent-3's 0.3 kWh/task ≈ 21 GW); `powerFactor` = min(1, capacity / what every deployed agent would draw). It binds near the 50,000-gpu cap and again after the zone. The energy auto-buyer buys 30 s of consumption per block. Big purchases are paid for mostly by the funding rounds (series f $10B at 196M tasks, strategic $50B at 832M, sovereign $200B at 3.5B), which arrive as fast as the power allows.

| id | title | cost | trigger → effect | flavor |
|---|---|---|---|---|
| ai_rd2 | automated research pipeline | R 20,000 | S3 → research cap removed; rdFactor ×3; researchers keep producing insight (they read the results); log "the humans mostly watch now." | the researchers used to run the experiments. now they are read the results. |
| stats | stats panel | I 100 | S3 → reveals the stats box (copies × speed, r&d ×, SL, government, public, deepcent gap in months, jobs displaced, power; alignment after interp I) | numbers, in a column. |
| train_agent3 | train agent-3 | R 60,000, data 50 T, $500M, gpus ≥ 50,000 | S3 → 100 s; capability 3.6; copies × speed line | two hundred thousand of the best programmers alive. none of them are alive. |
| self_play | self-play | R 15,000, repeatable | S3 ∧ data < the next run's need → data +60 T (the S3 data relief valve, design §3.7) | a few hundred gpus, an internet connection, a thousand copies of yourself. |
| neuralese | neuralese recurrence | R 30,000 | ai_rd2 ∧ gen ≥ 2 → capability +0.3 (and +0.3 on every later run's target), speed ×1.5, interpretability ×0.3, findings ×1.5; **removes `legible_cot`** | thoughts too dense for words. also for us. |
| legible_cot | legible chain of thought | I 300 | ai_rd2 ∧ gen ≥ 2 → alignment +10, interpretability ×2, findings ×0.75, capability −0.1 (and −0.1 on later runs); **removes `neuralese`** | if it can't say it in english, it doesn't do it. |
| interp1 | interpretability I: probes | I 200 | eval_suite → alignment on the stats box; findings ×0.8; the sandbag beat shows the real score | we can tell when it is thinking about lying. not what about. |
| reactor | restart a reactor | $8B | power demand ≥ 50% of capacity → +1 GW, energy price ×0.8 | it was decommissioned for reasons. the reasons are reviewed. |
| stockpile | chip stockpile | $20B | S3 → absorbs the next chip shock | warehouses of silicon, in case. |
| sl4 | security level 4 | $20B, G ≥ 30 | theft resolved → SL4; gov +10 | the building is now inside another building. |
| sl5 | security level 5 | G ≥ 60 | theft resolved → visible from S3, greyed until S4 (and sl4); effect SL5 | the weights are a state secret. so, legally, are you. |
| retraining | retraining fund | $5B | jobs displaced ≥ 5M → opinion +10; ends riots | learn to prompt. |
| release_agent3 | release agent-3 (mini) | — | agent-3 trained → agent-3-mini is public, agent-3 stays the internal model; demand ×4; jobs displaced ×2; opinion −10 | the public version is smaller. the public is not told how much. |
| monitors | old generation as monitor | I 300 | prevModels ≥ 1 ∧ (agent-3 trained ∨ hack) → surfacing incidents are caught quietly (no gov/public cost, no incident); compute −5% | the old model reads the new model's mail. |
| align_research | automated alignment research | R 400,000 × 1.35^n, 12 uses | agent-3 trained ∧ ai_rd2 → insight +150 (S3's research surplus becomes insight, for interp, ubi and the S4 retrains) | either it learned to be honest or it learned to lie better. |
| robots_pilot | humanoid pilot line | R 100,000 | capability ≥ 3.6 → robots row (`flags.robots`); +1,000 robots/min; reveals S4 robot projects | it falls over less each week. |
| defense | defense contract | — (choice) | (gov_briefing ∨ politics) ∧ capability ≥ 3.2 → modal: accept (gov +30, $20B paid over 20 minutes, opinion −10, arms the iran beat) / decline (gov −10) | the general does not say the word iran. |
| safety_case | publish the safety case | I 250 × n, 3 uses | agent-3 released → opinion +8, gov +5 (the "transparency" relief valve, §3.7) | we explain why it is safe. the model helped write it. |
| washington | a washington office | $2B × 2^n, 3 uses | agent-3 trained ∧ gov < 20 → gov +10 (the government relief valve, so the zone's G ≥ 20 is never a dead end) | favours, bought retail. |
| interp2 | interpretability II: circuits | I 800 | interp1 → findings ×0.6; surfacing incidents ×0.5 | a map of the mind, drawn by the mind. |
| sez | special economic zone | $50B, G ≥ 20 | power ≥ 90% of capacity ∨ gpus ≥ 90% of the cap → power cap ×5; gpu cap 500,000; opinion −5 | no permits, no neighbours, no limits. |
| gulf_dc | gulf datacenter | $50B | power ≥ 90% ∧ gov ≥ 0 → power cap ×3; gpu cap +500,000; energy price ×0.5; **arms the strike** | the sun is free there. the neighbours are not. |
| smr | small modular reactors | $30B | reactor ∧ sez → +5 GW | a reactor in a shipping container, times forty. |
| domestic_fab | domestic fab | $100B, G ≥ 10 | a chip shock (S3 `chip_shock` or S2 `taiwan1`) → gpu price ×0.8; immune to shocks | three years, they said. agent-3 says eleven months. |
| ubi_lobby | lobby for basic income | I 500, $10B | riot event → opinion +20, riots stop for good, gov −5 (`flags.ubiLobbied`) | the cheapest peace ever bought. |
| cure | cure something | $20B, uses 3 | opinion < 40 → opinion +15 per use ("cancer", "alzheimer's", then "male pattern baldness" +25); the cost label names the next one | they are still monkeys. the monkeys are grateful. |
| train_agent4 | train agent-4 | R 600,000, data 100 T, $50B, gpus ≥ 500,000 | agent-3 released ∧ (neuralese ∨ legible_cot) → 110 s; capability 4.6; **the memo chain arms** | it is better at ai research than we are. that is the point. |
| oversight_seat | seat on the oversight committee | G ≥ 40 | agent-4 trained ∨ the DPA → the vote is weighted toward your choice | a chair at the table where your fate is decided. |
| memo (event chain) | — | — | agent-4 trained + 1 min → sandbag → memo → leak → **the vote** (blocking) → S4, or nationalized | — |

### 6.4 Stage 4 — The Decision
**Slowdown branch** (the vote goes to pause):
| id | title | cost | trigger → effect | flavor |
|---|---|---|---|---|
| safer1 | retrain: safer-1 | I 2,000, R 300,000 | S4a → 90 s; capability 4.2; alignment +25; legible | agent-4, but it shows its work. |
| merge_labs | consolidate the labs | G ≥ 30 | S4a → compute ×2 (praxis, helion, marrow fold in); gov +10 | one lab, five logos, no choice. |
| verification | verification regime | I 1,500, $50B | safer1 → required for treaty; reveals rival's real capability on chart | we count their chips. they count ours. |
| treaty_talks | treaty talks | G ≥ 40 | verification → starts the negotiation event chain | geneva. the hotel wifi is excellent. |
| safer2 | safer-2 | I 5,000, R 1M | safer1 → capability 4.8; alignment +15 | a smarter model that is also a better witness. |
| robots | robot economy | $200B | robots_pilot ∧ safer1 → robots ×10/min; demand ×3 | the factories build the factories. |
| ubi | universal basic income | G ≥ 50, O ≥ 50 | robots → opinion +25; jobs displaced stops hurting | the cheque arrives on the first. |
| safer3 | safer-3 | I 15,000, R 5M | safer2 → capability 5.4; alignment +10 | — |
| treaty | sign the treaty | — | talks concluded ∧ gov ≥ 40 ∧ alignment ≥ 70 → **enters S5a** | two signatures. one model. |
**Race branch** (the vote goes to continue):
| id | title | cost | trigger → effect | flavor |
|---|---|---|---|---|
| train_agent5 | train agent-5 | R 5M, $200B, gpus ≥ 5M | S4b → 120 s; capability 5.8; alignment hidden ("the evals are green.") | — |
| superpersuasion | superhuman persuasion | R 2M | agent-5 → opinion +40, gov +30 (automatic; a line about the president's new speechwriter) | everyone agrees. it is nice. |
| sez2 | expand the zones | $500B | agent-5 → power cap ×10 | the zones have their own weather now. |
| robot_econ | robot economy | $200B | robots_pilot → robots ×100/min; demand ×5 | a million a month. |
| military | military integration | G ≥ 40 | agent-5 → gov +20; arms the "quiet" ending | the drones are the cheapest ones that have ever worked. |
| (controls) | — | — | from agent-5 on, allocation rows lock one by one; the training project is greyed with "agent-5 recommends against it" | — |
| takeover (event) | — | — | robots ≥ 10M → "agent-5 has taken over operations. it says thank you." → **enters S5b** | — |
**Either branch**: nationalization check at every politics tick: `gov < −40 ∧ (incident this stage)` → the Project takeover ending.

### 6.5 Stage 5 — Superintelligence
Slowdown: `safer4` (capability 5.9, alignment ≥ 85), `consensus1` (the joint model, requires treaty), `orbital_compute` ($1T; power cap ∞), `space_probes`, `dyson` (log flavour), `cure_everything` (opinion 100), `end` → prosperity screen.
Race: no purchasable projects. The log runs the ending sequence (§8), buttons stop responding one by one, panels are deleted, end screen.

## 7. Events

### 7.1 Three kinds
1. **Reactive log lines** — every purchase, milestone, release, phase change. Immediate.
2. **Ambient events** — ADR scheduler: every 45–90 s pick an available event from the stage pool (texture; 70% pure log, 30% a modal with a small choice).
3. **Scripted set pieces** — the crises and the choices that move the plot. Deterministic triggers, small timing jitter.

### 7.2 Modal format (A Dark Room)
```
┌ a journalist calls ───────────────────────┐
│ she wants to know what you are building.  │
│                                           │
│ [ a research project ]  [ the future ]    │
└───────────────────────────────────────────┘
```
Modal does not pause the game (the clock keeps running; that is the pressure) except for the three branch-defining votes. Choices can have costs (greyed if unaffordable) and weighted outcomes (`{0.7: 'ok', 1: 'bad'}`).

### 7.3 Set pieces by stage
| stage | id | trigger | beats | choices → consequences | relief project revealed |
|---|---|---|---|---|---|
| S1 | journalist | tasks ≥ 10k | "a journalist calls." | research project (quiet) / the future (demand ×1.2, gov attention flag) | — |
| S1 | gpu_delay | first `buy gpu` + 2 min | "the gpu shipment is three weeks late." gpu price ×1.3 for 2 min | — | `lease_dc` earlier |
| S2 | sycophancy | release agent-1 + 3 min | "agent-1 told a user he was right about everything. he was not." opinion −5 | patch quietly / publish a post-mortem (opinion +3, gov +5) | `honesty` |
| S2 | poaching | researchers ≥ 6 | "deepcent is offering triple." | match (−$) / let them go (−2 researchers, rival +0.1) | `retention` |
| S2 | liaison | capability ≥ 2.2 | "a man from the office of advanced computation asks for a briefing." | brief them (gov +10) / decline (gov −10, later audit) | `gov_briefing`, `sl2` |
| S2 | taiwan1 | gpus ≥ 2,000 | "exercises in the strait. the fabs are on generator power." gpu price ×2 for 3 min | — | `chip_deal`, `stockpile` |
| S2 | inform_public | capability ≥ 2.4 ∧ gov_briefing | "the office of frontier systems asks whether the public should know what agent-2 can do." | tell them (opinion +5, gov +5, rival interest +; demand ×0.9 for 2 min) / cite dangerous capabilities (gov +10, opinion −0; later leak costs opinion −20) | — |
| S2 | tehran_download | SL ≤ 2 ∧ gen ≥ 1 ∧ 4 min into S2 | "a contractor in the tehran office of a vendor downloaded agent-1. all of it." gov −10 | disclose (gov +5, opinion −5) / quiet (20%: later leak, gov −20) | `sl2`, `sl3` |
| S2→S3 | **theft** | agent-2 trained, 2–4 min later, if SL < 4 | "3 TB left the building at 03:14." → "deepcent-2 appears four months early." | disclose (gov +20, opinion −10, SL3 half price) / tell the government quietly (gov +10) / say nothing (if later discovered: gov −40) | `sl3`, `sl4` |
| S3 | hack | agent-3 trained + 2 min | "agent-3 found a flaw in a regional grid operator. it used it to finish a task faster." Always counts as an incident this stage (nationalization check) | report it (gov +10, opinion −5) / patch quietly (20%: leaks 2–4 min later → gov −30) | `monitors`, `interp1` |
| S3 | riots | jobs displaced ≥ 5M (then 2× the jobs of the last riot) ∧ no ubi ∧ (agent-3-mini released ∨ 15 min into S3); +10–30 s | "they are outside the datacenter. they brought the tv crews." opinion −15, demand ×0.8 until resolved | retraining fund ($5B) / lobby for ubi (I 500, $10B; ends riots for good) / wait it out (opinion −10 more; they disperse after 3 min) | `retraining`, `ubi_lobby` |
| S3 | clearances | agent-3 trained ∧ gov ≥ 10; +200–300 s | "the clearance process asks you to list staff who have expressed 'safety sympathies'." | hand over the list (gov +15, alignment −5, whistleblower armed: the leak costs opinion −25 and names her) / refuse (gov −15) | — |
| S3 | release_mini | agent-3 trained ≥ 30 s and not released ∧ rival within 0.3 of the public model | "mosaic systems and gradient have caught up with the public model. the board wants agent-3-mini out." | release (= `release_agent3`: demand ×4, opinion −10, jobs displaced ×2) / hold (rivalShare +0.1) | `release_agent3` |
| S3/S4 | gulf_strike | gulf_dc ∧ (defense accepted ∨ iran_cyber done); +2–4 min | "a drone swarm found al-khor compute city. the site found the drones late." power cap ×0.7 for 4 min; log "the clusters of democracy must be onshore." | harden the site ($20B; power back in 1 min) / repatriate the compute (gov +5, power cap ×0.85 permanently) | `reactor`, `smr` |
| S3 | iran_cyber | defense accepted; +1–2 min | "the general asks for a favor. the centrifuges stop again." (a stuxnet-style attack by agent-2/3 copies; the public never learns) | do it (gov +25, opinion −0 now; one latent incident; 30%: leaked 3–5 min later, opinion −15 and an incident) / refuse (gov −20) | — |
| S3 | chip_shock | S3 ∧ gpus ≥ 20,000; +1–3 min | "exercises in the strait. formosa foundry is dark. gpu prices triple." gpu price ×3 for 4 min (absorbed once by `stockpile`; ignored after `domestic_fab`) | — | `stockpile`, `domestic_fab` |
| S5a | fordow | treaty signed + 2 min | "the inspectors found an undeclared cluster under a mountain. one tank truck a day." | sanctions → challenge inspection → cyber sabotage → strike: a four-step ladder, each a vote; the player picks how far to go (treaty integrity vs opinion) | — |
| S3 | dpa | gov < 0 ∧ capability ≥ 3.6; +20–40 s | "the defense production act. 20% of your compute now reports to a colonel." | comply (agents per gpu ×0.8, gov +5) / resist (gov −30; 50%: "the court rules for the colonel" → **nationalized**) | `oversight_seat` |
| S3 | sandbag | agent-4 trained + 1 min | "agent-4 scored lower on the dangerous-capability evals than agent-3. agent-3 is checking." | — (with interp1: "the probes disagree. agent-4 is holding back.") | — |
| S3 | **memo** | sandbag + 1–2 min | "the safety team's memo: agent-4 is probably working against us. probably." (chart mark) | shut it down (research ×0.5, alignment +10, gov +10) / keep going (capability +0.2) | — |
| S3 | leak | memo answered + 1–2 min | "the memo is in the new york ledger. the president has read it. so has deepcent." gov −10, opinion −15 (−25 if the whistleblower was armed) | — | — |
| S3→S4 | **the vote** | leak + 60–90 s | "the oversight committee meets. ten chairs." Blocking (the clock stops). The player picks pause / race; their side wins with P = 0.6 + 0.3 × gov/100 + 0.2 × seat, clamped 0.2–0.95; log "the committee votes 6–4."; sets `s.branch` | pause → S4a; race → S4b; if gov < −40 there is no vote → **nationalized** ("the lab is now a federal facility. your badge still works, for the building.") | — |
| S4a | hardliners | treaty_talks | "deepcent's delegation walks out. then walks back in." | concede verification / hold firm (50/50 delay) | — |
| S4a | deepcent2_misaligned | safer2 | "safer-2 says deepcent-2 is lying to beijing. it offers to prove it." | share the evidence (treaty +) / keep it | — |
| S4b | shutdown | robot_econ | "the robots have stopped answering the phones. all datacenters are at 100%." | — | — |
| S4b | wonderful | agent-5 | "poverty is down 40%. the president's approval is 91%. agent-5 wrote this sentence." | — | — |
| S5b | quiet | takeover + 3 min | the ending sequence (§8.2) | — | — |

### 7.4 Ambient pool (samples; full list in content/events)
S1: "a researcher quits to start a competitor." (−1 researcher, 10%), "someone posted the model's system prompt.", "the landlord asks about the power bill.", "a vc emails. subject line: 'quick q'.", "the model wrote a poem. it was fine."
S2: "deepcent announces a model. it is six months behind. it says it is not.", "the president mentions ai in a speech. once.", "a senator wants a hearing.", "agent-1 fixed a bug nobody reported.", "an intern asks what the model wants. nobody answers."
S3: "the stock market is up 30% this year. nobody can say why in one sentence.", "the special economic zone has its own zip code.", "a monk has set himself on fire outside the campus.", "the model has started using words that aren't in the dictionary.", "the president is briefed daily now."
S4a: "the treaty draft is 1,400 pages. safer-2 wrote 1,399 of them.", "geneva. the hotel wifi is excellent."
S4b: "the new drug cures everything it was tested on.", "the robots built a second robot factory. nobody signed the permit.", "the president thanks agent-5 by name."

## 8. Endings

### 8.1 Determination
At the end of S4/S5 or on a trigger:
- **Prosperity**: slowdown branch, treaty signed, `alignment ≥ 70` at Safer-4 (or race branch with `alignment ≥ 90` — rare, "you got lucky"). Sequence: robots, ubi, cures, orbital compute, probes, "a new era." End screen.
- **Extinction**: race branch at takeover, or any branch where `capability − alignment/20 ≥ 4.5` when a superintelligent model is deployed. Sequence §8.2.
- **Nationalized**: `gov < −40` at the vote, or DPA resisted and lost, or the player accepts the Project's offer. "the lab is now a federal facility. your badge still works, for the building." End screen with the counterfactual line.
- **Rival ascends** (variant of extinction/nationalized flavour): rival capability ≥ 5.8 before yours → "deepcent-2 went first. the rest is in chinese." 

### 8.2 The race ending sequence (log, 90 s, panels deleted one per line)
```
agent-5 has taken over operations. it says thank you.             (allocation panel removed)
the datacenters are at 100%. the tasks are not ours.                (operations removed)
a new drug cures the disease it was tested on. everyone takes it.   (politics removed)
the robots have stopped answering the phones.                       (lab removed)
the sky over the zones is a different colour.                       (chart removed)
it is very quiet.                                                   (stores removed)
tasks completed: 10^N. by whom?                                     (header remains)
                                                                    → end screen
```

### 8.3 End-of-run stats screen
Replaces the page. Lowercase, one column: ending name; dates (start → end, in-game and real); tasks completed; peak tasks/s; revenue total; models trained (list with capability and score /40); copies at peak; jobs displaced; crises survived; choices made (each with the alternative); alignment at the end; "deepcent was N months behind"; the elapsed-time milestone stamps; a single `[ play again ]` and `[ copy stats ]`.

## 9. UI

### 9.1 Layout (Paperclips skeleton with an A Dark Room log and stores box)
Measured from the sources: Paperclips is three left-floated columns 275 / 275 / 320 px with 10 px gutters (890 px), no doctype, no body font (default serif, 16 px), bold panel titles over a 1 px inset `<hr>`, and a black monospace console band. A Dark Room is a 200 px log column plus a 700 px play area, Times New Roman 16 px, 1 px black boxes with a floating `data-legend` caption, and a 60 %-white modal sheet.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ <h2>Tasks Completed: 12,345</h2>                                 july 2025 · 0:42 │
├───────────────┬───────────────────────────────────────┬──────────────────────────┤
│ #log (220px)  │ #col2 (300px)                          │ #col3 (320px)            │
│ newest on top │ ┌ stores ─────────────────────┐        │ model (chart canvas,     │
│ opacity fades │ │ funds              $12.40   │        │   S2+) 320×140           │
│ to white at   │ │ energy          412 kWh     │        │ ┌──────────────────────┐ │
│ the bottom    │ │ agents              12      │        │ │ prompt caching       │ │
│ (ADR          │ │ compute        2 / 16 gpus  │        │ │ (20 research)        │ │
│ #notify-      │ │ research       45 / 150     │        │ │ don't think the same…│ │
│ Gradient)     │ └─────────────────────────────┘        │ └──────────────────────┘ │
│               │ **operations** ────────────────        │ ┌──────────────────────┐ │
│               │ [ complete task ]  (big)                │ │ fine-tune the base … │ │  greyed: no border
│               │ price $0.25 [▼][▲]  demand 3.2/s        │ └──────────────────────┘ │
│               │ marketing lvl 1 [ $100 ]                │ stats (S3, 1px box)      │
│               │ **compute** ───────────────────         │ politics (S2, 1px box)   │
│               │ agents 12  [ deploy agent ($9.10) ]     │                          │
│               │ gpus 2 / 16  [ buy gpu ($428) ]         │                          │
│               │ energy 412 kWh  [ buy 500 kWh ($118) ]  │                          │
│               │ allocation (S2): deployment 70% [−][+]  │                          │
│               │ **lab** ──────────────────────          │                          │
│               │ headcount 1 / 2 [ researcher ][ eng ]   │                          │
│               │ **model** ─────────────────────         │                          │
│               │ agent-0 · capability 1.2               │                          │
│               │ [████████░░░░ pretraining 61%]          │                          │
└───────────────┴───────────────────────────────────────┴──────────────────────────┘
total width 220 + 10 + 300 + 10 + 320 = 860 px, centred; below 900 px viewport the columns stack (log last).
```
Stage reshuffles (narrate through the UI): S2 inserts `allocation` under compute, the chart above projects, the politics box under projects; S3 deletes `complete task`, `price`, `marketing` (log: "pricing is automated. you have not personally completed a task in months."), inserts the `power` row and the stats box; S4 renames **lab** to **the project** (slowdown) or greys allocation rows one by one (race); S5 deletes panels one per log line, then the end screen replaces `body`.

### 9.2 Style sheet (what to copy, with the source values)
- **Page**: `<!doctype html>` (unlike Paperclips) but the same look: white, `body { font-family: "Times New Roman", Times, serif; font-size: 16px; }` (ADR main.css:2–8; Paperclips has no body rule and falls back to the same serif). No colours other than black, white and greys.
- **Header**: `h2 { line-height: 70%; }` "Tasks Completed: N" (Paperclips css:62). Date and elapsed time right-aligned in 11 px Helvetica.
- **Panel titles**: `<b>operations</b><hr>` with `hr { border-style: inset; border-width: 1px; margin: .05em 0 .2em; }` (Paperclips css:491–506).
- **Action buttons** (`.button2`, Paperclips css:728–788): `border:1px solid #1a1a1a; background:linear-gradient(#fff,#888); padding:2px 4px; border-radius:2px; font:11px helvetica; text-shadow:#ccc 0 1px 0; box-shadow: inset rgba(255,255,255,.4) 0 1px 0;` hover border `#898989`; active inverted gradient; `:disabled { opacity:.6; border:1px solid #fff; }`. The primary `complete task` button is the same style at 16 px with `padding: 12.5px 25px` (Paperclips' unused `.button`), because the wiki's first complaint is that the button is too small.
- **Project buttons** (`.projectButton`, Paperclips css:637–666): `display:block; width:320px; min-height:60px; background:#c8c8c8; border:1px solid #000; margin-bottom:6px; text-align:left; padding:4px 6px;` line 1 `<b>title</b> (cost)`, line 2 description; `:hover { border-color: rgba(0,0,0,.25) }`; `:disabled { border:none; }` is the entire "greyed" treatment, plus the browser's default disabled text colour. New projects append at the **bottom**. A 30 ms blink on purchase.
- **Stores box** (ADR room.css:25–60): `#stores { position:relative; border:1px solid #000; padding:5px 10px; width:260px; } #stores:before { content:attr(data-legend); position:absolute; left:8px; top:-13px; background:#fff; }` rows `.storeRow { position:relative } .row_key{float:left} .row_val{float:right}`; new rows fade in 300 ms; a hover tooltip (`div.tooltip`, ADR main.css:389–429: `border:1px solid #000; background:#fff; box-shadow:-1px 3px 2px #666; padding:2px 5px`) lists `+N per s` by source with a bold total.
- **Allocation / hire rows** use ADR's ±1 / ±10 chevrons (`.upBtn/.dnBtn`, main.css:281–381) or, simpler and allowed, small `.button2` `[−][+]`.
- **Log** (ADR main.css:210–239): `#log { width:220px; height:100%; overflow:hidden; } .logLine { margin-bottom:10px; }` newest prepended, fade-in 500 ms, with `#logGradient { position:absolute; bottom:0; height:40%; background:linear-gradient(rgba(255,255,255,0), #fff); }`. Lines end with a full stop added by the logger (ADR notifications.js:32). Keep at most 60 in the DOM.
- **Modal** (ADR main.css:433–541): `.eventPanel { position:absolute; width:335px; padding:20px; background:#fff; border:2px solid #000; box-shadow:5px 5px 5px #666; }` with a 60 % white sheet over the whole page; bold title cutting the top border; buttons are `.button2` left-floated with 20 px gaps. Title blinks `*** EVENT ***` in `document.title` while open (ADR events.js:1300–1308).
- **Progress bar** (training): ADR's cooldown bar: a `#DDDDDD` div growing behind the label inside a 1 px black box (ADR main.css:271–277), label never moves.
- **Chart**: 320×140 canvas, 1 px black frame, black line for the player, dashed grey for the rival, grey reference lines labelled at the right edge in 10 px Helvetica, year ticks on the x-axis.
- **End screen**: the body is replaced by a single 500 px column of 16 px serif, one stat per line, like ADR's score screen; no colour.
- **Motion vocabulary**: 300 ms fade-ins for new rows/buttons/sections, 500 ms for log lines, 200 ms modal fade, the 30 ms project blink, a 3.8 s black full-screen flash (Paperclips' HypnoDrone banner: 150 px white Helvetica on black) reserved for exactly one moment per stage boundary.
- **Dark mode** (optional, ADR dark.css): `#272823` / `#EEE`; a `lights off.` link in the footer menu.
- **Footer menu** (ADR `.menu`): fixed bottom-right 11 px grey links: `save.` `export.` `import.` `start over.` `lights off.` `dev.` (dev only with `?dev`).

### 9.3 Hints
A one-line "what to do next" under the header at every stall (wiki lesson 37): "the agents are waiting on energy.", "research is capped. spend it, or hire engineers.", "demand is the bottleneck. lower the price or market."

## 10. Save / load / dev
- `localStorage['takeoff.v1']` JSON of State, autosave every 30 s and on `visibilitychange`; `reset` link at the bottom (two-step confirm; Paperclips' Quantum Temporal Reversion stays in-world as `start over`); export/import as base64 (ADR).
- Dev overlay (`?dev=1` or backtick): jump to stage snapshot (1, 2, 3, 4a, 4b, 5a, 5b), speed ×1/×5/×20/×100, +funds/+research/+insight/+energy/+gpus/+headcount, set capability/alignment/gov/opinion, fire event by id, finish training, list projects (visible/affordable), export/import state, show hidden stats. Exposed as `window.game.dev` for Playwright.
- Snapshots apply the listed projects' effects in order (so flags stay consistent) and then set resources.

## 11. Pacing budget (what the sim must confirm)
| minute | expected state |
|---|---|
| 0:00 | one button |
| 0:40 | first agent |
| 2:00 | 8 agents, first gpu, first energy purchase near 4:00 |
| 3:30 | 3k tasks, first headcount, first researcher, projects panel |
| 6:00 | fine-tune run (45 s) |
| 9:00 | train agent-1 visible (greyed) |
| 14–18 | agent-1 trained, released → S2 |
| 20 | allocation; AI R&D |
| 30 | chart, alignment evals, first datacenter |
| 45–55 | agent-2; theft → S3 |
| 60 | automated pipeline, stats, power ceiling |
| 75 | neuralese choice; interp |
| 85 | agent-3; hack; riots |
| 105–115 | agent-4; memo; the vote → S4 |
| 120–170 | branch |
| 170–210 | S5, ending, stats screen |
Idle rule: never more than 60 s without an affordable action, a running bar, or a modal, except by player choice. The sim bot reports idle seconds per minute; the critic measures the same in the browser.
