// The reader bench: one machine on a wooden worktable. An articulated column behind the screen carries
// a boom: the screen hangs from it on a sliding yoke, and two reels hang from its cross beam on thin
// rods. The film strip lies across the bench through a lit reading gate and ribbons up to the reels.
// A small control panel, parallel to the screen, holds the language and VIEW/LOAD knobs; a desk lamp
// lights the gate. (No projector body, lens, housing box or lever.)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CONFIG } from '../config.js';
import { SECTIONS } from '../core/content.js';
import { t } from '../core/i18n.js';
import { canvasTex, grungeTex, woodTex, windowTex, drawDial, ensureFonts, agedBrassMaps, flangeAlpha, filmPackFaceTex } from './textures.js';
import { filmPose, reelHub, guideExit } from './film.js';
import { clockText } from './clock.js';

const V = (a) => new THREE.Vector3(...a);
const UP = new THREE.Vector3(0, 1, 0);

export function buildMachine(stage, lang) {
  const { scene } = stage;
  const grunge = grungeTex();
  const M = {
    brass: new THREE.MeshStandardMaterial({ color: 0xc09056, metalness: 1, roughness: 0.55, roughnessMap: grunge }),
    brassDark: new THREE.MeshStandardMaterial({ color: 0x8a6232, metalness: 1, roughness: 0.75, roughnessMap: grunge }),
    iron: new THREE.MeshStandardMaterial({ color: 0x2c2620, metalness: 0.85, roughness: 0.95, roughnessMap: grunge }),
    ironMid: new THREE.MeshStandardMaterial({ color: 0x4a3f33, metalness: 0.8, roughness: 0.85, roughnessMap: grunge }),
    wood: new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.62 }),
    glow: new THREE.MeshBasicMaterial({ color: 0xffa040 }),
    bulb: new THREE.MeshStandardMaterial({ color: 0xffe0a8, emissive: 0xffc070, emissiveIntensity: 4.5 }),
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

  // ---- articulated column behind the screen, a boom over it, and a cross beam for the reels
  const { COLUMN: [cx, cz], BOOM_Y, BEAM_Z } = CONFIG.RIG;
  const { X: RX, Z: RZ, R: RR, DEPTH: RD } = CONFIG.REEL;
  const SCREEN_Z = CONFIG.SCREEN.REST[2];
  mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.08, 48), M.iron, [cx, 0.04, cz]);
  mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.015, 48), M.brass, [cx, 0.085, cz]);
  const elbow = new THREE.Vector3(cx, 2.35, cz - 0.28), top = new THREE.Vector3(cx, BOOM_Y + 0.1, cz);
  rod(new THREE.Vector3(cx, 0.08, cz), elbow, 0.075, M.ironMid);
  rod(elbow, top, 0.065, M.ironMid);
  for (const [p, r] of [[elbow, 0.12], [top, 0.11]]) {
    mesh(new THREE.CylinderGeometry(r, r, 0.22, 32).rotateZ(Math.PI / 2), M.brass, [p.x, p.y, p.z]);
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 12).rotateZ(Math.PI / 2), M.ironMid, [p.x, p.y, p.z]);
  }
  // boom: a rail running forward over the screen; the screen's yoke slides along it
  rod(top, new THREE.Vector3(cx, BOOM_Y + 0.1, SCREEN_Z + CONFIG.SCREEN.SLIDE + 0.15), 0.045, M.brassDark);
  // cross beam the reels hang from
  rod(new THREE.Vector3(-RX - 0.1, BOOM_Y, BEAM_Z), new THREE.Vector3(RX + 0.1, BOOM_Y, BEAM_Z), 0.04, M.ironMid);
  mesh(new THREE.BoxGeometry(0.16, 0.16, Math.abs(BEAM_Z - cz) + 0.12), M.iron, [cx, BOOM_Y, (BEAM_Z + cz) / 2]);
  for (const x of [-RX, RX]) mesh(new THREE.SphereGeometry(0.06, 16, 12), M.brass, [x, BOOM_Y, BEAM_Z]);

  // ---- reels: aged brass flanges with cut-outs, glossy wound film, steel hub; each hangs on a thin rod
  const brassTex = agedBrassMaps(), cutouts = flangeAlpha(), packFace = filmPackFaceTex();
  const flangeMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: brassTex.map, bumpMap: brassTex.bump, bumpScale: 1.2, roughnessMap: brassTex.rough, roughness: 0.85,
    metalness: 1, clearcoat: 0.15, clearcoatRoughness: 0.4, alphaMap: cutouts, alphaTest: 0.5, side: THREE.DoubleSide,
  });
  const packSideMat = new THREE.MeshPhysicalMaterial({ color: 0x2a190c, roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.4, sheenColor: 0x8a5a2a });
  const packFaceMat = new THREE.MeshPhysicalMaterial({ map: packFace, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xb8b4ac, metalness: 1, roughness: 0.28, roughnessMap: grunge });
  const packMin = RR * 0.3, packMax = RR * 0.9;
  function reel(side) {
    const hub = reelHub(side), RY = hub.y;
    const g = group([hub.x, hub.y, hub.z]);
    // hanger: rod from the cross beam down to a clamp on the axle behind the reel
    const backZ = BEAM_Z - RZ;
    mesh(new THREE.CylinderGeometry(0.018, 0.018, BOOM_Y - RY, 12), M.brass, [0, (BOOM_Y - RY) / 2, backZ], g);
    mesh(new THREE.CylinderGeometry(0.035, 0.035, Math.abs(backZ) + RD / 2 + 0.06, 16).rotateX(Math.PI / 2), steel, [0, 0, backZ / 2 - 0.02], g);
    mesh(new RoundedBoxGeometry(0.1, 0.12, 0.08, 2, 0.02), M.iron, [0, 0, backZ], g);
    const spin = new THREE.Group(); g.add(spin);
    for (const z of [-RD / 2, RD / 2]) {
      mesh(new THREE.CircleGeometry(RR, 96), flangeMat, [0, 0, z], spin);
      mesh(new THREE.TorusGeometry(RR - 0.006, 0.014, 10, 96), M.brass, [0, 0, z], spin);
    }
    const pack = new THREE.Group(); spin.add(pack);
    mesh(new THREE.CylinderGeometry(1, 1, RD * 0.88, 96, 1, true).rotateX(Math.PI / 2), packSideMat, [0, 0, 0], pack);
    for (const z of [-RD * 0.44, RD * 0.44]) mesh(new THREE.CircleGeometry(1, 96), packFaceMat, [0, 0, z], pack);
    mesh(new THREE.CylinderGeometry(RR * 0.2, RR * 0.2, RD * 1.05, 40).rotateX(Math.PI / 2), M.brass, [0, 0, 0], spin);
    mesh(new THREE.CylinderGeometry(0.04, 0.04, RD * 1.3, 20).rotateX(Math.PI / 2), steel, [0, 0, 0], spin);
    for (let k = 0; k < 3; k++) {                       // set screws on the hub collar
      const a = k / 3 * Math.PI * 2;
      mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 10).rotateX(Math.PI / 2), steel, [Math.cos(a) * RR * 0.14, Math.sin(a) * RR * 0.14, RD * 0.53], spin);
    }
    let radius = packMax;
    return {
      setSpin(angle) { spin.rotation.z = angle; },
      /** f = 0..1 share of the film on this reel; returns the film pack radius. */
      setFill(f) { radius = THREE.MathUtils.lerp(packMin, packMax, f); pack.scale.set(radius, radius, 1); return radius; },
    };
  }
  const rewinds = { left: reel(-1), right: reel(1) };

  // ---- reading gate: light box below, brass frame with a glowing inner edge
  const gate = new THREE.Group(); filmPose(0, gate); scene.add(gate);
  mesh(new RoundedBoxGeometry(1.13, 0.68, 0.14, 2, 0.03), M.iron, [0, 0, -0.1], gate);
  const gw = 0.93, gh = 0.55, gt = 0.03;
  for (const [x, y, w, h] of [[0, gh / 2, gw + gt, gt], [0, -gh / 2, gw + gt, gt], [gw / 2, 0, gt, gh], [-gw / 2, 0, gt, gh]]) mesh(new THREE.BoxGeometry(w, h, 0.03), M.brass, [x, y, 0.03], gate);
  for (const [x, y, w, h] of [[0, gh / 2 - 0.022, gw - 0.02, 0.008], [0, -gh / 2 + 0.022, gw - 0.02, 0.008], [gw / 2 - 0.022, 0, 0.008, gh - 0.03], [-gw / 2 + 0.022, 0, 0.008, gh - 0.03]]) {
    mesh(new THREE.PlaneGeometry(w, h), M.glow, [x, y, 0.047], gate).castShadow = false;
  }
  // guide gates at the strip ends: the frames disappear into them; the film leaves over a small brass roller on top
  const steelPin = new THREE.MeshStandardMaterial({ color: 0xb8b4ac, metalness: 1, roughness: 0.3 });
  for (const side of [-1, 1]) {
    const box = new THREE.Group(); filmPose(side * (CONFIG.STRIP_END + 0.09), box); scene.add(box);
    mesh(new RoundedBoxGeometry(0.17, 0.82, 0.1, 3, 0.025), M.iron, [0, 0, -0.01], box);            // slim gate hugging the film
    for (const y of [-0.41, 0.41]) mesh(new RoundedBoxGeometry(0.2, 0.03, 0.13, 2, 0.01), M.brass, [0, y, -0.01], box);
    mesh(new THREE.BoxGeometry(0.11, 0.54, 0.006), M.brassDark, [0, 0, 0.042], box);                 // engraved face plate
    for (const y of [-0.23, 0.23]) mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 12).rotateX(Math.PI / 2), M.brass, [0, y, 0.048], box);
    mesh(new THREE.BoxGeometry(0.006, 0.34, 0.004), M.iron, [0, 0, 0.046], box);                     // film slot
    const exit = guideExit(side), rollerR = 0.045, rx = exit.x - side * rollerR;
    mesh(new THREE.CylinderGeometry(rollerR, rollerR, CONFIG.REEL.DEPTH * 1.25, 32).rotateX(Math.PI / 2), M.brass, [rx, exit.y - 0.01, exit.z]);
    for (const dz of [-1, 1]) mesh(new THREE.CylinderGeometry(rollerR * 1.25, rollerR * 1.25, 0.008, 32).rotateX(Math.PI / 2), M.brassDark, [rx, exit.y - 0.01, exit.z + dz * CONFIG.REEL.DEPTH * 0.65]);
    mesh(new THREE.CylinderGeometry(0.012, 0.012, CONFIG.REEL.DEPTH * 1.6, 12).rotateX(Math.PI / 2), steelPin, [rx, exit.y - 0.01, exit.z]);
  }
  rod(new THREE.Vector3(-CONFIG.STRIP_END, 0.16, 1.32), new THREE.Vector3(CONFIG.STRIP_END, 0.16, 1.32), 0.035, M.brass);
  const ruler = canvasTex(2048, 64, (g, w) => {
    g.fillStyle = '#2a2016'; g.fillRect(0, 0, w, 64); g.strokeStyle = '#c8a46a';
    for (let x = 0; x < w; x += 16) { const big = (x / 16) % 10 === 0; g.lineWidth = big ? 3 : 1.5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, big ? 40 : 20); g.stroke(); }
  });
  mesh(new THREE.PlaneGeometry(2 * CONFIG.STRIP_END, 0.22).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: ruler, metalness: 0.6, roughness: 0.5 }), [0, 0.012, 1.55]);
  mesh(new THREE.ConeGeometry(0.07, 0.12, 3).rotateX(-Math.PI / 2), M.brass, [0, 0.06, 1.6]);

  // ---- reading screen: brass bezel, back plate and glowing glass, hung from a yoke that slides along the boom
  const { REST, BEZEL: [BW, BH], GLASS: [GW, GH] } = CONFIG.SCREEN;
  const rig = group(REST);
  mesh(new RoundedBoxGeometry(BW + 0.04, BH + 0.04, 0.12, 4, 0.05), M.iron, [0, 0, -0.02], rig);
  const yokeY = BOOM_Y - REST[1] - 0.16, railY = BOOM_Y + 0.1 - REST[1];
  for (const x of [-0.85, 0.85]) mesh(new THREE.CylinderGeometry(0.022, 0.022, yokeY - BH / 2, 12), M.brass, [x, (yokeY + BH / 2) / 2, -0.02], rig);
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.9, 16).rotateZ(Math.PI / 2), M.brassDark, [0, yokeY, -0.02], rig);
  mesh(new THREE.CylinderGeometry(0.03, 0.03, railY - yokeY, 12), M.ironMid, [0, (yokeY + railY) / 2, -0.02], rig);
  mesh(new RoundedBoxGeometry(0.2, 0.12, 0.2, 2, 0.03), M.iron, [0, railY, -0.02], rig);   // carriage riding the rail
  const bezel = mesh(new RoundedBoxGeometry(BW, BH, 0.12, 4, 0.06), M.brass, [0, 0, 0.1], rig);
  mesh(new RoundedBoxGeometry(GW + 0.08, GH + 0.08, 0.05, 2, 0.02), M.iron, [0, 0, 0.15], rig);
  for (const [x, y] of [[-1.22, 0.82], [1.22, 0.82], [-1.22, -0.82], [1.22, -0.82]]) mesh(new THREE.SphereGeometry(0.035, 12, 8), M.brass, [x, y, 0.17], rig);
  const screenTex = canvasTex(1024, 668, () => {});
  const glass = mesh(new THREE.PlaneGeometry(GW, GH), new THREE.MeshStandardMaterial({
    color: 0x000000, emissiveMap: screenTex, emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.6,
  }), [0, 0, 0.18], rig);
  glass.castShadow = glass.receiveShadow = false;

  /** Paper background, scanlines and the header (machine name, a status line, the visitor's local time). */
  function paintScreenBase(status) {
    const c = screenTex.userData.canvas, g = c.getContext('2d'), w = c.width, h = c.height;
    const gr = g.createRadialGradient(w / 2, h * 0.42, 40, w / 2, h / 2, w * 0.62);
    gr.addColorStop(0, '#f0e2c0'); gr.addColorStop(0.7, '#cdb58a'); gr.addColorStop(1, '#8a7350');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(60,40,20,.07)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
    g.textAlign = 'left'; g.fillStyle = '#5a3a1a'; g.font = '500 26px "IBM Plex Mono"';
    g.fillText('OPTICAL ARCHIVE · READER OR-3', 70, 90);
    g.fillText(status, 70, 128);
    const now = clockText();
    g.textAlign = 'right'; g.font = '500 44px "IBM Plex Mono"'; g.fillText(now.time, w - 70, 96);
    g.font = '500 22px "IBM Plex Mono"'; g.fillText(now.date, w - 70, 128); g.textAlign = 'left';
    return { g, w, h };
  }
  const serifFor = l => (l === 'zh' ? '"Noto Serif SC"' : l === 'ja' ? '"Noto Serif JP"' : '"Cormorant Garamond"');

  let idleGen = 0;
  async function drawIdle(index, l) {
    const mine = ++idleGen, id = SECTIONS[index].id, serif = serifFor(l);
    await ensureFonts([`600 120px ${serif}`, `500 46px ${serif}`], t(`section.${id}.title`, l) + t(`section.${id}.tagline`, l) + t('ui.screen.load', l));
    if (mine !== idleGen) return;
    const { g } = paintScreenBase(`FRAME ${String(index + 1).padStart(2, '0')} / ${String(SECTIONS.length).padStart(2, '0')}`);
    g.fillStyle = '#2d2117'; g.font = `600 ${l === 'en' ? 150 : 120}px ${serif}`; g.fillText(t(`section.${id}.title`, l), 64, 360);
    g.fillStyle = '#6a4a2a'; g.font = `${l === 'en' ? 'italic ' : ''}500 46px ${serif}`; g.fillText(t(`section.${id}.tagline`, l), 70, 430);
    g.fillStyle = '#7a4a22'; g.font = `500 26px "IBM Plex Mono", ${serif}`; g.fillText(t('ui.screen.load', l), 70, 580);
    screenTex.needsUpdate = true;
  }
  drawIdle(0, lang);

  // ---- control panel, parallel to the screen, facing the camera; two knobs with their labels on an outer ring
  const { POS: [kx, ky, kz], SIZE: [KW, KH], KNOB_X } = CONFIG.CONSOLE;
  const panel = group([kx, ky, kz]); panel.rotation.x = -0.12;
  mesh(new RoundedBoxGeometry(KW, KH, 0.09, 3, 0.03), M.iron, [0, 0, 0], panel);
  for (const [x, y, w, h] of [[0, KH / 2, KW, 0.02], [0, -KH / 2, KW, 0.02], [KW / 2, 0, 0.02, KH], [-KW / 2, 0, 0.02, KH]]) mesh(new THREE.BoxGeometry(w, h, 0.1), M.brass, [x, y, 0], panel);
  for (const x of [-KW / 2 + 0.12, KW / 2 - 0.12]) mesh(new THREE.CylinderGeometry(0.025, 0.035, ky - KH / 2, 12), M.ironMid, [kx + x, (ky - KH / 2) / 2, kz - 0.02]);
  const plate = canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#c4a067'; g.fillRect(0, 0, w, h); g.strokeStyle = '#5a3c18'; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#3a240c'; g.font = '500 30px "IBM Plex Mono"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('OR-3', w / 2, h / 2 + 2);
  });
  mesh(new THREE.PlaneGeometry(0.2, 0.05), new THREE.MeshStandardMaterial({ map: plate, metalness: 0.7, roughness: 0.45 }), [0, -KH / 2 + 0.05, 0.047], panel);
  const DIAL_R = 0.15;
  function knob(x, labels) {
    const mount = group([x, 0.02, 0.046], panel);
    const dial = canvasTex(512, 512, c => drawDial(c.canvas, labels, 0.76));
    mesh(new THREE.CircleGeometry(DIAL_R, 64), new THREE.MeshStandardMaterial({ map: dial, metalness: 0.4, roughness: 0.55 }), [0, 0, 0.001], mount);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x8a6232, metalness: 1, roughness: 0.5 });   // brass bezel ring
    mesh(new THREE.RingGeometry(DIAL_R * 0.98, DIAL_R * 1.06, 64), ringMat, [0, 0, 0.002], mount);
    const k = new THREE.Group(); mount.add(k);
    mesh(new THREE.CylinderGeometry(0.068, 0.074, 0.07, 40).rotateX(Math.PI / 2), M.brass, [0, 0, 0.035], k);
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2;
      mesh(new THREE.BoxGeometry(0.009, 0.012, 0.064), M.brassDark, [Math.cos(a) * 0.072, Math.sin(a) * 0.072, 0.035], k).rotation.z = a;
    }
    mesh(new THREE.CylinderGeometry(0.048, 0.056, 0.016, 40).rotateX(Math.PI / 2), M.ironMid, [0, 0, 0.076], k);
    mesh(new THREE.BoxGeometry(0.012, 0.07, 0.008), M.pointer, [0, 0.04, 0.086], k);
    return { k, ringMat };
  }
  const load = knob(KNOB_X, [{ text: 'VIEW', angle: 0 }, { text: 'LOAD', angle: Math.PI / 2 }]);
  const LANG_ANGLE = { en: -Math.PI / 4, zh: 0, ja: Math.PI / 4 };
  const langKnob = knob(-KNOB_X, [{ text: 'EN', angle: -Math.PI / 4, size: 52 }, { text: '中', angle: 0, size: 60 }, { text: '日', angle: Math.PI / 4, size: 60 }]);
  let langTarget = -LANG_ANGLE[lang];
  langKnob.k.rotation.z = langTarget;

  // ---- lamp hanging from the front cross beam on a jointed brass arm, aimed at the reading gate
  const FILM_C = V(CONFIG.FILM_CENTER);
  const [lx, ly, lz] = CONFIG.LAMP;
  const knuckle = new THREE.Vector3(lx, ly + 0.42, lz);
  rod(new THREE.Vector3(lx, BOOM_Y, BEAM_Z), knuckle, 0.016, M.brass);
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 16), M.brassDark, [lx, BOOM_Y - 0.03, BEAM_Z]);   // clamp on the beam
  mesh(new THREE.SphereGeometry(0.04, 16, 12), M.brass, [knuckle.x, knuckle.y, knuckle.z]);
  const shade = group([lx, ly, lz]); shade.lookAt(FILM_C); shade.updateMatrixWorld(true);
  rod(knuckle, shade.localToWorld(new THREE.Vector3(0, 0, -0.02)), 0.014, M.brass);
  const profile = [[0.035, 0], [0.06, 0.05], [0.15, 0.17], [0.22, 0.3], [0.235, 0.34]].map(([r, h]) => new THREE.Vector2(r, h));
  const shadeGeo = new THREE.LatheGeometry(profile, 64).rotateX(Math.PI / 2);                 // opening faces +z (towards the gate)
  const outer = mesh(shadeGeo, new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: brassTex.map, bumpMap: brassTex.bump, bumpScale: 0.6,
    roughnessMap: brassTex.rough, roughness: 0.75, metalness: 1, side: THREE.FrontSide }), [0, 0, 0], shade);
  const inner = mesh(shadeGeo, new THREE.MeshStandardMaterial({ color: 0xf3e6c8, emissive: 0xffc070, emissiveIntensity: 0.25, roughness: 0.6, side: THREE.BackSide }), [0, 0, 0], shade);
  mesh(new THREE.TorusGeometry(0.235, 0.008, 8, 64), M.brass, [0, 0, 0.34], shade);
  mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.08, 20).rotateX(Math.PI / 2), M.ironMid, [0, 0, 0.04], shade);   // socket
  mesh(new THREE.SphereGeometry(0.055, 20, 14), M.bulb, [0, 0, 0.13], shade);
  for (const m of [outer, inner]) m.castShadow = false;                                      // the spot sits inside the shade
  const lampHead = shade.localToWorld(new THREE.Vector3(0, 0, 0.18));
  const spot = new THREE.SpotLight(0xffb066, CONFIG.LAMP_INTENSITY, 0, 0.5, 0.7, 2);
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
    loadKnob: {
      group: load.k,
      setTurn(t01) { load.k.rotation.z = -t01 * Math.PI / 2; },   // VIEW -> LOAD
    },
    langKnob: { group: langKnob.k, setLang(l) { langTarget = -LANG_ANGLE[l]; } },
    setGateGlow(v) { M.glow.color.setRGB(1, 0.62, 0.25).multiplyScalar(v); },
    setLampLevel(k) { spot.intensity = CONFIG.LAMP_INTENSITY * k; },
    setScreenPower(extra) { glass.material.emissiveIntensity = 0.8 + extra; },
    update(time, dt) {
      langKnob.k.rotation.z += (langTarget - langKnob.k.rotation.z) * (1 - Math.exp(-14 * dt));
      for (let i = 0; i < N; i++) {
        pos[i * 3] = base[i * 3] + Math.sin(time * 0.21 + seed[i]) * 0.08;
        pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(time * 0.13 + seed[i] * 2) * 0.1;
      }
      dustGeo.attributes.position.needsUpdate = true;
    },
  };
}
