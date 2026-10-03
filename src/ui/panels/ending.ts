// End-of-run screen (design.md §8.3): replaces the page with one 500 px column.
import type { State } from '../../core/types.js';
import { buildRunStats } from '../../core/endings.js';
import { h, show } from '../dom.js';

let screen: HTMLElement;
let shown = false;

export function mount(root: HTMLElement): void {
  screen = h('div', { id: 'ending' });
  screen.hidden = true;
  root.append(screen);
}

export function update(s: State): void {
  const on = !!s.ending;
  show(screen, on);
  document.body.classList.toggle('ended', on);
  if (on && !shown) {
    shown = true;
    screen.replaceChildren(...buildRunStats(s).map((l) => h('div', { class: 'statLine' }, l)));
  }
  if (!on) shown = false;
}
