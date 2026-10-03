// Headless greedy player: `node dist/sim/bot.js [minutes=25] [seed=1] [--from <snapshot>]`.
// Prints a minute-by-minute table, milestone stamps, idle streaks and carrot violations.
// `--from 3local` (or any snapshot id) starts from a dev snapshot and reports that stage.
import { registerContent } from '../content/index.js';
import { newState } from '../core/state.js';
import { Engine, TICK } from '../core/engine.js';
import { act, affordableActions, isIdle } from '../core/actions.js';
import { canAfford, visibleProjects } from '../core/projects.js';
import { agentSlots } from '../core/economy.js';
import { fmtDate, fmtElapsed, fmtMoney, fmt } from '../core/format.js';
import { Policy } from './policy.js';
import { buildSnapshot } from '../dev/snapshots.js';
import { buildStage3Local } from '../dev/snapshots/stage3.local.js';
import { runStage3Report } from './stage3.js';
/** Snapshot ids the sim can start from: the dev snapshots plus local ones. */
export function snapshotState(id, seed) {
    if (id === '3local')
        return buildStage3Local(seed);
    return buildSnapshot(id, seed);
}
const STAMP_ORDER = [
    ['firstAgent', 'first agent'],
    ['firstGpu', 'first gpu'],
    ['firstHeadcount', 'first headcount'],
    ['firstResearcher', 'first researcher'],
    ['finetuneDone', 'finetune done'],
    ['agent1Trained', 'agent-1 trained'],
    ['agent1Released', 'agent-1 released'],
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
export function runSim(minutes, seed, print = true) {
    registerContent();
    const engine = new Engine(newState(seed));
    const policy = new Policy((id) => act(engine.state, id));
    const out = (line) => { if (print)
        console.log(line); };
    out(`takeoff sim · ${minutes} min · seed ${seed}`);
    out(`${pad('min', 3)} ${pad('st', 2)} ${pad('date', 14)} ${pad('tasks', 8)} ${pad('t/s', 6)} ${pad('funds', 11)} ${pad('price', 5)} ${pad('$/s', 6)} ${pad('agents', 6)} ${pad('gpus', 4)} ${pad('research', 11)} ${pad('vis', 3)} ${pad('aff', 3)} ${pad('idle', 4)}  log`);
    let idleStreak = 0, maxIdleStreak = 0, maxIdleStreakAt = 0;
    let strictStreak = 0, maxStrictStreak = 0;
    const carrotViolations = [];
    let atRelease = '';
    let idleThisMinute = 0;
    let logMark = 0; // number of log lines already printed (log is newest-first; count total)
    let totalLogged = 0;
    let prevTop = '';
    const total = minutes * 60;
    for (let sec = 0; sec < total; sec++) {
        const s = engine.state;
        // Idle is measured before the player acts: was there anything to do?
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
        // Carrot: from the first researcher onward (stage 1), some visible project is unaffordable.
        if (st.stage === 1 && st.res.researchers > 0) {
            const vis = visibleProjects(st);
            if (!vis.some((p) => !canAfford(st, p)))
                carrotViolations.push(sec + 1);
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
        if ((sec + 1) % 60 === 0) {
            const minute = (sec + 1) / 60;
            const vis = visibleProjects(st);
            const aff = vis.filter((p) => canAfford(st, p)).length;
            const lines = st.log.slice(0, totalLogged - logMark).reverse().map((l) => l.text.replace(/\n/g, ' | '));
            logMark = totalLogged;
            out(`${pad(minute, 3)} ${pad(st.stage, 2)} ${pad(fmtDate(st.dateDays), 14)} ${pad(fmt(st.res.tasks), 8)} ${pad(fmt(st.rates.tasksPerSec), 6)} ${pad(fmtMoney(st.res.funds), 11)} ${pad(st.market.price.toFixed(2), 5)} ${pad(fmt(st.rates.revenuePerSec), 6)} ${pad(`${st.res.agents}/${agentSlots(st)}`, 6)} ${pad(st.res.gpus, 4)} ${pad(`${Math.floor(st.res.research)}/${st.caps.researchCap}`, 11)} ${pad(vis.length, 3)} ${pad(aff, 3)} ${pad(idleThisMinute, 4)}  ${lines[0] ?? ''}`);
            for (const l of lines.slice(1))
                out(`${' '.repeat(93)}${l}`);
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
    if (atRelease)
        out(`  state at release   ${atRelease}`);
    out(`  max idle streak    ${maxIdleStreak} s (ending at ${fmtElapsed(maxIdleStreakAt)})`);
    out(`  max strict idle    ${maxStrictStreak} s (ignoring buy energy)`);
    out(`  carrot violations  ${carrotViolations.length}${carrotViolations.length ? ' at ' + carrotViolations.slice(0, 20).map(fmtElapsed).join(', ') : ''}`);
    const rel = s.milestones.stamps.agent1Released;
    const ok = rel !== undefined && rel >= 14 * 60 && rel <= 20 * 60 && maxIdleStreak <= 60 && carrotViolations.length === 0;
    out(`  stage 1 acceptance ${ok ? 'PASS' : 'FAIL'} (agent-1 released in 14–20 min, idle streak ≤ 60 s, no carrot violations)`);
    return { stamps: s.milestones.stamps, maxIdleStreak, maxIdleStreakAt, maxStrictStreak, carrotViolations, state: s };
}
const isMain = typeof process !== 'undefined' && Array.isArray(process.argv) && /bot\.js$/.test(process.argv[1] ?? '');
if (isMain) {
    const argv = process.argv.slice(2);
    const fi = argv.indexOf('--from');
    const from = fi >= 0 ? argv[fi + 1] : undefined;
    if (fi >= 0)
        argv.splice(fi, 2);
    const minutes = Number(argv[0] ?? 25) || 25;
    const seed = Number(argv[1] ?? 1) || 1;
    if (from) {
        registerContent();
        const r = runStage3Report(snapshotState(from, seed), minutes, seed, from);
        if (!r.ok)
            process.exitCode = 1;
    }
    else {
        const r = runSim(minutes, seed);
        const rel = r.stamps.agent1Released;
        const ok = rel !== undefined && rel >= 840 && rel <= 1200 && r.maxIdleStreak <= 60 && r.carrotViolations.length === 0;
        if (!ok)
            process.exitCode = 1;
    }
}
//# sourceMappingURL=bot.js.map