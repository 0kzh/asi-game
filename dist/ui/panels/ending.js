import { buildRunStats } from '../../core/endings.js';
import { h, show } from '../dom.js';
let screen;
let shown = false;
export function mount(root) {
    screen = h('div', { id: 'ending' });
    screen.hidden = true;
    root.append(screen);
}
export function update(s) {
    const on = !!s.ending;
    show(screen, on);
    document.body.classList.toggle('ended', on);
    if (on && !shown) {
        shown = true;
        screen.replaceChildren(...buildRunStats(s).map((l) => h('div', { class: 'statLine' }, l)));
    }
    if (!on)
        shown = false;
}
//# sourceMappingURL=ending.js.map