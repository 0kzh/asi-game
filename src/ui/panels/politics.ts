// Government, public, security (S2+): a 1 px box titled `politics` (the ADR stores box
// look) under projects. Renders nothing until flags.politics (gov_briefing or the liaison).
import type { State } from '../../core/types.js';
import { theftChancePerMinute, securityLevel } from '../../core/politics.js';
import { h, setText, show } from '../dom.js';

type Key = 'gov' | 'opinion' | 'security';

let panel: HTMLElement;
const vals = {} as Record<Key, HTMLElement>;

function row(key: Key, label: string): HTMLElement {
  const val = h('div', { class: 'row_val' });
  vals[key] = val;
  return h('div', { class: 'storeRow', id: `pol_${key}` }, h('div', { class: 'row_key' }, label), val, h('div', { class: 'clear' }));
}

export function mount(root: HTMLElement): void {
  panel = h('div', { id: 'politics', class: 'box', 'data-legend': 'politics' },
    row('gov', 'government'), row('opinion', 'public'), row('security', 'security'));
  panel.hidden = true;
  root.append(panel);
}

function signed(n: number): string {
  const r = Math.round(n);
  return r > 0 ? `+${r}` : r < 0 ? `−${-r}` : '0';
}

export function update(s: State): void {
  show(panel, !!s.flags.politics);
  if (panel.hidden) return;
  setText(vals.gov, signed(s.pol.gov));
  setText(vals.opinion, `${Math.round(s.pol.opinion)} / 100`);
  const risk = theftChancePerMinute(s);
  setText(vals.security, `sl${securityLevel(s)}${s.stage === 2 && risk > 0 ? ` · ${(risk * 100).toFixed(risk < 0.01 ? 1 : 0)}%/min risk` : ''}`);
}
