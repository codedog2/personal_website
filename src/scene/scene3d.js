// 3D reader view. (Task 11: static scene only; interaction is added in Task 12.)
import { createStage } from './stage.js';
import { loadModels } from './models.js';
import { buildMachine } from './machine.js';
import { buildFilm } from './film.js';
import { getLang } from '../core/i18n.js';

const CANVAS_FONTS = ['600 64px "Cormorant Garamond"', 'italic 500 64px "Cormorant Garamond"', '500 32px "IBM Plex Mono"', '600 64px "Noto Serif SC"', '600 64px "Noto Serif JP"'];

export async function mountScene() {
  await Promise.race([Promise.all(CANVAS_FONTS.map(f => document.fonts.load(f, 'Aa中日'))), new Promise(r => setTimeout(r, 2500))]);
  const canvas = document.getElementById('gl');
  canvas.classList.add('active');
  const stage = createStage(canvas);
  const models = await loadModels(import.meta.env.BASE_URL);
  const lang = getLang();
  const machine = buildMachine(stage, models, lang);
  const film = buildFilm(stage, lang);
  film.update(0);
  addEventListener('resize', stage.resize);
  let last = performance.now();
  const loop = now => {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    machine.update(now / 1000, dt);
    stage.render(now / 1000);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  window.__oa = { stage, machine, film };
  return { destroy() {} };
}
