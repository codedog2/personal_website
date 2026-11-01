// Content data (src/content/content.json) shared by the 3D and 2D views.
import data from '../content/content.json';

export const SECTIONS = Object.freeze([
  { id: 'about' }, { id: 'projects' }, { id: 'skills' }, { id: 'certificates' },
]);

export function getContent() {
  return data;
}

export function asset(path) {
  const base = import.meta.env?.BASE_URL ?? '/';
  return base.replace(/\/?$/, '/') + String(path).replace(/^\/+/, '');
}

export function findSkill(content, id) {
  for (const g of content.skills) for (const s of g.items) if (s.id === id) return s;
  return null;
}

const hasEn = text => typeof text === 'string' ? text.length > 0 : !!(text && text.en);

/** Returns a list of human-readable problems; an empty list means the data is good. */
export function validateContent(content) {
  const problems = [];
  const need = (text, where) => { if (!hasEn(text)) problems.push(`${where}: missing English text`); };

  const p = content.profile || {};
  need(p.name, 'profile.name');
  need(p.role, 'profile.role');
  (p.bio || []).forEach((b, i) => need(b, `profile.bio[${i}]`));
  (p.education || []).forEach((e, i) => need(e, `profile.education[${i}]`));
  need(p.interests, 'profile.interests');
  (p.contacts || []).forEach((c, i) => { if (!c.label || !c.value || !c.href) problems.push(`profile.contacts[${i}]: needs label, value and href`); });

  (content.skills || []).forEach((g, gi) => g.items.forEach((s, si) => {
    const where = `skills[${gi}].items[${si}]`;
    if (!s.id || !s.name) problems.push(`${where}: needs id and name`);
    if (!Number.isInteger(s.level) || s.level < 1 || s.level > 5) problems.push(`${where}.level: must be an integer 1-5`);
    need(s.note, `${where}.note`);
  }));

  (content.projects || []).forEach((pr, i) => {
    need(pr.name, `projects[${i}].name`);
    need(pr.summary, `projects[${i}].summary`);
    need(pr.overview, `projects[${i}].overview`);
    for (const id of pr.stack || []) if (!findSkill(content, id)) problems.push(`projects[${i}].stack: unknown skill id "${id}"`);
  });

  (content.certificates || []).forEach((c, i) => {
    need(c.name, `certificates[${i}].name`);
    need(c.issuer, `certificates[${i}].issuer`);
    if (c.status !== 'earned' && c.status !== 'in-progress') problems.push(`certificates[${i}].status: must be "earned" or "in-progress"`);
  });

  return problems;
}
