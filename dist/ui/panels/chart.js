import { CAPABILITY_LINES } from '../../content/models.js';
import { dateOf } from '../../core/format.js';
import { h, show } from '../dom.js';
const W = 320, H = 140;
let panel;
let canvas;
let drawnKey = '';
export function mount(root) {
    canvas = h('canvas', { id: 'chart', width: W, height: H });
    panel = h('div', { id: 'chartPanel', class: 'panel' }, canvas);
    panel.hidden = true;
    root.append(panel);
}
export function update(s) {
    show(panel, !!s.flags.chart);
    if (panel.hidden)
        return;
    const last = s.chart[s.chart.length - 1];
    const k = `${s.chart.length}|${last?.join(',')}|${s.chartMarks.length}|${Math.floor(s.dateDays)}|${document.body.classList.contains('dark')}`;
    if (k === drawnKey)
        return;
    drawnKey = k;
    draw(s);
}
function draw(s) {
    const ctx = canvas.getContext('2d');
    if (!ctx)
        return;
    const dark = document.body.classList.contains('dark');
    const ink = dark ? '#eee' : '#000';
    const grey = dark ? '#777' : '#999';
    const bg = dark ? '#272823' : '#fff';
    const pts = s.chart.length ? s.chart : [[s.dateDays, s.model.capability, s.rival.capability]];
    const maxDay = Math.max(365, s.dateDays * 1.25, ...pts.map((p) => p[0]));
    const top = Math.max(...pts.map((p) => Math.max(p[1], p[2])), s.model.capability);
    const yMin = 0.5;
    const yMax = Math.min(7.5, Math.max(3, Math.ceil(top + 1)));
    const padL = 4, padB = 12, padT = 4;
    const x = (d) => padL + (d / maxDay) * (W - padL - 4);
    const y = (c) => padT + (1 - (c - yMin) / (yMax - yMin)) * (H - padT - padB);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.font = '10px Helvetica, Arial, sans-serif';
    ctx.textBaseline = 'middle';
    // Reference lines, labels at the right edge; skip labels that would overlap.
    let lastLabelY = Infinity;
    ctx.lineWidth = 1;
    for (const [c, label] of CAPABILITY_LINES) {
        if (c < yMin || c > yMax)
            continue;
        const yy = Math.round(y(c)) + 0.5;
        ctx.strokeStyle = dark ? '#3a3b35' : '#e2e2e2';
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(padL, yy);
        ctx.lineTo(W - 2, yy);
        ctx.stroke();
        if (lastLabelY - yy >= 10 && yy >= 16) {
            ctx.fillStyle = grey;
            ctx.textAlign = 'right';
            ctx.fillText(label, W - 4, yy - 5);
            lastLabelY = yy;
        }
    }
    // Year ticks on the x axis.
    ctx.fillStyle = grey;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (let year = 2026;; year++) {
        const d = Math.round((Date.UTC(year, 0, 1) - dateOf(0).getTime()) / 86400000);
        if (d > maxDay)
            break;
        const xx = Math.round(x(d)) + 0.5;
        ctx.strokeStyle = grey;
        ctx.beginPath();
        ctx.moveTo(xx, H - padB);
        ctx.lineTo(xx, H - padB + 3);
        ctx.stroke();
        ctx.fillText(String(year), xx, H - 1);
    }
    // Release marks.
    ctx.strokeStyle = grey;
    for (const [d] of s.chartMarks) {
        const xx = Math.round(x(d)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(xx, H - padB - 6);
        ctx.lineTo(xx, H - padB);
        ctx.stroke();
    }
    // Rival: dashed grey.
    ctx.strokeStyle = grey;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(x(p[0]), y(p[2])) : ctx.moveTo(x(p[0]), y(p[2]))));
    ctx.stroke();
    // Legend, top-left: the player's line and "deepcent (est.)" dashed.
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = bg;
    ctx.fillRect(padL + 1, padT + 1, 150, 12);
    ctx.beginPath();
    ctx.moveTo(padL + 4, padT + 7);
    ctx.lineTo(padL + 18, padT + 7);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = grey;
    ctx.fillText(`${s.rival.name} (est.)`, padL + 22, padT + 7);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.5;
    const lx = padL + 100;
    ctx.beginPath();
    ctx.moveTo(lx, padT + 7);
    ctx.lineTo(lx + 14, padT + 7);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = ink;
    ctx.fillText('you', lx + 18, padT + 7);
    // Player: solid black.
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(x(p[0]), y(p[1])) : ctx.moveTo(x(p[0]), y(p[1]))));
    ctx.stroke();
    ctx.lineWidth = 1;
}
//# sourceMappingURL=chart.js.map