// Boot: language → pick 3D or 2D → mount (3D failures fall back to 2D) → intro covers the wait.
import './styles/paper.css';
import { initLang } from './core/i18n.js';
import { readPref } from './core/prefs.js';
import { chooseView, hasWebGL, mountView, switchView, savedView } from './core/mode.js';
import { createSound } from './core/sound.js';
import { runIntro } from './intro/intro.js';

const root = document.getElementById('app');
document.documentElement.lang = initLang();
const sound = createSound();

const view = chooseView({
  webgl: hasWebGL(),
  width: innerWidth,
  height: innerHeight,
  coarse: matchMedia('(pointer: coarse)').matches,
  saved: savedView(),
});

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lowPower = devicePixelRatio > 1.5 && (navigator.hardwareConcurrency || 8) <= 4;   // lower resolution, no shadows

let scene = null;
const mounted = mountView(view, {
  mount3d: () => import('./scene/scene3d.js').then(m => m.mountScene(root, { sound, switchView, lowPower, calm: reducedMotion })).then(api => { scene = api; }),
  mount2d: () => import('./flat/flat2d.js').then(m => m.mountFlat(root, { sound, switchView })),
});

await runIntro(document.body, {
  ready: mounted,
  seen: view === '2d' || readPref('introSeen', false),   // 2D always gets the short version
  lang: document.documentElement.lang,
  reducedMotion,
  beforeReveal: () => scene?.greet(),
});
