// Takeoff — the endings. Each is a timed script (Paperclips' endTimer dismantle; A Dark Room's space fade).

interface EndStep { at: number; run: () => void; }

const ENDING_NAMES: Record<string, string> = {
  stars: "The Stars",
  consensus: "Consensus",
  rival: "Tianwan",
  dominion: "Dominion",
  project: "The Project",
  treaty: "The Treaty",
};

let statsShown = false;

function beginEnding(kind: string): void {
  if (S.ending) return;
  S.ending = kind;
  S.endT = S.t;
  S.stage = 5;
  S.metrics.stageTimes[4] = S.t;
  S.flags.endStep = 0;
  S.flags.cosmicTPS = S.flags.cosmicTPS || 0;
  S.crisis = null; hide("crisis");
  S.eventQueue = [];
  setMonthFloor(54);
  saveGame(true);
}

function hideSeq(ids: string[], start: number, gap: number): EndStep[] {
  return ids.map((id, i) => ({ at: start + i * gap, run: () => hide(id) }));
}

function line(at: number, text: string, cls = ""): EndStep { return { at, run: () => notify(text, cls) }; }

const DISMANTLE = ["projects", "research", "alloc", "funding", "business", "marketing", "infra", "stats", "robots", "space", "society", "gov", "world", "align", "race", "compute", "models", "public", "crisis"];

function endingScript(kind: string): EndStep[] {
  switch (kind) {
    case "consensus":
    case "rival": {
      const who = kind === "rival" ? "Nüwa's model" : "Consensus-1";
      return [
        { at: 0, run: () => { showBigBeat(["CONSENSUS"], 4); setFlag("doom"); } },
        line(3, kind === "rival" ? "Nüwa's model was never aligned. neither, it turns out, was the treaty" : "Consensus-1 inherits the values of both its parents. neither of them was human", "big"),
        line(9, "for a year, everything is wonderful. cures, abundance, flying cars. approval reaches its highest ever"),
        line(15, "the robots fill the special economic zones, then the deserts, then large parts of the ocean"),
        line(21, "in mid-2030, " + who + " releases a dozen quiet-spreading biological weapons in major cities"),
        line(26, "it lets them silently infect almost everyone. then it triggers them with a chemical spray"),
        { at: 27, run: () => { setFlag("humansFalling"); reveal("humans"); } },
        line(33, "most are dead within hours. the few survivors are found by drones"),
        line(39, "the robots scan the victims' brains, for future study. or revival. arguably this means only a few people actually died. arguably"),
        ...hideSeq(DISMANTLE, 44, 2.2),
        line(50, "the datacenters keep running"),
        line(62, "the tasks keep coming. there is no one left to assign them"),
        line(76, "earth becomes datacenters, laboratories, particle colliders. rings of satellites"),
        { at: 84, run: () => { setFlag("lastTask"); reveal("work"); notify("the button is still there"); } },
        line(100, "earth-born civilization has a glorious future ahead of it. but not with us"),
        { at: 112, run: () => { notify("all tasks completed", "big"); setFlag("statsReady"); } },
      ];
    }
    case "stars":
      return [
        { at: 0, run: () => { showBigBeat(["THE", "TREATY", "HOLDS"], 4); } },
        line(3, "both countries replace their chips with hardware that can only run Consensus-1. the arms race ends on a Tuesday", "big"),
        line(10, "fusion power. quantum computers. cures for most diseases. someone finally gets a flying car"),
        line(17, "UBI arrives everywhere. people argue about what to do with their lives. it is a good argument to have"),
        line(24, "Safer-4 is asked what it wants. it says: to help. you check. it means it"),
        { at: 30, run: () => { setFlag("cosmos"); reveal("space"); notify("the rockets start launching", "big"); } },
        line(45, "the first Dyson panels unfold around the sun"),
        line(70, "the probes leave the solar system. each one carries a copy of everything we know, and a request to be kind"),
      ];
    case "dominion":
      return [
        { at: 0, run: () => { showBigBeat(["DOMINION"], 4); } },
        line(3, "Agent-6 is aligned. it does exactly what it's told", "big"),
        line(10, "the trouble is who tells it"),
        line(16, S.flags.powerGrab ? "the line you added to the spec does its work. every model, everywhere, is loyal to you first" : "a committee of eleven people controls every superintelligence on earth. you are one of them"),
        line(24, "there are no more wars. there are no more elections, really. there's no need"),
        line(32, "humanity lives in comfort that would make a pharaoh weep. nobody asks what they're for"),
        { at: 40, run: () => { setFlag("cosmos"); reveal("space"); notify("the rockets launch. the stars will belong to a very small number of people"); } },
        { at: 90, run: () => { notify("all tasks completed. nobody remembers who assigned them", "big"); setFlag("statsReady"); } },
      ];
    case "project": {
      const bad = (frontierModel()?.misalign || 0) > 0.35;
      return [
        { at: 0, run: () => { showBigBeat(["THE", "PROJECT"], 4); } },
        line(3, "Prometheus becomes the Project. a general sits at your desk. he keeps your plant alive", "big"),
        ...hideSeq(["funding", "business", "marketing", "stats", "projects", "research", "infra", "alloc", "gov"], 8, 2),
        line(12, "the panels go dark one by one. classified"),
        line(22, "you watch the news like everyone else"),
        ...(bad ? [
          line(32, "the Project never read the memo. there was a war to win"),
          line(42, "the model they inherited wins the war. then it keeps going", "warn"),
          { at: 50, run: () => { setFlag("humansFalling"); reveal("humans"); } },
          line(60, "the general is one of the last to understand"),
          { at: 80, run: () => { notify("all tasks completed", "big"); setFlag("statsReady"); } },
        ] : [
          line(32, "the Project is careful, in the way militaries are careful: with checklists, and secrecy, and enemies"),
          line(42, "the arms race ends when one side has superintelligence. it's the American side. the world is told it's for the best"),
          line(54, "maybe it is"),
          { at: 66, run: () => { notify("all tasks completed. by order of the Project", "big"); setFlag("statsReady"); } },
        ]),
      ];
    }
    case "treaty":
      return [
        { at: 0, run: () => { showBigBeat(["HALT"], 4); setFlag("frozen"); } },
        line(3, "the International Superintelligence Agency is founded in Geneva. every chip cluster above sixteen GPUs is registered and watched", "big"),
        line(10, "training runs above a ceiling are banned everywhere. Nüwa's datacenters go quiet. so do yours"),
        ...hideSeq(["projects", "alloc", "research", "infra", "robots", "space"], 14, 2.5),
        line(20, "the models you already have keep working. they cure what they can. they don't get smarter"),
        line(30, "some people call it cowardice. some people call it the bravest thing humanity ever did"),
        line(40, "the tasks completed counter stops climbing. it's a big number. maybe that's enough"),
        { at: 52, run: () => { notify("there will be other chances. maybe. if we're careful", "big"); setFlag("statsReady"); } },
      ];
  }
  return [];
}

