// Government, public opinion, security. Dormant in S1 (the panel appears in S2).
import type { State } from './types.js';
import { chance, pick } from './rng.js';
import { log } from './events.js';

/** Theft chance per minute at SL1…SL5, before rival interest. */
export const THEFT_BASE = [0.08, 0.04, 0.012, 0.002, 0];

export function politicsTick(s: State, dt: number): void {
  if (s.stage >= 2) politicsS2(s, dt);
  s.pol.gov = Math.max(-100, Math.min(100, s.pol.gov));
  s.pol.opinion = Math.max(0, Math.min(100, s.pol.opinion));
}

/** jobs displaced (millions) = 0.4 × log10(tasks/s)², S3+. */
export function jobsDisplaced(tasksPerSec: number): number {
  if (tasksPerSec <= 1) return 0;
  const l = Math.log10(tasksPerSec);
  return Math.round(0.4 * l * l);
}

export function securityLevel(s: State): number {
  return Math.max(1, Math.min(5, Math.round(s.pol.security)));
}

/** Chance per minute that someone tries for the weights: base(SL) × rival interest. */
export function theftChancePerMinute(s: State): number {
  return THEFT_BASE[securityLevel(s) - 1] * s.rival.interest;
}

const ATTEMPTS = [
  'a phishing email reached the infra team. one engineer clicked. the logs are long.',
  'something scanned the weights server all night. the door held. this time.',
  'a contractor laptop phoned home to an address nobody recognises.',
  'a visitor badge was used at 2 a.m. the visitor left at noon.',
];

/** S2+ drift: gov −0.2/min until the briefing; opinion toward 50 − jobs displaced (millions); theft attempts. */
function politicsS2(s: State, dt: number): void {
  const p = s.pol;
  const min = dt / 60;
  if (!s.flags.govBriefed) p.gov -= 0.2 * min;

  // pol.jobsDisplaced is a head count; the opinion target reads it in millions.
  const jobs = jobsDisplaced(s.rates.tasksPerSec) * 1e6;
  if (jobs > p.jobsDisplaced) p.jobsDisplaced = jobs;
  const target = Math.max(0, Math.min(100, 50 - p.jobsDisplaced / 1e6));
  const pull = Math.max(-0.5, Math.min(0.5, (target - p.opinion) * 0.1));
  p.opinion += (pull + (s.flags.comms ? 0.2 : 0)) * min;

  // Minor attempts on the weights until the real theft is armed (S2 only).
  if (s.stage === 2 && !s.flags['armed:theft'] && s.model.gen >= 1 && chance(s, theftChancePerMinute(s) * min)) {
    s.flags.theftAttempt = true;
    s.flags.rivalEvent = true;
    s.rival.capability += 0.03;
    log(s, pick(s, ATTEMPTS));
  }
}
