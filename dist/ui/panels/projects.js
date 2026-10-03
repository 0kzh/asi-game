import { canAfford, costLabel, projectsColumnVisible, visibleProjects } from '../../core/projects.js';
import { REG } from '../../core/registry.js';
import { blink, h, panelTitle, setDisabled, setText, show, ui } from '../dom.js';
let panel;
let list;
const buttons = new Map();
let firstRender = true;
export function mount(root) {
    list = h('div', { id: 'projectList' });
    panel = h('div', { id: 'projects', class: 'panel' }, panelTitle('projects'), list);
    panel.hidden = true;
    root.append(panel);
}
function make(id) {
    const p = REG.projectById[id];
    const cost = h('span', { class: 'cost' });
    const btn = h('button', { class: 'projectButton', 'data-id': id, 'data-action': `project:${id}`, type: 'button' }, h('b', {}, p.title), ' ', cost, h('div'), p.desc);
    btn.addEventListener('click', () => { ui.act(`project:${id}`); });
    return { btn, cost };
}
export function update(s) {
    show(panel, projectsColumnVisible(s));
    const vis = visibleProjects(s);
    const ids = new Set(vis.map((p) => p.id));
    for (const [id, e] of buttons)
        if (!ids.has(id)) {
            e.btn.remove();
            buttons.delete(id);
        }
    let prev = null;
    for (const p of vis) {
        let e = buttons.get(p.id);
        if (!e) {
            e = make(p.id);
            buttons.set(p.id, e);
            if (!firstRender && !panel.hidden)
                blink(e.btn);
        }
        const want = prev ? prev.nextElementSibling : list.firstElementChild;
        if (want !== e.btn)
            list.insertBefore(e.btn, want);
        prev = e.btn;
        const label = costLabel(s, p);
        setText(e.cost, label ? `(${label})` : '');
        setDisabled(e.btn, !canAfford(s, p) || (!s.flags.projects && !p.anytime));
    }
    firstRender = false;
}
/** Forget DOM state (state object replaced). */
export function reset() {
    for (const e of buttons.values())
        e.btn.remove();
    buttons.clear();
    firstRender = true;
}
//# sourceMappingURL=projects.js.map