// Generations, training runs and releases (design.md §4).
import type { State, TrainingRun } from './types.js';
import { generation } from '../content/models.js';
import { REVIEWS, EVALUATORS, type Evaluator } from '../content/events/reviews.js';
import { TRAINING_LINES, BEATS } from '../content/events/lines.js';
import { log, openChoice } from './events.js';
import { between, chance, pick, rand } from './rng.js';
import { fmtElapsed } from './format.js';
import { REG } from './registry.js';
import { canPay, meets, pay } from './cost.js';
import { markBought, projectCost } from './projects.js';

export const BUDGETS = [0.25, 0.5, 1] as const;
const DURATION_MULT: Record<string, number> = { '0.25': 0.75, '0.5': 1, '1': 1.25 };
const GAIN: Record<string, number> = { '0.25': 0.8, '0.5': 1.0, '1': 1.25 };
export const PRE_END = 0.55;
export const POST_END = 0.85;

export function currentGen(s: State) {
  return generation(s.model.key);
}

export function agentsPerGpu(s: State): number {
  return currentGen(s).agentsPerGpu * s.mods.efficiencyMult * (1 + 0.02 * s.res.engineers);
}

export function agentSpeed(s: State): number {
  return currentGen(s).speed * s.mods.speedMult;
}

export function energyPerTask(s: State): number {
  return currentGen(s).energyPerTask * s.mods.energyEffMult;
}

export function runDuration(key: string, budget: number): number {
  return generation(key).duration * (DURATION_MULT[String(budget)] ?? 1);
}

export function runGain(budget: number): number {
  return GAIN[String(budget)] ?? 1;
}

function runName(key: string): string {
  return key === 'finetune' ? 'the fine-tune' : generation(key).name;
}

/** Only one run at a time, and only once the previous model has been released (until `pipelines`). */
export function canStartRun(s: State): boolean {
  if (s.training && !s.flags.pipelines) return false;
  if (s.training && s.training.phase !== 'done') return false;
  return s.model.released || !!s.flags.pipelines;
}

/** Begin a run (costs already paid). */
export function beginRun(s: State, key: string, projectId: string, budget: number, tutorial = false): void {
  const g = generation(key);
  const run: TrainingRun = {
    key,
    projectId,
    name: runName(key),
    phase: 'pre',
    progress: 0,
    duration: tutorial ? g.duration : runDuration(key, budget),
    budget: tutorial ? 0.5 : budget,
    gain: tutorial ? 1 : runGain(budget),
    capStart: s.model.capability,
    capTarget: g.capability,
    capNow: s.model.capability,
    findings: 0,
    safetyFirst: false,
    tutorial,
    beat: null,
    beatAt: -1,
    beatDone: false,
  };
  if (chance(s, 0.2)) {
    run.beat = pick(s, BEATS).id;
    run.beatAt = between(s, 0.2, 0.8);
  }
  s.training = run;
  s.flags.modelPanel = true;
  log(s, `training ${g.name}. ${Math.round(run.duration)} s on ${Math.round(run.budget * 100)}% of the cluster.`);
  log(s, pick(s, TRAINING_LINES.pre));
}

/** The budget modal's [start]: pay the project's cost, mark it bought, begin. */
export function startTrainingFromModal(s: State): boolean {
  const m = s.modal;
  if (!m || m.kind !== 'training') return false;
  const p = REG.projectById[m.projectId];
  if (!p || !p.training) return false;
  const cost = projectCost(s, p);
  if (!canPay(s, cost) || !meets(s, p.req) || !canStartRun(s)) return false;
  pay(s, cost);
  markBought(s, p.id);
  s.modal = null;
  beginRun(s, p.training, p.id, m.budget);
  return true;
}

function capCurve(progress: number): number {
  if (progress <= PRE_END) return 0.7 * (progress / PRE_END);
  if (progress <= POST_END) return 0.7 + 0.3 * ((progress - PRE_END) / (POST_END - PRE_END));
  return 1;
}

function phaseOf(progress: number): TrainingRun['phase'] {
  if (progress >= 1) return 'done';
  if (progress >= POST_END) return 'evals';
  if (progress >= PRE_END) return 'post';
  return 'pre';
}

function applyBeat(s: State, tr: TrainingRun): void {
  const beat = BEATS.find((b) => b.id === tr.beat);
  if (!beat) return;
  tr.beatDone = true;
  const elapsed = tr.progress * tr.duration;
  if (beat.id === 'spike') tr.duration += 10;
  if (beat.id === 'early') tr.duration = Math.max(elapsed + 1, tr.duration - 10);
  if (beat.id === 'corrupt') tr.gain *= 0.95;
  tr.progress = elapsed / tr.duration;
  log(s, beat.text);
}

export function trainingTick(s: State, dt: number): void {
  const tr = s.training;
  if (!tr || tr.phase === 'done') return;
  tr.progress = Math.min(1, tr.progress + dt / tr.duration);
  if (tr.beat && !tr.beatDone && tr.progress >= tr.beatAt) applyBeat(s, tr);
  tr.capNow = tr.capStart + (tr.capTarget - tr.capStart) * tr.gain * capCurve(tr.progress);
  const next = phaseOf(tr.progress);
  if (next === tr.phase) return;
  // Walk through every phase boundary crossed this step.
  const order: TrainingRun['phase'][] = ['pre', 'post', 'evals', 'done'];
  for (let i = order.indexOf(tr.phase) + 1; i <= order.indexOf(next); i++) enterPhase(s, tr, order[i]);
}

