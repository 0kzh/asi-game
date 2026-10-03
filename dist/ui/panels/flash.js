import { h, setText } from '../dom.js';
export const FLASH_MS = 3800;
let el;
let text;
let timer = null;
export function mount(root) {
    el = root;
    text = h('p', {});
    el.append(text);
    el.hidden = true;
}
export function play(label) {
    setText(text, label);
    el.hidden = false;
    el.dataset.plays = String(Number(el.dataset.plays ?? 0) + 1);
    if (timer !== null)
        clearTimeout(timer);
    timer = window.setTimeout(() => { el.hidden = true; timer = null; }, FLASH_MS);
}
export function update(s) {
    if (!s.flash)
        return;
    const label = s.flash;
    s.flash = '';
    play(label);
}
//# sourceMappingURL=flash.js.map