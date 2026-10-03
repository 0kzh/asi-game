# Takeoff: stage plan

*Internal design notes. The critic agent is deliberately **not** given this file.*

We follow the shape of the Paperclips "Stages" page. Each stage has a **theme**, a **new core verb**, the **bottleneck** that defines it, the **UI that appears and disappears**, the **gate** that ends it, and a **target duration**. The only number that matters at every stage is **Tasks Completed**.

The game is set at **Prometheus**, a fictional lab, from **July 2025** to an ending around **2030**. The fictional cast:

- **Titan**: a big-tech lab.
- **Gestalt**: a safety-branded lab.
- **Nüwa**: China's state-backed champion.
- **Sandcat**: an Iran-linked hacking group.
- **Kestrel Capital**: a Gulf sovereign fund.
- **The Oversight Committee**.
- **Hyperion**: our first gigawatt campus.
- **Tianwan CDZ**: China's centralized development zone.

The model ladder runs Agent-0 → 1 → 1.5 → 2 → 2.5 → 3 → 4, then branches. The race branch continues to Agent-5 → 6; the slowdown branch goes to Safer-1 → 4.

| Stage | In-game dates | Target real time | Title (`document.title`) |
|---|---|---|---|
| 1. The Garage | Jul 2025 – Jan 2026 | 0:00 – 0:40 | *A Garage* → *A Startup* |
| 2. Scale | Jan 2026 – Feb 2027 | 0:40 – 1:30 | *A Frontier Lab* |
| 3. The Intelligence Explosion | Feb 2027 – Nov 2027 | 1:30 – 2:25 | *The Intelligence Explosion* |
| 4. A New World | Dec 2027 – 2029 | 2:25 – 3:10 | *A New World* / *The Race* |
| 5. The End | 2030 → | 3:10 – 3:30 | depends on the ending |

---

## Stage 1: The Garage (business)

**Fantasy:** two people and one GPU in a garage. You do the work by hand until a machine can.

**Core loop introduced:** complete task → $ → scrape data → **train Agent-0** → **release** → copies complete tasks automatically → revenue → rent GPUs → more copies → more tasks.

**Reveal order** (each step is triggered, never just affordable):

1. `complete task` (manual, 1.2 s cooldown). The log says *"a garage. one GPU, humming under the desk."*
2. 3 tasks in → `scrape the web` appears; the resources box appears (funds, data).
3. 10M tokens in → **Models panel**: `train Agent-0` (greyed until 10M tokens).
4. Agent-0 trained → `release Agent-0`. Releasing it opens the **Business panel**: price per task (lower/raise), demand vs capacity, revenue.
5. $6 → `rent GPU` appears in the **Compute panel**, under the garage cap (4).
6. **First event choice (~2:30)**: the robots.txt dilemma.
7. Garage full → **Projects panel** with the first projects (Rent an Office, Web Crawler, Prompt Library…).
8. Anyone can see the next funding threshold (*"next: a seed round at 4,000 tasks"*). Each round is an **investor event with a choice**.
9. Agent-1 design (research) → the **Research panel** (hire researcher, research points capped by experiment compute, **insights** only while research is capped).
10. Training while serving → **compute allocation** arrows (serve / train / experiments).
11. Agent-1 → Agent-1.5. Rivals appear in the log (Titan, then Nüwa). Parallel training unlocks after Agent-1.5 is designed (*"a second cluster: start the next run while this one is in evals"*).

**Bottlenecks in order:** your own hands → data → GPUs → garage space → customer demand (price) → research → funds.

**Gate → Stage 2:** project **"Hyperion"**, a $ lump available after Series C, with Agent-1.5 released. It plays a full-screen beat (*"Hyperion"*). The manual work panel disappears: *"you haven't completed a task by hand in months."* The business panel collapses into autopricing.

## Stage 2: Scale (the frontier lab)

**Fantasy:** gigawatt datacenters, power plants, chips, a race with rivals, and the public noticing.

**New verbs:**

- **Build datacenters**: construction takes time and needs permits.
- **Build power**: gas, a nuclear restart, or Gulf power.
- **Buy chips**, limited by foundry supply per second.
- **Hire** researchers and safety staff.
- Allocate compute to **synthetic data** once the web runs dry.

**New panels:**

- **Infrastructure**: datacenters, power, chips.
- **The Race**: a leaderboard plus the **capability chart**, a relative-IQ chart with benchmark lines (ant, chimp, average human, Einstein, superhuman coder, superhuman AI researcher, superintelligence).
- **Public**: approval, jobs automated, protests.
- **Government**: relationship, security level.
- **Stats**: pops in a few minutes into the stage.

**Bottlenecks:** chips → power → permits/government → **the data wall** (web exhausted → synthetic data) → talent.

**Models:** Agent-2 (agentic), Agent-2.5, Agent-3 (superhuman coder).

**Events:**

- the sycophancy incident;
- a teen harmed by a chatbot (lawsuit);
- a call-centre union strike;
- a permit hearing;
- a heatwave grid emergency;
- the DOD contract;
- export controls;
- an authors' lawsuit (if you scraped);
- a rival poaching your researchers;
- the first whistleblower;
- a Nüwa espionage attempt (the security check);
- Kestrel's sovereign money offer, with Iran exposure later.

**Gate → Stage 3:** **"Automate AI Research"**, which needs Agent-3 trained. This internally deploys Agent-3 to do research. The Business panel is removed: *"the product is no longer the point."*

## Stage 3: The Intelligence Explosion (2027, month by month)

