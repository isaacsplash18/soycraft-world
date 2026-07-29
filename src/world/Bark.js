/**
 * Procedural dog bark — synthesized with the Web Audio API so there are no
 * audio files to ship and it works offline / inside an iframe. Pitch scales
 * with the breed (small dogs yip high, big dogs woof low).
 *
 * Mobile (esp. iOS Safari) blocks audio until it's "unlocked" inside a user
 * gesture by actually starting a buffer — `unlock()` does that. Call it from
 * the first touch/click (see main.js) and again on every bark.
 */
export class Bark {
  constructor() {
    this.ctx = null;
    this._unlocked = false;
  }

  _context() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    return this.ctx;
  }

  /**
   * Resume + unlock the audio context. MUST run inside a user gesture
   * (touchstart / pointerdown / click / keydown) for iOS to allow sound.
   */
  unlock() {
    const ctx = this._context();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!this._unlocked) {
      // Start a one-sample silent buffer — this is what actually unlocks iOS.
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      this._unlocked = true;
    }
  }

  /** Play a bark. `breed` (optional) sets the pitch from its `scale`. */
  play(breed) {
    const ctx = this._context();
    if (!ctx) return;
    this.unlock(); // safe to call repeatedly; ensures audio is live on mobile
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime + 0.03; // small lookahead so nodes fire after resume
    const scale = (breed && breed.scale) || 1;
    const f0 = Math.min(820, Math.max(150, 560 / scale)); // small=high, big=low

    const woof = (t0, f, dur, vol) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f * 1.6, t0);
      osc.frequency.exponentialRampToValueAtTime(f * 0.7, t0 + dur);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f * 2.2;
      bp.Q.value = 5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);

      // noisy attack transient for bite
      const len = Math.floor(ctx.sampleRate * 0.05);
      const nbuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = nbuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
      const noise = ctx.createBufferSource();
      noise.buffer = nbuf;
      const nf = ctx.createBiquadFilter();
      nf.type = 'bandpass';
      nf.frequency.value = f * 3;
      nf.Q.value = 1;
      const ng = ctx.createGain();
      ng.gain.value = vol * 0.5;
      noise.connect(nf);
      nf.connect(ng);
      ng.connect(ctx.destination);
      noise.start(t0);
      noise.stop(t0 + 0.05);
    };

    woof(now, f0, 0.16, 0.32);
    woof(now + 0.21, f0 * 1.06, 0.12, 0.24); // quick second yip
  }
}
