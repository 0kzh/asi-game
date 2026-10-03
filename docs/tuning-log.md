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
