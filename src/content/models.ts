// The generation table (design.md §4.5). Later stages only add content that reads it.
import type { Generation } from '../core/types.js';

export const GENERATIONS: Generation[] = [
  { key: 'agent0', gen: 0, name: 'agent-0', capability: 1.2, when: 'start', research: 0, data: 0, funds: 0, gpus: 0,
    duration: 0, agentsPerGpu: 8, speed: 1, energyPerTask: 0.1, findings: 0, note: 'it can do small things.' },
  { key: 'finetune', gen: 0, name: 'agent-0 (tuned)', capability: 1.5, when: '~min 6', research: 60, data: 0, funds: 200, gpus: 3,
    duration: 45, agentsPerGpu: 8, speed: 1, energyPerTask: 0.1, findings: 0, note: 'tutorial run; reveals the model panel' },
  { key: 'agent1', gen: 1, name: 'agent-1', capability: 2.0, when: '~min 16', research: 400, data: 1, funds: 5000, gpus: 20,
    duration: 80, agentsPerGpu: 4, speed: 1.5, energyPerTask: 0.2, findings: 3, note: 'the stumbling agent.' },
  { key: 'agent2', gen: 2, name: 'agent-2', capability: 2.8, when: '~min 50', research: 6000, data: 10, funds: 5e6, gpus: 2000,
    duration: 90, agentsPerGpu: 2, speed: 2, energyPerTask: 0.3, findings: 4, note: 'continuous online learning; stolen at end of S2' },
  { key: 'agent3', gen: 3, name: 'agent-3', capability: 3.6, when: '~min 85', research: 60000, data: 50, funds: 5e8, gpus: 50000,
    duration: 100, agentsPerGpu: 1, speed: 4, energyPerTask: 0.4, findings: 6, note: 'superhuman coder; 200k copies; r&d ×4' },
  { key: 'agent4', gen: 4, name: 'agent-4', capability: 4.6, when: '~min 110', research: 600000, data: 100, funds: 2e10, gpus: 500000,
    duration: 110, agentsPerGpu: 0.5, speed: 8, energyPerTask: 0.5, findings: 9, note: 'neuralese; misaligned; the memo' },
  { key: 'agent5', gen: 5, name: 'agent-5', capability: 5.8, when: '~min 150 (race)', research: 5e6, data: 0, funds: 2e11, gpus: 5e6,
    duration: 120, agentsPerGpu: 0.25, speed: 16, energyPerTask: 0.6, findings: 12, note: 'superintelligence; "everything is wonderful."' },
  { key: 'safer1', gen: 4, name: 'safer-1', capability: 4.2, when: '~min 125 (slowdown)', research: 300000, data: 0, funds: 0, gpus: 0,
    duration: 90, agentsPerGpu: 0.5, speed: 6, energyPerTask: 0.5, findings: 2, note: 'agent-4 retrained with legible cot; weaker, honest' },
  { key: 'safer2', gen: 4, name: 'safer-2', capability: 4.8, when: '~min 140', research: 1e6, data: 0, funds: 0, gpus: 0,
    duration: 100, agentsPerGpu: 0.5, speed: 10, energyPerTask: 0.5, findings: 2, note: '' },
  { key: 'safer3', gen: 5, name: 'safer-3', capability: 5.4, when: '~min 160', research: 5e6, data: 0, funds: 0, gpus: 0,
    duration: 110, agentsPerGpu: 0.25, speed: 14, energyPerTask: 0.6, findings: 1, note: '' },
  { key: 'safer4', gen: 5, name: 'safer-4', capability: 5.9, when: '~min 180', research: 0, data: 0, funds: 0, gpus: 0,
    duration: 120, agentsPerGpu: 0.25, speed: 20, energyPerTask: 0.6, findings: 1, note: 'superintelligent and (mostly) aligned' },
  { key: 'consensus1', gen: 5, name: 'consensus-1', capability: 6.2, when: 'ending', research: 0, data: 0, funds: 0, gpus: 0,
    duration: 0, agentsPerGpu: 0.25, speed: 20, energyPerTask: 0.6, findings: 0, note: 'the joint model' },
];

const BY_KEY: Record<string, Generation> = {};
for (const g of GENERATIONS) BY_KEY[g.key] = g;

export function generation(key: string): Generation {
  const g = BY_KEY[key];
  if (!g) throw new Error(`unknown generation ${key}`);
  return g;
}

/** Capability reference lines for the chart (design.md §4.5; reference-analysis Part V §3.2). */
export const CAPABILITY_LINES: [number, string][] = [
  [1.0, 'average human'],
  [1.5, 'a reliable remote worker'],
  [2.0, 'a professional programmer'],
  [3.0, 'the best human coder'],
  [3.6, 'superhuman coder (×50,000, ×30 speed)'],
  [4.0, 'the best researcher alive'],
  [5.0, 'einstein'],
  [6.0, 'all of humanity combined'],
  [7.0, 'a century every six months'],
];
