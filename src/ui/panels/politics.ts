// Government, public, security (S2+). Renders nothing until flags.politics.
import type { State } from '../../core/types.js';
import { h, setText, show } from '../dom.js';

let panel: HTMLElement;
let body: HTMLElement;

export function mount(root: HTMLElement): void {
  body = h('div', { class: 'line small' });
  panel = h('div', { id: 'politics', class: 'box', 'data-legend': 'politics' }, body);
  panel.hidden = true;
  root.append(panel);
}

export function update(s: State): void {
  show(panel, !!s.flags.politics);
  if (panel.hidden) return;
  setText(body, `government ${Math.round(s.pol.gov)} · public ${Math.round(s.pol.opinion)} · security sl${s.pol.security}`);
}
