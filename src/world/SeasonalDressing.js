import * as THREE from 'three';
import { clayMat } from './materials.js';
import { registerNightEmissive, registerNightLight } from './Sky.js';

/**
 * src/world/SeasonalDressing.js
 * ============================================================================
 *  §6.5 Seasonal prop placement — purely decorative, data-driven, mobile-cheap.
 *
 *  All props are:
 *    • Added directly to the scene (NOT the collidable group / Octree), so
 *      physics is never rebuilt.
 *    • Instanced where repeated (one draw call per shape type).
 *    • Designed to respect the night-emissive pattern (lanterns glow at night).
 *    • Low-poly clay-style (use clayMat from materials.js).
 *
 *  Entry point:
 *    buildSeasonalDressing(scene, theme)
 *
 *  Currently handles:
 *    type = 'lunar'   — red lanterns near lamp posts + kumquat pots near logo
 *
 *  Adding a new dressing type:
 *    1. Add a case in buildSeasonalDressing() switch
 *    2. Write a _build<Type>(scene, d) function following the pattern below
 * ============================================================================
 */

/**
 * Build seasonal dressing for the active theme. No-op when dressing is null.
 * @param {THREE.Scene} scene
 * @param {object} theme — ACTIVE_THEME from themes.js
 */
export function buildSeasonalDressing(scene, theme) {
  const d = theme.dressing;
  if (!d) return;

  switch (d.type) {
    case 'lunar': _buildLunar(scene, d); break;
    default: break;
  }
}

// ── LUNAR NEW YEAR ─────────────────────────────────────────────────────────────
// Red lanterns near the central plaza lamp posts and near the park.
// Kumquat pots flanking the player approach path to the logo.

// Lantern hang points [x, y, z] — placed near the 6 lamp-post locations
// (World.js spots: [0,-22],[27,-26],[-25,27],[9,7],[-9,7],[-22,0]).
// We concentrate near the lit central plaza for visual impact.
const LANTERN_POSITIONS = [
  [ 8.6, 4.0,  7.2],  // east plaza lamp  — first lantern
  [ 7.8, 3.5,  8.4],  // east plaza lamp  — second lantern (lower)
  [-8.6, 4.0,  7.2],  // west plaza lamp  — first lantern
  [-7.8, 3.5,  8.4],  // west plaza lamp  — second lantern
  [ 1.0, 4.2, -20.8], // park lamp area
  [-1.0, 3.7, -21.6], // park lamp area   — offset pair
  [-21.6, 4.0,  0.8], // mall lamp area
  [-21.2, 3.5, -0.8], // mall lamp area
];

// Kumquat pot positions — flanking the central plaza approach (player spawns
// at z=16 and walks toward the logo at z≈0, so these sit at z≈10).
const KUMQUAT_POSITIONS = [
  [ 5.0, 0, 10.5],
  [-5.0, 0, 10.5],
  [ 6.8, 0,  7.0],
  [-6.8, 0,  7.0],
];

function _buildLunar(scene, d) {
  _buildLanterns(scene, d);
  _buildKumquatPots(scene, d);
}

// ── Lanterns ──────────────────────────────────────────────────────────────────

function _buildLanterns(scene, d) {
  const N = LANTERN_POSITIONS.length;

  // -- Geometry shapes --
  const bodyGeo  = new THREE.IcosahedronGeometry(0.32, 1);
  const capGeo   = new THREE.CylinderGeometry(0.13, 0.17, 0.1, 8);
  const tasselGeo= new THREE.CylinderGeometry(0.025, 0.010, 0.36, 4);

  // -- Materials --
  // Body: red clay; emissive registered so it glows orange-red at night.
  const bodyMat = clayMat(d.lanternColor);
  registerNightEmissive(scene, bodyMat, d.lanternEmissive, 1.2);

  // Caps: gold clay
  const capMat   = clayMat(d.lanternCapColor);
  // Tassel: slightly darker red
  const tasselMat= clayMat(d.lanternColor);

  // -- Instanced meshes (one draw call per shape type) --
  const bodyIM   = new THREE.InstancedMesh(bodyGeo,   bodyMat,   N);
  const topCapIM = new THREE.InstancedMesh(capGeo,    capMat,    N);
  const botCapIM = new THREE.InstancedMesh(capGeo,    capMat,    N);
  const tasselIM = new THREE.InstancedMesh(tasselGeo, tasselMat, N);

  // Slight scale variation so no two lanterns look identical
  let seed = 42;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();

  for (let i = 0; i < N; i++) {
    const [lx, ly, lz] = LANTERN_POSITIONS[i];
    const scale = 0.88 + rnd() * 0.26; // 0.88 – 1.14
    const tiltY = rnd() * Math.PI * 2;
    const tiltZ = (rnd() - 0.5) * 0.18; // gentle sway

    q.setFromEuler(new THREE.Euler(0, tiltY, tiltZ));
    s.set(scale, scale * 1.05, scale); // slightly taller than wide

    // Body
    p.set(lx, ly, lz);
    m.compose(p, q, s);
    bodyIM.setMatrixAt(i, m);

    // Top cap
    p.set(lx, ly + 0.32 * scale, lz);
    s.set(scale, scale, scale);
    m.compose(p, q, s);
    topCapIM.setMatrixAt(i, m);

    // Bottom cap
    p.set(lx, ly - 0.32 * scale, lz);
    m.compose(p, q, s);
    botCapIM.setMatrixAt(i, m);

    // Tassel (hangs below the bottom cap)
    p.set(lx, ly - 0.56 * scale, lz);
    s.set(scale * 0.9, scale, scale * 0.9);
    m.compose(p, q, s);
    tasselIM.setMatrixAt(i, m);
  }

  bodyIM.instanceMatrix.needsUpdate   = true;
  topCapIM.instanceMatrix.needsUpdate = true;
  botCapIM.instanceMatrix.needsUpdate = true;
  tasselIM.instanceMatrix.needsUpdate = true;

  scene.add(bodyIM, topCapIM, botCapIM, tasselIM);

  // -- Night PointLights — one per plaza cluster (budget: 2 lights total) --
  // East cluster (lanterns 0–1)
  _addLanternLight(scene, 8.2, 3.8, 7.8, d.lanternEmissive);
  // West cluster (lanterns 2–3)
  _addLanternLight(scene, -8.2, 3.8, 7.8, d.lanternEmissive);
}

