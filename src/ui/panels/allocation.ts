// Compute allocation (design.md §3.6, ADR workers panel): rows directly under compute,
// `deployment [−][+] 70%`, `research [−][+] 30%`, and `safety [−][+]` once `eval_suite` is
// bought. ±10% per click, always summing to 100. Renders nothing until flags.allocPanel.
import type { State } from '../../core/types.js';
import { fmtInt, pct } from '../../core/format.js';
import { aiResearchPerSec, safetyInsightPerSec } from '../../core/economy.js';
import { actionButton, h, setText, show, syncAction } from '../dom.js';

type Row = 'deploy' | 'research' | 'safety';
const LABEL: Record<Row, string> = { deploy: 'deployment', research: 'research', safety: 'safety' };

let panel: HTMLElement;
let note: HTMLElement;
const rows = {} as Record<Row, { el: HTMLElement; val: HTMLElement; dn: HTMLButtonElement; up: HTMLButtonElement }>;

export function mount(root: HTMLElement): void {
  panel = h('div', { id: 'allocation', class: 'panel', style: 'margin-top:-8px' });
  for (const r of ['deploy', 'research', 'safety'] as Row[]) {
    const val = h('span', { style: 'display:inline-block;width:40px;text-align:right' });
    const dn = actionButton(`alloc_${r}_down`, '−');
    const up = actionButton(`alloc_${r}_up`, '+');
    const el = h('div', { class: 'line allocRow', id: `alloc_${r}`, style: 'display:flex;align-items:center;gap:4px' },
      h('span', { style: 'flex:1' }, LABEL[r]), dn, up, val);
    rows[r] = { el, val, dn, up };
    panel.append(el);
  }
  note = h('div', { class: 'line small' });
  panel.append(note);
  panel.hidden = true;
  root.append(panel);
}

export function update(s: State): void {
  show(panel, !!s.flags.allocPanel);
  if (panel.hidden) return;
  for (const r of ['deploy', 'research', 'safety'] as Row[]) {
    const e = rows[r];
    show(e.el, r !== 'safety' || !!s.flags.evalSuite);
    if (e.el.hidden) continue;
    setText(e.val, pct(s.alloc[r]));
    syncAction(e.dn, s);
    syncAction(e.up, s);
  }
  const onResearch = Math.floor(s.res.agents * s.alloc.research);
  let text: string;
  if (!s.flags.aiRd) {
    text = s.alloc.research > 0 ? 'copies on research produce nothing yet.' : 'copies run the task loop. research needs agents in the loop.';
  } else {
    const human = Math.max(1, s.res.researchers);
    const mult = 1 + aiResearchPerSec(s) / human;
    text = `${fmtInt(onResearch)} copies on research · r&d multiplier ×${mult < 10 ? mult.toFixed(1) : fmtInt(mult)}`;
    if (s.alloc.safety > 0) text += ` · +${safetyInsightPerSec(s).toFixed(2)} insight/s`;
  }
  setText(note, text);
}
