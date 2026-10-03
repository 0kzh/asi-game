#!/usr/bin/env node
// Critic harness: serve a game, jump to a stage, run a greedy bot for M real
// minutes and record one observation per second.
//
//   node tools/critic/harness.mjs --game paperclips|adarkroom|takeoff --stage N \
//        --minutes M --speed S --out results/<name>.json [--seed K]
//        [--clicks N] [--shots] [--headed] [--server builtin|http-server] [--port P]
//
// Writes <out> (meta + samples + metrics + errors), <out minus .json>.md and a
// final screenshot <out minus .json>.png. Dependencies: node 22 + the global
// playwright; http-server if on PATH (else a built-in static server).

import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installHelpers, sleep } from './adapters/common.mjs';
import { computeMetrics, toMarkdown } from './metrics.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const a = { game: null, stage: null, minutes: 5, speed: 1, out: null, seed: null, clicks: null, shots: false, headed: false, server: null, port: 0 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => argv[++i];
    switch (k) {
      case '--game': a.game = v(); break;
      case '--stage': a.stage = v(); break;
      case '--minutes': a.minutes = parseFloat(v()); break;
      case '--speed': a.speed = parseFloat(v()); break;
      case '--out': a.out = v(); break;
      case '--seed': a.seed = v(); break;
      case '--clicks': a.clicks = parseInt(v(), 10); break;
      case '--shots': a.shots = true; break;
      case '--headed': a.headed = true; break;
      case '--server': a.server = v(); break;
      case '--port': a.port = parseInt(v(), 10); break;
      case '-h': case '--help': a.help = true; break;
      default: throw new Error(`unknown argument ${k}`);
    }
  }
  return a;
}

const USAGE = `usage: node tools/critic/harness.mjs --game paperclips|adarkroom|takeoff --stage N --minutes M --speed S --out results/<name>.json [--seed K] [--clicks N] [--shots] [--headed]`;

async function freePort() {
  return new Promise((resolve, reject) => {
    const s = createNetServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
  });
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.flac': 'audio/flac', '.ogg': 'audio/ogg', '.map': 'application/json', '.woff': 'font/woff', '.woff2': 'font/woff2' };

function builtinServer(dir, port) {
  const srv = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(dir, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
      if (!file.startsWith(path.resolve(dir))) { res.writeHead(403).end(); return; }
      const st = await stat(file);
      if (st.isDirectory()) { res.writeHead(302, { Location: p + '/' }).end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(await readFile(file));
    } catch { res.writeHead(404).end('not found'); }
  });
  return new Promise((resolve) => srv.listen(port, '127.0.0.1', () => resolve({ kind: 'builtin', close: () => srv.close() })));
}

