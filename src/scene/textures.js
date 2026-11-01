// Procedural canvas textures: wear, wood, the foggy window, the sepia film frames and dial faces.
import * as THREE from 'three';

const rnd = (a, b) => a + Math.random() * (b - a);

export function canvasTex(w, h, draw, { srgb = true, repeat } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.userData.canvas = c;
  return t;
}

/** Grey roughness map with blotches and scratches, so metal never looks like clean plastic. */
export function grungeTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#999'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const v = rnd(110, 210) | 0; g.fillStyle = `rgba(${v},${v},${v},0.22)`;
      g.beginPath(); g.arc(rnd(0, w), rnd(0, h), rnd(0.5, 7), 0, 7); g.fill();
    }
    for (let i = 0; i < 160; i++) {
      g.strokeStyle = `rgba(${Math.random() < 0.5 ? '60,60,60' : '230,230,230'},0.25)`; g.lineWidth = rnd(0.3, 1.4);
      const x = rnd(0, w), y = rnd(0, h); g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd(-60, 60), y + rnd(-14, 14)); g.stroke();
    }
  }, { srgb: false, repeat: [2, 2] });
}

export function woodTex() {
  return canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#3a2615'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      const a = rnd(0.02, 0.12), light = Math.random() < 0.4;
      g.strokeStyle = light ? `rgba(120,80,45,${a})` : `rgba(10,5,2,${a * 1.6})`;
      g.lineWidth = rnd(1, 3); g.beginPath();
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.006 + y * 0.05) * 4);
      g.stroke();
    }
    for (let i = 0; i < 9; i++) {
      const x = rnd(0, w), y = rnd(0, h), r = rnd(6, 16);
      const gr = g.createRadialGradient(x, y, 0, x, y, r * 3); gr.addColorStop(0, 'rgba(15,8,3,.7)'); gr.addColorStop(1, 'rgba(15,8,3,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * 3, r, 0, 0, 7); g.fill();
    }
  }, { repeat: [2, 1] });
}

export function windowTex() {
  return canvasTex(1024, 640, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const cols = 6, rows = 4, pad = 14;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = c * w / cols + pad, y = r * h / rows + pad, cw = w / cols - pad * 2, ch = h / rows - pad * 2;
      const gr = g.createLinearGradient(x, y, x + cw, y + ch);
      gr.addColorStop(0, `rgba(150,160,165,${0.55 - r * 0.08})`); gr.addColorStop(1, `rgba(90,95,100,${0.35 - r * 0.05})`);
      g.fillStyle = gr; g.fillRect(x, y, cw, ch);
    }
  });
}

const INK = 'rgba(70,48,25,';
const ART = {
  about(g, cx, cy, px, py, pw, ph) {
    g.fillStyle = INK + '.18)'; for (let i = 0; i < 8; i++) g.fillRect(px + i * 70, py, 30, ph);
    g.fillStyle = INK + '.85)'; g.beginPath(); g.arc(cx, cy - 40, 62, 0, 7); g.fill();
    g.beginPath(); g.ellipse(cx, cy + 110, 140, 95, 0, Math.PI, 0); g.fill();
  },
  projects(g, cx, cy, px, py, pw, ph) {
    const ridge = (base, amp, a) => {
      g.fillStyle = INK + a + ')'; g.beginPath(); g.moveTo(px, py + ph);
      for (let x = 0; x <= pw; x += 20) g.lineTo(px + x, base - Math.abs(Math.sin(x * 0.011 + amp)) * amp * 1.4 - Math.sin(x * 0.04) * 8);
      g.lineTo(px + pw, py + ph); g.fill();
    };
    ridge(cy + 10, 70, '.35'); ridge(cy + 50, 50, '.6'); ridge(cy + 95, 25, '.85');
  },
  skills(g, cx, cy) {
    const gear = (x, y, r, n, a) => {
      g.fillStyle = INK + a + ')'; g.beginPath();
      for (let i = 0; i < n * 2; i++) { const ang = i / (n * 2) * Math.PI * 2, rr = i % 2 ? r : r * 1.18; g.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr); }
      g.fill(); g.fillStyle = '#c9b48c'; g.beginPath(); g.arc(x, y, r * 0.35, 0, 7); g.fill();
    };
    gear(cx - 70, cy + 10, 85, 12, '.8'); gear(cx + 85, cy - 45, 55, 9, '.6'); gear(cx + 95, cy + 75, 40, 8, '.45');
  },
  certificates(g, cx, cy) {
    g.fillStyle = INK + '.55)';
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 50, cy - 10); g.lineTo(cx + s * 80, cy + 130); g.lineTo(cx + s * 40, cy + 110); g.lineTo(cx + s * 15, cy + 140); g.lineTo(cx, cy); g.fill(); }
    g.fillStyle = INK + '.85)'; g.beginPath(); g.arc(cx, cy - 30, 80, 0, 7); g.fill();
    g.strokeStyle = '#d8c39a'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy - 30, 60, 0, 7); g.stroke();
  },
};

