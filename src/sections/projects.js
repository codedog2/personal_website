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

/** A strip of film frames; arrows appear once it holds more than three. */
function strip(frames) {
  const row = el('div', { class: 'strip' }, frames);
  const wrap = el('div', { class: 'strip-wrap' }, row);
  if (frames.length > 3) {
    const scroll = dir => row.scrollBy({ left: dir * row.clientWidth * 0.8, behavior: 'smooth' });
    wrap.append(el('button', { class: 'arrow left', type: 'button', 'aria-label': 'previous', onclick: () => scroll(-1) }, '‹'),
      el('button', { class: 'arrow right', type: 'button', 'aria-label': 'next', onclick: () => scroll(1) }, '›'));
  }
  return wrap;
}

const frame = (item, name, label, open, attrs = {}) =>
  el('div', { class: 'pf', tabindex: 0, onclick: open, ...attrs }, thumb(item, 'img'), el('div', { class: 'lbl' }, label), el('div', { class: 'nm' }, name));

/**
 * Projects page: categories -> one category's projects -> a project's detail, each level linking back up.
 * Without `projectCategories` in the data it falls back to a single strip of every project.
 */
export function renderProjects(host, { data, lang }) {
  const cats = data.projectCategories || [];
  const show = (...nodes) => { host.replaceChildren(...nodes); host.scrollTop = 0; };
  const linkback = (text, onclick) => el('span', { class: 'linkback', role: 'button', tabindex: 0, onclick }, text);
  const inCat = c => data.projects.filter(p => p.category === c.id);
  const projectStrip = (projects, back) => strip(projects.map(p => frame(p, pick(p.name, lang), p.code, () => detail(p, back))));

  const categories = () => show(...sectionHead('projects', lang), strip(cats.map(c =>
    frame(c, pick(c.name, lang), t('ui.projectCount', lang).replace('{n}', inCat(c).length), () => category(c), { 'data-cat': c.id }))));

  const category = c => show(
    sectionHead('projects', lang)[0],
    el('h2', {}, pick(c.name, lang)),
    c.summary ? el('div', { class: 'sub' }, pick(c.summary, lang)) : null,
    projectStrip(inCat(c), () => category(c)),
    linkback(t('ui.allCategories', lang), categories));

  const all = () => show(...sectionHead('projects', lang), projectStrip(data.projects, all));

  const detail = (p, back) => {
    const links = [['github', p.links?.github], ['demo', p.links?.demo]].filter(([, url]) => url);
    const cat = cats.find(c => c.id === p.category);
    show(
      sectionHead('projects', lang)[0],
      el('h2', {}, `${p.code} / ${pick(p.name, lang)}`),
      el('div', { class: 'sub' }, pick(p.summary, lang)),
      el('div', { class: 'cols detail' },
        p.image ? el('div', { class: 'main' }, el('img', { class: 'hero', src: asset(p.image), alt: '' })) : null,
        el('div', { class: 'side' },
          el('div', { class: 'grp-name' }, t('ui.overview', lang)),
          el('p', {}, pick(p.overview, lang)),
          el('div', { class: 'grp-name' }, t('ui.techStack', lang)),
          el('div', { class: 'tokens' }, (p.stack || []).map(id => stackToken(host, data, id, lang))),
          links.length ? el('div', { class: 'grp-name' }, t('ui.links', lang)) : null,
          links.length ? el('div', { class: 'links' }, links.map(([k, url]) =>
            el('a', { href: url, target: '_blank', rel: 'noopener', 'data-link': k }, t(`ui.${k}`, lang)))) : null)),
      linkback(cat ? `← ${pick(cat.name, lang)}` : t('ui.allProjects', lang), back));
  };

  closeNotesOnBackgroundClick(host);
  if (cats.length) categories(); else all();
}
