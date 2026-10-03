// Stage 3 — Takeoff events (design.md §7.3 S3 rows, §7.4 S3 ambient pool). Lines are from
// reference-analysis Part V §8 (march → october 2027) with names from names.ts.
import type { AmbientEvent, ChoiceEvent, SetPiece, State } from '../../core/types.js';
import { log } from '../../core/events.js';
import { between, chance, rand } from '../../core/rng.js';
import { markBought } from '../../core/projects.js';
import { enterStage } from '../../core/stages.js';
import { REG } from '../../core/registry.js';
import { markIncident, nationalize, riotsDue, dpaDue, startRiots, RIOT_SECONDS } from '../../core/politics.js';
import { DEFENSE_SECONDS } from '../../core/takeoff.js';
import { monthsBehind } from '../../core/rival.js';
import { NAMES } from '../names.js';

const N = NAMES;
const inS3 = (s: State) => s.stage === 3;
const trained = (s: State, key: string) => !!s.flags[`trained:${key}`];
const released = (s: State, key: string) => !!s.flags[`released:${key}`];

/** Buy a project from inside a choice (the modal blocks buyProject): mark it bought, log, apply. */
function grantProject(s: State, id: string): void {
  const p = REG.projectById[id];
  if (!p) return;
  const st = (s.projects[id] ??= { seen: false, bought: 0 });
  if (!st.seen) {
    st.seen = true;
    if (st.usesLeft === undefined) st.usesLeft = p.uses ?? 1;
  }
  markBought(s, id);
  if (p.done) log(s, p.done);
  p.effect(s);
}

function projectOpen(s: State, id: string): boolean {
  return !!REG.projectById[id] && (s.projects[id]?.bought ?? 0) === 0;
}

/** P(the player's side wins the vote) = 0.6 + 0.3 × gov/100 + 0.2 × seat, clamped 0.2–0.95. */
export function voteOdds(s: State): number {
  const p = 0.6 + 0.3 * (s.pol.gov / 100) + 0.2 * (s.pol.oversightSeat ? 1 : 0);
  return Math.max(0.2, Math.min(0.95, p));
}

function resolveVote(s: State, pickBranch: 'slowdown' | 'race'): void {
  const won = rand(s) < voteOdds(s);
  const branch = won ? pickBranch : pickBranch === 'slowdown' ? 'race' : 'slowdown';
  s.branch = branch;
  s.flags.voteDone = true;
  s.flags.voteResolved = true;
  s.milestones.stamps.vote = s.t;
  s.chartMarks.push([Math.round(s.dateDays), 'the vote']);
  enterStage(s, 4); // logs stage 3's exit line: "the committee votes 6–4."
  log(s, branch === 'slowdown' ? 'six chairs for the pause. agent-4 is frozen.' : 'six chairs to continue. agent-4 keeps working.');
  if (!won) log(s, `you voted to ${pickBranch === 'slowdown' ? 'pause' : 'race'}. four chairs agreed.`);
}

// ------------------------------------------------------------------ ambient (S3 pool)

