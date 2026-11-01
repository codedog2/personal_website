import { READER, nextReader, canBrowse, routeKey } from '../src/scene/readerMachine.js';

test('reader machine happy path', () => {
  let s = READER.IDLE;
  for (const [e, want] of [['LOAD', 'loading'], ['LOADED', 'zoomed'], ['BACK', 'unloading'], ['UNLOADED', 'idle']]) {
    s = nextReader(s, e); expect(s).toBe(want);
  }
});

test('reader machine ignores events outside their state', () => {
  expect(nextReader('loading', 'LOAD')).toBe('loading');
  expect(nextReader('loading', 'BACK')).toBe('loading');
  expect(nextReader('unloading', 'LOAD')).toBe('unloading');
  expect(nextReader('zoomed', 'LOAD')).toBe('zoomed');
  expect(nextReader('idle', 'BACK')).toBe('idle');
  expect(nextReader('idle', 'LOADED')).toBe('idle');
  expect(nextReader('idle', 'NONSENSE')).toBe('idle');
  expect(canBrowse('zoomed')).toBe(false);
  expect(canBrowse('loading')).toBe(false);
  expect(canBrowse('idle')).toBe(true);
});

test('routeKey: browsing keys only while idle', () => {
  expect(routeKey('idle', 'ArrowRight')).toBe('next');
  expect(routeKey('idle', 'ArrowLeft')).toBe('prev');
  expect(routeKey('idle', 'Enter')).toBe('load');
  expect(routeKey('loading', 'ArrowRight')).toBe(null);
  expect(routeKey('zoomed', 'ArrowLeft')).toBe(null);
});
test('routeKey: Enter while reading is swallowed so a focused control cannot bounce the reader shut', () => {
  expect(routeKey('zoomed', 'Enter')).toBe('swallow');
  expect(routeKey('loading', 'Enter')).toBe('swallow');
  expect(routeKey('zoomed', 'Escape')).toBe('back');
  expect(routeKey('unloading', 'Escape')).toBe(null);
});
