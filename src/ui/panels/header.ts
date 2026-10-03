// "Tasks Completed: N", the date, elapsed time, and the hint line.
import type { State } from '../../core/types.js';
import { fmtDate, fmtElapsed, fmtInt } from '../../core/format.js';
import { h, setText } from '../dom.js';

let tasksEl: HTMLElement;
let dateEl: HTMLElement;
let elapsedEl: HTMLElement;
let hintEl: HTMLElement;

export function mount(root: HTMLElement): void {
  tasksEl = h('h2', { id: 'tasksHeader' }, 'Tasks Completed: 0');
  dateEl = h('span', { id: 'date' });
  elapsedEl = h('span', { id: 'elapsed' });
  hintEl = h('div', { id: 'hint' });
  root.append(tasksEl, h('div', { id: 'clock' }, dateEl, ' · ', elapsedEl), hintEl);
}

export function update(s: State): void {
  setText(tasksEl, `Tasks Completed: ${fmtInt(s.res.tasks)}`);
  setText(dateEl, fmtDate(s.dateDays));
  setText(elapsedEl, fmtElapsed(s.t));
  setText(hintEl, s.hint || ' ');
}