async function startServer(dir, port, prefer) {
  let hasHttpServer = false;
  try { execSync('command -v http-server', { stdio: 'ignore', shell: '/bin/sh' }); hasHttpServer = true; } catch {}
  if (prefer !== 'builtin' && hasHttpServer) {
    const child = spawn('http-server', [dir, '-p', String(port), '-a', '127.0.0.1', '-c-1', '-s'], { stdio: 'ignore' });
    const url = `http://127.0.0.1:${port}/`;
    for (let i = 0; i < 100; i++) {
      try { const r = await fetch(url); if (r.status < 500) return { kind: 'http-server', close: () => child.kill() }; } catch {}
      await sleep(100);
    }
    child.kill();
    console.warn('[critic] http-server did not come up; falling back to built-in server');
  }
  return builtinServer(dir, port);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.game || !args.out) { console.log(USAGE); process.exit(args.help ? 0 : 2); }
  const adapter = await import(path.join(HERE, 'adapters', `${args.game}.mjs`));
  const stageIds = Object.keys(adapter.stages);
  const stage = String(args.stage ?? stageIds[0]);
  if (!stageIds.includes(stage)) throw new Error(`${args.game}: unknown stage ${stage}; known: ${stageIds.join(', ')}`);
  const outFile = path.resolve(args.out);
  const outBase = outFile.replace(/\.json$/, '');
  await mkdir(path.dirname(outFile), { recursive: true });

  await stat(path.join(adapter.serveDir, adapter.entryPath.split('?')[0])).catch(() => {
    throw new Error(`${args.game}: entry ${adapter.entryPath} not found in ${adapter.serveDir}`);
  });
  const port = args.port || await freePort();
  const server = await startServer(adapter.serveDir, port, args.server);
  const url = `http://127.0.0.1:${port}/${adapter.entryPath}`;
  console.log(`[critic] ${args.game} stage ${stage} (${adapter.stages[stage]}) → ${url} via ${server.kind}`);

  const browser = await chromium.launch({ headless: !args.headed, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  // Only the local server is reachable: external CDNs/analytics are aborted so
  // fallbacks (e.g. A Dark Room's local jQuery) load immediately.
  await context.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith(`http://127.0.0.1:${port}/`) || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => { if (errors.length < 200) errors.push({ t: null, type: 'pageerror', text: String(e && e.message || e) }); });
  page.on('console', (m) => {
    // net::ERR_FAILED is our own abort of external CDNs/analytics (see route above)
    if (m.type() === 'error' && errors.length < 200 && !/^Failed to load resource: net::ERR_FAILED/.test(m.text())) errors.push({ t: null, type: 'console', text: m.text() });
  });
  page.on('requestfailed', (r) => {
    if (r.url().startsWith(`http://127.0.0.1:${port}/`) && errors.length < 200) errors.push({ t: null, type: 'requestfailed', text: `${r.url()} ${r.failure()?.errorText || ''}` });
  });
  await installHelpers(page, { seed: args.seed });

  let finished = false;
  const samples = [];
  const meta = {
    game: args.game, stage, stageLabel: adapter.stages[stage], minutes: args.minutes, speed: args.speed,
    effectiveSpeed: 1, seed: args.seed, url, sampleSeconds: 1, startedAt: new Date().toISOString(),
    speedControl: adapter.speedControl || null, jumpNotes: [], botOptions: null, harnessVersion: 1,
  };

  async function finish(reason) {
    if (finished) return; finished = true;
    meta.endedAt = new Date().toISOString();
    meta.endReason = reason;
    try { await page.screenshot({ path: outBase + '.png', fullPage: true }); } catch {}
    const metrics = computeMetrics(samples, meta);
    const result = { meta, metrics, errors, samples };
    await writeFile(outFile, JSON.stringify(result, null, 1));
    await writeFile(outBase + '.md', toMarkdown(metrics, meta));
    try { await browser.close(); } catch {}
    try { server.close(); } catch {}
    console.log(`[critic] wrote ${outFile} (${samples.length} samples, ${errors.length} page errors) and ${outBase}.md`);
  }
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, async () => { console.log(`\n[critic] ${sig}, writing partial results`); await finish('interrupted'); process.exit(130); });

  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    if (adapter.ready) await adapter.ready(page);
    const jump = await adapter.jumpToStage(page, stage, { seed: args.seed });
    meta.jumpNotes = (jump && jump.notes) || [];
    if (adapter.setSpeed) meta.effectiveSpeed = await adapter.setSpeed(page, args.speed);
    else if (args.speed !== 1) console.warn(`[critic] ${args.game} has no speed control; running real time`);
    const botOpts = { ...(adapter.botDefaults || {}) };
    if (args.clicks !== null) botOpts.clicks = args.clicks;
    meta.botOptions = botOpts;
    for (const e of errors) e.t = e.t ?? -1;  // errors before the run started

    const total = Math.round(args.minutes * 60);
    const t0 = Date.now();
    if (args.shots) await mkdir(outBase + '-shots', { recursive: true });
    for (let i = 0; i < total; i++) {
      const due = t0 + i * 1000;
      const wait = due - Date.now();
      if (wait > 0) await sleep(wait);
      let s;
      try { s = await adapter.observe(page); } catch (e) { s = { error: String(e.message || e), enabledButtons: [], disabledGoals: [], panels: [], modalOpen: false, progressRunning: false, headline: '', logTail: [] }; }
      s.t = i;
      s.wall = Math.round((Date.now() - t0) / 100) / 10;
      for (const e of errors) if (e.t === null) e.t = i;
      try { s.acted = await adapter.act(page, s, botOpts); } catch (e) { s.acted = []; s.actError = String(e.message || e); }
      samples.push(s);
      if (args.shots && i % 60 === 0) await page.screenshot({ path: path.join(outBase + '-shots', `${String(i / 60).padStart(2, '0')}m.png`) }).catch(() => {});
      if (i % 60 === 59 || i === total - 1) {
        console.log(`[critic] ${Math.floor((i + 1) / 60)}:${String((i + 1) % 60).padStart(2, '0')}  ${s.headline}  enabled=${s.enabledButtons.length} goals=${(s.disabledGoals || []).length} panels=${s.panels.length}${s.gameT !== undefined ? ` gameT=${Math.round(s.gameT)}s` : ''}`);
      }
    }
    await finish('completed');
  } catch (e) {
    errors.push({ t: samples.length, type: 'harness', text: String(e && e.stack || e) });
    console.error('[critic] error:', e);
    await finish('error');
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
