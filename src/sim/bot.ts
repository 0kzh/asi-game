// Headless greedy player: `node dist/sim/bot.js [minutes=25] [seed=1] [--from <snapshotId>]`.
// Prints a minute-by-minute table, milestone stamps, idle streaks and carrot violations.
// With --from, the run starts from buildSnapshot(id, seed) instead of newState (the minute
// column is then total game time).
import { registerContent } from '../content/index.js';
import { newState } from '../core/state.js';
import { Engine, TICK } from '../core/engine.js';
import { act, affordableActions, isIdle } from '../core/actions.js';
import { canAfford, visibleProjects } from '../core/projects.js';
import { agentSlots } from '../core/economy.js';
import { fmtDate, fmtElapsed, fmtMoney, fmt } from '../core/format.js';
import { PROJECTS as S2_PROJECTS } from '../content/projects/stage2.js';

const REG_S2 = new Set(S2_PROJECTS.map((p) => p.id));
import { Policy } from './policy.js';
import { buildSnapshot, SNAPSHOT_IDS } from '../dev/snapshots.js';
import type { SnapshotId, State } from '../core/types.js';

declare const process: { argv: string[]; exitCode?: number };

export interface SimResult {
  stamps: Record<string, number>;
  maxIdleStreak: number;
  maxIdleStreakAt: number;
  maxStrictStreak: number;
  carrotViolations: number[];
  state: State;
  /** Stage-2 measurements (runs from snapshot '2'). */
  s2?: { maxIdleStreak: number; agent2Start?: number; agent2Trained?: number; theft?: number; theftSl?: number; stage3?: number };
}

const STAMP_ORDER: [string, string][] = [
  ['firstAgent', 'first agent'],
  ['firstGpu', 'first gpu'],
  ['firstHeadcount', 'first headcount'],
  ['firstResearcher', 'first researcher'],
  ['finetuneDone', 'finetune done'],
  ['agent1Trained', 'agent-1 trained'],
  ['agent1Released', 'agent-1 released'],
  ['stage2', 'stage 2'],
  ['agent2Trained', 'agent-2 trained'],
  ['agent2Released', 'agent-2 released'],
  ['agent2Internal', 'agent-2 internal'],
  ['theft', 'theft'],
  ['theftResolved', 'stage 3'],
];

function pad(x: string | number, n: number): string {
  const s = String(x);
  return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}

/** Strict idle: idle, but buying energy you don't need doesn't count as something to do. */
function strictIdle(s: State): boolean {
  if (s.modal) return false;
  if (s.training && s.training.phase !== 'done') return false;
  const acts = affordableActions(s).filter((a) => a !== 'buy_energy');
  return acts.length === 0;
}

