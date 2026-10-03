# Critic log

Each round, a fresh critic plays Takeoff head-to-head against Universal Paperclips and A Dark Room in headless Chromium. The critic has no access to `docs/`. It scores both games on the same seven-item rubric and names the single biggest gap. We fix that gap (and as much of the top five as we can), then run a new critic with fresh context.

The rubric, scored 1–10 per item:

1. time to first meaningful choice;
2. seconds with nothing to do;
3. cognitive load and progressive disclosure;
4. cadence of reveals;
5. greyed-out goal always on screen;
6. clarity of stage transitions;
7. soft-locks found.

## Round 1

**Score:** Takeoff 38/70, Paperclips 61/70, A Dark Room 46/70. Takeoff lost every item.

| Item | Takeoff | Paperclips | A Dark Room |
|---|---|---|---|
| First meaningful choice | 7 | 8 | 6 |
| Nothing-to-do seconds | 7 | 8 | 3 |
| Cognitive load and disclosure | 4 | 8 | 9 |
| Reveal cadence | 4 | 8 | 7 |
| Greyed goal on screen | 8 | 10 | 5 |
| Stage transitions | 7 | 9 | 7 |
| Soft-locks | 1 | 10 | 9 |

**Single biggest gap:** in stage 2, the "Drought" event offered only paid choices while game time is frozen. A player without 15 s of revenue in cash was soft-locked. This happened in 5 of 5 runs that reached stage 2.

**Next five problems, as ranked by the critic:**

1. **Stage 1, minutes 2–25:** the research cap blocks Design Agent-1. The lever (GPUs in the experiments allocation) was not shown until after the gate.
2. **Stage 1, minutes 40–71:** Hyperion was locked "after Series C" for 31 minutes. During that time the calendar was frozen and the log-scaled investors bar sat near 97%.
3. **Stage 3:** Design Agent-4 needed 2.5M research against a cap of about 0.4M, leaving 27 minutes with nothing new.
4. **Stage 1, minutes 0–5, and stages 2–4:** disclosure was too fast. There were 8 panels by 54 s and 80–110 numbers on screen later.
5. **Data, alignment and the R&D multiplier stopped meaning anything.** The stage-5 sandbox never ended, and gas turbines were still on sale in 2037.

**Other notes:**

- events every few minutes, each needing two clicks;
- the allocation can starve serving without warning;
- "complete task" becomes vestigial;
- the stage 3→4 reshuffle is quiet;
- the robots.txt trade-off is invisible because approval isn't on screen yet.

### Fixes after round 1

**Soft-locks**

- Every event scene now checks whether any choice is affordable. If none is, a free "walk away" choice (approval −1) is added.
- Drought gained a free option.
- A single-"continue" outcome scene now goes to the log instead of a second modal, so each event needs one click.
- Random events are spaced 170–280 s apart.

**Research cap (stage 1)**

- The experiments allocation lives in the Research panel and is revealed by Experiment Budget, which now adds +200 to the cap.
- A hint line names the lever whenever a visible project costs more than the cap.

**Hyperion and the Series C wait**

- A funding round also opens after 10 minutes once tasks reach a quarter of its threshold.
- Series C is cheaper.
- The investors bar is linear.
- The calendar never freezes. Near the end of a stage it slows toward the last day, and the header shows the day.
- The late-stage-1 projects (legal, scribe, kernels, voice, distillation, support) fill the wait.

**Stage 3 and Agent-4**

- The stage-3 research cap scales with the research rate, and Design Agent-4 is cheaper.
- Six new projects arrive on a clock through stage 3:
  - Research Agent Swarm;
  - Model Organisms;
  - Synthetic Research Environments;
  - Debate;
  - Weight Escrow;
  - Hardware-Enabled Governance.

**Disclosure**

- Compute, funding, keyboard and headless purchases arrive later and one at a time.
- The Data panel waits until it matters.
- Duplicate readouts are gone.
- From stage 4, infrastructure, public and stats panels are hidden, and approval moves into Society.

**Live constraints**

- The web is finite: about 2.5 quadrillion tokens. Crawlers, datasets and licensing deals all deplete it, so the data wall arrives in stage 2.
- Alignment needs grow with capability, so alignment research is a live constraint. It is shown as a bar of "what the frontier needs".
- The R&D multiplier display stops at "2,000x+".

**Endings**

- The game freezes when the stats screen appears, so the stats agree with the header.
- The good ending dismantles every panel except Space, Projects, Alignment and Society.
- Its projects are cheap or free.
- It finishes on its own after seven minutes.
- Nothing can be built or bought after the end.

**Other**

