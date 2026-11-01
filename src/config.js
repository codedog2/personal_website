// Every tunable number lives here so the look and feel can be adjusted without touching scene code.

export const CONFIG = Object.freeze({
  SCREEN_COVER: 0.75,       // bezel width / viewport width when the screen is pushed in
  MAX_HEIGHT_COVER: 0.9,    // never let the bezel exceed this share of the viewport height
});

/** Normalise a deploy path (e.g. "portfolio") into Vite's `base` form ("/portfolio/"). */
export function basePath(env) {
  const raw = (env && env.BASE_PATH) || '';
  const trimmed = raw.replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}
