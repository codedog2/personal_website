// Visitor preferences in localStorage. Storage can be blocked (private mode, disabled site data),
// so every access is guarded and the site simply falls back to defaults.

const PREFIX = 'oa:';

export function readPref(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writePref(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // storage unavailable: preference just isn't remembered
  }
}
