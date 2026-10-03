// Stage 2 — Agents (design.md §6.2). Order here is the typical reveal order; on screen,
// projects append in the order their triggers fire. Every trigger also requires stage ≥ 2
// so nothing here can surface in stage 1.
import type { Project, State } from '../../core/types.js';
import { isBought, isVisible, projectCost, removeProject } from '../../core/projects.js';
import { release } from '../../core/models.js';
import { log } from '../../core/events.js';
import { GPU_BASE_COST, gpuBatch, gpuCost } from '../../core/economy.js';
import { REG } from '../../core/registry.js';
import { GENERATIONS, generation } from '../models.js';

const s2 = (s: State) => s.stage >= 2;
/** Tier bulk prices relative to the leased tier's $80 a gpu (tuning-log.md). */
export const BUILD_DC_PRICE = 200;
export const BUILD_DC2_PRICE = 10;
const round2 = (x: number) => Math.round(x * 100) / 100;

/** Data the next visible training run needs (0 if none is visible). */
export function nextRunData(s: State): number {
  let need = 0;
  for (const id of s.projectOrder) {
    const p = REG.projectById[id];
    if (!p?.training || !isVisible(s, id)) continue;
    need = Math.max(need, projectCost(s, p).data ?? 0);
  }
  return need;
}

/** The data wall: the next run needs more tokens than the lab has. */
export function atDataWall(s: State): boolean {
  const need = nextRunData(s);
  return need > 0 && s.res.data < need;
}

/** GPU price per unit against the $100 list price (lots, the lease discount and shocks included). */
export function gpuPriceIndex(s: State): number {
  return gpuCost(s) / (GPU_BASE_COST * gpuBatch(s));
}

/** A datacenter raises the gpu cap (lots grow with it, economy.gpuBatch) and resets the price curve
 *  to the tier's bulk price: the leased tier starts at $80 a gpu, each new tier at `mult` times that. */
export function raiseGpuCap(s: State, cap: number, mult: number): void {
  s.caps.gpus = Math.max(s.caps.gpus, cap);
  s.caps.gpuCurveStart = s.res.gpus - 1;
  s.mods.gpuPriceMult *= mult;
}

/** Continuous learning never takes the model past the next generation's table value − 0.1. */
export function contLearningCeiling(s: State): number {
  const m = /^(.*?)(\d+)$/.exec(s.model.key);
  const next = m ? GENERATIONS.find((g) => g.key === `${m[1]}${Number(m[2]) + 1}`) : undefined;
  return next ? next.capability - 0.1 : s.model.capability;
}

/** One minute of continuous learning: +0.02 capability while agent-2 (or later) is deployed. */
export function contLearningStep(s: State): void {
  if (!s.flags.contLearning || s.model.gen < 2) return;
  const ceiling = contLearningCeiling(s);
  if (s.model.capability < ceiling) s.model.capability = round2(Math.min(ceiling, s.model.capability + 0.02));
}

/** Agent-2 kept inside: the lab runs it, the public keeps agent-1-plus. */
function keepInternal(s: State): void {
  const tr = s.training;
  if (!tr || tr.key !== 'agent2') return;
  const g = generation('agent2');
  const old = s.model;
  s.prevModels.push({ key: old.key, name: old.name, capability: old.capability, score: old.score, releasedAt: old.releasedAt });
  // `released` gates the next run (models.canStartRun); flags.agent2Internal says nobody outside has it.
  s.model = {
    key: g.key, gen: g.gen, name: g.name, capability: round2(tr.capNow),
    alignment: Math.max(0, old.alignment - 3 * tr.findings), interp: old.interp,
    released: true, releasedAt: s.t, score: old.score,
  };
  s.stats.modelsTrained.push({ key: g.key, name: `${g.name} (internal)`, capability: s.model.capability, score: null, releasedAt: s.t });
  s.training = null;
  s.flags.agent2Internal = true;
  if (s.milestones.stamps.agent2Internal === undefined) s.milestones.stamps.agent2Internal = s.t;
  s.chartMarks.push([Math.round(s.dateDays), `${g.name} (internal)`]);
}

