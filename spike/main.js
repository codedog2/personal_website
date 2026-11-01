// THROWAWAY SPIKE — judging look & feel of a code-built archive machine.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SECTIONS, renderSection } from './content.js';
import { loadModels } from './models.js';

const SCREEN_COVER = 0.75;            // bezel width / viewport width when zoomed in

// ---------------------------------------------------------------- fonts first (canvas textures use them)
await Promise.race([
  Promise.all([
    document.fonts.load('600 64px "Cormorant Garamond"'),
    document.fonts.load('italic 500 64px "Cormorant Garamond"'),
    document.fonts.load('500 32px "IBM Plex Mono"'),
  ]),
  new Promise(r => setTimeout(r, 2500)),
]);

// ---------------------------------------------------------------- renderer / scene / camera
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0705);
scene.fog = new THREE.FogExp2(0x0a0705, 0.055);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.32;

const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.05, 60);
const IDLE_POS = new THREE.Vector3(0, 2.55, 6.6);
const IDLE_LOOK = new THREE.Vector3(0, 1.45, 0);
camera.position.copy(IDLE_POS);
camera.lookAt(IDLE_LOOK);

// ---------------------------------------------------------------- procedural textures
function canvasTex(w, h, draw, { srgb = true, repeat } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.userData.canvas = c;
  return t;
}
const rnd = (a, b) => a + Math.random() * (b - a);

// grime/wear roughness map: mid grey with blotches and scratches
const grunge = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#999'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 5000; i++) {
    const v = rnd(110, 210) | 0; g.fillStyle = `rgba(${v},${v},${v},0.22)`;
    g.beginPath(); g.arc(rnd(0, w), rnd(0, h), rnd(0.5, 7), 0, 7); g.fill();
  }
  for (let i = 0; i < 160; i++) {
    g.strokeStyle = `rgba(${Math.random() < .5 ? '60,60,60' : '230,230,230'},0.25)`; g.lineWidth = rnd(.3, 1.4);
    const x = rnd(0, w), y = rnd(0, h); g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd(-60, 60), y + rnd(-14, 14)); g.stroke();
  }
}, { srgb: false, repeat: [2, 2] });

const woodTex = canvasTex(1024, 512, (g, w, h) => {
  g.fillStyle = '#3a2615'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) {
    const a = rnd(0.02, 0.12), light = Math.random() < .4;
    g.strokeStyle = light ? `rgba(120,80,45,${a})` : `rgba(10,5,2,${a * 1.6})`;
    g.lineWidth = rnd(1, 3); g.beginPath();
    for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.006 + y * 0.05) * 4);
    g.stroke();
  }
  for (let i = 0; i < 9; i++) { // knots
    const x = rnd(0, w), y = rnd(0, h), r = rnd(6, 16);
    const gr = g.createRadialGradient(x, y, 0, x, y, r * 3); gr.addColorStop(0, 'rgba(15,8,3,.7)'); gr.addColorStop(1, 'rgba(15,8,3,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * 3, r, 0, 0, 7); g.fill();
  }
}, { repeat: [2, 1] });

// ---------------------------------------------------------------- materials
const M = {
  brass: new THREE.MeshStandardMaterial({ color: 0xc09056, metalness: 1, roughness: 0.55, roughnessMap: grunge }),
  brassDark: new THREE.MeshStandardMaterial({ color: 0x8a6232, metalness: 1, roughness: 0.75, roughnessMap: grunge }),
  iron: new THREE.MeshStandardMaterial({ color: 0x2c2620, metalness: 0.85, roughness: 0.95, roughnessMap: grunge }),
  ironMid: new THREE.MeshStandardMaterial({ color: 0x4a3f33, metalness: 0.8, roughness: 0.85, roughnessMap: grunge }),
  wood: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.62, metalness: 0 }),
  red: new THREE.MeshStandardMaterial({ color: 0xc23a1c, roughness: 0.3, metalness: 0.1 }),
  filmRoll: new THREE.MeshStandardMaterial({ color: 0x1c140c, roughness: 0.35, metalness: 0.2 }),
  bulb: new THREE.MeshStandardMaterial({ color: 0xffe0a8, emissive: 0xffc070, emissiveIntensity: 9 }),
  glow: new THREE.MeshBasicMaterial({ color: 0xffa040 }),
};
M.glow.color.multiplyScalar(4); // pushes into bloom range

function mesh(geo, mat, x = 0, y = 0, z = 0, parent = scene) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m;
}
const UP = new THREE.Vector3(0, 1, 0);
function rod(a, b, r, mat, parent = scene) {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = mesh(new THREE.CylinderGeometry(r, r, d.length(), 20), mat, 0, 0, 0, parent);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}
function rivets(parent, pts, r = 0.035) {
  for (const [x, y, z] of pts) mesh(new THREE.SphereGeometry(r, 12, 8), M.brass, x, y, z, parent);
}

// ---------------------------------------------------------------- room
mesh(new THREE.BoxGeometry(16, 0.25, 8), M.wood, 0, -0.125, 0.2);
const wall = mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshStandardMaterial({ color: 0x15100b, roughness: 1 }), 0, 6, -6);
const windowTex = canvasTex(1024, 640, (g, w, h) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  const cols = 6, rows = 4, pad = 14;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = c * w / cols + pad, y = r * h / rows + pad, cw = w / cols - pad * 2, ch = h / rows - pad * 2;
    const gr = g.createLinearGradient(x, y, x + cw, y + ch);
    gr.addColorStop(0, `rgba(150,160,165,${0.55 - r * 0.08})`); gr.addColorStop(1, `rgba(90,95,100,${0.35 - r * 0.05})`);
    g.fillStyle = gr; g.fillRect(x, y, cw, ch);
  }
});
mesh(new THREE.PlaneGeometry(10, 6.25), new THREE.MeshBasicMaterial({ map: windowTex, color: 0x6a6a68, fog: true }), -2.5, 4.2, -5.9);

