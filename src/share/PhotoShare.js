import { BRAND } from '../config/settings.js';
import { ACTIVE_THEME } from '../config/themes.js';
import { identity } from '../player/DogIdentity.js';

/**
 * src/share/PhotoShare.js
 * ============================================================================
 *  §6.2 "Photo / Share moment" (P1).
 *
 *  One-tap: grab a clean, branded still of the player's dog (ideally next to a
 *  discovered product), preview it, then share via the native share sheet on
 *  mobile or download it on desktop. Every shared image carries the Soycraft
 *  logo (public/brand/logo.png) composited tastefully into a premium
 *  cream/ink/coral frame.
 *
 *  Compositing is done on demand at capture time only — there is zero
 *  per-frame cost when not capturing. The logo is loaded lazily on the first
 *  capture (or preloaded during boot idle via preload()).
 *
 *  Wiring (main.js):
 *    const photo = new PhotoShare({ renderer, scene, camera, player,
 *                                   products, analytics, renderFrame });
 *    ui.setupPhoto(() => photo.capture());   // camera button
 *    // + P key in main.js keydown handler
 *
 *  Events:
 *    photo_captured { product: activeProduct?.id ?? null }  — on capture
 *    photo_shared   { method: 'webshare' | 'download' | 'copylink' }
 * ============================================================================
 */

const OUT_W = 1080; // 4:5 portrait — Instagram / WhatsApp friendly
const OUT_H = 1350;
const GAME_URL = 'game.soycraft.co';
const FONT = '"Montserrat", system-ui, -apple-system, sans-serif';

export class PhotoShare {
  /**
   * @param {object} deps
   * @param {THREE.WebGLRenderer} deps.renderer
   * @param {THREE.Scene}  deps.scene
   * @param {THREE.Camera} deps.camera
   * @param {import('../player/Player.js').Player} deps.player
   * @param {import('../products/Products.js').Products} deps.products
   * @param {import('../core/Analytics.js').analytics} deps.analytics
   * @param {() => void} deps.renderFrame — renders one fresh frame to
   *        renderer.domElement (dog-vision path in first-person, straight
   *        render otherwise). Must be synchronous.
   */
  constructor({ renderer, scene, camera, player, products, analytics, renderFrame }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.player = player;
    this.products = products;
    this.analytics = analytics || null;
    this.renderFrame = renderFrame;

    this._logo = null;       // HTMLImageElement once loaded
    this._logoPromise = null; // in-flight / resolved load promise
    this._audioCtx = null;
    this._busy = false;       // guard re-entrancy during a capture
    this._canvas = null;      // last composited canvas (for toBlob on share)

    this._buildFlash();
    this._buildModal();
  }

  // ── Public ─────────────────────────────────────────────────────────────────

  /** Lazily load the brand logo (safe to call repeatedly). Returns a promise. */
  preload() {
    if (this._logoPromise) return this._logoPromise;
    this._logoPromise = new Promise((resolve) => {
      const img = new Image();
      // Same-origin (public/) so the canvas stays untainted.
      img.onload = () => {
        this._logo = img;
        resolve(img);
      };
      img.onerror = () => resolve(null); // frame still composites without it
      // Use import.meta.env.BASE_URL so the path is correct whether the game
      // is served at the domain root or from a subpath (base: './' in vite.config.js
      // makes root-absolute paths like '/brand/logo.png' resolve to the wrong
      // location when deployed under a prefix or embedded in an iframe).
      img.src = import.meta.env.BASE_URL + 'brand/logo.png';
    });
    return this._logoPromise;
  }

  /**
   * Capture a framed, branded still and open the preview modal.
   * Idempotent while a capture / modal is in flight.
   */
  async capture() {
    if (this._busy) return;
    this._busy = true;

    // Shutter feel: instant flash + subtle click (both cheap, gesture-safe).
    this._flash();
    this._shutterClick();

    // The active product (if the player is standing next to one) — snapshot the
    // reference now so a late proximity change can't swap it mid-capture.
    const active = this.products?.activeProduct ?? null;
    this.analytics?.track('photo_captured', { product: active?.id ?? null });

    try {
      // Logo must be ready BEFORE the render so the composite step (which reads
      // the WebGL drawing buffer) never yields to the event loop — the renderer
      // has no preserveDrawingBuffer, so pixels are only valid in the same task.
      await this.preload();

      const canvas = this._composite(active);
      this._canvas = canvas;
      this._openModal(canvas);
    } catch (err) {
      // Never crash the game over a photo.
      // eslint-disable-next-line no-console
      console.warn('Photo capture failed:', err);
    } finally {
      this._busy = false;
    }
  }

  // ── Compositing ──────────────────────────────────────────────────────────────

