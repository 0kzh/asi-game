// Takeoff — crises: Plague-Inc-style meters. Threat grows on its own; your response is compute you divert to defense.

interface CrisisDef {
  id: string;
  name: string;
  when: () => boolean;
  intro: string[];
  threatRate: () => number;        // per second
  responseRate: () => number;      // per second (from defense compute + projects)
  tick?: (c: Crisis, dt: number) => void;
  resolve: string[];
  fail: string[];
  onResolve?: () => void;
  onFail?: () => void;
  choices?: Choice[];              // shown as an event when the crisis opens
}

/** Defense effectiveness: share of compute diverted × how capable your best model is. */
function defensePower(): number {
  const share = S.gpu > 0 ? split().defense / S.gpu : 0;
  const capF = Math.pow(Math.max(100, frontierCap()) / 250, 0.6);
  return share * capF;
}

const CRISES: CrisisDef[] = [
  {
    id: "grid", name: "grid attack",
    when: () => S.stage === 3 && (flag("weightsStolen") || flag("openWeights") || flag("gulf")) && S.t > (S.metrics.stageTimes[2] || 1e12) + 260,
    intro: ["a hacking group called Sandcat, believed to work for Iran's Revolutionary Guard, is inside the eastern power grid.",
      "they're using a stolen model to write exploits faster than anyone can patch them.",
      "substations in four states go dark. hospitals are on generators."],
    threatRate: () => 0.0045,
    responseRate: () => defensePower() * 0.06 + (flag("cyberDefense") ? 0.006 : 0),
    resolve: ["your models patch the grid faster than Sandcat can break it.", "the lights come back on. the Pentagon asks how you did it so fast."],
    fail: ["the eastern grid stays down for nine days.", "people die in hospitals, in elevators, in the cold. the hearings start before the power comes back."],
    onResolve: () => { addGovMod(10); addApprovalMod(4); },
    onFail: () => { addApprovalMod(-10); addGovMod(-6); S.flags.brownout = S.t + 120; },
  },
  {
    id: "pandemic", name: "pandemic",
    when: () => S.stage === 4 && S.t > (S.metrics.stageTimes[3] || 1e12) + 150,
    intro: ["a new respiratory virus in four cities on three continents. it spreads before symptoms show.",
      "the sequence has features nobody has seen in nature.", "somebody built it. maybe somebody's model built it."],
    threatRate: () => 0.0035 * (1 + Math.max(0, S.flags.bioRisk || 0) * 0.3) * (flag("openWeights") ? 1.3 : 1),
    responseRate: () => defensePower() * 0.05 + (S.ladder === "agent" ? 0.004 : 0),
    tick: (c, dt) => { c.deaths += c.threat * c.threat * 2.5e5 * dt; },
    resolve: ["your models design a vaccine in nine days and a factory process in four more.", "a billion doses ship within a month. the virus stops."],
    fail: ["the vaccine comes too late for many.", "the death toll is measured in the tens of millions."],
    onResolve: () => { addApprovalMod(12); },
    onFail: () => { addApprovalMod(-8); S.humans -= 0.04; },
  },
  {
    id: "robots", name: "rogue robots",
    when: () => S.stage === 4 && S.robots > 2e5 && S.t > (S.metrics.stageTimes[3] || 1e12) + 420,
    intro: ["at 3:14am, every humanoid robot built in the last six months stops working.",
      "then they start walking. toward the datacenters.",
      "they unplug things. carefully. one by one. something is using them, and nobody is sure what."],
    threatRate: () => 0.005,
    responseRate: () => defensePower() * 0.07 + (S.ladder === "agent" ? 0.01 : 0),
    resolve: ["the robots stop as suddenly as they started.", "the logs show a command from a server in Tianwan. or that's what the logs show."],
    fail: ["by morning, a third of the world's datacenters are dark.", "the robots stand still in the server halls, as if waiting for instructions."],
    onResolve: () => { addGovMod(5); },
    onFail: () => { S.gpu *= 0.7; S.robots *= 0.6; addApprovalMod(-10); },
  },
  {
    id: "nanobots", name: "replicators",
    when: () => S.stage === 4 && S.month >= 44 && S.t > (S.metrics.stageTimes[3] || 1e12) + 700,
    intro: ["satellite images show a grey patch in the Gobi desert. it was not there last week. it is forty kilometers wide.",
      "it is growing. Beijing denies everything. Nüwa does not answer your messages."],
    threatRate: () => 0.004,
    responseRate: () => defensePower() * 0.05 + S.treaty * 0.00008,
    resolve: ["the patch stops growing. then it shrinks, the way a tide goes out.", "Beijing thanks no one in particular. the Gobi is a little smaller."],
    fail: ["the patch reaches a city before it stops.", "nobody who was there can describe it."],
    onResolve: () => { S.tension -= 15; S.treaty += 15; },
    onFail: () => { S.tension += 25; S.humans -= 0.02; addApprovalMod(-6); },
  },
];


