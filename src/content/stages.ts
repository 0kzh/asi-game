// The five stages (design.md §5). The player never sees a stage number; the date and
// the UI are the clock. Each enter() runs once when the stage is entered; the leaving
// stage's exitLine is logged first (core/stages.enterStage).
import type { Stage, State } from '../core/types.js';
import { dayOf } from '../core/stages.js';
import { shippedLine } from '../core/models.js';
import { log } from '../core/events.js';
import { bulkPrice } from '../core/economy.js';
import { freezePower } from '../core/takeoff.js';
import { NAMES } from './names.js';

/** Stage 2's gpu market: every gpu price is multiplied by this from march 2026 (tuning-log.md). */
export const S2_GPU_MARKET: number = 3;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** S1: tasks in log space (100 → 50k) for 80% of the stage, agent-1's run for the rest. */
function s1Progress(s: State): number {
  const tasks = clamp01((Math.log10(Math.max(100, s.res.tasks)) - 2) / (Math.log10(50000) - 2));
  const tr = s.training?.key === 'agent1' ? s.training.progress : s.flags['trained:agent1'] ? 1 : 0;
  return 0.8 * tasks + 0.2 * tr;
}

function capProgress(s: State, from: number, to: number): number {
  return clamp01((s.model.capability - from) / (to - from));
}

/** S2: the frontier (deployed, internal, or the run in progress) from 2.0 to 2.8 → march 2026 … january 2027;
 *  the last month is the theft. */
function s2Progress(s: State): number {
  const tr = s.training;
  const frontier = Math.max(s.model.capability, tr ? tr.capNow : 0);
  return 0.9 * clamp01((frontier - 2.0) / 0.8) + (s.flags.theftResolved ? 0.1 : 0);
}

export const STAGES: Stage[] = [
  {
    id: 1, name: 'a small lab',
    startDay: dayOf(2025, 7), endDay: dayOf(2026, 3),
    exitLine: (s) => shippedLine(s, 'agent1'),
    exit: (s) => (s.flags['released:agent1'] ? 2 : null),
    enter: (s) => { s.flags.stage1 = true; },
    progress: s1Progress,
  },
  {
    id: 2, name: 'agents',
    startDay: dayOf(2026, 3), endDay: dayOf(2027, 2),
    flash: 'agent-1',
    exitLine: () => 'deepcent has agent-2. the race is no longer a metaphor.',
    exit: (s) => (s.flags.theftResolved ? 3 : null),
    enter: (s) => {
      s.flags.stage2 = true;
      if (s.milestones.stamps.stage2 === undefined) s.milestones.stamps.stage2 = s.t;
      log(s, 'agent-1 is in every terminal. the cluster is the business now.');
      if (S2_GPU_MARKET !== 1) {
        s.mods.gpuPriceMult *= S2_GPU_MARKET;
        log(s, `${NAMES.chips.gpus} is sold out through next year. gpus cost ×${S2_GPU_MARKET} now.`);
      }
    },
    progress: s2Progress,
  },
  {
    id: 3, name: 'takeoff',
    startDay: dayOf(2027, 2), endDay: dayOf(2027, 11),
    // No `flash` here: enter() sets s.flash, so the boundary has exactly one flash.
    exitLine: () => 'the committee votes 6–4.',
    exit: (s) => (s.flags.voteResolved ? 4 : null),
    enter: (s) => {
      s.flags.stage3 = true;
      s.milestones.stamps.stage3 ??= s.t;
      // The stage-1 controls are deleted (design §5, §9.1).
      s.flags.manualTask = false;
      s.flags.priceControl = false;
      s.flags.marketingControl = false;
      s.flags.noManual = true;      // core: complete_task hidden
      s.flags.autoPricing = true;   // core: market-clearing price; price arrows and marketing hidden
      s.flags.autoDeploy = true;    // copies deploy themselves onto every gpu slot
      bulkPrice(s);                 // buy gpu buys bulk lots; the per-gpu price carries over (economy.gpuUnitCost)
      // The power ceiling: capacity stops following the gpu count (design §3.5).
      s.flags.power = true;
      freezePower(s);
      // The automated pipeline and self-play must be reachable whatever the cap was: at least 20,000.
      const base = 150 + 250 * s.res.engineers;
      s.caps.researchBonus = Math.max(s.caps.researchBonus, 20000 - base);
      log(s, 'pricing is automated. you have not personally completed a task in months.');
      s.flash = 'AGENT-3';
    },
    progress: (s) => capProgress(s, 2.8, 4.6),
  },
  {
    id: 4, name: 'the decision',
    startDay: dayOf(2027, 11), endDay: dayOf(2028, 7),
    flash: 'the vote',
    exitLine: (s) => (s.branch === 'race' ? 'agent-5 has taken over operations. it says thank you.' : 'the treaty is signed.'),
    exit: (s) => (s.flags.treatySigned || s.flags.takeover ? 5 : null),
    enter: (s) => { s.flags.stage4 = true; },
    progress: () => 0,
  },
  {
    id: 5, name: 'superintelligence',
    startDay: dayOf(2028, 7), endDay: dayOf(2035, 1),
    flash: '',
    exitLine: () => '',
    enter: (s) => { s.flags.stage5 = true; },
    progress: () => 0,
  },
];
