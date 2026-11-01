import { chooseView, mountView, switchView, savedView } from '../src/core/mode.js';

const base = { webgl: true, width: 1440, height: 900, coarse: false, saved: null };

test('desktop gets 3d', () => expect(chooseView(base)).toBe('3d'));
test('no webgl always 2d, even if saved 3d', () => expect(chooseView({ ...base, webgl: false, saved: '3d' })).toBe('2d'));
test('phone gets 2d', () => expect(chooseView({ ...base, width: 390, height: 844, coarse: true })).toBe('2d'));
test('portrait tablet gets 2d, landscape tablet gets 3d', () => {
  expect(chooseView({ ...base, width: 820, height: 1180, coarse: true })).toBe('2d');
  expect(chooseView({ ...base, width: 1180, height: 820, coarse: true })).toBe('3d');
});
test('saved choice wins when webgl works', () => {
  expect(chooseView({ ...base, saved: '2d' })).toBe('2d');
  expect(chooseView({ ...base, width: 390, height: 844, coarse: true, saved: '3d' })).toBe('3d');
});
test('garbage saved value is ignored', () => expect(chooseView({ ...base, saved: 'vr' })).toBe('3d'));

test('mountView falls back to 2d when 3d mount rejects', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const mount2d = vi.fn();
  const got = await mountView('3d', { mount3d: () => Promise.reject(new Error('404 model')), mount2d });
  expect(got).toBe('2d');
  expect(mount2d).toHaveBeenCalled();
});

test('mountView falls back when 3d mount throws synchronously', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const mount2d = vi.fn();
  expect(await mountView('3d', { mount3d: () => { throw new Error('no webgl context'); }, mount2d })).toBe('2d');
});

test('mountView 2d mounts only 2d', async () => {
  const mount3d = vi.fn(), mount2d = vi.fn();
  expect(await mountView('2d', { mount3d, mount2d })).toBe('2d');
  expect(mount3d).not.toHaveBeenCalled();
});

test('switchView works even when storage is blocked: the choice rides in the URL', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  const loc = { href: 'https://u.github.io/?lang=x#about', assign: vi.fn() };
  switchView('2d', loc);
  const url = new URL(loc.assign.mock.calls[0][0]);
  expect(url.searchParams.get('view')).toBe('2d');
  expect(savedView(url.search)).toBe('2d');
  vi.restoreAllMocks();
});
test('savedView prefers the URL, then storage, ignores junk', () => {
  localStorage.setItem('oa:view', '"3d"');
  expect(savedView('?view=2d')).toBe('2d');
  expect(savedView('')).toBe('3d');
  expect(savedView('?view=vr')).toBe('3d');
  localStorage.clear();
  expect(savedView('')).toBe(null);
});
