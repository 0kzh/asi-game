// Takeoff — derived quantities. Pure reads of S; no mutation. Everything the UI shows comes through here.

const ELASTICITY = 2.4;
const WEB_TOTAL = 2.5e12;

function ladder(): GenDef[] { return S.ladder === "safer" ? SAFER_GENS : GENS; }

function nextGen(): GenDef | null {
  const l = ladder();
  return S.next < l.length ? l[S.next] : null;
}

function modelAt(i: number): ModelRec | null { return i >= 0 && i < S.models.length ? S.models[i] : null; }
function deployed(): ModelRec | null { return modelAt(S.deployed); }
function readyModel(): ModelRec | null { return modelAt(S.ready); }
function internalModel(): ModelRec | null { return modelAt(S.internalModel); }

/** Effective capability of a model right now (post-training improvements lift every model). */
function capOf(m: ModelRec | null): number { return m ? m.cap * S.capMult : 0; }

function frontierCap(): number {
  let best = 0;
  for (const m of S.models) if (!m.shutdown) best = Math.max(best, capOf(m));
  return best;
}

function bestRival(): { id: string; name: string; cap: number } {
  let best = { id: "", name: "", cap: 0 };
  for (const r of RIVALS) {
    const c = rivalCap(r.id);
    if (c > best.cap) best = { id: r.id, name: r.name, cap: c };
  }
  return best;
}

function rivalCap(id: string): number {
  const r = RIVALS.find(x => x.id === id)!;
  if (S.flags["rivalGone_" + id]) return 0;
  let m = S.month;
  // On the slowdown branch the US consolidates compute and sabotages Tianwan: Nüwa's clock runs slower.
  if (id === "nuwa" && S.ladder === "safer" && m > 28) m = 28 + (m - 28) * (flag("weightsStolen") ? 0.8 : 0.6);
  return scheduleAt(r.schedule, m) * (S.rivalBoost[id] || 1);
}

// ---------- compute ----------

function gpuCapacity(): number {
  const second = flag("parallel") ? 800 : 0;
  if (S.stage >= 2 || S.tier >= TIERS.length - 1) return TIERS[3].cap + second + S.dcCap + S.orbital;
  return TIERS[S.tier].cap + (S.tier >= 3 ? second : 0);
}

function gpuPrice(): number {
  if (S.stage === 1 && S.tier < 4) return TIERS[S.tier].price;
  // Stage 2+: an H100-equivalent gets cheaper every month (chip efficiency), dearer under blockade.
  const base = 400 * Math.pow(0.975, Math.max(0, S.month - 6));
  return base * (S.flags.blockade ? 3 : 1) * (S.flags.exportDeal ? 0.85 : 1);
}

function powerNeedMW(): number { return S.gpu * 0.0012; }

/** 0..1: GPUs throttle when power is short (Paperclips' powMod). Stage 1 rides the grid. */
function perf(): number {
  if (S.stage === 1) return 1;
  const need = powerNeedMW();
  if (need <= 0) return 1;
  let p = Math.min(1, S.powerMW / need);
  if (S.crisis && S.crisis.id === "robots" && !S.crisis.resolved) p *= 1 - 0.7 * S.crisis.threat;
  return p;
}

interface Split { train: number; exp: number; synth: number; research: number; monitor: number; defense: number; serve: number; }

/** How the GPUs are actually being used this tick. Unused shares fall back to serving customers. */
function split(): Split {
  const g = S.gpu;
  const a = S.alloc;
  const out: Split = { train: 0, exp: 0, synth: 0, research: 0, monitor: 0, defense: 0, serve: 0 };
  // Before anything is deployed, every GPU trains (there's nothing else to do with it).
  if (S.training && S.deployed < 0) { out.train = g; return out; }
  const used0 = allocUsed();
  const scale = used0 > 100 ? 100 / used0 : 1; // never hand out more than every GPU
  for (const k of ALLOC_KEYS) if (allocActive(k)) out[k] = g * a[k] / 100 * scale;
  const used = out.train + out.exp + out.synth + out.research + out.monitor + out.defense;
  out.serve = Math.max(0, g - used);
  if (S.deployed < 0) out.serve = 0;
  return out;
}

function gpcOf(m: ModelRec | null): number {
  if (!m) return 1;
  return genById(m.id).gpc / S.serveMult;
}

function copies(): number {
  const m = deployed();
  if (!m) return 0;
  return split().serve * perf() / gpcOf(m);
}

function researchCopies(): number {
  const m = internalModel();
  if (!m) return 0;
  return split().research * perf() / gpcOf(m);
}

/** Tasks per second per copy, scaled by post-training gains. */
function rateOf(m: ModelRec | null): number {
  if (!m) return 0;
  const g = genById(m.id);
  return g.rate * S.speedMult * Math.pow(S.capMult, 1.2);
}

