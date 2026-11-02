// The greeting page shown on the pushed-in reading screen right after the intro. Lines are typed out;
// until the lookups finish it shows a "connecting…" line.
import { el } from './dom.js';
import { t } from '../core/i18n.js';
import { greetingLines } from '../core/greeting.js';

const CHAR_MS = 24;

/** Returns a promise that resolves once everything is typed; call .finishNow() to skip the typing. */
export function renderGreeting(host, { lang, data }) {
  host.lang = lang;
  const status = el('div', { class: 'greet-line connecting' }, t('greet.connecting', lang));
  const box = el('div', { class: 'greet' }, el('div', { class: 'kick' }, '> HELLO'), status);
  host.replaceChildren(box);

  let resolveDone, timer = null, skip = false, fill = null;
  const done = new Promise(r => { resolveDone = r; });
  const finish = () => { clearInterval(timer); fill?.(); resolveDone(); };

  Promise.resolve(data).catch(() => null).then(d => {
    const lines = greetingLines(d ?? { hour: new Date().getHours(), city: null, isp: null, mbps: null, pop: null, quality: 'unknown' }, lang);
    status.remove();
    const rows = lines.map((_, i) => el(i === 0 ? 'h2' : 'div', { class: `greet-line${i === 0 ? ' greet-hi' : i === lines.length - 1 ? ' greet-verdict' : ''}` }));
    box.append(...rows);
    fill = () => rows.forEach((r, i) => { r.textContent = lines[i]; r.classList.remove('typing'); });
    if (skip) { finish(); return; }
    let row = 0, col = 0;
    timer = setInterval(() => {
      if (row >= lines.length) { finish(); return; }
      rows[row].classList.add('typing');
      rows[row].textContent = lines[row].slice(0, ++col);
      if (col >= lines[row].length) { rows[row].classList.remove('typing'); row++; col = 0; }
    }, CHAR_MS);
  });

  done.finishNow = () => { skip = true; if (fill) finish(); };
  return done;
}
