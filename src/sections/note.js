// Paper annotation card that pops up under a token or badge.
import { el } from './dom.js';

export function hideNotes(host) {
  host.querySelectorAll('.note').forEach(n => n.remove());
}

export function showNote(host, anchor, { title, meta, body }) {
  hideNotes(host);
  const note = el('div', { class: 'note', role: 'note' },
    el('div', { class: 'nh' }, el('span', {}, title), meta ? el('span', {}, meta) : null),
    el('div', { class: 'nb' }, body));
  const hr = host.getBoundingClientRect(), ar = anchor.getBoundingClientRect();
  note.style.left = `${Math.max(0, Math.min(ar.left - hr.left + host.scrollLeft, hr.width * 0.62))}px`;
  note.style.top = `${ar.bottom - hr.top + host.scrollTop + 6}px`;
  host.append(note);
  return note;
}

/** Clicking anywhere in the host that isn't a token/badge closes notes and clears the "on" state. */
export function closeNotesOnBackgroundClick(host) {
  if (host.dataset.notesBound) return;   // hosts are re-rendered on language change; bind once
  host.dataset.notesBound = '1';
  host.addEventListener('click', e => {
    if (e.target.closest('.tk, .badge')) return;
    hideNotes(host);
    host.querySelectorAll('.tk.on').forEach(x => x.classList.remove('on'));
  });
}