// ---------------------------------------------------------------- machine plinth + left housing
const plinth = mesh(new RoundedBoxGeometry(6.2, 0.36, 2.2, 3, 0.05), M.iron, 0, 0.18, -1.15);
mesh(new THREE.BoxGeometry(6.24, 0.05, 2.24), M.brassDark, 0, 0.34, -1.15);

const housing = new THREE.Group(); housing.position.set(-2.35, 0.36, -1.35); scene.add(housing);
mesh(new RoundedBoxGeometry(1.75, 2.0, 1.4, 4, 0.1), M.iron, 0, 1.0, 0, housing);
for (const y of [0.18, 1.82]) mesh(new THREE.BoxGeometry(1.79, 0.07, 1.44), M.brass, 0, y, 0, housing);
const plateTex = canvasTex(512, 200, (g, w, h) => {
  g.fillStyle = '#c4a067'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#5a3c18'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20);
  g.fillStyle = '#3a240c'; g.textAlign = 'center';
  g.font = '500 46px "IBM Plex Mono"'; g.fillText('ARCHIVE READER', w / 2, 92);
  g.font = '500 40px "IBM Plex Mono"'; g.fillText('OR-3', w / 2, 152);
});
mesh(new THREE.PlaneGeometry(0.95, 0.37), new THREE.MeshStandardMaterial({ map: plateTex, metalness: 0.7, roughness: 0.45 }), 0, 1.25, 0.705, housing);
rivets(housing, [[-0.5, 1.46, 0.71], [0.5, 1.46, 0.71], [-0.5, 1.04, 0.71], [0.5, 1.04, 0.71]], 0.022);
// vent grille
for (let i = 0; i < 7; i++) mesh(new THREE.BoxGeometry(1.1, 0.03, 0.04), M.brassDark, 0, 0.42 + i * 0.075, 0.71, housing);
// dials
for (const x of [-0.45, 0.45]) {
  mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.08, 32).rotateX(Math.PI / 2), M.brass, x, 1.62, 0.72, housing);
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 16).rotateX(Math.PI / 2), M.ironMid, x, 1.62, 0.76, housing);
}
// lens column (top of housing)
const lens = new THREE.Group(); lens.position.set(0.3, 2.0, 0.15); housing.add(lens);
mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.35, 40), M.ironMid, 0, 0.18, 0, lens);
mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 40), M.brass, 0, 0.38, 0, lens);
mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.45, 40), M.brass, 0, 0.62, 0, lens);
for (let i = 0; i < 4; i++) mesh(new THREE.TorusGeometry(0.27, 0.015, 8, 40).rotateX(Math.PI / 2), M.brassDark, 0, 0.45 + i * 0.1, 0, lens);

// ---------------------------------------------------------------- reels
const reelHoleAlpha = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 2, 0, 7); g.fill();
  g.fillStyle = '#000';
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2, r = w * 0.31;
    g.beginPath(); g.ellipse(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r, w * 0.11, w * 0.075, a, 0, 7); g.fill();
  }
  g.beginPath(); g.arc(w / 2, h / 2, w * 0.035, 0, 7); g.fill();
}, { srgb: false });
const reelPlateMat = new THREE.MeshStandardMaterial({ color: 0xb08650, metalness: 1, roughness: 0.6, roughnessMap: grunge,
  alphaMap: reelHoleAlpha, alphaTest: 0.5, side: THREE.DoubleSide });
function makeReel(r, depth) {
  const g = new THREE.Group();
  for (const z of [-depth / 2, depth / 2]) {
    mesh(new THREE.CircleGeometry(r, 64), reelPlateMat, 0, 0, z, g);
    mesh(new THREE.TorusGeometry(r, 0.025, 10, 64), M.brass, 0, 0, z, g);
  }
  mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, depth * 0.9, 48).rotateX(Math.PI / 2), M.filmRoll, 0, 0, 0, g);
  mesh(new THREE.CylinderGeometry(r * 0.16, r * 0.16, depth * 1.4, 24).rotateX(Math.PI / 2), M.brass, 0, 0, 0, g);
  mesh(new THREE.CylinderGeometry(r * 0.06, r * 0.06, depth * 1.8, 12).rotateX(Math.PI / 2), M.ironMid, 0, 0, 0, g);
  return g;
}
const reelL = makeReel(1.0, 0.22); reelL.position.set(-3.35, 2.45, -1.0); scene.add(reelL);
const reelArm = rod(new THREE.Vector3(-3.35, 2.45, -1.25), new THREE.Vector3(-2.6, 2.1, -1.25), 0.06, M.ironMid);
const reelR = makeReel(0.62, 0.18); reelR.position.set(3.25, 1.35, -0.55); scene.add(reelR);
const reelRStand = new THREE.Group(); reelRStand.position.set(3.25, 0.36, -0.75); scene.add(reelRStand);
mesh(new RoundedBoxGeometry(0.5, 1.0, 0.28, 3, 0.05), M.iron, 0, 0.5, 0, reelRStand);
// film tins stacked on the left (like the reference)
for (let i = 0; i < 3; i++) {
  const tin = mesh(new THREE.CylinderGeometry(0.62 - i * 0.03, 0.62 - i * 0.03, 0.2, 48), i % 2 ? M.ironMid : M.brassDark, -4.2, 0.1 + i * 0.21, 0.3);
  mesh(new THREE.TorusGeometry(0.61 - i * 0.03, 0.012, 6, 48).rotateX(Math.PI / 2), M.brass, 0, 0.1, 0, tin);
}

