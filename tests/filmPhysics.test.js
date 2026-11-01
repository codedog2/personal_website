import { createFilm, dragStart, dragMove, dragEnd, wheel, nudge, goTo, stepFilm, filmIndex, isSettled } from '../src/scene/filmPhysics.js';

const run = (f, s = 3) => { for (let i = 0; i < s * 60; i++) stepFilm(f, 1 / 60); };
const film = () => createFilm({ count: 4, pitch: 1.2 });

test('starts on the first frame, settled', () => {
  const f = film();
  expect(f.offset).toBe(0); expect(f.min).toBe(0); expect(f.max).toBeCloseTo(3.6);
  expect(filmIndex(f)).toBe(0); expect(isSettled(f)).toBe(true);
});

test('release after slow drag snaps to nearest frame', () => {
  const f = film(); dragStart(f); dragMove(f, -0.8, 0.5); dragEnd(f); run(f);
  expect(filmIndex(f)).toBe(1);
  expect(Math.abs(f.offset - 1.2)).toBeLessThan(0.01);
  expect(isSettled(f)).toBe(true);
});

test('flick coasts further than a slow drag', () => {
  const f = film(); dragStart(f); dragMove(f, -0.5, 0.05); dragEnd(f); run(f);
  expect(filmIndex(f)).toBeGreaterThanOrEqual(2);
});

test('settle bounce stays small', () => {
  const f = film(); nudge(f, 1); let peak = 0;
  for (let i = 0; i < 180; i++) { stepFilm(f, 1 / 60); peak = Math.max(peak, f.offset); }
  expect(peak - 1.2).toBeGreaterThan(0);
  expect(peak - 1.2).toBeLessThan(0.12);
});

test('ends clamp and rubber-band back', () => {
  const f = film(); dragStart(f); dragMove(f, 3, 0.5);
  expect(f.offset).toBeLessThan(0);
  expect(f.offset).toBeGreaterThan(-3 * 0.36);
  dragEnd(f); run(f);
  expect(filmIndex(f)).toBe(0);
  nudge(f, -1); run(f);
  expect(filmIndex(f)).toBe(0);
});

test('wheel scrolls and is bounded', () => {
  const f = film(); for (let i = 0; i < 50; i++) wheel(f, 500); run(f, 5);
  expect(filmIndex(f)).toBe(3);
  expect(f.offset).toBeLessThanOrEqual(f.max + 0.01);
});

test('nudge twice from rest moves two frames; goTo jumps', () => {
  const f = film(); nudge(f, 1); nudge(f, 1); run(f);
  expect(filmIndex(f)).toBe(2);
  goTo(f, 0); run(f);
  expect(filmIndex(f)).toBe(0);
  goTo(f, 99); run(f);
  expect(filmIndex(f)).toBe(3);
});
