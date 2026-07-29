import * as THREE from 'three';
import { BRAND } from '../config/settings.js';
import { clayMat, glossMat } from './materials.js';
import { buildDog } from '../player/DogFactory.js';
import { BREEDS } from '../config/breeds.js';
import { registerNightLight, registerNightEmissive } from './Sky.js';

/**
 * Big set-piece landmarks placed in a ring around the central logo. Each one
 * anchors a product "zone" (see config/products.js). All landmark masses are
 * added to the collidable group, so the player walks around them (and they feed
 * the Octree).
 *
 * Landmarks are stylized low-poly — readable silhouettes, not detailed models.
 */

// Anchor (x, z) for each zone. Products in products.js sit just inside these,
// between the landmark and the center.
export const ANCHORS = {
  mountain: [0, -44],
  park: [0, -30],
  plane: [35, -6],
  bigdog: [27, -27],
  mall: [-38, 0],
  house: [-30, 29],
  car: [-23, -12], // parked on the mall road
  taxi: [-23, 12], // parked on the mall road
};

// Shared material language (§6.1): matte masses (rock, snow, walls, foliage,
// fuselage) get the soft clay toon; metal/glass accents keep a tuned gloss so
// chrome, hubs and glazing still glint. Emissive night registration works on
// both (MeshToonMaterial and MeshStandardMaterial both carry `.emissive`).
const M = (hex, o = {}) =>
  (o.metal ?? 0) > 0
    ? glossMat(hex, { rough: o.rough ?? 0.4, metal: o.metal, flat: o.flat })
    : clayMat(hex, { flat: o.flat });

export function buildLandmarks(collidables, scene) {
  // Registrar for lights/emissives that switch on at night.
  const reg = {
    light: (l, i) => registerNightLight(scene, l, i),
    emissive: (m, c, i) => registerNightEmissive(scene, m, c, i),
  };
  place(collidables, buildMountain(), ANCHORS.mountain);
  place(collidables, buildPark(), ANCHORS.park);
  // Plane sits axis-aligned along its north–south runway (broadside to centre).
  place(collidables, buildPlane(reg), ANCHORS.plane, 0);
  place(collidables, buildBigDogCorner(), ANCHORS.bigdog, faceCenter(ANCHORS.bigdog));
  place(collidables, buildMall(reg), ANCHORS.mall, faceCenter(ANCHORS.mall));
  place(collidables, buildHouse(), ANCHORS.house, faceCenter(ANCHORS.house));
  // Cars face north along the mall road (not toward centre).
  place(collidables, buildCar(0xb56576, false, reg), ANCHORS.car, Math.PI);
  place(collidables, buildTaxi(reg), ANCHORS.taxi, Math.PI);
}

function place(parent, group, [x, z], yaw = 0) {
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  group.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  parent.add(group);
}

// Yaw so the model's +Z front faces the world center.
function faceCenter([x, z]) {
  return Math.atan2(-x, -z);
}

// ── SNOW MOUNTAIN ────────────────────────────────────────────────────────────
function buildMountain() {
  const g = new THREE.Group();
  const rock = M(0x8d8a86, { flat: true });
  const snow = M(0xfbfbfb, { flat: true });

  const peak = (r, h, x, z) => {
    const base = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), rock);
    base.position.set(x, h / 2, z);
    g.add(base);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.42, h * 0.4, 6), snow);
    cap.position.set(x, h * 0.82, z);
    g.add(cap);
  };
  peak(15, 22, 0, 0);
  peak(9, 14, -13, 6);
  peak(8, 12, 12, 5);
  return g;
}