export function runSim(minutes: number, seed: number, print = true, from?: SnapshotId): SimResult {
  registerContent();
  const engine = new Engine(from ? buildSnapshot(from, seed) : newState(seed));
  const startStage = engine.state.stage;
  let s2Idle = 0, s2MaxIdle = 0, agent2Start: number | undefined, theftSl: number | undefined, atTheft = '';
  const policy = new Policy((id) => act(engine.state, id));
  const out = (line: string) => { if (print) console.log(line); };

  out(`takeoff sim · ${minutes} min · seed ${seed}${from ? ` · from snapshot ${from}` : ''}`);
  out(`${pad('min', 3)} ${pad('st', 2)} ${pad('date', 14)} ${pad('tasks', 8)} ${pad('t/s', 6)} ${pad('funds', 11)} ${pad('price', 5)} ${pad('$/s', 6)} ${pad('agents', 6)} ${pad('gpus', 4)} ${pad('research', 11)} ${pad('vis', 3)} ${pad('aff', 3)} ${pad('idle', 4)}  log`);

  let idleStreak = 0, maxIdleStreak = 0, maxIdleStreakAt = 0;
  let strictStreak = 0, maxStrictStreak = 0;
  const carrotViolations: number[] = [];
  let atRelease = '';
  let idleThisMinute = 0;
  let logMark = 0; // number of log lines already printed (log is newest-first; count total)
  let totalLogged = 0;
  let prevTop = '';

  const total = minutes * 60;
  for (let sec = 0; sec < total; sec++) {
    const s = engine.state;
    // Idle is measured before the player acts: was there anything to do?
    if (isIdle(s)) { idleStreak++; idleThisMinute++; } else idleStreak = 0;
    if (idleStreak > maxIdleStreak) { maxIdleStreak = idleStreak; maxIdleStreakAt = sec; }
    if (strictIdle(s)) strictStreak++; else strictStreak = 0;
    if (strictStreak > maxStrictStreak) maxStrictStreak = strictStreak;
    if (s.stage === 2) { s2Idle = isIdle(s) ? s2Idle + 1 : 0; s2MaxIdle = Math.max(s2MaxIdle, s2Idle); }

    policy.second(s);
    for (let k = 0; k < 10; k++) {
      policy.tick(engine.state, k);
      engine.tick(TICK);
    }

    const st = engine.state;
    if (!atRelease && st.flags['released:agent1']) {
      const r = st.res;
      atRelease = `t=${fmtElapsed(st.t)} tasks=${Math.round(r.tasks)} funds=${Math.round(r.funds)} energy=${Math.round(r.energy)} agents=${r.agents} gpus=${r.gpus} researchers=${r.researchers} engineers=${r.engineers} headcount=${r.headcount} research=${Math.round(r.research)} insight=${Math.round(r.insight)} data=${r.data} marketing=${st.market.marketing} price=${st.market.price} bought=${Object.keys(st.projects).filter((k) => st.projects[k].bought).join(',')}`;
    }
    if (agent2Start === undefined && st.training?.key === 'agent2') agent2Start = st.t - st.training.progress * st.training.duration;
    if (theftSl === undefined && st.flags['fired:theft']) theftSl = st.pol.security;
    if (!atTheft && st.flags.theftResolved) {
      const r = st.res;
      atTheft = `t=${fmtElapsed(st.t)} tasks=${Math.round(r.tasks)} funds=${Math.round(r.funds)} energy=${Math.round(r.energy)} agents=${r.agents} gpus=${r.gpus} researchers=${r.researchers} engineers=${r.engineers} headcount=${r.headcount} research=${Math.round(r.research)}/${st.caps.researchCap} insight=${Math.round(r.insight)} data=${r.data} marketing=${st.market.marketing} price=${st.market.price} model=${st.model.key}@${st.model.capability} align=${Math.round(st.model.alignment)} gov=${Math.round(st.pol.gov)} opinion=${Math.round(st.pol.opinion)} sl=${st.pol.security} rival=${st.rival.capability.toFixed(2)} share=${st.market.rivalShare.toFixed(2)} alloc=${st.alloc.deploy}/${st.alloc.research}/${st.alloc.safety} mods=${JSON.stringify(st.mods)} caps=${JSON.stringify(st.caps)} day=${Math.round(st.dateDays)} bought=${Object.keys(st.projects).filter((k) => st.projects[k].bought && REG_S2.has(k)).join(',')}`;
    }
    // Carrot: from the first researcher onward (stage 1; or the snapshot's stage with --from), some visible project is unaffordable.
    if (from ? st.stage === startStage : st.stage === 1 && st.res.researchers > 0) {
      const vis = visibleProjects(st);
      if (!vis.some((p) => !canAfford(st, p))) carrotViolations.push(sec + 1);
    }

    // Count new log lines (the log is newest-first and capped at 60).
    if (st.log.length) {
      let fresh = 0;
      for (const l of st.log) { if (`${l.t}|${l.text}` === prevTop) break; fresh++; }
      totalLogged += fresh;
      prevTop = `${st.log[0].t}|${st.log[0].text}`;
    }

    if ((sec + 1) % 60 === 0) {
      const minute = (sec + 1) / 60;
      const vis = visibleProjects(st);
      const aff = vis.filter((p) => canAfford(st, p)).length;
      const lines = st.log.slice(0, totalLogged - logMark).reverse().map((l) => l.text.replace(/\n/g, ' | '));
      logMark = totalLogged;
      out(`${pad(from ? Math.floor(st.t / 60) : minute, 3)} ${pad(st.stage, 2)} ${pad(fmtDate(st.dateDays), 14)} ${pad(fmt(st.res.tasks), 8)} ${pad(fmt(st.rates.tasksPerSec), 6)} ${pad(fmtMoney(st.res.funds), 11)} ${pad(st.market.price.toFixed(2), 5)} ${pad(fmt(st.rates.revenuePerSec), 6)} ${pad(`${st.res.agents}/${agentSlots(st)}`, 6)} ${pad(st.res.gpus, 4)} ${pad(`${Math.floor(st.res.research)}/${st.caps.researchCap}`, 11)} ${pad(vis.length, 3)} ${pad(aff, 3)} ${pad(idleThisMinute, 4)}  ${lines[0] ?? ''}`);
      for (const l of lines.slice(1)) out(`${' '.repeat(93)}${l}`);
      idleThisMinute = 0;
    }
  }

  const s = engine.state;
  out('');
  out('milestones');
  for (const [k, label] of STAMP_ORDER) {
    const t = s.milestones.stamps[k];
    out(`  ${label.padEnd(18)} ${t === undefined ? '—' : fmtElapsed(t)}`);
  }
  if (atRelease && !from) out(`  state at release   ${atRelease}`);
  if (atTheft) out(`  state at theft     ${atTheft}`);
  out(`  max idle streak    ${maxIdleStreak} s (ending at ${fmtElapsed(maxIdleStreakAt)})`);
  out(`  max strict idle    ${maxStrictStreak} s (ignoring buy energy)`);
  out(`  carrot violations  ${carrotViolations.length}${carrotViolations.length ? ' at ' + carrotViolations.slice(0, 20).map(fmtElapsed).join(', ') : ''}`);
  const rel = s.milestones.stamps.agent1Released;
  const ok = rel !== undefined && rel >= 14 * 60 && rel <= 20 * 60 && maxIdleStreak <= 60 && carrotViolations.length === 0;
  const st2 = s.milestones.stamps;
  const s2: SimResult['s2'] = { maxIdleStreak: s2MaxIdle, agent2Start, agent2Trained: st2.agent2Trained, theft: st2.theft, theftSl, stage3: st2.theftResolved };
  if (from === '2') {
    out(`  s2 max idle streak ${s2MaxIdle} s`);
    out(`  agent-2 run        ${agent2Start === undefined ? '—' : fmtElapsed(agent2Start)} → ${s2.agent2Trained === undefined ? '—' : fmtElapsed(s2.agent2Trained)} (${agent2Start !== undefined && s2.agent2Trained !== undefined ? Math.round(s2.agent2Trained - agent2Start) : '—'} s)`);
    out(`  theft              ${s2.theft === undefined ? '—' : `${fmtElapsed(s2.theft)} (${s2.agent2Trained !== undefined ? Math.round(s2.theft - s2.agent2Trained) : '—'} s after agent-2, sl${theftSl})`}`);
    out(`  stage 2 acceptance ${stage2Ok(s2, carrotViolations) ? 'PASS' : 'FAIL'} (stage 3 at 50–65 min, s2 idle ≤ 90 s, no carrot violations, agent-2 in 80–110 s, theft 2–4 min after)`);
  } else {
    out(`  stage 1 acceptance ${ok ? 'PASS' : 'FAIL'} (agent-1 released in 14–20 min, idle streak ≤ 60 s, no carrot violations)`);
  }
  return { stamps: s.milestones.stamps, maxIdleStreak, maxIdleStreakAt, maxStrictStreak, carrotViolations, state: s, s2 };
}

