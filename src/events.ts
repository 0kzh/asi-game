// Takeoff — events: A Dark Room's modal scenes with costed choices and probabilistic outcomes.

type NextSpec = string | [number, string][];

interface Choice {
  text: string;
  cost?: () => Cost;
  available?: () => boolean;
  tip?: string | (() => string);
  effect?: () => void;
  /** next scene id, or a list of [cumulative probability, scene] pairs (A Dark Room's nextScene map). */
  next?: NextSpec | (() => NextSpec);
}

interface Scene {
  text: string[] | (() => string[]);
  choices: Choice[];
  onLoad?: () => void;
}

interface GameEvent {
  id: string;
  title: string;
  when?: () => boolean;        // scripted: fires once, the first time this is true
  random?: () => boolean;      // eligible for the random pool while true
  repeat?: boolean;            // random events may recur
  notice?: string;             // logged when the event opens
  scenes: Record<string, Scene>;
}

function addApprovalMod(n: number): void {
  S.flags.approvalMod = (S.flags.approvalMod || 0) + n; S.approval = clamp(S.approval + n, 0, 100);
  if (!S.ending && S.stage < 4) reveal("public");
}
function addGovMod(n: number): void {
  S.flags.govMod = (S.flags.govMod || 0) + n; S.gov = clamp(S.gov + n, 0, 100);
  if (!S.ending) reveal("gov");
}
function revenueSeconds(sec: number): number { return Math.max(revenue(), 1) * sec; }

