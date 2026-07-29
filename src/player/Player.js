import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SETTINGS } from '../config/settings.js';
import { GRAVITY } from '../physics/Physics.js';
import { buildDog } from './DogFactory.js';
import { BREEDS, DEFAULT_BREED } from '../config/breeds.js';
import { identity } from './DogIdentity.js';

/**
 * The player: a Capsule collider (so it can't pass through world geometry),
 * a third/first-person camera rig, and a visible character.
 *
 * Collision + camera-rig logic is adapted from the 3D-Game-Template-Ultimate
 * reference (player.js). The character is a procedural "dog" built from
 * primitives by default, structured so a rigged GLB swaps in cleanly.
 *
 * Input is fed in each frame via an `input` object (produced by Controls):
 *   input.move      THREE.Vector2-ish {x, y}  x=strafe(+right) y=forward(+fwd), each [-1,1]
 *   input.run       boolean
 *   input.consumeJump()   -> boolean (true once per jump press)
 *   input.consumeLook()   -> {dx, dy} look delta since last frame
 *   input.consumeZoom()   -> number (wheel delta since last frame)
 *   input.consumeViewToggle() -> boolean (true once per V press / button tap)
 */
export class Player {
  constructor(scene, camera) {
    this.scene  = scene;
    this.camera = camera;

    const p  = SETTINGS.player;
    const r  = p.capsuleRadius;
    const [sx, , sz] = p.startPosition;

    this.collider = new Capsule(
      new THREE.Vector3(sx, r, sz),
      new THREE.Vector3(sx, r + p.capsuleHeight, sz),
      r
    );
    this.velocity = new THREE.Vector3();
    this.onFloor  = false;

    // Camera state (we own yaw/pitch; Controls feeds deltas).
    this.yaw           = 0;
    this.pitch         = 0.15;
    this.viewMode      = 'third'; // 'third' | 'first'
    this.thirdDistance = 6;

    // Character model
    this.group        = new THREE.Group();
    this.scene.add(this.group);
    this.mixer        = null;
    this.actions      = {};
    this.currentAction = null;
    this.modelReady   = false;
    this.breedId      = identity.breedId; // keep in sync with identity
    this.dog          = null; // current procedural dog group (null if a GLB is used)
    this._gait        = 0;   // animation phase accumulator
    this._barkT       = 0;   // bark animation countdown
    this._nameSprite  = null; // canvas nameplate sprite

    // scratch
    this._fwd            = new THREE.Vector3();
    this._side           = new THREE.Vector3();
    this._tmp            = new THREE.Vector3();
    this._camTarget      = new THREE.Vector3();
    this._camOffset      = new THREE.Vector3();
    this._desiredForward = new THREE.Vector3();
    this._q              = new THREE.Quaternion();

    this._loadCharacter();
  }

  // ── Character ─────────────────────────────────────────────────────────────

  _loadCharacter() {
    if (SETTINGS.assets.dogModel) {
      this._loadDogGLB(SETTINGS.assets.dogModel);
    } else {
      this.setBreed(this.breedId);
    }
  }

  /**
   * Swap the visible dog to another breed (procedural). Also rebuilds with the
   * current identity coat + accessory so live-preview works on the start screen.
   */
  setBreed(id) {
    const breed = BREEDS.find((b) => b.id === id) || BREEDS[0];
    // Keep identity in sync without firing commit() here (caller handles that).
    identity.breedId = breed.id;
    this.breedId     = breed.id;

    // Tear down the previous procedural dog (free its geometry/materials).
    if (this.dog) {
      this.group.remove(this.dog);
      this.dog.traverse((c) => {
        if (c.isMesh) {
          c.geometry?.dispose?.();
          if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
          else c.material?.dispose?.();
        }
      });
    }

    this.dog = buildDog(breed, identity.coat, identity.accessory);
    this.group.add(this.dog);
    this.modelReady = true;
    this.group.visible = this.viewMode === 'third';

    // Refresh the nameplate in case the name/breed changed.
    this._updateNameplate();
  }

  /**
   * Apply a new coat colour to the current dog, rebuilding the model.
   * @param {string} coatId — coat colour id from DogIdentity.COAT_COLOURS
   */
  setCoat(coatId) {
    identity.coat = coatId;
    this.setBreed(this.breedId); // rebuild with new coat
  }

