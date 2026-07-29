import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SETTINGS, BRAND, THEME } from '../config/settings.js';
import { clayMat, glossMat } from '../world/materials.js';
import { buildLogo } from '../world/Logo.js';
import { buildLandmarks, ANCHORS } from '../world/Landmarks.js';
import { registerNightLight, registerNightEmissive } from '../world/Sky.js';
import { PRODUCTS } from '../config/products.js';
import { LINKS } from '../config/links.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
// 0 below `a`, 1 above `b`, smooth in between
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * The walkable world.
 *
 * Two modes:
 *  1. PLACEHOLDER (default): a procedural low-poly park — flat ground plane,
 *     a perimeter fence (so the player can't walk off the edge), and instanced
 *     trees/bushes/rocks. Everything here is collidable.
 *  2. GLB: if SETTINGS.assets.worldModel is set, that GLB is loaded instead and
 *     used as the collidable world.
 *
 * `build()` returns a THREE.Group ("collidables") whose meshes are fed to the
 * Octree in Physics. Decorative, non-collidable touches (flowers etc.) are
 * added straight to the scene so they don't bloat the collision tree.
 *
 * ── To swap in a real environment ──────────────────────────────────────────
 *  Set SETTINGS.assets.worldModel = '/world/your-park.glb' in config/settings.js.
 *  No code changes needed. (See README.)
 */
export class World {
  constructor(scene) {
    this.scene = scene;
    this.collidables = new THREE.Group();
    this.collidables.name = 'collidables';
  }

  /** @returns {Promise<THREE.Group>} the collidable root for the Octree. */
  async build() {
    if (SETTINGS.assets.worldModel) {
      await this._loadGLBWorld(SETTINGS.assets.worldModel);
    } else {
      this._buildPlaceholderPark();
    }
    this.scene.add(this.collidables);

    // The 3D "soycraft" wordmark centerpiece (decorative, non-collidable).
    this.scene.add(buildLogo());

    return this.collidables;
  }

  // ── GLB world (drop-in) ──────────────────────────────────────────────────
  _loadGLBWorld(path) {
    return new Promise((resolve, reject) => {
      new GLTFLoader().load(
        path,
        (gltf) => {
          gltf.scene.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          this.collidables.add(gltf.scene);
          resolve();
        },
        undefined,
        reject
      );
    });
  }

  // ── Procedural placeholder park ──────────────────────────────────────────
  _buildPlaceholderPark() {
    const { world } = SETTINGS;
    const S = world.halfSize;

    // Gently rolling terrain. Flat "pads" are kept under the plaza and every
    // product/landmark so nothing floats; hills appear only in the gaps.
    this._buildPads();
    this._buildTerrain(S);

    // District ground surfaces (grass park, concrete mall, runway, lawn, roads).
    this._addGroundZones();

    // A few winding "paths" as flat decorative quads (non-collidable).
    this._addPaths(S);

    // Perimeter fence — four low walls so the player stays in the park.
    this._addFence(S);

    // Instanced vegetation (cheap: one draw call per type).
    this._addTrees(world.treeCount, S);
    this._addBushes(world.bushCount, S);
    this._addRocks(Math.round(world.bushCount / 3), S);

    // Street lamps (lit at night) around the plaza + zones.
    this._addStreetLamps();

    // Big set-piece landmarks (mountain, park, plane, house, mall, car, taxi,
    // big-dog corner). Added to collidables so the player walks around them.
    buildLandmarks(this.collidables, this.scene);
  }

  // ── Terrain ──────────────────────────────────────────────────────────────
  // Flat pads where things stand. Circles {x,z,r} or rects {x,z,hw,hd}.
  _buildPads() {
    this._pads = [{ x: 0, z: 0, r: 18 }]; // plaza + spawn + logo
    for (const p of PRODUCTS) this._pads.push({ x: p.position[0], z: p.position[2], r: 4 });
    for (const l of LINKS) this._pads.push({ x: l.position[0], z: l.position[2], r: 4 });
    const lr = { mountain: 18, park: 13, plane: 12, mall: 11, house: 9, car: 6, taxi: 6, bigdog: 9 };
    for (const k of Object.keys(ANCHORS)) {
      this._pads.push({ x: ANCHORS[k][0], z: ANCHORS[k][1], r: lr[k] || 8 });
    }
    // Rect zones for the districts (concrete apron, roads, runway, lawn).
    this._pads.push({ x: -33, z: 0, hw: 7, hd: 11 }); // mall concrete
    this._pads.push({ x: -23, z: 0, hw: 4.5, hd: 19 }); // mall road
    this._pads.push({ x: 35, z: -6, hw: 6, hd: 23 }); // runway
    this._pads.push({ x: 26, z: -3, hw: 6.5, hd: 9 }); // plane apron (products + counter)
    this._pads.push({ x: -30, z: 29, hw: 11, hd: 9 }); // house lawn
  }

  // Smooth height at (x,z): low-frequency hills, flattened at pads & edges.
  _terrainHeight(x, z) {
    const S = SETTINGS.world.halfSize;
    let h =
      (1.4 * Math.sin(x * 0.08) * Math.cos(z * 0.07) +
        0.9 * Math.sin(x * 0.05 + 1.7) * Math.sin(z * 0.06 + 0.4) +
        0.5 * Math.cos(x * 0.13 - 0.6) * Math.cos(z * 0.11 + 1.1)) *
      1.05;
    let flat = 1;
    for (const p of this._pads) {
      let ox, oz;
      if (p.hw !== undefined) {
        ox = Math.max(Math.abs(x - p.x) - p.hw, 0);
        oz = Math.max(Math.abs(z - p.z) - p.hd, 0);
      } else {
        ox = Math.max(Math.hypot(x - p.x, z - p.z) - p.r, 0);
        oz = 0;
      }
      flat = Math.min(flat, smoothstep(0, 5, Math.hypot(ox, oz)));
      if (flat === 0) break;
    }
    const edge = clamp01((S - Math.max(Math.abs(x), Math.abs(z))) / 4);
    return h * flat * edge;
  }

  // Solid box whose TOP face is displaced into hills (keeps volume, so the
  // capsule never falls through — even on the flat pads).
  _buildTerrain(S) {
    const seg = 56; // coarser facets so the low-poly hills read clearly
    const geo = new THREE.BoxGeometry(S * 2, 4, S * 2, seg, 1, seg);
    const pos = geo.attributes.position;

    // Soft large-scale patchwork of warm pastel greens & creams, painted with
    // vertex colours (no texture — cheap on mobile). Low-frequency so the
    // patches read as gentle designed swatches, not noise.
    const patches = THEME.groundPatches.map((h) => new THREE.Color(h));
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      if (pos.getY(i) > 1.9) pos.setY(i, pos.getY(i) + this._terrainHeight(x, z));
      // pick a patch from a smooth low-frequency field, blended toward the base
      const n = Math.sin(x * 0.09) * Math.cos(z * 0.08) + 0.5 * Math.sin(x * 0.045 + 2.1) * Math.sin(z * 0.05);
      const idx = Math.min(patches.length - 1, Math.max(0, Math.floor((n * 0.5 + 0.5) * patches.length)));
      c.copy(patches[idx]).lerp(new THREE.Color(THEME.groundBase), 0.25);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const ground = new THREE.Mesh(
      geo,
      // toon clay + flatShading gives the gentle hills a soft faceted low-poly read
      clayMat(0xffffff, { flat: true, vertexColors: true })
    );
    ground.position.y = -2; // local top (+2) -> world y = terrain height
    ground.receiveShadow = true;
    this.collidables.add(ground);
  }

  // Flat district surfaces laid over the (flattened) pads. Each uses
  // polygonOffset + a small height stagger so coplanar decals never z-fight.
  _addGroundZones() {
    const mat = (c, off = -2) =>
      new THREE.MeshStandardMaterial({
        color: c,
        roughness: 1,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: off,
      });
    const quad = (w, d, x, z, m, y) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      return mesh;
    };
    const BASE = 0.03; // district surfaces
    const MARK = 0.07; // road / runway markings (clearly above the surface)

    // Park grass (north)
    const grass = new THREE.Mesh(new THREE.CircleGeometry(13, 44), mat(THEME.grass));
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(0, BASE, -30);
    grass.receiveShadow = true;
    this.scene.add(grass);

    // House neighbourhood lawn (southwest) + driveway
    quad(22, 18, -30, 29, mat(THEME.grassLawn), BASE);
    quad(3.6, 13, -22, 26, mat(0xe3d8c1, -4), MARK);

    // Mall concrete apron + road (road sits just above where it meets concrete)
    quad(14, 22, -33, 0, mat(THEME.concrete), BASE);
    quad(8, 38, -23, 0, mat(THEME.road, -3), BASE + 0.02);
    for (let i = -3; i <= 3; i++) quad(0.4, 2.2, -23, i * 5, mat(THEME.roadMark, -4), MARK);

    // Plane apron (trimmed so it stops short of the runway — no overlap)
    quad(10, 18, 24, -3, mat(THEME.concrete), BASE);

    // Runway (asphalt) with centre dashes + threshold bars
    quad(11, 46, 35, -6, mat(THEME.road), BASE);
    for (let i = -4; i <= 4; i++) quad(0.5, 2.6, 35, -6 + i * 5, mat(THEME.roadMark, -4), MARK);
    for (const zz of [-27, 15]) for (let k = -2; k <= 2; k++) quad(0.6, 2.0, 35 + k * 1.5, zz, mat(THEME.roadMark, -4), MARK);
  }

  _addStreetLamps() {
    // Near the zones that have no landmark light of their own (park, big-dog,
    // house) plus two by the central plaza. The mall, plane, car & taxi carry
    // their own lights.
    const spots = [
      [0, -22], [27, -26], [-25, 27], [9, 7], [-9, 7], [-22, 0],
    ];
    const postMat = glossMat(0x4a4742, { rough: 0.6, metal: 0.4 });
    for (const [x, z] of spots) {
      const lamp = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 3.6, 8), postMat);
      post.position.set(x, 1.8, z);
      post.castShadow = true;
      lamp.add(post);

      const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff0d2, roughness: 0.4 });
      registerNightEmissive(this.scene, bulbMat, 0xffe2a8, 1.6);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), bulbMat);
      head.position.set(x, 3.7, z);
      lamp.add(head);

      const light = new THREE.PointLight(0xffe0a6, 0, 17, 2);
      light.position.set(x, 3.6, z);
      registerNightLight(this.scene, light, 34);
      lamp.add(light);

      this.collidables.add(lamp);
    }
  }

  _addPaths() {
    // Central circular plaza only (sits on the flat central pad). The old cross
    // paths were removed since they'd clip through the rolling terrain.
    const pathMat = new THREE.MeshStandardMaterial({
      color: BRAND.cream,
      roughness: 1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    });
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(13, 56), pathMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.03;
    plaza.receiveShadow = true;
    this.scene.add(plaza);
  }

  _addFence(S) {
    const h = 1.4;
    const t = 0.4;
    const mat = clayMat(BRAND.mauve);
    const walls = [
      [S * 2, h, t, 0, h / 2, -S], // back
      [S * 2, h, t, 0, h / 2, S], // front
      [t, h, S * 2, -S, h / 2, 0], // left
      [t, h, S * 2, S, h / 2, 0], // right
    ];
    for (const [w, hh, d, x, y, z] of walls) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat);
      wall.position.set(x, y, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.collidables.add(wall);
    }
  }

  _addTrees(count, S) {
    // Low-poly tree = a plump rounded blob canopy on a cylinder trunk. Rounder
    // than a cone for the softer, claymation-adjacent silhouette. Two
    // InstancedMeshes (one draw call each). Canopy is squashed taller on place.
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.28, 1.4, 6);
    const trunkMat = clayMat(THEME.trunk);
    const canopyGeo = new THREE.IcosahedronGeometry(1.25, 1);
    const canopyMat = clayMat(THEME.treeCanopy, { flat: true });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, count);
    trunks.castShadow = canopies.castShadow = true;
    trunks.receiveShadow = canopies.receiveShadow = true;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    let placed = 0;
    let guard = 0;
    // Place trees in an outer ring so the central showroom stays open.
    const innerR = 31;
    while (placed < count && guard++ < count * 20) {
      const ang = this._rand() * Math.PI * 2;
      const rad = innerR + this._rand() * (S - 2 - innerR);
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad;
      const s = 0.8 + this._rand() * 0.8;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this._rand() * Math.PI * 2);

      const hy = this._terrainHeight(x, z); // seat on the hills
      scl.set(s, s, s);
      m.compose(new THREE.Vector3(x, hy + 0.7 * s, z), q, scl);
      trunks.setMatrixAt(placed, m);
      m.compose(new THREE.Vector3(x, hy + 1.4 * s + 1.2 * s, z), q, scl);
      canopies.setMatrixAt(placed, m);
      placed++;
    }
    trunks.count = canopies.count = placed;
    trunks.instanceMatrix.needsUpdate = canopies.instanceMatrix.needsUpdate = true;
    this.collidables.add(trunks, canopies);
  }

  _addBushes(count, S) {
    const geo = new THREE.IcosahedronGeometry(0.6, 0);
    const mat = clayMat(THEME.bush, { flat: true });
    const bushes = new THREE.InstancedMesh(geo, mat, count);
    bushes.castShadow = bushes.receiveShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let placed = 0;
    let guard = 0;
    const innerR = 31;
    while (placed < count && guard++ < count * 20) {
      const ang = this._rand() * Math.PI * 2;
      const rad = innerR + this._rand() * (S - 2 - innerR);
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad;
      const s = 0.7 + this._rand() * 0.9;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this._rand() * Math.PI * 2);
      const hy = this._terrainHeight(x, z);
      m.compose(new THREE.Vector3(x, hy + 0.4 * s, z), q, new THREE.Vector3(s, s * 0.8, s));
      bushes.setMatrixAt(placed++, m);
    }
    bushes.count = placed;
    bushes.instanceMatrix.needsUpdate = true;
    this.collidables.add(bushes);
  }

  _addRocks(count, S) {
    const geo = new THREE.DodecahedronGeometry(0.5, 0);
    const mat = clayMat(THEME.rock, { flat: true });
    const rocks = new THREE.InstancedMesh(geo, mat, count);
    rocks.castShadow = rocks.receiveShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let placed = 0;
    let guard = 0;
    const innerR = 31;
    while (placed < count && guard++ < count * 20) {
      const ang = this._rand() * Math.PI * 2;
      const rad = innerR + this._rand() * (S - 1 - innerR);
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad;
      const s = 0.5 + this._rand() * 0.8;
      q.setFromEuler(new THREE.Euler(this._rand(), this._rand() * Math.PI * 2, this._rand()));
      const hy = this._terrainHeight(x, z);
      m.compose(new THREE.Vector3(x, hy + 0.25 * s, z), q, new THREE.Vector3(s, s * 0.7, s));
      rocks.setMatrixAt(placed++, m);
    }
    rocks.count = placed;
    rocks.instanceMatrix.needsUpdate = true;
    this.collidables.add(rocks);
  }

  // Deterministic-ish PRNG so the park layout is stable between reloads.
  // (Date.now/Math.random intentionally avoided — keeps layout reproducible.)
  _rand() {
    this._seed = (this._seed || 1) * 16807 % 2147483647;
    return (this._seed - 1) / 2147483646;
  }
}
