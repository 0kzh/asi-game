// Stage transitions and the date (architecture.md "Date").
import type { StageId, State } from './types.js';
import { REG } from './registry.js';
import { log } from './events.js';

export function stageOf(s: State) {
  const st = REG.stages[s.stage];
  if (!st) throw new Error(`stage ${s.stage} not registered`);
  return st;
}

/** Log the leaving stage's exit line, switch, run the new stage's enter(). */
export function enterStage(s: State, id: StageId): void {
  if (id === s.stage && s.flags[`stage${id}`]) return;
  const prev = REG.stages[s.stage];
  if (prev && id !== s.stage) log(s, prev.exitLine(s));
  s.stage = id;
  const next = stageOf(s);
  s.dateDays = Math.max(s.dateDays, next.startDay);
  s.flags[`stage${id}`] = true;
  s.flash = ''; // a pending flash belongs to the stage it was set in
  next.enter(s);
}

export function checkStageTransition(s: State): void {
  const st = stageOf(s);
  const to = st.exit?.(s);
  if (to && to !== s.stage) enterStage(s, to);
}

/** dateDays = max(prev + dt/15, lerp(start, end, progress)): monotonic, never frozen. */
export function dateTick(s: State, dt: number): void {
  const st = stageOf(s);
  const p = Math.max(0, Math.min(1, st.progress(s)));
  const target = st.startDay + p * (st.endDay - st.startDay);
  s.dateDays = Math.max(s.dateDays + dt / 15, target);
}

/** Days from 2025-07-01 to the first of the given month. */
export function dayOf(year: number, month1: number): number {
  return Math.round((Date.UTC(year, month1 - 1, 1) - Date.UTC(2025, 6, 1)) / 86400000);
}