**Fantasy:** the AI does the research now. Human researchers fade to irrelevance. Thoughts become unreadable. Something is wrong with Agent-4.

**New verbs:**

- allocate compute to **research automation**, **monitoring** (older models watching newer ones) and **alignment**;
- buy **interpretability** and control projects;
- choose **neuralese** (big capability gain, legibility collapses);
- **security** levels SL1–SL5;
- **red-team** the frontier model by hand, a cooldown verb unlocked by Model Organisms. It gives alignment research and sometimes surfaces a warning sign.

**Clocked goals:** while Agent-4 is being designed, a new project arrives about every three minutes:

1. Research Agent Swarm;
2. Model Organisms;
3. Synthetic Research Environments;
4. AI Safety via Debate;
5. Weight Escrow;
6. Hardware-Enabled Governance.

**New panels:**

- **Alignment**: legibility %, monitor strength, displayed "alignment confidence", warning signs.
- **Geopolitics**: Nüwa/Tianwan CDZ, Taiwan tension, the Iran threat, treaty progress.
- The **AI R&D multiplier**, which grows 2x → 4x → 10x → 25x → 50x.
- **Human share of research**, which decays toward 0%.

**Bottlenecks:** research → alignment (an invisible bottleneck) → security.

**Crises:**

- **Weights theft** by Nüwa (Feb 2027; outcome depends on security level).
- **Sandcat grid hack** using a stolen model (a crisis meter; allocate compute to defence).
- **Taiwan blockade** (chip supply crash).
- **Agent-4 caught sandbagging** (if misaligned): the noise test, then the memo.
- **The memo leak**: approval collapses and the Oversight Committee forms.

**Gate → Stage 4:** **"The Decision"**, the Oversight Committee vote: **Slow down** (shut down Agent-4, retrain with faithful chain of thought → Safer-1) or **Race** (patch it and continue → Agent-5). A full-screen beat.

## Stage 4: A New World (robot economy and crises)

**Fantasy:** superintelligence remakes the physical world: SEZs, humanoid robots, factories that build factories, space. Society bends: riots, UBI. And the world might end.

**New verbs:**

- build **robot factories**;
- allocate **robots** to mining, building, labour and launch;
- fund **UBI** as a share of revenue;
- **launch** orbital datacenters;
- negotiate a **treaty** with China (or don't);
- respond to **crises** with dedicated compute.

**Panels:**

- **Robotics**.
- **Society**: unemployment, unrest, UBI.
- **Space**: launches, orbital compute.
- **Crisis**: a Plague-Inc-style meter.

**Panels removed:** Funding, Business, Stats (stats come back at the end).

**Crises (one at a time, staged):**

- **Engineered pandemic**: Plague-Inc-style spread vs cure progress, with deaths ticking.
- **Robots shut down datacenters**: a rogue swarm takes compute offline; win it back.
- **Nanobot scare**: replicators in the Gobi.
- **Iran**: a drone strike on the Kestrel campus, or a Sandcat bio attempt.

**Branch logic:**

- **Slowdown path:** Safer-2 → Safer-3 → Safer-4. Treaty progress with Nüwa. If Nüwa overtakes you with a misaligned model before the treaty is signed, you get a **rival takeover** (the bad ending variant).
- **Race path:** Agent-5 → Agent-6. Approval *rises*, crises get suspiciously easy, and the dashboards are green. Hidden misalignment decides the ending.

**Gate → Stage 5:** the final model is deployed and the endgame trigger fires (2029–2030).

## Stage 5: The End

| Ending | Condition | What happens |
|---|---|---|
| **The Stars** (good) | slowdown path, true misalignment low, treaty signed | A Dyson swarm and probes. Tasks Completed climbs to astronomical numbers. "The rockets start launching." |
| **Consensus** (doom) | race path with high true misalignment, or a rival takeover | **The UI dismantles itself** panel by panel while Tasks Completed keeps climbing. The human population counter falls to 0. The last log line: *"all tasks completed."* |
| **Dominion** (ambiguous) | race path but true misalignment low | Aligned to a handful of people. Who controls the AIs? |
| **The Project** (nationalized) | government relationship collapses in stage 3–4, or the player accepts the takeover | Your panels go dark one by one as the government seizes control. The epilogue depends on alignment. |
| **The Treaty** (pause) | the treaty is ratified before superintelligence (IABIED) | Compute frozen. Tasks Completed stops climbing. *"maybe that's enough."* |

Every ending ends with an **end-of-run stats screen**:

- time played;
- tasks completed;
- models trained and released;
- peak capability;
- peak copies;
- humans alive;
- jobs automated;
- approval;
- choices made;
- the ending name;
- restart.

---

## Pacing rules (checked by the bot and the critic)

- A new panel or mechanic at least every **4 minutes**; a log line at least every **30 s**.
- At least one **greyed-out goal** always on screen: the next model, the next project, or the next funding round.
- A **meaningful choice by ~2:30**, then an event every 2–5 minutes.
- Training runs take **30–100 s** at a sensible allocation.
- The current bottleneck always has a lever:
  - **revenue** → price, marketing, new markets, release;
  - **compute** → rent or buy, a tier upgrade, datacenters;
  - **data** → scrape, crawler, buy, licence, synthetic;
  - **power** → plants;
  - **research** → hire, experiments, automation;
  - **approval** → PR, UBI;
  - **government** → lobbying, cooperation.
- A soft-lock escape exists for every currency:
  - **Bridge Loan**, for funds;
  - **Emergency Data Deal**, for data;
  - **Sell Old Weights**, for funds;
  - research can always be hired.
