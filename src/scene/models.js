// CC0 Poly Haven models (see public/models/LICENSE.md), retinted toward one warm brass / aged-metal palette.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/** Desaturate the albedo and push it toward one tint; optionally force metalness. Light/glass materials are left alone. */
export function retint(root, { tint, amount = 0.8, metal = null }) {
  const color = new THREE.Color(tint);
  root.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    const m = (o.material = o.material.clone());
    if (/_(light|glass)$/.test(m.name)) return;
    if (metal !== null) { m.metalnessMap = null; m.metalness = metal; }
    m.onBeforeCompile = sh => {
      sh.uniforms.uTint = { value: color };
      sh.uniforms.uAmt = { value: amount };
      sh.fragmentShader = 'uniform vec3 uTint; uniform float uAmt;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        diffuseColor.rgb = mix(diffuseColor.rgb, uTint * (0.25 + lum * 1.6), uAmt);`);
    };
    m.customProgramCacheKey = () => `retint-${tint}-${amount}`;
  });
  return root;
}

export async function loadModels(base) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const load = name => loader.loadAsync(`${base}models/${name}.glb`).then(g => g.scene);
  const lamp = retint(await load('lamp'), { tint: 0xb48a50, amount: 0.8, metal: 0.9 });
  return { lamp };
}
