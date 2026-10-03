import { getAction } from '../core/actions.js';
export function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === false)
            continue;
        if (typeof v === 'function')
            el.addEventListener(k.replace(/^on/, ''), v);
        else if (k === 'class')
            el.className = String(v);
        else if (v === true)
            el.setAttribute(k, '');
        else
            el.setAttribute(k, String(v));
    }
    for (const c of children)
        if (c !== null && c !== undefined && c !== false)
            el.append(c);
    return el;
}
/** Only writes textContent when it changed. */
export function setText(el, text) {
    if (el.textContent !== text)
        el.textContent = text;
}
/** Sticky reveal: re-asserted every frame; the first time an element appears it fades in. */
export function show(el, on) {
    const hidden = el.hidden;
    if (on && hidden) {
        el.hidden = false;
        if (!el.dataset.seen) {
            el.dataset.seen = '1';
            el.classList.remove('fadein');
            void el.offsetWidth;
            el.classList.add('fadein');
        }
    }
    else if (!on && !hidden) {
        el.hidden = true;
    }
}
export function setDisabled(el, disabled) {
    if (el.disabled !== disabled)
        el.disabled = disabled;
}
export function setAttr(el, name, value) {
    if (value === null) {
        if (el.hasAttribute(name))
            el.removeAttribute(name);
    }
    else if (el.getAttribute(name) !== value) {
        el.setAttribute(name, value);
    }
}
/** UI-wide hooks set by main.ts. */
export const ui = {
    act: (_id) => false,
    state: () => { throw new Error('ui not mounted'); },
};
/** A <button data-action="id"> bound to a core action. */
export function actionButton(id, label, cls = 'button2') {
    const b = h('button', { class: cls, 'data-action': id, type: 'button' }, label);
    b.addEventListener('click', () => { ui.act(id); });
    return b;
}
/** Re-assert visibility and disabled for an action button from state. */
export function syncAction(b, s, label) {
    const a = getAction(b.dataset.action ?? '');
    if (!a) {
        setDisabled(b, true);
        return;
    }
    show(b, a.visible(s));
    setDisabled(b, !a.enabled(s));
    if (label !== undefined)
        setText(b, label);
}
/** A bold panel title over an inset hr (Paperclips). */
export function panelTitle(text) {
    const d = h('div', { class: 'panelTitle' }, h('b', {}, text), h('hr'));
    return d;
}
/** Paperclips' 30 ms blink, 12 flickers. */
export function blink(el) {
    let n = 0;
    const iv = setInterval(() => {
        el.style.visibility = el.style.visibility === 'hidden' ? 'visible' : 'hidden';
        if (++n >= 12) {
            clearInterval(iv);
            el.style.visibility = 'visible';
        }
    }, 30);
}
//# sourceMappingURL=dom.js.map