// Takeoff adapter, written against the dev/critic contract in
// docs/architecture.md ("Dev / critic API (window.game)") and docs/design.md
// §9–10:
//   window.game = { state, engine, dev: { jumpToStage(id), setSpeed(x), give(r, n),
//     set(path, v), fire(eventId), finishTraining(), listProjects(), affordableActions(),
//     idle(), snapshot(), load(json), reset() } }
// DOM (design §9): header <h2>Tasks Completed: N</h2>, #log .logLine (newest on
// top), panel titles "<b>title</b><hr>", stores box with data-legend, action
// buttons .button2, project buttons .projectButton (disabled = greyed), #modal.
// Only reads the game; never edits its files.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sleep } from './common.mjs';

const ROOT = process.env.CRITIC_TAKEOFF_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export const name = 'takeoff';
export const serveDir = ROOT;
export const entryPath = 'index.html?dev=1';
export const speedControl = 'window.game.dev.setSpeed(S)';
export const stages = {
  1: 'S1 A Small Lab — fresh start',
  2: 'S2 Agents (dev snapshot)',
  3: 'S3 Takeoff (dev snapshot)',
  '4a': 'S4 The Decision — slowdown (dev snapshot)',
  '4b': 'S4 The Decision — race (dev snapshot)',
  '5a': 'S5 Superintelligence — slowdown (dev snapshot)',
  '5b': 'S5 Superintelligence — race (dev snapshot)',
};

export async function ready(page) {
  await page.waitForFunction(() => window.game && window.game.dev && window.game.state, null, { timeout: 30000 });
}

export async function setSpeed(page, speed) {
  return page.evaluate((speed) => { window.game.dev.setSpeed(speed); return speed; }, speed);
}

export async function jumpToStage(page, id, opts = {}) {
  id = String(id);
  const notes = [];
  if (id !== '1') {
    await page.evaluate((id) => window.game.dev.jumpToStage(id), id);
    notes.push(`window.game.dev.jumpToStage('${id}')`);
    await sleep(500);
  } else notes.push('fresh start (new state in a fresh browser profile)');
  if (opts.seed !== undefined && opts.seed !== null) {
    const ok = await page.evaluate((seed) => {
      try { window.game.dev.set('seed', Number(seed)); window.game.dev.set('rng', Number(seed)); return true; } catch (e) { return String(e); }
    }, opts.seed);
    notes.push(`seed: dev.set('seed'|'rng', ${opts.seed}) → ${ok}`);
  }
  return { notes };
}

// In-page classification shared by observe and act (serialised as a string).
const CLASSIFY = String.raw`
  const C = window.__critic;
  const isChrome = (el) => !!el.closest('[id*="dev" i], [class*="dev" i], #footer, footer, .menu');
  const inModal = (el) => !!el.closest('#modal, .eventPanel');
  const labelOf = (b) => {
    if (b.classList.contains('projectButton')) {
      const t = b.querySelector('b, strong, .title');
      if (t) return C.text(t);
    }
    return (b.innerText || b.textContent || '').split('\n').map((s) => s.trim()).filter(Boolean)[0] || b.id || '?';
  };
  const kindOf = (b, l) => {
    if (inModal(b)) return 'event';
    if (/^complete task/i.test(l)) return 'production';
    if (b.classList.contains('projectButton')) return 'project';
    if (/^[-+−–▲▼<>±×]+\s*\d*%?$/.test(l) || /^(lower|raise)\b/i.test(l)) return 'adjust';
    if (/\bkwh\b|\benergy\b/i.test(l)) return 'consumable';
    return 'goal';
  };
  const controls = () => [...document.querySelectorAll('button, [role="button"]')]
    .filter((b) => !isChrome(b) && C.vis(b, { ignoreVisibility: b.classList.contains('projectButton') }))
    .map((b) => { const l = labelOf(b); return { b, l, kind: kindOf(b, l), disabled: !!(b.disabled || b.getAttribute('aria-disabled') === 'true') }; });
`;

