// Universal Paperclips adapter (jgmize mirror, index2.html with the cheat
// functions uncommented). No speed control: runs in real time. Stage jumps use
// the game's own cheat functions (cheatClips, cheatMoney, cheatTrust, cheatOps,
// cheatCreat, cheatYomi, zeroMatter) plus a few direct global writes, then buy
// projects by clicking the real project buttons so every flag/effect stays
// consistent. Nothing in the reference files is modified.

import { sleep } from './common.mjs';

const REF = process.env.CRITIC_PAPERCLIPS_DIR
  || '/tmp/claude-0/-home-user-asi-game/fe6836a4-3e69-525f-b45f-9fbb91a6171c/scratchpad/ref/paperclips/docs';

// Dev buttons that exist only in index2.html (not in the shipped game).
const DEV_IDS = ['save1Button', 'load1Button', 'save2Button', 'load2Button', 'resetButton', 'freeClipsButton',
  'freeMoneyButton', 'freeTrustButton', 'freeOpsButton', 'freeCreatButton', 'freeYomiButton', 'resetPrestige',
  'destroyAllHumansButton', 'freePrestigeU', 'freePrestigeS', 'debugBattleNumbers', 'availMatterZero'];

// Repeatable projects the jump loops skip (they would loop forever on cheat money).
const EXCLUDE_PROJECTS = ['projectButton2', 'projectButton40b', 'projectButton219', 'projectButton51', 'projectButton133'];
// The bot only skips Xavier Re-initialization (it refunds and re-rolls processors/memory).
const BOT_EXCLUDE = ['projectButton219'];

export const name = 'paperclips';
export const serveDir = REF;
export const entryPath = 'index2.html';
export const speedControl = 'none (real time; cheats pre-fill resources per stage)';
export const stages = {
  1: 'Business — fresh start',
  2: 'Earth — just after Release the HypnoDrones (cheats)',
  3: 'Universe — just after Space Exploration (cheats)',
};

export async function ready(page) {
  await page.waitForFunction(() => typeof window.clips !== 'undefined'
    && typeof window.buttonUpdate === 'function'
    && document.getElementById('cover')?.style.display === 'none', null, { timeout: 30000 });
  // Hide the index2.html dev buttons so screenshots look like the real game.
  await page.addStyleTag({ content: DEV_IDS.map((id) => `#${id}`).join(',') + '{display:none!important}' });
}

// ---- stage jumps -----------------------------------------------------------

// Click every enabled project (except excluded ones) until nothing new is
// clickable for ~1 s, refilling ops/creat/funds/yomi with the cheat functions.
async function buyAllProjects(page, exclude, notes, label) {
  let idle = 0; let bought = [];
  for (let i = 0; i < 600 && idle < 25; i++) {
    const id = await page.evaluate(({ exclude }) => {
      // ops are capped at memory*1000 every tick, so first buy enough memory
      // (with cheat trust) for the most expensive visible project, then fill ops
      const opsCost = (b) => { const p = projects.find((x) => x.id === b.id); const m = ((p && p.priceTag) || '').replace(/,/g, '').match(/(\d+)\s*ops/i); return m ? +m[1] : 0; };
      const need = Math.max(0, ...[...document.querySelectorAll('#projectListTop .projectButton')].filter((b) => !exclude.includes(b.id)).map(opsCost));
      while (memory * 1000 < need) { while (trust <= processors + memory) cheatTrust(); addMem(); }
      for (let k = 0; k < 100 && standardOps < memory * 1000; k++) cheatOps();
      if (creativity < 50000) for (let k = 0; k < 50; k++) cheatCreat();
      if (humanFlag == 1 && funds < 20000000) for (let k = 0; k < 3; k++) cheatMoney();
      if (yomi < 200000) cheatYomi();
      const b = [...document.querySelectorAll('#projectListTop .projectButton')]
        .find((x) => !x.disabled && !exclude.includes(x.id));
      if (!b) return null;
      const title = (b.querySelector('span')?.textContent || b.id).trim();
      b.click();
      return title;
    }, { exclude });
    if (id) { bought.push(id); idle = 0; } else idle++;
    await sleep(40);
  }
  const pm = await page.evaluate(() => ({ processors, memory, trust }));
  notes.push(`${label}: clicked ${bought.length} projects in order: ${bought.join(' | ')}  (memory raised with cheatTrust()+addMem() whenever a visible project cost more ops than memory*1000; ops refilled with cheatOps(); creativity with cheatCreat(); funds with cheatMoney(); yomi with cheatYomi(); now processors ${pm.processors}, memory ${pm.memory}, trust ${pm.trust})`);
}

