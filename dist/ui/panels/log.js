import { LOG_MAX } from '../../core/events.js';
import { h } from '../dom.js';
let logEl;
let topKey = '';
let rendered = null; // identity of the log array last rendered
const key = (l) => `${l.t}|${l.text}`;
export function mount(root) {
    logEl = h('div', { id: 'log' });
    root.append(logEl, h('div', { id: 'logGradient' }));
}
function line(text, fade) {
    return h('div', { class: fade ? 'logLine fadein-slow' : 'logLine' }, text);
}
export function update(s) {
    const log = s.log;
    if (rendered !== log) {
        // New state object (load, snapshot): rebuild without animation.
        rendered = log;
        logEl.replaceChildren(...log.map((l) => line(l.text, false)));
        topKey = log.length ? key(log[0]) : '';
        return;
    }
    if (!log.length || key(log[0]) === topKey)
        return;
    const fresh = [];
    for (const l of log) {
        if (key(l) === topKey)
            break;
        fresh.push(l.text);
    }
    topKey = key(log[0]);
    for (let i = fresh.length - 1; i >= 0; i--)
        logEl.prepend(line(fresh[i], true));
    while (logEl.childElementCount > LOG_MAX)
        logEl.lastElementChild?.remove();
}
//# sourceMappingURL=log.js.map