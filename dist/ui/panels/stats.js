import { h, setText, show } from '../dom.js';
let panel;
let body;
export function mount(root) {
    body = h('div', { class: 'line small' });
    panel = h('div', { id: 'stats', class: 'box', 'data-legend': 'stats' }, body);
    panel.hidden = true;
    root.append(panel);
}
export function update(s) {
    show(panel, !!s.flags.stats);
    if (panel.hidden)
        return;
    setText(body, `${s.res.agents.toLocaleString('en-US')} copies · ${s.rival.name} ${s.rival.capability.toFixed(1)}`);
}
//# sourceMappingURL=stats.js.map