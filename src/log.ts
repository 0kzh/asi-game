// Takeoff — the event log (A Dark Room's notification column: lowercase, terse, period-terminated, fading).

const LOG_MAX = 70;
let logDirty = true;
const pendingLines: { at: number; text: string; cls: string }[] = [];

/** Log a line now. cls: "" | "big" (bold milestone) | "warn" | "dim". */
function notify(text: string, cls = ""): void {
  if (!text) return;
  const last = text.charAt(text.length - 1);
  if (last !== "." && last !== "?" && last !== "…" && last !== "\"" && last !== ")") text += ".";
  S.log.push({ t: S.t, text, cls });
  if (S.log.length > LOG_MAX) S.log.splice(0, S.log.length - LOG_MAX);
  logDirty = true;
}

/** Log a line `delay` game-seconds from now (used for scripted sequences). Not saved: sequences are short. */
function notifyLater(delay: number, text: string, cls = ""): void {
  pendingLines.push({ at: S.t + delay, text, cls });
}

/** Log several lines spaced out, like a scene unfolding. */
function narrate(lines: string[], gap = 2.5, cls = ""): void {
  lines.forEach((ln, i) => {
    if (i === 0) notify(ln, cls);
    else notifyLater(gap * i, ln, cls);
  });
}

function flushPendingLines(): void {
  for (let i = 0; i < pendingLines.length; i++) {
    if (pendingLines[i].at <= S.t) {
      notify(pendingLines[i].text, pendingLines[i].cls);
      pendingLines.splice(i, 1);
      i--;
    }
  }
}
