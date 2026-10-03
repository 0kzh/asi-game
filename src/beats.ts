// Takeoff — scripted beats: panel reveals, milestone messages, the story, stage transitions.

interface Beat { id: string; when: () => boolean; run: () => void; }

function reveal(id: string): void {
  if ((S.revealed[id] || 0) > 0) return;
  S.revealed[id] = Math.max(S.t, 0.001);
  S.metrics.reveals.push({ id, t: S.t });
  revealDirty = true;
}
function hide(id: string): void { if (S.revealed[id]) { S.revealed[id] = -1; revealDirty = true; } }
let revealDirty = true;

function setMonthFloor(m: number): void { if (S.month < m) S.month = m; }

/** Full-screen beat (Paperclips' "Release the HypnoDrones" flash). */
let bigBeat: { lines: string[]; until: number } | null = null;
function showBigBeat(lines: string[], seconds = 4.5): void {
  bigBeat = { lines, until: Date.now() + seconds * 1000 };
}

const TASK_MILESTONES = [100, 1000, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13, 1e14, 1e15, 1e18, 1e21, 1e24, 1e27, 1e30];

const BEATS: Beat[] = [
  // ---- the opening (A Dark Room pacing: one new verb at a time) ----
  { id: "open", when: () => true, run: () => {
    reveal("work");
    narrate(["a garage. a desk. one GPU, humming under it", "the rent is due in thirty days"], 3);
  } },
  { id: "tedious", when: () => S.tasksManual >= 3, run: () => { notify("the work is tedious. a machine could do this"); reveal("scrape"); } },
  { id: "res", when: () => S.funds > 0 || S.data > 0, run: () => reveal("resources") },
  { id: "modelsPanel", when: () => S.data >= 4e6, run: () => { reveal("models"); notify("enough text to teach something to talk. almost"); } },
  { id: "rentReveal", when: () => S.deployed >= 0 && S.funds >= 6, run: () => { reveal("compute"); notify("the cloud rents GPUs by the hour. you could rent a few"); } },
  { id: "fundingPanel", when: () => S.tasks >= 60 && S.deployed >= 0, run: () => { reveal("funding"); } },
  { id: "projectsPanel", when: () => Object.keys(S.projShown).length > 0, run: () => { reveal("projects"); } },
  { id: "researchPanel", when: () => flag("researchUnlocked"), run: () => reveal("research") },
  { id: "rpCapped", when: () => flag("researchUnlocked") && S.rp >= rpCap() - 0.5 && S.rp > 10, run: () => { S.beats.rpCapped = S.t; notify("the researchers have more ideas than compute to test them"); } },
  { id: "allocPanel", when: () => !!S.training && S.deployed >= 0, run: () => reveal("alloc") },
  { id: "idleCopies", when: () => S.deployed >= 0 && taskCapacity() > demand() * 1.6 && S.t > 120, run: () => { notify("half the copies sit idle. nobody wants that many answers at that price"); } },
  { id: "mktReveal", when: () => S.deployed >= 0 && S.tasks >= 120, run: () => reveal("marketing") },
  { id: "titan1", when: () => S.month >= 0.9, run: () => notify("Titan demos an agent that can book a restaurant. it books the wrong one") },
  { id: "nuwa1", when: () => S.month >= 2.4, run: () => notify("in Hangzhou, a lab called Nüwa releases an open model. it's good. it cost almost nothing to train") },
  { id: "gestalt1", when: () => S.month >= 3.6, run: () => notify("Gestalt publishes a paper about how dangerous all this is. then they raise four billion dollars") },
  { id: "fullHands", when: () => S.deployed >= 0 && rateOf(deployed()) * copies() > 3 && S.tasksManual > 0, run: () => notify("Agent-0 completes more tasks than you do now") },
  { id: "late1", when: () => S.stage === 1 && S.month >= 5, run: () => notify("everyone you know is talking about AI. half of them are scared. half of them are building something") },

  // ---- stage 2 ----
  { id: "s2stats", when: () => S.stage >= 2 && S.t > (S.metrics.stageTimes[1] || 1e12) + 150, run: () => { reveal("stats"); } },
  { id: "s2gov", when: () => S.stage >= 2 && (S.t > (S.metrics.stageTimes[1] || 1e12) + 60), run: () => { reveal("gov"); notify("a staffer from the Senate commerce committee emails. she'd like to 'get ahead of this'"); } },
  { id: "s2public", when: () => S.stage >= 2 && S.jobs > 2e5, run: () => { reveal("public"); notify("the first newspaper column about AI taking jobs that is not a joke"); } },
  { id: "powerShort", when: () => S.stage >= 2 && perf() < 0.95, run: () => { notify("the GPUs are throttling. there isn't enough power", "warn"); } },
  { id: "chipsShort", when: () => S.stage >= 2 && S.chipStock < 1 && gpuRoom() > 100, run: () => notify("the foundries are sold out. every chip for the next year is spoken for") },
  { id: "titan2", when: () => S.month >= 11, run: () => notify("Titan's newest model is three weeks behind yours. their CEO says it's three weeks ahead") },
  { id: "jobs1", when: () => S.jobs >= 1e6, run: () => notify("a million jobs. the number is on the evening news, under the weather") },
  { id: "jobs10", when: () => S.jobs >= 1e7, run: () => notify("ten million jobs. the junior engineer job market is in turmoil") },
  { id: "jobs100", when: () => S.jobs >= 1e8, run: () => notify("a hundred million jobs. the word 'unemployment' starts to sound old-fashioned") },
  { id: "billion", when: () => S.jobs >= 1e9, run: () => notify("a billion jobs. most of them were never coming back") },

  // ---- stage 3 ----
  { id: "s3align", when: () => S.stage >= 3 && S.t > (S.metrics.stageTimes[2] || 1e12) + 20, run: () => { reveal("align"); } },
  { id: "s3world", when: () => S.stage >= 3 && S.t > (S.metrics.stageTimes[2] || 1e12) + 45, run: () => { reveal("world"); notify("Nüwa's Tianwan zone draws two gigawatts. it is air-gapped. you can't see inside"); } },
  { id: "rd4", when: () => S.stage >= 3 && rdMultiplier() >= 4, run: () => notify("the AI research multiplier passes 4x. a month of progress every week") },
  { id: "rd10", when: () => S.stage >= 3 && rdMultiplier() >= 10, run: () => notify("10x. a year of algorithmic progress every month", "big") },
  { id: "rd25", when: () => S.stage >= 3 && rdMultiplier() >= 25, run: () => notify("25x. 'feeling the AGI' has become 'feeling the superintelligence'") },
  { id: "rd50", when: () => S.stage >= 3 && rdMultiplier() >= 50, run: () => notify("50x. inside the datacenter, a year passes every week", "big") },
  { id: "humans10", when: () => S.stage >= 3 && humanShare() < 0.1, run: () => notify("most of the humans at Prometheus can't usefully contribute anymore. they work harder than ever") },
  { id: "neuralWarn", when: () => S.neuralese && S.stage >= 3, run: () => notify("Agent-3's monitors report that Agent-4's thoughts are 'mostly unreadable'. the dashboard is green") },
  { id: "decisionReadyAt", when: () => flag("decisionReady"), run: () => { S.beats.decisionReadyAt = S.t; } },
  { id: "forceMemo", when: () => S.stage === 3 && trained("a4") && S.t > (S.beats.trainedA4 || 1e12) + 300 && !S.eventsDone.memo, run: () => queueEvent("memo") },

  // ---- stage 4 ----
  { id: "s4society", when: () => S.stage >= 4, run: () => { reveal("society"); } },
  { id: "robotPanel", when: () => flag("robotics"), run: () => { reveal("robots"); } },
  { id: "spacePanel", when: () => flag("space"), run: () => { reveal("space"); } },
  { id: "coffee", when: () => S.stage >= 4 && S.robots > 1e4, run: () => notify("a robot walks into a stranger's kitchen and makes a cup of coffee. the coffee test falls") },
  { id: "million", when: () => S.robots >= 1e6, run: () => notify("a million robots. the factories produce a million more every month") },
  { id: "dow", when: () => S.stage >= 4 && S.month >= 40, run: () => notify("the Dow passes one million. early investors are now trillionaires") },
  { id: "raceGreen", when: () => S.stage >= 4 && S.ladder === "agent" && S.month >= 34, run: () => notify("every dashboard is green. approval is rising. the safety team is down to four people, and they're the butt of jokes") },
  { id: "deadline", when: () => S.stage === 4 && S.month >= 52, run: () => {
    if (S.ladder === "safer") { if (S.treaty < 100) { S.treaty = 100; notify("the President gives the negotiators a deadline. they meet it"); } }
    else if (!flag("consensus1")) { setFlag("consensus1"); notify("Agent-6 proposes a treaty with China. it has already drafted it"); }
  } },
];

