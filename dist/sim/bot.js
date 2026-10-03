// Headless greedy player: `node dist/sim/bot.js [minutes=25] [seed=1] [--from <snapshot>]`.
// Prints a minute-by-minute table (the minute column is total game time), milestone stamps,
// idle streaks and carrot violations, and a PASS/FAIL line for every stage the run completes.
// `--from 2` starts from snapshot '2'. `--from 3` starts from snapshot '3' and prints the
// stage-3 report (src/sim/stage3.ts); `--from 3local` does the same from stage 3's local
// reference snapshot, for comparison only.
import { registerContent } from '../content/index.js';
import { newState } from '../core/state.js';
import { Engine, TICK } from '../core/engine.js';
import { act, affordableActions, isIdle } from '../core/actions.js';
import { canAfford, visibleProjects } from '../core/projects.js';
import { powerCapacityGw, powerUsedGw } from '../core/economy.js';
import { fmtDate, fmtElapsed, fmtMoney, fmt } from '../core/format.js';
import { PROJECTS as S2_PROJECTS } from '../content/projects/stage2.js';
import { Policy } from './policy.js';
import { buildSnapshot, SNAPSHOT_IDS } from '../dev/snapshots.js';
import { buildStage3Local } from '../dev/snapshots/stage3.local.js';
import { runStage3Report } from './stage3.js';
const REG_S2 = new Set(S2_PROJECTS.map((p) => p.id));
const STAMP_ORDER = [
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
    ['agent3Trained', 'agent-3 trained'],
    ['agent3Released', 'agent-3 released'],
    ['agent4Trained', 'agent-4 trained'],
    ['vote', 'the vote (stage 4)'],
];
function pad(x, n) {
    const s = String(x);
    return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}
