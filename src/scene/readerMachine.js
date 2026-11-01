// Reading-screen state machine. Events that don't belong to the current state are ignored,
// so key mashing during an animation can never leave the reader stuck.

export const READER = Object.freeze({ IDLE: 'idle', LOADING: 'loading', ZOOMED: 'zoomed', UNLOADING: 'unloading' });

const NEXT = {
  idle: { LOAD: 'loading' },
  loading: { LOADED: 'zoomed' },
  zoomed: { BACK: 'unloading' },
  unloading: { UNLOADED: 'idle' },
};

export function nextReader(state, event) {
  return NEXT[state]?.[event] ?? state;
}

export function canBrowse(state) {
  return state === READER.IDLE;
}

/** Which action a key press means in each state. 'swallow' = Enter while loading/reading, so a focused
 *  control (e.g. the BACK button) can't be activated by key repeat and bounce the reader shut. */
export function routeKey(state, key) {
  if (state === READER.IDLE) return { ArrowRight: 'next', ArrowLeft: 'prev', Enter: 'load' }[key] ?? null;
  if (key === 'Enter' && (state === READER.LOADING || state === READER.ZOOMED)) return 'swallow';
  if (state === READER.ZOOMED && (key === 'Escape' || key === 'Backspace')) return 'back';
  return null;
}
