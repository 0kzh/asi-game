import { newState } from '../core/state.js';
import { applyProject, checkProjects } from '../core/projects.js';
import { updateReveals } from '../core/economy.js';
import { enterStage } from '../core/stages.js';
import { milestoneAt } from '../core/milestones.js';
import { log } from '../core/events.js';
import { REG } from '../core/registry.js';
import { snapshot3 } from './snapshots/stage3.js';
/** Stage-1 projects bought by agent-1's release, in the order a typical run buys them. */
export const S1_ORDER = [
    'prompt_caching', 'batching', 'launch_page', 'idle_research', 'finetune', 'usage_tiers', 'web_crawl',
    'reading_group', 'better_agents', 'coding_assistant', 'auto_energy', 'hiring_pipeline', 'train_agent1', 'release_agent1',
];
function snapshot1(seed) {
    return newState(seed);
}
/** Post agent-1 release at minute 18 (resources from the sim bot's state at release; design §11). */
function snapshot2(seed) {
    const s = newState(seed);
    s.t = 18 * 60;
    for (const id of S1_ORDER)
        applyProject(s, id);
    Object.assign(s.res, {
        tasks: 38500, funds: 2500, energy: 3000, agents: 56, gpus: 20, researchers: 6, engineers: 2,
        headcount: 8, research: 500, insight: 12, data: 2, robots: 0,
    });
    s.market.marketing = 1;
    s.market.price = 0.5;
    s.market.lifetimeRevenue = 9000;
    s.market.productMult = 2;
    s.energyMkt.purchases = 18;
    s.energyMkt.base = 126;
    s.energyMkt.spend = 2400;
    s.counters.researchCappedOnce = true;
    s.counters.idleCapSeconds = 300;
    while (milestoneAt(s.milestones.taskIdx) <= s.res.tasks)
        s.milestones.taskIdx++;
    s.milestones.stamps = {
        firstAgent: 4, firstGpu: 91, firstHeadcount: 276, firstResearcher: 277, finetuneDone: 504, finetuneReleased: 505,
        agent1Trained: 1079, agent1Released: 1080,
    };
    s.model.releasedAt = s.t;
    s.dateDays = 240;
    s.rival.capability = 1.6;
    s.chart = [[0, 1.2, 1.0], [60, 1.2, 1.15], [125, 1.5, 1.3], [190, 1.5, 1.45], [240, 2.0, 1.6]];
    s.chartMarks = [[125, 'agent-0 (tuned)'], [240, 'agent-1']];
    s.flags.gpuRow = true;
    s.flags.govAttention = true;
    // Stage-1 set pieces have already happened.
    for (const sp of REG.setpieces)
        if (sp.stage < 2) {
            s.flags[`armed:${sp.id}`] = true;
            s.flags[`fired:${sp.id}`] = true;
        }
    updateReveals(s);
    checkProjects(s);
    s.log = [];
    log(s, 'agent-1 released.');
    enterStage(s, 2);
    s.ambientAt = s.t + 60;
    return s;
}
function snapshot4(seed, branch) {
    const s = snapshot3(seed);
    s.flags.voteResolved = true;
    s.branch = branch;
    enterStage(s, 4);
    return s;
}
function snapshot5(seed, branch) {
    const s = snapshot4(seed, branch);
    if (branch === 'race')
        s.flags.takeover = true;
    else
        s.flags.treatySigned = true;
    enterStage(s, 5);
    return s;
}
export const SNAPSHOT_IDS = ['1', '2', '3', '4a', '4b', '5a', '5b'];
export function buildSnapshot(id, seed = 1) {
    switch (id) {
        case '1': return snapshot1(seed);
        case '2': return snapshot2(seed);
        case '3': return snapshot3(seed);
        case '4a': return snapshot4(seed, 'slowdown');
        case '4b': return snapshot4(seed, 'race');
        case '5a': return snapshot5(seed, 'slowdown');
        case '5b': return snapshot5(seed, 'race');
    }
    throw new Error(`unknown snapshot ${id}`);
}
//# sourceMappingURL=snapshots.js.map