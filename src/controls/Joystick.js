/**
 * Zero-dependency touch controls for mobile.
 *
 * Splits the screen down the middle:
 *   • LEFT half  → virtual movement joystick (analog, appears where you touch)
 *   • RIGHT half → look / camera drag
 *
 * Exposes:
 *   .move          {x, y}  strafe(+right) / forward(+up), each clamped to [-1,1]
 *   .consumeLook() {dx, dy} look delta since last call (then resets)
 *
 * Multi-touch aware: you can steer with the left thumb and look with the right
 * thumb simultaneously.
 */
export class Joystick {
  constructor(zoneEl) {
    this.zone = zoneEl;
    this.move = { x: 0, y: 0 };
    this._look = { dx: 0, dy: 0 };

    this._moveId = null; // touch identifier driving movement
    this._lookId = null; // touch identifier driving look
    this._origin = { x: 0, y: 0 };
    this._lookLast = { x: 0, y: 0 };
    this._maxRadius = 55; // px travel for full deflection

    // Visual stick elements (hidden until a left-side touch begins).
    this.zone.style.display = 'block';
    this._base = document.createElement('div');
    this._base.className = 'joy-base hidden';
    this._thumb = document.createElement('div');
    this._thumb.className = 'joy-thumb';
    this._base.appendChild(this._thumb);
    this.zone.appendChild(this._base);

    // Bind on the document so touches anywhere are captured (the zone is full-screen).
    const opts = { passive: false };
    document.addEventListener('touchstart', (e) => this._onStart(e), opts);
    document.addEventListener('touchmove', (e) => this._onMove(e), opts);
    document.addEventListener('touchend', (e) => this._onEnd(e), opts);
    document.addEventListener('touchcancel', (e) => this._onEnd(e), opts);
  }

  consumeLook() {
    const d = { dx: this._look.dx, dy: this._look.dy };
    this._look.dx = 0;
    this._look.dy = 0;
    return d;
  }

  _isUI(target) {
    // Don't hijack touches on overlays/buttons (cards, email form, etc.).
    return !!(target.closest && target.closest('.overlay, button, a, input, #hud'));
  }

  _onStart(e) {
    for (const t of e.changedTouches) {
      if (this._isUI(t.target)) continue;
      const leftHalf = t.clientX < window.innerWidth / 2;

      if (leftHalf && this._moveId === null) {
        this._moveId = t.identifier;
        this._origin.x = t.clientX;
        this._origin.y = t.clientY;
        this._base.style.left = `${t.clientX}px`;
        this._base.style.top = `${t.clientY}px`;
        this._base.classList.remove('hidden');
        this._thumb.style.transform = 'translate(-50%, -50%)';
        e.preventDefault();
      } else if (!leftHalf && this._lookId === null) {
        this._lookId = t.identifier;
        this._lookLast.x = t.clientX;
        this._lookLast.y = t.clientY;
        e.preventDefault();
      }
    }
  }

  _onMove(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this._moveId) {
        let dx = t.clientX - this._origin.x;
        let dy = t.clientY - this._origin.y;
        const len = Math.hypot(dx, dy);
        const clamped = Math.min(len, this._maxRadius);
        const ang = Math.atan2(dy, dx);
        const tx = Math.cos(ang) * clamped;
        const ty = Math.sin(ang) * clamped;
        this._thumb.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`;
        // Screen-up (negative dy) = forward (positive y).
        this.move.x = tx / this._maxRadius;
        this.move.y = -ty / this._maxRadius;
        e.preventDefault();
      } else if (t.identifier === this._lookId) {
        this._look.dx += t.clientX - this._lookLast.x;
        this._look.dy += t.clientY - this._lookLast.y;
        this._lookLast.x = t.clientX;
        this._lookLast.y = t.clientY;
        e.preventDefault();
      }
    }
  }

  _onEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this._moveId) {
        this._moveId = null;
        this.move.x = 0;
        this.move.y = 0;
        this._base.classList.add('hidden');
      } else if (t.identifier === this._lookId) {
        this._lookId = null;
      }
    }
  }
}