function internalEffects(s: State): void {
  s.mods.rdMult *= 2;
  s.pol.gov += 5;
  s.rival.interest += 0.5;
  removeProject(s, 'release_agent2');
  removeProject(s, 'agent1_update');
}

function releaseEffects(s: State): void {
  s.mods.demandMult *= 3;
  s.pol.gov -= 5;
  s.pol.opinion -= 5;
  removeProject(s, 'keep_internal');
  removeProject(s, 'agent1_update');
}

/** Snapshot stand-in for the agent-2 run's end: the model at the table value. */
function snapshotAgent2(s: State, internal: boolean): void {
  const g = generation('agent2');
  const old = s.model;
  s.prevModels.push({ key: old.key, name: old.name, capability: old.capability, score: old.score, releasedAt: old.releasedAt });
  s.model = {
    ...old, key: g.key, gen: g.gen, name: g.name, capability: g.capability,
    alignment: Math.max(0, old.alignment - 6), released: true, releasedAt: s.t, score: internal ? old.score : 27,
  };
  s.training = null;
  if (internal) {
    s.flags.agent2Internal = true;
  } else {
    s.flags['released:agent2'] = true;
    s.market.productMult = 2;
  }
}

const agent2Done = (s: State) => s.training?.key === 'agent2' && s.training.phase === 'done';

