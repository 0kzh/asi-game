/** Rival capability follows the calendar: ~1.0 in jul 2025, +0.9 per year, until S2+ content takes over. */
export function rivalTick(s, _dt) {
    const scheduled = 1.0 + (s.dateDays / 365) * 0.9;
    if (scheduled > s.rival.capability)
        s.rival.capability = scheduled;
}
//# sourceMappingURL=rival.js.map