// ---------------------------------------------------------------- reading screen (slides forward on load)
const GW = 2.3, GH = 1.5, BW = 2.62, BH = 1.82;
const screenRig = new THREE.Group(); screenRig.position.set(0.35, 2.12, -1.05); scene.add(screenRig);
const SCREEN_REST_Z = screenRig.position.z, SCREEN_REST_Y = screenRig.position.y;
mesh(new RoundedBoxGeometry(2.8, 2.0, 0.55, 4, 0.08), M.iron, 0, 0, -0.2, screenRig);
const bezel = mesh(new RoundedBoxGeometry(BW, BH, 0.12, 4, 0.06), M.brass, 0, 0, 0.1, screenRig);
mesh(new RoundedBoxGeometry(GW + 0.08, GH + 0.08, 0.05, 2, 0.02), M.iron, 0, 0, 0.15, screenRig);
rivets(screenRig, [[-1.22, 0.82, 0.17], [1.22, 0.82, 0.17], [-1.22, -0.82, 0.17], [1.22, -0.82, 0.17]]);
// the stand it slides on
const rail = new THREE.Group(); rail.position.set(0.35, 0.36, -1.05); scene.add(rail);
mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.85, 24), M.ironMid, 0, 0.42, -0.2, rail);
for (const x of [-0.5, 0.5]) mesh(new THREE.BoxGeometry(0.08, 0.06, 1.6), M.brassDark, x, 0.03, 0.4, rail);
// screen idle image (sepia CRT)
const screenTex = canvasTex(1024, 668, () => {});
const glass = mesh(new THREE.PlaneGeometry(GW, GH), new THREE.MeshStandardMaterial({
  color: 0x000000, emissiveMap: screenTex, emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.6, metalness: 0,
}), 0, 0, 0.18, screenRig);
function drawScreen(idx) {
  const c = screenTex.userData.canvas, g = c.getContext('2d'), w = c.width, h = c.height;
  const gr = g.createRadialGradient(w / 2, h * 0.42, 40, w / 2, h / 2, w * 0.62);
  gr.addColorStop(0, '#f0e2c0'); gr.addColorStop(0.7, '#cdb58a'); gr.addColorStop(1, '#8a7350');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(60,40,20,.07)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
  const s = SECTIONS[idx];
  g.fillStyle = '#5a3a1a'; g.textAlign = 'left';
  g.font = '500 26px "IBM Plex Mono"'; g.fillText(`OPTICAL ARCHIVE · READER OR-3`, 70, 90);
  g.fillText(`FRAME ${String(idx + 1).padStart(2, '0')} / ${String(SECTIONS.length).padStart(2, '0')}`, 70, 128);
  g.fillStyle = '#2d2117'; g.font = '600 150px "Cormorant Garamond"'; g.fillText(s.title, 64, 360);
  g.fillStyle = '#6a4a2a'; g.font = 'italic 500 46px "Cormorant Garamond"'; g.fillText(s.tagline, 70, 430);
  g.fillStyle = '#7a4a22'; g.font = '500 24px "IBM Plex Mono"'; g.fillText('▶ PRESS ENTER OR TURN THE KNOB TO LOAD', 70, 580);
  screenTex.needsUpdate = true;
}

// ---------------------------------------------------------------- load knob: turn VIEW → LOAD
const knobMount = new THREE.Group(); knobMount.position.set(2.05, 1.0, -0.05); knobMount.rotation.set(-0.18, -0.12, 0); scene.add(knobMount);
const dialTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#20170e'; g.beginPath(); g.arc(256, 256, 252, 0, 7); g.fill();
  g.strokeStyle = '#c8a46a'; g.lineWidth = 6; g.beginPath(); g.arc(256, 256, 238, 0, 7); g.stroke();
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * Math.PI * 2, major = i % 10 === 0, r1 = major ? 196 : 212;
    g.lineWidth = major ? 5 : 2; g.beginPath(); g.moveTo(256 + Math.cos(a) * r1, 256 + Math.sin(a) * r1); g.lineTo(256 + Math.cos(a) * 230, 256 + Math.sin(a) * 230); g.stroke();
  }
  g.fillStyle = '#ecd3a0'; g.font = '500 40px "IBM Plex Mono"'; g.textAlign = 'center';
  g.fillText('VIEW', 256, 175 - 70);
  g.save(); g.translate(256 + 150, 256); g.rotate(Math.PI / 2); g.fillText('LOAD', 0, 14); g.restore();
});
// free-standing control: weighted base, stem, iron cup behind the dial
mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.07, 48), M.iron, 2.05, 0.395, -0.24);
mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.015, 48), M.brass, 2.05, 0.435, -0.24);
mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.62, 20), M.ironMid, 2.05, 0.74, -0.24);
mesh(new THREE.CylinderGeometry(0.43, 0.45, 0.12, 64).rotateX(Math.PI / 2), M.iron, 0, 0, -0.11, knobMount);
mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.05, 64).rotateX(Math.PI / 2), M.brassDark, 0, 0, -0.03, knobMount);
mesh(new THREE.CircleGeometry(0.38, 64), new THREE.MeshStandardMaterial({ map: dialTex, metalness: 0.4, roughness: 0.55 }), 0, 0, 0.0, knobMount);
const knob = new THREE.Group(); knobMount.add(knob);
mesh(new THREE.CylinderGeometry(0.21, 0.23, 0.17, 48).rotateX(Math.PI / 2), M.brass, 0, 0, 0.09, knob);
for (let i = 0; i < 28; i++) {              // knurled grip
  const a = i / 28 * Math.PI * 2;
  mesh(new THREE.BoxGeometry(0.022, 0.03, 0.16), M.brassDark, Math.cos(a) * 0.222, Math.sin(a) * 0.222, 0.09, knob).rotation.z = a;
}
mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.05, 48).rotateX(Math.PI / 2), M.ironMid, 0, 0, 0.19, knob);
mesh(new THREE.BoxGeometry(0.035, 0.15, 0.02), new THREE.MeshStandardMaterial({ color: 0xf2e2c0, roughness: 0.4 }), 0, 0.08, 0.22, knob);
const KNOB_VIEW = 0, KNOB_LOAD = -Math.PI / 2;
const isKnob = o => { for (let p = o; p; p = p.parent) if (p === knob) return true; return false; };

