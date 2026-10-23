// Measures the hydration of any page of the experiment branch, from the counters on
// globalThis.__graphExp. Usage: node solid-app.mjs <label> <url> [runs]
import playwright from '/Users/alexis/Documents/GitHub/brumate/node_modules/.pnpm/playwright-core@1.64.1/node_modules/playwright-core/index.js';
import { findChrome } from '/Users/alexis/Documents/GitHub/brumate/benchmarks/harness/chrome.mjs';
const { chromium } = playwright;
const [label, url, runs = '7'] = process.argv.slice(2);
const browser = await chromium.launch({ ...findChrome(), headless: true });
const results = [];
let errors = [];
for (let i = 0; i < Number(runs); i++) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  // Streamed sections hydrate after the shell, so wait for the page to settle.
  await page.waitForTimeout(2000);
  results.push(await page.evaluate(() => ({ ...(globalThis.__graphExp || {}), responseEnd: performance.getEntriesByType('navigation')[0].responseEnd, html: document.documentElement.outerHTML.length })));
  await context.close();
}
await browser.close();
const median = (key) => { const v = results.map((r) => r[key] || 0).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
const h = median('hydrateMs'), d = median('dataMs'), n = median('nodesMs'), e = median('effectMs'), t = median('traceMs');
const r = results[0];
if (process.env.TOP) for (const [ms, kind, src] of (r.top || []).sort((a, b) => b[0] - a[0]).slice(0, 6)) console.log(`   ${ms} ms ${kind}: ${src}`);
const share = (x) => (h ? ((x / h) * 100).toFixed(0) : '-') + '%';
console.log(`${label}: hydrate ${h.toFixed(1)} ms | memos with data ${r.dataComputes || 0}: ${d.toFixed(1)} ms (${share(d)}) | memos with nodes ${r.nodesComputes || 0}: ${n.toFixed(1)} ms (${share(n)}) | effects ${r.effectComputes || 0}: ${e.toFixed(1)} ms (${share(e)}) | traces ${r.traces || 0} ${t.toFixed(1)} ms | done at ${median('doneAt').toFixed(0)} ms | errors ${new Set(errors).size ? [...new Set(errors)].join(' / ') : 0}`);
