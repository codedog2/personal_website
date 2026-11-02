import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { filmPose, ribbonCurve, STRIP_END } from '../src/scene/film.js';

const pose = s => { const o = new THREE.Object3D(); filmPose(s, o); o.updateMatrixWorld(); return o; };

for (const side of [-1, 1]) {
  test(`ribbon (${side < 0 ? 'feed' : 'take-up'}) starts exactly where the strip is clipped`, () => {
    const curve = ribbonCurve(side, 1);
    const start = curve.getPoint(0), end = pose(side * STRIP_END).position;
    expect(start.distanceTo(end)).toBeLessThan(1e-6);
  });
  test(`ribbon (${side < 0 ? 'feed' : 'take-up'}) meets the reel's film pack on its outer side, tangentially`, () => {
    const { X, Y, Z } = CONFIG.REEL, packR = 0.4;
    const curve = ribbonCurve(side, packR);
    const end = curve.getPoint(1), hub = new THREE.Vector3(side * X, Y, Z);
    expect(end.distanceTo(hub)).toBeCloseTo(packR, 3);
    expect(Math.sign(end.x - hub.x)).toBe(side);                           // outer side of the reel
    const tangent = curve.getTangent(1), radial = end.clone().sub(hub).normalize();
    expect(Math.abs(tangent.dot(radial))).toBeLessThan(0.05);              // runs along the pack, not into it
  });
}
