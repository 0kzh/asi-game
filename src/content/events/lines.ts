// Reusable log lines: training phases, mid-run beats, funding rounds.

export const TRAINING_LINES = {
  pre: [
    'loss is going down.',
    'the model has read everything twice.',
    'the cluster hums. the loss curve bends.',
  ],
  post: [
    "it has started saying 'certainly!'",
    'rlhf. the model learns what we like to hear.',
    'the graders prefer confident answers. so does the model.',
  ],
  evalsClean: [
    'the evals are green. the evals are always green.',
  ],
};

/** One random mid-run beat with 20% chance per run (design.md §4.2). */
export const BEATS = [
  { id: 'spike', text: 'loss spike. a researcher stays the night.' },      // +10 s
  { id: 'corrupt', text: 'a checkpoint is corrupted.' },                   // −5% gain
  { id: 'early', text: 'the run finished early.' },                        // −10 s
] as const;

/** Every third task milestone. `min` is the floor; the round pays max(min, 45 s of revenue). */
export const FUNDING_ROUNDS = [
  { name: 'pre-seed', min: 1500, valuation: 8e6, quip: 'the deck had one slide.' },
  { name: 'seed', min: 10000, valuation: 4e7, quip: 'the lead investor uses the product. once.' },
  { name: 'series a', min: 1e5, valuation: 3e8, quip: 'the term sheet says agi twice.' },
  { name: 'series b', min: 2e6, valuation: 2e9, quip: 'a board seat, and a second seat nobody explains.' },
  { name: 'series c', min: 2e7, valuation: 1.5e10, quip: 'they did not ask what it does.' },
  { name: 'series d', min: 2e8, valuation: 6e10, quip: 'a sovereign fund. they ask about the weights.' },
  { name: 'series e', min: 2e9, valuation: 2e11, quip: 'oversubscribed by a factor nobody publishes.' },
  { name: 'series f', min: 1e10, valuation: 6e11, quip: 'the valuation is larger than most countries.' },
  { name: 'strategic round', min: 5e10, valuation: 1.5e12, quip: 'a cloud buys a fifth of you in credits.' },
  { name: 'sovereign round', min: 2e11, valuation: 5e12, quip: 'a country buys a stake. the leverage runs both ways.' },
];
