import { REG } from '../core/registry.js';
import * as header from './panels/header.js';
import * as logPanel from './panels/log.js';
import * as stores from './panels/stores.js';
import * as operations from './panels/operations.js';
import * as compute from './panels/compute.js';
import * as allocation from './panels/allocation.js';
import * as lab from './panels/lab.js';
import * as model from './panels/model.js';
import * as chart from './panels/chart.js';
import * as projects from './panels/projects.js';
import * as politics from './panels/politics.js';
import * as stats from './panels/stats.js';
import * as modal from './panels/modal.js';
import * as ending from './panels/ending.js';
import * as flash from './panels/flash.js';
const PANELS = [header, logPanel, stores, operations, compute, allocation, lab, model, chart, projects, politics, stats, modal, ending, flash];
let lastStage = 0;
let lastState = null;
export function mountUI() {
    const byId = (id) => {
        const el = document.getElementById(id);
        if (!el)
            throw new Error(`#${id} missing from index.html`);
        return el;
    };
    header.mount(byId('header'));
    logPanel.mount(byId('logCol'));
    const col2 = byId('col2');
    stores.mount(col2);
    operations.mount(col2);
    compute.mount(col2);
    allocation.mount(col2);
    lab.mount(col2);
    model.mount(col2);
    const col3 = byId('col3');
    chart.mount(col3);
    projects.mount(col3);
    stats.mount(col3);
    politics.mount(col3);
    modal.mount(byId('modal'));
    ending.mount(document.body);
    flash.mount(byId('flash'));
}
/** Immediate-mode render: every panel re-asserts visibility, text and disabled from state. */
export function render(s) {
    if (s !== lastState) {
        // A different state object (load, snapshot, reset): no flash, rebuild project buttons.
        if (lastState)
            projects.reset();
        lastState = s;
        lastStage = s.stage;
    }
    if (s.stage > lastStage) {
        // A stage's own `flash` text; a stage whose enter() sets s.flash leaves `flash` unset.
        const text = REG.stages[s.stage]?.flash;
        if (text && !s.flash)
            flash.play(text);
    }
    lastStage = s.stage;
    for (const p of PANELS)
        p.update(s);
}
//# sourceMappingURL=render.js.map