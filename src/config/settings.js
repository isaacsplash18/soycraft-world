/**
 * ============================================================================
 *  GAME SETTINGS  —  world size, asset hooks, tuning knobs
 * ============================================================================
 *  Product data lives in products.js. This file holds everything else:
 *  asset swap-in paths, world dimensions, and gameplay tuning.
 *
 *  §6.5 SEASONAL SKINS: THEME is now populated from the active theme resolved
 *  by config/themes.js. All consumers keep `import { THEME } from './settings'`
 *  unchanged — the values inside THEME are seasonal at boot, but the module
 *  API is identical. To add a season, edit config/themes.js only.
 * ============================================================================
 */

import { ACTIVE_THEME } from './themes.js';

/**
 * Soycraft brand palette — extracted from the live theme at soycraft.co, then
 * pushed WARMER and cozier for the "premium stylised" re-skin (§6.1): soft
 * butter creams, warm sand, the same coral accent, gently warmed sage foliage.
 * Used across the 3D scene and the UI so the game matches the site.
 */
export const BRAND = {
  ink: 0x1c1b1b, // headings / text
  subInk: 0x6a6a6a, // light text / links
  accent: 0xf94c43, // coral (sale/CTA accent on the site)
  cream: 0xf7efe0, // warm butter off-white
  sand: 0xe9dcc2, // warm sand ground tone
  mauve: 0xdcd2cf, // soft brand grey-mauve (a touch warmer)
  sage: 0xb0c497, // muted foliage (warmed)
  sageDark: 0x93a87e,
  white: 0xffffff,
  sky: 0xfbe8d0, // soft warm horizon fallback (also initial fog color)
  // CSS string helpers for the UI layer
  css: {
    ink: '#1c1b1b',
    subInk: '#6a6a6a',
    accent: '#f94c43',
    cream: '#f7efe0',
    border: '#e9e5dd',
  },
};

/**
 * ART DIRECTION — driven by the active seasonal theme (§6.5).
 *
 * Populated from config/themes.js at module-load time. All world-building
 * code reads THEME at call time (not import time), so the resolved theme
 * values are always in place before they are needed.
 *
 * With no ?season= param and outside a seasonal date window, the values are
 * IDENTICAL to the previous hardcoded defaults — zero visual change.
 */
export const THEME = {
  // Lighting
  sunColor:      ACTIVE_THEME.sunColor,
  sunIntensity:  ACTIVE_THEME.sunIntensity,
  hemiSky:       ACTIVE_THEME.hemiSky,
  hemiGround:    ACTIVE_THEME.hemiGround,
  hemiIntensity: ACTIVE_THEME.hemiIntensity,

  // Toon ramp
  toonSteps: ACTIVE_THEME.toonSteps,

  // Terrain
  groundBase:    ACTIVE_THEME.groundBase,
  groundPatches: ACTIVE_THEME.groundPatches,

  // District surfaces
  grass:    ACTIVE_THEME.grass,
  grassLawn:ACTIVE_THEME.grassLawn,
  concrete: ACTIVE_THEME.concrete,
  road:     ACTIVE_THEME.road,
  roadMark: ACTIVE_THEME.roadMark,

  // Vegetation
  treeCanopy:    ACTIVE_THEME.treeCanopy,
  treeCanopyAlt: ACTIVE_THEME.treeCanopyAlt,
  trunk:         ACTIVE_THEME.trunk,
  bush:          ACTIVE_THEME.bush,
  rock:          ACTIVE_THEME.rock,

  // Product stage
  plinth:        ACTIVE_THEME.plinth,
  plinthBase:    ACTIVE_THEME.plinthBase,
  heroGlow:      ACTIVE_THEME.heroGlow,
  contactShadow: ACTIVE_THEME.contactShadow,
};

export const SETTINGS = {
  // --- ASSET HOOKS --------------------------------------------------------
  // Leave a path null to use the built-in placeholder. Set a path to load a GLB.
  assets: {
    // TODO: Drop a low-poly park/garden GLB in /public/world/ and point here,
    //       e.g. '/world/soycraft-park.glb'. When set, the procedural primitive
    //       world is skipped and collision is built from the GLB instead.
    worldModel: null,

    // TODO: Drop a rigged dog GLB in /public/character/ and point here,
    //       e.g. '/character/soycraft-dog.glb'. Animation clip names the player
    //       looks for are listed in player/Player.js (Idle / Walk / Run).
    dogModel: null,
    dogScale: 1.0,
  },

  // --- WORLD --------------------------------------------------------------
  world: {
    halfSize: 44, // ground extends from -halfSize..+halfSize on X and Z
    groundColor: BRAND.sand, // soft warm neutral (brand)
    skyColor: BRAND.sky, // warm off-white (also the fog color)
    fogNear: 55,
    fogFar: 165, // far enough to see the snow mountain on the horizon
    treeCount: 16, // instanced low-poly trees (muted sage) filling the gaps
    bushCount: 22, // instanced low-poly bushes
  },

  // --- PLAYER -------------------------------------------------------------
  player: {
    startPosition: [0, 0, 16], // spawn facing the central logo (-Z)
    walkSpeed: 26,
    runSpeed: 44,
    jumpSpeed: 12,
    capsuleRadius: 0.4,
    capsuleHeight: 1.2, // distance between capsule start/end spheres
  },

  // --- PRODUCTS -----------------------------------------------------------
  products: {
    interactRadius: 3.4, // how close (meters) the player must get to discover
    labelHeight: 2.1, // floating label height above a product
  },

  // --- PERFORMANCE --------------------------------------------------------
  perf: {
    maxPixelRatioMobile: 1.5, // cap DPR on phones to keep fps high
    maxPixelRatioDesktop: 2.0,
    shadows: true, // turned off automatically on low-power devices
  },

  // --- ANALYTICS ----------------------------------------------------------
  analytics: {
    // Set to a numeric string to enable the Meta Pixel bootstrap and PageView.
    // When null, the Pixel is not injected (dataLayer / GTM still works if
    // the tag is already on the page via index.html).
    metaPixelId: null,
  },
};

// Simple touch / mobile detection used across modules.
export const IS_TOUCH =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0);
