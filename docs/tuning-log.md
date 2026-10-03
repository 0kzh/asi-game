# Tuning log

Every change made to the design's numbers to meet the Stage 1 acceptance (sim bot: agent-1 released between minute 14 and 20, no idle streak over 60 s, a visible unaffordable project at every slow tick from the first researcher on). `design.md` has been edited to match. Run `npm run build && npm run sim -- 25 <seed>` to reproduce.

## Method

`node dist/sim/bot.js [minutes] [seed]` runs the DOM-free engine with the greedy policy in `src/sim/policy.ts` and prints a minute-by-minute table, milestone stamps, the longest idle streak (no enabled purchase, no running bar, no modal; `complete task` and the price arrows don't count) and carrot violations. The smoke test drives the same policy through real DOM clicks.

### Bot policy refinements (not content changes)
The policy as specified had problems that made its numbers say more about the bot than the game. Changed:
1. **Dead band.** "Deploy while demand ≥ 90% of capacity" plus "lower price when idle capacity > 20%" leaves demand between 80% and 90% of capacity with neither rule firing. The first bot stalled at 4 agents for 14 minutes there. Deploying now continues down to 80%.
2. **1% price steps.** Below $1 the ▲▼ buttons move $0.01 (4–10% at early prices). The bot builds up the 1% it wants and presses the button once a whole cent has accumulated.
3. **GPUs for requirements.** The bot also buys GPUs when a visible project requires more than it owns (`train_agent1` needs 20). Without this rule it never reaches 20.
4. **Projects in a loop, then saving.** The bot buys every affordable project each second, cheapest first. It also holds back funds for the cheapest visible project whose only missing cost is funds, if that project is reachable within 3 minutes of revenue. Without this, the agent loop spends every dollar, even the $10k seed round, in the second it arrives.

## Content changes

| # | change | design said | now | why |
|---|---|---|---|---|
| 1 | base demand | 2 tasks/s | **4 tasks/s** (`BASE_DEMAND`, `src/core/economy.ts`) | Revenue was ~$1.3/s for the first 12 minutes. Now 8 agents saturate the market at the start price, and lowering the price is taught when the 9th agent arrives. |
| 2 | gpu base cost | $400 × 1.07^n | **$100 × 1.07^n** (`GPU_BASE_COST`) | The first GPU came at 5:30 (design: 2:00), with a 90 s idle wait in front of it. 20 GPUs for agent-1 now cost ~$3.9k instead of ~$16k. |
| 3 | `lease_dc` trigger | gpus ≥ 40 | gpus ≥ 40 **∨ (gpu_delay fired ∧ gpus ≥ 5)** | Makes design §7.3's "gpu_delay → `lease_dc` earlier" concrete. It is also a long-standing $25k carrot. Stamps unchanged. |
| 4 | ppa energy blocks | "buys in 50 MWh blocks" | the **auto-buyer** buys 50 MWh when it can afford one; the manual button stays 500 kWh | A ~$9k minimum energy purchase would lock S1 players out of energy. Stamps unchanged. |
| 5 | funding round minimums | "min table value" (no table) | pre-seed $1,500, seed $10,000, series a $100k, b $2M, c $20M, d $200M, e $2B, f $10B, strategic $50B, sovereign $200B (`src/content/events/lines.ts`) | The seed round at 34k tasks is what pays for agent-1 at minute ~14. |
| 6 | safety-institute score | (formula not given) | `2 + alignment/12 − 0.4·findings ± 1` | Matches §4.4's example (4/10 with a few findings). The first formula gave 1–2/10. |

Changes 1 and 2 are both needed. Measured with the final bot:

| variant | seed | first gpu | first researcher | finetune done | agent-1 released | max idle |
|---|---|---|---|---|---|---|
| design numbers (demand 2, gpu $400) | 1 | 5:30 | 7:06 | 12:55 | 26:35 | 90 s |
| design numbers | 2 | 5:30 | 7:06 | 13:06 | 29:09 | 90 s |
| gpu $100 only | 1 | 2:11 | 5:24 | 10:05 | 17:34 | **74 s** |
| gpu $100 only | 2 | 2:11 | 5:28 | 10:17 | 17:35 | **74 s** |
| demand 4 only | 1 | 3:35 | 5:57 | 10:41 | **25:33** | 59 s |
| demand 4 only | 2 | 3:35 | 5:57 | 10:31 | 19:38 | 59 s |
| **both (shipped)** | 1 | 1:31 | 4:37 | 8:24 | **15:26** | 49 s |
| **both (shipped)** | 2 | 1:31 | 4:37 | 8:13 | **18:17** | 49 s |

Seeds 1–10 with the shipped numbers: agent-1 released 15:19–18:17 (median 15:21), max idle streak 49 s (the wait for the first GPU at ~1:00–1:31), 0 carrot violations. The later seeds (2, 9) lose a researcher to the 10% `quit` ambient event, or get the seed round before research for agent-1 is ready.

## Against the pacing budget (design §11)
| target | sim (seed 1) |
|---|---|
| 0:40 first agent | 0:04 (the bot clicks 4×/s) |
| 2:00 8 agents, first gpu | 0:50, 1:31 |
| 3:30 3k tasks, first researcher | 4:37 |
| 6:00 fine-tune run | 7:39–8:24 |
| 9:00 train agent-1 visible | ~11:45 (20k tasks) |
| 14–18 agent-1 released | 15:26 |

The early milestones run about a minute behind the budget. Agent-1 lands inside the window. Human players will be slower than the bot, so stage 1 should play in roughly 16–22 minutes.

# Stage 2 — Agents

Acceptance (sim bot from snapshot '2', which starts at 18:00): stage 3 between minute 50 and 65 of total game time, no idle streak over 90 s in stage 2, a visible unaffordable project at every slow tick of stage 2, agent-2 trained in 80–110 s, the theft 2–4 minutes after agent-2 is trained. Reproduce with `npm run build && node dist/sim/bot.js 70 <seed> --from 2` (the minute column is total game time; the last block prints the state at the theft and the stage-2 verdict).

## Results (shipped numbers)
| seed | agent-2 start → trained | run | theft (after trained) | SL at theft | stage 3 | agent-2 | s2 idle | strict idle | carrot |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 52:43 → 54:14 | 90 s | 57:40 (+207 s) | 3 | 57:41 | internal | 0 s | 20 s | 0 |
| 2 | 48:01 → 49:32 | 90 s | 52:26 (+175 s) | 2 | 52:27 | released | 0 s | 20 s | 0 |
| 3 | 52:38 → 54:09 | 90 s | 57:46 (+218 s) | 3 | 57:47 | internal | 0 s | 20 s | 0 |
| 4 | 51:49 → 53:20 | 90 s | 56:47 (+208 s) | 3 | 56:48 | released | 0 s | 20 s | 0 |

Seeds 5–10: stage 3 at 52:45–56:15 (theft 169–217 s after agent-2), every seed PASS. Seeds 1–10 together: stage 3 at 52:27–57:47. The 80 s runs are the "the run finished early." beat. Idle counts `buy energy` as something to do (as in stage 1). The strict idle column ignores it, and its worst case is about 20 s. Seeds 2 and 9 reach stage 3 earliest. Their bot spends its insight on the spec first and never holds `sl3`'s 60 insight and $50M at the same time. It stays at SL2, so the theft comes 40 s sooner, and the $50M goes to gpus, so agent-2 starts ~3 min earlier.

## Bot policy (not content)
1. **Allocation.** Research share is 0 until `ai_rd`, then 30%. It goes to 50% while demand fits in half the cluster. "50% when demand < capacity", read literally, flips every second: moving 20% off deployment makes capacity < demand.
2. **Engineers when the cap blocks.** From stage 2, if a visible project costs more research than the cap, new headcount becomes engineers. This is what the hint ("research is capped… hire engineers") asks of a person.
3. **No manual energy once the auto-buyer runs (stage 2).** The 15 s rule bought 500 kWh twenty times a second at 10k+ tasks/s. That is +$2 base per purchase, and energy prices ran away.
4. **The agent-2 decision.** `keep_internal` on odd seeds, `release` on even seeds. Both are taken out of the cheapest-first loop, where they would be bought first because they cost nothing. On the theft modal the bot answers "disclose".

## Content changes
| # | change | design said | now | why |
|---|---|---|---|---|
| 1 | agents in stage 2 | `deploy agent` at $5 × 1.1^n | from `alloc`, agents = gpu slots, and the deploy button retires (`flags.autoDeploy`) | At $5 × 1.1^n the 150th agent costs $8M, so the design's 2,000+ gpus and the 22k–150k copies of the AI 2027 timeline are unreachable. Allocation becomes the stage's verb. |
| 2 | gpus per click | 1 gpu at $100 × 1.07^n, "datacenters reset the curve to a bulk price" | a lot of cap/125 gpus (1, then 4 in the leased datacenter, 40, 400). Each lot is one ×1.07 step since the last datacenter, and a new datacenter resets the curve to its tier's bulk price | At 1.07 per gpu, 400 gpus (the `build_dc` trigger) cost about 1.07^350. |
| 3 | first lot attempt | — | (rejected) lots of cap/50 with a reset to $80 a gpu | Seed 1 had 5,000 gpus by minute 24 and 950k tasks/s by minute 34. The funding table pays $10–$57 per task from series c on (series c $20M at 2.6M tasks … series e $2B at 46M). Every cheap gpu snowballed into the next round. Agent-2 was then blocked only by the research cap (5,400 < 6,000). |
| 4 | gpu market in stage 2 | — | every gpu price ×3 on entering stage 2 (log: "tensorworks is sold out through next year.") | With lots of 4 the leased tier filled to 450 gpus by minute 24 for ~$230k, and series c/d came at minutes 30 and 39. |
| 5 | `build_dc` bulk price | (reset curve) | the curve resets to ×200 the leased tier's bulk price ($16k a gpu before the stage-2 market and the lease discount), in lots of 40 | Keeps 400 → 1,500 gpus worth roughly series c + series d. |
| 6 | research cap | 150 + 250 × engineers (+ project bonuses, none listed) | `ai_rd` +1,500 and `build_dc` +4,500 | Agent-2's research cost needs about 23 engineers without bonuses. Headcount is about 18 by minute 50. |
| 7 | insight | only while research is at the cap | from `ai_rd`, researchers also make insight at half rate below the cap. Copies on safety make 0.2 insight per unit of research they would do | The bot (like a person) spends research as it arrives, so insight sat at 12 until minute 50. Evals, the chart and the briefing showed up in the last five minutes of the stage. Now: chart ~19:35, evals ~22:30, briefing ~25:00, honesty ~32, the spec ~45–52. |
| 8 | `train_agent2` | R 6,000, data 10 T, $5M, gpus ≥ 2,000 | **R 9,000**, data 10 T, $5M, **gpus ≥ 1,500** | At 2,000 gpus agent-2 waited for series d or series e, and the reserve for `sl3` sometimes blocked gpu buys. The spread was 53:51 → 1:08:41 over seeds 1–4. At 1,500, series d covers the gpus, and research (now larger, accrued at ~15–30/s) is the smooth final gate. |
| 9 | `build_dc2` trigger | gpus ≥ 4,000 | gpus ≥ 1,500 (bulk price ×10 of the previous tier, lots of 400) | 4,000 gpus never happens in stage 2. Without it nothing was greyed during the agent-2 run and the theft wait (82–287 carrot violations per seed). The $200M campus is the stage's last carrot and pays for itself in stage 3 (series e). |
| 10 | new project `agent1_update` | — | R 400 × n, 4 uses, capability +0.1 each (2.0 → 2.4) | `gov_briefing`/liaison (≥ 2.2), `inform_public` (≥ 2.4) and `sl3` (≥ 2.5) all read capability. Agent-1 is 2.0 and agent-2 only lands at the end, so every political beat crowded into the last 90 s. Narrative: "agent-1 finishes training. 'finishes' is a misnomer. it is updated weekly." |
| 11 | `taiwan1` trigger | gpus ≥ 2,000 | gpus ≥ 500 | At 2,000 it fired in half the seeds, after agent-2. At 500 it lands mid-stage (~minute 37), while the bot is buying gpus in the new datacenter. |
| 12 | theft delay | 2–4 min | 120–140 s + 40 s per security level above 1 (SL1 2:00–2:20, SL2 2:40–3:00, SL3 3:20–3:40) | Security buys time but stays inside the window. The first formula (+45 s per level from 120–150 s) measured 238 s at SL3. |
| 13 | DeepCent | — | trails your model by 0.4 (0.2 after the theft), closing at 0.1/min. Market share goes 0.1 → 0.4 as the gap closes 0.4 → 0.2. deepcent-1 releases at capability 1.85 (a dated log line) | Contract. The stage-1 calendar curve (+0.9/yr) stops in stage 2, or it would pass your model − 0.4 by january 2027. |

## Iterations (seed 1 unless noted)
| step | change | result |
|---|---|---|
| 1 | first pass: auto-deploy, lots of cap/50 with a reset, design costs | 950k tasks/s by 34:00, series e by 33:00, agent-2 never (cap 5,400) |
| 2 | per-gpu price carries over at each datacenter | 5,000 gpus by 30:00, plateau from 36:00, agent-2 never |
| 3 | lots of 1% of the cap past the lease | 4,250 gpus by 31:00, agent-2 never |
| 4 | lots of cap/125, tier bulk price ×200 | 2,066 gpus at 39:00, agent-2 never (cap 4,650) |
| 5 | + stage-2 gpu market ×3, `build_dc` cap +3,000, the engineer rule | seeds 1–4: stage 3 at 56:49, 53:51, 1:04:46, 1:08:41. Insight frozen until ~50:00 |
| 6 | + half-rate insight after `ai_rd` | seeds 1–4: 1:08:10, 1:09:37, 58:34, 1:00:12 (agent-2 waits for 2,000 gpus = series e) |
| 7 | + agent-2 at 1,500 gpus, `build_dc2` at 2,000 | seeds 1–6: 52:39–56:13, but 82–178 carrot violations during the run |
| 8 | + agent-2 R 9,000, cap bonuses 1,500 / 4,500, `build_dc2` at 1,500 | seeds 1–6: 52:22–57:06, 0 carrot violations |
| 9 | + `taiwan1` at 500, theft 120–140 s + 40 s/SL, exact run timing in the bot | seeds 1–10: stage 3 at 52:07–57:54, all PASS |
| 10 | `ai_rd` moves 30% of copies to research (design §3.6's 70/30) instead of leaving it to the player | seeds 1–10: stage 3 at 52:27–57:47, all PASS (shipped) |

Snapshot '3' (`src/dev/snapshots/stage3.ts`) takes its resources from step 9's state at the theft: seed 1 for the internal branch (odd seeds), seed 2 for the released branch (even seeds).

# Stage 3 — Takeoff

Acceptance: from the local stage-3 snapshot, the vote 45–60 min later, no idle streak over 90 s, a visible unaffordable project at every slow tick, agent-3 and agent-4 runs of 100–120 s, riots that fire and resolve, and the memo chain in order (sandbag → memo → leak → vote) with 1–2 min gaps. Reproduce with `npm run build && node dist/sim/bot.js 80 <seed> --from 3local`.

## Method

`--from <id>` starts the sim from a dev snapshot and prints a stage-3 report (`src/sim/stage3.ts`): a minute table (tasks/s, funds, gpus, power used/capacity, research, insight, capability, rival, gov, public, jobs), a timeline of set pieces and purchases, run lengths, riots, the memo chain gaps, idle streaks and carrot violations. `3local` (`src/dev/snapshots/stage3.local.ts`) is the state stage 2 is expected to leave, set directly so it works without the stage-2 projects: minute 60, february 2027, agent-2 released at capability 2.8, the theft resolved, 5,000 gpus (18,560 copies), $30M, 6,000 research, 150 insight, 12 T data, 60M tasks, gov 10, public 45, SL3, deepcent at 2.6. The spec asked for ~2,000 gpus and ~20k agents; agent-2 runs 2 copies per gpu (×1.6 distillation), so 20k copies needs ~5,000 gpus, and build_dc2's own trigger is 4,000 gpus.

Seeds alternate the stage-3 choices: odd seeds buy legible chain of thought, decline the defense contract and vote to pause; even seeds buy neuralese, accept the contract and vote to race.

### Bot policy refinements (stage 3 only)
1. **No 500 kWh clicks.** Each energy purchase raises the price base by $2. At stage-3 consumption the old "keep 15 s of energy" rule bought twenty 500 kWh blocks a second and drained the treasury in fifteen minutes. The auto-buyer handles energy from stage 3 (its blocks are now sized to the load, below).
2. **GPUs only when they help.** Copies deploy themselves, so "agents at the cap" is always true. The bot buys gpus while power is not the ceiling, or when a visible training run needs more.
3. **A priority order and a goal.** Cheapest-first spent the $50B strategic round on SMRs, sl4 and a cure instead of the zone. Stage-3 projects on the way to the vote are ranked (pipeline, stats, self-play, architecture, agent-3, defense, washington, zone, reactor, agent-4, seat, ubi, interp, monitors, gulf, smr, …). The first ranked project short of funds is the goal, and nothing ranked below it may spend into its price, unless the goal is more than five minutes of revenue away. Side projects (stockpile, cure, retraining, sl4, fab) keep a $10B war chest until agent-4 is trained.

## Content and economy changes

| # | change | design said | now | why |
|---|---|---|---|---|
| 1 | power demand scale | GW = tasks/s × kWh/task × 3.6e-3, "scaled" so 2M tasks/s ≈ 7 GW | × 3.6e-3 / 100 (`POWER_GW_PER_KWH_S`): 2M tasks/s at agent-3's 0.29 kWh ≈ 21 GW | At /300 (the spec's 7 GW) power never bound. The end of stage 3 sat at 16.6 / 25 GW. Now it binds near the 50,000-gpu cap (agent-3: 463k tasks/s on 4.8 GW) and again after the zone. |
| 2 | gpus in stage 3 | $100 × 1.07^n, datacenters reset the curve | `buy gpu` buys a block (10% of the fleet, rounded down to a power of ten) at $20,000 list × the price multiplier ($11,200 at ×0.56) | 1.07^n is unpayable past a few hundred gpus, and stage 3 goes from 5k to 500k. At a $10,000 list price, agent-3 arrived at minute 8. |
| 3 | copies | `deploy agent` at $5 × 1.1^n | copies deploy themselves onto every slot from stage 3 (`flags.autoDeploy`); the button is hidden | 1.1^n is unpayable past ~200 agents. This also fits the "control" verb. |
| 4 | price | "pricing is automated" | each tick, the market-clearing price (demand = capacity) | Demand elasticity is 1.5, so this is also the revenue-maximising price for the capacity there is. Power therefore caps tasks/s directly. |
| 5 | zone and agent-4 cost | sez $20B; train_agent4 $20B | **$50B** each | With $20B, the defense contract's $20B bought the zone at minute 14 on even seeds (vote at T+24), while odd seeds waited for the $50B strategic round (vote at T+54). Now both wait for the strategic round. |
| 6 | defense contract | accept: $20B | $20B **paid over 20 minutes** | The same windfall let even seeds buy SMRs before the strategic round (vote at T+43 against T+61). |
| 7 | smr trigger | reactor | reactor **∧ the zone** | Same reason. SMRs go on the zone's land. |
| 8 | zone and gulf: compute | power only | zone: gpu cap 500,000; gulf: gpu cap +500,000. Zone trigger is power ≥ 90% **or gpus ≥ 90% of the cap** | Design §3.7 lists the "SEZ megacampus" as compute relief. Agent-4 needs 500,000 gpus, above build_dc2's 50,000. |
| 9 | architecture choice trigger | gen ≥ 2 | gen ≥ 2 **∧ ai_rd2** | gen ≥ 2 is true from the first second of stage 3. Pacing §11 puts the choice ~15 min in. It now appears after the pipeline (minute 3–4); legible arrives at ~9:48 because insight is slow. |
| 10 | riots | jobs ≥ 5M | jobs ≥ 5M ∧ no ubi ∧ (agent-3-mini released ∨ 15 min into the stage); the next riot needs 2× the jobs of the last one | jobs = 0.4·log10(tasks/s)² is already 7.7M at stage-3 start (63k tasks/s). Thresholds of 5/10/20M stacked three riots right after the mini's ×2 (public 48 → 0). |
| 11 | research cap at stage 3 | (none) | raised to at least 20,000 on entry | ai_rd2 costs 20,000 research, which a lower cap can never hold. That was a soft lock. |
| 12 | insight after ai_rd2 | insight only while research == cap | researchers keep producing insight once the cap is removed | Without this, insight stops for good when the pipeline is bought. |
| 13 | energy auto-buyer | 50 MWh blocks after the ppa | stage 3: 30 s of consumption per block | Each purchase adds $2 to the base price. At 60–180 MWh/s, 50 MWh blocks meant several purchases a second and a runaway price. |
| 14 | data relief | "self-play" listed in §3.7 only | `self_play`: R 15,000, data +60 T, repeatable while data is short of the next run | Agents 2–4 need 160 T. Crawl plus three synthetic uses give 153 T. |
| 15 | government relief | briefings, transparency (§3.7) | `washington`: $2B × 2^n, gov +10, 3 uses, while gov < 20 after agent-3. `safety_case`: I 250 × n, public +8 and gov +5, 3 uses | Odd seeds (defense declined) sat at gov ~5, under the zone's G ≥ 20, for the rest of the stage. |
| 16 | research sink | — | `align_research`: R 400k × 1.35^n → insight +150, 12 uses | Research reaches the millions with nothing to buy. It also carries stage 3's surplus into stage 4's insight costs. |
| 17 | chip shock | `domestic_fab` "chip shock event → …" | `chip_shock` set piece: gpus ≥ 20,000 → gpu price ×3 for 4 min, absorbed once by the stockpile, ignored after the fab | Stage 3 had no shock for the stockpile or the fab to answer. |
| 18 | monitors trigger | prevModels ≥ 1 | prevModels ≥ 1 ∧ (agent-3 trained ∨ hack) | prevModels ≥ 1 has been true since the fine-tune. |
| 19 | sl5 | sl4 ∧ S4 | visible from stage 3, greyed until stage 4 and sl4 | A permanent carrot. Without it, after the sovereign round ($200B) there was a second with nothing greyed on screen. |
| 20 | release_mini | agent-3 trained ∧ rival within 0.3 | as before, only after agent-3 has waited 30 s unreleased | The bot (and most players) release at once. The board's modal is for holding. |
| 21 | clearances | agent-3 trained ∧ gov ≥ 10 | +200–300 s | It fired in the same minute as the hack and the riots. |

## Results (shipped numbers)

T+ is minutes after the snapshot (minute 60). Runs are the run's own duration, including mid-run beats.

| seed | path | agent-3 run starts | agent-3 released | zone | agent-4 trained | vote | branch | runs (s) | riots | memo gaps (s) | max idle | strict idle | carrot |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | legible, declined | 11:37 | 13:17 | 31:15 | 49:21 | **54:02** | slowdown | 100, 120 | 13:31→16:31 (waited) | 76, 74, 71 | 0 s | 253 s | 0 |
| 2 | neuralese, contract | 8:36 | 10:16 | 27:45 | 43:45 | **49:15** | race | 100, 110 | 10:47→13:47 (waited) | 82, 117, 71 | 0 s | 162 s | 0 |
| 3 | legible, declined | 11:38 | 13:18 | 31:16 | 49:02 | **53:53** | slowdown | 100, 100 | 13:36→16:36 (waited) | 81, 88, 62 | 0 s | 301 s | 0 |
| 4 | neuralese, contract | 8:33 | 10:13 | 27:42 | 43:43 | **49:21** | race | 100, 110 | 10:35→13:35 (waited) | 98, 108, 72 | 0 s | 113 s | 0 |

Seeds 5–10: votes at T+48:56–55:13, all pass. Spread over seeds 1–10 is 48:56–55:13 (odd 53:53–55:13, even 48:56–49:21).

"Max idle" uses the critic's definition, under which `buy energy` counts as something to do; from stage 3 it is always affordable. "Strict idle" ignores it. On the legible, contract-declined path, strict idle peaks at 2–5 minutes around T+25–30, waiting for the strategic round with the gpu cap reached and power bound. On the even path, the longest strict wait is the memo chain itself. Riots always end by being waited out in the sim: they come right after agent-3-mini, when the series-f money has just been spent on the reactor and agent-3. UBI is bought later from the projects column.

## Against the pacing budget (design §11), seed 1 / seed 2
| target | sim |
|---|---|
| 60 automated pipeline, stats, power ceiling | pipeline 63:16 / 63:16; stats 60:00; power row from 60:00, binding from ~73 (4.8 / 4.8 GW) |
| 75 neuralese choice; interp | legible 69:48 / neuralese 64:12; interp I 65:33 |
| 85 agent-3; hack; riots | agent-3 73:17 / 70:16; hack +2 min; riots 73:31 / 70:47 |
| 105–115 agent-4; memo; the vote | agent-4 109:21 / 103:45; vote **114:02 / 109:15** |

Agent-3 arrives ~12 minutes earlier than the budget, because the series-f round (196M tasks) lands at minute 68–72 and pays for it. The gap until agent-4 is the power phase: the strategic round, the zone, 500,000 gpus, the sovereign round.

**Sensitivity.** Stage-3 money arrives mostly as funding rounds keyed to tasks completed (series f at 196M, strategic at 832M, sovereign at 3.5B), and tasks/s is capped by power. Stage 3's length therefore depends on how many tasks, gpus and how much revenue stage 2 leaves. At the merge, re-run `--from 3` (the official snapshot) and compare it with `3local`. The first knobs to turn are `GPU_BULK_COST`, `POWER_GW_PER_KWH_S` and the zone/agent-4 prices.

# The merge — stages 1 → 2 → 3

Acceptance: stage 1 unchanged (`node dist/sim/bot.js 25 1`); from snapshot '2' stage 3 at minute 50–65 (`75 <seed> --from 2`); from the official snapshot '3' (`85 <seed> --from 3`, the sim's state at the theft, `src/dev/snapshots/stage3.ts`) the vote 45–65 min later with the automated pipeline within 3 min; a full game (`130 1`) reaching the vote between minute 100 and 125. `--from 3local` still runs stage 3's original reference start for comparison; nothing else uses it.

## What stage 2 hands stage 3 (official snapshot against `3local`)
| | official '3' (odd / even seed) | `3local` |
|---|---|---|
| minute | 57:42 / 52:28 | 60:00 |
| gpus (cap) | 1,646 / 1,726 (5,000; no second campus) | 5,000 (50,000) |
| power at the freeze | 2.1 / 2.2 GW | 4.8 GW |
| funds | $1.2M / $23M | $30M |
| research | 6,316 / 1,199 at 57 / 33 per s | 6,000 at ~80 per s |
| per-gpu price | $274k / $313k (stage 2's curve) | $11.2k ($20,000 list × 0.56) |
| marketing level | 12 (demand ×14.6) | 3 (×1.95) |
| agent-2 | internal (rdMult ×2) / released (demand ×3) | released |
| continuous learning | running (+0.02 capability a minute) | — |

So stage 3 starts poorer in gpus, power and research, but its market is ~4× richer at the clearing price (marketing), and capability creeps up all stage.

## Reconciliation changes (numbers)
| # | change | was | now | why |
|---|---|---|---|---|
| 1 | gpus in stage 3 | stage 2: lots of cap/125, ×1.07 a lot, tiers reset; stage 3: blocks at $20,000 list × multiplier (`GPU_BULK_COST`) | one curve (`economy.gpuUnitCost`). On entering S3 (`bulkPrice`) the per-gpu price is kept, then it stops climbing and falls as ×√(fleet at entry / fleet); lots are at least 10% of the fleet (power of ten); datacenters bought in S3 only raise the cap | Stage 3's list price was ×25 below where stage 2's curve ends ($274k–313k), and stage 2's curve is unpayable past ~5,000 gpus. The hand-off is exact ($273,676 → $273,676 on seed 1; lot 40 for $10.9M → 100 for $27.4M). At 50,000 gpus a gpu costs ~$50k, at 500,000 ~$16k, close to stage 3's tuned price where it matters (agent-4). |
| 2 | `ai_rd2` | R 20,000 | **R 7,000** (the S3 cap floor of 20,000 stays) | Stage 2 leaves 33–57 research/s. At 20,000 the pipeline came at T+7:13 (internal) and ~T+9 (released). Now T+0:13 / T+2:38. |
| 3 | `defense` trigger | capability ≥ 3.2 | **agent-3 trained** ∧ capability ≥ 3.2 | Continuous learning (+0.02/min) plus neuralese (+0.3) reached 3.2 at T+7:49, so the $20B contract arrived before agent-3 and even seeds voted at T+33. Stage 3 tuned it to land with agent-3. |
| 4 | `release_agent3` | demand ×4 | demand ×4, and ×3 more if agent-2 was kept internal (`flags.publicCaughtUp`; log "the public had agent-1-plus until today. it skips a generation.") | Internal labs never got release_agent2's ×3. Odd seeds (internal) voted at T+67–68. After the mini both stage-2 choices sell the same product; the internal choice keeps its research ×2. Odd seeds now T+58–59. |
| 5 | `sez` | $50B, G ≥ 20 | $50B, G ≥ 20, **after the strategic round** (greyed, "a strategic partner") | Stage 3's change #5 made the zone and agent-4 $50B so that "both wait for the strategic round". With a ~4× richer market (marketing 12, continuous learning) even seeds bought the zone from revenue at T+30 and voted at T+40–41. The explicit wait restores the intent: both paths buy the zone when the round lands (T+42–43 even, T+49 odd). |
| 6 | rival in S3 | stage 2's chase (to model − 0.2, share 0.1 → 0.4) and stage 3's creep (to model − 0.35) both ran | S2: stage 2's chase and market share; S3: stage 3's creep only, market share left where stage 2 put it (the board's "hold" keeps its +0.1) | One mechanism per stage. Months per capability point: 15 in S2, 6 in S3 (`rival.rivalGapMonths`, one function for the safety-pass line, the stats box and the vote). |
| 7 | jobs displaced | S2: a head count, the peak of round(0.4·log10²); S3: millions to 0.1, × jobsMult | millions everywhere: S2 the peak of 0.4·log10(tasks/s)², S3 the current value × jobsMult | Same curve, so 8.1M → 8.1M at the theft. Riots still wait for agent-3-mini or 15 minutes. |
| 8 | drift | S2: gov −0.2/min until briefed, opinion toward 50 − jobs (≤ 0.5/min), comms +0.2/min, from S2 on | gov drift and comms from S2 on; the opinion pull and theft attempts in S2 only | From S3 jobs act through riots; stage 3 was tuned without the pull. |
| 9 | `build_dc2` power | `caps.powerGw = max(1)` and an unread `flags.powerVisible` | +1 GW through stage 3's derived capacity (`POWER_ADDS`), and it reveals the power row (`flags.power`) | The stage-2 line was overwritten every slow tick by stage 3's derivation. |

## Bot policy (not content)
1. `build_dc2` is in the stage-3 priority list (after self-play). As a side project it sat behind the $10B war chest and the bot stopped at 5,000 gpus.
2. A stage-3 research goal: nothing ranked below the highest-ranked project short of research may spend research into it. Synthetic data and self-play spent the 17,000 research the pipeline needed.
3. The agent-2 decision and the theft answer (stage 2) and the seed-parity stage-3 choices (stage 3) are both kept; the vote, riots and defense choices are stage 3's.

## Iterations (official snapshot '3')
| step | change | vote (seeds 1, 2, 3, 4) |
|---|---|---|
| 1 | the merge as resolved (one gpu curve, ai_rd2 R 20,000) | 66:04 (seed 1; pipeline T+7:13) |
| 2 | + bot: build_dc2 priority, research goal; ai_rd2 R 7,000 | 67:02, 33:09 |
| 3 | + defense after agent-3 | 67:02, 39:52, 67:55, 40:59 |
| 4 | + agent-3-mini catches the internal lab's public up | 57:50, ~40, 58:54, ~41 |
| 5 | + the zone waits for the strategic round (shipped) | 57:50, 49:33, 58:54, 50:42 |

## Results (shipped numbers)
Stage 1, seed 1: agent-1 released 15:26, max idle 49 s, 0 carrot violations, PASS (unchanged).

From snapshot '2' (75 min): stage 3 at 56:58 / 52:46 / 57:47 / 54:47 (seeds 1–4), stage-2 idle 0 s, 0 carrot violations, agent-2 runs 90 s, the theft 163–218 s after agent-2, all PASS.

From snapshot '3' (T+ after the snapshot):
| seed | path | pipeline | build_dc2 | agent-3 run | mini | reactor | zone | agent-4 | vote | runs (s) | max idle | strict idle | carrot |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | internal, legible, declined | 0:13 | 12:04 | 21:27 | 23:07 | 29:15 | 49:41 | 51:01 | **57:50** | 100, 110 | 0 s | 229 s | 0 |
| 2 | released, neuralese, contract | 2:38 | 10:17 | 16:32 | 18:03 | 16:30 | 42:23 | 42:29 | **49:33** | 90, 110 | 0 s | 46 s | 0 |
| 3 | internal, legible, declined | 0:13 | 12:06 | 21:35 | 23:15 | 26:59 | 49:14 | 51:39 | **58:54** | 100, 100 | 0 s | 210 s | 0 |
| 4 | released, neuralese, contract | 2:38 | 10:18 | 16:32 | 18:12 | 18:36 | 43:00 | 43:06 | **50:42** | 100, 110 | 0 s | 43 s | 0 |

Seed 2's agent-3 run is 90 s because the 20% "the run finished early." beat (−10 s) fired; it is the only criterion that fails. Riots fire and resolve on every seed; the memo chain gaps are 62–119 s. Strict idle (nothing affordable but `buy energy`) peaks on the odd path while the bot saves for the zone before the strategic round (seed 1, T+36–40) or waits out the chip shock (seed 3, T+18–21). `--from 3local` now votes at T+46:16 / T+43:58.

Full games (`130 <seed>`):
| seed | agent-1 released | stage 3 | agent-3 trained | agent-4 trained | the vote (stage 4) | s3 strict idle | verdicts |
|---|---|---|---|---|---|---|---|
| 1 | 15:26 | 54:14 | 1:17:52 | 1:48:10 | **1:53:16** | 118 s | PASS, PASS, PASS |
| 2 | 18:17 | 54:49 | 1:15:34 | 1:38:52 | **1:43:58** | 150 s | PASS, PASS, PASS |
| 3 | 15:20 | 54:38 | 1:17:44 | 1:47:14 | **1:52:28** | 226 s | PASS, PASS, PASS |
| 4 | 15:19 | 50:13 | 1:08:08 | 1:34:51 | **1:40:02** | 26 s | PASS, PASS, PASS |

The full runs leave stage 2 about the same resources as the snapshots, so no stage-boundary change beyond the table above was needed. Seed 4 (the fast path from the earliest theft) lands two seconds inside the window; if stage 2 gets faster, it is the first to fall out.
