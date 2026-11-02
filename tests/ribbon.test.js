import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { ribbonCurve, reelHub, guideExit, STRIP_END } from '../src/scene/film.js';

const UP = new THREE.Vector3(0, 1, 0);

test('the two reels hang at different heights', () => {
  expect(Math.abs(reelHub(-1).y - reelHub(1).y)).toBeGreaterThan(0.3);
});

for (const side of [-1, 1]) {
  const name = side < 0 ? 'feed' : 'take-up';
  test(`guide (${name}) sits just past the strip end, where the clipped frames disappear`, () => {
    const g = guideExit(side);
    expect(Math.sign(g.x)).toBe(side);
    expect(Math.abs(g.x)).toBeGreaterThan(STRIP_END);
    expect(Math.abs(g.x) - STRIP_END).toBeLessThan(0.3);
  });
  test(`ribbon (${name}) leaves the guide roller travelling straight up`, () => {
    const c = ribbonCurve(side, 0.4);
    expect(c.getPoint(0).distanceTo(guideExit(side))).toBeLessThan(1e-6);
    expect(c.getTangent(0).dot(UP)).toBeGreaterThan(0.999);
  });
  test(`ribbon (${name}) meets the reel's film pack on its inner side, tangentially`, () => {
    const packR = 0.4, c = ribbonCurve(side, packR), hub = reelHub(side), end = c.getPoint(1);
    expect(end.distanceTo(hub)).toBeCloseTo(packR, 3);
    expect(Math.sign(end.x - hub.x)).toBe(-side);                 // the side facing the screen
    expect(Math.abs(c.getTangent(1).dot(end.clone().sub(hub).normalize()))).toBeLessThan(0.05);
  });
  test(`ribbon (${name}) stays in the reel's plane (no twist needed)`, () => {
    const c = ribbonCurve(side, 0.4);
    for (let k = 0; k <= 1; k += 0.1) expect(Math.abs(c.getTangent(k).z)).toBeLessThan(0.35);
  });
}

test('when the film is settled, each strip end falls exactly between two whole frames', () => {
  const P = CONFIG.FILM.PITCH, edges = STRIP_END / P - 0.5;
  expect(Math.abs(edges - Math.round(edges))).toBeLessThan(1e-9);
  expect(Math.round(edges)).toBeGreaterThanOrEqual(2);          // at least two whole frames on each side of the gate
});
