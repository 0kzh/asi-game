import { agentSlots } from './economy.js';
import { isBought } from './projects.js';
/** Power added by earlier datacenter and energy projects (design §3.5; S3 power ceiling). */
export const POWER_ADDS = [['ppa', 0.5], ['build_dc', 0.3], ['build_dc2', 1]];
export const ROBOTS_PER_MIN = 1000;
/** S3: DeepCent closes to two months (0.35 capability) behind, at most 0.24 capability a minute. */
export const RIVAL_LAG = 0.35;
export const RIVAL_CREEP_PER_S = 0.004;
/** The defense contract: $20B, paid in tranches over 20 minutes while timed.defenseContract runs. */
export const DEFENSE_TOTAL = 2e10;
export const DEFENSE_SECONDS = 1200;
/** Before S3: 0.5 GW + 0.0005 GW per gpu + project additions. */
export function derivedPowerGw(s) {
    let gw = 0.5 + 0.0005 * s.res.gpus;
    for (const [id, add] of POWER_ADDS)
        if (isBought(s, id))
            gw += add;
    return gw;
}
/** At the S3 boundary the derivation stops: from here only projects change the capacity. */
export function freezePower(s) {
    s.caps.powerGw = Math.round(derivedPowerGw(s) * 100) / 100;
    for (const [id] of POWER_ADDS)
        if (isBought(s, id))
            s.flags[`powerAdd:${id}`] = true;
}
export function takeoffTick(s, dt) {
    if (!s.flags.stage3) {
        s.caps.powerGw = derivedPowerGw(s);
        return;
    }
    // A datacenter bought after the freeze still adds its share once.
    for (const [id, add] of POWER_ADDS) {
        if (isBought(s, id) && !s.flags[`powerAdd:${id}`]) {
            s.flags[`powerAdd:${id}`] = true;
            s.caps.powerGw += add;
        }
    }
    // The copies deploy themselves onto every slot.
    if (s.flags.autoDeploy)
        s.res.agents = agentSlots(s);
    // The auto-buyer buys 30 s of consumption at a time (50 MWh minimum).
    s.energyMkt.autoBlock = Math.max(50000, Math.round(s.rates.energyPerSec * 30));
    if (s.flags.robots)
        s.res.robots += (ROBOTS_PER_MIN / 60) * dt;
    if ((s.timed.defenseContract ?? 0) > s.t)
        s.res.funds += (DEFENSE_TOTAL / DEFENSE_SECONDS) * dt;
    if (s.stage === 3) {
        const target = s.model.capability - RIVAL_LAG;
        if (s.rival.capability < target)
            s.rival.capability = Math.min(target, s.rival.capability + RIVAL_CREEP_PER_S * dt);
    }
}
/** DeepCent gap in months: (capability − rival) × 6. */
export function rivalGapMonths(s) {
    return (s.model.capability - s.rival.capability) * 6;
}
//# sourceMappingURL=takeoff.js.map