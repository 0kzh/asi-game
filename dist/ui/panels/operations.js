import { fmtMoney, fmtPrice, fmtRate } from '../../core/format.js';
import { marketingCost } from '../../core/economy.js';
import { actionButton, h, panelTitle, setText, show, syncAction } from '../dom.js';
let title;
let completeBtn;
let statsLine;
let priceRow;
let priceVal;
let downBtn;
let upBtn;
let mktRow;
let mktVal;
let mktBtn;
export function mount(root) {
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
    const panel = h('div', { id: 'operations', class: 'panel' }, title, h('div', { class: 'line' }, completeBtn), statsLine, priceRow, mktRow);
    root.append(panel);
}
export function update(s) {
    const f = s.flags;
    show(title, !!f.priceRow);
    syncAction(completeBtn, s);
    show(statsLine, !!f.priceRow);
    if (f.priceRow)
        setText(statsLine, `${fmtRate(s.rates.tasksPerSec, ' tasks/s')} · demand ${fmtRate(s.rates.demand)} · ${fmtMoney(s.rates.revenuePerSec)}/s`);
    show(priceRow, !!f.priceRow && !f.autoPricing);
    setText(priceVal, fmtMoney(s.market.price));
    syncAction(downBtn, s);
    syncAction(upBtn, s);
    show(mktRow, !!f.marketing && !f.autoPricing);
    setText(mktVal, `marketing lvl ${s.market.marketing}`);
    syncAction(mktBtn, s, `marketing (${fmtPrice(marketingCost(s))})`);
}
//# sourceMappingURL=operations.js.map