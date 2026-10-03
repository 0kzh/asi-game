// Screenshot each stage snapshot (dev rewind) for visual review: node tools/shots.mjs [outdir] [stages=1,2,3,4,5]
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "/opt/node-tools/node_modules/playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] || "/tmp";
const stages = (process.argv[3] || "1,2,3,4").split(",");
const width = Number(process.env.W || 1280);
const browser = await chromium.launch();
for (const st of stages) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto("file://" + root + "/index.html?nosave&stage=" + st);
  await page.waitForTimeout(400);
  // advance a little so panels populate, closing any event
  await page.evaluate(() => { for (let i = 0; i < 60; i++) { if (TAKEOFF.state.activeEvent) TAKEOFF.choose(0); TAKEOFF.tick(10); } });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/stage${st}_${width}.png`, fullPage: true });
  console.log("stage", st, "errors:", errors.length ? errors : "none");
  await page.close();
}
await browser.close();