/** Strict idle: idle, but buying energy you don't need doesn't count as something to do. */
function strictIdle(s) {
    if (s.modal)
        return false;
    if (s.training && s.training.phase !== 'done')
        return false;
    const acts = affordableActions(s).filter((a) => a !== 'buy_energy');
    return acts.length === 0;
}
/** Snapshot ids the sim can start from: the dev snapshots plus stage 3's local reference. */
export function snapshotState(id, seed) {
    if (id === '3local')
        return buildStage3Local(seed);
    return buildSnapshot(id, seed);
}
export function runSim(minutes, seed, print = true, from) {
    registerContent();
    const engine = new Engine(from ? buildSnapshot(from, seed) : newState(seed));
    const startStage = engine.state.stage;
    const startT = engine.state.t;
    let agent2Start, theftSl, atTheft = '';
    const policy = new Policy((id) => act(engine.state, id));
    const out = (line) => { if (print)
        console.log(line); };
    out(`takeoff sim · ${minutes} min · seed ${seed}${from ? ` · from snapshot ${from}` : ''}`);
    out(`${pad('min', 3)} ${pad('st', 2)} ${pad('date', 14)} ${pad('tasks', 8)} ${pad('t/s', 6)} ${pad('funds', 9)} ${pad('price', 6)} ${pad('$/s', 6)} ${pad('copies', 6)} ${pad('gpus', 6)} ${pad('research', 12)} ${pad('ins', 5)} ${pad('cap', 4)} ${pad('GW', 9)} ${pad('vis', 3)} ${pad('aff', 3)} ${pad('idle', 4)}  log`);
    const stages = {};
    const stat = (n) => (stages[n] ?? (stages[n] = { maxIdle: 0, maxStrict: 0, carrot: [] }));
    let idleStreak = 0, maxIdleStreak = 0, maxIdleStreakAt = 0, idleStage = startStage;
    let strictStreak = 0, maxStrictStreak = 0;
    const runs = {};
    let atRelease = '';
    let idleThisMinute = 0;
    let logMark = 0; // number of log lines already printed (log is newest-first; count total)
    let totalLogged = 0;
    let prevTop = '';
    const total = minutes * 60;
    for (let sec = 0; sec < total; sec++) {
        const s = engine.state;
        if (s.ending || s.stage >= 4)
            break;
        // Idle is measured before the player acts: was there anything to do? Streaks restart at a stage boundary.
        if (s.stage !== idleStage) {
            idleStage = s.stage;
            idleStreak = 0;
            strictStreak = 0;
        }
        if (isIdle(s)) {
            idleStreak++;
            idleThisMinute++;
        }
        else
            idleStreak = 0;
        if (idleStreak > maxIdleStreak) {
            maxIdleStreak = idleStreak;
            maxIdleStreakAt = sec;
        }
        if (strictIdle(s))
            strictStreak++;
        else
            strictStreak = 0;
        if (strictStreak > maxStrictStreak)
            maxStrictStreak = strictStreak;
        const ss = stat(s.stage);
        ss.maxIdle = Math.max(ss.maxIdle, idleStreak);
        ss.maxStrict = Math.max(ss.maxStrict, strictStreak);
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
        if (agent2Start === undefined && st.training?.key === 'agent2')
            agent2Start = st.t - st.training.progress * st.training.duration;
        // A run's length: its own duration (budget × table, plus mid-run beats) when it finishes.
        if (st.training?.phase === 'done' && runs[st.training.key] === undefined)
            runs[st.training.key] = Math.round(st.training.duration);
        if (theftSl === undefined && st.flags['fired:theft'])
            theftSl = st.pol.security;
        if (!atTheft && st.flags.theftResolved) {
            const r = st.res;
            atTheft = `t=${fmtElapsed(st.t)} tasks=${Math.round(r.tasks)} funds=${Math.round(r.funds)} energy=${Math.round(r.energy)} agents=${r.agents} gpus=${r.gpus} researchers=${r.researchers} engineers=${r.engineers} headcount=${r.headcount} research=${Math.round(r.research)}/${st.caps.researchCap} insight=${Math.round(r.insight)} data=${r.data} marketing=${st.market.marketing} price=${st.market.price} model=${st.model.key}@${st.model.capability} align=${Math.round(st.model.alignment)} gov=${Math.round(st.pol.gov)} opinion=${Math.round(st.pol.opinion)} sl=${st.pol.security} rival=${st.rival.capability.toFixed(2)} share=${st.market.rivalShare.toFixed(2)} alloc=${st.alloc.deploy}/${st.alloc.research}/${st.alloc.safety} mods=${JSON.stringify(st.mods)} caps=${JSON.stringify(st.caps)} day=${Math.round(st.dateDays)} bought=${Object.keys(st.projects).filter((k) => st.projects[k].bought && REG_S2.has(k)).join(',')}`;
        }
        // Carrot: some visible project is unaffordable, in stages 1–3 (stage 1 from the first researcher on).
        if (st.stage <= 3 && !st.ending && (st.stage > 1 || st.res.researchers > 0)) {
            const vis = visibleProjects(st);
            if (!vis.some((p) => !canAfford(st, p)))
                stat(st.stage).carrot.push(st.t);
        }
        // Count new log lines (the log is newest-first and capped at 60).
        if (st.log.length) {
            let fresh = 0;
            for (const l of st.log) {
                if (`${l.t}|${l.text}` === prevTop)
                    break;
                fresh++;
            }
            totalLogged += fresh;
            prevTop = `${st.log[0].t}|${st.log[0].text}`;
        }
        const done = !!st.ending || st.stage >= 4;
        if ((sec + 1) % 60 === 0 || done) {
            const vis = visibleProjects(st);
            const aff = vis.filter((p) => canAfford(st, p)).length;
            const lines = st.log.slice(0, Math.min(st.log.length, totalLogged - logMark)).reverse().map((l) => l.text.replace(/\n/g, ' | '));
            logMark = totalLogged;
            const gw = st.flags.power ? `${powerUsedGw(st).toFixed(1)}/${powerCapacityGw(st).toFixed(1)}` : '—';
            const research = st.flags.noResearchCap ? fmt(st.res.research) : `${fmt(st.res.research)}/${fmt(st.caps.researchCap)}`;
            out(`${pad(Math.floor(st.t / 60), 3)} ${pad(st.stage, 2)} ${pad(fmtDate(st.dateDays), 14)} ${pad(fmt(st.res.tasks), 8)} ${pad(fmt(st.rates.tasksPerSec), 6)} ${pad(fmtMoney(st.res.funds), 9)} ${pad(fmt(st.market.price), 6)} ${pad(fmt(st.rates.revenuePerSec), 6)} ${pad(fmt(st.res.agents), 6)} ${pad(fmt(st.res.gpus), 6)} ${pad(research, 12)} ${pad(fmt(st.res.insight), 5)} ${pad(st.model.capability.toFixed(2), 4)} ${pad(gw, 9)} ${pad(vis.length, 3)} ${pad(aff, 3)} ${pad(idleThisMinute, 4)}  ${lines[0] ?? ''}`);
            for (const l of lines.slice(1))
                out(`${' '.repeat(112)}${l}`);
            idleThisMinute = 0;
        }
        if (done)
            break;
    }
    const s = engine.state;
    const st2 = s.milestones.stamps;
    out('');
    out('milestones');
    for (const [k, label] of STAMP_ORDER) {
        const t = st2[k];
        out(`  ${label.padEnd(18)} ${t === undefined ? '—' : fmtElapsed(t)}`);
    }
    if (atRelease && !from)
        out(`  state at release   ${atRelease}`);
    if (atTheft)
        out(`  state at theft     ${atTheft}`);
    out(`  max idle streak    ${maxIdleStreak} s (ending at ${fmtElapsed(maxIdleStreakAt + startT)})`);
    out(`  max strict idle    ${maxStrictStreak} s (ignoring buy energy)`);
    for (const n of Object.keys(stages).map(Number)) {
        const x = stages[n];
        out(`  stage ${n}            idle ${x.maxIdle} s · strict ${x.maxStrict} s · carrot violations ${x.carrot.length}${x.carrot.length ? ' at ' + x.carrot.slice(0, 12).map(fmtElapsed).join(', ') : ''}`);
    }
    const verdicts = [];
    const verdict = (stage, ok, what) => {
        verdicts.push({ stage, ok, line: what });
        out(`  stage ${stage} acceptance ${ok ? 'PASS' : 'FAIL'} (${what})`);
    };
    const S = (n) => stages[n] ?? { maxIdle: 0, maxStrict: 0, carrot: [] };
    if (startStage <= 1) {
        const rel = st2.agent1Released;
        verdict(1, rel !== undefined && rel >= 14 * 60 && rel <= 20 * 60 && S(1).maxIdle <= 60 && S(1).carrot.length === 0, `agent-1 released in 14–20 min: ${rel === undefined ? '—' : fmtElapsed(rel)}; idle streak ≤ 60 s: ${S(1).maxIdle} s; carrot violations ${S(1).carrot.length}`);
    }
    const s2 = { maxIdleStreak: S(2).maxIdle, agent2Start, agent2Trained: st2.agent2Trained, theft: st2.theft, theftSl, stage3: st2.theftResolved };
    if (startStage <= 2 && (s.stage >= 3 || st2.theftResolved !== undefined || startStage === 2)) {
        const run = agent2Start !== undefined && s2.agent2Trained !== undefined ? Math.round(s2.agent2Trained - agent2Start) : undefined;
        const lag = s2.theft !== undefined && s2.agent2Trained !== undefined ? Math.round(s2.theft - s2.agent2Trained) : undefined;
        out(`  agent-2 run        ${agent2Start === undefined ? '—' : fmtElapsed(agent2Start)} → ${s2.agent2Trained === undefined ? '—' : fmtElapsed(s2.agent2Trained)} (${run ?? '—'} s)`);
        out(`  theft              ${s2.theft === undefined ? '—' : `${fmtElapsed(s2.theft)} (${lag ?? '—'} s after agent-2, sl${theftSl})`}`);
        verdict(2, stage2Ok(s2, S(2).carrot), `stage 3 at 50–65 min: ${s2.stage3 === undefined ? '—' : fmtElapsed(s2.stage3)}; s2 idle ≤ 90 s: ${S(2).maxIdle} s; carrot ${S(2).carrot.length}; agent-2 run 80–110 s: ${run ?? '—'}; theft 120–240 s after: ${lag ?? '—'}`);
    }
    if (startStage <= 2 && (st2.vote !== undefined || s.ending || s.t >= 125 * 60)) {
        const vote = st2.vote;
        const r34 = [runs.agent3, runs.agent4];
        const okRuns = r34.every((r) => r !== undefined && r >= 100 && r <= 120);
        verdict(3, vote !== undefined && vote >= 100 * 60 && vote <= 125 * 60 && S(3).maxIdle <= 90 && S(3).carrot.length === 0 && okRuns && !s.ending, `the vote at minute 100–125: ${vote === undefined ? '—' : fmtElapsed(vote)}${s.ending ? ` (ending: ${s.ending})` : ''}; s3 idle ≤ 90 s: ${S(3).maxIdle} s (strict ${S(3).maxStrict} s); carrot ${S(3).carrot.length}; agent-3/agent-4 runs 100–120 s: ${r34.map((r) => r ?? '—').join(', ')}`);
    }
    return { stamps: st2, maxIdleStreak, maxIdleStreakAt, maxStrictStreak, carrotViolations: Object.values(stages).flatMap((x) => x.carrot), state: s, stages, s2, verdicts };
}
/** Stage-2 acceptance: stage 3 at 50–65 min, s2 idle ≤ 90 s, no carrot violations, agent-2 in 80–110 s, theft 2–4 min after. */
export function stage2Ok(r, carrot) {
    const run = r.agent2Start !== undefined && r.agent2Trained !== undefined ? r.agent2Trained - r.agent2Start : -1;
    const lag = r.theft !== undefined && r.agent2Trained !== undefined ? r.theft - r.agent2Trained : -1;
    return r.stage3 !== undefined && r.stage3 >= 50 * 60 && r.stage3 <= 65 * 60 && r.maxIdleStreak <= 90 &&
        carrot.length === 0 && run >= 80 && run <= 110 && lag >= 120 && lag <= 240;
}
const isMain = typeof process !== 'undefined' && Array.isArray(process.argv) && /bot\.js$/.test(process.argv[1] ?? '');
if (isMain) {
    const args = process.argv.slice(2);
    const fi = args.indexOf('--from');
    const from = fi >= 0 ? args.splice(fi, 2)[1] : undefined;
    if (from !== undefined && from !== '3local' && !SNAPSHOT_IDS.includes(from))
        throw new Error(`unknown snapshot ${from}`);
    const minutes = Number(args[0] ?? 25) || 25;
    const seed = Number(args[1] ?? 1) || 1;
    if (from === '3' || from === '3local') {
        registerContent();
        const r = runStage3Report(snapshotState(from, seed), minutes, seed, from);
        if (!r.ok)
            process.exitCode = 1;
    }
    else {
        const r = runSim(minutes, seed, true, from);
        if (r.verdicts.some((v) => !v.ok))
            process.exitCode = 1;
    }
}
//# sourceMappingURL=bot.js.map