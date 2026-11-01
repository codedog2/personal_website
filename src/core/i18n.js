// Language detection/switching plus lookups. Anything missing in zh/ja falls back to English,
// so the page never shows a blank, `undefined` or a raw key.
import strings from '../content/strings.json';
import { readPref, writePref } from './prefs.js';

export const LANGS = ['en', 'zh', 'ja'];

let current = 'en';
const listeners = new Set();
const warned = new Set();

export function detectLang(languages) {
  for (const l of languages || []) {
    const code = String(l).toLowerCase();
    if (code.startsWith('zh')) return 'zh';
    if (code.startsWith('ja')) return 'ja';
    if (code.startsWith('en')) return 'en';
  }
  return 'en';
}

export function initLang() {
  const saved = readPref('lang', null);
  current = LANGS.includes(saved) ? saved : detectLang(globalThis.navigator?.languages ?? []);
  return current;
}

export function getLang() {
  return current;
}

export function setLang(lang) {
  if (!LANGS.includes(lang)) return;
  current = lang;
  writePref('lang', lang);
  for (const fn of listeners) fn(lang);
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function pick(text, lang = current) {
  if (text == null) return '';
  if (typeof text === 'string') return text;
  return text[lang] || text.en || '';
}

export function t(key, lang = current) {
  const entry = strings[key];
  if (!entry) {
    if (!warned.has(key)) { warned.add(key); console.warn(`[i18n] missing string "${key}"`); }
    return '';
  }
  return pick(entry, lang);
}
