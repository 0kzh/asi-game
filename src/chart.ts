// Takeoff — the capability chart: relative "IQ" over time on a log axis, with benchmarks (AI 2027 / Wait But Why staircase).

interface HistPoint { m: number; y: number; ti: number; ge: number; nu: number; }

function sampleHistory(): void {
  const h = S.hist;
  const last = h.length ? h[h.length - 1] : null;
  if (!last || S.month - last.m >= 0.2) {
    h.push({ m: S.month, y: frontierCap(), ti: rivalCap("titan"), ge: rivalCap("gestalt"), nu: rivalCap("nuwa") });
    if (h.length > 400) h.splice(1, 1);
  }
}

function drawChart(): string {
  const h = S.hist;
  const W = 290, H = 190, L = 30, R = 6, T = 8, B = 20;
  const mMax = Math.max(12, Math.ceil((S.month + 4) / 6) * 6);
  const yTop = Math.max(500, frontierCap() * 2.5, rivalCap("nuwa") * 2.5);
  const yBot = 10;
  const ly = (v: number) => T + (H - T - B) * (1 - (Math.log10(Math.max(v, yBot)) - Math.log10(yBot)) / (Math.log10(yTop) - Math.log10(yBot)));
  const lx = (m: number) => L + (W - L - R) * (m / mMax);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" class="chart" role="img" aria-label="capability over time">`;
  // benchmarks
  for (const b of BENCHMARKS) {
    if (b.cap > yTop) continue;
    const y = ly(b.cap);
    s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="bench"/>`;
    s += `<text x="${L + 2}" y="${y - 2}" class="benchLabel">${b.label}</text>`;
  }
  // years along the bottom
  for (let m = 6; m <= mMax; m += 12) {
    const x = lx(m);
    s += `<line x1="${x}" x2="${x}" y1="${T}" y2="${H - B}" class="grid"/>`;
    s += `<text x="${x}" y="${H - 6}" class="axis" text-anchor="middle">${monthYear(m)}</text>`;
  }
  s += `<line x1="${L}" x2="${L}" y1="${T}" y2="${H - B}" class="axisLine"/>`;
  s += `<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" class="axisLine"/>`;
  const series = (key: "y" | "ti" | "ge" | "nu", cls: string) => {
    const pts = h.filter(p => p[key] > 0).map(p => `${lx(p.m).toFixed(1)},${ly(p[key]).toFixed(1)}`);
    if (pts.length > 1) s += `<polyline points="${pts.join(" ")}" class="${cls}"/>`;
  };
  series("ti", "rival");
  series("ge", "rival rival2");
  series("nu", "nuwa");
  series("y", "ours");
  if (h.length) {
    const p = h[h.length - 1];
    if (p.y > 0) s += `<circle cx="${lx(p.m)}" cy="${ly(p.y)}" r="2.5" class="oursDot"/>`;
    s += `<text x="${W - R - 2}" y="${ly(Math.max(p.y, 11)) - 4}" class="label" text-anchor="end">${LAB}</text>`;
    if (p.nu > 0) s += `<text x="${W - R - 2}" y="${ly(p.nu) + 10}" class="label nuwaLabel" text-anchor="end">Nüwa</text>`;
  }
  s += `<text x="4" y="${T + 6}" class="axis" transform="rotate(-90 8 ${T + 50})">capability</text>`;
  s += `</svg>`;
  return s;
}
