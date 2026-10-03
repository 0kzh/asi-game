// Takeoff — dev overlay & test API. Toggle with the backtick key (`) or ?dev in the URL.
// Paperclips shipped hidden cheat buttons; this is the same idea, plus stage snapshots for rewinding.

let devSpeed = 1;
let devOpen = false;

declare const TAKEOFF_SNAPSHOTS: Record<string, string> | undefined;

function snapshots(): Record<string, string> {
  try { return typeof TAKEOFF_SNAPSHOTS !== "undefined" ? TAKEOFF_SNAPSHOTS : {}; } catch (e) { return {}; }
}

function loadStateJSON(json: string): void {
  S = migrate(JSON.parse(json));
  lastLayoutKey = "";
  logDirty = true; eventDirty = true; statsShown = false;
  const w = document.getElementById("statsWrap"); if (w) w.style.display = "none";
  saveGame(true);
}

function jumpToStage(n: number): boolean {
  const snap = snapshots()[String(n)];
  if (!snap) { notify("no snapshot for stage " + n + " (run tools/bot.mjs to generate them)"); return false; }
  loadStateJSON(snap);
  notify("dev: jumped to the start of stage " + n);
  return true;
}

/** Metrics sampled once per game-second (used by the bot and the critic). */
let metricAcc = 0;
function sampleMetrics(dt: number): void {
  if (S.activeEvent || S.ending) return;
  metricAcc += dt;
  if (metricAcc < 1) return;
  metricAcc -= 1;
  const buys = Array.from(document.querySelectorAll<HTMLElement>("[data-buy]")).filter(e => e.offsetParent !== null);
  const enabled = buys.filter(e => !(e.classList.contains("disabled") || (e as HTMLButtonElement).disabled));
  const greyed = buys.length - enabled.length;
  const m = S.metrics;
  if (enabled.length === 0 && !S.training) { m.idle += 1; m.idleStreak += 1; m.longestIdle = Math.max(m.longestIdle, m.idleStreak); }
  else m.idleStreak = 0;
  if (greyed === 0) m.noGoalSeconds += 1;
}

function devMetrics(): any {
  const m = S.metrics;
  const reveals = m.reveals.slice().sort((a, b) => a.t - b.t);
  let maxGap = 0, prev = 0;
  for (const r of reveals) { maxGap = Math.max(maxGap, r.t - prev); prev = r.t; }
  return {
    t: S.t, stage: S.stage, month: monthLabel(S.month), tasks: S.tasks,
    idleSeconds: m.idle, longestIdle: m.longestIdle, noGoalSeconds: m.noGoalSeconds,
    firstChoice: m.firstChoice, choices: S.choices.length, stageTimes: m.stageTimes.slice(),
    reveals, maxRevealGap: maxGap, ending: S.ending,
    models: S.models.map(x => x.name), projectsBought: Object.keys(S.projBought).length,
    projectsShown: Object.keys(S.projShown), events: Object.keys(S.eventsDone),
  };
}

/** Everything a clicking human can do, exposed for the bot. */
function availableActions(): string[] {
  const out: string[] = [];
  document.querySelectorAll<HTMLElement>(".btn, button.project").forEach(e => {
    if (e.offsetParent === null) return;
    if (e.classList.contains("disabled") || (e as HTMLButtonElement).disabled) return;
    out.push((e.querySelector(".lbl, .pt") as HTMLElement)?.textContent || e.textContent || "");
  });
  return out;
}

function buildDev(): void {
  const d = $("dev");
  d.innerHTML = "";
  const h = div(d, "devTitle", "dev");
  void h;
  const row = (label: string, items: [string, () => void][]) => {
    const r = div(d, "devRow");
    div(r, "devLbl", label);
    for (const [t, f] of items) { const b = el("button", "devBtn", t); b.addEventListener("click", () => { f(); refreshNow(); }); r.appendChild(b); }
  };
  row("speed", [["1×", () => devSpeed = 1], ["5×", () => devSpeed = 5], ["20×", () => devSpeed = 20], ["100×", () => devSpeed = 100], ["pause", () => devSpeed = 0]]);
  row("stage", [1, 2, 3, 4, 5].map(n => [String(n), () => { jumpToStage(n); }] as [string, () => void]));
  row("slots", [["save A", () => { localStorage.setItem("takeoff.slotA", JSON.stringify(S)); notify("dev: saved slot A"); }],
    ["load A", () => { const j = localStorage.getItem("takeoff.slotA"); if (j) loadStateJSON(j); }],
    ["save B", () => { localStorage.setItem("takeoff.slotB", JSON.stringify(S)); notify("dev: saved slot B"); }],
    ["load B", () => { const j = localStorage.getItem("takeoff.slotB"); if (j) loadStateJSON(j); }]]);
  row("give", [["$×10", () => { S.funds = S.funds * 10 + 1000; }], ["data×10", () => { S.data = S.data * 10 + 1e8; }],
    ["research", () => { S.rp = rpCap(); S.insight += 50; }], ["GPUs×2", () => { S.gpu = Math.min(gpuCapacity(), S.gpu * 2); }],
    ["finish training", () => { if (S.training) S.training.progress = S.training.need; }]]);
  row("skip", [["+60s", () => { for (let i = 0; i < 600; i++) tick(TICK); }], ["+5m", () => { for (let i = 0; i < 3000; i++) tick(TICK); }], ["end event", () => endEvent()]]);
  const met = div(d, "devMet");
  addUpd(() => {
    if (!devOpen) return;
    const m = devMetrics();
    met.innerHTML = "t " + fmtClock(m.t) + " · stage " + m.stage + " · " + m.month + "<br>idle " + m.idleSeconds + "s (longest " + m.longestIdle + "s) · no-goal " + m.noGoalSeconds + "s<br>first choice " +
      (m.firstChoice < 0 ? "—" : fmtClock(m.firstChoice)) + " · choices " + m.choices + " · reveals " + m.reveals.length + " (max gap " + Math.round(m.maxRevealGap) + "s)";
  });
}

function toggleDev(force?: boolean): void {
  devOpen = force === undefined ? !devOpen : force;
  $("dev").style.display = devOpen ? "block" : "none";
}

/** Test/bot API. */
(window as any).TAKEOFF = {
  get state() { return S; },
  metrics: devMetrics,
  actions: availableActions,
  setSpeed: (x: number) => { devSpeed = x; },
  jumpToStage,
  snapshot: () => JSON.stringify(S),
  load: (json: string) => loadStateJSON(json),
  tick: (n = 1) => { for (let i = 0; i < n; i++) { tick(TICK); sampleMetrics(TICK); } updateUI(); },
  choose: (i: number) => { chooseEventOption(i); updateUI(); },
  buyProject: (id: string) => { buyProject(id); updateUI(); },
  dev: (open = true) => toggleDev(open),
  derived: () => ({ revenue: revenue(), demand: demand(), capacity: taskCapacity(), copies: copies(), rpRate: rpRate(), rpCap: rpCap(), dataRate: dataRate(),
    perf: perf(), gpuCap: gpuCapacity(), gpuPrice: gpuPrice(), clearing: clearingPrice(), trainEta: trainEta(), next: nextGen()?.name, blocker: trainBlocker(),
    frontier: frontierCap(), nuwa: rivalCap("nuwa"), rd: rdMultiplier(), legibility: legibility(), conf: alignConfidence(), misalign: frontierModel()?.misalign }),
  disableSave: () => { saveDisabled = true; },
};