function taskCapacity(): number { return copies() * rateOf(deployed()); }

// ---------- demand & revenue ----------

function marketShare(): number {
  const ours = capOf(deployed());
  const best = bestRival().cap;
  if (ours <= 0) return 0;
  if (ours >= best) return 1;
  return clamp(Math.pow(ours / best, 2.2), 0.2, 1);
}

function approvalFactor(): number { return 0.55 + 0.9 * clamp(S.approval, 0, 100) / 100; }

function mktMult(): number { return Math.pow(1.35, S.mkt) * S.mktMult; }

/** Customers' demand (tasks/s) at a given price. */
function demandAt(price: number): number {
  const m = deployed();
  if (!m) return 0;
  const g = genById(m.id);
  const base = g.demand0 * Math.pow(S.capMult, 1.5) * S.markets * mktMult() * S.hype * approvalFactor() * marketShare();
  return base * Math.pow(g.price0 / Math.max(price, 1e-9), ELASTICITY);
}

function demand(): number { return demandAt(S.price); }

/** The price at which demand exactly meets capacity (what autopricing chases). */
function clearingPrice(): number {
  const m = deployed();
  if (!m) return S.price;
  const g = genById(m.id);
  const cap = taskCapacity();
  if (cap <= 0) return g.price0;
  const d0 = demandAt(g.price0);
  const p = g.price0 * Math.pow(d0 / cap, 1 / ELASTICITY);
  return clamp(p, g.price0 * 0.02, g.price0 * 8);
}

function sold(): number { return Math.min(taskCapacity(), demand()); }
function revenue(): number { return sold() * S.price; }

function salaries(): number {
  const per = S.stage >= 2 ? 6 : 0.25;
  return (S.researchers + S.safety) * per * Math.pow(1.03, Math.max(0, S.month - 6));
}

function ubiCost(): number { return S.ubi * revenue(); }

function netIncome(): number { return revenue() - salaries() - ubiCost() + robotIncome(); }

// ---------- research ----------

/** Stage 2: humans with AI copilots (AI 2027: Agent-1 ≈ 1.5x, Agent-2 ≈ 3x). Stage 3+: the AIs do it themselves. */
function aiAssist(): number {
  if (S.stage < 2) return 1;
  if (S.stage >= 3) { // frozen at automation: the humans keep their copilots, then fade
    if (!S.flags.assistS3) S.flags.assistS3 = Math.min(25, copilotBoost()); // saves from before this existed
    return S.flags.assistS3;
  }
  return copilotBoost();
}

function copilotBoost(): number { return clamp(Math.pow(capOf(deployed()) / 80, 2), 1, 40); }

/** Raw human research, before any AI help. Human researchers are your best source of progress… until they aren't. */
function humanRaw(): number {
  const fade = S.stage >= 3 ? Math.max(0.25, 1 - 0.04 * Math.max(0, S.month - 19)) : 1;
  return S.researchers * S.talent * fade;
}

function humanRP(): number { return humanRaw() * aiAssist(); }

function researchSkill(cap: number): number {
  // Steep up to superintelligence, then diminishing returns (compute-bottlenecked, as AI 2027 argues).
  const c = cap / 100;
  return 6.5e-6 * Math.pow(Math.min(c, 10), 2.6) * Math.pow(Math.max(1, c / 10), 1.4) * S.aiResearch;
}

function aiRP(): number {
  const m = internalModel();
  if (!m) return 0;
  return researchCopies() * researchSkill(capOf(m)) * (S.neuralese ? 1.6 : 1);
}

function rpRate(): number { return humanRP() + aiRP(); }

/** Paperclips' memory: the research cap. Early it's experiment compute; once the AIs do research, it scales with them. */
function rpCap(): number {
  const exp = split().exp * perf();
  return 100 + S.rpCapBonus + exp * 40 + (S.stage >= 3 ? 2500 * rpRate() : 0);
}

/** AI 2027's "AI R&D progress multiplier": total progress relative to unaided humans. */
function rdMultiplier(): number {
  const h = humanRaw();
  if (h <= 0) return aiRP() > 0 ? 99 : 1;
  return (humanRP() + aiRP()) / h;
}

function humanShare(): number {
  const tot = rpRate();
  return tot > 0 ? humanRaw() / tot : 1;
}

function insightCapped(): boolean { return S.rp >= rpCap() - 0.5; }

/** Paperclips' creativity, softened: a trickle from research, ×6 while research sits at its cap. */
function insightRate(): number {
  if (!flag("insights")) return 0;
  const base = 0.008 * Math.sqrt(Math.max(1, rpRate()));
  return insightCapped() ? base * 6 + 0.05 : base;
}

// ---------- data ----------

