import { pct } from '../../core/format.js';
import { h, panelTitle, setText, show } from '../dom.js';
let panel;
let body;
export function mount(root) {
    body = h('div', { class: 'line small' });
    panel = h('div', { id: 'allocation', class: 'panel' }, panelTitle('allocation'), body);
    panel.hidden = true;
    root.append(panel);
}
export function update(s) {
    show(panel, !!s.flags.allocPanel);
    if (panel.hidden)
        return;
    setText(body, `deployment ${pct(s.alloc.deploy)} · research ${pct(s.alloc.research)}${s.flags.evalSuite ? ` · safety ${pct(s.alloc.safety)}` : ''}`);
}
//# sourceMappingURL=allocation.js.map