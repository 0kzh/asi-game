// Takeoff — DOM. Panels are built once and updated 10x/second; visibility is driven by S.revealed + stage
// (Paperclips' buttonUpdate), new panels fade in (A Dark Room), and columns reshuffle between stages.

type Upd = () => void;

interface PanelDef {
  id: string;
  title: string;
  store?: boolean;                // A Dark Room bordered box with a legend
  visible: () => boolean;
  build: (body: HTMLElement) => void;
}

const panelEls: Record<string, HTMLElement> = {};
const updaters: Upd[] = [];
let lastLayoutKey = "";

function rv(id: string): boolean { return (S.revealed[id] || 0) > 0; }

// ---------- small builders ----------

function addUpd(f: Upd): void { updaters.push(f); }

function div(parent: HTMLElement, cls = "", text?: string): HTMLDivElement {
  const d = el("div", cls, text);
  parent.appendChild(d);
  return d;
}

function txt(parent: HTMLElement, f: () => string, vis?: () => boolean, cls = "row"): HTMLDivElement {
  const d = div(parent, cls);
  addUpd(() => {
    const show = vis ? vis() : true;
    setShown(d, show);
    if (show) { const v = f(); if (d.innerHTML !== v) d.innerHTML = v; }
  });
  return d;
}

interface BtnOpts {
  label: string | (() => string);
  onClick: () => void;
  enabled?: () => boolean;
  visible?: () => boolean;
  cooldown?: string;
  cdMax?: () => number;
  tip?: () => string;
  buy?: boolean;       // a purchase (counts for "something to do" / "greyed goal" metrics)
  cls?: string;
}

function btn(parent: HTMLElement, o: BtnOpts): HTMLDivElement {
  const b = div(parent, "btn" + (o.cls ? " " + o.cls : ""));
  const cd = div(b, "cd");
  const label = el("span", "lbl");
  b.appendChild(label);
  const tt = div(b, "tt");
  if (o.buy) b.dataset.buy = "1";
  b.addEventListener("click", () => {
    if (b.classList.contains("disabled")) return;
    o.onClick();
    refreshNow();
  });
  addUpd(() => {
    const show = o.visible ? o.visible() : true;
    setShown(b, show);
    if (!show) return;
    setText(label, typeof o.label === "function" ? o.label() : o.label);
    let en = o.enabled ? o.enabled() : true;
    if (o.cooldown) {
      const left = cooldownLeft(o.cooldown);
      const max = o.cdMax ? o.cdMax() : 1;
      cd.style.width = left > 0 ? (100 * left / max).toFixed(1) + "%" : "0%";
      if (left > 0) en = false;
    }
    b.classList.toggle("disabled", !en);
    const t = o.tip ? o.tip() : "";
    setText(tt, t);
    setShown(tt, !!t);
  });
  return b;
}

function bar(parent: HTMLElement, frac: () => number, label: () => string, vis?: () => boolean, cls = ""): HTMLDivElement {
  const wrap = div(parent, "barRow " + cls);
  const lbl = div(wrap, "barLbl");
  const outer = div(wrap, "bar");
  const inner = div(outer, "barFill");
  addUpd(() => {
    const show = vis ? vis() : true;
    setShown(wrap, show);
    if (!show) return;
    setText(lbl, label());
    inner.style.width = (100 * clamp(frac(), 0, 1)).toFixed(1) + "%";
  });
  return wrap;
}

/** A Dark Room worker row: label, value, up/down arrows (±5%, ±25%). */
function allocRow(parent: HTMLElement, key: keyof Alloc | "serve", label: string, vis: () => boolean, tip: () => string): void {
  const r = div(parent, "alloc");
  const k = div(r, "aKey", label);
  const v = div(r, "aVal");
  const n = el("span", "aNum"); v.appendChild(n);
  const sub = el("span", "aSub"); v.appendChild(sub);
  const tt = div(r, "tt");
  if (key !== "serve") {
    const ctr = div(r, "arrows");
    const mk = (cls: string, d: number) => { const a = div(ctr, cls); a.addEventListener("click", () => { adjustAlloc(key, d); refreshNow(); }); return a; };
    mk("up", 5); mk("dn", -5); mk("up2", 25); mk("dn2", -25);
  }
  addUpd(() => {
    const show = vis();
    setShown(r, show);
    if (!show) return;
    const sp = split();
    if (key === "serve") {
      const pct = S.gpu > 0 ? 100 * sp.serve / S.gpu : 0;
      setText(n, Math.round(pct) + "%");
      setText(sub, fmtShort(sp.serve));
    } else {
      setText(n, S.alloc[key] + "%");
      const used = (sp as any)[key] as number;
      setText(sub, key === "train" && !S.training ? "idle" : fmtShort(used));
    }
    setText(tt, tip());
  });
  void k;
}

