// Picks the 3D reader or the 2D simple view, and falls back to 2D if 3D fails at runtime.
import { readPref, writePref } from './prefs.js';

export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2')) || !!c.getContext('webgl');
  } catch {
    return false;
  }
}

export function chooseView({ webgl, width, height, coarse, saved }) {
  if (!webgl) return '2d';
  if (saved === '3d' || saved === '2d') return saved;
  if (width < 768) return '2d';
  if (coarse && height > width) return '2d';
  return '3d';
}

export async function mountView(view, { mount3d, mount2d }) {
  if (view === '3d') {
    try {
      await mount3d();
      return '3d';
    } catch (err) {
      console.error('[mode] 3D view failed, falling back to the simple view', err);
    }
  }
  await mount2d();
  return '2d';
}

const VIEWS = ['3d', '2d'];

/** The visitor's explicit choice: ?view= in the URL first (works with storage blocked), then storage. */
export function savedView(search = globalThis.location?.search ?? '') {
  const fromUrl = new URLSearchParams(search).get('view');
  if (VIEWS.includes(fromUrl)) return fromUrl;
  const stored = readPref('view', null);
  return VIEWS.includes(stored) ? stored : null;
}

export function switchView(view, loc = globalThis.location) {
  writePref('view', view);
  const url = new URL(loc.href);
  url.searchParams.set('view', view);
  loc.assign(url.toString());
}
