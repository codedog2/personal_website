import { SECTIONS, getContent, validateContent, asset, findSkill } from '../src/core/content.js';

test('sections are fixed and ordered', () => {
  expect(SECTIONS.map(s => s.id)).toEqual(['about', 'projects', 'skills', 'certificates']);
});

test('shipped content is valid', () => {
  expect(validateContent(getContent())).toEqual([]);
});

test('profile role is optional', () => {
  const data = structuredClone(getContent()); delete data.profile.role;
  expect(validateContent(data).some(p => p.includes('role'))).toBe(false);
});

test('validation reports missing english and bad status', () => {
  const bad = structuredClone(getContent());
  bad.projects[0].name = { zh: '只有中文' };
  bad.certificates[0].status = 'done';
  const problems = validateContent(bad);
  expect(problems.some(p => p.includes('projects[0].name'))).toBe(true);
  expect(problems.some(p => p.includes('certificates[0].status'))).toBe(true);
});

test('unknown stack id is reported', () => {
  const bad = structuredClone(getContent());
  bad.projects[0].stack.push('cobol');
  expect(validateContent(bad).some(p => p.includes('cobol'))).toBe(true);
});

test('skill level must be 1-5', () => {
  const bad = structuredClone(getContent());
  bad.skills[0].items[0].level = 7;
  expect(validateContent(bad).some(p => p.includes('level'))).toBe(true);
});

test('placeholder data covers a project with no image and no github link', () => {
  expect(getContent().projects.some(p => p.image === null && p.links.github === null)).toBe(true);
});

test('findSkill', () => {
  const id = getContent().skills[0].items[0].id;
  expect(findSkill(getContent(), id).id).toBe(id);
  expect(findSkill(getContent(), 'cobol')).toBeNull();
});

test('asset prefixes base url', () => {
  expect(asset('images/p01.svg')).toMatch(/^\/.*images\/p01\.svg$/);
  expect(asset('/images/p01.svg')).not.toMatch(/\/\/images/);
});

test('validator reports missing arrays that the renderers rely on', () => {
  const bad = structuredClone(getContent());
  delete bad.profile.bio; delete bad.profile.contacts; delete bad.projects[0].stack;
  const problems = validateContent(bad);
  expect(problems.some(p => p.includes('profile.bio'))).toBe(true);
  expect(problems.some(p => p.includes('profile.contacts'))).toBe(true);
  expect(problems.some(p => p.includes('projects[0].stack'))).toBe(true);
});

test('validator flags a project in an unknown category and a category without a name', () => {
  const bad = structuredClone(getContent());
  bad.projects[0].category = 'gardening';
  bad.projectCategories[0].name = {};
  const problems = validateContent(bad);
  expect(problems.some(p => p.includes('projects[0].category'))).toBe(true);
  expect(problems.some(p => p.includes('projectCategories[0].name'))).toBe(true);
});
