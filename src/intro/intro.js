// Opening sequence: a lamp warms up, the question types out, then it fades into the site.
// It also covers asset loading: if loading outlasts the sequence, it holds on the last frame.
import '../styles/intro.css';
import { t } from '../core/i18n.js';
import { writePref } from '../core/prefs.js';
import { el } from '../sections/dom.js';

const FADE_MS = 600;

export function introSchedule(seen) {
  return seen
    ? { lampOn: 0, typeStart: 0, typeEnd: 0, answerAt: 150, end: 700 }
    : { lampOn: 250, typeStart: 300, typeEnd: 1700, answerAt: 1900, end: 2800 };
}

export function runIntro(root, { ready, seen, lang, reducedMotion, beforeReveal }) {
  const plan = introSchedule(seen);
  const question = t('intro.question', lang);
  const q = el('div', { class: 'intro-q', 'data-text': question });
  const answer = el('div', { class: 'intro-a' }, t('intro.answer', lang));
  const loading = el('div', { class: 'intro-loading', hidden: true }, t('intro.loading', lang));
  const skip = el('button', { type: 'button', class: 'intro-skip', 'data-skip': '' }, t('intro.skip', lang));
  const overlay = el('div', { class: `intro${seen ? ' seen' : ''}${reducedMotion ? ' calm' : ''}`, lang },
    el('div', { class: 'intro-glow' }), el('div', { class: 'intro-grain' }),
    el('div', { class: 'intro-text' }, q, answer), loading, skip);
  root.append(overlay);

  const timers = [];
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));

  later(plan.lampOn, () => overlay.classList.add('lit'));
  if (seen || reducedMotion || plan.typeEnd <= plan.typeStart) {
    q.textContent = question;
  } else {
    const step = (plan.typeEnd - plan.typeStart) / question.length;
    for (let i = 1; i <= question.length; i++) later(plan.typeStart + i * step, () => { q.textContent = question.slice(0, i); });
    later(plan.typeStart, () => q.classList.add('typing'));
    later(plan.typeEnd, () => q.classList.remove('typing'));
  }
  later(plan.answerAt, () => answer.classList.add('show'));

  return new Promise(resolve => {
    let timeUp = false, loaded = false, finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      writePref('introSeen', true);
      try { beforeReveal?.(); } catch (err) { console.error('[intro] beforeReveal failed', err); }   // set the scene up under the overlay
      overlay.classList.add('out');
      setTimeout(() => { overlay.remove(); resolve(); }, FADE_MS);
    };
    const maybeFinish = () => {
      if (timeUp && loaded) finish();
      else if (timeUp) loading.hidden = false;
    };
    Promise.resolve(ready).then(() => {}, () => {}).then(() => { loaded = true; maybeFinish(); });
    later(plan.end, () => { timeUp = true; maybeFinish(); });
    skip.addEventListener('click', () => {
      if (loaded) { finish(); return; }
      // not loaded yet: jump to the last frame and wait there rather than reveal an empty page
      timers.forEach(clearTimeout);
      overlay.classList.add('lit'); q.classList.remove('typing'); q.textContent = question; answer.classList.add('show');
      skip.hidden = true; timeUp = true; maybeFinish();
    });
  });
}
