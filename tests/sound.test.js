import { createSound } from '../src/core/sound.js';

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

test('no AudioContext until enabled; calls are safe while off', () => {
  const Ctor = vi.fn(() => fakeAudioContext());
  const s = createSound(Ctor);
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
