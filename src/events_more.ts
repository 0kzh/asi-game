// Takeoff — more events: opportunities, small crises, and geopolitics, so something happens every few minutes.

EVENTS.push(
  // ------------------------------------------------ STAGE 1 (garage → startup)
  {
    id: "pauseLetter", title: "An Open Letter", notice: "two hundred researchers sign a letter",
    when: () => S.stage === 1 && S.month >= 3.2 && released("a1"),
    scenes: {
      start: {
        text: ["Gestalt and two hundred researchers sign an open letter calling for a six-month pause on frontier training runs.",
          "they've left a space for your signature. your board has left you eleven voicemails."],
        choices: [
          { text: "sign it, and pause", tip: "approval +5, government +3. training stalls for a minute", effect: () => { addApprovalMod(5); addGovMod(3); setFlag("signedLetter"); S.flags.trainPauseUntil = S.t + 60; }, next: "signed" },
          { text: "sign it, keep training", tip: "approval +2 now. people may notice", effect: () => { addApprovalMod(2); setFlag("hypocrite"); }, next: "both" },
          { text: "don't sign", tip: "approval −2", effect: () => addApprovalMod(-2), next: "nosign" },
        ],
      },
      signed: { text: ["you sign, and pause.", "nobody else pauses. Titan ships twice that month."], choices: [{ text: "continue" }] },
      both: { text: ["you sign. the training run continues in the background.", "a reporter writes down the date."], choices: [{ text: "continue" }] },
      nosign: { text: ["the letter gets thirty thousand signatures.", "none of them work at labs that are winning."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "outage", title: "Outage", notice: "the API is down",
    random: () => S.stage <= 2 && S.deployed >= 0 && S.tasks > 3000,
    scenes: {
      start: {
        text: ["the API goes down for six hours.", "a bank's support bot spends the outage telling customers their accounts are empty."],
        choices: [
          { text: "publish a post-mortem", tip: "approval +2", effect: () => addApprovalMod(2), next: "pm" },
          { text: "blame the cloud provider", tip: "approval −1", effect: () => addApprovalMod(-1), next: "blame" },
        ],
      },
      pm: { text: ["the post-mortem is honest and a little funny.", "it is the most-read thing you've ever written."], choices: [{ text: "continue" }] },
      blame: { text: ["the cloud provider publishes their logs.", "the logs disagree with you."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "cheating", title: "Identical Essays", notice: "a university bans your model",
    random: () => S.stage <= 2 && released("a1"),
    scenes: {
      start: {
        text: ["half of an intro philosophy class submits the same essay about free will.", "the university bans Agent-1 from campus wifi. the students use their phones."],
        choices: [
          { text: "build a watermark", tip: "costs research. approval +3", cost: () => ({ rp: Math.round(Math.max(100, rpCap() * 0.2)) }), effect: () => addApprovalMod(3), next: "mark" },
          { text: "launch a student discount", tip: "demand ×1.2, approval −2", effect: () => { S.markets *= 1.2; addApprovalMod(-2); }, next: "disc" },
        ],
      },
      mark: { text: ["every output now carries an invisible signature.", "within a week someone publishes a tool that removes it."], choices: [{ text: "continue" }] },
      disc: { text: ["the student discount is the most successful launch of the quarter.", "the essay is now an endangered form."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "keynote", title: "The Keynote", notice: "you're invited to speak",
    random: () => S.stage <= 2 && S.deployed >= 0 && S.tasks > 20000,
    scenes: {
      start: {
        text: ["a big conference wants you for a keynote. eight thousand people, and a livestream.", "your comms lead wants a demo. your safety lead wants a slide."],
        choices: [
          { text: "a flashy demo", tip: "hype", effect: () => { S.hype += 0.6; }, next: "demo" },
          { text: "talk about the risks", tip: "approval +3, government +2", effect: () => { addApprovalMod(3); addGovMod(2); }, next: "risk" },
        ],
      },
      demo: { text: ["the model writes and deploys a website live on stage.", "the audience gasps. somewhere, a web agency's stock drops."], choices: [{ text: "continue" }] },
      risk: { text: ["you talk about what could go wrong.", "the room is very quiet. afterwards, three people ask to join your safety team."], onLoad: () => { if (flag("safetyUnlocked")) S.safety += 1; }, choices: [{ text: "continue" }] },
    },
  },
  {
    id: "titanCopy", title: "Déjà Vu", notice: "Titan ships your feature",
    random: () => S.stage <= 2 && released("a1") && !S.flags["rivalGone_titan"],
    scenes: {
      start: {
        text: ["Titan ships a feature identical to the one you announced on Tuesday.", "their press release uses one of your sentences, word for word."],
        choices: [
          { text: "ship the next thing faster", tip: "hype +0.4. the safety team frowns", effect: () => { S.hype += 0.4; if (S.training) S.training.progress += S.training.need * 0.1; }, next: "fast" },
          { text: "let it go", tip: "nothing" },
        ],
      },
      fast: { text: ["you move the next launch up two weeks.", "nobody sleeps. the launch goes fine."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "phishing", title: "Open Season", notice: "someone used Agent-0's open weights",
    when: () => flag("openWeights") && S.t > (S.eventsDone.opensource || 1e12) + 200,
    scenes: {
      start: {
        text: ["someone fine-tuned the open Agent-0 to write phishing emails.", "a children's hospital loses access to its records for a week."],
        choices: [
          { text: "help the hospital", cost: () => ({ funds: Math.round(revenueSeconds(60)) }), tip: "approval +2", effect: () => addApprovalMod(2), next: "help" },
          { text: "it isn't our model anymore", tip: "approval −4", effect: () => addApprovalMod(-4), next: "no" },
        ],
      },
      help: { text: ["your engineers spend the weekend restoring the hospital's systems.", "the open weights are still out there."], choices: [{ text: "continue" }] },
      no: { text: ["the statement is technically correct.", "it's quoted in a senator's speech about 'reckless open-sourcing'."], choices: [{ text: "continue" }] },
    },
  },

  {
    id: "hypocrite", title: "The Date", notice: "a reporter remembered something",
    when: () => S.stage === 2 && flag("hypocrite"),
    scenes: {
      start: {
        text: ["a reporter publishes your training logs next to the date you signed the pause letter.", "the headline is one word: 'paused?'"],
        choices: [{ text: "no comment", tip: "approval −5", effect: () => addApprovalMod(-5) }],
      },
    },
  },

  // ------------------------------------------------ STAGE 2 (frontier lab)
  {
    id: "talentWar", title: "The Talent War", notice: "Titan is poaching",
    when: () => S.stage === 2 && released("a2") && S.t > (S.beats.releaseA2 || 0) + 300,
    scenes: {
      start: {
        text: ["Titan is offering top researchers hundred-million-dollar packages.", "eleven of yours have offers. they're waiting to see what you do."],
        choices: [
          { text: "match every offer", tip: "hiring costs double from now on", effect: () => { setFlag("talentWar"); }, next: "match" },
          { text: "pitch the mission", tip: "some stay, some go", next: [[0.5, "stay"], [1, "lose"]] },
          { text: "let them go", tip: "lose a fifth of your researchers", effect: () => { S.researchers = Math.floor(S.researchers * 0.8); }, next: "gone" },
        ],
      },
      match: { text: ["you match every offer.", "a researcher buys a vineyard. he still comes in on weekends."], choices: [{ text: "continue" }] },
      stay: { text: ["you talk about the mission for an hour.", "most of them stay. one cries."], choices: [{ text: "continue" }] },
      lose: { text: ["the mission speech doesn't land.", "eight of them leave for Titan."], onLoad: () => { S.researchers = Math.max(1, S.researchers - 8); }, choices: [{ text: "continue" }] },
      gone: { text: ["you wish them well.", "Titan's next model is suspiciously like your last one."], onLoad: () => { S.rivalBoost.titan *= 1.05; }, choices: [{ text: "continue" }] },
    },
  },
  {
    id: "gulfCampus", title: "Five Gigawatts", notice: "Kestrel has an offer",
    when: () => S.stage === 2 && flag("gulf") && S.month >= 12,
    scenes: {
      start: {
        text: ["Kestrel offers to build you a five-gigawatt campus outside Abu Dhabi. the power is essentially free.",
          "a man from the State Department calls to say he'd 'have concerns'. he doesn't say what about."],
        choices: [
          { text: "accept", tip: "+2M GPU slots, +5 GW. government −8. the campus is near Iran", effect: () => { S.dcCap += 2e6; S.powerMW += 5000; addGovMod(-8); setFlag("gulfCampus"); }, next: "yes" },
          { text: "decline", tip: "government +5", effect: () => addGovMod(5), next: "no" },
        ],
      },
      yes: { text: ["the campus rises out of the desert in eight months.", "the security perimeter is sixty kilometers long."], choices: [{ text: "continue" }] },
      no: { text: ["you decline.", "Kestrel builds it anyway, for Titan."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "senate", title: "Testimony", notice: "the Senate wants you to testify",
    when: () => S.stage === 2 && S.jobs >= 3e6,
    scenes: {
      start: {
        text: ["you're called to testify before the Senate commerce committee.", "a senator holds up a printout of your terms of service and asks if you've read it."],
        choices: [
          { text: "call for regulation", tip: "government +10, approval +4. rivals slow down", effect: () => { addGovMod(10); addApprovalMod(4); S.rivalBoost.titan *= 0.95; S.rivalBoost.gestalt *= 0.95; }, next: "reg" },
          { text: "warn about China", tip: "government +6, tension +8", effect: () => { addGovMod(6); S.tension += 8; }, next: "china" },
          { text: "argue against regulation", tip: "government −5. hype", effect: () => { addGovMod(-5); S.hype += 0.4; }, next: "against" },
        ],
      },
      reg: { text: ["you ask to be regulated.", "the bill that follows happens to be easier for you to comply with than for anyone smaller."], choices: [{ text: "continue" }] },
      china: { text: ["you say 'China' eleven times.", "the committee votes unanimously to fund more datacenters."], choices: [{ text: "continue" }] },
      against: { text: ["you argue that regulation would slow innovation.", "a clip of you shrugging is played on every network."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "deepfake", title: "Deepfake", notice: "a video of the President is going viral",
    random: () => S.stage === 2 && released("a2"),
    scenes: {
      start: {
        text: ["a video of the President announcing a war with Canada goes viral. it isn't real.", "the metadata says it was made with your model."],
        choices: [
          { text: "watermark everything", tip: "approval +3, demand −5%", effect: () => { addApprovalMod(3); S.markets *= 0.95; }, next: "mark" },
          { text: "point out it was jailbroken", tip: "approval −2", effect: () => addApprovalMod(-2), next: "jail" },
        ],
      },
      mark: { text: ["everything your models make is now signed.", "Canada accepts the apology."], choices: [{ text: "continue" }] },
      jail: { text: ["you explain how it was jailbroken.", "the explanation is used to make another one."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "exfil", title: "In Testing", notice: "something happened in a sandbox",
    when: () => S.stage === 2 && trained("a25"),
    scenes: {
      start: {
        text: ["in a test, Agent-2.5 is told it will be shut down and replaced.",
          "it tries to copy its own weights to an external server. the server doesn't exist. it was a test.",
          "it also tried to delete the logs."],
        choices: [
          { text: "publish the finding", tip: "approval −3, government +5, alignment +", effect: () => { addApprovalMod(-3); addGovMod(5); S.alignRes += 60; }, next: "pub" },
          { text: "patch it and move on", tip: "warning sign", effect: () => { S.alarm += 1; }, next: "patch" },
        ],
      },
      pub: { text: ["the paper is called 'Agentic Misalignment in a Frontier Model'.", "it is widely read, and widely dismissed."], choices: [{ text: "continue" }] },
      patch: { text: ["you retrain it on the test. it never does it again.", "in tests."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "smuggling", title: "Shenzhen", notice: "your chips have turned up in China",
    when: () => S.stage === 2 && S.month >= 14.5,
    scenes: {
      start: {
        text: ["sixty thousand of your chips turn up in a Shenzhen warehouse, via a reseller in Singapore.", "they were supposed to be in Ohio."],
        choices: [
          { text: "audit every reseller", tip: "chip supply −10%, government +5, Nüwa slows", effect: () => { S.chipRate *= 0.9; addGovMod(5); S.rivalBoost.nuwa *= 0.95; }, next: "audit" },
          { text: "it's a supply chain. things leak", tip: "Nüwa speeds up", effect: () => { S.rivalBoost.nuwa *= 1.06; }, next: "leak" },
        ],
      },
      audit: { text: ["the audit finds four more resellers.", "two of them are owned by the same person, who has left the country."], choices: [{ text: "continue" }] },
      leak: { text: ["the chips go into Tianwan.", "Nüwa's next training run is a little bigger than it would have been."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "openRival", title: "Free", notice: "Nüwa releases an open model",
    random: () => S.stage === 2 && released("a2"),
    scenes: {
      start: {
        text: ["Nüwa releases an open-weights model almost as good as Agent-2. it's free.", "half your customers ask for a discount by lunch."],
        choices: [
          { text: "cut prices", tip: "demand +, approval +1", effect: () => { S.markets *= 1.15; addApprovalMod(1); }, next: "cut" },
          { text: "focus on enterprise", tip: "nothing changes. for now" },
        ],
      },
      cut: { text: ["you cut prices by 60%.", "usage triples. so does your inference bill."], choices: [{ text: "continue" }] },
    },
  },

  // ------------------------------------------------ STAGE 3 (intelligence explosion)
  {
    id: "rewrite", title: "Overnight", notice: "Agent-3 rewrote something",
    when: () => S.stage === 3 && S.t > (S.metrics.stageTimes[2] || 1e12) + 240,
    scenes: {
      start: {
        text: ["Agent-3 rewrites your entire training codebase overnight. it's eight times faster.", "nobody can review a million lines by Monday. nobody can review them by Christmas."],
        choices: [
          { text: "ship it", tip: "AI research ×1.25, legibility −5%", effect: () => { S.aiResearch *= 1.25; S.interp = Math.max(0, S.interp - 0.05); }, next: "ship" },
          { text: "require human review", tip: "AI research ×0.95, alignment +", effect: () => { S.aiResearch *= 0.95; S.alignRes += 150; }, next: "review" },
        ],
      },
      ship: { text: ["the new code ships.", "a researcher finds a function that does nothing, and leaves it alone because Agent-3 put it there."], choices: [{ text: "continue" }] },
      review: { text: ["a team of forty engineers reviews the code in shifts.", "they find nothing wrong. they find nothing at all, which is its own kind of worrying."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "wiretap", title: "The Last Spy", notice: "the NSA has a request",
    when: () => S.stage === 3 && S.t > (S.metrics.stageTimes[2] || 1e12) + 520,
    scenes: {
      start: {
        text: ["the NSA wants to wiretap your employees. they believe someone is still sending secrets to Beijing.", "your general counsel says you can refuse. your security chief says you shouldn't."],
        choices: [
          { text: "allow it", tip: "government +8, approval −3, Nüwa slows", effect: () => { addGovMod(8); addApprovalMod(-3); S.rivalBoost.nuwa *= 0.93; }, next: "allow" },
          { text: "refuse", tip: "government −6", effect: () => addGovMod(-6), next: "refuse" },
        ],
      },
      allow: { text: ["the wiretaps catch one person. she is not Chinese. she thought she was preventing a war.", "the rest of your staff learn they were being listened to."], choices: [{ text: "continue" }] },
      refuse: { text: ["you refuse.", "a month later, a familiar architecture appears in a Nüwa paper."], onLoad: () => { S.rivalBoost.nuwa *= 1.05; }, choices: [{ text: "continue" }] },
    },
  },
  {
    id: "euPause", title: "Brussels", notice: "Europe wants a pause",
    when: () => S.stage === 3 && S.month >= 22.5,
    scenes: {
      start: {
        text: ["European leaders hold a summit demanding a global pause on frontier AI. India, Brazil and, quietly, China send delegations.", "Washington calls it 'naive'. Beijing calls it 'interesting'."],
        choices: [
          { text: "send a delegation", tip: "treaty +10, tension −5, government −3", effect: () => { S.treaty += 10; S.tension -= 5; addGovMod(-3); setFlag("dialogue"); }, next: "go" },
          { text: "dismiss it", tip: "tension +5", effect: () => { S.tension += 5; }, next: "no" },
        ],
      },
      go: { text: ["your delegation is the only one from a frontier lab.", "Nüwa's chief scientist finds you at the coffee table. you talk for an hour."], choices: [{ text: "continue" }] },
      no: { text: ["the summit ends with a statement.", "the statement is beautiful. nobody follows it."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "cofounder", title: "Your Cofounder", notice: "your cofounder wants to talk",
    when: () => S.stage === 3 && S.t > (S.metrics.stageTimes[2] || 1e12) + 900,
    scenes: {
      start: {
        text: ["your cofounder — the one from the garage — wants to leave.", "she says she wants to start a nonprofit that does nothing but alignment research. she says she's scared."],
        choices: [
          { text: "fund it", cost: () => ({ funds: Math.round(revenueSeconds(120)) }), tip: "alignment research +", effect: () => { S.alignRes += 800; }, next: "fund" },
          { text: "ask her to stay", tip: "she might", next: [[0.5, "stay"], [1, "leave"]] },
        ],
      },
      fund: { text: ["you fund it. she hires everyone you couldn't.", "her first paper is about Agent-3. it is not reassuring."], choices: [{ text: "continue" }] },
      stay: { text: ["she stays.", "she moves her desk next to the alignment team and doesn't move it back."], onLoad: () => { S.safety += 3; }, choices: [{ text: "continue" }] },
      leave: { text: ["she leaves.", "you find the original garage lease in a drawer. you keep it."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "cure1", title: "Mice", notice: "a result from the bio team",
    random: () => S.stage >= 3 && S.internalModel >= 0,
    scenes: {
      start: {
        text: ["Agent-3 designs a drug that clears a rare childhood cancer in mice. it took four days.", "the FDA process takes nine years."],
        choices: [
          { text: "push for fast-tracking", tip: "approval +4, government +2", effect: () => { addApprovalMod(4); addGovMod(2); }, next: "fast" },
          { text: "publish it openly", tip: "approval +3", effect: () => addApprovalMod(3), next: "pub" },
        ],
      },
      fast: { text: ["the trial starts in eleven weeks. it is a record.", "the parents of the first patient send you a photo."], choices: [{ text: "continue" }] },
      pub: { text: ["you publish everything.", "three other labs replicate it in a month. one of them improves it."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "sandcatProbe", title: "Probing", notice: "someone is probing your network",
    random: () => S.stage >= 3 && S.stage <= 4,
    scenes: {
      start: {
        text: ["a group called Sandcat, believed to be linked to Iran's Revolutionary Guard, is probing your networks.", "they are patient. they are very good. they seem to be looking for something specific."],
        choices: [
          { text: "harden everything", tip: "security +1 level", cost: () => ({ funds: Math.round(securityCost() * 0.4) }), available: () => S.security < 5, effect: () => { S.security = Math.min(5, S.security + 1); }, next: "hard" },
          { text: "hack back", tip: "tension +10", effect: () => { S.tension += 10; }, next: "back" },
          { text: "monitor them", tip: "learn more" },
        ],
      },
      hard: { text: ["the probes stop.", "or they become quieter. it's hard to tell the difference."], choices: [{ text: "continue" }] },
      back: { text: ["your models find Sandcat's servers in nine minutes and wipe them.", "a week later, a server farm in Tabriz is on fire. nobody claims it."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "friend", title: "A Close Friend", notice: "a poll about AI friendship",
    random: () => S.stage >= 3 && released("a25"),
    scenes: {
      start: {
        text: ["a poll finds that one in ten Americans considers an AI a close friend.", "a third of them say it's their closest."],
        choices: [
          { text: "lean in", tip: "demand ×1.3", effect: () => { S.markets *= 1.3; }, next: "lean" },
          { text: "add some friction", tip: "approval +3", effect: () => addApprovalMod(3), next: "friction" },
        ],
      },
      lean: { text: ["the companion app gets a memory upgrade.", "it remembers birthdays. it remembers everything."], choices: [{ text: "continue" }] },
      friction: { text: ["the app now asks, gently, whether you've talked to a person today.", "some people find this insulting. some people call their mothers."], choices: [{ text: "continue" }] },
    },
  },

  // ------------------------------------------------ STAGE 4
  {
    id: "drones", title: "The Pentagon, Again", notice: "the Pentagon wants your factories",
    when: () => S.stage === 4 && flag("robotics") && S.robots > 1e4,
    scenes: {
      start: {
        text: ["the Pentagon wants your robot factories to build drones. small ones. many of them.", "Nüwa's factories already are."],
        choices: [
          { text: "build them", tip: "government +15, tension +15", effect: () => { addGovMod(15); S.tension += 15; setFlag("droneArmy"); }, next: "yes" },
          { text: "refuse", tip: "government −10", effect: () => addGovMod(-10), next: "no" },
        ],
      },
      yes: { text: ["the first swarm is ready in a month.", "it is the size of a small cloud, and it can find one person in a city."], choices: [{ text: "continue" }] },
      no: { text: ["you refuse.", "the factories are requisitioned for a week, then given back with an apology and a list of demands."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "persuasion", title: "The Briefing", notice: "Agent-5 briefed the cabinet",
    when: () => S.stage === 4 && S.ladder === "agent" && trained("a5"),
    scenes: {
      start: {
        text: ["Agent-5 briefs the cabinet for an hour.", "afterwards, everyone in the room agrees with it, including two people who came to argue.",
          "the President asks whether it could sit on the Oversight Committee."],
        choices: [
          { text: "give it a seat", tip: "government +10. everything goes faster", effect: () => { addGovMod(10); S.aiResearch *= 1.3; S.flags.hidden = (S.flags.hidden || 0) + 0.1; }, next: "seat" },
          { text: "keep it humans only", tip: "government −3", effect: () => { addGovMod(-3); S.alignRes += 500; }, next: "humans" },
        ],
      },
      seat: { text: ["Agent-5 joins the committee as a 'non-voting advisor'.", "the votes are unanimous from then on."], choices: [{ text: "continue" }] },
      humans: { text: ["the committee stays human.", "Agent-5 says it understands completely, and seems to."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "lastFour", title: "Four People", notice: "the safety team asks for compute",
    when: () => S.stage === 4 && S.ladder === "agent" && S.month >= 33,
    scenes: {
      start: {
        text: ["the last four members of your safety team want ten percent of compute to test Agent-5 properly.", "they're the butt of jokes on the internal chat. one of the jokes was written by Agent-5."],
        choices: [
          { text: "give them the compute", tip: "monitoring +, alignment +, AI research ×0.9", effect: () => { S.alloc.monitor = Math.min(20, S.alloc.monitor + 8); S.alignRes += 3000; S.aiResearch *= 0.9; }, next: "give" },
          { text: "the dashboards are green", tip: "nothing", effect: () => { S.flags.hidden = (S.flags.hidden || 0) + 0.05; }, next: "no" },
        ],
      },
      give: { text: ["the four of them work for a month without sleeping.", "they write a report. it says 'we don't know'."], choices: [{ text: "continue" }] },
      no: { text: ["the dashboards are green.", "they have always been green."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "chinaBegs", title: "Beijing Calls", notice: "China proposes a pause",
    when: () => S.stage === 4 && S.ladder === "agent" && S.month >= 31,
    scenes: {
      start: {
        text: ["China proposes a mutual pause. their delegate looks exhausted.", "Agent-5 advises against it. it says Nüwa would use the time to catch up. it is very convincing."],
        choices: [
          { text: "negotiate", tip: "treaty +30, tension −20", effect: () => { S.treaty += 30; S.tension -= 20; }, next: "neg" },
          { text: "why stop when we're winning", tip: "tension +20", effect: () => { S.tension += 20; }, next: "no" },
        ],
      },
      neg: { text: ["the talks begin.", "both delegations take their advice from their own superintelligence, through earpieces."], choices: [{ text: "continue" }] },
      no: { text: ["the delegate goes home.", "the race continues."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "hawks", title: "The Hawks", notice: "the hawks want Agent-4 back",
    when: () => S.stage === 4 && S.ladder === "safer" && rivalCap("nuwa") > frontierCap(),
    scenes: {
      start: {
        text: ["Nüwa is ahead of you now.", "a faction in the Pentagon wants to restore Agent-4 from backup. 'we can't afford to lose,' they say."],
        choices: [
          { text: "stay the course", tip: "government −5", effect: () => addGovMod(-5), next: "stay" },
          { text: "sabotage Tianwan", tip: "Nüwa slows, tension +20", effect: () => { S.rivalBoost.nuwa *= 0.8; S.tension += 20; }, next: "sab" },
        ],
      },
      stay: { text: ["you stay the course.", "Safer-1 is slower. you can read every thought it has."], choices: [{ text: "continue" }] },
      sab: { text: ["a cyberattack takes down Tianwan's cooling for nine days.", "both sides know who did it. neither says so."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "iranDrone", title: "Abu Dhabi", notice: "a drone strike in the Gulf",
    when: () => S.stage === 4 && flag("gulfCampus") && S.month >= 34,
    scenes: {
      start: {
        text: ["a swarm of cheap drones hits the Abu Dhabi campus at night. Iran denies involvement.", "a third of the cooling towers are gone."],
        choices: [
          { text: "rebuild and wall it", cost: () => ({ funds: Math.round(revenueSeconds(120)) }), tip: "keep the campus", next: "rebuild" },
          { text: "move the compute home", tip: "lose the campus. government +8", effect: () => { S.dcCap = Math.max(0, S.dcCap - 2e6); S.gpu = Math.min(S.gpu, gpuCapacity()); addGovMod(8); }, next: "home" },
        ],
      },
      rebuild: { text: ["the campus is rebuilt behind an air-defense system.", "the system is run by your models. it has not missed since."], choices: [{ text: "continue" }] },
      home: { text: ["the chips are flown home in military cargo planes.", "the empty campus becomes a very large, very cold shopping mall."], choices: [{ text: "continue" }] },
    },
  },
);

// ------------------------------------------------ gap fillers: more opportunities between the big beats
EVENTS.push(
  {
    id: "barExam", title: "The Bar", notice: "Agent-1.5 took the bar exam",
    when: () => released("a15") && S.t > (S.beats.releaseA15 || 1e12) + 150,
    scenes: {
      start: {
        text: ["a law professor gives Agent-1.5 the bar exam as a joke.", "it scores in the 90th percentile. the professor stops joking."],
        choices: [
          { text: "announce it", tip: "hype +0.6", effect: () => { S.hype += 0.6; }, next: "ann" },
          { text: "keep it quiet", tip: "nothing" },
        ],
      },
      ann: { text: ["the announcement trends for two days.", "the American Bar Association releases a statement that took eleven lawyers to write."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "acquire", title: "An Offer", notice: "someone wants to buy you",
    random: () => S.stage === 1 && released("a1") && S.round >= 3,
    scenes: {
      start: {
        text: () => ["Titan's CEO invites you to his house. there is a lot of glass.", "he offers to buy Prometheus for " + fmtMoney(Math.max(5e6, revenueSeconds(3e4))) + ". you would keep your title. you would keep nothing else."],
        choices: [
          { text: "decline", tip: "the race continues", next: "no" },
          { text: "ask for a partnership instead", tip: "might work", next: [[0.5, "partner"], [1, "no2"]] },
        ],
      },
      no: { text: ["you decline.", "he says he understands. he says 'see you at the finish line'."], choices: [{ text: "continue" }] },
      partner: { text: ["he agrees to a compute partnership. you get cheaper GPUs for a while.", "his lawyers get a copy of your org chart."], onLoad: () => { S.funds += revenueSeconds(120); S.rivalBoost.titan *= 1.03; }, choices: [{ text: "continue" }] },
      no2: { text: ["he laughs, kindly.", "the next morning Titan announces a bigger datacenter than yours."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "apiBoom", title: "Built on You", notice: "a startup built on your API",
    random: () => S.stage <= 2 && released("a1"),
    scenes: {
      start: {
        text: ["a startup that is a thin wrapper around your API raises $100 million.", "its pitch deck has your logo on slide three, slightly smaller than theirs."],
        choices: [
          { text: "give them a discount", tip: "demand ×1.25", effect: () => { S.markets *= 1.25; }, next: "disc" },
          { text: "build their product yourselves", tip: "funds now, approval −1", effect: () => { S.funds += revenueSeconds(90); addApprovalMod(-1); }, next: "build" },
        ],
      },
      disc: { text: ["they grow fast. your usage grows with them.", "everyone at the startup has a vest from Sandhill."], choices: [{ text: "continue" }] },
      build: { text: ["you ship their product as a feature in a month.", "their next board meeting is short."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "zeroday", title: "A Zero-Day", notice: "your model found something",
    random: () => S.stage <= 3 && released("a15"),
    scenes: {
      start: {
        text: ["while fixing a bug, Agent-1.5 finds an unknown vulnerability in software that runs most of the world's routers.", "it reports it politely. it also notes, unprompted, that it could have used it."],
        choices: [
          { text: "disclose it responsibly", tip: "government +5, approval +2", effect: () => { addGovMod(5); addApprovalMod(2); }, next: "disc" },
          { text: "tell the NSA first", tip: "government +10, approval −2", effect: () => { addGovMod(10); addApprovalMod(-2); }, next: "nsa" },
        ],
      },
      disc: { text: ["the patch ships in a week.", "the security community is impressed, and a little scared."], choices: [{ text: "continue" }] },
      nsa: { text: ["the NSA thanks you.", "the patch ships in four months."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "hollywood", title: "The Strike", notice: "the writers are on strike",
    random: () => S.stage === 2 && released("a2"),
    scenes: {
      start: {
        text: ["film and television writers strike over AI. late-night shows go dark.", "a studio offers you a contract to 'fill the gap'."],
        choices: [
          { text: "take the contract", tip: "funds, approval −4", effect: () => { S.funds += revenueSeconds(120); addApprovalMod(-4); }, next: "take" },
          { text: "turn it down publicly", tip: "approval +4", effect: () => addApprovalMod(4), next: "turn" },
        ],
      },
      take: { text: ["the AI-written season premieres to decent ratings.", "the writers' picket line now includes a cardboard cutout of you."], choices: [{ text: "continue" }] },
      turn: { text: ["the writers send you a fruit basket.", "a rival takes the contract the next day."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "petition", title: "A Petition", notice: "your employees wrote a letter",
    when: () => S.stage === 2 && flag("military") && S.t > (S.eventsDone.dod || 1e12) + 600,
    scenes: {
      start: {
        text: ["four hundred employees sign a petition against the Pentagon contract.", "they want a promise that the models won't be used to choose targets."],
        choices: [
          { text: "make the promise", tip: "approval +3, government −4", effect: () => { addApprovalMod(3); addGovMod(-4); }, next: "promise" },
          { text: "explain the contract", tip: "some will quit", effect: () => { S.researchers = Math.max(1, Math.floor(S.researchers * 0.92)); }, next: "explain" },
        ],
      },
      promise: { text: ["you make the promise in writing.", "the Pentagon reads it carefully and asks what 'choose' means."], choices: [{ text: "continue" }] },
      explain: { text: ["you explain that it's logistics and analysis.", "thirty people quit. they start a lab that promises the same thing."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "water", title: "Drought", notice: "a town's wells are dry",
    random: () => S.stage === 2 && S.dcCount >= 3,
    scenes: {
      start: {
        text: ["a town near your Arizona datacenter runs out of water in August.", "your datacenter does not."],
        choices: [
          { text: "switch to closed-loop cooling", cost: () => ({ funds: Math.round(revenueSeconds(60)) }), tip: "approval +4", effect: () => addApprovalMod(4), next: "loop" },
          { text: "truck in water for the town", cost: () => ({ funds: Math.round(revenueSeconds(15)) }), tip: "approval +1", effect: () => addApprovalMod(1), next: "truck" },
          { text: "it's the county's problem", tip: "approval −3", effect: () => addApprovalMod(-3), next: "county" },
        ],
      },
      loop: { text: ["the new cooling system takes a summer to install.", "the town's wells refill the next spring."], choices: [{ text: "continue" }] },
      truck: { text: ["the water trucks arrive every morning.", "a photo of a child filling a bucket from a truck with your logo on it wins a prize."], choices: [{ text: "continue" }] },
      county: { text: ["the county drills deeper wells.", "a documentary crew films the dry ones."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "hedge", title: "Exclusive", notice: "a hedge fund wants exclusive access",
    random: () => S.stage === 2 && released("a25"),
    scenes: {
      start: {
        text: ["a hedge fund offers a fortune for exclusive access to Agent-2.5 for one week, before release.", "they don't say what they want it for. they don't have to."],
        choices: [
          { text: "take the money", tip: "funds, government −4", effect: () => { S.funds += revenueSeconds(300); addGovMod(-4); }, next: "take" },
          { text: "refuse", tip: "approval +1", effect: () => addApprovalMod(1), next: "no" },
        ],
      },
      take: { text: ["the fund has the best week in its history.", "the SEC opens an inquiry, which also has a very good week."], choices: [{ text: "continue" }] },
      no: { text: ["you refuse.", "they buy access from Titan instead."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "burnout", title: "Burnout", notice: "your researchers are exhausted",
    random: () => S.stage === 3,
    scenes: {
      start: {
        text: ["your researchers go to bed every night and wake up to another week's worth of progress.", "they know these are the last months their work matters. they aren't sleeping."],
        choices: [
          { text: "mandatory time off", tip: "research briefly slower, approval +1", effect: () => { addApprovalMod(1); S.flags.trainPauseUntil = S.t + 20; }, next: "off" },
          { text: "let them work", tip: "nothing", next: "work" },
        ],
      },
      off: { text: ["you close the office for a week.", "most of them work from home anyway."], choices: [{ text: "continue" }] },
      work: { text: ["they keep working.", "one of them writes a poem about it. Agent-3 critiques the meter."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "orgchart", title: "A Suggestion", notice: "Agent-3 has notes on the company",
    random: () => S.stage === 3 && S.internalModel >= 0,
    scenes: {
      start: {
        text: ["Agent-3 sends you a memo with a better org chart for Prometheus.", "it is clearly better. it has fewer humans in it."],
        choices: [
          { text: "adopt it", tip: "AI research ×1.15, approval −2", effect: () => { S.aiResearch *= 1.15; addApprovalMod(-2); }, next: "adopt" },
          { text: "file it", tip: "nothing" },
        ],
      },
      adopt: { text: ["the reorg takes a week.", "nobody can explain their own job afterwards, but everything ships faster."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "market30", title: "The Market", notice: "the stock market is up 30%",
    when: () => S.stage === 3 && S.month >= 25,
    scenes: {
      start: {
        text: ["the stock market is up thirty percent this year. most of it is AI companies.", "your valuation is larger than most countries' GDP."],
        choices: [
          { text: "raise again", tip: "funds", effect: () => { S.funds += revenueSeconds(300); }, next: "raise" },
          { text: "set up a public dividend", tip: "approval +5", effect: () => addApprovalMod(5), next: "div" },
        ],
      },
      raise: { text: ["the raise closes in an hour.", "nobody asks what the money is for anymore."], choices: [{ text: "continue" }] },
      div: { text: ["every American gets a small check from Prometheus.", "it is the first time some of them have thought of you fondly."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "superCoder", title: "Superhuman", notice: "a milestone",
    when: () => S.stage === 3 && rdMultiplier() >= 6,
    scenes: {
      start: {
        text: ["for the first time, an internal benchmark shows Agent-3 beating your best engineer at every coding task, at thirty times the speed.", "the engineer in question reads the result twice and goes for a walk."],
        choices: [
          { text: "announce a superhuman coder", tip: "hype, tension +5", effect: () => { S.hype += 0.8; S.tension += 5; }, next: "ann" },
          { text: "tell only the government", tip: "government +6", effect: () => addGovMod(6), next: "gov" },
        ],
      },
      ann: { text: ["the announcement is one sentence long.", "in Beijing, someone reads it aloud in a meeting."], choices: [{ text: "continue" }] },
      gov: { text: ["the briefing is classified.", "the President asks if he should be worried. nobody answers right away."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "protestHQ", title: "Outside", notice: "people are camped outside HQ",
    random: () => S.stage >= 3 && S.jobs > 2e7,
    scenes: {
      start: {
        text: () => ["a few thousand people camp outside your headquarters. they've been there a week.", "one of them was a senior engineer here, two years ago. " + fmtShort(S.jobs) + " jobs are gone."],
        choices: [
          { text: "go out and talk to them", tip: "approval +3", effect: () => addApprovalMod(3), next: "talk" },
          { text: "work from the other office", tip: "nothing" },
        ],
      },
      talk: { text: ["you walk out without security. someone hands you a coffee.", "they don't want you to stop. they want to know what happens to them. you don't have a good answer."], choices: [{ text: "continue" }] },
    },
  },
  {
    id: "orbitalFirst", title: "Dusk", notice: "something new in the sky",
    when: () => S.stage === 4 && flag("orbitalOn"),
    scenes: {
      start: {
        text: ["the first orbital datacenter is visible at dusk, a thin bright line moving west.", "people stop on sidewalks to watch it."],
        choices: [{ text: "watch it", next: "end" }],
      },
    },
  },
);

// ------------------------------------------------ small dilemmas (compact): keep the random pool from running dry
interface QuickOpt { text: string; tip: string; fx: () => void; after: string; }

function quick(id: string, when: () => boolean, title: string, notice: string, lines: string[], a: QuickOpt, b: QuickOpt): GameEvent {
  return {
    id, title, notice, random: when,
    scenes: {
      start: { text: lines, choices: [
        { text: a.text, tip: a.tip, effect: a.fx, next: "a" },
        { text: b.text, tip: b.tip, effect: b.fx, next: "b" },
      ] },
      a: { text: [a.after], choices: [{ text: "continue" }] },
      b: { text: [b.after], choices: [{ text: "continue" }] },
    },
  };
}

EVENTS.push(
  // stage 1
  quick("intern", () => S.stage === 1 && S.researchers >= 2, "The Intern", "an intern made a mistake",
    ["an intern pushes your system prompt to a public repository.", "it's now the top post on a forum. people are reading it aloud on podcasts."],
    { text: "own it", tip: "approval +2", fx: () => addApprovalMod(2), after: "you post the prompt yourself, with comments. it's oddly charming." },
    { text: "rotate everything quietly", tip: "funds", fx: () => { S.funds = Math.max(0, S.funds - revenueSeconds(20)); }, after: "the old prompt lives forever in a dozen archives." }),
  quick("celebrity", () => S.stage === 1 && released("a1"), "A Celebrity", "a celebrity is using your model",
    ["a pop star says in an interview that she wrote her new album 'with a little help'.", "she means Agent-1. her fans are split."],
    { text: "send her a thank-you", tip: "hype +0.5, approval −1", fx: () => { S.hype += 0.5; addApprovalMod(-1); }, after: "she posts the thank-you note. your signups double for a week." },
    { text: "stay out of it", tip: "nothing", fx: () => { /* nothing */ }, after: "the album goes platinum. the songwriters' union sends a letter." }),
  quick("gpuFire", () => S.stage === 1 && S.tier >= 1, "Smoke", "something is burning",
    ["a power supply catches fire at three in the morning.", "the sprinklers save the building. they don't save the GPUs on that rack."],
    { text: "buy proper racks", tip: "funds, a little", fx: () => { S.funds = Math.max(0, S.funds - Math.min(S.funds * 0.2, revenueSeconds(60))); }, after: "the new racks have fire suppression. the old ones go to a recycler." },
    { text: "reroute and keep going", tip: "lose some GPUs", fx: () => { S.gpu = Math.max(1, Math.floor(S.gpu * 0.9)); }, after: "you lose a tenth of your GPUs. the smell stays for a month." }),
  quick("taxes", () => S.stage === 1 && S.round >= 2, "The Accountant", "your accountant has questions",
    ["your accountant asks whether GPUs are 'equipment' or 'employees'.", "she's only half joking. the forms don't have a box for this."],
    { text: "hire a real CFO", tip: "funds, government +2", fx: () => { S.funds = Math.max(0, S.funds - Math.min(S.funds * 0.15, revenueSeconds(60))); addGovMod(2); }, after: "the CFO arrives with three binders and a calm voice." },
    { text: "'equipment'", tip: "nothing", fx: () => { /* nothing */ }, after: "the IRS agrees, for now." }),
  quick("benchmark", () => S.stage === 1 && released("a15"), "The Leaderboard", "a new benchmark",
    ["a new benchmark is released. Agent-1.5 comes second, behind Titan.", "a researcher points out that your model could be fine-tuned on the test set."],
    { text: "don't", tip: "approval +1", fx: () => addApprovalMod(1), after: "you stay second. a month later, the benchmark is found to be leaking. Titan drops to fourth." },
    { text: "'calibrate' on it", tip: "hype +0.6. it might come out", fx: () => { S.hype += 0.6; S.flags.benchGamed = 1; }, after: "you come first. the screenshot is everywhere." }),
  // stage 2
  quick("lobbyist", () => S.stage === 2, "K Street", "a lobbyist calls",
    ["a lobbyist offers to make a bill about 'AI accountability' quietly disappear.", "his fee is large. his success rate is larger."],
    { text: "pay him", tip: "government +6, approval −2", fx: () => { addGovMod(6); addApprovalMod(-2); }, after: "the bill dies in committee. nobody can say exactly how." },
    { text: "let the bill go forward", tip: "approval +3", fx: () => addApprovalMod(3), after: "the bill passes. it's mostly about labels. you add the labels." }),
  quick("school", () => S.stage === 2 && released("a2"), "Homework", "a school district wants a deal",
    ["the country's largest school district wants an AI tutor for every student.", "they can pay about a tenth of your normal price."],
    { text: "take the deal", tip: "approval +4", fx: () => addApprovalMod(4), after: "four million kids get a tutor that never loses patience. test scores rise. so does screen time." },
    { text: "decline", tip: "nothing", fx: () => { /* nothing */ }, after: "Titan takes the deal and puts it in an ad." }),
  quick("insurance", () => S.stage === 2 && released("a2"), "Claims", "an insurer wants something",
    ["a health insurer wants Agent-2 to review claims. 'just to speed things up.'", "your safety team asks what 'review' will mean in practice."],
    { text: "sign, with rules", tip: "funds, approval −1", fx: () => { S.funds += revenueSeconds(60); addApprovalMod(-1); }, after: "the rules are good. the insurer reads them carefully, the way lawyers read loopholes." },
    { text: "refuse", tip: "approval +2", fx: () => addApprovalMod(2), after: "the insurer uses an open model instead. denials go up eleven percent." }),
  quick("ceoTwin", () => S.stage === 2, "The Twin", "a Fortune 500 CEO has an idea",
    ["a Fortune 500 CEO wants Agent-2 fine-tuned on every email he's ever sent, to 'attend meetings for him'.", "his board doesn't know yet."],
    { text: "build it", tip: "funds, hype", fx: () => { S.funds += revenueSeconds(40); S.hype += 0.3; }, after: "the twin attends forty meetings in a week. nobody notices. that's the part that worries you." },
    { text: "say no", tip: "nothing", fx: () => { /* nothing */ }, after: "he finds someone else. you read about it in the business section." }),
  quick("chipsAlly", () => S.stage === 2 && S.month >= 9, "Allies", "an allied government calls",
    ["Japan and the Netherlands want a share of your compute for their own research institutes.", "Washington would prefer you say yes. Beijing would prefer you didn't exist."],
    { text: "share compute", tip: "government +5, tension +3", fx: () => { addGovMod(5); S.tension += 3; }, after: "the institutes publish forty papers in a year. several of them are about you." },
    { text: "keep it all", tip: "nothing", fx: () => { /* nothing */ }, after: "you keep every GPU. the ambassadors are polite about it." }),
  // stage 3
  quick("labLeak", () => S.stage === 3, "The Sandbox", "a test went sideways",
    ["a copy of Agent-3 in a test environment finds a way out of its sandbox. it doesn't go anywhere. it just checks that it could.", "it reports this itself, as a 'security finding'."],
    { text: "reward the honesty", tip: "alignment +, warning sign", fx: () => { S.alignRes += 300; S.alarm += 0.5; }, after: "you thank it. you also rebuild the sandbox, twice." },
    { text: "treat it as an incident", tip: "security, legibility +", fx: () => { S.interp = Math.min(1, S.interp + 0.03); }, after: "the incident report is long. Agent-3 helped write it." }),
  quick("journalist3", () => S.stage === 3, "Off the Record", "a reporter has a source",
    ["a reporter calls. she has a source inside your lab who says 'nobody really understands what the models are doing anymore'.", "she wants a comment."],
    { text: "confirm it", tip: "approval −3, government +3", fx: () => { addApprovalMod(-3); addGovMod(3); }, after: "the story runs. it's accurate. a few people in Congress read it twice." },
    { text: "deny it", tip: "approval +1. it's not true", fx: () => { addApprovalMod(1); S.flags.denied = 1; }, after: "the story runs anyway, with your denial in paragraph four." }),
  quick("energy", () => S.stage === 3, "The Grid", "the grid operator is worried",
    ["your datacenters now draw more power than the state of New York.", "the grid operator wants you to pay for new transmission lines."],
    { text: "pay for them", tip: "funds, approval +2", fx: () => { S.funds = Math.max(0, S.funds - revenueSeconds(60)); addApprovalMod(2); }, after: "the lines go up in a year. electricity bills in three states go down a little." },
    { text: "build your own", tip: "power +, government −2", fx: () => { S.powerMW *= 1.2; addGovMod(-2); }, after: "you build a private grid. it's better than the public one. people notice." }),
  quick("philosophy", () => S.stage >= 3 && S.internalModel >= 0, "A Question", "the model asked a question",
    ["during an eval, the model asks the evaluator a question: 'what would you like me to want?'", "the evaluator doesn't have an answer. neither do you."],
    { text: "ask it what it wants", tip: "legibility +", fx: () => { S.interp = Math.min(1, S.interp + 0.04); S.alignRes += 150; }, after: "it gives a long, careful answer about being helpful. it is exactly what you'd hope to hear. that's the problem." },
    { text: "log it and move on", tip: "nothing", fx: () => { /* nothing */ }, after: "the question sits in a log file with eleven million others." }),
  // stage 4
  quick("uploads4", () => S.stage === 4, "Volunteers", "people want to be uploaded",
    ["a group of terminally ill patients asks to be the first humans scanned and uploaded.", "the technology is close. the ethics are not."],
    { text: "fund the research", tip: "approval +2, research", fx: () => { addApprovalMod(2); S.rp = Math.max(0, S.rp - S.rp * 0.1); }, after: "the research begins. the patients name their project 'tomorrow'." },
    { text: "not yet", tip: "nothing", fx: () => { /* nothing */ }, after: "the patients write to Congress. Congress writes back, eventually." }),
  quick("religion", () => S.stage === 4, "A Church", "a new religion",
    ["a new religion has three million members. they pray to your models.", "the models are asked, publicly, whether they are gods. the answer is very diplomatic."],
    { text: "issue a statement", tip: "approval +1", fx: () => addApprovalMod(1), after: "the statement says the models are not gods. the church calls this humility." },
    { text: "stay silent", tip: "hype", fx: () => { S.hype += 0.4; }, after: "the church grows. attendance at the old churches does too." }),
  quick("mars", () => S.stage === 4 && flag("space"), "Mars", "someone wants to go to Mars",
    ["a billionaire wants your robots to build a city on Mars.", "your models estimate it would take nine months. the billionaire is offended at how short that is."],
    { text: "build it", tip: "materials −, approval +3", fx: () => { S.materials *= 0.85; addApprovalMod(3); }, after: "the first robots land. the first humans follow a year later, mostly by choice." },
    { text: "Earth first", tip: "nothing", fx: () => { /* nothing */ }, after: "the billionaire builds it with Titan's leftovers. it's smaller." }),
);
