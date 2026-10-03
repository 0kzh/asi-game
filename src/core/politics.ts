// Government, public opinion, security. Dormant in S1 (the panel appears in S2).
import type { State } from './types.js';

export function politicsTick(s: State, _dt: number): void {
  s.pol.gov = Math.max(-100, Math.min(100, s.pol.gov));
  s.pol.opinion = Math.max(0, Math.min(100, s.pol.opinion));
}

/** jobs displaced (millions) = 0.4 × log10(tasks/s)², S3+. */
export function jobsDisplaced(tasksPerSec: number): number {
  if (tasksPerSec <= 1) return 0;
  const l = Math.log10(tasksPerSec);
  return Math.round(0.4 * l * l);
}