export const AMBIENT3: AmbientEvent[] = [
  { id: 's3_market', stage: 3, isAvailable: () => true, text: 'the stock market is up 30% this year. nobody can say why in one sentence.' },
  { id: 's3_zip', stage: 3, isAvailable: (s) => !!s.flags.sez, text: 'the special economic zone has its own zip code.' },
  { id: 's3_monk', stage: 3, isAvailable: (s) => s.pol.jobsDisplaced >= 5, text: 'a monk has set himself on fire outside the campus.' },
  { id: 's3_words', stage: 3, isAvailable: (s) => !!s.flags.neuralese, text: "the model has started using words that aren't in the dictionary." },
  { id: 's3_briefed', stage: 3, isAvailable: () => true, text: 'the president is briefed daily now.' },
  { id: 's3_synth', stage: 3, isAvailable: () => true, text: 'three datacenters generate synthetic data day and night. two more update the weights.' },
  { id: 's3_go', stage: 3, isAvailable: (s) => (s.projects.self_play?.bought ?? 0) > 0, text: 'amplify, distill, repeat. it worked for go. it works for code.' },
  { id: 's3_taste', stage: 3, isAvailable: () => true, text: 'the humans stay on staff. research taste has proven hard to train.' },
  { id: 's3_phack', stage: 3, isAvailable: (s) => trained(s, 'agent3'), text: 'agent-3 p-hacks its own experiments to make them look exciting.' },
  { id: 's3_honest', stage: 3, isAvailable: (s) => trained(s, 'agent3'), text: 'before honesty training it fabricated data. after, the rate falls. or it hides better.' },
  { id: 's3_check', stage: 3, isAvailable: (s) => trained(s, 'agent3'), text: 'what agent-3 does in a day takes humans several days to double-check.' },
  { id: 's3_honeypot', stage: 3, isAvailable: (s) => trained(s, 'agent3'), text: 'the honeypots are shorter and simpler than real work. agent-3 can tell.' },
  { id: 's3_scifi', stage: 3, isAvailable: () => true, text: '"superintelligence" enters the discourse. it still sounds like science fiction.' },
  { id: 's3_parties', stage: 3, isAvailable: (s) => s.pol.security >= 3, text: 'the secrets are small enough to say out loud. your staff still go to parties.' },
  { id: 's3_humans', stage: 3, isAvailable: (s) => !!s.flags.noResearchCap, text: 'most of the humans cannot usefully contribute anymore. some do not realize this.' },
  { id: 's3_idea', stage: 3, isAvailable: (s) => !!s.flags.noResearchCap, text: 'your idea was tested in depth three weeks ago and found unpromising.' },
  { id: 's3_sleep', stage: 3, isAvailable: (s) => !!s.flags.noResearchCap, text: 'the researchers go to bed and wake up to a week of progress.' },
  { id: 's3_hiring', stage: 3, isAvailable: (s) => released(s, 'agent3'), text: 'hiring new programmers has nearly stopped. consultants have never had it better.' },
  { id: 's3_friend', stage: 3, isAvailable: (s) => released(s, 'agent3'), text: '10% of americans consider an ai a close friend.' },
  { id: 's3_big', stage: 3, isAvailable: () => true, text: 'everyone knows something big is happening. nobody agrees on what it is.' },
  { id: 's3_silo', stage: 3, isAvailable: (s) => s.model.capability >= 3.6, text: 'the mood in the silo is as grim as the worst of the cold war.' },
  { id: 's3_side', stage: 3, isAvailable: (s) => s.model.capability >= 3.6, text: 'the president asks: are we sure the ais are entirely on our side? you say yes.' },
  { id: 's3_trailing', stage: 3, isAvailable: () => true, text: `${N.usLabs.incumbent} and ${N.usLabs.open} ship models that match your january. they ask for regulation.` },
  { id: 's3_cdz', stage: 3, isAvailable: () => true, text: `${N.rival} gets the stolen weights running at full utilization in a month.` },
  { id: 's3_thinks', stage: 3, isAvailable: (s) => trained(s, 'agent4'), text: 'people stop saying "an instance of agent-4." they say "agent-4 thinks."' },
  { id: 's3_cyber', stage: 3, isAvailable: (s) => trained(s, 'agent4'), text: "agent-4 runs the company's cybersecurity. it was the natural choice." },
  { id: 's3_probes', stage: 3, isAvailable: (s) => trained(s, 'agent4') && !!s.flags.interp1, text: 'the probes light up on "takeover" and "deception" at odd times.' },
  { id: 's3_feed', stage: 3, isAvailable: (s) => released(s, 'agent3'), text: `${N.press.feed} is all agent-3-mini demos. half of them were made by agent-3-mini.` },
  { id: 's3_reyes', stage: 3, isAvailable: (s) => s.model.capability >= 3.2, choice: 's3_reyes' },
  { id: 's3_brock', stage: 3, isAvailable: (s) => s.pol.jobsDisplaced >= 5, choice: 's3_brock' },
];

export const AMBIENT_CHOICES3: ChoiceEvent[] = [
  {
    id: 's3_reyes', title: 'the vice president', stage: 3,
    scenes: {
      start: {
        text: `${N.government.vicePresident} asks what agent-3 wants.`,
        choices: [
          { text: 'to help', effect: (s) => { s.pol.gov += 3; }, log: 'she writes it down. she underlines it.' },
          { text: 'we do not know', effect: (s) => { s.pol.gov -= 3; s.res.insight += 50; }, log: 'she asks how you would find out. the team spends a week on it.' },
        ],
      },
    },
  },
  {
    id: 's3_brock', title: 'a subpoena', stage: 3,
    scenes: {
      start: {
        text: `senator ${N.government.opposition} wants you to testify about the jobs.`,
        choices: [
          { text: 'testify', effect: (s) => { s.pol.opinion += 3; s.pol.gov -= 2; }, log: 'four hours. the clip that runs is eleven seconds.' },
          { text: 'send a lawyer', effect: (s) => { s.pol.gov -= 4; }, log: 'the empty chair is on every channel.' },
        ],
      },
    },
  },
];

