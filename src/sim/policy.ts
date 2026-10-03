// The greedy player policy shared by the node sim (src/sim/bot.ts) and the browser smoke
// test. It decides action ids; an actuator executes them (core `act` in node, a DOM
// button click in the browser), so every action the bot uses must exist as a button.
import type { State } from '../core/types.js';
import { agentCost, agentSlots, capacity, demand, energyPrice, freeHeadcount, gpuBatch, gpuCost, marketingCost, powerFactor } from '../core/economy.js';
import { energyPerTask } from '../core/models.js';
import { canAfford, projectCost, visibleProjects } from '../core/projects.js';
import { currentScene, choiceEnabled } from '../core/events.js';
import type { Cost } from '../core/types.js';

export type Actuator = (id: string) => boolean;

const CLICK_TICKS = new Set([0, 3, 5, 8]); // 4 clicks per second
/** Projects the policy decides explicitly, never by price. */
const DECISIONS = new Set(['keep_internal', 'release_agent2']);

function normCost(s: State, c: Cost): number {
  let x = 0;
  if (c.funds) x += c.funds / Math.max(1, s.res.funds);
  if (c.research) x += c.research / Math.max(1, s.res.research);
  if (c.insight) x += c.insight / Math.max(1, s.res.insight);
  if (c.data) x += c.data / Math.max(1, s.res.data);
  return x;
}

/** Stage-3 choices that depend on the seed (odd/even), so the sim covers both sides. */
function s3Choice(s: State, eventId: string, enabled: (i: number) => boolean): number | null {
  const odd = s.seed % 2 === 1;
  switch (eventId) {
    case 'defense': return odd ? 1 : 0;           // accept on even seeds
    case 'riots': return enabled(1) ? 1 : null;   // lobby for ubi when affordable
    case 'vote': return odd ? 0 : 1;              // pause on odd seeds, race on even
  }
  return null;
}

/** Stage 3: projects on the way to the vote, in priority order. The first of them that is
 *  visible but short of funds is the goal: nothing ranked below it may spend into its price.
 *  Everything not listed is a side project, bought only with what is left over. */
const S3_PRIORITY = [
  'ai_rd2', 'stats', 'self_play', 'build_dc2', 'neuralese', 'legible_cot', 'train_agent3', 'release_agent3', 'defense',
  'washington', 'sez', 'reactor', 'train_agent4', 'oversight_seat', 'ubi_lobby', 'interp1', 'monitors',
  'gulf_dc', 'smr', 'interp2', 'safety_case', 'robots_pilot', 'align_research',
];
const S3_RANK: Record<string, number> = {};
S3_PRIORITY.forEach((id, i) => { S3_RANK[id] = i; });

function s3Rank(id: string): number {
  return S3_RANK[id] ?? S3_PRIORITY.length;
}

function s3Side(s: State, id: string): boolean {
  return s.stage === 3 && S3_RANK[id] === undefined;
}

/** Funds a stage-3 project still needs: its price plus any gpus its requirement is short of. */
function s3FundsNeeded(s: State, p: { id: string; req?: { gpus?: number } }, cost: number): number {
  const short = Math.max(0, (p.req?.gpus ?? 0) - s.res.gpus);
  return cost + short * (gpuCost(s) / Math.max(1, gpuBatch(s)));
}

/** Critical projects that are visible but not affordable, by rank, with the funds each needs. */
function s3Pending(s: State): [number, number][] {
  const out: [number, number][] = [];
  for (const p of visibleProjects(s)) {
    if (s3Side(s, p.id) || skipProject(s, p.id) || canAfford(s, p)) continue;
    const c = projectCost(s, p);
    if (!c.funds && !p.req?.gpus) continue;
    out.push([s3Rank(p.id), s3FundsNeeded(s, p, c.funds ?? 0)]);
  }
  return out.sort((a, b) => a[0] - b[0]);
}

/** The stage-3 goal: [rank, funds held for it]. A goal more than five minutes of revenue away holds nothing. */
function s3Goal(s: State): [number, number] {
  const first = s3Pending(s)[0];
  if (!first || first[1] > s.res.funds + 300 * s.rates.revenuePerSec) return [Infinity, 0];
  return first;
}

/** Side projects wait until the funds would still cover the largest pending critical cost,
 *  and keep a $10B war chest until agent-4 is trained (the next critical step is often not yet visible). */
function s3SideHeld(s: State): number {
  return Math.max(s.flags['trained:agent4'] ? 0 : 1e10, ...s3Pending(s).map((x) => x[1]));
}

/** The stage-3 research goal: [rank, research held for it] — the highest-ranked visible project whose
 *  research cost is not yet covered (and fits under the cap). Nothing ranked below it may spend into it. */
