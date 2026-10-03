import { isBought, removeProject } from '../../core/projects.js';
import { release } from '../../core/models.js';
import { log, openChoice } from '../../core/events.js';
import { powerCapacityGw, powerGwAt, rawCapacity } from '../../core/economy.js';
import { endRiots } from '../../core/politics.js';
import { generation } from '../models.js';
import { NAMES } from '../names.js';
const inS3 = (s) => s.stage === 3;
const fromS3 = (s) => s.stage >= 3;
/** Share of power capacity every deployed agent would draw. */
export function powerShare(s) {
    const cap = powerCapacityGw(s);
    return cap > 0 ? powerGwAt(s, rawCapacity(s)) / cap : 0;
}
export function powerAtCap(s) {
    return powerShare(s) >= 0.9;
}
/** Data the next stage-3 run needs. */
export function nextRunData(s) {
    if (!s.flags['trained:agent3'])
        return generation('agent3').data;
    if (!s.flags['trained:agent4'])
        return generation('agent4').data;
    return 0;
}
/** Make `key` the deployed model at its table capability (dev snapshots only). */
function snapModel(s, key, score) {
    const g = generation(key);
    s.flags[`trained:${key}`] = true;
    s.flags[`released:${key}`] = true;
    s.prevModels.push({ key: s.model.key, name: s.model.name, capability: s.model.capability, score: s.model.score, releasedAt: s.model.releasedAt });
    s.model = { ...s.model, key: g.key, gen: g.gen, name: g.name, capability: g.capability + s.mods.capBonus, released: true, releasedAt: s.t, score };
}
export const CURES = ['cancer', "alzheimer's", 'male pattern baldness'];
/** release_agent3's effects beyond release() itself (also used by the board's choice). */
function miniEffects(s) {
    s.mods.demandMult *= 4;
    s.pol.jobsMult *= 2;
    s.pol.opinion -= 10;
}
export const PROJECTS = [
    {
        id: 'ai_rd2', stage: 3, title: 'automated research pipeline',
        cost: { research: 20000 },
        trigger: inS3,
        effect: (s) => { s.flags.noResearchCap = true; s.mods.rdMult *= 3; },
        done: 'the humans mostly watch now.',
        desc: 'the researchers used to run the experiments. now they are read the results.',
    },
    {
        id: 'stats', stage: 3, title: 'stats panel',
        cost: { insight: 100 },
        trigger: inS3,
        effect: (s) => { s.flags.stats = true; },
        done: 'a stats panel. copies, speed, the gap.',
        desc: 'numbers, in a column.',
    },
    {
        id: 'train_agent3', stage: 3, title: 'train agent-3',
        cost: { research: 60000, data: 50, funds: 5e8 },
        req: { gpus: 50000 },
        training: 'agent3',
        trigger: inS3,
        effect: () => { },
        snapshot: (s) => { s.flags['trained:agent3'] = true; },
        desc: 'two hundred thousand of the best programmers alive. none of them are alive.',
    },
    {
        id: 'self_play', stage: 3, title: 'self-play',
        cost: { research: 15000 },
        uses: Infinity,
        retrigger: true,
        trigger: (s) => inS3(s) && s.res.data < nextRunData(s),
        effect: (s) => { s.res.data += 60; },
        done: 'self-play. +60 T. amplify, distill, repeat.',
        desc: 'a few hundred gpus, an internet connection, a thousand copies of yourself.',
    },
    {
        id: 'neuralese', stage: 3, title: 'neuralese recurrence',
        cost: { research: 30000 },
        trigger: (s) => inS3(s) && s.model.gen >= 2 && isBought(s, 'ai_rd2'),
        effect: (s) => {
            s.flags.neuralese = true;
            s.model.capability = Math.round((s.model.capability + 0.3) * 100) / 100;
            s.mods.capBonus += 0.3;
            s.mods.speedMult *= 1.5;
            s.model.interp *= 0.3;
            s.mods.findingsMult *= 1.5;
            removeProject(s, 'legible_cot');
        },
        done: 'the scratchpad is replaced with neuralese. nobody can read it.',
        desc: 'thoughts too dense for words. also for us.',
    },
    {
        id: 'legible_cot', stage: 3, title: 'legible chain of thought',
        cost: { insight: 300 },
        trigger: (s) => inS3(s) && s.model.gen >= 2 && isBought(s, 'ai_rd2'),
        effect: (s) => {
            s.flags.legibleCot = true;
            s.model.alignment = Math.min(100, s.model.alignment + 10);
            s.model.capability = Math.round((s.model.capability - 0.1) * 100) / 100;
            s.mods.capBonus -= 0.1;
            s.model.interp *= 2;
            s.mods.findingsMult *= 0.75;
            removeProject(s, 'neuralese');
        },
        done: 'legible chain of thought. it thinks in english, on the record.',
        desc: "if it can't say it in english, it doesn't do it.",
    },
    {
        id: 'interp1', stage: 3, title: 'interpretability I: probes',
        cost: { insight: 200 },
        trigger: (s) => inS3(s) && (isBought(s, 'eval_suite') || !!s.flags.alignmentVisible || !!s.flags.evalSuite),
        effect: (s) => { s.flags.interp1 = true; s.mods.findingsMult *= 0.8; },
        done: 'probes on the activations. alignment is on the stats panel now.',
        desc: 'we can tell when it is thinking about lying. not what about.',
    },
    {
        id: 'reactor', stage: 3, title: 'restart a reactor',
        cost: { funds: 8e9 },
        trigger: (s) => inS3(s) && powerShare(s) >= 0.5,
        effect: (s) => { s.caps.powerGw += 1; s.mods.energyPriceMult *= 0.8; },
        done: 'a reactor restarts. +1 GW.',
        desc: 'it was decommissioned for reasons. the reasons are reviewed.',
    },
    {
        id: 'stockpile', stage: 3, title: 'chip stockpile',
        cost: { funds: 2e10 },
        trigger: inS3,
        effect: (s) => { s.flags.stockpile = true; },
        done: 'warehouses of silicon. the next chip shock is covered.',
        desc: 'warehouses of silicon, in case.',
    },
    {
        id: 'sl4', stage: 3, title: 'security level 4',
        cost: { funds: 2e10 },
        req: { gov: 30 },
        trigger: (s) => inS3(s) && !!s.flags.theftResolved,
        effect: (s) => { s.pol.security = Math.max(s.pol.security, 4); s.pol.gov += 10; },
        done: 'security level 4. gov +10.',
        desc: 'the building is now inside another building.',
    },
    {
        id: 'sl5', stage: 3, title: 'security level 5',
        req: { gov: 60 },
        costLabel: () => 'gov ≥ 60, with the project',
        extraAfford: (s) => s.stage >= 4 && isBought(s, 'sl4'),
        trigger: (s) => fromS3(s) && !!s.flags.theftResolved,
        effect: (s) => { s.pol.security = 5; },
        done: 'security level 5.',
        desc: 'the weights are a state secret. so, legally, are you.',
    },
    {
        id: 'retraining', stage: 3, title: 'retraining fund',
        cost: { funds: 5e9 },
        trigger: (s) => fromS3(s) && s.pol.jobsDisplaced >= 5,
        effect: (s) => { s.pol.opinion += 10; endRiots(s, 'the crowd takes the vouchers and goes home.'); },
        done: 'a retraining fund. public +10.',
        desc: 'learn to prompt.',
    },
    {
        id: 'release_agent3', stage: 3, title: 'release agent-3 (mini)',
        costLabel: () => 'ready',
        trigger: (s) => s.training?.key === 'agent3' && s.training.phase === 'done',
        effect: (s) => {
            release(s);
            miniEffects(s);
            log(s, 'agent-3-mini ships. ten times cheaper than agent-3. agent-3 stays home.');
        },
        snapshot: (s) => { snapModel(s, 'agent3', 27); miniEffects(s); },
        desc: 'the public version is smaller. the public is not told how much.',
    },
    {
        id: 'monitors', stage: 3, title: 'old generation as monitor',
        cost: { insight: 300 },
        trigger: (s) => inS3(s) && s.prevModels.length >= 1 && (!!s.flags['trained:agent3'] || !!s.flags['fired:hack']),
        effect: (s) => { s.flags.monitors = true; s.mods.efficiencyMult *= 0.95; },
        done: 'the previous model reviews the new one. it costs 5% of compute.',
        desc: "the old model reads the new model's mail.",
    },
    {
        id: 'robots_pilot', stage: 3, title: 'humanoid pilot line',
        cost: { research: 100000 },
        trigger: (s) => fromS3(s) && s.model.capability >= 3.6,
        effect: (s) => { s.flags.robots = true; },
        done: `a humanoid pilot line in ${NAMES.sites.robots}. 1,000 robots a minute.`,
        desc: 'it falls over less each week.',
    },
    {
        id: 'defense', stage: 3, title: 'defense contract',
        costLabel: () => 'a meeting',
        trigger: (s) => inS3(s) && (isBought(s, 'gov_briefing') || !!s.flags.politics) && s.model.capability >= 3.2,
        effect: (s) => { openChoice(s, 'defense'); },
        desc: 'the general does not say the word iran.',
    },
    {
        id: 'align_research', stage: 3, title: 'automated alignment research',
        costFn: (s) => ({ research: Math.round(4e5 * Math.pow(1.35, s.projects.align_research?.bought ?? 0)) }),
        uses: 12,
        trigger: (s) => inS3(s) && !!s.flags['trained:agent3'] && !!s.flags.noResearchCap,
        effect: (s) => { s.res.insight += 150; },
        done: 'the copies run alignment experiments on each other. +150 insight.',
        desc: 'either it learned to be honest or it learned to lie better.',
    },
    {
        id: 'safety_case', stage: 3, title: 'publish the safety case',
        costFn: (s) => ({ insight: 250 * ((s.projects.safety_case?.bought ?? 0) + 1) }),
        uses: 3,
        trigger: (s) => inS3(s) && !!s.flags['released:agent3'],
        effect: (s) => { s.pol.opinion += 8; s.pol.gov += 5; },
        done: 'the safety case is published. a hundred and forty pages. public +8, gov +5.',
        desc: 'we explain why it is safe. the model helped write it.',
    },
    {
        id: 'washington', stage: 3, title: 'a washington office',
        costFn: (s) => ({ funds: 2e9 * Math.pow(2, s.projects.washington?.bought ?? 0) }),
        uses: 3,
        retrigger: true,
        trigger: (s) => inS3(s) && s.pol.gov < 20 && !!s.flags['trained:agent3'],
        effect: (s) => { s.pol.gov += 10; },
        done: 'forty lobbyists and a townhouse near the hill. gov +10.',
        desc: 'favours, bought retail.',
    },
    {
        id: 'interp2', stage: 3, title: 'interpretability II: circuits',
        cost: { insight: 800 },
        trigger: (s) => fromS3(s) && isBought(s, 'interp1'),
        effect: (s) => { s.flags.interp2 = true; s.mods.findingsMult *= 0.6; },
        done: 'circuits. findings −40%, and half the incidents stay inside.',
        desc: 'a map of the mind, drawn by the mind.',
    },
    {
        id: 'sez', stage: 3, title: 'special economic zone',
        cost: { funds: 5e10 },
        req: { gov: 20 },
        trigger: (s) => inS3(s) && (powerAtCap(s) || s.res.gpus >= 0.9 * s.caps.gpus),
        effect: (s) => {
            s.caps.powerGw *= 5;
            s.caps.gpus = Math.max(s.caps.gpus, 500000);
            s.pol.opinion -= 5;
            s.flags.sez = true;
        },
        done: `the ${NAMES.sites.sez}. power ×5, room for 500,000 gpus.`,
        desc: 'no permits, no neighbours, no limits.',
    },
    {
        id: 'gulf_dc', stage: 3, title: 'gulf datacenter',
        cost: { funds: 5e10 },
        trigger: (s) => inS3(s) && powerAtCap(s) && s.pol.gov >= 0,
        effect: (s) => {
            s.caps.powerGw *= 3;
            s.caps.gpus += 500000;
            s.mods.energyPriceMult *= 0.5;
            s.flags.gulfSite = true;
        },
        done: `${NAMES.sites.gulf} is online. power ×3, energy at half price.`,
        desc: 'the sun is free there. the neighbours are not.',
    },
    {
        id: 'smr', stage: 3, title: 'small modular reactors',
        cost: { funds: 3e10 },
        trigger: (s) => fromS3(s) && isBought(s, 'reactor') && !!s.flags.sez,
        effect: (s) => { s.caps.powerGw += 5; },
        done: 'forty small reactors. +5 GW.',
        desc: 'a reactor in a shipping container, times forty.',
    },
    {
        id: 'domestic_fab', stage: 3, title: 'domestic fab',
        cost: { funds: 1e11 },
        req: { gov: 10 },
        trigger: (s) => inS3(s) && (!!s.flags['fired:chip_shock'] || !!s.flags['fired:taiwan1']),
        effect: (s) => {
            s.flags.domesticFab = true;
            delete s.timed.chip_shock;
            s.mods.gpuPriceMult *= 0.8;
        },
        done: 'a domestic fab. gpu prices −20%, and the strait no longer matters.',
        desc: 'three years, they said. agent-3 says eleven months.',
    },
    {
        id: 'ubi_lobby', stage: 3, title: 'lobby for basic income',
        cost: { insight: 500, funds: 1e10 },
        trigger: (s) => fromS3(s) && !!s.flags['fired:riots'] && !s.pol.ubi,
        effect: (s) => {
            s.pol.ubi = true;
            s.flags.ubiLobbied = true;
            s.pol.opinion += 20;
            s.pol.gov -= 5;
            endRiots(s);
        },
        done: 'the basic income bill clears committee. the riots stop.',
        desc: 'the cheapest peace ever bought.',
    },
    {
        id: 'cure', stage: 3, title: 'cure something',
        cost: { funds: 2e10 },
        costLabel: (s) => `$20.0B, ${CURES[Math.min(CURES.length - 1, s.projects.cure?.bought ?? 0)]}`,
        uses: 3,
        retrigger: true,
        trigger: (s) => fromS3(s) && s.pol.opinion < 40,
        effect: (s) => {
            const n = (s.projects.cure?.bought ?? 1) - 1;
            const gain = n >= 2 ? 25 : 15;
            s.pol.opinion += gain;
            log(s, `${s.model.name} cures ${CURES[Math.min(n, CURES.length - 1)]}. public +${gain}.`);
        },
        desc: 'they are still monkeys. the monkeys are grateful.',
    },
    {
        id: 'train_agent4', stage: 3, title: 'train agent-4',
        cost: { research: 600000, data: 100, funds: 5e10 },
        req: { gpus: 500000 },
        training: 'agent4',
        trigger: (s) => inS3(s) && !!s.flags['released:agent3'] && (!!s.flags.neuralese || !!s.flags.legibleCot),
        effect: () => { },
        snapshot: (s) => snapModel(s, 'agent4', 30),
        desc: 'it is better at ai research than we are. that is the point.',
    },
    {
        id: 'oversight_seat', stage: 3, title: 'seat on the oversight committee',
        req: { gov: 40 },
        trigger: (s) => inS3(s) && (!!s.flags['trained:agent4'] || !!s.flags['fired:dpa']),
        effect: (s) => { s.pol.oversightSeat = true; },
        done: 'a seat on the oversight committee. one chair of ten.',
        desc: 'a chair at the table where your fate is decided.',
    },
];
//# sourceMappingURL=stage3.js.map