  /**
   * Apply a new accessory to the current dog, rebuilding the model.
   * @param {string} accId — accessory id from DogIdentity.ACCESSORIES
   */
  setAccessory(accId) {
    identity.accessory = accId;
    this.setBreed(this.breedId); // rebuild with new accessory
  }

  /**
   * Update the dog's name and refresh the nameplate sprite.
   * @param {string} name — up to 16 chars; '' falls back to breed name
   */
  setDogName(name) {
    identity.name = typeof name === 'string' ? name.slice(0, 16) : '';
    this._updateNameplate();
  }

  /** List of selectable breeds, for the UI picker. */
  get breeds() {
    return BREEDS.map((b) => ({ id: b.id, name: b.name, size: b.size || 'small' }));
  }

  /** The full config for the current breed (used for bark pitch). */
  get currentBreed() {
    return BREEDS.find((b) => b.id === this.breedId) || BREEDS[0];
  }

  /** Trigger the bark animation (sound is played by main). */
  bark() {
    this._barkT = 0.5;
  }

  // ── Nameplate ─────────────────────────────────────────────────────────────

  /**
   * Create (or replace) the canvas sprite nameplate above the dog.
   * Visible only in third-person (group.visible handles this automatically).
   */
  _updateNameplate() {
    // Remove the old sprite cleanly.
    if (this._nameSprite) {
      this.group.remove(this._nameSprite);
      this._nameSprite.material.map?.dispose();
      this._nameSprite.material.dispose();
      this._nameSprite = null;
    }

    const text = identity.displayName;
    const y    = this.dog?.userData?.nameplateY ?? 2.2;
    this._nameSprite = _createNameSprite(text);
    this._nameSprite.position.set(0, y, 0);
    this.group.add(this._nameSprite);
  }

  // ── GLB drop-in path ──────────────────────────────────────────────────────

  _loadDogGLB(path) {
    new GLTFLoader().load(
      path,
      (gltf) => {
        const model = gltf.scene;
        model.traverse((c) => {
          if (c.isMesh) {
            c.castShadow    = true;
            c.receiveShadow = true;
          }
        });
        model.scale.setScalar(SETTINGS.assets.dogScale);
        model.rotation.y = Math.PI; // face +Z
        this.group.add(model);

        if (gltf.animations?.length) {
          this.mixer = new THREE.AnimationMixer(model);
          for (const name of ['Idle', 'Walk', 'Run']) {
            const clip = THREE.AnimationClip.findByName(gltf.animations, name);
            if (clip) {
              const action = this.mixer.clipAction(clip);
              action.enabled = true;
              action.setEffectiveWeight(0);
              this.actions[name] = action;
            }
          }
          this._setAction('Idle');
        }
        this.modelReady    = true;
        this.group.visible = this.viewMode === 'third';
        this._updateNameplate();
      },
      undefined,
      (err) => {
        console.warn('Dog GLB failed to load, using procedural dog:', err);
        this.setBreed(this.breedId);
      }
    );
  }

  _setAction(name) {
    const next = this.actions[name];
    if (!next || this.currentAction === name) return;
    const prev = this.actions[this.currentAction];
    this.currentAction = name;
    next.reset();
    next.setEffectiveWeight(1);
    next.play();
    if (prev) prev.crossFadeTo(next, 0.3, true);
    else next.fadeIn(0.3);
  }

  // ── Per-frame update ───────────────────────────────────────────────────────