const FILM_C = new THREE.Vector3(0, 0.55, 0.95);

// ---------------------------------------------------------------- CC0 models replace the code-built hero props
const MD = await loadModels(scene, FILM_C);
for (const o of [housing, reelL, reelArm, reelR, reelRStand]) o.visible = false;
screenRig.children[0].visible = false;                                    // TV body replaces the iron box
screenRig.add(MD.tv); MD.tv.position.set(0, -1.6, -0.84);
const shadePos = MD.lampHead.clone();

// ---------------------------------------------------------------- rewinds: film runs reel → gate → reel
const REEL_X = 3.05, REEL_R = 0.85;
function makeRewind(x, withCrank) {
  const g = new THREE.Group(); g.position.set(x, 0.36, 0.53); scene.add(g);
  const hubY = 0.61 - 0.36 + REEL_R;                                       // reel bottom meets the film line
  mesh(new RoundedBoxGeometry(0.55, 0.12, 0.7, 2, 0.03), M.iron, 0, 0.06, -0.2, g);
  mesh(new THREE.CylinderGeometry(0.06, 0.08, hubY, 20), M.ironMid, 0, hubY / 2, -0.32, g);
  mesh(new RoundedBoxGeometry(0.3, 0.3, 0.22, 3, 0.05), M.iron, 0, hubY, -0.3, g);
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.6, 12).rotateX(Math.PI / 2), M.brass, 0, hubY, -0.05, g);
  const hub = new THREE.Group(); hub.position.set(0, hubY, 0); g.add(hub);
  const turn = new THREE.Group(); turn.rotation.y = Math.PI / 2; hub.add(turn);   // spool axis (local x) → world z
  const s = MD.spool.clone(); s.scale.setScalar(REEL_R / 0.089); turn.add(s);
  const f = MD.woundFilm.clone(); f.scale.setScalar(REEL_R / 0.089); turn.add(f);
  let crank = null;
  if (withCrank) {
    crank = new THREE.Group(); crank.position.z = 0.24; hub.add(crank);
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 20).rotateX(Math.PI / 2), M.brass, 0, 0, 0, crank);
    mesh(new THREE.BoxGeometry(0.06, 0.5, 0.04), M.brass, 0, 0.25, 0.02, crank);
    mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.22, 20).rotateX(Math.PI / 2), M.wood, 0, 0.48, 0.13, crank);
  }
  return { turn, film: f, crank };
}
const rewL = makeRewind(-REEL_X, false), rewR = makeRewind(REEL_X, true);


const spot = new THREE.SpotLight(0xffb066, 95, 0, 0.42, 0.65, 2);
spot.position.copy(shadePos);
spot.target.position.copy(FILM_C); scene.add(spot, spot.target);
spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0004; spot.shadow.normalBias = 0.02;

const hemi = new THREE.HemisphereLight(0x6a5038, 0x0a0705, 0.35); scene.add(hemi);
const rim = new THREE.PointLight(0xff9548, 22, 0, 2); rim.position.set(-1.5, 3.6, -3.2); scene.add(rim);
const fill = new THREE.PointLight(0xffc890, 6, 0, 2); fill.position.set(-2, 2.5, 4); scene.add(fill);
const screenGlow = new THREE.PointLight(0xffd59a, 1.2, 4, 2); screenGlow.position.set(0.35, 2.1, -0.4); scene.add(screenGlow);

// dust in the lamp beam
const dustN = 500, dustPos = new Float32Array(dustN * 3), dustSeed = new Float32Array(dustN);
for (let i = 0; i < dustN; i++) {
  const t = Math.random(), p = shadePos.clone().lerp(FILM_C, t);
  const spread = 0.1 + t * 0.9;
  dustPos.set([p.x + rnd(-spread, spread), p.y + rnd(-spread, spread) * 0.5, p.z + rnd(-spread, spread)], i * 3);
  dustSeed[i] = Math.random() * 100;
}
const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dustBase = dustPos.slice();
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffd8a0, size: 0.012, transparent: true, opacity: 0.55,
  blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(dust);

