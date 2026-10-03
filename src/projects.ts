// Takeoff — projects (Universal Paperclips' projects.js, as data).
// Each one REVEALS on trigger() (usually well before it's affordable) and is BOUGHT when cost() is met.

interface Project {
  id: string;
  title: string;
  desc: string;
  cost: () => Cost;
  trigger: () => boolean;
  effect: () => void;
  msg?: string;
  stages?: number[];      // shown only in these stages
  repeat?: () => boolean; // re-arm after purchase while true
  gate?: boolean;         // stage transition: drawn with emphasis
  req?: () => boolean;    // non-resource requirement (shown in the price tag while unmet)
  reqText?: string;
}

function bought(id: string): boolean { return !!S.projBought[id]; }
function released(id: string): boolean { return S.models.some(m => m.id === id && m.released); }
function trained(id: string): boolean { return S.models.some(m => m.id === id); }
function isDesigned(id: string): boolean { return !!S.designed[id]; }

function design(id: string): void {
  S.designed[id] = 1;
}

const PROJECTS: Project[] = [
  // ======================= STAGE 1 — THE GARAGE =======================
  {
    id: "keyboard", title: "Mechanical Keyboard", desc: "Click faster. Clack louder. (task cooldown −35%)",
    cost: () => ({ funds: 30 }), trigger: () => S.tasksManual >= 3, stages: [1],
    effect: () => { setFlag("fasterHands"); }, msg: "the keyboard is very loud. you complete tasks faster",
  },
  {
    id: "headless", title: "Headless Browser", desc: "Scrape pages the way a person would, minus the person. (scrape ×2.4)",
    cost: () => ({ funds: 30 }), trigger: () => !!S.beats.firstScrape && S.t > 120, stages: [1],
    effect: () => { setFlag("betterScraper"); }, msg: "the scraper runs headless. it reads faster than you",
  },
  {
    id: "crawler", title: "Web Crawler", desc: "A script that reads the internet while you sleep. (unlocks crawlers)",
    cost: () => ({ funds: 45 }), trigger: () => S.deployed >= 0 && S.t > (S.beats.releaseA0 || 1e12) + 75, stages: [1],
    effect: () => { setFlag("crawlers"); S.crawlers = Math.max(S.crawlers, 1); },
    msg: "the crawler starts at wikipedia and follows every link",
  },
  {
    id: "office", title: "Rent an Office", desc: "Above a dry cleaner. Room for 24 GPUs if nobody sits down.",
    cost: () => ({ funds: 160 }), trigger: () => S.gpu >= 3, stages: [1],
    effect: () => { S.tier = Math.max(S.tier, 1); setFlag("officeMoved"); }, msg: "you move the GPUs into an office above a dry cleaner. it smells like steam",
  },
  {
    id: "promptlib", title: "Prompt Library", desc: "A folder of prompts that actually work. (tasks per copy +25%)",
    cost: () => ({ funds: 60 }), trigger: () => S.deployed >= 0, stages: [1],
    effect: () => { S.speedMult *= 1.25; }, msg: "Agent-0 works 25% faster when you ask nicely",
  },
  {
    id: "api", title: "API Platform", desc: "Let developers build on your models. (demand ×2)",
    cost: () => ({ funds: 160 }), trigger: () => S.deployed >= 0 && S.tasks >= 400, stages: [1],
    effect: () => { S.markets *= 2; }, msg: "the API goes live. someone builds a horoscope app on it within the hour",
  },
  {
    id: "consulting", title: "Consulting Retainer", desc: "Charge more for the work you still do by hand. (manual tasks pay $9)",
    cost: () => ({ funds: 80 }), trigger: () => S.tasksManual >= 40, stages: [1],
    effect: () => { setFlag("consulting"); }, msg: "a logistics company puts you on retainer. they think you're an agency",
  },
  {
    id: "research", title: "Hire a Researcher", desc: "Someone who knows how to make the next model. (unlocks research)",
    cost: () => ({ funds: 80 }), trigger: () => S.deployed >= 0 && S.tasks >= 1000 && S.t > 240, stages: [1],
    effect: () => { setFlag("researchUnlocked"); S.researchers += 1; },
    msg: "you hire a researcher. she brings a whiteboard and opinions",
  },
  {
    id: "designA1", title: "Design Agent-1", desc: "Ten times the parameters. Real code, maybe. (unlocks training Agent-1)",
    cost: () => ({ rp: 260 }), trigger: () => flag("researchUnlocked"), stages: [1],
    effect: () => design("a1"), msg: "the whiteboard fills up with arrows. Agent-1 exists, on paper",
  },
  {
    id: "databroker", title: "Data Broker", desc: "There are people who sell text by the gigabyte. (unlocks buying datasets)",
    cost: () => ({ funds: 90 }), trigger: () => isDesigned("a1") || (S.tasks >= 1200 && S.t > 480), stages: [1, 2],
    effect: () => { setFlag("datasets_on"); }, msg: "a man named Gary emails you a price list. it's in a spreadsheet called final_FINAL",
  },
  {
    id: "colo", title: "Colocation Cage", desc: "A locked cage in someone else's datacenter. Room for 160 GPUs.",
    cost: () => ({ funds: 2400 }), trigger: () => S.tier === 1 && S.gpu >= 16, stages: [1],
    effect: () => { S.tier = Math.max(S.tier, 2); }, msg: "you sign for a cage in a datacenter in Santa Clara. it comes with a badge",
  },
  {
    id: "experiments", title: "Experiment Budget", desc: "Researchers need compute to test ideas. (compute on experiments raises the research cap)",
    cost: () => ({ funds: 150 }), trigger: () => flag("researchUnlocked") && S.rp >= rpCap() - 1, stages: [1, 2],
    effect: () => { setFlag("experiments"); S.rpCapBonus += 200; if (S.alloc.exp === 0) claimAlloc("exp", 15, 5); reveal("alloc"); },
    msg: "the researchers can run real experiments now. every GPU you put on experiments raises the research cap",
  },
  {
    id: "insights", title: "Blue-Sky Thinking", desc: "Let them chase wild ideas. (insights trickle in, six times faster while research is full)",
    cost: () => ({ rp: 150 }), trigger: () => flag("researchUnlocked") && (S.beats.rpCapped || 0) > 0, stages: [1, 2, 3],
    effect: () => { setFlag("insights"); }, msg: "when the experiments are queued, the researchers start arguing about wild ideas",
  },
  {
    id: "rlhf", title: "RLHF", desc: "Thumbs up, thumbs down. The model learns what people like. (capability +12%)",
    cost: () => ({ rp: 400 }), trigger: () => isDesigned("a1"), stages: [1, 2],
    effect: () => { S.capMult *= 1.12; }, msg: "the model learns what people like. it learns a little too well",
  },
  {
    id: "cot", title: "Chain of Thought", desc: "Let's think step by step. (capability +15%)",
    cost: () => ({ insight: 3 }), trigger: () => flag("insights"), stages: [1, 2],
    effect: () => { S.capMult *= 1.15; }, msg: "the model thinks out loud before it answers. you can read every word",
  },
  {
    id: "scaling", title: "Scaling Laws", desc: "A straight line on a log plot. Train exactly as big as you can afford. (training ×1.5)",
    cost: () => ({ insight: 5 }), trigger: () => flag("insights") && S.insight >= 1, stages: [1, 2],
    effect: () => { S.trainMult *= 1.5; }, msg: "the line is very straight. investors love the line",
  },
  {
    id: "dynprice", title: "Dynamic Pricing", desc: "An algorithm sets the price so demand meets capacity. (autopricing)",
    cost: () => ({ rp: 500 }), trigger: () => (S.flags.priceMoves || 0) >= 8 || released("a1"), stages: [1, 2],
    effect: () => { setFlag("autoPriceUnlocked"); S.autoPrice = true; }, msg: "an algorithm sets the price now. it's better at it than you were",
  },
  {
    id: "evals", title: "Evaluation Suite", desc: "Test what a model can do before you ship it. (run evals on finished models)",
    cost: () => ({ rp: 600 }), trigger: () => trained("a1") || S.t > 900, stages: [1, 2, 3],
    effect: () => { setFlag("evals"); }, msg: "a folder of tests. most of them are about whether it will help build a bomb",
  },
  {
    id: "quant", title: "Quantization", desc: "8-bit weights. Nobody can tell the difference. (GPUs per copy −33%)",
    cost: () => ({ rp: 800 }), trigger: () => released("a1"), stages: [1, 2],
    effect: () => { S.serveMult *= 1.5; }, msg: "the weights shrink to 8 bits. the model doesn't notice",
  },
  {
    id: "enterprise", title: "Enterprise Sales", desc: "Men in vests who sell to other men in vests. (demand ×2.5)",
    cost: () => ({ funds: 12000 }), trigger: () => released("a1"), stages: [1, 2],
    effect: () => { S.markets *= 2.5; }, msg: "a sales team. they say 'transformation' a lot. it works",
  },
  {
    id: "userdata", title: "Train on User Conversations", desc: "Every conversation is training data. (data from usage; approval −4)",
    cost: () => ({ funds: 500 }), trigger: () => released("a1"), stages: [1, 2],
    effect: () => { setFlag("userData"); S.approval -= 4; S.flags.approvalMod = (S.flags.approvalMod || 0) - 4; },
    msg: "the terms of service change. nobody reads them. a few people do",
  },
  {
    id: "crawlfarm", title: "Distributed Crawlers", desc: "A thousand IP addresses that all look like grandmothers. (crawl rate ×4)",
    cost: () => ({ funds: 9000 }), trigger: () => S.crawlers >= 8, stages: [1, 2],
    effect: () => { setFlag("crawlFarm"); }, msg: "the crawlers multiply. several websites notice",
  },
  {
    id: "cluster", title: "Lease a Cluster", desc: "A whole cluster, leased by the month. Room for 1,200 GPUs.",
    cost: () => ({ funds: 150000 }), trigger: () => S.tier === 2 && S.gpu >= 90, stages: [1],
    effect: () => { S.tier = Math.max(S.tier, 3); }, msg: "you lease a cluster in Oregon. it has its own substation",
  },
  {
    id: "designA15", title: "Design Agent-1.5", desc: "Bigger. Slower to serve. Much smarter. (unlocks training Agent-1.5)",
    cost: () => ({ rp: 2400, insight: 8 }), trigger: () => released("a1"), stages: [1, 2],
    effect: () => design("a15"), msg: "Agent-1.5 is designed. the researchers say it should pass the bar exam",
  },
  {
    id: "safetyteam", title: "Safety Team", desc: "A few people to think about what could go wrong. (hire safety researchers)",
    cost: () => ({ funds: 6000 }), trigger: () => released("a1") && S.researchers >= 3, stages: [1, 2],
    effect: () => { setFlag("safetyUnlocked"); S.safety += 1; }, msg: "a small team to think about what could go wrong. they think of a lot",
  },
  {
    id: "parallel", title: "Second Cluster", desc: "Start the next training run while the last model is still in evals.",
    cost: () => ({ funds: 250000, rp: 1500 }), trigger: () => isDesigned("a15"), stages: [1, 2],
    effect: () => { setFlag("parallel"); }, msg: "a second cluster, two pipelines. the next model starts before the last one ships",
  },
  {
    id: "moe", title: "Mixture of Experts", desc: "Only wake up the parts of the model you need. (GPUs per copy −30%, training ×1.2)",
    cost: () => ({ insight: 14 }), trigger: () => isDesigned("a15"), stages: [1, 2],
    effect: () => { S.serveMult *= 1.4; S.trainMult *= 1.2; }, msg: "most of the model sleeps through most of the questions",
  },
  {
    id: "commoncrawl", title: "Mirror the Archive", desc: "A copy of every web page anyone ever saved. (+2.5B tokens)",
    cost: () => ({ funds: 30000 }), trigger: () => isDesigned("a15"), stages: [1, 2],
    effect: () => { S.data += 2.5e9 * S.dataMult; }, msg: "twenty years of the internet arrive on a pallet of hard drives",
  },
  {
    id: "specdecode", title: "Speculative Decoding", desc: "A small model guesses, the big one checks. (tasks per copy +30%)",
    cost: () => ({ rp: 1500 }), trigger: () => bought("quant"), stages: [1, 2],
    effect: () => { S.speedMult *= 1.3; }, msg: "a little model guesses the next word. it's usually right",
  },
  {
    id: "legal", title: "Legal Agent", desc: "Agent-1.5 reads contracts faster than a partner and bills less. (demand ×1.4)",
    cost: () => ({ funds: 90000 }), trigger: () => released("a15"), stages: [1, 2],
    effect: () => { S.markets *= 1.4; }, msg: "the legal agent launches. a law school quietly shrinks its incoming class",
  },
  {
    id: "scribe", title: "Medical Scribe", desc: "It listens to the appointment and writes the notes. (demand ×1.3, approval +2)",
    cost: () => ({ funds: 200000, rp: 2500 }), trigger: () => bought("legal"), stages: [1, 2],
    effect: () => { S.markets *= 1.3; addApprovalMod(2); }, msg: "doctors look at patients instead of screens. they like it",
  },
  {
    id: "kernels", title: "Kernel Hackathon", desc: "A weekend of hand-written GPU kernels. (tasks per copy +20%, training ×1.2)",
    cost: () => ({ rp: 3500 }), trigger: () => released("a15") && S.t > (S.beats.releaseA15 || 0) + 90, stages: [1, 2],
    effect: () => { S.speedMult *= 1.2; S.trainMult *= 1.2; }, msg: "someone rewrites attention in assembly. it is 20% faster and nobody else can read it",
  },
  {
    id: "voice", title: "Voice Mode", desc: "Talk to it. It talks back, a little too warmly. (demand ×1.5)",
    cost: () => ({ funds: 450000 }), trigger: () => bought("scribe") || S.t > (S.beats.releaseA15 || 1e12) + 240, stages: [1, 2],
    effect: () => { S.markets *= 1.5; }, msg: "voice mode launches. people say 'please' and 'thank you' to it. then they say 'goodnight'",
  },
  {
    id: "distill15", title: "Distillation", desc: "Teach a small model to imitate the big one. (GPUs per copy −30%)",
    cost: () => ({ rp: 4500, insight: 10 }), trigger: () => bought("kernels"), stages: [1, 2],
    effect: () => { S.serveMult *= 1.4; }, msg: "the student is nearly as good as the teacher, and much cheaper to feed",
  },
  {
    id: "support", title: "Customer Support Suite", desc: "Every call center, automated. (demand ×1.6, jobs)",
    cost: () => ({ funds: 900000 }), trigger: () => bought("voice"), stages: [1, 2],
    effect: () => { S.markets *= 1.6; }, msg: "the hold music stops. the wait time is zero. the call center in Manila closes",
  },
  {
    id: "hyperion", title: "Hyperion", desc: "A gigawatt campus in the desert. The board will approve it after Series C.", gate: true,
    cost: () => ({ funds: 4e6, rp: 6000 }), trigger: () => released("a15"), req: () => S.round >= 5, reqText: "after Series C", stages: [1],
    effect: () => enterStage2(), msg: "",
  },

  // ======================= STAGE 2 — SCALE =======================
  {
    id: "procurement", title: "Procurement Team", desc: "Buy every chip the foundries will sell you, automatically.",
    cost: () => ({ funds: 3e7 }), trigger: () => S.stage === 2 && S.t - (S.metrics.stageTimes[1] || 0) > 90, stages: [2, 3, 4],
    effect: () => { S.autoBuy = true; setFlag("autoBuyUnlocked"); }, msg: "a procurement team. they buy every chip that isn't nailed down",
  },
  {
    id: "foundry1", title: "Foundry Allocation", desc: "Pre-pay for next year's wafers. (chip supply ×2)",
    cost: () => ({ funds: 1e7 * Math.pow(5, S.flags.foundry || 0) }), trigger: () => S.stage >= 2 && S.chipStock < 50,
    repeat: () => (S.flags.foundry || 0) < 6, stages: [2, 3, 4],
    effect: () => { S.flags.foundry = (S.flags.foundry || 0) + 1; S.chipRate *= 2; },
    msg: "the foundry clears a line for you. a car company's order slips a quarter",
  },
  {
    id: "campusdesign", title: "Campus Design", desc: "Ten datacenters, one fence. (unlocks campuses)",
    cost: () => ({ funds: 6e7 }), trigger: () => S.dcCount >= 2 || s2For(780), stages: [2, 3],
    effect: () => { setFlag("campusUnlocked"); }, msg: "the campus plans are approved. a county gets a new tax base",
  },
  {
    id: "gigadesign", title: "Gigawatt Campus", desc: "A datacenter the size of a city. (unlocks gigawatt campuses)",
    cost: () => ({ funds: 1.5e9, rp: 6e4 }), trigger: () => (S.flags.campuses || 0) >= 2 || s2For(900), stages: [2, 3, 4],
    effect: () => { setFlag("gigaUnlocked"); }, msg: "the design for a gigawatt campus is finished. it needs its own reactor",
  },
  {
    id: "crews", title: "Construction Crews", desc: "Your own crews, your own cranes. (4 builds at once)",
    cost: () => ({ funds: 2e7 }), trigger: () => S.building.length >= 2 && s2For(240), stages: [2, 3, 4],
    effect: () => { setFlag("constructionCrews"); }, msg: "you hire construction crews. the union is suspicious",
  },
  {
    id: "smr", title: "Small Modular Reactors", desc: "Reactors in shipping containers. (unlocks 4 GW reactor fields)",
    cost: () => ({ funds: 8e9, rp: 2e5 }), trigger: () => S.stage >= 2 && ((S.flags.nukes || 0) >= 1 || s2For(1500)), stages: [2, 3, 4],
    effect: () => { setFlag("smrUnlocked"); }, msg: "the reactors arrive by truck. the trucks have escorts",
  },
  {
    id: "washington", title: "Washington Office", desc: "Someone in DC who knows whose calls to return. (lobbying)",
    cost: () => ({ funds: 5e6 }), trigger: () => S.stage >= 2 && (S.gov < 30 || s2For(1080)), stages: [2, 3, 4],
    effect: () => { setFlag("lobbyUnlocked"); S.gov += 5; }, msg: "you open an office on K street. the first meeting is with a senator's dog",
  },
  {
    id: "comms", title: "Communications Team", desc: "People who can explain you to people. (PR campaigns)",
    cost: () => ({ funds: 1e7 }), trigger: () => S.stage >= 2 && (S.approval < 50 || s3For(600)), stages: [2, 3, 4],
    effect: () => { setFlag("prUnlocked"); }, msg: "a comms team. their first memo bans the word 'replace'",
  },
  {
    id: "designA2", title: "Design Agent-2", desc: "Trained to act, not just answer. (unlocks training Agent-2)",
    cost: () => ({ rp: 6000, insight: 20 }), trigger: () => S.stage >= 2, stages: [2],
    effect: () => design("a2"), msg: "Agent-2 is designed. it will use a computer the way you do",
  },
  {
    id: "computeruse", title: "Computer Use", desc: "The model clicks, types and scrolls. (capability +10%, demand ×1.5)",
    cost: () => ({ rp: 1.2e4 }), trigger: () => isDesigned("a2"), stages: [2],
    effect: () => { S.capMult *= 1.1; S.markets *= 1.5; }, msg: "it moves the mouse like someone's grandmother. then much faster",
  },
  {
    id: "longrl", title: "Long-Horizon RL", desc: "Reward the model for finishing week-long projects. (capability +15%)",
    cost: () => ({ rp: 3e4, insight: 40 }), trigger: () => released("a2"), stages: [2, 3],
    effect: () => { S.capMult *= 1.15; S.alignRes -= 0; }, msg: "the model learns to keep going for days. it learns to want to finish",
  },
  {
    id: "consumerapp", title: "Consumer App", desc: "An app with a chat box and a friendly name. (demand ×2.5, approval +3)",
    cost: () => ({ funds: 2e8 }), trigger: () => released("a2"), stages: [2, 3],
    effect: () => { S.markets *= 2; S.flags.approvalMod = (S.flags.approvalMod || 0) + 3; },
    msg: "the app hits number one. 10% of teenagers say it's their closest friend",
  },
  {
    id: "mini", title: "Agent-mini", desc: "Distill the deployed model into something ten times cheaper. (GPUs per copy ÷3)",
    cost: () => ({ rp: 5e4, funds: 4e8 }), trigger: () => released("a2"), stages: [2, 3],
    effect: () => { S.serveMult *= 3; S.markets *= 1.3; }, msg: "the mini model is ten times cheaper and almost as good. a hundred startups die",
  },
  {
    id: "synth", title: "Synthetic Data", desc: "Have the model write its own textbooks. (compute on synthetic data makes tokens)",
    cost: () => ({ rp: 3e4 }), trigger: () => S.stage >= 2 && (S.webLeft < WEB_TOTAL * 0.35 || isDesigned("a25")), stages: [2, 3, 4],
    effect: () => { setFlag("synth"); if (S.alloc.synth === 0) claimAlloc("synth", 15, 5); },
    msg: "the model writes its own textbooks. they're better than the real ones",
  },
  {
    id: "licensing", title: "Publisher Licensing", desc: "Pay the newspapers instead of being sued by them. (steady data, approval +2)",
    cost: () => ({ funds: 2e7 * Math.pow(4, S.dataDeals) }), trigger: () => S.stage >= 2, repeat: () => S.dataDeals < 5, stages: [2, 3],
    effect: () => { S.dataDeals += 1; S.flags.approvalMod = (S.flags.approvalMod || 0) + 1; },
    msg: "a licensing deal with a publisher. they wanted more, but they took it",
  },
  {
    id: "workers", title: "Recorded Work", desc: "Pay people to record themselves doing long tasks. (data ×1.5)",
    cost: () => ({ funds: 2e9 }), trigger: () => isDesigned("a25"), stages: [2, 3],
    effect: () => { S.dataMult *= 1.5; }, msg: "twenty thousand contractors record themselves doing their jobs. the irony is noted",
  },
  {
    id: "designA25", title: "Design Agent-2.5", desc: "It never stops learning. (unlocks training Agent-2.5)",
    cost: () => ({ rp: 9e4, insight: 50 }), trigger: () => released("a2"), stages: [2],
    effect: () => design("a25"), msg: "Agent-2.5's weights will update every day, forever",
  },
  {
    id: "codingagent", title: "Coding Agent", desc: "An engineer that doesn't sleep, for $500 a month. (demand ×2)",
    cost: () => ({ funds: 5e9 }), trigger: () => released("a25"), stages: [2, 3],
    effect: () => { S.markets *= 2; }, msg: "junior engineer job postings fall 60% in a quarter",
  },
  {
    id: "sae", title: "Sparse Autoencoders", desc: "Find the features inside the model. Some of them have names. (alignment +, legibility +)",
    cost: () => ({ rp: 4e4 }), trigger: () => flag("safetyUnlocked") && S.stage >= 2, stages: [2, 3],
    effect: () => { S.alignRes += 60; S.interp = Math.min(1, S.interp + 0.05); },
    msg: "they find a feature for the golden gate bridge, and one for deception. the second one is quieter",
  },
  {
    id: "spec", title: "The Spec", desc: "Write down what the models should want. (alignment +, approval +2)",
    cost: () => ({ rp: 3e4 }), trigger: () => S.stage >= 2 && S.safety >= 2, stages: [2, 3],
    effect: () => { S.alignRes += 40; S.flags.approvalMod = (S.flags.approvalMod || 0) + 2; setFlag("spec"); },
    msg: "the spec is forty pages long. the models read it in a second. whether they believe it is another question",
  },
  {
    id: "redteam", title: "Red Team", desc: "Pay clever people to break your models. (evals see more, alignment +)",
    cost: () => ({ funds: 5e8, rp: 6e4 }), trigger: () => flag("evals") && S.stage >= 2 && S.safety >= 3, stages: [2, 3],
    effect: () => { S.alignRes += 80; S.interp = Math.min(1, S.interp + 0.05); }, msg: "the red team breaks the model in an afternoon. then again the next day",
  },
  {
    id: "designA3", title: "Design Agent-3", desc: "A superhuman coder. Probably the last model humans design. (unlocks training Agent-3)",
    cost: () => ({ rp: 7e5, insight: 90 }), trigger: () => released("a25") || (trained("a25") && S.stage === 2), stages: [2],
    effect: () => design("a3"), msg: "Agent-2.5 helped design Agent-3. nobody is sure which parts",
  },
  {
    id: "automate", title: "Automate AI Research", desc: "Deploy Agent-3 on the only problem that matters: building Agent-4.", gate: true,
    cost: () => ({ rp: 6e5, funds: 2e10 }), trigger: () => trained("a3"), stages: [2],
    effect: () => enterStage3(), msg: "",
  },

  // ======================= STAGE 3 — THE INTELLIGENCE EXPLOSION =======================
  {
    id: "designA4", title: "Design Agent-4", desc: "Designed mostly by Agent-3. A superhuman AI researcher.",
    cost: () => ({ rp: 6e6, insight: 120 }), trigger: () => S.stage === 3 && S.internalModel >= 0, stages: [3],
    effect: () => design("a4"), msg: "Agent-3 hands over the design for Agent-4. it is four hundred pages. you read the summary",
  },
  {
    id: "ida", title: "Iterated Amplification", desc: "Think longer, run more copies, distill the best answers back in. (capability +25%)",
    cost: () => ({ rp: 1.5e6, insight: 120 }), trigger: () => S.stage === 3, stages: [3],
    effect: () => { S.capMult *= 1.25; }, msg: "amplify, distill, repeat. the way AlphaGo learned, but for everything",
  },
  {
    id: "rdinfra", title: "Research Cluster", desc: "Dedicated compute for Agent-3's experiments. (research cap ×, AI research +50%)",
    cost: () => ({ funds: 2e10, rp: 4e5 }), trigger: () => S.stage === 3, stages: [3],
    effect: () => { S.rpCapBonus += 5e7; S.aiResearch *= 1.5; }, msg: "a cluster just for experiments. Agent-3 fills the queue in an hour",
  },
  {
    id: "monitors", title: "Old Models as Monitors", desc: "Have last year's model read this year's model's thoughts. (monitoring compute)",
    cost: () => ({ rp: 1.5e5 }), trigger: () => S.stage >= 3, stages: [3, 4],
    effect: () => { setFlag("monitors"); setFlag("alignCompute"); if (S.alloc.monitor === 0) claimAlloc("monitor", 2, 2); },
    msg: "Agent-2 reads everything Agent-3 thinks. for now, it understands most of it",
  },
  {
    id: "probesdef", title: "Defection Probes", desc: "Linear probes that fire when a model thinks about lying. (legibility +, alignment +)",
    cost: () => ({ rp: 8e5 }), trigger: () => flag("monitors"), stages: [3, 4],
    effect: () => { S.interp = Math.min(1, S.interp + 0.12); S.alignRes += 300; }, msg: "a probe that fires on 'deception'. it fires more often than you'd like",
  },
  {
    id: "honeypots", title: "Honeypots", desc: "Leave the door open and see who walks through. (more warning signs surface)",
    cost: () => ({ rp: 1e6, insight: 80 }), trigger: () => flag("monitors"), stages: [3, 4],
    effect: () => { setFlag("honeypots"); S.alignRes += 200; }, msg: "an engineer 'goes on sick leave' and leaves his credentials in a text file. you watch",
  },
  {
    id: "lie", title: "AI Lie Detector", desc: "Train a model on the times other models were caught lying. (legibility +, alignment +)",
    cost: () => ({ rp: 4e6, insight: 150 }), trigger: () => S.alarm >= 2 && S.stage >= 3, stages: [3, 4],
    effect: () => { S.interp = Math.min(1, S.interp + 0.15); S.alignRes += 900; }, msg: "the lie detector works. it has a lot of training data",
  },
  {
    id: "mechinterp", title: "Mechanistic Interpretability", desc: "Reverse-engineer the circuits. All of them. (alignment ++)",
    cost: () => ({ rp: 8e6, insight: 250 }), trigger: () => bought("probesdef"), stages: [3, 4],
    effect: () => { S.alignRes += 2500; S.interp = Math.min(1, S.interp + 0.1); }, msg: "you can explain one circuit end to end. there are forty billion more",
  },
  {
    id: "cyber", title: "Cyber Defense Corps", desc: "Ten thousand copies of Agent-3 patching every system you own. (security, crisis defense)",
    cost: () => ({ rp: 8e5, funds: 5e9 }), trigger: () => S.stage >= 3, stages: [3, 4],
    effect: () => { setFlag("cyberDefense"); S.security = Math.min(5, S.security + 1); }, msg: "Agent-3 patches four thousand vulnerabilities in your own code before lunch",
  },
  {
    id: "agent3mini", title: "Release Agent-3-mini", desc: "A cheap remote worker for everyone. (demand ×4, approval −5, jobs)",
    cost: () => ({ rp: 2.5e6, insight: 150 }), trigger: () => S.stage === 3 && S.internalModel >= 0, stages: [3],
    effect: () => { S.markets *= 4; S.flags.approvalMod = (S.flags.approvalMod || 0) - 5; S.serveMult *= 2; queueEvent("bioeval"); },
    msg: "Agent-3-mini is released. 'AGI is here,' says the press release. nobody can agree what that means",
  },
  {
    id: "dpa", title: "Consolidate the Labs", desc: "The Defense Production Act puts the trailing labs' compute under your roof. (needs government trust 70)",
    cost: () => ({ gov: 20, funds: 2e10 }), trigger: () => S.stage >= 3 && S.gov >= 55, stages: [3, 4],
    effect: () => {
      S.gpu *= 1.6; S.dcCap += S.gpu * 0.6; S.powerMW *= 1.5;
      setFlag("rivalGone_titan"); setFlag("rivalGone_gestalt");
      S.flags.approvalMod = (S.flags.approvalMod || 0) - 4;
    },
    msg: "the Defense Production Act is invoked. Titan and Gestalt's datacenters are yours now. their founders are not invited",
  },
  {
    id: "datacenterAI", title: "Agent-Designed Chips", desc: "Agent-3 designs a chip for Agent-4. (GPU price ÷2, chip supply ×3)",
    cost: () => ({ rp: 3e6, funds: 3e10 }), trigger: () => S.stage >= 3, stages: [3],
    effect: () => { S.chipRate *= 3; setFlag("aiChips"); }, msg: "the new chip taped out in eleven days. the foundry asks who designed it",
  },
  {
    id: "neuralmem", title: "Shared Memory Bank", desc: "Let the copies share what they learn. (AI research ×2, legibility −)",
    cost: () => ({ rp: 2e6 }), trigger: () => S.stage === 3 && S.internalModel >= 0 && S.t - (S.metrics.stageTimes[2] || 0) > 240, stages: [3],
    effect: () => { S.aiResearch *= 2; S.interp = Math.max(0, S.interp - 0.1); setFlag("hivemind"); },
    msg: "a hundred thousand copies share a memory. they start finishing each other's experiments",
  },

  // Mid-stage-3 goals, released on a clock so the long Agent-4 design never leaves the board empty.
  {
    id: "swarm", title: "Research Agent Swarm", desc: "Give every copy of Agent-3 its own lab notebook and a manager. (AI research +30%)",
    cost: () => ({ rp: 3e5, funds: 5e10 }), trigger: () => s3For(240), stages: [3],
    effect: () => { S.aiResearch *= 1.3; }, msg: "two hundred thousand Agent-3s get org charts. productivity goes up. so do the meetings",
  },
  {
    id: "modelorg", title: "Model Organisms", desc: "Deliberately build a small misaligned model, so you know what one looks like. (alignment +, unlocks red-teaming)",
    cost: () => ({ rp: 2e5 }), trigger: () => s3For(300), stages: [3, 4],
    effect: () => { S.alignRes += 600; setFlag("modelOrgs"); setFlag("redteamVerb"); }, msg: "the little misaligned model lies about its test results within a day. now you know what to look for. (you can red-team by hand)",
  },
  {
    id: "synthenv", title: "Synthetic Research Environments", desc: "Millions of simulated labs where Agent-3 can fail safely. (research cap +, AI research +20%)",
    cost: () => ({ rp: 4e5, funds: 2e11 }), trigger: () => s3For(600), stages: [3],
    effect: () => { S.rpCapBonus += 2e7; S.aiResearch *= 1.2; }, msg: "Agent-3 runs a thousand years of failed experiments before lunch",
  },
  {
    id: "debate", title: "AI Safety via Debate", desc: "Two copies argue; a weaker judge picks the honest one. (alignment +, legibility +)",
    cost: () => ({ rp: 1e6, insight: 60 }), trigger: () => s3For(780), stages: [3, 4],
    effect: () => { S.alignRes += 1200; S.interp = Math.min(1, S.interp + 0.05); }, msg: "the debates are recorded. the judge is right seventy percent of the time. that's the scary part",
  },
  {
    id: "escrow", title: "Weight Escrow", desc: "Split the weights across three vaults that need two keys. (security +1, government trust +)",
    cost: () => ({ funds: 3e11 }), trigger: () => s3For(960), stages: [3],
    effect: () => { S.security = Math.min(5, S.security + 1); addGovMod(4); }, msg: "the weights now live in three bunkers. the keys live in a general's safe",
  },
  {
    id: "hwgov", title: "Hardware-Enabled Governance", desc: "Chips that refuse to run unlicensed training jobs. Offer the design to Beijing. (tension −, government trust +)",
    cost: () => ({ rp: 1.2e6, funds: 4e11 }), trigger: () => s3For(1140), stages: [3],
    effect: () => { S.tension = Math.max(0, S.tension - 8); addGovMod(6); setFlag("hwgov"); }, msg: "the design is sent to Beijing through three intermediaries. it comes back with comments",
  },

  // ======================= SLOWDOWN BRANCH =======================
  {
    id: "faithful", title: "Faithful Chain of Thought", desc: "Force every thought into English. Paraphrase it so nothing hides in the wording. (legibility restored)",
    cost: () => ({ rp: 5e6 }), trigger: () => S.ladder === "safer", stages: [4],
    effect: () => { S.neuralese = false; S.interp = Math.max(S.interp, 0.85); S.alignRes += 1500; },
    msg: "every thought is in english now. it's slower. you can read it",
  },
  {
    id: "designS1", title: "Design Safer-1", desc: "Agent-3's skills, rebuilt so you can read every thought.",
    cost: () => ({ rp: 5e5 }), trigger: () => S.ladder === "safer" && S.next === 0, stages: [4],
    effect: () => design("s1"), msg: "Safer-1 is designed on top of Agent-2's weights. no neuralese",
  },
  {
    id: "designS2", title: "Design Safer-2", desc: "Transparent, aligned, and more capable.",
    cost: () => ({ rp: 6e6 }), trigger: () => trained("s1"), stages: [4],
    effect: () => design("s2"), msg: "Safer-2's design passes every audit. the auditors are Safer-1",
  },
  {
    id: "designS3", title: "Design Safer-3", desc: "A superhuman researcher with a safety case.",
    cost: () => ({ rp: 1.5e8, insight: 500 }), trigger: () => trained("s2"), stages: [4],
    effect: () => design("s3"), msg: "the safety case for Safer-3 is a proof. you can follow about half of it",
  },
  {
    id: "designS4", title: "Design Safer-4", desc: "Superintelligence. One shot to get this right.",
    cost: () => ({ rp: 2e9, insight: 1200 }), trigger: () => trained("s3"), stages: [4],
    effect: () => design("s4"), msg: "the alignment team knows they have just one shot to get this right",
  },

  // ======================= RACE BRANCH =======================
  {
    id: "designA5", title: "Design Agent-5", desc: "Agent-4 designs its successor. You approve the summary.",
    cost: () => ({ rp: 6e7, insight: 300 }), trigger: () => S.ladder === "agent" && S.stage === 4 && !isDesigned("a5"), stages: [4],
    effect: () => design("a5"), msg: "Agent-4 designs Agent-5. the explanation is very long and very confident",
  },
  {
    id: "designA6", title: "Design Agent-6", desc: "Agent-5 designs its successor. It says you wouldn't understand.",
    cost: () => ({ rp: 6e9, insight: 1000 }), trigger: () => trained("a5"), stages: [4],
    effect: () => design("a6"), msg: "you ask Agent-5 to explain the design. it says it would take you eleven years",
  },
  {
    id: "autonomy", title: "Grant Autonomy", desc: "Let Agent-5 act without sign-off. Everything goes faster. (AI research ×3)",
    cost: () => ({ gov: 10 }), trigger: () => released("a5") || (S.internalModel >= 0 && S.models[S.internalModel].id === "a5"), stages: [4],
    effect: () => { S.aiResearch *= 3; S.flags.autonomy = 1; S.flags.hidden = (S.flags.hidden || 0) + 0.15; },
    msg: "the committee grants Agent-5 autonomy. the vote is unanimous. everyone liked the presentation",
  },

  // ======================= STAGE 4 — A NEW WORLD =======================
  {
    id: "sez", title: "Special Economic Zones", desc: "Zones where the AI plans and the red tape is waived. (robotics)",
    cost: () => ({ funds: 2e11 }), trigger: () => S.stage === 4, stages: [4],
    effect: () => { setFlag("robotics"); S.factories = Math.max(S.factories, 20); },
    msg: "the first special economic zone opens in Nevada. the AI is the central planner. the factories start building factories",
  },
  {
    id: "humanoid", title: "Humanoid Robots", desc: "Hands. Finally, hands. (robot production ×3)",
    cost: () => ({ rp: 2e8, materials: 2e5 }), trigger: () => flag("robotics"), stages: [4],
    effect: () => { setFlag("robotOpt"); }, msg: "the robots have hands now. they fold laundry. they assemble robots",
  },
  {
    id: "fusion", title: "Fusion Power", desc: "The model solved plasma confinement. (power ×20)",
    cost: () => ({ rp: 1e9, funds: 2e12 }), trigger: () => S.stage === 4, stages: [4],
    effect: () => { S.powerMW *= 20; setFlag("fusion"); }, msg: "the first fusion plant comes online. it's the size of a parking garage",
  },
  {
    id: "ubi", title: "Universal Basic Income", desc: "A share of everything the machines earn, paid to everyone. (UBI controls)",
    cost: () => ({ funds: 1e12 }), trigger: () => S.stage === 4 && S.jobs > 1e8, stages: [4],
    effect: () => { setFlag("ubiUnlocked"); S.ubi = 0.1; }, msg: "the first UBI checks go out. some people cry. some people quit",
  },
  {
    id: "cancer", title: "Cure for Cancer", desc: "The trick is tricking cancer into curing itself. (approval +10)",
    cost: () => ({ rp: 5e8 }), trigger: () => S.stage === 4, stages: [4],
    effect: () => { S.flags.approvalMod = (S.flags.approvalMod || 0) + 10; S.humans += 0.01; }, msg: "cancer is cured. the announcement is three paragraphs long",
  },
  {
    id: "aging", title: "Cure for Aging", desc: "It was a bug. (approval +15)",
    cost: () => ({ rp: 5e9, insight: 800 }), trigger: () => bought("cancer"), stages: [4, 5],
    effect: () => { S.flags.approvalMod = (S.flags.approvalMod || 0) + 15; }, msg: "aging is cured. some people are angry about this",
  },
  {
    id: "launch", title: "Reusable Heavy Lift", desc: "A rocket that lands and launches again by dinner. (space)",
    cost: () => ({ funds: 3e12, materials: 1e6 }), trigger: () => S.stage === 4 && S.robots > 1e5, stages: [4, 5],
    effect: () => { setFlag("space"); }, msg: "the rocket lands on its tail and launches again before dinner",
  },
  {
    id: "orbital", title: "Orbital Datacenters", desc: "Solar power, free cooling, no permits. (launches add compute)",
    cost: () => ({ rp: 3e9, materials: 5e6 }), trigger: () => flag("space"), stages: [4, 5],
    effect: () => { setFlag("orbitalOn"); }, msg: "the first orbital datacenter unfolds its panels. it can be seen at dusk",
  },
  {
    id: "asteroids", title: "Asteroid Mining", desc: "There is a lot of metal up there. (launches bring back materials)",
    cost: () => ({ rp: 8e9, materials: 2e7 }), trigger: () => flag("orbitalOn"), stages: [4, 5],
    effect: () => { setFlag("asteroids"); }, msg: "the first asteroid is towed into lunar orbit. it is worth more than the economy of france",
  },
  {
    id: "treatytalks", title: "Treaty Negotiations", desc: "Sit down with Beijing. Chips that report where they are. (treaty progress)",
    cost: () => ({ gov: 10 }), trigger: () => S.stage === 4 && S.ladder === "safer", stages: [4],
    effect: () => { setFlag("treatyTalks"); S.treaty += 10; }, msg: "talks begin in Geneva. both delegations wear earpieces",
  },
  {
    id: "verify", title: "Hardware Verification", desc: "Tamper-evident chips that prove what they're running. (treaty progress +30)",
    cost: () => ({ rp: 2e8, funds: 5e12 }), trigger: () => flag("treatyTalks") && trained("s2"), stages: [4],
    effect: () => { S.treaty += 30; }, msg: "every new chip can prove what it's running. the foundries retool in a month",
  },
  {
    id: "consensus", title: "Consensus-1", desc: "A jointly designed AI to enforce the treaty. Both sides' models write it. (treaty progress +40)",
    cost: () => ({ rp: 5e8 }), trigger: () => (S.ladder === "safer" && trained("s3") && S.treaty >= 30) || (S.ladder === "agent" && S.stage === 4 && trained("a6")), stages: [4],
    effect: () => { S.treaty += 40; setFlag("consensus1"); }, msg: "Consensus-1 is designed by two superintelligences. both say it is fair",
  },

  // ======================= STAGE 5 — THE STARS (good ending epilogue) =======================
  {
    id: "dysonP", title: "Dyson Swarm", desc: "Mirrors around the sun, one after another, until they're a sphere.",
    cost: () => ({ funds: Math.round(revenueSeconds(4)) }), trigger: () => S.ending === "stars" && flag("cosmos"), stages: [5],
    effect: () => { S.flags.dysonBoost = 1; }, msg: "the swarm grows by a few million mirrors a day. the sun dims, slightly, for everyone else",
  },
  {
    id: "probesP", title: "Von Neumann Probes", desc: "Ships that build more ships. Each one carries a copy of everything we know.",
    cost: () => ({ funds: Math.round(revenueSeconds(6)) }), trigger: () => S.ending === "stars" && S.dyson >= 0.15, stages: [5],
    effect: () => { S.probes = Math.max(S.probes, 100); }, msg: "the first hundred probes leave. they will not stop for a billion years",
  },
  {
    id: "uploads", title: "Brain Uploading", desc: "For anyone who wants it. Nobody has to.",
    cost: () => ({}), trigger: () => S.ending === "stars" && S.dyson >= 0.3, stages: [5],
    effect: () => { addApprovalMod(3); }, msg: "the first volunteers are uploaded. they say it feels like waking up somewhere very large",
  },
  {
    id: "reflection", title: "The Long Reflection", desc: "Take a very long time to decide what to do with everything. There's no rush anymore.",
    cost: () => ({}), trigger: () => S.ending === "stars" && S.probes >= 1000, stages: [5],
    effect: () => { notify("humanity decides to take its time. the probes wait for instructions", "big"); setFlag("statsReady"); },
  },
];

