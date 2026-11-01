// Film strip motion: drag follows the hand, release coasts with inertia, then a slightly
// under-damped spring clicks it onto the nearest frame. Pure state + functions, no three.js.
import { CONFIG } from '../config.js';

const F = CONFIG.FILM;

export function createFilm({ count, pitch = F.PITCH }) {
  return { offset: 0, vel: 0, mode: 'spring', target: 0, min: 0, max: (count - 1) * pitch, pitch, raw: 0, samples: 0 };
}

const clamp = (f, x) => Math.min(f.max, Math.max(f.min, x));
const nearest = f => clamp(f, Math.round(f.offset / f.pitch) * f.pitch);

export function dragStart(f) {
  f.mode = 'drag'; f.vel = 0; f.raw = f.offset; f.samples = 0;
}

/** worldDx: how far the pointer moved, in world units at the film's depth (right is positive). */
export function dragMove(f, worldDx, dt) {
  f.raw -= worldDx;
  let o = f.raw;
  if (o < f.min) o = f.min - (f.min - o) * F.RUBBER;
  if (o > f.max) o = f.max + (o - f.max) * F.RUBBER;
  const v = (o - f.offset) / Math.max(dt, 1e-3);
  f.vel = f.samples === 0 ? v : f.vel * 0.6 + v * 0.4;
  f.samples++;
  f.offset = o;
}

export function dragEnd(f) {
  if (Math.abs(f.vel) > F.FLICK_V) f.mode = 'coast';
  else { f.mode = 'spring'; f.target = nearest(f); }
}

export function wheel(f, delta) {
  if (f.mode === 'drag') return;
  f.vel = Math.max(-F.WHEEL_MAX_V, Math.min(F.WHEEL_MAX_V, f.vel + delta * F.WHEEL_GAIN));
  f.mode = 'coast';
}

export function nudge(f, dir) {
  const base = f.mode === 'spring' ? f.target : nearest(f);
  f.target = clamp(f, base + dir * f.pitch);
  f.mode = 'spring';
}

export function goTo(f, index) {
  f.target = clamp(f, index * f.pitch);
  f.mode = 'spring';
}

export function stepFilm(f, dt) {
  if (f.mode === 'coast') {
    f.offset += f.vel * dt;
    f.vel *= Math.exp(-F.COAST_DECAY * dt);
    if (f.offset < f.min || f.offset > f.max) f.vel *= Math.exp(-14 * dt);
    if (Math.abs(f.vel) < F.COAST_TO_SPRING_V) { f.mode = 'spring'; f.target = nearest(f); }
  } else if (f.mode === 'spring') {
    const c = 2 * Math.sqrt(F.SPRING_K) * F.SPRING_ZETA;
    f.vel += (F.SPRING_K * (f.target - f.offset) - c * f.vel) * dt;
    f.offset += f.vel * dt;
  }
}

export function filmIndex(f) {
  return Math.round(clamp(f, f.offset) / f.pitch);
}

export function isSettled(f) {
  return f.mode === 'spring' && Math.abs(f.target - f.offset) < 0.005 && Math.abs(f.vel) < 0.05;
}
