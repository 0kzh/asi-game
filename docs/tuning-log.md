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
