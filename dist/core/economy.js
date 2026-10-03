import { agentsPerGpu, energyPerTask, agentSpeed } from './models.js';
import { log } from './events.js';
export const BASE_DEMAND = 4; // tasks/s
export const ELASTICITY = 1.5;
export const ENERGY_BASE = 120; // $ per 500 kWh
export const ENERGY_FLOOR = 70;
export const ENERGY_BLOCK = 500; // kWh
export const AGENT_BASE_COST = 5;
export const AGENT_COST_GROWTH = 1.1;
export const GPU_BASE_COST = 100;
export const GPU_COST_GROWTH = 1.07;
export const MARKETING_BASE_COST = 100;
export const RESEARCH_CAP_BASE = 150;
export const RESEARCH_CAP_PER_ENGINEER = 250;
export const INSIGHT_PER_RESEARCHER = 0.1;
export const IDLE_RESEARCH_RATE = 0.01;
// ------------------------------------------------------------------ derived quantities
export function capMult(capability) {
    return Math.pow(10, capability - 1);
}
function scoreDemandMult(s) {
    return s.model.score === null ? 1 : 1 + s.model.score / 40;
}
function scoreRefMult(s) {
    return s.model.score === null ? 1 : 1 + (s.model.score - 20) / 40;
}
export function refPrice(s) {
    return 0.25 * Math.pow(3, s.model.capability - 1) * s.mods.refPriceMult * scoreRefMult(s);
}
export function opinionMult(s) {
    return s.flags.opinionVisible ? 0.5 + s.pol.opinion / 100 : 1;
}
export function demandAt(s, price) {
    return (BASE_DEMAND *
        capMult(s.model.capability) *
        Math.pow(1.25, s.market.marketing) *
        Math.pow(refPrice(s) / Math.max(0.001, price), ELASTICITY) *
        opinionMult(s) *
        (1 - s.market.rivalShare) *
        s.market.productMult *
        s.mods.demandMult *
        scoreDemandMult(s));
}
export function demand(s) {
    return demandAt(s, s.market.price);
}
/** Agent slots: gpus × agentsPerGpu. */
export function agentSlots(s) {
    return Math.floor(s.res.gpus * agentsPerGpu(s) + 1e-9);
}
export function powerFactor(_s) {
    return 1; // S3+: min(1, powerCapacityGW / powerDemandGW)
}
/** Share of deployment capacity left after an active training run takes its budget. */
export function trainingFactor(s) {
    const tr = s.training;
    return tr && tr.phase !== 'done' ? 1 - tr.budget : 1;
}
export function capacity(s) {
    return (Math.min(s.res.agents, agentSlots(s)) *
        agentSpeed(s) *
        s.alloc.deploy *
        powerFactor(s) *
        trainingFactor(s));
}
export function researchCap(s) {
    return RESEARCH_CAP_BASE + RESEARCH_CAP_PER_ENGINEER * s.res.engineers + s.caps.researchBonus;
}
/** rdFactor = 0 below capability 1.8, then 0.002 × 10^(capability−2). */
export function rdFactor(capability) {
    return capability < 1.8 ? 0 : 0.002 * Math.pow(10, capability - 2);
}
export function aiResearchPerSec(s) {
    if (!s.flags.aiRd)
        return 0;
    return s.res.agents * s.alloc.research * rdFactor(s.model.capability);
}
// ------------------------------------------------------------------ prices
export function agentCost(s) {
    return AGENT_BASE_COST * Math.pow(AGENT_COST_GROWTH, s.res.agents);
}
export function gpuCost(s) {
    const n = Math.max(0, s.res.gpus - 1 - s.caps.gpuCurveStart);
    const shock = (s.timed.gpu_delay ?? 0) > s.t ? 1.3 : 1;
    return GPU_BASE_COST * Math.pow(GPU_COST_GROWTH, n) * s.mods.gpuPriceMult * shock;
}
export function marketingCost(s) {
    return MARKETING_BASE_COST * Math.pow(2, s.market.marketing);
}
/** Price of `kwh` (default: one manual block): ceil(base + 30·sin(purchases)) per 500 kWh, floor $70. */
export function energyPrice(s, kwh = s.energyMkt.block) {
    const m = s.energyMkt;
    const per500 = Math.max(ENERGY_FLOOR * s.mods.energyPriceMult, Math.ceil((m.base + 30 * s.mods.energyDriftMult * Math.sin(m.purchases)) * s.mods.energyPriceMult));
    return per500 * (kwh / ENERGY_BLOCK);
}
// ------------------------------------------------------------------ player actions
export function canCompleteTask(s) {
    return !s.flags.noManual && s.res.energy >= energyPerTask(s) - 1e-9;
}
/** Manual click: +1 task, +price funds, −energyPerTask energy. Never demand-limited. */
export function completeTask(s) {
    if (!canCompleteTask(s))
        return false;
    s.res.energy = Math.max(0, s.res.energy - energyPerTask(s));
    s.res.tasks += 1;
    s.res.funds += s.market.price;
    s.market.lifetimeRevenue += s.market.price;
    s.stats.revenueTotal += s.market.price;
    s.stats.clicks += 1;
    s.counters.clicksThisSecond += 1;
    return true;
}
export function canDeployAgent(s) {
    return s.res.funds >= agentCost(s) && s.res.agents < agentSlots(s);
}
export function deployAgent(s) {
    if (!canDeployAgent(s))
        return false;
    s.res.funds -= agentCost(s);
    s.res.agents += 1;
    if (!s.milestones.stamps.firstAgent)
        s.milestones.stamps.firstAgent = s.t;
    return true;
}
export function canBuyGpu(s) {
    return s.res.funds >= gpuCost(s) && s.res.gpus < s.caps.gpus;
}
export function buyGpu(s) {
    if (!canBuyGpu(s))
        return false;
    s.res.funds -= gpuCost(s);
    s.res.gpus += 1;
    if (!s.milestones.stamps.firstGpu)
        s.milestones.stamps.firstGpu = s.t;
    return true;
}
export function canBuyEnergy(s) {
    return s.res.funds >= energyPrice(s);
}
export function buyEnergy(s, kwh = s.energyMkt.block) {
    const p = energyPrice(s, kwh);
    if (s.res.funds < p)
        return false;
    const m = s.energyMkt;
    s.res.funds -= p;
    s.res.energy += kwh;
    m.purchases += 1;
    m.base += 2;
    m.decayTimer = 0;
    m.spend += p;
    return true;
}
export function canBuyMarketing(s) {
    return !!s.flags.marketing && !s.flags.autoPricing && s.res.funds >= marketingCost(s);
}
export function buyMarketing(s) {
    if (!canBuyMarketing(s))
        return false;
    s.res.funds -= marketingCost(s);
    s.market.marketing += 1;
    return true;
}
function roundCents(p) {
    return Math.round(p * 100) / 100;
}
export function priceDown(s) {
    const p = s.market.price;
    if (p <= 0.01)
        return false;
    s.market.price = Math.max(0.01, roundCents(p > 1 ? p * 0.99 : p - 0.01));
    return true;
}
export function priceUp(s) {
    const p = s.market.price;
    s.market.price = roundCents(p >= 1 ? Math.max(p + 0.01, p * 1.01) : p + 0.01);
    return true;
}
export function freeHeadcount(s) {
    return s.res.headcount - s.res.researchers - s.res.engineers;
}
export function hireResearcher(s) {
    if (freeHeadcount(s) < 1)
        return false;
    s.res.researchers += 1;
    if (!s.milestones.stamps.firstResearcher)
        s.milestones.stamps.firstResearcher = s.t;
    return true;
}
export function hireEngineer(s) {
    if (freeHeadcount(s) < 1)
        return false;
    s.res.engineers += 1;
    return true;
}
// ------------------------------------------------------------------ the tick
/** One fixed logic step. */
export function applyEconomyTick(s, dt) {
    const r = s.res;
    const m = s.energyMkt;
    // Energy market: base decays 0.5% every 25 s without a purchase, toward 120.
    m.decayTimer += dt;
    if (m.decayTimer >= 25) {
        m.decayTimer = 0;
        if (m.base > ENERGY_BASE)
            m.base = Math.max(ENERGY_BASE, m.base * 0.995);
    }
    m.price = energyPrice(s);
    if (m.generation > 0)
        r.energy += m.generation * dt;
    // Throughput.
    const cap = capacity(s);
    const dem = demand(s);
    const ept = energyPerTask(s);
    let tasks = Math.min(cap, dem) * dt;
    const need = tasks * ept;
    if (need > r.energy)
        tasks = ept > 0 ? r.energy / ept : tasks;
    r.energy = Math.max(0, r.energy - tasks * ept);
    if (r.energy < 1e-9)
        r.energy = 0;
    r.tasks += tasks;
    const revenue = tasks * s.market.price;
    r.funds += revenue;
    s.market.lifetimeRevenue += revenue;
    s.stats.revenueTotal += revenue;
    s.market.lastRevenue = revenue / dt;
    s.market.waitlist = Math.max(0, dem - cap);
    // Auto-buyer: when < 10 s of use remain; in 50 MWh blocks after the ppa when affordable.
    const usePerSec = Math.min(cap, dem) * ept;
    if (m.autoBuy && r.energy < usePerSec * 10) {
        if (!(m.autoBlock > m.block && buyEnergy(s, m.autoBlock)))
            buyEnergy(s);
    }
    // Research and insight.
    const rcap = researchCap(s);
    s.caps.researchCap = rcap;
    const idle = Math.max(0, cap - dem);
    const idleResearch = s.flags.idleResearch ? idle * IDLE_RESEARCH_RATE : 0;
    const rps = r.researchers * 1.0 + idleResearch + aiResearchPerSec(s);
    if (!s.flags.noResearchCap) {
        r.research = Math.min(rcap, r.research + rps * dt);
    }
    else {
        r.research += rps * dt;
    }
    const atCap = !s.flags.noResearchCap && r.research >= rcap - 1e-9;
    if (atCap && r.researchers > 0 && !s.counters.researchCappedOnce)
        s.counters.researchCappedOnce = true;
    const ips = s.flags.insight && atCap ? r.researchers * INSIGHT_PER_RESEARCHER : 0;
    r.insight += ips * dt;
    // Release sales curve: 2.0 → 1.0 over 8 minutes.
    if (s.market.productMult > 1)
        s.market.productMult = Math.max(1, s.market.productMult - dt / 480);
    // Counters for triggers and hints.
    const c = s.counters;
    if (cap > dem)
        c.idleCapSeconds += dt;
    c.overSupplySeconds = cap > dem * 1.5 && r.agents > 0 ? c.overSupplySeconds + dt : 0;
    const stalled = r.energy < ept && r.funds < m.price && r.agents > 0;
    c.energyStallSeconds = stalled ? c.energyStallSeconds + dt : 0;
    // Smoothed tasks/s over the last second (Paperclips clipRate).
    c.tasksWindow.push(tasks + c.clicksThisSecond);
    c.clicksThisSecond = 0;
    if (c.tasksWindow.length > 10)
        c.tasksWindow.shift();
    let sum = 0;
    for (const x of c.tasksWindow)
        sum += x;
    const rt = s.rates;
    rt.tasksPerSec = sum / (c.tasksWindow.length * 0.1);
    rt.agentTasksPerSec = tasks / dt;
    rt.capacity = cap;
    rt.demand = dem;
    rt.revenuePerSec = revenue / dt;
    rt.energyPerSec = (tasks / dt) * ept;
    rt.researchPerSec = s.flags.noResearchCap || r.research < rcap ? rps : 0;
    rt.idleResearchPerSec = idleResearch;
    rt.insightPerSec = ips;
    if (rt.tasksPerSec > s.stats.peakTasksPerSec)
        s.stats.peakTasksPerSec = rt.tasksPerSec;
}
/** Sticky reveal flags (immediate-mode UI reads these; nothing is a one-shot DOM event). */
export function updateReveals(s) {
    const f = s.flags;
    const r = s.res;
    if (!f.deploy && r.funds >= AGENT_BASE_COST) {
        f.deploy = true;
        log(s, 'an agent can run the task loop without you.');
    }
    if (!f.agentsRow && r.agents >= 1) {
        f.agentsRow = true;
        f.priceRow = true;
    }
    if (!f.gpuRow && r.agents >= 1 && r.agents >= agentSlots(s))
        f.gpuRow = true;
    if (!f.lab && r.headcount >= 1)
        f.lab = true;
    if (!f.projects && r.researchers >= 1) {
        f.projects = true;
        f.research = true;
    }
}
/** Rate breakdowns for the stores tooltips: [source, per second]. */
export function rateBreakdown(s, key) {
    const rt = s.rates;
    const out = [];
    switch (key) {
        case 'funds':
            if (rt.revenuePerSec)
                out.push(['agents', rt.revenuePerSec]);
            break;
        case 'energy':
            if (s.energyMkt.generation)
                out.push(['generation', s.energyMkt.generation]);
            if (rt.energyPerSec)
                out.push(['agents', -rt.energyPerSec]);
            break;
        case 'research':
            if (s.res.researchers)
                out.push(['researchers', s.res.researchers]);
            if (rt.idleResearchPerSec)
                out.push(['idle agents', rt.idleResearchPerSec]);
            if (aiResearchPerSec(s))
                out.push(['agents on research', aiResearchPerSec(s)]);
            break;
        case 'insight':
            if (rt.insightPerSec)
                out.push(['reading group', rt.insightPerSec]);
            break;
        case 'tasks':
            if (rt.agentTasksPerSec)
                out.push(['agents', rt.agentTasksPerSec]);
            break;
    }
    return out;
}
//# sourceMappingURL=economy.js.map