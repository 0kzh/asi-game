// Pacing bot: plays Takeoff headless at high speed like a reasonable (not optimal) human, through window.TAKEOFF.
// Reports stage times, idle seconds, reveal cadence, training durations; writes js/snapshots.js (stage rewinds).
//
//   node tools/bot.mjs [--path=slow|race] [--max=14400] [--snapshots] [--out=report.json] [--quiet]
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "/opt/node-tools/node_modules/playwright");

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX = Number(args.max || 4 * 3600);
const PATH = args.path || "slow";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
await page.goto("file://" + root + "/index.html?fresh&nosave" + (args.stage ? "&stage=" + args.stage : ""));
await page.waitForTimeout(300);

// The bot's brain runs inside the page for speed.
await page.evaluate((cfg) => {
  const T = window.TAKEOFF;
  const B = window.__bot = { log: [], trainings: [], snaps: {}, lastStage: 0, cfg, actionsTaken: 0 };
  const choicePolicy = {
    robots: 0, round0: 0, meme: 0, round1: 0, poach: 2, opensource: 1, sycophancy: 0, round2: 0, journalist: 0, round3: 1, round4: 0,
    permit: 0, heatwave: 0, teen: 0, dod: 0, authors: 0, exports: 0, nuwa: 0, strike: 0, whistle1: 0, spy: 0, datawall: 0, round5: 0, round6: 0,
    theft: 0, obsolete: 0, neuralese: cfg.path === "race" ? 0 : 1, taiwan: 0, memo: 0, leak: 0, decision: cfg.path === "race" ? 1 : 0,
    bioeval: 0, nationalize: 1, election: 0, backdoor: 0, riots: 0, treaty: 0, dealRace: 0,
    crisis_grid: 0, crisis_pandemic: 0, crisis_robots: 0, crisis_nanobots: 0,
  };
  function clickLabel(re) {
    const els = Array.from(document.querySelectorAll(".btn, button.project"));
    for (const e of els) {
      if (e.offsetParent === null) continue;
      if (e.classList.contains("disabled") || e.disabled) continue;
      const t = (e.querySelector(".lbl, .pt") || e).textContent || "";
      if (re.test(t)) { e.click(); B.actionsTaken++; return true; }
    }
    return false;
  }
  B.step = function () {
    const S = T.state;
    if (S.activeEvent) {
      const pol = choicePolicy[S.activeEvent.id];
      const btns = Array.from(document.querySelectorAll("#eventButtons .btn"));
      let idx = pol === undefined ? 0 : pol;
      if (!btns[idx] || btns[idx].classList.contains("disabled")) idx = btns.findIndex(b => !b.classList.contains("disabled"));
      if (idx < 0) idx = 0;
      T.choose(idx);
      return;
    }
    if (S.stage !== B.lastStage) { B.snaps[S.stage] = JSON.stringify(S); B.lastStage = S.stage; B.log.push({ t: S.t, stage: S.stage }); }
    const d = T.derived();
    // a human saves for a greyed goal that's within a few minutes of income
    const goals = Array.from(document.querySelectorAll("button.project")).filter(e => e.offsetParent !== null && e.disabled);
    let saving = false, needCap = 0;
    for (const g of goals) {
      const tag = g.querySelector(".pc").textContent;
      if (/after |needs /.test(tag)) continue;
      const m = tag.match(/\$([0-9.,]+)( thousand| million| billion| trillion)?/);
      if (m) { const mult = { " thousand": 1e3, " million": 1e6, " billion": 1e9, " trillion": 1e12 }[m[2]] || 1; const cost = parseFloat(m[1].replace(/,/g, "")) * mult; if (cost > S.funds && cost < S.funds + d.revenue * 240) saving = true; }
      const r = tag.match(/([0-9.,]+)( thousand| million| billion)? research/);
      if (r) { const mult = { " thousand": 1e3, " million": 1e6, " billion": 1e9 }[r[2]] || 1; needCap = Math.max(needCap, parseFloat(r[1].replace(/,/g, "")) * mult); }
    }
    B.saving = saving;
    let acts = 0;
    const MAXA = 3; // a human manages a few clicks per second
    const act = (re) => { if (acts < MAXA && clickLabel(re)) { acts++; return true; } return false; };
    // models
    if (S.ready >= 0) {
      const m = S.models[S.ready];
      if (!m.evaluated) act(/^run evals$/);
      if (S.stage >= 3 && (S.internalModel < 0 || S.models[S.internalModel].cap < m.cap)) act(/^deploy internally$/);
      else act(/^release /);
    }
    if (act(/^train /)) B.trainings.push({ t: S.t, gen: S.next });
    // gates first, then any affordable project
    act(/^(Hyperion|Automate AI Research)$/);
    // the next model's design comes first; don't spend research elsewhere while it's within reach
    const projs = Array.from(document.querySelectorAll("button.project")).filter(e => e.offsetParent !== null);
    const designBtn = projs.find(e => /^Design /.test(e.querySelector(".pt").textContent));
    if (designBtn && !designBtn.disabled) { designBtn.click(); acts++; B.actionsTaken++; }
    const savingRP = designBtn && designBtn.disabled && / research/.test(designBtn.querySelector(".pc").textContent);
    for (let i = 0; i < 2 && acts < MAXA; i++) {
      const pb = projs.find(e => e.isConnected && !e.disabled && !/^(Train on User|Grant Autonomy)/.test(e.querySelector(".pt").textContent) &&
        !(savingRP && / research/.test(e.querySelector(".pc").textContent)));
      if (pb) { pb.click(); acts++; B.actionsTaken++; }
    }
    // compute allocation: what a sensible player converges to (AI 2027's allocation table, roughly)
    const want = { train: 50, exp: 15, synth: 0, research: 0, monitor: 0, defense: 0 };
    if (S.flags.synth) want.synth = /tokens/.test(d.blocker || "") ? 35 : 15;
    if (S.flags.automation) { want.train = 30; want.exp = 10; want.research = 35; }
    if (S.flags.monitors) want.monitor = cfg.path === "race" ? 2 : 6;
    if (S.crisis) want.defense = 25;
    if (S.flags.experiments && needCap > d.rpCap) want.exp = Math.min(60, S.alloc.exp + 5);
    if (!S.flags.experiments) want.exp = 0;
    let tot = Object.values(want).reduce((a, b) => a + b, 0);
    if (tot > 95) { const f = 95 / tot; for (const k in want) want[k] = Math.floor(want[k] * f / 5) * 5; }
    if (!S.training) want.train = S.alloc.train; // only consumed while training; leave as is
    tot = Object.values(want).reduce((a, b) => a + b, 0);
    if (tot <= 95) Object.assign(S.alloc, want);
    // stage 1 manual verbs
    if (S.stage === 1) {
      if (/tokens/.test(d.blocker || "") || S.data < 1e7) act(/^scrape the web$/);
      act(/^complete task$/);
    }
    // data
    if (/tokens/.test(d.blocker || "")) { act(/^add crawler/); act(/^buy dataset$/); }
    else if (S.funds > 400 && S.stage === 1 && !saving) act(/^add crawler/);
    // research staff
    if (!saving) { act(/^hire researcher/); if (S.safety < 2 + S.stage * 2) act(/^hire safety/); }
    // pricing (a human nudges toward clearing)
    if (!S.autoPrice && S.deployed >= 0) {
      if (d.capacity > d.demand * 1.15) act(/^lower$/);
      else if (d.demand > d.capacity * 1.3) act(/^raise$/);
    }
    if (d.capacity > d.demand * 1.3) act(/^marketing/);
    // infrastructure
    if (S.stage >= 2) {
      const building = S.building.length;
      if (d.perf < 0.98 || S.powerMW < S.gpu * 0.0012 * 1.3) act(/^(small reactors|nuclear restart|gas turbines)$/);
      if (S.gpu > d.gpuCap * 0.7 && building < 4) act(/^build (gigawatt campus|campus|datacenter)$/);
      if (S.security < 3 || (S.stage >= 3 && S.security < 4)) act(/^upgrade to SL/);
      if (S.gov < 40) act(/^lobby$/);
      if (S.approval < 40) act(/^PR campaign$/);
    }
    if (!saving) act(/^buy max$/) || act(/^(rent|buy) a GPU$/);
    if (S.stage >= 4) {
      if (S.unrest > 40 && S.ubi < 0.3 && S.flags.ubiUnlocked) S.ubi += 0.05;
      if (S.flags.space && S.robotAlloc.launch < 10) { S.robotAlloc.labor = Math.max(0, S.robotAlloc.labor - 10); S.robotAlloc.launch += 10; }
    }
  };
}, { path: PATH });