// ── PARK ──────────────────────────────────────────────────────────────────────
function buildPark() {
  const g = new THREE.Group();
  const trunkM = M(0x9a8268);
  const leafM = M(0x6f9a5a, { flat: true });

  const tree = (x, z, s) => {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.6, 6), trunkM);
    trunk.position.y = 0.8;
    t.add(trunk);
    for (let i = 0; i < 3; i++) {
      const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1 - i * 0.18, 0), leafM);
      ball.position.set((i - 1) * 0.5, 2 + i * 0.7, 0);
      t.add(ball);
    }
    t.position.set(x, 0, z);
    t.scale.setScalar(s);
    g.add(t);
  };
  tree(-6, -4, 1.2);
  tree(7, -3, 1.0);
  tree(4, 6, 1.3);

  // pond — sits above the grass with polygon-offset so it doesn't z-fight
  const pondMat = M(0x8fc4dc, { rough: 0.25, metal: 0.2 });
  pondMat.polygonOffset = true;
  pondMat.polygonOffsetFactor = -1;
  pondMat.polygonOffsetUnits = -5;
  const pond = new THREE.Mesh(new THREE.CircleGeometry(3.2, 32), pondMat);
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(-4, 0.09, 6);
  g.add(pond);

  // benches
  bench(g, -2, 0, 0.5);
  bench(g, 5, 2, -1.2);
  return g;
}

function bench(g, x, z, rot) {
  const b = new THREE.Group();
  const wood = M(0xb08a5a);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.5), wood);
  seat.position.y = 0.45;
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.1), wood);
  back.position.set(0, 0.7, -0.2);
  b.add(seat, back);
  for (const sx of [-0.7, 0.7]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.45), wood);
    leg.position.set(sx, 0.22, 0);
    b.add(leg);
  }
  b.position.set(x, 0, z);
  b.rotation.y = rot;
  g.add(b);
}

// ── LANDED PLANE (stylized airliner) ─────────────────────────────────────────
function buildPlane(reg) {
  const g = new THREE.Group();
  const R = 1.7; // fuselage radius
  const FY = 3.6; // fuselage centre height
  const body = M(0xf4f3f0, { rough: 0.45 });
  const accent = M(BRAND.accent, { rough: 0.5 });
  const dark = M(0x2c2f36, { rough: 0.4, metal: 0.3 });
  const metal = M(0xb7b3ab, { rough: 0.4, metal: 0.5 });

  // Fuselage — capsule with a separate rounded nose and an upswept tail cone.
  const fus = new THREE.Mesh(new THREE.CapsuleGeometry(R, 13, 12, 24), body);
  fus.rotation.x = Math.PI / 2;
  fus.position.y = FY;
  g.add(fus);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(R, 20, 16), body);
  nose.position.set(0, FY, 9.2);
  nose.scale.set(1, 1, 1.5);
  g.add(nose);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(R, 5, 20), body);
  tail.rotation.x = -Math.PI / 2;
  tail.position.set(0, FY + 0.5, -9); // upswept rear
  tail.scale.set(1, 1, 0.7);
  g.add(tail);

  // Coral cheatline + belly
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.01, R + 0.01, 15, 24, 1, true, -0.5, 1.0), accent);
  stripe.rotation.x = Math.PI / 2;
  stripe.position.set(0, FY + 0.45, 0);
  g.add(stripe);

  // Cockpit windows
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(R * 0.55, 12, 10), dark);
  cockpit.position.set(0, FY + 0.55, 9.7);
  cockpit.scale.set(1, 0.55, 0.7);
  g.add(cockpit);

  // Passenger windows — glow at night ("inner lights")
  const winMat = M(0x2b2f36, { rough: 0.3 });
  reg.emissive(winMat, 0xfff0c2, 1.5);
  for (let i = -6; i <= 5; i++) {
    for (const sx of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), winMat);
      w.position.set(sx * (R - 0.02), FY + 0.35, i * 1.05 + 0.5);
      w.rotation.y = sx * Math.PI / 2;
      g.add(w);
    }
  }

  // Swept wings + underslung engines
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 2.6), body);
    wing.position.set(sx * 4.8, FY - 0.6, -0.5);
    wing.rotation.y = sx * 0.32; // sweep back
    wing.rotation.z = sx * 0.05; // dihedral
    g.add(wing);
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.55, 2, 14), dark);
    engine.rotation.x = Math.PI / 2;
    engine.position.set(sx * 5, FY - 1.3, 0.6);
    g.add(engine);
    const intake = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.08, 8, 16), metal);
    intake.position.set(sx * 5, FY - 1.3, 1.55);
    g.add(intake);
  }

  // Vertical fin (swept, coral) + horizontal stabilizers
  const finShape = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 2.4), accent);
  finShape.position.set(0, FY + 2.4, -8.5);
  finShape.rotation.x = -0.25;
  g.add(finShape);
  for (const sx of [-1, 1]) {
    const stab = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.22, 1.4), body);
    stab.position.set(sx * 1.6, FY + 0.9, -9);
    stab.rotation.y = sx * 0.3;
    g.add(stab);
  }

  // Landing gear (nose + 2 main)
  for (const [x, z] of [[0, 7], [-1.5, -1], [1.5, -1]]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, FY - R, 8), metal);
    strut.position.set(x, (FY - R) / 2, z);
    g.add(strut);
    for (const dz of [-0.25, 0.25]) {
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 14), dark);
      tyre.rotation.z = Math.PI / 2;
      tyre.position.set(x, 0.45, z + dz);
      g.add(tyre);
    }
  }

  // Airstairs on the center-facing (+Z front-left) door
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 0.95), dark);
  door.position.set(-(R - 0.02), FY + 0.1, 5.5);
  g.add(door);
  for (let i = 0; i < 6; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.62), metal);
    step.position.set(-(R + 0.4) - i * 0.36, FY - 1.0 - i * 0.42, 5.5);
    g.add(step);
  }

  // Interior/apron spill light for night (lights the nearby products too)
  const inner = new THREE.PointLight(0xfff0cf, 0, 26, 2);
  inner.position.set(0, 3, 6);
  reg.light(inner, 36);
  g.add(inner);

  return g;
}

