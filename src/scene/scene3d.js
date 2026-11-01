// 3D reader view: browse the film, turn the knob to load a frame onto the screen, read, return.
import * as THREE from 'three';
import '../styles/chrome.css';
import { CONFIG } from '../config.js';
import { SECTIONS, getContent } from '../core/content.js';
import { LANGS, getLang, setLang, onLangChange, pick, t } from '../core/i18n.js';
import { renderSection } from '../sections/index.js';
import { el } from '../sections/dom.js';
import { createStage } from './stage.js';
import { loadModels } from './models.js';
import { buildMachine } from './machine.js';
import { buildFilm } from './film.js';
import { createFilm, dragStart, dragMove, dragEnd, wheel, nudge, goTo, stepFilm, filmIndex, isSettled } from './filmPhysics.js';
import { zoomDistance, loadTimeline, unloadTimeline } from './zoom.js';
import { READER, nextReader, canBrowse } from './readerMachine.js';

const CANVAS_FONTS = ['600 64px "Cormorant Garamond"', 'italic 500 64px "Cormorant Garamond"', '500 32px "IBM Plex Mono"', '600 64px "Noto Serif SC"', '600 64px "Noto Serif JP"'];
const POWER_ON_AT = 1.2;   // seconds into the load timeline when the screen flickers on