function s3ResearchGoal(s: State): [number, number] {
  let best: [number, number] = [Infinity, 0];
  for (const p of visibleProjects(s)) {
    if (s3Side(s, p.id) || skipProject(s, p.id) || canAfford(s, p)) continue;
    const r = projectCost(s, p).research ?? 0;
    if (r <= s.res.research || (!s.flags.noResearchCap && r > s.caps.researchCap)) continue;
    if (s3Rank(p.id) < best[0]) best = [s3Rank(p.id), r];
  }
  return best;
}

/** neuralese on even seeds, legible chain of thought on odd ones. */
function skipProject(s: State, id: string): boolean {
  const odd = s.seed % 2 === 1;
  return (id === 'neuralese' && odd) || (id === 'legible_cot' && !odd);
}

export class Policy {
  /** Accumulated price change wanted (in $). The ▲▼ buttons move $0.01 below $1, so a 1%
   *  step is executed as a button press once a whole cent has accumulated. */
  private priceDebt = 0;

  constructor(private act: Actuator) {}

  private nudgePrice(s: State, dir: -1 | 1): void {
    const p = s.market.price;
    if (p >= 1) { this.act(dir < 0 ? 'price_down' : 'price_up'); return; }
    if (Math.sign(this.priceDebt) !== dir) this.priceDebt = 0;
    this.priceDebt += dir * p * 0.01;
    if (Math.abs(this.priceDebt) >= 0.01 - 1e-9) {
      this.priceDebt -= dir * 0.01;
      this.act(dir < 0 ? 'price_down' : 'price_up');
    }
  }

  private reserve(s: State): number {
    let best = 0;
    for (const p of visibleProjects(s)) {
      if (!(s.flags.projects || p.anytime) || canAfford(s, p)) continue;
      if (s3Side(s, p.id) || skipProject(s, p.id)) continue;
      const c = projectCost(s, p);
      if (!c.funds) continue;
      const others = (c.research ?? 0) <= s.res.research && (c.insight ?? 0) <= s.res.insight && (c.data ?? 0) <= s.res.data;
      if (!others) continue;
      if (p.training && s.training) continue;
      if (c.funds > s.res.funds + s.rates.revenuePerSec * 180) continue;
      if (!best || c.funds < best) best = c.funds;
    }
    return best;
  }

  /** Every 100 ms tick: manual clicks while the lab has fewer than 3 agents. */
  tick(s: State, tickInSecond: number): void {
    if (s.res.agents < 3 && CLICK_TICKS.has(tickInSecond)) this.act('complete_task');
  }