function _addLanternLight(scene, x, y, z, color) {
  const light = new THREE.PointLight(color, 0, 9, 2);
  light.position.set(x, y, z);
  registerNightLight(scene, light, 24);
  scene.add(light);
}

// ── Kumquat pots ───────────────────────────────────────────────────────────────

function _buildKumquatPots(scene, d) {
  // Geometry
  const potGeo    = new THREE.CylinderGeometry(0.28, 0.36, 0.56, 8);
  const baseGeo   = new THREE.CylinderGeometry(0.32, 0.32, 0.06, 8);
  const foliageGeo= new THREE.IcosahedronGeometry(0.48, 1);
  const fruitGeo  = new THREE.SphereGeometry(0.1, 6, 6);

  // Materials
  const potMat    = clayMat(d.potColor, { flat: true });
  const baseMat   = clayMat(d.potBase,  { flat: true });
  const foliageMat= clayMat(d.kumquatLeaf, { flat: true });
  const fruitMat  = clayMat(d.kumquatFruit);

  // All fruits instanced — 3 per pot × 4 pots = 12 instances
  const FRUITS_PER_POT = 3;
  const fruitIM = new THREE.InstancedMesh(fruitGeo, fruitMat, KUMQUAT_POSITIONS.length * FRUITS_PER_POT);

  let fruitIdx = 0;
  const fm = new THREE.Matrix4();
  const fq = new THREE.Quaternion();
  const fs = new THREE.Vector3(1, 1, 1);
  let seed = 77;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  // Fruit offsets on the foliage sphere (precomputed angles)
  const FRUIT_OFFSETS = [
    [ 0.28,  0.26, -0.15],
    [-0.24,  0.30,  0.18],
    [ 0.08, -0.16,  0.36],
  ];

  for (const [px, py, pz] of KUMQUAT_POSITIONS) {
    const potScale = 0.9 + rnd() * 0.2;
    const potH     = 0.56 * potScale;

    // Pot body
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.scale.setScalar(potScale);
    pot.position.set(px, py + potH * 0.5, pz);
    pot.castShadow = pot.receiveShadow = true;
    scene.add(pot);

    // Pot base ring
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.scale.setScalar(potScale);
    base.position.set(px, py + 0.03, pz);
    base.receiveShadow = true;
    scene.add(base);

    // Foliage blob
    const foliageY = py + potH + 0.42 * potScale;
    const foliage  = new THREE.Mesh(foliageGeo, foliageMat);
    foliage.scale.set(potScale, potScale * 1.05, potScale);
    foliage.position.set(px, foliageY, pz);
    foliage.castShadow = true;
    scene.add(foliage);

    // Fruits scattered on the foliage
    for (const [ox, oy, oz] of FRUIT_OFFSETS) {
      fq.setFromEuler(new THREE.Euler(rnd(), rnd(), rnd()));
      fm.compose(
        new THREE.Vector3(px + ox * potScale, foliageY + oy * potScale, pz + oz * potScale),
        fq, fs
      );
      fruitIM.setMatrixAt(fruitIdx++, fm);
    }
  }

  fruitIM.count = fruitIdx;
  fruitIM.instanceMatrix.needsUpdate = true;
  scene.add(fruitIM);
}
