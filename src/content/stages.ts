// The five stages (design.md §5). The player never sees a stage number; the date and
// the UI are the clock. Each enter() runs once when the stage is entered; the leaving
// stage's exitLine is logged first (core/stages.enterStage).
import type { Stage, State } from '../core/types.js';
import { dayOf } from '../core/stages.js';
import { shippedLine } from '../core/models.js';

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
      s.flags.allocPanel = true; // placeholder until the `alloc` project (stage 2 content)
    },
    progress: (s) => capProgress(s, 2.0, 2.8),
  },
  {
    id: 3, name: 'takeoff',
    startDay: dayOf(2027, 2), endDay: dayOf(2027, 11),
    flash: 'takeoff',
    exitLine: () => 'the committee votes 6–4.',
    exit: (s) => (s.flags.voteResolved ? 4 : null),
    enter: (s) => { s.flags.stage3 = true; },
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
