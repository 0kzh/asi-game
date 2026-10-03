import { REG } from './registry.js';
import { canPay, costText, meets, pay } from './cost.js';
import { log } from './events.js';
import { canStartRun } from './models.js';
function ps(s, id) {
    let p = s.projects[id];
    if (!p) {
        p = { seen: false, bought: 0 };
        s.projects[id] = p;
    }
    return p;
}
export function projectCost(s, p) {
    return p.costFn ? p.costFn(s) : p.cost ?? {};
}
export function costLabel(s, p) {
    if (p.costLabel)
        return p.costLabel(s);
    return costText(projectCost(s, p), p.req);
}
export function isVisible(s, id) {
    const p = s.projects[id];
    return !!p && p.seen && !p.removed && (p.usesLeft ?? 1) > 0;
}
/** Visible projects in reveal order. */
export function visibleProjects(s) {
    const out = [];
    for (const id of s.projectOrder) {
        const p = REG.projectById[id];
        if (p && isVisible(s, id))
            out.push(p);
    }
    return out;
}
/** The projects column is shown once the first researcher is hired, or when a bail-out appears. */
export function projectsColumnVisible(s) {
    if (s.flags.projects)
        return true;
    return visibleProjects(s).some((p) => p.anytime);
}
export function canAfford(s, p) {
    if (!canPay(s, projectCost(s, p)))
        return false;
    if (!meets(s, p.req))
        return false;
    if (p.extraAfford && !p.extraAfford(s))
        return false;
    if (p.training && !canStartRun(s))
        return false;
    return true;
}
/** Visible, purchasable now (column unlocked or `anytime`) and affordable. */
export function canBuy(s, id) {
    const p = REG.projectById[id];
    if (!p || !isVisible(s, id))
        return false;
    if (!s.flags.projects && !p.anytime)
        return false;
    if (s.modal)
        return false;
    return canAfford(s, p);
}
/** Each slow tick: reveal every unseen project whose trigger holds. Logs nothing (the button is the announcement). */
export function checkProjects(s) {
    for (const p of REG.projects) {
        const st = ps(s, p.id);
        if (st.seen || st.removed)
            continue;
        if ((st.usesLeft ?? p.uses ?? 1) <= 0)
            continue;
        if (!p.trigger(s))
            continue;
        st.seen = true;
        if (st.usesLeft === undefined)
            st.usesLeft = p.uses ?? 1;
        if (!s.projectOrder.includes(p.id))
            s.projectOrder.push(p.id);
    }
}
export function markBought(s, id) {
    const p = REG.projectById[id];
    const st = ps(s, id);
    st.bought += 1;
    st.usesLeft = (st.usesLeft ?? p?.uses ?? 1) - 1;
    if (p?.retrigger && st.usesLeft > 0) {
        st.seen = false;
    }
    if (!isVisible(s, id))
        s.projectOrder = s.projectOrder.filter((x) => x !== id);
}
/** Click a project button. Training projects open the budget modal instead of paying. */
export function buyProject(s, id) {
    if (!canBuy(s, id))
        return false;
    const p = REG.projectById[id];
    if (p.training) {
        s.modal = { kind: 'training', projectId: id, budget: 0.5 };
        return true;
    }
    pay(s, projectCost(s, p));
    markBought(s, id);
    if (p.done)
        log(s, p.done);
    p.effect(s);
    return true;
}
/** Remove a project for good (siblings invalidated by another purchase; Paperclips lesson 43). */
export function removeProject(s, id) {
    const st = ps(s, id);
    st.removed = true;
    s.projectOrder = s.projectOrder.filter((x) => x !== id);
}
export function isBought(s, id) {
    return (s.projects[id]?.bought ?? 0) > 0;
}
/** Apply a project's effect as if bought, without paying (dev snapshots). */
export function applyProject(s, id) {
    const p = REG.projectById[id];
    if (!p)
        throw new Error(`unknown project ${id}`);
    const st = ps(s, id);
    st.seen = true;
    if (st.usesLeft === undefined)
        st.usesLeft = p.uses ?? 1;
    markBought(s, id);
    (p.snapshot ?? p.effect)(s);
}
//# sourceMappingURL=projects.js.map