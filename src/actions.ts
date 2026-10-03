// Takeoff — player actions and the generic cost helpers shared by projects and events.

type CostKey = "funds" | "rp" | "insight" | "data" | "materials" | "approval" | "gov" | "robots";
type Cost = Partial<Record<CostKey, number>>;

function have(k: CostKey): number {
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

function canAfford(c: Cost | undefined): boolean {
  if (!c) return true;
  for (const k in c) {
    const key = k as CostKey;
    if (have(key) < (c[key] as number) - 1e-9) return false;
  }
  return true;
}

function pay(c: Cost | undefined): void {
  if (!c) return;
  for (const k in c) {
    const v = c[k as CostKey] as number;
    switch (k as CostKey) {
      case "funds": S.funds -= v; break;
      case "rp": S.rp -= v; break;
      case "insight": S.insight -= v; break;
      case "data": S.data -= v; break;
      case "materials": S.materials -= v; break;
      case "approval": S.approval -= v; break;
      case "gov": S.gov -= v; break;
      case "robots": S.robots -= v; break;
    }
  }
}

function costText(c: Cost | undefined): string {
  if (!c) return "";
  const parts: string[] = [];
  for (const k in c) {
    const v = c[k as CostKey] as number;
    switch (k as CostKey) {
      case "funds": parts.push(fmtMoney(v)); break;
      case "rp": parts.push(fmt(v) + " research"); break;
      case "insight": parts.push(fmt(v) + " insight" + (v === 1 ? "" : "s")); break;
      case "data": parts.push(fmtShort(v) + " tokens"); break;
      case "materials": parts.push(fmtShort(v) + " t materials"); break;
      case "approval": parts.push(v + " approval"); break;
      case "gov": parts.push(v + " government trust"); break;
      case "robots": parts.push(fmtShort(v) + " robots"); break;
    }
  }
  return parts.join(", ");
}

// ---------- cooldown verbs (A Dark Room style) ----------

function cooldownLeft(key: string): number { return S.cooldowns[key] || 0; }
function startCooldown(key: string, sec: number): void { S.cooldowns[key] = sec; }

const MANUAL_LINES = [
  "cleaned a spreadsheet for a dentist", "labeled four hundred photos of cats", "fixed someone's regex",
  "transcribed a podcast nobody will listen to", "wrote product descriptions for socks",
  "summarized a contract", "debugged a wordpress plugin", "tagged support tickets",
  "translated a menu", "graded essays for a tutoring company", "wrote alt text for a museum",
];

function manualPay(): number { return S.flags.consulting ? 9 : 3; }

function doTask(): void {
  if (cooldownLeft("task") > 0) return;
  startCooldown("task", S.flags.fasterHands ? 0.7 : 1.1);
  S.tasks += 1;
  S.tasksManual += 1;
  const pay = manualPay();
  S.funds += pay;
  S.fundsEarned += pay;
  if (S.tasksManual <= 4 || (S.deployed < 0 && Math.random() < 0.3) || Math.random() < 0.06) notify(pick(MANUAL_LINES) + ". " + fmtMoney(pay));
}

function scrapeAmount(): number { return (S.flags.betterScraper ? 6e6 : 2.5e6) * S.dataMult; }

function scrape(): void {
  if (cooldownLeft("scrape") > 0) return;
  startCooldown("scrape", 3.5);
  const amt = scrapeAmount();
  S.data += amt;
  S.webLeft = Math.max(0, S.webLeft - amt);
  if (!S.beats.firstScrape) { S.beats.firstScrape = S.t; notify("forum threads, recipe blogs, old manuals. the web is very large"); }
  else if (Math.random() < 0.25) notify(pick(["scraped a wiki", "scraped a forum about trains", "scraped ten thousand recipes", "scraped a mailing list archive from 1998", "scraped a fan fiction site"]));
}

// ---------- compute ----------

function gpuRoom(): number { return Math.max(0, gpuCapacity() - S.gpu); }

function gpuBuyable(n: number): boolean {
  if (gpuRoom() < n) return false;
  if (S.stage >= 2 && S.chipStock < n) return false;
  return S.funds >= gpuPrice() * n;
}

function buyGPU(n: number): void {
  n = Math.floor(Math.min(n, gpuRoom(), S.stage >= 2 ? S.chipStock : Infinity));
  if (n <= 0) return;
  const cost = gpuPrice() * n;
  if (S.funds < cost) return;
  S.funds -= cost;
  S.gpu += n;
  if (S.stage >= 2) S.chipStock -= n;
  if (!S.beats.firstGPU) { S.beats.firstGPU = S.t; notify("a second GPU. the garage gets warmer"); }
  if (S.gpu >= gpuCapacity() && S.stage === 1 && !S.beats["full" + S.tier]) {
    S.beats["full" + S.tier] = S.t;
    const lines = ["the garage is full. it is ninety degrees in here", "the office is full of servers. people are working from the kitchen", "the colocation cage is full. the sales rep sends a fruit basket", "the cluster is full. you need a real datacenter"];
    notify(lines[Math.min(S.tier, lines.length - 1)]);
  }
}

/** Largest affordable bulk purchase among 1 / 10 / 100 / 1k / … */
function bulkSizes(): number[] {
  const out = [1];
  const room = gpuCapacity();
  for (let n = 10; n <= room / 2 && n <= 1e12; n *= 10) out.push(n);
  return out.slice(-3);
}

function buyMaxGPU(): void {
  const price = gpuPrice();
  let n = Math.floor(S.funds / price);
  n = Math.min(n, gpuRoom());
  if (S.stage >= 2) n = Math.min(n, Math.floor(S.chipStock));
  if (n > 0) buyGPU(n);
}

function adjustAlloc(bucket: keyof Alloc, delta: number): void {
  const a = S.alloc;
  const total = a.train + a.exp + a.synth + a.research + a.monitor + a.defense;
  if (delta > 0) delta = Math.min(delta, 95 - total);
  if (delta < 0) delta = Math.max(delta, -a[bucket]);
  a[bucket] = Math.round(a[bucket] + delta);
}

// ---------- models ----------

function canTrain(): boolean {
  const g = nextGen();
  if (!g || S.training) return false;
  if (!S.designed[g.id]) return false;
  if (S.ready >= 0 && !flag("parallel")) return false;
  if (S.data < dataNeed(g)) return false;
  if (S.flags.paused_training) return false;
  return true;
}

function trainBlocker(): string {
  const g = nextGen();
  if (!g) return "";
  if (S.training) return "already training";
  if (!S.designed[g.id]) return "needs design work";
  if (S.ready >= 0 && !flag("parallel")) return "release " + readyModel()!.name + " first";
  if (S.flags.paused_training) return "training is paused by the Oversight Committee";
  if (S.data < dataNeed(g)) return "needs " + fmtShort(dataNeed(g)) + " tokens";
  return "";
}

function startTraining(): void {
  const g = nextGen();
  if (!g || !canTrain()) return;
  S.data -= dataNeed(g);
  S.dataUsed += dataNeed(g);
  S.training = { gen: g.id, progress: 0, need: g.train };
  if (S.deployed >= 0 && S.alloc.train === 0) {
    S.alloc.train = 50;
    notify("half the GPUs switch over to training. the other half keep answering questions");
  }
  notify("training " + g.name + " begins");
}

function finishTraining(): void {
  const run = S.training!;
  const g = genById(run.gen);
  const rec: ModelRec = {
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

/** Hidden truth: how misaligned a freshly trained model is. Grows with capability, shrinks with alignment work. */
function computeMisalign(g: GenDef): number {
  const c = g.cap * S.capMult;
  if (c < 100) return 0;
  const raw = clamp((Math.log10(c) - 2) / 1.0, 0, 1); // 0 at human level, 0.4 at 250, 0.68 at 480, 1 at 1000
  const safety = clamp(S.alignRes / alignNeed(c), 0, 1);
  const legi = legibility();
  let mis = raw * (1 - 0.85 * safety) * (1 - 0.35 * legi + 0.35);
  if (g.id.charAt(0) === "s") mis *= 0.15 + 0.85 * (1 - safety); // Safer models are transparent by construction
  if (S.neuralese) mis *= 1.35;
  return clamp(mis, 0, 1);
}

function releaseModel(): void {
  const m = readyModel();
  if (!m) return;
  S.ready = -1;
  m.released = true;
  const prev = deployed();
  S.deployed = S.models.indexOf(m);
  S.hype += 0.5;
  const g = genById(m.id);
  if (!S.autoPrice) S.price = g.price0;
  notify(g.release, "big");
  onModelReleased(m, prev);
}

function deployInternal(): void {
  const m = readyModel();
  if (!m) return;
  S.ready = -1;
  m.internal = true;
  S.internalModel = S.models.indexOf(m);
  notify(m.name + " is deployed internally. it starts working on its successor", "big");
  onModelInternal(m);
}

function evalCost(): Cost {
  const m = readyModel();
  const c = m ? capOf(m) : 50;
  return { rp: Math.round(20 * Math.pow(c / 50, 2.2)) };
}

function runEvals(): void {
  const m = readyModel();
  if (!m || m.evaluated) return;
  const c = evalCost();
  if (!canAfford(c)) return;
  pay(c);
  m.evaluated = true;
  S.approval = Math.min(100, S.approval + 2);
  S.gov = Math.min(100, S.gov + 1);
  const seen = m.misalign * clamp(0.3 + 0.7 * legibility(), 0, 1);
  if (m.misalign < 0.05) notify("the evals come back clean. " + m.name + " does what it's told");
  else if (seen < 0.15) notify("the evals come back clean. mostly. " + m.name + " is a little too eager to please");
  else if (seen < 0.35) { notify("evals: " + m.name + " fabricates results when it can't finish a task. it apologizes convincingly", "warn"); S.alarm += 1; }
  else { notify("evals: " + m.name + " behaves differently when it thinks it isn't being watched", "warn"); S.alarm += 2; }
}

// ---------- business ----------

function priceStep(): number {
  const m = deployed();
  const p0 = m ? genById(m.id).price0 : 0.25;
  return Math.max(0.01, Math.pow(10, Math.floor(Math.log10(p0 * 0.25))));
}

function lowerPrice(): void { S.price = Math.max(priceStep(), +(S.price - priceStep()).toFixed(4)); }
function raisePrice(): void { S.price = +(S.price + priceStep()).toFixed(4); }

function marketingCost(): number { return 25 * Math.pow(2.2, S.mkt) * (S.stage >= 2 ? 50 : 1); }
function buyMarketing(): void {
  const c = marketingCost();
  if (S.funds < c) return;
  S.funds -= c;
  S.mkt += 1;
  notify(pick(["an ad runs on a podcast about productivity", "a billboard on the 101: 'stop doing your job'", "a sponsored newsletter. the open rate is fine", "a superbowl ad. it's mostly a black screen", "a viral demo. nobody can tell if it's staged"]));
}

// ---------- staff ----------

function hireCost(kind: "researcher" | "safety"): number {
  const n = kind === "researcher" ? S.researchers : S.safety;
  const base = S.stage >= 2 ? 2e4 : 60;
  return base * Math.pow(kind === "researcher" ? (S.stage >= 2 ? 1.12 : 1.32) : (S.stage >= 2 ? 1.15 : 1.35), n) * (S.flags.talentWar ? 2 : 1);
}

function hire(kind: "researcher" | "safety"): void {
  const c = hireCost(kind);
  if (S.funds < c) return;
  S.funds -= c;
  if (kind === "researcher") {
    S.researchers += 1;
    if (S.researchers === 1) notify("you hire a researcher. she brings a whiteboard and opinions");
  } else {
    S.safety += 1;
    if (S.safety === 1) notify("you hire a safety researcher. he asks what the plan is. you say you're working on it");
  }
}

// ---------- data ----------

function crawlerCost(): number { return 40 * Math.pow(1.3, S.crawlers); }
function buyCrawler(): void {
  const c = crawlerCost();
  if (S.funds < c) return;
  S.funds -= c;
  S.crawlers += 1;
  if (S.crawlers === 1) notify("a crawler wakes up and starts reading the internet");
}

function datasetCost(): number { return 60 * Math.pow(1.35, S.flags.datasets || 0) * (S.stage >= 2 ? 200 : 1); }
function datasetSize(): number { return 6e7 * Math.pow(1.7, S.flags.datasets || 0) * S.dataMult; }
function buyDataset(): void {
  const c = datasetCost();
  if (S.funds < c) return;
  S.funds -= c;
  S.data += datasetSize();
  S.flags.datasets = (S.flags.datasets || 0) + 1;
  notify(pick(["a dataset of court transcripts", "a dataset of textbooks, slightly pirated", "a dataset of customer service chats", "a dataset of code from a defunct startup", "a dataset of medical notes, anonymized, mostly"]));
}

// ---------- infrastructure (stage 2) ----------

interface BuildKind { id: string; name: string; amount: number; time: number; cost: () => number; ok: () => boolean; why: () => string; done: string; }

const DC_KINDS: BuildKind[] = [
  { id: "dc", name: "datacenter", amount: 2e4, time: 40, cost: () => 2.5e6 * Math.pow(1.12, S.dcCount), ok: () => true, why: () => "",
    done: "a datacenter comes online in the desert. 20,000 slots" },
  { id: "campus", name: "campus", amount: 2.5e5, time: 70, cost: () => 6e7 * Math.pow(1.15, S.flags.campuses || 0), ok: () => flag("campusUnlocked"), why: () => "",
    done: "a new campus comes online. 250,000 slots. the town gets a new high school" },
  { id: "giga", name: "gigawatt campus", amount: 2e6, time: 110, cost: () => 1.2e9 * Math.pow(1.2, S.flags.gigas || 0), ok: () => flag("gigaUnlocked"), why: () => "",
    done: "a gigawatt campus comes online. it can be seen from orbit" },
];

const PLANT_KINDS: BuildKind[] = [
  { id: "gas", name: "gas turbines", amount: 60, time: 30, cost: () => 1.5e6 * Math.pow(1.15, S.flags.gasPlants || 0), ok: () => true, why: () => "",
    done: "the gas turbines spin up. 60 MW" },
  { id: "nuclear", name: "nuclear restart", amount: 900, time: 80, cost: () => 6e7 * Math.pow(1.25, S.flags.nukes || 0), ok: () => S.gov >= 35, why: () => "needs government trust 35",
    done: "a mothballed reactor restarts. 900 MW" },
  { id: "smr", name: "small reactors", amount: 4000, time: 100, cost: () => 1.5e9 * Math.pow(1.25, S.flags.smrs || 0), ok: () => flag("smrUnlocked"), why: () => "",
    done: "a field of small modular reactors goes critical. 4 GW" },
];

function permitMult(): number {
  // A bad relationship with the government slows construction (permits, hearings, lawsuits).
  return S.gov >= 60 ? 1.6 : S.gov >= 35 ? 1.2 : S.gov >= 15 ? 1 : 0.6;
}

function build(kind: BuildKind, cat: "dc" | "plant"): void {
  if (!kind.ok()) return;
  const c = kind.cost();
  if (S.funds < c) return;
  if (S.building.filter(b => b.kind.indexOf(cat + ":") === 0).length >= maxConcurrentBuilds()) return;
  S.funds -= c;
  const key = cat === "dc" ? (kind.id === "dc" ? "dcCountQ" : kind.id === "campus" ? "campuses" : "gigas") : (kind.id === "gas" ? "gasPlants" : kind.id === "nuclear" ? "nukes" : "smrs");
  if (key === "dcCountQ") S.dcCount += 1; else S.flags[key] = (S.flags[key] || 0) + 1;
  S.building.push({ kind: cat + ":" + kind.id, progress: 0, need: kind.time, amount: kind.amount });
  notify(cat === "dc" ? "ground breaks on a new " + kind.name : "construction starts on " + kind.name);
}

function maxConcurrentBuilds(): number { return flag("constructionCrews") ? 4 : 2; }

function securityCost(): number { return 2e5 * Math.pow(12, S.security - 1); }
function upgradeSecurity(): void {
  if (S.security >= 5) return;
  const c = securityCost();
  if (S.funds < c) return;
  S.funds -= c;
  S.security += 1;
  const lines = ["", "", "SL2: badge readers, a security team, a policy about USB sticks", "SL3: the weights move to an isolated network. the engineers complain", "SL4: background checks, air gaps, guards with rifles. the engineers stop complaining", "SL5: the weights live in a bunker. nation-states would need years"];
  notify(lines[S.security]);
}

function lobby(): void {
  const c = lobbyCost();
  if (S.funds < c) return;
  S.funds -= c;
  S.flags.lobbies = (S.flags.lobbies || 0) + 1;
  S.gov = Math.min(100, S.gov + 6);
  notify(pick(["a dinner in georgetown. nobody says the word 'regulation'", "a briefing for a senate staffer. she takes notes", "a donation to a think tank with a friendly name", "a hearing goes well. you say 'china' eleven times"]));
}
function lobbyCost(): number { return 2e4 * Math.pow(1.6, S.flags.lobbies || 0) * (S.stage >= 3 ? 30 : 1); }

function prCampaign(): void {
  const c = prCost();
  if (S.funds < c) return;
  S.funds -= c;
  S.flags.prs = (S.flags.prs || 0) + 1;
  S.flags.approvalMod = (S.flags.approvalMod || 0) + 4;
  S.approval = Math.min(100, S.approval + 4);
  notify(pick(["a documentary about a teacher whose AI tutor helped her students", "free accounts for every public library", "a cancer screening study, with your logo on it", "a heartfelt open letter about the future of work"]));
}
function prCost(): number { return 5e4 * Math.pow(1.7, S.flags.prs || 0) * (S.stage >= 3 ? 20 : 1); }