// ── HOUSE ──────────────────────────────────────────────────────────────────
function buildHouse() {
  const g = new THREE.Group();
  const wall = M(BRAND.cream);
  const roofM = M(BRAND.accent, { flat: true });
  const dark = M(0x4a4640);

  const body = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 7), wall);
  body.position.y = 2;
  g.add(body);
  // hip roof = 4-sided pyramid
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.6, 3, 4), roofM);
  roof.position.y = 5.5;
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  // door (front = +Z)
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.2, 0.2), dark);
  door.position.set(0, 1.1, 3.55);
  g.add(door);
  // windows
  for (const sx of [-2, 2]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 0.15), M(0x9fc6d8, { rough: 0.3 }));
    win.position.set(sx, 2.4, 3.55);
    g.add(win);
  }
  // chimney
  const chim = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2, 0.8), M(0xb98f6a));
  chim.position.set(2, 6, -1);
  g.add(chim);

  // ── neighbourhood: a couple of smaller cottages + hedges ──
  const cottage = (rx, rz, ry, wallC, roofC) => {
    const c = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 5), M(wallC));
    b.position.y = 1.5;
    c.add(b);
    const r = new THREE.Mesh(new THREE.ConeGeometry(4, 2.2, 4), M(roofC, { flat: true }));
    r.position.y = 4.1;
    r.rotation.y = Math.PI / 4;
    c.add(r);
    const d = new THREE.Mesh(new THREE.BoxGeometry(1, 1.7, 0.2), M(0x4a4640));
    d.position.set(0, 0.85, 2.55);
    c.add(d);
    for (const sx of [-1.4, 1.4]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.15), M(0x9fc6d8, { rough: 0.3 }));
      w.position.set(sx, 1.9, 2.55);
      c.add(w);
    }
    c.position.set(rx, 0, rz);
    c.rotation.y = ry;
    g.add(c);
  };
  cottage(-13, -3, 0.3, 0xeae3d6, 0x9c7b8a);
  cottage(13, -4, -0.4, 0xe7e0d0, 0x7a96a8);

  // hedges lining the front yard
  const hedgeMat = M(0x6f9a5a, { flat: true });
  for (let i = -3; i <= 3; i++) {
    const hedge = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.7), hedgeMat);
    hedge.position.set(i * 2.4, 0.35, 6);
    g.add(hedge);
  }
  return g;
}