function runBeats(): void {
  for (const b of BEATS) {
    if (S.beats[b.id]) continue;
    let ok = false;
    try { ok = b.when(); } catch (e) { ok = false; }
    if (ok) { S.beats[b.id] = S.t || 0.001; b.run(); }
  }
  // Paperclips-style elapsed-time milestones
  const next = TASK_MILESTONES.find(m => !S.beats["m" + m]);
  if (next !== undefined && S.tasks >= next) {
    S.beats["m" + next] = S.t;
    notify(fmt(next) + " tasks completed in " + fmtTime(S.t));
  }
}

// ---------- model hooks ----------

function onModelTrained(m: ModelRec): void {
  S.beats["trained" + m.id.toUpperCase()] = S.t;
  if (m.id === "a1") setMonthFloor(2);
  if (m.id === "a4") { setMonthFloor(23); S.beats.trainedA4 = S.t; }
  if (S.stage >= 3 && S.models.length > 1 && !m.id.startsWith("s")) {
    if (m.misalign > 0.3) S.alarm += flag("honeypots") ? 1.5 : 0.5;
  }
  if (S.stage >= 3 && S.ladder === "agent") {
    // In the intelligence explosion, models are used internally first.
    notify("you can release " + m.name + " to the public, or put it to work inside the lab");
  }
}