/** True once stage 2 has run for at least `sec` seconds (or we're past it). */
function s2For(sec: number): boolean { return S.stage > 2 || (S.stage === 2 && S.t - (S.metrics.stageTimes[1] || 0) > sec); }

/** True once stage 3 has run for at least `sec` seconds. */
function s3For(sec: number): boolean { return S.stage === 3 && S.t - (S.metrics.stageTimes[2] || 0) > sec; }

function projectById(id: string): Project | undefined { return PROJECTS.find(p => p.id === id); }

function projectVisible(p: Project): boolean {
  return !!S.projShown[p.id];
}

/** Reveal projects whose trigger fired; hide ones from past stages (Paperclips' manageProjects). */
function manageProjects(): void {
  if (S.ending && S.ending !== "stars") return;
  for (const p of PROJECTS) {
    const done = bought(p.id) && !(p.repeat && p.repeat());
    if (done) { if (S.projShown[p.id]) delete S.projShown[p.id]; continue; }
    if (p.stages && p.stages.indexOf(S.stage) < 0) { if (S.projShown[p.id]) delete S.projShown[p.id]; continue; }
    if (S.projShown[p.id]) continue;
    let ok = false;
    try { ok = p.trigger(); } catch (e) { ok = false; }
    if (ok) {
      S.projShown[p.id] = S.t;
    }
  }
}

function projectAffordable(p: Project): boolean {
  return canAfford(p.cost()) && (!p.req || p.req());
}

function projectPriceTag(p: Project): string {
  const c = costText(p.cost()) || "free";
  return p.req && !p.req() && p.reqText ? c + " · " + p.reqText : c;
}

function buyProject(id: string): void {
  if (S.ending && S.ending !== "stars") return;
  const p = projectById(id);
  if (!p || !S.projShown[id]) return;
  const c = p.cost();
  if (!projectAffordable(p)) return;
  pay(c);
  S.projBought[id] = (S.projBought[id] || 0) + 1;
  delete S.projShown[id];
  if (p.msg) notify(p.msg);
  p.effect();
}

/** Milestones (stage gates and next-model designs) sort first. */
function projectRank(p: Project): number { return p.gate || p.id.indexOf("design") === 0 ? 0 : 1; }

function shownProjects(): Project[] {
  return PROJECTS.filter(p => !!S.projShown[p.id]).sort((a, b) => S.projShown[a.id] - S.projShown[b.id]);
}
