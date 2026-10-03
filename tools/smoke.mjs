// Smoke test: load the game headless, click the opening verbs, report errors and the visible state.
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "/opt/node-tools/node_modules/playwright");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = "file://" + root + "/index.html?fresh&nosave";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(url);
await page.waitForTimeout(500);
for (let i = 0; i < 6; i++) {
  await page.click("text=complete task");
  await page.waitForTimeout(1200);
}
console.log("actions:", await page.evaluate(() => TAKEOFF.actions()));
console.log("log:", await page.evaluate(() => TAKEOFF.state.log.map(l => l.text).join(" | ")));
await page.screenshot({ path: process.argv[2] || "/tmp/takeoff-smoke.png" });
console.log("errors:", errors.length ? errors : "none");
await browser.close();
