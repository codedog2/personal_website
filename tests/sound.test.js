import { createSound } from '../src/core/sound.js';
import { readPref } from '../src/core/prefs.js';

afterEach(() => { localStorage.clear(); });

function fakeAudioContext() {
  const node = () => ({ connect: vi.fn(function (n) { return n; }), start: vi.fn(), stop: vi.fn(),
    frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    Q: { value: 0 }, type: '', buffer: null });
  return {
    currentTime: 0, sampleRate: 8000, destination: {}, state: 'running', resume: vi.fn(),
    createBuffer: (_c, n) => ({ getChannelData: () => new Float32Array(n) }),
    createBufferSource: node, createBiquadFilter: node, createGain: node, createOscillator: node,
  };
}

test('sound is on by default; the AudioContext waits for the first sound', () => {
  const Ctor = vi.fn(() => fakeAudioContext());
  const s = createSound(Ctor);
  expect(s.enabled).toBe(true);
  expect(Ctor).not.toHaveBeenCalled();
  s.tick();
  expect(Ctor).toHaveBeenCalledTimes(1);
});

test('turning sound off is remembered for the next visit', () => {
  const Ctor = vi.fn(() => fakeAudioContext());
  createSound(Ctor).setEnabled(false);
  expect(readPref('sound')).toBe(false);
  const s = createSound(Ctor);
  expect(s.enabled).toBe(false);
  s.tick();
  expect(Ctor).not.toHaveBeenCalled();
});

test('unlock starts audio on a gesture, only while sound is on', () => {
  const ctx = { ...fakeAudioContext(), state: 'suspended' };
  const Ctor = vi.fn(() => ctx);
  const off = createSound(Ctor, { enabled: false });
  off.unlock();
  expect(Ctor).not.toHaveBeenCalled();
  createSound(Ctor).unlock();
  expect(Ctor).toHaveBeenCalledTimes(1);
  expect(ctx.resume).toHaveBeenCalled();
});

test('no AudioContext until enabled; calls are safe while off', () => {
  const Ctor = vi.fn(() => fakeAudioContext());
  const s = createSound(Ctor, { enabled: false });
  expect(s.enabled).toBe(false);
  s.tick(); s.clunk(); s.whirr(); s.powerOn();
  expect(Ctor).not.toHaveBeenCalled();
  s.setEnabled(true);
  expect(s.enabled).toBe(true);
  s.tick(); s.clunk(); s.whirr(); s.powerOn();
  expect(Ctor).toHaveBeenCalledTimes(1);
  s.setEnabled(false); s.setEnabled(true);
  expect(Ctor).toHaveBeenCalledTimes(1);
});

test('missing Web Audio support never throws', () => {
  const s = createSound(undefined);
  expect(() => { s.setEnabled(true); s.tick(); }).not.toThrow();
});
