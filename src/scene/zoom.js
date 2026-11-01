// Push-in geometry and the load/unload choreography.
import { CONFIG } from '../config.js';

const T = CONFIG.TIMING;
const clamp01 = x => Math.min(1, Math.max(0, x));

/** Camera distance from the screen so the bezel is `cover` of the view width, without exceeding maxHeightCover of its height. */
export function zoomDistance({ bezelW, bezelH, fovDeg, aspect, cover = CONFIG.SCREEN_COVER, maxHeightCover = CONFIG.MAX_HEIGHT_COVER }) {
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  const byWidth = bezelW / (cover * 2 * tanHalf * aspect);
  const byHeight = bezelH / (maxHeightCover * 2 * tanHalf);
  return Math.max(byWidth, byHeight);
}

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Knob turns VIEW→LOAD first, then the screen slides out while the camera pushes in. */
export function loadTimeline(phase) {
  return {
    knob: easeInOutCubic(clamp01(phase / T.KNOB)),
    zoom: easeInOutCubic(clamp01((phase - T.ZOOM_START) / T.ZOOM_DUR)),
    done: phase >= T.LOAD_DONE,
  };
}

/** Camera pulls back first; the knob returns to VIEW at the end. */
export function unloadTimeline(phase) {
  return {
    knob: 1 - easeInOutCubic(clamp01((phase - T.KNOB_BACK_START) / (T.UNLOAD_DONE - 0.05 - T.KNOB_BACK_START))),
    zoom: 1 - easeInOutCubic(clamp01(phase / T.UNZOOM_DUR)),
    done: phase >= T.UNLOAD_DONE,
  };
}