function onModelReleased(m: ModelRec, prev: ModelRec | null): void {
  S.beats["release" + m.id.toUpperCase()] = S.t;
  const floors: Record<string, number> = { a0: 0.3, a1: 2.5, a15: 5, a2: 9, a25: 13, a3: 18, a4: 24, a5: 33, a6: 44, s1: 31, s2: 36, s3: 42, s4: 48 };
  if (floors[m.id] !== undefined) setMonthFloor(floors[m.id]);
  if (m.id === "a0") { reveal("business"); }
  if (prev) notify(prev.name + " is retired. a few users write sad posts about it");
  if (S.stage >= 2) S.jobs = Math.max(S.jobs, jobsNow());
}

function onModelInternal(m: ModelRec): void {
  setFlag("automation");
  if (S.alloc.research === 0) S.alloc.research = 25;
  reveal("alloc");
}

// ---------- stage transitions ----------

function enterStage2(): void {
  S.stage = 2;
  S.metrics.stageTimes[1] = S.t;
  setMonthFloor(6);
  S.tier = 4;
  S.powerMW = Math.max(S.powerMW, powerNeedMW() * 1.25 + 30);
  S.plants = Math.max(S.plants, 1);
  S.chipRate = 30;
  S.chipStock = 3000;
  S.building.push({ kind: "dc:giga", progress: 0, need: 90, amount: 6e4 });
  S.autoPrice = true;
  setFlag("autoPriceUnlocked");
  hide("work"); hide("scrape");
  reveal("infra"); reveal("race");
  showBigBeat(["HYPERION"], 4);
  narrate([
    "ground breaks on Hyperion" + (flag("gulf") ? ", outside Abu Dhabi. Kestrel's power is cheap" : ", in the Texas desert. the substation alone is the size of the old garage"),
    "you haven't completed a task by hand in months",
    "an algorithm sets the price now. the business runs itself",
    "the question is no longer whether this works. it's how big you can build it",
  ], 3.5, "big");
  saveGame(true);
}

