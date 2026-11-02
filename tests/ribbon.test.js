import * as THREE from 'three';
import { filmPose, ribbonCurve, reelHub, STRIP_END } from '../src/scene/film.js';

const pose = s => { const o = new THREE.Object3D(); filmPose(s, o); o.updateMatrixWorld(); return o; };

test('the two reels hang at different heights', () => {
  expect(Math.abs(reelHub(-1).y - reelHub(1).y)).toBeGreaterThan(0.3);
});

for (const side of [-1, 1]) {
  const name = side < 0 ? 'feed' : 'take-up';
  test(`ribbon (${name}) starts exactly where the strip is clipped`, () => {
    const start = ribbonCurve(side, 1).getPoint(0), end = pose(side * STRIP_END).position;
    expect(start.distanceTo(end)).toBeLessThan(1e-6);
  });
  test(`ribbon (${name}) leaves the strip along the strip's own direction (no kink)`, () => {
    const s = side * STRIP_END, ds = 1e-3 * side;
    const along = pose(s + ds).position.sub(pose(s).position).normalize();
    expect(ribbonCurve(side, 0.4).getTangent(0).dot(along)).toBeGreaterThan(0.999);
  });
  test(`ribbon (${name}) meets the reel's film pack on its outer side, tangentially`, () => {
    const packR = 0.4, curve = ribbonCurve(side, packR), hub = reelHub(side);
    const end = curve.getPoint(1);
    expect(end.distanceTo(hub)).toBeCloseTo(packR, 3);
    expect(Math.sign(end.x - hub.x)).toBe(side);
    const radial = end.clone().sub(hub).normalize();
    expect(Math.abs(curve.getTangent(1).dot(radial))).toBeLessThan(0.05);
  });
}
