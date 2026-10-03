// The one-line "what to do next" under the header (design.md §9.3), recomputed each slow tick.
import type { State } from './types.js';
import { agentSlots, powerFactor } from './economy.js';

export function computeHint(s: State): string {
  const r = s.res;
  if (r.agents > 0 && s.rates.capacity > 0 && r.energy <= 0) return 'the agents are waiting on energy.';
  if (powerFactor(s) < 0.99) return 'power is the ceiling. build generation.';
  if (s.flags.research && !s.flags.noResearchCap && r.researchers > 0 && r.research >= s.caps.researchCap - 1e-9)
    return 'research is capped. spend it, or hire engineers.';
  if (s.counters.overSupplySeconds >= 20) return 'demand is the bottleneck. lower the price or market.';
  if (r.agents > 0 && r.agents >= agentSlots(s)) return 'the agents are out of gpus.';
  return '';
}

export function updateHint(s: State): void {
  s.hint = computeHint(s);
}
