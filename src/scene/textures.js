// Procedural canvas textures: wear, wood, the foggy window, the sepia film frames and dial faces.
import * as THREE from 'three';

const rnd = (a, b) => a + Math.random() * (b - a);

/** Web fonts load per unicode subset; make sure the glyphs we are about to paint are present (max 1.5 s wait). */
export function ensureFonts(fonts, text) {
  if (!globalThis.document?.fonts) return Promise.resolve();
  return Promise.race([Promise.all(fonts.map(f => document.fonts.load(f, text))).catch(() => {}), new Promise(r => setTimeout(r, 1500))]);
}

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

/** Aged brass for the reel flanges: colour with worn highlights and dark patina, lathe-ring bump, uneven roughness. */
export function agedBrassMaps() {
  const S = 512, c = S / 2;
  const map = canvasTex(S, S, g => {
    const base = g.createRadialGradient(c * 0.8, c * 0.7, 10, c, c, c);
    base.addColorStop(0, '#d8ab68'); base.addColorStop(0.6, '#b4864a'); base.addColorStop(1, '#8a6232');
    g.fillStyle = base; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 900; i++) {                 // patina blotches and worn bright spots
      const dark = Math.random() < 0.6;
      g.fillStyle = dark ? `rgba(${rnd(40, 70) | 0},${rnd(48, 66) | 0},${rnd(28, 40) | 0},${rnd(0.04, 0.12)})` : `rgba(255,226,170,${rnd(0.03, 0.09)})`;
      g.beginPath(); g.arc(rnd(0, S), rnd(0, S), rnd(2, 22), 0, 7); g.fill();
    }
    for (let r = 8; r < c; r += rnd(2, 5)) { g.strokeStyle = `rgba(${Math.random() < 0.5 ? '255,230,180' : '60,40,15'},${rnd(0.02, 0.06)})`; g.lineWidth = 1; g.beginPath(); g.arc(c, c, r, 0, 7); g.stroke(); }
  });
  const bump = canvasTex(S, S, g => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
    for (let r = 4; r < c; r += rnd(1.5, 3.5)) { const v = rnd(100, 160) | 0; g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = rnd(0.6, 1.6); g.beginPath(); g.arc(c, c, r, 0, 7); g.stroke(); }
    for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(30,30,30,${rnd(0.2, 0.5)})`; g.lineWidth = rnd(0.4, 1.2); const x = rnd(0, S), y = rnd(0, S); g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd(-40, 40), y + rnd(-40, 40)); g.stroke(); }
  }, { srgb: false });
  const rough = canvasTex(S, S, g => {
    g.fillStyle = '#6e6e6e'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 700; i++) { const v = rnd(70, 200) | 0; g.fillStyle = `rgba(${v},${v},${v},0.18)`; g.beginPath(); g.arc(rnd(0, S), rnd(0, S), rnd(3, 26), 0, 7); g.fill(); }
  }, { srgb: false });
  return { map, bump, rough };
}

/** Alpha mask for a reel flange: a disc with six rounded cut-outs and an axle hole. */
export function flangeAlpha() {
  return canvasTex(512, 512, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#000'; g.fillRect(0, 0, w, w);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(c, c, c - 1, 0, 7); g.fill();
    g.fillStyle = '#000';
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2, a0 = a - 0.36, a1 = a + 0.36;
      g.beginPath(); g.arc(c, c, c * 0.84, a0, a1); g.arc(c, c, c * 0.34, a1, a0, true); g.closePath(); g.fill();
    }
    g.beginPath(); g.arc(c, c, c * 0.05, 0, 7); g.fill();
  }, { srgb: false });
}

/** Side of a wound film pack: fine concentric layers with an amber sheen. */
export function filmPackFaceTex() {
  return canvasTex(512, 512, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#1b120a'; g.fillRect(0, 0, w, w);
    for (let r = c * 0.2; r < c; r += rnd(0.8, 2.2)) {
      g.strokeStyle = `rgba(${rnd(90, 150) | 0},${rnd(55, 90) | 0},${rnd(25, 45) | 0},${rnd(0.25, 0.6)})`; g.lineWidth = rnd(0.5, 1.2);
      g.beginPath(); g.arc(c, c, r, 0, 7); g.stroke();
    }
    const sheen = g.createLinearGradient(0, 0, w, w); sheen.addColorStop(0.35, 'rgba(255,200,140,0)'); sheen.addColorStop(0.5, 'rgba(255,200,140,.18)'); sheen.addColorStop(0.65, 'rgba(255,200,140,0)');
    g.fillStyle = sheen; g.fillRect(0, 0, w, w);
  });
}

/** Dial plate for a chicken-head knob: dark bronze, an engraved arc over the top with ticks, labels above the stops.
 *  stops: [{ text, angle, size? }] (radians clockwise from 12 o'clock); arc: half-span of the engraved arc;
 *  pivot: how far below the centre the pointer pivots (share of the radius) — frees the upper half for big labels. */
export function drawArcDial(canvas, stops, arc, pivot = 0) {
  const g = canvas.getContext('2d'), s = canvas.width, c = s / 2;
  g.clearRect(0, 0, s, s);
  const face = g.createRadialGradient(c * 0.8, c * 0.7, 10, c, c, c);
  face.addColorStop(0, '#3a2c1e'); face.addColorStop(0.7, '#241a11'); face.addColorStop(1, '#17110b');
  g.fillStyle = face; g.beginPath(); g.arc(c, c, c - 3, 0, 7); g.fill();
  g.strokeStyle = '#6a4e2c'; g.lineWidth = 7; g.beginPath(); g.arc(c, c, c - 8, 0, 7); g.stroke();
  const py = c + pivot * c;
  const at = (a, r) => [c + Math.sin(a) * r, py - Math.cos(a) * r];
  // engraved look: a dark groove with a faint highlight just below it
  const groove = (draw) => { g.save(); g.translate(0, 2); g.strokeStyle = 'rgba(255,220,160,.2)'; g.fillStyle = 'rgba(255,220,160,.2)'; draw(); g.restore(); g.strokeStyle = '#c09a62'; g.fillStyle = '#c09a62'; draw(); };
  groove(() => { g.lineWidth = 5; g.beginPath(); g.arc(c, py, c * 0.72, -Math.PI / 2 - arc, -Math.PI / 2 + arc); g.stroke(); });
  for (let a = -arc; a <= arc + 1e-6; a += arc / 6) groove(() => { const [x0, y0] = at(a, c * 0.72), [x1, y1] = at(a, c * 0.78); g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); });
  for (const { angle } of stops) groove(() => { const [x0, y0] = at(angle, c * 0.7), [x1, y1] = at(angle, c * 0.81); g.lineWidth = 3.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); });   // stops: just a longer tick
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const { text, angle, size = 92 } of stops) {
    if (!text) continue;
    const [x, y] = at(angle, c * 0.99);
    g.font = `400 ${size}px "IBM Plex Mono", "MS Mincho", "ＭＳ 明朝", "Noto Serif JP", "Noto Serif SC"`;   // all labels equal; the pointer shows the choice
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillText(text, x, y - 2);
    g.fillStyle = '#e2c08a'; g.fillText(text, x, y + 1);
  }
}

/** Dial face: tick ring plus labels at given angles (radians, 0 = 12 o'clock, clockwise). labelR: label radius as a share of the dial radius. */
export function drawDial(canvas, labels, labelR = 0.6) {
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
    g.save(); g.translate(c, c); g.rotate(angle); g.font = `500 ${size}px "IBM Plex Mono", "MS Mincho", "ＭＳ 明朝", "Noto Serif JP", "Noto Serif SC"`;
    g.fillText(text, 0, -labelR * c); g.restore();
  }
}
