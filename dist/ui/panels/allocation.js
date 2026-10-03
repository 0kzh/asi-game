import { fmtInt, fmtMult, pct } from '../../core/format.js';
import { rdMultiplier, safetyInsightPerSec } from '../../core/economy.js';
import { actionButton, h, setText, show, syncAction } from '../dom.js';
const LABEL = { deploy: 'deployment', research: 'research', safety: 'safety' };
let panel;
let note;
const rows = {};
export function mount(root) {
    panel = h('div', { id: 'allocation', class: 'panel', style: 'margin-top:-8px' });
    for (const r of ['deploy', 'research', 'safety']) {
        const val = h('span', { style: 'display:inline-block;width:40px;text-align:right' });
        const dn = actionButton(`alloc_${r}_down`, '−');
        const up = actionButton(`alloc_${r}_up`, '+');
        const el = h('div', { class: 'line allocRow', id: `alloc_${r}`, style: 'display:flex;align-items:center;gap:4px' }, h('span', { style: 'flex:1' }, LABEL[r]), dn, up, val);
        rows[r] = { el, val, dn, up };
        panel.append(el);
    }
    note = h('div', { class: 'line small' });
    panel.append(note);
    panel.hidden = true;
    root.append(panel);
}
export function update(s) {
    show(panel, !!s.flags.allocPanel);
    if (panel.hidden)
        return;
    for (const r of ['deploy', 'research', 'safety']) {
        const e = rows[r];
        show(e.el, r !== 'safety' || !!s.flags.evalSuite);
        if (e.el.hidden)
            continue;
        setText(e.val, pct(s.alloc[r]));
        syncAction(e.dn, s);
        syncAction(e.up, s);
    }
    const onResearch = Math.floor(s.res.agents * s.alloc.research);
    let text;
    if (!s.flags.aiRd) {
        text = s.alloc.research > 0 ? 'copies on research produce nothing yet.' : 'copies run the task loop. research needs agents in the loop.';
    }
    else {
        text = `${fmtInt(onResearch)} copies on research · r&d multiplier ${fmtMult(rdMultiplier(s))}`;
        if (s.alloc.safety > 0)
            text += ` · +${safetyInsightPerSec(s).toFixed(2)} insight/s`;
    }
    setText(note, text);
}
//# sourceMappingURL=allocation.js.map