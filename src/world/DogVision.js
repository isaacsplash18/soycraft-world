import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/**
 * Post-processing that simulates how a dog sees the world — dichromatic
 * (blue/yellow) vision with red–green colour-blindness. Applied only in
 * first-person (so you literally see through the dog's eyes).
 *
 * The matrix is a deuteranopia-style simulation: reds & greens collapse toward
 * yellow/olive while blues stay blue — very close to canine colour vision. A
 * touch of desaturation + warmth sells the effect.
 */
const DogVisionShader = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0 }, // 0 = normal, 1 = full dog vision
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float amount;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      // deuteranopia-style blue/yellow simulation
      vec3 dog = vec3(
        0.367 * c.r + 0.861 * c.g - 0.228 * c.b,
        0.280 * c.r + 0.673 * c.g + 0.047 * c.b,
       -0.012 * c.r + 0.043 * c.g + 0.969 * c.b
      );
      // slight desaturation toward luminance (dogs see muted colour)
      float l = dot(dog, vec3(0.299, 0.587, 0.114));
      dog = mix(dog, vec3(l), 0.25);
      gl_FragColor = vec4(mix(c.rgb, dog, amount), c.a);
    }`,
};

export class DogVision {
  constructor(renderer, scene, camera) {
    this.composer = new EffectComposer(renderer);
    this.composer.setPixelRatio(renderer.getPixelRatio());
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.composer.addPass(new RenderPass(scene, camera));
    this.pass = new ShaderPass(DogVisionShader);
    this.composer.addPass(this.pass);

    window.addEventListener('resize', () => {
      this.composer.setPixelRatio(renderer.getPixelRatio());
      this.composer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  /** Render through the dog-vision filter (used when in first-person). */
  render(amount = 1) {
    this.pass.uniforms.amount.value = amount;
    this.composer.render();
  }
}
