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