// ── SHOPPING MALL ────────────────────────────────────────────────────────────
function buildMall(reg) {
  const g = new THREE.Group();
  const concrete = M(0xe9e4da);
  const trim = M(0xd6cdbd);
  // Glass facade — glows softly at night.
  const glass = M(0x55738a, { rough: 0.15, metal: 0.4 });
  reg.emissive(glass, 0x9fc2e0, 0.9);

  const body = new THREE.Mesh(new THREE.BoxGeometry(11, 9, 14), concrete);
  body.position.y = 4.5;
  g.add(body);
  const tier2 = new THREE.Mesh(new THREE.BoxGeometry(8.5, 3.5, 11), concrete);
  tier2.position.set(0, 10.75, 0);
  g.add(tier2);

  // Mullioned glass facade (front = +Z): glass sheet + frame grid
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(9.4, 7, 0.2), glass);
  sheet.position.set(0, 4.2, 7.05);
  g.add(sheet);
  const frameMat = M(0xf4f1ea, { rough: 0.6 });
  for (let c = -2; c <= 2; c++) {
    const mull = new THREE.Mesh(new THREE.BoxGeometry(0.18, 7, 0.3), frameMat);
    mull.position.set(c * 2.3, 4.2, 7.12);
    g.add(mull);
  }
  for (let r = 0; r < 3; r++) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.18, 0.3), frameMat);
    rail.position.set(0, 1.6 + r * 2.6, 7.12);
    g.add(rail);
  }

  // Entrance canopy + doors
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 2.2), M(BRAND.accent));
  canopy.position.set(0, 3.1, 8.1);
  g.add(canopy);
  const doors = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.8, 0.3), glass);
  doors.position.set(0, 1.4, 7.2);
  g.add(doors);

  // Rooftop sign band
  const band = new THREE.Mesh(new THREE.BoxGeometry(8.5, 1.4, 0.3), M(0x1c1b1b));
  band.position.set(0, 12.9, 5.6);
  g.add(band);
  const sign = makeSign('SOYCRAFT MALL', 8, 1.3, '#1c1b1b', '#ffffff');
  sign.position.set(0, 12.9, 5.78);
  g.add(sign);

  // Shopping carts out front
  for (const [x, z, rot] of [[-3, 9.5, 0.4], [-2, 10.4, -0.2], [3.2, 9.8, -0.5]]) {
    const cart = buildShoppingCart();
    cart.position.set(x, 0, z);
    cart.rotation.y = rot;
    g.add(cart);
  }

  // Warm entrance light for night
  const light = new THREE.PointLight(0xfff2da, 0, 20, 2);
  light.position.set(0, 3, 9);
  reg.light(light, 30);
  g.add(light);

  return g;
}

// A little wireframe-style shopping cart.
function buildShoppingCart() {
  const g = new THREE.Group();
  const metal = M(0xc7c3bb, { rough: 0.4, metal: 0.5 });
  const dark = M(0x2a2a2a);

  // basket: open box made of slim bars (front lower than back = trapezoid look)
  const basket = new THREE.Group();
  const w = 0.62, h = 0.42, d = 0.78;
  const bar = (sx, sy, sz, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), metal);
    m.position.set(x, y, z);
    basket.add(m);
  };
  bar(w, 0.04, d, 0, 0, 0); // floor
  bar(w, h, 0.04, 0, h / 2, -d / 2); // back
  bar(w, h * 0.7, 0.04, 0, h * 0.35, d / 2); // front (lower)
  bar(0.04, h, d, -w / 2, h / 2, 0); // left
  bar(0.04, h, d, w / 2, h / 2, 0); // right
  // a couple of grid wires
  for (const yy of [0.15, 0.3]) bar(w, 0.025, 0.025, 0, yy, 0.1);
  basket.position.set(0, 0.55, 0);
  basket.rotation.x = -0.12;
  g.add(basket);

  // handle
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 14, Math.PI), dark);
  handle.position.set(0, 0.82, -0.5);
  handle.rotation.x = Math.PI / 2;
  g.add(handle);
  // legs + wheels
  for (const [x, z] of [[-0.26, -0.34], [0.26, -0.34], [-0.26, 0.34], [0.26, 0.34]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), metal);
    leg.position.set(x, 0.28, z);
    g.add(leg);
    const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), dark);
    wheel.position.set(x, 0.07, z);
    g.add(wheel);
  }

  g.traverse((c) => {
    if (c.isMesh) c.castShadow = true;
  });
  return g;
}

