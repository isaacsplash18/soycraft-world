import * as THREE from 'three';
import { THEME } from '../config/settings.js';
import { clayMat } from './materials.js';

/**
 * Product "hero" presentation for the premium stylised re-skin (§6.1).
 *
 * Products are the visual hero of each zone, so every prop gets a little
 * gallery treatment that makes it read as a collectible "pick me up" object,
 * distinct from environment props:
 *   • buildPlinth()        a soft rounded, tiered warm podium (collidable)
 *   • buildHeroGlow()      a warm soft glow disc so it pops off the ground
 *   • buildContactShadow() a soft baked contact shadow so it sits, not floats
 *
 * All treatments are mobile-cheap: no real per-product lights (the "spotlight"
 * is a faked additive glow), cached radial textures reused across every prop,
 * low-segment geometry.
 */

let _glowTex = null;
let _shadowTex = null;

// ── Plinth ───────────────────────────────────────────────────────────────────
/**
 * A soft, rounded two-tier podium in warm cream with a coral accent reveal.
 * Returned as a collidable group (added to the Octree by Products), origin on
 * the ground; its top sits at y ≈ 0.34.
 * @param {number} accent product accent colour (hex)
 */
export function buildPlinth(accent) {
  const g = new THREE.Group();
  g.name = 'product-plinth';

  // lower base tier (slightly deeper, wider — grounds the podium)
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.34, 1.46, 0.16, 40),
    clayMat(THEME.plinthBase)
  );
  base.position.y = 0.08;
  g.add(base);

  // upper display tier (warm cream, gently domed top edge)
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(1.14, 1.28, 0.2, 40),
    clayMat(THEME.plinth)
  );
  top.position.y = 0.24;
  g.add(top);

  // thin accent reveal between the tiers — the "designed" coral line
  const reveal = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.03, 8, 48),
    clayMat(accent)
  );
  reveal.rotation.x = Math.PI / 2;
  reveal.position.y = 0.16;
  g.add(reveal);

  g.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return g;
}

/** Height of the plinth top — where the product model should sit. */
export const PLINTH_TOP = 0.34;

// ── Hero glow (faked warm spotlight) ─────────────────────────────────────────
/**
 * A warm, soft additive glow disc that sits just above the plinth top, giving
 * each product a gentle "lit hero" pop without the cost of a real spotlight.
 * @param {boolean} [featured=false] — seasonal featured products get a larger,
 *   slightly more intense glow to communicate the drop without changing geometry.
 */
export function buildHeroGlow(featured = false) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      color: THEME.heroGlow,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      opacity: featured ? 0.72 : 0.55,
    })
  );
  const size = featured ? 3.2 : 2.6;
  sprite.scale.set(size, size, 1);
  sprite.position.y = PLINTH_TOP + 0.5;
  sprite.renderOrder = 3;
  return sprite;
}

// ── Contact shadow ───────────────────────────────────────────────────────────
/**
 * A soft radial contact shadow that reads under the model even on mobile (where
 * real shadow maps are off). Lays flat on the plinth top.
 */
export function buildContactShadow() {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 1.7),
    new THREE.MeshBasicMaterial({
      map: shadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.4,
      color: THEME.contactShadow,
      fog: false,
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = PLINTH_TOP + 0.01;
  mesh.renderOrder = 1;
  return mesh;
}

// ── cached radial textures ───────────────────────────────────────────────────
function glowTexture() {
  if (_glowTex) return _glowTex;
  _glowTex = radialTexture([
    [0.0, 'rgba(255,255,255,0.95)'],
    [0.4, 'rgba(255,255,255,0.45)'],
    [1.0, 'rgba(255,255,255,0)'],
  ]);
  return _glowTex;
}

function shadowTexture() {
  if (_shadowTex) return _shadowTex;
  _shadowTex = radialTexture([
    [0.0, 'rgba(255,255,255,0.9)'],
    [0.55, 'rgba(255,255,255,0.35)'],
    [1.0, 'rgba(255,255,255,0)'],
  ]);
  return _shadowTex;
}

function radialTexture(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [at, col] of stops) grad.addColorStop(at, col);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
