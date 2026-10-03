// Smoke test: serve the repo, open /?dev=1 in headless chromium, fail on any console
// error. Clicks `complete task`, then drives the sim bot's policy through real DOM button
// clicks at ×100 until stage 2, checks a greyed project appeared, checks the chart draws,
// and jumps to every stage snapshot. Then jumps to snapshot '2' and drives the bot through
// stage 2 until the theft opens stage 3 (allocation rows, politics box, greyed projects).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAGE2_TIMEOUT_MS = 120_000;
const STAGE3_TIMEOUT_MS = 240_000;

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function waitForServer(url, ms = 10_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`server did not start: ${url}`);
}

const errors = [];
const checks = [];
function check(ok, msg) {
  checks.push(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!ok) throw new Error(msg);
}

const port = await freePort();
const server = spawn('http-server', [ROOT, '-c-1', '-p', String(port), '-a', '127.0.0.1', '-s'], { stdio: 'ignore' });
let browser;
let exitCode = 0;
try {
  const base = `http://127.0.0.1:${port}`;
  await waitForServer(`${base}/index.html`);
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`http ${r.status()} ${r.url()}`); });

  await page.goto(`${base}/?dev=1&fresh=1&seed=1`);
  await page.waitForSelector('#tasksHeader');
  check(errors.length === 0, 'page loads without console errors');

  // 30 manual clicks.
  for (let i = 0; i < 30; i++) await page.click('button[data-action="complete_task"]');
  await page.waitForTimeout(250);
  const header = await page.textContent('#tasksHeader');
  check(/Tasks Completed: 30\b/.test(header ?? ''), `tasks header updated after 30 clicks (${header})`);

  // Drive the bot policy through DOM clicks at ×100 until stage 2.
  await page.evaluate(async () => {
    const { Policy } = await import('/dist/sim/policy.js');
    const click = (id) => {
      const b = document.querySelector(`button[data-action="${CSS.escape(id)}"]`);
      if (!b || b.disabled || b.closest('[hidden]')) return false;
      b.click();
      return true;
    };
    const policy = new Policy(click);
    window.game.dev.setSpeed(100);
    let lastT = -1;
    window.__bot = setInterval(() => {
      const s = window.game.state;
      if (Math.floor(s.t) === lastT) return; // once per sim second
      lastT = Math.floor(s.t);
      policy.second(s);
      for (const k of [0, 3, 5, 8]) policy.tick(window.game.state, k);
    }, 4);
  });
  const t0 = Date.now();
  let sawDisabledProject = false;
  let stage = 1;
  while (Date.now() - t0 < STAGE2_TIMEOUT_MS) {
    await page.waitForTimeout(250);
    if (!sawDisabledProject) sawDisabledProject = (await page.locator('.projectButton:disabled').count()) > 0;
    stage = await page.evaluate(() => window.game.state.stage);
    if (stage >= 2) break;
  }
  const simT = await page.evaluate(() => window.game.state.t);
  await page.evaluate(() => { clearInterval(window.__bot); window.game.dev.setSpeed(1); });
  check(stage >= 2, `reached stage 2 in ${((Date.now() - t0) / 1000).toFixed(1)} s real (${Math.floor(simT / 60)}:${String(Math.floor(simT % 60)).padStart(2, '0')} sim)`);
  check(sawDisabledProject, 'a greyed .projectButton:disabled was on screen');
  const shipped = await page.locator('.logLine', { hasText: 'agent-1 shipped in' }).count();
  check(shipped > 0, 'log shows "agent-1 shipped in M:SS."');

  // Save from the footer, reload without ?fresh, and the run continues where it was.
  const before = await page.evaluate(() => ({ tasks: Math.floor(window.game.state.res.tasks), stage: window.game.state.stage, order: window.game.state.projectOrder.join(',') }));
  await page.click('#menuSave');
  await page.goto(`${base}/?dev=1`);
  await page.waitForSelector('#tasksHeader');
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ tasks: Math.floor(window.game.state.res.tasks), stage: window.game.state.stage, order: window.game.state.projectOrder.join(',') }));
  // Reveals only append (stage 2 reveals projects on its first slow tick), so the saved order must be a prefix.
  check(after.stage === before.stage && after.tasks >= before.tasks && after.order.startsWith(before.order), `save → reload restores the run (stage ${after.stage}, ${after.tasks} tasks)`);
  const roundTrip = await page.evaluate(() => { const j = window.game.dev.snapshot(); window.game.dev.load(j); return window.game.dev.snapshot() === j; });
  check(roundTrip, 'dev.snapshot() → dev.load() round-trips');

  // The chart draws once its flag is set (stage 2's `chart` project may already have set it).
  await page.evaluate(() => window.game.dev.set('flags.chart', true));
  await page.waitForTimeout(300);
  const ink = await page.evaluate(() => {
    const c = document.getElementById('chart');
    if (!c || c.closest('[hidden]')) return -1;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 128 && d[i + 3] > 0) n++;
    return n;
  });
  check(ink > 50, `chart canvas draws (${ink} dark pixels)`);

  // Every stage snapshot loads and renders.
  for (const id of ['1', '2', '3', '4a', '4b', '5a', '5b']) {
    await page.evaluate((x) => window.game.dev.jumpToStage(x), id);
    await page.waitForTimeout(300);
    const h = await page.textContent('#tasksHeader');
    check(/Tasks Completed:/.test(h ?? '') && errors.length === 0, `snapshot ${id} renders without errors`);
  }

  // Stage 2: from snapshot '2', drive the bot through DOM clicks at ×100 until stage 3.
  await page.evaluate(() => window.game.dev.jumpToStage('2'));
  await page.waitForTimeout(300);
  await page.evaluate(async () => {
    const { Policy } = await import('/dist/sim/policy.js');
    const click = (id) => {
      const b = document.querySelector(`button[data-action="${CSS.escape(id)}"]`);
      if (!b || b.disabled || b.closest('[hidden]')) return false;
      b.click();
      return true;
    };
    const policy = new Policy(click);
    window.game.dev.setSpeed(100);
    let lastT = -1;
    window.__bot = setInterval(() => {
      const s = window.game.state;
      if (Math.floor(s.t) === lastT) return;
      lastT = Math.floor(s.t);
      policy.second(s);
    }, 4);
  });
  const t2 = Date.now();
  let sawAlloc = false, sawPolitics = false, sawDisabled2 = false, sawSafetyRow = false;
  stage = 2;
  while (Date.now() - t2 < STAGE3_TIMEOUT_MS) {
    await page.waitForTimeout(250);
    const seen = await page.evaluate(() => {
      const vis = (sel) => { const el = document.querySelector(sel); return !!el && !el.closest('[hidden]'); };
      return {
        alloc: vis('#allocation') && vis('button[data-action="alloc_research_up"]') && vis('button[data-action="alloc_deploy_down"]'),
        safety: vis('#alloc_safety'),
        politics: vis('#politics') && /government/.test(document.querySelector('#politics')?.textContent ?? ''),
        disabled: [...document.querySelectorAll('.projectButton:disabled')].some((b) => !b.closest('[hidden]')),
        stage: window.game.state.stage,
      };
    });
    sawAlloc ||= seen.alloc; sawPolitics ||= seen.politics; sawDisabled2 ||= seen.disabled; sawSafetyRow ||= seen.safety;
    stage = seen.stage;
    if (stage >= 3) break;
  }
  const simT3 = await page.evaluate(() => window.game.state.t);
  await page.evaluate(() => { clearInterval(window.__bot); window.game.dev.setSpeed(1); });
  check(stage >= 3, `reached stage 3 from snapshot 2 in ${((Date.now() - t2) / 1000).toFixed(1)} s real (${Math.floor(simT3 / 60)}:${String(Math.floor(simT3 % 60)).padStart(2, '0')} sim)`);
  check(sawAlloc, 'the allocation rows rendered (deployment / research [−][+])');
  check(sawSafetyRow, 'the safety row appeared after alignment evals');
  check(sawPolitics, 'the politics box rendered (government / public / security)');
  check(sawDisabled2, 'a greyed .projectButton:disabled was on screen in stage 2');
  const theftLine = await page.locator('.logLine', { hasText: 'deepcent has agent-2. the race is no longer a metaphor.' }).count();
  check(theftLine > 0, 'log shows the stage-2 exit line');

  check(errors.length === 0, 'no console errors or page errors overall');
} catch (e) {
  exitCode = 1;
  console.error(`\nsmoke test failed: ${e.message}`);
  if (errors.length) console.error(errors.join('\n'));
} finally {
  if (browser) await browser.close();
  server.kill();
}
console.log(exitCode ? '\nFAIL' : '\nPASS');
process.exit(exitCode);
