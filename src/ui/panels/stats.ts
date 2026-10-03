// Copies × speed, r&d multiplier, rival, power (S3+). Renders nothing until flags.stats.
import type { State } from '../../core/types.js';
import { h, setText, show } from '../dom.js';

let panel: HTMLElement;
let body: HTMLElement;

export function mount(root: HTMLElement): void {
  body = h('div', { class: 'line small' });
  panel = h('div', { id: 'stats', class: 'box', 'data-legend': 'stats' }, body);
  panel.hidden = true;
  root.append(panel);
}

export function update(s: State): void {
  show(panel, !!s.flags.stats);
  if (panel.hidden) return;
  setText(body, `${s.res.agents.toLocaleString('en-US')} copies · ${s.rival.name} ${s.rival.capability.toFixed(1)}`);
}