// ---------------------------------------------------------------- film strip
const FW = 1.2, FH = 0.88, P = FW;     // frame size, pitch
const LEAD = 5;                          // blank leader frames on each side
const frames = [];
function sepiaFrame(kind, label, idx) {
  return canvasTex(640, 470, (g, w, h) => {
    g.fillStyle = '#1e140b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d8c7a4';           // sprocket holes
    for (let x = 14; x < w; x += 40) { g.beginPath(); g.roundRect(x, 12, 20, 26, 4); g.fill(); g.beginPath(); g.roundRect(x, h - 38, 20, 26, 4); g.fill(); }
    const px = 26, py = 56, pw = w - 52, ph = h - 112;
    g.save(); g.beginPath(); g.roundRect(px, py, pw, ph, 10); g.clip();
    const bg = g.createLinearGradient(0, py, 0, py + ph);
    if (kind === 'leader') { bg.addColorStop(0, '#3a2a18'); bg.addColorStop(1, '#2a1d10'); }
    else { bg.addColorStop(0, '#e2cfa6'); bg.addColorStop(1, '#a88e64'); }
    g.fillStyle = bg; g.fillRect(px, py, pw, ph);
    const ink = 'rgba(70,48,25,', cx = px + pw / 2, cy = py + ph / 2;
    if (kind === 'leader') {
      g.strokeStyle = 'rgba(220,190,140,.35)'; g.lineWidth = 3;
      g.beginPath(); g.arc(cx, cy, 90, 0, 7); g.stroke(); g.beginPath(); g.moveTo(cx - 140, cy); g.lineTo(cx + 140, cy); g.moveTo(cx, cy - 120); g.lineTo(cx, cy + 120); g.stroke();
      g.fillStyle = 'rgba(230,200,150,.5)'; g.font = '600 110px "Cormorant Garamond"'; g.textAlign = 'center'; g.fillText(String(idx), cx, cy + 38);
    } else if (kind === 'about') {
      g.fillStyle = ink + '.18)'; for (let i = 0; i < 8; i++) g.fillRect(px + i * 70, py, 30, ph);
      g.fillStyle = ink + '.85)'; g.beginPath(); g.arc(cx, cy - 40, 62, 0, 7); g.fill();
      g.beginPath(); g.ellipse(cx, cy + 110, 140, 95, 0, Math.PI, 0); g.fill();
    } else if (kind === 'projects') {
      const ridge = (base, amp, a) => { g.fillStyle = ink + a + ')'; g.beginPath(); g.moveTo(px, py + ph);
        for (let x = 0; x <= pw; x += 20) g.lineTo(px + x, base - Math.abs(Math.sin(x * 0.011 + amp)) * amp * 1.4 - Math.sin(x * 0.04) * 8);
        g.lineTo(px + pw, py + ph); g.fill(); };
      ridge(cy + 10, 70, '.35'); ridge(cy + 50, 50, '.6'); ridge(cy + 95, 25, '.85');
    } else if (kind === 'skills') {
      const gear = (x, y, r, n, a) => { g.fillStyle = ink + a + ')'; g.beginPath();
        for (let i = 0; i < n * 2; i++) { const ang = i / (n * 2) * Math.PI * 2, rr = i % 2 ? r : r * 1.18; g.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr); }
        g.fill(); g.fillStyle = '#c9b48c'; g.beginPath(); g.arc(x, y, r * 0.35, 0, 7); g.fill(); };
      gear(cx - 70, cy + 10, 85, 12, '.8'); gear(cx + 85, cy - 45, 55, 9, '.6'); gear(cx + 95, cy + 75, 40, 8, '.45');
    } else if (kind === 'certificates') {
      g.fillStyle = ink + '.55)'; g.beginPath(); g.moveTo(cx - 50, cy - 10); g.lineTo(cx - 80, cy + 130); g.lineTo(cx - 40, cy + 110); g.lineTo(cx - 15, cy + 140); g.lineTo(cx, cy); g.fill();
      g.beginPath(); g.moveTo(cx + 50, cy - 10); g.lineTo(cx + 80, cy + 130); g.lineTo(cx + 40, cy + 110); g.lineTo(cx + 15, cy + 140); g.lineTo(cx, cy); g.fill();
      g.fillStyle = ink + '.85)'; g.beginPath(); g.arc(cx, cy - 30, 80, 0, 7); g.fill();
      g.strokeStyle = '#d8c39a'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy - 30, 60, 0, 7); g.stroke();
    }
    // grain + vignette
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '40,25,10' : '255,240,210'},${rnd(.03, .12)})`; g.fillRect(rnd(px, px + pw), rnd(py, py + ph), 2, 2); }
    const vg = g.createRadialGradient(cx, cy, ph * 0.3, cx, cy, pw * 0.65); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(30,18,6,.55)');
    g.fillStyle = vg; g.fillRect(px, py, pw, ph);
    if (label) {
      g.fillStyle = 'rgba(25,15,6,.35)'; g.fillRect(px, py + ph - 120, pw, 120);
      g.fillStyle = '#fbf0da'; g.font = 'italic 500 84px "Cormorant Garamond"'; g.textAlign = 'center';
      g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 10; g.fillText(label, cx, py + ph - 34); g.shadowBlur = 0;
    }
    g.restore();
  });
}
const frameGeo = new THREE.PlaneGeometry(FW, FH);
const total = LEAD * 2 + SECTIONS.length;
for (let i = 0; i < total; i++) {
  const ci = i - LEAD, content = ci >= 0 && ci < SECTIONS.length;
  const tex = content ? sepiaFrame(SECTIONS[ci].kind, SECTIONS[ci].title) : sepiaFrame('leader', null, ci < 0 ? -ci : ci - SECTIONS.length + 1);
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.05, roughness: 0.45, metalness: 0, side: THREE.DoubleSide });
  const m = new THREE.Mesh(frameGeo, mat);
  m.rotation.order = 'YXZ';
  m.userData = { i, ci, content };
  scene.add(m); frames.push(m);
}
const BEND = 0.045, TILT = -0.62;
function filmPose(s, out) {   // s = distance along strip from the reading gate
  out.position.set(s, FILM_C.y + BEND * 0.15 * s * s, FILM_C.z - BEND * s * s);
  const rise = THREE.MathUtils.smoothstep(Math.abs(s), 1.9, REEL_X);   // stands up as it feeds onto a reel
  out.rotation.set(TILT * (1 - rise), Math.atan(2 * BEND * s), 0);
}
// reading gate: brass frame + glowing edge at s = 0
const gate = new THREE.Group(); filmPose(0, gate); scene.add(gate);
const gw = 1.12, gh = 0.66, gt = 0.035;
for (const [x, y, w, h] of [[0, gh / 2, gw + gt, gt], [0, -gh / 2, gw + gt, gt], [gw / 2, 0, gt, gh], [-gw / 2, 0, gt, gh]]) {
  mesh(new THREE.BoxGeometry(w, h, 0.03), M.brass, x, y, 0.03, gate);
}
const glowEdges = [];
for (const [x, y, w, h] of [[0, gh / 2 - 0.022, gw - 0.02, 0.008], [0, -gh / 2 + 0.022, gw - 0.02, 0.008], [gw / 2 - 0.022, 0, 0.008, gh - 0.03], [-gw / 2 + 0.022, 0, 0.008, gh - 0.03]]) {
  glowEdges.push(mesh(new THREE.PlaneGeometry(w, h), M.glow, x, y, 0.047, gate));
}
// light box under the gate (the frame is read by backlight)
const lightBox = new THREE.Group(); filmPose(0, lightBox); scene.add(lightBox);
mesh(new RoundedBoxGeometry(1.36, 0.82, 0.14, 2, 0.03), M.iron, 0, 0, -0.1, lightBox);
// guide rail + ruler + pointer
rod(new THREE.Vector3(-REEL_X, 0.16, 1.32), new THREE.Vector3(REEL_X, 0.16, 1.32), 0.035, M.brass);
const rulerTex = canvasTex(2048, 64, (g, w, h) => {
  g.fillStyle = '#2a2016'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c8a46a';
  for (let x = 0; x < w; x += 16) { const big = (x / 16) % 10 === 0; g.lineWidth = big ? 3 : 1.5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, big ? 40 : 20); g.stroke(); }
});
mesh(new THREE.PlaneGeometry(7, 0.22).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: rulerTex, metalness: 0.6, roughness: 0.5 }), 0, 0.012, 1.55);
mesh(new THREE.ConeGeometry(0.07, 0.12, 3).rotateX(-Math.PI / 2), M.brass, 0, 0.06, 1.6);
const slider = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 32), M.brass, 0, 0.08, 1.75);

scene.traverse(o => { if (o.isMesh && o !== glass && !glowEdges.includes(o)) { o.castShadow = true; o.receiveShadow = true; } });
wall.castShadow = false;

// ---------------------------------------------------------------- post: bloom + grain/vignette/focus-dim
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(devicePixelRatio, 2));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.55, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const film = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, dim: { value: 0 }, rect: { value: new THREE.Vector4(0.3, 0.3, 0.7, 0.7) },
    texel: { value: new THREE.Vector2(1 / innerWidth, 1 / innerHeight) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time, dim; uniform vec4 rect; uniform vec2 texel; varying vec2 vUv;
    float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      // outside the reading screen: blur + darken while zoomed
      vec2 q = max(rect.xy - vUv, vUv - rect.zw);
      float outside = smoothstep(0.0, 0.03, max(q.x, q.y));
      float k = dim * outside;
      if (k > 0.001) {
        vec3 b = vec3(0.0); float r = 2.5 * k;
        for (int x = -2; x <= 2; x++) for (int y = -2; y <= 2; y++) b += texture2D(tDiffuse, vUv + vec2(x, y) * texel * r * 1.6).rgb;
        c.rgb = mix(c.rgb, b / 25.0, k) * (1.0 - 0.55 * k);
      }
      vec2 p = vUv - 0.5; float d = length(p * vec2(1.0, 0.8));
      c.rgb *= mix(1.0, smoothstep(0.9, 0.25, d), 0.55);
      c.rgb *= vec3(1.03, 1.0, 0.93);
      c.rgb += (rand(vUv * 1000.0 + time) - 0.5) * 0.045;
      c.rgb *= 1.0 + 0.012 * sin(time * 23.0) * sin(time * 7.0);
      gl_FragColor = c;
    }`,
});
composer.addPass(film);