  /**
   * Render one fresh frame, then paint the branded 4:5 frame around it.
   * Everything from renderFrame() to drawImage() is synchronous so the WebGL
   * drawing buffer is still valid when we read it.
   * @param {object|null} product — active product for the caption (or null)
   * @returns {HTMLCanvasElement}
   */
  _composite(product) {
    // Hide the floating nameplate so it doesn't double up with the caption.
    const sprite = this.player?._nameSprite ?? null;
    const spriteWasVisible = sprite ? sprite.visible : false;
    if (sprite) sprite.visible = false;

    // Fresh pixels in this same synchronous task.
    this.renderFrame();
    const src = this.renderer.domElement;

    const canvas = document.createElement('canvas');
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext('2d');

    // §6.5 Route frame colours through the active theme so seasonal shots get
    // a seasonally framed background and accent bar.
    const frame = ACTIVE_THEME.photoFrame;

    // 1. Cream (or theme-tinted) frame fills the whole canvas.
    ctx.fillStyle = frame.cream;
    ctx.fillRect(0, 0, OUT_W, OUT_H);

    // 2. Photo window (rounded, cover-fit crop of the WebGL frame).
    const M = 54;                // outer margin
    const photo = { x: M, y: M, w: OUT_W - M * 2, h: 948 };
    const radius = 26;

    ctx.save();
    _roundRectPath(ctx, photo.x, photo.y, photo.w, photo.h, radius);
    ctx.clip();
    // Cover-fit: fill the window, cropping the overflow (works for portrait
    // phones and landscape desktops alike).
    const scale = Math.max(photo.w / src.width, photo.h / src.height);
    const cropW = photo.w / scale;
    const cropH = photo.h / scale;
    const sx = (src.width - cropW) / 2;
    const sy = (src.height - cropH) / 2;
    ctx.drawImage(src, sx, sy, cropW, cropH, photo.x, photo.y, photo.w, photo.h);
    ctx.restore();

    // Restore the nameplate immediately after reading pixels.
    if (sprite) sprite.visible = spriteWasVisible;

    // Subtle inset border on the photo so it reads framed, not pasted.
    ctx.save();
    _roundRectPath(ctx, photo.x + 0.5, photo.y + 0.5, photo.w - 1, photo.h - 1, radius);
    ctx.strokeStyle = 'rgba(28, 27, 27, 0.10)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 3. Branding band (below the photo).
    const bandTop = photo.y + photo.h; // 1002
    const leftX = M;
    // Reserve room on the right for the logo so text never collides with it.
    const logoSize = 168;
    const logoX = OUT_W - M - logoSize;
    const logoY = bandTop + (OUT_H - bandTop - logoSize) / 2;
    const textMaxW = logoX - 30 - leftX; // gutter before the logo

    // Accent bar — themed colour ("designed, not templated" flourish).
    ctx.fillStyle = frame.accent;
    _roundRectPath(ctx, leftX, bandTop + 38, 70, 7, 3.5);
    ctx.fill();

    // Caption: "<name> at Soycraft World" (shrink-to-fit).
    const caption = `${identity.displayName} at Soycraft World`;
    ctx.fillStyle = frame.ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let capSize = 54;
    ctx.font = `800 ${capSize}px ${FONT}`;
    while (capSize > 30 && ctx.measureText(caption).width > textMaxW) {
      capSize -= 2;
      ctx.font = `800 ${capSize}px ${FONT}`;
    }
    ctx.fillText(caption, leftX, bandTop + 64, textMaxW);

    // Product line (text-only — never draw the cross-origin product photo).
    let cursorY = bandTop + 64 + capSize + 22;
    if (product) {
      ctx.textBaseline = 'top';
      ctx.font = `700 30px ${FONT}`;
      const price = product.price ? `  ·  ${product.price}` : '';
      let name = product.name || '';
      // Truncate the name so name + price fit the text column.
      const priceW = ctx.measureText(price).width;
      ctx.font = `700 30px ${FONT}`;
      while (name.length > 1 && ctx.measureText(name).width + priceW > textMaxW) {
        name = name.slice(0, -1);
      }
      const nameW = ctx.measureText(name).width;
      ctx.fillStyle = frame.ink;
      ctx.fillText(name, leftX, cursorY);
      if (price) {
        ctx.fillStyle = frame.accent;
        ctx.font = `600 30px ${FONT}`;
        ctx.fillText(price, leftX + nameW, cursorY);
      }
      cursorY += 44;
    }

    // Short URL back to the game — anchored to the bottom of the band.
    ctx.fillStyle = frame.subInk;
    ctx.font = `600 30px ${FONT}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`🐾  ${GAME_URL}`, leftX, OUT_H - M - 4);

    // 4. The logo — prominent but tasteful, bottom-right of the band. Drawn with
    // "multiply" so its white background drops into the cream (matches the
    // site / loading-screen treatment) instead of showing a white box.
    if (this._logo) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(this._logo, logoX, logoY, logoSize, logoSize);
      ctx.restore();
    }

    return canvas;
  }

  // ── Modal ────────────────────────────────────────────────────────────────────

  _buildModal() {
    const modal = document.createElement('div');
    modal.id = 'photo-modal';
    modal.className = 'overlay hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Share your photo');
    modal.innerHTML = `
      <div class="photo-modal-inner">
        <button class="card-close" id="photo-close" aria-label="Close">×</button>
        <div class="photo-preview-wrap">
          <img class="photo-preview-img" id="photo-preview-img" alt="Your Soycraft World photo" />
        </div>
        <div class="photo-actions">
          <button class="cta photo-share-btn" id="photo-share">Share</button>
          <button class="photo-ghost-btn" id="photo-save">Save</button>
        </div>
        <button class="photo-copy-btn" id="photo-copy">🔗 Copy link</button>
      </div>`;
    document.body.appendChild(modal);

    this._modal = modal;
    this._img = modal.querySelector('#photo-preview-img');
    this._shareBtn = modal.querySelector('#photo-share');
    this._saveBtn = modal.querySelector('#photo-save');
    this._copyBtn = modal.querySelector('#photo-copy');

    modal.querySelector('#photo-close').addEventListener('click', () => this._closeModal());
    // Tap the backdrop (not the inner card) to dismiss.
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this._closeModal();
    });
    this._shareBtn.addEventListener('click', () => this._share());
    this._saveBtn.addEventListener('click', () => this._save());
    this._copyBtn.addEventListener('click', () => this._copyLink());

    // If the platform can't share files, present "Save" as the primary action.
    this._canWebShare = false;
  }

  _openModal(canvas) {
    // Feed the preview from the canvas; keep the canvas around for toBlob.
    this._img.src = canvas.toDataURL('image/png');
    // Re-trigger the polaroid-develop flourish each time.
    this._img.classList.remove('developing');
    // eslint-disable-next-line no-unused-expressions
    void this._img.offsetWidth;
    this._img.classList.add('developing');

    // Decide primary action for this device.
    this._canWebShare = this._supportsFileShare();
    this._shareBtn.style.display = this._canWebShare ? '' : 'none';
    this._saveBtn.classList.toggle('photo-primary', !this._canWebShare);
    this._copyBtn.textContent = '🔗 Copy link';

    this._modal.classList.remove('hidden');
  }

  _closeModal() {
    this._modal.classList.add('hidden');
  }

  // ── Share / save / copy ──────────────────────────────────────────────────────

  _supportsFileShare() {
    try {
      if (!navigator.canShare || !navigator.share) return false;
      const probe = new File([new Blob()], 'probe.png', { type: 'image/png' });
      return navigator.canShare({ files: [probe] });
    } catch {
      return false;
    }
  }

  _blob() {
    return new Promise((resolve) => {
      if (!this._canvas) return resolve(null);
      this._canvas.toBlob((b) => resolve(b), 'image/png');
    });
  }

  _filename() {
    const slug =
      (identity.displayName || 'dog')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'dog';
    return `soycraft-world-${slug}.png`;
  }

  _shareText() {
    return `${identity.displayName} at Soycraft World 🐾\n${identity.shareUrl()}`;
  }

  async _share() {
    const blob = await this._blob();
    if (!blob) return;
    const file = new File([blob], this._filename(), { type: 'image/png' });
    const data = { files: [file], text: this._shareText(), title: 'Soycraft World' };

    if (this._supportsFileShare() && navigator.canShare(data)) {
      try {
        await navigator.share(data);
        this.analytics?.track('photo_shared', { method: 'webshare' });
      } catch (err) {
        // User dismissing the share sheet must never surface as an error.
        if (err && err.name === 'AbortError') return;
        // Any other failure: fall back to a download so the moment isn't lost.
        this._downloadBlob(blob);
      }
    } else {
      this._downloadBlob(blob);
    }
  }

  async _save() {
    const blob = await this._blob();
    if (!blob) return;
    this._downloadBlob(blob);
  }

  _downloadBlob(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this._filename();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    this.analytics?.track('photo_shared', { method: 'download' });
  }

  async _copyLink() {
    const link = identity.shareUrl();
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) {
      // Legacy fallback (older/desktop browsers without async clipboard).
      try {
        const ta = document.createElement('textarea');
        ta.value = link;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        ta.remove();
      } catch {
        ok = false;
      }
    }
    this.analytics?.track('photo_shared', { method: 'copylink' });
    // Confirm on the button itself.
    this._copyBtn.textContent = ok ? '✓ Link copied' : link;
    setTimeout(() => (this._copyBtn.textContent = '🔗 Copy link'), 1800);
  }

  // ── Shutter feel ──────────────────────────────────────────────────────────────

  _buildFlash() {
    const flash = document.createElement('div');
    flash.id = 'photo-flash';
    document.body.appendChild(flash);
    this._flashEl = flash;
  }

  _flash() {
    const el = this._flashEl;
    el.classList.remove('fire');
    // eslint-disable-next-line no-unused-expressions
    void el.offsetWidth;
    el.classList.add('fire');
  }

  /** A brief, subtle synth "click" (WebAudio — no assets, see world/Bark.js). */
  _shutterClick() {
    try {
      if (!this._audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this._audioCtx = new AC();
      }
      const ctx = this._audioCtx;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      // Short high tick (mirror-slap) + tiny noise burst.
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.03);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.08, now + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch {
      // Audio is a nice-to-have; never let it break capture.
    }
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function _roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