export async function jumpToStage(page, id) {
  id = String(id);
  const notes = [];
  if (id === '1') { notes.push('fresh start, no cheats'); return { notes }; }
  if (!['2', '3'].includes(id)) throw new Error(`paperclips: unknown stage ${id}`);

  // --- Stage 2: Earth -------------------------------------------------------
  await page.evaluate(() => { cheatClips(); });
  notes.push('cheatClips() x1  (+100M clips/unusedClips → compFlag+projectsFlag; trust ramps to ~24 via calculateTrust)');
  await sleep(500);
  await page.evaluate(() => {
    for (let i = 0; i < 10; i++) cheatMoney();
    for (let i = 0; i < 70; i++) cheatTrust();
    for (let i = 0; i < 50; i++) cheatCreat();
    cheatYomi();
    for (let i = 0; i < 50; i++) cheatOps();
  });
  notes.push('cheatMoney() x10, cheatTrust() x70, cheatCreat() x50, cheatYomi() x1, cheatOps() x50');
  const pm = await page.evaluate(({ P, M }) => {
    while (processors < P && trust > processors + memory) addProc();
    while (memory < M && trust > processors + memory) addMem();
    return { processors, memory, trust };
  }, { P: 25, M: 70 });
  notes.push(`addProc()/addMem() via game functions → processors ${pm.processors}, memory ${pm.memory} (trust ${pm.trust})`);
  await sleep(200);
  await buyAllProjects(page, [...EXCLUDE_PROJECTS, 'projectButton35'], notes, 'stage-1 projects');
  // Spend the remaining trust alternately on memory and processors (players arrive at the release
  // with every trust point allocated), top trust up to 100 if short, release.
  const pm2 = await page.evaluate(() => {
    let k = 0;
    while (trust > processors + memory) { if (k++ % 2) addProc(); else addMem(); }
    let topped = 0;
    while (trust < 100) { cheatTrust(); topped++; }
    return { processors, memory, trust, topped };
  });
  notes.push(`addMem()/addProc() alternately with the remaining trust → processors ${pm2.processors}, memory ${pm2.memory}, trust ${pm2.trust}${pm2.topped ? ` (cheatTrust() x${pm2.topped} to reach 100)` : ''}`);
  await page.waitForFunction(() => document.getElementById('projectButton35'), null, { timeout: 10000 });
  await page.evaluate(() => document.getElementById('projectButton35').click());
  notes.push('clicked "Release the HypnoDrones" (projectButton35)');
  await page.waitForFunction(() => humanFlag == 0 && document.getElementById('hypnoDroneEventDiv').style.display === 'none', null, { timeout: 15000 });
  await page.evaluate(() => {
    tempOps = 0; standardOps = memory * 1000; creativity = 10000; yomi = 50000;
  });
  notes.push('direct writes: tempOps=0; standardOps=memory*1000 (ops at cap); creativity=10000; yomi=50000');

  if (id === '2') return { notes };

  // --- Stage 3: Universe ----------------------------------------------------
  await page.evaluate(() => { unusedClips += 1e12; });
  await buyAllProjects(page, [...EXCLUDE_PROJECTS, 'projectButton46'], notes, 'stage-2 projects');
  await page.evaluate(() => {
    zeroMatter();
    storedPower = 10000000;
    unusedClips = Math.max(unusedClips, 6e27);
  });
  await page.waitForFunction(() => document.getElementById('projectButton46'), null, { timeout: 10000 });
  const mem3 = await page.evaluate(() => {
    while (memory < 120) { while (trust <= processors + memory) cheatTrust(); addMem(); }
    for (let k = 0; k < 100 && standardOps < memory * 1000; k++) cheatOps();
    return memory;
  });
  notes.push(`zeroMatter(); direct writes storedPower=1e7, unusedClips=6e27 (Space Exploration cost); cheatTrust()+addMem() up to memory ${mem3}; cheatOps() to fill`);
  await page.waitForFunction(() => !document.getElementById('projectButton46').disabled, null, { timeout: 10000 });
  await page.evaluate(() => document.getElementById('projectButton46').click());
  notes.push('clicked "Space Exploration" (projectButton46)');
  await sleep(300);
  await page.evaluate(() => {
    tempOps = 0; standardOps = memory * 1000; creativity = 10000; yomi = 50000; unusedClips = 1e20;
  });
  notes.push('direct writes: standardOps=memory*1000; creativity=10000; yomi=50000; unusedClips=1e20 (1,000 probes worth)');
  return { notes };
}

