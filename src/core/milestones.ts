// Fibonacci × 1,000 task milestones → headcount; every third is a funding round.
import type { State } from './types.js';
import { log } from './events.js';
import { fmtInt, fmtMoney, fmtPrice } from './format.js';
import { FUNDING_ROUNDS } from '../content/events/lines.js';

/** 3k, 5k, 8k, 13k, 21k, 34k, 55k, 89k, 144k, … */
export function milestoneAt(idx: number): number {
  let a = 3, b = 5;
  for (let i = 0; i < idx; i++) { const c = a + b; a = b; b = c; }
  return a * 1000;
}

/** Seconds of current revenue a funding round is worth (or the table minimum). */
export const ROUND_REVENUE_SECONDS = 45;

export function milestoneCheck(s: State): void {
  while (s.res.tasks >= milestoneAt(s.milestones.taskIdx)) {
    const idx = s.milestones.taskIdx;
    const at = milestoneAt(idx);
    s.milestones.taskIdx += 1;
    s.res.headcount += 1;
    if (s.milestones.stamps.firstHeadcount === undefined) s.milestones.stamps.firstHeadcount = s.t;
    if (s.stage >= 3) {
      log(s, `${fmtInt(at)} tasks. another hire. the agents do not notice.`);
    } else {
      log(s, `${fmtInt(at)} tasks. headcount +1.`);
    }
    if ((idx + 1) % 3 === 0) fundingRound(s, Math.floor(idx / 3));
  }
}

function fundingRound(s: State, n: number): void {
  const row = FUNDING_ROUNDS[Math.min(n, FUNDING_ROUNDS.length - 1)];
  const amount = Math.max(row.min, ROUND_REVENUE_SECONDS * s.rates.revenuePerSec);
  s.res.funds += amount;
  const valuation = Math.max(row.valuation, amount * 40);
  log(s, `${row.name}: ${fmtPrice(amount)} at a ${fmtMoney(valuation)} valuation. ${row.quip}`);
}
