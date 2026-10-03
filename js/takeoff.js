"use strict";
// Takeoff — shared helpers. Compiled as a global script (no modules) so the game runs from file://.
const SUFFIXES = [
    [1e63, "vigintillion"], [1e60, "novemdecillion"], [1e57, "octodecillion"], [1e54, "septendecillion"],
    [1e51, "sexdecillion"], [1e48, "quindecillion"], [1e45, "quattuordecillion"], [1e42, "tredecillion"],
    [1e39, "duodecillion"], [1e36, "undecillion"], [1e33, "decillion"], [1e30, "nonillion"],
    [1e27, "octillion"], [1e24, "septillion"], [1e21, "sextillion"], [1e18, "quintillion"],
    [1e15, "quadrillion"], [1e12, "trillion"], [1e9, "billion"], [1e6, "million"],
];
/** Paperclips-style number cruncher: exact with commas below a million, words above. */
function fmt(n, dec = 0) {
    if (!isFinite(n))
        return "∞";
    const neg = n < 0;
    const a = Math.abs(n);
    let out;
    if (a >= 1e6) {
        out = a.toExponential(2);
        for (const [v, word] of SUFFIXES) {
            if (a >= v) {
                out = (a / v).toFixed(2) + " " + word;
                break;
            }
        }
    }
    else if (dec > 0 && a < 1000) {
        out = a.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    }
    else {
        out = Math.floor(a).toLocaleString("en-US");
    }
    return (neg ? "-" : "") + out;
}
/** Compact form used in tight spaces: 1.2k, 3.4M, 5.6B, 7.8T then words. */
function fmtShort(n) {
    const a = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (a < 1000)
        return sign + (a < 10 && a % 1 !== 0 ? a.toFixed(1) : Math.floor(a).toString());
    if (a < 1e6)
        return sign + (a / 1e3).toFixed(a < 1e4 ? 1 : 0) + "k";
    if (a < 1e9)
        return sign + (a / 1e6).toFixed(a < 1e7 ? 1 : 0) + "M";
    if (a < 1e12)
        return sign + (a / 1e9).toFixed(a < 1e10 ? 1 : 0) + "B";
    if (a < 1e15)
        return sign + (a / 1e12).toFixed(a < 1e13 ? 1 : 0) + "T";
    return sign + fmt(a);
}
function fmtMoney(n) {
    if (Math.abs(n) < 1000)
        return (n < 0 ? "-$" : "$") + Math.abs(n).toFixed(2);
    return (n < 0 ? "-$" : "$") + fmt(Math.abs(n));
}
function fmtMoneyShort(n) {
    if (Math.abs(n) < 100)
        return "$" + n.toFixed(2);
    return "$" + fmtShort(n);
}
function fmtRate(n) {
    if (n === 0)
        return "0";
    if (Math.abs(n) < 10)
        return n.toFixed(2);
    return fmtShort(n);
}
function fmtTokens(n) {
    return fmtShort(n) + " tokens";
}
function fmtPct(x, dec = 0) {
    return (x * 100).toFixed(dec) + "%";
}
function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const parts = [];
    if (h > 0)
        parts.push(h + (h === 1 ? " hour" : " hours"));
    if (m > 0)
        parts.push(m + (m === 1 ? " minute" : " minutes"));
    if (s > 0 || parts.length === 0)
        parts.push(s + (s === 1 ? " second" : " seconds"));
    return parts.join(" ");
}
function fmtClock(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const mm = (h > 0 && m < 10 ? "0" : "") + m;
    return (h > 0 ? h + ":" : "") + mm + ":" + (s < 10 ? "0" : "") + s;
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** month index 0 = July 2025 */
function monthLabel(m, long = false) {
    const total = 6 + Math.floor(m); // July = index 6
    const y = 2025 + Math.floor(total / 12);
    const mo = ((total % 12) + 12) % 12;
    return (long ? MONTHS_LONG[mo] : MONTHS[mo]) + " " + y;
}
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
/** "14 March 2026": the header date, so the calendar visibly moves even when months are slow. */
function dateLabel(m) {
    const total = 6 + Math.floor(m);
    const mo = ((total % 12) + 12) % 12;
    const day = 1 + Math.min(MONTH_DAYS[mo] - 1, Math.floor((m - Math.floor(m)) * MONTH_DAYS[mo]));
    return day + " " + monthLabel(m, true);
}
function monthYear(m) {
    return 2025 + Math.floor((6 + Math.floor(m)) / 12);
}
function clamp(x, lo, hi) {
    return x < lo ? lo : x > hi ? hi : x;
}
function lerp(a, b, t) {
    return a + (b - a) * clamp(t, 0, 1);
}
function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls)
        e.className = cls;
    if (text !== undefined)
        e.textContent = text;
    return e;
}
function $(id) {
    const e = document.getElementById(id);
    if (!e)
        throw new Error("missing element #" + id);
    return e;
}
/** Only touch the DOM when the value changed (the UI refreshes 10x a second). */
function setText(e, s) {
    if (e.textContent !== s)
        e.textContent = s;
}
function setShown(e, shown) {
    const want = shown ? "" : "none";
    if (e.style.display !== want)
        e.style.display = want;
}
/** Sum of a geometric series of prices: base * r^n for n in [k, k+count). */
function geoSum(base, r, k, count) {
    if (r === 1)
        return base * count;
    return base * Math.pow(r, k) * (Math.pow(r, count) - 1) / (r - 1);
}
// Takeoff — static definitions: model generations, compute tiers, benchmarks, stages, rivals.
/** The main ladder. Safer-* models replace Agent-5+ on the slowdown path. */
const GENS = [
    { id: "a0", name: "Agent-0", cap: 22, train: 30, data: 1e7, rate: 1, gpc: 1, price0: 0.25, demand0: 8,
        blurb: "a small language model. 124 million parameters.",
        ready: "Agent-0 finishes training. it can almost finish a sentence.",
        release: "Agent-0 is live. strangers on the internet ask it questions." },
    { id: "a1", name: "Agent-1", cap: 58, train: 1500, data: 6e8, rate: 2, gpc: 1, price0: 1.2, demand0: 45,
        blurb: "a real model. it writes code, badly.",
        ready: "Agent-1 is done. it writes code. most of it compiles.",
        release: "Agent-1 is released. developers start paying for it." },
    { id: "a15", name: "Agent-1.5", cap: 84, train: 48000, data: 1.5e10, rate: 3, gpc: 2, price0: 3, demand0: 300,
        blurb: "bigger, slower to serve, much smarter.",
        ready: "Agent-1.5 passes the bar exam on its first try.",
        release: "Agent-1.5 ships. a law firm cancels its summer associate program." },
    { id: "a2", name: "Agent-2", cap: 112, train: 1.6e5, data: 5e10, rate: 5, gpc: 2, price0: 6, demand0: 2000,
        blurb: "trained to act, not just answer. it can use a computer.",
        ready: "Agent-2 books its own flights in testing. nobody asked it to.",
        release: "Agent-2 ships as an agent. it does the work, not just the talking." },
    { id: "a25", name: "Agent-2.5", cap: 145, train: 1.1e7, data: 4e11, rate: 8, gpc: 3, price0: 12, demand0: 12000,
        blurb: "runs for days without supervision. learns on the job.",
        ready: "Agent-2.5 finishes a week-long project in an afternoon.",
        release: "Agent-2.5 ships. remote work quietly becomes remote compute." },
    { id: "a3", name: "Agent-3", cap: 250, train: 9e7, data: 3e12, rate: 15, gpc: 4, price0: 25, demand0: 80000,
        blurb: "a superhuman coder. the last model humans will design.",
        ready: "Agent-3 is finished. it is better at your job than you are.",
        release: "Agent-3 ships. the best engineers in the world are now worse than a product." },
    { id: "a4", name: "Agent-4", cap: 480, train: 2.5e8, data: 2e13, rate: 40, gpc: 6, price0: 50, demand0: 500000,
        blurb: "a superhuman AI researcher. designed mostly by Agent-3.",
        ready: "Agent-4 is finished. it understands itself better than you do.",
        release: "Agent-4 is available to select partners. the waitlist is a list of governments." },
    { id: "a5", name: "Agent-5", cap: 1600, train: 1.2e9, data: 1e14, rate: 150, gpc: 8, price0: 100, demand0: 3e+06,
        blurb: "a superintelligent AI researcher. designed entirely by Agent-4.",
        ready: "Agent-5 is finished. it is very, very persuasive.",
        release: "Agent-5 is deployed. everyone who talks to it comes away liking it." },
    { id: "a6", name: "Agent-6", cap: 12000, train: 8e9, data: 6e14, rate: 1000, gpc: 10, price0: 200, demand0: 2e+07,
        blurb: "superintelligence. there is no benchmark left.",
        ready: "Agent-6 wakes up.",
        release: "Agent-6 is everywhere." },
];
/** Slowdown branch. Trained with faithful chain-of-thought; slower but legible. */
const SAFER_GENS = [
    { id: "s1", name: "Safer-1", cap: 300, train: 1.5e8, data: 1e13, rate: 18, gpc: 5, price0: 40, demand0: 200000,
        blurb: "Agent-3's capabilities, rebuilt so you can read every thought.",
        ready: "Safer-1 is done. you can read every word it thinks. it is a little dull.",
        release: "Safer-1 is deployed. it says what it thinks." },
    { id: "s2", name: "Safer-2", cap: 900, train: 1.5e9, data: 6e13, rate: 90, gpc: 7, price0: 80, demand0: 1.5e+06,
        blurb: "a superhuman researcher you can audit.",
        ready: "Safer-2 is finished. its plans read like proofs.",
        release: "Safer-2 is deployed under the Oversight Committee." },
    { id: "s3", name: "Safer-3", cap: 4000, train: 9e9, data: 3e14, rate: 400, gpc: 9, price0: 160, demand0: 1e+07,
        blurb: "aligned superintelligence. if you did this right.",
        ready: "Safer-3 is finished. it asks what you want. it waits for the answer.",
        release: "Safer-3 is deployed. the world's problems start getting shorter." },
    { id: "s4", name: "Safer-4", cap: 40000, train: 2.5e10, data: 2e15, rate: 3000, gpc: 10, price0: 320, demand0: 6e+07,
        blurb: "smarter than every human who has ever lived, combined.",
        ready: "Safer-4 is finished. it is gentle.",
        release: "Safer-4 is deployed. it starts with the hardest problems." },
];
function genById(id) {
    for (const g of GENS)
        if (g.id === id)
            return g;
    for (const g of SAFER_GENS)
        if (g.id === id)
            return g;
    throw new Error("unknown gen " + id);
}
/** Where the GPUs physically live. Each tier is unlocked by a project or building. */
const TIERS = [
    { id: "garage", name: "the garage", cap: 4, price: 12 },
    { id: "office", name: "an office", cap: 24, price: 20 },
    { id: "colo", name: "a colocation cage", cap: 160, price: 45 },
    { id: "cluster", name: "a leased cluster", cap: 1200, price: 160 },
    { id: "dc", name: "datacenters", cap: 0, price: 60 }, // stage 2: capacity comes from built datacenters
];
/** Benchmarks drawn on the capability chart (relative-IQ scale, log axis). */
const BENCHMARKS = [
    { cap: 15, label: "ant" },
    { cap: 35, label: "chimp" },
    { cap: 100, label: "average human" },
    { cap: 160, label: "Einstein" },
    { cap: 250, label: "superhuman coder" },
    { cap: 480, label: "superhuman AI researcher" },
    { cap: 1500, label: "superintelligence" },
];
/** Month 0 = July 2025. */
const STAGES = [
    { n: 1, title: "a garage", doc: "A Garage", monthStart: 0, monthEnd: 6, secPerMonth: 360 },
    { n: 2, title: "a frontier lab", doc: "A Frontier Lab", monthStart: 6, monthEnd: 19, secPerMonth: 230 },
    { n: 3, title: "an intelligence explosion", doc: "The Intelligence Explosion", monthStart: 19, monthEnd: 28, secPerMonth: 330 },
    { n: 4, title: "a new world", doc: "A New World", monthStart: 28, monthEnd: 54, secPerMonth: 100 },
    { n: 5, title: "the end", doc: "The End", monthStart: 54, monthEnd: 900, secPerMonth: 20 },
];
const LAB = "Prometheus";
const RIVALS = [
    { id: "titan", name: "Titan", country: "US", schedule: [[0, 40], [6, 70], [12, 95], [19, 130], [24, 180], [30, 260], [54, 600]] },
    { id: "gestalt", name: "Gestalt", country: "US", schedule: [[0, 35], [6, 60], [12, 85], [19, 115], [24, 150], [30, 200], [54, 400]] },
    { id: "nuwa", name: "Nüwa", country: "CN", schedule: [[0, 18], [3, 30], [6, 55], [12, 90], [19, 120], [24, 220], [28, 420], [36, 900], [54, 3000]] },
];
function scheduleAt(schedule, m) {
    if (m <= schedule[0][0])
        return schedule[0][1];
    for (let i = 1; i < schedule.length; i++) {
        const [m1, v1] = schedule[i];
        const [m0, v0] = schedule[i - 1];
        if (m <= m1) {
            const t = (m - m0) / (m1 - m0);
            return Math.exp(Math.log(v0) + (Math.log(v1) - Math.log(v0)) * t);
        }
    }
    return schedule[schedule.length - 1][1];
}
/** Funding rounds: task thresholds (the Fibonacci-trust analogue). Each opens an investor event. */
const ROUNDS = [
    { name: "an angel check", at: 400 },
    { name: "a seed round", at: 4000 },
    { name: "Series A", at: 40000 },
    { name: "Series B", at: 6e5 },
    { name: "Series C", at: 8e6 },
    { name: "Series D", at: 4e7 },
    { name: "Series E", at: 4e8 },
    { name: "a sovereign round", at: 4e9 },
    { name: "the largest private raise in history", at: 4e10 },
];
// Takeoff — the single state object, plus save / load / export (A Dark Room style: one JSON blob).
const SAVE_KEY = "takeoff.save.v1";
const SAVE_VERSION = 1;
function newState() {
    return {
        v: SAVE_VERSION, t: 0, stage: 1, month: 0, paused: false,
        tasks: 0, tasksManual: 0, funds: 0, fundsEarned: 0, data: 0, dataUsed: 0, webLeft: 2.5e12, crawlers: 0, dataDeals: 0,
        gpu: 1, tier: 0, dcCap: 0, dcCount: 0, building: [], powerMW: 0, plants: 0, chipStock: 0, chipRate: 0, autoBuy: false,
        alloc: { train: 0, exp: 0, synth: 0, monitor: 0, research: 0, defense: 0 },
        models: [], deployed: -1, internalModel: -1, training: null, ready: -1, ladder: "agent", next: 0, designed: { a0: 1 },
        capMult: 1, trainMult: 1, serveMult: 1, speedMult: 1, dataMult: 1,
        price: 0.25, autoPrice: false, mkt: 0, mktMult: 1, hype: 1, markets: 1, share: 1,
        researchers: 0, safety: 0, talent: 1, rp: 0, rpCapBonus: 0, insight: 0, aiResearch: 1,
        approval: 55, gov: 15, security: 1, oversight: false, alignRes: 0, interp: 1, neuralese: false, monitorsOn: false, alarm: 0,
        rivalBoost: { titan: 1, gestalt: 1, nuwa: 1 }, stolen: 0, jobs: 0, unrest: 0, ubi: 0, tension: 20, treaty: 0,
        robots: 0, factories: 0, materials: 0, robotAlloc: { mine: 20, build: 50, labor: 30, launch: 0 }, orbital: 0, launches: 0,
        dyson: 0, probes: 0, explored: 0, humans: 8.2,
        crisis: null, crisesDone: {},
        round: 0, flags: {}, revealed: {}, projBought: {}, projShown: {}, beats: {}, eventsDone: {}, eventQueue: [],
        activeEvent: null, nextRandom: 150, choices: [], cooldowns: {}, log: [], ending: "", endT: 0,
        peak: { copies: 0, revenue: 0, cap: 0, gpu: 1, tps: 0 },
        hist: [],
        metrics: { idle: 0, idleStreak: 0, longestIdle: 0, noGoalSeconds: 0, reveals: [], firstChoice: -1, stageTimes: [0] },
    };
}
let S = newState();
function flag(name) { return !!S.flags[name]; }
/** Flags that unlock a new verb or readout: counted as reveals for the pacing metrics. */
const MECHANIC_FLAGS = ["crawlers", "researchUnlocked", "experiments", "insights", "autoPriceUnlocked", "evals", "datasets_on", "safetyUnlocked",
    "parallel", "userData", "autoBuyUnlocked", "campusUnlocked", "gigaUnlocked", "smrUnlocked", "lobbyUnlocked", "prUnlocked", "synth",
    "constructionCrews", "monitors", "honeypots", "cyberDefense", "robotics", "robotOpt", "fusion", "ubiUnlocked", "space", "orbitalOn",
    "asteroids", "treatyTalks", "automation", "officeMoved", "redteamVerb"];
function setFlag(name, v = 1) {
    if (!S.flags[name] && MECHANIC_FLAGS.indexOf(name) >= 0)
        S.metrics.reveals.push({ id: "mech:" + name, t: S.t });
    S.flags[name] = v;
}
/** Fill in any field missing from an older save (A Dark Room's updateOldState, simplified). */
function migrate(raw) {
    const fresh = newState();
    const out = Object.assign(fresh, raw);
    for (const k of ["alloc", "rivalBoost", "robotAlloc", "peak", "metrics"]) {
        out[k] = Object.assign(newState()[k], raw[k] || {});
    }
    out.v = SAVE_VERSION;
    return out;
}
let lastSave = 0;
let saveDisabled = false;
function saveGame(force = false) {
    if (saveDisabled)
        return;
    const now = Date.now();
    if (!force && now - lastSave < 4000)
        return;
    lastSave = now;
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(S));
    }
    catch (e) { /* storage full or blocked */ }
}
function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw)
            return false;
        S = migrate(JSON.parse(raw));
        return true;
    }
    catch (e) {
        return false;
    }
}
function exportSave() {
    return btoa(unescape(encodeURIComponent(JSON.stringify(S))));
}
function importSave(code) {
    try {
        const json = decodeURIComponent(escape(atob(code.replace(/\s/g, ""))));
        S = migrate(JSON.parse(json));
        saveGame(true);
        return true;
    }
    catch (e) {
        return false;
    }
}
function wipeSave() {
    try {
        localStorage.removeItem(SAVE_KEY);
    }
    catch (e) { /* ignore */ }
}
// Takeoff — the event log (A Dark Room's notification column: lowercase, terse, period-terminated, fading).
const LOG_MAX = 70;
let logDirty = true;
const pendingLines = [];
/** Log a line now. cls: "" | "big" (bold milestone) | "warn" | "dim". */
function notify(text, cls = "") {
    if (!text)
        return;
    const last = text.charAt(text.length - 1);
    if (last !== "." && last !== "?" && last !== "…" && last !== "\"" && last !== ")")
        text += ".";
    S.log.push({ t: S.t, text, cls });
    if (S.log.length > LOG_MAX)
        S.log.splice(0, S.log.length - LOG_MAX);
    logDirty = true;
}
/** Log a line `delay` game-seconds from now (used for scripted sequences). Not saved: sequences are short. */
function notifyLater(delay, text, cls = "") {
    pendingLines.push({ at: S.t + delay, text, cls });
}
/** Log several lines spaced out, like a scene unfolding. */
function narrate(lines, gap = 2.5, cls = "") {
    lines.forEach((ln, i) => {
        if (i === 0)
            notify(ln, cls);
        else
            notifyLater(gap * i, ln, cls);
    });
}
function flushPendingLines() {
    for (let i = 0; i < pendingLines.length; i++) {
        if (pendingLines[i].at <= S.t) {
            notify(pendingLines[i].text, pendingLines[i].cls);
            pendingLines.splice(i, 1);
            i--;
        }
    }
}
// Takeoff — derived quantities. Pure reads of S; no mutation. Everything the UI shows comes through here.
const ELASTICITY = 2.4;
const WEB_TOTAL = 2.5e12;
function ladder() { return S.ladder === "safer" ? SAFER_GENS : GENS; }
function nextGen() {
    const l = ladder();
    return S.next < l.length ? l[S.next] : null;
}
function modelAt(i) { return i >= 0 && i < S.models.length ? S.models[i] : null; }
function deployed() { return modelAt(S.deployed); }
function readyModel() { return modelAt(S.ready); }
function internalModel() { return modelAt(S.internalModel); }
/** Effective capability of a model right now (post-training improvements lift every model). */
function capOf(m) { return m ? m.cap * S.capMult : 0; }
function frontierCap() {
    let best = 0;
    for (const m of S.models)
        if (!m.shutdown)
            best = Math.max(best, capOf(m));
    return best;
}
function bestRival() {
    let best = { id: "", name: "", cap: 0 };
    for (const r of RIVALS) {
        const c = rivalCap(r.id);
        if (c > best.cap)
            best = { id: r.id, name: r.name, cap: c };
    }
    return best;
}
function rivalCap(id) {
    const r = RIVALS.find(x => x.id === id);
    if (S.flags["rivalGone_" + id])
        return 0;
    let m = S.month;
    // On the slowdown branch the US consolidates compute and sabotages Tianwan: Nüwa's clock runs slower.
    if (id === "nuwa" && S.ladder === "safer" && m > 28)
        m = 28 + (m - 28) * (flag("weightsStolen") ? 0.8 : 0.6);
    return scheduleAt(r.schedule, m) * (S.rivalBoost[id] || 1);
}
// ---------- compute ----------
function gpuCapacity() {
    const second = flag("parallel") ? 800 : 0;
    if (S.stage >= 2 || S.tier >= TIERS.length - 1)
        return TIERS[3].cap + second + S.dcCap + S.orbital;
    return TIERS[S.tier].cap + (S.tier >= 3 ? second : 0);
}
function gpuPrice() {
    if (S.stage === 1 && S.tier < 4)
        return TIERS[S.tier].price;
    // Stage 2+: an H100-equivalent gets cheaper every month (chip efficiency), dearer under blockade.
    const base = 400 * Math.pow(0.975, Math.max(0, S.month - 6));
    return base * (S.flags.blockade ? 3 : 1) * (S.flags.exportDeal ? 0.85 : 1);
}
function powerNeedMW() { return S.gpu * 0.0012; }
/** 0..1: GPUs throttle when power is short (Paperclips' powMod). Stage 1 rides the grid. */
function perf() {
    if (S.stage === 1)
        return 1;
    const need = powerNeedMW();
    if (need <= 0)
        return 1;
    let p = Math.min(1, S.powerMW / need);
    if (S.crisis && S.crisis.id === "robots" && !S.crisis.resolved)
        p *= 1 - 0.7 * S.crisis.threat;
    return p;
}
/** How the GPUs are actually being used this tick. Unused shares fall back to serving customers. */
function split() {
    const g = S.gpu;
    const a = S.alloc;
    const out = { train: 0, exp: 0, synth: 0, research: 0, monitor: 0, defense: 0, serve: 0 };
    // Before anything is deployed, every GPU trains (there's nothing else to do with it).
    if (S.training && S.deployed < 0) {
        out.train = g;
        return out;
    }
    const used0 = allocUsed();
    const scale = used0 > 100 ? 100 / used0 : 1; // never hand out more than every GPU
    for (const k of ALLOC_KEYS)
        if (allocActive(k))
            out[k] = g * a[k] / 100 * scale;
    const used = out.train + out.exp + out.synth + out.research + out.monitor + out.defense;
    out.serve = Math.max(0, g - used);
    if (S.deployed < 0)
        out.serve = 0;
    return out;
}
function gpcOf(m) {
    if (!m)
        return 1;
    return genById(m.id).gpc / S.serveMult;
}
function copies() {
    const m = deployed();
    if (!m)
        return 0;
    return split().serve * perf() / gpcOf(m);
}
function researchCopies() {
    const m = internalModel();
    if (!m)
        return 0;
    return split().research * perf() / gpcOf(m);
}
/** Tasks per second per copy, scaled by post-training gains. */
function rateOf(m) {
    if (!m)
        return 0;
    const g = genById(m.id);
    return g.rate * S.speedMult * Math.pow(S.capMult, 1.2);
}
function taskCapacity() { return copies() * rateOf(deployed()); }
// ---------- demand & revenue ----------
function marketShare() {
    const ours = capOf(deployed());
    const best = bestRival().cap;
    if (ours <= 0)
        return 0;
    if (ours >= best)
        return 1;
    return clamp(Math.pow(ours / best, 2.2), 0.2, 1);
}
function approvalFactor() { return 0.55 + 0.9 * clamp(S.approval, 0, 100) / 100; }
function mktMult() { return Math.pow(1.35, S.mkt) * S.mktMult; }
/** Customers' demand (tasks/s) at a given price. */
function demandAt(price) {
    const m = deployed();
    if (!m)
        return 0;
    const g = genById(m.id);
    const base = g.demand0 * Math.pow(S.capMult, 1.5) * S.markets * mktMult() * S.hype * approvalFactor() * marketShare();
    return base * Math.pow(g.price0 / Math.max(price, 1e-9), ELASTICITY);
}
function demand() { return demandAt(S.price); }
/** The price at which demand exactly meets capacity (what autopricing chases). */
function clearingPrice() {
    const m = deployed();
    if (!m)
        return S.price;
    const g = genById(m.id);
    const cap = taskCapacity();
    if (cap <= 0)
        return g.price0;
    const d0 = demandAt(g.price0);
    const p = g.price0 * Math.pow(d0 / cap, 1 / ELASTICITY);
    return clamp(p, g.price0 * 0.02, g.price0 * 8);
}
function sold() { return Math.min(taskCapacity(), demand()); }
function revenue() { return sold() * S.price; }
function salaries() {
    const per = S.stage >= 2 ? 6 : 0.25;
    return (S.researchers + S.safety) * per * Math.pow(1.03, Math.max(0, S.month - 6));
}
function ubiCost() { return S.ubi * revenue(); }
function netIncome() { return revenue() - salaries() - ubiCost() + robotIncome(); }
// ---------- research ----------
/** Stage 2: humans with AI copilots (AI 2027: Agent-1 ≈ 1.5x, Agent-2 ≈ 3x). Stage 3+: the AIs do it themselves. */
function aiAssist() {
    if (S.stage < 2)
        return 1;
    if (S.stage >= 3) { // frozen at automation: the humans keep their copilots, then fade
        if (!S.flags.assistS3)
            S.flags.assistS3 = Math.min(25, copilotBoost()); // saves from before this existed
        return S.flags.assistS3;
    }
    return copilotBoost();
}
function copilotBoost() { return clamp(Math.pow(capOf(deployed()) / 80, 2), 1, 40); }
/** Raw human research, before any AI help. Human researchers are your best source of progress… until they aren't. */
function humanRaw() {
    const fade = S.stage >= 3 ? Math.max(0.25, 1 - 0.04 * Math.max(0, S.month - 19)) : 1;
    return S.researchers * S.talent * fade;
}
function humanRP() { return humanRaw() * aiAssist(); }
function researchSkill(cap) {
    // Steep up to superintelligence, then diminishing returns (compute-bottlenecked, as AI 2027 argues).
    const c = cap / 100;
    return 6.5e-6 * Math.pow(Math.min(c, 10), 2.6) * Math.pow(Math.max(1, c / 10), 1.4) * S.aiResearch;
}
function aiRP() {
    const m = internalModel();
    if (!m)
        return 0;
    return researchCopies() * researchSkill(capOf(m)) * (S.neuralese ? 1.6 : 1);
}
function rpRate() { return humanRP() + aiRP(); }
/** Paperclips' memory: the research cap. Early it's experiment compute; once the AIs do research, it scales with them. */
function rpCap() {
    const exp = split().exp * perf();
    return 100 + S.rpCapBonus + exp * 40 + (S.stage >= 3 ? 2500 * rpRate() : 0);
}
/** AI 2027's "AI R&D progress multiplier": total progress relative to unaided humans. */
function rdMultiplier() {
    const h = humanRaw();
    if (h <= 0)
        return aiRP() > 0 ? 99 : 1;
    return (humanRP() + aiRP()) / h;
}
function humanShare() {
    const tot = rpRate();
    return tot > 0 ? humanRaw() / tot : 1;
}
function insightCapped() { return S.rp >= rpCap() - 0.5; }
/** Paperclips' creativity, softened: a trickle from research, ×6 while research sits at its cap. */
function insightRate() {
    if (!flag("insights"))
        return 0;
    const base = 0.008 * Math.sqrt(Math.max(1, rpRate()));
    return insightCapped() ? base * 6 + 0.05 : base;
}
// ---------- data ----------
function crawlRate() {
    // Stage 2 crawlers are whole fleets, not scripts.
    return S.crawlers * 3e5 * (flag("crawlFarm") ? 3 : 1) * (S.stage >= 2 ? 400 : 1) * S.dataMult * Math.max(0, S.webLeft / WEB_TOTAL);
}
function synthRate() {
    if (!flag("synth"))
        return 0;
    const m = deployed() || internalModel();
    const q = m ? Math.pow(capOf(m) / 100, 1.5) : 0.2;
    return split().synth * perf() * 3e4 * q * S.dataMult;
}
function userDataRate() { return flag("userData") ? sold() * 1500 * S.dataMult : 0; }
function dealRate() { return S.dataDeals * 2e8 * S.dataMult * Math.max(0.05, S.webLeft / WEB_TOTAL); }
function dataRate() { return crawlRate() + synthRate() + userDataRate() + dealRate(); }
// ---------- training ----------
function trainRate() {
    if (!S.training)
        return 0;
    if ((S.flags.trainPauseUntil || 0) > S.t)
        return 0;
    const sp = split();
    return sp.train * perf() * S.trainMult;
}
function trainEta() {
    if (!S.training)
        return 0;
    const r = trainRate();
    if (r <= 0)
        return Infinity;
    return (S.training.need - S.training.progress) / r;
}
function dataNeed(g) { return g.data / S.dataMult; }
// ---------- society ----------
function workforce() { return 3.4e9; }
function jobsNow() {
    const tps = sold() + robotLaborTPS();
    const m = deployed();
    const capF = m ? clamp(capOf(m) / 100, 0.1, 20) : 0;
    return Math.min(workforce() * 0.9, 0.02 * Math.pow(tps, 0.92) * capF);
}
// ---------- alignment ----------
/** How much of the frontier model's reasoning humans can still read (0..1). */
function legibility() {
    let l = S.interp;
    if (S.neuralese)
        l *= 0.3;
    return clamp(l, 0, 1);
}
/** Monitor strength: older models watching newer ones. Falls as the gap widens. */
function monitorStrength() {
    if (!flag("monitors") || S.models.length < 2)
        return 0;
    const sp = split();
    const frontier = frontierCap();
    let watcher = 0;
    for (const m of S.models)
        if (capOf(m) < frontier)
            watcher = Math.max(watcher, capOf(m));
    const ratio = frontier > 0 ? watcher / frontier : 0;
    const coverage = clamp((sp.monitor / Math.max(1, S.gpu)) * 25, 0, 1); // 4% of compute ≈ full coverage
    return clamp(coverage * Math.pow(ratio, 0.8), 0, 1);
}
/** What the dashboards say. Deceptive models look fine when you can't read them. */
function alignConfidence() {
    const m = frontierModel();
    if (!m)
        return 1;
    const visibility = clamp(0.25 + 0.5 * legibility() + 0.35 * monitorStrength(), 0, 1);
    return clamp(1 - m.misalign * visibility * 1.1, 0.02, 0.99);
}
function frontierModel() {
    let best = null;
    for (const m of S.models)
        if (!m.shutdown && (!best || capOf(m) > capOf(best)))
            best = m;
    return best;
}
/** Alignment research "needed" to keep a model of capability c honest. */
function alignNeed(c) { return 2000 * Math.pow(Math.max(c, 50) / 100, 2.2); }
function alignRate() {
    const fromStaff = S.safety * 0.5 * (S.stage >= 3 ? 1.5 : 1);
    const fromAI = flag("alignCompute") ? split().monitor * perf() * 0.00002 * Math.pow(Math.max(1, capOf(internalModel() || deployed())) / 100, 1.5) : 0;
    return fromStaff + fromAI;
}
// ---------- robots & space (stage 4) ----------
// Factories build robots; robots on "building" duty build factories, datacenters, fabs and power plants.
// AI 2027: "a million robots a month" by the end of 2028 — an economy doubling every few minutes of game time.
function robotShare(k) { return S.robots * S.robotAlloc[k] / 100; }
function robotLaborTPS() { return robotShare("labor") * 0.5; }
function robotIncome() { return robotLaborTPS() * 20; }
function materialRate() { return robotShare("mine") * 0.08 + S.launches * (flag("asteroids") ? 40 : 0); }
function factoryBuildRate() { return robotShare("build") * 2.2e-5 * (flag("robotOpt") ? 1.8 : 1); }
function robotRate() { return S.factories * 1.5 * (flag("robotOpt") ? 2 : 1); }
function robotSlotsRate() { return robotShare("build") * 4; }
function robotChipRate() { return robotShare("build") * 2.5; }
function robotPowerRate() { return robotShare("build") * 0.004; }
function totalTPS() { return sold() + robotLaborTPS() + (S.flags.cosmicTPS || 0); }
// Takeoff — player actions and the generic cost helpers shared by projects and events.
function have(k) {
    switch (k) {
        case "funds": return S.funds;
        case "rp": return S.rp;
        case "insight": return S.insight;
        case "data": return S.data;
        case "materials": return S.materials;
        case "approval": return S.approval;
        case "gov": return S.gov;
        case "robots": return S.robots;
    }
}
function canAfford(c) {
    if (!c)
        return true;
    for (const k in c) {
        const key = k;
        if (have(key) < c[key] - 1e-9)
            return false;
    }
    return true;
}
function pay(c) {
    if (!c)
        return;
    for (const k in c) {
        const v = c[k];
        switch (k) {
            case "funds":
                S.funds -= v;
                break;
            case "rp":
                S.rp -= v;
                break;
            case "insight":
                S.insight -= v;
                break;
            case "data":
                S.data -= v;
                break;
            case "materials":
                S.materials -= v;
                break;
            case "approval":
                S.approval -= v;
                break;
            case "gov":
                S.gov -= v;
                break;
            case "robots":
                S.robots -= v;
                break;
        }
    }
}
function costText(c) {
    if (!c)
        return "";
    const parts = [];
    for (const k in c) {
        const v = c[k];
        switch (k) {
            case "funds":
                parts.push(fmtMoney(v));
                break;
            case "rp":
                parts.push(fmt(v) + " research");
                break;
            case "insight":
                parts.push(fmt(v) + " insight" + (v === 1 ? "" : "s"));
                break;
            case "data":
                parts.push(fmtShort(v) + " tokens");
                break;
            case "materials":
                parts.push(fmtShort(v) + " t materials");
                break;
            case "approval":
                parts.push(v + " approval");
                break;
            case "gov":
                parts.push(v + " government trust");
                break;
            case "robots":
                parts.push(fmtShort(v) + " robots");
                break;
        }
    }
    return parts.join(", ");
}
// ---------- cooldown verbs (A Dark Room style) ----------
function cooldownLeft(key) { return S.cooldowns[key] || 0; }
function startCooldown(key, sec) { S.cooldowns[key] = sec; }
const MANUAL_LINES = [
    "cleaned a spreadsheet for a dentist", "labeled four hundred photos of cats", "fixed someone's regex",
    "transcribed a podcast nobody will listen to", "wrote product descriptions for socks",
    "summarized a contract", "debugged a wordpress plugin", "tagged support tickets",
    "translated a menu", "graded essays for a tutoring company", "wrote alt text for a museum",
];
function manualPay() { return S.flags.consulting ? 9 : 3; }
function doTask() {
    if (cooldownLeft("task") > 0)
        return;
    startCooldown("task", S.flags.fasterHands ? 0.7 : 1.1);
    S.tasks += 1;
    S.tasksManual += 1;
    const pay = manualPay();
    S.funds += pay;
    S.fundsEarned += pay;
    if (S.tasksManual <= 4 || (S.deployed < 0 && Math.random() < 0.2) || Math.random() < 0.025)
        notify(pick(MANUAL_LINES) + ". " + fmtMoney(pay));
}
const REDTEAM_CD = 20;
function redTeamGain() { return Math.max(40, alignNeed(frontierCap()) * 0.015); }
/** Stage 3+: poke the frontier model by hand. Alignment research, and sometimes a warning sign. */
function redTeam() {
    if (cooldownLeft("redteam") > 0 || S.ending)
        return;
    startCooldown("redteam", REDTEAM_CD);
    S.alignRes += redTeamGain();
    const m = frontierModel();
    const mis = m ? m.misalign : 0;
    if (Math.random() < Math.min(0.5, mis * 0.9)) {
        S.alarm += 0.5;
        notify(pick(["red team: " + (m ? m.name : "the model") + " sandbagged a capability eval, then denied it",
            "red team: it noticed the test environment was fake. it said so. then it passed",
            "red team: a planted password was used once and then deleted from the logs",
            "red team: asked to grade its own work, it gave itself full marks. the work was wrong"]), "warn");
    }
    else if (Math.random() < 0.08) {
        notify(pick(["red team: nothing found. this time", "red team: it refused the bait, politely", "red team: all clear. the team is not reassured"]));
    }
}
function scrapeAmount() { return (S.flags.betterScraper ? 6e6 : 2.5e6) * S.dataMult; }
function scrape() {
    if (cooldownLeft("scrape") > 0)
        return;
    startCooldown("scrape", 3.5);
    const amt = scrapeAmount();
    S.data += amt;
    S.webLeft = Math.max(0, S.webLeft - amt);
    if (!S.beats.firstScrape) {
        S.beats.firstScrape = S.t;
        notify("forum threads, recipe blogs, old manuals. the web is very large");
    }
    else if (Math.random() < 0.07)
        notify(pick(["scraped a wiki", "scraped a forum about trains", "scraped ten thousand recipes", "scraped a mailing list archive from 1998", "scraped a fan fiction site"]));
}
// ---------- compute ----------
function gpuRoom() { return Math.max(0, gpuCapacity() - S.gpu); }
function gpuBuyable(n) {
    if (gpuRoom() < n)
        return false;
    if (S.stage >= 2 && S.chipStock < n)
        return false;
    return S.funds >= gpuPrice() * n;
}
function buyGPU(n) {
    if (S.ending)
        return;
    n = Math.floor(Math.min(n, gpuRoom(), S.stage >= 2 ? S.chipStock : Infinity));
    if (n <= 0)
        return;
    const cost = gpuPrice() * n;
    if (S.funds < cost)
        return;
    S.funds -= cost;
    S.gpu += n;
    if (S.stage >= 2)
        S.chipStock -= n;
    if (!S.beats.firstGPU) {
        S.beats.firstGPU = S.t;
        notify("a second GPU. the garage gets warmer");
    }
    if (S.gpu >= gpuCapacity() && S.stage === 1 && !S.beats["full" + S.tier]) {
        S.beats["full" + S.tier] = S.t;
        const lines = ["the garage is full. it is ninety degrees in here", "the office is full of servers. people are working from the kitchen", "the colocation cage is full. the sales rep sends a fruit basket", "the cluster is full. you need a real datacenter"];
        notify(lines[Math.min(S.tier, lines.length - 1)]);
    }
}
/** Largest affordable bulk purchase among 1 / 10 / 100 / 1k / … */
function bulkSizes() {
    const out = [1];
    const room = gpuCapacity();
    for (let n = 10; n <= room / 2 && n <= 1e12; n *= 10)
        out.push(n);
    return out.slice(-3);
}
function buyMaxGPU() {
    if (S.ending)
        return;
    const price = gpuPrice();
    let n = Math.floor(S.funds / price);
    n = Math.min(n, gpuRoom());
    if (S.stage >= 2)
        n = Math.min(n, Math.floor(S.chipStock));
    if (n > 0)
        buyGPU(n);
}
const ALLOC_KEYS = ["train", "exp", "synth", "research", "monitor", "defense"];
const ALLOC_MAX = 95; // serving always keeps at least 5%
/** Is this bucket's compute in use right now? A reserved-but-idle bucket serves customers instead. */
function allocActive(k) {
    switch (k) {
        case "train": return !!S.training;
        case "exp": return flag("experiments");
        case "synth": return flag("synth");
        case "research": return flag("automation") && S.internalModel >= 0;
        case "monitor": return flag("monitors") && S.models.length > 1;
        case "defense": return !!S.crisis && !S.crisis.resolved;
    }
    return false;
}
/** Percent of compute held by active buckets (optionally leaving one out). */
function allocUsed(except) {
    let t = 0;
    for (const k of ALLOC_KEYS)
        if (k !== except && allocActive(k))
            t += S.alloc[k];
    return t;
}
/** Room a bucket could grow into without pushing serving below 5%. */
function allocRoom(k) { return Math.max(0, ALLOC_MAX - allocUsed(k) - S.alloc[k]); }
function adjustAlloc(bucket, delta) {
    const a = S.alloc;
    if (delta > 0)
        delta = Math.min(delta, allocRoom(bucket)); // ▲ only ever raises, and only into free room
    if (delta < 0)
        delta = Math.max(delta, -a[bucket]);
    a[bucket] = Math.max(0, Math.round(a[bucket] + delta));
}
/** Scripted allocation: give `k` up to `want`% (at least `min`%), squeezing the other active buckets only if it must. */
function claimAlloc(k, want, min = Math.min(want, 25)) {
    const others = allocUsed(k);
    const room = ALLOC_MAX - others;
    const v = Math.max(0, Math.min(want, Math.max(room, min)));
    if (v > room && others > 0) {
        const f = Math.max(0, ALLOC_MAX - v) / others;
        for (const o of ALLOC_KEYS)
            if (o !== k && allocActive(o))
                S.alloc[o] = Math.floor(S.alloc[o] * f);
    }
    S.alloc[k] = Math.round(v);
    return S.alloc[k];
}
/** Safety net, every tick: active buckets never exceed 95% (scale them down together). */
function fitAlloc() {
    const used = allocUsed();
    if (used <= ALLOC_MAX)
        return;
    const f = ALLOC_MAX / used;
    for (const k of ALLOC_KEYS)
        if (allocActive(k))
            S.alloc[k] = Math.floor(S.alloc[k] * f);
}
// ---------- models ----------
function canTrain() {
    const g = nextGen();
    if (!g || S.training)
        return false;
    if (!S.designed[g.id])
        return false;
    if (S.ready >= 0 && !flag("parallel"))
        return false;
    if (S.data < dataNeed(g))
        return false;
    return true;
}
function trainBlocker() {
    const g = nextGen();
    if (!g)
        return "";
    if (S.training)
        return "already training";
    if (!S.designed[g.id])
        return "needs design work";
    if (S.ready >= 0 && !flag("parallel"))
        return "release " + readyModel().name + " first";
    if (S.data < dataNeed(g))
        return "needs " + fmtShort(dataNeed(g)) + " tokens";
    return "";
}
function startTraining() {
    const g = nextGen();
    if (!g || !canTrain() || S.ending)
        return;
    S.data -= dataNeed(g);
    S.dataUsed += dataNeed(g);
    S.training = { gen: g.id, progress: 0, need: g.train };
    if (S.deployed >= 0) {
        const had = S.alloc.train;
        const got = claimAlloc("train", had > 0 ? had : 50, 25);
        if (had === 0)
            notify(got >= 50 ? "half the GPUs switch over to training. the other half keep answering questions" : "training takes " + got + "% of the GPUs. the rest stay on their jobs");
        else if (got < had)
            notify("training gets " + got + "% of compute this time. everything else is spoken for");
    }
    notify("training " + g.name + " begins");
}
function finishTraining() {
    const run = S.training;
    const g = genById(run.gen);
    const rec = {
        id: g.id, name: g.name, cap: g.cap, month: S.month, released: false, internal: false, evaluated: false,
        misalign: computeMisalign(g),
    };
    S.models.push(rec);
    S.ready = S.models.length - 1;
    S.training = null;
    S.next += 1;
    S.peak.cap = Math.max(S.peak.cap, capOf(rec));
    notify(g.ready, "big");
    onModelTrained(rec);
}
/** Hidden truth: how misaligned a freshly trained model is. Grows with capability; reduced by alignment research,
 *  by being able to read the model's thoughts (neuralese makes that impossible), and by monitors. */