  update(dt, octree, input) {
    // view toggle (V / button)
    if (input.consumeViewToggle()) this._toggleView();

    // look
    const look = input.consumeLook();
    this.yaw   -= look.dx / 500;
    this.pitch -= look.dy / 500;
    this._clampPitch();

    // zoom (third-person only)
    const zoom = input.consumeZoom();
    if (zoom && this.viewMode === 'third') {
      this.thirdDistance = THREE.MathUtils.clamp(this.thirdDistance + zoom * 0.0025, 2.5, 12);
    }

    // Velocity damping. Decay much faster when there's no movement input so the
    // player stops promptly instead of gliding ("auto-walking") after release.
    const moving = Math.abs(input.move.x) > 0.01 || Math.abs(input.move.y) > 0.01;
    let damping  = Math.exp(-(moving ? 5 : 16) * dt) - 1;
    if (!this.onFloor) {
      this.velocity.y -= GRAVITY * dt;
      damping *= 0.1;
    }
    this.velocity.addScaledVector(this.velocity, damping);

    // movement intent -> acceleration
    this._applyMovement(dt, input);

    // Hard stop: once idle and slow on the ground, kill residual horizontal drift.
    if (!moving && this.onFloor && this.velocity.x ** 2 + this.velocity.z ** 2 < 0.05) {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // integrate + collide
    this.collider.translate(this._tmp.copy(this.velocity).multiplyScalar(dt));
    this._collide(octree);

    // visuals
    this._alignCharacter();
    this._updateCamera(dt);
    this._updateAnimation(dt, input);
    this._teleportIfOob();
  }

  _applyMovement(dt, input) {
    const p      = SETTINGS.player;
    const moving = Math.abs(input.move.x) > 0.01 || Math.abs(input.move.y) > 0.01;
    const running = input.run && moving;
    const speed  = (this.onFloor ? 1 : 0.4) * (running ? p.runSpeed : p.walkSpeed);
    const accel  = dt * speed;

    // forward/side derived from yaw (flat plane)
    this._fwd.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(-1);
    // Right vector = forward × up = (-fwd.z, 0, fwd.x). (The flipped sign here
    // was inverting A/D and the joystick's left/right.)
    this._side.set(-this._fwd.z, 0, this._fwd.x);

    if (moving) {
      this.velocity.addScaledVector(this._fwd,  input.move.y * accel);
      this.velocity.addScaledVector(this._side, input.move.x * accel);
    }

    if (this.onFloor && input.consumeJump()) {
      this.velocity.y = p.jumpSpeed;
    }
  }

  _collide(octree) {
    const result  = octree.capsuleIntersect(this.collider);
    this.onFloor  = false;
    if (result) {
      this.onFloor = result.normal.y > 0;
      if (!this.onFloor) {
        this.velocity.addScaledVector(result.normal, -result.normal.dot(this.velocity));
      }
      if (result.depth >= 1e-10) {
        this.collider.translate(result.normal.multiplyScalar(result.depth));
      }
    }
  }

  _alignCharacter() {
    if (!this.modelReady) return;
    const base = this._tmp.copy(this.collider.start);
    base.y -= this.collider.radius;
    this.group.position.lerp(base, 0.3);

    // face movement direction
    const hv = this._desiredForward.set(this.velocity.x, 0, this.velocity.z);
    if (hv.lengthSq() > 0.05) {
      hv.normalize();
      this._q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), hv);
      this.group.quaternion.slerp(this._q, 0.2);
    }
  }

  _updateCamera(dt) {
    if (this.viewMode === 'third') {
      // Orbit behind the dog and look at it.
      this._camTarget.copy(this.collider.end);
      this._camTarget.y += 0.2;
      this._camOffset.set(0, 2.4, this.thirdDistance);
      this._camOffset.applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
      const desired = this._tmp.copy(this._camTarget).add(this._camOffset);
      this.camera.position.lerp(desired, THREE.MathUtils.clamp(dt * 10, 0, 1));
      this.camera.lookAt(this._camTarget);
      if (this.modelReady) this.group.visible = true;
    } else {
      // First-person: sit at the dog's eye level and look ALONG yaw/pitch
      // (not at the head — that made the view stare at the ground).
      this._camTarget.copy(this.collider.end);
      this._camTarget.y += 0.05;
      this.camera.position.lerp(this._camTarget, THREE.MathUtils.clamp(dt * 18, 0, 1));
      const cp    = Math.cos(this.pitch);
      const lookX = this.camera.position.x - Math.sin(this.yaw) * cp;
      const lookY = this.camera.position.y + Math.sin(this.pitch);
      const lookZ = this.camera.position.z - Math.cos(this.yaw) * cp;
      this.camera.lookAt(lookX, lookY, lookZ);
      if (this.modelReady) this.group.visible = false;
    }
  }

  _updateAnimation(dt, input) {
    // GLB path: drive the animation mixer (Idle/Walk/Run).
    if (this.mixer) {
      this.mixer.update(dt);
      const moving = Math.abs(input.move.x) > 0.01 || Math.abs(input.move.y) > 0.01;
      if (this.onFloor) this._setAction(!moving ? 'Idle' : input.run ? 'Run' : 'Walk');
      return;
    }
    // Procedural dog: swing legs with speed, wag the tail.
    this._animateDog(dt);
  }

  _animateDog(dt) {
    const parts = this.dog?.userData.parts;
    if (!parts) return;

    const speed  = Math.hypot(this.velocity.x, this.velocity.z);
    const moving = speed > 0.3;
    this._gait  += dt * (moving ? 6 + speed * 0.5 : 4);

    // Legs trot in diagonal pairs (FL+BR vs FR+BL).
    const swing = moving ? Math.min(speed * 0.06, 0.7) : 0;
    parts.legs.forEach((leg, i) => {
      const phase = i === 0 || i === 3 ? this._gait : this._gait + Math.PI;
      leg.rotation.x = Math.sin(phase) * swing;
    });

    // Tail wags faster when moving / happy.
    let wagAmp   = moving ? 0.5 : 0.28;
    let wagSpeed = moving ? 1.6 : 0.9;

    // Bark: head jerks up, tail wags hard, body bounces — for ~0.5s.
    if (this._barkT > 0) {
      this._barkT -= dt;
      const ph = (0.5 - this._barkT) * 34;
      if (parts.head) parts.head.rotation.x = -Math.abs(Math.sin(ph)) * 0.4; // snout up
      wagAmp   = 0.9;
      wagSpeed = 5;
      if (this.dog) this.dog.position.y = Math.abs(Math.sin(ph)) * 0.08;
    } else {
      if (parts.head) parts.head.rotation.x *= 0.7; // settle back
      if (this.dog) this.dog.position.y = moving ? Math.abs(Math.sin(this._gait)) * 0.04 : 0;
    }

    parts.tail.rotation.y = Math.sin(this._gait * wagSpeed) * wagAmp;
  }

  _toggleView() {
    this.viewMode = this.viewMode === 'third' ? 'first' : 'third';
    this.pitch    = this.viewMode === 'third' ? 0.15 : 0;
    this._clampPitch();
    if (this.modelReady) this.group.visible = this.viewMode === 'third';
  }

  _clampPitch() {
    const max = this.viewMode === 'third' ? Math.PI / 4 : Math.PI / 2 - 0.1;
    const min = this.viewMode === 'third' ? -Math.PI / 3 : -Math.PI / 2 + 0.1;
    this.pitch = THREE.MathUtils.clamp(this.pitch, min, max);
  }

  _teleportIfOob() {
    if (this.collider.end.y > -25) return;
    const r = SETTINGS.player.capsuleRadius;
    this.collider.start.set(0, r, 0);
    this.collider.end.set(0, r + SETTINGS.player.capsuleHeight, 0);
    this.velocity.set(0, 0, 0);
  }

  /** Player world position (feet), reused by Products proximity checks. */
  get position() {
    return this.collider.start;
  }
}

// ── Nameplate sprite ──────────────────────────────────────────────────────────

/** Draws a rounded-pill canvas label and returns a THREE.Sprite. */
function _createNameSprite(text) {
  const W = 256;
  const H = 58;
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Pill background — cream with gentle opacity
  ctx.fillStyle = 'rgba(244, 241, 234, 0.92)';
  _roundRect(ctx, 8, 6, W - 16, H - 12, 13);
  ctx.fill();

  // Subtle border
  ctx.strokeStyle = 'rgba(28, 27, 27, 0.14)';
  ctx.lineWidth   = 1.5;
  _roundRect(ctx, 8, 6, W - 16, H - 12, 13);
  ctx.stroke();

  // Text — Montserrat bold at ~22px
  ctx.fillStyle    = '#1c1b1b';
  ctx.font         = 'bold 22px "Montserrat", system-ui, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  // Truncate to fit
  let label = text;
  while (label.length > 1 && ctx.measureText(label).width > W - 36) {
    label = label.slice(0, -1);
  }
  ctx.fillText(label, W / 2, H / 2);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.1, 0.48, 1); // world-space size
  return sprite;
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
