import { el, sectionHead, levelBar } from './dom.js';
import { showNote, closeNotesOnBackgroundClick } from './note.js';
import { asset, findSkill } from '../core/content.js';
import { pick, t } from '../core/i18n.js';

/** A tech-stack token that opens the same note as on the Skills page. Unknown ids render as plain tokens. */
export function stackToken(host, data, id, lang) {
  const skill = findSkill(data, id);
  const tk = el('span', { class: 'tk', 'data-skill': id, tabindex: 0 }, skill ? skill.name : id);
  if (skill) tk.addEventListener('click', e => {
    e.stopPropagation();
    host.querySelectorAll('.tk.on').forEach(x => x.classList.remove('on'));
    tk.classList.add('on');
    showNote(host, tk, { title: skill.name, meta: levelBar(skill.level), body: `${pick(skill.years, lang)} · ${pick(skill.note, lang)}` });
  });
  return tk;
}

function thumb(project, cls) {
  return project.image
    ? el('img', { class: cls, src: asset(project.image), alt: '' })
    : el('div', { class: `${cls} blank` }, project.code);
}

export function renderProjects(host, { data, lang }) {
  const list = () => {
    const strip = el('div', { class: 'strip' }, data.projects.map((p, i) =>
      el('div', { class: 'pf', 'data-i': i, tabindex: 0, onclick: () => detail(p) },
        thumb(p, 'img'),
        el('div', { class: 'lbl' }, p.code),
        el('div', { class: 'nm' }, pick(p.name, lang)))));
    const wrap = el('div', { class: 'strip-wrap' }, strip);
    if (data.projects.length > 3) {
      const scroll = dir => strip.scrollBy({ left: dir * strip.clientWidth * 0.8, behavior: 'smooth' });
      wrap.append(el('button', { class: 'arrow left', type: 'button', 'aria-label': 'previous', onclick: () => scroll(-1) }, '‹'),
        el('button', { class: 'arrow right', type: 'button', 'aria-label': 'next', onclick: () => scroll(1) }, '›'));
    }
    host.replaceChildren(...sectionHead('projects', lang), wrap);
    host.scrollTop = 0;
  };

  const detail = p => {
    const links = [['github', p.links?.github], ['demo', p.links?.demo]].filter(([, url]) => url);
    host.replaceChildren(
      sectionHead('projects', lang)[0],
      el('h2', {}, `${p.code} / ${pick(p.name, lang)}`),
      el('div', { class: 'sub' }, pick(p.summary, lang)),
      el('div', { class: 'cols detail' },
        p.image ? el('div', { class: 'main' }, el('img', { class: 'hero', src: asset(p.image), alt: '' })) : null,
        el('div', { class: 'side' },
          el('div', { class: 'grp-name' }, t('ui.overview', lang)),
          el('p', {}, pick(p.overview, lang)),
          el('div', { class: 'grp-name' }, t('ui.techStack', lang)),
          el('div', { class: 'tokens' }, p.stack.map(id => stackToken(host, data, id, lang))),
          links.length ? el('div', { class: 'grp-name' }, t('ui.links', lang)) : null,
          links.length ? el('div', { class: 'links' }, links.map(([k, url]) =>
            el('a', { href: url, target: '_blank', rel: 'noopener', 'data-link': k }, t(`ui.${k}`, lang)))) : null)),
      el('span', { class: 'linkback', role: 'button', tabindex: 0, onclick: list }, t('ui.allProjects', lang)));
    host.scrollTop = 0;
  };

  closeNotesOnBackgroundClick(host);
  list();
}
