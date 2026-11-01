import { basePath, CONFIG } from '../src/config.js';

test('basePath defaults to root and normalises slashes', () => {
  expect(basePath({})).toBe('/');
  expect(basePath({ BASE_PATH: 'portfolio' })).toBe('/portfolio/');
  expect(basePath({ BASE_PATH: '/portfolio/' })).toBe('/portfolio/');
});

test('screen cover is 0.75', () => {
  expect(CONFIG.SCREEN_COVER).toBe(0.75);
});
