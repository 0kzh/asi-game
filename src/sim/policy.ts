// The greedy player policy shared by the node sim (src/sim/bot.ts) and the browser smoke
// test. It decides action ids; an actuator executes them (core `act` in node, a DOM
// button click in the browser), so every action the bot uses must exist as a button.
import type { State } from '../core/types.js';
import { agentCost, agentSlots, capacity, demand, energyPrice, freeHeadcount, gpuCost, marketingCost } from '../core/economy.js';
import { energyPerTask } from '../core/models.js';
import { canAfford, projectCost, visibleProjects } from '../core/projects.js';
import { currentScene, choiceEnabled } from '../core/events.js';
import type { Cost } from '../core/types.js';

export type Actuator = (id: string) => boolean;

const CLICK_TICKS = new Set([0, 3, 5, 8]); // 4 clicks per second

function normCost(s: State, c: Cost): number {
  let x = 0;
  if (c.funds) x += c.funds / Math.max(1, s.res.funds);
  if (c.research) x += c.research / Math.max(1, s.res.research);
  if (c.insight) x += c.insight / Math.max(1, s.res.insight);
  if (c.data) x += c.data / Math.max(1, s.res.data);
  return x;
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

    // Modals: first available choice; training budget 50% then start.
    if (s.modal?.kind === 'choice') {
      const cur = currentScene(s);
      const idx = cur ? cur.scene.choices.findIndex((c) => choiceEnabled(s, c)) : 0;
      act(`choice:${Math.max(0, idx)}`);
    }
    if (s.modal?.kind === 'training') {
      if (s.modal.budget !== 0.5) act('budget:0.5');
      if (!act('train_start')) act('train_cancel');
    }
    if (s.modal) return;

    // Release immediately.
    if (s.training?.phase === 'done') act('release');

    // Energy: keep at least 15 s of consumption.
    const use = s.rates.energyPerSec + (s.res.agents < 3 ? 4 * energyPerTask(s) : 0);
    for (let i = 0; i < 20 && s.res.energy < use * 15 && s.res.funds >= energyPrice(s); i++) {
      if (!act('buy_energy')) break;
    }

    // Cheapest affordable projects, cheapest first, while any is affordable.
    for (let i = 0; i < 10; i++) {
      const affordable = visibleProjects(s).filter((p) => canAfford(s, p) && (s.flags.projects || p.anytime));
      if (!affordable.length) break;
      affordable.sort((a, b) => normCost(s, projectCost(s, a)) - normCost(s, projectCost(s, b)));
      if (!act(`project:${affordable[0].id}`)) break;
      if (s.modal) return this.second(s);
    }

    // Saving: the cheapest visible project whose only missing cost is funds (gpus may also be
    // missing — they are bought below) reserves its price, if reachable within 3 minutes.
    const reserve = this.reserve(s);

    // GPUs: when the agents are at the cap, or a visible project needs more.
    const needGpus = Math.max(0, ...visibleProjects(s).map((p) => p.req?.gpus ?? 0));
    for (let i = 0; i < 10; i++) {
      const atCap = s.res.agents >= agentSlots(s);
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

    // Headcount: 2 researchers per engineer.
    for (let i = 0; i < 10 && freeHeadcount(s) >= 1; i++) {
      const r = s.res.researchers, e = s.res.engineers;
      act(r >= 2 * (e + 1) ? 'hire_engineer' : 'hire_researcher');
    }

    // Price: −1 step when idle capacity > 20%, +1 step when the waitlist is > 1.5× capacity.
    const cap = capacity(s), dem = demand(s);
    if (cap > 0 && (cap - dem) / cap > 0.2) this.nudgePrice(s, -1);
    else if (s.res.agents > 0 && dem > cap * 1.5) this.nudgePrice(s, 1);
  }
}