const start = Date.now();
let last = null;
let lastPrint = 0;
const shotAt = args.shots ? String(args.shotAt || "1,3,5,8,12,20").split(",").map(Number) : [];
while (true) {
  if (shotAt.length && last && last.t / 60 >= shotAt[0]) {
    const m = shotAt.shift();
    await page.screenshot({ path: `${args.shots}/bot_${PATH}_${m}m.png` });
  }
  last = await page.evaluate((secs) => {
    const T = window.TAKEOFF; const B = window.__bot;
    for (let s = 0; s < secs; s++) {
      T.tick(10);
      B.step();
      if (T.state.flags.statsReady || T.state.t > 1e6) break;
    }
    const S = T.state, d = T.derived();
    return { t: S.t, stage: S.stage, month: T.metrics().month, tasks: S.tasks, funds: S.funds, gpu: S.gpu, data: S.data, rp: S.rp, rpCap: d.rpCap,
      models: S.models.map(m => m.name), next: d.next, blocker: d.blocker, revenue: d.revenue, perf: d.perf, ending: S.ending,
      done: !!S.flags.statsReady, frontier: d.frontier, nuwa: d.nuwa, rd: d.rd, approval: S.approval, gov: S.gov, misalign: d.misalign, conf: d.conf,
      shown: Object.keys(S.projShown), res: S.researchers, rpRate: T.derived().rpRate, event: S.activeEvent && S.activeEvent.id, train: S.training && { gen: S.training.gen, pct: S.training.progress / S.training.need, eta: d.trainEta } };
  }, shotAt.length ? 10 : 30);
  if (!args.quiet && last.t - lastPrint >= Number(args.every || 300)) {
    lastPrint = last.t;
    const mm = Math.floor(last.t / 60);
    console.log(`[${mm}m] s${last.stage} ${last.month} tasks=${last.tasks.toExponential(2)} $=${last.funds.toExponential(2)} rev=${last.revenue.toExponential(2)} gpu=${last.gpu.toExponential(2)} data=${last.data.toExponential(2)} rp=${last.rp.toExponential(1)}/${last.rpCap.toExponential(1)} (${last.res}r ${last.rpRate.toFixed(1)}/s) models=${last.models.join(",")} next=${last.next} [${last.blocker}] ${last.train ? "training " + last.train.gen + " " + Math.round(last.train.pct * 100) + "% eta " + Math.round(last.train.eta) : ""} perf=${last.perf.toFixed(2)} appr=${Math.round(last.approval)} gov=${Math.round(last.gov)} nuwa=${Math.round(last.nuwa)} us=${Math.round(last.frontier)} rd=${last.rd.toFixed(1)} shown=[${last.shown.join(",")}]`);
  }
  if (last.done || last.t > MAX) break;
  if (Date.now() - start > Number(args.wall || 75) * 60 * 1000) { console.log("wall-clock limit"); break; }
}

