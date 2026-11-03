import { CONFIG } from '../src/config.js';

const { ARC, STOPS } = CONFIG.KNOBS;

test('every knob stop sits on the engraved arc, above the knob', () => {
  for (const group of Object.values(STOPS)) for (const a of Object.values(group)) {
    expect(Math.abs(a)).toBeLessThanOrEqual(ARC);
    expect(ARC).toBeLessThan(Math.PI / 2);          // the arc is on the upper half of the dial
  }
});

test('stops are spread far enough apart to read, and in order left to right', () => {
  const { en, zh, ja } = STOPS.lang, { view, load } = STOPS.load;
  expect(en).toBeLessThan(zh); expect(zh).toBeLessThan(ja);
  expect(view).toBeLessThan(load);
  expect(Math.min(zh - en, ja - zh, load - view)).toBeGreaterThan(0.45);
});