- The approval and government panels appear the first time a choice changes them.
- Starving serving shows a warning.
- The project list puts the newest cards on top, as Paperclips does, with stage gates and next-model designs pinned first.
- Stage-3 leftovers that no longer matter expire at stage 4, so the new stage's goals aren't buried below the fold.
- The stage-2 unlocks are spread across the stage instead of landing in its first four minutes:
  - construction crews;
  - campus design;
  - stats;
  - the Washington office;
  - the gigawatt campus;
  - small reactors.
- Stage 3 gains a hand verb, "red-team the frontier model".
- The PR campaign unlocks mid-stage 3.

## Round 2

**Score (mean of the seven items):** Takeoff 6.4, Paperclips 8.4. In round-1 terms that is roughly 45/70 against 59/70, up from 38/70. Takeoff tied on idle time, greyed goals and soft-locks. It lost on first choice (8 vs 9), cognitive load (3 vs 8), reveal cadence (4 vs 6) and stage transitions (5 vs 9).

The critic's two fresh runs reached stage 2 at about 47–51 min, stage 3 at 85–89, stage 4 at 140–143 and the end screen at about 176–178 min.

**Single biggest gap:** stage 3 stalled for 50–56 minutes on Design Agent-4, including 29–30 minutes with nothing new. Three causes compounded:

1. Research income collapsed at the gate. The stage-2 copilot boost (24×) dropped to 1×, so research fell from about 3,600/s to 500–850/s.
2. Entering stage 3 pushed the allocation past 95%.
3. With the total over 95%, the ▲ arrow on experiments *lowered* it. That collapsed the research cap below the design's price for 15 minutes.

**Next five problems, as ranked by the critic:**

1. **The allocation bug at Agent-1's first training run.** Training plus experiments reached 130%, leaving zero serving.
2. **An 18-minute stall in stage 1 under a misleading research-cap hint.** Red text (the data wall, warning signs) was also on screen almost permanently.
3. **The opening firehose.** There were 10 panels and 48 numbers by 5:00, prices were only in tooltips, and the milestone card sat below the fold.
4. **Stage gates barely reshuffled.** 11 of 12 panels stayed in place, and the only signal was a strobing word card.
5. **Endings undercut themselves.**
   - The race path's final choice had a single "sign" button.
   - Projects stayed buyable during the extinction cutscene, and the task-milestone ticker kept firing.
   - The good ending's UI showed unrest at 90 and 19 warning signs.

### Fixes after round 2

**Allocation**

- Only buckets in use count toward the 95% cap. An idle training reservation serves customers and no longer blocks other arrows.
- ▲ can only raise a value.
- Scripted allocations claim room through one helper that never exceeds 95%. Training always gets at least 25%.
- A per-tick guard keeps the total legal.
- Regression script: `alloc_test.cjs`, 10 checks.

**Stage-3 research**

- The human copilot boost is frozen at its stage-2 value instead of dropping to 1×. Humans then fade under it while AI research takes over.
- Stage-3 research now opens at about 3,760/s against the stage-2 rate of 3,390/s.
- The stage-3 research cap is 1,000× the research rate, so it can't fall below the design's price.

**Research-cap hint**

- It names the lever that works for the stage.
- Stage 1: experiments ▲ or more GPUs, or "lower another allocation" when experiments are boxed in.
- Stage 3: put more compute on AI research.

**Stage transitions**

- Every gate moves panels between columns, and the new arrangement fades in. The word card fades instead of strobing.
- Stage 2 moves compute and infrastructure left and business right.
- In stage 3 Agent-3 runs procurement and construction itself, keeping 30% headroom without spending more than a quarter of the bank per build. The Infrastructure panel and the GPU buttons leave.
- Stage 4 puts robots top-left.

**Opening**

- The cheap stage-1 unlocks are spread out to about one new thing a minute:
  - compute 30 s after Agent-0 ships;
  - crawlers 75 s after;
  - marketing at 500 tasks;
  - researchers and investors at 1,000–1,200 tasks.

**Prices**

- Every repeatable purchase prints its price on the button. Tooltips keep only the effect.

**Calendar**

- In a stage's last half-month the days slow to a third, and can run up to six weeks past the stage's end. They no longer stop dead.

**Endings**

- The Deal (race path) gains "demand an audit first", costing 15 government trust. Depending on legibility and misalignment, it leads to:
  - nationalisation, with the backdoor caught;
  - the consensus ending, with the audit finding nothing it could read;
  - dominion, with nothing there to find.
- In non-good endings, projects are hidden and frozen, and the milestone ticker goes quiet.
- The good ending also dismantles Alignment and Society, and resets unrest and warning signs. Its epilogue runs about three times faster.

**Noise**

- Fewer "scraped a wiki" and manual-task lines; "red team: nothing found" is rare.
- Random dialogs are spaced 230–400 s apart.
- "The data wall" is red only while data blocks training.
- "Warning signs" is red for a minute after the count rises.