const report = await page.evaluate(() => ({ trained: Object.entries(window.TAKEOFF.state.beats).filter(([k]) => /^trained/.test(k)).map(([k, v]) => [k.replace("trained", ""), Math.round(v)]), metrics: window.TAKEOFF.metrics(), bot: { log: window.__bot.log, trainings: window.__bot.trainings, actions: window.__bot.actionsTaken },
  choices: window.TAKEOFF.state.choices, logTail: window.TAKEOFF.state.log.slice(-15).map(l => l.text) }));
const snaps = await page.evaluate(() => window.__bot.snaps);
report.final = last;
report.errors = errors;
if (args.snapshots) {
  const out = "// generated by tools/bot.mjs — stage-start snapshots for the dev menu (rewind to any stage)\nvar TAKEOFF_SNAPSHOTS = " + JSON.stringify(snaps) + ";\n";
  fs.writeFileSync(path.join(root, "js/snapshots.js"), out);
  console.log("wrote js/snapshots.js with stages", Object.keys(snaps).join(","));
}
const m = report.metrics;
console.log("\n=== REPORT (" + PATH + ") ===");
console.log("game time:", Math.round(m.t / 60), "min · ending:", m.ending || "(none)", "· stage", m.stage);
console.log("stage starts (min):", m.stageTimes.map(x => (x / 60).toFixed(1)).join(" | "));
console.log("idle seconds:", m.idleSeconds, "longest idle:", m.longestIdle, "no-goal seconds:", m.noGoalSeconds);
console.log("first choice at:", m.firstChoice.toFixed(0), "s · choices:", m.choices);
console.log("reveals:", m.reveals.map(r => r.id + "@" + (r.t / 60).toFixed(1)).join(" "));
console.log("max reveal gap:", Math.round(m.maxRevealGap), "s");
console.log("trainings started (min):", report.bot.trainings.map(x => (x.t / 60).toFixed(1)).join(" "));
{ const starts = report.bot.trainings.map(x => x.t); const ends = report.trained.map(x => x[1]).sort((a, b) => a - b);
  console.log("training durations (s):", ends.map((e, i) => Math.round(e - (starts[i] ?? e))).join(" ")); }
console.log("models:", m.models.join(", "));
console.log("errors:", errors.length ? errors.slice(0, 5) : "none");
console.log("log tail:\n  " + report.logTail.join("\n  "));
if (args.out) fs.writeFileSync(args.out, JSON.stringify(report, null, 2));
await browser.close();
