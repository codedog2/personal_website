import { mountFlat } from '../src/flat/flat2d.js';
import { createSound } from '../src/core/sound.js';
import { t, setLang } from '../src/core/i18n.js';

let api;
const setup = () => {
  const root = document.createElement('div'); document.body.append(root);
  const switchView = vi.fn();
  api = mountFlat(root, { sound: createSound(vi.fn()), switchView });
  return { root, api, switchView };
};
afterEach(() => { api?.destroy(); document.body.innerHTML = ''; setLang('en'); localStorage.clear(); });

test('nav lists four sections in order, about active first', () => {
  const { root } = setup();
  expect([...root.querySelectorAll('nav [data-section]')].map(a => a.dataset.section)).toEqual(['about', 'projects', 'skills', 'certificates']);
  expect(root.querySelector('nav .on').dataset.section).toBe('about');
  expect(root.querySelector('.counter').textContent).toContain('01 / 04');
  expect(root.querySelector('.paper .section').textContent).toContain('Terry (Yaowei) Feng');
});

test('clicking nav, arrow keys and swipe change section and dots', () => {
  const { root } = setup();
  root.querySelector('[data-section="skills"]').click();
  expect(root.querySelector('.dots .on').dataset.i).toBe('2');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
  expect(root.querySelector('nav .on').dataset.section).toBe('certificates');
  const panel = root.querySelector('.panel');
  panel.dispatchEvent(new PointerEvent('pointerdown', { clientX: 300, clientY: 100, bubbles: true, pointerType: 'touch' }));
  panel.dispatchEvent(new PointerEvent('pointerup', { clientX: 200, clientY: 105, bubbles: true, pointerType: 'touch' }));
  expect(root.querySelector('nav .on').dataset.section).toBe('certificates');
  panel.dispatchEvent(new PointerEvent('pointerdown', { clientX: 200, clientY: 100, bubbles: true, pointerType: 'touch' }));
  panel.dispatchEvent(new PointerEvent('pointerup', { clientX: 300, clientY: 110, bubbles: true, pointerType: 'touch' }));
  expect(root.querySelector('nav .on').dataset.section).toBe('skills');
});

test('mostly vertical drag is not a swipe', () => {
  const { root } = setup();
  const panel = root.querySelector('.panel');
  panel.dispatchEvent(new PointerEvent('pointerdown', { clientX: 300, clientY: 100, bubbles: true, pointerType: 'touch' }));
  panel.dispatchEvent(new PointerEvent('pointerup', { clientX: 240, clientY: 300, bubbles: true, pointerType: 'touch' }));
  expect(root.querySelector('nav .on').dataset.section).toBe('about');
});

test('language switch re-renders text', () => {
  const { root } = setup();
  root.querySelector('.lang [data-lang="ja"]').click();
  expect(root.querySelector('nav [data-section="about"]').textContent).toBe(t('nav.about', 'ja'));
  expect(root.querySelector('.lang [data-lang="ja"]').classList.contains('on')).toBe(true);
});

test('3d button asks to switch view', () => {
  const { root, switchView } = setup();
  root.querySelector('[data-view="3d"]').click();
  expect(switchView).toHaveBeenCalledWith('3d');
});

test('destroy removes keyboard handling', () => {
  const { root } = setup();
  api.destroy();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
  expect(root.childElementCount).toBe(0);
});

test('mouse drag (e.g. selecting text) is not a swipe', () => {
  const { root } = setup();
  const panel = root.querySelector('.panel');
  panel.dispatchEvent(new PointerEvent('pointerdown', { clientX: 300, clientY: 100, bubbles: true, pointerType: 'mouse' }));
  panel.dispatchEvent(new PointerEvent('pointerup', { clientX: 150, clientY: 102, bubbles: true, pointerType: 'mouse' }));
  expect(root.querySelector('nav .on').dataset.section).toBe('about');
});
