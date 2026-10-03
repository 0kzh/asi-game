// Stage 3's local reference start ('3local'), kept for comparison only: `node dist/sim/bot.js
// 85 <seed> --from 3local`. It is the state stage 3 was first tuned against (tuning-log.md,
// stage 3), set directly: agent-2 released at capability 2.8, the theft resolved, February
// 2027, minute 60. The dev overlay, `--from 3` and the smoke test use the official snapshot
// '3' (snapshots/stage3.ts), which is the sim's state at the theft.
import type { State } from '../../core/types.js';
import { applyProject, checkProjects } from '../../core/projects.js';
import { updateReveals } from '../../core/economy.js';
import { enterStage } from '../../core/stages.js';
import { milestoneAt } from '../../core/milestones.js';
import { REG } from '../../core/registry.js';
import { buildSnapshot } from '../snapshots.js';

/** Stage-2 projects a typical run has bought by the theft (design §6.2), in order. */
export const S2_ORDER = [
  'alloc', 'ai_rd', 'chart', 'eval_suite', 'distill', 'gov_briefing', 'build_dc', 'honesty', 'consumer_app',
  'speculative', 'sl2', 'synthetic', 'spec', 'chip_deal', 'enterprise', 'comms', 'build_dc2', 'sl3',
  'train_agent2', 'release_agent2', 'cont_learning',
];

/** Apply a project if it is registered; otherwise just record it as bought. */
function applyOrMark(s: State, id: string): void {
  if (REG.projectById[id]) {
    try { applyProject(s, id); return; } catch (e) { console.warn(`3local: ${id}: ${(e as Error).message}`); }
  }
  s.projects[id] = { seen: true, bought: 1, usesLeft: 0 };
}

export function buildStage3Local(seed = 1): State {
  const s = buildSnapshot('2', seed);
  // Stage-1 projects a long run also has by now (snapshot 2 stops at agent-1).
  for (const id of ['lease_dc', 'ppa']) applyOrMark(s, id);
  for (const id of S2_ORDER) applyOrMark(s, id);
  s.t = 60 * 60;
  s.dateDays = Math.max(s.dateDays, 580);
  Object.assign(s.res, {
    tasks: 6e7, funds: 3e7, energy: 2e5, agents: 0, gpus: 5000, researchers: 10, engineers: 8,
    headcount: 18, research: 6000, insight: 150, data: 12, robots: 0,
  });
  Object.assign(s.caps, { gpus: 50000, researchBonus: 4000, gpuCurveStart: 4999 });
  Object.assign(s.mods, {
    // stage 1 (batching, scaffolding; prompt caching; usage tiers, coding assistant, agent-1, the journalist)
    // × stage 2 (speculative decoding; distillation; build_dc; consumer app, enterprise, agent-2; chip deal)
    speedMult: 1.25 * 1.5 * 1.3,
    efficiencyMult: 1.6,
    energyEffMult: 0.8 * 0.9,
    demandMult: 1.4 * 1.6 * 3 * 1.2 * 2 * 1.5 * 3,
    refPriceMult: 1.2 * 1.3,
    gpuPriceMult: 0.8 * 0.7,
    energyPriceMult: 0.7,
    energyDriftMult: 0.3,
  });
  s.model = {
    key: 'agent2', gen: 2, name: 'agent-2', capability: 2.8, alignment: 56, interp: 1,
    released: true, releasedAt: s.t - 300, score: 26,
  };
  s.prevModels = [
    { key: 'agent0', name: 'agent-0', capability: 1.2, score: null, releasedAt: 0 },
    { key: 'finetune', name: 'agent-0 (tuned)', capability: 1.5, score: 20, releasedAt: 505 },
    { key: 'agent1', name: 'agent-1', capability: 2.0, score: 24, releasedAt: 1080 },
  ];
  s.training = null;
  s.alloc = { deploy: 0.7, research: 0.3, safety: 0 };
  Object.assign(s.market, { price: 3, marketing: 3, productMult: 1.6, rivalShare: 0.05, lifetimeRevenue: 2.5e8 });
  Object.assign(s.energyMkt, { autoBuy: true, autoBlock: 50000, purchases: 400, base: 140, spend: 4e6 });
  Object.assign(s.pol, { gov: 10, opinion: 45, security: 3, jobsDisplaced: 0, ubi: false, riots: false, dpa: false, oversightSeat: false });
  s.rival.capability = 2.6;
  s.rival.stoleAt = s.t - 30;
  Object.assign(s.flags, {
    allocPanel: true, chart: true, politics: true, opinionVisible: true, alignmentVisible: true, evalSuite: true,
    aiRd: true, data: true, insight: true, theftResolved: true, agent2Internal: false,
    'trained:agent2': true, 'released:agent2': true,
  });
  while (milestoneAt(s.milestones.taskIdx) <= s.res.tasks) s.milestones.taskIdx++;
  Object.assign(s.milestones.stamps, { agent2Trained: 3100, agent2Released: 3300 });
  s.chart.push([360, 2.2, 1.9], [480, 2.5, 2.1], [575, 2.8, 2.6]);
  s.chartMarks.push([500, 'agent-2'], [575, 'the theft']);
  // Earlier set pieces have already happened.
  for (const sp of REG.setpieces) if (sp.stage < 3) { s.flags[`armed:${sp.id}`] = true; s.flags[`fired:${sp.id}`] = true; }
  s.queue = [];
  s.modal = null;
  updateReveals(s);
  checkProjects(s);
  enterStage(s, 3);
  s.res.agents = Math.floor(s.res.gpus * 2 * s.mods.efficiencyMult * (1 + 0.02 * s.res.engineers));
  s.ambientAt = s.t + 60;
  checkProjects(s);
  return s;
}
