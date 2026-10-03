import * as eco from './economy.js';
import { buyProject, canBuy, visibleProjects } from './projects.js';
import { shipWaitingRun, startTrainingFromModal, canStartRun, canSafetyPass, safetyPass } from './models.js';
import { monthsBehind } from './rival.js';
import { choose, choiceEnabled, currentScene, log } from './events.js';
import { canPay, meets } from './cost.js';
import { REG } from './registry.js';
import { projectCost } from './projects.js';
const noModal = (s) => !s.modal;
const STEP = 0.1;
const MIN_DEPLOY = 0.1;
const tenth = (x) => Math.round(x * 10) / 10;
function allocRowVisible(s, row) {
    if (!s.flags.allocPanel)
        return false;
    return row !== 'safety' || !!s.flags.evalSuite;
}
/** ±10% on a row, always summing to 100: research and safety trade with deployment;
 *  deployment [+] takes from research first, then safety; deployment never drops below 10%. */
function allocMove(s, row, dir, apply) {
    const a = { ...s.alloc };
    if (row === 'deploy') {
        if (dir > 0) {
            const from = a.research >= STEP - 1e-9 ? 'research' : a.safety >= STEP - 1e-9 && s.flags.evalSuite ? 'safety' : null;
            if (!from)
                return false;
            a[from] = tenth(a[from] - STEP);
            a.deploy = tenth(a.deploy + STEP);
        }
        else {
            if (a.deploy < MIN_DEPLOY + STEP - 1e-9)
                return false;
            a.deploy = tenth(a.deploy - STEP);
            a.research = tenth(a.research + STEP);
        }
    }
    else if (dir > 0) {
        if (a.deploy < MIN_DEPLOY + STEP - 1e-9)
            return false;
        a.deploy = tenth(a.deploy - STEP);
        a[row] = tenth(a[row] + STEP);
    }
    else {
        if (a[row] < STEP - 1e-9)
            return false;
        a[row] = tenth(a[row] - STEP);
        a.deploy = tenth(a.deploy + STEP);
    }
    if (apply)
        s.alloc = a;
    return true;
}
const ALLOC_ACTIONS = ['deploy', 'research', 'safety'].flatMap((row) => [1, -1].map((dir) => ({
    id: `alloc_${row}_${dir > 0 ? 'up' : 'down'}`,
    free: true,
    visible: (s) => allocRowVisible(s, row),
    enabled: (s) => allocMove(s, row, dir, false),
    run: (s) => { allocMove(s, row, dir, true); },
})));
export const ACTIONS = [
    { id: 'complete_task', free: true, visible: (s) => !s.flags.noManual, enabled: (s) => noModal(s) && eco.canCompleteTask(s), run: eco.completeTask },
    { id: 'price_down', free: true, visible: (s) => !!s.flags.priceRow && !s.flags.autoPricing, enabled: (s) => s.market.price > 0.01, run: eco.priceDown },
    { id: 'price_up', free: true, visible: (s) => !!s.flags.priceRow && !s.flags.autoPricing, enabled: () => true, run: eco.priceUp },
    { id: 'marketing', visible: (s) => !!s.flags.marketing && !s.flags.autoPricing, enabled: (s) => noModal(s) && eco.canBuyMarketing(s), run: eco.buyMarketing },
    { id: 'deploy_agent', visible: (s) => !!s.flags.deploy && !s.flags.autoDeploy, enabled: (s) => noModal(s) && eco.canDeployAgent(s), run: eco.deployAgent },
    { id: 'buy_gpu', visible: (s) => !!s.flags.gpuRow, enabled: (s) => noModal(s) && eco.canBuyGpu(s), run: eco.buyGpu },
    { id: 'buy_energy', visible: () => true, enabled: (s) => noModal(s) && eco.canBuyEnergy(s), run: eco.buyEnergy },
    { id: 'hire_researcher', visible: (s) => !!s.flags.lab, enabled: (s) => noModal(s) && eco.freeHeadcount(s) >= 1, run: eco.hireResearcher },
    { id: 'hire_engineer', visible: (s) => !!s.flags.lab, enabled: (s) => noModal(s) && eco.freeHeadcount(s) >= 1, run: eco.hireEngineer },
    { id: 'release', visible: (s) => s.training?.phase === 'done', enabled: (s) => noModal(s) && s.training?.phase === 'done', run: (s) => { shipWaitingRun(s); } },
    {
        id: 'safety_pass',
        visible: (s) => !!s.flags.evalSuite && s.training?.phase === 'done',
        enabled: (s) => noModal(s) && canSafetyPass(s),
        run: (s) => { if (safetyPass(s))
            log(s, `another safety pass. ${s.rival.name} is ${monthsBehind(s)} months behind.`); },
    },
    ...ALLOC_ACTIONS,
    // The training budget modal.
    ...[0.25, 0.5, 1].map((b) => ({
        id: `budget:${b}`,
        free: true,
        visible: (s) => s.modal?.kind === 'training',
        enabled: (s) => s.modal?.kind === 'training',
        run: (s) => { if (s.modal?.kind === 'training')
            s.modal.budget = b; },
    })),
    {
        id: 'train_start',
        visible: (s) => s.modal?.kind === 'training',
        enabled: (s) => {
            const m = s.modal;
            if (!m || m.kind !== 'training')
                return false;
            const p = REG.projectById[m.projectId];
            return !!p && canPay(s, projectCost(s, p)) && meets(s, p.req) && canStartRun(s);
        },
        run: (s) => { startTrainingFromModal(s); },
    },
    {
        id: 'train_cancel',
        free: true,
        visible: (s) => s.modal?.kind === 'training',
        enabled: (s) => s.modal?.kind === 'training',
        run: (s) => { if (s.modal?.kind === 'training')
            s.modal = null; },
    },
];
const BY_ID = {};
for (const a of ACTIONS)
    BY_ID[a.id] = a;
