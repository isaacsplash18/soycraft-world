import * as THREE from 'three';
import { clayMat, glossMat } from './materials.js';

/**
 * Procedural low-poly product models, one builder per category. Each returns a
 * THREE.Group whose origin sits on the ground (model extends upward), sized to
 * read clearly at the discovery distance.
 *
 * Categories: 'stroller' | 'bag' | 'harness' | 'bed' | 'cushion'
 *
 * Styled to Soycraft's minimal/luxe palette: cream fabrics, near-black frames,
 * soft metals, with a per-product `accent` color for trims.
 *
 * ── To use a real product GLB instead ──────────────────────────────────────
 *  Set `model: '/products/your-product.glb'` on the product in config/products.js.
 *  Products.js loads the GLB and skips this factory for that item.
 */

const PALETTE = {
  frame: 0x342f2b, // warm near-black
  fabric: 0xf2e8d6, // warm cream
  fabricDark: 0xdacdb4, // warm greige
  metal: 0xbcb6ab,
  mesh: 0x3f3a35,
};

// Matte soft parts (fabrics, frames) get the shared clay toon shading so the
// products speak the world's material language; metal/chrome accents keep a
// tuned gloss so hubs and trims still catch a highlight.
const M = (hex, opts = {}) =>
  (opts.metal ?? 0) > 0
    ? glossMat(hex, { rough: opts.rough ?? 0.4, metal: opts.metal })
    : clayMat(hex);

export function buildProductModel(category, accent = 0xf94c43) {
  const builder = BUILDERS[category] || BUILDERS.bag;
  const g = builder(accent);
  g.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return g;
}

