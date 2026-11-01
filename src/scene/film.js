// The film strip: leader frames, one frame per section, leader frames; it curves back and stands up
// as it feeds onto the reels at either end.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { SECTIONS } from '../core/content.js';
import { t } from '../core/i18n.js';
import { drawFrame } from './textures.js';

const { FILM_CENTER: [CX, CY, CZ], BEND, TILT, LEAD, REEL } = CONFIG;
const P = CONFIG.FILM.PITCH;
const FW = 1.2, FH = 0.88;

const LABEL_FONT = {
  en: 'italic 500 84px "Cormorant Garamond"',
  zh: '600 72px "Noto Serif SC"',
  ja: '600 72px "Noto Serif JP"',
};

/** Pose at distance s along the strip from the reading gate (s = 0). */
export function filmPose(s, obj) {
  obj.rotation.order = 'YXZ';
  obj.position.set(CX + s, CY + BEND * 0.15 * s * s, CZ - BEND * s * s);
  const rise = THREE.MathUtils.smoothstep(Math.abs(s), 1.9, REEL.X);
  obj.rotation.set(TILT * (1 - rise), Math.atan(2 * BEND * s), 0);
}

export function buildFilm(stage, lang) {
  const geo = new THREE.PlaneGeometry(FW, FH);
  const meshes = [];
  const total = LEAD * 2 + SECTIONS.length;

  for (let i = 0; i < total; i++) {
    const ci = i - LEAD, content = ci >= 0 && ci < SECTIONS.length;
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 470;
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.05, roughness: 0.45, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData = { ci: content ? ci : null, leader: content ? null : (ci < 0 ? -ci : ci - SECTIONS.length + 1), canvas, tex };
    stage.scene.add(mesh);
    meshes.push(mesh);
  }

  function relabel(l) {
    for (const m of meshes) {
      const { ci, leader, canvas, tex } = m.userData;
      if (ci === null) drawFrame(canvas, 'leader', leader);
      else drawFrame(canvas, SECTIONS[ci].id, t(`section.${SECTIONS[ci].id}.title`, l), LABEL_FONT[l] || LABEL_FONT.en);
      tex.needsUpdate = true;
    }
  }
  relabel(lang);

  return {
    meshes,
    relabel,
    /** offset: physics offset (0 = first section at the gate). */
    update(offset) {
      for (let i = 0; i < meshes.length; i++) {
        const m = meshes[i], s = (i - LEAD) * P - offset;
        filmPose(s, m);
        m.visible = Math.abs(s) < REEL.X - 0.15;          // beyond this it is wound onto a reel
        const act = Math.max(0, 1 - Math.abs(s) / P);
        m.translateZ(0.05 * act * act);
        m.material.emissiveIntensity = 0.04 + 0.62 * act * act * act;
      }
    },
    frameAt(mesh) { return mesh?.userData?.ci ?? null; },
  };
}