export const PROJECTS: Project[] = [
  {
    id: 'alloc', stage: 2, title: 'compute allocation',
    cost: { research: 300 },
    trigger: s2,
    effect: (s) => { s.flags.allocPanel = true; s.flags.autoDeploy = true; },
    done: 'compute allocation. copies fill every gpu now. you decide what they work on.',
    desc: 'every gpu is a decision.',
  },
  {
    id: 'ai_rd', stage: 2, title: 'agents in the loop',
    cost: { research: 600 },
    trigger: (s) => s2(s) && isBought(s, 'alloc') && s.model.capability >= 1.8,
    effect: (s) => {
      s.flags.aiRd = true;
      s.caps.researchBonus += 1500;
      if (s.alloc.research === 0 && s.alloc.safety === 0) s.alloc = { deploy: 0.7, research: 0.3, safety: 0 };
    },
    done: 'agents in the loop. 30% of copies move to research. research cap +1,500.',
    desc: 'the model writes the experiment code now. someone still reads it.',
  },
  {
    id: 'chart', stage: 2, title: 'capability tracking',
    cost: { insight: 20 },
    trigger: (s) => s2(s) && s.model.gen >= 1,
    effect: (s) => { s.flags.chart = true; },
    done: 'capability tracking. one line is yours. the dashed one is an estimate.',
    desc: 'a line, going up.',
  },
  {
    id: 'eval_suite', stage: 2, title: 'alignment evals',
    cost: { insight: 40 },
    trigger: (s) => s2(s) && s.res.insight >= 10,
    effect: (s) => { s.flags.evalSuite = true; s.flags.alignmentVisible = true; },
    done: 'alignment evals. alignment is a number now. so are the findings.',
    desc: "you can't fix what you can't measure. you can still ship it.",
  },
  {
    id: 'distill', stage: 2, title: 'distillation',
    cost: { research: 1500 },
    trigger: (s) => s2(s) && s.model.gen >= 1,
    effect: (s) => { s.mods.efficiencyMult *= 1.6; },
    done: 'distillation. 60% more copies per gpu.',
    desc: 'agent-1-mini. same answers, fewer parameters.',
  },
  {
    id: 'agent1_update', stage: 2, title: 'update agent-1',
    costFn: (s) => ({ research: 400 * ((s.projects.agent1_update?.bought ?? 0) + 1) }),
    uses: 4,
    trigger: (s) => s2(s) && isBought(s, 'ai_rd') && s.model.key === 'agent1',
    effect: (s) => {
      s.model.capability = round2(s.model.capability + 0.1);
      log(s, `agent-1 is updated. capability ${s.model.capability.toFixed(1)}.`);
    },
    desc: "'finishes' is a misnomer. it is updated weekly.",
  },
  {
    id: 'honesty', stage: 2, title: 'honesty training',
    cost: { insight: 80 },
    trigger: (s) => s2(s) && (isBought(s, 'eval_suite') || !!s.flags['fired:sycophancy']),
    effect: (s) => { s.model.alignment = Math.min(100, s.model.alignment + 8); s.mods.findingsMult *= 0.8; },
    done: 'honesty training. alignment +8. findings per run −20%.',
    desc: 'we train it to say what it believes. we hope it believes something.',
  },
  {
    id: 'synthetic', stage: 2, title: 'synthetic data',
    cost: { research: 2000 },
    uses: 3,
    retrigger: true,
    trigger: (s) => s2(s) && atDataWall(s),
    effect: (s) => { s.res.data += 50; },
    done: '50 T of synthetic data. the next run can start.',
    desc: 'the model teaches the next model. nothing could go wrong.',
  },
  {
    id: 'speculative', stage: 2, title: 'speculative decoding',
    cost: { research: 1200 },
    trigger: (s) => s2(s) && isBought(s, 'distill'),
    effect: (s) => { s.mods.speedMult *= 1.3; },
    done: 'speculative decoding. agents are 30% faster.',
    desc: 'guess, then check.',
  },
  {
    id: 'build_dc', stage: 2, title: 'build a datacenter',
    cost: { funds: 2e6 },
    trigger: (s) => s2(s) && s.res.gpus >= 400,
    effect: (s) => {
      raiseGpuCap(s, 5000, BUILD_DC_PRICE);
      s.mods.energyEffMult *= 0.9;
      s.caps.researchBonus += 4500;
    },
    done: 'a datacenter of our own. room for 5,000 gpus. energy per task −10%. research cap +4,500.',
    desc: 'three hundred megawatts, a cooling pond, and a county that wants the jobs.',
  },
  {
    id: 'gov_briefing', stage: 2, title: 'brief the administration',
    cost: { insight: 30 },
    trigger: (s) => s2(s) && s.model.capability >= 2.2,
    effect: (s) => {
      s.pol.gov += 15;
      s.flags.govBriefed = true;
      s.flags.politics = true;
      s.flags.opinionVisible = true;
    },
    done: 'the administration is briefed. government +15.',
    desc: 'a windowless room. they ask about china.',
  },
  {
    id: 'consumer_app', stage: 2, title: 'consumer app',
    cost: { funds: 5e6 },
    trigger: (s) => s2(s) && !!s.flags.opinionVisible,
    effect: (s) => { s.mods.demandMult *= 2; s.pol.opinion += 5; },
    done: 'the consumer app ships. demand ×2. public +5.',
    desc: 'it writes your emails. it reads them too.',
  },
  {
    id: 'sl2', stage: 2, title: 'security level 2',
    cost: { funds: 5e6 },
    trigger: (s) => s2(s) && (!!s.flags.govBriefed || !!s.flags.rivalEvent),
    effect: (s) => { s.pol.security = Math.max(s.pol.security, 2); },
    done: 'security level 2. theft is half as likely.',
    desc: 'badges, and a man who checks them.',
  },
  {
    id: 'enterprise', stage: 2, title: 'enterprise agreements',
    cost: { funds: 3e7, research: 800 },
    trigger: (s) => s2(s) && isBought(s, 'consumer_app'),
    effect: (s) => { s.mods.demandMult *= 1.5; s.mods.refPriceMult *= 1.3; },
    done: 'enterprise agreements. demand ×1.5, and they pay 30% more.',
    desc: 'procurement takes nine months. the model finishes the work in nine seconds.',
  },
  {
    id: 'comms', stage: 2, title: 'comms team',
    cost: { funds: 5e6 },
    trigger: (s) => s2(s) && !!s.flags.negativePress,
    effect: (s) => { s.flags.comms = true; },
    done: 'a comms team. public opinion drifts up.',
    desc: 'we have always been building this responsibly.',
  },
  {
    id: 'retention', stage: 2, title: 'retention grants',
    cost: { funds: 2e7 },
    trigger: (s) => s2(s) && !!s.flags['fired:poaching'],
    effect: (s) => { s.flags.retention = true; },
    done: 'retention grants. nobody else leaves for deepcent.',
    desc: 'four years, cliff, no questions.',
  },
  {
    id: 'chip_deal', stage: 2, title: 'multi-year chip deal',
    cost: { funds: 2e7 },
    trigger: (s) => s2(s) && gpuPriceIndex(s) >= 1.5,
    effect: (s) => { s.mods.gpuPriceMult *= 0.7; },
    done: 'a multi-year chip deal. gpus −30%.',
    desc: 'ten billion dollars of promises, both ways.',
  },
  {
    id: 'spec', stage: 2, title: 'the spec',
    cost: { insight: 150 },
    trigger: (s) => s2(s) && isBought(s, 'honesty'),
    effect: (s) => { s.model.alignment = Math.min(100, s.model.alignment + 10); s.flags.spec = true; },
    done: 'the spec. alignment +10.',
    desc: 'forty pages on what the model should want.',
  },
  {
    id: 'sl3', stage: 2, title: 'security level 3',
    costFn: (s) => (s.flags.sl3Half ? { funds: 2.5e7, insight: 30 } : { funds: 5e7, insight: 60 }),
    trigger: (s) => s2(s) && isBought(s, 'sl2') && (s.model.capability >= 2.5 || !!s.flags.theftAttempt),
    effect: (s) => { s.pol.security = Math.max(s.pol.security, 3); },
    done: 'security level 3. the weights move to a building with no windows.',
    desc: 'the weights live in a building with no windows.',
  },
  {
    id: 'train_agent2', stage: 2, title: 'train agent-2',
    cost: { research: 9000, data: 10, funds: 5e6 },
    req: { gpus: 1500 },
    training: 'agent2',
    trigger: (s) => s2(s) && !!s.flags['released:agent1'] && isBought(s, 'ai_rd'),
    effect: () => { /* bought via the budget modal (models.startTrainingFromModal) */ },
    snapshot: (s) => { s.flags['trained:agent2'] = true; },
    desc: 'trained continuously. never finished.',
  },
  {
    id: 'keep_internal', stage: 2, title: 'keep agent-2 internal',
    costLabel: () => 'ready',
    trigger: agent2Done,
    extraAfford: agent2Done,
    effect: (s) => { keepInternal(s); internalEffects(s); },
    snapshot: (s) => { snapshotAgent2(s, true); internalEffects(s); },
    done: 'agent-2 stays inside. research from copies ×2. the public gets agent-1-plus.',
    desc: 'the public gets agent-1-plus. the researchers get the real thing.',
  },
  {
    id: 'release_agent2', stage: 2, title: 'release agent-2',
    costLabel: () => 'ready',
    trigger: agent2Done,
    extraAfford: agent2Done,
    effect: (s) => { release(s); releaseEffects(s); },
    snapshot: (s) => { snapshotAgent2(s, false); releaseEffects(s); },
    desc: 'the quarterly numbers will be remarkable.',
  },
  {
    id: 'pipelines', stage: 2, title: 'overlapping pipelines',
    cost: { research: 3000 },
    trigger: (s) => s2(s) && !!s.flags['trained:agent2'],
    effect: (s) => { s.flags.pipelines = true; },
    done: 'overlapping pipelines. the next run can start before this model ships.',
    desc: 'two pipelines, one team, no sleep.',
  },
  {
    id: 'cont_learning', stage: 2, title: 'continuous learning',
    cost: { research: 4000 },
    trigger: (s) => s2(s) && !!s.flags['trained:agent2'],
    effect: (s) => {
      s.flags.contLearning = true;
      s.queue.push({ eventId: 'cont_learning_tick', at: s.t + 60 });
    },
    done: 'continuous learning. the deployed model gains capability every minute.',
    desc: 'it is never done training. neither are we.',
  },
  {
    id: 'build_dc2', stage: 2, title: 'second campus',
    cost: { funds: 2e8 },
    trigger: (s) => s2(s) && s.res.gpus >= 1500,
    effect: (s) => {
      raiseGpuCap(s, 50000, BUILD_DC2_PRICE);
      s.caps.powerGw = Math.max(s.caps.powerGw, 1);
      s.flags.powerVisible = true;
    },
    done: 'a second campus. room for 50,000 gpus. 1 GW of power.',
    desc: 'a gigawatt. the word starts appearing in meetings.',
  },
];
