import { freeHeadcount } from '../../core/economy.js';
import { actionButton, h, panelTitle, setText, show, syncAction } from '../dom.js';
let panel;
let headVal;
let staffVal;
let resBtn;
let engBtn;
export function mount(root) {
    headVal = h('div', { class: 'line' });
    resBtn = actionButton('hire_researcher', 'hire researcher');
    engBtn = actionButton('hire_engineer', 'hire engineer');
    staffVal = h('div', { class: 'line small' });
    panel = h('div', { id: 'lab', class: 'panel' }, panelTitle('lab'), headVal, h('div', { class: 'line' }, resBtn, ' ', engBtn), staffVal);
    panel.hidden = true;
    root.append(panel);
}
export function update(s) {
    show(panel, !!s.flags.lab);
    if (panel.hidden)
        return;
    const free = freeHeadcount(s);
    setText(headVal, `headcount ${s.res.researchers + s.res.engineers} / ${s.res.headcount}${free > 0 ? ` (${free} to place)` : ''}`);
    syncAction(resBtn, s);
    syncAction(engBtn, s);
    setText(staffVal, `researchers ${s.res.researchers} (+1 research/s each) · engineers ${s.res.engineers} (+250 cap, +2% agents/gpu each)`);
}
//# sourceMappingURL=lab.js.map