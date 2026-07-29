import * as THREE from 'three';
import { clayMat } from '../world/materials.js';
import { COAT_COLOURS } from './DogIdentity.js';

/**
 * Builds a cute low-poly dog from a breed param object (see config/breeds.js).
 * Returns a THREE.Group facing +Z with `group.userData.parts` (legs + tail) for
 * procedural animation by the Player.
 *
 * Style: smooth rounded shapes, a big head, big shiny eyes with highlights, and
 * a soft neck ruff for fluffy/curly breeds (no bumpy "fur balls"). A real rigged
 * GLB can still replace all of this via SETTINGS.assets.dogModel.
 *
 * @param {object} breed     — breed config from config/breeds.js
 * @param {string} [coat]    — coat colour id from DogIdentity.COAT_COLOURS ('natural' = breed default)
 * @param {string} [accId]   — accessory id from DogIdentity.ACCESSORIES ('none' = no accessory)
 */
export function buildDog(breed, coat = 'natural', accId = 'none') {
  const g = new THREE.Group();
  g.name = `dog-${breed.id}`;

  const matBase  = mat(breed.colors.base);
  const matBelly = mat(breed.colors.belly ?? breed.colors.base);
  const matEar   = mat(breed.colors.ears  ?? breed.colors.base);
  const matMask  = breed.colors.mask != null ? mat(breed.colors.mask) : null;
  const matNose  = mat(0x2a2422);
  const matEyeWhite = mat(0xfdfdfd);
  const matEye   = mat(0x171311);
  const matHi    = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // Apply coat tint before any mesh is created (mutates the materials in-place).
  if (coat !== 'natural') {
    const coatDef = COAT_COLOURS.find((c) => c.id === coat);
    if (coatDef?.hex != null) _applyCoatTint(matBase, matBelly, matEar, breed, coatDef.hex);
  }

  const { length, radius } = breed.body;
  const legLen = breed.legLength;
  const bodyY  = legLen + radius * 0.8;
  const headR  = radius * 1.05;
  const headZ  = length / 2 + radius * 0.35;
  const headY  = bodyY + radius * 0.5;

  // ── Torso (smooth capsule) ────────────────────────────────────────────────
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 8, 16), matBase);
  torso.rotation.x = Math.PI / 2;
  torso.position.set(0, bodyY, 0);
  g.add(torso);

  // lighter belly
  const belly = new THREE.Mesh(new THREE.CapsuleGeometry(radius * 0.78, length * 0.85, 6, 14), matBelly);
  belly.rotation.x = Math.PI / 2;
  belly.position.set(0, bodyY - radius * 0.32, radius * 0.1);
  belly.scale.y = 0.72;
  g.add(belly);

  // soft neck ruff for fluffy / curly coats — ONE smooth shape, not lumps
  if (breed.coat === 'fluffy' || breed.coat === 'curly') {
    const ruff = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.2, 14, 12), matBase);
    ruff.position.set(0, bodyY + radius * 0.15, headZ - headR * 0.7);
    ruff.scale.set(1.15, 1.0, 0.9);
    g.add(ruff);
  }

  // ── Head ──────────────────────────────────────────────────────────────────
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 18, 16), matBase);
  head.position.set(0, headY, headZ);
  head.scale.set(1, 0.96, 0.98);
  g.add(head);

  if (matMask) {
    const mask = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.99, 16, 14), matMask);
    mask.position.set(0, headY - headR * 0.12, headZ + headR * 0.5);
    mask.scale.set(0.92, 0.92, 0.5);
    g.add(mask);
  }

  // ── Muzzle + nose ───────────────────────────────────────────────────────
  const flat  = breed.snout.flat;
  const sLen  = breed.snout.length * (1 - flat * 0.7);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.5, 12, 10), matBelly);
  const muzzleZ = headZ + headR * 0.62 + sLen * 0.6;
  muzzle.position.set(0, headY - headR * 0.22, muzzleZ);
  muzzle.scale.set(1.05, 0.85, 1 + sLen * 2.2);
  g.add(muzzle);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.17, 10, 9), matNose);
  nose.position.set(0, headY - headR * 0.18, muzzleZ + headR * 0.5 + sLen * 0.6);
  nose.scale.set(1.2, 0.9, 0.9);
  g.add(nose);

  // ── Big cute eyes (white + pupil + highlight) ──────────────────────────────
  for (const sx of [-1, 1]) {
    const ex = sx * headR * 0.4;
    const ey = headY + headR * 0.14;
    const ez = headZ + headR * 0.82;
    const white = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.22, 12, 12), matEyeWhite);
    white.position.set(ex, ey, ez);
    white.scale.set(0.9, 1.05, 0.8);
    g.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.14, 10, 10), matEye);
    pupil.position.set(ex, ey, ez + headR * 0.12);
    g.add(pupil);
    const hi = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.05, 8, 8), matHi);
    hi.position.set(ex + sx * headR * 0.04, ey + headR * 0.07, ez + headR * 0.2);
    g.add(hi);
  }

  // ── Ears ──────────────────────────────────────────────────────────────────
  addEars(g, breed.ears, { headR, headY, headZ, matEar });

  // ── Legs (rounded, with paws; pivots at the hips for animation) ─────────────
  const legR  = radius * 0.26;
  const legs  = [];
  const legGeo = new THREE.CapsuleGeometry(legR, legLen * 0.55, 4, 8);
  const pawGeo = new THREE.SphereGeometry(legR * 1.15, 8, 7);
  const fz    = length * 0.3;
  for (const [lx, lz] of [[-1, fz], [1, fz], [-1, -fz], [1, -fz]]) {
    const pivot = new THREE.Group();
    pivot.position.set(lx * radius * 0.62, bodyY - radius * 0.15, lz);
    const leg = new THREE.Mesh(legGeo, matEar);
    leg.position.y = -legLen * 0.45;
    const paw = new THREE.Mesh(pawGeo, matBelly);
    paw.position.y = -legLen * 0.82;
    paw.scale.set(1.1, 0.8, 1.2);
    pivot.add(leg, paw);
    g.add(pivot);
    legs.push(pivot);
  }

  // ── Tail (pivot for wagging) ──────────────────────────────────────────────
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, bodyY + radius * 0.18, -length / 2 - radius * 0.25);
  addTail(tailPivot, breed.tail, { radius, matBase });
  g.add(tailPivot);

  // ── Accessory ─────────────────────────────────────────────────────────────
  _attachAccessory(g, breed, accId, { radius, bodyY, headY, headZ, headR });

  // smooth shading + shadows
  g.traverse((c) => {
    if (c.isMesh) {
      c.castShadow    = true;
      c.receiveShadow = true;
    }
  });

  // Store material refs for potential live re-tinting, plus nameplate height.
  const nameplateY = headY + headR + 0.38;
  g.userData.parts     = { legs, tail: tailPivot, head };
  g.userData.materials = { matBase, matBelly, matEar };
  g.userData.nameplateY = nameplateY;

  return g;
}

