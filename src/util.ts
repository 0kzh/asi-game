// Takeoff — shared helpers. Compiled as a global script (no modules) so the game runs from file://.

const SUFFIXES: [number, string][] = [
  [1e63, "vigintillion"], [1e60, "novemdecillion"], [1e57, "octodecillion"], [1e54, "septendecillion"],
  [1e51, "sexdecillion"], [1e48, "quindecillion"], [1e45, "quattuordecillion"], [1e42, "tredecillion"],
  [1e39, "duodecillion"], [1e36, "undecillion"], [1e33, "decillion"], [1e30, "nonillion"],
  [1e27, "octillion"], [1e24, "septillion"], [1e21, "sextillion"], [1e18, "quintillion"],
  [1e15, "quadrillion"], [1e12, "trillion"], [1e9, "billion"], [1e6, "million"],
];

/** Paperclips-style number cruncher: exact with commas below a million, words above. */
function fmt(n: number, dec = 0): string {
  if (!isFinite(n)) return "∞";
  const neg = n < 0;
  const a = Math.abs(n);
  let out: string;
  if (a >= 1e6) {
    out = a.toExponential(2);
    for (const [v, word] of SUFFIXES) {
      if (a >= v) { out = (a / v).toFixed(2) + " " + word; break; }
    }
  } else if (dec > 0 && a < 1000) {
    out = a.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  } else {
    out = Math.floor(a).toLocaleString("en-US");
  }
  return (neg ? "-" : "") + out;
}

/** Compact form used in tight spaces: 1.2k, 3.4M, 5.6B, 7.8T then words. */
function fmtShort(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a < 1000) return sign + (a < 10 && a % 1 !== 0 ? a.toFixed(1) : Math.floor(a).toString());
  if (a < 1e6) return sign + (a / 1e3).toFixed(a < 1e4 ? 1 : 0) + "k";
  if (a < 1e9) return sign + (a / 1e6).toFixed(a < 1e7 ? 1 : 0) + "M";
  if (a < 1e12) return sign + (a / 1e9).toFixed(a < 1e10 ? 1 : 0) + "B";
  if (a < 1e15) return sign + (a / 1e12).toFixed(a < 1e13 ? 1 : 0) + "T";
  return sign + fmt(a);
}

function fmtMoney(n: number): string {
  if (Math.abs(n) < 1000) return (n < 0 ? "-$" : "$") + Math.abs(n).toFixed(2);
  return (n < 0 ? "-$" : "$") + fmt(Math.abs(n));
}

function fmtMoneyShort(n: number): string {
  if (Math.abs(n) < 100) return "$" + n.toFixed(2);
  return "$" + fmtShort(n);
}

function fmtRate(n: number): string {
  if (n === 0) return "0";
  if (Math.abs(n) < 10) return n.toFixed(2);
  return fmtShort(n);
}

function fmtTokens(n: number): string {
  return fmtShort(n) + " tokens";
}

function fmtPct(x: number, dec = 0): string {
  return (x * 100).toFixed(dec) + "%";
}

function fmtTime(sec: number): string {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(h + (h === 1 ? " hour" : " hours"));
  if (m > 0) parts.push(m + (m === 1 ? " minute" : " minutes"));
  if (s > 0 || parts.length === 0) parts.push(s + (s === 1 ? " second" : " seconds"));
  return parts.join(" ");
}

function fmtClock(sec: number): string {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const mm = (h > 0 && m < 10 ? "0" : "") + m;
  return (h > 0 ? h + ":" : "") + mm + ":" + (s < 10 ? "0" : "") + s;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** month index 0 = July 2025 */
function monthLabel(m: number, long = false): string {
  const total = 6 + Math.floor(m); // July = index 6
  const y = 2025 + Math.floor(total / 12);
  const mo = ((total % 12) + 12) % 12;
  return (long ? MONTHS_LONG[mo] : MONTHS[mo]) + " " + y;
}

function monthYear(m: number): number {
  return 2025 + Math.floor((6 + Math.floor(m)) / 12);
}

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function $(id: string): HTMLElement {
  const e = document.getElementById(id);
  if (!e) throw new Error("missing element #" + id);
  return e;
}

/** Only touch the DOM when the value changed (the UI refreshes 10x a second). */
function setText(e: HTMLElement, s: string): void {
  if (e.textContent !== s) e.textContent = s;
}

function setShown(e: HTMLElement, shown: boolean): void {
  const want = shown ? "" : "none";
  if (e.style.display !== want) e.style.display = want;
}

/** Sum of a geometric series of prices: base * r^n for n in [k, k+count). */
function geoSum(base: number, r: number, k: number, count: number): number {
  if (r === 1) return base * count;
  return base * Math.pow(r, k) * (Math.pow(r, count) - 1) / (r - 1);
}
