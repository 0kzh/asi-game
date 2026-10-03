// agents, gpus, energy.
import type { State } from '../../core/types.js';
import { fmtEnergy, fmtInt, fmtPrice } from '../../core/format.js';
import { agentCost, agentSlots, energyPrice, gpuCost } from '../../core/economy.js';
import { actionButton, h, panelTitle, setText, show, syncAction } from '../dom.js';

let panel: HTMLElement;
let title: HTMLElement;
let agentsRow: HTMLElement; let agentsVal: HTMLElement; let deployBtn: HTMLButtonElement;
let gpuRow: HTMLElement; let gpuVal: HTMLElement; let gpuBtn: HTMLButtonElement;
let energyRow: HTMLElement; let energyVal: HTMLElement; let energyBtn: HTMLButtonElement;

function row(val: HTMLElement, btn: HTMLButtonElement): HTMLElement {
  return h('div', { class: 'line split' }, h('span', { class: 'lbl' }, val), btn);
}

export function mount(root: HTMLElement): void {
  title = panelTitle('compute');
  agentsVal = h('span'); deployBtn = actionButton('deploy_agent', 'deploy agent');
  gpuVal = h('span'); gpuBtn = actionButton('buy_gpu', 'buy gpu');
  energyVal = h('span'); energyBtn = actionButton('buy_energy', 'buy 500 kWh');
  agentsRow = row(agentsVal, deployBtn);
  gpuRow = row(gpuVal, gpuBtn);
  energyRow = row(energyVal, energyBtn);
  panel = h('div', { id: 'compute', class: 'panel' }, title, agentsRow, gpuRow, energyRow);
  root.append(panel);
}

export function update(s: State): void {
  const f = s.flags;
  show(title, !!f.deploy);
  panel.classList.toggle('bare', !f.deploy);
  show(agentsRow, !!f.deploy);
  setText(agentsVal, `agents ${fmtInt(s.res.agents)} / ${fmtInt(agentSlots(s))}`);
  syncAction(deployBtn, s, `deploy agent (${fmtPrice(agentCost(s))})`);
  show(gpuRow, !!f.gpuRow);
  setText(gpuVal, `gpus ${fmtInt(s.res.gpus)}${s.res.gpus >= s.caps.gpus ? ' (full)' : ''}`);
  syncAction(gpuBtn, s, `buy gpu (${fmtPrice(gpuCost(s))})`);
  setText(energyVal, `energy ${fmtEnergy(s.res.energy)}`);
  syncAction(energyBtn, s, `buy ${fmtEnergy(s.energyMkt.block)} (${fmtPrice(energyPrice(s))})`);
  show(energyRow, true);
}
