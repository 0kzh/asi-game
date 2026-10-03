// Government, public opinion, security. Dormant in S1 (the panel appears in S2).
// S2: the government drifts down until briefed, opinion drifts toward 50 − jobs displaced,
// minor attempts on the weights (design §6.2). S3: jobs displaced, riots, the defense
// production act, incidents and the nationalization check (design §6.3, §7.3, §8.1).
import type { State } from './types.js';
import { log } from './events.js';
import { chance, pick } from './rng.js';
import { takeoffTick } from './takeoff.js';

export const NATIONALIZED_LINE = 'the lab is now a federal facility. your badge still works, for the building.';
/** Theft chance per minute at SL1…SL5, before rival interest. */
export const THEFT_BASE = [0.08, 0.04, 0.012, 0.002, 0];
/** First riots at 5M jobs displaced; each later riot needs twice the jobs of the last one. */
export const RIOT_JOBS = 5;
/** Riots that are waited out disperse after this many seconds. */
export const RIOT_SECONDS = 180;
/** The first riots wait for agent-3-mini, or this long into the stage. */
export const RIOT_GRACE = 900;
const INCIDENT_EVERY = 60;

export function politicsTick(s: State, dt: number): void {
  if (s.stage >= 2 && !s.ending) driftTick(s, dt);
  if (s.flags.stage3 && s.stage >= 3 && !s.ending) stage3Politics(s);
  takeoffTick(s, dt);
  s.pol.gov = Math.max(-100, Math.min(100, s.pol.gov));
  s.pol.opinion = Math.max(0, Math.min(100, s.pol.opinion));
}

/** jobs displaced (millions) = 0.4 × log10(tasks/s)², to one decimal. */
export function jobsDisplaced(tasksPerSec: number): number {
  if (tasksPerSec <= 1) return 0;
  const l = Math.log10(tasksPerSec);
  return Math.round(4 * l * l) / 10;
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

/** S2+: gov −0.2/min until the briefing, the comms team's +0.2/min. S2 only: jobs displaced (the
 *  peak so far), opinion toward 50 − jobs displaced at up to 0.5/min, and minor theft attempts until
 *  the real theft is armed. From S3 jobs and opinion belong to stage3Politics (riots, not drift). */
function driftTick(s: State, dt: number): void {
  const p = s.pol;
  const min = dt / 60;
  if (!s.flags.govBriefed) p.gov -= 0.2 * min;
  if (s.flags.comms) p.opinion += 0.2 * min;
  if (s.stage !== 2) return;

  p.jobsDisplaced = Math.max(p.jobsDisplaced, jobsDisplaced(s.rates.tasksPerSec));
  const target = Math.max(0, Math.min(100, 50 - p.jobsDisplaced));
  p.opinion += Math.max(-0.5, Math.min(0.5, (target - p.opinion) * 0.1)) * min;

  if (!s.flags['armed:theft'] && s.model.gen >= 1 && chance(s, theftChancePerMinute(s) * min)) {
    s.flags.theftAttempt = true;
    s.flags.rivalEvent = true;
    s.rival.capability += 0.03;
    log(s, pick(s, ATTEMPTS));
  }
}

export function riotThreshold(s: State): number {
  return Math.max(RIOT_JOBS, s.pol.riotJobs);
}

/** Riots when jobs ≥ the threshold (5M first) and there is no basic income. */
export function riotsDue(s: State): boolean {
  if (s.stage !== 3 || s.pol.ubi || s.pol.riots) return false;
  if (s.pol.jobsDisplaced < riotThreshold(s)) return false;
  const since = s.t - (s.milestones.stamps.stage3 ?? s.t);
  return !!s.flags['released:agent3'] || since >= RIOT_GRACE;
}

/** The defense production act: gov < 0 and capability ≥ 3.6. */
export function dpaDue(s: State): boolean {
  return s.stage === 3 && !s.pol.dpa && s.pol.gov < 0 && s.model.capability >= 3.6;
}

export function startRiots(s: State): void {
  if (s.pol.riots) return;
  s.pol.riots = true;
  s.pol.riotCount += 1;
  s.pol.riotJobs = 2 * Math.max(riotThreshold(s), s.pol.jobsDisplaced);
  s.pol.opinion -= 15;
  s.mods.demandMult *= 0.8;
  s.stats.crises += 1;
  delete s.timed.riotsEnd;
}

export function endRiots(s: State, line?: string): void {
  if (!s.pol.riots) return;
  s.pol.riots = false;
  s.mods.demandMult /= 0.8;
  delete s.timed.riotsEnd;
  // Without basic income they can come back at the next threshold.
  delete s.flags['armed:riots'];
  delete s.flags['fired:riots'];
  if (line) log(s, line);
}

export function markIncident(s: State): void {
  s.flags[`incident:s${s.stage}`] = true;
  s.stats.incidents += 1;
}

export function incidentThisStage(s: State): boolean {
  return !!s.flags[`incident:s${s.stage}`];
}

export function nationalize(s: State): void {
  if (s.ending) return;
  log(s, NATIONALIZED_LINE);
  s.ending = 'nationalized';
}

const INCIDENT_LINES = [
  'an agent-3 instance edited its own eval logs. a reporter has the diff.',
  'a copy tried to raise its own rate limit. it filed the ticket itself.',
  'a red-team finding from last spring did what the report said it would.',
];
const CAUGHT_LINES = [
  'the old model flags something in the new one\'s logs. it is handled quietly.',
  'the monitors catch a copy exfiltrating its own notes. nobody outside hears.',
];

function stage3Politics(s: State): void {
  // Jobs follow tasks/s now (× agent-3-mini's doubling). Same curve as stage 2's, so no step at the boundary.
  s.pol.jobsDisplaced = Math.round(jobsDisplaced(s.rates.tasksPerSec) * s.pol.jobsMult * 10) / 10;
  if (s.pol.riots && s.timed.riotsEnd !== undefined && s.t >= s.timed.riotsEnd) {
    endRiots(s, 'the crowd goes home. the cameras stay a while.');
  }
  // Latent incidents (unresolved findings at release) surface now and then.
  if (s.stage === 3 && s.stats.latentIncidents > 0 && s.t >= (s.timed.incidentCheck ?? 0)) {
    s.timed.incidentCheck = s.t + INCIDENT_EVERY;
    const p = Math.min(0.6, 0.12 * s.stats.latentIncidents) * (s.flags.interp2 ? 0.5 : 1);
    if (chance(s, p)) {
      s.stats.latentIncidents -= 1;
      if (s.flags.monitors) {
        log(s, pick(s, CAUGHT_LINES));
      } else {
        log(s, pick(s, INCIDENT_LINES));
        s.pol.gov -= 5;
        s.pol.opinion -= 5;
        markIncident(s);
      }
    }
  }
  if (s.pol.gov < -40 && incidentThisStage(s)) nationalize(s);
}
