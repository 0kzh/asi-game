import { fmtDate, fmtElapsed, fmtInt } from '../../core/format.js';
import { h, setText } from '../dom.js';
let tasksEl;
let dateEl;
let elapsedEl;
let hintEl;
export function mount(root) {
    tasksEl = h('h2', { id: 'tasksHeader' }, 'Tasks Completed: 0');
    dateEl = h('span', { id: 'date' });
    elapsedEl = h('span', { id: 'elapsed' });
    hintEl = h('div', { id: 'hint' });
    root.append(tasksEl, h('div', { id: 'clock' }, dateEl, ' · ', elapsedEl), hintEl);
}
export function update(s) {
    setText(tasksEl, `Tasks Completed: ${fmtInt(s.res.tasks)}`);
    setText(dateEl, fmtDate(s.dateDays));
    setText(elapsedEl, fmtElapsed(s.t));
    setText(hintEl, s.hint || ' ');
}
//# sourceMappingURL=header.js.map