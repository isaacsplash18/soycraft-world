/**
 * src/shop/Wishlist.js
 * ============================================================================
 *  Client-side wishlist persisted in localStorage.
 *
 *  No login, no server — items survive page refresh and are cleared only when
 *  the user removes them or clears browser storage.
 *
 *  localStorage key: 'soy.wishlist.v1'
 *
 *  Public API
 *  ----------
 *    add(id)       — save a product by its id string
 *    remove(id)    — un-save a product
 *    has(id)       — true if saved
 *    items()       — Array of full product objects (from config/products.js),
 *                    filtered to saved ids, in config declaration order
 *    onChange(cb)  — register a callback fired as onChange(items[]) on any
 *                    add/remove; may be called multiple times
 * ============================================================================
 */

import { PRODUCTS } from '../config/products.js';

const STORAGE_KEY = 'soy.wishlist.v1';

export class Wishlist {
  constructor() {
    this._ids = new Set(this._load());
    this._callbacks = [];
  }

  // ── Persistence ─────────────────────────────────────────────────────────────

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this._ids]));
    } catch {
      // Silently ignore (e.g. private browsing with storage blocked).
    }
  }

  _notify() {
    const current = this.items();
    for (const cb of this._callbacks) {
      try { cb(current); } catch {}
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Save a product. No-op if already saved. */
  add(id) {
    if (!this._ids.has(id)) {
      this._ids.add(id);
      this._save();
      this._notify();
    }
  }

  /** Remove a product. No-op if not saved. */
  remove(id) {
    if (this._ids.has(id)) {
      this._ids.delete(id);
      this._save();
      this._notify();
    }
  }

  /** Returns true if the product with this id is currently saved. */
  has(id) {
    return this._ids.has(id);
  }

  /**
   * Returns full product objects for all saved ids, in the order they appear
   * in config/products.js (stable sort for the UI list).
   * @returns {Array}
   */
  items() {
    return PRODUCTS.filter((p) => this._ids.has(p.id));
  }

  /**
   * Register a callback that is called with the current items() array
   * whenever the wishlist changes.
   * @param {function(Array): void} cb
   */
  onChange(cb) {
    if (typeof cb === 'function') this._callbacks.push(cb);
  }
}
