// Ambient events (design.md §7.1, §7.4): every 45–90 s one is drawn uniformly from the
// current stage's available pool. ~70% pure log lines, ~30% small choice modals.
import type { AmbientEvent, ChoiceEvent } from '../../core/types.js';
import { log } from '../../core/events.js';
import { chance } from '../../core/rng.js';

export const AMBIENT: AmbientEvent[] = [
  // ---------------------------------------------------------------- S1 (design.md §7.4)
  {
    id: 'quit', stage: 1,
    isAvailable: (s) => s.res.researchers >= 3,
    effect: (s) => {
      if (chance(s, 0.1)) {
        s.res.researchers -= 1;
        s.res.headcount -= 1;
        log(s, 'a researcher quits to start a competitor.');
      } else {
        log(s, 'a researcher talks about starting a competitor. she stays.');
      }
    },
  },
  { id: 'sysprompt', stage: 1, isAvailable: (s) => s.res.agents >= 1, text: "someone posted the model's system prompt." },
  { id: 'landlord', stage: 1, isAvailable: (s) => s.energyMkt.purchases >= 2, choice: 'landlord' },
  { id: 'vc', stage: 1, isAvailable: (s) => s.res.tasks >= 1000, choice: 'vc' },
  { id: 'poem', stage: 1, isAvailable: (s) => s.res.agents >= 1, text: 'the model wrote a poem. it was fine.' },
  // five more in the same voice
  { id: 'support', stage: 1, isAvailable: (s) => s.res.agents >= 5, text: 'a customer asks if the agents are people. support says no. support is an agent.' },
  { id: 'fans', stage: 1, isAvailable: (s) => s.res.gpus >= 2, text: 'the gpu fans are louder than the office music.' },
  { id: 'demo', stage: 1, isAvailable: (s) => s.res.tasks >= 2000, text: 'a competitor raises at ten times our valuation. their demo is a video.' },
  { id: 'raise', stage: 1, isAvailable: (s) => s.res.agents >= 10, text: 'an agent asked for a raise. it was a formatting error.' },
  { id: 'talk', stage: 1, isAvailable: (s) => s.res.researchers >= 2, choice: 'talk' },
];

export const AMBIENT_CHOICES: ChoiceEvent[] = [
  {
    id: 'landlord', title: 'the landlord',
    scenes: {
      start: {
        text: 'the landlord asks about the power bill.',
        choices: [
          { text: 'pay him something', cost: { funds: 50 }, log: 'he leaves. the bill does not.' },
          { text: 'explain the agents', log: 'he does not follow. he says the meter spins like a fan.' },
        ],
      },
    },
  },
  {
    id: 'vc', title: 'a vc emails',
    scenes: {
      start: {
        text: "subject line: 'quick q'.",
        choices: [
          {
            text: 'take the call',
            effect: (s) => { s.res.funds += Math.max(50, s.rates.revenuePerSec * 20); },
            log: 'thirty minutes on moats. a small cheque arrives anyway.',
          },
          { text: 'archive it', log: 'she follows up. twice.' },
        ],
      },
    },
  },
  {
    id: 'talk', title: 'office hours',
    scenes: {
      start: {
        text: "a researcher wants to give a talk on the model's mistakes.",
        choices: [
          {
            text: 'let her',
            effect: (s) => { s.res.research = Math.min(s.caps.researchCap, s.res.research + 20); },
            log: 'twelve people come. three of them change what they work on.',
          },
          { text: 'after the release', log: 'she puts it in the calendar. the calendar fills up.' },
        ],
      },
    },
  },
];
