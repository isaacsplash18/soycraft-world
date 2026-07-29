/**
 * src/core/Analytics.js
 * ============================================================================
 *  Tiny, dependency-free analytics layer.
 *
 *  Supports:
 *    • console.debug in development (import.meta.env.DEV)
 *    • window.dataLayer (Google Tag Manager)
 *    • window.fbq (Meta Pixel custom events)
 *    • Optional Meta Pixel bootstrap when SETTINGS.analytics.metaPixelId is set
 *
 *  Usage (singleton):
 *    import { analytics } from './core/Analytics.js';
 *    analytics.init();                           // call once on boot
 *    analytics.track('event_name', { key: val }); // call anywhere
 *
 *  Event catalogue (wired as of Jul 2026):
 *    session_start       — fired once on boot
 *    game_start          — player presses the Start button
 *    product_discovered  — { id, name } — first time player enters a product zone
 *    wishlist_add        — { id } — product saved to wishlist
 *    wishlist_remove     — { id } — product removed from wishlist
 *    cart_handoff        — { items: string[], count: number } — checkout clicked
 *    store_link_open     — { id } — any shop/store URL opened
 *    email_captured      — email capture form submitted successfully
 *
 *  Reserved for later agents:
 *    dog_customised, photo_captured, photo_shared
 * ============================================================================
 */

import { SETTINGS } from '../config/settings.js';

class _Analytics {
  constructor() {
    this._initialised = false;
  }

  /**
   * Initialise the analytics layer.
   * Injects the Meta Pixel bootstrap if SETTINGS.analytics.metaPixelId is set.
   * Safe to call multiple times (idempotent).
   */
  init() {
    if (this._initialised) return;
    this._initialised = true;

    const pixelId = SETTINGS.analytics?.metaPixelId;
    if (pixelId) this._bootstrapMetaPixel(String(pixelId));
  }

  /**
   * Track a named event with optional properties.
   *
   * The call is a no-op when any of the outputs throw; the game will never
   * crash because of analytics.
   *
   * @param {string} event  - Event name (snake_case or camelCase).
   * @param {object} [props] - Arbitrary flat properties object.
   */
  track(event, props = {}) {
    try {
      if (import.meta.env?.DEV) {
        // eslint-disable-next-line no-console
        console.debug(`[Analytics] ${event}`, props);
      }

      // Google Tag Manager / GA4 via dataLayer.
      if (typeof window !== 'undefined' && Array.isArray(window.dataLayer)) {
        window.dataLayer.push({ event, ...props });
      }

      // Meta Pixel custom event.
      if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
        window.fbq('trackCustom', event, props);
      }
    } catch {
      // Never let analytics break the game.
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  /** Inject the standard Meta Pixel bootstrap script and fire PageView. */
  _bootstrapMetaPixel(pixelId) {
    if (typeof window === 'undefined') return;
    if (typeof window.fbq === 'function') {
      // Pixel already loaded externally — just init this account.
      window.fbq('init', pixelId);
      window.fbq('track', 'PageView');
      return;
    }
    /* eslint-disable */
    // Standard Meta Pixel snippet (minified).
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
    n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
    t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window,document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
  }
}

/** Singleton analytics instance — import this everywhere. */
export const analytics = new _Analytics();