const BUILDERS = {
  // ── STROLLER / PRAM ──────────────────────────────────────────────────────
  stroller(accent) {
    const g = new THREE.Group();
    const frame = M(PALETTE.frame, { metal: 0.3, rough: 0.5 });
    const fabric = M(PALETTE.fabric);
    const tyre = M(0x1a1a1a, { rough: 0.8 });
    const hub = M(PALETTE.metal, { metal: 0.6, rough: 0.4 });

    // wheels (4) — tyre torus + hub
    const wheelGeo = new THREE.TorusGeometry(0.2, 0.075, 8, 16);
    const hubGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10);
    for (const [x, z] of [[-0.34, 0.42], [0.34, 0.42], [-0.34, -0.42], [0.34, -0.42]]) {
      const w = new THREE.Mesh(wheelGeo, tyre);
      w.position.set(x, 0.2, z);
      w.rotation.y = Math.PI / 2;
      g.add(w);
      const h = new THREE.Mesh(hubGeo, hub);
      h.position.set(x, 0.2, z);
      h.rotation.z = Math.PI / 2;
      g.add(h);
    }

    // basket / cabin (rounded box) in cream
    const basket = roundedBox(0.78, 0.5, 0.86, 0.12, fabric);
    basket.position.set(0, 0.74, 0);
    g.add(basket);
    // accent trim around the basket opening
    const trim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 8, 24), M(accent));
    trim.position.set(0, 0.99, 0);
    trim.rotation.x = Math.PI / 2;
    trim.scale.set(1.05, 1, 1.15);
    g.add(trim);
    // mesh window on the side
    const win = roundedBox(0.02, 0.3, 0.5, 0.06, M(PALETTE.mesh, { rough: 0.9 }));
    win.position.set(0.4, 0.78, 0);
    g.add(win);

    // canopy (half-dome) over the front
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      M(accent)
    );
    canopy.position.set(0, 0.98, 0.18);
    canopy.scale.set(1, 0.7, 1.05);
    g.add(canopy);

    // frame struts down to wheels
    for (const [x, z] of [[-0.3, 0.42], [0.3, 0.42], [-0.3, -0.42], [0.3, -0.42]]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 6), frame);
      strut.position.set(x, 0.46, z);
      g.add(strut);
    }

    // handle bar (U-shape) angled back
    const post = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8);
    for (const x of [-0.32, 0.32]) {
      const p = new THREE.Mesh(post, frame);
      p.position.set(x, 1.05, -0.42);
      p.rotation.x = -0.35;
      g.add(p);
    }
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.72, 8), M(accent));
    grip.position.set(0, 1.42, -0.62);
    grip.rotation.z = Math.PI / 2;
    g.add(grip);

    return g;
  },

  // ── BAG / CARRIER / SLING ──────────────────────────────────────────────────
  bag(accent) {
    const g = new THREE.Group();
    const fabric = M(PALETTE.fabric);

    // soft body
    const body = roundedBox(0.9, 0.62, 0.5, 0.16, fabric);
    body.position.set(0, 0.5, 0);
    g.add(body);

    // mesh ventilation window (rounded, dark)
    const win = roundedBox(0.4, 0.34, 0.02, 0.1, M(PALETTE.mesh, { rough: 0.95 }));
    win.position.set(0, 0.54, 0.26);
    g.add(win);
    // window frame in accent
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.022, 8, 20), M(accent));
    frame.position.set(0, 0.54, 0.265);
    frame.scale.set(1, 0.85, 1);
    g.add(frame);

    // top handles (two arcs)
    const handleGeo = new THREE.TorusGeometry(0.16, 0.03, 8, 18, Math.PI);
    for (const z of [-0.12, 0.12]) {
      const h = new THREE.Mesh(handleGeo, M(PALETTE.frame, { rough: 0.5 }));
      h.position.set(0, 0.82, z);
      g.add(h);
    }

    // shoulder strap (big arc to the side)
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 24, Math.PI * 1.1), M(accent));
    strap.position.set(-0.1, 0.66, 0);
    strap.rotation.set(0, 0, Math.PI * 0.15);
    g.add(strap);

    // base trim
    const base = roundedBox(0.92, 0.08, 0.52, 0.06, M(PALETTE.fabricDark));
    base.position.set(0, 0.22, 0);
    g.add(base);

    return g;
  },

  // ── HARNESS / LEASH (on a little display stand) ───────────────────────────
  harness(accent) {
    const g = new THREE.Group();
    const stand = M(PALETTE.metal, { metal: 0.5, rough: 0.4 });

    // stand base + post
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.06, 20), M(PALETTE.frame));
    base.position.y = 0.03;
    g.add(base);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 10), stand);
    post.position.y = 0.55;
    g.add(post);

    // little torso form wearing the harness
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.34, 6, 12), M(PALETTE.fabricDark));
    torso.position.set(0, 1.05, 0);
    torso.rotation.z = Math.PI / 2;
    g.add(torso);

    // harness straps (accent rings around the torso)
    for (const z of [-0.12, 0.16]) {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 20), M(accent));
      strap.position.set(0, 1.05, z);
      strap.rotation.y = Math.PI / 2;
      g.add(strap);
    }
    // chest connector
    const chest = roundedBox(0.16, 0.12, 0.34, 0.04, M(accent));
    chest.position.set(0, 0.86, 0.02);
    g.add(chest);

    // coiled leash hanging off the post
    const leash = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.028, 8, 22), M(PALETTE.frame, { rough: 0.6 }));
    leash.position.set(0.16, 0.7, 0.0);
    leash.rotation.set(Math.PI / 2, 0, 0.3);
    g.add(leash);
    const leash2 = leash.clone();
    leash2.position.y = 0.62;
    leash2.scale.setScalar(0.9);
    g.add(leash2);

    return g;
  },

  // ── BED (round bolster bed) ────────────────────────────────────────────────
  bed(accent) {
    const g = new THREE.Group();
    // raised rim
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.2, 12, 28), M(PALETTE.fabric));
    rim.position.y = 0.2;
    rim.scale.set(1, 1, 0.85);
    g.add(rim);
    // inner cushion
    const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.16, 28), M(PALETTE.fabricDark));
    cushion.position.y = 0.12;
    cushion.scale.set(1, 1, 0.85);
    g.add(cushion);
    // accent piping on the rim
    const piping = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.025, 8, 30), M(accent));
    piping.position.y = 0.34;
    piping.scale.set(1, 1, 0.85);
    g.add(piping);
    return g;
  },

  // ── CUSHION (soft tufted pad) ──────────────────────────────────────────────
  cushion(accent) {
    const g = new THREE.Group();
    const pad = roundedBox(0.86, 0.2, 0.7, 0.12, M(PALETTE.fabric));
    pad.position.y = 0.18;
    g.add(pad);
    // accent piping seam around the middle
    const seam = roundedBox(0.9, 0.04, 0.74, 0.1, M(accent));
    seam.position.y = 0.18;
    g.add(seam);
    // center button tuft
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), M(accent));
    button.position.set(0, 0.28, 0);
    button.scale.y = 0.5;
    g.add(button);
    return g;
  },
};

/**
 * A box with softly chamfered edges, faked cheaply by scaling a higher-segment
 * box — reads as "soft" without a heavy rounded-box geometry dependency.
 */
function roundedBox(w, h, d, r, material) {
  const geo = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
  // Pull corner vertices in slightly to soften edges.
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const hx = w / 2;
  const hy = h / 2;
  const hz = d / 2;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (Math.abs(v.x) > hx - 1e-3) v.x -= Math.sign(v.x) * r * 0.4;
    if (Math.abs(v.y) > hy - 1e-3) v.y -= Math.sign(v.y) * r * 0.4;
    if (Math.abs(v.z) > hz - 1e-3) v.z -= Math.sign(v.z) * r * 0.4;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}
