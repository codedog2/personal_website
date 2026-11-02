// The film strip: leader frames, one frame per section, leader frames. It lies across the bench in
// front of the screen and runs into a guide box at each end (the frames are clipped inside it); from
// the guide roller on top a narrow film runs up onto the reel hanging beside the screen.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { SECTIONS } from '../core/content.js';
import { t } from '../core/i18n.js';
import { canvasTex, drawFrame, ensureFonts } from './textures.js';

const { FILM_CENTER: [CX, CY, CZ], BEND, TILT, LEAD, REEL } = CONFIG;
export const STRIP_END = CONFIG.STRIP_END;
const P = CONFIG.FILM.PITCH;
const FW = P, FH = P * 470 / 640;     // frame keeps the canvas aspect
const RIBBON_SEGMENTS = 64;

const LABEL_FONT = {
  en: 'italic 500 84px "Cormorant Garamond"',
  zh: '600 72px "Noto Serif SC"',
  ja: '600 72px "Noto Serif JP"',
};

/** Pose at distance s along the strip from the reading gate (s = 0). */
export function filmPose(s, obj) {
  obj.rotation.order = 'YXZ';
  obj.position.set(CX + s, CY + BEND * 0.15 * s * s, CZ - BEND * s * s);
  obj.rotation.set(TILT, Math.atan(2 * BEND * s), 0);
}

/** Centre of a reel's hub. side: -1 = feed reel (left), 1 = take-up reel (right). */
export function reelHub(side) {
  return new THREE.Vector3(side * REEL.X, REEL.Y[side < 0 ? 0 : 1], REEL.Z);
}

/** Where the film leaves the top of the guide roller at a strip end. */
export function guideExit(side) {
  return new THREE.Vector3(side * (STRIP_END + 0.09), 0.96, REEL.Z);
}

/** Path of the film from the guide roller (t = 0) up to the inner side of a reel's film pack (t = 1).
 *  side: -1 = feed reel (left), 1 = take-up reel (right). packR: current radius of the wound film. */
export function ribbonCurve(side, packR) {
  const start = guideExit(side), end = reelHub(side).add(new THREE.Vector3(-side * packR, 0, 0));
  const up = new THREE.Vector3(0, 1, 0), lift = (end.y - start.y) * 0.4;
  return new THREE.CubicBezierCurve3(start, start.clone().addScaledVector(up, lift), end.clone().addScaledVector(up, -lift), end);
}

function ribbonTexture() {
  const tex = canvasTex(512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(58,34,14,0.92)'; g.fillRect(0, 0, w, h);
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,200,140,.10)'); grad.addColorStop(0.5, 'rgba(255,190,120,.22)'); grad.addColorStop(1, 'rgba(255,200,140,.10)');
    g.fillStyle = grad; g.fillRect(0, 34, w, h - 68);
    g.fillStyle = 'rgba(232,214,180,.85)';
    for (let x = 6; x < w; x += 32) { g.beginPath(); g.roundRect(x, 8, 18, 18, 4); g.fill(); g.beginPath(); g.roundRect(x, h - 26, 18, 18, 4); g.fill(); }
  });
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

export function buildFilm(stage, lang) {
  const geo = new THREE.PlaneGeometry(FW, FH);
  const clip = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), STRIP_END), new THREE.Plane(new THREE.Vector3(1, 0, 0), STRIP_END)];
  const meshes = [];
  const total = LEAD * 2 + SECTIONS.length;

  for (let i = 0; i < total; i++) {
    const ci = i - LEAD, content = ci >= 0 && ci < SECTIONS.length;
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 470;
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.05, roughness: 0.45, side: THREE.DoubleSide, clippingPlanes: clip });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData = { ci: content ? ci : null, leader: content ? null : (ci < 0 ? -ci : ci - SECTIONS.length + 1), canvas, tex };
    stage.scene.add(mesh);
    meshes.push(mesh);
  }

  // ---- ribbons: an even-width film along ribbonCurve, lying in the reel's plane (width along z)
  const ribbons = [-1, 1].map(side => {
    const map = ribbonTexture();
    const mat = new THREE.MeshPhysicalMaterial({ map, transparent: true, roughness: 0.32, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25, side: THREE.DoubleSide });
    const g = new THREE.BufferGeometry();
    const n = RIBBON_SEGMENTS + 1;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2 * 2), 2));
    const idx = [];
    for (let i = 0; i < RIBBON_SEGMENTS; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    stage.scene.add(mesh);
    return { side, mesh, map, packR: -1 };
  });
  const across = new THREE.Vector3(0, 0, 1);

  function shapeRibbon(r, packR) {
    if (Math.abs(r.packR - packR) < 0.004) return;
    r.packR = packR;
    const curve = ribbonCurve(r.side, packR);
    const pos = r.mesh.geometry.attributes.position, uv = r.mesh.geometry.attributes.uv;
    let length = 0, prev = curve.getPoint(0);
    for (let i = 0; i <= RIBBON_SEGMENTS; i++) {
      const k = i / RIBBON_SEGMENTS, p = curve.getPoint(k), tan = curve.getTangent(k);
      length += p.distanceTo(prev); prev = p;
      const w = across.clone().addScaledVector(tan, -across.dot(tan)).normalize();
      const half = REEL.DEPTH * 0.45;
      pos.setXYZ(i * 2, p.x + w.x * half, p.y + w.y * half, p.z + w.z * half);
      pos.setXYZ(i * 2 + 1, p.x - w.x * half, p.y - w.y * half, p.z - w.z * half);
      uv.setXY(i * 2, length / (REEL.DEPTH * 1.6), 1); uv.setXY(i * 2 + 1, length / (REEL.DEPTH * 1.6), 0);
    }
    pos.needsUpdate = uv.needsUpdate = true;
    r.mesh.geometry.computeVertexNormals();
    r.mesh.geometry.computeBoundingSphere();
  }

  let generation = 0;
  async function relabel(l) {
    const mine = ++generation, font = LABEL_FONT[l] || LABEL_FONT.en;
    await ensureFonts([font], SECTIONS.map(sec => t(`section.${sec.id}.title`, l)).join(''));
    if (mine !== generation) return;                    // a newer language switch won
    for (const m of meshes) {
      const { ci, leader, canvas, tex } = m.userData;
      if (ci === null) drawFrame(canvas, 'leader', leader);
      else drawFrame(canvas, SECTIONS[ci].id, t(`section.${SECTIONS[ci].id}.title`, l), font);
      tex.needsUpdate = true;
    }
  }

  return {
    meshes,
    relabel,
    /** offset: physics offset (0 = first section at the gate); packs: film-pack radius on the [left, right] reels. */
    update(offset, packs) {
      for (let i = 0; i < meshes.length; i++) {
        const m = meshes[i], s = (i - LEAD) * P - offset;
        filmPose(s, m);
        m.visible = Math.abs(s) < STRIP_END + FW / 2;     // the clipping planes hide the part past the strip end
        const act = Math.max(0, 1 - Math.abs(s) / P);
        m.translateZ(0.05 * act * act);
        m.material.emissiveIntensity = 0.04 + 0.62 * act * act * act;
      }
      ribbons.forEach((r, i) => { shapeRibbon(r, packs[i]); r.map.offset.x = r.side * offset / (REEL.DEPTH * 1.6); });
    },
    /** Section index for a hit on the strip, or null (leaders, or the clipped-away part of a frame). */
    frameAt(hit) {
      if (!hit || Math.abs(hit.point.x) > STRIP_END) return null;
      return hit.object?.userData?.ci ?? null;
    },
  };
}
