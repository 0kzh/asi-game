# Adding content

Content is data plus small pure functions in `src/content/**`. State stores only ids, counters and flags (`src/core/types.ts`). Everything is registered in `src/content/index.ts`. Never touch `document` from `src/core/**` or `src/content/**`. Rebuild with `npm run build`, check with `npm run sim` and `npm test`, and commit `dist/` too.

## A project
Append to the stage's array in `src/content/projects/stageN.ts`; the array is already registered. Reveal on `trigger`, never on affordability. Costs are paid by the engine before `effect` runs. Write lowercase flavor in `desc` and a factual log line in `done`.
```ts
{ id: 'batching', stage: 1, title: 'request batching', cost: { research: 40 },
  trigger: (s) => s.res.agents >= 4, effect: (s) => { s.mods.speedMult *= 1.25; },
  done: 'request batching. agents are 25% faster.', desc: 'many questions, one forward pass.' },
```
Useful fields: `req: { gpus: 20 }` (a threshold, not consumed), `costFn` (repeatables), `uses: Infinity` with `retrigger`, `anytime` (purchasable before the column opens), `training: 'agent2'` (opens the budget modal), `snapshot` (instant version for dev snapshots), `extraAfford`. A purchase that invalidates a sibling calls `removeProject(s, 'other_id')` inside `effect`. A release project must be named `release_<generationKey>` so the model panel's [release] button routes through it (see `release_agent1`).

## An event
Ambient (one line or a small modal) goes in `src/content/events/ambient.ts`; scripted set pieces go in `setpieces.ts` under the `S2+` markers. A set piece is armed by `arm(s)` and fires `delay(s)` sim-seconds later. It survives reload through `state.queue`.
```ts
// setpieces.ts — SETPIECES
{ id: 'journalist', stage: 1, arm: (s) => s.res.tasks >= 10000, delay: (s) => between(s, 5, 20), choice: 'journalist' },
// setpieces.ts — SETPIECE_CHOICES
{ id: 'journalist', title: 'a journalist calls', stage: 1, scenes: { start: {
  text: 'she wants to know what you are building.',
  choices: [
    { text: 'a research project', log: 'the story runs on page nine. nobody reads page nine.' },
    { text: 'the future', effect: (s) => { s.mods.demandMult *= 1.2; s.flags.govAttention = true; },
      log: 'the story runs. demand is up. so is attention.' } ] } } },
```
A choice can have `cost`, `available(s)` and `next: 'scene'` or a weighted `next: { 0.7: 'ok', 1: 'bad' }`. Use `rand/chance/pick/between` from `core/rng.ts`, never `Math.random`. Log text is lowercase, under 100 characters; `log()` adds the full stop. Fire any event from the dev overlay or with `game.dev.fire('id')`.

## A panel
Add `src/ui/panels/<name>.ts` exporting `mount(root)` and `update(s)`, then list it in `src/ui/render.ts` (`mount…` and `PANELS`). `update` runs at up to 10 fps. Re-assert everything from state each time with `show(el, flag)`, `setText`, `syncAction(btn, s, label)`, and render nothing until a sticky flag is set. Every control is a `<button>`. Game actions are core actions (`src/core/actions.ts`) made with `actionButton(id, label)`.
```ts
export function update(s: State): void {
  show(panel, !!s.flags.allocPanel);
  if (panel.hidden) return;
  setText(body, `deployment ${pct(s.alloc.deploy)} · research ${pct(s.alloc.research)}`);
}
```
Already mounted and waiting for their flags: `allocation` (`allocPanel`), `chart` (`chart`), `politics` (`politics`), `stats` (`stats`), `ending` (`s.ending`).

## A snapshot
Snapshots live in `src/dev/snapshots.ts`. A snapshot applies a list of projects (`applyProject` uses `snapshot ?? effect`), sets resources, marks earlier set pieces as fired, then calls `enterStage`. Snapshot 3 currently is:
```ts
function snapshot3(seed: number): State {
  const s = snapshot2(seed);
  s.flags.theftResolved = true;
  enterStage(s, 3);
  return s;
}
```
To fill it in, add an `S2_ORDER` of stage-2 projects, apply them, then set stage-3 resources the way `snapshot2` does. Stage `enter()` stubs live in `src/content/stages.ts`. The generation table (`src/content/models.ts`) already holds agent-2…5, safer-1…4 and consensus-1.
