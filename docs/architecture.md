# Takeoff — architecture

Vanilla TypeScript compiled by `tsc` to ES2020 modules in `dist/`; no bundler, no framework, no runtime dependencies. `index.html` loads `dist/main.js` as a module. Served statically (`npm run dev` → `http-server` or `python3 -m http.server`); GitHub Pages works as-is.

## Principles
1. **Logic is DOM-free.** `src/core/**` never imports from `src/ui/**` or touches `document`. The same code runs under Node for the tuning bot (`npm run sim`) and under Playwright for the critic.
2. **Immediate-mode UI.** `render(state)` runs every animation frame (throttled to 10 fps for text) and re-asserts visibility and `disabled` for everything from state, Paperclips-style (`buttonUpdate`). No one-shot reveal events that can be missed on reload (A Dark Room lesson 50).
3. **State is one serialisable object.** Projects/events are *content* (functions in modules) looked up by id; state only stores ids, counters and flags. Save = `JSON.stringify(state)`.
4. **Content is data plus small pure functions.** Projects: `{ id, title, desc, cost, trigger(s), effect(s), uses?, tag }`. Events: `{ id, title, text, choices[] }`. Stages: `{ id, dates, enter(s), progress(s) }`. Adding a stage's content touches only `src/content/**` plus one registration line.
5. **One clock.** A fixed 100 ms logic step, accumulated from `performance.now()` deltas, multiplied by `speed` (dev). Background tabs catch up (capped at 60 s of catch-up per wake; no offline progress beyond that, like ADR).
6. **Seeded randomness.** `mulberry32` in state so sims are reproducible; the UI never calls `Math.random`.

## Layout
```
index.html                 skeleton: header, #log, #col2, #col3, #modal, #footer; loads dist/main.js
style.css                  the whole look (see design.md §9.2)
package.json               scripts: build (tsc), watch, dev (serve), sim (node dist/sim/bot.js), test (playwright smoke), critic
tsconfig.json              target ES2020, module ES2020, strict, rootDir src, outDir dist, sourceMap
src/main.ts                boot(): load or new state → Engine → mountUI → mountDev if ?dev or backtick → window.game
src/core/types.ts          all interfaces (State, Resources, Model, TrainingRun, Project, ChoiceEvent, Stage, LogLine, Snapshot)
src/core/state.ts          newState(seed), SAVE_KEY, save/load/migrate, export/import (base64)
src/core/engine.ts         class Engine { state; speed; tick(dtSeconds); slowTick(); start(); stop(); on(event, fn) }
src/core/economy.ts        capacity(), demand(), applyEconomyTick(s, dt), energy market, idle research, research cap/insight
src/core/milestones.ts     Fibonacci task milestones → headcount & funding rounds; elapsed-time stamps
src/core/projects.ts       registry; checkProjects(s) each slow tick (reveal on trigger); canAfford(); buy(); removeProject()
src/core/models.ts         generation table lookup; startTraining(); trainingTick(); finishTraining(); release() → scorecard
src/core/events.ts         log(s, text); scheduler for ambient events; openChoice(); choose(); set-piece arming helpers
src/core/stages.ts         STAGES; checkStageTransition(s); dateFor(s)
src/core/rival.ts          rivalTick(): DeepCent curve, theft resolution, market share
src/core/politics.ts       gov/opinion/security drift; jobs displaced; nationalization and riot checks
src/core/endings.ts        checkEndings(s); buildRunStats(s)
src/core/format.ts         fmt(n), fmtInt, fmtMoney, fmtRate, fmtEnergy, fmtDate, fmtElapsed, namedNumber
src/core/rng.ts            mulberry32, pick(), chance()
src/content/projects/stage1.ts … stage5.ts   export const PROJECTS: Project[]
src/content/events/ambient.ts, setpieces.ts, lines.ts, reviews.ts   text + ChoiceEvent[]
src/content/models.ts      GENERATIONS table (design.md §4.5)
src/content/stages.ts      stage definitions (dates, enter effects, exit conditions)
src/content/names.ts       labs, people, places
src/ui/dom.ts              h(tag, attrs, children), text diffing (`setText(el, s)` only writes on change), show/hide, fadeIn
src/ui/render.ts           render(state): calls each panel's update(state)
src/ui/panels/header.ts    Tasks Completed, date, elapsed, hint line
src/ui/panels/log.ts       prepend lines, cap 60, gradient
src/ui/panels/stores.ts    ADR stores box with tooltips
src/ui/panels/operations.ts complete task, price, marketing, demand
src/ui/panels/compute.ts   agents, gpus, energy, allocation
src/ui/panels/lab.ts       headcount, researchers/engineers, research/insight
src/ui/panels/model.ts     current model, training bar, release button, reviews
src/ui/panels/chart.ts     capability chart (canvas)
src/ui/panels/projects.ts  project buttons (insertion order; disabled = greyed)
src/ui/panels/politics.ts  gov, opinion, security, jobs
src/ui/panels/stats.ts     copies × speed, R&D ×, rival, power
src/ui/panels/modal.ts     choice events
src/ui/panels/ending.ts    end-of-run screen
src/ui/footer.ts           save/export/import/start over/lights off/dev
src/dev/overlay.ts         dev menu + window.game.dev API
src/dev/snapshots.ts       stage-start snapshots (apply projects' effects in order, then set resources)
src/sim/bot.ts             headless greedy player; prints minute-by-minute table: stage, tasks, tasks/s, funds, idle seconds, affordable actions, visible-but-unaffordable projects
tests/smoke.spec.mjs       Playwright: loads page, clicks, jumps to each stage snapshot, asserts no console errors and that a greyed project is visible
docs/                      reference-analysis.md, design.md, architecture.md, critic/round-N.md
```

