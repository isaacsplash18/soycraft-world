/**
 * src/player/DogIdentity.js
 * ============================================================================
 *  Single source of truth for the player's dog customisation (§6.3).
 *
 *  State: { breedId, coat, accessory, name }
 *
 *  URL query param names (stable short ids for sharing):
 *    breed  — breed id string  (e.g. 'corgi')
 *    coat   — coat colour id   (e.g. 'caramel') — omitted when 'natural'
 *    acc    — accessory id     (e.g. 'bandana-coral') — omitted when 'none'
 *    name   — URL-encoded dog name (e.g. 'Miso') — omitted when blank
 *
 *  Valid coat ids:
 *    'natural' | 'cream' | 'caramel' | 'sand' | 'grey' | 'black' | 'russet'
 *
 *  Valid accessory ids:
 *    'none' | 'bandana-coral' | 'bandana-sage' | 'collar' | 'bow'
 *
 *  localStorage key: 'soy.dog.v1'
 *
 *  Public API (singleton `identity`):
 *    identity.breedId        string — current breed id
 *    identity.coat           string — coat colour id
 *    identity.accessory      string — accessory id
 *    identity.name           string — dog's chosen name (may be '')
 *    identity.displayName    string — name, or breed name if blank; use for
 *                                     photo frame captions and the nameplate
 *    identity.set(patch)     — update one or more fields, auto-persists
 *    identity.commit()       — force write URL + localStorage without mutation
 *    identity.shareUrl()     — returns full URL with dog params encoded;
 *                              a later photo/share agent calls this for the link
 * ============================================================================
 */

import { DEFAULT_BREED, BREEDS } from '../config/breeds.js';

const LS_KEY = 'soy.dog.v1';

// ── Coat colour catalogue ─────────────────────────────────────────────────────
// Curated creams, caramels, greys, black, russet — all work with the claymation
// art direction. hex is applied as a tint via DogFactory; null = breed default.

/** @type {Array<{id:string, label:string, hex:number|null, css:string|null}>} */
export const COAT_COLOURS = [
  { id: 'natural', label: 'Natural',  hex: null,     css: null      },
  { id: 'cream',   label: 'Cream',    hex: 0xf4ede0, css: '#f4ede0' },
  { id: 'caramel', label: 'Caramel',  hex: 0xc07a3b, css: '#c07a3b' },
  { id: 'sand',    label: 'Sand',     hex: 0xd9b070, css: '#d9b070' },
  { id: 'grey',    label: 'Grey',     hex: 0x9aa3ad, css: '#9aa3ad' },
  { id: 'black',   label: 'Black',    hex: 0x2a2420, css: '#2a2420' },
  { id: 'russet',  label: 'Russet',   hex: 0x8b3a1a, css: '#8b3a1a' },
];

// ── Accessory catalogue ───────────────────────────────────────────────────────

/** @type {Array<{id:string, label:string}>} */
export const ACCESSORIES = [
  { id: 'none',          label: 'None'         },
  { id: 'bandana-coral', label: 'Coral Bandana' },
  { id: 'bandana-sage',  label: 'Sage Bandana'  },
  { id: 'collar',        label: 'Collar'        },
  { id: 'bow',           label: 'Bow'           },
];

// ── Internal helpers ──────────────────────────────────────────────────────────

function _defaults() {
  return { breedId: DEFAULT_BREED, coat: 'natural', accessory: 'none', name: '' };
}

function _clamp(obj) {
  return {
    breedId:   BREEDS.find((b) => b.id === obj.breedId)          ? obj.breedId   : DEFAULT_BREED,
    coat:      COAT_COLOURS.find((c) => c.id === obj.coat)       ? obj.coat      : 'natural',
    accessory: ACCESSORIES.find((a) => a.id === obj.accessory)   ? obj.accessory : 'none',
    name:      typeof obj.name === 'string' ? obj.name.slice(0, 16) : '',
  };
}

function _readUrl() {
  if (typeof window === 'undefined') return null;
  const p = new URLSearchParams(window.location.search);
  if (!p.has('breed') && !p.has('coat') && !p.has('acc') && !p.has('name')) return null;
  return {
    breedId:   p.get('breed') || DEFAULT_BREED,
    coat:      p.get('coat')  || 'natural',
    accessory: p.get('acc')   || 'none',
    name:      p.get('name')  || '',
  };
}

function _readStorage() {
  try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
}

function _writeStorage(obj) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); } catch { /* quota */ }
}

function _writeUrl(obj) {
  if (typeof window === 'undefined') return;
  // Start from the CURRENT query string so non-dog params (e.g. ?season=, ?sky=)
  // are preserved rather than clobbered. We own only the four dog keys.
  const p = new URLSearchParams(window.location.search);
  p.set('breed', obj.breedId);
  if (obj.coat      !== 'natural') p.set('coat', obj.coat);   else p.delete('coat');
  if (obj.accessory !== 'none')    p.set('acc',  obj.accessory); else p.delete('acc');
  if (obj.name)                    p.set('name', obj.name);   else p.delete('name');
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

// ── DogIdentity ───────────────────────────────────────────────────────────────

class _DogIdentity {
  constructor() {
    const raw  = _readUrl() || _readStorage() || _defaults();
    const safe = _clamp(raw);
    this.breedId   = safe.breedId;
    this.coat      = safe.coat;
    this.accessory = safe.accessory;
    this.name      = safe.name;
  }

  /**
   * Dog's display name: chosen name, or breed name if blank.
   * The photo/share agent reads this for the photo frame caption.
   * @returns {string}
   */
  get displayName() {
    if (this.name) return this.name;
    return BREEDS.find((b) => b.id === this.breedId)?.name ?? this.breedId;
  }

  /**
   * Update one or more identity fields and persist (URL + localStorage).
   * @param {Partial<{breedId:string, coat:string, accessory:string, name:string}>} patch
   */
  set(patch) {
    const next  = _clamp({ ...this, ...patch });
    this.breedId   = next.breedId;
    this.coat      = next.coat;
    this.accessory = next.accessory;
    this.name      = next.name;
    this.commit();
  }

  /** Force-write current state to URL + localStorage without changing values. */
  commit() {
    _writeUrl(this);
    _writeStorage({ breedId: this.breedId, coat: this.coat, accessory: this.accessory, name: this.name });
  }

  /**
   * Returns the full shareable URL with dog params encoded as query params.
   * A later photo/share agent calls `identity.shareUrl()` for the link and
   * reads `identity.name` (or `identity.displayName`) for the photo caption.
   * @returns {string}
   */
  shareUrl() {
    // Preserve non-dog params from the current URL (e.g. ?season=lunar) so
    // shared photos open the same seasonal skin the player is experiencing.
    const DOG_KEYS = new Set(['breed', 'coat', 'acc', 'name']);
    const existing = new URLSearchParams(window.location.search);
    const p = new URLSearchParams();
    for (const [k, v] of existing) { if (!DOG_KEYS.has(k)) p.set(k, v); }
    p.set('breed', this.breedId);
    if (this.coat      !== 'natural') p.set('coat', this.coat);
    if (this.accessory !== 'none')    p.set('acc',  this.accessory);
    if (this.name)                    p.set('name', this.name);
    const qs   = p.toString();
    const base = `${window.location.origin}${window.location.pathname}`;
    return qs ? `${base}?${qs}` : base;
  }
}

/** Singleton dog identity — import this everywhere. */
export const identity = new _DogIdentity();