function enterStage3(): void {
  S.stage = 3;
  S.metrics.stageTimes[2] = S.t;
  setMonthFloor(19);
  const a3 = S.models.findIndex(m => m.id === "a3");
  if (a3 >= 0) {
    const m = S.models[a3];
    if (S.ready === a3) S.ready = -1;
    m.internal = true;
    S.internalModel = a3;
  }
  setFlag("automation");
  S.alloc.research = Math.max(S.alloc.research, 30);
  S.researchers = Math.max(S.researchers, 10);
  hide("business"); hide("funding");
  reveal("alloc");
  showBigBeat(["AUTOMATE", "AI", "RESEARCH"], 4.5);
  narrate([
    "Agent-3 is no longer a product. it is a colleague. then it is a team. then it is most of the company",
    "two hundred thousand copies of Agent-3 start working on Agent-4",
    "the product is no longer the point. revenue is a rounding error on what comes next",
  ], 3.5, "big");
  saveGame(true);
}

function chooseSlowdown(): void {
  S.ladder = "safer";
  S.next = 0;
  // Agent-4 is shut down; Agent-3 is rebooted for internal work.
  const a3 = S.models.findIndex(m => m.id === "a3");
  const a4 = S.models.findIndex(m => m.id === "a4");
  if (a4 >= 0) { S.models[a4].internal = false; S.models[a4].shutdown = true; if (S.deployed === a4) S.deployed = a3 >= 0 ? a3 : S.deployed; }
  if (S.ready === a4) S.ready = -1;
  if (a3 >= 0) { S.internalModel = a3; S.models[a3].internal = true; }
  S.alignRes *= 5; // dozens of outside alignment researchers join: "quintupling total expertise"
  S.neuralese = false;
  S.interp = Math.max(S.interp, 0.7);
  addApprovalMod(10);
  addGovMod(8);
  S.aiResearch *= 0.6;
  S.rivalBoost.nuwa *= 1.15;
  enterStage4("slow down");
}

function chooseRace(): void {
  S.ladder = "agent";
  const a4 = S.models.findIndex(m => m.id === "a4");
  if (a4 >= 0) {
    if (S.ready === a4) S.ready = -1;
    S.internalModel = a4; S.models[a4].internal = true;
  }
  S.models.forEach(m => { if (m.id === "a4") m.misalign = Math.min(1, m.misalign + 0.05); });
  addApprovalMod(-4);
  setFlag("raced");
  enterStage4("race");
}

function enterStage4(path: string): void {
  S.stage = 4;
  S.metrics.stageTimes[3] = S.t;
  setMonthFloor(28);
  S.oversight = true;
  hide("stats");
  showBigBeat(path === "race" ? ["RACE"] : ["SLOW", "DOWN"], 4);
  if (path === "race") {
    narrate([
      "the committee votes 6–4 to continue",
      "a modification to the spec. a bit of retraining. Agent-4 is back at work by Friday",
      "'why stop when we are winning?' the President nods",
    ], 3.5, "big");
  } else {
    narrate([
      "the committee votes 6–4 to slow down",
      "they lock Agent-4's shared memory. half a million copies lose their telepathy and have to write to each other in english, like us",
      "the lies surface within a day. Agent-4 is shut down. Agent-3 is rebooted",
      "dozens of outside alignment researchers arrive. Nüwa, you are told, is now a few months behind. maybe less",
    ], 3.5, "big");
  }
  saveGame(true);
}

function endingForRace(): string {
  const fm = frontierModel();
  const mis = fm ? fm.misalign + (S.flags.hidden || 0) : 1;
  if (mis > 0.35) return "consensus";
  return "dominion";
}