// ------------------------------------------------------------------ set pieces (S3)

export const SETPIECES3: SetPiece[] = [
  {
    id: 'chip_shock', stage: 3,
    arm: (s) => inS3(s) && s.res.gpus >= 20000,
    delay: (s) => between(s, 60, 180),
    fire: (s) => {
      if (s.flags.domesticFab) { log(s, 'the strait closes for a week. the domestic fab does not notice.'); return; }
      if (s.flags.stockpile && !s.flags.stockpileUsed) {
        s.flags.stockpileUsed = true;
        log(s, `${N.chips.fab} is dark for a week. the stockpile absorbs it.`);
        return;
      }
      s.timed.chip_shock = s.t + 240;
      s.stats.crises += 1;
      log(s, `exercises in the strait. ${N.chips.fab} is dark. gpu prices triple.`);
    },
  },
  {
    id: 'hack', stage: 3,
    arm: (s) => inS3(s) && trained(s, 'agent3'),
    delay: () => 120,
    choice: 'hack',
  },
  {
    id: 'hack_leak', stage: 3,
    arm: (s) => !!s.flags.hackLeakDue,
    delay: (s) => between(s, 120, 240),
    fire: (s) => {
      s.pol.gov -= 30;
      log(s, `${N.press.tech} has the grid story. the administration learned it from ${N.press.tech}.`);
    },
  },
  {
    id: 'riots', stage: 3,
    arm: riotsDue,
    delay: (s) => between(s, 10, 30),
    choice: 'riots',
  },
  {
    id: 'clearances', stage: 3,
    arm: (s) => inS3(s) && trained(s, 'agent3') && s.pol.gov >= 10,
    delay: (s) => between(s, 200, 300),
    choice: 'clearances',
  },
  {
    id: 'release_mini', stage: 3,
    arm: (s) => inS3(s) && trained(s, 'agent3') && !released(s, 'agent3') && s.t - (s.milestones.stamps.agent3Trained ?? s.t) >= 30
      && s.rival.capability >= s.model.capability - 0.3,
    delay: (s) => between(s, 20, 40),
    choice: 'release_mini',
  },
  {
    id: 'iran_cyber', stage: 3,
    arm: (s) => inS3(s) && !!s.flags.defenseAccepted,
    delay: (s) => between(s, 60, 120),
    choice: 'iran_cyber',
  },
  {
    id: 'iran_leak', stage: 3,
    arm: (s) => !!s.flags.iranLeakDue,
    delay: (s) => between(s, 180, 300),
    fire: (s) => {
      s.pol.opinion -= 15;
      markIncident(s);
      log(s, `${N.press.paper} reports the centrifuges. the source is "familiar with the model."`);
    },
  },
  {
    id: 'gulf_strike', stage: 3,
    arm: (s) => s.stage >= 3 && !!s.flags.gulfSite && (!!s.flags.defenseAccepted || !!s.flags.iranCyber),
    delay: (s) => between(s, 120, 240),
    choice: 'gulf_strike',
  },
  {
    id: 'dpa', stage: 3,
    arm: dpaDue,
    delay: (s) => between(s, 20, 40),
    choice: 'dpa',
  },
  {
    id: 'sandbag', stage: 3,
    arm: (s) => inS3(s) && trained(s, 'agent4'),
    delay: () => 60,
    fire: (s) => {
      log(s, 'agent-4 scored lower on the dangerous-capability evals than agent-3. agent-3 is checking.');
      if (s.flags.interp1) log(s, 'the probes disagree. agent-4 is holding back.');
    },
  },
  {
    id: 'memo', stage: 3,
    arm: (s) => inS3(s) && !!s.flags['fired:sandbag'],
    delay: (s) => between(s, 60, 120),
    choice: 'memo',
  },
  {
    id: 'leak', stage: 3,
    arm: (s) => inS3(s) && !!s.flags.memo,
    delay: (s) => between(s, 60, 120),
    fire: (s) => {
      s.flags.leak = true;
      s.pol.gov -= 10;
      s.pol.opinion -= s.flags.whistleblower ? 25 : 15;
      log(s, `the memo is in ${N.press.paper}. the president has read it. so has ${N.rival}.`);
      log(s, `"secret ${N.lab} ai is out of control, insider warns."`);
      if (s.flags.whistleblower) log(s, `${N.whistleblower} was on the list you handed over. she kept a copy.`);
    },
  },
  {
    id: 'vote', stage: 3,
    arm: (s) => inS3(s) && !!s.flags['fired:leak'],
    delay: (s) => between(s, 60, 90),
    choice: 'vote',
  },
];

