// A Dark Room adapter. Served over http (script loading). Speed: the game's own
// hyper mode (x2), switched on with Engine.triggerHyperMode() — the same
// function the "hyper." menu link calls after its confirm dialog. Stage jumps
// are $SM writes + the modules' own init/update functions. Nothing in the
// reference files is modified.
//
// Notes on what counts as "visible": A Dark Room shows one location at a time
// but every unlocked location is one click away in the header, so controls and
// sections of all unlocked locations are reported (the header tabs themselves
// go to extraControls). Build/craft/buy buttons are never greyed by the game
// when unaffordable (only when maxed); the adapter classifies an unaffordable
// one as a disabledGoal (clicking it only prints "not enough wood").

import { sleep } from './common.mjs';

const REF = process.env.CRITIC_ADR_DIR
  || '/tmp/claude-0/-home-user-asi-game/fe6836a4-3e69-525f-b45f-9fbb91a6171c/scratchpad/ref/adarkroom';

export const name = 'adarkroom';
export const serveDir = REF;
export const entryPath = 'index.html';
export const speedControl = 'hyper mode (x2) via Engine.triggerHyperMode() when --speed >= 2';
export const stages = {
  1: 'Opening — a dark room, fresh start',
  2: 'Builder helping, forest unlocked ($SM writes)',
  3: 'Small village: 4 huts, lodge, 16 villagers ($SM writes)',
  4: 'The dusty path: compass bought, trading post ($SM writes)',
};

export async function ready(page) {
  await page.waitForFunction(() => window.Engine && window.$SM && window.Room && document.getElementById('lightButton'), null, { timeout: 30000 });
}

export async function setSpeed(page, speed) {
  return page.evaluate((speed) => {
    if (speed >= 2 && !Engine.options.doubleTime) Engine.triggerHyperMode();
    if (speed < 2 && Engine.options.doubleTime) Engine.triggerHyperMode();
    return Engine.options.doubleTime ? 2 : 1;
  }, speed);
}

// The exact writes, kept as data so the README can list them.
export const STAGE_WRITES = {
  2: [
    "$SM.set('game.fire', Room.FireEnum.Roaring)",
    "$SM.set('game.temperature', Room.TempEnum.Hot)",
    "$SM.set('game.builder.level', 4)",
    "$SM.setIncome('builder', {delay: 10, stores: {wood: 2}})",
    "$SM.set('stores.wood', 50)",
    "$SM.set('game.buildings', {}); $SM.set('game.population', 0); $SM.set('game.workers', {})",
    "$SM.set('features.location.outside', true); Outside.init()",
    'Room.updateButton(); Room.setTitle(); Room.updateIncomeView(); Room.updateBuildButtons()',
  ],
  3: [
    "$SM.set('game.buildings', {trap: 4, cart: 1, hut: 4, lodge: 1})",
    "$SM.set('game.population', 16)",
    "$SM.setM('stores', {wood: 300, fur: 40, meat: 40, bait: 10})",
    'Outside.updateVillage(); Outside.updateWorkersView(); Outside.updateVillageIncome(); Outside.updateTrapButton(); Room.updateBuildButtons()',
  ],
  4: [
    "$SM.set('game.buildings[\"trading post\"]', 1); $SM.set('game.buildings[\"tannery\"]', 1); $SM.set('game.buildings[\"smokehouse\"]', 1); $SM.set('game.buildings[\"hut\"]', 8)",
    "$SM.set('game.population', 32)",
    "$SM.setM('stores', {wood: 1000, fur: 200, meat: 100, scales: 10, teeth: 10, leather: 30, 'cured meat': 30, compass: 1})",
    'Outside.updateVillage(); Outside.updateWorkersView(); Outside.updateVillageIncome(); Room.updateBuildButtons(); Room.updateStoresView()  // compass → Path.openPath()',
  ],
};

export async function jumpToStage(page, id) {
  id = String(id);
  const notes = [];
  if (id === '1') { notes.push('fresh start, no writes'); return { notes }; }
  if (!STAGE_WRITES[id]) throw new Error(`adarkroom: unknown stage ${id}`);
  for (const s of ['2', '3', '4']) {
    if (Number(s) > Number(id)) break;
    for (const code of STAGE_WRITES[s]) {
      await page.evaluate((code) => { (0, eval)(code.replace(/\/\/.*$/, '')); }, code);
      notes.push(code);
    }
    await sleep(300);
  }
  await page.evaluate(() => { if (Engine.activeModule !== Room) Engine.travelTo(Room); });
  return { notes };
}

