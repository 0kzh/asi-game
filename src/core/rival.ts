// DeepCent. S1: a slow, steady curve the chart can show. Later stages add theft and market share.
import type { State } from './types.js';

/** Rival capability follows the calendar: ~1.0 in jul 2025, +0.9 per year, until S2+ content takes over. */
export function rivalTick(s: State, _dt: number): void {
  const scheduled = 1.0 + (s.dateDays / 365) * 0.9;
  if (scheduled > s.rival.capability) s.rival.capability = scheduled;
}
