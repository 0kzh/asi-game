// Takeoff — the single state object, plus save / load / export (A Dark Room style: one JSON blob).

interface ModelRec {
  id: string;
  name: string;
  cap: number;          // capability at completion (bonuses baked in)
  month: number;        // game month it finished training
  released: boolean;    // public release
  internal: boolean;    // deployed internally (stage 3+)
  evaluated: boolean;
  misalign: number;     // hidden: how misaligned this model actually is (0..1)
  shutdown?: boolean;   // taken offline (the slowdown branch shuts Agent-4 down)
}

interface TrainingRun { gen: string; progress: number; need: number; }

interface Building { kind: string; progress: number; need: number; amount: number; }

interface LogLine { t: number; text: string; cls: string; }

interface ActiveEvent { id: string; scene: string; }

interface Crisis {
  id: string;
  name: string;
  threat: number;     // 0..1 how bad it is (1 = catastrophe)
  progress: number;   // 0..1 response progress (1 = resolved)
  started: number;    // t
  deaths: number;
  resolved: boolean;
}

interface Alloc { train: number; exp: number; synth: number; monitor: number; research: number; defense: number; }

interface Metrics {
  idle: number;                 // seconds with nothing actionable
  idleStreak: number;
  longestIdle: number;
  noGoalSeconds: number;        // seconds with no greyed-out goal visible
  reveals: { id: string; t: number }[];
  firstChoice: number;          // t of first event choice (-1 none)
  stageTimes: number[];         // t at which each stage started
}

interface State {
  v: number;
  t: number;
  stage: number;
  month: number;
  paused: boolean;

  tasks: number;
  tasksManual: number;
  funds: number;
  fundsEarned: number;
  data: number;
  dataUsed: number;
  webLeft: number;
  crawlers: number;
  dataDeals: number;

  gpu: number;
  tier: number;
  dcCap: number;
  dcCount: number;
  building: Building[];
  powerMW: number;
  plants: number;
  chipStock: number;
  chipRate: number;      // GPUs per second the foundries will sell you
  autoBuy: boolean;

  alloc: Alloc;

  models: ModelRec[];
  deployed: number;
  internalModel: number;
  training: TrainingRun | null;
  ready: number;
  ladder: string;          // "agent" | "safer"
  next: number;            // index into current ladder of next model to train
  designed: Record<string, number>;
  capMult: number;         // algorithmic / post-training improvements (applies to all models)
  trainMult: number;       // training efficiency
  serveMult: number;       // inference efficiency (fewer GPUs per copy)
  speedMult: number;       // tasks per copy multiplier
  dataMult: number;        // data efficiency

  price: number;
  autoPrice: boolean;
  mkt: number;
  mktMult: number;
  hype: number;
  markets: number;         // new markets multiplier
  share: number;

  researchers: number;
  safety: number;
  talent: number;          // RP per researcher
  rp: number;
  rpCapBonus: number;
  insight: number;
  aiResearch: number;      // multiplier on AI research effectiveness

  approval: number;
  gov: number;
  security: number;
  oversight: boolean;
  alignRes: number;
  interp: number;
  neuralese: boolean;
  monitorsOn: boolean;
  alarm: number;           // accumulated warning signs seen (0..)
  rivalBoost: Record<string, number>;
  stolen: number;
  jobs: number;
  unrest: number;
  ubi: number;             // fraction of revenue diverted (0..0.5)
  tension: number;         // US–China tension 0..100
  treaty: number;          // treaty progress 0..100

  robots: number;
  factories: number;
  materials: number;
  robotAlloc: { mine: number; build: number; labor: number; launch: number };
  orbital: number;         // orbital compute (H100e)
  launches: number;
  dyson: number;           // 0..1
  probes: number;
  explored: number;        // fraction of the reachable universe
  humans: number;          // billions

  crisis: Crisis | null;
  crisesDone: Record<string, string>;

  round: number;
  flags: Record<string, number>;
  revealed: Record<string, number>;
  projBought: Record<string, number>;
  projShown: Record<string, number>;
  beats: Record<string, number>;
  eventsDone: Record<string, number>;
  eventQueue: string[];
  activeEvent: ActiveEvent | null;
  nextRandom: number;
  choices: { t: number; id: string; choice: string }[];
  cooldowns: Record<string, number>;
  log: LogLine[];
  ending: string;
  endT: number;
  peak: { copies: number; revenue: number; cap: number; gpu: number; tps: number };
  hist: HistPoint[];
  metrics: Metrics;
}

const SAVE_KEY = "takeoff.save.v1";
const SAVE_VERSION = 1;

function newState(): State {
  return {
    v: SAVE_VERSION, t: 0, stage: 1, month: 0, paused: false,
    tasks: 0, tasksManual: 0, funds: 0, fundsEarned: 0, data: 0, dataUsed: 0, webLeft: 6e13, crawlers: 0, dataDeals: 0,
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

let S: State = newState();

function flag(name: string): boolean { return !!S.flags[name]; }
/** Flags that unlock a new verb or readout: counted as reveals for the pacing metrics. */
const MECHANIC_FLAGS = ["crawlers", "researchUnlocked", "experiments", "insights", "autoPriceUnlocked", "evals", "datasets_on", "safetyUnlocked",
  "parallel", "userData", "autoBuyUnlocked", "campusUnlocked", "gigaUnlocked", "smrUnlocked", "lobbyUnlocked", "prUnlocked", "synth",
  "constructionCrews", "monitors", "honeypots", "cyberDefense", "robotics", "robotOpt", "fusion", "ubiUnlocked", "space", "orbitalOn",
  "asteroids", "treatyTalks", "automation", "officeMoved"];

function setFlag(name: string, v = 1): void {
  if (!S.flags[name] && MECHANIC_FLAGS.indexOf(name) >= 0) S.metrics.reveals.push({ id: "mech:" + name, t: S.t });
  S.flags[name] = v;
}

/** Fill in any field missing from an older save (A Dark Room's updateOldState, simplified). */
function migrate(raw: any): State {
  const fresh: any = newState();
  const out: any = Object.assign(fresh, raw);
  for (const k of ["alloc", "rivalBoost", "robotAlloc", "peak", "metrics"]) {
    out[k] = Object.assign((newState() as any)[k], raw[k] || {});
  }
  out.v = SAVE_VERSION;
  return out as State;
}

let lastSave = 0;
let saveDisabled = false;

function saveGame(force = false): void {
  if (saveDisabled) return;
  const now = Date.now();
  if (!force && now - lastSave < 4000) return;
  lastSave = now;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage full or blocked */ }
}

function loadGame(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    S = migrate(JSON.parse(raw));
    return true;
  } catch (e) {
    return false;
  }
}

function exportSave(): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(S))));
}

function importSave(code: string): boolean {
  try {
    const json = decodeURIComponent(escape(atob(code.replace(/\s/g, ""))));
    S = migrate(JSON.parse(json));
    saveGame(true);
    return true;
  } catch (e) {
    return false;
  }
}

function wipeSave(): void {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}
