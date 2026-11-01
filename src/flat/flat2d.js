// 2D simple view: same content and look as the 3D reader, laid out as a flat page (spec §4.10).
import '../styles/flat.css';
import { SECTIONS, getContent } from '../core/content.js';
import { renderSection } from '../sections/index.js';
import { el } from '../sections/dom.js';
import { LANGS, getLang, setLang, onLangChange, t } from '../core/i18n.js';

const LANG_LABEL = { en: 'EN', zh: '中', ja: '日' };
const SWIPE_MIN = 50;

export function mountFlat(root, { sound, switchView }) {
  const data = getContent();
  let index = 0;

  const nav = el('nav', {}, SECTIONS.map(({ id }, i) =>
    el('a', { href: `#${id}`, 'data-section': id, onclick: e => { e.preventDefault(); goTo(i); } })));
  const langSwitch = el('div', { class: 'lang', role: 'group' }, LANGS.map(l =>
    el('button', { type: 'button', 'data-lang': l, onclick: () => setLang(l) }, LANG_LABEL[l])));
  const soundBtn = el('button', { type: 'button', class: 'chip', onclick: () => { sound.setEnabled(!sound.enabled); paintChrome(); } });
  const viewBtn = el('button', { type: 'button', class: 'chip', 'data-view': '3d', onclick: () => switchView('3d') });
  const counter = el('div', { class: 'counter' });
  const title = el('h1');
  const tagline = el('p', { class: 'tagline' });
  const content = el('div', { class: 'section' });
  const paper = el('div', { class: 'paper' }, content);
  const panel = el('main', { class: 'panel' }, el('div', { class: 'lead' }, counter, title, tagline), paper);
  const dots = el('div', { class: 'dots' }, SECTIONS.map((_, i) =>
    el('button', { type: 'button', 'data-i': i, 'aria-label': `${i + 1}`, onclick: () => goTo(i) })));
  const brand = el('div', { class: 'brand' }, el('div', { class: 't' }, 'Optical Archive'), el('div', { class: 'who' }, data.profile.name));
  const shell = el('div', { class: 'flat' },
    el('header', { class: 'flat-top' }, brand, nav, el('div', { class: 'tools' }, langSwitch, soundBtn, viewBtn)),
    panel, dots);

  function paintChrome() {
    const lang = getLang();
    shell.lang = lang;
    nav.querySelectorAll('a').forEach((a, i) => { a.textContent = t(`nav.${SECTIONS[i].id}`, lang); a.classList.toggle('on', i === index); });
    langSwitch.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
    soundBtn.textContent = t(sound.enabled ? 'ui.sound.on' : 'ui.sound.off', lang);
    soundBtn.classList.toggle('on', sound.enabled);
    viewBtn.textContent = t('ui.view.3d', lang);
    dots.querySelectorAll('button').forEach((d, i) => d.classList.toggle('on', i === index));
  }

  function paintSection() {
    const lang = getLang(), id = SECTIONS[index].id;
    counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(SECTIONS.length).padStart(2, '0')}`;
    title.textContent = t(`section.${id}.title`, lang);
    tagline.textContent = t(`section.${id}.tagline`, lang);
    renderSection(content, id, { data, lang });
    panel.classList.remove('flash'); void panel.offsetWidth; panel.classList.add('flash');
  }

  function goTo(i) {
    const next = Math.max(0, Math.min(SECTIONS.length - 1, i));
    if (next === index && content.childElementCount) return;
    index = next;
    sound.tick();
    paintChrome(); paintSection();
  }

  let down = null;
  // touch/pen only: a mouse drag here is usually text selection
  panel.addEventListener('pointerdown', e => { down = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY }; });
  panel.addEventListener('pointerup', e => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y; down = null;
    if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) goTo(index + (dx < 0 ? 1 : -1));
  });
  const onKey = e => {
    if (e.target instanceof HTMLElement && e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowRight') goTo(index + 1);
    if (e.key === 'ArrowLeft') goTo(index - 1);
  };
  document.addEventListener('keydown', onKey);
  const offLang = onLangChange(lang => { document.documentElement.lang = lang; paintChrome(); paintSection(); });

  root.replaceChildren(shell);
  paintChrome(); paintSection();

  return {
    goTo,
    destroy() { document.removeEventListener('keydown', onKey); offLang(); root.replaceChildren(); },
  };
}
