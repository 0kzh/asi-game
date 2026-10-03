// Number, money, energy, date and time formatting. Lowercase throughout.

const NAMES = [
  '', '', '', 'billion', 'trillion', 'quadrillion', 'quintillion', 'sextillion', 'septillion',
  'octillion', 'nonillion', 'decillion',
];

/** Integer with commas; named numbers past 1e9 ("1.234 billion"). */
export function fmtInt(n: number): string {
  if (!isFinite(n)) return '∞';
  const r = Math.floor(n);
  if (Math.abs(r) < 1e9) return r.toLocaleString('en-US');
  return namedNumber(r);
}

export function namedNumber(n: number): string {
  const e = Math.floor(Math.log10(Math.abs(n)) / 3);
  if (e >= NAMES.length) return n.toExponential(2);
  const v = n / Math.pow(1000, e);
  return `${v.toFixed(3)} ${NAMES[e]}`;
}

/** Compact number: 950, 12.3k, 4.5M, 6.7B, 8.9T. */
export function fmt(n: number, digits = 1): string {
  if (!isFinite(n)) return '∞';
  const a = Math.abs(n);
  if (a < 1000) return a < 10 && n % 1 !== 0 ? n.toFixed(digits) : Math.round(n).toLocaleString('en-US');
  const units = ['k', 'M', 'B', 'T', 'Qa', 'Qi'];
  let i = -1;
  let v = n;
  while (Math.abs(v) >= 1000 && i < units.length - 1) { v /= 1000; i++; }
  return `${v.toFixed(Math.abs(v) < 100 ? digits : 0)}${units[i]}`;
}

/** $ with 2 decimals → $1.2M / $3.4B / $5.6T. */
export function fmtMoney(n: number): string {
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (a < 1e6) return `${sign}$${a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (a < 1e9) return `${sign}$${(a / 1e6).toFixed(1)}M`;
  if (a < 1e12) return `${sign}$${(a / 1e9).toFixed(1)}B`;
  return `${sign}$${(a / 1e12).toFixed(1)}T`;
}

/** Whole-dollar money for button labels: $5.00, $428, $12,400, $1.2M. */
export function fmtPrice(n: number): string {
  if (n < 100) return `$${n.toFixed(2)}`;
  if (n < 1e6) return `$${Math.ceil(n).toLocaleString('en-US')}`;
  return fmtMoney(n);
}

export function fmtRate(n: number, unit = '/s'): string {
  if (n === 0) return `0${unit}`;
  if (Math.abs(n) < 10) return `${n.toFixed(1)}${unit}`;
  return `${fmt(n)}${unit}`;
}

/** kWh → MWh → GWh → TWh. */
export function fmtEnergy(kwh: number): string {
  const a = Math.abs(kwh);
  if (a < 1e4) return `${Math.floor(kwh).toLocaleString('en-US')} kWh`;
  if (a < 1e7) return `${(kwh / 1e3).toFixed(1)} MWh`;
  if (a < 1e10) return `${(kwh / 1e6).toFixed(1)} GWh`;
  return `${(kwh / 1e9).toFixed(1)} TWh`;
}

export function fmtData(t: number): string {
  return `${t % 1 === 0 ? t : t.toFixed(1)} T`;
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december'];

/** Days since 2025-07-01 → "july 2025". */
export function fmtDate(days: number): string {
  const d = dateOf(days);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function dateOf(days: number): Date {
  return new Date(Date.UTC(2025, 6, 1) + Math.floor(days) * 86400000);
}

/** Sim seconds → M:SS (or H:MM:SS past an hour). */
export function fmtElapsed(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  return `${m}:${ss}`;
}

export function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

/** A multiplier: 1.0× … 9.9×, then whole numbers, capped for display at 2,000× (design §4.5). */
export function fmtMult(x: number): string {
  return x < 10 ? `${x.toFixed(1)}×` : `${fmtInt(Math.min(2000, x))}×`;
}
