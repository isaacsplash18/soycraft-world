import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { LOGO } from '../config/logoPath.js';
import { BRAND } from '../config/settings.js';
import { clayMat } from './materials.js';

/**
 * The 3D "soycraft" wordmark — the centerpiece of the world.
 *
 * The letter outlines come from scripts/gen-logo.mjs (a rounded font traced to
 * an SVG path). Here we parse that path into shapes and ExtrudeGeometry them
 * into chunky 3D letters, then sit them on a low pedestal at the origin.
 *
 * To change the wordmark/font: edit scripts/gen-logo.mjs and re-run it.
 */
export function buildLogo() {
  const group = new THREE.Group();
  group.name = 'soycraft-logo';

  // Parse the generated path into fillable shapes.
  const loader = new SVGLoader();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${LOGO.d}"/></svg>`;
  const parsed = loader.parse(svg);
  const shapes = [];
  for (const path of parsed.paths) {
    for (const s of SVGLoader.createShapes(path)) shapes.push(s);
  }

  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: 16,
    bevelEnabled: true,
    bevelThickness: 2.5,
    bevelSize: 1.6,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geometry.center();
  geometry.scale(1, -1, 1); // SVG y is down → flip so letters stand upright
  geometry.computeVertexNormals();

  const front = new THREE.MeshStandardMaterial({ color: BRAND.ink, roughness: 0.45, metalness: 0.05 });
  const side = new THREE.MeshStandardMaterial({ color: 0x3a3736, roughness: 0.55, metalness: 0.05 });
  const text = new THREE.Mesh(geometry, [front, side]);
  text.castShadow = true;

  // Scale the (font-unit) geometry to a world width.
  const targetWidth = 9;
  const s = targetWidth / LOGO.width;
  text.scale.setScalar(s);
  const worldHeight = LOGO.height * s;
  text.position.y = 1.5 + worldHeight / 2; // float above the pedestal
  group.add(text);

  // Pedestal — two soft clay tiers + a coral accent ring (matches the warm,
  // rounded material language of the re-skin; the wordmark itself stays glossy).
  const tier1 = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6, 3.9, 0.3, 48),
    clayMat(BRAND.cream)
  );
  tier1.position.y = 0.15;
  tier1.receiveShadow = true;
  group.add(tier1);

  const tier2 = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.4, 0.3, 48),
    clayMat(0xfffdf8)
  );
  tier2.position.y = 0.42;
  tier2.receiveShadow = true;
  group.add(tier2);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.25, 0.04, 8, 64),
    clayMat(BRAND.accent)
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.58;
  group.add(ring);

  return group;
}
