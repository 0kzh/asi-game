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
