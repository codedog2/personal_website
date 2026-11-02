import { parsePop, popCity, estimateMbps, connectionQuality, greetingLines, gatherGreetingData } from '../src/core/greeting.js';

test('parsePop reads the edge code from a Fastly x-served-by header', () => {
  expect(parsePop('cache-tyo11939-TYO')).toBe('TYO');
  expect(parsePop('cache-sjc10045-SJC, cache-nrt-rjtf7700080-NRT')).toBe('NRT');
  expect(parsePop(null)).toBe(null);
  expect(parsePop('garbage')).toBe(null);
});

test('popCity names common edges and falls back to the code', () => {
  expect(popCity('TYO')).toBe('Tokyo');
  expect(popCity('HKG')).toBe('Hong Kong');
  expect(popCity('ZZZ')).toBe('ZZZ');
});

test('estimateMbps from a resource timing entry; ignores tiny or cached transfers', () => {
  expect(estimateMbps({ transferSize: 1_000_000, duration: 800 })).toBeCloseTo(10, 5);
  expect(estimateMbps({ transferSize: 300, duration: 5 })).toBe(null);
  expect(estimateMbps({ transferSize: 0, duration: 40 })).toBe(null);
});

test('connectionQuality', () => {
  expect(connectionQuality({ mbps: 40, rttMs: 60 })).toBe('nice');
  expect(connectionQuality({ mbps: 2, rttMs: 60 })).toBe('poor');
  expect(connectionQuality({ mbps: 40, rttMs: 600 })).toBe('poor');
  expect(connectionQuality({ mbps: null, rttMs: null })).toBe('unknown');
});

test('greetingLines: time-of-day greeting, labelled facts, and a face', () => {
  const lines = greetingLines({ hour: 21, city: 'Tokyo', isp: 'KDDI', mbps: 42.37, pop: 'TYO', quality: 'nice' }, 'en');
  expect(lines[0]).toMatch(/^Good evening, visitor from Tokyo/);
  expect(lines.join('\n')).toContain('KDDI');
  expect(lines.join('\n')).toContain('42.4 Mbps');
  expect(lines.join('\n')).toContain('Tokyo (TYO)');
  expect(lines.at(-1)).toMatch(/nice connection.*:\)/i);
});

test('greetingLines never shows undefined/null when lookups failed', () => {
  const lines = greetingLines({ hour: 9, city: null, isp: null, mbps: null, pop: null, quality: 'unknown' }, 'zh');
  const text = lines.join('\n');
  expect(text).not.toMatch(/undefined|null|NaN/);
  expect(lines[0]).toMatch(/早上好/);
});

test('gatherGreetingData combines the IP lookup, the edge header and resource timing; survives failures', async () => {
  const fetchImpl = vi.fn(async (url, opts) => {
    if (String(url).includes('ipapi')) return { ok: true, json: async () => ({ city: 'Osaka', org: 'NTT Communications' }) };
    if (opts?.method === 'HEAD') return { ok: true, headers: new Headers({ 'x-served-by': 'cache-itm-ITM' }) };
    throw new Error('unexpected');
  });
  const perf = { now: (() => { let t = 0; return () => (t += 50); })(), getEntriesByType: () => [{ name: 'https://x/models/lamp.glb', transferSize: 600_000, duration: 400 }] };
  const d = await gatherGreetingData({ fetchImpl, perf, nav: {}, href: 'https://x/', now: new Date(2026, 0, 1, 14) });
  expect(d).toMatchObject({ city: 'Osaka', isp: 'NTT Communications', pop: 'ITM', hour: 14 });
  expect(d.mbps).toBeCloseTo(12, 5);
  expect(d.quality).toBe('nice');

  const broken = await gatherGreetingData({ fetchImpl: async () => { throw new Error('offline'); }, perf: { now: () => 0, getEntriesByType: () => [] }, nav: {}, href: 'https://x/', now: new Date(2026, 0, 1, 23) });
  expect(broken).toMatchObject({ city: null, isp: null, pop: null, mbps: null });
});
