// Endings (design.md §8). Determination is filled in by later stages.
import type { State } from './types.js';
import { fmtElapsed, fmtInt, fmtDate } from './format.js';

export function checkEndings(_s: State): void {
  // S4/S5 content sets s.ending; the ending panel renders when it is set.
}

export function buildRunStats(s: State): string[] {
  const st = s.milestones.stamps;
  const lines = [
    `ending: ${s.ending ?? 'none yet'}`,
    `${fmtDate(0)} → ${fmtDate(s.dateDays)} · ${fmtElapsed(s.t)}`,
    `tasks completed: ${fmtInt(s.res.tasks)}`,
    `peak tasks/s: ${fmtInt(s.stats.peakTasksPerSec)}`,
    ...s.stats.modelsTrained.map((m) => `${m.name}: capability ${m.capability.toFixed(1)}, score ${m.score ?? '—'}/40`),
  ];
  for (const k of Object.keys(st)) lines.push(`${k}: ${fmtElapsed(st[k])}`);
  return lines;
}
