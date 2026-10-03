#!/usr/bin/env node
// Critic metrics: pure functions over the per-second samples recorded by
// harness.mjs. Run standalone to (re)compute a results file:
//   node tools/critic/metrics.mjs results/x.json            # print markdown
//   node tools/critic/metrics.mjs results/x.json --json     # print metrics JSON
//   node tools/critic/metrics.mjs results/x.json --write    # rewrite x.json metrics + x.md
//
// Sample shape (see adapters/*.mjs):
//   { t, enabledButtons[], disabledGoals[], panels[], modalOpen, progressRunning,
//     headline, logTail[],
//     // extras the adapters also fill:
//     production[]      subset of enabledButtons that are the primary production verb
//     enabledGoals[]    subset of enabledButtons that are purchases (build/upgrade/project)
//     disabledControls[] every visible disabled control (superset of disabledGoals)
//     extraControls[]   other visible inputs (selects, sliders, location tabs)
//     funds             main spendable currency (number) for soft-lock detection
//     acted[]           what the bot did after this observation }

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SOFTLOCK_SECONDS = 180;
export const TRANSITION_MIN_ITEMS = 3;

// Strip costs / counters so "deploy agent ($9.10)" and "deploy agent ($9.80)"
// are the same control. Keeps digits that are part of a name ("agent-1", "+10").
export function normLabel(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\$\s?[\d.,]+\s*[kmbt]?\b/g, ' ')
    .replace(/\s+#\d+$/, '')
    .replace(/[.:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const uniqNorm = (arr) => [...new Set((arr || []).map(normLabel).filter(Boolean))];

function nonProduction(s) {
  const prod = new Set(uniqNorm(s.production));
  return uniqNorm(s.enabledButtons).filter((l) => !prod.has(l));
}

function streaks(samples, pred, dt) {
  const out = [];
  let cur = null;
  samples.forEach((s, i) => {
    if (pred(s)) {
      if (!cur) cur = { start: s.t, startIdx: i, fundsStart: s.funds ?? null };
      cur.end = s.t; cur.endIdx = i; cur.fundsEnd = s.funds ?? null;
    } else if (cur) { out.push(cur); cur = null; }
  });
  if (cur) out.push(cur);
  for (const st of out) st.seconds = (st.endIdx - st.startIdx + 1) * dt;
  return out;
}

function perMinute(samples, dt, fn, reducer = 'mean') {
  const buckets = [];
  for (const s of samples) {
    const m = Math.floor(s.t / 60);
    (buckets[m] ||= []).push(fn(s));
  }
  const out = [];
  for (let m = 0; m < buckets.length; m++) {
    const b = buckets[m] || [];
    if (!b.length) { out.push(null); continue; }
    if (reducer === 'max') out.push(Math.max(...b));
    else if (reducer === 'sum') out.push(b.reduce((a, c) => a + c, 0));
    else out.push(Math.round((b.reduce((a, c) => a + c, 0) / b.length) * 10) / 10);
  }
  return out;
}

const round1 = (x) => (x === null || x === undefined || Number.isNaN(x) ? null : Math.round(x * 10) / 10);

export function computeMetrics(samples, meta = {}) {
  samples = (samples || []).filter(Boolean);
  if (!samples.length) return { error: 'no samples' };
  const dt = meta.sampleSeconds || (samples.length > 1 ? (samples[samples.length - 1].t - samples[0].t) / (samples.length - 1) || 1 : 1);
  const duration = samples.length * dt;
  const minutes = Math.ceil(duration / 60);

  // 1. time to first meaningful choice
  const firstChoice = samples.find((s) => nonProduction(s).length >= 2);
  const firstPurchaseChoice = samples.find((s) => uniqNorm(s.enabledGoals).length >= 2);
  const firstPurchase = samples.find((s) => uniqNorm(s.enabledGoals).length >= 1);

  // 2. idle
  const strictIdle = (s) => (s.enabledButtons || []).length === 0 && !s.modalOpen && !s.progressRunning;
  const looseIdle = (s) => nonProduction(s).length === 0 && !s.modalOpen && !s.progressRunning;
  // nothing affordable to buy (no enabled build/upgrade/project), no modal, no bar:
  // the "waiting" seconds; matches Takeoff's dev.idle() / affordableActions() semantics
  const buyIdle = (s) => uniqNorm(s.enabledGoals).length === 0 && !s.modalOpen && !s.progressRunning;
  const strictStreaks = streaks(samples, strictIdle, dt);
  const looseStreaks = streaks(samples, looseIdle, dt);
  const buyStreaks = streaks(samples, buyIdle, dt);
  const apiSamples = samples.filter((s) => s.api && typeof s.api.idle === 'boolean');
  const apiStreaks = apiSamples.length ? streaks(samples, (s) => !!(s.api && s.api.idle), dt) : null;
  const sumSec = (st) => st.reduce((a, c) => a + c.seconds, 0);
  const longest = (st) => st.reduce((a, c) => Math.max(a, c.seconds), 0);
  const idleSeriesStrict = perMinute(samples, dt, (s) => (strictIdle(s) ? dt : 0), 'sum');
  const idleSeriesLoose = perMinute(samples, dt, (s) => (looseIdle(s) ? dt : 0), 'sum');

  // 3. reveals: new panel ids or new control/goal labels never seen before in
  // the run (enabled or disabled; modal choices excluded as transient)
  const itemsOf = (s) => [
    ...(s.panels || []).map((p) => 'panel:' + p),
    ...uniqNorm([...(s.disabledGoals || []), ...(s.enabledGoals || []), ...(s.enabledButtons || []), ...(s.disabledControls || [])])
      .filter((g) => !g.startsWith('event:')).map((g) => 'goal:' + g),
  ];
  const seen = new Set(itemsOf(samples[0]));
  const initialItems = [...seen];
  const revealEvents = [];
  for (let i = 1; i < samples.length; i++) {
    for (const it of itemsOf(samples[i])) {
      if (!seen.has(it)) { seen.add(it); revealEvents.push({ t: samples[i].t, item: it }); }
    }
  }
  const revealsPerMinute = Array.from({ length: minutes }, () => 0);
  for (const r of revealEvents) revealsPerMinute[Math.min(minutes - 1, Math.floor(r.t / 60))]++;
  const revealTimes = [...new Set(revealEvents.map((r) => r.t))];
  let longestRevealGap = 0;
  {
    let prev = samples[0].t;
    for (const t of revealTimes) { longestRevealGap = Math.max(longestRevealGap, t - prev); prev = t; }
    longestRevealGap = Math.max(longestRevealGap, samples[samples.length - 1].t + dt - prev);
  }

  // 4. greyed-out goal always visible
  const goalVisible = (s) => (s.disabledGoals || []).length > 0;
  const noGoalStreaks = streaks(samples, (s) => !goalVisible(s), dt);
  const goalFraction = samples.filter(goalVisible).length / samples.length;

  // 5. cognitive load
  const controlsOf = (s) => new Set([...(s.enabledButtons || []), ...(s.disabledControls || s.disabledGoals || []), ...(s.extraControls || [])]).size;
  const controlsSeries = perMinute(samples, dt, controlsOf, 'mean');
  const controlsMaxSeries = perMinute(samples, dt, controlsOf, 'max');
  const panelsSeries = perMinute(samples, dt, (s) => (s.panels || []).length, 'max');

  // 6. stage transitions
  const stageTransitions = [];
  for (let i = 1; i < samples.length; i++) {
    const a = new Set(samples[i - 1].panels || []);
    const b = new Set(samples[i].panels || []);
    const added = [...b].filter((x) => !a.has(x));
    const removed = [...a].filter((x) => !b.has(x));
    if (added.length + removed.length >= TRANSITION_MIN_ITEMS) {
      stageTransitions.push({ t: samples[i].t, added, removed, before: [...a], after: [...b], headline: samples[i].headline, log: samples[i].logTail });
    }
  }

  // 7. soft-locks: idle streak >= 180 s with funds not increasing
  const isLock = (st) => st.seconds >= SOFTLOCK_SECONDS && (st.fundsStart === null || st.fundsEnd === null || st.fundsEnd <= st.fundsStart);
  const softlocks = strictStreaks.filter(isLock).map(({ start, end, seconds, fundsStart, fundsEnd }) => ({ start, end, seconds, fundsStart, fundsEnd }));
  const softlocksExclProduction = looseStreaks.filter(isLock).map(({ start, end, seconds, fundsStart, fundsEnd }) => ({ start, end, seconds, fundsStart, fundsEnd }));

  const first = samples[0];
  const last = samples[samples.length - 1];
  return {
    durationSeconds: duration,
    sampleSeconds: dt,
    samples: samples.length,
    timeToFirstChoice: firstChoice ? firstChoice.t : null,
    timeToFirstChoiceActions: firstChoice ? nonProduction(firstChoice) : [],
    timeToFirstPurchaseChoice: firstPurchaseChoice ? firstPurchaseChoice.t : null,
    timeToFirstPurchase: firstPurchase ? firstPurchase.t : null,
    idleSeconds: { total: sumSec(strictStreaks), longestStreak: longest(strictStreaks), perMinute: idleSeriesStrict },
    idleSecondsExclProduction: { total: sumSec(looseStreaks), longestStreak: longest(looseStreaks), perMinute: idleSeriesLoose },
    idleSecondsNoPurchase: { total: sumSec(buyStreaks), longestStreak: longest(buyStreaks), perMinute: perMinute(samples, dt, (s) => (buyIdle(s) ? dt : 0), 'sum') },
    idleSecondsGameApi: apiStreaks ? { total: sumSec(apiStreaks), longestStreak: longest(apiStreaks) } : null,
    modalSeconds: samples.filter((s) => s.modalOpen).length * dt,
    progressSeconds: samples.filter((s) => s.progressRunning).length * dt,
    revealsPerMinute,
    revealsTotal: revealEvents.length,
    revealsMeanPerMinute: round1(revealEvents.length / (duration / 60)),
    minutesWithoutReveal: revealsPerMinute.filter((x) => x === 0).length,
    longestRevealGapSeconds: longestRevealGap,
    initialItems,
    revealEvents,
    goalAlwaysVisible: { fraction: round1(goalFraction * 100) / 100, percent: round1(goalFraction * 100), longestGapSeconds: longest(noGoalStreaks) },
    distinctControlsVisible: { perMinuteMean: controlsSeries, perMinuteMax: controlsMaxSeries, atStart: controlsOf(first), atEnd: controlsOf(last), max: Math.max(...samples.map(controlsOf)) },
    panelsPerMinute: panelsSeries,
    panelsAtStart: first.panels || [],
    panelsAtEnd: last.panels || [],
    stageTransitions,
    softlocks,
    softlocksExclProduction,
    headlineStart: first.headline,
    headlineEnd: last.headline,
    fundsStart: first.funds ?? null,
    fundsEnd: last.funds ?? null,
    botActions: samples.reduce((a, s) => a + (s.acted ? s.acted.length : 0), 0),
  };
}

// Results file layout: meta/metrics/errors pretty-printed, one sample per line.
export function serializeResult(result) {
  const { samples = [], ...rest } = result;
  const head = JSON.stringify(rest, null, 1);
  return head.slice(0, -2) + ',\n "samples": [\n' + samples.map((x) => JSON.stringify(x)).join(',\n') + '\n ]\n}\n';
}

const fmtSeries = (arr) => (arr || []).map((x) => (x === null || x === undefined ? '-' : x)).join(' ');
const fmtT = (s) => (s === null || s === undefined ? 'never' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')} (${s}s)`);

export function toMarkdown(metrics, meta = {}) {
  const m = metrics;
  if (!m || m.error) return `### ${meta.game || '?'} · stage ${meta.stage ?? '?'}\n\nno metrics: ${m ? m.error : 'missing'}${meta.endReason ? ` (run ended: ${meta.endReason})` : ''}\n`;
  const title = `${meta.game || '?'} · stage ${meta.stage ?? '?'}${meta.stageLabel ? ` (${meta.stageLabel})` : ''} · ${meta.minutes ?? '?'} min · speed ${meta.effectiveSpeed ?? meta.speed ?? 1}`;
  const rows = [
    ['time to first meaningful choice (≥2 enabled non-production actions)', fmtT(m.timeToFirstChoice) + (m.timeToFirstChoiceActions?.length ? ` — ${m.timeToFirstChoiceActions.slice(0, 4).join(', ')}` : '')],
    ['time to first purchase choice (≥2 enabled purchases)', fmtT(m.timeToFirstPurchaseChoice)],
    ['time to first purchase available', fmtT(m.timeToFirstPurchase)],
    ['idle seconds (nothing enabled, no modal, no bar): total / longest', `${m.idleSeconds.total} / ${m.idleSeconds.longestStreak}`],
    ['idle seconds excl. production button: total / longest', `${m.idleSecondsExclProduction.total} / ${m.idleSecondsExclProduction.longestStreak}`],
    ['idle excl. production per minute', fmtSeries(m.idleSecondsExclProduction.perMinute)],
    ['seconds with nothing affordable to buy (no modal, no bar): total / longest', `${m.idleSecondsNoPurchase.total} / ${m.idleSecondsNoPurchase.longestStreak}`],
    ['…per minute', fmtSeries(m.idleSecondsNoPurchase.perMinute)],
    ...(m.idleSecondsGameApi ? [["game's own idle() seconds: total / longest", `${m.idleSecondsGameApi.total} / ${m.idleSecondsGameApi.longestStreak}`]] : []),
    ['modal seconds / progress-bar seconds', `${m.modalSeconds} / ${m.progressSeconds}`],
    ['reveals per minute', fmtSeries(m.revealsPerMinute)],
    ['reveals total / mean per min / minutes with none / longest gap', `${m.revealsTotal} / ${m.revealsMeanPerMinute} / ${m.minutesWithoutReveal} / ${m.longestRevealGapSeconds}s`],
    ['greyed goal visible (% of seconds) / longest gap', `${m.goalAlwaysVisible.percent}% / ${m.goalAlwaysVisible.longestGapSeconds}s`],
    ['controls on screen, mean per minute', fmtSeries(m.distinctControlsVisible.perMinuteMean)],
    ['controls on screen: start / end / max', `${m.distinctControlsVisible.atStart} / ${m.distinctControlsVisible.atEnd} / ${m.distinctControlsVisible.max}`],
    ['panels per minute (max)', fmtSeries(m.panelsPerMinute)],
    ['stage transitions (≥3 panels changed)', m.stageTransitions.length ? m.stageTransitions.map((x) => `${fmtT(x.t)} +${x.added.length}/-${x.removed.length}`).join('; ') : 'none'],
    ['soft-locks (idle ≥180 s, funds flat)', m.softlocks.length ? m.softlocks.map((x) => `${fmtT(x.start)} for ${x.seconds}s`).join('; ') : 'none'],
    ['soft-locks excl. production button', m.softlocksExclProduction.length ? m.softlocksExclProduction.map((x) => `${fmtT(x.start)} for ${x.seconds}s`).join('; ') : 'none'],
    ['headline start → end', `${m.headlineStart} → ${m.headlineEnd}`],
    ['funds start → end', `${m.fundsStart} → ${m.fundsEnd}`],
    ['bot actions', String(m.botActions)],
  ];
  let md = `### ${title}\n\n| metric | value |\n|---|---|\n`;
  for (const [k, v] of rows) md += `| ${k} | ${String(v).replace(/\|/g, '\\|')} |\n`;
  if (m.stageTransitions.length) {
    md += `\n**Stage transitions**\n\n`;
    for (const x of m.stageTransitions) md += `- ${fmtT(x.t)}: added [${x.added.join(', ')}] removed [${x.removed.join(', ')}]\n`;
  }
  md += `\n**Panels at end:** ${m.panelsAtEnd.join(', ') || '(none)'}\n`;
  if (m.revealEvents.length) {
    md += `\n**Reveal timeline** (first 40)\n\n`;
    for (const r of m.revealEvents.slice(0, 40)) md += `- ${fmtT(r.t)} ${r.item}\n`;
  }
  return md;
}

// CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) { console.error('usage: node metrics.mjs results/x.json [--json|--write]'); process.exit(2); }
  const res = JSON.parse(readFileSync(file, 'utf8'));
  const metrics = computeMetrics(res.samples, res.meta);
  if (args.includes('--json')) console.log(JSON.stringify(metrics, null, 2));
  else if (args.includes('--write')) {
    res.metrics = metrics;
    writeFileSync(file, serializeResult(res));
    writeFileSync(file.replace(/\.json$/, '') + '.md', toMarkdown(metrics, res.meta));
    console.log(`wrote ${file} and ${file.replace(/\.json$/, '')}.md`);
  } else console.log(toMarkdown(metrics, res.meta));
}
