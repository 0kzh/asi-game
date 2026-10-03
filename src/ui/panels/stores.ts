// The A Dark Room stores box: rows appear once and never leave; hover lists rates by source.
import type { State } from '../../core/types.js';
import { fmtData, fmtEnergy, fmtInt, fmtMoney } from '../../core/format.js';
import { agentSlots, powerCapacityGw, powerUsedGw, rateBreakdown } from '../../core/economy.js';
import { h, setText, show } from '../dom.js';

interface Row {
  key: string;
  label: string;
  visible: (s: State) => boolean;
  value: (s: State) => string;
  unit?: (n: number) => string;
}

const ROWS: Row[] = [
  { key: 'funds', label: 'funds', visible: () => true, value: (s) => fmtMoney(s.res.funds), unit: (n) => fmtMoney(n) },
  { key: 'energy', label: 'energy', visible: () => true, value: (s) => fmtEnergy(s.res.energy), unit: (n) => fmtEnergy(n) },
  { key: 'agents', label: 'agents', visible: (s) => !!s.flags.agentsRow, value: (s) => fmtInt(s.res.agents) },
  { key: 'compute', label: 'compute', visible: (s) => !!s.flags.gpuRow, value: (s) => `${fmtInt(s.res.gpus)} gpu${s.res.gpus === 1 ? '' : 's'} · ${fmtInt(agentSlots(s))} slots` },
  { key: 'headcount', label: 'headcount', visible: (s) => !!s.flags.lab, value: (s) => `${s.res.researchers + s.res.engineers} / ${s.res.headcount}` },
  { key: 'research', label: 'research', visible: (s) => !!s.flags.research, value: (s) => (s.flags.noResearchCap ? fmtInt(s.res.research) : `${fmtInt(s.res.research)} / ${fmtInt(s.caps.researchCap)}`), unit: (n) => n.toFixed(1) },
  { key: 'insight', label: 'insight', visible: (s) => !!s.flags.insight, value: (s) => fmtInt(s.res.insight), unit: (n) => n.toFixed(2) },
  { key: 'data', label: 'data', visible: (s) => !!s.flags.data, value: (s) => fmtData(s.res.data) },
  { key: 'power', label: 'power', visible: (s) => !!s.flags.power, value: (s) => `${powerUsedGw(s).toFixed(1)} / ${powerCapacityGw(s).toFixed(1)} GW` },
  { key: 'robots', label: 'robots', visible: (s) => !!s.flags.robots, value: (s) => fmtInt(s.res.robots) },
];

interface RowEls { row: HTMLElement; val: HTMLElement; tip: HTMLElement; tipKey: string }
const els: Record<string, RowEls> = {};
let box: HTMLElement;

export function mount(root: HTMLElement): void {
  box = h('div', { id: 'stores', 'data-legend': 'stores' });
  for (const r of ROWS) {
    const val = h('div', { class: 'row_val' });
    const tip = h('div', { class: 'tooltip bottom right' });
    const row = h('div', { class: 'storeRow', id: `row_${r.key}` }, h('div', { class: 'row_key' }, r.label), val, h('div', { class: 'clear' }), tip);
    row.hidden = true;
    els[r.key] = { row, val, tip, tipKey: '' };
    box.append(row);
  }
  root.append(box);
}

function sign(n: number, unit: (n: number) => string): string {
  return `${n >= 0 ? '+' : '−'}${unit(Math.abs(n))} per s`;
}

export function update(s: State): void {
  for (const r of ROWS) {
    const e = els[r.key];
    show(e.row, r.visible(s));
    if (e.row.hidden) continue;
    setText(e.val, r.value(s));
    const parts = rateBreakdown(s, r.key);
    const unit = r.unit ?? ((n: number) => (Math.abs(n) < 10 ? n.toFixed(1) : fmtInt(n)));
    const total = parts.reduce((a, [, v]) => a + v, 0);
    const k = parts.map(([n, v]) => `${n}:${unit(v)}`).join('|');
    if (k !== e.tipKey) {
      e.tipKey = k;
      e.tip.replaceChildren(
        ...parts.map(([n, v]) => h('div', { class: 'tipRow' }, h('div', { class: 'row_key' }, n), h('div', { class: 'row_val' }, sign(v, unit)))),
        ...(parts.length ? [h('div', { class: 'tipRow total' }, h('div', { class: 'row_key' }, 'total'), h('div', { class: 'row_val' }, sign(total, unit)))] : []),
      );
      e.row.classList.toggle('hasTip', parts.length > 0);
    }
  }
}
