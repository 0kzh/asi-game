import { h, setText, show } from '../dom.js';
let panel;
let body;
export function mount(root) {
    body = h('div', { class: 'line small' });
    panel = h('div', { id: 'politics', class: 'box', 'data-legend': 'politics' }, body);
    panel.hidden = true;
    root.append(panel);
}
export function update(s) {
    show(panel, !!s.flags.politics);
    if (panel.hidden)
        return;
    setText(body, `government ${Math.round(s.pol.gov)} · public ${Math.round(s.pol.opinion)} · security sl${s.pol.security}`);
}
//# sourceMappingURL=politics.js.map