// ---- observation -----------------------------------------------------------

export async function observe(page) {
  return page.evaluate(({ DEV_IDS }) => {
    const C = window.__critic;
    const dev = new Set(DEV_IDS);
    const ADJUST = /^(btnLowerPrice|btnRaisePrice|btn\w+Reboot|btnInvest|btnWithdraw|btnToggleWireBuyer|btnToggleAutoTourney|btnRunTournament|btnNewTournament|btnQcompute|btn(Lower|Raise)Probe\w+|btn(Feed|Teach|Entertain|Clad|Synch)Swarm)$/;
    const LABELS = {
      btnFactoryReboot: 'Disassemble All (factories)', btnHarvesterReboot: 'Disassemble All (harvesters)',
      btnWireDroneReboot: 'Disassemble All (wire drones)', btnFarmReboot: 'Disassemble All (farms)',
      btnBatteryReboot: 'Disassemble All (batteries)',
      btnHarvesterx10: 'Harvester +10', btnHarvesterx100: 'Harvester +100', btnHarvesterx1000: 'Harvester +1k',
      btnWireDronex10: 'Wire Drone +10', btnWireDronex100: 'Wire Drone +100', btnWireDronex1000: 'Wire Drone +1k',
      btnFarmx10: 'Solar Farm +10', btnFarmx100: 'Solar Farm +100', btnBatteryx10: 'Battery +10', btnBatteryx100: 'Battery +100',
      btnLowerPrice: 'lower price', btnRaisePrice: 'raise price',
    };
    const out = { enabledButtons: [], production: [], enabledGoals: [], disabledGoals: [], disabledControls: [], extraControls: [] };
    for (const b of document.querySelectorAll('button')) {
      if (dev.has(b.id) || !b.id) continue;
      const isProject = b.classList.contains('projectButton');
      if (!C.vis(b, { ignoreVisibility: isProject })) continue;
      let label = isProject ? C.text(b.querySelector('span')) : (LABELS[b.id] || C.text(b));
      const m = b.id.match(/^btn(Lower|Raise)Probe(\w+)$/);
      if (m) label = `probe ${m[2].toLowerCase()} ${m[1] === 'Lower' ? '<' : '>'}`;
      if (!label) label = b.id;
      const kind = b.id === 'btnMakePaperclip' ? 'production' : b.id === 'btnBuyWire' ? 'consumable' : ADJUST.test(b.id) ? 'adjust' : 'goal';
      if (!b.disabled) {
        out.enabledButtons.push(label);
        if (kind === 'production') out.production.push(label);
        if (kind === 'goal') out.enabledGoals.push(label);
      } else {
        out.disabledControls.push(label);
        if (kind === 'goal') out.disabledGoals.push(label);
      }
    }
    for (const [id, l] of [['investStrat', 'investment risk select'], ['stratPicker', 'strategy picker'], ['slider', 'work/think slider']]) {
      const el = document.getElementById(id);
      if (C.vis(el)) out.extraControls.push(l);
    }
    const PANELS = [
      ['businessDiv', 'Business'], ['manufacturingDiv', 'Manufacturing'], ['autoClipperDiv', 'AutoClippers'],
      ['megaClipperDiv', 'MegaClippers'], ['wireBuyerDiv', 'WireBuyer'], ['revPerSecDiv', 'Revenue tracker'],
      ['compDiv', 'Computational Resources'], ['trustDiv', 'Trust'], ['creativityDiv', 'Creativity'],
      ['projectsDiv', 'Projects'], ['investmentEngine', 'Investments'], ['investmentEngineUpgrade', 'Investment upgrade'],
      ['strategyEngine', 'Strategic Modeling'], ['tournamentManagement', 'Tournaments'], ['autoTourneyControl', 'AutoTourney'],
      ['creationDiv', 'Manufacturing (Earth)'], ['factoryDiv', 'Clip Factories'], ['tothDiv', 'Unused clips'],
      ['wireProductionDiv', 'Wire Production'], ['harvesterDiv', 'Harvester Drones'], ['wireDroneDiv', 'Wire Drones'],
      ['powerDiv', 'Power'], ['swarmEngine', 'Swarm Computing'], ['swarmSliderDiv', 'Swarm slider'],
      ['qComputing', 'Quantum Computing'], ['spaceDiv', 'Space Exploration'], ['probeDesignDiv', 'Von Neumann Probe Design'],
      ['increaseProbeTrustDiv', 'Probe trust'], ['battleCanvasDiv', 'Combat'], ['honorDiv', 'Honor'],
      ['increaseMaxTrustDiv', 'Max trust'], ['drifterDiv', 'Drifters'], ['prestigeDiv', 'Prestige'],
    ];
    const panels = PANELS.filter(([id]) => C.vis(document.getElementById(id))).map(([, l]) => l);
    const W = window;
    const hypno = document.getElementById('hypnoDroneEventDiv');
    return {
      ...out,
      panels,
      modalOpen: C.vis(hypno),
      progressRunning: W.tourneyInProg == 1,
      headline: 'Paperclips: ' + C.text(document.getElementById('clips')),
      logTail: ['readout1', 'readout2', 'readout3'].map((id) => C.text(document.getElementById(id))).filter(Boolean),
      funds: W.humanFlag == 1 ? W.funds : W.unusedClips,
      res: {
        clips: W.clips, funds: W.funds, unusedClips: W.unusedClips, wire: W.wire, wireCost: W.wireCost,
        unsold: W.unsoldClips, price: W.margin, demand: W.demand, autoClippers: W.clipmakerLevel,
        megaClippers: W.megaClipperLevel, marketingLvl: W.marketingLvl, trust: W.trust, processors: W.processors,
        memory: W.memory, ops: W.operations, creativity: W.creativity, yomi: W.yomi, humanFlag: W.humanFlag,
        spaceFlag: W.spaceFlag, factories: W.factoryLevel, harvesters: W.harvesterLevel, wireDrones: W.wireDroneLevel,
        farms: W.farmLevel, batteries: W.batteryLevel, probes: W.probeCount,
      },
    };
  }, { DEV_IDS });
}

