// Tiny DOM helpers shared by the section renderers. Data is always written as text, never as markup.
import { SECTIONS } from '../core/content.js';
import { t } from '../core/i18n.js';

/** el('a', { href, class: 'x' }, 'text', childNode, null) — null/undefined/false attrs and children are skipped. */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false || c === '') continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

/** "01 / 04 · ABOUT" kicker + title + tagline used at the top of every section. */
export function sectionHead(id, lang) {
  const i = SECTIONS.findIndex(s => s.id === id);
  const n = String(i + 1).padStart(2, '0'), total = String(SECTIONS.length).padStart(2, '0');
  return [
    el('div', { class: 'kick shead' }, `${n} / ${total} · ${t(`nav.${id}`, 'en').toUpperCase()}`),
    el('h2', { class: 'shead' }, t(`section.${id}.title`, lang)),
    el('div', { class: 'sub shead' }, t(`section.${id}.tagline`, lang)),
  ];
}

export function levelBar(level) {
  const n = Math.max(0, Math.min(5, Math.round(level || 0)));
  return '■'.repeat(n) + '□'.repeat(5 - n);
}
