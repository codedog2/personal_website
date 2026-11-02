import { introSchedule, runIntro } from '../src/intro/intro.js';
import { readPref } from '../src/core/prefs.js';
import { t } from '../src/core/i18n.js';

beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); });
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });
const opts = (o = {}) => ({ ready: Promise.resolve(), seen: false, lang: 'en', reducedMotion: false, ...o });
const mk = () => { const r = document.createElement('div'); document.body.append(r); return r; };

test('first visit lasts 4–6 s, returning visit ≤ 1.8 s', () => {
  const a = introSchedule(false);
  expect(a.end).toBeGreaterThanOrEqual(4000); expect(a.end).toBeLessThanOrEqual(6000);
  expect(a.typeStart).toBeLessThan(a.typeEnd); expect(a.answerAt).toBeLessThan(a.end);
  expect(introSchedule(true).end).toBeLessThanOrEqual(1800);
});

test('skip resolves immediately', async () => {
  const root = mk(); let done = false;
  runIntro(root, opts()).then(() => { done = true; });
  root.querySelector('[data-skip]').click();
  await vi.advanceTimersByTimeAsync(700);
  expect(done).toBe(true);
});

test('holds on last frame until ready, showing loading hint', async () => {
  const root = mk(); let release; const ready = new Promise(r => { release = r; }); let done = false;
  runIntro(root, opts({ ready })).then(() => { done = true; });
  await vi.advanceTimersByTimeAsync(introSchedule(false).end + 500);
  expect(done).toBe(false);
  expect(root.querySelector('.intro-loading').hidden).toBe(false);
  release();
  await vi.runAllTimersAsync();
  expect(done).toBe(true);
});

test('a failed ready promise still ends the intro', async () => {
  const root = mk(); let done = false;
  runIntro(root, opts({ ready: Promise.reject(new Error('x')) })).then(() => { done = true; });
  await vi.runAllTimersAsync();
  expect(done).toBe(true);
});

test('question text follows language', () => {
  const root = mk(); runIntro(root, opts({ lang: 'zh' }));
  expect(root.querySelector('.intro-q').dataset.text).toBe(t('intro.question', 'zh'));
});

test('marks intro as seen and removes itself', async () => {
  const root = mk();
  const p = runIntro(root, opts());
  await vi.runAllTimersAsync(); await p;
  expect(readPref('introSeen', false)).toBe(true);
  expect(root.querySelector('.intro')).toBeNull();
});

test('skip before loading finishes holds on the loading frame instead of revealing a blank page', async () => {
  const root = mk(); let release; const ready = new Promise(r => { release = r; }); let done = false;
  runIntro(root, opts({ ready })).then(() => { done = true; });
  root.querySelector('[data-skip]').click();
  await vi.advanceTimersByTimeAsync(1000);
  expect(done).toBe(false);
  expect(root.querySelector('.intro-loading').hidden).toBe(false);
  expect(root.querySelector('.intro-q').textContent).toBe(t('intro.question', 'en'));
  release(); await vi.runAllTimersAsync();
  expect(done).toBe(true);
});

test('beforeReveal runs once, just before the overlay fades (so the scene can be set up underneath)', async () => {
  const root = mk(); const beforeReveal = vi.fn(); let done = false;
  runIntro(root, opts({ beforeReveal })).then(() => { done = true; });
  await vi.advanceTimersByTimeAsync(introSchedule(false).end + 10);
  expect(beforeReveal).toHaveBeenCalledTimes(1);
  expect(root.querySelector('.intro')).not.toBeNull();     // still covering the scene
  await vi.runAllTimersAsync();
  expect(done).toBe(true); expect(beforeReveal).toHaveBeenCalledTimes(1);
});
