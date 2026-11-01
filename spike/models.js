// Poly Haven CC0 models (polyhaven.com), retinted so they read as one brass/aged-metal machine.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const load = id => loader.loadAsync(`models/${id}/${id}_1k.gltf`).then(g => g.scene);

// Desaturate the albedo and push it toward one warm tint; optionally force metalness.
function retint(root, { tint = 0xc09056, amount = 0.8, metal = null, rough = null } = {}) {
  const t = new THREE.Color(tint);
  root.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    const m = o.material = o.material.clone();
    if (m.name.endsWith('_light') || m.name.endsWith('_glass')) return;
    if (metal !== null) { m.metalnessMap = null; m.metalness = metal; }
    if (rough !== null) m.roughness = rough;
    m.onBeforeCompile = sh => {
      sh.uniforms.uTint = { value: t }; sh.uniforms.uAmt = { value: amount };
      sh.fragmentShader = 'uniform vec3 uTint; uniform float uAmt;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        diffuseColor.rgb = mix(diffuseColor.rgb, uTint * (0.25 + lum * 1.6), uAmt);`);
    };
    m.customProgramCacheKey = () => `retint-${tint}-${amount}`;
  });
}

function place(obj, scene, [x, y, z], rotY, scale) {
  obj.position.set(x, y, z); obj.rotation.y = rotY; obj.scale.setScalar(scale);
  scene.add(obj); obj.updateMatrixWorld(true);
  return obj;
}

// A spool part pulled out of the projector model, re-centred so it spins about its own axis (local x).
function part(src, name) {
  const p = src.getObjectByName(name).clone();
  p.position.set(0, 0, 0); p.rotation.set(0, 0, 0);
  return p;
}

export async function loadModels(scene, filmCenter) {
  const [projector, tv, lamp] = await Promise.all(
    ['filmstrip_projector_8mm', 'television_02', 'desk_lamp_arm_01'].map(load));

  // only the projector's reels are used — they become the rewind reels
  retint(projector, { tint: 0xb68a52, amount: 0.85, metal: 0.85 });
  const spool = part(projector, 'filmstrip_projector_8mm_spool_feed');
  const woundFilm = part(projector, 'filmstrip_projector_8mm_01_film_side');

  // TV body as the reader's housing (sits behind the brass bezel)
  retint(tv, { tint: 0x6a5238, amount: 0.75, metal: 0.6 });
  tv.scale.setScalar(7.2);

  retint(lamp, { tint: 0xb48a50, amount: 0.8, metal: 0.9 });
  place(lamp, scene, [3.3, 0.36, -1.7], Math.atan2(filmCenter.x - 3.3, filmCenter.z + 1.7) + Math.PI, 3.7);
  lamp.traverse(o => { if (o.isMesh) o.castShadow = false; });   // the spot sits inside the shade
  let lampHead = null;
  lamp.traverse(o => { if (o.isMesh && o.material.name.endsWith('_light')) {
    o.material = new THREE.MeshStandardMaterial({ color: 0xffe0a8, emissive: 0xffc070, emissiveIntensity: 9 });
    lampHead = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
  } });

  return { spool, woundFilm, tv, lamp, lampHead };
}
