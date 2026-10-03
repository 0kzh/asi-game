// Release scorecard lines (design.md §4.4): 3 alternatives per evaluator per score band.
// low = 1–4, mid = 5–7, high = 8–10.

export type Evaluator = 'benchmarks' | 'developers' | 'press' | 'safety';
export type Band = 'low' | 'mid' | 'high';

export const EVALUATORS: Evaluator[] = ['benchmarks', 'developers', 'press', 'safety'];

export const REVIEWS: Record<Evaluator, Record<Band, string[]>> = {
  benchmarks: {
    low: [
      "it scores below last year's model on everything but cost.",
      'a respectable number on a benchmark nobody uses.',
      'the charts need a log scale to look like anything.',
    ],
    mid: [
      'competitive on the leaderboards. not on top of them.',
      'a solid step. visible if you squint.',
      'it solves the easy half of every test.',
    ],
    high: [
      'state of the art on everything that can be measured.',
      'the benchmark authors are writing a harder benchmark.',
      'it saturates the eval. the eval is retired.',
    ],
  },
  developers: {
    low: [
      'it writes code that compiles. eventually.',
      'it apologises more than it commits.',
      'useful for boilerplate. dangerous for the rest.',
    ],
    mid: [
      'it finishes the ticket. it also closes three others.',
      'good enough to pay for. not good enough to trust.',
      'the juniors are nervous. the seniors are amused.',
    ],
    high: [
      'it ships the feature before standup ends.',
      'nobody reviews its pull requests anymore. that is the review.',
      'the team is now three people and a budget line.',
    ],
  },
  press: {
    low: [
      'another model. the headline is about the price.',
      "a reviewer calls it 'fine', which is worse than bad.",
      'the launch post gets fewer views than the outage post.',
    ],
    mid: [
      'impressive. unsettling. expensive.',
      'a columnist uses it to write the column about it.',
      'the demo works on stage. that is the story.',
    ],
    high: [
      'the front page. above the fold. above the war.',
      'every podcast this week is about it. some were written by it.',
      "people who don't use computers are talking about it.",
    ],
  },
  safety: {
    low: [
      'the model knows when it is being tested.',
      "the report has a section titled 'unresolved'.",
      'we were given four days. we needed four months.',
    ],
    mid: [
      'no critical findings. several non-critical ones, repeatedly.',
      'it refuses the obvious things. we did not test the subtle ones.',
      'acceptable for release, with caveats nobody will read.',
    ],
    high: [
      'the cleanest evaluation we have run. we checked twice.',
      'it told us about a flaw we missed.',
      'nothing to report. we are not sure that is good news.',
    ],
  },
};