// ── helpers ──────────────────────────────────────────────────────────────────
// Soft matte "clay" toon shading so the dog matches the world's material
// language (§6.1). Colours still come from the breed data.
function mat(hex) {
  return clayMat(hex);
}

// ── Coat tinting ─────────────────────────────────────────────────────────────

/**
 * Mutate three clay materials to apply a coat tint, preserving the breed's
 * belly-lightness and ear-darkness relative to its natural base colour.
 */
function _applyCoatTint(matBase, matBelly, matEar, breed, tintHex) {
  const tint      = new THREE.Color(tintHex);
  const breedBase = new THREE.Color(breed.colors.base);
  const breedBelly = new THREE.Color(breed.colors.belly ?? breed.colors.base);
  const breedEar   = new THREE.Color(breed.colors.ears  ?? breed.colors.base);

  const hslBase  = { h: 0, s: 0, l: 0 };
  const hslBelly = { h: 0, s: 0, l: 0 };
  const hslEar   = { h: 0, s: 0, l: 0 };
  const hslTint  = { h: 0, s: 0, l: 0 };

  breedBase.getHSL(hslBase);
  breedBelly.getHSL(hslBelly);
  breedEar.getHSL(hslEar);
  tint.getHSL(hslTint);

  const bellyDelta = hslBelly.l - hslBase.l; // belly is usually lighter
  const earDelta   = hslEar.l   - hslBase.l; // ears may be darker or same

  matBase.color.set(tint);
  matBelly.color.setHSL(
    hslTint.h,
    Math.max(0, hslTint.s - 0.06),
    Math.min(0.96, Math.max(0.04, hslTint.l + bellyDelta))
  );
  matEar.color.setHSL(
    hslTint.h,
    Math.min(1, hslTint.s + 0.04),
    Math.min(0.96, Math.max(0.03, hslTint.l + earDelta))
  );
}

// ── Accessory builder ─────────────────────────────────────────────────────────

/**
 * Build and attach a procedural low-poly accessory to the dog group.
 * Accessories are positioned relative to the neck/head using the same
 * geometry parameters computed inside buildDog.
 *
 * @param {THREE.Group} group    — dog group to attach to
 * @param {object}      breed    — breed config
 * @param {string}      accId    — accessory id ('none' = skip)
 * @param {object}      params   — { radius, bodyY, headY, headZ, headR }
 */
