import { readPref, writePref } from '../src/core/prefs.js';

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

test('prefs round-trip', () => {
  writePref('lang', 'ja');
  expect(readPref('lang', 'en')).toBe('ja');
});

test('missing pref returns fallback', () => {
  expect(readPref('view', '3d')).toBe('3d');
});

test('prefs survive a throwing localStorage', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  expect(() => writePref('view', '2d')).not.toThrow();
  expect(readPref('view', '3d')).toBe('3d');
});

test('corrupt stored value returns fallback', () => {
  localStorage.setItem('oa:introSeen', '{not json');
  expect(readPref('introSeen', false)).toBe(false);
});
