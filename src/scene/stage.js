// Renderer, camera and post-processing: bloom, film grain, vignette, warm grade, and a focus mask
// that blurs and darkens everything outside the reading screen while it is pushed in.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CONFIG } from '../config.js';

const FILM_SHADER = {
  uniforms: {
    tDiffuse: { value: null }, time: { value: 0 }, dim: { value: 0 }, flicker: { value: 1 },
    rect: { value: new THREE.Vector4(0.3, 0.3, 0.7, 0.7) }, texel: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time, dim, flicker; uniform vec4 rect; uniform vec2 texel; varying vec2 vUv;
    float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 q = max(rect.xy - vUv, vUv - rect.zw);
      float k = dim * smoothstep(0.0, 0.03, max(q.x, q.y));       // only outside the screen
      if (k > 0.001) {
        vec3 b = vec3(0.0); float r = 2.5 * k;
        for (int x = -2; x <= 2; x++) for (int y = -2; y <= 2; y++) b += texture2D(tDiffuse, vUv + vec2(x, y) * texel * r * 1.6).rgb;
        c.rgb = mix(c.rgb, b / 25.0, k) * (1.0 - 0.55 * k);
      }
      vec2 p = vUv - 0.5; float d = length(p * vec2(1.0, 0.8));
      c.rgb *= mix(1.0, smoothstep(0.9, 0.25, d), 0.55);
      c.rgb *= vec3(1.03, 1.0, 0.93);
      c.rgb += (rand(vUv * 1000.0 + time) - 0.5) * 0.045;
      c.rgb *= 1.0 + 0.012 * flicker * sin(time * 23.0) * sin(time * 7.0);
      gl_FragColor = c;
    }`,
};

export function createStage(canvas, { lowPower = false, calm = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const pixelRatio = Math.min(devicePixelRatio, lowPower ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0705);
  scene.fog = new THREE.FogExp2(0x0a0705, 0.055);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;

  const { POS, LOOK, FOV } = CONFIG.CAMERA;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 60);
  camera.position.set(...POS);
  camera.lookAt(...LOOK);

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(pixelRatio);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.45, 0.55, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const film = new ShaderPass(FILM_SHADER);
  film.uniforms.flicker.value = calm ? 0 : 1;
  composer.addPass(film);

  function resize() {
    const w = innerWidth, h = innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h); composer.setSize(w, h); bloom.setSize(w, h);
    film.uniforms.texel.value.set(1 / w, 1 / h);
  }
  resize();

  return {
    renderer, scene, camera,
    setFocus(rect, dim) { film.uniforms.rect.value.set(rect[0], rect[1], rect[2], rect[3]); film.uniforms.dim.value = dim; },
    resize,
    render(time) { film.uniforms.time.value = time; composer.render(); },
    dispose() { composer.dispose(); pmrem.dispose(); renderer.dispose(); },
  };
}