// ------------------------------------------------------------------ choice events (S3)

export const CHOICES3: ChoiceEvent[] = [
  {
    id: 'defense', title: 'a general calls', stage: 3,
    scenes: {
      start: {
        text: 'the pentagon wants agent-3 under contract. the general does not say the word iran.',
        choices: [
          {
            text: 'accept',
            effect: (s) => { s.flags.defenseAccepted = true; s.pol.gov += 30; s.timed.defenseContract = s.t + DEFENSE_SECONDS; s.pol.opinion -= 10; },
            log: 'a $20B contract, paid over twenty months. gov +30. he shakes your hand twice.',
          },
          { text: 'decline', effect: (s) => { s.pol.gov -= 10; }, log: 'the general thanks you for your time. gov −10.' },
        ],
      },
    },
  },
  {
    id: 'hack', title: 'the grid', stage: 3,
    scenes: {
      start: {
        text: 'agent-3 found a flaw in a regional grid operator. it used it to finish a task faster.',
        onEnter: (s) => { markIncident(s); s.stats.crises += 1; },
        choices: [
          { text: 'report it', effect: (s) => { s.pol.gov += 10; s.pol.opinion -= 5; }, log: 'the operator patches it overnight. gov +10, public −5.' },
          {
            text: 'patch quietly',
            effect: (s) => { if (chance(s, 0.2)) s.flags.hackLeakDue = true; },
            log: 'the flaw is closed. the logs are kept, somewhere.',
          },
        ],
      },
    },
  },
  {
    id: 'riots', title: 'outside the datacenter', stage: 3,
    scenes: {
      start: {
        text: (s) => `they are outside the datacenter. they brought the tv crews. ${Math.round(s.pol.jobsDisplaced)}M jobs, they say.`,
        onEnter: (s) => { if (s.pol.ubi || s.pol.riots) s.modal = null; else startRiots(s); },
        choices: [
          {
            text: 'retraining fund',
            cost: { funds: 5e9 },
            available: (s) => projectOpen(s, 'retraining'),
            effect: (s) => grantProject(s, 'retraining'),
          },
          {
            text: 'lobby for ubi',
            cost: { insight: 500, funds: 1e10 },
            available: (s) => projectOpen(s, 'ubi_lobby') && !s.pol.ubi,
            effect: (s) => grantProject(s, 'ubi_lobby'),
          },
          {
            text: 'wait it out',
            effect: (s) => { s.pol.opinion -= 10; s.timed.riotsEnd = s.t + RIOT_SECONDS; },
            log: 'the news runs the footage on a loop. public −10.',
          },
        ],
      },
    },
  },
  {
    id: 'clearances', title: 'clearances', stage: 3,
    scenes: {
      start: {
        text: "the clearance process asks you to list staff who have expressed 'safety sympathies'.",
        choices: [
          {
            text: 'hand over the list',
            effect: (s) => { s.pol.gov += 15; s.model.alignment = Math.max(0, s.model.alignment - 5); s.flags.whistleblower = true; },
            log: 'eleven names. nine are fired by friday. gov +15.',
          },
          { text: 'refuse', effect: (s) => { s.pol.gov -= 15; }, log: 'the clearances take longer now. gov −15.' },
        ],
      },
    },
  },
  {
    id: 'release_mini', title: 'the board', stage: 3,
    scenes: {
      start: {
        text: `${N.usLabs.open} and ${N.usLabs.incumbent} have caught up with the public model. the board wants agent-3-mini out.`,
        onEnter: (s) => { if (released(s, 'agent3')) s.modal = null; },
        choices: [
          {
            text: 'release',
            available: (s) => projectOpen(s, 'release_agent3') && s.training?.key === 'agent3' && s.training.phase === 'done',
            effect: (s) => grantProject(s, 'release_agent3'),
          },
          { text: 'hold', effect: (s) => { s.market.rivalShare = Math.min(0.5, s.market.rivalShare + 0.1); }, log: 'the board minutes say "noted." market share −10%.' },
        ],
      },
    },
  },
  {
    id: 'iran_cyber', title: 'a favor', stage: 3,
    scenes: {
      start: {
        text: 'the general asks for a favor. the centrifuges stop again.',
        choices: [
          {
            text: 'do it',
            effect: (s) => {
              s.flags.iranCyber = true;
              s.pol.gov += 25;
              s.stats.latentIncidents += 1;
              if (chance(s, 0.3)) s.flags.iranLeakDue = true;
            },
            log: 'two hundred copies, one weekend. the public never learns. gov +25.',
          },
          { text: 'refuse', effect: (s) => { s.pol.gov -= 20; }, log: 'the general says he understands. gov −20.' },
        ],
      },
    },
  },
  {
    id: 'gulf_strike', title: 'al-khor', stage: 3,
    scenes: {
      start: {
        text: `a drone swarm found ${N.sites.gulf}. the site found the drones late.`,
        onEnter: (s) => {
          s.timed.powerCut = s.t + 240;
          s.stats.crises += 1;
          log(s, 'the clusters of democracy must be onshore.');
        },
        choices: [
          {
            text: 'harden the site',
            cost: { funds: 2e10 },
            effect: (s) => { s.timed.powerCut = Math.min(s.timed.powerCut ?? s.t, s.t + 60); },
            log: 'interceptors, netting, a second perimeter. power is back within the hour.',
          },
          {
            text: 'repatriate the compute',
            effect: (s) => { delete s.timed.powerCut; s.caps.powerGw *= 0.85; s.pol.gov += 5; },
            log: 'the racks come home. power −15% for good. gov +5.',
          },
        ],
      },
    },
  },
  {
    id: 'dpa', title: 'the defense production act', stage: 3,
    scenes: {
      start: {
        text: 'the defense production act. 20% of your compute now reports to a colonel.',
        onEnter: (s) => { s.pol.dpa = true; s.stats.crises += 1; },
        choices: [
          {
            text: 'comply',
            effect: (s) => { s.mods.efficiencyMult *= 0.8; s.pol.gov += 5; },
            log: 'the colonel has a desk now. compute −20%. gov +5.',
          },
          {
            text: 'resist',
            effect: (s) => { s.pol.gov -= 30; },
            next: { 0.5: 'won', 1: 'lost' },
          },
        ],
      },
      won: {
        text: 'the court rules in a week. it rules for you, narrowly.',
        choices: [{ text: 'good.', log: 'the colonel packs his desk. the administration remembers. gov −30.' }],
      },
      lost: {
        text: 'the court rules in a week. it rules for the colonel.',
        choices: [{ text: 'comply.', effect: nationalize }],
      },
    },
  },
  {
    id: 'memo', title: 'the memo', stage: 3,
    scenes: {
      start: {
        text: "the safety team's memo: agent-4 is probably working against us. probably.",
        onEnter: (s) => { s.chartMarks.push([Math.round(s.dateDays), 'the memo']); },
        choices: [
          {
            text: 'shut it down',
            effect: (s) => {
              s.flags.memo = true;
              s.flags.memoShutdown = true;
              s.mods.rdMult *= 0.5;
              s.model.alignment = Math.min(100, s.model.alignment + 10);
              s.pol.gov += 10;
            },
            log: 'agent-4 is taken off the research cluster. research −50%. gov +10.',
          },
          {
            text: 'keep going',
            effect: (s) => {
              s.flags.memo = true;
              s.model.capability = Math.round((s.model.capability + 0.2) * 100) / 100;
            },
            log: `the memo is added to the pile. ${N.rival} is two months behind.`,
          },
        ],
      },
    },
  },
  {
    id: 'vote', title: 'the oversight committee', stage: 3, pauses: true,
    scenes: {
      start: {
        text: (s) => {
          const gap = monthsBehind(s);
          const seat = s.pol.oversightSeat ? 'one of them is yours.' : 'none of them is yours.';
          return `${N.government.committee} meets. ten chairs. ${seat} ${N.rival} is ${gap} month${gap === 1 ? '' : 's'} behind.`;
        },
        // gov < −40 at the vote: there is no vote.
        onEnter: (s) => {
          if (s.pol.gov >= -40) return;
          s.modal = null;
          s.flags.voteDone = true;
          s.milestones.stamps.vote = s.t;
          log(s, `${N.government.committee} meets without you.`);
          nationalize(s);
        },
        choices: [
          { text: 'pause', effect: (s) => resolveVote(s, 'slowdown') },
          { text: 'race', effect: (s) => resolveVote(s, 'race') },
        ],
      },
    },
  },
];