## State (abridged; full interface in types.ts)
```ts
interface State {
  v: number; seed: number; rng: number;          // save version, seed, rng cursor
  t: number;                                      // game seconds elapsed (sim time)
  realStart: number;                              // epoch ms at first boot
  stage: 1|2|3|4|5; branch: 'none'|'slowdown'|'race';
  dateDays: number;                               // days since 2025-07-01, monotonic
  res: { tasks; funds; energy; agents; gpus; researchers; engineers; headcount; research; insight; data; robots };
  caps: { gpus; researchCap; powerGw };
  model: { gen; name; capability; alignment; interp; released; releasedAt; score };
  prevModels: ModelSummary[];
  training: null | { gen; phase: 'pre'|'post'|'evals'|'done'; progress; duration; budget; findings; safetyFirst };
  alloc: { deploy; research; safety };            // sum 1
  market: { price; marketing; productMult; productMultDecay; rivalShare; lastRevenue; waitlist };
  energyMkt: { price; base; purchases; autoBuy; generation };
  pol: { gov; opinion; security; jobsDisplaced; ubi; riots; dpa; oversightSeat };
  rival: { capability; name; stoleAt?: number; released: number };
  projects: Record<string, { seen: boolean; bought: number; removed?: boolean }>;
  flags: Record<string, boolean>;                 // reveal gates & story flags
  log: LogLine[];                                 // newest first, max 60
  modal: null | { eventId; sceneId };
  queue: { eventId; at: number }[];               // armed set pieces (sim time)
  stats: RunStats;                                // for the end screen and the critic
  milestones: { taskIdx; stamps: Record<string, number> };
  ending?: EndingId;
}
```

## Loop
```
Engine.start(): requestAnimationFrame loop →
  acc += (now - last) * speed; while (acc >= 100 ms) { tick(0.1); acc -= 100 }   (cap acc at 60 s)
  every 10 ticks: slowTick()  → checkProjects, scheduler, stage/ending checks, rival, politics, autosave every 30 s
  render(state) at most every 100 ms
Node (sim): the same Engine with a manual stepping method step(seconds).
```

## Project lifecycle (Paperclips)
- `checkProjects`: for each unseen project with `trigger(s)` true → mark `seen`, append to the visible list (insertion order), log nothing (the button is the announcement). `uses` (default 1) decrements on *buy*; a repeatable with uses left is re-shown.
- Render: visible ∧ not removed → button; `disabled = !canAfford(s)`.
- `buy`: pay cost, run `effect(s)`, log the project's `done` line if any, `bought++`, remove unless uses left. Effects that invalidate other projects call `removeProject(s, id)` explicitly (Paperclips lesson 43).

## Date
`dateDays = max(prev, lerp(stage.startDay, stage.endDay, stage.progress(s)))`, and `dateDays += dt / 15` floor so it always moves. `progress` is the min over the stage's exit conditions of their normalised (log-space where appropriate) progress.

## Dev / critic API (window.game)
```ts
window.game = {
  state, engine,
  dev: {
    jumpToStage(id: '1'|'2'|'3'|'4a'|'4b'|'5a'|'5b'), setSpeed(x), give(resource, n), set(path, value),
    fire(eventId), finishTraining(), listProjects() → {id, visible, affordable, cost}[],
    affordableActions() → string[], idle() → boolean, snapshot() → json, load(json), reset()
  }
}
```
`idle()` is true when there is no enabled action button, no running training bar, and no open modal — the critic's "seconds with nothing to do".

## Build
`npm run build` = `tsc -p tsconfig.json`. `npm run dev` = build + `http-server -c-1 -p 8080`. No install needed beyond `typescript` and `http-server` (dev deps). `dist/` is committed so the page works from GitHub Pages without a build step.