  /** Once per sim second: every other decision. */
  second(s: State): void {
    const act = this.act;

    // Modals: first available choice (the theft: "disclose"); training budget 50% then start.
    if (s.modal?.kind === 'choice') {
      const cur = currentScene(s);
      const enabled = (i: number) => !!cur && !!cur.scene.choices[i] && choiceEnabled(s, cur.scene.choices[i]);
      let pref = cur ? s3Choice(s, cur.ev.id, enabled) : null;
      if (cur && cur.ev.id === 'theft') {
        const d = cur.scene.choices.findIndex((c) => c.text === 'disclose' && choiceEnabled(s, c));
        if (d >= 0) pref = d;
      }
      const idx = pref !== null && enabled(pref) ? pref : cur ? cur.scene.choices.findIndex((c) => choiceEnabled(s, c)) : 0;
      act(`choice:${Math.max(0, idx)}`);
    }
    if (s.modal?.kind === 'training') {
      if (s.modal.budget !== 0.5) act('budget:0.5');
      if (!act('train_start')) act('train_cancel');
    }
    if (s.modal) return;

    // Release immediately. Agent-2: keep it internal on odd seeds, release it on even seeds.
    if (s.training?.phase === 'done') {
      if (s.training.key === 'agent2' && s.seed % 2 === 1) act('project:keep_internal');
      else act('release');
    }

    // S2+ allocation: research 30% once agents are in the loop; 50% while demand fits in half the cluster.
    if (s.flags.allocPanel) {
      const full = capacity(s) / Math.max(0.1, s.alloc.deploy);
      const want = !s.flags.aiRd ? 0 : demand(s) < full * 0.5 ? 0.5 : 0.3;
      if (s.alloc.research < want - 0.05) act('alloc_research_up');
      else if (s.alloc.research > want + 0.05) act('alloc_research_down');
    }

    // Energy: keep at least 15 s of consumption. From S2 the auto-buyer does it once bought (in S3 its
    // blocks are sized to the load); 500 kWh by hand there is a rounding error and each purchase raises the price.
    const use = s.rates.energyPerSec + (s.res.agents < 3 ? 4 * energyPerTask(s) : 0);
    const manualEnergy = !(s.stage >= 2 && s.energyMkt.autoBuy) || s.res.energy <= 0;
    for (let i = 0; manualEnergy && i < 20 && s.res.energy < use * 15 && s.res.funds >= energyPrice(s); i++) {
      if (!act('buy_energy')) break;
    }

    // Cheapest affordable projects, cheapest first, while any is affordable (the agent-2 decision is made
    // above). In stage 3 they go in priority order instead, and nothing ranked below the goal may spend into its price.
    for (let i = 0; i < 10; i++) {
      const s3 = s.stage === 3;
      const [goalRank, held] = s3 ? s3Goal(s) : [Infinity, 0];
      const sideHeld = s3 ? s3SideHeld(s) : 0;
      const [rGoalRank, rHeld] = s3 ? s3ResearchGoal(s) : [Infinity, 0];
      const affordable = visibleProjects(s).filter((p) => canAfford(s, p) && (s.flags.projects || p.anytime) && !skipProject(s, p.id) && !DECISIONS.has(p.id)
        && !(s3 && (projectCost(s, p).funds ?? 0) > 0 && s3Rank(p.id) > goalRank && s.res.funds - (projectCost(s, p).funds ?? 0) < held)
        && !(s3 && (projectCost(s, p).research ?? 0) > 0 && s3Rank(p.id) > rGoalRank && s.res.research - (projectCost(s, p).research ?? 0) < rHeld)
        && !(s3 && (projectCost(s, p).funds ?? 0) > 0 && s3Side(s, p.id) && s.res.funds - (projectCost(s, p).funds ?? 0) < sideHeld));
      if (!affordable.length) break;
      if (s3) affordable.sort((a, b) => s3Rank(a.id) - s3Rank(b.id) || normCost(s, projectCost(s, a)) - normCost(s, projectCost(s, b)));
      else affordable.sort((a, b) => normCost(s, projectCost(s, a)) - normCost(s, projectCost(s, b)));
      if (!act(`project:${affordable[0].id}`)) break;
      if (s.modal) return this.second(s);
    }

    // Saving: the cheapest visible project whose only missing cost is funds (gpus may also be
    // missing — they are bought below) reserves its price, if reachable within 3 minutes.
    // In stage 3 the goal's price is held instead.
    const reserve = s.stage === 3 ? s3Goal(s)[1] : this.reserve(s);

    // GPUs: when the agents are at the cap, or a visible project needs more.
    const needGpus = Math.max(0, ...visibleProjects(s).map((p) => p.req?.gpus ?? 0));
    for (let i = 0; i < 10; i++) {
      // From stage 3 the copies deploy themselves; more gpus only help while power is not the ceiling.
      const atCap = s.flags.autoDeploy ? powerFactor(s) >= 0.999 : s.res.agents >= agentSlots(s);
      const forGoal = s.res.gpus < needGpus;
      if (!(atCap || forGoal) || s.res.funds - (forGoal ? 0 : reserve) < gpuCost(s)) break;
      if (!act('buy_gpu')) break;
    }

    // Agents: while affordable, under cap, and demand ≥ 90% of capacity. The price rule only
    // moves at > 20% idle, so deploying also continues down to 80% (no dead band between them).
    for (let i = 0; i < 50; i++) {
      if (demand(s) < capacity(s) * 0.8) break;
      if (s.res.funds - reserve < agentCost(s)) break;
      if (!act('deploy_agent')) break;
    }

    // Marketing: when demand < capacity and it costs under half the funds.
    if (demand(s) < capacity(s) && marketingCost(s) < (s.res.funds - reserve) / 2) act('marketing');

    // Headcount: 2 researchers per engineer; from S2, engineers while the research cap blocks a visible project.
    const capBlocked = s.stage >= 2 && visibleProjects(s).some((p) => (projectCost(s, p).research ?? 0) > s.caps.researchCap);
    for (let i = 0; i < 10 && freeHeadcount(s) >= 1; i++) {
      const r = s.res.researchers, e = s.res.engineers;
      act(capBlocked || r >= 2 * (e + 1) ? 'hire_engineer' : 'hire_researcher');
    }

    // Price: −1 step when idle capacity > 20%, +1 step when the waitlist is > 1.5× capacity.
    const cap = capacity(s), dem = demand(s);
    if (cap > 0 && (cap - dem) / cap > 0.2) this.nudgePrice(s, -1);
    else if (s.res.agents > 0 && dem > cap * 1.5) this.nudgePrice(s, 1);
  }
}
