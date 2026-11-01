import { el, sectionHead } from './dom.js';
import { showNote, closeNotesOnBackgroundClick } from './note.js';
import { pick, t } from '../core/i18n.js';

function noteBody(c, lang) {
  const span = el('span', {},
    el('b', {}, pick(c.name, lang)), el('br'),
    pick(c.issuer, lang),
    c.credentialId ? [el('br'), `${t('ui.credentialId', lang)} ${c.credentialId}`] : null);
  if (c.status === 'earned' && c.url) span.append(el('br'), el('a', { href: c.url, target: '_blank', rel: 'noopener' }, t('ui.viewCredential', lang)));
  if (c.status !== 'earned') span.append(el('br'), t('ui.preparing', lang));
  return span;
}

export function renderCertificates(host, { data, lang }) {
  closeNotesOnBackgroundClick(host);
  const earned = data.certificates.filter(c => c.status === 'earned').length;
  host.replaceChildren(...sectionHead('certificates', lang),
    el('div', { class: 'tally' },
      el('b', {}, earned), t('ui.earned', lang),
      el('b', {}, data.certificates.length - earned), t('ui.inProgress', lang)),
    el('div', { class: 'badges' }, data.certificates.map(c => {
      const badge = el('div', { class: `badge${c.status === 'earned' ? '' : ' locked'}`, tabindex: 0 },
        el('div', { class: 'medal', 'aria-hidden': 'true' }, c.icon),
        el('div', { class: 'bn' }, pick(c.name, lang)));
      badge.addEventListener('click', e => {
        e.stopPropagation();
        showNote(host, badge, { title: c.status === 'earned' ? t('ui.earned', lang) : t('ui.inProgress', lang), meta: c.date, body: noteBody(c, lang) });
      });
      return badge;
    })));
}