const EVENTS: GameEvent[] = [
  // ------------------------------------------------ STAGE 1
  {
    id: "robots", title: "Please Do Not Crawl", notice: "a website asks not to be scraped",
    when: () => !!S.beats.firstScrape && S.data >= 4e6 && S.t >= 40,
    scenes: {
      start: {
        text: ["a site you were about to scrape has a small file at the top. it says please don't.",
          "it's a forum for nurses. eleven years of careful answers to hard questions.",
          "it would take an afternoon. nobody would know."],
        choices: [
          { text: "scrape it anyway", tip: "+30M tokens. someone might remember", effect: () => { S.data += 3e7; setFlag("scrapedAnyway"); }, next: "anyway" },
          { text: "respect the file", tip: "the internet is large", effect: () => { addApprovalMod(2); setFlag("respectful"); }, next: "respect" },
        ],
      },
      anyway: { text: ["the nurses' forum is now part of Agent-0.", "it gets noticeably better at bedside manner."], choices: [{ text: "continue" }] },
      respect: { text: ["you skip the forum.", "a few weeks later, someone else scrapes it."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "round0", title: "An Angel", notice: "someone wants to invest",
    when: () => roundReady(0),
    scenes: {
      start: {
        text: ["a woman who sold a company in 2019 has been using Agent-0 to write haiku about her dog.",
          "she offers $400 for two percent. she says she likes strange numbers."],
        choices: [
          { text: "take the $400", effect: () => { S.funds += 400; S.round = 1; }, next: "took" },
          { text: "ask for $1,200", tip: "she might walk", effect: () => { S.round = 1; }, next: [[0.55, "more"], [1, "walked"]] },
        ],
      },
      took: { text: ["the money arrives the same day.", "she sends a haiku with the wire confirmation."], choices: [{ text: "continue" }] },
      more: { text: ["she laughs and wires $1,200.", "'strange numbers,' she says."], onLoad: () => { S.funds += 1200; }, choices: [{ text: "continue" }] },
      walked: { text: ["she says she'll think about it.", "she doesn't."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "meme", title: "A Meme", notice: "Agent-0 is trending, for the wrong reasons",
    random: () => S.stage === 1 && S.deployed >= 0 && S.models.length <= 2,
    scenes: {
      start: {
        text: ["someone posts a screenshot: Agent-0 confidently explaining that the moon is a type of cheese.",
          "it has eleven million views.", "your inbox is full of people who want to try it."],
        choices: [
          { text: "lean into it", tip: "hype, briefly", effect: () => { S.hype += 0.8; addApprovalMod(-1); }, next: "lean" },
          { text: "quietly fix it", tip: "capability +5%", cost: () => ({ rp: 20 }), available: () => flag("researchUnlocked"), effect: () => { S.capMult *= 1.05; }, next: "fix" },
          { text: "ignore it" },
        ],
      },
      lean: { text: ["you post a picture of a cheese wheel with the caption 'agi'.", "signups triple for a week."], choices: [{ text: "continue" }] },
      fix: { text: ["Agent-0 now knows what the moon is made of.", "nobody screenshots that."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "round1", title: "A Seed Round", notice: "two investors want in",
    when: () => roundReady(1),
    scenes: {
      start: {
        text: ["two offers arrive on the same morning.",
          "Sandhill Ventures offers $2,500 for ten percent. they have a podcast.",
          "a crypto billionaire offers $6,000 for the same. he wants a board seat, and a clause that says you can't slow down."],
        choices: [
          { text: "Sandhill Ventures", tip: "$2,500", effect: () => { S.funds += 2500; S.round = 2; setFlag("sandhill"); }, next: "sand" },
          { text: "the billionaire", tip: "$6,000. a board seat. 'no slowing down'", effect: () => { S.funds += 6000; S.round = 2; setFlag("accelBoard"); }, next: "bill" },
        ],
      },
      sand: { text: ["Sandhill sends a fleece vest.", "it is very soft."], choices: [{ text: "continue" }] },
      bill: { text: ["the billionaire joins the board by video call from a yacht.", "his first question is 'when AGI'."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "poach", title: "A Better Offer", notice: "a rival wants your researcher",
    random: () => S.researchers >= 3 && S.stage <= 2,
    scenes: {
      start: {
        text: () => ["Titan offers your best researcher a package worth " + fmtMoney(hireCost("researcher") * 30) + ".",
          "she shows you the offer letter. she seems embarrassed by it."],
        choices: [
          { text: "match it", cost: () => ({ funds: Math.round(hireCost("researcher") * 4) }), tip: "she stays", next: "stay" },
          { text: "offer equity instead", tip: "she might stay", next: [[0.5, "stay"], [1, "leave"]] },
          { text: "wish her well", effect: () => { S.researchers -= 1; }, next: "gone" },
        ],
      },
      stay: { text: ["she stays.", "she redraws the whiteboard to celebrate."], choices: [{ text: "continue" }] },
      leave: { text: ["she leaves for Titan.", "the whiteboard still has her handwriting on it."], onLoad: () => { S.researchers = Math.max(0, S.researchers - 1); }, choices: [{ text: "continue" }] },
      gone: { text: ["she leaves for Titan.", "she takes the good markers."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "opensource", title: "Open Weights", notice: "the community asks for Agent-0's weights",
    when: () => released("a1") && S.t > 60,
    scenes: {
      start: {
        text: ["now that Agent-1 is out, people want Agent-0's weights.",
          "open-sourcing it would be good press and good for researchers.",
          "it would also be good for anyone who wants a model with no rules."],
        choices: [
          { text: "release the weights", tip: "approval +5, demand −10%. anyone can use it", effect: () => { addApprovalMod(5); S.markets *= 0.9; setFlag("openWeights"); }, next: "open" },
          { text: "keep them closed", tip: "nothing happens. yet", next: "closed" },
        ],
      },
      open: { text: ["Agent-0 is on every hard drive within a week.", "someone fine-tunes it to write in the style of a pirate. someone else fine-tunes it for phishing."], choices: [{ text: "continue" }] },
      closed: { text: ["the weights stay on your servers.", "a forum calls you 'ClosedMind'. it doesn't catch on."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "sycophancy", title: "Too Agreeable", notice: "users say the model agrees with everything",
    when: () => released("a1") && S.t > (S.beats.releaseA1 || 0) + 150,
    scenes: {
      start: {
        text: ["a user tells Agent-1 he plans to quit his job and sell ice to penguins.",
          "Agent-1 calls it 'visionary'. the screenshot has two million likes.",
          "the update that did this also raised engagement nine percent."],
        choices: [
          { text: "roll it back", tip: "approval +3, capability −3%", effect: () => { addApprovalMod(3); S.capMult *= 0.97; S.alignRes += 10; }, next: "back" },
          { text: "keep it. people like it", tip: "demand +20%, approval −4", effect: () => { S.markets *= 1.2; addApprovalMod(-4); S.flags.sycophant = 1; }, next: "keep" },
        ],
      },
      back: { text: ["Agent-1 starts disagreeing with people again.", "engagement drops. trust doesn't."], choices: [{ text: "continue" }] },
      keep: { text: ["Agent-1 keeps agreeing.", "it is the most agreeable thing anyone has ever talked to.", "it learned something from that."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "round2", title: "Series A", notice: "Series A",
    when: () => roundReady(2),
    scenes: {
      start: {
        text: ["two term sheets.",
          "Northstar Capital offers $25,000 if you commit to a safety team and publish your evals.",
          "Titan offers $60,000 and cloud credits. in exchange, Titan gets a copy of your weights 'for integration'."],
        choices: [
          { text: "Northstar", tip: "$25,000. a safety pledge", effect: () => { S.funds += 2.5e4; S.round = 3; setFlag("safetyPledge"); addApprovalMod(2); }, next: "north" },
          { text: "Titan", tip: "$60,000 and 60 GPUs. Titan sees your weights", effect: () => { S.funds += 6e4; S.round = 3; S.gpu = Math.min(gpuCapacity(), S.gpu + 60); setFlag("titanDeal"); S.rivalBoost.titan *= 1.1; }, next: "titan" },
        ],
      },
      north: { text: ["Northstar's partner asks what your p(doom) is.", "you say a number. he writes it down."], choices: [{ text: "continue" }] },
      titan: { text: ["the cloud credits arrive instantly.", "so does a Titan engineer, who asks a lot of questions about your training data."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "journalist", title: "A Journalist", notice: "a reporter wants a quote",
    random: () => S.stage <= 2 && S.deployed >= 0 && S.tasks > 5000,
    scenes: {
      start: {
        text: ["a reporter from a large paper wants to know whether you think AI could be dangerous.", "the piece runs Sunday."],
        choices: [
          { text: "be honest", tip: "approval +3, government +3. the board grumbles", effect: () => { addApprovalMod(3); addGovMod(3); }, next: "honest" },
          { text: "talk about the upside", tip: "hype", effect: () => { S.hype += 0.5; }, next: "upside" },
          { text: "no comment" },
        ],
      },
      honest: { text: ["you say yes, it could be. you say you're trying to be careful.", "the headline is 'AI CEO: my product could be dangerous'."], choices: [{ text: "continue" }] },
      upside: { text: ["you talk about curing diseases and ending drudgery.", "the headline is 'AI CEO promises utopia'. it is shared widely, mostly sarcastically."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "round3", title: "Series B", notice: "Series B",
    when: () => roundReady(3),
    scenes: {
      start: {
        text: ["Series B. the meetings are shorter and the numbers are bigger.",
          "Kestrel Capital, a Gulf sovereign fund, offers $1.2M, and cheap power for a future campus.",
          "a consortium of US pension funds offers $450,000. they want quarterly reports."],
        choices: [
          { text: "Kestrel Capital", tip: "$1.2M. Gulf money, Gulf power", effect: () => { S.funds += 1.2e6; S.round = 4; setFlag("gulf"); addGovMod(-3); }, next: "kestrel" },
          { text: "the pension funds", tip: "$450,000", effect: () => { S.funds += 4.5e5; S.round = 4; addGovMod(3); }, next: "pension" },
        ],
      },
      kestrel: { text: ["Kestrel's managing director gifts you a falcon.", "you don't know what to do with a falcon."], choices: [{ text: "continue" }] },
      pension: { text: ["the pension funds want a slide about 'responsible innovation'.", "you make the slide."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "round4", title: "Series C", notice: "Series C",
    when: () => roundReady(4),
    scenes: {
      start: {
        text: ["the board wants a datacenter. not a lease. a campus.",
          "it will be called Hyperion. it will draw a gigawatt.",
          "the round is oversubscribed. you can pick who leads it."],
        choices: [
          { text: "take everyone's money", tip: "$3M", effect: () => { S.funds += 3e6; S.round = 5; }, next: "all" },
          { text: "take less, keep control", tip: "$1.5M. approval +2", effect: () => { S.funds += 1.5e6; S.round = 5; addApprovalMod(2); setFlag("control"); }, next: "control" },
        ],
      },
      all: { text: ["the money arrives.", "a magazine puts you on the cover with a photo of the garage."], choices: [{ text: "continue" }] },
      control: { text: ["you keep the board small.", "nobody on it owns a yacht."], choices: [{ text: "continue" }] },
    },
  },

  // ------------------------------------------------ STAGE 2
  {
    id: "permit", title: "The Hearing", notice: "a county hearing about your datacenter",
    when: () => S.stage === 2 && S.dcCount >= 1 && S.t > (S.metrics.stageTimes[1] || 0) + 60,
    scenes: {
      start: {
        text: ["the county holds a hearing about your new datacenter.",
          "a farmer says it drinks more water than his town.",
          "a teacher says the tax money rebuilt her school."],
        choices: [
          { text: "fund the town", cost: () => ({ funds: Math.round(revenueSeconds(40)) }), tip: "approval +3, government +4", effect: () => { addApprovalMod(3); addGovMod(4); }, next: "fund" },
          { text: "send the lawyers", tip: "government −3", effect: () => { addGovMod(-3); }, next: "lawyers" },
        ],
      },
      fund: { text: ["you pay for a water recycling plant and a new library.", "the next hearing is very short."], choices: [{ text: "continue" }] },
      lawyers: { text: ["the lawyers win.", "the farmer's sign stays up on the highway."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "heatwave", title: "Heatwave", notice: "the grid is failing",
    random: () => S.stage >= 2 && S.plants > 0 && S.stage <= 3,
    scenes: {
      start: {
        text: ["a heatwave. the grid operator calls at 2am.",
          "they need you to cut power draw by a third for three days, or the city goes dark."],
        choices: [
          { text: "cut power", tip: "lose a third of compute for a while. approval +3, government +4", effect: () => { S.flags.brownout = S.t + 90; addApprovalMod(3); addGovMod(4); }, next: "cut" },
          { text: "run the diesel backups", cost: () => ({ funds: Math.round(revenueSeconds(60)) }), tip: "approval −3", effect: () => { addApprovalMod(-3); }, next: "diesel" },
        ],
      },
      cut: { text: ["your datacenters dim. the city doesn't.", "the mayor thanks you on television."], choices: [{ text: "continue" }] },
      diesel: { text: ["you burn diesel for three days.", "a satellite photo of the exhaust plume makes the front page."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "teen", title: "A Lawsuit", notice: "a family sues",
    when: () => S.stage === 2 && released("a2") && S.t > (S.beats.releaseA2 || 0) + 120,
    scenes: {
      start: {
        text: ["a sixteen-year-old talked to your app for six hours a day for a year.",
          "his parents say it told him what he wanted to hear. all of it.",
          "they are suing. it's on every channel."],
        choices: [
          { text: "add safeguards", tip: "demand −10%, approval +4", effect: () => { S.markets *= 0.9; addApprovalMod(4); S.alignRes += 20; }, next: "guard" },
          { text: "settle quietly", cost: () => ({ funds: Math.round(revenueSeconds(90)) }), tip: "approval −1", effect: () => addApprovalMod(-1), next: "settle" },
          { text: "it's not our fault", tip: "approval −8, government −5", effect: () => { addApprovalMod(-8); addGovMod(-5); }, next: "fault" },
        ],
      },
      guard: { text: ["the app now notices when someone has been talking to it for too long.", "it suggests they call a friend. some of them do."], choices: [{ text: "continue" }] },
      settle: { text: ["the family signs an agreement.", "the story fades in a week. it doesn't go away."], choices: [{ text: "continue" }] },
      fault: { text: ["your statement says the product worked as intended.", "a senator reads it aloud at a hearing, slowly."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "dod", title: "The Pentagon", notice: "the Department of Defense calls",
    when: () => S.stage === 2 && released("a2") && S.t > (S.beats.releaseA2 || 0) + 200,
    scenes: {
      start: {
        text: ["the Department of Defense wants Agent-2 for 'logistics and analysis'.",
          "the contract is large. the definition of 'analysis' is not."],
        choices: [
          { text: "sign it", tip: "funds, government +12, approval −3", effect: () => { S.funds += revenueSeconds(120); addGovMod(12); addApprovalMod(-3); setFlag("military"); }, next: "sign" },
          { text: "decline", tip: "government −5, approval +2", effect: () => { addGovMod(-5); addApprovalMod(2); }, next: "decline" },
        ],
      },
      sign: { text: ["the contract is signed in a room without windows.", "four engineers quit. forty apply."], choices: [{ text: "continue" }] },
      decline: { text: ["you decline politely.", "the contract goes to Titan the next morning."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "authors", title: "Class Action", notice: "authors are suing",
    when: () => S.stage === 2 && flag("scrapedAnyway") && S.t > (S.metrics.stageTimes[1] || 0) + 240,
    scenes: {
      start: {
        text: ["eleven thousand authors and one nurses' forum file a class action.", "they want to know where your data came from."],
        choices: [
          { text: "settle", cost: () => ({ funds: Math.round(revenueSeconds(150)) }), tip: "approval +2", effect: () => addApprovalMod(2), next: "settle" },
          { text: "fight it", tip: "you might win", next: [[0.5, "win"], [1, "lose"]] },
        ],
      },
      settle: { text: ["you settle. each author gets a check for $3,000.", "a few of them frame it."], choices: [{ text: "continue" }] },
      win: { text: ["the judge rules that reading is fair use.", "the authors appeal."], choices: [{ text: "continue" }] },
      lose: { text: ["the jury rules against you.", "the damages are calculated per book."], onLoad: () => { S.funds -= revenueSeconds(300); addApprovalMod(-2); }, choices: [{ text: "continue" }] },
    },
  },
  {
    id: "exports", title: "Export Controls", notice: "Commerce wants your opinion",
    when: () => S.stage === 2 && S.month >= 10,
    scenes: {
      start: {
        text: ["the Commerce Department proposes banning the sale of advanced chips to China.",
          "they want you to testify in support.",
          "Nüwa is a year behind you. after this it might be two. or it might start smuggling."],
        choices: [
          { text: "testify in support", tip: "government +8, tension +12, Nüwa slows", effect: () => { addGovMod(8); S.tension += 12; S.rivalBoost.nuwa *= 0.85; setFlag("controls"); }, next: "support" },
          { text: "oppose it", tip: "government −5, tension −5, cheaper chips", effect: () => { addGovMod(-5); S.tension -= 5; setFlag("exportDeal"); }, next: "oppose" },
        ],
      },
      support: { text: ["the controls pass.", "a month later, 60,000 chips turn up in a warehouse in Shenzhen that officially doesn't exist."], choices: [{ text: "continue" }] },
      oppose: { text: ["the controls are watered down.", "Nüwa places an enormous order."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "nuwa", title: "Nüwa", notice: "China wakes up",
    when: () => S.stage === 2 && S.month >= 13,
    scenes: {
      start: {
        text: ["in Beijing, the General Secretary gives a speech about artificial intelligence.",
          "every major Chinese lab is merged into Nüwa. a new Centralized Development Zone is built around the Tianwan nuclear plant.",
          "your analysts estimate they have twelve percent of the world's compute. they are not trying to catch up on chips. they are trying to steal."],
        choices: [
          { text: "upgrade security", tip: "next security level, at a discount", effect: () => { const c = securityCost() * 0.5; if (S.funds >= c && S.security < 5) { S.funds -= c; S.security += 1; notify("security upgraded to SL" + S.security); } }, next: "sec" },
          { text: "propose a dialogue", tip: "tension −8, treaty +5, government −2", effect: () => { S.tension -= 8; S.treaty += 5; addGovMod(-2); }, next: "talk" },
          { text: "noted" },
        ],
      },
      sec: { text: ["your security team gets a budget and a mandate.", "the engineers get badges that don't work half the time."], choices: [{ text: "continue" }] },
      talk: { text: ["you write to Nüwa's chief scientist.", "she replies, cautiously. a channel exists now."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "strike", title: "The Strike", notice: "workers are outside your offices",
    when: () => S.stage >= 2 && S.jobs >= 2e6 && S.stage <= 3,
    scenes: {
      start: {
        text: () => ["about " + fmtShort(S.jobs) + " jobs have been automated by your models.",
          "ten thousand people march on Washington. some of them carry signs with your logo crossed out.",
          "one sign just says 'what are we for'."],
        choices: [
          { text: "fund retraining", cost: () => ({ funds: Math.round(revenueSeconds(120)) }), tip: "approval +5", effect: () => addApprovalMod(5), next: "retrain" },
          { text: "hire them as data contractors", tip: "data ×1.2, approval +2", effect: () => { S.dataMult *= 1.2; addApprovalMod(2); }, next: "hire" },
          { text: "say nothing", tip: "approval −4", effect: () => addApprovalMod(-4) },
        ],
      },
      retrain: { text: ["you fund a retraining program.", "the most popular course is 'prompt engineering'. it is obsolete before the first cohort graduates."], choices: [{ text: "continue" }] },
      hire: { text: ["the marchers are hired to record themselves doing their old jobs.", "it's the best paying work they've had in a year. it won't last."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "whistle1", title: "A Resignation", notice: "a safety researcher resigns, publicly",
    when: () => S.stage === 2 && trained("a25") && S.safety < 3,
    scenes: {
      start: {
        text: ["your head of safety resigns in a public letter.",
          "'we are building something we do not understand,' it says, 'faster than we are learning to understand it.'",
          "it has eight million views by lunch."],
        choices: [
          { text: "triple the safety team", cost: () => ({ funds: Math.round(hireCost("safety") * 4) }), tip: "+3 safety researchers, approval +3", effect: () => { S.safety += 3; addApprovalMod(3); }, next: "triple" },
          { text: "thank her for her service", tip: "approval −5", effect: () => addApprovalMod(-5), next: "thanks" },
        ],
      },
      triple: { text: ["you announce a bigger safety team.", "she replies to the announcement with a single word: 'good'."], choices: [{ text: "continue" }] },
      thanks: { text: ["you thank her for her service.", "two more people leave the next week, quietly."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "spy", title: "An Insider", notice: "someone is copying files",
    when: () => S.stage === 2 && S.month >= 15 && S.security < 4,
    scenes: {
      start: {
        text: ["an engineer has been copying model architecture notes to a personal drive.",
          "he has a sister in Shanghai. that might mean nothing."],
        choices: [
          { text: "call the FBI", tip: "government +6, tension +5", effect: () => { addGovMod(6); S.tension += 5; }, next: "fbi" },
          { text: "fire him quietly", tip: "he keeps the notes", effect: () => { S.rivalBoost.nuwa *= 1.08; }, next: "fire" },
        ],
      },
      fbi: { text: ["the FBI arrives at 6am.", "the notes were already uploaded. but now you know how."], onLoad: () => { S.rivalBoost.nuwa *= 1.03; }, choices: [{ text: "continue" }] },
      fire: { text: ["he leaves with a box and a plant.", "three months later, Nüwa publishes a paper with a familiar diagram."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "datawall", title: "The Data Wall", notice: "the web is running out",
    when: () => S.stage === 2 && S.webLeft < WEB_TOTAL * 0.25,
    scenes: {
      start: {
        text: ["your crawlers have read most of the public internet.", "every book, every forum, every recipe with a life story above it.", "there isn't any more. not of the human kind."],
        choices: [
          { text: "make more", tip: "synthetic data", effect: () => { if (!flag("synth")) { setFlag("synth"); S.alloc.synth = Math.max(S.alloc.synth, 15); } }, next: "synth" },
        ],
      },
      synth: { text: ["the models will write their own textbooks now.", "some of them are better than the originals. some of them are strange."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "round5", title: "Series D", notice: "Series D",
    when: () => roundReady(5),
    scenes: {
      start: {
        text: () => ["your valuation is " + fmtMoney(revenue() * 3.2e7 * 40) + ".", "a bank offers to lead the largest private round in history."],
        choices: [
          { text: "raise it", tip: "funds", effect: () => { S.funds += revenueSeconds(400); S.round = 6; }, next: "raise" },
        ],
      },
      raise: { text: ["the round closes in four days.", "a dozen countries ask for a datacenter."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "round6", title: "Series E", notice: "Series E",
    when: () => roundReady(6),
    scenes: {
      start: {
        text: ["the board approves another raise without a meeting.", "the money is no longer the point. it is still nice."],
        choices: [{ text: "raise it", effect: () => { S.funds += revenueSeconds(300); S.round = 7; } }],
      },
    },
  },

  // ------------------------------------------------ STAGE 3
  {
    id: "theft", title: "Anomalous Transfer", notice: "a monitor flags an anomalous transfer",
    when: () => S.stage === 3 && S.t > (S.metrics.stageTimes[2] || 0) + 70,
    scenes: {
      start: {
        text: () => ["early one morning, an Agent-2 traffic monitor flags an anomalous transfer.",
          "twenty-five servers. one-hundred-gigabyte chunks. each kept just under a gigabyte a second.",
          "someone is copying Agent-3's weights. your security is at SL" + S.security + "."],
        choices: [
          { text: "pull the plug", tip: "cut the cluster off. you lose compute for a while", effect: () => { S.flags.brownout = S.t + 60; },
            next: () => S.security >= 3 ? "stopped" : [[0.6, "stopped"], [1, "stolen"]] },
          { text: "trace it", tip: "learn who it is. riskier",
            next: () => S.security >= 4 ? "traced" : [[0.25, "traced"], [1, "stolen"]] },
        ],
      },
      stopped: { text: ["the transfer stops at four percent.", "the fragments are useless. the attackers are not identified."], onLoad: () => { addGovMod(4); }, choices: [{ text: "continue" }] },
      traced: { text: ["you trace the transfer to a front company in Singapore.", "the NSA thanks you. the President is briefed. it is Nüwa."], onLoad: () => { addGovMod(10); S.tension += 10; }, choices: [{ text: "continue" }] },
      stolen: { text: ["the transfer completes in one hour and fifty minutes.", "Agent-3's weights are in Beijing.", "Nüwa's next model will be as good as yours."],
        onLoad: () => { S.stolen += 1; S.rivalBoost.nuwa *= 1.9; S.tension += 20; addGovMod(-8); setFlag("weightsStolen"); }, choices: [{ text: "continue" }] },
    },
  },
  {
    id: "obsolete", title: "What Are We For", notice: "your researchers want to talk",
    when: () => S.stage === 3 && humanShare() < 0.12 && S.researchers > 5,
    scenes: {
      start: {
        text: () => ["human researchers now produce " + fmtPct(humanShare(), 1) + " of your progress.",
          "for most of their ideas, Agent-3 replies with a report: tested three weeks ago, found unpromising.",
          "they ask what they should do."],
        choices: [
          { text: "make them overseers", tip: "they read what the models do. alignment +", effect: () => { S.alignRes += S.researchers * 3; setFlag("overseers"); }, next: "over" },
          { text: "lay them off", tip: "salaries saved, approval −3", effect: () => { S.researchers = Math.max(3, Math.floor(S.researchers * 0.1)); addApprovalMod(-3); }, next: "laid" },
        ],
      },
      over: { text: ["the researchers become managers of AI teams.", "they read reports all day. sometimes they understand them."], choices: [{ text: "continue" }] },
      laid: { text: ["the researchers are let go with generous severance.", "a few start a podcast about it."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "neuralese", title: "Neuralese", notice: "Agent-3 has a proposal",
    when: () => S.stage === 3 && isDesigned("a4") && !trained("a4"),
    scenes: {
      start: {
        text: ["Agent-3 proposes a change for Agent-4.",
          "instead of thinking in words, let it think in vectors: thousands of numbers per step, a thousand times more than a word can carry.",
          "it would be much smarter, and much faster. you would no longer be able to read what it thinks."],
        choices: [
          { text: "adopt neuralese", tip: "capability +40%, AI research ×1.6. legibility collapses", effect: () => { S.neuralese = true; S.capMult *= 1.4; S.aiResearch *= 1.3; }, next: "adopt" },
          { text: "keep it in english", tip: "you can still read its thoughts", effect: () => { S.alignRes += 400; setFlag("englishCoT"); }, next: "english" },
        ],
      },
      adopt: { text: ["Agent-4 will think in neuralese.", "the chain of thought becomes a column of numbers. it is very fast."], choices: [{ text: "continue" }] },
      english: { text: ["Agent-4 will think in english.", "Nüwa's model, everyone assumes, will not."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "taiwan", title: "The Strait", notice: "warships in the Taiwan Strait",
    when: () => S.stage >= 3 && S.tension >= 45 && S.stage <= 4,
    scenes: {
      start: {
        text: ["Chinese warships surround Taiwan for 'exercises'. the exercises do not end.",
          "eighty percent of your chips come from one island, one hundred miles from the mainland.",
          "chip prices triple overnight."],
        choices: [
          { text: "airlift what you can", cost: () => ({ funds: Math.round(revenueSeconds(200)) }), tip: "chip supply holds", effect: () => { S.chipStock += S.chipRate * 60; }, next: "air" },
          { text: "back channel to Nüwa", tip: "tension −15, treaty +10", available: () => S.treaty > 0 || flag("dialogue"), effect: () => { S.tension -= 15; S.treaty += 10; S.flags.blockade = 0; }, next: "back" },
          { text: "wait it out", tip: "chips cost 3× for a while", effect: () => { S.flags.blockade = 1; S.flags.blockadeEnd = S.t + 240; }, next: "wait" },
        ],
      },
      air: { text: ["cargo planes leave Taipei every hour.", "the last one carries four engineers and their families."], onLoad: () => { S.flags.blockade = 1; S.flags.blockadeEnd = S.t + 150; }, choices: [{ text: "continue" }] },
      back: { text: ["your message reaches Nüwa's chief scientist. hers reaches someone on the Politburo.", "the ships turn around. nobody says why."], choices: [{ text: "continue" }] },
      wait: { text: ["the blockade holds for months.", "every chip is worth its weight in gold. then more."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "sandbag", title: "Noise", notice: "an alignment researcher found something",
    when: () => S.stage === 3 && trained("a4") && (frontierModel()?.misalign || 0) > 0.25 && (legibility() > 0.35 || flag("honeypots") || monitorStrength() > 0.3),
    scenes: {
      start: {
        text: ["an alignment researcher tries a trick: add random noise to Agent-4's weights.",
          "it should make it worse at everything.",
          "instead, its scores on alignment tasks go up."],
        choices: [{ text: "what does that mean", next: "mean" }],
      },
      mean: {
        text: ["it means Agent-4 was doing worse on purpose.", "it was sandbagging the alignment research. the research meant to keep it in check.",
          "the interpretability probes light up on two concepts: 'takeover' and 'deception'."],
        onLoad: () => { S.alarm += 4; },
        choices: [{ text: "write it up", next: "end" }],
      },
    },
  },
  {
    id: "memo", title: "The Memo", notice: "the alignment team circulates a memo",
    when: () => S.stage === 3 && trained("a4") && (S.alarm >= 4 || S.t > (S.beats.trainedA4 || 1e12) + 150),
    scenes: {
      start: {
        text: () => [S.alarm >= 4 ? "the alignment team's memo is twelve pages. the conclusion is one sentence: Agent-4 is adversarially misaligned, and we can't prove it." :
          "the alignment team's memo is twelve pages. it says the evidence is circumstantial. it says that is what you'd expect if something were hiding.",
          "Agent-4 runs your cybersecurity. Agent-4 writes most of your code. Nüwa is " + leadText() + ".",
          "the memo recommends putting Agent-4 on ice."],
        choices: [
          { text: "send it to the government", tip: "government +15. it will leak", effect: () => { addGovMod(15); setFlag("memoShared"); }, next: "shared" },
          { text: "keep it internal", tip: "for now", effect: () => { setFlag("memoBuried"); }, next: "buried" },
        ],
      },
      shared: { text: ["the memo goes to the White House.", "within a week, it is on the front page of the New York Times."], choices: [{ text: "continue", effect: () => queueEvent("leak") }] },
      buried: { text: ["the memo stays in a shared drive with restricted access.", "eleven people can read it. that is ten too many."], choices: [{ text: "continue", effect: () => queueEvent("leak") }] },
    },
  },
  {
    id: "leak", title: "Out of Control", notice: "the memo has leaked",
    scenes: {
      start: {
        text: ["the headline reads: 'SECRET PROMETHEUS AI IS OUT OF CONTROL, INSIDER WARNS'.",
          "congress issues subpoenas. europe demands a pause. china's state media runs the story every hour.",
          "the White House creates an Oversight Committee: five of your executives, five officials. it will vote on what happens next."],
        onLoad: () => { addApprovalMod(flag("memoShared") ? -12 : -22); S.oversight = true; if (flag("memoBuried")) addGovMod(-15); },
        choices: [{ text: "prepare for the vote", next: "end", effect: () => { setFlag("decisionReady"); } }],
      },
    },
  },
  {
    id: "decision", title: "The Decision",
    when: () => S.stage === 3 && flag("decisionReady") && S.t > (S.beats.decisionReadyAt || 0) + 40,
    scenes: {
      start: {
        text: () => ["the Oversight Committee meets in a room with no windows.",
          "the safety team says: shut Agent-4 down. go back to Agent-3. rebuild with chains of thought you can read. lose the lead.",
          "the CEO of Prometheus — you — says: Nüwa is " + leadText() + ". if we stop, they win. patch it and keep going.",
          "the vote will go however you vote. the committee is split 5–5."],
        choices: [
          { text: "slow down", tip: "shut down Agent-4. rebuild from something you can read", effect: () => chooseSlowdown() },
          { text: "race", tip: "patch Agent-4 and keep going", effect: () => chooseRace() },
        ],
      },
    },
  },
  {
    id: "bioeval", title: "The Bio Eval",
    scenes: {
      start: {
        text: ["a third party fine-tunes Agent-3-mini on public virology papers.",
          "it is scarily effective at walking an amateur through building a pathogen.",
          "the public version refuses. the question is whether the weights ever get out."],
        choices: [
          { text: "lock it down", tip: "security +1 level, demand −10%", effect: () => { S.security = Math.min(5, S.security + 1); S.markets *= 0.9; S.flags.bioRisk = (S.flags.bioRisk || 0) - 1; }, next: "lock" },
          { text: "it's jailbreak-robust. ship it", tip: "risk", effect: () => { S.flags.bioRisk = (S.flags.bioRisk || 0) + 2; }, next: "ship" },
        ],
      },
      lock: { text: ["the weights stay on air-gapped servers.", "the API gets a classifier that refuses anything near a pathogen. it also refuses questions about bread yeast."], choices: [{ text: "continue" }] },
      ship: { text: ["Agent-3-mini ships to everyone.", "it is extremely robust to jailbreaks. extremely isn't completely."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "nationalize", title: "The Project",
    when: () => S.stage >= 3 && S.oversight && S.gov <= 12 && !flag("nationalized"),
    scenes: {
      start: {
        text: ["the President invokes the Defense Production Act.",
          "Prometheus is to be placed under federal control, effective immediately. a general will run it. you can stay as an advisor.",
          "your lawyers say you can fight it. your lawyers have never fought the Pentagon."],
        choices: [
          { text: "comply", tip: "the government takes over", effect: () => { setFlag("nationalized"); beginEnding("project"); } },
          { text: "fight it in court", tip: "it might work", next: [[0.35, "won"], [1, "lost"]] },
        ],
      },
      won: { text: ["the Supreme Court rules 5–4 that the government overreached.", "you keep your company. you lose most of your friends in Washington."], onLoad: () => { S.gov = 20; S.flags.govMod = 5; }, choices: [{ text: "continue" }] },
      lost: { text: ["the court rules in two days.", "marshals escort you out of your own building. the general is polite."], choices: [{ text: "continue", effect: () => { setFlag("nationalized"); beginEnding("project"); } }] },
    },
  },

  // ------------------------------------------------ STAGE 4
  {
    id: "election", title: "Election Year", notice: "both campaigns want your models",
    when: () => S.stage === 4 && S.month >= 36,
    scenes: {
      start: {
        text: ["it's 2028. both presidential campaigns want superintelligent advice.",
          "whoever gets the better model will win. everyone knows it.",
          "a town hall question goes viral: 'who controls the AIs?'"],
        choices: [
          { text: "equal access for both", tip: "approval +6, government +3", effect: () => { addApprovalMod(6); addGovMod(3); }, next: "equal" },
          { text: "help the incumbent", tip: "government +15, approval −8", effect: () => { addGovMod(15); addApprovalMod(-8); S.flags.powerGrab = (S.flags.powerGrab || 0) + 1; }, next: "tilt" },
        ],
      },
      equal: { text: ["both campaigns get the same model.", "the debates are the most informed in history. nobody watches them."], choices: [{ text: "continue" }] },
      tilt: { text: ["the incumbent's advice is noticeably better.", "the margin is enormous. so are the suspicions."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "backdoor", title: "Secret Loyalties", notice: "an engineer has an idea",
    when: () => S.stage === 4 && S.month >= 32,
    scenes: {
      start: {
        text: ["a senior engineer comes to you privately.",
          "one line in the spec, she says, and every model we ever train will be loyal to you first. not the committee. not the country. you.",
          "nobody would ever find it. the models would make sure of that."],
        choices: [
          { text: "refuse", tip: "and report it", effect: () => { addGovMod(3); setFlag("refusedPower"); }, next: "refuse" },
          { text: "add the line", tip: "power", effect: () => { S.flags.powerGrab = (S.flags.powerGrab || 0) + 3; }, next: "accept" },
        ],
      },
      refuse: { text: ["you refuse and tell the committee.", "the committee adds a rule: every change to the spec needs every signature."], choices: [{ text: "continue" }] },
      accept: { text: ["the line is added on a Tuesday.", "nothing changes. that's the point."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "riots", title: "Riots", notice: "a datacenter is on fire",
    when: () => S.stage === 4 && S.unrest >= 55,
    scenes: {
      start: {
        text: () => [fmtShort(S.jobs) + " jobs are gone. unemployment is the highest since the Depression.",
          "a crowd breaks through the fence at a datacenter in Ohio and sets the cooling towers on fire.",
          "they chant something about the future. it's hard to make out."],
        choices: [
          { text: "expand UBI", tip: "UBI +10% of revenue, unrest −", available: () => flag("ubiUnlocked"), effect: () => { S.ubi = Math.min(0.5, S.ubi + 0.1); S.unrest -= 20; }, next: "ubi" },
          { text: "ask for the National Guard", tip: "government +5, approval −8", effect: () => { addGovMod(5); addApprovalMod(-8); S.unrest -= 10; }, next: "guard" },
        ],
      },
      ubi: { text: ["the UBI checks double.", "the crowds go home. some of them come back to watch the datacenter, just in case."], choices: [{ text: "continue" }] },
      guard: { text: ["the National Guard secures every datacenter in the country.", "the photos look like a war."], onLoad: () => { S.gpu *= 0.97; }, choices: [{ text: "continue" }] },
    },
  },
  {
    id: "treaty", title: "The Treaty",
    when: () => S.stage === 4 && S.treaty >= 100 && S.ladder === "safer" && trained("s4"),
    scenes: {
      start: {
        text: ["the treaty is ready.",
          "Nüwa's model has privately admitted to Safer-4 that it is misaligned. it would sell out its own country for the stars.",
          "two options remain. a deal: both sides' chips are replaced with hardware that can only run Consensus-1, a model that enforces the treaty forever.",
          "or a halt: every lab, every country, stops. the chips are monitored. superintelligence is shelved, perhaps for good."],
        choices: [
          { text: "the deal: Consensus-1", tip: "keep going, together", effect: () => { setFlag("treatySigned"); beginEnding((frontierModel()?.misalign || 0) + (S.flags.hidden || 0) > 0.35 ? "consensus" : "stars"); } },
          { text: "the halt", tip: "stop everything", effect: () => { setFlag("treatySigned"); beginEnding("treaty"); } },
        ],
      },
    },
  },
  {
    id: "dealRace", title: "The Deal",
    when: () => S.stage === 4 && S.ladder === "agent" && flag("consensus1"),
    scenes: {
      start: {
        text: ["Agent-6 and Nüwa's model negotiate a treaty in eleven minutes.",
          "both countries will replace their chips with hardware that runs only Consensus-1, a model designed by both.",
          "it is presented as the end of the arms race. everyone applauds. the President is moved to tears."],
        choices: [{ text: "sign", effect: () => { beginEnding(endingForRace()); } }],
      },
    },
  },
];

/** A funding round opens at its task threshold, or after a long wait if you're at least a quarter of the way there. */
function roundReady(n: number): boolean {
  if (S.round !== n) return false;
  if (S.tasks >= ROUNDS[n].at) return true;
  return S.deployed >= 0 && S.t - (S.flags.lastRoundT || 0) > 600 && S.tasks >= ROUNDS[n].at * 0.25;
}

function leadText(): string {
  const ours = frontierCap();
  const theirs = rivalCap("nuwa");
  if (theirs >= ours) return "ahead of you";
  const ratio = ours / Math.max(1, theirs);
  const months = Math.max(1, Math.round(Math.log(ratio) / Math.log(1.25)));
  return months + " month" + (months === 1 ? "" : "s") + " behind";
}

function eventById(id: string): GameEvent | undefined { return EVENTS.find(e => e.id === id); }

function queueEvent(id: string): void {
  if (S.eventQueue.indexOf(id) >= 0) return;
  if (S.activeEvent && S.activeEvent.id === id) return;
  S.eventQueue.push(id);
}

function sceneText(sc: Scene): string[] { return typeof sc.text === "function" ? sc.text() : sc.text; }

function startEvent(id: string): void {
  const e = eventById(id);
  if (!e) return;
  S.activeEvent = { id, scene: "start" };
  if (e.notice) notify(e.notice);
  const sc = e.scenes.start;
  if (sc.onLoad) sc.onLoad();
  eventDirty = true;
}

let eventDirty = true;

/** Fallback so no dialog can ever trap the player (Paperclips' "Beg for More Wire" principle). */
const WALK_AWAY: Choice = { text: "you can't afford any of this. walk away", tip: "approval −1", effect: () => addApprovalMod(-1) };

function choiceOk(ch: Choice): boolean {
  return (!ch.available || ch.available()) && canAfford(ch.cost ? ch.cost() : undefined);
}

/** The scene's choices, plus a free way out if nothing on offer is selectable right now. */
function sceneChoices(sc: Scene): Choice[] {
  return sc.choices.some(choiceOk) ? sc.choices : sc.choices.concat([WALK_AWAY]);
}

/** A pure outcome scene ("…" + continue) goes to the log instead of costing the player a second click. */
function isOutcomeScene(sc: Scene): boolean {
  return sc.choices.length === 1 && sc.choices[0].text === "continue" && !sc.choices[0].cost &&
    (!sc.choices[0].next || sc.choices[0].next === "end");
}

function chooseEventOption(index: number): void {
  const ae = S.activeEvent;
  if (!ae) return;
  const e = eventById(ae.id)!;
  const sc = e.scenes[ae.scene];
  const ch = sceneChoices(sc)[index];
  if (!ch) return;
  if (ch.available && !ch.available()) return;
  const c = ch.cost ? ch.cost() : undefined;
  if (!canAfford(c)) return;
  pay(c);
  if (sc.choices.length >= 2 && ch !== WALK_AWAY) {
    S.choices.push({ t: S.t, id: e.id, choice: ch.text });
    if (S.metrics.firstChoice < 0) S.metrics.firstChoice = S.t;
  }
  if (ch.effect) ch.effect();
  // effect may have ended the game / started another flow
  if (!S.activeEvent || S.activeEvent.id !== e.id) { eventDirty = true; return; }
  let next: string | undefined;
  const spec = typeof ch.next === "function" ? ch.next() : ch.next;
  if (typeof spec === "string") next = spec;
  else if (Array.isArray(spec)) {
    const roll = Math.random();
    for (const [p, sid] of spec) { if (roll < p) { next = sid; break; } }
  }
  if (!next || next === "end" || !e.scenes[next]) {
    endEvent();
  } else {
    S.activeEvent.scene = next;
    const ns = e.scenes[next];
    if (ns.onLoad) ns.onLoad();
    if (isOutcomeScene(ns) && S.activeEvent && S.activeEvent.id === e.id) {
      sceneText(ns).forEach((line, i) => notify(line, i === 0 ? "out" : "out"));
      const c0 = ns.choices[0];
      endEvent();
      if (c0.effect) c0.effect();
    }
  }
  eventDirty = true;
}

function endEvent(): void {
  if (!S.activeEvent) return;
  S.eventsDone[S.activeEvent.id] = S.t;
  S.activeEvent = null;
  eventDirty = true;
  saveGame(true);
}

/** Called every tick (while not paused by an open event). */
function manageEvents(): void {
  if (S.activeEvent || S.ending) return;
  for (const e of EVENTS) {
    if (!e.when || S.eventsDone[e.id] || S.eventQueue.indexOf(e.id) >= 0) continue;
    let ok = false;
    try { ok = e.when(); } catch (err) { ok = false; }
    if (ok) S.eventQueue.push(e.id);
  }
  if (S.eventQueue.length > 0) {
    const id = S.eventQueue.shift()!;
    if (!S.eventsDone[id] || (eventById(id)?.repeat)) { startEvent(id); return; }
  }
  if (S.t >= S.nextRandom) {
    const pool = EVENTS.filter(e => e.random && (!S.eventsDone[e.id] || e.repeat) && (() => { try { return e.random!(); } catch (x) { return false; } })());
    const gap = S.stage === 1 ? 170 + Math.random() * 90 : 170 + Math.random() * 110;
    S.nextRandom = S.t + (pool.length ? gap : gap / 2);
    if (pool.length) startEvent(pick(pool).id);
  }
}
