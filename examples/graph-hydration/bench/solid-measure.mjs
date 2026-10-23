// Measures how much of Solid 2.0 hydration goes to computes and trace runs, from the counters
// that the experiment branch puts on globalThis.__graphExp. Usage: node solid-measure.mjs <label> [runs]
import playwright from 'playwright-core';
const { chromium } = playwright;
import { findChrome } from './chrome.mjs';
const [label, runs = '9'] = process.argv.slice(2);
const browser = await chromium.launch({ ...findChrome(), headless: true });
const results = [];
for (let i = 0; i < Number(runs); i++) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const cdp = await context.newCDPSession(page);
  // A mid-range phone runs about 4 times slower than this machine.
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto('http://localhost:3040/', { waitUntil: 'load' });
  await page.waitForFunction(() => globalThis.__graphExp?.hydrateMs > 0, null, { timeout: 10000 });
  await page.waitForTimeout(300);
  const stats = await page.evaluate(() => ({ ...globalThis.__graphExp, responseEnd: performance.getEntriesByType('navigation')[0].responseEnd }));
  stats.clientMs = stats.doneAt - stats.responseEnd;
  if (i === 0) {
    // The page must really be hydrated: a click updates its widget.
    const widget = page.locator('.widget').first();
    const before = await widget.locator('.label').textContent();
    await widget.getByRole('button', { name: 'Run' }).click();
    await page.waitForTimeout(200);
    stats.check = before !== (await widget.locator('.label').textContent()) ? 'click updates' : 'NOT HYDRATED';
  }
  stats.errors = errors.length;
  results.push(stats);
  await context.close();
}
await browser.close();
const median = (key) => { const v = results.map((r) => r[key] || 0).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
const done = median('doneAt'), resp = median('responseEnd'), client = median('clientMs'), h = median('hydrateMs'), d = median('dataMs'), n = median('nodesMs'), t = median('traceMs');
const r = results[0];
console.log(`${label}: hydrated at ${done.toFixed(0)} ms (response ${resp.toFixed(0)} ms, then client ${client.toFixed(0)} ms) | hydrate ${h.toFixed(1)} ms | data computes ${r.dataComputes} own ${d.toFixed(1)} ms (${((d / h) * 100).toFixed(0)}%) | node computes ${r.nodesComputes} own ${n.toFixed(1)} ms (${((n / h) * 100).toFixed(0)}%) | adopted ${r.adopted || 0} | traces ${r.traces || 0} taking ${t.toFixed(1)} ms (${((t / h) * 100).toFixed(0)}%) | ${r.check}, errors ${r.errors}`);
