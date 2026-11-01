import { el, sectionHead } from './dom.js';
import { asset } from '../core/content.js';
import { pick, t } from '../core/i18n.js';

function copyButton(value, lang) {
  const btn = el('button', { class: 'copy', type: 'button', 'data-copy': value }, t('ui.copy', lang));
  btn.addEventListener('click', () => {
    navigator.clipboard?.writeText(value).then(() => {
      btn.textContent = t('ui.copied', lang);
      setTimeout(() => { btn.textContent = t('ui.copy', lang); }, 1800);
    }, () => {});
  });
  return btn;
}

export function renderAbout(host, { data, lang }) {
  const p = data.profile;
  const contacts = el('div', { class: 'contact' }, p.contacts.map(c => [
    el('span', { class: 'k' }, c.label),
    el('span', { class: 'v' },
      el('a', { href: c.href, target: c.kind === 'email' ? null : '_blank', rel: c.kind === 'email' ? null : 'noopener' }, c.value),
      c.kind === 'email' ? copyButton(c.value, lang) : null),
  ]));

  const card = el('div', { class: 'card' },
    el('span', { class: 'clip' }),
    p.photo ? el('img', { class: 'ph', src: asset(p.photo), alt: p.name }) : null,
    el('div', { class: 'k' }, t('ui.education', lang)),
    el('div', { class: 'v' }, p.education.map((e, i) => [i ? el('br') : null, pick(e, lang)])),
    el('div', { class: 'k' }, t('ui.interests', lang)),
    el('div', { class: 'v' }, pick(p.interests, lang)));

  host.replaceChildren(el('div', { class: 'cols about' },
    el('div', { class: 'main' },
      sectionHead('about', lang),
      el('div', { class: 'name' }, p.name, el('span', { class: 'role' }, pick(p.role, lang))),
      p.bio.map(b => el('p', {}, pick(b, lang))),
      contacts),
    card));
}