function _attachAccessory(group, breed, accId, { radius, bodyY, headY, headZ, headR }) {
  if (!accId || accId === 'none') return;

  const neckY = bodyY + radius * 0.05;
  const neckZ = headZ - headR * 0.75;
  const acc   = new THREE.Group();
  acc.name    = 'accessory';

  switch (accId) {
    case 'bandana-coral':
    case 'bandana-sage': {
      const color  = accId === 'bandana-coral' ? 0xe87060 : 0x7aaa82;
      const accMat = mat(color);
      acc.position.set(0, neckY, neckZ);

      // Neck wrap ring
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.55, radius * 0.13, 5, 16),
        accMat
      );
      ring.rotation.x = Math.PI / 2;
      acc.add(ring);

      // Front drape — flat triangle point hanging down
      const drape = new THREE.Mesh(
        new THREE.ConeGeometry(radius * 0.26, radius * 0.5, 3),
        accMat
      );
      drape.position.set(0, -radius * 0.38, radius * 0.32);
      drape.rotation.x = 0.45;
      acc.add(drape);
      break;
    }

    case 'collar': {
      const collarMat = mat(0x5a3a8a); // soft purple collar
      const tagMat    = mat(0xd4a030); // warm gold tag
      acc.position.set(0, neckY, neckZ);

      // Collar band
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.55, radius * 0.08, 5, 16),
        collarMat
      );
      ring.rotation.x = Math.PI / 2;
      acc.add(ring);

      // Hang tag (small flattened sphere)
      const tag = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 0.13, 8, 7),
        tagMat
      );
      tag.position.set(0, -radius * 0.26, radius * 0.44);
      tag.scale.set(1, 1.15, 0.45);
      acc.add(tag);
      break;
    }

    case 'bow': {
      const bowMat  = mat(0xf490b0); // soft pink
      const knotMat = mat(0xe8709a); // deeper pink knot centre
      // Attach between the ears at the crown of the head
      acc.position.set(0, headY + headR * 0.52, headZ + headR * 0.05);

      const wingGeo = new THREE.ConeGeometry(headR * 0.22, headR * 0.4, 4);
      for (const sx of [-1, 1]) {
        const wing = new THREE.Mesh(wingGeo, bowMat);
        wing.position.set(sx * headR * 0.24, 0, 0);
        wing.rotation.z = sx * (Math.PI / 2 + 0.55);
        wing.scale.z    = 0.42;
        acc.add(wing);
      }
      const knot = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.12, 7, 7), knotMat);
      acc.add(knot);
      break;
    }

    default:
      return;
  }

  group.add(acc);
}

// ── Ears ──────────────────────────────────────────────────────────────────────

function addEars(g, type, { headR, headY, headZ, matEar }) {
  for (const sx of [-1, 1]) {
    let ear;
    switch (type) {
      case 'pointy':
        ear = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.32, headR * 0.85, 12), matEar);
        ear.position.set(sx * headR * 0.52, headY + headR * 0.78, headZ - headR * 0.08);
        ear.rotation.z = sx * -0.18;
        break;
      case 'bat':
        ear = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.42, headR * 0.95, 12), matEar);
        ear.position.set(sx * headR * 0.58, headY + headR * 0.82, headZ - headR * 0.04);
        ear.scale.z = 0.4;
        ear.rotation.z = sx * -0.22;
        break;
      case 'button':
        ear = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.36, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), matEar);
        ear.position.set(sx * headR * 0.55, headY + headR * 0.55, headZ - headR * 0.02);
        ear.scale.set(0.8, 1.1, 0.5);
        ear.rotation.z = sx * 0.2;
        break;
      case 'butterfly':
        ear = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.5, headR * 1.05, 12), matEar);
        ear.position.set(sx * headR * 0.68, headY + headR * 0.7, headZ - headR * 0.08);
        ear.scale.z = 0.32;
        ear.rotation.z = sx * -0.7;
        break;
      case 'floppy':
      default:
        ear = new THREE.Mesh(new THREE.CapsuleGeometry(headR * 0.28, headR * 0.6, 5, 10), matEar);
        ear.position.set(sx * headR * 0.6, headY + headR * 0.18, headZ - headR * 0.04);
        ear.scale.z = 0.55;
        ear.rotation.z = sx * 0.28;
        break;
    }
    g.add(ear);
  }
}

function addTail(pivot, type, { radius, matBase }) {
  let tail;
  switch (type) {
    case 'curl':
      tail = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.42, radius * 0.16, 10, 16, Math.PI * 1.4), matBase);
      tail.position.y = radius * 0.4;
      tail.rotation.y = Math.PI / 2;
      break;
    case 'stubby':
      tail = new THREE.Mesh(new THREE.CapsuleGeometry(radius * 0.18, radius * 0.18, 5, 10), matBase);
      tail.position.set(0, radius * 0.12, -radius * 0.08);
      tail.rotation.x = -0.6;
      break;
    case 'plume':
      tail = new THREE.Mesh(new THREE.CapsuleGeometry(radius * 0.3, radius * 0.65, 6, 12), matBase);
      tail.position.set(0, radius * 0.5, -radius * 0.08);
      tail.rotation.x = -0.95;
      break;
    case 'straight':
    default:
      tail = new THREE.Mesh(new THREE.CapsuleGeometry(radius * 0.14, radius * 0.55, 5, 10), matBase);
      tail.position.set(0, radius * 0.28, -radius * 0.15);
      tail.rotation.x = -0.7;
      break;
  }
  pivot.add(tail);
}
