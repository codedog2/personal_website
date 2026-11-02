// Every tunable number lives here so the look and feel can be adjusted without touching scene code.

export const CONFIG = Object.freeze({
  SCREEN_COVER: 0.75,       // bezel width / viewport width when the screen is pushed in
  MAX_HEIGHT_COVER: 0.94,   // never let the bezel exceed this share of the viewport height (16:9 still gets the full 75%)

  // film strip feel (values tuned in the spike)
  FILM: Object.freeze({
    PITCH: 1.0,             // world units between frames (= frame width)
    COAST_DECAY: 2.6,       // velocity decay per second while coasting
    COAST_TO_SPRING_V: 1.0, // below this speed the strip snaps to a frame
    FLICK_V: 1.2,           // release speed that counts as a flick
    SPRING_K: 170,
    SPRING_ZETA: 0.72,      // slightly under-damped: a tiny "click" overshoot
    RUBBER: 0.35,           // drag resistance past either end
    WHEEL_GAIN: 0.006,
    WHEEL_MAX_V: 14,
  }),

  // load / unload choreography, seconds
  TIMING: Object.freeze({
    KNOB: 0.6, ZOOM_START: 0.62, ZOOM_DUR: 1.15, LOAD_DONE: 1.85,   // the knob turn finishes in view before the push-in
    UNZOOM_DUR: 1.0, KNOB_BACK_START: 0.65, UNLOAD_DONE: 1.05,
  }),

  // scene layout (world units)
  CAMERA: Object.freeze({ POS: [0, 2.55, 6.6], LOOK: [0, 1.45, 0], FOV: 34 }),
  FILM_CENTER: [0, 0.55, 0.95],
  BEND: 0.045,              // how much the strip curves back at its ends
  TILT: -0.62,              // strip leans back at the reading gate
  LEAD: 5,                  // leader frames on each side
  STRIP_END: 2.5,           // = 2.5 frames: when settled the guide gates sit exactly between whole frames
  REEL: Object.freeze({ X: 2.5, Y: [1.95, 1.55], Z: 0.45, R: 0.46, DEPTH: 0.14 }),   // [left, right] heights differ on purpose; hung on rods
  SCREEN: Object.freeze({ REST: [0, 2.2, -1.05], BEZEL: [2.62, 1.82], GLASS: [2.3, 1.5], SLIDE: 0.9 }),
  RIG: Object.freeze({ COLUMN: [0, -1.85], BOOM_Y: 3.42, BEAM_Z: 0.3 }),   // column foot (x, z); boom height; cross beam depth
  CONSOLE: Object.freeze({ POS: [0, 1.0, 0.15], SIZE: [1.15, 0.36], KNOB_X: 0.3 }),
  LAMP: [1.72, 2.5, 0.35],  // shade of the lamp hanging from the front cross beam, aimed at the reading gate
});

/** Normalise a deploy path (e.g. "portfolio") into Vite's `base` form ("/portfolio/"). */
export function basePath(env) {
  const raw = (env && env.BASE_PATH) || '';
  const trimmed = raw.replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}