export async function observe(page) {
  return page.evaluate(() => {
    const C = window.__critic;
    const shown = (el) => el && el.isConnected && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
    const label = (b) => ((b.childNodes[0] && b.childNodes[0].nodeType === 3 ? b.childNodes[0].textContent : C.text(b)) || b.id).trim();
    const stores = $SM.get('stores') || {};
    const costOf = (thing) => { const g = Room.Craftables[thing] || Room.TradeGoods[thing]; return g ? g.cost() : {}; };
    const affordable = (cost) => Object.keys(cost).every((k) => ($SM.get('stores["' + k + '"]', true) || 0) >= cost[k]);
    const PROD = new Set(['lightButton', 'stokeButton', 'gatherButton', 'trapsButton']);
    const out = { enabledButtons: [], production: [], enabledGoals: [], disabledGoals: [], disabledControls: [], extraControls: [] };
    let progressRunning = false;
    const headers = [...document.querySelectorAll('#header .headerButton')];
    const active = Engine.activeModule && Engine.activeModule.panel ? Engine.activeModule.panel.attr('id') : null;
    for (const h of headers) if (!h.classList.contains('selected') && headers.length > 1) out.extraControls.push('go:' + h.id.replace('location_', ''));
    const panelsEls = [...document.querySelectorAll('#locationSlider > .location')];
    for (const p of panelsEls) {
      for (const b of p.querySelectorAll('div.button')) {
        if (!shown(b) || b.closest('.tooltip')) continue;
        const l = label(b);
        const dis = b.classList.contains('disabled');
        const thing = b.getAttribute('buildThing');
        if ($(b).data('onCooldown')) progressRunning = true;
        if (thing) {
          if (dis) { out.disabledControls.push(l); continue; }          // maxed out
          if (affordable(costOf(thing))) { out.enabledButtons.push(l); out.enabledGoals.push(l); }
          else { out.disabledGoals.push(l); out.disabledControls.push(l); }
          continue;
        }
        if (dis) { out.disabledControls.push(l); continue; }
        out.enabledButtons.push(l);
        if (PROD.has(b.id)) out.production.push(l);
      }
      for (const row of p.querySelectorAll('.workerRow, .outfitRow')) {
        const key = row.getAttribute('key') || C.text(row.querySelector('.row_key'));
        for (const [cls, suffix] of [['upBtn', '+1'], ['dnBtn', '-1'], ['upManyBtn', '+10'], ['dnManyBtn', '-10']]) {
          const b = row.querySelector('.' + cls);
          if (!b || !shown(b)) continue;
          const l = `${key} ${suffix}`;
          if (b.classList.contains('disabled')) out.disabledControls.push(l); else out.enabledButtons.push(l);
        }
      }
    }
    const ev = Events.activeEvent && Events.activeEvent();
    const modalOpen = !!ev;
    // the one-off "Sound Available!" prompt is a settings dialog, not a game choice
    const metaModal = !!(ev && ev.title === _('Sound Available!'));
    if (modalOpen && !metaModal) for (const b of document.querySelectorAll('#event #buttons .button')) {
      const l = 'event: ' + label(b);
      if (b.classList.contains('disabled')) out.disabledControls.push(l); else out.enabledButtons.push(l);
    }
    const panels = headers.map((h) => 'loc:' + h.id.replace('location_', ''));
    const SECTIONS = [['stores', 'stores'], ['weapons', 'weapons'], ['buildBtns', 'build'], ['craftBtns', 'craft'], ['buyBtns', 'buy'],
      ['village', 'village'], ['workers', 'workers'], ['outfitting', 'supplies']];
    for (const [id, l] of SECTIONS) {
      const el = document.getElementById(id);
      if (el && el.isConnected && getComputedStyle(el).display !== 'none' && el.children.length) panels.push(l);
    }
    const fire = $SM.get('game.fire.value');
    const pop = $SM.get('game.population');
    const huts = $SM.get('game.buildings["hut"]', true) || 0;
    const wood = stores.wood;
    const fireText = Room.FireEnum.fromInt(fire)?.text || '';
    let headline = `wood ${wood === undefined ? 0 : Math.floor(wood)} · fire ${fireText}`;
    if (typeof pop === 'number' && huts > 0) headline += ` · pop ${pop}/${huts * 4}`;
    return {
      ...out,
      panels,
      modalOpen,
      modalTitle: ev ? ev.title : null,
      progressRunning,
      headline,
      logTail: [...document.querySelectorAll('#notifications .notification')].slice(0, 3).map((n) => C.text(n)),
      funds: wood === undefined ? 0 : wood,
      activeLocation: active,
      res: { stores: { ...stores }, fire, temperature: $SM.get('game.temperature.value'), builder: $SM.get('game.builder.level'), population: pop, huts, buildings: { ...($SM.get('game.buildings') || {}) }, workers: { ...($SM.get('game.workers') || {}) }, hyper: Engine.options.doubleTime },
    };
  });
}

