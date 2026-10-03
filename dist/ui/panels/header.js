import { fmtDate, fmtElapsed, fmtInt, fmtRate } from '../../core/format.js';
import { h, setText } from '../dom.js';
let tasksEl;
let rateEl;
let dateEl;
let elapsedEl;
let hintEl;
export function mount(root) {
    tasksEl = h('h2', { id: 'tasksHeader' }, 'Tasks Completed: 0');
    rateEl = h('span', { id: 'rate' });
    dateEl = h('span', { id: 'date' });
    elapsedEl = h('span', { id: 'elapsed' });
    hintEl = h('div', { id: 'hint' });
    root.append(tasksEl, h('div', { id: 'clock' }, rateEl, dateEl, ' · ', elapsedEl), hintEl);
}
export function update(s) {
    setText(tasksEl, `Tasks Completed: ${fmtInt(s.res.tasks)}`);
    // tasks/s, smoothed over 1 s (Paperclips clipRate), once the agents exist.
    setText(rateEl, s.flags.agentsRow ? `${fmtRate(s.rates.tasksPerSec, ' tasks/s')} · ` : '');
    setText(dateEl, fmtDate(s.dateDays));
    setText(elapsedEl, fmtElapsed(s.t));
    setText(hintEl, s.hint || ' ');
}
//# sourceMappingURL=header.js.map