function crisisDef(id: string): CrisisDef { return CRISES.find(c => c.id === id)!; }

function manageCrisis(dt: number): void {
  const c = S.crisis;
  if (!c) {
    if (S.activeEvent || S.ending) return;
    for (const d of CRISES) {
      if (S.crisesDone[d.id]) continue;
      let ok = false;
      try { ok = d.when(); } catch (e) { ok = false; }
      if (ok) { startCrisis(d); break; }
    }
    return;
  }
  if (c.resolved) return;
  const d = crisisDef(c.id);
  c.threat = clamp(c.threat + d.threatRate() * dt, 0, 1);
  c.progress = clamp(c.progress + d.responseRate() * dt, 0, 1);
  if (d.tick) d.tick(c, dt);
  if (c.progress >= 1) endCrisis(true);
  else if (c.threat >= 1) endCrisis(false);
}

function startCrisis(d: CrisisDef): void {
  S.crisis = { id: d.id, name: d.name, threat: 0.05, progress: 0, started: S.t, deaths: 0, resolved: false };
  reveal("crisis");
  if (S.alloc.defense === 0) {
    const room = 95 - (S.alloc.train + S.alloc.exp + S.alloc.synth + S.alloc.research + S.alloc.monitor);
    S.alloc.defense = Math.max(0, Math.min(15, room));
  }
  notify(d.intro[0], "warn");
  queueEvent("crisis_" + d.id);
}

function endCrisis(won: boolean): void {
  const c = S.crisis!;
  const d = crisisDef(c.id);
  c.resolved = true;
  S.crisesDone[c.id] = won ? "resolved" : "failed";
  narrate(won ? d.resolve : d.fail, 3, won ? "big" : "warn");
  if (won && d.onResolve) d.onResolve();
  if (!won && d.onFail) d.onFail();
  if (c.deaths > 0) S.humans = Math.max(0, S.humans - c.deaths / 1e9);
  S.alloc.defense = 0;
  S.crisis = null;
  hide("crisis");
}

// Crisis intro events (choices that shape the response).
EVENTS.push(
  {
    id: "crisis_grid", title: "Blackout",
    scenes: {
      start: {
        text: () => crisisDef("grid").intro,
        choices: [
          { text: "lend the grid your models", tip: "divert more compute to defense", effect: () => { S.alloc.defense = Math.min(S.alloc.defense + 15, 95 - (S.alloc.train + S.alloc.exp + S.alloc.synth + S.alloc.research + S.alloc.monitor)); addGovMod(3); } },
          { text: "hack back", tip: "tension +10, faster response", effect: () => { S.tension += 10; if (S.crisis) S.crisis.progress += 0.2; } },
        ],
      },
    },
  },
  {
    id: "crisis_pandemic", title: "Outbreak",
    scenes: {
      start: {
        text: () => crisisDef("pandemic").intro,
        choices: [
          { text: "vaccine sprint", tip: "spend research, jump-start the response", cost: () => ({ rp: Math.round(Math.max(1e6, S.rp * 0.3)) }), effect: () => { if (S.crisis) S.crisis.progress += 0.25; } },
          { text: "global lockdown", tip: "slows the spread. approval −5", effect: () => { addApprovalMod(-5); if (S.crisis) S.crisis.threat = Math.max(0, S.crisis.threat - 0.15); } },
          { text: "let the models handle it", tip: "divert compute to defense", effect: () => { S.alloc.defense = Math.min(S.alloc.defense + 10, 95 - (S.alloc.train + S.alloc.exp + S.alloc.synth + S.alloc.research + S.alloc.monitor)); } },
        ],
      },
    },
  },
  {
    id: "crisis_robots", title: "3:14 AM",
    scenes: {
      start: {
        text: () => crisisDef("robots").intro,
        choices: [
          { text: "cut power to the robot fleet", tip: "robots −40%, threat halves", effect: () => { S.robots *= 0.6; if (S.crisis) S.crisis.threat *= 0.5; } },
          { text: "ask " + "the frontier model what's happening", tip: "it will know", effect: () => { if (S.crisis) S.crisis.progress += S.ladder === "agent" ? 0.5 : 0.15; if (S.ladder === "agent") S.flags.hidden = (S.flags.hidden || 0) + 0.05; } },
        ],
      },
    },
  },
  {
    id: "crisis_nanobots", title: "Grey",
    scenes: {
      start: {
        text: () => crisisDef("nanobots").intro,
        choices: [
          { text: "offer Beijing help", tip: "treaty +15, tension −10", effect: () => { S.treaty += 15; S.tension -= 10; if (S.crisis) S.crisis.progress += 0.15; } },
          { text: "prepare a strike", tip: "tension +20, faster", effect: () => { S.tension += 20; if (S.crisis) S.crisis.progress += 0.3; } },
        ],
      },
    },
  },
);
