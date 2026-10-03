// Snapshot '3': the moment the theft is resolved (stage 3 begins). Built like snapshot '2':
// apply the stage-1 order, enter stage 2, apply the stage-2 order, then set resources to the
// sim bot's state at the theft (`node dist/sim/bot.js 70 <seed> --from 2`, "state at theft").
// Odd seeds keep agent-2 internal, even seeds release it (the sim policy's choice). DOM-free.
import type { State } from '../../core/types.js';
import { newState } from '../../core/state.js';
import { applyProject, checkProjects } from '../../core/projects.js';
import { updateReveals } from '../../core/economy.js';
import { enterStage } from '../../core/stages.js';
import { milestoneAt } from '../../core/milestones.js';
import { log } from '../../core/events.js';
import { REG } from '../../core/registry.js';
import { jobsDisplaced } from '../../core/politics.js';
import { S1_ORDER } from '../snapshots.js';

/** Stage-2 projects bought by the theft, in the order a typical run buys them (lease_dc and ppa are
 *  stage-1 projects usually bought early in stage 2; agent1_update is bought four times). */
export const S2_ORDER = [
  'alloc', 'ppa', 'ai_rd', 'chart', 'agent1_update', 'eval_suite', 'lease_dc', 'agent1_update', 'gov_briefing',
  'agent1_update', 'distill', 'speculative', 'honesty', 'build_dc', 'consumer_app', 'sl2', 'comms', 'agent1_update',
  'synthetic', 'enterprise', 'retention', 'chip_deal', 'sl3', 'spec', 'train_agent2',
];

/** Apply a project if it is registered; skip unknown ids (content can move between stages). */
function apply(s: State, id: string): void {
  if (!REG.projectById[id]) { console.warn(`snapshot: unknown project ${id}, skipped`); return; }
  applyProject(s, id);
}

export function snapshot3(seed: number): State {
  const internal = seed % 2 === 1;
  const s = newState(seed);
  s.t = 18 * 60;
  for (const id of S1_ORDER) apply(s, id);
  s.flags.gpuRow = true;
  s.flags.govAttention = true;
  for (const sp of REG.setpieces) if (sp.stage < 2) { s.flags[`armed:${sp.id}`] = true; s.flags[`fired:${sp.id}`] = true; }
  s.milestones.stamps = {
    firstAgent: 4, firstGpu: 91, firstHeadcount: 276, firstResearcher: 277, finetuneDone: 504, finetuneReleased: 505,
    agent1Trained: 1079, agent1Released: 1080,
  };
  s.dateDays = 240;
  enterStage(s, 2);

  const trainedAt = internal ? 54 * 60 + 14 : 49 * 60 + 32;
  s.t = internal ? 57 * 60 + 42 : 52 * 60 + 28;
  for (const id of S2_ORDER) apply(s, id);
  apply(s, internal ? 'keep_internal' : 'release_agent2');
  apply(s, 'pipelines');
  apply(s, 'cont_learning');

  // The sim's state at the theft (seed 1: internal, seed 2: released; tuning-log.md).
  Object.assign(s.res, internal
    ? { tasks: 27001166, funds: 1191781, energy: 72914, agents: 6531, gpus: 1646, researchers: 5, engineers: 12, headcount: 17, research: 6316, insight: 78, data: 42, robots: 0 }
    : { tasks: 21057776, funds: 23285318, energy: 53225, agents: 6848, gpus: 1726, researchers: 7, engineers: 12, headcount: 19, research: 1199, insight: 163, data: 42, robots: 0 });
  s.mods = {
    speedMult: 2.4375, efficiencyMult: 1.6, energyEffMult: 0.72, demandMult: internal ? 20.16 : 60.48, refPriceMult: 1.56,
    gpuPriceMult: 336, energyPriceMult: 0.7, energyDriftMult: 0.3, rdMult: internal ? 2 : 1, capBonus: 0, findingsMult: 0.8,
  };
  Object.assign(s.caps, { gpus: 5000, researchCap: 9150, researchBonus: 6000, gpuCurveStart: 405 }); // power: enterStage(3) freezes it
  s.alloc = { deploy: 0.7, research: 0.3, safety: 0 };
  Object.assign(s.market, {
    price: internal ? 7.24 : 15.57, marketing: 12, productMult: internal ? 1 : 1.6, rivalShare: 0.11, lifetimeRevenue: internal ? 1.6e8 : 9e7,
  });
  Object.assign(s.energyMkt, { purchases: 420, base: 160, spend: 3.5e6, autoBuy: true, autoBlock: 50000 });
  s.model.capability = internal ? 2.82 : 2.8;
  s.model.alignment = internal ? 62 : 59;
  s.model.releasedAt = trainedAt;
  if (!internal) s.model.score = 30;
  Object.assign(s.pol, {
    gov: internal ? 58 : 43, opinion: internal ? 41 : 34, security: internal ? 3 : 2, jobsDisplaced: jobsDisplaced(22000),
  });
  Object.assign(s.rival, { capability: s.model.capability - 0.2, stoleAt: s.t, released: 2, interest: 0.5 });
  s.stats.modelsTrained = [
    { key: 'agent1', name: 'agent-1', capability: 2.0, score: 24, releasedAt: 1080 },
    { key: 'agent2', name: internal ? 'agent-2 (internal)' : 'agent-2', capability: s.model.capability, score: internal ? null : 30, releasedAt: trainedAt },
  ];
  s.counters.researchCappedOnce = true;
  s.counters.idleCapSeconds = 600;
  while (milestoneAt(s.milestones.taskIdx) <= s.res.tasks) s.milestones.taskIdx++;
  Object.assign(s.milestones.stamps, {
    stage2: 1080, agent2Trained: trainedAt, [internal ? 'agent2Internal' : 'agent2Released']: trainedAt + 1,
    theft: s.t - 2, theftResolved: s.t,
  });
  s.dateDays = internal ? 583 : 580;
  s.chart = [
    [240, 2.0, 1.6], [300, 2.1, 1.7], [330, 2.2, 1.8], [380, 2.3, 1.9], [420, 2.4, 2.0], [500, 2.4, 2.0],
    [560, s.model.capability, 2.2], [s.dateDays, s.model.capability, s.rival.capability],
  ];
  s.chartMarks = [[125, 'agent-0 (tuned)'], [240, 'agent-1'], [560, internal ? 'agent-2 (internal)' : 'agent-2'], [s.dateDays, 'the theft']];

  // Story flags from stage 2's set pieces (the policy's choices), then every stage-2 set piece is spent.
  Object.assign(s.flags, {
    politics: true, opinionVisible: true, negativePress: true, theftAttempt: true, rivalEvent: true,
    theftDisclosed: true, sl3Half: true, theftResolved: true,
  });
  for (const sp of REG.setpieces) if (sp.stage <= 2) { s.flags[`armed:${sp.id}`] = true; s.flags[`fired:${sp.id}`] = true; }
  s.queue = [{ eventId: 'cont_learning_tick', at: s.t + 60 }];

  updateReveals(s);
  checkProjects(s);
  s.log = [];
  log(s, '3 TB left the building at 03:14.');
  log(s, 'you tell everyone. the government is grateful. the public is not.');
  enterStage(s, 3); // logs "deepcent has agent-2. the race is no longer a metaphor."
  s.ambientAt = s.t + 60;
  return s;
}