export const botDefaults = { gathererShare: 0.5 };

export async function act(page, sample, opts = {}) {
  const o = { ...botDefaults, ...opts };
  return page.evaluate((o) => {
    const acted = [];
    const shown = (el) => el && el.isConnected && getComputedStyle(el).display !== 'none';
    const ok = (el) => shown(el) && !el.classList.contains('disabled');
    const lab = (b) => ((b.childNodes[0] && b.childNodes[0].nodeType === 3 ? b.childNodes[0].textContent : b.textContent) || b.id).trim();
    const click = (el, l) => { el.click(); acted.push(l || lab(el)); };
    if (Events.activeEvent && Events.activeEvent()) {
      const b = [...document.querySelectorAll('#event #buttons .button')].find((x) => !x.classList.contains('disabled'));
      if (b) click(b, 'event: ' + lab(b));
      return acted;
    }
    const $id = (id) => document.getElementById(id);
    const have = (k) => $SM.get('stores["' + k + '"]', true) || 0;
    const wood = $SM.get('stores.wood');
    const fire = $SM.get('game.fire.value');
    const light = $id('lightButton'); const stoke = $id('stokeButton');
    const builds = () => [...document.querySelectorAll('#roomPanel .button[buildThing]')]
      .filter((b) => ok(b))
      .map((b) => { const t = b.getAttribute('buildThing'); const g = Room.Craftables[t] || Room.TradeGoods[t]; const c = g.cost(); const rel = Math.max(0, ...Object.keys(c).map((k) => c[k] / Math.max(1e-9, have(k)))); return { b, rel }; })
      .filter((x) => x.rel <= 1)
      .sort((a, b) => a.rel - b.rel);
    const needFire = () => (fire === 0 && ok(light)) || (fire < 4 && ok(stoke) && (wood === undefined || wood > 0));
    const roomTodo = () => needFire() || builds().length > 0 || $SM.get('game.builder.level') === 3;
    const free = () => (typeof Outside !== 'undefined' && $id('outsidePanel') ? Outside.getNumGatherers() : 0);
    const workerRows = () => [...document.querySelectorAll('#workers .workerRow')].filter((r) => r.getAttribute('key') !== 'gatherer');
    const pop = $SM.get('game.population') || 0;
    const canAssign = () => workerRows().length > 0 && free() > Math.ceil(pop * o.gathererShare);
    const outTodo = () => ok($id('gatherButton')) || ok($id('trapsButton')) || canAssign();
    const go = (where) => { const h = $id('location_' + where); if (h && Header.canTravel()) { click(h, 'go:' + where); return true; } return false; };
    const mod = Engine.activeModule;

    if (mod === Room) {
      if (fire === 0 && ok(light)) click(light);
      else if (fire < 4 && ok(stoke) && (wood === undefined || wood > 0)) click(stoke);
      const c = builds();
      if (c.length) click(c[0].b, 'build: ' + lab(c[0].b));
      if ($id('location_outside') && outTodo() && !needFire()) go('outside');
    } else if (mod === Outside) {
      if (ok($id('gatherButton'))) click($id('gatherButton'));
      if (ok($id('trapsButton'))) click($id('trapsButton'));
      if (canAssign()) {
        const rows = workerRows().sort((a, b) => ($SM.get('game.workers["' + a.getAttribute('key') + '"]') || 0) - ($SM.get('game.workers["' + b.getAttribute('key') + '"]') || 0));
        const up = rows[0].querySelector('.upBtn');
        if (up && !up.classList.contains('disabled')) click(up, rows[0].getAttribute('key') + ' +1');
      }
      if (roomTodo()) go('room');
    } else {
      go('room');
    }
    return acted;
  }, o);
}
