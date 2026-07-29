import * as THREE from 'three';
import { LINKS } from '../config/links.js';
import { BRAND } from '../config/settings.js';

/**
 * Interactive external-link points (shop, Fur Away Journey travel partner,
 * Instagram). These are separate from products — they do NOT count toward the
 * discovery counter. Walk up → card appears → press E (or tap Open) to visit.
 */
export class Links {
  constructor(scene, callbacks = {}) {
    this.scene = scene;
    this.cb = callbacks;
    this.items = [];
    this.activeId = null;
    this.activeLink = null;
    this._t = 0;
  }

  build(collidables) {
    for (const link of LINKS) {
      const [x, , z] = link.position;

      // Solid prop → collidable group at world position, facing the centre.
      let prop = null;
      if (link.kind === 'counter') prop = buildAgentCounter();
      else if (link.kind === 'instagram') prop = buildInstagramStandee();
      // 'logo' uses the existing central wordmark — no prop.
      if (prop) {
        prop.position.set(x, 0, z);
        prop.rotation.y = Math.atan2(-x, -z); // front (+Z) faces the centre
        collidables.add(prop);
      }

      // Decorative label + ring (scene, not collidable)
      const root = new THREE.Group();
      root.position.set(x, 0, z);
      const label = makeLabel(link.title, link.icon);
      label.position.y = link.labelHeight;
      root.add(label);
      const ring = makeRing(link.radius);
      ring.position.y = 0.12;
      root.add(ring);
      this.scene.add(root);

      this.items.push({ link, root, ring });
    }
  }

  update(dt, playerPos) {
    this._t += dt;
    let nearest = null;
    let nd2 = Infinity;
    for (const item of this.items) {
      const r = item.link.radius;
      const dx = playerPos.x - item.link.position[0];
      const dz = playerPos.z - item.link.position[2];
      const d2 = dx * dx + dz * dz;
      // gentle pulse on the ring
      item.ring.material.opacity = 0.32 + Math.sin(this._t * 3 + item.link.position[0]) * 0.16;
      if (d2 < nd2 && d2 <= r * r) {
        nd2 = d2;
        nearest = item;
      }
    }
    const inRange = nearest;
    if (inRange && this.activeId !== inRange.link.id) {
      this.activeId = inRange.link.id;
      this.activeLink = inRange.link;
      this.cb.onEnter?.(inRange.link);
    } else if (!inRange && this.activeId !== null) {
      this.activeId = null;
      this.activeLink = null;
      this.cb.onLeave?.();
    }
  }
}

