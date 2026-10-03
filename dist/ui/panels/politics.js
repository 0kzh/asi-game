import { theftChancePerMinute, securityLevel } from '../../core/politics.js';
import { h, setText, show } from '../dom.js';
let panel;
const vals = {};
function row(key, label) {
    const val = h('div', { class: 'row_val' });
    vals[key] = val;
    return h('div', { class: 'storeRow', id: `pol_${key}` }, h('div', { class: 'row_key' }, label), val, h('div', { class: 'clear' }));
}
export function mount(root) {
    panel = h('div', { id: 'politics', class: 'box', 'data-legend': 'politics' }, row('gov', 'government'), row('opinion', 'public'), row('security', 'security'));
    panel.hidden = true;
    root.append(panel);
}
function signed(n) {
    const r = Math.round(n);
    return r > 0 ? `+${r}` : r < 0 ? `−${-r}` : '0';
}
export function update(s) {
    // From the stats box on (S3), its government / public / security rows replace this box.
    show(panel, !!s.flags.politics && !s.flags.stats);
    if (panel.hidden)
        return;
    setText(vals.gov, signed(s.pol.gov));
    setText(vals.opinion, `${Math.round(s.pol.opinion)} / 100`);
    const risk = theftChancePerMinute(s);
    setText(vals.security, `sl${securityLevel(s)}${s.stage === 2 && risk > 0 ? ` · ${(risk * 100).toFixed(risk < 0.01 ? 1 : 0)}%/min risk` : ''}`);
}
//# sourceMappingURL=politics.js.map