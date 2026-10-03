// The log column: newest on top, 500 ms fade-in, at most 60 lines, bottom gradient (ADR).
import type { State } from '../../core/types.js';
import { LOG_MAX } from '../../core/events.js';
import { h } from '../dom.js';

let logEl: HTMLElement;
let topKey = '';
let rendered: unknown = null; // identity of the log array last rendered

const key = (l: { t: number; text: string }) => `${l.t}|${l.text}`;

export function mount(root: HTMLElement): void {
  logEl = h('div', { id: 'log' });
  root.append(logEl, h('div', { id: 'logGradient' }));
}

function line(text: string, fade: boolean): HTMLElement {
  return h('div', { class: fade ? 'logLine fadein-slow' : 'logLine' }, text);
}

export function update(s: State): void {
  const log = s.log;
  if (rendered !== log) {
    // New state object (load, snapshot): rebuild without animation.
    rendered = log;
    logEl.replaceChildren(...log.map((l) => line(l.text, false)));
    topKey = log.length ? key(log[0]) : '';
    return;
  }
  if (!log.length || key(log[0]) === topKey) return;
  const fresh: string[] = [];
  for (const l of log) {
    if (key(l) === topKey) break;
    fresh.push(l.text);
  }
  topKey = key(log[0]);
  for (let i = fresh.length - 1; i >= 0; i--) logEl.prepend(line(fresh[i], true));
  while (logEl.childElementCount > LOG_MAX) logEl.lastElementChild?.remove();
}
