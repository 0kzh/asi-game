// Takeoff — boot and the main loop.

function boot(): void {
  const params = new URLSearchParams(location.search);
  if (params.has("fresh")) wipeSave();
  if (params.has("nosave")) saveDisabled = true;
  const loaded = loadGame();
  buildUI();
  buildDev();
  if (!loaded) { S = newState(); }
  logDirty = true;
  if (params.has("dev")) toggleDev(true);
  if (params.has("stage")) jumpToStage(Number(params.get("stage")));
  document.addEventListener("keydown", e => {
    if (e.key === "`" || e.key === "~") toggleDev();
    if (S.activeEvent && /^[1-9]$/.test(e.key)) { chooseEventOption(Number(e.key) - 1); refreshNow(); }
  });
  updateUI();
  $("cover").style.display = "none";

  let last = performance.now();
  let acc = 0;
  setInterval(() => {
    const now = performance.now();
    acc += Math.min(1000, now - last) / 1000;
    last = now;
    let steps = 0;
    while (acc >= TICK && steps < 40) {
      acc -= TICK;
      steps++;
      for (let i = 0; i < devSpeed; i++) {
        tick(TICK);
        sampleMetrics(TICK);
        if (S.activeEvent) break;
      }
    }
    updateUI();
    saveGame();
  }, 100);
  window.addEventListener("beforeunload", () => saveGame(true));
}

document.addEventListener("DOMContentLoaded", boot);
