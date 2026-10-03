import { log } from './events.js';
import { fmtDate } from './format.js';
import { NAMES } from '../content/names.js';
/** Capability 0.4 behind yours (0.2 after the theft), closing at this rate. */
export const RIVAL_GAP = 0.4;
export const RIVAL_GAP_STOLEN = 0.2;
export const RIVAL_CHASE_PER_MIN = 0.1;
/** S3: DeepCent closes to two months (0.35 capability) behind, at most 0.24 capability a minute. */
export const RIVAL_LAG = 0.35;
export const RIVAL_CREEP_PER_S = 0.004;
/** Months per capability point, from the calendar: S2 moves 0.8 in ten months, S3 1.8 in nine. */
const MONTHS_PER_POINT_S2 = 15;
const MONTHS_PER_POINT_S3 = 6;
export function rivalTick(s, dt) {
    if (s.stage === 2) {
        rivalChase(s, dt);
        return;
    }
    if (s.stage === 3) {
        rivalCreep(s, dt);
        return;
    }
    if (s.stage >= 4)
        return;
    // S1: ~1.0 in jul 2025, +0.9 per year.
    const scheduled = 1.0 + (s.dateDays / 365) * 0.9;
    if (scheduled > s.rival.capability)
        s.rival.capability = scheduled;
}
/** Your frontier: the deployed (or internal) model, or the run in progress if it is further. */
export function frontierCapability(s) {
    const tr = s.training;
    return Math.max(s.model.capability, tr ? tr.capNow : 0);
}
/** DeepCent's distance from your frontier in months (negative: ahead), at the current stage's pace. */
export function rivalGapMonths(s) {
    return (frontierCapability(s) - s.rival.capability) * (s.stage >= 3 ? MONTHS_PER_POINT_S3 : MONTHS_PER_POINT_S2);
}
/** "deepcent is N months behind", rounded, never negative. */
export function monthsBehind(s) {
    return Math.max(0, Math.round(rivalGapMonths(s)));
}
/** S2: chase the target (never falls back), market share 0.1 → 0.4 as the gap closes 0.4 → 0.2, deepcent-1. */
export function rivalChase(s, dt) {
    const r = s.rival;
    const gap = s.flags.theftResolved ? RIVAL_GAP_STOLEN : RIVAL_GAP;
    const target = s.model.capability - gap;
    if (r.capability < target)
        r.capability = Math.min(target, r.capability + (RIVAL_CHASE_PER_MIN * dt) / 60);
    const lead = s.model.capability - r.capability;
    const shareTarget = 0.1 + 0.3 * Math.max(0, Math.min(1, (RIVAL_GAP - lead) / (RIVAL_GAP - RIVAL_GAP_STOLEN)));
    s.market.rivalShare += (shareTarget - s.market.rivalShare) * Math.min(1, dt / 60);
    if (r.released < 1 && r.capability >= 1.85) {
        r.released = 1;
        s.flags.rivalEvent = true;
        log(s, `${fmtDate(s.dateDays)}: ${r.name} releases ${NAMES.rivalModels[0]}. ${NAMES.press.feed} says it is ${monthsBehind(s)} months behind.`);
    }
}
/** S3: creep toward your model − RIVAL_LAG; the market share stays where stage 2 left it (events move it). */
export function rivalCreep(s, dt) {
    const target = s.model.capability - RIVAL_LAG;
    if (s.rival.capability < target)
        s.rival.capability = Math.min(target, s.rival.capability + RIVAL_CREEP_PER_S * dt);
}
//# sourceMappingURL=rival.js.map