// ── CAR (sedan) ────────────────────────────────────────────────────────────
function buildCar(bodyColor = 0xb56576, isTaxi = false, reg = null) {
  const g = new THREE.Group();
  const paint = M(bodyColor, { rough: 0.35, metal: 0.2 });
  const glass = M(0x2b2f33, { rough: 0.2 });
  const tyre = M(0x1a1a1a);
  const hub = M(0xcfcfcf, { metal: 0.6, rough: 0.3 });

  const lower = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 5), paint);
  lower.position.y = 0.85;
  g.add(lower);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 2.8), paint);
  cabin.position.set(0, 1.7, -0.2);
  g.add(cabin);
  // windows
  const wind = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.7, 2.4), glass);
  wind.position.set(0, 1.75, -0.2);
  g.add(wind);
  // wheels
  for (const [x, z] of [[-1.2, 1.6], [1.2, 1.6], [-1.2, -1.6], [1.2, -1.6]]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16), tyre);
    t.rotation.z = Math.PI / 2;
    t.position.set(x, 0.55, z);
    g.add(t);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.42, 10), hub);
    h.rotation.z = Math.PI / 2;
    h.position.set(x, 0.55, z);
    g.add(h);
  }
  // headlights (front = +Z) — glow + cast light at night
  const headMat = M(0xfff3c4, { rough: 0.3 });
  if (reg) reg.emissive(headMat, 0xfff0c0, 2.2);
  for (const sx of [-0.8, 0.8]) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), headMat);
    hl.position.set(sx, 0.9, 2.5);
    g.add(hl);
  }
  const tailMat = M(0x661414, { rough: 0.4 });
  if (reg) reg.emissive(tailMat, 0xff3b30, 1.6);
  for (const sx of [-0.85, 0.85]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.1), tailMat);
    tl.position.set(sx, 0.95, -2.5);
    g.add(tl);
  }
  if (reg) {
    const beam = new THREE.PointLight(0xfff2cc, 0, 18, 2);
    beam.position.set(0, 1.0, 4.5); // out in front of the car
    reg.light(beam, 26);
    g.add(beam);
  }
  if (isTaxi) {
    const topsign = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 0.5), M(0x1c1b1b));
    topsign.position.set(0, 2.45, -0.2);
    g.add(topsign);
    const txt = makeSign('TAXI', 0.95, 0.4, '#1c1b1b', '#f7c948');
    txt.position.set(0, 2.45, 0.06);
    g.add(txt);
    // checker stripe
    const stripe = makeCheckerStripe();
    stripe.position.set(0, 1.1, 2.51);
    g.add(stripe);
  }
  return g;
}

function buildTaxi(reg) {
  return buildCar(0xf7c948, true, reg);
}

// ── BIG-DOG CORNER (bicycle + featured strollers + a big dog statue) ──────────
function buildBigDogCorner() {
  const g = new THREE.Group();
  g.add(buildBicycle());

  // a friendly big-dog statue beside the bike
  const breed = BREEDS.find((b) => b.id === 'bernese') || BREEDS[0];
  const dog = buildDog(breed);
  dog.position.set(2.4, 0, 1.2);
  dog.rotation.y = -0.6;
  g.add(dog);

  // a low sign post
  const sign = makeSign('BIG DOG CORNER', 3.4, 0.8, '#f94c43', '#ffffff');
  sign.position.set(0, 2.6, -1.5);
  g.add(sign);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8), M(0x8a8782, { metal: 0.4 }));
  post.position.set(0, 1.3, -1.6);
  g.add(post);
  return g;
}

