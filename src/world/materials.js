import * as THREE from 'three';
import { THEME } from '../config/settings.js';

/**
 * Shared material language for the "premium stylised" re-skin (§6.1).
 *
 * The world, products and dog all speak one material dialect: a soft matte
 * "clay" cel-shade (MeshToonMaterial) with a tiny 3-step gradient ramp for the
 * cozy, claymation-adjacent read. Metal/glass accents keep a tuned
 * MeshStandardMaterial so hubs, chrome and windows still glint.
 *
 * Everything here is mobile-cheap: one shared few-pixel gradient texture, flat
 * matte materials, no big maps.
 */

let _gradientMap = null;

/** A cached, few-pixel toon ramp (3 soft steps) shared by every clay material. */
function toonGradient() {
  if (_gradientMap) return _gradientMap;
  const steps = THEME.toonSteps;
  const data = new Uint8Array(steps.length * 4);
  for (let i = 0; i < steps.length; i++) {
    const v = Math.round(steps[i] * 255);
    data.set([v, v, v, 255], i * 4);
  }
  const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  _gradientMap = tex;
  return tex;
}

/**
 * Soft matte "clay" material — the default surface for the whole world.
 * @param {number} color hex
 * @param {object} [opts] { flat, vertexColors, transparent, opacity }
 */
export function clayMat(color, opts = {}) {
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient(),
    flatShading: !!opts.flat,
    vertexColors: !!opts.vertexColors,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
  });
  return m;
}

/**
 * Tuned standard material for metal / glass / glossy accents that a flat toon
 * ramp can't sell (chrome hubs, painted car bodies, glass facades, water).
 * @param {number} color hex
 * @param {object} [opts] { rough, metal, flat }
 */
export function glossMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.4,
    metalness: opts.metal ?? 0.5,
    flatShading: !!opts.flat,
  });
}