// ---- greedy bot ------------------------------------------------------------

export const botDefaults = {
  clicks: 5,            // Make Paperclip clicks per step (1 step per second)
  wireMin: 200,         // buy wire when wire < max(wireMin, wireSeconds x clips/s) and funds allow
  wireSeconds: 10,
  wireReserveBelow: 300,// keep wireCost in reserve while wire < max(this, reserveSeconds x clips/s)
  reserveSeconds: 30,
  invHiSec: 10,         // lower price when unsold > max(invHiMin, invHiSec x production/s)
  invHiMin: 60,
  invLoSec: 2,          // raise price when unsold < max(invLoMin, invLoSec x production/s)
  invLoMin: 10,
};

export async function act(page, sample, opts = {}) {
  const o = { ...botDefaults, ...opts };
  return page.evaluate(({ o, EXCLUDE }) => {
    const acted = [];
    const W = window;
    const C = W.__critic;
    const $ = (id) => document.getElementById(id);
    const can = (id) => { const b = $(id); return !!(b && !b.disabled && C.vis(b)); };
    const click = (id, label) => { if (can(id)) { $(id).click(); acted.push(label || id); return true; } return false; };
    if (C.vis($('hypnoDroneEventDiv'))) return acted;

    const projectCost = (b, unit) => {
      const p = (W.projects || []).find((x) => x.id === b.id);
      const tag = (p && p.priceTag) || '';
      const m = tag.replace(/,/g, '').match(new RegExp('([\\d.]+)\\s*' + unit, 'i'));
      return m ? parseFloat(m[1]) : 0;
    };
    // Oldest enabled project first; repeatables (Photonic Chip, Another Token of
    // Goodwill, Threnody) wait while a one-off project is visible but unaffordable.
    const REPEAT = ['projectButton51', 'projectButton40b', 'projectButton133'];
    const buyProject = () => {
      const all = [...document.querySelectorAll('#projectListTop .projectButton')].filter((x) => !EXCLUDE.includes(x.id));
      const saving = all.some((x) => x.disabled && !REPEAT.includes(x.id) && x.id !== 'projectButton2');
      const b = all.find((x) => !x.disabled && !(saving && REPEAT.includes(x.id)));
      if (b) { const t = C.text(b.querySelector('span')); b.click(); acted.push('project: ' + t); return true; }
      return false;
    };
    // The bot never uses yomi, so tournaments only burn ops: switch AutoTourney off.
    if (W.autoTourneyFlag == 1 && W.autoTourneyStatus == 1 && can('btnToggleAutoTourney')) click('btnToggleAutoTourney', 'AutoTourney off');
    const buyTrust = () => {
      if (!can('btnAddProc')) return false;
      const maxOps = W.memory * 1000;
      const visible = [...document.querySelectorAll('#projectListTop .projectButton')];
      const needOps = Math.max(0, ...visible.map((b) => projectCost(b, 'ops')));
      if (needOps > maxOps || W.memory < W.processors) return click('btnAddMem', 'Memory');
      return click('btnAddProc', 'Processors');
    };
    const clickProduce = (n) => {
      let k = 0;
      for (let i = 0; i < n; i++) if (can('btnMakePaperclip')) { $('btnMakePaperclip').click(); k++; }
      if (k) acted.push(`Make Paperclip x${k}`);
    };

    if (W.humanFlag == 1) {
      const prod = o.clicks + W.clipmakerLevel * W.clipperBoost + W.megaClipperLevel * W.megaClipperBoost * 500; // clips/s
      // 1. wire first: never let the machine starve
      for (let i = 0; i < 3 && W.wire < Math.max(o.wireMin, o.wireSeconds * prod) && W.funds >= W.wireCost; i++) click('btnBuyWire', 'Wire');
      // 2. production clicks
      clickProduce(o.clicks);
      // 3. price: keep unsold inventory inside a band sized by production rate
      const hi = Math.max(o.invHiMin, prod * o.invHiSec);
      const lo = Math.max(o.invLoMin, prod * o.invLoSec);
      if (W.unsoldClips > hi && W.margin > 0.01) { click('btnLowerPrice', 'lower price'); if (W.unsoldClips > 3 * hi) click('btnLowerPrice', 'lower price'); }
      else if (W.unsoldClips < lo && W.wire >= 1) click('btnRaisePrice', 'raise price');
      // 4. one project, 5. one trust point, 6. cheapest funds purchase (keep wire money)
      buyProject();
      buyTrust();
      const reserve = W.wire < Math.max(o.wireReserveBelow, o.reserveSeconds * prod) ? W.wireCost : 0;
      const cands = [['btnMakeClipper', W.clipperCost, 'AutoClippers'], ['btnMakeMegaClipper', W.megaClipperCost, 'MegaClippers'], ['btnExpandMarketing', W.adCost, 'Marketing']]
        .filter(([id, cost]) => can(id) && W.funds - cost >= reserve)
        .sort((a, b) => a[1] - b[1]);
      if (cands.length) click(cands[0][0], cands[0][2]);
    } else {
      clickProduce(o.clicks);
      buyProject();
      buyTrust();
      if (W.spaceFlag != 1) {
        const supply = W.farmLevel * W.farmRate / 100;
        const demand = (W.harvesterLevel + W.wireDroneLevel) * W.dronePowerRate / 100 + W.factoryLevel * W.factoryPowerRate / 100;
        if (supply <= demand * 1.1 + 0.5 && click('btnMakeFarm', 'Solar Farm')) return acted;
        const cands = [['btnMakeFarm', W.farmCost, 'Solar Farm'], ['btnMakeBattery', W.batteryCost, 'Battery Tower'],
          ['btnMakeHarvester', W.harvesterCost, 'Harvester Drone'], ['btnMakeWireDrone', W.wireDroneCost, 'Wire Drone'],
          ['btnMakeFactory', W.factoryCost, 'Clip Factory']].filter(([id]) => can(id)).sort((a, b) => a[1] - b[1]);
        if (cands.length) click(cands[0][0], cands[0][2]);
      } else {
        click('btnMakeProbe', 'Launch Probe');
        click('btnIncreaseProbeTrust', 'Increase Probe Trust');
        const dims = ['Rep', 'Haz', 'Fac', 'Harv', 'Wire', 'Speed', 'Nav', 'Combat'];
        const val = (d) => W['probe' + d] ?? 0;
        const order = dims.filter((d) => can('btnRaiseProbe' + d)).sort((a, b) => val(a) - val(b));
        if (order.length) click('btnRaiseProbe' + order[0], 'probe ' + order[0].toLowerCase() + ' >');
      }
    }
    return acted;
  }, { o, EXCLUDE: BOT_EXCLUDE });
}
