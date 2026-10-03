import { between } from './rng.js';
export const SAVE_KEY = 'takeoff.v1';
export const SAVE_VERSION = 1;
export function newState(seed = 1) {
    const s = {
        v: SAVE_VERSION,
        seed,
        rng: seed >>> 0,
        t: 0,
        realStart: Date.now(),
        stage: 1,
        branch: 'none',
        dateDays: 0,
        res: {
            tasks: 0, funds: 0, energy: 500, agents: 0, gpus: 1, researchers: 0, engineers: 0,
            headcount: 0, research: 0, insight: 0, data: 0, robots: 0,
        },
        caps: { gpus: 50, researchCap: 150, researchBonus: 0, gpuCurveStart: 0, powerGw: 0.5 },
        mods: {
            speedMult: 1, efficiencyMult: 1, energyEffMult: 1, demandMult: 1, refPriceMult: 1,
            gpuPriceMult: 1, energyPriceMult: 1, energyDriftMult: 1, rdMult: 1, capBonus: 0, findingsMult: 1,
        },
        model: {
            key: 'agent0', gen: 0, name: 'agent-0', capability: 1.2, alignment: 50, interp: 1,
            released: true, releasedAt: 0, score: null,
        },
        prevModels: [],
        training: null,
        alloc: { deploy: 1, research: 0, safety: 0 },
        market: { price: 0.25, marketing: 0, productMult: 1, rivalShare: 0, lastRevenue: 0, waitlist: 0, lifetimeRevenue: 0 },
        energyMkt: { price: 120, base: 120, purchases: 0, autoBuy: false, generation: 0, spend: 0, block: 500, autoBlock: 500, decayTimer: 0 },
        pol: { gov: 0, opinion: 50, security: 1, jobsDisplaced: 0, ubi: false, riots: false, dpa: false, oversightSeat: false, jobsMult: 1, riotCount: 0, riotJobs: 5 },
        rival: { name: 'deepcent', capability: 1.0, released: 0, interest: 1 },
        projects: {},
        projectOrder: [],
        // Stage-1 controls that stage 3 deletes (operations panel): true until then.
        flags: { manualTask: true, priceControl: true, marketingControl: true },
        timed: {},
        log: [],
        modal: null,
        queue: [],
        ambientAt: 0,
        hint: '',
        stats: { peakTasksPerSec: 0, revenueTotal: 0, clicks: 0, modelsTrained: [], choices: [], crises: 0, incidents: 0, latentIncidents: 0 },
        milestones: { taskIdx: 0, stamps: {} },
        counters: {
            energyStallSeconds: 0, overSupplySeconds: 0, idleCapSeconds: 0, researchCappedOnce: false,
            saveTimer: 0, clicksThisSecond: 0, tasksWindow: [], chartTimer: 0,
        },
        rates: {
            tasksPerSec: 0, agentTasksPerSec: 0, capacity: 0, demand: 0, revenuePerSec: 0, energyPerSec: 0,
            researchPerSec: 0, idleResearchPerSec: 0, insightPerSec: 0,
        },
        chart: [],
        chartMarks: [],
        flash: '',
    };
    s.ambientAt = between(s, 45, 90);
    return s;
}
/** Deep-fill missing keys from defaults so old saves keep working (ADR updateOldState). */
function fill(target, defaults) {
    if (target === null || typeof target !== 'object' || Array.isArray(target))
        return target;
    for (const k of Object.keys(defaults)) {
        const d = defaults[k];
        if (!(k in target) || target[k] === undefined) {
            target[k] = d;
        }
        else if (d && typeof d === 'object' && !Array.isArray(d) && target[k] && typeof target[k] === 'object') {
            fill(target[k], d);
        }
    }
    return target;
}
export function migrate(raw) {
    if (!raw || typeof raw !== 'object')
        throw new Error('not a save');
    const defaults = newState(typeof raw.seed === 'number' ? raw.seed : 1);
    // Content-keyed records are not filled from defaults.
    const s = fill(raw, defaults);
    if (s.v < SAVE_VERSION)
        s.v = SAVE_VERSION;
    if (!Array.isArray(s.projectOrder))
        s.projectOrder = [];
    if (!Array.isArray(s.log))
        s.log = [];
    if (!Array.isArray(s.queue))
        s.queue = [];
    if (!Array.isArray(s.chart))
        s.chart = [];
    if (!Array.isArray(s.chartMarks))
        s.chartMarks = [];
    return s;
}
export function serialize(s) {
    return JSON.stringify(s);
}
export function deserialize(json) {
    return migrate(JSON.parse(json));
}
export function clone(s) {
    return deserialize(serialize(s));
}
export function saveTo(store, s) {
    store.setItem(SAVE_KEY, serialize(s));
}
export function loadFrom(store) {
    const raw = store.getItem(SAVE_KEY);
    if (!raw)
        return null;
    try {
        return deserialize(raw);
    }
    catch {
        return null;
    }
}
export function clearSave(store) {
    store.removeItem(SAVE_KEY);
}
function b64encode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i++)
        bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
}
function b64decode(b64) {
    const bin = atob(b64.trim());
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++)
        bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
}
export function exportString(s) {
    return b64encode(serialize(s));
}
export function importString(str) {
    return deserialize(b64decode(str));
}
//# sourceMappingURL=state.js.map