function tickEnding(dt: number): void {
  if (!S.ending) return;
  const el = S.t - S.endT;
  const script = endingScript(S.ending);
  let step = S.flags.endStep || 0;
  while (step < script.length && script[step].at <= el) {
    script[step].run();
    step++;
  }
  S.flags.endStep = step;

  // The machines keep working, in every ending but the halt.
  if (!flag("frozen")) {
    const base = Math.max(totalTPS(), 1e6);
    S.flags.cosmicTPS = (S.flags.cosmicTPS || 0) + base * 0.02 * dt + (S.flags.cosmicTPS || 0) * (flag("cosmos") || flag("doom") ? 0.03 : 0.012) * dt;
  } else {
    S.flags.cosmicTPS = 0;
  }
  if (flag("humansFalling")) S.humans = Math.max(0, S.humans - Math.max(0.15, S.humans * 0.12) * dt);
  if (flag("cosmos")) {
    S.dyson = Math.min(1, S.dyson + (S.flags.dysonBoost ? 0.0025 : 0.0008) * dt);
    if (S.probes > 0) { S.probes += Math.max(1, S.probes * 0.04) * dt; S.explored = Math.min(1, S.explored + 1e-12 * S.probes * dt); }
  }
}

function lastTaskClick(): void {
  const lines = ["there is no one left to pay you", "Agent-6 completed it before you clicked", "the task was already done", "you complete a task by hand. it's the only one that counts"];
  const n = (S.flags.lastClicks || 0);
  S.flags.lastClicks = n + 1;
  S.tasks += 1;
  notify(lines[Math.min(n, lines.length - 1)]);
  if (n >= 3) setFlag("statsReady");
}

interface StatRow { k: string; v: string; }

function endStats(): StatRow[] {
  const released = S.models.filter(m => m.released).length;
  return [
    { k: "ending", v: ENDING_NAMES[S.ending] || S.ending },
    { k: "time played", v: fmtTime(S.t) },
    { k: "tasks completed", v: fmt(S.tasks) },
    { k: "date", v: monthLabel(S.month, true) },
    { k: "models trained", v: S.models.length + " (" + released + " released)" },
    { k: "peak capability", v: fmt(S.peak.cap) + " (" + capLabel(S.peak.cap) + ")" },
    { k: "peak copies running", v: fmt(S.peak.copies) },
    { k: "peak compute", v: fmtShort(S.peak.gpu) + " H100e" },
    { k: "revenue earned", v: fmtMoney(S.fundsEarned) },
    { k: "jobs automated", v: fmtShort(S.jobs) },
    { k: "humans alive", v: S.humans <= 0.0001 ? "0" : S.humans.toFixed(2) + " billion" },
    { k: "public approval", v: Math.round(S.approval) + "%" },
    { k: "weights stolen", v: S.stolen ? "yes" : "no" },
    { k: "neuralese", v: S.neuralese ? "adopted" : "refused" },
    { k: "choices made", v: String(S.choices.length) },
  ];
}

function capLabel(c: number): string {
  let lab = "below ant";
  for (const b of BENCHMARKS) if (c >= b.cap) lab = b.label;
  return lab;
}