// ---------------------------------------------------------------- sound (synthesised, off by default)
let audio = null, soundOn = false;
const soundBtn = document.getElementById('sound');
soundBtn.onclick = () => {
  soundOn = !soundOn; soundBtn.classList.toggle('on', soundOn); soundBtn.textContent = soundOn ? '♪ SOUND ON' : '♪ SOUND OFF';
  if (soundOn && !audio) audio = new AudioContext();
  soundBtn.blur();
};
function noiseBurst(dur, freq, q, gain, when = 0) {
  if (!soundOn || !audio) return;
  const t = audio.currentTime + when, n = audio.sampleRate * dur | 0, buf = audio.createBuffer(1, n, audio.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  const src = audio.createBufferSource(); src.buffer = buf;
  const f = audio.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const gn = audio.createGain(); gn.gain.value = gain;
  src.connect(f).connect(gn).connect(audio.destination); src.start(t);
}
function thump(when = 0) {
  if (!soundOn || !audio) return;
  const t = audio.currentTime + when, o = audio.createOscillator(), g = audio.createGain();
  o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
  g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.3);
}
const tick = () => noiseBurst(0.025, 3200, 4, 0.5);
const clunk = () => { noiseBurst(0.06, 900, 2, 0.8); thump(0.01); };
const whirr = () => { for (let i = 0; i < 10; i++) noiseBurst(0.03, 1800 + i * 60, 6, 0.18, i * 0.07); };

// ---------------------------------------------------------------- interaction state
const MIN = LEAD * P, MAX = (LEAD + SECTIONS.length - 1) * P;
let offset = MIN, vel = 0, mode = 'spring', target = MIN;
let dragging = false, dragX0 = 0, off0 = 0, lastX = 0, lastT = 0, downX = 0, downY = 0;
let lastIdx = 0, state = 'idle', phase = 0;   // state: idle | loading | zoomed | unloading
const mouse = new THREE.Vector2(), ndc = new THREE.Vector2(), ray = new THREE.Raycaster();
const counter = document.getElementById('counter'), reader = document.getElementById('reader'), readerInner = document.getElementById('readerInner');

const idxOf = o => Math.round(o / P) - LEAD;
const clampT = t => Math.min(MAX, Math.max(MIN, t));
function worldPerPx() { return 2 * camera.position.distanceTo(FILM_C) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / innerHeight; }