export async function mountScene(root, { sound, switchView, lowPower = false, calm = false }) {
  await Promise.race([Promise.all(CANVAS_FONTS.map(f => document.fonts.load(f, 'Aa中日'))), new Promise(r => setTimeout(r, 2500))]);
  const canvas = document.getElementById('gl');
  let stage;
  try {
    stage = createStage(canvas, { lowPower, calm });
  } catch (err) {
    throw new Error(`WebGL unavailable: ${err.message}`);
  }
  let models;
  try {
    models = await loadModels(import.meta.env.BASE_URL);
  } catch (err) {
    stage.dispose();                                   // free the GL context before the 2D fallback takes over
    throw err;
  }

  const data = getContent();
  let lang = getLang();
  const machine = buildMachine(stage, models, lang);
  const film = buildFilm(stage, lang);
  await Promise.all([film.relabel(lang), machine.screen.drawIdle(0, lang)]);   // labels painted with the right glyphs before first frame
  const physics = createFilm({ count: SECTIONS.length });
  const { camera } = stage;
  const { REST } = CONFIG.SCREEN, [BW, BH] = CONFIG.SCREEN.BEZEL, [GW, GH] = CONFIG.SCREEN.GLASS;
  const FILM_C = new THREE.Vector3(...CONFIG.FILM_CENTER);
  const IDLE_POS = new THREE.Vector3(...CONFIG.CAMERA.POS), IDLE_LOOK = new THREE.Vector3(...CONFIG.CAMERA.LOOK);
  const speed = calm ? 2 : 1;   // reduced motion: everything twice as fast

  // ---------------------------------------------------------------- DOM chrome
  const kicker = el('div', { class: 'kicker' }), role = el('div', { class: 'role' });
  const brand = el('header', { class: 'brand' }, kicker, el('h1', {}, 'Optical Archive'), el('div', { class: 'who' }, data.profile.name), role);
  const counter = el('div', { class: 'counter', 'aria-live': 'polite' });
  const hint = el('div', { class: 'hint' });
  const soundBtn = el('button', { type: 'button', class: 'chip', onclick: () => { sound.setEnabled(!sound.enabled); soundBtn.blur(); paintChrome(); } });
  const simpleBtn = el('button', { type: 'button', class: 'chip', onclick: () => switchView('2d') });
  const readerBody = el('div', { class: 'section' });
  const reader = el('div', { class: 'reader', role: 'dialog', 'aria-modal': 'true' }, el('div', { class: 'paper' }, readerBody));
  const exitKey = el('kbd', {}, 'ESC');
  const exitLabel = el('span');
  const exit = el('button', { type: 'button', class: 'exit', onclick: () => unload() }, exitLabel, exitKey);
  const shell = el('div', { class: 'oa3d' }, brand, counter, hint, el('div', { class: 'topright' }, soundBtn, simpleBtn), reader, exit);
  root.replaceChildren(shell);
  canvas.classList.add('active');

  function paintChrome() {
    kicker.textContent = t('ui.brand.kicker', lang);
    role.textContent = pick(data.profile.role, lang);
    hint.textContent = `${t('ui.hint.browse', lang)}  ·  ${t('ui.hint.load', lang)}`;
    soundBtn.textContent = t(sound.enabled ? 'ui.sound.on' : 'ui.sound.off', lang);
    soundBtn.classList.toggle('on', sound.enabled);
    simpleBtn.textContent = t('ui.view.simple', lang);
    exitLabel.textContent = `◀ ${t('ui.back', lang)}`;
    paintCounter();
  }
  const paintCounter = () => {
    const i = filmIndex(physics);
    counter.textContent = `${String(i + 1).padStart(2, '0')} / ${String(SECTIONS.length).padStart(2, '0')}  ·  ${t(`nav.${SECTIONS[i].id}`, lang).toUpperCase()}`;
  };

  // ---------------------------------------------------------------- reading state
  let state = READER.IDLE, phase = 0, zt = 0, readingIdx = 0, poweredOn = false;

  function load() {
    if (state !== READER.IDLE) return;
    readingIdx = filmIndex(physics);
    goTo(physics, readingIdx);
    state = nextReader(state, 'LOAD'); phase = 0; poweredOn = false;
    sound.clunk(); setTimeout(() => sound.whirr(), 250);
  }
  function showReader() {
    renderSection(readerBody, SECTIONS[readingIdx].id, { data, lang });
    reader.firstChild.scrollTop = 0;
    reader.classList.add('show');
    shell.classList.add('zoomed');
    placeReader();
    exit.focus({ preventScroll: true });
  }
  function unload() {
    if (state !== READER.ZOOMED) return;
    state = nextReader(state, 'BACK'); phase = 0;
    reader.classList.remove('show');
    shell.classList.remove('zoomed');
    sound.clunk();
  }

  // ---------------------------------------------------------------- input
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), mouse = new THREE.Vector2();
  const isIn = (obj, group) => { for (let p = obj; p; p = p.parent) if (p === group) return true; return false; };
  function pickAt(e) {
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([...film.meshes, machine.loadKnob.group, machine.langKnob.group, machine.screen.glass], true)[0]?.object;
    if (!hit) return null;
    if (isIn(hit, machine.loadKnob.group) || hit === machine.screen.glass) return { kind: 'load' };
    if (isIn(hit, machine.langKnob.group)) return { kind: 'lang' };
    const ci = film.frameAt(hit);
    return ci === null ? null : { kind: 'frame', index: ci };
  }
  const worldPerPx = () => 2 * camera.position.distanceTo(FILM_C) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / innerHeight;

  let drag = null;
  function onDown(e) {
    if (state === READER.ZOOMED) { unload(); return; }       // clicking the dimmed machine backs out
    if (!canBrowse(state)) return;
    drag = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastT: performance.now(), moved: 0 };
    canvas.setPointerCapture?.(e.pointerId);
    canvas.classList.add('dragging');
    dragStart(physics);
  }
  function onMove(e) {
    mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    if (!drag) { if (canBrowse(state)) canvas.classList.toggle('hover', !!pickAt(e)); return; }
    const now = performance.now();
    dragMove(physics, (e.clientX - drag.lastX) * worldPerPx() * 1.1, (now - drag.lastT) / 1000);
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
    drag.lastX = e.clientX; drag.lastT = now;
  }
  function onUp(e) {
    if (!drag) return;
    const wasClick = drag.moved < 6, stale = performance.now() - drag.lastT > 80;
    drag = null; canvas.classList.remove('dragging');
    if (stale) physics.vel = 0;
    dragEnd(physics);
    if (wasClick) onClick(e);
  }
  function onClick(e) {
    const hit = pickAt(e);
    if (!hit) return;
    if (hit.kind === 'load') { load(); return; }
    if (hit.kind === 'lang') { setLang(LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length]); sound.clunk(); return; }
    if (hit.index === filmIndex(physics)) load(); else goTo(physics, hit.index);
  }
  function onWheel(e) {
    e.preventDefault();
    if (canBrowse(state) && !drag) wheel(physics, e.deltaY + e.deltaX);
  }
  function onKey(e) {
    if (state === READER.IDLE) {
      if (e.key === 'ArrowRight') nudge(physics, 1);
      else if (e.key === 'ArrowLeft') nudge(physics, -1);
      else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) load();
    } else if (state === READER.ZOOMED && (e.key === 'Escape' || (e.key === 'Backspace' && !e.target.closest?.('input, textarea')))) {
      e.preventDefault(); unload();
    }
  }
  canvas.addEventListener('pointerdown', onDown);
  addEventListener('pointermove', onMove);
  addEventListener('pointerup', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  addEventListener('keydown', onKey);
  const onResize = () => { stage.resize(); if (state === READER.ZOOMED) placeReader(); };
  addEventListener('resize', onResize);
  const offLang = onLangChange(l => {
    lang = l; document.documentElement.lang = l;
    film.relabel(l); machine.screen.drawIdle(filmIndex(physics), l); machine.langKnob.setLang(l);
    paintChrome();
    if (state === READER.ZOOMED) { renderSection(readerBody, SECTIONS[readingIdx].id, { data, lang }); reader.classList.remove('flash'); void reader.offsetWidth; reader.classList.add('flash'); }
  });

  // ---------------------------------------------------------------- per-frame
  const corner = (x, y, obj) => obj.localToWorld(new THREE.Vector3(x, y, 0)).project(camera);
  function screenRect(obj, w, h) {      // [x0, y0, x1, y1] in 0–1, y up
    const a = corner(-w / 2, -h / 2, obj), b = corner(w / 2, h / 2, obj);
    return [Math.min(a.x, b.x), Math.min(a.y, b.y), Math.max(a.x, b.x), Math.max(a.y, b.y)].map(v => (v + 1) / 2);
  }
  function placeReader() {
    const [x0, y0, x1, y1] = screenRect(machine.screen.glass, GW, GH);
    Object.assign(reader.style, { left: `${x0 * innerWidth}px`, top: `${(1 - y1) * innerHeight}px`, width: `${(x1 - x0) * innerWidth}px`, height: `${(y1 - y0) * innerHeight}px` });
  }
  const camPos = IDLE_POS.clone(), camLook = IDLE_LOOK.clone(), tPos = new THREE.Vector3(), tLook = new THREE.Vector3(), zPos = new THREE.Vector3(), zLook = new THREE.Vector3();
  let lastIdx = -1, last = performance.now(), raf = 0;

  function frame(now, dt) {
    const time = now / 1000;
    if (canBrowse(state) && !drag) stepFilm(physics, dt);
    film.update(physics.offset);
    const idx = filmIndex(physics);
    if (idx !== lastIdx) {
      if (lastIdx !== -1) sound.tick();
      lastIdx = idx; machine.screen.drawIdle(idx, lang); paintCounter();
    }
    const prog = physics.max ? THREE.MathUtils.clamp(physics.offset / physics.max, 0, 1) : 0;
    machine.rewinds.left.setSpin(-physics.offset / CONFIG.REEL.R); machine.rewinds.right.setSpin(-physics.offset / CONFIG.REEL.R);
    machine.rewinds.left.setFill(1 - prog); machine.rewinds.right.setFill(prog);
    machine.setGateGlow(state === READER.IDLE && isSettled(physics) ? 3.2 + Math.sin(time * 3) * 0.6 : 1.4);

    if (state === READER.LOADING) {
      phase += dt * speed;
      const tl = loadTimeline(phase);
      machine.loadKnob.setTurn(tl.knob); zt = tl.zoom;
      if (phase > POWER_ON_AT && !poweredOn) { poweredOn = true; sound.powerOn(); }
      machine.setScreenPower(phase > POWER_ON_AT && !tl.done && !calm ? Math.random() * 0.45 : 0);
      if (tl.done) { state = nextReader(state, 'LOADED'); zt = 1; machine.setScreenPower(0); showReader(); }
    } else if (state === READER.UNLOADING) {
      phase += dt * speed;
      const tl = unloadTimeline(phase);
      machine.loadKnob.setTurn(tl.knob); zt = tl.zoom;
      if (tl.done) { state = nextReader(state, 'UNLOADED'); zt = 0; }
    }

    const rig = machine.screen.rig;
    rig.position.z = REST[2] + CONFIG.SCREEN.SLIDE * zt;
    zLook.set(REST[0], REST[1], REST[2] + CONFIG.SCREEN.SLIDE + 0.18);
    zPos.copy(zLook).add(new THREE.Vector3(0, 0, zoomDistance({ bezelW: BW, bezelH: BH, fovDeg: camera.fov, aspect: camera.aspect })));
    tPos.copy(IDLE_POS).add(new THREE.Vector3(mouse.x * 0.35, mouse.y * 0.18, 0));
    tLook.copy(IDLE_LOOK).add(new THREE.Vector3(mouse.x * 0.1, mouse.y * 0.05, 0));
    if (calm) { tPos.copy(IDLE_POS); tLook.copy(IDLE_LOOK); }
    tPos.lerp(zPos, zt); tLook.lerp(zLook, zt);
    const follow = zt > 0 && zt < 1 ? 1 : 1 - Math.exp(-5 * dt);
    camPos.lerp(tPos, follow); camLook.lerp(tLook, follow);
    camera.position.copy(camPos); camera.lookAt(camLook);

    machine.setLampLevel(1 - 0.45 * zt);
    stage.setFocus(screenRect(machine.screen.bezel, BW, BH), zt);
    if (state === READER.ZOOMED) placeReader();
    machine.update(time, dt);
    stage.render(time);
  }
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    frame(now, dt);
    raf = requestAnimationFrame(loop);
  }

  paintChrome();
  frame(performance.now(), 0);          // first frame is on screen before we report ready
  raf = requestAnimationFrame(loop);
  if (import.meta.env.DEV) window.__oa = { load, unload, get state() { return state; }, step(n = 1) { for (let i = 0; i < n; i++) frame(performance.now(), 1 / 30); },
    screenPos(name) { const v = new THREE.Vector3(); (name === 'lang' ? machine.langKnob.group : machine.loadKnob.group).getWorldPosition(v).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; } };

  return {
    destroy() {
      cancelAnimationFrame(raf); offLang();
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('wheel', onWheel);
      removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp);
      removeEventListener('keydown', onKey); removeEventListener('resize', onResize);
      stage.dispose(); canvas.classList.remove('active'); root.replaceChildren();
    },
  };
}
