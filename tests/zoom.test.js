import { zoomDistance, easeInOutCubic, loadTimeline, unloadTimeline } from '../src/scene/zoom.js';

const tanHalf = Math.tan((34 / 2) * Math.PI / 180);

test('zoomDistance gives 75% width on 16:9', () => {
  const d = zoomDistance({ bezelW: 2.62, bezelH: 1.82, fovDeg: 34, aspect: 16 / 9, cover: 0.75, maxHeightCover: 0.94 });
  const visW = 2 * d * tanHalf * (16 / 9);
  expect(2.62 / visW).toBeCloseTo(0.75, 3);
});

test('zoomDistance caps height on narrow aspect', () => {
  const d = zoomDistance({ bezelW: 2.62, bezelH: 1.82, fovDeg: 34, aspect: 4 / 3, cover: 0.75, maxHeightCover: 0.9 });
  expect(1.82 / (2 * d * tanHalf)).toBeLessThanOrEqual(0.9 + 1e-9);
});

test('zoomDistance on ultra-wide still keeps height in bounds', () => {
  const d = zoomDistance({ bezelW: 2.62, bezelH: 1.82, fovDeg: 34, aspect: 21 / 9, cover: 0.75, maxHeightCover: 0.9 });
  expect(1.82 / (2 * d * tanHalf)).toBeLessThanOrEqual(0.9 + 1e-9);
});

test('easeInOutCubic endpoints and midpoint', () => {
  expect(easeInOutCubic(0)).toBe(0); expect(easeInOutCubic(1)).toBe(1); expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
});

test('timelines start and end correctly', () => {
  expect(loadTimeline(0)).toEqual({ knob: 0, zoom: 0, done: false });
  expect(loadTimeline(1.5)).toMatchObject({ knob: 1, zoom: 1, done: true });
  expect(unloadTimeline(0)).toMatchObject({ knob: 1, zoom: 1, done: false });
  expect(unloadTimeline(1.1)).toMatchObject({ knob: 0, zoom: 0, done: true });
});

test('knob turns before the camera moves', () => {
  const mid = loadTimeline(0.2);
  expect(mid.knob).toBeGreaterThan(0); expect(mid.zoom).toBe(0);
});