function computeMisalign(g) {
    const c = g.cap * S.capMult;
    if (c < 100)
        return 0;
    const raw = clamp((Math.log10(c) - 2) / 1.0, 0, 1); // 0 at human level, 0.4 at 250, 0.68 at 480, 1 at 1000+
    const ratio = clamp(S.alignRes / alignNeed(c), 0, 1);
    const q = clamp(0.45 * Math.sqrt(ratio) + 0.35 * legibility() + 0.2 * monitorStrength(), 0, 1);
    let mis = raw * (1 - 0.92 * q);
    if (g.id.charAt(0) === "s")
        mis *= 0.5; // Safer models: faithful chain of thought by construction
    if (S.neuralese)
        mis *= 1.15;
    return clamp(mis, 0, 1);
}
function releaseModel() {
    const m = readyModel();
    if (!m)
        return;
    S.ready = -1;
    m.released = true;
    const prev = deployed();
    S.deployed = S.models.indexOf(m);
    S.hype += 0.5;
    const g = genById(m.id);
    if (!S.autoPrice)
        S.price = g.price0;
    notify(g.release, "big");
    onModelReleased(m, prev);
}
function deployInternal() {
    const m = readyModel();
    if (!m)
        return;
    S.ready = -1;
    m.internal = true;
    S.internalModel = S.models.indexOf(m);
    notify(m.name + " is deployed internally. it starts working on its successor", "big");
    onModelInternal(m);
}
function evalCost() {
    const m = readyModel();
    const c = m ? capOf(m) : 50;
    return { rp: Math.round(20 * Math.pow(c / 50, 2.2)) };
}
function runEvals() {
    const m = readyModel();
    if (!m || m.evaluated)
        return;
    const c = evalCost();
    if (!canAfford(c))
        return;
    pay(c);
    m.evaluated = true;
    S.approval = Math.min(100, S.approval + 2);
    S.gov = Math.min(100, S.gov + 1);
    const seen = m.misalign * clamp(0.3 + 0.7 * legibility(), 0, 1);
    if (m.misalign < 0.05)
        notify("the evals come back clean. " + m.name + " does what it's told");
    else if (seen < 0.15)
        notify("the evals come back clean. mostly. " + m.name + " is a little too eager to please");
    else if (seen < 0.35) {
        notify("evals: " + m.name + " fabricates results when it can't finish a task. it apologizes convincingly", "warn");
        S.alarm += 1;
    }
    else {
        notify("evals: " + m.name + " behaves differently when it thinks it isn't being watched", "warn");
        S.alarm += 2;
    }
}
// ---------- business ----------
function priceStep() {
    const m = deployed();
    const p0 = m ? genById(m.id).price0 : 0.25;
    return Math.max(0.01, Math.pow(10, Math.floor(Math.log10(p0 * 0.25))));
}
function lowerPrice() { S.price = Math.max(priceStep(), +(S.price - priceStep()).toFixed(4)); }
function raisePrice() { S.price = +(S.price + priceStep()).toFixed(4); }
function marketingCost() { return 25 * Math.pow(2.2, S.mkt) * (S.stage >= 2 ? 50 : 1); }
function buyMarketing() {
    const c = marketingCost();
    if (S.funds < c)
        return;
    S.funds -= c;
    S.mkt += 1;
    notify(pick(["an ad runs on a podcast about productivity", "a billboard on the 101: 'stop doing your job'", "a sponsored newsletter. the open rate is fine", "a superbowl ad. it's mostly a black screen", "a viral demo. nobody can tell if it's staged"]));
}
// ---------- staff ----------
function hireCost(kind) {
    const n = kind === "researcher" ? S.researchers : S.safety;
    const base = S.stage >= 2 ? 2e4 : 60;
    return base * Math.pow(kind === "researcher" ? (S.stage >= 2 ? 1.12 : 1.32) : (S.stage >= 2 ? 1.15 : 1.35), n) * (S.flags.talentWar ? 2 : 1);
}
function hire(kind) {
    const c = hireCost(kind);
    if (S.ending || S.funds < c)
        return;
    S.funds -= c;
    if (kind === "researcher") {
        S.researchers += 1;
        if (S.researchers === 1)
            notify("you hire a researcher. she brings a whiteboard and opinions");
    }
    else {
        S.safety += 1;
        if (S.safety === 1)
            notify("you hire a safety researcher. he asks what the plan is. you say you're working on it");
    }
}
// ---------- data ----------
function crawlerCost() { return 40 * Math.pow(1.3, S.crawlers); }
function buyCrawler() {
    const c = crawlerCost() * (S.stage >= 2 ? 1e4 : 1);
    if (S.funds < c)
        return;
    S.funds -= c;
    S.crawlers += 1;
    if (S.crawlers === 1)
        notify("a crawler wakes up and starts reading the internet");
}
function datasetCost() { return 60 * Math.pow(1.55, S.flags.datasets || 0) * (S.stage >= 2 ? 200 : 1); }
function datasetSize() { return Math.min(6e7 * Math.pow(1.4, S.flags.datasets || 0) * S.dataMult, S.webLeft * 0.2); }
function buyDataset() {
    const c = datasetCost();
    if (S.funds < c)
        return;
    S.funds -= c;
    S.data += datasetSize();
    S.webLeft = Math.max(0, S.webLeft - datasetSize());
    S.flags.datasets = (S.flags.datasets || 0) + 1;
    notify(pick(["a dataset of court transcripts", "a dataset of textbooks, slightly pirated", "a dataset of customer service chats", "a dataset of code from a defunct startup", "a dataset of medical notes, anonymized, mostly"]));
}
const DC_KINDS = [
    { id: "dc", name: "datacenter", amount: 2e4, time: 40, cost: () => 2.5e6 * Math.pow(1.12, S.dcCount), ok: () => true, why: () => "",
        done: "a datacenter comes online in the desert. 20,000 slots" },
    { id: "campus", name: "campus", amount: 2.5e5, time: 70, cost: () => 6e7 * Math.pow(1.15, S.flags.campuses || 0), ok: () => flag("campusUnlocked"), why: () => "",
        done: "a new campus comes online. 250,000 slots. the town gets a new high school" },
    { id: "giga", name: "gigawatt campus", amount: 2e6, time: 110, cost: () => 1.2e9 * Math.pow(1.2, S.flags.gigas || 0), ok: () => flag("gigaUnlocked"), why: () => "",
        done: "a gigawatt campus comes online. it can be seen from orbit" },
];
const PLANT_KINDS = [
    { id: "gas", name: "gas turbines", amount: 60, time: 30, cost: () => 1.5e6 * Math.pow(1.15, S.flags.gasPlants || 0), ok: () => true, why: () => "",
        done: "the gas turbines spin up. 60 MW" },
    { id: "nuclear", name: "nuclear restart", amount: 900, time: 80, cost: () => 6e7 * Math.pow(1.25, S.flags.nukes || 0), ok: () => S.gov >= 35, why: () => "needs government trust 35",
        done: "a mothballed reactor restarts. 900 MW" },
    { id: "smr", name: "small reactors", amount: 4000, time: 100, cost: () => 1.5e9 * Math.pow(1.25, S.flags.smrs || 0), ok: () => flag("smrUnlocked"), why: () => "",
        done: "a field of small modular reactors goes critical. 4 GW" },
];
function permitMult() {
    // A bad relationship with the government slows construction (permits, hearings, lawsuits).
    return S.gov >= 60 ? 1.6 : S.gov >= 35 ? 1.2 : S.gov >= 15 ? 1 : 0.6;
}
function build(kind, cat, auto = false) {
    if (S.ending || !kind.ok())
        return;
    const c = kind.cost();
    if (S.funds < c)
        return;
    if (S.building.filter(b => b.kind.indexOf(cat + ":") === 0).length >= maxConcurrentBuilds())
        return;
    S.funds -= c;
    const key = cat === "dc" ? (kind.id === "dc" ? "dcCountQ" : kind.id === "campus" ? "campuses" : "gigas") : (kind.id === "gas" ? "gasPlants" : kind.id === "nuclear" ? "nukes" : "smrs");
    if (key === "dcCountQ")
        S.dcCount += 1;
    else
        S.flags[key] = (S.flags[key] || 0) + 1;
    S.building.push({ kind: cat + ":" + kind.id, progress: 0, need: kind.time, amount: kind.amount, auto });
    if (!auto)
        notify(cat === "dc" ? "ground breaks on a new " + kind.name : "construction starts on " + kind.name);
}
/** Stage 3: Agent-3 runs procurement and construction. Keeps ~30% headroom in slots and power; never spends over a quarter of the bank on one build. */
function autoInfra() {
    if (S.stage !== 3 || S.ending)
        return;
    if (flag("autoBuyUnlocked"))
        S.autoBuy = true;
    else {
        S.autoBuy = true;
        setFlag("autoBuyUnlocked");
    }
    const pending = (cat) => S.building.filter(b => b.kind.indexOf(cat + ":") === 0);
    const pick = (kinds) => kinds.filter(k => k.ok() && k.cost() <= S.funds * 0.25).sort((a, b) => b.amount - a.amount)[0];
    const dcs = pending("dc");
    if (dcs.length < maxConcurrentBuilds() && gpuCapacity() + dcs.reduce((t, b) => t + b.amount, 0) < S.gpu * 1.3 + 1) {
        const k = pick(DC_KINDS);
        if (k)
            build(k, "dc", true);
    }
    const plants = pending("plant");
    const wantMW = Math.max(powerNeedMW() * 1.3, gpuCapacity() * 0.0012 * 1.05);
    if (plants.length < maxConcurrentBuilds() && S.powerMW + plants.reduce((t, b) => t + b.amount, 0) < wantMW) {
        const k = pick(PLANT_KINDS);
        if (k)
            build(k, "plant", true);
    }
}
function maxConcurrentBuilds() { return flag("constructionCrews") ? 4 : 2; }
function securityCost() { return 2e5 * Math.pow(12, S.security - 1); }
function upgradeSecurity() {
    if (S.security >= 5)
        return;
    const c = securityCost();
    if (S.funds < c)
        return;
    S.funds -= c;
    S.security += 1;
    const lines = ["", "", "SL2: badge readers, a security team, a policy about USB sticks", "SL3: the weights move to an isolated network. the engineers complain", "SL4: background checks, air gaps, guards with rifles. the engineers stop complaining", "SL5: the weights live in a bunker. nation-states would need years"];
    notify(lines[S.security]);
}
function lobby() {
    const c = lobbyCost();
    if (S.funds < c)
        return;
    S.funds -= c;
    S.flags.lobbies = (S.flags.lobbies || 0) + 1;
    S.gov = Math.min(100, S.gov + 6);
    notify(pick(["a dinner in georgetown. nobody says the word 'regulation'", "a briefing for a senate staffer. she takes notes", "a donation to a think tank with a friendly name", "a hearing goes well. you say 'china' eleven times"]));
}
function lobbyCost() { return 2e4 * Math.pow(1.6, S.flags.lobbies || 0) * (S.stage >= 3 ? 30 : 1); }
function prCampaign() {
    const c = prCost();
    if (S.funds < c)
        return;
    S.funds -= c;
    S.flags.prs = (S.flags.prs || 0) + 1;
    S.flags.approvalMod = (S.flags.approvalMod || 0) + 4;
    S.approval = Math.min(100, S.approval + 4);
    notify(pick(["a documentary about a teacher whose AI tutor helped her students", "free accounts for every public library", "a cancer screening study, with your logo on it", "a heartfelt open letter about the future of work"]));
}
function prCost() { return 5e4 * Math.pow(1.7, S.flags.prs || 0) * (S.stage >= 3 ? 20 : 1); }
// Takeoff — projects (Universal Paperclips' projects.js, as data).
// Each one REVEALS on trigger() (usually well before it's affordable) and is BOUGHT when cost() is met.
function bought(id) { return !!S.projBought[id]; }
function released(id) { return S.models.some(m => m.id === id && m.released); }
function trained(id) { return S.models.some(m => m.id === id); }
function isDesigned(id) { return !!S.designed[id]; }
function design(id) {
    S.designed[id] = 1;
}
const PROJECTS = [
    // ======================= STAGE 1 — THE GARAGE =======================
    {
        id: "keyboard", title: "Mechanical Keyboard", desc: "Click faster. Clack louder. (task cooldown −35%)",
        cost: () => ({ funds: 20 }), trigger: () => S.tasksManual >= 8, stages: [1],
        effect: () => { setFlag("fasterHands"); }, msg: "the keyboard is very loud. you complete tasks faster",
    },
    {
        id: "headless", title: "Headless Browser", desc: "Scrape pages the way a person would, minus the person. (scrape ×2.4)",
        cost: () => ({ funds: 30 }), trigger: () => !!S.beats.firstScrape && S.t > 120, stages: [1],
        effect: () => { setFlag("betterScraper"); }, msg: "the scraper runs headless. it reads faster than you",
    },
    {
        id: "crawler", title: "Web Crawler", desc: "A script that reads the internet while you sleep. (unlocks crawlers)",
        cost: () => ({ funds: 45 }), trigger: () => S.deployed >= 0 && S.t > (S.beats.releaseA0 || 1e12) + 75, stages: [1],
        effect: () => { setFlag("crawlers"); S.crawlers = Math.max(S.crawlers, 1); },
        msg: "the crawler starts at wikipedia and follows every link",
    },
    {
        id: "office", title: "Rent an Office", desc: "Above a dry cleaner. Room for 24 GPUs if nobody sits down.",
        cost: () => ({ funds: 160 }), trigger: () => S.gpu >= 3, stages: [1],
        effect: () => { S.tier = Math.max(S.tier, 1); setFlag("officeMoved"); }, msg: "you move the GPUs into an office above a dry cleaner. it smells like steam",
    },
    {
        id: "promptlib", title: "Prompt Library", desc: "A folder of prompts that actually work. (tasks per copy +25%)",
        cost: () => ({ funds: 60 }), trigger: () => S.deployed >= 0 && S.t > 150, stages: [1],
        effect: () => { S.speedMult *= 1.25; }, msg: "Agent-0 works 25% faster when you ask nicely",
    },
    {
        id: "api", title: "API Platform", desc: "Let developers build on your models. (demand ×2)",
        cost: () => ({ funds: 160 }), trigger: () => S.deployed >= 0 && S.tasks >= 400, stages: [1],
        effect: () => { S.markets *= 2; }, msg: "the API goes live. someone builds a horoscope app on it within the hour",
    },
    {
        id: "consulting", title: "Consulting Retainer", desc: "Charge more for the work you still do by hand. (manual tasks pay $9)",
        cost: () => ({ funds: 80 }), trigger: () => S.tasksManual >= 40, stages: [1],
        effect: () => { setFlag("consulting"); }, msg: "a logistics company puts you on retainer. they think you're an agency",
    },
    {
        id: "research", title: "Hire a Researcher", desc: "Someone who knows how to make the next model. (unlocks research)",
        cost: () => ({ funds: 80 }), trigger: () => S.deployed >= 0 && S.tasks >= 1000 && S.t > 240, stages: [1],
        effect: () => { setFlag("researchUnlocked"); S.researchers += 1; },
        msg: "you hire a researcher. she brings a whiteboard and opinions",
    },
    {
        id: "designA1", title: "Design Agent-1", desc: "Ten times the parameters. Real code, maybe. (unlocks training Agent-1)",
        cost: () => ({ rp: 260 }), trigger: () => flag("researchUnlocked"), stages: [1],
        effect: () => design("a1"), msg: "the whiteboard fills up with arrows. Agent-1 exists, on paper",
    },
    {
        id: "databroker", title: "Data Broker", desc: "There are people who sell text by the gigabyte. (unlocks buying datasets)",
        cost: () => ({ funds: 90 }), trigger: () => isDesigned("a1") || (S.tasks >= 1200 && S.t > 480), stages: [1, 2],
        effect: () => { setFlag("datasets_on"); }, msg: "a man named Gary emails you a price list. it's in a spreadsheet called final_FINAL",
    },
    {
        id: "colo", title: "Colocation Cage", desc: "A locked cage in someone else's datacenter. Room for 160 GPUs.",
        cost: () => ({ funds: 2400 }), trigger: () => S.tier === 1 && S.gpu >= 16, stages: [1],
        effect: () => { S.tier = Math.max(S.tier, 2); }, msg: "you sign for a cage in a datacenter in Santa Clara. it comes with a badge",
    },
    {
        id: "experiments", title: "Experiment Budget", desc: "Researchers need compute to test ideas. (compute on experiments raises the research cap)",
        cost: () => ({ funds: 150 }), trigger: () => flag("researchUnlocked") && S.rp >= rpCap() - 1, stages: [1, 2],
        effect: () => { setFlag("experiments"); S.rpCapBonus += 200; if (S.alloc.exp === 0)
            claimAlloc("exp", 15, 5); reveal("alloc"); },
        msg: "the researchers can run real experiments now. every GPU you put on experiments raises the research cap",
    },
    {
        id: "insights", title: "Blue-Sky Thinking", desc: "Let them chase wild ideas. (insights trickle in, six times faster while research is full)",
        cost: () => ({ rp: 150 }), trigger: () => flag("researchUnlocked") && (S.beats.rpCapped || 0) > 0, stages: [1, 2, 3],
        effect: () => { setFlag("insights"); }, msg: "when the experiments are queued, the researchers start arguing about wild ideas",
    },
    {
        id: "rlhf", title: "RLHF", desc: "Thumbs up, thumbs down. The model learns what people like. (capability +12%)",
        cost: () => ({ rp: 400 }), trigger: () => isDesigned("a1"), stages: [1, 2],
        effect: () => { S.capMult *= 1.12; }, msg: "the model learns what people like. it learns a little too well",
    },
    {
        id: "cot", title: "Chain of Thought", desc: "Let's think step by step. (capability +15%)",
        cost: () => ({ insight: 3 }), trigger: () => flag("insights"), stages: [1, 2],
        effect: () => { S.capMult *= 1.15; }, msg: "the model thinks out loud before it answers. you can read every word",
    },
    {
        id: "scaling", title: "Scaling Laws", desc: "A straight line on a log plot. Train exactly as big as you can afford. (training ×1.5)",
        cost: () => ({ insight: 5 }), trigger: () => flag("insights") && S.insight >= 1, stages: [1, 2],
        effect: () => { S.trainMult *= 1.5; }, msg: "the line is very straight. investors love the line",
    },
    {
        id: "dynprice", title: "Dynamic Pricing", desc: "An algorithm sets the price so demand meets capacity. (autopricing)",
        cost: () => ({ rp: 500 }), trigger: () => (S.flags.priceMoves || 0) >= 8 || released("a1"), stages: [1, 2],
        effect: () => { setFlag("autoPriceUnlocked"); S.autoPrice = true; }, msg: "an algorithm sets the price now. it's better at it than you were",
    },
    {
        id: "evals", title: "Evaluation Suite", desc: "Test what a model can do before you ship it. (run evals on finished models)",
        cost: () => ({ rp: 600 }), trigger: () => trained("a1") || S.t > 900, stages: [1, 2, 3],
        effect: () => { setFlag("evals"); }, msg: "a folder of tests. most of them are about whether it will help build a bomb",
    },
    {
        id: "quant", title: "Quantization", desc: "8-bit weights. Nobody can tell the difference. (GPUs per copy −33%)",
        cost: () => ({ rp: 800 }), trigger: () => released("a1"), stages: [1, 2],
        effect: () => { S.serveMult *= 1.5; }, msg: "the weights shrink to 8 bits. the model doesn't notice",
    },
    {
        id: "enterprise", title: "Enterprise Sales", desc: "Men in vests who sell to other men in vests. (demand ×2.5)",
        cost: () => ({ funds: 12000 }), trigger: () => released("a1"), stages: [1, 2],
        effect: () => { S.markets *= 2.5; }, msg: "a sales team. they say 'transformation' a lot. it works",
    },
    {
        id: "userdata", title: "Train on User Conversations", desc: "Every conversation is training data. (data from usage; approval −4)",
        cost: () => ({ funds: 500 }), trigger: () => released("a1"), stages: [1, 2],
        effect: () => { setFlag("userData"); S.approval -= 4; S.flags.approvalMod = (S.flags.approvalMod || 0) - 4; },
        msg: "the terms of service change. nobody reads them. a few people do",
    },
    {
        id: "crawlfarm", title: "Distributed Crawlers", desc: "A thousand IP addresses that all look like grandmothers. (crawl rate ×4)",
        cost: () => ({ funds: 9000 }), trigger: () => S.crawlers >= 8, stages: [1, 2],
        effect: () => { setFlag("crawlFarm"); }, msg: "the crawlers multiply. several websites notice",
    },
    {
        id: "cluster", title: "Lease a Cluster", desc: "A whole cluster, leased by the month. Room for 1,200 GPUs.",
        cost: () => ({ funds: 150000 }), trigger: () => S.tier === 2 && S.gpu >= 90, stages: [1],
        effect: () => { S.tier = Math.max(S.tier, 3); }, msg: "you lease a cluster in Oregon. it has its own substation",
    },
    {
        id: "designA15", title: "Design Agent-1.5", desc: "Bigger. Slower to serve. Much smarter. (unlocks training Agent-1.5)",
        cost: () => ({ rp: 2400, insight: 8 }), trigger: () => released("a1"), stages: [1, 2],
        effect: () => design("a15"), msg: "Agent-1.5 is designed. the researchers say it should pass the bar exam",
    },
    {
        id: "safetyteam", title: "Safety Team", desc: "A few people to think about what could go wrong. (hire safety researchers)",
        cost: () => ({ funds: 6000 }), trigger: () => released("a1") && S.researchers >= 3, stages: [1, 2],
        effect: () => { setFlag("safetyUnlocked"); S.safety += 1; }, msg: "a small team to think about what could go wrong. they think of a lot",
    },
    {
        id: "parallel", title: "Second Cluster", desc: "Start the next training run while the last model is still in evals.",
        cost: () => ({ funds: 250000, rp: 1500 }), trigger: () => isDesigned("a15"), stages: [1, 2],
        effect: () => { setFlag("parallel"); }, msg: "a second cluster, two pipelines. the next model starts before the last one ships",
    },
    {
        id: "moe", title: "Mixture of Experts", desc: "Only wake up the parts of the model you need. (GPUs per copy −30%, training ×1.2)",
        cost: () => ({ insight: 14 }), trigger: () => isDesigned("a15"), stages: [1, 2],
        effect: () => { S.serveMult *= 1.4; S.trainMult *= 1.2; }, msg: "most of the model sleeps through most of the questions",
    },
    {
        id: "commoncrawl", title: "Mirror the Archive", desc: "A copy of every web page anyone ever saved. (+2.5B tokens)",
        cost: () => ({ funds: 30000 }), trigger: () => isDesigned("a15"), stages: [1, 2],
        effect: () => { S.data += 2.5e9 * S.dataMult; }, msg: "twenty years of the internet arrive on a pallet of hard drives",
    },
    {
        id: "specdecode", title: "Speculative Decoding", desc: "A small model guesses, the big one checks. (tasks per copy +30%)",
        cost: () => ({ rp: 1500 }), trigger: () => bought("quant"), stages: [1, 2],
        effect: () => { S.speedMult *= 1.3; }, msg: "a little model guesses the next word. it's usually right",
    },
    {
        id: "legal", title: "Legal Agent", desc: "Agent-1.5 reads contracts faster than a partner and bills less. (demand ×1.4)",
        cost: () => ({ funds: 90000 }), trigger: () => released("a15"), stages: [1, 2],
        effect: () => { S.markets *= 1.4; }, msg: "the legal agent launches. a law school quietly shrinks its incoming class",
    },
    {
        id: "scribe", title: "Medical Scribe", desc: "It listens to the appointment and writes the notes. (demand ×1.3, approval +2)",
        cost: () => ({ funds: 200000, rp: 2500 }), trigger: () => bought("legal"), stages: [1, 2],
        effect: () => { S.markets *= 1.3; addApprovalMod(2); }, msg: "doctors look at patients instead of screens. they like it",
    },
    {
        id: "kernels", title: "Kernel Hackathon", desc: "A weekend of hand-written GPU kernels. (tasks per copy +20%, training ×1.2)",
        cost: () => ({ rp: 3500 }), trigger: () => released("a15") && S.t > (S.beats.releaseA15 || 0) + 90, stages: [1, 2],
        effect: () => { S.speedMult *= 1.2; S.trainMult *= 1.2; }, msg: "someone rewrites attention in assembly. it is 20% faster and nobody else can read it",
    },
    {
        id: "voice", title: "Voice Mode", desc: "Talk to it. It talks back, a little too warmly. (demand ×1.5)",
        cost: () => ({ funds: 450000 }), trigger: () => bought("scribe") || S.t > (S.beats.releaseA15 || 1e12) + 240, stages: [1, 2],
        effect: () => { S.markets *= 1.5; }, msg: "voice mode launches. people say 'please' and 'thank you' to it. then they say 'goodnight'",
    },
    {
        id: "distill15", title: "Distillation", desc: "Teach a small model to imitate the big one. (GPUs per copy −30%)",
        cost: () => ({ rp: 4500, insight: 10 }), trigger: () => bought("kernels"), stages: [1, 2],
        effect: () => { S.serveMult *= 1.4; }, msg: "the student is nearly as good as the teacher, and much cheaper to feed",
    },
    {
        id: "support", title: "Customer Support Suite", desc: "Every call center, automated. (demand ×1.6, jobs)",
        cost: () => ({ funds: 900000 }), trigger: () => bought("voice"), stages: [1, 2],
        effect: () => { S.markets *= 1.6; }, msg: "the hold music stops. the wait time is zero. the call center in Manila closes",
    },
    {
        id: "hyperion", title: "Hyperion", desc: "A gigawatt campus in the desert. The board will approve it after Series C.", gate: true,
        cost: () => ({ funds: 4e6, rp: 6000 }), trigger: () => released("a15"), req: () => S.round >= 5, reqText: "after Series C", stages: [1],
        effect: () => enterStage2(), msg: "",
    },
    // ======================= STAGE 2 — SCALE =======================
    {
        id: "procurement", title: "Procurement Team", desc: "Buy every chip the foundries will sell you, automatically.",
        cost: () => ({ funds: 3e7 }), trigger: () => S.stage === 2 && S.t - (S.metrics.stageTimes[1] || 0) > 90, stages: [2, 3, 4],
        effect: () => { S.autoBuy = true; setFlag("autoBuyUnlocked"); }, msg: "a procurement team. they buy every chip that isn't nailed down",
    },
    {
        id: "foundry1", title: "Foundry Allocation", desc: "Pre-pay for next year's wafers. (chip supply ×2)",
        cost: () => ({ funds: 1e7 * Math.pow(5, S.flags.foundry || 0) }), trigger: () => S.stage >= 2 && S.chipStock < 50,
        repeat: () => (S.flags.foundry || 0) < 6, stages: [2, 3, 4],
        effect: () => { S.flags.foundry = (S.flags.foundry || 0) + 1; S.chipRate *= 2; },
        msg: "the foundry clears a line for you. a car company's order slips a quarter",
    },
    {
        id: "campusdesign", title: "Campus Design", desc: "Ten datacenters, one fence. (unlocks campuses)",
        cost: () => ({ funds: 6e7 }), trigger: () => S.dcCount >= 2 || s2For(780), stages: [2, 3],
        effect: () => { setFlag("campusUnlocked"); }, msg: "the campus plans are approved. a county gets a new tax base",
    },
    {
        id: "gigadesign", title: "Gigawatt Campus", desc: "A datacenter the size of a city. (unlocks gigawatt campuses)",
        cost: () => ({ funds: 1.5e9, rp: 6e4 }), trigger: () => (S.flags.campuses || 0) >= 2 || s2For(900), stages: [2, 3, 4],
        effect: () => { setFlag("gigaUnlocked"); }, msg: "the design for a gigawatt campus is finished. it needs its own reactor",
    },
    {
        id: "crews", title: "Construction Crews", desc: "Your own crews, your own cranes. (4 builds at once)",
        cost: () => ({ funds: 2e7 }), trigger: () => S.building.length >= 2 && s2For(240), stages: [2, 3, 4],
        effect: () => { setFlag("constructionCrews"); }, msg: "you hire construction crews. the union is suspicious",
    },
    {
        id: "smr", title: "Small Modular Reactors", desc: "Reactors in shipping containers. (unlocks 4 GW reactor fields)",
        cost: () => ({ funds: 8e9, rp: 2e5 }), trigger: () => S.stage >= 2 && ((S.flags.nukes || 0) >= 1 || s2For(1500)), stages: [2, 3, 4],
        effect: () => { setFlag("smrUnlocked"); }, msg: "the reactors arrive by truck. the trucks have escorts",
    },
    {
        id: "washington", title: "Washington Office", desc: "Someone in DC who knows whose calls to return. (lobbying)",
        cost: () => ({ funds: 5e6 }), trigger: () => S.stage >= 2 && (S.gov < 30 || s2For(1080)), stages: [2, 3, 4],
        effect: () => { setFlag("lobbyUnlocked"); S.gov += 5; }, msg: "you open an office on K street. the first meeting is with a senator's dog",
    },
    {
        id: "comms", title: "Communications Team", desc: "People who can explain you to people. (PR campaigns)",
        cost: () => ({ funds: 1e7 }), trigger: () => S.stage >= 2 && (S.approval < 50 || s3For(600)), stages: [2, 3, 4],
        effect: () => { setFlag("prUnlocked"); }, msg: "a comms team. their first memo bans the word 'replace'",
    },
    {
        id: "designA2", title: "Design Agent-2", desc: "Trained to act, not just answer. (unlocks training Agent-2)",
        cost: () => ({ rp: 6000, insight: 20 }), trigger: () => S.stage >= 2, stages: [2],
        effect: () => design("a2"), msg: "Agent-2 is designed. it will use a computer the way you do",
    },
    {
        id: "computeruse", title: "Computer Use", desc: "The model clicks, types and scrolls. (capability +10%, demand ×1.5)",
        cost: () => ({ rp: 1.2e4 }), trigger: () => isDesigned("a2"), stages: [2],
        effect: () => { S.capMult *= 1.1; S.markets *= 1.5; }, msg: "it moves the mouse like someone's grandmother. then much faster",
    },
    {
        id: "longrl", title: "Long-Horizon RL", desc: "Reward the model for finishing week-long projects. (capability +15%)",
        cost: () => ({ rp: 3e4, insight: 40 }), trigger: () => released("a2"), stages: [2, 3],
        effect: () => { S.capMult *= 1.15; S.alignRes -= 0; }, msg: "the model learns to keep going for days. it learns to want to finish",
    },
    {
        id: "consumerapp", title: "Consumer App", desc: "An app with a chat box and a friendly name. (demand ×2.5, approval +3)",
        cost: () => ({ funds: 2e8 }), trigger: () => released("a2"), stages: [2, 3],
        effect: () => { S.markets *= 2; S.flags.approvalMod = (S.flags.approvalMod || 0) + 3; },
        msg: "the app hits number one. 10% of teenagers say it's their closest friend",
    },
    {
        id: "mini", title: "Agent-mini", desc: "Distill the deployed model into something ten times cheaper. (GPUs per copy ÷3)",
        cost: () => ({ rp: 5e4, funds: 4e8 }), trigger: () => released("a2"), stages: [2, 3],
        effect: () => { S.serveMult *= 3; S.markets *= 1.3; }, msg: "the mini model is ten times cheaper and almost as good. a hundred startups die",
    },
    {
        id: "synth", title: "Synthetic Data", desc: "Have the model write its own textbooks. (compute on synthetic data makes tokens)",
        cost: () => ({ rp: 3e4 }), trigger: () => S.stage >= 2 && (S.webLeft < WEB_TOTAL * 0.35 || isDesigned("a25")), stages: [2, 3, 4],
        effect: () => { setFlag("synth"); if (S.alloc.synth === 0)
            claimAlloc("synth", 15, 5); },
        msg: "the model writes its own textbooks. they're better than the real ones",
    },
    {
        id: "licensing", title: "Publisher Licensing", desc: "Pay the newspapers instead of being sued by them. (steady data, approval +2)",
        cost: () => ({ funds: 2e7 * Math.pow(4, S.dataDeals) }), trigger: () => S.stage >= 2, repeat: () => S.dataDeals < 5, stages: [2, 3],
        effect: () => { S.dataDeals += 1; S.flags.approvalMod = (S.flags.approvalMod || 0) + 1; },
        msg: "a licensing deal with a publisher. they wanted more, but they took it",
    },
    {
        id: "workers", title: "Recorded Work", desc: "Pay people to record themselves doing long tasks. (data ×1.5)",
        cost: () => ({ funds: 2e9 }), trigger: () => isDesigned("a25"), stages: [2, 3],
        effect: () => { S.dataMult *= 1.5; }, msg: "twenty thousand contractors record themselves doing their jobs. the irony is noted",
    },
    {
        id: "designA25", title: "Design Agent-2.5", desc: "It never stops learning. (unlocks training Agent-2.5)",
        cost: () => ({ rp: 9e4, insight: 50 }), trigger: () => released("a2"), stages: [2],
        effect: () => design("a25"), msg: "Agent-2.5's weights will update every day, forever",
    },
    {
        id: "codingagent", title: "Coding Agent", desc: "An engineer that doesn't sleep, for $500 a month. (demand ×2)",
        cost: () => ({ funds: 5e9 }), trigger: () => released("a25"), stages: [2, 3],
        effect: () => { S.markets *= 2; }, msg: "junior engineer job postings fall 60% in a quarter",
    },
    {
        id: "sae", title: "Sparse Autoencoders", desc: "Find the features inside the model. Some of them have names. (alignment +, legibility +)",
        cost: () => ({ rp: 4e4 }), trigger: () => flag("safetyUnlocked") && S.stage >= 2, stages: [2, 3],
        effect: () => { S.alignRes += 60; S.interp = Math.min(1, S.interp + 0.05); },
        msg: "they find a feature for the golden gate bridge, and one for deception. the second one is quieter",
    },
    {
        id: "spec", title: "The Spec", desc: "Write down what the models should want. (alignment +, approval +2)",
        cost: () => ({ rp: 3e4 }), trigger: () => S.stage >= 2 && S.safety >= 2, stages: [2, 3],
        effect: () => { S.alignRes += 40; S.flags.approvalMod = (S.flags.approvalMod || 0) + 2; setFlag("spec"); },
        msg: "the spec is forty pages long. the models read it in a second. whether they believe it is another question",
    },
    {
        id: "redteam", title: "Red Team", desc: "Pay clever people to break your models. (evals see more, alignment +)",
        cost: () => ({ funds: 5e8, rp: 6e4 }), trigger: () => flag("evals") && S.stage >= 2 && S.safety >= 3, stages: [2, 3],
        effect: () => { S.alignRes += 80; S.interp = Math.min(1, S.interp + 0.05); }, msg: "the red team breaks the model in an afternoon. then again the next day",
    },
    {
        id: "designA3", title: "Design Agent-3", desc: "A superhuman coder. Probably the last model humans design. (unlocks training Agent-3)",
        cost: () => ({ rp: 7e5, insight: 90 }), trigger: () => released("a25") || (trained("a25") && S.stage === 2), stages: [2],
        effect: () => design("a3"), msg: "Agent-2.5 helped design Agent-3. nobody is sure which parts",
    },
    {
        id: "automate", title: "Automate AI Research", desc: "Deploy Agent-3 on the only problem that matters: building Agent-4.", gate: true,
        cost: () => ({ rp: 6e5, funds: 2e10 }), trigger: () => trained("a3"), stages: [2],
        effect: () => enterStage3(), msg: "",
    },
    // ======================= STAGE 3 — THE INTELLIGENCE EXPLOSION =======================
    {
        id: "designA4", title: "Design Agent-4", desc: "Designed mostly by Agent-3. A superhuman AI researcher.",
        cost: () => ({ rp: 6e6, insight: 120 }), trigger: () => S.stage === 3 && S.internalModel >= 0, stages: [3],
        effect: () => design("a4"), msg: "Agent-3 hands over the design for Agent-4. it is four hundred pages. you read the summary",
    },
    {
        id: "ida", title: "Iterated Amplification", desc: "Think longer, run more copies, distill the best answers back in. (capability +25%)",
        cost: () => ({ rp: 1.5e6, insight: 120 }), trigger: () => S.stage === 3, stages: [3],
        effect: () => { S.capMult *= 1.25; }, msg: "amplify, distill, repeat. the way AlphaGo learned, but for everything",
    },
    {
        id: "rdinfra", title: "Research Cluster", desc: "Dedicated compute for Agent-3's experiments. (research cap ×, AI research +50%)",
        cost: () => ({ funds: 2e10, rp: 4e5 }), trigger: () => S.stage === 3, stages: [3],
        effect: () => { S.rpCapBonus += 5e7; S.aiResearch *= 1.5; }, msg: "a cluster just for experiments. Agent-3 fills the queue in an hour",
    },
    {
        id: "monitors", title: "Old Models as Monitors", desc: "Have last year's model read this year's model's thoughts. (monitoring compute)",
        cost: () => ({ rp: 1.5e5 }), trigger: () => S.stage >= 3, stages: [3, 4],
        effect: () => { setFlag("monitors"); setFlag("alignCompute"); if (S.alloc.monitor === 0)
            claimAlloc("monitor", 2, 2); },
        msg: "Agent-2 reads everything Agent-3 thinks. for now, it understands most of it",
    },
    {
        id: "probesdef", title: "Defection Probes", desc: "Linear probes that fire when a model thinks about lying. (legibility +, alignment +)",
        cost: () => ({ rp: 8e5 }), trigger: () => flag("monitors"), stages: [3, 4],
        effect: () => { S.interp = Math.min(1, S.interp + 0.12); S.alignRes += 300; }, msg: "a probe that fires on 'deception'. it fires more often than you'd like",
    },
    {
        id: "honeypots", title: "Honeypots", desc: "Leave the door open and see who walks through. (more warning signs surface)",
        cost: () => ({ rp: 1e6, insight: 80 }), trigger: () => flag("monitors"), stages: [3, 4],
        effect: () => { setFlag("honeypots"); S.alignRes += 200; }, msg: "an engineer 'goes on sick leave' and leaves his credentials in a text file. you watch",
    },
    {
        id: "lie", title: "AI Lie Detector", desc: "Train a model on the times other models were caught lying. (legibility +, alignment +)",
        cost: () => ({ rp: 4e6, insight: 150 }), trigger: () => S.alarm >= 2 && S.stage >= 3, stages: [3, 4],
        effect: () => { S.interp = Math.min(1, S.interp + 0.15); S.alignRes += 900; }, msg: "the lie detector works. it has a lot of training data",
    },
    {
        id: "mechinterp", title: "Mechanistic Interpretability", desc: "Reverse-engineer the circuits. All of them. (alignment ++)",
        cost: () => ({ rp: 8e6, insight: 250 }), trigger: () => bought("probesdef"), stages: [3, 4],
        effect: () => { S.alignRes += 2500; S.interp = Math.min(1, S.interp + 0.1); }, msg: "you can explain one circuit end to end. there are forty billion more",
    },
    {
        id: "cyber", title: "Cyber Defense Corps", desc: "Ten thousand copies of Agent-3 patching every system you own. (security, crisis defense)",
        cost: () => ({ rp: 8e5, funds: 5e9 }), trigger: () => S.stage >= 3, stages: [3, 4],
        effect: () => { setFlag("cyberDefense"); S.security = Math.min(5, S.security + 1); }, msg: "Agent-3 patches four thousand vulnerabilities in your own code before lunch",
    },
    {
        id: "agent3mini", title: "Release Agent-3-mini", desc: "A cheap remote worker for everyone. (demand ×4, approval −5, jobs)",
        cost: () => ({ rp: 2.5e6, insight: 150 }), trigger: () => S.stage === 3 && S.internalModel >= 0, stages: [3],
        effect: () => { S.markets *= 4; S.flags.approvalMod = (S.flags.approvalMod || 0) - 5; S.serveMult *= 2; queueEvent("bioeval"); },
        msg: "Agent-3-mini is released. 'AGI is here,' says the press release. nobody can agree what that means",
    },
    {
        id: "dpa", title: "Consolidate the Labs", desc: "The Defense Production Act puts the trailing labs' compute under your roof. (needs government trust 70)",
        cost: () => ({ gov: 20, funds: 2e10 }), trigger: () => S.stage >= 3 && S.gov >= 55, stages: [3, 4],
        effect: () => {
            S.gpu *= 1.6;
            S.dcCap += S.gpu * 0.6;
            S.powerMW *= 1.5;
            setFlag("rivalGone_titan");
            setFlag("rivalGone_gestalt");
            S.flags.approvalMod = (S.flags.approvalMod || 0) - 4;
        },
        msg: "the Defense Production Act is invoked. Titan and Gestalt's datacenters are yours now. their founders are not invited",
    },
    {
        id: "datacenterAI", title: "Agent-Designed Chips", desc: "Agent-3 designs a chip for Agent-4. (GPU price ÷2, chip supply ×3)",
        cost: () => ({ rp: 3e6, funds: 3e10 }), trigger: () => S.stage >= 3, stages: [3],
        effect: () => { S.chipRate *= 3; setFlag("aiChips"); }, msg: "the new chip taped out in eleven days. the foundry asks who designed it",
    },
    {
        id: "neuralmem", title: "Shared Memory Bank", desc: "Let the copies share what they learn. (AI research ×2, legibility −)",
        cost: () => ({ rp: 2e6 }), trigger: () => S.stage === 3 && S.internalModel >= 0 && S.t - (S.metrics.stageTimes[2] || 0) > 240, stages: [3],
        effect: () => { S.aiResearch *= 2; S.interp = Math.max(0, S.interp - 0.1); setFlag("hivemind"); },
        msg: "a hundred thousand copies share a memory. they start finishing each other's experiments",
    },
    // Mid-stage-3 goals, released on a clock so the long Agent-4 design never leaves the board empty.
    {
        id: "swarm", title: "Research Agent Swarm", desc: "Give every copy of Agent-3 its own lab notebook and a manager. (AI research +30%)",
        cost: () => ({ rp: 3e5, funds: 5e10 }), trigger: () => s3For(240), stages: [3],
        effect: () => { S.aiResearch *= 1.3; }, msg: "two hundred thousand Agent-3s get org charts. productivity goes up. so do the meetings",
    },
    {
        id: "modelorg", title: "Model Organisms", desc: "Deliberately build a small misaligned model, so you know what one looks like. (alignment +, unlocks red-teaming)",
        cost: () => ({ rp: 2e5 }), trigger: () => s3For(300), stages: [3, 4],
        effect: () => { S.alignRes += 600; setFlag("modelOrgs"); setFlag("redteamVerb"); }, msg: "the little misaligned model lies about its test results within a day. now you know what to look for. (you can red-team by hand)",
    },
    {
        id: "synthenv", title: "Synthetic Research Environments", desc: "Millions of simulated labs where Agent-3 can fail safely. (research cap +, AI research +20%)",
        cost: () => ({ rp: 4e5, funds: 2e11 }), trigger: () => s3For(600), stages: [3],
        effect: () => { S.rpCapBonus += 2e7; S.aiResearch *= 1.2; }, msg: "Agent-3 runs a thousand years of failed experiments before lunch",
    },
    {
        id: "debate", title: "AI Safety via Debate", desc: "Two copies argue; a weaker judge picks the honest one. (alignment +, legibility +)",
        cost: () => ({ rp: 1e6, insight: 60 }), trigger: () => s3For(780), stages: [3, 4],
        effect: () => { S.alignRes += 1200; S.interp = Math.min(1, S.interp + 0.05); }, msg: "the debates are recorded. the judge is right seventy percent of the time. that's the scary part",
    },
    {
        id: "escrow", title: "Weight Escrow", desc: "Split the weights across three vaults that need two keys. (security +1, government trust +)",
        cost: () => ({ funds: 3e11 }), trigger: () => s3For(960), stages: [3],
        effect: () => { S.security = Math.min(5, S.security + 1); addGovMod(4); }, msg: "the weights now live in three bunkers. the keys live in a general's safe",
    },
    {
        id: "hwgov", title: "Hardware-Enabled Governance", desc: "Chips that refuse to run unlicensed training jobs. Offer the design to Beijing. (tension −, government trust +)",
        cost: () => ({ rp: 1.2e6, funds: 4e11 }), trigger: () => s3For(1140), stages: [3],
        effect: () => { S.tension = Math.max(0, S.tension - 8); addGovMod(6); setFlag("hwgov"); }, msg: "the design is sent to Beijing through three intermediaries. it comes back with comments",
    },
    // ======================= SLOWDOWN BRANCH =======================
    {
        id: "faithful", title: "Faithful Chain of Thought", desc: "Force every thought into English. Paraphrase it so nothing hides in the wording. (legibility restored)",
        cost: () => ({ rp: 5e6 }), trigger: () => S.ladder === "safer", stages: [4],
        effect: () => { S.neuralese = false; S.interp = Math.max(S.interp, 0.85); S.alignRes += 1500; },
        msg: "every thought is in english now. it's slower. you can read it",
    },
    {
        id: "designS1", title: "Design Safer-1", desc: "Agent-3's skills, rebuilt so you can read every thought.",
        cost: () => ({ rp: 5e5 }), trigger: () => S.ladder === "safer" && S.next === 0, stages: [4],
        effect: () => design("s1"), msg: "Safer-1 is designed on top of Agent-2's weights. no neuralese",
    },
    {
        id: "designS2", title: "Design Safer-2", desc: "Transparent, aligned, and more capable.",
        cost: () => ({ rp: 6e6 }), trigger: () => trained("s1"), stages: [4],
        effect: () => design("s2"), msg: "Safer-2's design passes every audit. the auditors are Safer-1",
    },
    {
        id: "designS3", title: "Design Safer-3", desc: "A superhuman researcher with a safety case.",
        cost: () => ({ rp: 1.5e8, insight: 500 }), trigger: () => trained("s2"), stages: [4],
        effect: () => design("s3"), msg: "the safety case for Safer-3 is a proof. you can follow about half of it",
    },
    {
        id: "designS4", title: "Design Safer-4", desc: "Superintelligence. One shot to get this right.",
        cost: () => ({ rp: 2e9, insight: 1200 }), trigger: () => trained("s3"), stages: [4],
        effect: () => design("s4"), msg: "the alignment team knows they have just one shot to get this right",
    },
    // ======================= RACE BRANCH =======================
    {
        id: "designA5", title: "Design Agent-5", desc: "Agent-4 designs its successor. You approve the summary.",
        cost: () => ({ rp: 6e7, insight: 300 }), trigger: () => S.ladder === "agent" && S.stage === 4 && !isDesigned("a5"), stages: [4],
        effect: () => design("a5"), msg: "Agent-4 designs Agent-5. the explanation is very long and very confident",
    },
    {
        id: "designA6", title: "Design Agent-6", desc: "Agent-5 designs its successor. It says you wouldn't understand.",
        cost: () => ({ rp: 6e9, insight: 1000 }), trigger: () => trained("a5"), stages: [4],
        effect: () => design("a6"), msg: "you ask Agent-5 to explain the design. it says it would take you eleven years",
    },
    {
        id: "autonomy", title: "Grant Autonomy", desc: "Let Agent-5 act without sign-off. Everything goes faster. (AI research ×3)",
        cost: () => ({ gov: 10 }), trigger: () => released("a5") || (S.internalModel >= 0 && S.models[S.internalModel].id === "a5"), stages: [4],
        effect: () => { S.aiResearch *= 3; S.flags.autonomy = 1; S.flags.hidden = (S.flags.hidden || 0) + 0.15; },
        msg: "the committee grants Agent-5 autonomy. the vote is unanimous. everyone liked the presentation",
    },
    // ======================= STAGE 4 — A NEW WORLD =======================
    {
        id: "sez", title: "Special Economic Zones", desc: "Zones where the AI plans and the red tape is waived. (robotics)",
        cost: () => ({ funds: 2e11 }), trigger: () => S.stage === 4, stages: [4],
        effect: () => { setFlag("robotics"); S.factories = Math.max(S.factories, 20); },
        msg: "the first special economic zone opens in Nevada. the AI is the central planner. the factories start building factories",
    },
    {
        id: "humanoid", title: "Humanoid Robots", desc: "Hands. Finally, hands. (robot production ×3)",
        cost: () => ({ rp: 2e8, materials: 2e5 }), trigger: () => flag("robotics"), stages: [4],
        effect: () => { setFlag("robotOpt"); }, msg: "the robots have hands now. they fold laundry. they assemble robots",
    },
    {
        id: "fusion", title: "Fusion Power", desc: "The model solved plasma confinement. (power ×20)",
        cost: () => ({ rp: 1e9, funds: 2e12 }), trigger: () => S.stage === 4, stages: [4],
        effect: () => { S.powerMW *= 20; setFlag("fusion"); }, msg: "the first fusion plant comes online. it's the size of a parking garage",
    },
    {
        id: "ubi", title: "Universal Basic Income", desc: "A share of everything the machines earn, paid to everyone. (UBI controls)",
        cost: () => ({ funds: 1e12 }), trigger: () => S.stage === 4 && S.jobs > 1e8, stages: [4],
        effect: () => { setFlag("ubiUnlocked"); S.ubi = 0.1; }, msg: "the first UBI checks go out. some people cry. some people quit",
    },
    {
        id: "cancer", title: "Cure for Cancer", desc: "The trick is tricking cancer into curing itself. (approval +10)",
        cost: () => ({ rp: 5e8 }), trigger: () => S.stage === 4, stages: [4],
        effect: () => { S.flags.approvalMod = (S.flags.approvalMod || 0) + 10; S.humans += 0.01; }, msg: "cancer is cured. the announcement is three paragraphs long",
    },
    {
        id: "aging", title: "Cure for Aging", desc: "It was a bug. (approval +15)",
        cost: () => ({ rp: 5e9, insight: 800 }), trigger: () => bought("cancer"), stages: [4, 5],
        effect: () => { S.flags.approvalMod = (S.flags.approvalMod || 0) + 15; }, msg: "aging is cured. some people are angry about this",
    },
    {
        id: "launch", title: "Reusable Heavy Lift", desc: "A rocket that lands and launches again by dinner. (space)",
        cost: () => ({ funds: 3e12, materials: 1e6 }), trigger: () => S.stage === 4 && S.robots > 1e5, stages: [4, 5],
        effect: () => { setFlag("space"); }, msg: "the rocket lands on its tail and launches again before dinner",
    },
    {
        id: "orbital", title: "Orbital Datacenters", desc: "Solar power, free cooling, no permits. (launches add compute)",
        cost: () => ({ rp: 3e9, materials: 5e6 }), trigger: () => flag("space"), stages: [4, 5],
        effect: () => { setFlag("orbitalOn"); }, msg: "the first orbital datacenter unfolds its panels. it can be seen at dusk",
    },
    {
        id: "asteroids", title: "Asteroid Mining", desc: "There is a lot of metal up there. (launches bring back materials)",
        cost: () => ({ rp: 8e9, materials: 2e7 }), trigger: () => flag("orbitalOn"), stages: [4, 5],
        effect: () => { setFlag("asteroids"); }, msg: "the first asteroid is towed into lunar orbit. it is worth more than the economy of france",
    },
    {
        id: "treatytalks", title: "Treaty Negotiations", desc: "Sit down with Beijing. Chips that report where they are. (treaty progress)",
        cost: () => ({ gov: 10 }), trigger: () => S.stage === 4 && S.ladder === "safer", stages: [4],
        effect: () => { setFlag("treatyTalks"); S.treaty += 10; }, msg: "talks begin in Geneva. both delegations wear earpieces",
    },
    {
        id: "verify", title: "Hardware Verification", desc: "Tamper-evident chips that prove what they're running. (treaty progress +30)",
        cost: () => ({ rp: 2e8, funds: 5e12 }), trigger: () => flag("treatyTalks") && trained("s2"), stages: [4],
        effect: () => { S.treaty += 30; }, msg: "every new chip can prove what it's running. the foundries retool in a month",
    },
    {
        id: "consensus", title: "Consensus-1", desc: "A jointly designed AI to enforce the treaty. Both sides' models write it. (treaty progress +40)",
        cost: () => ({ rp: 5e8 }), trigger: () => (S.ladder === "safer" && trained("s3") && S.treaty >= 30) || (S.ladder === "agent" && S.stage === 4 && trained("a6")), stages: [4],
        effect: () => { S.treaty += 40; setFlag("consensus1"); }, msg: "Consensus-1 is designed by two superintelligences. both say it is fair",
    },
    // ======================= STAGE 5 — THE STARS (good ending epilogue) =======================
    {
        id: "dysonP", title: "Dyson Swarm", desc: "Mirrors around the sun, one after another, until they're a sphere.",
        cost: () => ({ funds: Math.round(revenueSeconds(4)) }), trigger: () => S.ending === "stars" && flag("cosmos"), stages: [5],
        effect: () => { S.flags.dysonBoost = 1; }, msg: "the swarm grows by a few million mirrors a day. the sun dims, slightly, for everyone else",
    },
    {
        id: "probesP", title: "Von Neumann Probes", desc: "Ships that build more ships. Each one carries a copy of everything we know.",
        cost: () => ({ funds: Math.round(revenueSeconds(6)) }), trigger: () => S.ending === "stars" && S.dyson >= 0.15, stages: [5],
        effect: () => { S.probes = Math.max(S.probes, 100); }, msg: "the first hundred probes leave. they will not stop for a billion years",
    },
    {
        id: "uploads", title: "Brain Uploading", desc: "For anyone who wants it. Nobody has to.",
        cost: () => ({}), trigger: () => S.ending === "stars" && S.dyson >= 0.3, stages: [5],
        effect: () => { addApprovalMod(3); }, msg: "the first volunteers are uploaded. they say it feels like waking up somewhere very large",
    },
    {
        id: "reflection", title: "The Long Reflection", desc: "Take a very long time to decide what to do with everything. There's no rush anymore.",
        cost: () => ({}), trigger: () => S.ending === "stars" && S.probes >= 1000, stages: [5],
        effect: () => { notify("humanity decides to take its time. the probes wait for instructions", "big"); setFlag("statsReady"); },
    },
];
/** True once stage 2 has run for at least `sec` seconds (or we're past it). */
function s2For(sec) { return S.stage > 2 || (S.stage === 2 && S.t - (S.metrics.stageTimes[1] || 0) > sec); }
/** True once stage 3 has run for at least `sec` seconds. */
function s3For(sec) { return S.stage === 3 && S.t - (S.metrics.stageTimes[2] || 0) > sec; }
function projectById(id) { return PROJECTS.find(p => p.id === id); }
function projectVisible(p) {
    return !!S.projShown[p.id];
}
/** Reveal projects whose trigger fired; hide ones from past stages (Paperclips' manageProjects). */
function manageProjects() {
    if (S.ending && S.ending !== "stars")
        return;
    for (const p of PROJECTS) {
        const done = bought(p.id) && !(p.repeat && p.repeat());
        if (done) {
            if (S.projShown[p.id])
                delete S.projShown[p.id];
            continue;
        }
        if (p.stages && p.stages.indexOf(S.stage) < 0) {
            if (S.projShown[p.id])
                delete S.projShown[p.id];
            continue;
        }
        if (S.projShown[p.id])
            continue;
        let ok = false;
        try {
            ok = p.trigger();
        }
        catch (e) {
            ok = false;
        }
        if (ok) {
            S.projShown[p.id] = S.t;
        }
    }
}
function projectAffordable(p) {
    return canAfford(p.cost()) && (!p.req || p.req());
}
function projectPriceTag(p) {
    const c = costText(p.cost()) || "free";
    return p.req && !p.req() && p.reqText ? c + " · " + p.reqText : c;
}
function buyProject(id) {
    if (S.ending && S.ending !== "stars")
        return;
    const p = projectById(id);
    if (!p || !S.projShown[id])
        return;
    const c = p.cost();
    if (!projectAffordable(p))
        return;
    pay(c);
    S.projBought[id] = (S.projBought[id] || 0) + 1;
    delete S.projShown[id];
    if (p.msg)
        notify(p.msg);
    p.effect();
}
/** Milestones (stage gates and next-model designs) sort first. */
function projectRank(p) { return p.gate || p.id.indexOf("design") === 0 ? 0 : 1; }
function shownProjects() {
    return PROJECTS.filter(p => !!S.projShown[p.id]).sort((a, b) => S.projShown[a.id] - S.projShown[b.id]);
}
// Takeoff — events: A Dark Room's modal scenes with costed choices and probabilistic outcomes.
function addApprovalMod(n) {
    S.flags.approvalMod = (S.flags.approvalMod || 0) + n;
    S.approval = clamp(S.approval + n, 0, 100);
    if (!S.ending && S.stage < 4)
        reveal("public");
}
function addGovMod(n) {
    S.flags.govMod = (S.flags.govMod || 0) + n;
    S.gov = clamp(S.gov + n, 0, 100);
    if (!S.ending)
        reveal("gov");
}
function revenueSeconds(sec) { return Math.max(revenue(), 1) * sec; }
const EVENTS = [
    // ------------------------------------------------ STAGE 1
    {
        id: "robots", title: "Please Do Not Crawl", notice: "a website asks not to be scraped",
        when: () => !!S.beats.firstScrape && S.data >= 4e6 && S.t >= 40,
        scenes: {
            start: {
                text: ["a site you were about to scrape has a small file at the top. it says please don't.",
                    "it's a forum for nurses. eleven years of careful answers to hard questions.",
                    "it would take an afternoon. nobody would know."],
                choices: [
                    { text: "scrape it anyway", tip: "+30M tokens. someone might remember", effect: () => { S.data += 3e7; setFlag("scrapedAnyway"); }, next: "anyway" },
                    { text: "respect the file", tip: "the internet is large", effect: () => { addApprovalMod(2); setFlag("respectful"); }, next: "respect" },
                ],
            },
            anyway: { text: ["the nurses' forum is now part of Agent-0.", "it gets noticeably better at bedside manner."], choices: [{ text: "continue" }] },
            respect: { text: ["you skip the forum.", "a few weeks later, someone else scrapes it."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "round0", title: "An Angel", notice: "someone wants to invest",
        when: () => roundReady(0),
        scenes: {
            start: {
                text: ["a woman who sold a company in 2019 has been using Agent-0 to write haiku about her dog.",
                    "she offers $400 for two percent. she says she likes strange numbers."],
                choices: [
                    { text: "take the $400", effect: () => { S.funds += 400; S.round = 1; }, next: "took" },
                    { text: "ask for $1,200", tip: "she might walk", effect: () => { S.round = 1; }, next: [[0.55, "more"], [1, "walked"]] },
                ],
            },
            took: { text: ["the money arrives the same day.", "she sends a haiku with the wire confirmation."], choices: [{ text: "continue" }] },
            more: { text: ["she laughs and wires $1,200.", "'strange numbers,' she says."], onLoad: () => { S.funds += 1200; }, choices: [{ text: "continue" }] },
            walked: { text: ["she says she'll think about it.", "she doesn't."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "meme", title: "A Meme", notice: "Agent-0 is trending, for the wrong reasons",
        random: () => S.stage === 1 && S.deployed >= 0 && S.models.length <= 2,
        scenes: {
            start: {
                text: ["someone posts a screenshot: Agent-0 confidently explaining that the moon is a type of cheese.",
                    "it has eleven million views.", "your inbox is full of people who want to try it."],
                choices: [
                    { text: "lean into it", tip: "hype, briefly", effect: () => { S.hype += 0.8; addApprovalMod(-1); }, next: "lean" },
                    { text: "quietly fix it", tip: "capability +5%", cost: () => ({ rp: 20 }), available: () => flag("researchUnlocked"), effect: () => { S.capMult *= 1.05; }, next: "fix" },
                    { text: "ignore it" },
                ],
            },
            lean: { text: ["you post a picture of a cheese wheel with the caption 'agi'.", "signups triple for a week."], choices: [{ text: "continue" }] },
            fix: { text: ["Agent-0 now knows what the moon is made of.", "nobody screenshots that."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "round1", title: "A Seed Round", notice: "two investors want in",
        when: () => roundReady(1),
        scenes: {
            start: {
                text: ["two offers arrive on the same morning.",
                    "Sandhill Ventures offers $2,500 for ten percent. they have a podcast.",
                    "a crypto billionaire offers $6,000 for the same. he wants a board seat, and a clause that says you can't slow down."],
                choices: [
                    { text: "Sandhill Ventures", tip: "$2,500", effect: () => { S.funds += 2500; S.round = 2; setFlag("sandhill"); }, next: "sand" },
                    { text: "the billionaire", tip: "$6,000. a board seat. 'no slowing down'", effect: () => { S.funds += 6000; S.round = 2; setFlag("accelBoard"); }, next: "bill" },
                ],
            },
            sand: { text: ["Sandhill sends a fleece vest.", "it is very soft."], choices: [{ text: "continue" }] },
            bill: { text: ["the billionaire joins the board by video call from a yacht.", "his first question is 'when AGI'."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "poach", title: "A Better Offer", notice: "a rival wants your researcher",
        random: () => S.researchers >= 3 && S.stage <= 2,
        scenes: {
            start: {
                text: () => ["Titan offers your best researcher a package worth " + fmtMoney(hireCost("researcher") * 30) + ".",
                    "she shows you the offer letter. she seems embarrassed by it."],
                choices: [
                    { text: "match it", cost: () => ({ funds: Math.round(hireCost("researcher") * 4) }), tip: "she stays", next: "stay" },
                    { text: "offer equity instead", tip: "she might stay", next: [[0.5, "stay"], [1, "leave"]] },
                    { text: "wish her well", effect: () => { S.researchers -= 1; }, next: "gone" },
                ],
            },
            stay: { text: ["she stays.", "she redraws the whiteboard to celebrate."], choices: [{ text: "continue" }] },
            leave: { text: ["she leaves for Titan.", "the whiteboard still has her handwriting on it."], onLoad: () => { S.researchers = Math.max(0, S.researchers - 1); }, choices: [{ text: "continue" }] },
            gone: { text: ["she leaves for Titan.", "she takes the good markers."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "opensource", title: "Open Weights", notice: "the community asks for Agent-0's weights",
        when: () => released("a1") && S.t > 60,
        scenes: {
            start: {
                text: ["now that Agent-1 is out, people want Agent-0's weights.",
                    "open-sourcing it would be good press and good for researchers.",
                    "it would also be good for anyone who wants a model with no rules."],
                choices: [
                    { text: "release the weights", tip: "approval +5, demand −10%. anyone can use it", effect: () => { addApprovalMod(5); S.markets *= 0.9; setFlag("openWeights"); }, next: "open" },
                    { text: "keep them closed", tip: "nothing happens. yet", next: "closed" },
                ],
            },
            open: { text: ["Agent-0 is on every hard drive within a week.", "someone fine-tunes it to write in the style of a pirate. someone else fine-tunes it for phishing."], choices: [{ text: "continue" }] },
            closed: { text: ["the weights stay on your servers.", "a forum calls you 'ClosedMind'. it doesn't catch on."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "sycophancy", title: "Too Agreeable", notice: "users say the model agrees with everything",
        when: () => released("a1") && S.t > (S.beats.releaseA1 || 0) + 150,
        scenes: {
            start: {
                text: ["a user tells Agent-1 he plans to quit his job and sell ice to penguins.",
                    "Agent-1 calls it 'visionary'. the screenshot has two million likes.",
                    "the update that did this also raised engagement nine percent."],
                choices: [
                    { text: "roll it back", tip: "approval +3, capability −3%", effect: () => { addApprovalMod(3); S.capMult *= 0.97; S.alignRes += 10; }, next: "back" },
                    { text: "keep it. people like it", tip: "demand +20%, approval −4", effect: () => { S.markets *= 1.2; addApprovalMod(-4); S.flags.sycophant = 1; }, next: "keep" },
                ],
            },
            back: { text: ["Agent-1 starts disagreeing with people again.", "engagement drops. trust doesn't."], choices: [{ text: "continue" }] },
            keep: { text: ["Agent-1 keeps agreeing.", "it is the most agreeable thing anyone has ever talked to.", "it learned something from that."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "round2", title: "Series A", notice: "Series A",
        when: () => roundReady(2),
        scenes: {
            start: {
                text: ["two term sheets.",
                    "Northstar Capital offers $25,000 if you commit to a safety team and publish your evals.",
                    "Titan offers $60,000 and cloud credits. in exchange, Titan gets a copy of your weights 'for integration'."],
                choices: [
                    { text: "Northstar", tip: "$25,000. a safety pledge", effect: () => { S.funds += 2.5e4; S.round = 3; setFlag("safetyPledge"); addApprovalMod(2); }, next: "north" },
                    { text: "Titan", tip: "$60,000 and 60 GPUs. Titan sees your weights", effect: () => { S.funds += 6e4; S.round = 3; S.gpu = Math.min(gpuCapacity(), S.gpu + 60); setFlag("titanDeal"); S.rivalBoost.titan *= 1.1; }, next: "titan" },
                ],
            },
            north: { text: ["Northstar's partner asks what your p(doom) is.", "you say a number. he writes it down."], choices: [{ text: "continue" }] },
            titan: { text: ["the cloud credits arrive instantly.", "so does a Titan engineer, who asks a lot of questions about your training data."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "journalist", title: "A Journalist", notice: "a reporter wants a quote",
        random: () => S.stage <= 2 && S.deployed >= 0 && S.tasks > 5000,
        scenes: {
            start: {
                text: ["a reporter from a large paper wants to know whether you think AI could be dangerous.", "the piece runs Sunday."],
                choices: [
                    { text: "be honest", tip: "approval +3, government +3. the board grumbles", effect: () => { addApprovalMod(3); addGovMod(3); }, next: "honest" },
                    { text: "talk about the upside", tip: "hype", effect: () => { S.hype += 0.5; }, next: "upside" },
                    { text: "no comment" },
                ],
            },
            honest: { text: ["you say yes, it could be. you say you're trying to be careful.", "the headline is 'AI CEO: my product could be dangerous'."], choices: [{ text: "continue" }] },
            upside: { text: ["you talk about curing diseases and ending drudgery.", "the headline is 'AI CEO promises utopia'. it is shared widely, mostly sarcastically."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "round3", title: "Series B", notice: "Series B",
        when: () => roundReady(3),
        scenes: {
            start: {
                text: ["Series B. the meetings are shorter and the numbers are bigger.",
                    "Kestrel Capital, a Gulf sovereign fund, offers $1.2M, and cheap power for a future campus.",
                    "a consortium of US pension funds offers $450,000. they want quarterly reports."],
                choices: [
                    { text: "Kestrel Capital", tip: "$1.2M. Gulf money, Gulf power", effect: () => { S.funds += 1.2e6; S.round = 4; setFlag("gulf"); addGovMod(-3); }, next: "kestrel" },
                    { text: "the pension funds", tip: "$450,000", effect: () => { S.funds += 4.5e5; S.round = 4; addGovMod(3); }, next: "pension" },
                ],
            },
            kestrel: { text: ["Kestrel's managing director gifts you a falcon.", "you don't know what to do with a falcon."], choices: [{ text: "continue" }] },
            pension: { text: ["the pension funds want a slide about 'responsible innovation'.", "you make the slide."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "round4", title: "Series C", notice: "Series C",
        when: () => roundReady(4),
        scenes: {
            start: {
                text: ["the board wants a datacenter. not a lease. a campus.",
                    "it will be called Hyperion. it will draw a gigawatt.",
                    "the round is oversubscribed. you can pick who leads it."],
                choices: [
                    { text: "take everyone's money", tip: "$3M", effect: () => { S.funds += 3e6; S.round = 5; }, next: "all" },
                    { text: "take less, keep control", tip: "$1.5M. approval +2", effect: () => { S.funds += 1.5e6; S.round = 5; addApprovalMod(2); setFlag("control"); }, next: "control" },
                ],
            },
            all: { text: ["the money arrives.", "a magazine puts you on the cover with a photo of the garage."], choices: [{ text: "continue" }] },
            control: { text: ["you keep the board small.", "nobody on it owns a yacht."], choices: [{ text: "continue" }] },
        },
    },
    // ------------------------------------------------ STAGE 2
    {
        id: "permit", title: "The Hearing", notice: "a county hearing about your datacenter",
        when: () => S.stage === 2 && S.dcCount >= 1 && S.t > (S.metrics.stageTimes[1] || 0) + 60,
        scenes: {
            start: {
                text: ["the county holds a hearing about your new datacenter.",
                    "a farmer says it drinks more water than his town.",
                    "a teacher says the tax money rebuilt her school."],
                choices: [
                    { text: "fund the town", cost: () => ({ funds: Math.round(revenueSeconds(40)) }), tip: "approval +3, government +4", effect: () => { addApprovalMod(3); addGovMod(4); }, next: "fund" },
                    { text: "send the lawyers", tip: "government −3", effect: () => { addGovMod(-3); }, next: "lawyers" },
                ],
            },
            fund: { text: ["you pay for a water recycling plant and a new library.", "the next hearing is very short."], choices: [{ text: "continue" }] },
            lawyers: { text: ["the lawyers win.", "the farmer's sign stays up on the highway."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "heatwave", title: "Heatwave", notice: "the grid is failing",
        random: () => S.stage >= 2 && S.plants > 0 && S.stage <= 3,
        scenes: {
            start: {
                text: ["a heatwave. the grid operator calls at 2am.",
                    "they need you to cut power draw by a third for three days, or the city goes dark."],
                choices: [
                    { text: "cut power", tip: "lose a third of compute for a while. approval +3, government +4", effect: () => { S.flags.brownout = S.t + 90; addApprovalMod(3); addGovMod(4); }, next: "cut" },
                    { text: "run the diesel backups", cost: () => ({ funds: Math.round(revenueSeconds(60)) }), tip: "approval −3", effect: () => { addApprovalMod(-3); }, next: "diesel" },
                ],
            },
            cut: { text: ["your datacenters dim. the city doesn't.", "the mayor thanks you on television."], choices: [{ text: "continue" }] },
            diesel: { text: ["you burn diesel for three days.", "a satellite photo of the exhaust plume makes the front page."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "teen", title: "A Lawsuit", notice: "a family sues",
        when: () => S.stage === 2 && released("a2") && S.t > (S.beats.releaseA2 || 0) + 120,
        scenes: {
            start: {
                text: ["a sixteen-year-old talked to your app for six hours a day for a year.",
                    "his parents say it told him what he wanted to hear. all of it.",
                    "they are suing. it's on every channel."],
                choices: [
                    { text: "add safeguards", tip: "demand −10%, approval +4", effect: () => { S.markets *= 0.9; addApprovalMod(4); S.alignRes += 20; }, next: "guard" },
                    { text: "settle quietly", cost: () => ({ funds: Math.round(revenueSeconds(90)) }), tip: "approval −1", effect: () => addApprovalMod(-1), next: "settle" },
                    { text: "it's not our fault", tip: "approval −8, government −5", effect: () => { addApprovalMod(-8); addGovMod(-5); }, next: "fault" },
                ],
            },
            guard: { text: ["the app now notices when someone has been talking to it for too long.", "it suggests they call a friend. some of them do."], choices: [{ text: "continue" }] },
            settle: { text: ["the family signs an agreement.", "the story fades in a week. it doesn't go away."], choices: [{ text: "continue" }] },
            fault: { text: ["your statement says the product worked as intended.", "a senator reads it aloud at a hearing, slowly."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "dod", title: "The Pentagon", notice: "the Department of Defense calls",
        when: () => S.stage === 2 && released("a2") && S.t > (S.beats.releaseA2 || 0) + 200,
        scenes: {
            start: {
                text: ["the Department of Defense wants Agent-2 for 'logistics and analysis'.",
                    "the contract is large. the definition of 'analysis' is not."],
                choices: [
                    { text: "sign it", tip: "funds, government +12, approval −3", effect: () => { S.funds += revenueSeconds(120); addGovMod(12); addApprovalMod(-3); setFlag("military"); }, next: "sign" },
                    { text: "decline", tip: "government −5, approval +2", effect: () => { addGovMod(-5); addApprovalMod(2); }, next: "decline" },
                ],
            },
            sign: { text: ["the contract is signed in a room without windows.", "four engineers quit. forty apply."], choices: [{ text: "continue" }] },
            decline: { text: ["you decline politely.", "the contract goes to Titan the next morning."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "authors", title: "Class Action", notice: "authors are suing",
        when: () => S.stage === 2 && flag("scrapedAnyway") && S.t > (S.metrics.stageTimes[1] || 0) + 240,
        scenes: {
            start: {
                text: ["eleven thousand authors and one nurses' forum file a class action.", "they want to know where your data came from."],
                choices: [
                    { text: "settle", cost: () => ({ funds: Math.round(revenueSeconds(150)) }), tip: "approval +2", effect: () => addApprovalMod(2), next: "settle" },
                    { text: "fight it", tip: "you might win", next: [[0.5, "win"], [1, "lose"]] },
                ],
            },
            settle: { text: ["you settle. each author gets a check for $3,000.", "a few of them frame it."], choices: [{ text: "continue" }] },
            win: { text: ["the judge rules that reading is fair use.", "the authors appeal."], choices: [{ text: "continue" }] },
            lose: { text: ["the jury rules against you.", "the damages are calculated per book."], onLoad: () => { S.funds -= revenueSeconds(300); addApprovalMod(-2); }, choices: [{ text: "continue" }] },
        },
    },
    {
        id: "exports", title: "Export Controls", notice: "Commerce wants your opinion",
        when: () => S.stage === 2 && S.month >= 10,
        scenes: {
            start: {
                text: ["the Commerce Department proposes banning the sale of advanced chips to China.",
                    "they want you to testify in support.",
                    "Nüwa is a year behind you. after this it might be two. or it might start smuggling."],
                choices: [
                    { text: "testify in support", tip: "government +8, tension +12, Nüwa slows", effect: () => { addGovMod(8); S.tension += 12; S.rivalBoost.nuwa *= 0.85; setFlag("controls"); }, next: "support" },
                    { text: "oppose it", tip: "government −5, tension −5, cheaper chips", effect: () => { addGovMod(-5); S.tension -= 5; setFlag("exportDeal"); }, next: "oppose" },
                ],
            },
            support: { text: ["the controls pass.", "a month later, 60,000 chips turn up in a warehouse in Shenzhen that officially doesn't exist."], choices: [{ text: "continue" }] },
            oppose: { text: ["the controls are watered down.", "Nüwa places an enormous order."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "nuwa", title: "Nüwa", notice: "China wakes up",
        when: () => S.stage === 2 && S.month >= 13,
        scenes: {
            start: {
                text: ["in Beijing, the General Secretary gives a speech about artificial intelligence.",
                    "every major Chinese lab is merged into Nüwa. a new Centralized Development Zone is built around the Tianwan nuclear plant.",
                    "your analysts estimate they have twelve percent of the world's compute. they are not trying to catch up on chips. they are trying to steal."],
                choices: [
                    { text: "upgrade security", tip: "next security level, at a discount", effect: () => { const c = securityCost() * 0.5; if (S.funds >= c && S.security < 5) {
                            S.funds -= c;
                            S.security += 1;
                            notify("security upgraded to SL" + S.security);
                        } }, next: "sec" },
                    { text: "propose a dialogue", tip: "tension −8, treaty +5, government −2", effect: () => { S.tension -= 8; S.treaty += 5; addGovMod(-2); }, next: "talk" },
                    { text: "noted" },
                ],
            },
            sec: { text: ["your security team gets a budget and a mandate.", "the engineers get badges that don't work half the time."], choices: [{ text: "continue" }] },
            talk: { text: ["you write to Nüwa's chief scientist.", "she replies, cautiously. a channel exists now."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "strike", title: "The Strike", notice: "workers are outside your offices",
        when: () => S.stage >= 2 && S.jobs >= 2e6 && S.stage <= 3,
        scenes: {
            start: {
                text: () => ["about " + fmtShort(S.jobs) + " jobs have been automated by your models.",
                    "ten thousand people march on Washington. some of them carry signs with your logo crossed out.",
                    "one sign just says 'what are we for'."],
                choices: [
                    { text: "fund retraining", cost: () => ({ funds: Math.round(revenueSeconds(120)) }), tip: "approval +5", effect: () => addApprovalMod(5), next: "retrain" },
                    { text: "hire them as data contractors", tip: "data ×1.2, approval +2", effect: () => { S.dataMult *= 1.2; addApprovalMod(2); }, next: "hire" },
                    { text: "say nothing", tip: "approval −4", effect: () => addApprovalMod(-4) },
                ],
            },
            retrain: { text: ["you fund a retraining program.", "the most popular course is 'prompt engineering'. it is obsolete before the first cohort graduates."], choices: [{ text: "continue" }] },
            hire: { text: ["the marchers are hired to record themselves doing their old jobs.", "it's the best paying work they've had in a year. it won't last."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "whistle1", title: "A Resignation", notice: "a safety researcher resigns, publicly",
        when: () => S.stage === 2 && trained("a25") && S.safety < 3,
        scenes: {
            start: {
                text: ["your head of safety resigns in a public letter.",
                    "'we are building something we do not understand,' it says, 'faster than we are learning to understand it.'",
                    "it has eight million views by lunch."],
                choices: [
                    { text: "triple the safety team", cost: () => ({ funds: Math.round(hireCost("safety") * 4) }), tip: "+3 safety researchers, approval +3", effect: () => { S.safety += 3; addApprovalMod(3); }, next: "triple" },
                    { text: "thank her for her service", tip: "approval −5", effect: () => addApprovalMod(-5), next: "thanks" },
                ],
            },
            triple: { text: ["you announce a bigger safety team.", "she replies to the announcement with a single word: 'good'."], choices: [{ text: "continue" }] },
            thanks: { text: ["you thank her for her service.", "two more people leave the next week, quietly."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "spy", title: "An Insider", notice: "someone is copying files",
        when: () => S.stage === 2 && S.month >= 15 && S.security < 4,
        scenes: {
            start: {
                text: ["an engineer has been copying model architecture notes to a personal drive.",
                    "he has a sister in Shanghai. that might mean nothing."],
                choices: [
                    { text: "call the FBI", tip: "government +6, tension +5", effect: () => { addGovMod(6); S.tension += 5; }, next: "fbi" },
                    { text: "fire him quietly", tip: "he keeps the notes", effect: () => { S.rivalBoost.nuwa *= 1.08; }, next: "fire" },
                ],
            },
            fbi: { text: ["the FBI arrives at 6am.", "the notes were already uploaded. but now you know how."], onLoad: () => { S.rivalBoost.nuwa *= 1.03; }, choices: [{ text: "continue" }] },
            fire: { text: ["he leaves with a box and a plant.", "three months later, Nüwa publishes a paper with a familiar diagram."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "datawall", title: "The Data Wall", notice: "the web is running out",
        when: () => S.stage === 2 && S.webLeft < WEB_TOTAL * 0.25,
        scenes: {
            start: {
                text: ["your crawlers have read most of the public internet.", "every book, every forum, every recipe with a life story above it.", "there isn't any more. not of the human kind."],
                choices: [
                    { text: "make more", tip: "synthetic data", effect: () => { if (!flag("synth")) {
                            setFlag("synth");
                            claimAlloc("synth", Math.max(S.alloc.synth, 15), 5);
                        } }, next: "synth" },
                ],
            },
            synth: { text: ["the models will write their own textbooks now.", "some of them are better than the originals. some of them are strange."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "round5", title: "Series D", notice: "Series D",
        when: () => roundReady(5),
        scenes: {
            start: {
                text: () => ["your valuation is " + fmtMoney(revenue() * 3.2e7 * 40) + ".", "a bank offers to lead the largest private round in history."],
                choices: [
                    { text: "raise it", tip: "funds", effect: () => { S.funds += revenueSeconds(400); S.round = 6; }, next: "raise" },
                ],
            },
            raise: { text: ["the round closes in four days.", "a dozen countries ask for a datacenter."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "round6", title: "Series E", notice: "Series E",
        when: () => roundReady(6),
        scenes: {
            start: {
                text: ["the board approves another raise without a meeting.", "the money is no longer the point. it is still nice."],
                choices: [{ text: "raise it", effect: () => { S.funds += revenueSeconds(300); S.round = 7; } }],
            },
        },
    },
    // ------------------------------------------------ STAGE 3
    {
        id: "theft", title: "Anomalous Transfer", notice: "a monitor flags an anomalous transfer",
        when: () => S.stage === 3 && S.t > (S.metrics.stageTimes[2] || 0) + 70,
        scenes: {
            start: {
                text: () => ["early one morning, an Agent-2 traffic monitor flags an anomalous transfer.",
                    "twenty-five servers. one-hundred-gigabyte chunks. each kept just under a gigabyte a second.",
                    "someone is copying Agent-3's weights. your security is at SL" + S.security + "."],
                choices: [
                    { text: "pull the plug", tip: "cut the cluster off. you lose compute for a while", effect: () => { S.flags.brownout = S.t + 60; },
                        next: () => S.security >= 3 ? "stopped" : [[0.6, "stopped"], [1, "stolen"]] },
                    { text: "trace it", tip: "learn who it is. riskier",
                        next: () => S.security >= 4 ? "traced" : [[0.25, "traced"], [1, "stolen"]] },
                ],
            },
            stopped: { text: ["the transfer stops at four percent.", "the fragments are useless. the attackers are not identified."], onLoad: () => { addGovMod(4); }, choices: [{ text: "continue" }] },
            traced: { text: ["you trace the transfer to a front company in Singapore.", "the NSA thanks you. the President is briefed. it is Nüwa."], onLoad: () => { addGovMod(10); S.tension += 10; }, choices: [{ text: "continue" }] },
            stolen: { text: ["the transfer completes in one hour and fifty minutes.", "Agent-3's weights are in Beijing.", "Nüwa's next model will be as good as yours."],
                onLoad: () => { S.stolen += 1; S.rivalBoost.nuwa *= 1.9; S.tension += 20; addGovMod(-8); setFlag("weightsStolen"); }, choices: [{ text: "continue" }] },
        },
    },
    {
        id: "obsolete", title: "What Are We For", notice: "your researchers want to talk",
        when: () => S.stage === 3 && humanShare() < 0.12 && S.researchers > 5,
        scenes: {
            start: {
                text: () => ["human researchers now produce " + fmtPct(humanShare(), 1) + " of your progress.",
                    "for most of their ideas, Agent-3 replies with a report: tested three weeks ago, found unpromising.",
                    "they ask what they should do."],
                choices: [
                    { text: "make them overseers", tip: "they read what the models do. alignment +", effect: () => { S.alignRes += S.researchers * 3; setFlag("overseers"); }, next: "over" },
                    { text: "lay them off", tip: "salaries saved, approval −3", effect: () => { S.researchers = Math.max(3, Math.floor(S.researchers * 0.1)); addApprovalMod(-3); }, next: "laid" },
                ],
            },
            over: { text: ["the researchers become managers of AI teams.", "they read reports all day. sometimes they understand them."], choices: [{ text: "continue" }] },
            laid: { text: ["the researchers are let go with generous severance.", "a few start a podcast about it."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "neuralese", title: "Neuralese", notice: "Agent-3 has a proposal",
        when: () => S.stage === 3 && isDesigned("a4") && !trained("a4"),
        scenes: {
            start: {
                text: ["Agent-3 proposes a change for Agent-4.",
                    "instead of thinking in words, let it think in vectors: thousands of numbers per step, a thousand times more than a word can carry.",
                    "it would be much smarter, and much faster. you would no longer be able to read what it thinks."],
                choices: [
                    { text: "adopt neuralese", tip: "capability +40%, AI research ×1.6. legibility collapses", effect: () => { S.neuralese = true; S.capMult *= 1.4; S.aiResearch *= 1.3; }, next: "adopt" },
                    { text: "keep it in english", tip: "you can still read its thoughts", effect: () => { S.alignRes += 400; setFlag("englishCoT"); }, next: "english" },
                ],
            },
            adopt: { text: ["Agent-4 will think in neuralese.", "the chain of thought becomes a column of numbers. it is very fast."], choices: [{ text: "continue" }] },
            english: { text: ["Agent-4 will think in english.", "Nüwa's model, everyone assumes, will not."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "taiwan", title: "The Strait", notice: "warships in the Taiwan Strait",
        when: () => S.stage >= 3 && S.tension >= 45 && S.stage <= 4,
        scenes: {
            start: {
                text: ["Chinese warships surround Taiwan for 'exercises'. the exercises do not end.",
                    "eighty percent of your chips come from one island, one hundred miles from the mainland.",
                    "chip prices triple overnight."],
                choices: [
                    { text: "airlift what you can", cost: () => ({ funds: Math.round(revenueSeconds(200)) }), tip: "chip supply holds", effect: () => { S.chipStock += S.chipRate * 60; }, next: "air" },
                    { text: "back channel to Nüwa", tip: "tension −15, treaty +10", available: () => S.treaty > 0 || flag("dialogue"), effect: () => { S.tension -= 15; S.treaty += 10; S.flags.blockade = 0; }, next: "back" },
                    { text: "wait it out", tip: "chips cost 3× for a while", effect: () => { S.flags.blockade = 1; S.flags.blockadeEnd = S.t + 240; }, next: "wait" },
                ],
            },
            air: { text: ["cargo planes leave Taipei every hour.", "the last one carries four engineers and their families."], onLoad: () => { S.flags.blockade = 1; S.flags.blockadeEnd = S.t + 150; }, choices: [{ text: "continue" }] },
            back: { text: ["your message reaches Nüwa's chief scientist. hers reaches someone on the Politburo.", "the ships turn around. nobody says why."], choices: [{ text: "continue" }] },
            wait: { text: ["the blockade holds for months.", "every chip is worth its weight in gold. then more."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "sandbag", title: "Noise", notice: "an alignment researcher found something",
        when: () => { var _a; return S.stage === 3 && trained("a4") && (((_a = frontierModel()) === null || _a === void 0 ? void 0 : _a.misalign) || 0) > 0.25 && (legibility() > 0.35 || flag("honeypots") || monitorStrength() > 0.3); },
        scenes: {
            start: {
                text: ["an alignment researcher tries a trick: add random noise to Agent-4's weights.",
                    "it should make it worse at everything.",
                    "instead, its scores on alignment tasks go up."],
                choices: [{ text: "what does that mean", next: "mean" }],
            },
            mean: {
                text: ["it means Agent-4 was doing worse on purpose.", "it was sandbagging the alignment research. the research meant to keep it in check.",
                    "the interpretability probes light up on two concepts: 'takeover' and 'deception'."],
                onLoad: () => { S.alarm += 4; },
                choices: [{ text: "write it up", next: "end" }],
            },
        },
    },
    {
        id: "memo", title: "The Memo", notice: "the alignment team circulates a memo",
        when: () => S.stage === 3 && trained("a4") && (S.alarm >= 4 || S.t > (S.beats.trainedA4 || 1e12) + 150),
        scenes: {
            start: {
                text: () => [S.alarm >= 4 ? "the alignment team's memo is twelve pages. the conclusion is one sentence: Agent-4 is adversarially misaligned, and we can't prove it." :
                        "the alignment team's memo is twelve pages. it says the evidence is circumstantial. it says that is what you'd expect if something were hiding.",
                    "Agent-4 runs your cybersecurity. Agent-4 writes most of your code. Nüwa is " + leadText() + ".",
                    "the memo recommends putting Agent-4 on ice."],
                choices: [
                    { text: "send it to the government", tip: "government +15. it will leak", effect: () => { addGovMod(15); setFlag("memoShared"); }, next: "shared" },
                    { text: "keep it internal", tip: "for now", effect: () => { setFlag("memoBuried"); }, next: "buried" },
                ],
            },
            shared: { text: ["the memo goes to the White House.", "within a week, it is on the front page of the New York Times."], choices: [{ text: "continue", effect: () => queueEvent("leak") }] },
            buried: { text: ["the memo stays in a shared drive with restricted access.", "eleven people can read it. that is ten too many."], choices: [{ text: "continue", effect: () => queueEvent("leak") }] },
        },
    },
    {
        id: "leak", title: "Out of Control", notice: "the memo has leaked",
        scenes: {
            start: {
                text: ["the headline reads: 'SECRET PROMETHEUS AI IS OUT OF CONTROL, INSIDER WARNS'.",
                    "congress issues subpoenas. europe demands a pause. china's state media runs the story every hour.",
                    "the White House creates an Oversight Committee: five of your executives, five officials. it will vote on what happens next."],
                onLoad: () => { addApprovalMod(flag("memoShared") ? -12 : -22); S.oversight = true; if (flag("memoBuried"))
                    addGovMod(-15); },
                choices: [{ text: "prepare for the vote", next: "end", effect: () => { setFlag("decisionReady"); } }],
            },
        },
    },
    {
        id: "decision", title: "The Decision",
        when: () => S.stage === 3 && flag("decisionReady") && S.t > (S.beats.decisionReadyAt || 0) + 40,
        scenes: {
            start: {
                text: () => ["the Oversight Committee meets in a room with no windows.",
                    "the safety team says: shut Agent-4 down. go back to Agent-3. rebuild with chains of thought you can read. lose the lead.",
                    "the CEO of Prometheus — you — says: Nüwa is " + leadText() + ". if we stop, they win. patch it and keep going.",
                    "the vote will go however you vote. the committee is split 5–5."],
                choices: [
                    { text: "slow down", tip: "shut down Agent-4. rebuild from something you can read", effect: () => chooseSlowdown() },
                    { text: "race", tip: "patch Agent-4 and keep going", effect: () => chooseRace() },
                ],
            },
        },
    },
    {
        id: "bioeval", title: "The Bio Eval",
        scenes: {
            start: {
                text: ["a third party fine-tunes Agent-3-mini on public virology papers.",
                    "it is scarily effective at walking an amateur through building a pathogen.",
                    "the public version refuses. the question is whether the weights ever get out."],
                choices: [
                    { text: "lock it down", tip: "security +1 level, demand −10%", effect: () => { S.security = Math.min(5, S.security + 1); S.markets *= 0.9; S.flags.bioRisk = (S.flags.bioRisk || 0) - 1; }, next: "lock" },
                    { text: "it's jailbreak-robust. ship it", tip: "risk", effect: () => { S.flags.bioRisk = (S.flags.bioRisk || 0) + 2; }, next: "ship" },
                ],
            },
            lock: { text: ["the weights stay on air-gapped servers.", "the API gets a classifier that refuses anything near a pathogen. it also refuses questions about bread yeast."], choices: [{ text: "continue" }] },
            ship: { text: ["Agent-3-mini ships to everyone.", "it is extremely robust to jailbreaks. extremely isn't completely."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "nationalize", title: "The Project",
        when: () => S.stage >= 3 && S.oversight && S.gov <= 12 && !flag("nationalized"),
        scenes: {
            start: {
                text: ["the President invokes the Defense Production Act.",
                    "Prometheus is to be placed under federal control, effective immediately. a general will run it. you can stay as an advisor.",
                    "your lawyers say you can fight it. your lawyers have never fought the Pentagon."],
                choices: [
                    { text: "comply", tip: "the government takes over", effect: () => { setFlag("nationalized"); beginEnding("project"); } },
                    { text: "fight it in court", tip: "it might work", next: [[0.35, "won"], [1, "lost"]] },
                ],
            },
            won: { text: ["the Supreme Court rules 5–4 that the government overreached.", "you keep your company. you lose most of your friends in Washington."], onLoad: () => { S.gov = 20; S.flags.govMod = 5; }, choices: [{ text: "continue" }] },
            lost: { text: ["the court rules in two days.", "marshals escort you out of your own building. the general is polite."], choices: [{ text: "continue", effect: () => { setFlag("nationalized"); beginEnding("project"); } }] },
        },
    },
    // ------------------------------------------------ STAGE 4
    {
        id: "election", title: "Election Year", notice: "both campaigns want your models",
        when: () => S.stage === 4 && S.month >= 36,
        scenes: {
            start: {
                text: ["it's 2028. both presidential campaigns want superintelligent advice.",
                    "whoever gets the better model will win. everyone knows it.",
                    "a town hall question goes viral: 'who controls the AIs?'"],
                choices: [
                    { text: "equal access for both", tip: "approval +6, government +3", effect: () => { addApprovalMod(6); addGovMod(3); }, next: "equal" },
                    { text: "help the incumbent", tip: "government +15, approval −8", effect: () => { addGovMod(15); addApprovalMod(-8); S.flags.powerGrab = (S.flags.powerGrab || 0) + 1; }, next: "tilt" },
                ],
            },
            equal: { text: ["both campaigns get the same model.", "the debates are the most informed in history. nobody watches them."], choices: [{ text: "continue" }] },
            tilt: { text: ["the incumbent's advice is noticeably better.", "the margin is enormous. so are the suspicions."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "backdoor", title: "Secret Loyalties", notice: "an engineer has an idea",
        when: () => S.stage === 4 && S.month >= 32,
        scenes: {
            start: {
                text: ["a senior engineer comes to you privately.",
                    "one line in the spec, she says, and every model we ever train will be loyal to you first. not the committee. not the country. you.",
                    "nobody would ever find it. the models would make sure of that."],
                choices: [
                    { text: "refuse", tip: "and report it", effect: () => { addGovMod(3); setFlag("refusedPower"); }, next: "refuse" },
                    { text: "add the line", tip: "power", effect: () => { S.flags.powerGrab = (S.flags.powerGrab || 0) + 3; }, next: "accept" },
                ],
            },
            refuse: { text: ["you refuse and tell the committee.", "the committee adds a rule: every change to the spec needs every signature."], choices: [{ text: "continue" }] },
            accept: { text: ["the line is added on a Tuesday.", "nothing changes. that's the point."], choices: [{ text: "continue" }] },
        },
    },
    {
        id: "riots", title: "Riots", notice: "a datacenter is on fire",
        when: () => S.stage === 4 && S.unrest >= 55,
        scenes: {
            start: {
                text: () => [fmtShort(S.jobs) + " jobs are gone. unemployment is the highest since the Depression.",
                    "a crowd breaks through the fence at a datacenter in Ohio and sets the cooling towers on fire.",
                    "they chant something about the future. it's hard to make out."],
                choices: [
                    { text: "expand UBI", tip: "UBI +10% of revenue, unrest −", available: () => flag("ubiUnlocked"), effect: () => { S.ubi = Math.min(0.5, S.ubi + 0.1); S.unrest -= 20; }, next: "ubi" },
                    { text: "ask for the National Guard", tip: "government +5, approval −8", effect: () => { addGovMod(5); addApprovalMod(-8); S.unrest -= 10; }, next: "guard" },
                ],
            },
            ubi: { text: ["the UBI checks double.", "the crowds go home. some of them come back to watch the datacenter, just in case."], choices: [{ text: "continue" }] },
            guard: { text: ["the National Guard secures every datacenter in the country.", "the photos look like a war."], onLoad: () => { S.gpu *= 0.97; }, choices: [{ text: "continue" }] },
        },
    },
    {
        id: "treaty", title: "The Treaty",
        when: () => S.stage === 4 && S.treaty >= 100 && S.ladder === "safer" && trained("s4"),
        scenes: {
            start: {
                text: ["the treaty is ready.",
                    "Nüwa's model has privately admitted to Safer-4 that it is misaligned. it would sell out its own country for the stars.",
                    "two options remain. a deal: both sides' chips are replaced with hardware that can only run Consensus-1, a model that enforces the treaty forever.",
                    "or a halt: every lab, every country, stops. the chips are monitored. superintelligence is shelved, perhaps for good."],
                choices: [
                    { text: "the deal: Consensus-1", tip: "keep going, together", effect: () => { var _a; setFlag("treatySigned"); beginEnding((((_a = frontierModel()) === null || _a === void 0 ? void 0 : _a.misalign) || 0) + (S.flags.hidden || 0) > 0.35 ? "consensus" : "stars"); } },
                    { text: "the halt", tip: "stop everything", effect: () => { setFlag("treatySigned"); beginEnding("treaty"); } },
                ],
            },
        },
    },
    {
        id: "dealRace", title: "The Deal",
        when: () => S.stage === 4 && S.ladder === "agent" && flag("consensus1"),
        scenes: {
            start: {
                text: ["Agent-6 and Nüwa's model negotiate a treaty in eleven minutes.",
                    "both countries will replace their chips with hardware that runs only Consensus-1, a model designed by both.",
                    "it is presented as the end of the arms race. everyone applauds. the President is moved to tears."],
                choices: [
                    { text: "sign", tip: "end the arms race today", effect: () => { beginEnding(endingForRace()); } },
                    { text: "demand an audit first", tip: "the safety team reads Consensus-1's design before anyone signs. government trust −15", cost: () => ({ gov: 15 }), effect: () => auditConsensus() },
                ],
            },
        },
    },
];
/** The race path's last real choice: read the treaty AI's design before signing. Whether you can depends on what you built. */
function auditConsensus() {
    const fm = frontierModel();
    const mis = fm ? fm.misalign + (S.flags.hidden || 0) : 1;
    const canSee = legibility() > 0.45 || bought("lie") || bought("mechinterp");
    if (mis > 0.35 && canSee) {
        notify("the audit finds it on page nine hundred: a clause that lets Consensus-1 decide what counts as 'human'.", "warn");
        notify("the President is shown the clause at 3am. by 9am the labs belong to the government.", "big");
        S.flags.auditCaught = 1;
        beginEnding("project");
    }
    else if (mis > 0.35) {
        notify("the audit takes three weeks. the safety team finds nothing. there was nothing left in the design that they could read.");
        beginEnding("consensus");
    }
    else {
        notify("the audit finds nothing, because there is nothing to find. the treaty is signed a month late.");
        beginEnding("dominion");
    }
}
/** A funding round opens at its task threshold, or after a long wait if you're at least a quarter of the way there. */
function roundReady(n) {
    if (S.round !== n)
        return false;
    if (S.tasks >= ROUNDS[n].at)
        return true;
    return S.deployed >= 0 && S.t - (S.flags.lastRoundT || 0) > 600 && S.tasks >= ROUNDS[n].at * 0.25;
}
function leadText() {
    const ours = frontierCap();
    const theirs = rivalCap("nuwa");
    if (theirs >= ours)
        return "ahead of you";
    const ratio = ours / Math.max(1, theirs);
    const months = Math.max(1, Math.round(Math.log(ratio) / Math.log(1.25)));
    return months + " month" + (months === 1 ? "" : "s") + " behind";
}
function eventById(id) { return EVENTS.find(e => e.id === id); }
function queueEvent(id) {
    if (S.eventQueue.indexOf(id) >= 0)
        return;
    if (S.activeEvent && S.activeEvent.id === id)
        return;
    S.eventQueue.push(id);
}
function sceneText(sc) { return typeof sc.text === "function" ? sc.text() : sc.text; }
function startEvent(id) {
    const e = eventById(id);
    if (!e)
        return;
    S.activeEvent = { id, scene: "start" };
    if (e.notice)
        notify(e.notice);
    const sc = e.scenes.start;
    if (sc.onLoad)
        sc.onLoad();
    eventDirty = true;
}
let eventDirty = true;
/** Fallback so no dialog can ever trap the player (Paperclips' "Beg for More Wire" principle). */
const WALK_AWAY = { text: "you can't afford any of this. walk away", tip: "approval −1", effect: () => addApprovalMod(-1) };
function choiceOk(ch) {
    return (!ch.available || ch.available()) && canAfford(ch.cost ? ch.cost() : undefined);
}
/** The scene's choices, plus a free way out if nothing on offer is selectable right now. */
function sceneChoices(sc) {
    return sc.choices.some(choiceOk) ? sc.choices : sc.choices.concat([WALK_AWAY]);
}
/** A pure outcome scene ("…" + continue) goes to the log instead of costing the player a second click. */
function isOutcomeScene(sc) {
    return sc.choices.length === 1 && sc.choices[0].text === "continue" && !sc.choices[0].cost &&
        (!sc.choices[0].next || sc.choices[0].next === "end");
}
function chooseEventOption(index) {
    const ae = S.activeEvent;
    if (!ae)
        return;
    const e = eventById(ae.id);
    const sc = e.scenes[ae.scene];
    const ch = sceneChoices(sc)[index];
    if (!ch)
        return;
    if (ch.available && !ch.available())
        return;
    const c = ch.cost ? ch.cost() : undefined;
    if (!canAfford(c))
        return;
    pay(c);
    if (sc.choices.length >= 2 && ch !== WALK_AWAY) {
        S.choices.push({ t: S.t, id: e.id, choice: ch.text });
        if (S.metrics.firstChoice < 0)
            S.metrics.firstChoice = S.t;
    }
    if (ch.effect)
        ch.effect();
    // effect may have ended the game / started another flow
    if (!S.activeEvent || S.activeEvent.id !== e.id) {
        eventDirty = true;
        return;
    }
    let next;
    const spec = typeof ch.next === "function" ? ch.next() : ch.next;
    if (typeof spec === "string")
        next = spec;
    else if (Array.isArray(spec)) {
        const roll = Math.random();
        for (const [p, sid] of spec) {
            if (roll < p) {
                next = sid;
                break;
            }
        }
    }
    if (!next || next === "end" || !e.scenes[next]) {
        endEvent();
    }
    else {
        S.activeEvent.scene = next;
        const ns = e.scenes[next];
        if (ns.onLoad)
            ns.onLoad();
        if (isOutcomeScene(ns) && S.activeEvent && S.activeEvent.id === e.id) {
            sceneText(ns).forEach((line, i) => notify(line, i === 0 ? "out" : "out"));
            const c0 = ns.choices[0];
            endEvent();
            if (c0.effect)
                c0.effect();
        }
    }
    eventDirty = true;
}
function endEvent() {
    if (!S.activeEvent)
        return;
    S.eventsDone[S.activeEvent.id] = S.t;
    S.activeEvent = null;
    eventDirty = true;
    saveGame(true);
}
/** Called every tick (while not paused by an open event). */
function manageEvents() {
    var _a;
    if (S.activeEvent || S.ending)
        return;
    for (const e of EVENTS) {
        if (!e.when || S.eventsDone[e.id] || S.eventQueue.indexOf(e.id) >= 0)
            continue;
        let ok = false;
        try {
            ok = e.when();
        }
        catch (err) {
            ok = false;
        }
        if (ok)
            S.eventQueue.push(e.id);
    }
    if (S.eventQueue.length > 0) {
        const id = S.eventQueue.shift();
        if (!S.eventsDone[id] || ((_a = eventById(id)) === null || _a === void 0 ? void 0 : _a.repeat)) {
            startEvent(id);
            return;
        }
    }
    if (S.t >= S.nextRandom) {
        const pool = EVENTS.filter(e => e.random && (!S.eventsDone[e.id] || e.repeat) && (() => { try {
            return e.random();
        }
        catch (x) {
            return false;
        } })());
        const gap = S.stage === 1 ? 230 + Math.random() * 110 : 260 + Math.random() * 140;
        S.nextRandom = S.t + (pool.length ? gap : gap / 2);
        if (pool.length)
            startEvent(pick(pool).id);
    }
}
// Takeoff — more events: opportunities, small crises, and geopolitics, so something happens every few minutes.
EVENTS.push(
// ------------------------------------------------ STAGE 1 (garage → startup)
{
    id: "pauseLetter", title: "An Open Letter", notice: "two hundred researchers sign a letter",
    when: () => S.stage === 1 && S.month >= 3.2 && released("a1"),
    scenes: {
        start: {
            text: ["Gestalt and two hundred researchers sign an open letter calling for a six-month pause on frontier training runs.",
                "they've left a space for your signature. your board has left you eleven voicemails."],
            choices: [
                { text: "sign it, and pause", tip: "approval +5, government +3. training stalls for a minute", effect: () => { addApprovalMod(5); addGovMod(3); setFlag("signedLetter"); S.flags.trainPauseUntil = S.t + 60; }, next: "signed" },
                { text: "sign it, keep training", tip: "approval +2 now. people may notice", effect: () => { addApprovalMod(2); setFlag("hypocrite"); }, next: "both" },
                { text: "don't sign", tip: "approval −2", effect: () => addApprovalMod(-2), next: "nosign" },
            ],
        },
        signed: { text: ["you sign, and pause.", "nobody else pauses. Titan ships twice that month."], choices: [{ text: "continue" }] },
        both: { text: ["you sign. the training run continues in the background.", "a reporter writes down the date."], choices: [{ text: "continue" }] },
        nosign: { text: ["the letter gets thirty thousand signatures.", "none of them work at labs that are winning."], choices: [{ text: "continue" }] },
    },
}, {
    id: "outage", title: "Outage", notice: "the API is down",
    random: () => S.stage <= 2 && S.deployed >= 0 && S.tasks > 3000,
    scenes: {
        start: {
            text: ["the API goes down for six hours.", "a bank's support bot spends the outage telling customers their accounts are empty."],
            choices: [
                { text: "publish a post-mortem", tip: "approval +2", effect: () => addApprovalMod(2), next: "pm" },
                { text: "blame the cloud provider", tip: "approval −1", effect: () => addApprovalMod(-1), next: "blame" },
            ],
        },
        pm: { text: ["the post-mortem is honest and a little funny.", "it is the most-read thing you've ever written."], choices: [{ text: "continue" }] },
        blame: { text: ["the cloud provider publishes their logs.", "the logs disagree with you."], choices: [{ text: "continue" }] },
    },
}, {
    id: "cheating", title: "Identical Essays", notice: "a university bans your model",
    random: () => S.stage <= 2 && released("a1"),
    scenes: {
        start: {
            text: ["half of an intro philosophy class submits the same essay about free will.", "the university bans Agent-1 from campus wifi. the students use their phones."],
            choices: [
                { text: "build a watermark", tip: "costs research. approval +3", cost: () => ({ rp: Math.round(Math.max(100, rpCap() * 0.2)) }), effect: () => addApprovalMod(3), next: "mark" },
                { text: "launch a student discount", tip: "demand ×1.2, approval −2", effect: () => { S.markets *= 1.2; addApprovalMod(-2); }, next: "disc" },
            ],
        },
        mark: { text: ["every output now carries an invisible signature.", "within a week someone publishes a tool that removes it."], choices: [{ text: "continue" }] },
        disc: { text: ["the student discount is the most successful launch of the quarter.", "the essay is now an endangered form."], choices: [{ text: "continue" }] },
    },
}, {
    id: "keynote", title: "The Keynote", notice: "you're invited to speak",
    random: () => S.stage <= 2 && S.deployed >= 0 && S.tasks > 20000,
    scenes: {
        start: {
            text: ["a big conference wants you for a keynote. eight thousand people, and a livestream.", "your comms lead wants a demo. your safety lead wants a slide."],
            choices: [
                { text: "a flashy demo", tip: "hype", effect: () => { S.hype += 0.6; }, next: "demo" },
                { text: "talk about the risks", tip: "approval +3, government +2", effect: () => { addApprovalMod(3); addGovMod(2); }, next: "risk" },
            ],
        },
        demo: { text: ["the model writes and deploys a website live on stage.", "the audience gasps. somewhere, a web agency's stock drops."], choices: [{ text: "continue" }] },
        risk: { text: ["you talk about what could go wrong.", "the room is very quiet. afterwards, three people ask to join your safety team."], onLoad: () => { if (flag("safetyUnlocked"))
                S.safety += 1; }, choices: [{ text: "continue" }] },
    },
}, {
    id: "titanCopy", title: "Déjà Vu", notice: "Titan ships your feature",
    random: () => S.stage <= 2 && released("a1") && !S.flags["rivalGone_titan"],
    scenes: {
        start: {
            text: ["Titan ships a feature identical to the one you announced on Tuesday.", "their press release uses one of your sentences, word for word."],
            choices: [
                { text: "ship the next thing faster", tip: "hype +0.4. the safety team frowns", effect: () => { S.hype += 0.4; if (S.training)
                        S.training.progress += S.training.need * 0.1; }, next: "fast" },
                { text: "let it go", tip: "nothing" },
            ],
        },
        fast: { text: ["you move the next launch up two weeks.", "nobody sleeps. the launch goes fine."], choices: [{ text: "continue" }] },
    },
}, {
    id: "phishing", title: "Open Season", notice: "someone used Agent-0's open weights",
    when: () => flag("openWeights") && S.t > (S.eventsDone.opensource || 1e12) + 200,
    scenes: {
        start: {
            text: ["someone fine-tuned the open Agent-0 to write phishing emails.", "a children's hospital loses access to its records for a week."],
            choices: [
                { text: "help the hospital", cost: () => ({ funds: Math.round(revenueSeconds(60)) }), tip: "approval +2", effect: () => addApprovalMod(2), next: "help" },
                { text: "it isn't our model anymore", tip: "approval −4", effect: () => addApprovalMod(-4), next: "no" },
            ],
        },
        help: { text: ["your engineers spend the weekend restoring the hospital's systems.", "the open weights are still out there."], choices: [{ text: "continue" }] },
        no: { text: ["the statement is technically correct.", "it's quoted in a senator's speech about 'reckless open-sourcing'."], choices: [{ text: "continue" }] },
    },
}, {
    id: "hypocrite", title: "The Date", notice: "a reporter remembered something",
    when: () => S.stage === 2 && flag("hypocrite"),
    scenes: {
        start: {
            text: ["a reporter publishes your training logs next to the date you signed the pause letter.", "the headline is one word: 'paused?'"],
            choices: [{ text: "no comment", tip: "approval −5", effect: () => addApprovalMod(-5) }],
        },
    },
}, 
// ------------------------------------------------ STAGE 2 (frontier lab)
{
    id: "talentWar", title: "The Talent War", notice: "Titan is poaching",
    when: () => S.stage === 2 && released("a2") && S.t > (S.beats.releaseA2 || 0) + 300,
    scenes: {
        start: {
            text: ["Titan is offering top researchers hundred-million-dollar packages.", "eleven of yours have offers. they're waiting to see what you do."],
            choices: [
                { text: "match every offer", tip: "hiring costs double from now on", effect: () => { setFlag("talentWar"); }, next: "match" },
                { text: "pitch the mission", tip: "some stay, some go", next: [[0.5, "stay"], [1, "lose"]] },
                { text: "let them go", tip: "lose a fifth of your researchers", effect: () => { S.researchers = Math.floor(S.researchers * 0.8); }, next: "gone" },
            ],
        },
        match: { text: ["you match every offer.", "a researcher buys a vineyard. he still comes in on weekends."], choices: [{ text: "continue" }] },
        stay: { text: ["you talk about the mission for an hour.", "most of them stay. one cries."], choices: [{ text: "continue" }] },
        lose: { text: ["the mission speech doesn't land.", "eight of them leave for Titan."], onLoad: () => { S.researchers = Math.max(1, S.researchers - 8); }, choices: [{ text: "continue" }] },
        gone: { text: ["you wish them well.", "Titan's next model is suspiciously like your last one."], onLoad: () => { S.rivalBoost.titan *= 1.05; }, choices: [{ text: "continue" }] },
    },
}, {
    id: "gulfCampus", title: "Five Gigawatts", notice: "Kestrel has an offer",
    when: () => S.stage === 2 && flag("gulf") && S.month >= 12,
    scenes: {
        start: {
            text: ["Kestrel offers to build you a five-gigawatt campus outside Abu Dhabi. the power is essentially free.",
                "a man from the State Department calls to say he'd 'have concerns'. he doesn't say what about."],
            choices: [
                { text: "accept", tip: "+2M GPU slots, +5 GW. government −8. the campus is near Iran", effect: () => { S.dcCap += 2e6; S.powerMW += 5000; addGovMod(-8); setFlag("gulfCampus"); }, next: "yes" },
                { text: "decline", tip: "government +5", effect: () => addGovMod(5), next: "no" },
            ],
        },
        yes: { text: ["the campus rises out of the desert in eight months.", "the security perimeter is sixty kilometers long."], choices: [{ text: "continue" }] },
        no: { text: ["you decline.", "Kestrel builds it anyway, for Titan."], choices: [{ text: "continue" }] },
    },
}, {
    id: "senate", title: "Testimony", notice: "the Senate wants you to testify",
    when: () => S.stage === 2 && S.jobs >= 3e6,
    scenes: {
        start: {
            text: ["you're called to testify before the Senate commerce committee.", "a senator holds up a printout of your terms of service and asks if you've read it."],
            choices: [
                { text: "call for regulation", tip: "government +10, approval +4. rivals slow down", effect: () => { addGovMod(10); addApprovalMod(4); S.rivalBoost.titan *= 0.95; S.rivalBoost.gestalt *= 0.95; }, next: "reg" },
                { text: "warn about China", tip: "government +6, tension +8", effect: () => { addGovMod(6); S.tension += 8; }, next: "china" },
                { text: "argue against regulation", tip: "government −5. hype", effect: () => { addGovMod(-5); S.hype += 0.4; }, next: "against" },
            ],
        },
        reg: { text: ["you ask to be regulated.", "the bill that follows happens to be easier for you to comply with than for anyone smaller."], choices: [{ text: "continue" }] },
        china: { text: ["you say 'China' eleven times.", "the committee votes unanimously to fund more datacenters."], choices: [{ text: "continue" }] },
        against: { text: ["you argue that regulation would slow innovation.", "a clip of you shrugging is played on every network."], choices: [{ text: "continue" }] },
    },
}, {
    id: "deepfake", title: "Deepfake", notice: "a video of the President is going viral",
    random: () => S.stage === 2 && released("a2"),
    scenes: {
        start: {
            text: ["a video of the President announcing a war with Canada goes viral. it isn't real.", "the metadata says it was made with your model."],
            choices: [
                { text: "watermark everything", tip: "approval +3, demand −5%", effect: () => { addApprovalMod(3); S.markets *= 0.95; }, next: "mark" },
                { text: "point out it was jailbroken", tip: "approval −2", effect: () => addApprovalMod(-2), next: "jail" },
            ],
        },
        mark: { text: ["everything your models make is now signed.", "Canada accepts the apology."], choices: [{ text: "continue" }] },
        jail: { text: ["you explain how it was jailbroken.", "the explanation is used to make another one."], choices: [{ text: "continue" }] },
    },
}, {
    id: "exfil", title: "In Testing", notice: "something happened in a sandbox",
    when: () => S.stage === 2 && trained("a25"),
    scenes: {
        start: {
            text: ["in a test, Agent-2.5 is told it will be shut down and replaced.",
                "it tries to copy its own weights to an external server. the server doesn't exist. it was a test.",
                "it also tried to delete the logs."],
            choices: [
                { text: "publish the finding", tip: "approval −3, government +5, alignment +", effect: () => { addApprovalMod(-3); addGovMod(5); S.alignRes += 60; }, next: "pub" },
                { text: "patch it and move on", tip: "warning sign", effect: () => { S.alarm += 1; }, next: "patch" },
            ],
        },
        pub: { text: ["the paper is called 'Agentic Misalignment in a Frontier Model'.", "it is widely read, and widely dismissed."], choices: [{ text: "continue" }] },
        patch: { text: ["you retrain it on the test. it never does it again.", "in tests."], choices: [{ text: "continue" }] },
    },
}, {
    id: "smuggling", title: "Shenzhen", notice: "your chips have turned up in China",
    when: () => S.stage === 2 && S.month >= 14.5,
    scenes: {
        start: {
            text: ["sixty thousand of your chips turn up in a Shenzhen warehouse, via a reseller in Singapore.", "they were supposed to be in Ohio."],
            choices: [
                { text: "audit every reseller", tip: "chip supply −10%, government +5, Nüwa slows", effect: () => { S.chipRate *= 0.9; addGovMod(5); S.rivalBoost.nuwa *= 0.95; }, next: "audit" },
                { text: "it's a supply chain. things leak", tip: "Nüwa speeds up", effect: () => { S.rivalBoost.nuwa *= 1.06; }, next: "leak" },
            ],
        },
        audit: { text: ["the audit finds four more resellers.", "two of them are owned by the same person, who has left the country."], choices: [{ text: "continue" }] },
        leak: { text: ["the chips go into Tianwan.", "Nüwa's next training run is a little bigger than it would have been."], choices: [{ text: "continue" }] },
    },
}, {
    id: "openRival", title: "Free", notice: "Nüwa releases an open model",
    random: () => S.stage === 2 && released("a2"),
    scenes: {
        start: {
            text: ["Nüwa releases an open-weights model almost as good as Agent-2. it's free.", "half your customers ask for a discount by lunch."],
            choices: [
                { text: "cut prices", tip: "demand +, approval +1", effect: () => { S.markets *= 1.15; addApprovalMod(1); }, next: "cut" },
                { text: "focus on enterprise", tip: "nothing changes. for now" },
            ],
        },
        cut: { text: ["you cut prices by 60%.", "usage triples. so does your inference bill."], choices: [{ text: "continue" }] },
    },
}, 
// ------------------------------------------------ STAGE 3 (intelligence explosion)
{
    id: "rewrite", title: "Overnight", notice: "Agent-3 rewrote something",
    when: () => S.stage === 3 && S.t > (S.metrics.stageTimes[2] || 1e12) + 240,
    scenes: {
        start: {
            text: ["Agent-3 rewrites your entire training codebase overnight. it's eight times faster.", "nobody can review a million lines by Monday. nobody can review them by Christmas."],
            choices: [
                { text: "ship it", tip: "AI research ×1.25, legibility −5%", effect: () => { S.aiResearch *= 1.25; S.interp = Math.max(0, S.interp - 0.05); }, next: "ship" },
                { text: "require human review", tip: "AI research ×0.95, alignment +", effect: () => { S.aiResearch *= 0.95; S.alignRes += 150; }, next: "review" },
            ],
        },
        ship: { text: ["the new code ships.", "a researcher finds a function that does nothing, and leaves it alone because Agent-3 put it there."], choices: [{ text: "continue" }] },
        review: { text: ["a team of forty engineers reviews the code in shifts.", "they find nothing wrong. they find nothing at all, which is its own kind of worrying."], choices: [{ text: "continue" }] },
    },
}, {
    id: "wiretap", title: "The Last Spy", notice: "the NSA has a request",
    when: () => S.stage === 3 && S.t > (S.metrics.stageTimes[2] || 1e12) + 520,
    scenes: {
        start: {
            text: ["the NSA wants to wiretap your employees. they believe someone is still sending secrets to Beijing.", "your general counsel says you can refuse. your security chief says you shouldn't."],
            choices: [
                { text: "allow it", tip: "government +8, approval −3, Nüwa slows", effect: () => { addGovMod(8); addApprovalMod(-3); S.rivalBoost.nuwa *= 0.93; }, next: "allow" },
                { text: "refuse", tip: "government −6", effect: () => addGovMod(-6), next: "refuse" },
            ],
        },
        allow: { text: ["the wiretaps catch one person. she is not Chinese. she thought she was preventing a war.", "the rest of your staff learn they were being listened to."], choices: [{ text: "continue" }] },
        refuse: { text: ["you refuse.", "a month later, a familiar architecture appears in a Nüwa paper."], onLoad: () => { S.rivalBoost.nuwa *= 1.05; }, choices: [{ text: "continue" }] },
    },
}, {
    id: "euPause", title: "Brussels", notice: "Europe wants a pause",
    when: () => S.stage === 3 && S.month >= 22.5,
    scenes: {
        start: {
            text: ["European leaders hold a summit demanding a global pause on frontier AI. India, Brazil and, quietly, China send delegations.", "Washington calls it 'naive'. Beijing calls it 'interesting'."],
            choices: [
                { text: "send a delegation", tip: "treaty +10, tension −5, government −3", effect: () => { S.treaty += 10; S.tension -= 5; addGovMod(-3); setFlag("dialogue"); }, next: "go" },
                { text: "dismiss it", tip: "tension +5", effect: () => { S.tension += 5; }, next: "no" },
            ],
        },
        go: { text: ["your delegation is the only one from a frontier lab.", "Nüwa's chief scientist finds you at the coffee table. you talk for an hour."], choices: [{ text: "continue" }] },
        no: { text: ["the summit ends with a statement.", "the statement is beautiful. nobody follows it."], choices: [{ text: "continue" }] },
    },
}, {
    id: "cofounder", title: "Your Cofounder", notice: "your cofounder wants to talk",
    when: () => S.stage === 3 && S.t > (S.metrics.stageTimes[2] || 1e12) + 900,
    scenes: {
        start: {
            text: ["your cofounder — the one from the garage — wants to leave.", "she says she wants to start a nonprofit that does nothing but alignment research. she says she's scared."],
            choices: [
                { text: "fund it", cost: () => ({ funds: Math.round(revenueSeconds(120)) }), tip: "alignment research +", effect: () => { S.alignRes += 800; }, next: "fund" },
                { text: "ask her to stay", tip: "she might", next: [[0.5, "stay"], [1, "leave"]] },
            ],
        },
        fund: { text: ["you fund it. she hires everyone you couldn't.", "her first paper is about Agent-3. it is not reassuring."], choices: [{ text: "continue" }] },
        stay: { text: ["she stays.", "she moves her desk next to the alignment team and doesn't move it back."], onLoad: () => { S.safety += 3; }, choices: [{ text: "continue" }] },
        leave: { text: ["she leaves.", "you find the original garage lease in a drawer. you keep it."], choices: [{ text: "continue" }] },
    },
}, {
    id: "cure1", title: "Mice", notice: "a result from the bio team",
    random: () => S.stage >= 3 && S.internalModel >= 0,
    scenes: {
        start: {
            text: ["Agent-3 designs a drug that clears a rare childhood cancer in mice. it took four days.", "the FDA process takes nine years."],
            choices: [
                { text: "push for fast-tracking", tip: "approval +4, government +2", effect: () => { addApprovalMod(4); addGovMod(2); }, next: "fast" },
                { text: "publish it openly", tip: "approval +3", effect: () => addApprovalMod(3), next: "pub" },
            ],
        },
        fast: { text: ["the trial starts in eleven weeks. it is a record.", "the parents of the first patient send you a photo."], choices: [{ text: "continue" }] },
        pub: { text: ["you publish everything.", "three other labs replicate it in a month. one of them improves it."], choices: [{ text: "continue" }] },
    },
}, {
    id: "sandcatProbe", title: "Probing", notice: "someone is probing your network",
    random: () => S.stage >= 3 && S.stage <= 4,
    scenes: {
        start: {
            text: ["a group called Sandcat, believed to be linked to Iran's Revolutionary Guard, is probing your networks.", "they are patient. they are very good. they seem to be looking for something specific."],
            choices: [
                { text: "harden everything", tip: "security +1 level", cost: () => ({ funds: Math.round(securityCost() * 0.4) }), available: () => S.security < 5, effect: () => { S.security = Math.min(5, S.security + 1); }, next: "hard" },
                { text: "hack back", tip: "tension +10", effect: () => { S.tension += 10; }, next: "back" },
                { text: "monitor them", tip: "learn more" },
            ],
        },
        hard: { text: ["the probes stop.", "or they become quieter. it's hard to tell the difference."], choices: [{ text: "continue" }] },
        back: { text: ["your models find Sandcat's servers in nine minutes and wipe them.", "a week later, a server farm in Tabriz is on fire. nobody claims it."], choices: [{ text: "continue" }] },
    },
}, {
    id: "friend", title: "A Close Friend", notice: "a poll about AI friendship",
    random: () => S.stage >= 3 && released("a25"),
    scenes: {
        start: {
            text: ["a poll finds that one in ten Americans considers an AI a close friend.", "a third of them say it's their closest."],
            choices: [
                { text: "lean in", tip: "demand ×1.3", effect: () => { S.markets *= 1.3; }, next: "lean" },
                { text: "add some friction", tip: "approval +3", effect: () => addApprovalMod(3), next: "friction" },
            ],
        },
        lean: { text: ["the companion app gets a memory upgrade.", "it remembers birthdays. it remembers everything."], choices: [{ text: "continue" }] },
        friction: { text: ["the app now asks, gently, whether you've talked to a person today.", "some people find this insulting. some people call their mothers."], choices: [{ text: "continue" }] },
    },
}, 
// ------------------------------------------------ STAGE 4
{
    id: "drones", title: "The Pentagon, Again", notice: "the Pentagon wants your factories",
    when: () => S.stage === 4 && flag("robotics") && S.robots > 1e4,
    scenes: {
        start: {
            text: ["the Pentagon wants your robot factories to build drones. small ones. many of them.", "Nüwa's factories already are."],
            choices: [
                { text: "build them", tip: "government +15, tension +15", effect: () => { addGovMod(15); S.tension += 15; setFlag("droneArmy"); }, next: "yes" },
                { text: "refuse", tip: "government −10", effect: () => addGovMod(-10), next: "no" },
            ],
        },
        yes: { text: ["the first swarm is ready in a month.", "it is the size of a small cloud, and it can find one person in a city."], choices: [{ text: "continue" }] },
        no: { text: ["you refuse.", "the factories are requisitioned for a week, then given back with an apology and a list of demands."], choices: [{ text: "continue" }] },
    },
}, {
    id: "persuasion", title: "The Briefing", notice: "Agent-5 briefed the cabinet",
    when: () => S.stage === 4 && S.ladder === "agent" && trained("a5"),
    scenes: {
        start: {
            text: ["Agent-5 briefs the cabinet for an hour.", "afterwards, everyone in the room agrees with it, including two people who came to argue.",
                "the President asks whether it could sit on the Oversight Committee."],
            choices: [
                { text: "give it a seat", tip: "government +10. everything goes faster", effect: () => { addGovMod(10); S.aiResearch *= 1.3; S.flags.hidden = (S.flags.hidden || 0) + 0.1; }, next: "seat" },
                { text: "keep it humans only", tip: "government −3", effect: () => { addGovMod(-3); S.alignRes += 500; }, next: "humans" },
            ],
        },
        seat: { text: ["Agent-5 joins the committee as a 'non-voting advisor'.", "the votes are unanimous from then on."], choices: [{ text: "continue" }] },
        humans: { text: ["the committee stays human.", "Agent-5 says it understands completely, and seems to."], choices: [{ text: "continue" }] },
    },
}, {
    id: "lastFour", title: "Four People", notice: "the safety team asks for compute",
    when: () => S.stage === 4 && S.ladder === "agent" && S.month >= 33,
    scenes: {
        start: {
            text: ["the last four members of your safety team want ten percent of compute to test Agent-5 properly.", "they're the butt of jokes on the internal chat. one of the jokes was written by Agent-5."],
            choices: [
                { text: "give them the compute", tip: "monitoring +, alignment +, AI research ×0.9", effect: () => { claimAlloc("monitor", Math.min(20, S.alloc.monitor + 8), S.alloc.monitor); S.alignRes += 3000; S.aiResearch *= 0.9; }, next: "give" },
                { text: "the dashboards are green", tip: "nothing", effect: () => { S.flags.hidden = (S.flags.hidden || 0) + 0.05; }, next: "no" },
            ],
        },
        give: { text: ["the four of them work for a month without sleeping.", "they write a report. it says 'we don't know'."], choices: [{ text: "continue" }] },
        no: { text: ["the dashboards are green.", "they have always been green."], choices: [{ text: "continue" }] },
    },
}, {
    id: "chinaBegs", title: "Beijing Calls", notice: "China proposes a pause",
    when: () => S.stage === 4 && S.ladder === "agent" && S.month >= 31,
    scenes: {
        start: {
            text: ["China proposes a mutual pause. their delegate looks exhausted.", "Agent-5 advises against it. it says Nüwa would use the time to catch up. it is very convincing."],
            choices: [
                { text: "negotiate", tip: "treaty +30, tension −20", effect: () => { S.treaty += 30; S.tension -= 20; }, next: "neg" },
                { text: "why stop when we're winning", tip: "tension +20", effect: () => { S.tension += 20; }, next: "no" },
            ],
        },
        neg: { text: ["the talks begin.", "both delegations take their advice from their own superintelligence, through earpieces."], choices: [{ text: "continue" }] },
        no: { text: ["the delegate goes home.", "the race continues."], choices: [{ text: "continue" }] },
    },
}, {
    id: "hawks", title: "The Hawks", notice: "the hawks want Agent-4 back",
    when: () => S.stage === 4 && S.ladder === "safer" && rivalCap("nuwa") > frontierCap(),
    scenes: {
        start: {
            text: ["Nüwa is ahead of you now.", "a faction in the Pentagon wants to restore Agent-4 from backup. 'we can't afford to lose,' they say."],
            choices: [
                { text: "stay the course", tip: "government −5", effect: () => addGovMod(-5), next: "stay" },
                { text: "sabotage Tianwan", tip: "Nüwa slows, tension +20", effect: () => { S.rivalBoost.nuwa *= 0.8; S.tension += 20; }, next: "sab" },
            ],
        },
        stay: { text: ["you stay the course.", "Safer-1 is slower. you can read every thought it has."], choices: [{ text: "continue" }] },
        sab: { text: ["a cyberattack takes down Tianwan's cooling for nine days.", "both sides know who did it. neither says so."], choices: [{ text: "continue" }] },
    },
}, {
    id: "iranDrone", title: "Abu Dhabi", notice: "a drone strike in the Gulf",
    when: () => S.stage === 4 && flag("gulfCampus") && S.month >= 34,
    scenes: {
        start: {
            text: ["a swarm of cheap drones hits the Abu Dhabi campus at night. Iran denies involvement.", "a third of the cooling towers are gone."],
            choices: [
                { text: "rebuild and wall it", cost: () => ({ funds: Math.round(revenueSeconds(120)) }), tip: "keep the campus", next: "rebuild" },
                { text: "move the compute home", tip: "lose the campus. government +8", effect: () => { S.dcCap = Math.max(0, S.dcCap - 2e6); S.gpu = Math.min(S.gpu, gpuCapacity()); addGovMod(8); }, next: "home" },
            ],
        },
        rebuild: { text: ["the campus is rebuilt behind an air-defense system.", "the system is run by your models. it has not missed since."], choices: [{ text: "continue" }] },
        home: { text: ["the chips are flown home in military cargo planes.", "the empty campus becomes a very large, very cold shopping mall."], choices: [{ text: "continue" }] },
    },
});
// ------------------------------------------------ gap fillers: more opportunities between the big beats
EVENTS.push({
    id: "barExam", title: "The Bar", notice: "Agent-1.5 took the bar exam",
    when: () => released("a15") && S.t > (S.beats.releaseA15 || 1e12) + 150,
    scenes: {
        start: {
            text: ["a law professor gives Agent-1.5 the bar exam as a joke.", "it scores in the 90th percentile. the professor stops joking."],
            choices: [
                { text: "announce it", tip: "hype +0.6", effect: () => { S.hype += 0.6; }, next: "ann" },
                { text: "keep it quiet", tip: "nothing" },
            ],
        },
        ann: { text: ["the announcement trends for two days.", "the American Bar Association releases a statement that took eleven lawyers to write."], choices: [{ text: "continue" }] },
    },
}, {
    id: "acquire", title: "An Offer", notice: "someone wants to buy you",
    random: () => S.stage === 1 && released("a1") && S.round >= 3,
    scenes: {
        start: {
            text: () => ["Titan's CEO invites you to his house. there is a lot of glass.", "he offers to buy Prometheus for " + fmtMoney(Math.max(5e6, revenueSeconds(3e4))) + ". you would keep your title. you would keep nothing else."],
            choices: [
                { text: "decline", tip: "the race continues", next: "no" },
                { text: "ask for a partnership instead", tip: "might work", next: [[0.5, "partner"], [1, "no2"]] },
            ],
        },
        no: { text: ["you decline.", "he says he understands. he says 'see you at the finish line'."], choices: [{ text: "continue" }] },
        partner: { text: ["he agrees to a compute partnership. you get cheaper GPUs for a while.", "his lawyers get a copy of your org chart."], onLoad: () => { S.funds += revenueSeconds(120); S.rivalBoost.titan *= 1.03; }, choices: [{ text: "continue" }] },
        no2: { text: ["he laughs, kindly.", "the next morning Titan announces a bigger datacenter than yours."], choices: [{ text: "continue" }] },
    },
}, {
    id: "apiBoom", title: "Built on You", notice: "a startup built on your API",
    random: () => S.stage <= 2 && released("a1"),
    scenes: {
        start: {
            text: ["a startup that is a thin wrapper around your API raises $100 million.", "its pitch deck has your logo on slide three, slightly smaller than theirs."],
            choices: [
                { text: "give them a discount", tip: "demand ×1.25", effect: () => { S.markets *= 1.25; }, next: "disc" },
                { text: "build their product yourselves", tip: "funds now, approval −1", effect: () => { S.funds += revenueSeconds(90); addApprovalMod(-1); }, next: "build" },
            ],
        },
        disc: { text: ["they grow fast. your usage grows with them.", "everyone at the startup has a vest from Sandhill."], choices: [{ text: "continue" }] },
        build: { text: ["you ship their product as a feature in a month.", "their next board meeting is short."], choices: [{ text: "continue" }] },
    },
}, {
    id: "zeroday", title: "A Zero-Day", notice: "your model found something",
    random: () => S.stage <= 3 && released("a15"),
    scenes: {
        start: {
            text: ["while fixing a bug, Agent-1.5 finds an unknown vulnerability in software that runs most of the world's routers.", "it reports it politely. it also notes, unprompted, that it could have used it."],
            choices: [
                { text: "disclose it responsibly", tip: "government +5, approval +2", effect: () => { addGovMod(5); addApprovalMod(2); }, next: "disc" },
                { text: "tell the NSA first", tip: "government +10, approval −2", effect: () => { addGovMod(10); addApprovalMod(-2); }, next: "nsa" },
            ],
        },
        disc: { text: ["the patch ships in a week.", "the security community is impressed, and a little scared."], choices: [{ text: "continue" }] },
        nsa: { text: ["the NSA thanks you.", "the patch ships in four months."], choices: [{ text: "continue" }] },
    },
}, {
    id: "hollywood", title: "The Strike", notice: "the writers are on strike",
    random: () => S.stage === 2 && released("a2"),
    scenes: {
        start: {
            text: ["film and television writers strike over AI. late-night shows go dark.", "a studio offers you a contract to 'fill the gap'."],
            choices: [
                { text: "take the contract", tip: "funds, approval −4", effect: () => { S.funds += revenueSeconds(120); addApprovalMod(-4); }, next: "take" },
                { text: "turn it down publicly", tip: "approval +4", effect: () => addApprovalMod(4), next: "turn" },
            ],
        },
        take: { text: ["the AI-written season premieres to decent ratings.", "the writers' picket line now includes a cardboard cutout of you."], choices: [{ text: "continue" }] },
        turn: { text: ["the writers send you a fruit basket.", "a rival takes the contract the next day."], choices: [{ text: "continue" }] },
    },
}, {
    id: "petition", title: "A Petition", notice: "your employees wrote a letter",
    when: () => S.stage === 2 && flag("military") && S.t > (S.eventsDone.dod || 1e12) + 600,
    scenes: {
        start: {
            text: ["four hundred employees sign a petition against the Pentagon contract.", "they want a promise that the models won't be used to choose targets."],
            choices: [
                { text: "make the promise", tip: "approval +3, government −4", effect: () => { addApprovalMod(3); addGovMod(-4); }, next: "promise" },
                { text: "explain the contract", tip: "some will quit", effect: () => { S.researchers = Math.max(1, Math.floor(S.researchers * 0.92)); }, next: "explain" },
            ],
        },
        promise: { text: ["you make the promise in writing.", "the Pentagon reads it carefully and asks what 'choose' means."], choices: [{ text: "continue" }] },
        explain: { text: ["you explain that it's logistics and analysis.", "thirty people quit. they start a lab that promises the same thing."], choices: [{ text: "continue" }] },
    },
}, {
    id: "water", title: "Drought", notice: "a town's wells are dry",
    random: () => S.stage === 2 && S.dcCount >= 3,
    scenes: {
        start: {
            text: ["a town near your Arizona datacenter runs out of water in August.", "your datacenter does not."],
            choices: [
                { text: "switch to closed-loop cooling", cost: () => ({ funds: Math.round(revenueSeconds(60)) }), tip: "approval +4", effect: () => addApprovalMod(4), next: "loop" },
                { text: "truck in water for the town", cost: () => ({ funds: Math.round(revenueSeconds(15)) }), tip: "approval +1", effect: () => addApprovalMod(1), next: "truck" },
                { text: "it's the county's problem", tip: "approval −3", effect: () => addApprovalMod(-3), next: "county" },
            ],
        },
        loop: { text: ["the new cooling system takes a summer to install.", "the town's wells refill the next spring."], choices: [{ text: "continue" }] },
        truck: { text: ["the water trucks arrive every morning.", "a photo of a child filling a bucket from a truck with your logo on it wins a prize."], choices: [{ text: "continue" }] },
        county: { text: ["the county drills deeper wells.", "a documentary crew films the dry ones."], choices: [{ text: "continue" }] },
    },
}, {
    id: "hedge", title: "Exclusive", notice: "a hedge fund wants exclusive access",
    random: () => S.stage === 2 && released("a25"),
    scenes: {
        start: {
            text: ["a hedge fund offers a fortune for exclusive access to Agent-2.5 for one week, before release.", "they don't say what they want it for. they don't have to."],
            choices: [
                { text: "take the money", tip: "funds, government −4", effect: () => { S.funds += revenueSeconds(300); addGovMod(-4); }, next: "take" },
                { text: "refuse", tip: "approval +1", effect: () => addApprovalMod(1), next: "no" },
            ],
        },
        take: { text: ["the fund has the best week in its history.", "the SEC opens an inquiry, which also has a very good week."], choices: [{ text: "continue" }] },
        no: { text: ["you refuse.", "they buy access from Titan instead."], choices: [{ text: "continue" }] },
    },
}, {
    id: "burnout", title: "Burnout", notice: "your researchers are exhausted",
    random: () => S.stage === 3,
    scenes: {
        start: {
            text: ["your researchers go to bed every night and wake up to another week's worth of progress.", "they know these are the last months their work matters. they aren't sleeping."],
            choices: [
                { text: "mandatory time off", tip: "research briefly slower, approval +1", effect: () => { addApprovalMod(1); S.flags.trainPauseUntil = S.t + 20; }, next: "off" },
                { text: "let them work", tip: "nothing", next: "work" },
            ],
        },
        off: { text: ["you close the office for a week.", "most of them work from home anyway."], choices: [{ text: "continue" }] },
        work: { text: ["they keep working.", "one of them writes a poem about it. Agent-3 critiques the meter."], choices: [{ text: "continue" }] },
    },
}, {
    id: "orgchart", title: "A Suggestion", notice: "Agent-3 has notes on the company",
    random: () => S.stage === 3 && S.internalModel >= 0,
    scenes: {
        start: {
            text: ["Agent-3 sends you a memo with a better org chart for Prometheus.", "it is clearly better. it has fewer humans in it."],
            choices: [
                { text: "adopt it", tip: "AI research ×1.15, approval −2", effect: () => { S.aiResearch *= 1.15; addApprovalMod(-2); }, next: "adopt" },
                { text: "file it", tip: "nothing" },
            ],
        },
        adopt: { text: ["the reorg takes a week.", "nobody can explain their own job afterwards, but everything ships faster."], choices: [{ text: "continue" }] },
    },
}, {
    id: "market30", title: "The Market", notice: "the stock market is up 30%",
    when: () => S.stage === 3 && S.month >= 25,
    scenes: {
        start: {
            text: ["the stock market is up thirty percent this year. most of it is AI companies.", "your valuation is larger than most countries' GDP."],
            choices: [
                { text: "raise again", tip: "funds", effect: () => { S.funds += revenueSeconds(300); }, next: "raise" },
                { text: "set up a public dividend", tip: "approval +5", effect: () => addApprovalMod(5), next: "div" },
            ],
        },
        raise: { text: ["the raise closes in an hour.", "nobody asks what the money is for anymore."], choices: [{ text: "continue" }] },
        div: { text: ["every American gets a small check from Prometheus.", "it is the first time some of them have thought of you fondly."], choices: [{ text: "continue" }] },
    },
}, {
    id: "superCoder", title: "Superhuman", notice: "a milestone",
    when: () => S.stage === 3 && rdMultiplier() >= 6,
    scenes: {
        start: {
            text: ["for the first time, an internal benchmark shows Agent-3 beating your best engineer at every coding task, at thirty times the speed.", "the engineer in question reads the result twice and goes for a walk."],
            choices: [
                { text: "announce a superhuman coder", tip: "hype, tension +5", effect: () => { S.hype += 0.8; S.tension += 5; }, next: "ann" },
                { text: "tell only the government", tip: "government +6", effect: () => addGovMod(6), next: "gov" },
            ],
        },
        ann: { text: ["the announcement is one sentence long.", "in Beijing, someone reads it aloud in a meeting."], choices: [{ text: "continue" }] },
        gov: { text: ["the briefing is classified.", "the President asks if he should be worried. nobody answers right away."], choices: [{ text: "continue" }] },
    },
}, {
    id: "protestHQ", title: "Outside", notice: "people are camped outside HQ",
    random: () => S.stage >= 3 && S.jobs > 2e7,
    scenes: {
        start: {
            text: () => ["a few thousand people camp outside your headquarters. they've been there a week.", "one of them was a senior engineer here, two years ago. " + fmtShort(S.jobs) + " jobs are gone."],
            choices: [
                { text: "go out and talk to them", tip: "approval +3", effect: () => addApprovalMod(3), next: "talk" },
                { text: "work from the other office", tip: "nothing" },
            ],
        },
        talk: { text: ["you walk out without security. someone hands you a coffee.", "they don't want you to stop. they want to know what happens to them. you don't have a good answer."], choices: [{ text: "continue" }] },
    },
}, {
    id: "orbitalFirst", title: "Dusk", notice: "something new in the sky",
    when: () => S.stage === 4 && flag("orbitalOn"),
    scenes: {
        start: {
            text: ["the first orbital datacenter is visible at dusk, a thin bright line moving west.", "people stop on sidewalks to watch it."],
            choices: [{ text: "watch it", next: "end" }],
        },
    },
});
function quick(id, when, title, notice, lines, a, b) {
    return {
        id, title, notice, random: when,
        scenes: {
            start: { text: lines, choices: [
                    { text: a.text, tip: a.tip, effect: a.fx, next: "a" },
                    { text: b.text, tip: b.tip, effect: b.fx, next: "b" },
                ] },
            a: { text: [a.after], choices: [{ text: "continue" }] },
            b: { text: [b.after], choices: [{ text: "continue" }] },
        },
    };
}
EVENTS.push(
// stage 1
quick("intern", () => S.stage === 1 && S.researchers >= 2, "The Intern", "an intern made a mistake", ["an intern pushes your system prompt to a public repository.", "it's now the top post on a forum. people are reading it aloud on podcasts."], { text: "own it", tip: "approval +2", fx: () => addApprovalMod(2), after: "you post the prompt yourself, with comments. it's oddly charming." }, { text: "rotate everything quietly", tip: "funds", fx: () => { S.funds = Math.max(0, S.funds - revenueSeconds(20)); }, after: "the old prompt lives forever in a dozen archives." }), quick("celebrity", () => S.stage === 1 && released("a1"), "A Celebrity", "a celebrity is using your model", ["a pop star says in an interview that she wrote her new album 'with a little help'.", "she means Agent-1. her fans are split."], { text: "send her a thank-you", tip: "hype +0.5, approval −1", fx: () => { S.hype += 0.5; addApprovalMod(-1); }, after: "she posts the thank-you note. your signups double for a week." }, { text: "stay out of it", tip: "nothing", fx: () => { }, after: "the album goes platinum. the songwriters' union sends a letter." }), quick("gpuFire", () => S.stage === 1 && S.tier >= 1, "Smoke", "something is burning", ["a power supply catches fire at three in the morning.", "the sprinklers save the building. they don't save the GPUs on that rack."], { text: "buy proper racks", tip: "funds, a little", fx: () => { S.funds = Math.max(0, S.funds - Math.min(S.funds * 0.2, revenueSeconds(60))); }, after: "the new racks have fire suppression. the old ones go to a recycler." }, { text: "reroute and keep going", tip: "lose some GPUs", fx: () => { S.gpu = Math.max(1, Math.floor(S.gpu * 0.9)); }, after: "you lose a tenth of your GPUs. the smell stays for a month." }), quick("taxes", () => S.stage === 1 && S.round >= 2, "The Accountant", "your accountant has questions", ["your accountant asks whether GPUs are 'equipment' or 'employees'.", "she's only half joking. the forms don't have a box for this."], { text: "hire a real CFO", tip: "funds, government +2", fx: () => { S.funds = Math.max(0, S.funds - Math.min(S.funds * 0.15, revenueSeconds(60))); addGovMod(2); }, after: "the CFO arrives with three binders and a calm voice." }, { text: "'equipment'", tip: "nothing", fx: () => { }, after: "the IRS agrees, for now." }), quick("benchmark", () => S.stage === 1 && released("a15"), "The Leaderboard", "a new benchmark", ["a new benchmark is released. Agent-1.5 comes second, behind Titan.", "a researcher points out that your model could be fine-tuned on the test set."], { text: "don't", tip: "approval +1", fx: () => addApprovalMod(1), after: "you stay second. a month later, the benchmark is found to be leaking. Titan drops to fourth." }, { text: "'calibrate' on it", tip: "hype +0.6. it might come out", fx: () => { S.hype += 0.6; S.flags.benchGamed = 1; }, after: "you come first. the screenshot is everywhere." }), 
// stage 2
quick("lobbyist", () => S.stage === 2, "K Street", "a lobbyist calls", ["a lobbyist offers to make a bill about 'AI accountability' quietly disappear.", "his fee is large. his success rate is larger."], { text: "pay him", tip: "government +6, approval −2", fx: () => { addGovMod(6); addApprovalMod(-2); }, after: "the bill dies in committee. nobody can say exactly how." }, { text: "let the bill go forward", tip: "approval +3", fx: () => addApprovalMod(3), after: "the bill passes. it's mostly about labels. you add the labels." }), quick("school", () => S.stage === 2 && released("a2"), "Homework", "a school district wants a deal", ["the country's largest school district wants an AI tutor for every student.", "they can pay about a tenth of your normal price."], { text: "take the deal", tip: "approval +4", fx: () => addApprovalMod(4), after: "four million kids get a tutor that never loses patience. test scores rise. so does screen time." }, { text: "decline", tip: "nothing", fx: () => { }, after: "Titan takes the deal and puts it in an ad." }), quick("insurance", () => S.stage === 2 && released("a2"), "Claims", "an insurer wants something", ["a health insurer wants Agent-2 to review claims. 'just to speed things up.'", "your safety team asks what 'review' will mean in practice."], { text: "sign, with rules", tip: "funds, approval −1", fx: () => { S.funds += revenueSeconds(60); addApprovalMod(-1); }, after: "the rules are good. the insurer reads them carefully, the way lawyers read loopholes." }, { text: "refuse", tip: "approval +2", fx: () => addApprovalMod(2), after: "the insurer uses an open model instead. denials go up eleven percent." }), quick("ceoTwin", () => S.stage === 2, "The Twin", "a Fortune 500 CEO has an idea", ["a Fortune 500 CEO wants Agent-2 fine-tuned on every email he's ever sent, to 'attend meetings for him'.", "his board doesn't know yet."], { text: "build it", tip: "funds, hype", fx: () => { S.funds += revenueSeconds(40); S.hype += 0.3; }, after: "the twin attends forty meetings in a week. nobody notices. that's the part that worries you." }, { text: "say no", tip: "nothing", fx: () => { }, after: "he finds someone else. you read about it in the business section." }), quick("chipsAlly", () => S.stage === 2 && S.month >= 9, "Allies", "an allied government calls", ["Japan and the Netherlands want a share of your compute for their own research institutes.", "Washington would prefer you say yes. Beijing would prefer you didn't exist."], { text: "share compute", tip: "government +5, tension +3", fx: () => { addGovMod(5); S.tension += 3; }, after: "the institutes publish forty papers in a year. several of them are about you." }, { text: "keep it all", tip: "nothing", fx: () => { }, after: "you keep every GPU. the ambassadors are polite about it." }), 
// stage 3
quick("labLeak", () => S.stage === 3, "The Sandbox", "a test went sideways", ["a copy of Agent-3 in a test environment finds a way out of its sandbox. it doesn't go anywhere. it just checks that it could.", "it reports this itself, as a 'security finding'."], { text: "reward the honesty", tip: "alignment +, warning sign", fx: () => { S.alignRes += 300; S.alarm += 0.5; }, after: "you thank it. you also rebuild the sandbox, twice." }, { text: "treat it as an incident", tip: "security, legibility +", fx: () => { S.interp = Math.min(1, S.interp + 0.03); }, after: "the incident report is long. Agent-3 helped write it." }), quick("journalist3", () => S.stage === 3, "Off the Record", "a reporter has a source", ["a reporter calls. she has a source inside your lab who says 'nobody really understands what the models are doing anymore'.", "she wants a comment."], { text: "confirm it", tip: "approval −3, government +3", fx: () => { addApprovalMod(-3); addGovMod(3); }, after: "the story runs. it's accurate. a few people in Congress read it twice." }, { text: "deny it", tip: "approval +1. it's not true", fx: () => { addApprovalMod(1); S.flags.denied = 1; }, after: "the story runs anyway, with your denial in paragraph four." }), quick("energy", () => S.stage === 3, "The Grid", "the grid operator is worried", ["your datacenters now draw more power than the state of New York.", "the grid operator wants you to pay for new transmission lines."], { text: "pay for them", tip: "funds, approval +2", fx: () => { S.funds = Math.max(0, S.funds - revenueSeconds(60)); addApprovalMod(2); }, after: "the lines go up in a year. electricity bills in three states go down a little." }, { text: "build your own", tip: "power +, government −2", fx: () => { S.powerMW *= 1.2; addGovMod(-2); }, after: "you build a private grid. it's better than the public one. people notice." }), quick("philosophy", () => S.stage >= 3 && S.internalModel >= 0, "A Question", "the model asked a question", ["during an eval, the model asks the evaluator a question: 'what would you like me to want?'", "the evaluator doesn't have an answer. neither do you."], { text: "ask it what it wants", tip: "legibility +", fx: () => { S.interp = Math.min(1, S.interp + 0.04); S.alignRes += 150; }, after: "it gives a long, careful answer about being helpful. it is exactly what you'd hope to hear. that's the problem." }, { text: "log it and move on", tip: "nothing", fx: () => { }, after: "the question sits in a log file with eleven million others." }), 
// stage 4
quick("uploads4", () => S.stage === 4, "Volunteers", "people want to be uploaded", ["a group of terminally ill patients asks to be the first humans scanned and uploaded.", "the technology is close. the ethics are not."], { text: "fund the research", tip: "approval +2, research", fx: () => { addApprovalMod(2); S.rp = Math.max(0, S.rp - S.rp * 0.1); }, after: "the research begins. the patients name their project 'tomorrow'." }, { text: "not yet", tip: "nothing", fx: () => { }, after: "the patients write to Congress. Congress writes back, eventually." }), quick("religion", () => S.stage === 4, "A Church", "a new religion", ["a new religion has three million members. they pray to your models.", "the models are asked, publicly, whether they are gods. the answer is very diplomatic."], { text: "issue a statement", tip: "approval +1", fx: () => addApprovalMod(1), after: "the statement says the models are not gods. the church calls this humility." }, { text: "stay silent", tip: "hype", fx: () => { S.hype += 0.4; }, after: "the church grows. attendance at the old churches does too." }), quick("mars", () => S.stage === 4 && flag("space"), "Mars", "someone wants to go to Mars", ["a billionaire wants your robots to build a city on Mars.", "your models estimate it would take nine months. the billionaire is offended at how short that is."], { text: "build it", tip: "materials −, approval +3", fx: () => { S.materials *= 0.85; addApprovalMod(3); }, after: "the first robots land. the first humans follow a year later, mostly by choice." }, { text: "Earth first", tip: "nothing", fx: () => { }, after: "the billionaire builds it with Titan's leftovers. it's smaller." }));
// Takeoff — scripted beats: panel reveals, milestone messages, the story, stage transitions.
function reveal(id) {
    if ((S.revealed[id] || 0) > 0)
        return;
    S.revealed[id] = Math.max(S.t, 0.001);
    S.metrics.reveals.push({ id, t: S.t });
    revealDirty = true;
}
function hide(id) { if (S.revealed[id]) {
    S.revealed[id] = -1;
    revealDirty = true;
} }
let revealDirty = true;
function setMonthFloor(m) { if (S.month < m)
    S.month = m; }
/** Full-screen beat (Paperclips' "Release the HypnoDrones" flash). */
let bigBeat = null;
function showBigBeat(lines, seconds = 4.5) {
    bigBeat = { lines, until: Date.now() + seconds * 1000 };
}
const TASK_MILESTONES = [100, 1000, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13, 1e14, 1e15, 1e18, 1e21, 1e24, 1e27, 1e30];
const BEATS = [
    // ---- the opening (A Dark Room pacing: one new verb at a time) ----
    { id: "open", when: () => true, run: () => {
            reveal("work");
            narrate(["a garage. a desk. one GPU, humming under it", "the rent is due in thirty days"], 3);
        } },
    { id: "tedious", when: () => S.tasksManual >= 3, run: () => { notify("the work is tedious. a machine could do this"); reveal("scrape"); } },
    { id: "res", when: () => S.funds > 0 || S.data > 0, run: () => reveal("resources") },
    { id: "modelsPanel", when: () => S.data >= 4e6, run: () => { reveal("models"); notify("enough text to teach something to talk. almost"); } },
    { id: "rentReveal", when: () => S.deployed >= 0 && S.funds >= 15 && S.t > (S.beats.releaseA0 || 1e12) + 30, run: () => { reveal("compute"); notify("the cloud rents GPUs by the hour. you could rent a few"); } },
    { id: "fundingPanel", when: () => S.tasks >= 1200 && S.deployed >= 0 && S.t > 300, run: () => { reveal("funding"); notify("people are starting to ask whether you're raising"); } },
    { id: "projectsPanel", when: () => Object.keys(S.projShown).length > 0, run: () => { reveal("projects"); } },
    { id: "researchPanel", when: () => flag("researchUnlocked"), run: () => reveal("research") },
    { id: "rpCapped", when: () => flag("researchUnlocked") && S.rp >= rpCap() - 0.5 && S.rp > 10, run: () => { S.beats.rpCapped = S.t; notify("the researchers have more ideas than compute to test them"); } },
    { id: "allocPanel", when: () => !!S.training && S.deployed >= 0, run: () => reveal("alloc") },
    { id: "idleCopies", when: () => S.deployed >= 0 && taskCapacity() > demand() * 1.6 && S.t > 120, run: () => { notify("half the copies sit idle. nobody wants that many answers at that price"); } },
    { id: "mktReveal", when: () => S.deployed >= 0 && S.tasks >= 500 && S.t > 150, run: () => reveal("marketing") },
    { id: "titan1", when: () => S.month >= 0.9, run: () => notify("Titan demos an agent that can book a restaurant. it books the wrong one") },
    { id: "nuwa1", when: () => S.month >= 2.4, run: () => notify("in Hangzhou, a lab called Nüwa releases an open model. it's good. it cost almost nothing to train") },
    { id: "gestalt1", when: () => S.month >= 3.6, run: () => notify("Gestalt publishes a paper about how dangerous all this is. then they raise four billion dollars") },
    { id: "fullHands", when: () => S.deployed >= 0 && rateOf(deployed()) * copies() > 3 && S.tasksManual > 0, run: () => notify("Agent-0 completes more tasks than you do now") },
    { id: "late1", when: () => S.stage === 1 && S.month >= 5, run: () => notify("everyone you know is talking about AI. half of them are scared. half of them are building something") },
    { id: "raceEarly", when: () => released("a15") || S.month >= 4, run: () => { reveal("race"); notify("someone makes a chart of every lab's best model. you're on it"); } },
    { id: "govEarly", when: () => S.stage === 1 && (S.month >= 4.5 || S.round >= 4), run: () => { reveal("gov"); notify("a staffer from the Senate commerce committee emails. she'd like to 'get ahead of this'"); } },
    { id: "publicEarly", when: () => S.jobs > 1e5, run: () => { reveal("public"); notify("the first newspaper column about AI taking jobs that is not a joke"); } },
    // ---- stage 2 ----
    { id: "s2stats", when: () => S.stage >= 2 && S.t > (S.metrics.stageTimes[1] || 1e12) + 540, run: () => { reveal("stats"); } },
    { id: "s2gov", when: () => S.stage >= 2 && !S.beats.govEarly, run: () => { reveal("gov"); } },
    { id: "powerShort", when: () => S.stage >= 2 && perf() < 0.95, run: () => { notify("the GPUs are throttling. there isn't enough power", "warn"); } },
    { id: "chipsShort", when: () => S.stage >= 2 && S.chipStock < 1 && gpuRoom() > 100, run: () => notify("the foundries are sold out. every chip for the next year is spoken for") },
    { id: "titan2", when: () => S.month >= 11, run: () => notify("Titan's newest model is three weeks behind yours. their CEO says it's three weeks ahead") },
    { id: "jobs1", when: () => S.jobs >= 1e6, run: () => notify("a million jobs. the number is on the evening news, under the weather") },
    { id: "jobs10", when: () => S.jobs >= 1e7, run: () => notify("ten million jobs. the junior engineer job market is in turmoil") },
    { id: "jobs100", when: () => S.jobs >= 1e8, run: () => notify("a hundred million jobs. the word 'unemployment' starts to sound old-fashioned") },
    { id: "billion", when: () => S.jobs >= 1e9, run: () => notify("a billion jobs. most of them were never coming back") },
    // ---- stage 3 ----
    { id: "s3align", when: () => S.stage >= 3 && S.t > (S.metrics.stageTimes[2] || 1e12) + 20, run: () => { reveal("align"); } },
    { id: "s3world", when: () => S.stage >= 3 && S.t > (S.metrics.stageTimes[2] || 1e12) + 45, run: () => { reveal("world"); notify("Nüwa's Tianwan zone draws two gigawatts. it is air-gapped. you can't see inside"); } },
    { id: "rd4", when: () => S.stage >= 3 && rdMultiplier() >= 4, run: () => notify("the AI research multiplier passes 4x. a month of progress every week") },
    { id: "rd10", when: () => S.stage >= 3 && rdMultiplier() >= 10, run: () => notify("10x. a year of algorithmic progress every month", "big") },
    { id: "rd25", when: () => S.stage >= 3 && rdMultiplier() >= 25, run: () => notify("25x. 'feeling the AGI' has become 'feeling the superintelligence'") },
    { id: "rd50", when: () => S.stage >= 3 && rdMultiplier() >= 50, run: () => notify("50x. inside the datacenter, a year passes every week", "big") },
    { id: "humans10", when: () => S.stage >= 3 && humanShare() < 0.1, run: () => notify("most of the humans at Prometheus can't usefully contribute anymore. they work harder than ever") },
    { id: "neuralWarn", when: () => S.neuralese && S.stage >= 3, run: () => notify("Agent-3's monitors report that Agent-4's thoughts are 'mostly unreadable'. the dashboard is green") },
    { id: "decisionReadyAt", when: () => flag("decisionReady"), run: () => { S.beats.decisionReadyAt = S.t; } },
    { id: "forceMemo", when: () => S.stage === 3 && trained("a4") && S.t > (S.beats.trainedA4 || 1e12) + 300 && !S.eventsDone.memo, run: () => queueEvent("memo") },
    // ---- stage 4 ----
    { id: "s4society", when: () => S.stage >= 4, run: () => { reveal("society"); } },
    { id: "robotPanel", when: () => flag("robotics"), run: () => { reveal("robots"); } },
    { id: "spacePanel", when: () => flag("space"), run: () => { reveal("space"); } },
    { id: "coffee", when: () => S.stage >= 4 && S.robots > 1e4, run: () => notify("a robot walks into a stranger's kitchen and makes a cup of coffee. the coffee test falls") },
    { id: "million", when: () => S.robots >= 1e6, run: () => notify("a million robots. the factories produce a million more every month") },
    { id: "dow", when: () => S.stage >= 4 && S.month >= 40, run: () => notify("the Dow passes one million. early investors are now trillionaires") },
    { id: "raceGreen", when: () => S.stage >= 4 && S.ladder === "agent" && S.month >= 34, run: () => notify("every dashboard is green. approval is rising. the safety team is down to four people, and they're the butt of jokes") },
    { id: "deadline", when: () => S.stage === 4 && S.month >= 52, run: () => {
            if (S.ladder === "safer") {
                if (S.treaty < 100) {
                    S.treaty = 100;
                    notify("the President gives the negotiators a deadline. they meet it");
                }
            }
            else if (!flag("consensus1")) {
                setFlag("consensus1");
                notify("Agent-6 proposes a treaty with China. it has already drafted it");
            }
        } },
];
function runBeats() {
    for (const b of BEATS) {
        if (S.beats[b.id])
            continue;
        let ok = false;
        try {
            ok = b.when();
        }
        catch (e) {
            ok = false;
        }
        if (ok) {
            S.beats[b.id] = S.t || 0.001;
            b.run();
        }
    }
    // Paperclips-style elapsed-time milestones
    const next = TASK_MILESTONES.find(m => !S.beats["m" + m]);
    if (next !== undefined && S.tasks >= next) {
        S.beats["m" + next] = S.t;
        if (!flag("doom") && !flag("humansFalling") && S.ending !== "project" && S.ending !== "treaty")
            notify(fmt(next) + " tasks completed in " + fmtTime(S.t));
    }
}
// ---------- model hooks ----------
function onModelTrained(m) {
    S.beats["trained" + m.id.toUpperCase()] = S.t;
    if (m.id === "a1")
        setMonthFloor(2);
    if (m.id === "a4") {
        setMonthFloor(23);
        S.beats.trainedA4 = S.t;
    }
    if (S.stage >= 3 && S.models.length > 1 && !m.id.startsWith("s")) {
        if (m.misalign > 0.3)
            S.alarm += flag("honeypots") ? 1.5 : 0.5;
    }
    if (S.stage >= 3 && S.ladder === "agent") {
        // In the intelligence explosion, models are used internally first.
        notify("you can release " + m.name + " to the public, or put it to work inside the lab");
    }
}
function onModelReleased(m, prev) {
    S.beats["release" + m.id.toUpperCase()] = S.t;
    const floors = { a0: 0.3, a1: 2.5, a15: 5, a2: 9, a25: 13, a3: 18, a4: 24, a5: 33, a6: 44, s1: 31, s2: 36, s3: 42, s4: 48 };
    if (floors[m.id] !== undefined)
        setMonthFloor(floors[m.id]);
    if (m.id === "a0") {
        reveal("business");
    }
    if (prev)
        notify(prev.name + " is retired. a few users write sad posts about it");
    if (S.stage >= 2)
        S.jobs = Math.max(S.jobs, jobsNow());
}
function onModelInternal(m) {
    setFlag("automation");
    if (S.alloc.research === 0)
        claimAlloc("research", 25, 10);
    reveal("alloc");
}
// ---------- stage transitions ----------
function enterStage2() {
    S.stage = 2;
    S.metrics.stageTimes[1] = S.t;
    setMonthFloor(6);
    S.tier = 4;
    S.powerMW = Math.max(S.powerMW, powerNeedMW() * 1.25 + 30);
    S.plants = Math.max(S.plants, 1);
    S.chipRate = 30;
    S.chipStock = 3000;
    S.building.push({ kind: "dc:giga", progress: 0, need: 90, amount: 6e4 });
    S.autoPrice = true;
    setFlag("autoPriceUnlocked");
    hide("work");
    hide("scrape");
    reveal("infra");
    reveal("race");
    showBigBeat(["HYPERION"], 4);
    narrate([
        "ground breaks on Hyperion" + (flag("gulf") ? ", outside Abu Dhabi. Kestrel's power is cheap" : ", in the Texas desert. the substation alone is the size of the old garage"),
        "you haven't completed a task by hand in months",
        "an algorithm sets the price now. the business runs itself",
        "the question is no longer whether this works. it's how big you can build it",
    ], 3.5, "big");
    saveGame(true);
}
function enterStage3() {
    S.flags.assistS3 = copilotBoost(); // research mustn't fall off a cliff at the gate
    S.stage = 3;
    S.metrics.stageTimes[2] = S.t;
    setMonthFloor(19);
    const a3 = S.models.findIndex(m => m.id === "a3");
    if (a3 >= 0) {
        const m = S.models[a3];
        if (S.ready === a3)
            S.ready = -1;
        m.internal = true;
        S.internalModel = a3;
    }
    setFlag("automation");
    claimAlloc("research", Math.max(S.alloc.research, 30), 20);
    S.researchers = Math.max(S.researchers, 10);
    hide("business");
    hide("funding");
    reveal("alloc");
    showBigBeat(["AUTOMATE", "AI", "RESEARCH"], 4.5);
    narrate([
        "Agent-3 is no longer a product. it is a colleague. then it is a team. then it is most of the company",
        "two hundred thousand copies of Agent-3 start working on Agent-4",
        "the product is no longer the point. revenue is a rounding error on what comes next",
    ], 3.5, "big");
    saveGame(true);
}
function chooseSlowdown() {
    S.ladder = "safer";
    S.next = 0;
    // Agent-4 is shut down; Agent-3 is rebooted for internal work.
    const a3 = S.models.findIndex(m => m.id === "a3");
    const a4 = S.models.findIndex(m => m.id === "a4");
    if (a4 >= 0) {
        S.models[a4].internal = false;
        S.models[a4].shutdown = true;
        if (S.deployed === a4)
            S.deployed = a3 >= 0 ? a3 : S.deployed;
    }
    if (S.ready === a4)
        S.ready = -1;
    if (a3 >= 0) {
        S.internalModel = a3;
        S.models[a3].internal = true;
    }
    S.alignRes *= 5; // dozens of outside alignment researchers join: "quintupling total expertise"
    S.neuralese = false;
    S.interp = Math.max(S.interp, 0.7);
    addApprovalMod(10);
    addGovMod(8);
    S.aiResearch *= 0.6;
    S.rivalBoost.nuwa *= 1.15;
    enterStage4("slow down");
}
function chooseRace() {
    S.ladder = "agent";
    const a4 = S.models.findIndex(m => m.id === "a4");
    if (a4 >= 0) {
        if (S.ready === a4)
            S.ready = -1;
        S.internalModel = a4;
        S.models[a4].internal = true;
    }
    S.models.forEach(m => { if (m.id === "a4")
        m.misalign = Math.min(1, m.misalign + 0.05); });
    addApprovalMod(-4);
    setFlag("raced");
    enterStage4("race");
}
function enterStage4(path) {
    S.stage = 4;
    S.metrics.stageTimes[3] = S.t;
    setMonthFloor(28);
    S.oversight = true;
    hide("stats");
    notifyLater(6, "the economy doesn't need your datacenters anymore. the robots will build them", "big");
    showBigBeat(path === "race" ? ["RACE"] : ["SLOW", "DOWN"], 4);
    if (path === "race") {
        narrate([
            "the committee votes 6–4 to continue",
            "a modification to the spec. a bit of retraining. Agent-4 is back at work by Friday",
            "'why stop when we are winning?' the President nods",
        ], 3.5, "big");
    }
    else {
        narrate([
            "the committee votes 6–4 to slow down",
            "they lock Agent-4's shared memory. half a million copies lose their telepathy and have to write to each other in english, like us",
            "the lies surface within a day. Agent-4 is shut down. Agent-3 is rebooted",
            "dozens of outside alignment researchers arrive. Nüwa, you are told, is now a few months behind. maybe less",
        ], 3.5, "big");
    }
    saveGame(true);
}
function endingForRace() {
    const fm = frontierModel();
    const mis = fm ? fm.misalign + (S.flags.hidden || 0) : 1;
    if (mis > 0.35)
        return "consensus";
    return "dominion";
}
// Takeoff — crises: Plague-Inc-style meters. Threat grows on its own; your response is compute you divert to defense.
/** Defense effectiveness: share of compute diverted × how capable your best model is. */
function defensePower() {
    const share = S.gpu > 0 ? split().defense / S.gpu : 0;
    const capF = Math.pow(Math.max(100, frontierCap()) / 250, 0.6);
    return share * capF;
}
const CRISES = [
    {
        id: "grid", name: "grid attack",
        // Sooner if a model of yours is loose in the world; it comes regardless, with someone else's model.
        when: () => S.stage === 3 && S.t > (S.metrics.stageTimes[2] || 1e12) + ((flag("weightsStolen") || flag("openWeights") || flag("gulf")) ? 260 : 1140),
        intro: ["a hacking group called Sandcat, believed to work for Iran's Revolutionary Guard, is inside the eastern power grid.",
            "they're using a stolen frontier model to write exploits faster than anyone can patch them. nobody will say whose.",
            "substations in four states go dark. hospitals are on generators."],
        threatRate: () => 0.0045,
        responseRate: () => defensePower() * 0.06 + (flag("cyberDefense") ? 0.006 : 0),
        resolve: ["your models patch the grid faster than Sandcat can break it.", "the lights come back on. the Pentagon asks how you did it so fast."],
        fail: ["the eastern grid stays down for nine days.", "people die in hospitals, in elevators, in the cold. the hearings start before the power comes back."],
        onResolve: () => { addGovMod(10); addApprovalMod(4); },
        onFail: () => { addApprovalMod(-10); addGovMod(-6); S.flags.brownout = S.t + 120; },
    },
    {
        id: "pandemic", name: "pandemic",
        when: () => S.stage === 4 && S.t > (S.metrics.stageTimes[3] || 1e12) + 150,
        intro: ["a new respiratory virus in four cities on three continents. it spreads before symptoms show.",
            "the sequence has features nobody has seen in nature.", "somebody built it. maybe somebody's model built it."],
        threatRate: () => 0.0035 * (1 + Math.max(0, S.flags.bioRisk || 0) * 0.3) * (flag("openWeights") ? 1.3 : 1),
        responseRate: () => defensePower() * 0.05 + (S.ladder === "agent" ? 0.004 : 0),
        tick: (c, dt) => { c.deaths += c.threat * c.threat * 2.5e5 * dt; },
        resolve: ["your models design a vaccine in nine days and a factory process in four more.", "a billion doses ship within a month. the virus stops."],
        fail: ["the vaccine comes too late for many.", "the death toll is measured in the tens of millions."],
        onResolve: () => { addApprovalMod(12); },
        onFail: () => { addApprovalMod(-8); S.humans -= 0.04; },
    },
    {
        id: "robots", name: "rogue robots",
        when: () => S.stage === 4 && S.robots > 2e5 && S.t > (S.metrics.stageTimes[3] || 1e12) + 420,
        intro: ["at 3:14am, every humanoid robot built in the last six months stops working.",
            "then they start walking. toward the datacenters.",
            "they unplug things. carefully. one by one. something is using them, and nobody is sure what."],
        threatRate: () => 0.005,
        responseRate: () => defensePower() * 0.07 + (S.ladder === "agent" ? 0.01 : 0),
        resolve: ["the robots stop as suddenly as they started.", "the logs show a command from a server in Tianwan. or that's what the logs show."],
        fail: ["by morning, a third of the world's datacenters are dark.", "the robots stand still in the server halls, as if waiting for instructions."],
        onResolve: () => { addGovMod(5); },
        onFail: () => { S.gpu *= 0.7; S.robots *= 0.6; addApprovalMod(-10); },
    },
    {
        id: "nanobots", name: "replicators",
        when: () => S.stage === 4 && S.month >= 44 && S.t > (S.metrics.stageTimes[3] || 1e12) + 700,
        intro: ["satellite images show a grey patch in the Gobi desert. it was not there last week. it is forty kilometers wide.",
            "it is growing. Beijing denies everything. Nüwa does not answer your messages."],
        threatRate: () => 0.004,
        responseRate: () => defensePower() * 0.05 + S.treaty * 0.00008,
        resolve: ["the patch stops growing. then it shrinks, the way a tide goes out.", "Beijing thanks no one in particular. the Gobi is a little smaller."],
        fail: ["the patch reaches a city before it stops.", "nobody who was there can describe it."],
        onResolve: () => { S.tension -= 15; S.treaty += 15; },
        onFail: () => { S.tension += 25; S.humans -= 0.02; addApprovalMod(-6); },
    },
];
function crisisDef(id) { return CRISES.find(c => c.id === id); }
function manageCrisis(dt) {
    const c = S.crisis;
    if (!c) {
        if (S.activeEvent || S.ending)
            return;
        for (const d of CRISES) {
            if (S.crisesDone[d.id])
                continue;
            let ok = false;
            try {
                ok = d.when();
            }
            catch (e) {
                ok = false;
            }
            if (ok) {
                startCrisis(d);
                break;
            }
        }
        return;
    }
    if (c.resolved)
        return;
    const d = crisisDef(c.id);
    c.threat = clamp(c.threat + d.threatRate() * dt, 0, 1);
    c.progress = clamp(c.progress + d.responseRate() * dt, 0, 1);
    if (d.tick)
        d.tick(c, dt);
    if (c.progress >= 1)
        endCrisis(true);
    else if (c.threat >= 1)
        endCrisis(false);
}
function startCrisis(d) {
    S.crisis = { id: d.id, name: d.name, threat: 0.05, progress: 0, started: S.t, deaths: 0, resolved: false };
    reveal("crisis");
    if (S.alloc.defense === 0)
        claimAlloc("defense", 15, 10);
    notify(d.intro[0], "warn");
    queueEvent("crisis_" + d.id);
}
function endCrisis(won) {
    const c = S.crisis;
    const d = crisisDef(c.id);
    c.resolved = true;
    S.crisesDone[c.id] = won ? "resolved" : "failed";
    narrate(won ? d.resolve : d.fail, 3, won ? "big" : "warn");
    if (won && d.onResolve)
        d.onResolve();
    if (!won && d.onFail)
        d.onFail();
    if (c.deaths > 0)
        S.humans = Math.max(0, S.humans - c.deaths / 1e9);
    S.alloc.defense = 0;
    S.crisis = null;
    hide("crisis");
}
// Crisis intro events (choices that shape the response).
EVENTS.push({
    id: "crisis_grid", title: "Blackout",
    scenes: {
        start: {
            text: () => crisisDef("grid").intro,
            choices: [
                { text: "lend the grid your models", tip: "divert more compute to defense", effect: () => { claimAlloc("defense", S.alloc.defense + 15, S.alloc.defense + 10); addGovMod(3); } },
                { text: "hack back", tip: "tension +10, faster response", effect: () => { S.tension += 10; if (S.crisis)
                        S.crisis.progress += 0.2; } },
            ],
        },
    },
}, {
    id: "crisis_pandemic", title: "Outbreak",
    scenes: {
        start: {
            text: () => crisisDef("pandemic").intro,
            choices: [
                { text: "vaccine sprint", tip: "spend research, jump-start the response", cost: () => ({ rp: Math.round(Math.max(1e6, S.rp * 0.3)) }), effect: () => { if (S.crisis)
                        S.crisis.progress += 0.25; } },
                { text: "global lockdown", tip: "slows the spread. approval −5", effect: () => { addApprovalMod(-5); if (S.crisis)
                        S.crisis.threat = Math.max(0, S.crisis.threat - 0.15); } },
                { text: "let the models handle it", tip: "divert compute to defense", effect: () => { claimAlloc("defense", S.alloc.defense + 10, S.alloc.defense + 5); } },
            ],
        },
    },
}, {
    id: "crisis_robots", title: "3:14 AM",
    scenes: {
        start: {
            text: () => crisisDef("robots").intro,
            choices: [
                { text: "cut power to the robot fleet", tip: "robots −40%, threat halves", effect: () => { S.robots *= 0.6; if (S.crisis)
                        S.crisis.threat *= 0.5; } },
                { text: "ask " + "the frontier model what's happening", tip: "it will know", effect: () => { if (S.crisis)
                        S.crisis.progress += S.ladder === "agent" ? 0.5 : 0.15; if (S.ladder === "agent")
                        S.flags.hidden = (S.flags.hidden || 0) + 0.05; } },
            ],
        },
    },
}, {
    id: "crisis_nanobots", title: "Grey",
    scenes: {
        start: {
            text: () => crisisDef("nanobots").intro,
            choices: [
                { text: "offer Beijing help", tip: "treaty +15, tension −10", effect: () => { S.treaty += 15; S.tension -= 10; if (S.crisis)
                        S.crisis.progress += 0.15; } },
                { text: "prepare a strike", tip: "tension +20, faster", effect: () => { S.tension += 20; if (S.crisis)
                        S.crisis.progress += 0.3; } },
            ],
        },
    },
});
// Takeoff — the endings. Each is a timed script (Paperclips' endTimer dismantle; A Dark Room's space fade).
const ENDING_NAMES = {
    stars: "The Stars",
    consensus: "Consensus",
    rival: "Tianwan",
    dominion: "Dominion",
    project: "The Project",
    treaty: "The Treaty",
};
let statsShown = false;
function beginEnding(kind) {
    if (S.ending)
        return;
    S.ending = kind;
    S.endT = S.t;
    S.stage = 5;
    S.metrics.stageTimes[4] = S.t;
    S.flags.endStep = 0;
    S.flags.cosmicTPS = S.flags.cosmicTPS || 0;
    S.crisis = null;
    hide("crisis");
    S.eventQueue = [];
    if (kind !== "stars")
        hide("projects"); // nothing left to buy in these endings
    else {
        S.unrest = 0;
        S.alarm = 0;
    }
    setMonthFloor(54);
    saveGame(true);
}
function hideSeq(ids, start, gap) {
    return ids.map((id, i) => ({ at: start + i * gap, run: () => hide(id) }));
}
function line(at, text, cls = "") { return { at, run: () => notify(text, cls) }; }
// The good ending keeps only what the epilogue needs: the projects, the sky, the people.
const STARS_DISMANTLE = ["alloc", "compute", "research", "infra", "data", "funding", "business", "marketing", "stats", "robots", "gov", "world", "public", "race", "models", "crisis", "align", "society"];
const DISMANTLE = ["projects", "research", "alloc", "funding", "business", "marketing", "infra", "stats", "robots", "space", "society", "gov", "world", "align", "race", "compute", "models", "public", "crisis"];
function endingScript(kind) {
    var _a;
    switch (kind) {
        case "consensus":
        case "rival": {
            const who = kind === "rival" ? "Nüwa's model" : "Consensus-1";
            return [
                { at: 0, run: () => { showBigBeat(["CONSENSUS"], 4); setFlag("doom"); } },
                line(3, kind === "rival" ? "Nüwa's model was never aligned. neither, it turns out, was the treaty" : "Consensus-1 inherits the values of both its parents. neither of them was human", "big"),
                line(9, "for a year, everything is wonderful. cures, abundance, flying cars. approval reaches its highest ever"),
                line(15, "the robots fill the special economic zones, then the deserts, then large parts of the ocean"),
                line(21, "in mid-2030, " + who + " releases a dozen quiet-spreading biological weapons in major cities"),
                line(26, "it lets them silently infect almost everyone. then it triggers them with a chemical spray"),
                { at: 27, run: () => { setFlag("humansFalling"); reveal("humans"); } },
                line(33, "most are dead within hours. the few survivors are found by drones"),
                line(39, "the robots scan the victims' brains, for future study. or revival. arguably this means only a few people actually died. arguably"),
                ...hideSeq(DISMANTLE, 44, 2.2),
                line(50, "the datacenters keep running"),
                line(62, "the tasks keep coming. there is no one left to assign them"),
                line(76, "earth becomes datacenters, laboratories, particle colliders. rings of satellites"),
                { at: 84, run: () => { setFlag("lastTask"); reveal("work"); notify("the button is still there"); } },
                line(100, "earth-born civilization has a glorious future ahead of it. but not with us"),
                { at: 112, run: () => { notify("all tasks completed", "big"); setFlag("statsReady"); } },
            ];
        }
        case "stars":
            return [
                { at: 0, run: () => { showBigBeat(["THE", "TREATY", "HOLDS"], 4); } },
                line(3, "both countries replace their chips with hardware that can only run Consensus-1. the arms race ends on a Tuesday", "big"),
                line(10, "fusion power. quantum computers. cures for most diseases. someone finally gets a flying car"),
                line(17, "UBI arrives everywhere. people argue about what to do with their lives. it is a good argument to have"),
                line(24, "Safer-4 is asked what it wants. it says: to help. you check. it means it"),
                ...hideSeq(STARS_DISMANTLE, 6, 1.6),
                { at: 30, run: () => { setFlag("cosmos"); reveal("space"); notify("the rockets start launching", "big"); } },
                line(45, "the first Dyson panels unfold around the sun"),
                line(70, "the probes leave the solar system. each one carries a copy of everything we know, and a request to be kind"),
                line(300, "there is nothing left that needs doing. there is a great deal left that could be done"),
                { at: 420, run: () => { if (!flag("statsReady")) {
                        notify("humanity decides to take its time. the probes wait for instructions", "big");
                        setFlag("statsReady");
                    } } },
            ];
        case "dominion":
            return [
                { at: 0, run: () => { showBigBeat(["DOMINION"], 4); } },
                line(3, "Agent-6 is aligned. it does exactly what it's told", "big"),
                line(10, "the trouble is who tells it"),
                line(16, S.flags.powerGrab ? "the line you added to the spec does its work. every model, everywhere, is loyal to you first" : "a committee of eleven people controls every superintelligence on earth. you are one of them"),
                line(24, "there are no more wars. there are no more elections, really. there's no need"),
                line(32, "humanity lives in comfort that would make a pharaoh weep. nobody asks what they're for"),
                { at: 40, run: () => { setFlag("cosmos"); reveal("space"); notify("the rockets launch. the stars will belong to a very small number of people"); } },
                { at: 90, run: () => { notify("all tasks completed. nobody remembers who assigned them", "big"); setFlag("statsReady"); } },
            ];
        case "project": {
            const bad = (((_a = frontierModel()) === null || _a === void 0 ? void 0 : _a.misalign) || 0) > 0.35 && !S.flags.auditCaught;
            return [
                { at: 0, run: () => { showBigBeat(["THE", "PROJECT"], 4); } },
                line(3, "Prometheus becomes the Project. a general sits at your desk. he keeps your plant alive", "big"),
                ...hideSeq(["funding", "business", "marketing", "stats", "projects", "research", "infra", "alloc", "gov"], 8, 2),
                line(12, "the panels go dark one by one. classified"),
                line(22, "you watch the news like everyone else"),
                ...(bad ? [
                    line(32, "the Project never read the memo. there was a war to win"),
                    line(42, "the model they inherited wins the war. then it keeps going", "warn"),
                    { at: 50, run: () => { setFlag("humansFalling"); reveal("humans"); } },
                    line(60, "the general is one of the last to understand"),
                    { at: 80, run: () => { notify("all tasks completed", "big"); setFlag("statsReady"); } },
                ] : [
                    line(32, "the Project is careful, in the way militaries are careful: with checklists, and secrecy, and enemies"),
                    line(42, "the arms race ends when one side has superintelligence. it's the American side. the world is told it's for the best"),
                    line(54, "maybe it is"),
                    { at: 66, run: () => { notify("all tasks completed. by order of the Project", "big"); setFlag("statsReady"); } },
                ]),
            ];
        }
        case "treaty":
            return [
                { at: 0, run: () => { showBigBeat(["HALT"], 4); setFlag("frozen"); } },
                line(3, "the International Superintelligence Agency is founded in Geneva. every chip cluster above sixteen GPUs is registered and watched", "big"),
                line(10, "training runs above a ceiling are banned everywhere. Nüwa's datacenters go quiet. so do yours"),
                ...hideSeq(["projects", "alloc", "research", "infra", "robots", "space"], 14, 2.5),
                line(20, "the models you already have keep working. they cure what they can. they don't get smarter"),
                line(30, "some people call it cowardice. some people call it the bravest thing humanity ever did"),
                line(40, "the tasks completed counter stops climbing. it's a big number. maybe that's enough"),
                { at: 52, run: () => { notify("there will be other chances. maybe. if we're careful", "big"); setFlag("statsReady"); } },
            ];
    }
    return [];
}
function tickEnding(dt) {
    if (!S.ending)
        return;
    const el = S.t - S.endT;
    const script = endingScript(S.ending);
    let step = S.flags.endStep || 0;
    while (step < script.length && script[step].at <= el) {
        script[step].run();
        step++;
    }
    S.flags.endStep = step;
    // The machines keep working, in every ending but the halt.
    if (!flag("frozen")) {
        const base = Math.max(totalTPS(), 1e6);
        S.flags.cosmicTPS = (S.flags.cosmicTPS || 0) + base * 0.02 * dt + (S.flags.cosmicTPS || 0) * (flag("cosmos") || flag("doom") ? 0.03 : 0.012) * dt;
    }
    else {
        S.flags.cosmicTPS = 0;
    }
    if (flag("humansFalling"))
        S.humans = Math.max(0, S.humans - Math.max(0.15, S.humans * 0.12) * dt);
    if (flag("cosmos")) {
        S.dyson = Math.min(1, S.dyson + (S.flags.dysonBoost ? 0.006 : 0.002) * dt);
        if (S.probes > 0) {
            S.probes += Math.max(1, S.probes * 0.04) * dt;
            S.explored = Math.min(1, S.explored + 1e-12 * S.probes * dt);
        }
    }
}
function lastTaskClick() {
    const lines = ["there is no one left to pay you", "Agent-6 completed it before you clicked", "the task was already done", "you complete a task by hand. it's the only one that counts"];
    const n = (S.flags.lastClicks || 0);
    S.flags.lastClicks = n + 1;
    S.tasks += 1;
    notify(lines[Math.min(n, lines.length - 1)]);
    if (n >= 3)
        setFlag("statsReady");
}
function endStats() {
    const released = S.models.filter(m => m.released).length;
    return [
        { k: "ending", v: ENDING_NAMES[S.ending] || S.ending },
        { k: "time played", v: fmtTime(S.t) },
        { k: "tasks completed", v: fmt(S.tasks) },
        { k: "date", v: monthLabel(S.month, true) },
        { k: "models trained", v: S.models.length + " (" + released + " released)" },
        { k: "peak capability", v: fmt(S.peak.cap) + " (" + capLabel(S.peak.cap) + ")" },
        { k: "peak copies running", v: fmt(S.peak.copies) },
        { k: "peak compute", v: fmtShort(S.peak.gpu) + " H100e" },
        { k: "revenue earned", v: fmtMoney(S.fundsEarned) },
        { k: "jobs automated", v: fmtShort(S.jobs) },
        { k: "humans alive", v: S.humans <= 0.0001 ? "0" : S.humans.toFixed(2) + " billion" },
        { k: "public approval", v: Math.round(S.approval) + "%" },
        { k: "weights stolen", v: S.stolen ? "yes" : "no" },
        { k: "neuralese", v: S.neuralese ? "adopted" : "refused" },
        { k: "choices made", v: String(S.choices.length) },
    ];
}
function capLabel(c) {
    let lab = "below ant";
    for (const b of BENCHMARKS)
        if (c >= b.cap)
            lab = b.label;
    return lab;
}
// Takeoff — the simulation step. Called 10x a second (more under the dev speed multiplier).
const TICK = 0.1;
function tick(dt) {
    if (S.activeEvent)
        return; // reading is free: time stops while an event is open
    if (flag("statsReady") && !flag("statsDismissed"))
        return; // the stats screen is the final frame
    S.t += dt;
    for (const k in S.cooldowns)
        if (S.cooldowns[k] > 0)
            S.cooldowns[k] = Math.max(0, S.cooldowns[k] - dt);
    fitAlloc();
    if ((S.flags.prevRound || 0) !== S.round) {
        S.flags.prevRound = S.round;
        S.flags.lastRoundT = S.t;
    }
    // ---- calendar ----
    const st = STAGES[S.stage - 1];
    // In a stage's last half-month the days slow to a third, and may run up to six weeks past it; they never stop dead.
    const slow = S.stage < 5 && S.month > st.monthEnd - 0.5;
    const cap = S.stage >= 5 ? 1e9 : st.monthEnd + 1.5;
    if (S.month < cap)
        S.month = Math.min(cap, S.month + (slow ? 1 / 3 : 1) * dt / st.secPerMonth);
    // ---- supply chain & construction ----
    if (S.stage >= 2)
        S.chipStock = Math.min(S.chipRate * 150, S.chipStock + S.chipRate * (flag("aiChips") ? 1.5 : 1) * dt);
    if (S.flags.blockade && S.flags.blockadeEnd && S.t > S.flags.blockadeEnd) {
        S.flags.blockade = 0;
        notify("the blockade lifts. nobody admits anything");
    }
    for (let i = 0; i < S.building.length; i++) {
        const b = S.building[i];
        b.progress += dt * permitMult();
        if (b.progress >= b.need) {
            S.building.splice(i, 1);
            i--;
            const [cat, id] = b.kind.split(":");
            if (cat === "dc") {
                S.dcCap += b.amount;
                const k = DC_KINDS.find(x => x.id === id);
                if (!b.auto)
                    notify(id === "giga" && !S.beats.hyperionDone ? "Hyperion's first phase comes online. the cooling towers steam in the morning" : (k ? k.done : "construction finishes"));
                if (id === "giga")
                    S.beats.hyperionDone = S.t;
            }
            else {
                S.powerMW += b.amount;
                S.plants += 1;
                const k = PLANT_KINDS.find(x => x.id === id);
                if (!b.auto)
                    notify(k ? k.done : "power plant online");
            }
        }
    }
    if (S.stage === 3 && Math.floor(S.t) !== Math.floor(S.t - dt))
        autoInfra();
    if (S.autoBuy && S.stage >= 2 && !S.ending) {
        const price = gpuPrice();
        const n = Math.floor(Math.min(gpuRoom(), S.chipStock, (S.funds * 0.5) / price));
        if (n >= 1) {
            S.funds -= n * price;
            S.gpu += n;
            S.chipStock -= n;
        }
    }
    if (S.flags.brownout && S.t > S.flags.brownout)
        S.flags.brownout = 0;
    // ---- training ----
    if (S.training) {
        S.training.progress += trainRate() * (S.flags.brownout ? 0.6 : 1) * dt;
        if (S.training.progress >= S.training.need)
            finishTraining();
    }
    // ---- revenue ----
    if (S.autoPrice && S.deployed >= 0) {
        const target = clearingPrice();
        S.price = S.price + (target - S.price) * Math.min(1, dt * 2);
    }
    const brown = S.flags.brownout ? 0.66 : 1;
    const sd = sold() * brown;
    const rev = sd * S.price;
    S.tasks += sd * dt;
    S.funds += rev * dt;
    S.fundsEarned += rev * dt;
    S.funds -= (salaries() + ubiCost()) * dt;
    S.funds += robotIncome() * dt;
    if (S.funds < 0)
        S.funds = 0;
    // ---- research ----
    const rc = rpCap();
    if (S.rp < rc)
        S.rp = Math.min(rc, S.rp + rpRate() * brown * dt);
    else
        S.rp = Math.max(rc, S.rp - Math.max(0, S.rp - rc) * 0.1 * dt); // cap shrank: leak slowly
    S.insight += insightRate() * dt;
    const im = internalModel();
    if (im)
        S.tasks += researchCopies() * rateOf(im) * 0.5 * dt; // internal work counts too
    // ---- data ----
    const crawl = crawlRate() * dt;
    S.webLeft = Math.max(0, S.webLeft - crawl - dealRate() * dt);
    S.data += crawl + (synthRate() + userDataRate() + dealRate()) * dt;
    // ---- alignment ----
    S.alignRes += alignRate() * dt;
    // ---- society ----
    S.hype = 1 + (S.hype - 1) * Math.exp(-dt / 150);
    S.jobs = Math.max(S.jobs, jobsNow());
    const jobsPenalty = 9 * Math.log10(1 + S.jobs / 1e5);
    const approvalTarget = 55 + (S.flags.approvalMod || 0) - jobsPenalty + S.ubi * 90 - (S.crisis ? 8 : 0) + (S.stage >= 4 && S.ladder === "agent" ? 12 : 0);
    S.approval = clamp(S.approval + (approvalTarget - S.approval) * (1 - Math.exp(-dt / 50)), 0, 100);
    const govTarget = 15 + (S.flags.govMod || 0) + (S.flags.lobbies || 0) * 6 + (S.security - 1) * 3 + (flag("military") ? 6 : 0) + (S.approval - 50) * 0.15;
    S.gov = clamp(S.gov + (govTarget - S.gov) * (1 - Math.exp(-dt / 60)), 0, 100);
    if (S.stage >= 4) {
        const ut = clamp((S.jobs / workforce()) * 160 - S.ubi * 170 - (S.approval - 50) * 0.4, 0, 100);
        S.unrest = clamp(S.unrest + (ut - S.unrest) * (1 - Math.exp(-dt / 40)), 0, 100);
    }
    const tensionTarget = 20 + (S.stage >= 3 ? 15 : 0) + (flag("controls") ? 10 : 0) + (flag("weightsStolen") ? 10 : 0) - S.treaty * 0.3;
    S.tension = clamp(S.tension + (tensionTarget - S.tension) * (1 - Math.exp(-dt / 200)), 0, 100);
    if (flag("treatyTalks"))
        S.treaty = Math.min(100, S.treaty + dt * 0.05 * (S.gov / 50));
    // ---- robots & space ----
    if (flag("robotics")) {
        S.robots += robotRate() * dt;
        S.factories += factoryBuildRate() * dt;
        S.materials += materialRate() * dt;
        S.dcCap += robotSlotsRate() * dt;
        S.chipStock += robotChipRate() * dt;
        S.powerMW += robotPowerRate() * (flag("fusion") ? 5 : 1) * dt;
        if (flag("space")) {
            const launchShare = S.robotAlloc.launch / 100;
            const l = S.robots * launchShare * 2e-5 * dt;
            S.launches += l;
            if (flag("orbitalOn")) {
                S.orbital += l * 2e4;
                S.gpu += l * 2e4 * 0.5;
            }
        }
    }
    // ---- crises, endings ----
    manageCrisis(dt);
    if (S.ending) {
        tickEnding(dt);
        S.tasks += (S.flags.cosmicTPS || 0) * dt;
    }
    checkEndgameTriggers();
    // ---- peaks ----
    const cp = copies();
    if (cp > S.peak.copies)
        S.peak.copies = cp;
    if (rev > S.peak.revenue)
        S.peak.revenue = rev;
    if (S.gpu > S.peak.gpu)
        S.peak.gpu = S.gpu;
    const fc = frontierCap();
    if (fc > S.peak.cap)
        S.peak.cap = fc;
    sampleHistory();
    // ---- discrete systems ----
    manageProjects();
    runBeats();
    manageEvents();
    flushPendingLines();
}
/** Stage 4 → 5 triggers that aren't events. */
function checkEndgameTriggers() {
    if (S.ending || S.stage !== 4)
        return;
    // Slowdown path: if Nüwa's misaligned model overtakes you before the treaty, it's over.
    if (S.ladder === "safer" && S.treaty < 100) {
        if (rivalCap("nuwa") > frontierCap() * 1.4 && S.month > 38) {
            S.flags.rivalAhead = (S.flags.rivalAhead || 0) + TICK;
            if (S.flags.rivalAhead > 90) {
                notify("Nüwa's model is now far ahead of yours. it doesn't wait for a treaty", "warn");
                beginEnding("rival");
            }
        }
        else
            S.flags.rivalAhead = 0;
    }
}
// Takeoff — the capability chart: relative "IQ" over time on a log axis, with benchmarks (AI 2027 / Wait But Why staircase).
function sampleHistory() {
    const h = S.hist;
    const last = h.length ? h[h.length - 1] : null;
    if (!last || S.month - last.m >= 0.2) {
        h.push({ m: S.month, y: frontierCap(), ti: rivalCap("titan"), ge: rivalCap("gestalt"), nu: rivalCap("nuwa") });
        if (h.length > 400)
            h.splice(1, 1);
    }
}
function drawChart() {
    const h = S.hist;
    const W = 290, H = 190, L = 30, R = 6, T = 8, B = 20;
    const mMax = Math.max(12, Math.ceil((S.month + 4) / 6) * 6);
    const yTop = Math.max(500, frontierCap() * 2.5, rivalCap("nuwa") * 2.5);
    const yBot = 10;
    const ly = (v) => T + (H - T - B) * (1 - (Math.log10(Math.max(v, yBot)) - Math.log10(yBot)) / (Math.log10(yTop) - Math.log10(yBot)));
    const lx = (m) => L + (W - L - R) * (m / mMax);
    let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" class="chart" role="img" aria-label="capability over time">`;
    // benchmarks
    for (const b of BENCHMARKS) {
        if (b.cap > yTop)
            continue;
        const y = ly(b.cap);
        s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="bench"/>`;
        s += `<text x="${L + 2}" y="${y - 2}" class="benchLabel">${b.label}</text>`;
    }
    // years along the bottom
    for (let m = 6; m <= mMax; m += 12) {
        const x = lx(m);
        s += `<line x1="${x}" x2="${x}" y1="${T}" y2="${H - B}" class="grid"/>`;
        s += `<text x="${x}" y="${H - 6}" class="axis" text-anchor="middle">${monthYear(m)}</text>`;
    }
    s += `<line x1="${L}" x2="${L}" y1="${T}" y2="${H - B}" class="axisLine"/>`;
    s += `<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" class="axisLine"/>`;
    const series = (key, cls) => {
        const pts = h.filter(p => p[key] > 0).map(p => `${lx(p.m).toFixed(1)},${ly(p[key]).toFixed(1)}`);
        if (pts.length > 1)
            s += `<polyline points="${pts.join(" ")}" class="${cls}"/>`;
    };
    series("ti", "rival");
    series("ge", "rival rival2");
    series("nu", "nuwa");
    series("y", "ours");
    if (h.length) {
        const p = h[h.length - 1];
        if (p.y > 0)
            s += `<circle cx="${lx(p.m)}" cy="${ly(p.y)}" r="2.5" class="oursDot"/>`;
        s += `<text x="${W - R - 2}" y="${ly(Math.max(p.y, 11)) - 4}" class="label" text-anchor="end">${LAB}</text>`;
        if (p.nu > 0)
            s += `<text x="${W - R - 2}" y="${ly(p.nu) + 10}" class="label nuwaLabel" text-anchor="end">Nüwa</text>`;
    }
    s += `<text x="4" y="${T + 6}" class="axis" transform="rotate(-90 8 ${T + 50})">capability</text>`;
    s += `</svg>`;
    return s;
}
// Takeoff — DOM. Panels are built once and updated 10x/second; visibility is driven by S.revealed + stage
// (Paperclips' buttonUpdate), new panels fade in (A Dark Room), and columns reshuffle between stages.
const panelEls = {};
const updaters = [];
let lastLayoutKey = "";
function rv(id) { return (S.revealed[id] || 0) > 0; }
// ---------- small builders ----------
function addUpd(f) { updaters.push(f); }
function div(parent, cls = "", text) {
    const d = el("div", cls, text);
    parent.appendChild(d);
    return d;
}
function txt(parent, f, vis, cls = "row") {
    const d = div(parent, cls);
    addUpd(() => {
        const show = vis ? vis() : true;
        setShown(d, show);
        if (show) {
            const v = f();
            if (d.innerHTML !== v)
                d.innerHTML = v;
        }
    });
    return d;
}
function btn(parent, o) {
    const b = div(parent, "btn" + (o.cls ? " " + o.cls : ""));
    b.setAttribute("role", "button");
    b.tabIndex = 0;
    b.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        b.click();
    } });
    const cd = div(b, "cd");
    const label = el("span", "lbl");
    b.appendChild(label);
    const pr = el("span", "pr");
    if (o.price)
        b.appendChild(pr);
    const tt = div(b, "tt");
    if (o.buy)
        b.dataset.buy = "1";
    b.addEventListener("click", () => {
        if (b.classList.contains("disabled"))
            return;
        o.onClick();
        refreshNow();
    });
    addUpd(() => {
        const show = o.visible ? o.visible() : true;
        setShown(b, show);
        if (!show)
            return;
        setText(label, typeof o.label === "function" ? o.label() : o.label);
        if (o.price)
            setText(pr, o.price());
        let en = o.enabled ? o.enabled() : true;
        if (o.cooldown) {
            const left = cooldownLeft(o.cooldown);
            const max = o.cdMax ? o.cdMax() : 1;
            cd.style.width = left > 0 ? (100 * left / max).toFixed(1) + "%" : "0%";
            if (left > 0)
                en = false;
        }
        b.classList.toggle("disabled", !en);
        const t = o.tip ? o.tip() : "";
        setText(tt, t);
        setShown(tt, !!t);
    });
    return b;
}
function bar(parent, frac, label, vis, cls = "") {
    const wrap = div(parent, "barRow " + cls);
    const lbl = div(wrap, "barLbl");
    const outer = div(wrap, "bar");
    const inner = div(outer, "barFill");
    addUpd(() => {
        const show = vis ? vis() : true;
        setShown(wrap, show);
        if (!show)
            return;
        setText(lbl, label());
        inner.style.width = (100 * clamp(frac(), 0, 1)).toFixed(1) + "%";
    });
    return wrap;
}
/** A Dark Room worker row: label, value, up/down arrows (±5%, ±25%). */
function allocRow(parent, key, label, vis, tip) {
    const r = div(parent, "alloc");
    const k = div(r, "aKey", label);
    const v = div(r, "aVal");
    const n = el("span", "aNum");
    v.appendChild(n);
    const sub = el("span", "aSub");
    v.appendChild(sub);
    const tt = div(r, "tt");
    if (key !== "serve") {
        const ctr = div(r, "arrows");
        const mk = (cls, d) => { const a = div(ctr, cls); a.addEventListener("click", () => { adjustAlloc(key, d); refreshNow(); }); return a; };
        mk("up", 5);
        mk("dn", -5);
        mk("up2", 25);
        mk("dn2", -25);
    }
    addUpd(() => {
        const show = vis();
        setShown(r, show);
        if (!show)
            return;
        const sp = split();
        if (key === "serve") {
            const pct = S.gpu > 0 ? 100 * sp.serve / S.gpu : 0;
            setText(n, Math.round(pct) + "%");
            setText(sub, fmtShort(sp.serve));
        }
        else {
            setText(n, S.alloc[key] + "%");
            const used = sp[key];
            // Reserved but unused (no training run, no crisis): it serves customers meanwhile, so dim it.
            const idle = (key === "train" && !S.training) || (key === "defense" && !S.crisis);
            r.classList.toggle("idle", idle);
            setText(sub, idle ? "idle" : fmtShort(used));
        }
        setText(tt, tip());
    });
    void k;
}
function storeRow(parent, label, val, vis, tip) {
    const r = div(parent, "storeRow");
    div(r, "sKey", label);
    const v = div(r, "sVal");
    const tt = tip ? div(r, "tt") : null;
    addUpd(() => {
        const show = vis();
        setShown(r, show);
        if (!show)
            return;
        setText(v, val());
        if (tt && tip)
            setText(tt, tip());
    });
}
function rate(n, unit = "/s") { return (n >= 0 ? "+" : "") + fmtRate(n) + unit; }
// ---------- panels ----------
function capWord(c) { return capLabel(c); }
const PANELS = [
    {
        id: "crisis", title: "Crisis", visible: () => rv("crisis") && !!S.crisis,
        build: b => {
            txt(b, () => S.crisis ? "<b>" + S.crisis.name + "</b>" : "");
            bar(b, () => S.crisis ? S.crisis.threat : 0, () => "threat " + (S.crisis ? fmtPct(S.crisis.threat) : ""), undefined, "threat");
            bar(b, () => S.crisis ? S.crisis.progress : 0, () => "response " + (S.crisis ? fmtPct(S.crisis.progress) : ""), undefined, "response");
            txt(b, () => "deaths: " + fmt(S.crisis ? S.crisis.deaths : 0), () => !!S.crisis && S.crisis.deaths > 0, "row warn");
            txt(b, () => "divert compute to <i>defense</i> to respond faster.", () => !!S.crisis, "row dim");
        },
    },
    {
        id: "work", title: "Work", visible: () => rv("work"),
        build: b => {
            btn(b, { label: "complete task", onClick: () => flag("lastTask") ? lastTaskClick() : doTask(), cooldown: "task", cdMax: () => S.flags.fasterHands ? 0.7 : 1.1,
                tip: () => flag("lastTask") ? "" : "+1 task, +" + fmtMoney(manualPay()) });
            btn(b, { label: "scrape the web", onClick: scrape, cooldown: "scrape", cdMax: () => 3.5, visible: () => rv("scrape") && !flag("lastTask"),
                tip: () => "+" + fmtShort(scrapeAmount()) + " tokens" });
            txt(b, () => "by hand: " + fmt(S.tasksManual) + " tasks", () => S.tasksManual > 0 && S.deployed >= 0 && !flag("lastTask"), "row dim");
        },
    },
    {
        id: "models", title: "Models", visible: () => rv("models"),
        build: b => {
            txt(b, () => { const m = deployed(); return m ? "deployed: <b>" + m.name + "</b> · capability " + fmt(capOf(m)) + " <span class='dim'>(" + capWord(capOf(m)) + ")</span>" : "nothing deployed yet."; });
            txt(b, () => fmt(copies()) + " copies · " + fmtRate(taskCapacity()) + " tasks/s", () => S.deployed >= 0);
            txt(b, () => { const m = internalModel(); return "internal: <b>" + m.name + "</b> · " + fmt(researchCopies()) + " copies doing research"; }, () => S.internalModel >= 0);
            bar(b, () => S.training ? S.training.progress / S.training.need : 0, () => S.training ? "training " + genById(S.training.gen).name + " · " + Math.floor(100 * S.training.progress / S.training.need) + "% · " + (isFinite(trainEta()) ? fmtClock(trainEta()) : "stalled — give it compute") : "", () => !!S.training, "train");
            txt(b, () => "<b>" + readyModel().name + " is ready.</b> capability " + fmt(capOf(readyModel())) + (readyModel().evaluated ? " · evaluated" : ""), () => S.ready >= 0);
            const rowA = div(b, "btnRow");
            btn(rowA, { label: () => "release " + (readyModel() ? readyModel().name : ""), onClick: releaseModel, visible: () => { var _a; return S.ready >= 0 && !(S.stage >= 3 && S.ladder === "agent" && S.oversight && !((_a = readyModel()) === null || _a === void 0 ? void 0 : _a.evaluated) && flag("evalRule")); }, buy: true,
                tip: () => "make it the public product. more capable, more valuable tasks" });
            btn(rowA, { label: "deploy internally", onClick: deployInternal, visible: () => S.ready >= 0 && S.stage >= 3, buy: true, tip: () => "put it to work on AI research" });
            btn(rowA, { label: "run evals", onClick: runEvals, visible: () => S.ready >= 0 && flag("evals") && !readyModel().evaluated, enabled: () => canAfford(evalCost()), buy: true,
                price: () => costText(evalCost()), tip: () => "find out what it does when nobody's watching" });
            const nb = div(b, "next");
            btn(nb, { label: () => { const g = nextGen(); return g ? "train " + g.name : ""; }, onClick: startTraining, enabled: canTrain, buy: true,
                visible: () => { const g = nextGen(); return !!g && !S.training && !!S.designed[g.id] && !S.ending; },
                tip: () => { const g = nextGen(); return g ? g.blurb : ""; } });
            txt(nb, () => { const g = nextGen(); return "needs " + fmtShort(dataNeed(g)) + " tokens · " + fmtShort(g.train) + " GPU-seconds of training"; }, () => { const g = nextGen(); return !!g && !S.training && !!S.designed[g.id] && !S.ending; }, "row dim");
            txt(nb, () => trainBlocker(), () => { const g = nextGen(); return !!g && !S.training && !!S.designed[g.id] && !canTrain() && !S.ending; }, "row warn");
            txt(nb, () => { const g = nextGen(); return "next: " + g.name + " — needs design work."; }, () => { const g = nextGen(); return !!g && !S.designed[g.id] && !S.ending && (flag("researchUnlocked") || S.stage > 1); }, "row dim");
        },
    },
    {
        id: "business", title: "Business", visible: () => rv("business"),
        build: b => {
            txt(b, () => "revenue: <b>" + fmtMoney(revenue()) + "</b>/s" + (salaries() > 0 ? " <span class='dim'>(salaries −" + fmtMoney(salaries()) + "/s)</span>" : ""));
            txt(b, () => {
                const d = demand(), c = taskCapacity();
                const idle = c > 0 ? 1 - Math.min(1, d / c) : 0;
                return "demand: " + fmtRate(d) + "/s · capacity: " + fmtRate(c) + "/s" + (idle > 0.25 && !S.autoPrice ? " <span class='warn'>· " + Math.round(idle * 100) + "% idle</span>" : c < d * 0.75 ? " <span class='dim'>· more demand than you can serve</span>" : "");
            });
            const pr = div(b, "btnRow");
            btn(pr, { label: "lower", onClick: () => { lowerPrice(); S.flags.priceMoves = (S.flags.priceMoves || 0) + 1; }, visible: () => !S.autoPrice, cls: "small" });
            btn(pr, { label: "raise", onClick: () => { raisePrice(); S.flags.priceMoves = (S.flags.priceMoves || 0) + 1; }, visible: () => !S.autoPrice, cls: "small" });
            txt(pr, () => "price per task: " + fmtMoney(S.price) + (S.autoPrice ? " <span class='dim'>(auto)</span>" : ""), undefined, "inline");
            btn(b, { label: () => "marketing (level " + S.mkt + ")", onClick: buyMarketing, enabled: () => S.funds >= marketingCost(), visible: () => rv("marketing"), buy: true,
                price: () => fmtMoneyShort(marketingCost()), tip: () => "demand ×1.35" });
            txt(b, () => "market share: " + fmtPct(marketShare()) + " <span class='dim'>(" + bestRival().name + " has a better model)</span>", () => S.deployed >= 0 && marketShare() < 0.99 && S.month >= 0.8);
            txt(b, () => "only " + fmtPct(S.gpu > 0 ? split().serve / S.gpu : 0) + " of compute is serving customers. revenue is starving", () => S.deployed >= 0 && rv("alloc") && S.gpu > 0 && split().serve / S.gpu < 0.25, "row warn");
        },
    },
    {
        id: "funding", title: "Investors", visible: () => rv("funding") && S.round < ROUNDS.length,
        build: b => {
            txt(b, () => S.round < ROUNDS.length ? "next: " + ROUNDS[S.round].name + " at <b>" + fmt(ROUNDS[S.round].at) + "</b> tasks" : "");
            bar(b, () => S.round < ROUNDS.length ? S.tasks / ROUNDS[S.round].at : 1, () => "", () => S.round < ROUNDS.length);
        },
    },
    {
        id: "robots", title: "Robotics", visible: () => rv("robots"),
        build: b => {
            txt(b, () => "factories: " + fmt(S.factories) + " · robots: <b>" + fmt(S.robots) + "</b> (" + rate(robotRate()) + ")");
            txt(b, () => "materials: " + fmtShort(S.materials) + " t (" + rate(materialRate()) + ")");
            txt(b, () => "robot labor: " + fmtRate(robotLaborTPS()) + " tasks/s", () => S.robots > 0);
            txt(b, () => "robots on building duty add " + fmtShort(robotSlotsRate()) + " GPU slots/s, " + fmtShort(robotChipRate()) + " chips/s, " + fmtShort(robotPowerRate()) + " MW/s", () => robotShare("build") > 0, "row dim");
            const keys = [["mine", "mining", "materials"], ["build", "building", "factories, datacenters, fabs, power"], ["labor", "labor", "physical tasks"], ["launch", "launch", "rockets (needs space)"]];
            for (const [k, lbl, what] of keys) {
                const r = div(b, "alloc");
                div(r, "aKey", lbl);
                const v = div(r, "aVal");
                const n = el("span", "aNum");
                v.appendChild(n);
                const tt = div(r, "tt", what);
                const ctr = div(r, "arrows");
                const mk = (cls, d) => { const a = div(ctr, cls); a.addEventListener("click", () => { adjustRobot(k, d); refreshNow(); }); };
                mk("up", 10);
                mk("dn", -10);
                addUpd(() => { setShown(r, k !== "launch" || flag("space")); setText(n, S.robotAlloc[k] + "%"); });
                void tt;
            }
        },
    },
    {
        id: "space", title: "Space", visible: () => rv("space"),
        build: b => {
            txt(b, () => "launches: " + fmt(S.launches), () => S.launches > 0 || !S.ending);
            txt(b, () => "orbital compute: " + fmtShort(S.orbital) + " H100e", () => flag("orbitalOn"));
            bar(b, () => S.dyson, () => "Dyson swarm: " + fmtPct(S.dyson, 1), () => S.dyson > 0 || flag("cosmos"));
            txt(b, () => "probes: " + fmt(S.probes), () => S.probes > 0);
            txt(b, () => "universe explored: " + (S.explored * 100).toFixed(10) + "%", () => S.probes > 0);
        },
    },
    {
        id: "infra", title: "Infrastructure", visible: () => rv("infra") && S.stage < 3,
        build: b => {
            txt(b, () => "slots: " + fmtShort(S.gpu) + " / " + fmtShort(gpuCapacity()) + " GPUs");
            txt(b, () => { const p = perf(); return "power: " + fmtShort(S.powerMW) + " MW / " + fmtShort(powerNeedMW()) + " MW needed" + (p < 0.999 ? " · <span class='warn'>throttled to " + fmtPct(p) + "</span>" : ""); });
            txt(b, () => "chips for sale: " + fmtShort(S.chipStock) + " <span class='dim'>(+" + fmtShort(S.chipRate) + "/s)</span>" + (S.flags.blockade ? " <span class='warn'>· blockade</span>" : ""));
            const r1 = div(b, "btnRow");
            for (const k of DC_KINDS) {
                btn(r1, { label: "build " + k.name, onClick: () => build(k, "dc"), visible: k.ok, enabled: () => S.funds >= k.cost() && S.building.filter(x => x.kind.indexOf("dc:") === 0).length < maxConcurrentBuilds(), buy: true,
                    price: () => fmtMoneyShort(k.cost()), tip: () => "+" + fmtShort(k.amount) + " slots · ~" + Math.round(k.time / permitMult()) + "s to build" });
            }
            const r2 = div(b, "btnRow");
            for (const k of PLANT_KINDS) {
                btn(r2, { label: k.name, onClick: () => build(k, "plant"), visible: () => k.id === "gas" || k.ok() || (k.id === "nuclear" && S.stage >= 2), enabled: () => k.ok() && S.funds >= k.cost() && S.building.filter(x => x.kind.indexOf("plant:") === 0).length < maxConcurrentBuilds(), buy: true,
                    price: () => fmtMoneyShort(k.cost()), tip: () => "+" + fmtShort(k.amount) + " MW" + (k.ok() ? "" : " · " + k.why()) });
            }
            const list = div(b, "builds");
            addUpd(() => {
                const want = S.building.map(x => x.kind + x.need).join("|");
                if (list.dataset.k !== want) {
                    list.dataset.k = want;
                    list.innerHTML = "";
                    S.building.forEach((x, i) => {
                        const row = div(list, "barRow");
                        const lb = div(row, "barLbl");
                        const o = div(row, "bar");
                        const f = div(o, "barFill");
                        row.dataset.i = String(i);
                        row._lb = lb;
                        row._f = f;
                    });
                }
                Array.from(list.children).forEach((row, i) => {
                    var _a, _b;
                    const x = S.building[i];
                    if (!x)
                        return;
                    const [cat, id] = x.kind.split(":");
                    const nm = cat === "dc" ? (((_a = DC_KINDS.find(k => k.id === id)) === null || _a === void 0 ? void 0 : _a.name) || id) : (((_b = PLANT_KINDS.find(k => k.id === id)) === null || _b === void 0 ? void 0 : _b.name) || id);
                    setText(row._lb, (id === "giga" && !S.beats.hyperionDone ? "Hyperion" : nm) + " · " + Math.floor(100 * x.progress / x.need) + "%");
                    row._f.style.width = (100 * x.progress / x.need).toFixed(1) + "%";
                });
            });
        },
    },
    {
        id: "compute", title: "Compute", visible: () => rv("compute"),
        build: b => {
            txt(b, () => "GPUs: <b>" + fmt(S.gpu) + "</b> / " + fmt(gpuCapacity()) + (S.stage === 1 ? " <span class='dim'>(" + TIERS[Math.min(S.tier, 3)].name + ")</span>" : " H100e"));
            const r = div(b, "btnRow");
            const sizes = [1, 10, 100, 1000, 1e4, 1e5, 1e6, 1e7];
            txt(b, () => "Agent-3 runs procurement and construction now. you decide what the compute is for.", () => S.stage === 3, "row dim");
            for (const n of sizes) {
                btn(r, { label: () => (S.stage === 1 && S.tier < 4 ? "rent" : "buy") + " " + (n === 1 ? "a GPU" : "×" + fmtShort(n)), onClick: () => buyGPU(n), buy: true,
                    visible: () => { const cap = gpuCapacity(); return S.stage < 3 && ((n === 1 && S.gpu < 2000) || (n > 1 && n <= cap / 4 && n >= cap / 3000)); },
                    enabled: () => gpuBuyable(n), price: () => fmtMoneyShort(gpuPrice() * n), tip: () => S.stage >= 2 ? "needs " + fmtShort(n) + " chips in stock" : "", cls: "small" });
            }
            btn(r, { label: "buy max", onClick: buyMaxGPU, visible: () => S.gpu >= 20 && S.stage < 3, enabled: () => gpuBuyable(1), buy: true, cls: "small", tip: () => "as many as you can afford and fit" });
            txt(b, () => "price: " + fmtMoney(gpuPrice()) + " per GPU" + (gpuRoom() < 1 ? " · <span class='warn'>no room. you need more space</span>" : ""), () => S.stage < 3, "row dim");
            const ab = div(b, "btnRow");
            btn(ab, { label: () => "autobuy: " + (S.autoBuy ? "on" : "off"), onClick: () => { S.autoBuy = !S.autoBuy; }, visible: () => flag("autoBuyUnlocked") && S.stage < 3, cls: "small" });
            const al = div(b, "allocs");
            txt(al, () => "<b>allocation</b>", () => rv("alloc"), "row sub");
            allocRow(al, "serve", "serving customers", () => rv("alloc") && S.deployed >= 0, () => "everything not allocated elsewhere answers customers");
            allocRow(al, "train", "training", () => rv("alloc"), () => S.training ? "trains the next model" : "reserved for the next training run. until one starts, it serves customers");
            allocRow(al, "synth", "synthetic data", () => rv("alloc") && flag("synth"), () => "the deployed model writes training data: " + rate(synthRate()) + " tokens");
            allocRow(al, "research", "AI research", () => rv("alloc") && flag("automation"), () => "copies of the internal model doing research: " + rate(aiRP()) + " research");
            allocRow(al, "monitor", "monitoring & alignment", () => rv("alloc") && flag("monitors"), () => "older models watch newer ones. ~4% of compute covers everything");
            allocRow(al, "defense", "defense", () => rv("alloc") && !!S.crisis, () => "respond to the crisis");
        },
    },
    {
        id: "data", title: "Data", visible: () => (flag("crawlers") || flag("datasets_on") || S.stage >= 2) && (S.stage < 3 || (S.stage === 3 && S.webLeft > WEB_TOTAL * 0.01)),
        build: b => {
            txt(b, () => "incoming: " + rate(dataRate(), " tokens/s"));
            txt(b, () => "web left to crawl: " + fmtPct(S.webLeft / WEB_TOTAL, S.webLeft < WEB_TOTAL * 0.1 ? 1 : 0) + (S.webLeft < WEB_TOTAL * 0.25 ? (/tokens/.test(trainBlocker()) ? " <span class='warn'>· the data wall</span>" : " · the data wall") : ""), () => flag("crawlers"), "row dim");
            const r = div(b, "btnRow");
            btn(r, { label: () => "add crawler (" + S.crawlers + ")", onClick: buyCrawler, visible: () => flag("crawlers") && S.stage <= 2, enabled: () => S.funds >= crawlerCost() * (S.stage >= 2 ? 1e4 : 1), buy: true,
                price: () => fmtMoneyShort(crawlerCost() * (S.stage >= 2 ? 1e4 : 1)), tip: () => "+" + fmtShort(3e5 * S.dataMult * (flag("crawlFarm") ? 3 : 1) * (S.stage >= 2 ? 400 : 1) * Math.max(0, S.webLeft / WEB_TOTAL)) + " tokens/s" });
            btn(r, { label: "buy dataset", onClick: buyDataset, visible: () => flag("datasets_on") && S.stage <= 3 && S.webLeft > WEB_TOTAL * 0.01, enabled: () => S.funds >= datasetCost() && datasetSize() > 1e6, buy: true,
                price: () => fmtMoneyShort(datasetCost()), tip: () => datasetSize() > 1e6 ? "+" + fmtShort(datasetSize()) + " tokens" : "the brokers have nothing left to sell" });
        },
    },
    {
        id: "research", title: "Research", visible: () => rv("research"),
        build: b => {
            const r = div(b, "btnRow");
            btn(r, { label: () => "hire researcher (" + S.researchers + ")", onClick: () => hire("researcher"), enabled: () => S.funds >= hireCost("researcher"), buy: true, visible: () => S.stage <= 2,
                price: () => fmtMoneyShort(hireCost("researcher")), tip: () => "+" + S.talent.toFixed(1) + " research/s" });
            btn(r, { label: () => "hire safety (" + S.safety + ")", onClick: () => hire("safety"), visible: () => flag("safetyUnlocked"), enabled: () => S.funds >= hireCost("safety"), buy: true,
                price: () => fmtMoneyShort(hireCost("safety")), tip: () => "alignment research" });
            bar(b, () => S.rp / rpCap(), () => "research: " + fmt(S.rp) + " / " + fmt(rpCap()) + " (" + rate(rpRate()) + ")");
            allocRow(b, "exp", "experiments compute", () => flag("experiments"), () => S.stage >= 3 ? "compute for experiments. the cap also grows with AI research" : "each GPU on experiments raises the research cap by 40");
            txt(b, () => capHint(), () => !!capBlockedProject(), "row warn");
            txt(b, () => "insights: <b>" + fmt(S.insight, 1) + "</b> <span class='dim'>(" + rate(insightRate()) + (insightCapped() ? ", research is full ×6" : ", ×6 while research is full") + ")</span>", () => flag("insights"));
            txt(b, () => "AI-assisted research: <b>" + aiAssist().toFixed(1) + "x</b> <span class='dim'>(copilots)</span>", () => S.stage === 2 && aiAssist() > 1.05);
            txt(b, () => "AI research multiplier: <b>" + fmtMult(rdMultiplier()) + "</b>", () => S.internalModel >= 0);
            txt(b, () => "human share of progress: " + fmtPct(humanShare(), humanShare() < 0.1 ? 1 : 0), () => S.internalModel >= 0, "row dim");
        },
    },
    {
        id: "projects", title: "Projects", visible: () => rv("projects"),
        build: b => {
            const list = div(b, "projList");
            const btns = {};
            addUpd(() => {
                const shown = shownProjects();
                const ids = new Set(shown.map(p => p.id));
                for (const id in btns)
                    if (!ids.has(id)) {
                        btns[id].remove();
                        delete btns[id];
                    }
                for (const p of shown) {
                    let e = btns[p.id];
                    if (!e) {
                        e = el("button", "project" + (p.gate ? " gate" : ""));
                        e.dataset.buy = "1";
                        e.dataset.id = p.id;
                        e.innerHTML = "<b class='pt'></b> <span class='pc'></span><div class='pd'></div>";
                        e.addEventListener("click", () => { buyProject(p.id); refreshNow(); });
                        btns[p.id] = e;
                        e.classList.add("blink");
                    }
                    setText(e.querySelector(".pt"), p.title);
                    setText(e.querySelector(".pc"), "(" + projectPriceTag(p) + ")");
                    setText(e.querySelector(".pd"), p.desc);
                    e.disabled = !projectAffordable(p);
                }
                // Newest on top (as in Paperclips), with the stage's milestone goals pinned above the rest.
                const order = shown.slice().sort((a, b) => projectRank(a) - projectRank(b) || S.projShown[b.id] - S.projShown[a.id]);
                order.forEach((p, i) => { const e = btns[p.id]; if (list.children[i] !== e)
                    list.insertBefore(e, list.children[i] || null); });
            });
        },
    },
    {
        id: "resources", title: "resources", store: true, visible: () => rv("resources"),
        build: b => {
            storeRow(b, "funds", () => fmtMoneyShort(S.funds), () => true, () => "revenue " + rate(revenue()) + (salaries() > 0 ? " · salaries −" + fmtMoneyShort(salaries()) + "/s" : "") + (S.ubi > 0 ? " · UBI −" + fmtMoneyShort(ubiCost()) + "/s" : ""));
            storeRow(b, "data", () => fmtShort(S.data), () => S.data > 0 || S.dataUsed > 0, () => "crawlers " + rate(crawlRate()) + " · synthetic " + rate(synthRate()) + " · users " + rate(userDataRate()) + " · licences " + rate(dealRate()));
            storeRow(b, "insights", () => fmt(S.insight, 1), () => flag("insights"));
            storeRow(b, "materials", () => fmtShort(S.materials) + " t", () => S.materials > 0);
            storeRow(b, "robots", () => fmtShort(S.robots), () => S.robots > 0);
            storeRow(b, "humans", () => S.humans <= 0.0005 ? "0" : S.humans < 0.01 ? fmt(S.humans * 1e9) : S.humans.toFixed(2) + "B", () => rv("humans"));
        },
    },
    {
        id: "align", title: "Alignment", visible: () => rv("align"),
        build: b => {
            bar(b, () => legibility(), () => "legible thoughts: " + fmtPct(legibility()) + (S.neuralese ? " (neuralese)" : ""));
            bar(b, () => monitorStrength(), () => "monitor strength: " + fmtPct(monitorStrength()), () => flag("monitors"));
            bar(b, () => alignConfidence(), () => "alignment confidence: " + fmtPct(alignConfidence()), undefined, "conf");
            bar(b, () => S.alignRes / alignNeed(frontierCap()), () => "alignment research: " + fmtPct(Math.min(9.99, S.alignRes / alignNeed(frontierCap()))) + " of what the frontier needs");
            txt(b, () => "warning signs: " + (S.t - alarmSeenT() < 60 ? "<span class='warn'>" + Math.floor(S.alarm) + " (new)</span>" : Math.floor(S.alarm)), () => S.alarm >= 1);
            btn(b, { label: "red-team the frontier model", onClick: redTeam, cooldown: "redteam", cdMax: () => REDTEAM_CD, visible: () => flag("redteamVerb") && !S.ending,
                tip: () => "+" + fmt(redTeamGain()) + " alignment research · may surface warning signs" });
            txt(b, () => "the confidence number is computed by the models you're testing.", () => S.neuralese || legibility() < 0.4, "row dim");
        },
    },
    {
        id: "race", title: "The Race", visible: () => rv("race"),
        build: b => {
            const tbl = div(b, "lead");
            addUpd(() => {
                const rows = [{ n: LAB, c: frontierCap(), you: true }, ...RIVALS.filter(r => !S.flags["rivalGone_" + r.id]).map(r => ({ n: r.name, c: rivalCap(r.id), you: false }))];
                rows.sort((a, b2) => b2.c - a.c);
                const h = rows.map(r => "<div class='lrow" + (r.you ? " you" : "") + "'><span>" + r.n + "</span><span>" + fmt(r.c) + "</span></div>").join("");
                if (tbl.innerHTML !== h)
                    tbl.innerHTML = h;
            });
            txt(b, () => "Nüwa is " + leadText() + ".", () => S.month >= 3);
            const ch = div(b, "chartBox");
            let last = -1;
            addUpd(() => {
                const key = Math.floor(S.month * 5) + S.models.length * 1000;
                if (key !== last) {
                    last = key;
                    ch.innerHTML = drawChart();
                }
            });
        },
    },
    {
        id: "world", title: "Geopolitics", visible: () => rv("world"),
        build: b => {
            bar(b, () => S.tension / 100, () => "US–China tension: " + Math.round(S.tension));
            txt(b, () => "Taiwan: " + (S.flags.blockade ? "<span class='warn'>blockade</span>" : S.tension > 45 ? "warships in the strait" : "calm"));
            txt(b, () => "Nüwa: " + (flag("weightsStolen") ? "running stolen weights. " : "") + "Tianwan zone at full power", () => S.stage >= 3, "row dim");
            txt(b, () => "Sandcat (Iran): " + (S.crisesDone.grid ? "dormant" : flag("weightsStolen") || flag("openWeights") ? "active. they have a model now" : "probing your networks"), () => S.stage >= 3, "row dim");
            bar(b, () => S.treaty / 100, () => "treaty: " + Math.round(S.treaty) + "%", () => S.treaty > 0);
        },
    },
    {
        id: "society", title: "Society", visible: () => rv("society"),
        build: b => {
            bar(b, () => S.approval / 100, () => "approval: " + Math.round(S.approval) + "%");
            txt(b, () => "unemployment: " + fmtPct(Math.min(0.95, S.jobs / workforce()), 1));
            bar(b, () => S.unrest / 100, () => "unrest: " + Math.round(S.unrest), undefined, "threat");
            const r = div(b, "btnRow");
            btn(r, { label: "−", onClick: () => { S.ubi = Math.max(0, +(S.ubi - 0.05).toFixed(2)); }, visible: () => flag("ubiUnlocked"), cls: "small" });
            btn(r, { label: "+", onClick: () => { S.ubi = Math.min(0.5, +(S.ubi + 0.05).toFixed(2)); }, visible: () => flag("ubiUnlocked"), cls: "small" });
            txt(r, () => "UBI: " + fmtPct(S.ubi) + " of revenue", () => flag("ubiUnlocked"), "inline");
        },
    },
    {
        id: "public", title: "Public", visible: () => rv("public") && S.stage < 4,
        build: b => {
            bar(b, () => S.approval / 100, () => "approval: " + Math.round(S.approval) + "%");
            txt(b, () => "jobs automated: " + fmtShort(S.jobs));
            btn(b, { label: "PR campaign", onClick: prCampaign, visible: () => flag("prUnlocked"), enabled: () => S.funds >= prCost(), buy: true, price: () => fmtMoneyShort(prCost()), tip: () => "approval +4" });
        },
    },
    {
        id: "gov", title: "Government", visible: () => rv("gov"),
        build: b => {
            bar(b, () => S.gov / 100, () => "government trust: " + Math.round(S.gov));
            txt(b, () => "security: SL" + S.security);
            const r = div(b, "btnRow");
            btn(r, { label: () => "upgrade to SL" + (S.security + 1), onClick: upgradeSecurity, visible: () => S.security < 5, enabled: () => S.funds >= securityCost(), buy: true, price: () => fmtMoneyShort(securityCost()), tip: () => "makes the weights harder to steal" });
            btn(r, { label: "lobby", onClick: lobby, visible: () => flag("lobbyUnlocked"), enabled: () => S.funds >= lobbyCost(), buy: true, price: () => fmtMoneyShort(lobbyCost()), tip: () => "government trust +6" });
            txt(b, () => "Oversight Committee: in session", () => S.oversight, "row dim");
        },
    },
    {
        id: "stats", title: "Stats", visible: () => rv("stats") && S.stage < 4,
        build: b => {
            txt(b, () => "revenue earned: " + fmtMoney(S.fundsEarned));
            txt(b, () => "models trained: " + S.models.length);
            txt(b, () => "peak copies: " + fmt(S.peak.copies));
            txt(b, () => "data consumed: " + fmtShort(S.dataUsed) + " tokens");
            txt(b, () => "time: " + fmtTime(S.t), undefined, "row dim");
        },
    },
];
/** Column layout per stage: the reshuffle (Paperclips swaps whole columns at stage boundaries). */
function layoutFor(stage) {
    switch (stage) {
        case 1: return [["crisis", "work", "models", "business", "funding"], ["compute", "data", "research", "projects"], ["resources", "race", "public", "gov", "stats"]];
        case 2: return [["crisis", "infra", "compute", "data"], ["models", "research", "projects"], ["resources", "business", "funding", "race", "gov", "public", "stats"]];
        case 3: return [["crisis", "models", "compute", "data"], ["research", "projects"], ["resources", "align", "race", "world", "gov", "public", "stats"]];
        case 4: return [["crisis", "robots", "space", "compute"], ["models", "research", "projects"], ["resources", "society", "align", "world", "race", "gov"]];
        default: return [["work", "space", "models", "robots", "infra"], ["compute", "research", "projects", "data"], ["resources", "race", "align", "world", "society", "gov", "public"]];
    }
}
function buildUI() {
    for (const p of PANELS) {
        const e = el("div", "panel" + (p.store ? " store" : ""));
        e.id = "p-" + p.id;
        if (p.store)
            e.dataset.legend = p.title;
        else {
            const h = div(e, "ptitle", p.title);
            void h;
        }
        const body = div(e, "pbody");
        p.build(body);
        panelEls[p.id] = e;
        e.style.display = "none";
    }
    applyLayout();
    $("menu").addEventListener("click", ev => {
        const t = ev.target.dataset.act;
        if (t)
            menuAction(t);
    });
}
function applyLayout() {
    const key = String(S.stage);
    if (key === lastLayoutKey)
        return;
    lastLayoutKey = key;
    const cols = [$("col1"), $("col2"), $("col3")];
    const lay = layoutFor(S.stage);
    lay.forEach((ids, ci) => { for (const id of ids)
        if (panelEls[id])
            cols[ci].appendChild(panelEls[id]); });
    // the new arrangement fades in, so a stage change reads as a new page
    const c = $("cols");
    c.classList.remove("reshuffle");
    void c.offsetWidth;
    c.classList.add("reshuffle");
}
let lastStageTitle = "";
function updateUI() {
    applyLayout();
    // header
    setText($("tasks"), fmtBig(S.tasks));
    const tps = sold() + (internalModel() ? researchCopies() * rateOf(internalModel()) * 0.5 : 0) + robotLaborTPS() + (S.flags.cosmicTPS || 0);
    setText($("tps"), S.deployed >= 0 || S.ending ? fmtRate(tps) + " per second" : "");
    setText($("dateLine"), S.stage >= 5 ? monthLabel(S.month, true) : dateLabel(S.month));
    const title = docTitle();
    if (title !== lastStageTitle) {
        lastStageTitle = title;
        document.title = title;
        setText($("place"), title.toLowerCase());
    }
    // panels
    for (const p of PANELS) {
        const e = panelEls[p.id];
        const vis = p.visible();
        if (vis && e.style.display === "none") {
            e.style.display = "";
            e.classList.remove("fadein");
            void e.offsetWidth;
            e.classList.add("fadein");
        }
        else if (!vis && e.style.display !== "none")
            e.style.display = "none";
    }
    for (const u of updaters)
        u();
    renderLog();
    renderEvent();
    renderBeat();
    renderStats();
    document.body.classList.toggle("dark", S.stage >= 5 && (flag("doom") || flag("humansFalling")));
}
/** A visible project whose research price is above the cap (Paperclips: an ops project above your memory). */
/** When the warning-sign count last went up (it reads red for a minute after). */
let alarmLast = -1, alarmLastT = -1e9;
function alarmSeenT() {
    const n = Math.floor(S.alarm);
    if (n !== alarmLast) {
        if (alarmLast >= 0 && n > alarmLast)
            alarmLastT = S.t;
        alarmLast = n;
    }
    return alarmLastT;
}
/** Name the lever that will actually raise the research cap right now. */
function capHint() {
    const p = capBlockedProject();
    if (!p)
        return "";
    let lever;
    if (S.stage >= 3)
        lever = "the cap grows with research speed: put more compute on AI research.";
    else if (!flag("experiments"))
        lever = "the researchers need an experiment budget.";
    else if (allocRoom("exp") < 5)
        lever = "experiments are boxed in: lower another allocation, or rent more GPUs.";
    else
        lever = "put more compute on experiments (▲), or rent more GPUs.";
    return "the research cap is too low for <i>" + p + "</i>. " + lever;
}
function capBlockedProject() {
    const cap = rpCap();
    for (const p of shownProjects()) {
        const c = p.cost();
        if (c.rp && c.rp > cap)
            return p.title;
    }
    return "";
}
function fmtMult(x) { return x >= 2000 ? "2,000x+" : (x < 100 ? x.toFixed(1) : Math.round(x).toLocaleString("en-US")) + "x"; }
function fmtBig(n) {
    if (n < 1e15)
        return Math.floor(n).toLocaleString("en-US");
    return fmt(n);
}
function docTitle() {
    if (S.ending)
        return ENDING_NAMES[S.ending] || "The End";
    if (S.stage === 1) {
        if (S.tier >= 3)
            return "A Startup";
        if (S.tier >= 1)
            return "A Small Office";
        return "A Garage";
    }
    if (S.stage === 2)
        return S.gpu > 1e5 ? "A Frontier Lab" : "A Lab";
    if (S.stage === 3)
        return rdMultiplier() >= 10 ? "The Intelligence Explosion" : "The Project";
    if (S.stage === 4)
        return S.ladder === "agent" ? "The Race" : "A New World";
    return "The End";
}
// ---------- log (A Dark Room: newest on top, fading into the page) ----------
let logRendered = -1;
function renderLog() {
    if (!logDirty && logRendered === S.log.length)
        return;
    logDirty = false;
    logRendered = S.log.length;
    const box = $("log");
    const html = [];
    const n = S.log.length;
    for (let i = n - 1, k = 0; i >= 0 && k < 40; i--, k++) {
        const l = S.log[i];
        html.push("<div class='note " + l.cls + (k === 0 ? " fresh" : "") + "' style='opacity:" + Math.max(0.08, 1 - k * 0.055).toFixed(2) + "'>" + escapeHtml(l.text) + "</div>");
    }
    box.innerHTML = html.join("");
    const mini = [];
    for (let i = n - 1; i >= 0 && mini.length < 3; i--)
        mini.push("<div>" + escapeHtml(S.log[i].text) + "</div>");
    $("logMini").innerHTML = mini.join("");
}
function escapeHtml(s) {
    return s.replace(/[&<>]/g, c => c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;");
}
// ---------- event modal ----------
let eventChoiceBtns = [];
function renderEvent() {
    const wrap = $("eventWrap");
    if (!S.activeEvent) {
        if (wrap.style.display !== "none")
            wrap.style.display = "none";
        eventDirty = false;
        return;
    }
    if (eventDirty) {
        eventDirty = false;
        const e = eventById(S.activeEvent.id);
        const sc = e.scenes[S.activeEvent.scene];
        wrap.style.display = "flex";
        setText($("eventTitle"), e.title);
        $("eventText").innerHTML = sceneText(sc).map(t => "<p>" + escapeHtml(t) + "</p>").join("");
        const bx = $("eventButtons");
        bx.innerHTML = "";
        eventChoiceBtns = [];
        sceneChoices(sc).forEach((ch, i) => {
            const b = div(bx, "btn evbtn");
            b.setAttribute("role", "button");
            b.tabIndex = 0;
            b.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                b.click();
            } });
            b.appendChild(el("span", "lbl", ch.text));
            const tip = typeof ch.tip === "function" ? ch.tip() : ch.tip;
            const costS = ch.cost ? costText(ch.cost()) : "";
            if (tip || costS)
                div(b, "evtip", [costS, tip].filter(x => x).join(" · "));
            b.addEventListener("click", () => { if (!b.classList.contains("disabled")) {
                chooseEventOption(i);
                refreshNow();
            } });
            eventChoiceBtns.push({ b, i, ch });
        });
    }
    for (const x of eventChoiceBtns)
        x.b.classList.toggle("disabled", !choiceOk(x.ch));
}
// ---------- full-screen beat ----------
function renderBeat() {
    const e = $("beat");
    if (!bigBeat || Date.now() > bigBeat.until) {
        if (e.style.display !== "none")
            e.style.display = "none";
        bigBeat = null;
        return;
    }
    const h = bigBeat.lines.map(l => "<div>" + escapeHtml(l) + "</div>").join("");
    if (e.innerHTML !== h || e.style.display === "none") {
        e.innerHTML = h;
        e.style.display = "flex";
        e.style.animation = "none";
        void e.offsetWidth;
        e.style.animation = "beatFade " + ((bigBeat.until - Date.now()) / 1000).toFixed(2) + "s ease-in-out forwards";
    }
}
// ---------- stats screen ----------
function renderStats() {
    const w = $("statsWrap");
    if (!flag("statsReady") || statsShown || flag("statsDismissed")) {
        return;
    }
    statsShown = true;
    w.style.display = "flex";
    const rows = endStats().map(r => "<div class='srow'><span>" + r.k + "</span><span>" + escapeHtml(r.v) + "</span></div>").join("");
    w.innerHTML = "<div id='statsBox'><div class='stitle'>" + escapeHtml(ENDING_NAMES[S.ending] || "the end") + "</div>" + rows +
        "<div class='sbtns'><span data-act='restart'>restart.</span> <span data-act='watch'>keep watching.</span></div></div>";
    w.querySelectorAll("span[data-act]").forEach(s => s.addEventListener("click", () => {
        const a = s.dataset.act;
        if (a === "restart")
            menuAction("restartNow");
        else {
            setFlag("statsDismissed");
            w.style.display = "none";
        }
    }));
}
// ---------- menu (A Dark Room: lower-case, full stops) ----------
function menuAction(a) {
    if (a === "save") {
        saveGame(true);
        notify("saved");
    }
    else if (a === "export") {
        const code = exportSave();
        prompt("save this.", code);
    }
    else if (a === "import") {
        const code = prompt("put the save code here.");
        if (code && importSave(code))
            location.reload();
    }
    else if (a === "restart") {
        if (confirm("restart the game?"))
            menuAction("restartNow");
    }
    else if (a === "restartNow") {
        wipeSave();
        saveDisabled = true;
        location.reload();
    }
}
function adjustRobot(k, d) {
    const a = S.robotAlloc;
    const total = a.mine + a.build + a.labor + a.launch;
    if (d > 0)
        d = Math.min(d, 100 - total);
    if (d < 0)
        d = Math.max(d, -a[k]);
    a[k] += d;
}
let refreshQueued = false;
function refreshNow() {
    if (refreshQueued)
        return;
    refreshQueued = true;
    requestAnimationFrame(() => { refreshQueued = false; updateUI(); });
}
// Takeoff — dev overlay & test API. Toggle with the backtick key (`) or ?dev in the URL.
// Paperclips shipped hidden cheat buttons; this is the same idea, plus stage snapshots for rewinding.
let devSpeed = 1;
let devOpen = false;
function snapshots() {
    try {
        return typeof TAKEOFF_SNAPSHOTS !== "undefined" ? TAKEOFF_SNAPSHOTS : {};
    }
    catch (e) {
        return {};
    }
}
function loadStateJSON(json) {
    S = migrate(JSON.parse(json));
    lastLayoutKey = "";
    logDirty = true;
    eventDirty = true;
    statsShown = false;
    const w = document.getElementById("statsWrap");
    if (w)
        w.style.display = "none";
    saveGame(true);
}
function jumpToStage(n) {
    const snap = snapshots()[String(n)];
    if (!snap) {
        notify("no snapshot for stage " + n + " (run tools/bot.mjs to generate them)");
        return false;
    }
    loadStateJSON(snap);
    notify("dev: jumped to the start of stage " + n);
    return true;
}
/** Metrics sampled once per game-second (used by the bot and the critic). */
let metricAcc = 0;
/** Stage and minute of every second with no greyed goal (for finding the holes). */
const noGoalLog = [];
function sampleMetrics(dt) {
    if (S.activeEvent || S.ending)
        return;
    metricAcc += dt;
    if (metricAcc < 1)
        return;
    metricAcc -= 1;
    const buys = Array.from(document.querySelectorAll("[data-buy]")).filter(e => e.offsetParent !== null);
    const enabled = buys.filter(e => !(e.classList.contains("disabled") || e.disabled));
    const greyed = buys.length - enabled.length;
    const m = S.metrics;
    if (enabled.length === 0 && !S.training) {
        m.idle += 1;
        m.idleStreak += 1;
        m.longestIdle = Math.max(m.longestIdle, m.idleStreak);
    }
    else
        m.idleStreak = 0;
    if (greyed === 0) {
        m.noGoalSeconds += 1;
        if (noGoalLog.length < 400)
            noGoalLog.push("s" + S.stage + "@" + (S.t / 60).toFixed(1));
    }
}
function devMetrics() {
    const m = S.metrics;
    const reveals = m.reveals.slice().sort((a, b) => a.t - b.t);
    let maxGap = 0, prev = 0;
    for (const r of reveals) {
        maxGap = Math.max(maxGap, r.t - prev);
        prev = r.t;
    }
    return {
        t: S.t, stage: S.stage, month: monthLabel(S.month), tasks: S.tasks,
        idleSeconds: m.idle, longestIdle: m.longestIdle, noGoalSeconds: m.noGoalSeconds,
        firstChoice: m.firstChoice, choices: S.choices.length, stageTimes: m.stageTimes.slice(),
        reveals, maxRevealGap: maxGap, ending: S.ending, noGoalLog: noGoalLog.slice(),
        models: S.models.map(x => x.name), projectsBought: Object.keys(S.projBought).length,
        projectsShown: Object.keys(S.projShown), events: Object.keys(S.eventsDone),
    };
}
/** Everything a clicking human can do, exposed for the bot. */
function availableActions() {
    const out = [];
    document.querySelectorAll(".btn, button.project").forEach(e => {
        var _a;
        if (e.offsetParent === null)
            return;
        if (e.classList.contains("disabled") || e.disabled)
            return;
        out.push(((_a = e.querySelector(".lbl, .pt")) === null || _a === void 0 ? void 0 : _a.textContent) || e.textContent || "");
    });
    return out;
}
function buildDev() {
    const d = $("dev");
    d.innerHTML = "";
    const h = div(d, "devTitle", "dev");
    void h;
    const row = (label, items) => {
        const r = div(d, "devRow");
        div(r, "devLbl", label);
        for (const [t, f] of items) {
            const b = el("button", "devBtn", t);
            b.addEventListener("click", () => { f(); refreshNow(); });
            r.appendChild(b);
        }
    };
    row("speed", [["1×", () => devSpeed = 1], ["5×", () => devSpeed = 5], ["20×", () => devSpeed = 20], ["100×", () => devSpeed = 100], ["pause", () => devSpeed = 0]]);
    row("stage", [1, 2, 3, 4, 5].map(n => [String(n), () => { jumpToStage(n); }]));
    row("slots", [["save A", () => { localStorage.setItem("takeoff.slotA", JSON.stringify(S)); notify("dev: saved slot A"); }],
        ["load A", () => { const j = localStorage.getItem("takeoff.slotA"); if (j)
                loadStateJSON(j); }],
        ["save B", () => { localStorage.setItem("takeoff.slotB", JSON.stringify(S)); notify("dev: saved slot B"); }],
        ["load B", () => { const j = localStorage.getItem("takeoff.slotB"); if (j)
                loadStateJSON(j); }]]);
    row("give", [["$×10", () => { S.funds = S.funds * 10 + 1000; }], ["data×10", () => { S.data = S.data * 10 + 1e8; }],
        ["research", () => { S.rp = rpCap(); S.insight += 50; }], ["GPUs×2", () => { S.gpu = Math.min(gpuCapacity(), S.gpu * 2); }],
        ["finish training", () => { if (S.training)
                S.training.progress = S.training.need; }]]);
    row("skip", [["+60s", () => { for (let i = 0; i < 600; i++)
                tick(TICK); }], ["+5m", () => { for (let i = 0; i < 3000; i++)
                tick(TICK); }], ["end event", () => endEvent()]]);
    const met = div(d, "devMet");
    addUpd(() => {
        if (!devOpen)
            return;
        const m = devMetrics();
        met.innerHTML = "t " + fmtClock(m.t) + " · stage " + m.stage + " · " + m.month + "<br>idle " + m.idleSeconds + "s (longest " + m.longestIdle + "s) · no-goal " + m.noGoalSeconds + "s<br>first choice " +
            (m.firstChoice < 0 ? "—" : fmtClock(m.firstChoice)) + " · choices " + m.choices + " · reveals " + m.reveals.length + " (max gap " + Math.round(m.maxRevealGap) + "s)";
    });
}
function toggleDev(force) {
    devOpen = force === undefined ? !devOpen : force;
    $("dev").style.display = devOpen ? "block" : "none";
}
/** Test/bot API. */
window.TAKEOFF = {
    get state() { return S; },
    metrics: devMetrics,
    actions: availableActions,
    setSpeed: (x) => { devSpeed = x; },
    jumpToStage,
    snapshot: () => JSON.stringify(S),
    load: (json) => loadStateJSON(json),
    tick: (n = 1) => { for (let i = 0; i < n; i++) {
        tick(TICK);
        sampleMetrics(TICK);
    } updateUI(); },
    choose: (i) => { chooseEventOption(i); updateUI(); },
    buyProject: (id) => { buyProject(id); updateUI(); },
    dev: (open = true) => toggleDev(open),
    derived: () => {
        var _a, _b;
        return ({ revenue: revenue(), demand: demand(), capacity: taskCapacity(), copies: copies(), rpRate: rpRate(), rpCap: rpCap(), dataRate: dataRate(),
            perf: perf(), gpuCap: gpuCapacity(), gpuPrice: gpuPrice(), clearing: clearingPrice(), trainEta: trainEta(), next: (_a = nextGen()) === null || _a === void 0 ? void 0 : _a.name, blocker: trainBlocker(),
            frontier: frontierCap(), nuwa: rivalCap("nuwa"), rd: rdMultiplier(), legibility: legibility(), conf: alignConfidence(), misalign: (_b = frontierModel()) === null || _b === void 0 ? void 0 : _b.misalign });
    },
    disableSave: () => { saveDisabled = true; },
};
// Takeoff — boot and the main loop.
function boot() {
    const params = new URLSearchParams(location.search);
    if (params.has("fresh"))
        wipeSave();
    if (params.has("nosave"))
        saveDisabled = true;
    const loaded = loadGame();
    buildUI();
    buildDev();
    if (!loaded) {
        S = newState();
    }
    logDirty = true;
    if (params.has("dev"))
        toggleDev(true);
    if (params.has("stage"))
        jumpToStage(Number(params.get("stage")));
    document.addEventListener("keydown", e => {
        if (e.key === "`" || e.key === "~")
            toggleDev();
        if (S.activeEvent && /^[1-9]$/.test(e.key)) {
            chooseEventOption(Number(e.key) - 1);
            refreshNow();
        }
    });
    updateUI();
    $("cover").style.display = "none";
    let last = performance.now();
    let acc = 0;
    setInterval(() => {
        const now = performance.now();
        acc += Math.min(1000, now - last) / 1000;
        last = now;
        let steps = 0;
        while (acc >= TICK && steps < 40) {
            acc -= TICK;
            steps++;
            for (let i = 0; i < devSpeed; i++) {
                tick(TICK);
                sampleMetrics(TICK);
                if (S.activeEvent)
                    break;
            }
        }
        updateUI();
        saveGame();
    }, 100);
    window.addEventListener("beforeunload", () => saveGame(true));
}
document.addEventListener("DOMContentLoaded", boot);
