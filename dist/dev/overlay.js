import { affordableActions, isIdle } from '../core/actions.js';
import { fireById } from '../core/events.js';
import { finishTraining } from '../core/models.js';
import { canAfford, costLabel, isVisible } from '../core/projects.js';
import { REG } from '../core/registry.js';
import { deserialize, exportString, importString, newState, serialize } from '../core/state.js';
import { buildSnapshot, SNAPSHOT_IDS } from './snapshots.js';
import { h } from '../ui/dom.js';
export function createGameApi(engine, hooks) {
    const swap = (s) => { engine.setState(s); hooks.render(s); };
    const api = {
        get state() { return engine.state; },
        engine,
        dev: {
            jumpToStage: (id) => swap(buildSnapshot(id, hooks.seed())),
            setSpeed: (x) => { engine.speed = Math.max(0, Number(x) || 1); },
            give: (resource, n) => {
                const s = engine.state;
                if (resource in s.res)
                    s.res[resource] += n;
                else if (resource === 'gov' || resource === 'opinion')
                    s.pol[resource] += n;
                else
                    throw new Error(`unknown resource ${resource}`);
                hooks.render(s);
            },
            set: (path, value) => {
                const parts = path.split('.');
                let o = engine.state;
                for (const p of parts.slice(0, -1)) {
                    if (typeof o[p] !== 'object' || o[p] === null)
                        o[p] = {};
                    o = o[p];
                }
                o[parts[parts.length - 1]] = value;
                hooks.render(engine.state);
            },
            fire: (id) => { const ok = fireById(engine.state, id); hooks.render(engine.state); return ok; },
            finishTraining: () => { finishTraining(engine.state); hooks.render(engine.state); },
            listProjects: () => REG.projects.map((p) => ({
                id: p.id,
                visible: isVisible(engine.state, p.id),
                affordable: canAfford(engine.state, p),
                cost: costLabel(engine.state, p),
            })),
            affordableActions: () => affordableActions(engine.state),
            idle: () => isIdle(engine.state),
            snapshot: () => serialize(engine.state),
            load: (json) => swap(deserialize(json)),
            reset: () => swap(newState(hooks.seed())),
        },
    };
    return api;
}
let overlay = null;
let hiddenPre = null;
export function toggleOverlay(api) {
    if (overlay) {
        overlay.hidden = !overlay.hidden;
        return;
    }
    overlay = buildOverlay(api);
    document.body.append(overlay);
    setInterval(() => {
        if (hiddenPre && !hiddenPre.hidden)
            hiddenPre.textContent = hiddenStats(api.state);
    }, 500);
}
function hiddenStats(s) {
    return [
        `t ${s.t.toFixed(1)} · stage ${s.stage} · branch ${s.branch} · day ${s.dateDays.toFixed(1)}`,
        `alignment ${s.model.alignment.toFixed(1)} · gov ${s.pol.gov.toFixed(1)} · opinion ${s.pol.opinion.toFixed(1)}`,
        `rival ${s.rival.capability.toFixed(2)} · latent incidents ${s.stats.latentIncidents}`,
        `capacity ${s.rates.capacity.toFixed(1)} · demand ${s.rates.demand.toFixed(1)} · waitlist ${s.market.waitlist.toFixed(1)}`,
        `energy price $${s.energyMkt.price.toFixed(0)} · base ${s.energyMkt.base.toFixed(1)} · purchases ${s.energyMkt.purchases}`,
        `mods ${JSON.stringify(s.mods)}`,
        `queue ${JSON.stringify(s.queue)} · ambient at ${s.ambientAt.toFixed(0)}`,
        `idle ${isIdle(s)} · actions ${affordableActions(s).join(', ')}`,
    ].join('\n');
}
function buildOverlay(api) {
    const btn = (label, fn) => {
        const b = h('button', { class: 'button2', type: 'button' }, label);
        b.addEventListener('click', fn);
        return b;
    };
    const row = (label, ...kids) => h('div', { class: 'devRow' }, h('span', { class: 'devLbl' }, label), ...kids);
    const input = (placeholder, size = 8) => h('input', { type: 'text', placeholder, size });
    const fireIn = input('event id', 12);
    const setPath = input('path', 14);
    const setVal = input('value', 6);
    hiddenPre = h('pre', { class: 'devPre' });
    hiddenPre.hidden = true;
    const events = [...REG.setpieces.map((e) => e.id), ...REG.ambient.map((e) => e.id), ...Object.keys(REG.events)];
    const list = h('datalist', { id: 'devEvents' }, ...[...new Set(events)].map((id) => h('option', { value: id })));
    fireIn.setAttribute('list', 'devEvents');
    const num = (v) => (v === 'true' ? true : v === 'false' ? false : isNaN(Number(v)) ? v : Number(v));
    return h('div', { id: 'devOverlay' }, h('b', {}, 'dev'), h('hr'), row('speed', ...[1, 5, 20, 100].map((x) => btn(`×${x}`, () => api.dev.setSpeed(x)))), row('stage', ...SNAPSHOT_IDS.map((id) => btn(id, () => api.dev.jumpToStage(id)))), row('give', btn('$1k', () => api.dev.give('funds', 1000)), btn('$100k', () => api.dev.give('funds', 1e5)), btn('r100', () => api.dev.give('research', 100)), btn('i50', () => api.dev.give('insight', 50)), btn('5MWh', () => api.dev.give('energy', 5000)), btn('gpu+5', () => api.dev.give('gpus', 5)), btn('hc+1', () => api.dev.give('headcount', 1))), row('set', btn('cap+0.5', () => api.dev.set('model.capability', api.state.model.capability + 0.5)), btn('align−10', () => api.dev.set('model.alignment', api.state.model.alignment - 10)), btn('gov+10', () => api.dev.set('pol.gov', api.state.pol.gov + 10)), btn('pub−10', () => api.dev.set('pol.opinion', api.state.pol.opinion - 10)), btn('chart', () => api.dev.set('flags.chart', !api.state.flags.chart))), row('path', setPath, setVal, btn('set', () => api.dev.set(setPath.value, num(setVal.value)))), row('fire', fireIn, list, btn('fire', () => api.dev.fire(fireIn.value.trim()))), row('run', btn('finish training', () => api.dev.finishTraining()), btn('hidden stats', () => { if (hiddenPre)
        hiddenPre.hidden = !hiddenPre.hidden; })), row('save', btn('export', () => window.prompt('state (base64):', exportString(api.state))), btn('import', () => {
        const str = window.prompt('paste base64 state:');
        if (str)
            api.dev.load(serialize(importString(str)));
    })), hiddenPre);
}
//# sourceMappingURL=overlay.js.map