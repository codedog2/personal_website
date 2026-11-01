import { el, sectionHead, levelBar } from './dom.js';
import { closeNotesOnBackgroundClick } from './note.js';
import { stackToken } from './projects.js';

export { levelBar };

export function renderSkills(host, { data, lang }) {
  closeNotesOnBackgroundClick(host);
  host.replaceChildren(...sectionHead('skills', lang),
    ...data.skills.map(g => el('div', { class: 'grp' },
      el('div', { class: 'grp-name' }, g.group),
      g.items.map(s => stackToken(host, data, s.id, lang)))));
}
