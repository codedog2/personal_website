import { clockText } from '../src/scene/clock.js';

test('clock shows 24-hour time and a dotted date, zero-padded', () => {
  expect(clockText(new Date(2026, 10, 2, 9, 5))).toEqual({ time: '09:05', date: '2026.11.02' });
  expect(clockText(new Date(2026, 0, 31, 23, 59))).toEqual({ time: '23:59', date: '2026.01.31' });
});