export async function observe(page) {
  return page.evaluate((CLASSIFY) => {
    // eslint-disable-next-line no-new-func
    const lib = new Function(CLASSIFY + '; return { C, controls, isChrome };')();
    const { C, controls, isChrome } = lib;
    const g = window.game; const st = (g && g.state) || {};
    const out = { enabledButtons: [], production: [], enabledGoals: [], disabledGoals: [], disabledControls: [], extraControls: [] };
    const seen = new Map();
    const uniq = (l) => { const n = (seen.get(l) || 0) + 1; seen.set(l, n); return n === 1 ? l : l + ' #' + n; };
    for (const c of controls()) {
      const l = uniq(c.l);
      if (!c.disabled) {
        out.enabledButtons.push(c.kind === 'event' ? 'event: ' + l : l);
        if (c.kind === 'production') out.production.push(l);
        if (c.kind === 'goal' || c.kind === 'project') out.enabledGoals.push(l);
      } else {
        out.disabledControls.push(l);
        if (c.kind === 'goal' || c.kind === 'project') out.disabledGoals.push(l);
      }
    }
    for (const el of document.querySelectorAll('select, input[type="range"], input[type="checkbox"]')) {
      if (!isChrome(el) && C.vis(el)) out.extraControls.push(el.id || el.name || el.type);
    }
    // panels: the column children (#col2 > div[id], #col3 > div[id]); the label
    // is the id, plus the visible panel title when it differs (renames show up).
    const panels = new Set();
    const cols = document.querySelectorAll('#col2 > [id], #col3 > [id]');
    for (const el of cols) {
      if (isChrome(el) || !C.vis(el)) continue;
      const tEl = el.querySelector('.panelTitle b, b');
      const title = tEl && C.vis(tEl) ? C.text(tEl).toLowerCase() : '';
      const legend = (el.getAttribute('data-legend') || '').toLowerCase();
      const name = title || legend;
      panels.add(name && name !== el.id.toLowerCase() ? `${el.id}: ${name}` : el.id);
    }
    if (!cols.length) {   // fallback for an unexpected DOM: "<b>title</b><hr>" headings
      for (const b of document.querySelectorAll('b, strong, h3, h4')) {
        const n = b.nextElementSibling;
        if (n && n.tagName === 'HR' && !isChrome(b) && C.vis(b)) panels.add(C.text(b).toLowerCase());
      }
    }
    const modalEl = document.querySelector('#modal');
    const modalOpen = !!(st.modal) || !!(modalEl && C.vis(modalEl) && C.text(modalEl).length > 0);
    const tr = st.training;
    const progressRunning = !!(tr && tr.phase && tr.phase !== 'done');
    const h2 = document.querySelector('header h2, #header h2, h2');
    const logTail = [...document.querySelectorAll('#log .logLine, #log > div, #log > p')].slice(0, 3).map((n) => C.text(n)).filter(Boolean);
    let api = {};
    try { api.idle = g.dev.idle(); } catch (e) { api.idleError = String(e); }
    try { api.affordable = g.dev.affordableActions(); } catch (e) { api.affordableError = String(e); }
    try { const lp = g.dev.listProjects() || []; api.projectsVisible = lp.filter((p) => p.visible).length; api.projectsAffordable = lp.filter((p) => p.visible && p.affordable).length; } catch (e) { api.listProjectsError = String(e); }
    const res = st.res || {};
    return {
      ...out,
      panels: [...panels],
      modalOpen,
      progressRunning,
      headline: h2 ? C.text(h2) : '',
      hint: C.text(document.getElementById('hint')),
      logTail,
      funds: typeof res.funds === 'number' ? res.funds : null,
      gameT: st.t,
      res: { stage: st.stage, branch: st.branch, dateDays: st.dateDays, ...res, capability: st.model && st.model.capability, price: st.market && st.market.price, capacity: st.rates && st.rates.capacity, demand: st.rates && st.rates.demand, energyPerSec: st.rates && st.rates.energyPerSec, training: tr ? { phase: tr.phase, progress: tr.progress } : null, ending: st.ending || null },
      api,
    };
  }, CLASSIFY);
}

