# Takeoff

An incremental browser game about an AI lab racing to build superintelligence, and trying to align it before it kills everyone.

It's in the tradition of [Universal Paperclips](https://github.com/jgmize/paperclips) (primary reference) and [A Dark Room](https://github.com/doublespeakgames/adarkroom). The story is set from mid-2025 to the end of the world, or the treaty, and follows the shape of [AI 2027](https://ai-2027.com). All lab and model names are fictional: Prometheus, Titan, Gestalt, Nüwa, and the Agent and Safer model series.

The only number that matters is **Tasks Completed**.

## Play

Open `index.html` in a browser. No server and no build step are needed; the compiled JavaScript is committed. The game saves to `localStorage` every few seconds. The menu at the top right has save, export, import and restart.

A full run takes about 3–4 hours across five stages. Nobody tells you when it ends.

## Build

The game is raw HTML and CSS plus vanilla TypeScript compiled to a single plain-JS file (`js/takeoff.js`). There are no frameworks, game engines or runtime dependencies.

```sh
tsc -p .          # TypeScript 5+; compiles src/*.ts → js/takeoff.js
```

## Layout

| Path | What |
|---|---|
| `index.html`, `css/style.css` | page shell and styles (Paperclips columns, A Dark Room boxes, log and events) |
| `src/defs.ts` | model generations, compute tiers, benchmarks, stages, rivals, funding rounds |
| `src/state.ts` | the single state object; save, load, migrate, export |
| `src/econ.ts` | derived quantities: compute split, copies, demand, revenue, research, data, alignment |
| `src/actions.ts` | player verbs and cost helpers |
| `src/projects.ts` | about 100 projects (trigger → reveal, cost → enable, effect, flavour) |
| `src/events.ts`, `src/events_more.ts` | about 70 modal events with costed choices and probabilistic outcomes |
| `src/beats.ts` | scripted reveals, milestone messages, stage transitions |
| `src/crisis.ts` | Plague-Inc-style crises: grid hack, pandemic, rogue robots, replicators |
| `src/endings.ts` | five endings and the end-of-run stats screen |
| `src/ui.ts`, `src/chart.ts` | panels, reveal and reshuffle, the capability chart |
| `src/dev.ts` | dev overlay and test API |
| `docs/reference-analysis.md` | source-level teardown of Universal Paperclips and A Dark Room |
| `docs/design/` | stage plan and the research brief (AI 2027, Situational Awareness, Wait But Why, IABIED) |
| `tools/bot.mjs` | headless pacing bot (Playwright); also regenerates `js/snapshots.js` |
| `tools/shots.mjs`, `tools/smoke.mjs` | screenshot and smoke tests |

## Dev overlay

Press <kbd>`</kbd>, or open `index.html?dev`, to get:

- **speed** controls (1× to 100×, or pause);
- **jump** to the start of any stage, rewinding from snapshots in `js/snapshots.js`;
- **save and load** slots;
- **cheats**: funds, data, research, GPUs, finish training;
- **skip** ahead 60 s or 5 min;
- **live pacing metrics**: idle seconds, seconds with no greyed-out goal, first meaningful choice, reveal cadence.

You can also jump straight to a stage with `index.html?stage=3`, and open a fresh game with `?fresh`.

`window.TAKEOFF` exposes the same controls for automation: `state`, `metrics()`, `actions()`, `tick(n)`, `choose(i)`, `buyProject(id)`, `jumpToStage(n)`, `setSpeed(x)`, `snapshot()`, `load(json)`, `derived()`.

## Pacing bot

```sh
node tools/bot.mjs --path=slow --snapshots   # play the slowdown branch, write stage snapshots
node tools/bot.mjs --path=race               # play the race branch
node tools/bot.mjs --stage=3 --every=60      # start from a stage snapshot with per-minute logs
```
