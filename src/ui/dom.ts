// Tiny DOM helpers: element builder, text diffing, sticky show/hide with fade-in,
// and action buttons bound to core action ids.
import type { State } from '../core/types.js';
import { getAction } from '../core/actions.js';

type Attrs = Record<string, string | number | boolean | undefined | ((e: Event) => void)>;
type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, ''), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

/** Only writes textContent when it changed. */
export function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

/** Sticky reveal: re-asserted every frame; the first time an element appears it fades in. */
export function show(el: HTMLElement, on: boolean): void {
  const hidden = el.hidden;
  if (on && hidden) {
    el.hidden = false;
    if (!el.dataset.seen) {
      el.dataset.seen = '1';
      el.classList.remove('fadein');
      void el.offsetWidth;
      el.classList.add('fadein');
    }
  } else if (!on && !hidden) {
    el.hidden = true;
  }
}

export function setDisabled(el: HTMLButtonElement, disabled: boolean): void {
  if (el.disabled !== disabled) el.disabled = disabled;
}

export function setAttr(el: HTMLElement, name: string, value: string | null): void {
  if (value === null) {
    if (el.hasAttribute(name)) el.removeAttribute(name);
  } else if (el.getAttribute(name) !== value) {
    el.setAttribute(name, value);
  }
}

/** UI-wide hooks set by main.ts. */
export const ui = {
  act: (_id: string): boolean => false,
  state: (): State => { throw new Error('ui not mounted'); },
};

/** A <button data-action="id"> bound to a core action. */
export function actionButton(id: string, label: string, cls = 'button2'): HTMLButtonElement {
  const b = h('button', { class: cls, 'data-action': id, type: 'button' }, label);
  b.addEventListener('click', () => { ui.act(id); });
  return b;
}

/** Re-assert visibility and disabled for an action button from state. */
export function syncAction(b: HTMLButtonElement, s: State, label?: string): void {
  const a = getAction(b.dataset.action ?? '');
  if (!a) { setDisabled(b, true); return; }
  show(b, a.visible(s));
  setDisabled(b, !a.enabled(s));
  if (label !== undefined) setText(b, label);
}

/** A bold panel title over an inset hr (Paperclips). */
export function panelTitle(text: string): HTMLElement {
  const d = h('div', { class: 'panelTitle' }, h('b', {}, text), h('hr'));
  return d;
}

/** Paperclips' 30 ms blink, 12 flickers. */
export function blink(el: HTMLElement): void {
  let n = 0;
  const iv = setInterval(() => {
    el.style.visibility = el.style.visibility === 'hidden' ? 'visible' : 'hidden';
    if (++n >= 12) { clearInterval(iv); el.style.visibility = 'visible'; }
  }, 30);
}
