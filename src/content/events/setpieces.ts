// Scripted set pieces (design.md §7.3). Armed into state.queue with a sim-time `at`
// and fired by the slow tick, so they survive reload.
import type { ChoiceEvent, SetPiece } from '../../core/types.js';
import { log } from '../../core/events.js';
import { between } from '../../core/rng.js';

export const SETPIECES: SetPiece[] = [
  // ---------------------------------------------------------------- S1
  {
    id: 'journalist', stage: 1,
    arm: (s) => s.res.tasks >= 10000,
    delay: (s) => between(s, 5, 20),
    choice: 'journalist',
  },
  {
    id: 'gpu_delay', stage: 1,
    arm: (s) => s.milestones.stamps.firstGpu !== undefined,
    delay: (s) => Math.max(0, (s.milestones.stamps.firstGpu ?? s.t) + 120 - s.t),
    fire: (s) => {
      log(s, 'the gpu shipment is three weeks late.');
      s.timed.gpu_delay = s.t + 120; // gpu price ×1.3 for 2 minutes
    },
  },
  {
    id: 'gpu_arrive', stage: 1,
    arm: (s) => !!s.flags['fired:gpu_delay'],
    delay: () => 120,
    fire: (s) => log(s, 'the gpus arrive. one of them is the wrong model.'),
  },

  // ---------------------------------------------------------------- S2+ (later phases)
];

export const SETPIECE_CHOICES: ChoiceEvent[] = [
  {
    id: 'journalist', title: 'a journalist calls', stage: 1,
    scenes: {
      start: {
        text: 'she wants to know what you are building.',
        choices: [
          { text: 'a research project', log: 'the story runs on page nine. nobody reads page nine.' },
          {
            text: 'the future',
            effect: (s) => { s.mods.demandMult *= 1.2; s.flags.govAttention = true; },
            log: 'the story runs. demand is up. so is attention.',
          },
        ],
      },
    },
  },
  {
    id: 'frontier', title: 'frontier',
    scenes: {
      start: {
        text: 'the reviews are in. nobody has shipped anything better.',
        choices: [{ text: 'good.', log: 'frontier. the next run can start early.' }],
      },
    },
  },

  // ---------------------------------------------------------------- S2+ (later phases)
];
