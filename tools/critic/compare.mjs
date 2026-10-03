#!/usr/bin/env node
// Side-by-side rubric table (numbers only) for two or more harness results.
//   node tools/critic/compare.mjs results/a.json results/b.json [...] [--out compare.md]
// Metrics are recomputed from the samples with the current metrics.mjs, so old
// result files stay comparable after a metrics change.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { computeMetrics } from './metrics.mjs';

const args = process.argv.slice(2);
let outFile = null;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') outFile = args[++i];
  else files.push(args[i]);
}
if (files.length < 2) { console.error('usage: node tools/critic/compare.mjs a.json b.json [...] [--out file.md]'); process.exit(2); }

const runs = files.map((f) => {
  const r = JSON.parse(readFileSync(f, 'utf8'));
  return { file: f, meta: r.meta, errors: r.errors || [], m: computeMetrics(r.samples, r.meta), samples: r.samples };
});

const t = (s) => (s === null || s === undefined ? 'never' : `${s}s`);
const series = (a) => (a || []).map((x) => (x === null || x === undefined ? '-' : x)).join(' ');
const pct = (a, b) => (b ? `${Math.round((a / b) * 1000) / 10}%` : '-');

const header = runs.map((r) => `${r.meta.game} s${r.meta.stage} (${r.meta.minutes}m ×${r.meta.effectiveSpeed ?? 1})`);
const rows = [];
const add = (crit, measure, fn) => rows.push([crit, measure, ...runs.map((r) => { try { return String(fn(r)); } catch { return '-'; } })]);

add('1. Time to first meaningful choice', 'first second with ≥2 enabled non-production actions', (r) => t(r.m.timeToFirstChoice));
add('', '…those actions', (r) => (r.m.timeToFirstChoiceActions || []).slice(0, 3).join(', ') || '-');
add('', 'first second with ≥2 enabled purchases', (r) => t(r.m.timeToFirstPurchaseChoice));
add('', 'first purchase available', (r) => t(r.m.timeToFirstPurchase));
add('2. Seconds with nothing to do', 'idle s (no enabled control, no modal, no bar): total / longest', (r) => `${r.m.idleSeconds.total} / ${r.m.idleSeconds.longestStreak}`);
add('', 'idle s ignoring the production button: total / longest / % of run', (r) => `${r.m.idleSecondsExclProduction.total} / ${r.m.idleSecondsExclProduction.longestStreak} / ${pct(r.m.idleSecondsExclProduction.total, r.m.durationSeconds)}`);
add('', '…per minute', (r) => series(r.m.idleSecondsExclProduction.perMinute));
add('', 'seconds with nothing affordable to buy (no modal, no bar): total / longest / % of run', (r) => `${r.m.idleSecondsNoPurchase.total} / ${r.m.idleSecondsNoPurchase.longestStreak} / ${pct(r.m.idleSecondsNoPurchase.total, r.m.durationSeconds)}`);
add('', '…per minute', (r) => series(r.m.idleSecondsNoPurchase.perMinute));
add('', "game's own idle() seconds (Takeoff only): total / longest", (r) => (r.m.idleSecondsGameApi ? `${r.m.idleSecondsGameApi.total} / ${r.m.idleSecondsGameApi.longestStreak}` : 'n/a'));
add('', 'seconds with a progress bar running / modal open', (r) => `${r.m.progressSeconds} / ${r.m.modalSeconds}`);
add('3. Cognitive load & progressive disclosure', 'controls on screen: start / end / max', (r) => `${r.m.distinctControlsVisible.atStart} / ${r.m.distinctControlsVisible.atEnd} / ${r.m.distinctControlsVisible.max}`);
add('', 'controls on screen, mean per minute', (r) => series(r.m.distinctControlsVisible.perMinuteMean));
add('', 'panels: start → end (count)', (r) => `${r.m.panelsAtStart.length} → ${r.m.panelsAtEnd.length}`);
add('4. Cadence of reveals', 'reveals per minute (new panels + new goals)', (r) => series(r.m.revealsPerMinute));
add('', 'total / mean per min / minutes with none / longest gap', (r) => `${r.m.revealsTotal} / ${r.m.revealsMeanPerMinute} / ${r.m.minutesWithoutReveal} / ${r.m.longestRevealGapSeconds}s`);
add('5. Greyed-out goal always on screen', '% of seconds with ≥1 visible disabled goal / longest gap', (r) => `${r.m.goalAlwaysVisible.percent}% / ${r.m.goalAlwaysVisible.longestGapSeconds}s`);
add('6. Clarity of stage transitions', 'transitions (≥3 panels changed at once)', (r) => r.m.stageTransitions.length);
add('', 'when (+added / −removed)', (r) => r.m.stageTransitions.map((x) => `${x.t}s +${x.added.length}/−${x.removed.length}`).join('; ') || '-');
add('7. Soft-locks found', 'idle ≥180 s with funds flat: count (longest s)', (r) => `${r.m.softlocks.length} (${Math.max(0, ...r.m.softlocks.map((x) => x.seconds))})`);
add('', 'same, ignoring the production button', (r) => `${r.m.softlocksExclProduction.length} (${Math.max(0, ...r.m.softlocksExclProduction.map((x) => x.seconds))})`);
add('context', 'real seconds sampled / game speed', (r) => `${r.m.durationSeconds} / ×${r.meta.effectiveSpeed ?? 1}`);
add('', 'game seconds covered', (r) => {
  const g = r.samples.filter((s) => typeof s.gameT === 'number');
  return g.length ? `${Math.round(g[g.length - 1].gameT - g[0].gameT)}` : `${r.m.durationSeconds * (r.meta.effectiveSpeed ?? 1)} (est.)`;
});
add('', 'headline at end', (r) => r.m.headlineEnd);
add('', 'bot actions / page errors', (r) => `${r.m.botActions} / ${r.errors.filter((e) => e.type !== 'harness').length}`);
add('', 'file', (r) => path.basename(r.file));

const esc = (s) => String(s).replace(/\|/g, '\\|');
let md = `| criterion | measure | ${header.map(esc).join(' | ')} |\n|---|---|${header.map(() => '---').join('|')}|\n`;
for (const row of rows) md += `| ${row.map(esc).join(' | ')} |\n`;
md += `\nAll times are real seconds from the start of the run (after the stage jump). With game speed ×S, multiply by S for game seconds.\n`;
console.log(md);
if (outFile) { writeFileSync(outFile, md); console.error(`wrote ${outFile}`); }
