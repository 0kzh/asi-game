// DeepCent. S1: a slow, steady curve the chart can show. S2: it trails your model by 0.4
// (0.2 after the theft), takes market share as the gap closes, and releases deepcent-1.
import type { State } from './types.js';
import { log } from './events.js';
import { fmtDate } from './format.js';
import { NAMES } from '../content/names.js';

/** Capability 0.4 behind yours (0.2 after the theft), closing at this rate. */
export const RIVAL_GAP = 0.4;
export const RIVAL_GAP_STOLEN = 0.2;
export const RIVAL_CHASE_PER_MIN = 0.1;

export function rivalTick(s: State, dt: number): void {
  if (s.stage >= 2) { rivalChase(s, dt); return; }
  // S1: ~1.0 in jul 2025, +0.9 per year.
  const scheduled = 1.0 + (s.dateDays / 365) * 0.9;
  if (scheduled > s.rival.capability) s.rival.capability = scheduled;
}

/** Your frontier: the deployed (or internal) model, or the run in progress if it is further. */
export function frontierCapability(s: State): number {
  const tr = s.training;
  return Math.max(s.model.capability, tr ? tr.capNow : 0);
}

/** "deepcent is N months behind": one capability point ≈ 15 months at the S2 pace. */
export function monthsBehind(s: State): number {
  return Math.max(0, Math.round((frontierCapability(s) - s.rival.capability) * 15));
}

/** S2+: chase the target (never falls back), market share 0.1 → 0.4 as the gap closes 0.4 → 0.2, deepcent-1. */
export function rivalChase(s: State, dt: number): void {
  const r = s.rival;
  const gap = s.flags.theftResolved ? RIVAL_GAP_STOLEN : RIVAL_GAP;
  const target = s.model.capability - gap;
  if (r.capability < target) r.capability = Math.min(target, r.capability + (RIVAL_CHASE_PER_MIN * dt) / 60);

  const lead = s.model.capability - r.capability;
  const shareTarget = 0.1 + 0.3 * Math.max(0, Math.min(1, (RIVAL_GAP - lead) / (RIVAL_GAP - RIVAL_GAP_STOLEN)));
  s.market.rivalShare += (shareTarget - s.market.rivalShare) * Math.min(1, dt / 60);

  if (r.released < 1 && r.capability >= 1.85) {
    r.released = 1;
    s.flags.rivalEvent = true;
    log(s, `${fmtDate(s.dateDays)}: ${r.name} releases ${NAMES.rivalModels[0]}. ${NAMES.press.feed} says it is ${monthsBehind(s)} months behind.`);
  }
}