// ── label / ring ─────────────────────────────────────────────────────────────
function makeLabel(text, icon = '') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 150;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(28,27,27,0.86)';
  roundRect(ctx, 8, 26, 496, 100, 26);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px Montserrat, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${icon} ${text}`.trim(), 256, 78, 470);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(3.0, 0.88, 1);
  sprite.renderOrder = 11;
  return sprite;
}

function makeRing(r) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(r - 0.18, r, 48),
    new THREE.MeshBasicMaterial({
      color: 0x3a6ea5,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -6,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 2;
  return ring;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const M = (hex, o = {}) =>
  new THREE.MeshStandardMaterial({ color: hex, roughness: o.rough ?? 0.8, metalness: o.metal ?? 0 });

// ── Travel-agent check-in counter (Fur Away Journey) ─────────────────────────
function buildAgentCounter() {
  const g = new THREE.Group();
  const deskMat = M(0xe8e2d6);
  const topMat = M(0xb98f6a, { rough: 0.5 });
  const dark = M(0x2c2a28);

  // desk
  const desk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 0.9), deskMat);
  desk.position.set(0, 0.5, 0.6);
  g.add(desk);
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 1.1), topMat);
  top.position.set(0, 1.05, 0.6);
  g.add(top);
  // a little monitor on the desk
  const mon = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.05), dark);
  mon.position.set(0.7, 1.35, 0.5);
  mon.rotation.x = -0.15;
  g.add(mon);

  // back sign board: "Fur Away Journey" + ✈ on a stand
  const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), M(0x8a8782, { metal: 0.4 }));
  post1.position.set(-1.3, 1.3, -0.5);
  g.add(post1);
  const post2 = post1.clone();
  post2.position.x = 1.3;
  g.add(post2);
  const board = makeSignPlane('Fur Away Journey', 3.0, 0.8, '#1c1b1b', '#ffffff');
  board.position.set(0, 2.45, -0.5);
  g.add(board);
  const plane = makeSignPlane('✈ pet travel', 3.0, 0.5, '#f94c43', '#ffffff');
  plane.position.set(0, 1.95, -0.5);
  g.add(plane);

  // the agent figure behind the desk
  const agent = buildPerson(0x3d5a80, 0xe0b48a); // navy uniform, skin tone
  agent.position.set(0, 0, -0.2);
  agent.rotation.y = Math.PI; // face the customer (+Z toward player side)
  g.add(agent);

  g.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return g;
}

// Simple low-poly person.
function buildPerson(clothes, skin) {
  const g = new THREE.Group();
  const cloth = M(clothes, { rough: 0.8 });
  const skinM = M(skin, { rough: 0.7 });
  const dark = M(0x2c2622);

  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.5, 4, 8), M(0x33363b));
    leg.position.set(sx * 0.15, 0.4, 0);
    g.add(leg);
  }
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.45, 6, 12), cloth);
  torso.position.set(0, 1.05, 0);
  g.add(torso);
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.45, 4, 8), cloth);
    arm.position.set(sx * 0.36, 1.05, 0.05);
    arm.rotation.z = sx * 0.18;
    g.add(arm);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), skinM);
  head.position.set(0, 1.6, 0);
  g.add(head);
  // cap
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0x2c2a28));
  cap.position.set(0, 1.66, 0);
  g.add(cap);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.18), dark);
  brim.position.set(0, 1.62, 0.22);
  g.add(brim);
  // eyes
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), dark);
    eye.position.set(sx * 0.09, 1.62, 0.22);
    g.add(eye);
  }
  return g;
}

// ── Instagram "follow us" standee ────────────────────────────────────────────
function buildInstagramStandee() {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.0, 10), M(0x8a8782, { metal: 0.4 }));
  post.position.y = 1.0;
  g.add(post);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.12, 16), M(0x2c2a28));
  base.position.y = 0.06;
  g.add(base);

  // panel with the IG icon + handle
  const tex = new THREE.CanvasTexture(makeIGCanvas());
  tex.colorSpace = THREE.SRGBColorSpace;
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 2.0),
    new THREE.MeshBasicMaterial({ map: tex }) // opaque sign (canvas has white bg)
  );
  panel.position.set(0, 2.4, 0.06);
  g.add(panel);
  const panelBack = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.0), M(0xffffff));
  panelBack.position.set(0, 2.4, 0.05);
  panelBack.rotation.y = Math.PI;
  g.add(panelBack);

  g.traverse((c) => {
    if (c.isMesh) c.castShadow = true;
  });
  return g;
}

function makeIGCanvas() {
  const c = document.createElement('canvas');
  c.width = 340;
  c.height = 400;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  // gradient rounded square
  const x = 70, y = 40, s = 200, r = 48;
  const grad = ctx.createLinearGradient(x, y, x + s, y + s);
  grad.addColorStop(0, '#feda75');
  grad.addColorStop(0.4, '#fa7e1e');
  grad.addColorStop(0.7, '#d62976');
  grad.addColorStop(1, '#4f5bd5');
  roundRect(ctx, x, y, s, s, r);
  ctx.fillStyle = grad;
  ctx.fill();
  // camera outline
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 14;
  roundRect(ctx, x + 38, y + 38, s - 76, s - 76, 40);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + s / 2, y + s / 2, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + s - 52, y + 52, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  // handle
  ctx.fillStyle = '#1c1b1b';
  ctx.font = 'bold 40px Montserrat, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('@soycraft.co', c.width / 2, 300);
  ctx.font = '600 26px Montserrat, system-ui, sans-serif';
  ctx.fillStyle = '#6a6a6a';
  ctx.fillText('Follow us', c.width / 2, 340);
  return c;
}

function makeSignPlane(text, w, h, bg, fg) {
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
  ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width * 0.9);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
}
