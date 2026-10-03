// All interfaces for Takeoff. State is one serialisable object; content (projects,
// events, stages, generations) is code looked up by id and never stored in state.

export type StageId = 1 | 2 | 3 | 4 | 5;
export type Branch = 'none' | 'slowdown' | 'race';
export type SnapshotId = '1' | '2' | '3' | '4a' | '4b' | '5a' | '5b';
export type EndingId = 'prosperity' | 'extinction' | 'nationalized' | 'rival';

export interface Resources {
  tasks: number;
  funds: number;
  energy: number;      // kWh
  agents: number;
  gpus: number;
  researchers: number;
  engineers: number;
  headcount: number;   // total granted; used = researchers + engineers
  research: number;
  insight: number;
  data: number;        // tokens, in T
  robots: number;
}

export interface Caps {
  gpus: number;          // max gpus purchasable (50 until lease_dc)
  researchCap: number;   // derived each tick: 150 + 250 × engineers + researchBonus
  researchBonus: number; // project bonuses to the research cap
  gpuCurveStart: number; // gpus owned when the price curve was last reset (datacenters)
  powerGw: number;       // S3+
}

/** Multipliers set by projects. Every economy formula reads these. */
export interface Mods {
  speedMult: number;       // tasks per agent per second
  efficiencyMult: number;  // agents per gpu
  energyEffMult: number;   // kWh per task
  demandMult: number;      // product multipliers on demand (usage tiers, coding assistant, ...)
  refPriceMult: number;    // reference price multiplier
  gpuPriceMult: number;    // gpu price curve multiplier (lease_dc reset)
  energyPriceMult: number; // ppa
  energyDriftMult: number; // ppa
  rdMult: number;          // multiplier on research from copies (keep_internal ×2; S2+)
  findingsMult: number;    // multiplier on findings at evals (honesty ×0.8; S2+)
}

export interface ModelState {
  key: string;          // generation row key, e.g. 'agent0', 'finetune', 'agent1'
  gen: number;          // integer generation used for agentsPerGpu / speed / energy
  name: string;
  capability: number;
  alignment: number;    // 0–100, hidden until eval_suite
  interp: number;       // interpretability multiplier
  released: boolean;
  releasedAt: number;   // sim seconds
  score: number | null; // review score /40 of the released model; null for agent-0
}

export interface ModelSummary {
  key: string;
  name: string;
  capability: number;
  score: number | null;
  releasedAt: number;
}

export type TrainingPhase = 'pre' | 'post' | 'evals' | 'done';

export interface TrainingRun {
  key: string;            // generation row key being trained
  projectId: string;      // project that started it
  name: string;
  phase: TrainingPhase;
  progress: number;       // 0..1
  duration: number;       // seconds at the chosen budget (mutable by beats)
  budget: number;         // 0.25 | 0.5 | 1 — share of deployment capacity taken
  gain: number;           // 0.8 | 1.0 | 1.25 (mutable by beats)
  capStart: number;       // capability of the deployed model at start
  capTarget: number;      // table capability for this generation
  capNow: number;         // capability accrued so far
  findings: number;       // fixed at evals
  safetyFirst: boolean;
  tutorial: boolean;      // the fine-tune run: no modal, fixed budget
  beat: string | null;    // id of the mid-run beat, if any
  beatAt: number;         // progress at which the beat fires (or -1)
  beatDone: boolean;
}

export interface Alloc { deploy: number; research: number; safety: number }

export interface Market {
  price: number;
  marketing: number;        // level
  productMult: number;      // release sales curve: 2.0 decaying to 1.0
  rivalShare: number;
  lastRevenue: number;      // revenue per second, last tick
  waitlist: number;         // unserved demand, tasks/s
  lifetimeRevenue: number;
}

export interface EnergyMarket {
  price: number;         // $ per block, recomputed each tick
  base: number;
  purchases: number;
  autoBuy: boolean;
  generation: number;    // kWh/s of own generation (S2+)
  spend: number;         // lifetime $ spent on energy
  block: number;         // kWh per manual purchase (500)
  autoBlock: number;     // kWh per auto-buyer purchase (500; 50,000 after ppa)
  decayTimer: number;    // seconds since the last 0.5% base decay
}

export interface Politics {
  gov: number;
  opinion: number;
  security: number;      // 1..5
  jobsDisplaced: number;
  ubi: boolean;
  riots: boolean;
  dpa: boolean;
  oversightSeat: boolean;
}

export interface Rival {
  name: string;
  capability: number;
  stoleAt?: number;
  released: number;
  interest: number;      // theft interest multiplier (S2+): theft chance/min = base(SL) × interest
}

export interface ProjectState {
  seen: boolean;
  bought: number;
  removed?: boolean;
  usesLeft?: number;
}

export interface LogLine { t: number; text: string }

export type ModalState =
  | { kind: 'choice'; eventId: string; sceneId: string }
  | { kind: 'training'; projectId: string; budget: number };

export interface QueuedEvent { eventId: string; at: number }

export interface RunStats {
  peakTasksPerSec: number;
  revenueTotal: number;
  clicks: number;
  modelsTrained: ModelSummary[];
  choices: { eventId: string; choice: string; alt: string[] }[];
  crises: number;
  incidents: number;
  latentIncidents: number;
}

export interface Milestones {
  taskIdx: number;                   // index of the next Fibonacci milestone
  stamps: Record<string, number>;    // name → sim seconds
}