function crawlRate(): number {
  // Stage 2 crawlers are whole fleets, not scripts.
  return S.crawlers * 3e5 * (flag("crawlFarm") ? 3 : 1) * (S.stage >= 2 ? 400 : 1) * S.dataMult * Math.max(0, S.webLeft / WEB_TOTAL);
}

function synthRate(): number {
  if (!flag("synth")) return 0;
  const m = deployed() || internalModel();
  const q = m ? Math.pow(capOf(m) / 100, 1.5) : 0.2;
  return split().synth * perf() * 3e4 * q * S.dataMult;
}

function userDataRate(): number { return flag("userData") ? sold() * 1500 * S.dataMult : 0; }

function dealRate(): number { return S.dataDeals * 2e8 * S.dataMult * Math.max(0.05, S.webLeft / WEB_TOTAL); }

function dataRate(): number { return crawlRate() + synthRate() + userDataRate() + dealRate(); }

// ---------- training ----------

function trainRate(): number {
  if (!S.training) return 0;
  if ((S.flags.trainPauseUntil || 0) > S.t) return 0;
  const sp = split();
  return sp.train * perf() * S.trainMult;
}

function trainEta(): number {
  if (!S.training) return 0;
  const r = trainRate();
  if (r <= 0) return Infinity;
  return (S.training.need - S.training.progress) / r;
}

function dataNeed(g: GenDef): number { return g.data / S.dataMult; }

// ---------- society ----------

function workforce(): number { return 3.4e9; }

function jobsNow(): number {
  const tps = sold() + robotLaborTPS();
  const m = deployed();
  const capF = m ? clamp(capOf(m) / 100, 0.1, 20) : 0;
  return Math.min(workforce() * 0.9, 0.02 * Math.pow(tps, 0.92) * capF);
}

// ---------- alignment ----------

/** How much of the frontier model's reasoning humans can still read (0..1). */
function legibility(): number {
  let l = S.interp;
  if (S.neuralese) l *= 0.3;
  return clamp(l, 0, 1);
}

/** Monitor strength: older models watching newer ones. Falls as the gap widens. */
function monitorStrength(): number {
  if (!flag("monitors") || S.models.length < 2) return 0;
  const sp = split();
  const frontier = frontierCap();
  let watcher = 0;
  for (const m of S.models) if (capOf(m) < frontier) watcher = Math.max(watcher, capOf(m));
  const ratio = frontier > 0 ? watcher / frontier : 0;
  const coverage = clamp((sp.monitor / Math.max(1, S.gpu)) * 25, 0, 1); // 4% of compute ≈ full coverage
  return clamp(coverage * Math.pow(ratio, 0.8), 0, 1);
}

/** What the dashboards say. Deceptive models look fine when you can't read them. */
function alignConfidence(): number {
  const m = frontierModel();
  if (!m) return 1;
  const visibility = clamp(0.25 + 0.5 * legibility() + 0.35 * monitorStrength(), 0, 1);
  return clamp(1 - m.misalign * visibility * 1.1, 0.02, 0.99);
}

function frontierModel(): ModelRec | null {
  let best: ModelRec | null = null;
  for (const m of S.models) if (!m.shutdown && (!best || capOf(m) > capOf(best))) best = m;
  return best;
}

/** Alignment research "needed" to keep a model of capability c honest. */
function alignNeed(c: number): number { return 2000 * Math.pow(Math.max(c, 50) / 100, 2.2); }

function alignRate(): number {
  const fromStaff = S.safety * 0.5 * (S.stage >= 3 ? 1.5 : 1);
  const fromAI = flag("alignCompute") ? split().monitor * perf() * 0.00002 * Math.pow(Math.max(1, capOf(internalModel() || deployed())) / 100, 1.5) : 0;
  return fromStaff + fromAI;
}

// ---------- robots & space (stage 4) ----------
// Factories build robots; robots on "building" duty build factories, datacenters, fabs and power plants.
// AI 2027: "a million robots a month" by the end of 2028 — an economy doubling every few minutes of game time.

function robotShare(k: keyof State["robotAlloc"]): number { return S.robots * S.robotAlloc[k] / 100; }
function robotLaborTPS(): number { return robotShare("labor") * 0.5; }
function robotIncome(): number { return robotLaborTPS() * 20; }
function materialRate(): number { return robotShare("mine") * 0.08 + S.launches * (flag("asteroids") ? 40 : 0); }
function factoryBuildRate(): number { return robotShare("build") * 2.2e-5 * (flag("robotOpt") ? 1.8 : 1); }
function robotRate(): number { return S.factories * 1.5 * (flag("robotOpt") ? 2 : 1); }
function robotSlotsRate(): number { return robotShare("build") * 4; }
function robotChipRate(): number { return robotShare("build") * 2.5; }
function robotPowerRate(): number { return robotShare("build") * 0.004; }

function totalTPS(): number { return sold() + robotLaborTPS() + (S.flags.cosmicTPS || 0); }
