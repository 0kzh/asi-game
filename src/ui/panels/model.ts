// The current model, the training bar (ADR cooldown bar), and the end-of-run block.
import type { State } from '../../core/types.js';
import { actionButton, h, panelTitle, setAttr, setText, show, syncAction } from '../dom.js';

const PHASE: Record<string, string> = { pre: 'pretraining', post: 'post-training', evals: 'evals', done: 'done' };

let panel: HTMLElement;
let modelLine: HTMLElement;
let bar: HTMLElement; let fill: HTMLElement; let barLabel: HTMLElement;
let endBlock: HTMLElement; let endTitle: HTMLElement; let endStats: HTMLElement;
let releaseBtn: HTMLButtonElement;
let actionsRow: HTMLElement;
let safetyBtn: HTMLButtonElement | null = null;

export function mount(root: HTMLElement): void {
  modelLine = h('div', { class: 'line' });
  fill = h('div', { class: 'cooldown' });
  barLabel = h('span', { class: 'barLabel' });
  bar = h('div', { class: 'bar', id: 'trainingBar' }, fill, barLabel);
  endTitle = h('div', { class: 'line' });
  endStats = h('div', { class: 'line' });
  releaseBtn = actionButton('release', 'release');
  actionsRow = h('div', { class: 'line' }, releaseBtn);
  endBlock = h('div', { class: 'endOfRun' }, endTitle, endStats, actionsRow);
  panel = h('div', { id: 'model', class: 'panel' }, panelTitle('model'), modelLine, bar, endBlock);
  panel.hidden = true;
  root.append(panel);
}

export function update(s: State): void {
  show(panel, !!s.flags.modelPanel);
  if (panel.hidden) return;
  const m = s.model;
  setText(modelLine, `${m.name} · capability ${m.capability.toFixed(1)}${s.flags.evalSuite ? ` · alignment ${Math.round(m.alignment)}` : ''}`);
  const tr = s.training;
  const running = !!tr && tr.phase !== 'done';
  show(bar, running);
  setAttr(bar, 'data-active', running ? '1' : null);
  if (tr && running) {
    const w = `${(tr.progress * 100).toFixed(1)}%`;
    if (fill.style.width !== w) fill.style.width = w;
    setText(barLabel, `${tr.name}: ${PHASE[tr.phase]} ${Math.floor(tr.progress * 100)}%`);
  }
  const done = !!tr && tr.phase === 'done';
  show(endBlock, done);
  if (tr && done) {
    const gain = tr.capNow - tr.capStart;
    setText(endTitle, `${tr.key === 'finetune' ? 'the fine-tune' : tr.name} is trained.`);
    setText(endStats, `capability: ${tr.capNow.toFixed(1)} (${gain >= 0 ? '+' : ''}${gain.toFixed(1)})   findings: ${tr.findings}`);
  }
  syncAction(releaseBtn, s);
  // The safety pass exists only once `eval_suite` is bought (stage 2 content wires its action).
  if (s.flags.evalSuite && !safetyBtn) {
    safetyBtn = actionButton('safety_pass', 'another safety pass — 30 s, −2 findings');
    actionsRow.append(' ', safetyBtn);
  } else if (!s.flags.evalSuite && safetyBtn) {
    safetyBtn.remove();
    safetyBtn = null;
  }
  if (safetyBtn) syncAction(safetyBtn, s);
}