function buildBicycle() {
  // Side-profile bike in the X–Y plane (z = 0): rear wheel at -X, front at +X.
  const g = new THREE.Group();
  const frameMat = M(BRAND.accent, { metal: 0.3, rough: 0.4 });
  const dark = M(0x222222);
  const metal = M(0xcfcfcf, { metal: 0.6, rough: 0.3 });

  const RW = 0.62; // wheel radius
  const REAR = -0.85, FRONT = 0.85; // hub x
  const HUBY = RW;

  const wheel = (cx) => {
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(RW, 0.07, 10, 26), dark);
    tyre.position.set(cx, HUBY, 0);
    g.add(tyre);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(RW * 0.78, 0.03, 8, 24), metal);
    rim.position.set(cx, HUBY, 0);
    g.add(rim);
    // spokes (full diameters)
    for (let i = 0; i < 6; i++) {
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, RW * 1.9, 4), metal);
      spoke.position.set(cx, HUBY, 0);
      spoke.rotation.z = (i / 6) * Math.PI;
      g.add(spoke);
    }
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), dark);
    hub.position.set(cx, HUBY, 0);
    g.add(hub);
  };
  wheel(REAR);
  wheel(FRONT);

  // frame: connect points with tubes (all in z=0 plane)
  const BB = [0, 0.5]; // bottom bracket (crank)
  const SEAT = [-0.32, 1.32];
  const HEAD = [0.7, 1.22];
  const bar = (a, b, r = 0.05) => {
    const va = new THREE.Vector3(a[0], a[1], 0);
    const vb = new THREE.Vector3(b[0], b[1], 0);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, va.distanceTo(vb), 8), frameMat);
    m.position.copy(va).lerp(vb, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    g.add(m);
  };
  bar(BB, SEAT); // seat tube
  bar(BB, HEAD); // down tube
  bar(SEAT, HEAD); // top tube
  bar(BB, [REAR, HUBY]); // chain stay
  bar(SEAT, [REAR, HUBY]); // seat stay
  bar(HEAD, [FRONT, HUBY]); // fork

  // seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.2), dark);
  seat.position.set(SEAT[0] - 0.05, SEAT[1] + 0.06, 0);
  g.add(seat);
  // handlebar (across z)
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), dark);
  stem.position.set(HEAD[0], HEAD[1] + 0.14, 0);
  g.add(stem);
  const bars = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), dark);
  bars.position.set(HEAD[0] + 0.05, HEAD[1] + 0.28, 0);
  bars.rotation.x = Math.PI / 2;
  g.add(bars);
  // crank + pedal
  const crank = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 12), dark);
  crank.position.set(BB[0], BB[1], 0);
  crank.rotation.x = Math.PI / 2;
  g.add(crank);
  for (const s of [-1, 1]) {
    const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.1), dark);
    pedal.position.set(BB[0] + s * 0.18, BB[1] - s * 0.1, 0.12);
    g.add(pedal);
  }
  // rear basket (where a pup might ride)
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.5), M(0xb08a5a));
  basket.position.set(REAR - 0.1, 1.05, 0);
  g.add(basket);

  return g;
}

// ── helpers ──────────────────────────────────────────────────────────────────
function makeSign(text, w, h, bg, fg) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.round((512 * h) / w);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = fg;
  ctx.font = `700 ${Math.round(canvas.height * 0.5)}px Montserrat, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width * 0.92);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: false })
  );
  return mesh;
}

function makeCheckerStripe() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 ? '#1c1b1b' : '#ffffff';
    ctx.fillRect(i * 8, 0, 8, 8);
    ctx.fillStyle = i % 2 ? '#ffffff' : '#1c1b1b';
    ctx.fillRect(i * 8, 8, 8, 8);
  }
  const tex = new THREE.CanvasTexture(canvas);
  return new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.3), new THREE.MeshBasicMaterial({ map: tex }));
}
