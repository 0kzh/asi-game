import { fmtEnergy, fmtInt, fmtPrice } from '../../core/format.js';
import { agentCost, agentSlots, energyPrice, gpuBlock, gpuCost } from '../../core/economy.js';
import { actionButton, h, panelTitle, setText, show, syncAction } from '../dom.js';
let panel;
let title;
let agentsRow;
let agentsVal;
let deployBtn;
let gpuRow;
let gpuVal;
let gpuBtn;
let energyRow;
let energyVal;
let energyBtn;
function row(val, btn) {
    return h('div', { class: 'line split' }, h('span', { class: 'lbl' }, val), btn);
}
export function mount(root) {
    title = panelTitle('compute');
    agentsVal = h('span');
    deployBtn = actionButton('deploy_agent', 'deploy agent');
    gpuVal = h('span');
    gpuBtn = actionButton('buy_gpu', 'buy gpu');
    energyVal = h('span');
    energyBtn = actionButton('buy_energy', 'buy 500 kWh');
    agentsRow = row(agentsVal, deployBtn);
    gpuRow = row(gpuVal, gpuBtn);
    energyRow = row(energyVal, energyBtn);
    panel = h('div', { id: 'compute', class: 'panel' }, title, agentsRow, gpuRow, energyRow);
    root.append(panel);
}
export function update(s) {
    const f = s.flags;
    show(title, !!f.deploy);
    panel.classList.toggle('bare', !f.deploy);
    show(agentsRow, !!f.deploy);
    setText(agentsVal, `agents ${fmtInt(s.res.agents)} / ${fmtInt(agentSlots(s))}`);
    syncAction(deployBtn, s, `deploy agent (${fmtPrice(agentCost(s))})`);
    show(gpuRow, !!f.gpuRow);
    setText(gpuVal, `gpus ${fmtInt(s.res.gpus)}${s.res.gpus >= s.caps.gpus ? ' (full)' : ''}`);
    const n = gpuBlock(s);
    syncAction(gpuBtn, s, `buy ${n > 1 ? `${fmtInt(n)} gpus` : 'gpu'} (${fmtPrice(gpuCost(s))})`);
    setText(energyVal, `energy ${fmtEnergy(s.res.energy)}`);
    syncAction(energyBtn, s, `buy ${fmtEnergy(s.energyMkt.block)} (${fmtPrice(energyPrice(s))})`);
    show(energyRow, true);
}
//# sourceMappingURL=compute.js.map