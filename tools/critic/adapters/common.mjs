// Shared helpers for critic adapters.
//
// installHelpers(page, {seed}) registers an init script (runs before any game
// script, on every navigation) that defines window.__critic with small DOM
// utilities the adapters use inside page.evaluate. It never touches game state.
// If a seed is given, Math.random is replaced by a seeded mulberry32 so event
// rolls in the reference games are reproducible (timing is still real-time).

export async function installHelpers(page, { seed } = {}) {
  await page.addInitScript(({ seed }) => {
    if (seed !== undefined && seed !== null && seed !== '') {
      let a = (Number(seed) >>> 0) || 1;
      Math.random = function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const C = {
      // Rendered (takes layout space) and not visibility:hidden / opacity 0.
      // opts.ignoreVisibility: treat visibility:hidden as visible (blinking).
      vis(el, opts = {}) {
        if (!el || !el.isConnected) return false;
        if (!el.getClientRects().length) return false;
        const cs = getComputedStyle(el);
        if (cs.display === 'none') return false;
        if (!opts.ignoreVisibility && cs.visibility === 'hidden') return false;
        return true;
      },
      text(el) {
        return (el ? (el.innerText || el.textContent || '') : '').replace(/\s+/g, ' ').trim();
      },
      // Parse "1,234.5" / "$1.2M" / "3k" into a number (NaN if none).
      num(s) {
        if (s === null || s === undefined) return NaN;
        const m = String(s).replace(/,/g, '').match(/-?\d+(\.\d+)?\s*(k|m|b|t|thousand|million|billion|trillion)?/i);
        if (!m) return NaN;
        let v = parseFloat(m[0]);
        const suf = (m[2] || '').toLowerCase();
        const mult = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, b: 1e9, billion: 1e9, t: 1e12, trillion: 1e12 }[suf];
        if (mult) v *= mult;
        return v;
      },
    };
    Object.defineProperty(window, '__critic', { value: C, writable: false, configurable: false, enumerable: false });
  }, { seed: seed ?? null });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Make a list of labels unique by suffixing duplicates with " #2", " #3"...
export function uniqLabels(labels) {
  const seen = new Map();
  return labels.map((l) => {
    const n = (seen.get(l) || 0) + 1;
    seen.set(l, n);
    return n === 1 ? l : `${l} #${n}`;
  });
}