/** Stage-2 acceptance for runs from snapshot '2'. */
export function stage2Ok(r: NonNullable<SimResult['s2']>, carrot: number[]): boolean {
  const run = r.agent2Start !== undefined && r.agent2Trained !== undefined ? r.agent2Trained - r.agent2Start : -1;
  const lag = r.theft !== undefined && r.agent2Trained !== undefined ? r.theft - r.agent2Trained : -1;
  return r.stage3 !== undefined && r.stage3 >= 50 * 60 && r.stage3 <= 65 * 60 && r.maxIdleStreak <= 90 &&
    carrot.length === 0 && run >= 80 && run <= 110 && lag >= 120 && lag <= 240;
}

const isMain = typeof process !== 'undefined' && Array.isArray(process.argv) && /bot\.js$/.test(process.argv[1] ?? '');
if (isMain) {
  const args = process.argv.slice(2);
  const fi = args.indexOf('--from');
  const from = fi >= 0 ? (args.splice(fi, 2)[1] as SnapshotId) : undefined;
  if (from !== undefined && !SNAPSHOT_IDS.includes(from)) throw new Error(`unknown snapshot ${from}`);
  const minutes = Number(args[0] ?? 25) || 25;
  const seed = Number(args[1] ?? 1) || 1;
  const r = runSim(minutes, seed, true, from);
  const rel = r.stamps.agent1Released;
  const ok = from === '2' ? stage2Ok(r.s2!, r.carrotViolations)
    : from ? true
    : rel !== undefined && rel >= 840 && rel <= 1200 && r.maxIdleStreak <= 60 && r.carrotViolations.length === 0;
  if (!ok) process.exitCode = 1;
}
