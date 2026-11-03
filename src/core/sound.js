// Small synthesized machine sounds (Web Audio). Nothing is created until the visitor turns sound on,
// and every call is a no-op while it is off or unsupported.

export function createSound(AudioCtor = globalThis.AudioContext) {
  let ctx = null;

  const ready = () => {
    if (!api.enabled || !AudioCtor) return null;
    if (!ctx) { try { ctx = new AudioCtor(); } catch { AudioCtor = null; return null; } }
    if (ctx.state === 'suspended') ctx.resume?.();
    return ctx;
  };

  function noise(dur, freq, q, gain, when = 0) {
    const a = ready(); if (!a) return;
    const t = a.currentTime + when, n = Math.max(1, (a.sampleRate * dur) | 0);
    const buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = a.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(a.destination); src.start(t);
  }

  function tone(from, to, dur, gain, when = 0, type = 'sine') {
    const a = ready(); if (!a) return;
    const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.05);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.1);
  }

  const api = {
    enabled: false,
    setEnabled(on) { api.enabled = !!on; if (on) ready(); },
    tick() { noise(0.025, 3200, 4, 0.5); },
    clunk() { noise(0.06, 900, 2, 0.8); tone(110, 40, 0.18, 0.5, 0.01); },
    whirr() { for (let i = 0; i < 10; i++) noise(0.03, 1800 + i * 60, 6, 0.18, i * 0.07); },
    powerOn() {                // a camera-shutter / iris "click–clack": two short mechanical strokes, no electronic tone
      noise(0.025, 3200, 2, 0.5); tone(180, 90, 0.06, 0.25);
      noise(0.03, 2200, 2, 0.4, 0.11); tone(140, 70, 0.08, 0.22, 0.11);
    },
  };
  return api;
}
