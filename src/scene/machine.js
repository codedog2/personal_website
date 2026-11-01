// The reader bench: one machine on a wooden worktable. Two rewind reels feed the strip through a lit
// reading gate; behind it the reading screen; a free-standing LOAD knob on the right, a language knob
// on the left; a desk lamp lights the gate. (Spec §4.3 — no projector body, lens, panel box or lever.)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CONFIG } from '../config.js';
import { SECTIONS } from '../core/content.js';
import { t } from '../core/i18n.js';
import { canvasTex, grungeTex, woodTex, windowTex, drawDial, ensureFonts } from './textures.js';
import { filmPose } from './film.js';

const V = (a) => new THREE.Vector3(...a);
const UP = new THREE.Vector3(0, 1, 0);

export function buildMachine(stage, models, lang) {
  const { scene } = stage;
  const grunge = grungeTex();
  const M = {
    brass: new THREE.MeshStandardMaterial({ color: 0xc09056, metalness: 1, roughness: 0.55, roughnessMap: grunge }),
    brassDark: new THREE.MeshStandardMaterial({ color: 0x8a6232, metalness: 1, roughness: 0.75, roughnessMap: grunge }),
    iron: new THREE.MeshStandardMaterial({ color: 0x2c2620, metalness: 0.85, roughness: 0.95, roughnessMap: grunge }),
    ironMid: new THREE.MeshStandardMaterial({ color: 0x4a3f33, metalness: 0.8, roughness: 0.85, roughnessMap: grunge }),
    wood: new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.62 }),
    glow: new THREE.MeshBasicMaterial({ color: 0xffa040 }),
    pointer: new THREE.MeshStandardMaterial({ color: 0xf2e2c0, roughness: 0.4 }),
  };

  const mesh = (geo, mat, [x, y, z] = [0, 0, 0], parent = scene) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  };
  const rod = (a, b, r, mat) => {
    const d = new THREE.Vector3().subVectors(b, a);
    const m = mesh(new THREE.CylinderGeometry(r, r, d.length(), 20), mat);
    m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(UP, d.normalize());
    return m;
  };
  const group = ([x, y, z], parent = scene) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

  // ---- room
  mesh(new THREE.BoxGeometry(16, 0.25, 8), M.wood, [0, -0.125, 0.2]);
  const wall = mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshStandardMaterial({ color: 0x15100b, roughness: 1 }), [0, 6, -6]);
  wall.castShadow = false;
  mesh(new THREE.PlaneGeometry(10, 6.25), new THREE.MeshBasicMaterial({ map: windowTex(), color: 0x6a6a68 }), [-2.5, 4.2, -5.9]).castShadow = false;
  for (let i = 0; i < 3; i++) {                                   // stacked film tins, front left
    const tin = mesh(new THREE.CylinderGeometry(0.62 - i * 0.03, 0.62 - i * 0.03, 0.2, 48), i % 2 ? M.ironMid : M.brassDark, [-4.2, 0.1 + i * 0.21, 0.3]);
    mesh(new THREE.TorusGeometry(0.61 - i * 0.03, 0.012, 6, 48).rotateX(Math.PI / 2), M.brass, [0, 0.1, 0], tin);
  }

  // ---- rewinds: reel bottoms meet the film line at x = ±REEL.X
  const { X: RX, R: RR } = CONFIG.REEL, spoolScale = RR / 0.089;
  function rewind(x, withCrank) {
    const g = group([x, 0.36, 0.53]);
    const hubY = CONFIG.FILM_CENTER[1] + 0.06 - 0.36 + RR;
    mesh(new RoundedBoxGeometry(0.55, 0.12, 0.7, 2, 0.03), M.iron, [0, 0.06, -0.2], g);
    mesh(new THREE.CylinderGeometry(0.06, 0.08, hubY, 20), M.ironMid, [0, hubY / 2, -0.32], g);
    mesh(new RoundedBoxGeometry(0.3, 0.3, 0.22, 3, 0.05), M.iron, [0, hubY, -0.3], g);
    mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.6, 12).rotateX(Math.PI / 2), M.brass, [0, hubY, -0.05], g);
    const hub = group([0, hubY, 0], g);
    const turn = new THREE.Group(); turn.rotation.y = Math.PI / 2; hub.add(turn);   // spool axis (local x) → world z
    // wrap the model nodes: meshopt quantization keeps its own scale/offset on them, which must not be overwritten
    const wrap = obj => { const w = new THREE.Group(); w.add(obj.clone()); w.scale.setScalar(spoolScale); turn.add(w); return w; };
    const spool = wrap(models.spool), film = wrap(models.woundFilm);
    let crank = null;
    if (withCrank) {
      crank = group([0, 0, 0.24], hub);
      mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 20).rotateX(Math.PI / 2), M.brass, [0, 0, 0], crank);
      mesh(new THREE.BoxGeometry(0.06, 0.5, 0.04), M.brass, [0, 0.25, 0.02], crank);
      mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.22, 20).rotateX(Math.PI / 2), M.wood, [0, 0.48, 0.13], crank);
    }
    return {
      setSpin(angle) { spool.rotation.x = film.rotation.x = angle; if (crank) crank.rotation.z = angle; },
      setFill(f) { const k = (0.55 + 0.45 * f) * spoolScale; film.scale.set(spoolScale, k, k); },
    };
  }
  const rewinds = { left: rewind(-RX, false), right: rewind(RX, true) };

  // ---- reading gate: light box below, brass frame with a glowing inner edge
  const gate = new THREE.Group(); filmPose(0, gate); scene.add(gate);
  mesh(new RoundedBoxGeometry(1.36, 0.82, 0.14, 2, 0.03), M.iron, [0, 0, -0.1], gate);
  const gw = 1.12, gh = 0.66, gt = 0.035;
  for (const [x, y, w, h] of [[0, gh / 2, gw + gt, gt], [0, -gh / 2, gw + gt, gt], [gw / 2, 0, gt, gh], [-gw / 2, 0, gt, gh]]) mesh(new THREE.BoxGeometry(w, h, 0.03), M.brass, [x, y, 0.03], gate);
  for (const [x, y, w, h] of [[0, gh / 2 - 0.022, gw - 0.02, 0.008], [0, -gh / 2 + 0.022, gw - 0.02, 0.008], [gw / 2 - 0.022, 0, 0.008, gh - 0.03], [-gw / 2 + 0.022, 0, 0.008, gh - 0.03]]) {
    mesh(new THREE.PlaneGeometry(w, h), M.glow, [x, y, 0.047], gate).castShadow = false;
  }
  rod(new THREE.Vector3(-RX, 0.16, 1.32), new THREE.Vector3(RX, 0.16, 1.32), 0.035, M.brass);
  const ruler = canvasTex(2048, 64, (g, w) => {
    g.fillStyle = '#2a2016'; g.fillRect(0, 0, w, 64); g.strokeStyle = '#c8a46a';
    for (let x = 0; x < w; x += 16) { const big = (x / 16) % 10 === 0; g.lineWidth = big ? 3 : 1.5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, big ? 40 : 20); g.stroke(); }
  });
  mesh(new THREE.PlaneGeometry(2 * RX, 0.22).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: ruler, metalness: 0.6, roughness: 0.5 }), [0, 0.012, 1.55]);
  mesh(new THREE.ConeGeometry(0.07, 0.12, 3).rotateX(-Math.PI / 2), M.brass, [0, 0.06, 1.6]);

  // ---- reading screen: TV body as housing, brass bezel, glowing glass (slides forward on load)
  const { REST, BEZEL: [BW, BH], GLASS: [GW, GH] } = CONFIG.SCREEN;
  const rig = group(REST);
  models.tv.scale.setScalar(7.2); models.tv.position.set(0, -1.6, -0.84); rig.add(models.tv);
  const bezel = mesh(new RoundedBoxGeometry(BW, BH, 0.12, 4, 0.06), M.brass, [0, 0, 0.1], rig);
  mesh(new RoundedBoxGeometry(GW + 0.08, GH + 0.08, 0.05, 2, 0.02), M.iron, [0, 0, 0.15], rig);
  for (const [x, y] of [[-1.22, 0.82], [1.22, 0.82], [-1.22, -0.82], [1.22, -0.82]]) mesh(new THREE.SphereGeometry(0.035, 12, 8), M.brass, [x, y, 0.17], rig);
  const screenTex = canvasTex(1024, 668, () => {});
  const glass = mesh(new THREE.PlaneGeometry(GW, GH), new THREE.MeshStandardMaterial({
    color: 0x000000, emissiveMap: screenTex, emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.6,
  }), [0, 0, 0.18], rig);
  glass.castShadow = glass.receiveShadow = false;

  let idleGen = 0;
  async function drawIdle(index, l) {
    const mine = ++idleGen, id = SECTIONS[index].id;
    const serifName = l === 'zh' ? '"Noto Serif SC"' : l === 'ja' ? '"Noto Serif JP"' : '"Cormorant Garamond"';
    await ensureFonts([`600 120px ${serifName}`, `500 46px ${serifName}`], t(`section.${id}.title`, l) + t(`section.${id}.tagline`, l) + t('ui.screen.load', l));
    if (mine !== idleGen) return;
    const c = screenTex.userData.canvas, g = c.getContext('2d'), w = c.width, h = c.height;
    const gr = g.createRadialGradient(w / 2, h * 0.42, 40, w / 2, h / 2, w * 0.62);
    gr.addColorStop(0, '#f0e2c0'); gr.addColorStop(0.7, '#cdb58a'); gr.addColorStop(1, '#8a7350');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(60,40,20,.07)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
    const serif = serifName;
    g.textAlign = 'left'; g.fillStyle = '#5a3a1a'; g.font = '500 26px "IBM Plex Mono"';
    g.fillText('OPTICAL ARCHIVE · READER OR-3', 70, 90);
    g.fillText(`FRAME ${String(index + 1).padStart(2, '0')} / ${String(SECTIONS.length).padStart(2, '0')}`, 70, 128);
    g.fillStyle = '#2d2117'; g.font = `600 ${l === 'en' ? 150 : 120}px ${serif}`; g.fillText(t(`section.${id}.title`, l), 64, 360);
    g.fillStyle = '#6a4a2a'; g.font = `${l === 'en' ? 'italic ' : ''}500 46px ${serif}`; g.fillText(t(`section.${id}.tagline`, l), 70, 430);
    g.fillStyle = '#7a4a22'; g.font = `500 26px "IBM Plex Mono", ${serif}`; g.fillText(t('ui.screen.load', l), 70, 580);
    screenTex.needsUpdate = true;
  }
  drawIdle(0, lang);

  // ---- knobs: free-standing (iron base, stem, iron cup, engraved dial, knurled brass knob)
  function knobStand(pos, scale, labels) {
    const [x, y, z] = pos;
    const s = scale;
    mesh(new THREE.CylinderGeometry(0.28 * s, 0.32 * s, 0.07, 48), M.iron, [x, 0.395, z - 0.19]);
    mesh(new THREE.CylinderGeometry(0.3 * s, 0.3 * s, 0.015, 48), M.brass, [x, 0.435, z - 0.19]);
    mesh(new THREE.CylinderGeometry(0.045, 0.06, y - 0.38, 20), M.ironMid, [x, (y + 0.43) / 2, z - 0.19]);
    const mount = group(pos); mount.rotation.set(-0.18, -0.12 * Math.sign(x), 0); mount.scale.setScalar(s);
    mesh(new THREE.CylinderGeometry(0.43, 0.45, 0.12, 64).rotateX(Math.PI / 2), M.iron, [0, 0, -0.11], mount);
    mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.05, 64).rotateX(Math.PI / 2), M.brassDark, [0, 0, -0.03], mount);
    const dial = canvasTex(512, 512, c => drawDial(c.canvas, labels));
    mesh(new THREE.CircleGeometry(0.38, 64), new THREE.MeshStandardMaterial({ map: dial, metalness: 0.4, roughness: 0.55 }), [0, 0, 0], mount);
    const knob = new THREE.Group(); mount.add(knob);
    mesh(new THREE.CylinderGeometry(0.21, 0.23, 0.17, 48).rotateX(Math.PI / 2), M.brass, [0, 0, 0.09], knob);
    for (let i = 0; i < 28; i++) {
      const a = i / 28 * Math.PI * 2;
      mesh(new THREE.BoxGeometry(0.022, 0.03, 0.16), M.brassDark, [Math.cos(a) * 0.222, Math.sin(a) * 0.222, 0.09], knob).rotation.z = a;
    }
    mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.05, 48).rotateX(Math.PI / 2), M.ironMid, [0, 0, 0.19], knob);
    mesh(new THREE.BoxGeometry(0.035, 0.15, 0.02), M.pointer, [0, 0.08, 0.22], knob);
    return knob;
  }
  const load = knobStand(CONFIG.LOAD_KNOB, 1, [{ text: 'VIEW', angle: 0 }, { text: 'LOAD', angle: Math.PI / 2 }]);
  const LANG_ANGLE = { en: -Math.PI / 4, zh: 0, ja: Math.PI / 4 };
  const langKnob = knobStand(CONFIG.LANG_KNOB, 0.62, [{ text: 'EN', angle: -Math.PI / 4, size: 56 }, { text: '中', angle: 0, size: 64 }, { text: '日', angle: Math.PI / 4, size: 64 }]);
  let langTarget = -LANG_ANGLE[lang];
  langKnob.rotation.z = langTarget;

  // ---- desk lamp lighting the gate
  const FILM_C = V(CONFIG.FILM_CENTER);
  const [lx, ly, lz] = CONFIG.LAMP;
  const lamp = models.lamp;
  lamp.position.set(lx, ly, lz); lamp.rotation.y = Math.atan2(FILM_C.x - lx, FILM_C.z - lz) + Math.PI; lamp.scale.setScalar(3.7);
  scene.add(lamp); lamp.updateMatrixWorld(true);
  let lampHead = new THREE.Vector3(lx - 1, 3.2, lz + 1);
  lamp.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = false;                                  // the spot sits inside the shade
    if (/_light$/.test(o.material.name)) {
      o.material = new THREE.MeshStandardMaterial({ color: 0xffe0a8, emissive: 0xffc070, emissiveIntensity: 9 });
      lampHead = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
    }
  });
  const spot = new THREE.SpotLight(0xffb066, 95, 0, 0.42, 0.65, 2);
  spot.position.copy(lampHead); spot.target.position.copy(FILM_C);
  spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0004; spot.shadow.normalBias = 0.02;
  scene.add(spot, spot.target);
  scene.add(new THREE.HemisphereLight(0x6a5038, 0x0a0705, 0.35));
  const rim = new THREE.PointLight(0xff9548, 22, 0, 2); rim.position.set(-1.5, 3.6, -3.2); scene.add(rim);
  const fill = new THREE.PointLight(0xffc890, 6, 0, 2); fill.position.set(-2, 2.5, 4); scene.add(fill);

  // ---- dust drifting in the lamp beam
  const N = 500, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const k = Math.random(), p = lampHead.clone().lerp(FILM_C, k), sp = 0.1 + k * 0.9;
    pos.set([p.x + (Math.random() * 2 - 1) * sp, p.y + (Math.random() * 2 - 1) * sp * 0.5, p.z + (Math.random() * 2 - 1) * sp], i * 3);
    seed[i] = Math.random() * 100;
  }
  const base = pos.slice();
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffd8a0, size: 0.012, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })));

  return {
    rewinds,
    screen: { rig, glass, bezel, restPos: rig.position.clone(), drawIdle },
    loadKnob: { group: load, setTurn(t01) { load.rotation.z = -t01 * Math.PI / 2; } },
    langKnob: { group: langKnob, setLang(l) { langTarget = -LANG_ANGLE[l]; } },
    setGateGlow(v) { M.glow.color.setRGB(1, 0.62, 0.25).multiplyScalar(v); },
    setLampLevel(k) { spot.intensity = 95 * k; },
    setScreenPower(extra) { glass.material.emissiveIntensity = 0.8 + extra; },
    update(time, dt) {
      langKnob.rotation.z += (langTarget - langKnob.rotation.z) * (1 - Math.exp(-14 * dt));
      for (let i = 0; i < N; i++) {
        pos[i * 3] = base[i * 3] + Math.sin(time * 0.21 + seed[i]) * 0.08;
        pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(time * 0.13 + seed[i] * 2) * 0.1;
      }
      dustGeo.attributes.position.needsUpdate = true;
    },
  };
}