canvas.addEventListener('pointerdown', e => {
  if (state === 'zoomed') { unload(); return; }   // clicking the dimmed machine around the screen also backs out
  if (state !== 'idle') return;
  dragging = true; canvas.classList.add('dragging'); canvas.setPointerCapture(e.pointerId);
  dragX0 = lastX = downX = e.clientX; downY = e.clientY; off0 = offset; lastT = performance.now(); vel = 0; mode = 'drag';
});
canvas.addEventListener('pointermove', e => {
  mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (!dragging) { canvas.style.cursor = state === 'idle' && hoverHit(e) ? 'pointer' : ''; return; }
  let o = off0 - (e.clientX - dragX0) * worldPerPx() * 1.1;
  if (o < MIN) o = MIN - (MIN - o) * 0.35; if (o > MAX) o = MAX + (o - MAX) * 0.35;
  const now = performance.now(), dt = Math.max(1, now - lastT) / 1000;
  vel = vel * 0.6 + (o - offset) / dt * 0.4; offset = o; lastX = e.clientX; lastT = now;
});
canvas.addEventListener('pointerup', e => {
  if (!dragging) return;
  dragging = false; canvas.classList.remove('dragging');
  const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
  if (moved < 6) { onClick(e); return; }
  if (performance.now() - lastT > 80) vel = 0;
  if (Math.abs(vel) > 1.2) mode = 'coast'; else { mode = 'spring'; target = clampT(Math.round(offset / P) * P); }
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (state !== 'idle') return;
  vel += (e.deltaY + e.deltaX) * 0.006; vel = THREE.MathUtils.clamp(vel, -14, 14); mode = 'coast';
}, { passive: false });
addEventListener('keydown', e => {
  if (state === 'idle') {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const base = mode === 'spring' ? target : Math.round(offset / P) * P;
      target = clampT(base + (e.key === 'ArrowRight' ? P : -P)); mode = 'spring';
    }
    if (e.key === 'Enter') load();
  } else if (state === 'zoomed' && (e.key === 'Escape' || e.key === 'Backspace')) unload();
});
document.getElementById('exit').onclick = () => unload();

function pick(e) {
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObjects([...frames, knob, glass], true)[0]?.object;
}
function hoverHit(e) { const o = pick(e); return o && (isKnob(o) || o === glass || o.userData.content); }
function onClick(e) {
  const o = pick(e);
  if (!o) { mode = 'spring'; target = clampT(Math.round(offset / P) * P); return; }
  if (isKnob(o) || o === glass) { mode = 'spring'; target = clampT(Math.round(offset / P) * P); load(); return; }
  if (o.userData.content) {
    const t = (o.userData.i) * P;
    if (Math.abs(t - offset) < P * 0.3) load(); else { target = t; mode = 'spring'; }
  } else { mode = 'spring'; target = clampT(Math.round(offset / P) * P); }
}

