import { renderGreeting } from '../src/sections/greeting.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
const data = { hour: 21, city: 'Tokyo', isp: 'KDDI', mbps: 42.4, pop: 'TYO', rttMs: 40, quality: 'nice' };

test('shows a connecting line until the data arrives, then types every line out', async () => {
  const host = document.createElement('div');
  let release; const pending = new Promise(r => { release = r; });
  let done = false;
  renderGreeting(host, { lang: 'en', data: pending }).then(() => { done = true; });
  expect(host.textContent).toMatch(/connecting/i);
  release(data);
  await vi.runAllTimersAsync();
  expect(done).toBe(true);
  expect(host.textContent).toContain('Good evening, visitor from Tokyo');
  expect(host.textContent).toContain('KDDI');
  expect(host.textContent).toContain('Tokyo (TYO)');
  expect(host.textContent).toContain(':)');
  expect(host.textContent).not.toMatch(/connecting/i);
});

test('a failed lookup still produces a complete page without undefined', async () => {
  const host = document.createElement('div');
  const p = renderGreeting(host, { lang: 'ja', data: Promise.resolve(null) });
  await vi.runAllTimersAsync(); await p;
  expect(host.textContent).not.toMatch(/undefined|null|NaN/);
  expect(host.querySelectorAll('.greet-line').length).toBeGreaterThanOrEqual(4);
});

test('skipping finishes the typing immediately', async () => {
  const host = document.createElement('div');
  const page = renderGreeting(host, { lang: 'en', data: Promise.resolve(data) });
  await Promise.resolve(); await Promise.resolve();
  page.finishNow();
  expect(host.textContent).toContain('nice connection');
});
