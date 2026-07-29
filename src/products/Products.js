import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PRODUCTS } from '../config/products.js';
import { SETTINGS } from '../config/settings.js';
import { buildProductModel } from '../world/ProductModels.js';
import { buildPlinth, buildHeroGlow, buildContactShadow, PLINTH_TOP } from '../world/ProductStage.js';

/**
 * Spawns the product props from config/products.js and handles proximity
 * discovery + the "active product" used by the E-to-shop interaction.
 *
 * Each product becomes:
 *   • a procedural 3D model for its category (or a GLB if product.model is set),
 *     sitting on a little showroom pedestal and slowly turning
 *   • a floating label (name + price)
 *   • a pulsing accent ring on the ground that fades once discovered
 *
 * Callbacks (constructor):
 *   onEnterRange(product, isNewDiscovery)
 *   onLeaveRange()
 *   onDiscover(discoveredCount, total)
 */
export class Products {
  constructor(scene, callbacks = {}) {
    this.scene = scene;
    this.cb = callbacks;
    this.items = [];
    this.activeId = null;
    this.activeProduct = null; // product the player is currently next to (for E key)
    this.discovered = new Set();
    this.total = PRODUCTS.length;
    this._gltf = new GLTFLoader();
    this._t = 0;
  }

  /**
   * @param {THREE.Group} collidables  — Octree root (plinths go here)
   * @param {Set<string>} [featuredIds] — product ids that get an upgraded glow
   */
  build(collidables, featuredIds = new Set()) {
    for (const product of PRODUCTS) {
      const [px, , pz] = product.position;
      const root = new THREE.Group();
      root.position.set(px, 0, pz);

      // Hero plinth — a soft rounded warm podium (§6.1). Added to the collidable
      // group (which is in the scene), so it is both rendered and part of the
      // Octree. Positioned in world space.
      const plinth = buildPlinth(product.accent);
      plinth.position.set(px, 0, pz);
      collidables.add(plinth);

      // Presentation treatments so the product reads as a "pick me up" hero:
      // a soft contact shadow so it sits, and a warm glow so it pops. Both are
      // decorative (scene-only, not collidable) and mobile-cheap.
      // §6.5: Featured products (seasonal drops) get a slightly stronger glow.
      const isFeatured = featuredIds.has(product.id);
      root.add(buildContactShadow());
      root.add(buildHeroGlow(isFeatured));

      // Model (procedural by category, or GLB override)
      const holder = new THREE.Group();
      holder.position.y = PLINTH_TOP; // sit on the plinth top
      root.add(holder);

      if (product.model) {
        this._gltf.load(
          product.model,
          (g) => {
            g.scene.scale.setScalar(product.scale || 1);
            g.scene.traverse((c) => {
              if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;
              }
            });
            holder.add(g.scene);
          },
          undefined,
          (err) => console.warn(`Product GLB failed (${product.id}):`, err)
        );
      } else {
        holder.add(buildProductModel(product.category, product.accent));
      }

      const label = this._makeLabel(product.name, product.price);
      label.position.y = SETTINGS.products.labelHeight;
      root.add(label);

      const ring = this._makeRing(product.accent);
      ring.position.y = 0.12; // above the district ground surfaces
      root.add(ring);

      this.scene.add(root);

      // Per-item phase so the idle bob is desynced across the world.
      const phase = this.items.length * 1.7;
      this.items.push({ product, root, holder, label, ring, discovered: false, baseY: PLINTH_TOP, phase });
    }
  }

  _makeLabel(name, price) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    // pill background
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    this._roundRect(ctx, 8, 20, 496, 120, 28);
    ctx.fill();
    ctx.fillStyle = '#1c1b1b';
    ctx.font = 'bold 40px Montserrat, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 256, 62, 470);
    ctx.fillStyle = '#f94c43';
    ctx.font = '600 34px Montserrat, system-ui, sans-serif';
    ctx.fillText(price, 256, 104);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
    );
    sprite.scale.set(2.8, 0.875, 1);
    sprite.renderOrder = 10;
    return sprite;
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  _makeRing(color) {
    const r = SETTINGS.products.interactRadius;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.18, r, 48),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.45,
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

  update(dt, playerPos) {
    this._t += dt;
    const r2 = SETTINGS.products.interactRadius * SETTINGS.products.interactRadius;

    let nearest = null;
    let nearestD2 = Infinity;

    for (const item of this.items) {
      item.holder.rotation.y += dt * 0.5; // slow turntable
      // Gentle idle bob so the hero feels collectible (desynced per item).
      item.holder.position.y = item.baseY + Math.sin(this._t * 1.6 + item.phase) * 0.05;
      if (!item.discovered) {
        item.ring.material.opacity = 0.3 + Math.sin(this._t * 3) * 0.15;
        item.ring.scale.setScalar(1 + Math.sin(this._t * 3) * 0.03);
      }
      const dx = playerPos.x - item.product.position[0];
      const dz = playerPos.z - item.product.position[2];
      const d2 = dx * dx + dz * dz;
      if (d2 < nearestD2) {
        nearestD2 = d2;
        nearest = item;
      }
    }

    const inRange = nearest && nearestD2 <= r2 ? nearest : null;

    if (inRange && this.activeId !== inRange.product.id) {
      this.activeId = inRange.product.id;
      this.activeProduct = inRange.product;
      const isNew = !inRange.discovered;
      if (isNew) {
        inRange.discovered = true;
        this.discovered.add(inRange.product.id);
        inRange.ring.visible = false;
        this.cb.onDiscover?.(this.discovered.size, this.total);
      }
      this.cb.onEnterRange?.(inRange.product, isNew);
    } else if (!inRange && this.activeId !== null) {
      this.activeId = null;
      this.activeProduct = null;
      this.cb.onLeaveRange?.();
    }
  }

  get allDiscovered() {
    return this.discovered.size >= this.total;
  }
}