/** Derived, per-tick numbers kept on state so the UI and the bot can read them. */
export interface Rates {
  tasksPerSec: number;     // smoothed over 1 s, includes clicks
  agentTasksPerSec: number;
  capacity: number;
  demand: number;
  revenuePerSec: number;
  energyPerSec: number;    // consumption by agents
  researchPerSec: number;
  idleResearchPerSec: number;
  insightPerSec: number;
}

export interface Counters {
  energyStallSeconds: number;   // energy 0 ∧ funds < price ∧ agents > 0
  overSupplySeconds: number;    // continuous seconds with capacity > demand × 1.5
  idleCapSeconds: number;       // cumulative seconds with capacity > demand
  researchCappedOnce: boolean;
  saveTimer: number;            // sim seconds since the last autosave
  clicksThisSecond: number;
  tasksWindow: number[];        // tasks completed in each of the last 10 ticks
  chartTimer: number;
}

export interface State {
  v: number;
  seed: number;
  rng: number;
  t: number;
  realStart: number;
  stage: StageId;
  branch: Branch;
  dateDays: number;
  res: Resources;
  caps: Caps;
  mods: Mods;
  model: ModelState;
  prevModels: ModelSummary[];
  training: TrainingRun | null;
  alloc: Alloc;
  market: Market;
  energyMkt: EnergyMarket;
  pol: Politics;
  rival: Rival;
  projects: Record<string, ProjectState>;
  projectOrder: string[];            // reveal order (Paperclips insertion order)
  flags: Record<string, boolean>;
  timed: Record<string, number>;     // effect id → sim time it ends
  log: LogLine[];
  modal: ModalState | null;
  queue: QueuedEvent[];
  ambientAt: number;
  hint: string;
  stats: RunStats;
  milestones: Milestones;
  counters: Counters;
  rates: Rates;
  chart: [number, number, number][]; // [day, capability, rival capability]
  chartMarks: [number, string][];    // [day, label]: releases, the theft, the memo, the vote, the treaty
  ending?: EndingId;
}

// ---------------------------------------------------------------- content

export interface Cost {
  research?: number;
  insight?: number;
  funds?: number;
  data?: number;
  gov?: number;
  opinion?: number;
}

/** Thresholds that must hold but are not consumed. */
export interface Requirement {
  gpus?: number;
  gov?: number;
  opinion?: number;
}

export interface Project {
  id: string;
  title: string;
  desc: string;                        // flavor, lowercase
  stage: StageId;
  cost?: Cost;
  costFn?: (s: State) => Cost;         // dynamic cost (repeatables)
  req?: Requirement;
  costLabel?: (s: State) => string;    // override the "(cost)" text
  trigger: (s: State) => boolean;
  effect: (s: State) => void;
  /** Used by dev snapshots instead of effect (e.g. training projects finish instantly). */
  snapshot?: (s: State) => void;
  uses?: number;                       // default 1; Infinity = repeatable
  done?: string;                       // log line on purchase
  anytime?: boolean;                   // purchasable before the projects column is unlocked
  retrigger?: boolean;                 // after purchase, hide until the trigger fires again
  training?: string;                   // generation key: buying opens the budget modal
  extraAfford?: (s: State) => boolean; // additional affordability predicate
  tag?: string;
}

export interface Choice {
  text: string;
  cost?: Cost;
  available?: (s: State) => boolean;
  effect?: (s: State) => void;
  /** Next scene id, or a weighted map {0.7: 'ok', 1: 'bad'} (cumulative thresholds). */
  next?: string | Record<number, string>;
  log?: string;
}

export interface Scene {
  text: string | ((s: State) => string);
  choices: Choice[];
  onEnter?: (s: State) => void;
}

export interface ChoiceEvent {
  id: string;
  title: string;
  stage?: StageId;
  scenes: Record<string, Scene>;
  /** Paused events stop the clock (only the branch-defining votes). */
  pauses?: boolean;
}

export interface AmbientEvent {
  id: string;
  stage: StageId;
  isAvailable: (s: State) => boolean;
  /** Pure log event: the line. */
  text?: string;
  effect?: (s: State) => void;
  /** Modal event: the ChoiceEvent id to open. */
  choice?: string;
}

export interface SetPiece {
  id: string;
  stage: StageId;
  /** Arm when true (checked each slow tick); the event fires `delay(s)` seconds later. */
  arm?: (s: State) => boolean;
  delay?: (s: State) => number;
  /** Fire: either open a choice event or run a pure effect. */
  choice?: string;
  fire?: (s: State) => void;
}

export interface Stage {
  id: StageId;
  /** Stage this one exits into when `exit(s)` holds (checked each slow tick). */
  exit?: (s: State) => StageId | null;
  name: string;
  startDay: number;
  endDay: number;
  /** Shown in the full-screen flash at the boundary into this stage. */
  flash?: string;
  /** Exit log line of this stage (logged when the next stage is entered). */
  exitLine: (s: State) => string;
  enter: (s: State) => void;
  progress: (s: State) => number;
}

export interface Generation {
  key: string;
  gen: number;
  name: string;
  capability: number;
  when: string;
  research: number;
  data: number;
  funds: number;
  gpus: number;
  duration: number;          // seconds at 50% budget
  agentsPerGpu: number;
  speed: number;
  energyPerTask: number;     // kWh
  findings: number;          // typical findings at evals
  note: string;
}

export interface Snapshot { id: SnapshotId; build: (seed: number) => State }

export interface Action {
  id: string;
  visible: (s: State) => boolean;
  enabled: (s: State) => boolean;
  run: (s: State) => void;
  /** Free actions (complete task, price arrows) don't count for idle detection. */
  free?: boolean;
}