function enterPhase(s: State, tr: TrainingRun, phase: TrainingRun['phase']): void {
  tr.phase = phase;
  if (phase === 'post') {
    log(s, pick(s, TRAINING_LINES.post));
  } else if (phase === 'evals') {
    const base = generation(tr.key).findings;
    const f = base * (0.7 + rand(s) * 0.6) * (tr.safetyFirst ? 0.5 : 1);
    tr.findings = Math.max(0, Math.round(f));
    log(s, tr.findings > 0 ? `red team report: ${tr.findings} finding${tr.findings === 1 ? '' : 's'}.` : pick(s, TRAINING_LINES.evalsClean));
  } else if (phase === 'done') {
    tr.progress = 1;
    tr.capNow = tr.capStart + (tr.capTarget - tr.capStart) * tr.gain;
    const g = generation(tr.key);
    log(s, `${tr.key === 'finetune' ? 'the fine-tune' : g.name} is trained.`);
    s.flags[`trained:${tr.key}`] = true;
    const stamp = tr.key === 'finetune' ? 'finetuneDone' : `${tr.key}Trained`;
    if (s.milestones.stamps[stamp] === undefined) s.milestones.stamps[stamp] = s.t;
  }
}

/** Dev: jump the current run to the end. */
export function finishTraining(s: State): void {
  const tr = s.training;
  if (!tr || tr.phase === 'done') return;
  if (tr.beat && !tr.beatDone) tr.beatDone = true;
  trainingTick(s, tr.duration * 2);
}

// ------------------------------------------------------------------ release

function clamp10(x: number): number {
  return Math.max(1, Math.min(10, Math.round(x)));
}

export interface Scorecard { scores: Record<Evaluator, number>; lines: Record<Evaluator, string>; total: number }

export function scoreRelease(s: State, tr: TrainingRun): Scorecard {
  const g = generation(tr.key);
  const cap = tr.capNow;
  const jump = cap - s.model.capability;
  const noise = () => rand(s) * 2 - 1;
  const alignment = s.model.alignment - 3 * tr.findings;
  const scores: Record<Evaluator, number> = {
    benchmarks: clamp10(2 + cap * 3 + noise()),
    developers: clamp10(1 + cap * 2.5 + g.speed * 0.5 + noise()),
    press: clamp10(4 + (s.pol.opinion - 50) / 10 + jump * 4 + noise() - (s.flags.repeatArch ? 2 : 0)),
    safety: clamp10(2 + alignment / 12 - tr.findings * 0.4 + noise()),
  };
  const lines = {} as Record<Evaluator, string>;
  let total = 0;
  for (const e of EVALUATORS) {
    const sc = scores[e];
    total += sc;
    const band = sc <= 4 ? 'low' : sc <= 7 ? 'mid' : 'high';
    lines[e] = pick(s, REVIEWS[e][band]);
  }
  return { scores, lines, total };
}

const EVAL_LABEL: Record<Evaluator, string> = {
  benchmarks: 'benchmarks',
  developers: 'developers',
  press: 'the press',
  safety: 'safety institute',
};

/** Ship the trained model: scorecard, demand/price effects, prevModels, stage hooks. */
export function release(s: State): boolean {
  const tr = s.training;
  if (!tr || tr.phase !== 'done') return false;
  const g = generation(tr.key);
  const card = scoreRelease(s, tr);
  const old = s.model;
  s.prevModels.push({ key: old.key, name: old.name, capability: old.capability, score: old.score, releasedAt: old.releasedAt });
  s.model = {
    key: tr.key,
    gen: g.gen,
    name: g.name,
    capability: Math.round(tr.capNow * 100) / 100,
    alignment: Math.max(0, old.alignment - 3 * tr.findings),
    interp: old.interp,
    released: true,
    releasedAt: s.t,
    score: card.total,
  };
  s.stats.modelsTrained.push({ key: tr.key, name: g.name, capability: s.model.capability, score: card.total, releasedAt: s.t });
  // Each unresolved finding: 20% chance of a later incident keyed to it (S2+ content resolves these).
  for (let i = 0; i < tr.findings; i++) if (chance(s, 0.2)) s.stats.latentIncidents += 1;
  s.market.productMult = 2.0;
  s.pol.opinion = Math.max(0, Math.min(100, s.pol.opinion + (card.total - 20) / 4));
  s.pol.gov = Math.max(-100, Math.min(100, s.pol.gov + (card.total - 20) / 8));
  s.training = null;

  const card4 = EVALUATORS.map((e) => `${EVAL_LABEL[e]} ${card.scores[e]}/10 "${card.lines[e]}"`).join('\n');
  log(s, `${g.name} released.\n${card4}\nscore ${card.total}/40`);

  const relId = `release_${tr.key}`;
  if (REG.projectById[relId] && !s.projects[relId]?.bought) markBought(s, relId);
  const stamp = tr.key === 'finetune' ? 'finetuneReleased' : `${tr.key}Released`;
  if (s.milestones.stamps[stamp] === undefined) s.milestones.stamps[stamp] = s.t;
  s.flags[`released:${tr.key}`] = true;

  if (card.total >= 32 && REG.events.frontier) {
    s.flags[`frontier:${tr.key}`] = true;
    if (!s.modal) openChoice(s, 'frontier');
  }
  return true;
}

export function shippedLine(s: State, key: string): string {
  const t = s.milestones.stamps[`${key}Released`] ?? s.t;
  return `${generation(key).name} shipped in ${fmtElapsed(t)}.`;
}
