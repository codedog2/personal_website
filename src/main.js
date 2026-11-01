// Boot: language → pick 3D or 2D → mount (3D failures fall back to 2D) → intro covers the wait.
import './styles/paper.css';
import { initLang } from './core/i18n.js';
import { readPref } from './core/prefs.js';
import { chooseView, hasWebGL, mountView, switchView } from './core/mode.js';
import { createSound } from './core/sound.js';

const root = document.getElementById('app');
document.documentElement.lang = initLang();
const sound = createSound();

const view = chooseView({
  webgl: hasWebGL(),
  width: innerWidth,
  height: innerHeight,
  coarse: matchMedia('(pointer: coarse)').matches,
  saved: readPref('view', null),
});

const mounted = mountView(view, {
  mount3d: () => import('./scene/scene3d.js').then(m => m.mountScene(root, { sound, switchView })),
  mount2d: () => import('./flat/flat2d.js').then(m => m.mountFlat(root, { sound, switchView })),
});

await mounted;
