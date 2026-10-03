import { isBought } from '../../core/projects.js';
import { beginRun, release } from '../../core/models.js';
import { generation } from '../models.js';
export const PROJECTS = [
    {
        id: 'prompt_caching', stage: 1, title: 'prompt caching',
        cost: { research: 20 },
        trigger: (s) => s.res.researchers >= 1,
        effect: (s) => { s.mods.energyEffMult *= 0.8; },
        done: 'prompt caching. energy per task −20%.',
        desc: "don't think the same thought twice.",
    },
    {
        id: 'batching', stage: 1, title: 'request batching',
        cost: { research: 40 },
        trigger: (s) => s.res.agents >= 4,
        effect: (s) => { s.mods.speedMult *= 1.25; },
        done: 'request batching. agents are 25% faster.',
        desc: 'many questions, one forward pass.',
    },
    {
        id: 'finetune', stage: 1, title: 'fine-tune the base model',
        cost: { research: 60, funds: 200 },
        req: { gpus: 3 },
        trigger: (s) => s.res.gpus >= 2,
        extraAfford: (s) => !s.training,
        effect: (s) => {
            s.flags.modelPanel = true;
            beginRun(s, 'finetune', 'finetune', 0.5, true);
        },
        snapshot: (s) => {
            const g = generation('finetune');
            s.flags.modelPanel = true;
            s.flags['trained:finetune'] = true;
            s.flags['released:finetune'] = true;
            s.prevModels.push({ key: s.model.key, name: s.model.name, capability: s.model.capability, score: s.model.score, releasedAt: 0 });
            s.model = { ...s.model, key: g.key, gen: g.gen, name: g.name, capability: g.capability, released: true, score: 20 };
        },
        desc: 'the model is a generalist. the customers are not.',
    },
    {
        id: 'launch_page', stage: 1, title: 'launch page',
        cost: { funds: 100 },
        trigger: (s) => s.res.tasks >= 500,
        effect: (s) => { s.flags.marketing = true; },
        done: 'the launch page is up. marketing is a line item now.',
        desc: 'a gradient and a waitlist.',
    },
    {
        id: 'auto_energy', stage: 1, title: 'energy auto-buyer',
        cost: { research: 80 },
        trigger: (s) => s.energyMkt.purchases >= 3,
        effect: (s) => { s.energyMkt.autoBuy = true; },
        done: 'energy now buys itself when it runs low.',
        desc: 'a standing order with the utility. one less thing.',
    },
    {
        id: 'idle_research', stage: 1, title: 'idle-time research',
        cost: { research: 100 },
        trigger: (s) => s.counters.idleCapSeconds >= 30,
        effect: (s) => { s.flags.idleResearch = true; },
        done: 'idle agents now do research.',
        desc: 'when nobody is asking, the gpus ask themselves.',
    },
    {
        id: 'usage_tiers', stage: 1, title: 'usage tiers',
        cost: { funds: 500 },
        trigger: (s) => s.market.lifetimeRevenue >= 1000,
        effect: (s) => { s.mods.demandMult *= 1.4; },
        done: 'usage tiers. demand +40%.',
        desc: 'free, pro, enterprise. mostly free.',
    },
    {
        id: 'reading_group', stage: 1, title: 'reading group',
        cost: { research: 120 },
        trigger: (s) => s.counters.researchCappedOnce,
        effect: (s) => { s.flags.insight = true; },
        done: 'the reading group meets. insight accrues while research is capped.',
        desc: 'thursday afternoons. papers nobody ran.',
    },
    {
        id: 'web_crawl', stage: 1, title: 'crawl the web',
        cost: { research: 150 },
        trigger: (s) => !!s.flags.modelPanel,
        effect: (s) => { s.res.data += 3; s.flags.data = true; },
        done: '3 T of tokens. the web, more or less.',
        desc: 'everything anyone ever wrote. terms of service notwithstanding.',
    },
    {
        id: 'better_agents', stage: 1, title: 'agent scaffolding',
        cost: { research: 200 },
        trigger: (s) => s.res.agents >= 15,
        effect: (s) => { s.mods.speedMult *= 1.5; },
        done: 'agent scaffolding. agents are 50% faster.',
        desc: "tools, memory, a loop that doesn't forget.",
    },
    {
        id: 'lease_dc', stage: 1, title: 'lease a datacenter',
        cost: { funds: 25000 },
        trigger: (s) => s.res.gpus >= 40 || (!!s.flags['fired:gpu_delay'] && s.res.gpus >= 5),
        effect: (s) => {
            s.caps.gpus = 500;
            s.caps.gpuCurveStart = s.res.gpus - 1;
            s.mods.gpuPriceMult *= 0.8;
        },
        done: 'a leased datacenter. room for 500 gpus, at bulk prices.',
        desc: 'forty racks in a former paper mill.',
    },
    {
        id: 'ppa', stage: 1, title: 'power purchase agreement',
        cost: { funds: 8000 },
        trigger: (s) => isBought(s, 'auto_energy') && s.energyMkt.spend >= 2000,
        effect: (s) => {
            s.mods.energyPriceMult *= 0.7;
            s.mods.energyDriftMult *= 0.3;
            s.energyMkt.autoBlock = 50000;
        },
        done: 'a power purchase agreement. energy −30%. the auto-buyer buys 50 MWh at a time.',
        desc: 'ten years, fixed rate, no questions.',
    },
    {
        id: 'coding_assistant', stage: 1, title: 'coding assistant',
        cost: { research: 250 },
        trigger: (s) => s.model.capability >= 1.5,
        effect: (s) => { s.mods.demandMult *= 1.6; s.mods.refPriceMult *= 1.2; },
        done: 'a coding assistant. demand +60%, and they pay more.',
        desc: 'developers pay for autocomplete. who knew.',
    },
    {
        id: 'hiring_pipeline', stage: 1, title: 'university pipeline',
        cost: { funds: 3000 },
        trigger: (s) => s.res.headcount >= 5,
        effect: (s) => { s.res.headcount += 2; },
        done: 'two new graduates. headcount +2.',
        desc: 'equity and a slide.',
    },
    {
        id: 'reorg', stage: 1, title: 'reorg',
        cost: { insight: 50 },
        trigger: (s) => (s.res.researchers >= 4 && s.res.engineers === 0) || (s.res.engineers >= 4 && s.res.researchers === 0),
        effect: (s) => {
            s.res.researchers = 0;
            s.res.engineers = 0;
            s.res.research = Math.min(s.res.research, s.caps.researchCap);
        },
        done: 'reorg. everyone is unassigned. hire them again.',
        desc: 'everyone gets a new title. nothing else changes.',
    },
    {
        id: 'train_agent1', stage: 1, title: 'train agent-1',
        cost: { research: 400, data: 1, funds: 5000 },
        req: { gpus: 20 },
        training: 'agent1',
        trigger: (s) => !!s.flags['trained:finetune'] && s.res.tasks >= 20000,
        effect: () => { },
        snapshot: (s) => { s.flags['trained:agent1'] = true; },
        desc: 'a model that can use a computer. badly.',
    },
    {
        id: 'release_agent1', stage: 1, title: 'release agent-1',
        costLabel: () => 'ready',
        trigger: (s) => s.training?.key === 'agent1' && s.training.phase === 'done',
        effect: (s) => {
            release(s);
            s.mods.demandMult *= 3;
        },
        snapshot: (s) => {
            const g = generation('agent1');
            s.flags['released:agent1'] = true;
            s.prevModels.push({ key: s.model.key, name: s.model.name, capability: s.model.capability, score: s.model.score, releasedAt: s.model.releasedAt });
            s.model = { ...s.model, key: g.key, gen: g.gen, name: g.name, capability: g.capability, released: true, releasedAt: s.t, score: 24 };
            s.mods.demandMult *= 3;
        },
        desc: 'ship it.',
    },
    {
        id: 'emergency_power', stage: 1, title: 'emergency power',
        anytime: true,
        retrigger: true,
        uses: Infinity,
        costLabel: () => '−1 gov',
        trigger: (s) => s.counters.energyStallSeconds >= 5,
        effect: (s) => {
            s.res.energy += 2000;
            s.pol.gov -= 1;
            s.counters.energyStallSeconds = 0;
        },
        done: '2,000 kWh, on credit.',
        desc: 'the grid operator extends credit. once.',
    },
];
//# sourceMappingURL=stage1.js.map