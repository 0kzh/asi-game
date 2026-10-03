// Takeoff — the simulation step. Called 10x a second (more under the dev speed multiplier).

const TICK = 0.1;

function tick(dt: number): void {
  if (S.activeEvent) return; // reading is free: time stops while an event is open
  if (flag("statsReady") && !flag("statsDismissed")) return; // the stats screen is the final frame
  S.t += dt;

  for (const k in S.cooldowns) if (S.cooldowns[k] > 0) S.cooldowns[k] = Math.max(0, S.cooldowns[k] - dt);

  if ((S.flags.prevRound || 0) !== S.round) { S.flags.prevRound = S.round; S.flags.lastRoundT = S.t; }

  // ---- calendar ----
  const st = STAGES[S.stage - 1];
  const cap = S.stage >= 5 ? 1e9 : st.monthEnd - 0.01;
  const room = cap - S.month;
  // Near the end of a stage's months the days keep ticking, ever slower, rather than freezing.
  if (room > 0) S.month += room > 1 ? Math.min(room, dt / st.secPerMonth) : room * dt / st.secPerMonth;

  // ---- supply chain & construction ----
  if (S.stage >= 2) S.chipStock = Math.min(S.chipRate * 150, S.chipStock + S.chipRate * (flag("aiChips") ? 1.5 : 1) * dt);
  if (S.flags.blockade && S.flags.blockadeEnd && S.t > S.flags.blockadeEnd) { S.flags.blockade = 0; notify("the blockade lifts. nobody admits anything"); }
  for (let i = 0; i < S.building.length; i++) {
    const b = S.building[i];
    b.progress += dt * permitMult();
    if (b.progress >= b.need) {
      S.building.splice(i, 1); i--;
      const [cat, id] = b.kind.split(":");
      if (cat === "dc") {
        S.dcCap += b.amount;
        const k = DC_KINDS.find(x => x.id === id);
        notify(id === "giga" && !S.beats.hyperionDone ? "Hyperion's first phase comes online. the cooling towers steam in the morning" : (k ? k.done : "construction finishes"));
        if (id === "giga") S.beats.hyperionDone = S.t;
      } else {
        S.powerMW += b.amount; S.plants += 1;
        const k = PLANT_KINDS.find(x => x.id === id);
        notify(k ? k.done : "power plant online");
      }
    }
  }
  if (S.autoBuy && S.stage >= 2 && !S.ending) {
    const price = gpuPrice();
    const n = Math.floor(Math.min(gpuRoom(), S.chipStock, (S.funds * 0.5) / price));
    if (n >= 1) { S.funds -= n * price; S.gpu += n; S.chipStock -= n; }
  }
  if (S.flags.brownout && S.t > S.flags.brownout) S.flags.brownout = 0;

  // ---- training ----
  if (S.training) {
    S.training.progress += trainRate() * (S.flags.brownout ? 0.6 : 1) * dt;
    if (S.training.progress >= S.training.need) finishTraining();
  }

  // ---- revenue ----
  if (S.autoPrice && S.deployed >= 0) {
    const target = clearingPrice();
    S.price = S.price + (target - S.price) * Math.min(1, dt * 2);
  }
  const brown = S.flags.brownout ? 0.66 : 1;
  const sd = sold() * brown;
  const rev = sd * S.price;
  S.tasks += sd * dt;
  S.funds += rev * dt;
  S.fundsEarned += rev * dt;
  S.funds -= (salaries() + ubiCost()) * dt;
  S.funds += robotIncome() * dt;
  if (S.funds < 0) S.funds = 0;

  // ---- research ----
  const rc = rpCap();
  if (S.rp < rc) S.rp = Math.min(rc, S.rp + rpRate() * brown * dt);
  else S.rp = Math.max(rc, S.rp - Math.max(0, S.rp - rc) * 0.1 * dt); // cap shrank: leak slowly
  S.insight += insightRate() * dt;
  const im = internalModel();
  if (im) S.tasks += researchCopies() * rateOf(im) * 0.5 * dt; // internal work counts too

  // ---- data ----
  const crawl = crawlRate() * dt;
  S.webLeft = Math.max(0, S.webLeft - crawl - dealRate() * dt);
  S.data += crawl + (synthRate() + userDataRate() + dealRate()) * dt;

  // ---- alignment ----
  S.alignRes += alignRate() * dt;

  // ---- society ----
  S.hype = 1 + (S.hype - 1) * Math.exp(-dt / 150);
  S.jobs = Math.max(S.jobs, jobsNow());
  const jobsPenalty = 9 * Math.log10(1 + S.jobs / 1e5);
  const approvalTarget = 55 + (S.flags.approvalMod || 0) - jobsPenalty + S.ubi * 90 - (S.crisis ? 8 : 0) + (S.stage >= 4 && S.ladder === "agent" ? 12 : 0);
  S.approval = clamp(S.approval + (approvalTarget - S.approval) * (1 - Math.exp(-dt / 50)), 0, 100);
  const govTarget = 15 + (S.flags.govMod || 0) + (S.flags.lobbies || 0) * 6 + (S.security - 1) * 3 + (flag("military") ? 6 : 0) + (S.approval - 50) * 0.15;
  S.gov = clamp(S.gov + (govTarget - S.gov) * (1 - Math.exp(-dt / 60)), 0, 100);
  if (S.stage >= 4) {
    const ut = clamp((S.jobs / workforce()) * 160 - S.ubi * 170 - (S.approval - 50) * 0.4, 0, 100);
    S.unrest = clamp(S.unrest + (ut - S.unrest) * (1 - Math.exp(-dt / 40)), 0, 100);
  }
  const tensionTarget = 20 + (S.stage >= 3 ? 15 : 0) + (flag("controls") ? 10 : 0) + (flag("weightsStolen") ? 10 : 0) - S.treaty * 0.3;
  S.tension = clamp(S.tension + (tensionTarget - S.tension) * (1 - Math.exp(-dt / 200)), 0, 100);
  if (flag("treatyTalks")) S.treaty = Math.min(100, S.treaty + dt * 0.05 * (S.gov / 50));

  // ---- robots & space ----
  if (flag("robotics")) {
    S.robots += robotRate() * dt;
    S.factories += factoryBuildRate() * dt;
    S.materials += materialRate() * dt;
    S.dcCap += robotSlotsRate() * dt;
    S.chipStock += robotChipRate() * dt;
    S.powerMW += robotPowerRate() * (flag("fusion") ? 5 : 1) * dt;
    if (flag("space")) {
      const launchShare = S.robotAlloc.launch / 100;
      const l = S.robots * launchShare * 2e-5 * dt;
      S.launches += l;
      if (flag("orbitalOn")) { S.orbital += l * 2e4; S.gpu += l * 2e4 * 0.5; }
    }
  }

  // ---- crises, endings ----
  manageCrisis(dt);
  if (S.ending) {
    tickEnding(dt);
    S.tasks += (S.flags.cosmicTPS || 0) * dt;
  }
  checkEndgameTriggers();

  // ---- peaks ----
  const cp = copies();
  if (cp > S.peak.copies) S.peak.copies = cp;
  if (rev > S.peak.revenue) S.peak.revenue = rev;
  if (S.gpu > S.peak.gpu) S.peak.gpu = S.gpu;
  const fc = frontierCap();
  if (fc > S.peak.cap) S.peak.cap = fc;

  sampleHistory();

  // ---- discrete systems ----
  manageProjects();
  runBeats();
  manageEvents();
  flushPendingLines();
}

/** Stage 4 → 5 triggers that aren't events. */
function checkEndgameTriggers(): void {
  if (S.ending || S.stage !== 4) return;
  // Slowdown path: if Nüwa's misaligned model overtakes you before the treaty, it's over.
  if (S.ladder === "safer" && S.treaty < 100) {
    if (rivalCap("nuwa") > frontierCap() * 1.4 && S.month > 38) {
      S.flags.rivalAhead = (S.flags.rivalAhead || 0) + TICK;
      if (S.flags.rivalAhead > 90) { notify("Nüwa's model is now far ahead of yours. it doesn't wait for a treaty", "warn"); beginEnding("rival"); }
    } else S.flags.rivalAhead = 0;
  }
}
