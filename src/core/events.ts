// The log, the ambient scheduler, choice modals and set-piece arming.
import type { AmbientEvent, Choice, State } from './types.js';
import { REG } from './registry.js';
import { between, pick, rand } from './rng.js';
import { canPay, pay } from './cost.js';

export const LOG_MAX = 60;

/** Append a line (newest first). Adds the full stop if missing (ADR notifications.js). */
export function log(s: State, text: string): void {
  let t = text.trim();
  if (!t) return;
  if (!/[.?!…]['"”’)]?$/.test(t)) t += '.';
  s.log.unshift({ t: s.t, text: t });
  if (s.log.length > LOG_MAX) s.log.length = LOG_MAX;
}

// ------------------------------------------------------------------ choice modals

export function openChoice(s: State, eventId: string, sceneId = 'start'): void {
  const ev = REG.events[eventId];
  if (!ev) throw new Error(`unknown event ${eventId}`);
  const scene = ev.scenes[sceneId];
  if (!scene) throw new Error(`unknown scene ${eventId}/${sceneId}`);
  s.modal = { kind: 'choice', eventId, sceneId };
  scene.onEnter?.(s);
}

export function currentScene(s: State) {
  if (!s.modal || s.modal.kind !== 'choice') return null;
  const ev = REG.events[s.modal.eventId];
  if (!ev) return null;
  const scene = ev.scenes[s.modal.sceneId];
  if (!scene) return null;
  return { ev, scene };
}

export function sceneText(s: State): string {
  const cur = currentScene(s);
  if (!cur) return '';
  return typeof cur.scene.text === 'function' ? cur.scene.text(s) : cur.scene.text;
}

export function choiceEnabled(s: State, c: Choice): boolean {
  if (c.available && !c.available(s)) return false;
  return !c.cost || canPay(s, c.cost);
}

function resolveNext(s: State, next: Choice['next']): string | undefined {
  if (next === undefined) return undefined;
  if (typeof next === 'string') return next;
  const r = rand(s);
  const keys = Object.keys(next).map(Number).sort((a, b) => a - b);
  for (const k of keys) if (r < k) return next[k];
  return next[keys[keys.length - 1]];
}

/** Pick choice `idx` of the open scene. Returns false if not allowed. */
export function choose(s: State, idx: number): boolean {
  const cur = currentScene(s);
  if (!cur) return false;
  const c = cur.scene.choices[idx];
  if (!c || !choiceEnabled(s, c)) return false;
  if (c.cost) pay(s, c.cost);
  s.stats.choices.push({
    eventId: cur.ev.id,
    choice: c.text,
    alt: cur.scene.choices.filter((x) => x !== c).map((x) => x.text),
  });
  c.effect?.(s);
  if (c.log) log(s, c.log);
  const next = resolveNext(s, c.next);
  if (next && s.modal && s.modal.kind === 'choice') {
    openChoice(s, cur.ev.id, next);
  } else if (s.modal && s.modal.kind === 'choice' && s.modal.eventId === cur.ev.id) {
    s.modal = null;
  }
  return true;
}

// ------------------------------------------------------------------ ambient scheduler

function fireAmbient(s: State, ev: AmbientEvent): void {
  s.timed[`amb:${ev.id}`] = s.t + 300; // no repeat within 5 minutes
  if (ev.choice) {
    openChoice(s, ev.choice);
    return;
  }
  if (ev.text) log(s, ev.text);
  ev.effect?.(s);
}

/** One timer: every 45–90 s pick uniformly among available events of the current stage. */
export function ambientTick(s: State): void {
  if (s.t < s.ambientAt) return;
  s.ambientAt = s.t + between(s, 45, 90);
  const pool = REG.ambient.filter(
    (e) => e.stage === s.stage && e.isAvailable(s) && !(e.choice && s.modal) && !((s.timed[`amb:${e.id}`] ?? 0) > s.t),
  );
  if (!pool.length) return;
  fireAmbient(s, pick(s, pool));
}

/** Fire an ambient event or set piece or choice event by id (dev). */
export function fireById(s: State, id: string): boolean {
  const sp = REG.setpieceById[id];
  if (sp) { fireSetPiece(s, id); return true; }
  const amb = REG.ambient.find((e) => e.id === id);
  if (amb) { fireAmbient(s, amb); return true; }
  if (REG.events[id]) { openChoice(s, id); return true; }
  return false;
}

// ------------------------------------------------------------------ set pieces

/** Arm a set piece to fire `delay` sim seconds from now. Survives reload (state.queue). */
export function armSetPiece(s: State, id: string, delay: number): void {
  if (s.flags[`armed:${id}`]) return;
  s.flags[`armed:${id}`] = true;
  s.queue.push({ eventId: id, at: s.t + delay });
}

export function fireSetPiece(s: State, id: string): void {
  const sp = REG.setpieceById[id];
  if (!sp) return;
  s.flags[`armed:${id}`] = true;
  s.flags[`fired:${id}`] = true;
  if (sp.fire) sp.fire(s);
  if (sp.choice) openChoice(s, sp.choice);
}

/** Slow tick: arm set pieces whose condition holds; fire due ones (choice ones wait for the modal). */
export function setPieceTick(s: State): void {
  for (const sp of REG.setpieces) {
    if (sp.arm && !s.flags[`armed:${sp.id}`] && sp.stage <= s.stage && sp.arm(s)) {
      armSetPiece(s, sp.id, sp.delay ? sp.delay(s) : 0);
    }
  }
  if (!s.queue.length) return;
  const keep: typeof s.queue = [];
  const due = s.queue.filter((q) => q.at <= s.t);
  for (const q of s.queue) if (q.at > s.t) keep.push(q);
  s.queue = keep;
  for (const q of due) {
    const sp = REG.setpieceById[q.eventId];
    if (sp?.choice && s.modal) { s.queue.push({ eventId: q.eventId, at: s.t + 1 }); continue; }
    fireSetPiece(s, q.eventId);
  }
}