// ---------------------------------------------------------------- load / unload timeline
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const zoomPos = new THREE.Vector3(), zoomLook = new THREE.Vector3();
const SLIDE = 0.9, LIFT = 0;
function computeZoom() {
  const c = new THREE.Vector3(screenRig.position.x, SCREEN_REST_Y + LIFT, SCREEN_REST_Z + SLIDE + 0.18);
  const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const d = Math.max(BW / (SCREEN_COVER * 2 * tanH * camera.aspect), BH / (0.9 * 2 * tanH));
  zoomLook.copy(c); zoomPos.set(c.x, c.y, c.z + d);
}
function load() {
  if (state !== 'idle') return;
  const idx = THREE.MathUtils.clamp(idxOf(offset), 0, SECTIONS.length - 1);
  target = (idx + LEAD) * P; mode = 'spring';
  state = 'loading'; phase = 0; computeZoom();
  clunk(); setTimeout(whirr, 250);
  readerInner.innerHTML = ''; renderSection(readerInner, SECTIONS[idx]);
  readerInner.scrollTop = 0;
}
function unload() {
  if (state !== 'zoomed') return;
  state = 'unloading'; phase = 0; reader.classList.remove('show'); reader.style.display = 'none'; document.body.classList.remove('zoomed');
  clunk();
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
const tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3(), camLook = IDLE_LOOK.clone(), pose = new THREE.Object3D();
const corners = [new THREE.Vector3(-BW / 2, -BH / 2, 0), new THREE.Vector3(BW / 2, BH / 2, 0), new THREE.Vector3(-GW / 2, -GH / 2, 0), new THREE.Vector3(GW / 2, GH / 2, 0)];
let zt = 0; // 0 = idle camera, 1 = fully zoomed

function projectRect(a, b, mesh) {
  const p1 = mesh.localToWorld(a.clone()).project(camera), p2 = mesh.localToWorld(b.clone()).project(camera);
  return [Math.min(p1.x, p2.x), Math.min(p1.y, p2.y), Math.max(p1.x, p2.x), Math.max(p1.y, p2.y)].map((v, i) => (v + 1) / 2);
}

function frame(ts) {
  const dt = ts === 'manual' ? 1 / 30 : Math.min(clock.getDelta(), 1 / 30), t = clock.elapsedTime;

  // ---- film physics
  if (state === 'idle' && !dragging) {
    if (mode === 'coast') {
      offset += vel * dt; vel *= Math.exp(-2.6 * dt);
      if (offset < MIN || offset > MAX) vel *= Math.exp(-14 * dt);
      if (Math.abs(vel) < 1.0) { mode = 'spring'; target = clampT(Math.round(offset / P) * P); }
    } else if (mode === 'spring') {
      const k = 170, c = 2 * Math.sqrt(k) * 0.72;   // slightly under-damped → tiny settle "bounce"
      vel += (k * (target - offset) - c * vel) * dt; offset += vel * dt;
    }
  }
  const idx = THREE.MathUtils.clamp(idxOf(offset), 0, SECTIONS.length - 1);
  if (idx !== lastIdx) { lastIdx = idx; tick(); drawScreen(idx); counter.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(SECTIONS.length).padStart(2, '0')}  ·  ${SECTIONS[idx].title.toUpperCase()}`; }

  for (const m of frames) {
    const s = m.userData.i * P - offset;
    filmPose(s, m);
    m.visible = Math.abs(s) < REEL_X - 0.15;   // past this point it is wound onto a reel
    const act = Math.max(0, 1 - Math.abs(s) / P);
    m.translateZ(0.05 * act * act);
    m.material.emissiveIntensity = 0.04 + 0.62 * act * act * act;
  }
  // film moves from the left reel to the right one: left unwinds, right fills up, crank turns with it
  const prog = (offset - MIN) / (MAX - MIN);
  rewL.turn.children.forEach(c => c.rotation.x = -offset / REEL_R); rewR.turn.children.forEach(c => c.rotation.x = -offset / REEL_R);
  rewL.film.scale.set(REEL_R / 0.089, (0.55 + 0.45 * (1 - prog)) * REEL_R / 0.089, (0.55 + 0.45 * (1 - prog)) * REEL_R / 0.089);
  rewR.film.scale.set(REEL_R / 0.089, (0.55 + 0.45 * prog) * REEL_R / 0.089, (0.55 + 0.45 * prog) * REEL_R / 0.089);
  rewR.crank.rotation.z = -offset / REEL_R;
  slider.position.x = (offset - MIN) / (MAX - MIN) * 3 - 1.5;
  const settled = state === 'idle' && Math.abs(offset - Math.round(offset / P) * P) < 0.02;
  M.glow.color.setRGB(1, 0.62, 0.25).multiplyScalar(settled ? 3.2 + Math.sin(t * 3) * 0.6 : 1.4);

  // ---- load / unload timeline
  if (state === 'loading') {
    phase += dt;
    knob.rotation.z = THREE.MathUtils.lerp(KNOB_VIEW, KNOB_LOAD, ease(Math.min(1, phase / 0.35)));
    zt = ease(THREE.MathUtils.clamp((phase - 0.25) / 1.15, 0, 1));
    if (phase > 1.45) {
      state = 'zoomed'; zt = 1; document.body.classList.add('zoomed');
      reader.style.display = 'block'; reader.classList.add('show');
    }
  } else if (state === 'unloading') {
    phase += dt;
    zt = 1 - ease(THREE.MathUtils.clamp(phase / 1.0, 0, 1));
    knob.rotation.z = THREE.MathUtils.lerp(KNOB_LOAD, KNOB_VIEW, ease(THREE.MathUtils.clamp((phase - 0.65) / 0.35, 0, 1)));
    if (phase > 1.05) { state = 'idle'; zt = 0; }
  }
  screenRig.position.z = SCREEN_REST_Z + SLIDE * zt;
  screenRig.position.y = SCREEN_REST_Y + LIFT * zt;
  glass.material.emissiveIntensity = 0.8 + (state === 'loading' && phase > 1.2 ? Math.random() * 0.45 : 0);
  screenGlow.position.z = screenRig.position.z + 0.6;

  // ---- camera: idle parallax ↔ zoom pose
  tmpPos.copy(IDLE_POS).add(new THREE.Vector3(mouse.x * 0.35, mouse.y * 0.18, 0));
  tmpLook.copy(IDLE_LOOK).add(new THREE.Vector3(mouse.x * 0.1, mouse.y * 0.05, 0));
  if (zt > 0) { computeZoom(); tmpPos.lerp(zoomPos, zt); tmpLook.lerp(zoomLook, zt); }
  camera.position.lerp(tmpPos, zt > 0 && zt < 1 ? 1 : 1 - Math.exp(-5 * dt));
  camLook.lerp(tmpLook, zt > 0 && zt < 1 ? 1 : 1 - Math.exp(-5 * dt));
  camera.lookAt(camLook);

  // ---- lights + focus dim
  spot.intensity = 95 * (1 - 0.45 * zt) * (1 + 0.02 * Math.sin(t * 31) * Math.sin(t * 5.3));
  film.uniforms.dim.value = zt;
  const r = projectRect(corners[0], corners[1], bezel);
  film.uniforms.rect.value.set(r[0], r[1], r[2], r[3]);
  film.uniforms.time.value = t;

  // ---- HTML content glued onto the glass
  if (state === 'zoomed') {
    const g = projectRect(corners[2], corners[3], glass);
    Object.assign(reader.style, { left: g[0] * innerWidth + 'px', top: (1 - g[3]) * innerHeight + 'px',
      width: (g[2] - g[0]) * innerWidth + 'px', height: (g[3] - g[1]) * innerHeight + 'px' });
  }

  // ---- dust drift
  const pa = dustGeo.attributes.position.array;
  for (let i = 0; i < dustN; i++) {
    pa[i * 3] = dustBase[i * 3] + Math.sin(t * 0.21 + dustSeed[i]) * 0.08;
    pa[i * 3 + 1] = dustBase[i * 3 + 1] + Math.sin(t * 0.13 + dustSeed[i] * 2) * 0.1;
  }
  dustGeo.attributes.position.needsUpdate = true;

  composer.render();
  if (ts !== 'manual') requestAnimationFrame(frame);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  film.uniforms.texel.value.set(1 / innerWidth, 1 / innerHeight);
  if (state === 'zoomed') computeZoom();
});

drawScreen(0);
counter.textContent = `01 / ${String(SECTIONS.length).padStart(2, '0')}  ·  ${SECTIONS[0].title.toUpperCase()}`;
frame();
document.getElementById('loading').classList.add('gone');
window.__spike = { camera, scene, renderer, load, unload, get state() { return state; },
  step(n = 1) { for (let i = 0; i < n; i++) frame('manual'); } };   // debug: advance frames while the tab is hidden
