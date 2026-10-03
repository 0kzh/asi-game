// Stage-3 report for `node dist/sim/bot.js <minutes> <seed> --from 3local`: runs the greedy
// policy from a snapshot until stage 4, an ending, or the time limit, and checks the
// stage-3 acceptance (the vote 45–60 min after the snapshot, idle streaks, the carrot,
// run lengths, riots, the memo chain).
import { Engine, TICK } from '../core/engine.js';
import { act, affordableActions, isIdle } from '../core/actions.js';
import { canAfford, visibleProjects } from '../core/projects.js';
import { powerCapacityGw, powerUsedGw } from '../core/economy.js';
import { fmt, fmtDate, fmtElapsed, fmtMoney } from '../core/format.js';
import { Policy } from './policy.js';
import type { State } from '../core/types.js';

function pad(x: string | number, n: number): string {
  const s = String(x);
  return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}

export interface Stage3Result {
  ok: boolean;
  voteAt: number | null;       // seconds after the snapshot
  ending: string | null;
  branch: string;
  maxIdle: number;
  maxStrict: number;
  carrot: number;
  runs: Record<string, number>;
  riots: { start: number; end: number | null; how: string }[];
  chain: Record<string, number>;
  events: [number, string][];
}

export function runStage3Report(start: State, minutes: number, seed: number, label: string, print = true): Stage3Result {
  const engine = new Engine(start);
  const policy = new Policy((id) => act(engine.state, id));
  const out = (line: string) => { if (print) console.log(line); };
  const t0 = start.t;
  const rel = (t: number) => fmtElapsed(Math.max(0, t - t0));

  out(`takeoff sim · from ${label} (${fmtElapsed(t0)}) · ${minutes} min · seed ${seed}`);
  out(`${pad('T+', 3)} ${pad('st', 2)} ${pad('date', 14)} ${pad('tasks', 7)} ${pad('t/s', 6)} ${pad('funds', 8)} ${pad('gpus', 6)} ${pad('power GW', 11)} ${pad('research', 8)} ${pad('ins', 5)} ${pad('cap', 4)} ${pad('rival', 5)} ${pad('gov', 4)} ${pad('pub', 3)} ${pad('jobs', 5)} ${pad('vis', 3)} ${pad('aff', 3)} ${pad('idle', 4)}  log`);

  let idle = 0, maxIdle = 0, maxIdleAt = 0, strict = 0, maxStrict = 0, maxStrictAt = 0, idleMin = 0;
  const carrot: number[] = [];
  const seenFlags = new Set(Object.keys(start.flags).filter((k) => start.flags[k]));
  const bought = new Set(Object.keys(start.projects).filter((k) => start.projects[k].bought > 0));
  const events: [number, string][] = [];
  const runStart: Record<string, number> = {};
  const runs: Record<string, number> = {};
  const riots: { start: number; end: number | null; how: string }[] = [];
  let prevTop = start.log[0] ? `${start.log[0].t}|${start.log[0].text}` : '';
  let pending: string[] = [];

  for (let sec = 0; sec < minutes * 60; sec++) {
    const s = engine.state;
    if (s.ending || s.stage >= 4) break;
    if (isIdle(s)) { idle++; idleMin++; } else idle = 0;
    if (idle > maxIdle) { maxIdle = idle; maxIdleAt = s.t; }
    const strictIdle = !s.modal && !(s.training && s.training.phase !== 'done') && affordableActions(s).filter((a) => a !== 'buy_energy').length === 0;
    strict = strictIdle ? strict + 1 : 0;
    if (strict > maxStrict) { maxStrict = strict; maxStrictAt = s.t; }
    if (s.stage === 3 && !visibleProjects(s).some((p) => !canAfford(s, p))) carrot.push(s.t);

    const riotsBefore = s.pol.riots;
    const ubiBefore = s.pol.ubi;
    const retrainBefore = (s.projects.retraining?.bought ?? 0) > 0;
    policy.second(s);
    for (let k = 0; k < 10; k++) {
      policy.tick(engine.state, k);
      engine.tick(TICK);
    }
    const st = engine.state;

    // Events: set pieces fired, projects bought, runs, riots.
    for (const k of Object.keys(st.flags)) {
      if (!st.flags[k] || seenFlags.has(k)) continue;
      seenFlags.add(k);
      if (k.startsWith('fired:')) events.push([st.t, k.slice(6)]);
    }
    for (const k of Object.keys(st.projects)) {
      if (st.projects[k].bought > 0 && !bought.has(k)) { bought.add(k); events.push([st.t, `+${k}`]); }
    }
    // Run length: the run's own duration (budget × table, plus mid-run beats) when it finishes.
    if (st.training && runStart[st.training.key] === undefined) runStart[st.training.key] = st.t;
    if (st.training?.phase === 'done' && runs[st.training.key] === undefined) runs[st.training.key] = st.training.duration;
    if (!riotsBefore && st.pol.riots) riots.push({ start: st.t, end: null, how: '' });
    if (riotsBefore && !st.pol.riots && riots.length) {
      const r = riots[riots.length - 1];
      r.end = st.t;
      r.how = !ubiBefore && st.pol.ubi ? 'ubi' : !retrainBefore && (st.projects.retraining?.bought ?? 0) > 0 ? 'retraining' : 'waited';
    }

    // New log lines.
    const fresh: string[] = [];
    for (const l of st.log) { if (`${l.t}|${l.text}` === prevTop) break; fresh.push(l.text.replace(/\n/g, ' | ')); }
    if (st.log[0]) prevTop = `${st.log[0].t}|${st.log[0].text}`;
    pending.push(...fresh.reverse());

    const done = !!st.ending || st.stage >= 4;
    if ((sec + 1) % 60 === 0 || done) {
      const vis = visibleProjects(st);
      const aff = vis.filter((p) => canAfford(st, p)).length;
      const power = `${powerUsedGw(st).toFixed(1)}/${powerCapacityGw(st).toFixed(1)}`;
      out(`${pad(Math.round((st.t - t0) / 60), 3)} ${pad(st.stage, 2)} ${pad(fmtDate(st.dateDays), 14)} ${pad(fmt(st.res.tasks), 7)} ${pad(fmt(st.rates.tasksPerSec), 6)} ${pad(fmtMoney(st.res.funds), 8)} ${pad(fmt(st.res.gpus), 6)} ${pad(power, 11)} ${pad(fmt(st.res.research), 8)} ${pad(fmt(st.res.insight), 5)} ${pad(st.model.capability.toFixed(1), 4)} ${pad(st.rival.capability.toFixed(2), 5)} ${pad(Math.round(st.pol.gov), 4)} ${pad(Math.round(st.pol.opinion), 3)} ${pad(st.pol.jobsDisplaced.toFixed(0), 5)} ${pad(vis.length, 3)} ${pad(aff, 3)} ${pad(idleMin, 4)}  ${pending[0] ?? ''}`);
      for (const l of pending.slice(1)) out(`${' '.repeat(112)}${l}`);
      pending = [];
      idleMin = 0;
    }
    if (done) break;
  }

  const s = engine.state;
  const stamps = s.milestones.stamps;
  const voteAt = stamps.vote !== undefined ? stamps.vote - t0 : null;
  const firedAt = (id: string) => events.find(([, e]) => e === id)?.[0];
  const chain: Record<string, number> = {};
  for (const id of ['sandbag', 'memo', 'leak', 'vote']) { const t = firedAt(id); if (t !== undefined) chain[id] = t; }

  out('');
  out('timeline (T+ after the snapshot)');
  for (const [t, e] of events) out(`  ${pad(rel(t), 6)}  ${e}`);
  out('');
  out('stage 3');
  out(`  vote               ${voteAt === null ? '—' : `T+${fmtElapsed(voteAt)}`}${s.ending ? ` · ending: ${s.ending}` : ''} · branch ${s.branch}`);
  out(`  runs               ${Object.entries(runs).map(([k, d]) => `${k} ${d.toFixed(0)} s`).join(', ') || '—'}`);
  out(`  riots              ${riots.map((r) => `${rel(r.start)}→${r.end === null ? 'open' : rel(r.end)} (${r.how || 'open'})`).join(', ') || 'none'}`);
  const order = ['sandbag', 'memo', 'leak', 'vote'];
  const gaps = order.slice(1).map((id, i) => (chain[id] !== undefined && chain[order[i]] !== undefined ? chain[id] - chain[order[i]] : NaN));
  out(`  memo chain         ${order.map((id) => `${id} ${chain[id] === undefined ? '—' : rel(chain[id])}`).join(' → ')} (gaps ${gaps.map((g) => (isNaN(g) ? '—' : `${g.toFixed(0)} s`)).join(', ')})`);
  out(`  max idle streak    ${maxIdle} s (ending at T+${rel(maxIdleAt)}) · strict (ignoring buy energy) ${maxStrict} s (ending at T+${rel(maxStrictAt)})`);
  out(`  carrot violations  ${carrot.length}${carrot.length ? ' at ' + carrot.slice(0, 10).map(rel).join(', ') : ''}`);
  out(`  final              gov ${Math.round(s.pol.gov)} · public ${Math.round(s.pol.opinion)} · alignment ${Math.round(s.model.alignment)} · capability ${s.model.capability.toFixed(2)} · rival ${s.rival.capability.toFixed(2)} · gpus ${fmt(s.res.gpus)} · power ${s.caps.powerGw.toFixed(1)} GW`);

  const inRange = (x: number | undefined, lo: number, hi: number) => x !== undefined && x >= lo && x <= hi;
  const okVote = voteAt !== null && voteAt >= 45 * 60 && voteAt <= 60 * 60;
  const okRuns = inRange(runs.agent3, 100, 120) && inRange(runs.agent4, 100, 120);
  const okRiots = riots.length > 0 && riots.every((r) => r.end !== null);
  const okChain = order.every((id) => chain[id] !== undefined) && gaps.every((g, i) => g >= 55 && g <= (i === 2 ? 95 : 125));
  const ok = okVote && maxIdle <= 90 && carrot.length === 0 && okRuns && okRiots && okChain;
  out(`  stage 3 acceptance ${ok ? 'PASS' : 'FAIL'} (vote ${okVote ? 'ok' : 'NO'}, idle ${maxIdle <= 90 ? 'ok' : 'NO'}, carrot ${carrot.length === 0 ? 'ok' : 'NO'}, runs ${okRuns ? 'ok' : 'NO'}, riots ${okRiots ? 'ok' : 'NO'}, chain ${okChain ? 'ok' : 'NO'})`);
  return { ok, voteAt, ending: s.ending ?? null, branch: s.branch, maxIdle, maxStrict, carrot: carrot.length, runs, riots, chain, events };
}
