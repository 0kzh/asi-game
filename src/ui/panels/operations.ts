// complete task, tasks/s and demand, price ▲▼, marketing. Stage 3 deletes complete task,
// the price arrows and marketing (flags.manualTask / priceControl / marketingControl = false).
import type { State } from '../../core/types.js';
import { fmtMoney, fmtPrice, fmtRate } from '../../core/format.js';
import { marketingCost } from '../../core/economy.js';
import { actionButton, h, panelTitle, setText, show, syncAction } from '../dom.js';

let title: HTMLElement;
let completeBtn: HTMLButtonElement;
let statsLine: HTMLElement;
let priceRow: HTMLElement;
let priceVal: HTMLElement;
let downBtn: HTMLButtonElement;
let upBtn: HTMLButtonElement;
let mktRow: HTMLElement;
let mktVal: HTMLElement;
let mktBtn: HTMLButtonElement;
let completeRow: HTMLElement;
let autoLine: HTMLElement;

export function mount(root: HTMLElement): void {
  title = panelTitle('operations');
  completeBtn = actionButton('complete_task', 'complete task', 'button primary');
  statsLine = h('div', { class: 'line small' });
  priceVal = h('span');
  downBtn = actionButton('price_down', '▼');
  upBtn = actionButton('price_up', '▲');
  priceRow = h('div', { class: 'line' }, 'price ', priceVal, ' ', downBtn, ' ', upBtn);
  mktVal = h('span');
  mktBtn = actionButton('marketing', 'marketing');
  mktRow = h('div', { class: 'line' }, mktVal, ' ', mktBtn);
  completeRow = h('div', { class: 'line' }, completeBtn);
  autoLine = h('div', { class: 'line', id: 'autoPricing' }, 'pricing is automated.');
  autoLine.hidden = true;
  const panel = h('div', { id: 'operations', class: 'panel' }, title, completeRow, statsLine, priceRow, autoLine, mktRow);
  root.append(panel);
}

export function update(s: State): void {
  const f = s.flags;
  const manual = f.manualTask !== false;
  const pricing = f.priceControl !== false;
  show(title, !!f.priceRow);
  show(completeRow, manual);
  syncAction(completeBtn, s);
  if (!manual) completeBtn.hidden = true;
  show(statsLine, !!f.priceRow);
  if (f.priceRow) setText(statsLine, `demand ${fmtRate(s.rates.demand)} · capacity ${fmtRate(s.rates.capacity)} · revenue ${fmtMoney(s.rates.revenuePerSec)}/s`);
  show(priceRow, !!f.priceRow && pricing && !f.autoPricing);
  show(autoLine, !pricing);
  setText(priceVal, fmtMoney(s.market.price));
  syncAction(downBtn, s);
  syncAction(upBtn, s);
  show(mktRow, !!f.marketing && f.marketingControl !== false && !f.autoPricing);
  setText(mktVal, `marketing lvl ${s.market.marketing}`);
  syncAction(mktBtn, s, `marketing (${fmtPrice(marketingCost(s))})`);
}
