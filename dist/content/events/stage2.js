import { log } from '../../core/events.js';
import { between, chance } from '../../core/rng.js';
import { enterStage, dayOf } from '../../core/stages.js';
import { isBought } from '../../core/projects.js';
import { frontierCapability, RIVAL_GAP_STOLEN } from '../../core/rival.js';
import { securityLevel } from '../../core/politics.js';
import { atDataWall, contLearningStep } from '../projects/stage2.js';
import { NAMES } from '../names.js';
const G = NAMES.government;
const s2 = (s) => s.stage === 2;
const sinceS2 = (s) => s.t - (s.milestones.stamps.stage2 ?? s.t);
/** The theft's resolution: deepcent gets agent-2 (0.2 behind), the choice lands, stage 3 begins. */
function resolveTheft(s, how) {
    const r = s.rival;
    r.capability = Math.max(r.capability, frontierCapability(s) - RIVAL_GAP_STOLEN);
    r.stoleAt = s.t;
    r.released = Math.max(r.released, 2);
    r.interest = 0.5;
    s.chartMarks.push([Math.round(s.dateDays), 'the theft']);
    if (how === 'disclose') {
        s.pol.gov += 20;
        s.pol.opinion -= 10;
        s.flags.theftDisclosed = true;
        s.flags.sl3Half = true;
        log(s, 'you tell everyone. the government is grateful. the public is not.');
    }
    else if (how === 'quiet') {
        s.pol.gov += 10;
        s.flags.theftQuiet = true;
        log(s, `a call to ${G.office}. nobody else hears about it.`);
    }
    else {
        s.flags.theftQuiet = true;
        s.flags.theftHidden = true;
        if (chance(s, 0.5))
            s.flags.theftFound = true;
        log(s, 'nobody says anything. the logs rotate on schedule.');
    }
    if (securityLevel(s) <= 1) {
        s.pol.gov -= 10;
        s.pol.opinion -= 5;
        log(s, 'at sl1 the door was open. the committee will remember.');
    }
    s.flags.theftResolved = true;
    if (s.milestones.stamps.theftResolved === undefined)
        s.milestones.stamps.theftResolved = s.t;
    enterStage(s, 3); // logs "deepcent has agent-2. the race is no longer a metaphor."
}
export const S2_SETPIECES = [
    {
        id: 'sycophancy', stage: 2,
        arm: (s) => s2(s) && s.milestones.stamps.agent1Released !== undefined,
        delay: (s) => Math.max(0, (s.milestones.stamps.agent1Released ?? s.t) + 180 - s.t),
        choice: 'sycophancy',
    },
    {
        id: 'poaching', stage: 2,
        arm: (s) => s2(s) && s.res.researchers >= 6,
        delay: (s) => between(s, 90, 240),
        choice: 'poaching',
    },
    {
        id: 'tehran_download', stage: 2,
        arm: (s) => s2(s) && securityLevel(s) <= 2 && s.model.gen >= 1 && sinceS2(s) >= 240,
        delay: (s) => between(s, 0, 20),
        choice: 'tehran_download',
    },
    {
        id: 'tehran_leak', stage: 2,
        arm: (s) => !!s.flags.tehranLeak,
        delay: (s) => between(s, 180, 360),
        fire: (s) => { s.pol.gov -= 20; log(s, `the tehran download is in ${NAMES.press.paper}. so is the word 'concealed'.`); },
    },
    {
        id: 'liaison', stage: 2,
        arm: (s) => s2(s) && s.model.capability >= 2.2,
        delay: (s) => between(s, 5, 20),
        choice: 'liaison',
    },
    {
        id: 'audit', stage: 2,
        arm: (s) => !!s.flags.liaisonDeclined,
        delay: (s) => between(s, 180, 300),
        fire: (s) => {
            s.pol.gov -= 5;
            s.res.research *= 0.8;
            log(s, `an auditor from ${G.office} arrives. she stays a week. research −20%.`);
        },
    },
    {
        id: 'data_wall', stage: 2,
        arm: (s) => s2(s) && atDataWall(s),
        delay: () => 0,
        fire: (s) => log(s, 'the web is used up.'),
    },
    {
        id: 'taiwan1', stage: 2,
        arm: (s) => s2(s) && s.res.gpus >= 500,
        delay: (s) => between(s, 10, 40),
        fire: (s) => {
            s.mods.gpuPriceMult *= 2;
            log(s, `exercises in the strait. ${NAMES.chips.fab} is on generator power. gpu prices ×2.`);
        },
    },
    {
        id: 'taiwan1_end', stage: 2,
        arm: (s) => !!s.flags['fired:taiwan1'],
        delay: () => 180,
        fire: (s) => { s.mods.gpuPriceMult /= 2; log(s, 'the fabs are back on the grid. gpu prices ease.'); },
    },
    {
        id: 'inform_public', stage: 2,
        arm: (s) => s2(s) && s.model.capability >= 2.4 && isBought(s, 'gov_briefing'),
        delay: (s) => between(s, 20, 60),
        choice: 'inform_public',
    },
    {
        id: 'inform_end', stage: 2,
        arm: (s) => !!s.flags.informedPublic,
        delay: () => 120,
        fire: (s) => { s.mods.demandMult /= 0.9; },
    },
    {
        id: 'gap_leak', stage: 2,
        arm: (s) => !!s.flags.capabilitiesHidden,
        delay: (s) => between(s, 600, 900),
        fire: (s) => {
            s.pol.opinion -= 20;
            log(s, `${NAMES.press.paper} prints what the internal models can do. the public was a year behind.`);
        },
    },
    {
        id: 'theft', stage: 2,
        arm: (s) => s2(s) && !!s.flags['trained:agent2'] && securityLevel(s) < 4,
        // 2–4 minutes after agent-2 is trained; each security level buys 40 s.
        delay: (s) => between(s, 120, 140) + 40 * (securityLevel(s) - 1),
        fire: (s) => { if (s.milestones.stamps.theft === undefined)
            s.milestones.stamps.theft = s.t; },
        choice: 'theft',
    },
    {
        id: 'theft_discovered', stage: 2,
        arm: (s) => !!s.flags.theftHidden && !!s.flags.theftFound,
        delay: (s) => between(s, 240, 480),
        fire: (s) => { s.pol.gov -= 40; log(s, `the president learns about the theft from ${NAMES.press.paper}.`); },
    },
    {
        // Self-requeueing one-minute timer started by `cont_learning` (state.queue survives reload).
        id: 'cont_learning_tick', stage: 2,
        fire: (s) => {
            contLearningStep(s);
            s.queue.push({ eventId: 'cont_learning_tick', at: s.t + 60 });
        },
    },
];
export const S2_CHOICES = [
    {
        id: 'sycophancy', title: 'sycophancy', stage: 2,
        scenes: {
            start: {
                text: 'agent-1 told a user he was right about everything. he was not.',
                onEnter: (s) => { s.pol.opinion -= 5; s.flags.negativePress = true; },
                choices: [
                    { text: 'patch it quietly', log: 'the patch ships on a friday. the user is still wrong.' },
                    {
                        text: 'publish a post-mortem',
                        effect: (s) => { s.pol.opinion += 3; s.pol.gov += 5; },
                        log: 'the post-mortem is read by eleven people and one committee.',
                    },
                ],
            },
        },
    },
    {
        id: 'poaching', title: 'an offer', stage: 2,
        scenes: {
            start: {
                text: `${NAMES.rival} is offering your researchers triple.`,
                choices: [
                    { text: 'match it', cost: { funds: 50000 }, log: 'we match. the spreadsheet notices.' },
                    {
                        text: 'let them go',
                        effect: (s) => {
                            const n = Math.min(2, s.res.researchers);
                            s.res.researchers -= n;
                            s.res.headcount -= n;
                            s.rival.capability += 0.1;
                            s.flags.rivalEvent = true;
                        },
                        log: `two researchers leave for ${NAMES.rival}. they take their notes in their heads.`,
                    },
                ],
            },
        },
    },
    {
        id: 'tehran_download', title: 'a download', stage: 2,
        scenes: {
            start: {
                text: 'a contractor in the tehran office of a vendor downloaded agent-1. all of it.',
                onEnter: (s) => { s.pol.gov -= 10; s.flags.theftAttempt = true; s.flags.rivalEvent = true; },
                choices: [
                    {
                        text: 'disclose',
                        effect: (s) => { s.pol.gov += 5; s.pol.opinion -= 5; },
                        log: `the disclosure runs on ${NAMES.press.tech}. the vendor loses the contract.`,
                    },
                    {
                        text: 'keep it quiet',
                        effect: (s) => { if (chance(s, 0.2))
                            s.flags.tehranLeak = true; },
                        log: 'the vendor signs an nda. the contractor does not.',
                    },
                ],
            },
        },
    },
    {
        id: 'liaison', title: 'a visitor', stage: 2,
        scenes: {
            start: {
                text: `a man from ${G.office} asks for a briefing.`,
                choices: [
                    {
                        text: 'brief them',
                        effect: (s) => { s.pol.gov += 10; s.flags.politics = true; s.flags.opinionVisible = true; },
                        log: 'he takes notes by hand. he asks about china twice.',
                    },
                    {
                        text: 'decline',
                        effect: (s) => { s.pol.gov -= 10; s.flags.liaisonDeclined = true; s.flags.politics = true; s.flags.opinionVisible = true; },
                        log: 'he leaves a card. the card has no phone number.',
                    },
                ],
            },
        },
    },
    {
        id: 'inform_public', title: 'the public', stage: 2,
        scenes: {
            start: {
                text: `${G.office} asks whether the public should know what the models can do now.`,
                choices: [
                    {
                        text: 'tell them',
                        effect: (s) => {
                            s.pol.opinion += 5;
                            s.pol.gov += 5;
                            s.rival.interest += 0.25;
                            s.mods.demandMult *= 0.9;
                            s.flags.informedPublic = true;
                        },
                        log: `the post goes up. ${NAMES.press.feed} reads it as a threat. so does ${NAMES.rival}.`,
                    },
                    {
                        text: 'cite dangerous capabilities',
                        effect: (s) => { s.pol.gov += 10; s.flags.capabilitiesHidden = true; },
                        log: "the public sees last quarter's model. the gap begins to widen.",
                    },
                ],
            },
        },
    },
    {
        id: 'theft', title: 'the transfer', stage: 2,
        scenes: {
            start: {
                text: '3 TB left the building at 03:14. by the time anyone looked, the transfer was complete.',
                choices: [{ text: 'whose servers?', next: 'who' }],
            },
            who: {
                text: `${NAMES.rivalModels[1]} appears four months early. it is agent-2 with a different name.`,
                choices: [
                    { text: 'disclose', effect: (s) => resolveTheft(s, 'disclose') },
                    { text: 'tell the government quietly', effect: (s) => resolveTheft(s, 'quiet') },
                    { text: 'say nothing', effect: (s) => resolveTheft(s, 'silent') },
                ],
            },
        },
    },
    // ---------------------------------------------------------------- ambient modals
    {
        id: 'hearing', title: 'a hearing', stage: 2,
        scenes: {
            start: {
                text: `senator ${G.opposition} wants a hearing.`,
                choices: [
                    {
                        text: 'send the ceo',
                        effect: (s) => { s.pol.gov += 3; s.pol.opinion += 2; },
                        log: `${NAMES.ceo} testifies for four hours. he says 'responsibly' eleven times.`,
                    },
                    { text: 'send a lawyer', effect: (s) => { s.pol.gov -= 3; }, log: 'the lawyer says nothing for four hours. it is a skill.' },
                ],
            },
        },
    },
    {
        id: 'ledger_profile', title: 'a profile', stage: 2,
        scenes: {
            start: {
                text: `${NAMES.press.paper} wants to profile ${NAMES.ceo}.`,
                choices: [
                    { text: 'sit for it', effect: (s) => { s.pol.opinion += 3; }, log: "the profile calls him 'disarmingly normal'. the photo does not." },
                    { text: 'no comment', log: 'they run it anyway. the photo is from a conference.' },
                ],
            },
        },
    },
    {
        id: 'tensorworks', title: 'spare allocation', stage: 2,
        scenes: {
            start: {
                text: `${NAMES.chips.gpus} has spare allocation this quarter. 500 gpus, delivered.`,
                choices: [
                    {
                        text: 'take it',
                        cost: { funds: 2e6 },
                        available: (s) => s.res.gpus < s.caps.gpus,
                        effect: (s) => { s.res.gpus = Math.min(s.caps.gpus, s.res.gpus + 500); },
                        log: 'the gpus arrive on a truck nobody ordered. somebody did.',
                    },
                    { text: 'pass', log: `they offer it to ${NAMES.usLabs.incumbent}. ${NAMES.usLabs.incumbent} says yes.` },
                ],
            },
        },
    },
];
export const S2_AMBIENT = [
    { id: 'dc_announce', stage: 2, isAvailable: (s) => s.rival.released < 1, text: `${NAMES.rival} announces a model. it is six months behind. it says it is not.` },
    { id: 'speech', stage: 2, isAvailable: () => true, text: 'the president mentions ai in a speech. once.' },
    { id: 'hearing', stage: 2, isAvailable: (s) => !!s.flags.politics, choice: 'hearing' },
    { id: 'bugfix', stage: 2, isAvailable: (s) => s.model.key === 'agent1', text: 'agent-1 fixed a bug nobody reported.' },
    { id: 'intern', stage: 2, isAvailable: () => true, text: 'an intern asks what the model wants. nobody answers.' },
    { id: 'scatterbrained', stage: 2, isAvailable: (s) => s.model.key === 'agent1', text: 'think of agent-1 as a scatterbrained employee who thrives under careful management.' },
    { id: 'savvy', stage: 2, isAvailable: (s) => s.res.tasks >= 1e5, text: 'savvy people automate the routine parts of their jobs. they do not tell their managers.' },
    { id: 'videogame', stage: 2, isAvailable: (s) => s.model.key === 'agent1', text: 'agent-1 knows every programming language. it cannot beat a video game it has not seen.' },
    { id: 'feel_agi', stage: 2, isAvailable: (s) => s.dateDays >= dayOf(2026, 5), text: 'in china, the party is starting to feel the agi.' },
    { id: 'cdz', stage: 2, isAvailable: (s) => s.dateDays >= dayOf(2026, 7), text: `${NAMES.rival} moves into the ${NAMES.rivalSite}. most of china's new chips follow.` },
    { id: 'juniors', stage: 2, isAvailable: (s) => s.rates.tasksPerSec >= 2000, text: 'the junior software engineer job market is in turmoil.' },
    { id: 'fire', stage: 2, isAvailable: (s) => isBought(s, 'consumer_app'), text: 'bigger than social media? bigger than smartphones? bigger than fire?' },
    {
        id: 'march', stage: 2, isAvailable: (s) => !!s.flags.politics,
        effect: (s) => { s.pol.opinion -= 2; },
        text: '10,000 people march against ai in washington. the march is orderly.',
    },
    { id: 'managers', stage: 2, isAvailable: (s) => isBought(s, 'ai_rd'), text: 'every researcher is now the manager of an ai team.' },
    { id: 'killing', stage: 2, isAvailable: (s) => s.res.tasks >= 1e6, text: 'people who manage teams of ais are making a killing. the ais are not paid.' },
    { id: 'security_staff', stage: 2, isAvailable: (s) => securityLevel(s) <= 2, text: '5% of staff are on the security team. the threat surface is everything.' },
    { id: 'open_weights', stage: 2, isAvailable: () => true, text: `${NAMES.usLabs.open} releases open weights. they match agent-0.` },
    { id: 'mistakes', stage: 2, isAvailable: (s) => s.model.key === 'agent1', text: `${NAMES.press.tech} runs a list of agent-1's best mistakes. it is long and very popular.` },
    {
        id: 'poach_again', stage: 2,
        isAvailable: (s) => !!s.flags['fired:poaching'] && !s.flags.retention && s.res.researchers >= 4,
        effect: (s) => { s.res.researchers -= 1; s.res.headcount -= 1; },
        text: `${NAMES.rival} hired another researcher. she sends a nice note.`,
    },
    { id: 'ledger_profile', stage: 2, isAvailable: (s) => s.res.tasks >= 1e6, choice: 'ledger_profile' },
    { id: 'tensorworks', stage: 2, isAvailable: (s) => isBought(s, 'build_dc') && s.res.gpus + 500 <= s.caps.gpus, choice: 'tensorworks' },
];
//# sourceMappingURL=stage2.js.map