/** Look up an action, including dynamic `project:<id>` and `choice:<n>` actions. */
export function getAction(id) {
    if (BY_ID[id])
        return BY_ID[id];
    if (id.startsWith('project:')) {
        const pid = id.slice(8);
        return {
            id,
            visible: (s) => visibleProjects(s).some((p) => p.id === pid),
            enabled: (s) => canBuy(s, pid),
            run: (s) => { buyProject(s, pid); },
        };
    }
    if (id.startsWith('choice:')) {
        const n = Number(id.slice(7));
        return {
            id,
            visible: (s) => !!currentScene(s)?.scene.choices[n],
            enabled: (s) => {
                const c = currentScene(s)?.scene.choices[n];
                return !!c && choiceEnabled(s, c);
            },
            run: (s) => { choose(s, n); },
        };
    }
    return null;
}
export function act(s, id) {
    const a = getAction(id);
    if (!a || !a.visible(s) || !a.enabled(s))
        return false;
    a.run(s);
    eco.updateReveals(s);
    return true;
}
/** Ids of every visible, enabled, non-free action (projects included). */
export function affordableActions(s) {
    const out = [];
    for (const a of ACTIONS)
        if (!a.free && a.visible(s) && a.enabled(s))
            out.push(a.id);
    for (const p of visibleProjects(s))
        if (canBuy(s, p.id))
            out.push(`project:${p.id}`);
    const cur = currentScene(s);
    if (cur)
        cur.scene.choices.forEach((c, i) => { if (choiceEnabled(s, c))
            out.push(`choice:${i}`); });
    return out;
}
/** The critic's "nothing to do": no enabled purchase, no running bar, no open modal.
 *  `complete task` and the price arrows are free actions and do not count. */
export function isIdle(s) {
    if (s.modal)
        return false;
    if (s.training && s.training.phase !== 'done')
        return false;
    return affordableActions(s).length === 0;
}
//# sourceMappingURL=actions.js.map