export const botDefaults = {
  clicks: 5,           // complete-task clicks per step
  energyMin: 200,      // buy energy when below max(energyMin, energySeconds x use/s)…
  energySeconds: 30,   // …and auto-buy is off (the Paperclips wire rule)
  demandHi: 1.5,       // raise price when demand > demandHi x capacity
  demandLo: 1.0,       // lower price when demand < demandLo x capacity (the inventory rule)
};

export async function act(page, sample, opts = {}) {
  const o = { ...botDefaults, ...opts };
  return page.evaluate(({ CLASSIFY, o }) => {
    // eslint-disable-next-line no-new-func
    const { C, controls } = new Function(CLASSIFY + '; return { C, controls };')();
    const g = window.game; const st = (g && g.state) || {};
    const res = st.res || {};
    const acted = [];
    const all = controls();
    const enabled = all.filter((c) => !c.disabled);
    const press = (c, tag) => { c.b.click(); acted.push((tag ? tag + ': ' : '') + c.l); };
    // 1. modal: take the first enabled choice
    const ev = enabled.filter((c) => c.kind === 'event');
    if (ev.length || st.modal) { if (ev.length) press(ev[0], 'event'); return acted; }
    // 2. production clicks
    const prod = enabled.find((c) => c.kind === 'production');
    if (prod) { let k = 0; for (let i = 0; i < o.clicks; i++) { if (prod.b.disabled) break; prod.b.click(); k++; } if (k) acted.push(`${prod.l} x${k}`); }
    // 3. energy when low (unless the game auto-buys)
    const rates = st.rates || {};
    const en = enabled.find((c) => c.kind === 'consumable');
    const autoBuy = st.energyMkt && st.energyMkt.autoBuy;
    if (en && !autoBuy && typeof res.energy === 'number' && res.energy < Math.max(o.energyMin, o.energySeconds * (rates.energyPerSec || 0))) press(en);
    // 3b. price: keep demand a little above capacity
    if (typeof rates.demand === 'number' && typeof rates.capacity === 'number' && rates.capacity > 0) {
      const up = enabled.find((c) => c.kind === 'adjust' && /▲|^raise/i.test(c.l));
      const dn = enabled.find((c) => c.kind === 'adjust' && /▼|^lower/i.test(c.l));
      if (rates.demand > o.demandHi * rates.capacity && up) press(up, 'price');
      else if (rates.demand < o.demandLo * rates.capacity && dn) press(dn, 'price');
    }
    // 4. one project (oldest visible affordable first)
    const proj = enabled.find((c) => c.kind === 'project');
    if (proj) press(proj, 'project');
    // 5. cheapest other purchase, relative to the currency held
    const unit = (s) => {
      if (/\$/.test(s)) return 'funds';
      const m = s.toLowerCase().match(/(research|insight|headcount|gpus?|energy|data|agents?)\b/);
      return m ? m[1].replace(/s$/, '') : null;
    };
    const held = (u) => { const k = { gpu: 'gpus', agent: 'agents' }[u] || u; return typeof res[k] === 'number' ? res[k] : NaN; };
    const relCost = (c) => {
      const txt = (c.b.innerText || c.b.textContent || '').replace(/\n/g, ' ');
      const m = txt.match(/\(([^)]*)\)/) || txt.match(/(\$\s?[\d.,]+\s*[kmbt]?)/i);
      if (!m) return 0;                       // free action (hire, release, start)
      const u = unit(m[1]);
      const v = C.num(m[1]);
      const h = held(u);
      if (!u || Number.isNaN(v) || Number.isNaN(h) || h <= 0) return 0.5;
      return v / h;
    };
    const goals = enabled.filter((c) => c.kind === 'goal').map((c) => ({ c, r: relCost(c) })).sort((a, b) => a.r - b.r);
    // alternate hires so the bot does not pour all headcount into one role
    const hires = goals.filter((x) => /researcher|engineer/i.test(x.c.l));
    if (hires.length > 1) {
      const want = (res.researchers || 0) <= (res.engineers || 0) ? /researcher/i : /engineer/i;
      const pick = hires.find((x) => want.test(x.c.l)) || hires[0];
      press(pick.c);
    } else if (goals.length) press(goals[0].c);
    return acted;
  }, { CLASSIFY, o });
}
