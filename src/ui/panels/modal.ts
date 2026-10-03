// Choice events and the training budget modal (ADR event panel over a 60% white sheet).
import type { State } from '../../core/types.js';
import { currentScene, sceneText } from '../../core/events.js';
import { REG } from '../../core/registry.js';
import { generation } from '../../content/models.js';
import { runDuration, runGain } from '../../core/models.js';
import { costText } from '../../core/cost.js';
import { projectCost } from '../../core/projects.js';
import { actionButton, h, setAttr, setText, show, syncAction } from '../dom.js';

let root: HTMLElement;
let panel: HTMLElement;
let titleEl: HTMLElement;
let descEl: HTMLElement;
let buttonsEl: HTMLElement;
let key = '';
let blinkTimer: number | null = null;
let budgetInfo: HTMLElement | null = null;

export function mount(r: HTMLElement): void {
  root = r;
  titleEl = h('div', { class: 'eventTitle' });
  descEl = h('div', { id: 'description' });
  buttonsEl = h('div', { id: 'buttons' });
  panel = h('div', { class: 'eventPanel', role: 'dialog' }, titleEl, descEl, buttonsEl);
  root.append(panel);
  root.hidden = true;
}

function modalKey(s: State): string {
  const m = s.modal;
  if (!m) return '';
  return m.kind === 'choice' ? `c|${m.eventId}|${m.sceneId}` : `t|${m.projectId}`;
}

function build(s: State): void {
  const m = s.modal;
  budgetInfo = null;
  if (!m) return;
  if (m.kind === 'choice') {
    const cur = currentScene(s);
    if (!cur) return;
    setText(titleEl, cur.ev.title);
    descEl.replaceChildren(h('div', {}, sceneText(s)));
    buttonsEl.replaceChildren(...cur.scene.choices.map((c, i) => {
      const label = c.cost ? `${c.text} (${costText(c.cost)})` : c.text;
      return actionButton(`choice:${i}`, label);
    }));
  } else {
    const p = REG.projectById[m.projectId];
    const g = generation(p.training ?? 'agent1');
    setText(titleEl, `training run: ${g.name}`);
    budgetInfo = h('div', { class: 'line small' });
    const budgets = h('div', { class: 'line' }, 'compute budget ',
      actionButton('budget:0.25', '25%'), ' ', actionButton('budget:0.5', '50%'), ' ', actionButton('budget:1', '100%'));
    descEl.replaceChildren(budgets, budgetInfo,
      h('div', { class: 'line small' }, `cost: ${costText(projectCost(s, p), p.req)}`),
      h('div', { class: 'line small' }, 'deployment capacity drops by the budget share while it runs.'));
    buttonsEl.replaceChildren(actionButton('train_start', 'start'), actionButton('train_cancel', 'cancel'));
  }
}

export function update(s: State): void {
  const k = modalKey(s);
  if (k !== key) {
    key = k;
    build(s);
  }
  show(root, !!s.modal);
  for (const b of root.querySelectorAll<HTMLButtonElement>('button[data-action]')) syncAction(b, s);
  if (s.modal?.kind === 'training') {
    const m = s.modal;
    const p = REG.projectById[m.projectId];
    for (const b of root.querySelectorAll<HTMLButtonElement>('button[data-action^="budget:"]')) {
      setAttr(b, 'aria-pressed', b.dataset.action === `budget:${m.budget}` ? 'true' : 'false');
    }
    if (budgetInfo && p?.training) {
      const waiting = s.training?.phase === 'done' ? ` · ${s.training.name} ships first` : '';
      setText(budgetInfo, `${Math.round(runDuration(p.training, m.budget))} s · gain ×${runGain(m.budget).toFixed(2)} · deployment −${Math.round(m.budget * 100)}%${waiting}`);
    }
  }
  // Blink *** EVENT *** in the tab title while a modal is open (ADR).
  if (s.modal && blinkTimer === null) {
    blinkTimer = window.setInterval(() => {
      document.title = document.title === '*** EVENT ***' ? 'Takeoff' : '*** EVENT ***';
    }, 1000);
  } else if (!s.modal && blinkTimer !== null) {
    clearInterval(blinkTimer);
    blinkTimer = null;
    document.title = 'Takeoff';
  }
}
