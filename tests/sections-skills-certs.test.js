import { renderSkills, levelBar } from '../src/sections/skills.js';
import { renderCertificates } from '../src/sections/certificates.js';
import { renderSection } from '../src/sections/index.js';
import { getContent, SECTIONS } from '../src/core/content.js';
import { t } from '../src/core/i18n.js';

const host = () => { const h = document.createElement('div'); document.body.append(h); return h; };

test('skills are grouped boxes with notes', () => {
  const h = host(); renderSkills(h, { data: getContent(), lang: 'en' });
  expect(h.querySelectorAll('.grp').length).toBe(getContent().skills.length);
  const tk = h.querySelector('.tk'); tk.click();
  expect(tk.classList.contains('on')).toBe(true);
  expect(h.querySelector('.note').textContent).toContain(levelBar(getContent().skills[0].items[0].level));
  h.click();
  expect(h.querySelector('.note')).toBeNull();
  expect(tk.classList.contains('on')).toBe(false);
});

test('levelBar', () => {
  expect(levelBar(4)).toBe('■■■■□');
  expect(levelBar(9)).toBe('■■■■■');
  expect(levelBar(0)).toBe('□□□□□');
});

test('certificates tally and locked badges', () => {
  const h = host(); renderCertificates(h, { data: getContent(), lang: 'en' });
  const certs = getContent().certificates;
  expect(h.querySelector('.tally').textContent).toContain(String(certs.filter(c => c.status === 'earned').length));
  expect(h.querySelectorAll('.badge.locked').length).toBe(certs.filter(c => c.status === 'in-progress').length);
});

test('earned badge with url shows credential link; locked badge shows preparing text', () => {
  const data = structuredClone(getContent()); data.certificates.find(c => c.status === 'earned').url = 'https://example.com/badge';
  const h = host(); renderCertificates(h, { data, lang: 'en' });
  h.querySelector('.badge:not(.locked)').click();
  expect(h.querySelector('.note a')).not.toBeNull();
  h.querySelector('.badge.locked').click();
  expect(h.querySelector('.note').textContent).toContain('Currently preparing');
});

test('in-progress certificate without a date shows only the status', () => {
  const data = structuredClone(getContent());
  const i = data.certificates.findIndex(c => c.status === 'in-progress'); delete data.certificates[i].date;
  const h = host(); renderCertificates(h, { data, lang: 'zh' });
  h.querySelectorAll('.badge')[i].click();
  expect([...h.querySelectorAll('.note .nh span')].map(s => s.textContent)).toEqual([t('ui.inProgress', 'zh')]);
  expect(h.innerHTML).not.toContain('undefined');
});

test('certificate without url shows no credential link', () => {
  const data = structuredClone(getContent()); data.certificates[0].url = null;
  const h = host(); renderCertificates(h, { data, lang: 'ja' });
  h.querySelector('.badge').click();
  expect(h.querySelector('.note a')).toBeNull();
  expect(h.innerHTML).not.toContain('undefined');
});

test('renderSection dispatches all four ids', () => {
  for (const { id } of SECTIONS) {
    const h = host(); renderSection(h, id, { data: getContent(), lang: 'zh' });
    expect(h.childElementCount).toBeGreaterThan(0);
    expect(h.lang).toBe('zh');
  }
});

test('renderers survive missing optional arrays instead of throwing', () => {
  const data = structuredClone(getContent());
  delete data.profile.bio; delete data.profile.education; delete data.profile.contacts; delete data.projects[0].stack; delete data.projects[0].links;
  for (const { id } of SECTIONS) expect(() => renderSection(host(), id, { data, lang: 'en' })).not.toThrow();
  const h = host(); renderSection(h, 'projects', { data, lang: 'en' });
  const cat = data.projectCategories.findIndex(c => c.id === data.projects[0].category);
  expect(() => { h.querySelectorAll('.pf')[cat].click(); h.querySelector('.pf').click(); }).not.toThrow();
  expect(h.querySelector('h2').textContent).toContain(data.projects[0].code);
});
