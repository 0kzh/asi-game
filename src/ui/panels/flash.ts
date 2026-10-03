// The one black full-screen flash per stage boundary (Paperclips' HypnoDrone banner):
// 150 px white Helvetica on black for 3.8 s. Content sets s.flash; this panel plays it and
// clears it. render.ts also routes a stage's `flash` text through play().
import type { State } from '../../core/types.js';
import { h, setText } from '../dom.js';

export const FLASH_MS = 3800;

let el: HTMLElement;
let text: HTMLElement;
let timer: number | null = null;

export function mount(root: HTMLElement): void {
  el = root;
  text = h('p', {});
  el.append(text);
  el.hidden = true;
}

export function play(label: string): void {
  setText(text, label);
  el.hidden = false;
  el.dataset.plays = String(Number(el.dataset.plays ?? 0) + 1);
  if (timer !== null) clearTimeout(timer);
  timer = window.setTimeout(() => { el.hidden = true; timer = null; }, FLASH_MS);
}

export function update(s: State): void {
  if (!s.flash) return;
  const label = s.flash;
  s.flash = '';
  play(label);
}
