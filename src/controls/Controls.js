import { IS_TOUCH } from '../config/settings.js';
import { Joystick } from './Joystick.js';

/**
 * Unified input layer. Produces a single `input` object consumed by Player:
 *
 *   input.move            {x, y}      normalized movement intent
 *   input.run             boolean     shift held / run toggle
 *   input.consumeJump()   -> boolean  edge-triggered jump
 *   input.consumeLook()   -> {dx, dy} mouse / touch look delta
 *   input.consumeZoom()   -> number   wheel delta (third-person distance)
 *   input.consumeViewToggle() -> boolean  V key / on-screen button
 *
 * Desktop: WASD + arrows, pointer-lock mouse look, wheel zoom, V to toggle view.
 * Mobile : on-screen joystick (move) + right-side drag (look), buttons for
 *          jump / view toggle (wired in UI, routed here via pressJump/pressViewToggle).
 */
export class Controls {
  constructor(domElement) {
    this.dom = domElement;
    this.keys = {};
    this._jump = false;
    this._viewToggle = false;
    this._interact = false;
    this._look = { dx: 0, dy: 0 };
    this._zoom = 0;

    this.joystick = IS_TOUCH ? new Joystick(document.getElementById('joystick-zone')) : null;

    this.input = {
      move: { x: 0, y: 0 },
      run: false,
      consumeJump: () => {
        const v = this._jump;
        this._jump = false;
        return v;
      },
      consumeViewToggle: () => {
        const v = this._viewToggle;
        this._viewToggle = false;
        return v;
      },
      consumeInteract: () => {
        const v = this._interact;
        this._interact = false;
        return v;
      },
      consumeLook: () => {
        // Merge mouse-look and joystick-look.
        let dx = this._look.dx;
        let dy = this._look.dy;
        this._look.dx = 0;
        this._look.dy = 0;
        if (this.joystick) {
          const jl = this.joystick.consumeLook();
          dx += jl.dx;
          dy += jl.dy;
        }
        return { dx, dy };
      },
      consumeZoom: () => {
        const v = this._zoom;
        this._zoom = 0;
        return v;
      },
    };

    this._bindKeyboard();
    if (!IS_TOUCH) this._bindMouse();
  }

  // Called every frame before Player.update — resolves the move vector.
  update() {
    if (this.joystick && (this.joystick.move.x || this.joystick.move.y)) {
      this.input.move.x = this.joystick.move.x;
      this.input.move.y = this.joystick.move.y;
      this.input.run = Math.hypot(this.joystick.move.x, this.joystick.move.y) > 0.85;
    } else {
      let x = 0;
      let y = 0;
      if (this.keys['KeyW'] || this.keys['ArrowUp']) y += 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) y -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
      // normalize diagonals
      const len = Math.hypot(x, y);
      if (len > 1) {
        x /= len;
        y /= len;
      }
      this.input.move.x = x;
      this.input.move.y = y;
      this.input.run = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    }
  }

  // Hooks the UI mobile buttons call.
  pressJump() {
    this._jump = true;
  }
  pressViewToggle() {
    this._viewToggle = true;
  }
  pressInteract() {
    this._interact = true;
  }

  _bindKeyboard() {
    // Ignore game keys while typing in a form field (e.g. the email capture).
    const typing = (e) => {
      const t = e.target;
      return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    };
    window.addEventListener('keydown', (e) => {
      if (typing(e)) return;
      this.keys[e.code] = true;
      if (e.code === 'Space' && !e.repeat) this._jump = true;
      if (e.code === 'KeyV' && !e.repeat) this._viewToggle = true;
      if (e.code === 'KeyE' && !e.repeat) this._interact = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    // If the window loses focus (e.g. opening a Shop link in a new tab) the
    // keyup may never arrive — clear all keys so the player doesn't keep walking.
    const clearKeys = () => {
      this.keys = {};
      this.input.move.x = 0;
      this.input.move.y = 0;
    };
    window.addEventListener('blur', clearKeys);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearKeys();
    });
    // Don't let space scroll the page.
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target === document.body) e.preventDefault();
    });
  }

  _bindMouse() {
    this.dom.addEventListener('mousedown', () => {
      if (document.pointerLockElement !== document.body) document.body.requestPointerLock();
    });
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === document.body) {
        this._look.dx += e.movementX;
        this._look.dy += e.movementY;
      }
    });
    window.addEventListener(
      'wheel',
      (e) => {
        this._zoom += e.deltaY;
      },
      { passive: true }
    );
  }
}
