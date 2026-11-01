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
