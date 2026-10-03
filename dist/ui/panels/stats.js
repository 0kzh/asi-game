import { fmtInt } from '../../core/format.js';
import { agentSlots, aiResearchPerSec, powerCapacityGw, powerUsedGw } from '../../core/economy.js';
import { agentSpeed } from '../../core/models.js';
import { rivalGapMonths } from '../../core/takeoff.js';
import { h, setText, show } from '../dom.js';
/** 1 + aiResearch / humanResearch, shown 1.0× … 2,000× (capped for display). */
export function rdMultiplier(s) {
    return 1 + aiResearchPerSec(s) / Math.max(1, s.res.researchers);
}
function fmtMult(x) {
    return x < 10 ? `${x.toFixed(1)}×` : `${fmtInt(Math.min(2000, x))}×`;
}
function gapText(s) {
    const m = Math.round(rivalGapMonths(s));
    if (m === 0)
        return 'level';
    const n = Math.abs(m);
    return `${n} month${n === 1 ? '' : 's'} ${m > 0 ? 'behind' : 'ahead'}`;
}
const ROWS = [
    { key: 'rd', label: 'r&d multiplier', value: (s) => fmtMult(rdMultiplier(s)) },
    { key: 'security', label: 'security', value: (s) => `sl${s.pol.security}` },
    { key: 'gov', label: 'government', value: (s) => `${Math.round(s.pol.gov)}` },
    { key: 'public', label: 'public', value: (s) => `${Math.round(s.pol.opinion)}` },
    { key: 'rival', label: 'deepcent', value: gapText },
    { key: 'jobs', label: 'jobs displaced', value: (s) => `${s.pol.jobsDisplaced.toFixed(1)}M` },
    { key: 'power', label: 'power', value: (s) => `${powerUsedGw(s).toFixed(1)} / ${powerCapacityGw(s).toFixed(1)} GW` },
    { key: 'alignment', label: 'alignment', visible: (s) => !!s.flags.interp1, value: (s) => `${Math.round(s.model.alignment)}` },
];
let panel;
let copies;
const vals = {};
export function mount(root) {
    copies = h('div', { class: 'statsCopies' });
    const rows = ROWS.map((r) => {
        const val = h('div', { class: 'row_val' });
        const row = h('div', { class: 'storeRow', id: `stat_${r.key}` }, h('div', { class: 'row_key' }, r.label), val, h('div', { class: 'clear' }));
        vals[r.key] = { row, val };
        return row;
    });
    panel = h('div', { id: 'stats', class: 'box', 'data-legend': 'stats' }, copies, ...rows);
    panel.hidden = true;
    root.append(panel);
}
export function update(s) {
    show(panel, !!s.flags.stats);
    if (panel.hidden)
        return;
    const n = Math.min(s.res.agents, agentSlots(s));
    setText(copies, `${fmtInt(n)} copies at ${fmtInt(Math.max(1, Math.round(agentSpeed(s))))}× human speed`);
    for (const r of ROWS) {
        const e = vals[r.key];
        const on = r.visible ? r.visible(s) : true;
        show(e.row, on);
        if (on)
            setText(e.val, r.value(s));
    }
}
//# sourceMappingURL=stats.js.map