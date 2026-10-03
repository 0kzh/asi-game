// Compute allocation (design.md §3.6, ADR workers panel). Renders nothing until
// flags.allocPanel; stage 2 content (the `alloc` project) adds the ±10% rows.
import type { State } from '../../core/types.js';
import { pct } from '../../core/format.js';
import { h, panelTitle, setText, show } from '../dom.js';

let panel: HTMLElement;
let body: HTMLElement;

export function mount(root: HTMLElement): void {
  body = h('div', { class: 'line small' });
  panel = h('div', { id: 'allocation', class: 'panel' }, panelTitle('allocation'), body);
  panel.hidden = true;
  root.append(panel);
}

export function update(s: State): void {
  show(panel, !!s.flags.allocPanel);
  if (panel.hidden) return;
  setText(body, `deployment ${pct(s.alloc.deploy)} · research ${pct(s.alloc.research)}${s.flags.evalSuite ? ` · safety ${pct(s.alloc.safety)}` : ''}`);
}