function storeRow(parent: HTMLElement, label: string, val: () => string, vis: () => boolean, tip?: () => string): void {
  const r = div(parent, "storeRow");
  div(r, "sKey", label);
  const v = div(r, "sVal");
  const tt = tip ? div(r, "tt") : null;
  addUpd(() => {
    const show = vis();
    setShown(r, show);
    if (!show) return;
    setText(v, val());
    if (tt && tip) setText(tt, tip());
  });
}

function rate(n: number, unit = "/s"): string { return (n >= 0 ? "+" : "") + fmtRate(n) + unit; }

// ---------- panels ----------

function capWord(c: number): string { return capLabel(c); }

const PANELS: PanelDef[] = [
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
      txt(b, () => { const m = internalModel()!; return "internal: <b>" + m.name + "</b> · " + fmt(researchCopies()) + " copies doing research"; }, () => S.internalModel >= 0);
      bar(b, () => S.training ? S.training.progress / S.training.need : 0,
        () => S.training ? "training " + genById(S.training.gen).name + " · " + Math.floor(100 * S.training.progress / S.training.need) + "% · " + (isFinite(trainEta()) ? fmtClock(trainEta()) : "stalled — give it compute") : "",
        () => !!S.training, "train");
      txt(b, () => "<b>" + readyModel()!.name + " is ready.</b> capability " + fmt(capOf(readyModel())) + (readyModel()!.evaluated ? " · evaluated" : ""), () => S.ready >= 0);
      const rowA = div(b, "btnRow");
      btn(rowA, { label: () => "release " + (readyModel() ? readyModel()!.name : ""), onClick: releaseModel, visible: () => S.ready >= 0 && !(S.stage >= 3 && S.ladder === "agent" && S.oversight && !readyModel()?.evaluated && flag("evalRule")), buy: true,
        tip: () => "make it the public product. more capable, more valuable tasks" });
      btn(rowA, { label: "deploy internally", onClick: deployInternal, visible: () => S.ready >= 0 && S.stage >= 3, buy: true, tip: () => "put it to work on AI research" });
      btn(rowA, { label: "run evals", onClick: runEvals, visible: () => S.ready >= 0 && flag("evals") && !readyModel()!.evaluated, enabled: () => canAfford(evalCost()), buy: true,
        tip: () => "costs " + costText(evalCost()) + ". find out what it does when nobody's watching" });
      const nb = div(b, "next");
      btn(nb, { label: () => { const g = nextGen(); return g ? "train " + g.name : ""; }, onClick: startTraining, enabled: canTrain, buy: true,
        visible: () => { const g = nextGen(); return !!g && !S.training && !!S.designed[g.id] && !S.ending; },
        tip: () => { const g = nextGen(); return g ? g.blurb : ""; } });
      txt(nb, () => { const g = nextGen()!; return "needs " + fmtShort(dataNeed(g)) + " tokens · " + fmtShort(g.train) + " GPU-seconds of training"; },
        () => { const g = nextGen(); return !!g && !S.training && !!S.designed[g.id] && !S.ending; }, "row dim");
      txt(nb, () => trainBlocker(), () => { const g = nextGen(); return !!g && !S.training && !!S.designed[g.id] && !canTrain() && !S.ending; }, "row warn");
      txt(nb, () => { const g = nextGen()!; return "next: " + g.name + " — needs design work."; }, () => { const g = nextGen(); return !!g && !S.designed[g.id] && !S.ending && (flag("researchUnlocked") || S.stage > 1); }, "row dim");
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
        tip: () => "demand ×1.35 · " + fmtMoney(marketingCost()) });
      txt(b, () => "market share: " + fmtPct(marketShare()) + " <span class='dim'>(" + bestRival().name + " has a better model)</span>", () => S.deployed >= 0 && marketShare() < 0.99);
    },
  },
  {
    id: "funding", title: "Investors", visible: () => rv("funding") && S.round < ROUNDS.length,
    build: b => {
      txt(b, () => S.round < ROUNDS.length ? "next: " + ROUNDS[S.round].name + " at <b>" + fmt(ROUNDS[S.round].at) + "</b> tasks" : "");
      bar(b, () => S.round < ROUNDS.length ? Math.log10(1 + S.tasks) / Math.log10(1 + ROUNDS[S.round].at) : 1, () => "", () => S.round < ROUNDS.length);
    },
  },
  {
    id: "robots", title: "Robotics", visible: () => rv("robots"),
    build: b => {
      txt(b, () => "factories: " + fmt(S.factories) + " · robots: <b>" + fmt(S.robots) + "</b> (" + rate(robotRate()) + ")");
      txt(b, () => "materials: " + fmtShort(S.materials) + " t (" + rate(materialRate()) + ")");
      txt(b, () => "robot labor: " + fmtRate(robotLaborTPS()) + " tasks/s", () => S.robots > 0);
      txt(b, () => "robots on building duty add " + fmtShort(robotSlotsRate()) + " GPU slots/s, " + fmtShort(robotChipRate()) + " chips/s, " + fmtShort(robotPowerRate()) + " MW/s", () => robotShare("build") > 0, "row dim");
      const keys: [keyof State["robotAlloc"], string, string][] = [["mine", "mining", "materials"], ["build", "building", "factories, datacenters, fabs, power"], ["labor", "labor", "physical tasks"], ["launch", "launch", "rockets (needs space)"]];
      for (const [k, lbl, what] of keys) {
        const r = div(b, "alloc");
        div(r, "aKey", lbl);
        const v = div(r, "aVal"); const n = el("span", "aNum"); v.appendChild(n);
        const tt = div(r, "tt", what);
        const ctr = div(r, "arrows");
        const mk = (cls: string, d: number) => { const a = div(ctr, cls); a.addEventListener("click", () => { adjustRobot(k, d); refreshNow(); }); };
        mk("up", 10); mk("dn", -10);
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
    id: "infra", title: "Infrastructure", visible: () => rv("infra"),
    build: b => {
      txt(b, () => "slots: " + fmtShort(S.gpu) + " / " + fmtShort(gpuCapacity()) + " GPUs");
      txt(b, () => { const p = perf(); return "power: " + fmtShort(S.powerMW) + " MW / " + fmtShort(powerNeedMW()) + " MW needed" + (p < 0.999 ? " · <span class='warn'>throttled to " + fmtPct(p) + "</span>" : ""); });
      txt(b, () => "chips for sale: " + fmtShort(S.chipStock) + " <span class='dim'>(+" + fmtShort(S.chipRate) + "/s)</span>" + (S.flags.blockade ? " <span class='warn'>· blockade</span>" : ""));
      const r1 = div(b, "btnRow");
      for (const k of DC_KINDS) {
        btn(r1, { label: "build " + k.name, onClick: () => build(k, "dc"), visible: k.ok, enabled: () => S.funds >= k.cost() && S.building.filter(x => x.kind.indexOf("dc:") === 0).length < maxConcurrentBuilds(), buy: true,
          tip: () => "+" + fmtShort(k.amount) + " slots · " + fmtMoney(k.cost()) + " · ~" + Math.round(k.time / permitMult()) + "s" });
      }
      const r2 = div(b, "btnRow");
      for (const k of PLANT_KINDS) {
        btn(r2, { label: k.name, onClick: () => build(k, "plant"), visible: () => k.id === "gas" || k.ok() || (k.id === "nuclear" && S.stage >= 2), enabled: () => k.ok() && S.funds >= k.cost() && S.building.filter(x => x.kind.indexOf("plant:") === 0).length < maxConcurrentBuilds(), buy: true,
          tip: () => "+" + fmtShort(k.amount) + " MW · " + fmtMoney(k.cost()) + (k.ok() ? "" : " · " + k.why()) });
      }
      const list = div(b, "builds");
      addUpd(() => {
        const want = S.building.map(x => x.kind + x.need).join("|");
        if (list.dataset.k !== want) {
          list.dataset.k = want;
          list.innerHTML = "";
          S.building.forEach((x, i) => {
            const row = div(list, "barRow");
            const lb = div(row, "barLbl"); const o = div(row, "bar"); const f = div(o, "barFill");
            row.dataset.i = String(i); (row as any)._lb = lb; (row as any)._f = f;
          });
        }
        Array.from(list.children).forEach((row: any, i) => {
          const x = S.building[i]; if (!x) return;
          const [cat, id] = x.kind.split(":");
          const nm = cat === "dc" ? (DC_KINDS.find(k => k.id === id)?.name || id) : (PLANT_KINDS.find(k => k.id === id)?.name || id);
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
      for (const n of sizes) {
        btn(r, { label: () => (S.stage === 1 && S.tier < 4 ? "rent" : "buy") + " " + (n === 1 ? "a GPU" : "×" + fmtShort(n)), onClick: () => buyGPU(n), buy: true,
          visible: () => { const cap = gpuCapacity(); return (n === 1 && S.gpu < 2000) || (n > 1 && n <= cap / 4 && n >= cap / 3000); },
          enabled: () => gpuBuyable(n), tip: () => fmtMoney(gpuPrice() * n) + (S.stage >= 2 ? " · needs " + fmtShort(n) + " chips in stock" : ""), cls: "small" });
      }
      btn(r, { label: "buy max", onClick: buyMaxGPU, visible: () => S.gpu >= 20, enabled: () => gpuBuyable(1), buy: true, cls: "small", tip: () => "as many as you can afford and fit" });
      txt(b, () => "price: " + fmtMoney(gpuPrice()) + " per GPU" + (gpuRoom() < 1 ? " · <span class='warn'>no room. you need more space</span>" : ""), undefined, "row dim");
      const ab = div(b, "btnRow");
      btn(ab, { label: () => "autobuy: " + (S.autoBuy ? "on" : "off"), onClick: () => { S.autoBuy = !S.autoBuy; }, visible: () => flag("autoBuyUnlocked"), cls: "small" });
      const al = div(b, "allocs");
      txt(al, () => "<b>allocation</b>", () => rv("alloc"), "row sub");
      allocRow(al, "serve", "serving customers", () => rv("alloc") && S.deployed >= 0, () => "everything not allocated elsewhere answers customers");
      allocRow(al, "train", "training", () => rv("alloc"), () => "trains the next model (only while a run is in progress)");
      allocRow(al, "exp", "experiments", () => rv("alloc") && flag("experiments"), () => "each GPU here raises the research cap by 40");
      allocRow(al, "synth", "synthetic data", () => rv("alloc") && flag("synth"), () => "the deployed model writes training data: " + rate(synthRate()) + " tokens");
      allocRow(al, "research", "AI research", () => rv("alloc") && flag("automation"), () => "copies of the internal model doing research: " + rate(aiRP()) + " research");
      allocRow(al, "monitor", "monitoring & alignment", () => rv("alloc") && flag("monitors"), () => "older models watch newer ones. ~4% of compute covers everything");
      allocRow(al, "defense", "defense", () => rv("alloc") && !!S.crisis, () => "respond to the crisis");
    },
  },
  {
    id: "data", title: "Data", visible: () => rv("models") && (S.data > 0 || flag("crawlers")) && S.stage < 5,
    build: b => {
      txt(b, () => "data: <b>" + fmtShort(S.data) + "</b> tokens" + (dataRate() > 0 ? " <span class='dim'>(" + rate(dataRate()) + ")</span>" : ""));
      txt(b, () => "web left to crawl: " + fmtPct(S.webLeft / WEB_TOTAL), () => flag("crawlers"), "row dim");
      const r = div(b, "btnRow");
      btn(r, { label: () => "add crawler (" + S.crawlers + ")", onClick: buyCrawler, visible: () => flag("crawlers") && S.stage <= 2, enabled: () => S.funds >= crawlerCost(), buy: true,
        tip: () => fmtMoney(crawlerCost()) + " · +" + fmtShort(3e5 * S.dataMult * (flag("crawlFarm") ? 3 : 1) * Math.max(0, S.webLeft / WEB_TOTAL)) + " tokens/s" });
      btn(r, { label: "buy dataset", onClick: buyDataset, visible: () => flag("datasets_on") && S.stage <= 3, enabled: () => S.funds >= datasetCost(), buy: true,
        tip: () => fmtMoney(datasetCost()) + " · +" + fmtShort(datasetSize()) + " tokens" });
    },
  },
  {
    id: "research", title: "Research", visible: () => rv("research"),
    build: b => {
      const r = div(b, "btnRow");
      btn(r, { label: () => "hire researcher (" + S.researchers + ")", onClick: () => hire("researcher"), enabled: () => S.funds >= hireCost("researcher"), buy: true, visible: () => S.stage <= 3,
        tip: () => fmtMoney(hireCost("researcher")) + " · +" + S.talent.toFixed(1) + " research/s" });
      btn(r, { label: () => "hire safety (" + S.safety + ")", onClick: () => hire("safety"), visible: () => flag("safetyUnlocked"), enabled: () => S.funds >= hireCost("safety"), buy: true,
        tip: () => fmtMoney(hireCost("safety")) + " · alignment research" });
      bar(b, () => S.rp / rpCap(), () => "research: " + fmt(S.rp) + " / " + fmt(rpCap()) + " (" + rate(rpRate()) + ")");
      txt(b, () => "insights: <b>" + fmt(S.insight, 1) + "</b> <span class='dim'>(" + rate(insightRate()) + (insightCapped() ? ", research is full ×6" : ", ×6 while research is full") + ")</span>", () => flag("insights"));
      txt(b, () => "AI-assisted research: <b>" + aiAssist().toFixed(1) + "x</b> <span class='dim'>(copilots)</span>", () => S.stage === 2 && aiAssist() > 1.05);
      txt(b, () => "AI research multiplier: <b>" + rdMultiplier().toFixed(1) + "x</b>", () => S.internalModel >= 0);
      txt(b, () => "human share of progress: " + fmtPct(humanShare(), humanShare() < 0.1 ? 1 : 0), () => S.internalModel >= 0, "row dim");
    },
  },
  {
    id: "projects", title: "Projects", visible: () => rv("projects"),
    build: b => {
      const list = div(b, "projList");
      const btns: Record<string, HTMLButtonElement> = {};
      addUpd(() => {
        const shown = shownProjects();
        const ids = new Set(shown.map(p => p.id));
        for (const id in btns) if (!ids.has(id)) { btns[id].remove(); delete btns[id]; }
        for (const p of shown) {
          let e = btns[p.id];
          if (!e) {
            e = el("button", "project" + (p.gate ? " gate" : ""));
            e.dataset.buy = "1";
            e.innerHTML = "<b class='pt'></b> <span class='pc'></span><div class='pd'></div>";
            e.addEventListener("click", () => { buyProject(p.id); refreshNow(); });
            list.appendChild(e);
            btns[p.id] = e;
            e.classList.add("blink");
          }
          setText(e.querySelector(".pt") as HTMLElement, p.title);
          setText(e.querySelector(".pc") as HTMLElement, "(" + projectPriceTag(p) + ")");
          setText(e.querySelector(".pd") as HTMLElement, p.desc);
          e.disabled = !projectAffordable(p);
        }
      });
    },
  },
  {
    id: "resources", title: "resources", store: true, visible: () => rv("resources"),
    build: b => {
      storeRow(b, "funds", () => fmtMoneyShort(S.funds), () => true, () => "revenue " + rate(revenue()) + (salaries() > 0 ? " · salaries −" + fmtMoneyShort(salaries()) + "/s" : "") + (S.ubi > 0 ? " · UBI −" + fmtMoneyShort(ubiCost()) + "/s" : ""));
      storeRow(b, "data", () => fmtShort(S.data), () => S.data > 0 || S.dataUsed > 0, () => "crawlers " + rate(crawlRate()) + " · synthetic " + rate(synthRate()) + " · users " + rate(userDataRate()) + " · licences " + rate(dealRate()));
      storeRow(b, "GPUs", () => fmtShort(S.gpu), () => S.gpu > 1 || rv("compute"));
      storeRow(b, "research", () => fmtShort(S.rp), () => flag("researchUnlocked"), () => "humans " + rate(humanRP()) + (aiRP() > 0 ? " · AI " + rate(aiRP()) : ""));
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
      txt(b, () => "alignment research: " + fmt(S.alignRes) + " <span class='dim'>(needed for the frontier: ~" + fmt(alignNeed(frontierCap())) + ")</span>");
      txt(b, () => "warning signs: " + Math.floor(S.alarm), () => S.alarm >= 1, "row warn");
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
        if (tbl.innerHTML !== h) tbl.innerHTML = h;
      });
      txt(b, () => "Nüwa is " + leadText() + ".", () => S.month >= 3);
      const ch = div(b, "chartBox");
      let last = -1;
      addUpd(() => {
        const key = Math.floor(S.month * 5) + S.models.length * 1000;
        if (key !== last) { last = key; ch.innerHTML = drawChart(); }
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
      txt(b, () => "unemployment: " + fmtPct(Math.min(0.95, S.jobs / workforce()), 1));
      bar(b, () => S.unrest / 100, () => "unrest: " + Math.round(S.unrest), undefined, "threat");
      const r = div(b, "btnRow");
      btn(r, { label: "−", onClick: () => { S.ubi = Math.max(0, +(S.ubi - 0.05).toFixed(2)); }, visible: () => flag("ubiUnlocked"), cls: "small" });
      btn(r, { label: "+", onClick: () => { S.ubi = Math.min(0.5, +(S.ubi + 0.05).toFixed(2)); }, visible: () => flag("ubiUnlocked"), cls: "small" });
      txt(r, () => "UBI: " + fmtPct(S.ubi) + " of revenue", () => flag("ubiUnlocked"), "inline");
    },
  },
  {
    id: "public", title: "Public", visible: () => rv("public"),
    build: b => {
      bar(b, () => S.approval / 100, () => "approval: " + Math.round(S.approval) + "%");
      txt(b, () => "jobs automated: " + fmtShort(S.jobs));
      btn(b, { label: "PR campaign", onClick: prCampaign, visible: () => flag("prUnlocked"), enabled: () => S.funds >= prCost(), buy: true, tip: () => fmtMoney(prCost()) + " · approval +4" });
    },
  },
  {
    id: "gov", title: "Government", visible: () => rv("gov"),
    build: b => {
      bar(b, () => S.gov / 100, () => "government trust: " + Math.round(S.gov));
      txt(b, () => "security: SL" + S.security);
      const r = div(b, "btnRow");
      btn(r, { label: () => "upgrade to SL" + (S.security + 1), onClick: upgradeSecurity, visible: () => S.security < 5, enabled: () => S.funds >= securityCost(), buy: true, tip: () => fmtMoney(securityCost()) + " · makes the weights harder to steal" });
      btn(r, { label: "lobby", onClick: lobby, visible: () => flag("lobbyUnlocked"), enabled: () => S.funds >= lobbyCost(), buy: true, tip: () => fmtMoney(lobbyCost()) + " · government trust +6" });
      txt(b, () => "Oversight Committee: in session", () => S.oversight, "row dim");
    },
  },
  {
    id: "stats", title: "Stats", visible: () => rv("stats"),
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
function layoutFor(stage: number): string[][] {
  switch (stage) {
    case 1: return [["crisis", "work", "models", "business", "funding"], ["compute", "data", "research", "projects"], ["resources", "race", "public", "gov", "stats"]];
    case 2: return [["crisis", "models", "infra", "business", "funding"], ["compute", "research", "data", "projects"], ["resources", "race", "public", "gov", "stats"]];
    case 3: return [["crisis", "models", "infra", "data"], ["compute", "research", "projects"], ["resources", "align", "race", "world", "gov", "public", "stats"]];
    case 4: return [["crisis", "models", "robots", "space", "infra", "data"], ["compute", "research", "projects"], ["resources", "align", "world", "society", "race", "gov", "public"]];
    default: return [["work", "space", "models", "robots", "infra"], ["compute", "research", "projects", "data"], ["resources", "race", "align", "world", "society", "gov", "public"]];
  }
}

function buildUI(): void {
  for (const p of PANELS) {
    const e = el("div", "panel" + (p.store ? " store" : ""));
    e.id = "p-" + p.id;
    if (p.store) e.dataset.legend = p.title;
    else { const h = div(e, "ptitle", p.title); void h; }
    const body = div(e, "pbody");
    p.build(body);
    panelEls[p.id] = e;
    e.style.display = "none";
  }
  applyLayout();
  $("menu").addEventListener("click", ev => {
    const t = (ev.target as HTMLElement).dataset.act;
    if (t) menuAction(t);
  });
}

function applyLayout(): void {
  const key = String(S.stage);
  if (key === lastLayoutKey) return;
  lastLayoutKey = key;
  const cols = [$("col1"), $("col2"), $("col3")];
  const lay = layoutFor(S.stage);
  lay.forEach((ids, ci) => { for (const id of ids) if (panelEls[id]) cols[ci].appendChild(panelEls[id]); });
}

let lastStageTitle = "";

function updateUI(): void {
  applyLayout();
  // header
  setText($("tasks"), fmtBig(S.tasks));
  const tps = sold() + (internalModel() ? researchCopies() * rateOf(internalModel()) * 0.5 : 0) + robotLaborTPS() + (S.flags.cosmicTPS || 0);
  setText($("tps"), S.deployed >= 0 || S.ending ? fmtRate(tps) + " per second" : "");
  setText($("dateLine"), monthLabel(S.month, true));
  const title = docTitle();
  if (title !== lastStageTitle) { lastStageTitle = title; document.title = title; setText($("place"), title.toLowerCase()); }
  // panels
  for (const p of PANELS) {
    const e = panelEls[p.id];
    const vis = p.visible();
    if (vis && e.style.display === "none") { e.style.display = ""; e.classList.remove("fadein"); void e.offsetWidth; e.classList.add("fadein"); }
    else if (!vis && e.style.display !== "none") e.style.display = "none";
  }
  for (const u of updaters) u();
  renderLog();
  renderEvent();
  renderBeat();
  renderStats();
  document.body.classList.toggle("dark", S.stage >= 5 && (flag("doom") || flag("humansFalling")));
}

function fmtBig(n: number): string {
  if (n < 1e15) return Math.floor(n).toLocaleString("en-US");
  return fmt(n);
}

function docTitle(): string {
  if (S.ending) return ENDING_NAMES[S.ending] || "The End";
  if (S.stage === 1) {
    if (S.tier >= 3) return "A Startup";
    if (S.tier >= 1) return "A Small Office";
    return "A Garage";
  }
  if (S.stage === 2) return S.gpu > 1e5 ? "A Frontier Lab" : "A Lab";
  if (S.stage === 3) return rdMultiplier() >= 10 ? "The Intelligence Explosion" : "The Project";
  if (S.stage === 4) return S.ladder === "agent" ? "The Race" : "A New World";
  return "The End";
}

// ---------- log (A Dark Room: newest on top, fading into the page) ----------

let logRendered = -1;
function renderLog(): void {
  if (!logDirty && logRendered === S.log.length) return;
  logDirty = false;
  logRendered = S.log.length;
  const box = $("log");
  const html: string[] = [];
  const n = S.log.length;
  for (let i = n - 1, k = 0; i >= 0 && k < 40; i--, k++) {
    const l = S.log[i];
    html.push("<div class='note " + l.cls + (k === 0 ? " fresh" : "") + "' style='opacity:" + Math.max(0.08, 1 - k * 0.055).toFixed(2) + "'>" + escapeHtml(l.text) + "</div>");
  }
  box.innerHTML = html.join("");
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, c => c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;");
}

// ---------- event modal ----------

let eventChoiceBtns: { b: HTMLElement; i: number; ch: Choice }[] = [];
function renderEvent(): void {
  const wrap = $("eventWrap");
  if (!S.activeEvent) { if (wrap.style.display !== "none") wrap.style.display = "none"; eventDirty = false; return; }
  if (eventDirty) {
    eventDirty = false;
    const e = eventById(S.activeEvent.id)!;
    const sc = e.scenes[S.activeEvent.scene];
    wrap.style.display = "flex";
    setText($("eventTitle"), e.title);
    $("eventText").innerHTML = sceneText(sc).map(t => "<p>" + escapeHtml(t) + "</p>").join("");
    const bx = $("eventButtons");
    bx.innerHTML = "";
    eventChoiceBtns = [];
    sc.choices.forEach((ch, i) => {
      const b = div(bx, "btn evbtn");
      b.appendChild(el("span", "lbl", ch.text));
      const tip = typeof ch.tip === "function" ? ch.tip() : ch.tip;
      const costS = ch.cost ? costText(ch.cost()) : "";
      if (tip || costS) div(b, "evtip", [costS, tip].filter(x => x).join(" · "));
      b.addEventListener("click", () => { if (!b.classList.contains("disabled")) { chooseEventOption(i); refreshNow(); } });
      eventChoiceBtns.push({ b, i, ch });
    });
  }
  for (const x of eventChoiceBtns) {
    const ok = (!x.ch.available || x.ch.available()) && canAfford(x.ch.cost ? x.ch.cost() : undefined);
    x.b.classList.toggle("disabled", !ok);
  }
}

// ---------- full-screen beat ----------

function renderBeat(): void {
  const e = $("beat");
  if (!bigBeat || Date.now() > bigBeat.until) { if (e.style.display !== "none") e.style.display = "none"; bigBeat = null; return; }
  e.style.display = "flex";
  const remaining = bigBeat.until - Date.now();
  const phase = Math.floor(remaining / 110) % 2 === 0 || remaining < 1500;
  e.style.visibility = phase ? "visible" : "hidden";
  const h = bigBeat.lines.map(l => "<div>" + escapeHtml(l) + "</div>").join("");
  if (e.innerHTML !== h) e.innerHTML = h;
}

// ---------- stats screen ----------

function renderStats(): void {
  const w = $("statsWrap");
  if (!flag("statsReady") || statsShown || flag("statsDismissed")) { return; }
  statsShown = true;
  w.style.display = "flex";
  const rows = endStats().map(r => "<div class='srow'><span>" + r.k + "</span><span>" + escapeHtml(r.v) + "</span></div>").join("");
  w.innerHTML = "<div id='statsBox'><div class='stitle'>" + escapeHtml(ENDING_NAMES[S.ending] || "the end") + "</div>" + rows +
    "<div class='sbtns'><span data-act='restart'>restart.</span> <span data-act='watch'>keep watching.</span></div></div>";
  w.querySelectorAll("span[data-act]").forEach(s => s.addEventListener("click", () => {
    const a = (s as HTMLElement).dataset.act;
    if (a === "restart") menuAction("restartNow");
    else { setFlag("statsDismissed"); w.style.display = "none"; }
  }));
}

// ---------- menu (A Dark Room: lower-case, full stops) ----------

function menuAction(a: string): void {
  if (a === "save") { saveGame(true); notify("saved"); }
  else if (a === "export") { const code = exportSave(); prompt("save this.", code); }
  else if (a === "import") {
    const code = prompt("put the save code here.");
    if (code && importSave(code)) location.reload();
  }
  else if (a === "restart") { if (confirm("restart the game?")) menuAction("restartNow"); }
  else if (a === "restartNow") { wipeSave(); saveDisabled = true; location.reload(); }
}

function adjustRobot(k: keyof State["robotAlloc"], d: number): void {
  const a = S.robotAlloc;
  const total = a.mine + a.build + a.labor + a.launch;
  if (d > 0) d = Math.min(d, 100 - total);
  if (d < 0) d = Math.max(d, -a[k]);
  a[k] += d;
}

let refreshQueued = false;
function refreshNow(): void {
  if (refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(() => { refreshQueued = false; updateUI(); });
}