/** One 35mm-style frame: sprockets, sepia picture, caption. kind = section id or 'leader' (label = countdown number). */
export function drawFrame(canvas, kind, label, font) {
  const g = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#1e140b'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#d8c7a4';
  for (let x = 14; x < w; x += 40) { g.beginPath(); g.roundRect(x, 12, 20, 26, 4); g.fill(); g.beginPath(); g.roundRect(x, h - 38, 20, 26, 4); g.fill(); }
  const px = 26, py = 56, pw = w - 52, ph = h - 112, cx = px + pw / 2, cy = py + ph / 2;
  g.save(); g.beginPath(); g.roundRect(px, py, pw, ph, 10); g.clip();
  const bg = g.createLinearGradient(0, py, 0, py + ph);
  if (kind === 'leader') { bg.addColorStop(0, '#3a2a18'); bg.addColorStop(1, '#2a1d10'); } else { bg.addColorStop(0, '#e2cfa6'); bg.addColorStop(1, '#a88e64'); }
  g.fillStyle = bg; g.fillRect(px, py, pw, ph);
  if (kind === 'leader') {
    g.strokeStyle = 'rgba(220,190,140,.35)'; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, 90, 0, 7); g.stroke(); g.beginPath(); g.moveTo(cx - 140, cy); g.lineTo(cx + 140, cy); g.moveTo(cx, cy - 120); g.lineTo(cx, cy + 120); g.stroke();
    g.fillStyle = 'rgba(230,200,150,.5)'; g.font = '600 110px "Cormorant Garamond"'; g.textAlign = 'center'; g.fillText(String(label), cx, cy + 38);
  } else {
    ART[kind]?.(g, cx, cy, px, py, pw, ph);
  }
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '40,25,10' : '255,240,210'},${rnd(0.03, 0.12)})`; g.fillRect(rnd(px, px + pw), rnd(py, py + ph), 2, 2); }
  const vg = g.createRadialGradient(cx, cy, ph * 0.3, cx, cy, pw * 0.65); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(30,18,6,.55)');
  g.fillStyle = vg; g.fillRect(px, py, pw, ph);
  if (kind !== 'leader' && label) {
    g.fillStyle = 'rgba(25,15,6,.35)'; g.fillRect(px, py + ph - 120, pw, 120);
    g.fillStyle = '#fbf0da'; g.font = font; g.textAlign = 'center';
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 10; g.fillText(label, cx, py + ph - 34); g.shadowBlur = 0;
  }
  g.restore();
}

/** Dial face: tick ring plus labels at given angles (radians, 0 = 12 o'clock, clockwise). */
export function drawDial(canvas, labels) {
  const g = canvas.getContext('2d'), s = canvas.width, c = s / 2;
  g.clearRect(0, 0, s, s);
  g.fillStyle = '#20170e'; g.beginPath(); g.arc(c, c, c - 4, 0, 7); g.fill();
  g.strokeStyle = '#c8a46a'; g.lineWidth = 6; g.beginPath(); g.arc(c, c, c - 18, 0, 7); g.stroke();
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * Math.PI * 2, major = i % 10 === 0, r1 = (major ? 0.77 : 0.83) * c;
    g.lineWidth = major ? 5 : 2; g.beginPath(); g.moveTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.lineTo(c + Math.cos(a) * 0.9 * c, c + Math.sin(a) * 0.9 * c); g.stroke();
  }
  g.fillStyle = '#ecd3a0'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const { text, angle, size = 40 } of labels) {
    g.save(); g.translate(c, c); g.rotate(angle); g.font = `500 ${size}px "IBM Plex Mono", "Noto Serif SC", "Noto Serif JP"`;
    g.fillText(text, 0, -0.6 * c); g.restore();
  }
}
