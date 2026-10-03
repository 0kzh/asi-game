// Takeoff — static definitions: model generations, compute tiers, benchmarks, stages, rivals.

interface GenDef {
  id: string;        // stable key
  name: string;      // display name
  cap: number;       // capability ("relative IQ" scale, 100 = average human)
  train: number;     // GPU-seconds of training compute needed (before algorithmic multipliers)
  data: number;      // tokens consumed when training starts
  rate: number;      // tasks / second / copy
  gpc: number;       // GPUs per running copy
  price0: number;    // reference $ per task
  demand0: number;   // tasks / second customers want at price0 (before multipliers)
  blurb: string;     // shown on the train button
  ready: string;     // log line when training finishes
  release: string;   // log line on public release
}

/** The main ladder. Safer-* models replace Agent-5+ on the slowdown path. */
const GENS: GenDef[] = [
  { id: "a0", name: "Agent-0", cap: 22, train: 30, data: 1e7, rate: 1, gpc: 1, price0: 0.25, demand0: 8,
    blurb: "a small language model. 124 million parameters.",
    ready: "Agent-0 finishes training. it can almost finish a sentence.",
    release: "Agent-0 is live. strangers on the internet ask it questions." },
  { id: "a1", name: "Agent-1", cap: 58, train: 1500, data: 6e8, rate: 2, gpc: 1, price0: 1.2, demand0: 45,
    blurb: "a real model. it writes code, badly.",
    ready: "Agent-1 is done. it writes code. most of it compiles.",
    release: "Agent-1 is released. developers start paying for it." },
  { id: "a15", name: "Agent-1.5", cap: 84, train: 6e4, data: 1.5e10, rate: 3, gpc: 2, price0: 3, demand0: 300,
    blurb: "bigger, slower to serve, much smarter.",
    ready: "Agent-1.5 passes the bar exam on its first try.",
    release: "Agent-1.5 ships. a law firm cancels its summer associate program." },
  { id: "a2", name: "Agent-2", cap: 112, train: 2.1e5, data: 5e10, rate: 5, gpc: 2, price0: 6, demand0: 2000,
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
const SAFER_GENS: GenDef[] = [
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

function genById(id: string): GenDef {
  for (const g of GENS) if (g.id === id) return g;
  for (const g of SAFER_GENS) if (g.id === id) return g;
  throw new Error("unknown gen " + id);
}

interface Tier { id: string; name: string; cap: number; price: number; }

/** Where the GPUs physically live. Each tier is unlocked by a project or building. */
const TIERS: Tier[] = [
  { id: "garage", name: "the garage", cap: 4, price: 12 },
  { id: "office", name: "an office", cap: 24, price: 20 },
  { id: "colo", name: "a colocation cage", cap: 160, price: 45 },
  { id: "cluster", name: "a leased cluster", cap: 1200, price: 160 },
  { id: "dc", name: "datacenters", cap: 0, price: 60 }, // stage 2: capacity comes from built datacenters
];

/** Benchmarks drawn on the capability chart (relative-IQ scale, log axis). */
const BENCHMARKS: { cap: number; label: string }[] = [
  { cap: 15, label: "ant" },
  { cap: 35, label: "chimp" },
  { cap: 100, label: "average human" },
  { cap: 160, label: "Einstein" },
  { cap: 250, label: "superhuman coder" },
  { cap: 480, label: "superhuman AI researcher" },
  { cap: 1500, label: "superintelligence" },
];

interface StageDef { n: number; title: string; doc: string; monthStart: number; monthEnd: number; secPerMonth: number; }

/** Month 0 = July 2025. */
const STAGES: StageDef[] = [
  { n: 1, title: "a garage", doc: "A Garage", monthStart: 0, monthEnd: 6, secPerMonth: 360 },
  { n: 2, title: "a frontier lab", doc: "A Frontier Lab", monthStart: 6, monthEnd: 19, secPerMonth: 230 },
  { n: 3, title: "an intelligence explosion", doc: "The Intelligence Explosion", monthStart: 19, monthEnd: 28, secPerMonth: 330 },
  { n: 4, title: "a new world", doc: "A New World", monthStart: 28, monthEnd: 54, secPerMonth: 100 },
  { n: 5, title: "the end", doc: "The End", monthStart: 54, monthEnd: 900, secPerMonth: 20 },
];

const LAB = "Prometheus";

/** Rival labs. Capability follows a schedule over game months (piecewise log-linear), plus shocks. */
interface RivalDef { id: string; name: string; country: string; schedule: [number, number][]; }
const RIVALS: RivalDef[] = [
  { id: "titan", name: "Titan", country: "US", schedule: [[0, 40], [6, 70], [12, 95], [19, 130], [24, 180], [30, 260], [54, 600]] },
  { id: "gestalt", name: "Gestalt", country: "US", schedule: [[0, 35], [6, 60], [12, 85], [19, 115], [24, 150], [30, 200], [54, 400]] },
  { id: "nuwa", name: "Nüwa", country: "CN", schedule: [[0, 18], [3, 30], [6, 55], [12, 90], [19, 120], [24, 220], [28, 420], [36, 900], [54, 3000]] },
];

function scheduleAt(schedule: [number, number][], m: number): number {
  if (m <= schedule[0][0]) return schedule[0][1];
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
const ROUNDS: { name: string; at: number; }[] = [
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
