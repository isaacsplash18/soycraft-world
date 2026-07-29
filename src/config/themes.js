/**
 * src/config/themes.js
 * ============================================================================
 *  Seasonal skin registry for Soycraft World (§6.5).
 *
 *  Each theme entry provides the COMPLETE art-direction config for the world
 *  pipeline. Switching the ?season= URL parameter (or entering a date window)
 *  re-dresses the entire world without any geometry or gameplay changes.
 *
 * ── HOW TO ADD A THIRD THEME ─────────────────────────────────────────────────
 *  1. Copy the `default` entry below into a new key (e.g. `holiday`).
 *  2. Adjust the palette keys (sunColor, groundPatches, treeCanopy, etc.).
 *  3. Set cssVars for UI accent overrides, photoFrame for the share frame.
 *  4. Optionally add skyPresets overrides (keys merged into Sky.js PRESETS).
 *  5. Optionally list featuredProductIds for enhanced hero glow.
 *  6. Optionally add a dressing spec for SeasonalDressing.js.
 *  7. Append a DATE_WINDOWS entry if it should activate automatically.
 *  No code outside this file needs to change.
 *
 * ── SCHEMA KEY → CONSUMER MAP ────────────────────────────────────────────────
 *  sunColor, sunIntensity             → core/SceneSetup.js (directional light)
 *  hemiSky, hemiGround, hemiIntensity → core/SceneSetup.js (hemisphere fill)
 *  toonSteps                          → world/materials.js (clay toon ramp)
 *  groundBase, groundPatches          → core/World.js (terrain vertex colours)
 *  grass, grassLawn, concrete,
 *    road, roadMark                   → core/World.js (district ground surfaces)
 *  treeCanopy, treeCanopyAlt,
 *    trunk, bush, rock                → core/World.js (vegetation)
 *  plinth, plinthBase                 → world/ProductStage.js (product pedestal)
 *  heroGlow                           → world/ProductStage.js (glow sprite tint)
 *  contactShadow                      → world/ProductStage.js (shadow colour)
 *  cssVars                            → main.js (applied to document :root)
 *  photoFrame                         → share/PhotoShare.js (photo frame palette)
 *  skyPresets                         → world/Sky.js (merged into PRESETS)
 *  featuredProductIds                 → products/Products.js (enhanced glow)
 *  dressing                           → world/SeasonalDressing.js (props spec)
 * ============================================================================
 */

// ── Date-window table (data, not code) ────────────────────────────────────────
// { id, from: [month, day], to: [month, day] } — month is 1-indexed.
// The date check uses the user's LOCAL calendar. Year-wrapping is supported
// (e.g. Dec→Jan). To add a window, append an entry here.
const DATE_WINDOWS = [
  { id: 'lunar',   from: [1, 15], to: [2, 15] },  // Lunar New Year
  // { id: 'holiday', from: [12, 1], to: [1, 7]  },  // Christmas / New Year (uncomment)
];

// ── Theme registry ────────────────────────────────────────────────────────────

export const THEMES = {

  // ── DEFAULT ────────────────────────────────────────────────────────────────
  // The "premium stylised" claymation look as shipped (§6.1). Every value
  // exactly matches what was hardcoded in settings.js before this system was
  // added. With no ?season= param outside a seasonal window this is IDENTICAL
  // to the previous build — verified by mirroring the literal hex values.
  default: {
    id: 'default',
    name: 'Soycraft World',

    // Lighting
    sunColor:      0xfff0cf,
    sunIntensity:  2.1,
    hemiSky:       0xffe9cf,
    hemiGround:    0xd6b58c,
    hemiIntensity: 1.15,

    // Toon ramp
    toonSteps: [0.5, 0.78, 1.0],

    // Terrain
    groundBase:    0xe4d7ba,
    groundPatches: [0x9ec66f, 0xb5d183, 0xd9cba3, 0xc6d996, 0xeadfc6, 0xcabf95],

    // District surfaces
    grass:    0x93c268,
    grassLawn:0x9cca6d,
    concrete: 0xe7ddca,
    road:     0x585349,
    roadMark: 0xf1e7d2,

    // Vegetation
    treeCanopy:    0x8fbf6e,
    treeCanopyAlt: 0xaad083,
    trunk:         0xb08a5a,
    bush:          0x86b869,
    rock:          0xd8ccb6,

    // Product stage
    plinth:       0xfbf3e6,
    plinthBase:   0xece0cb,
    heroGlow:     0xffd79a,
    contactShadow:0x2b2013,

    // CSS var overrides — empty means "use the stylesheet defaults unchanged"
    cssVars: {},

    // Photo frame palette (PhotoShare.js)
    photoFrame: {
      cream:  '#f7efe0',
      accent: '#f94c43',
      ink:    '#1c1b1b',
      subInk: '#6a6a6a',
    },

    // Sky-preset color overrides merged over Sky.js PRESETS; null = no change
    skyPresets: null,

    // null = all products share the same hero treatment
    featuredProductIds: null,

    // null = no seasonal props
    dressing: null,
  },

  // ── LUNAR NEW YEAR ─────────────────────────────────────────────────────────
  // Warm reds, deep golds, blush, kumquat orange.
  // A premium, tasteful CNY palette — rich without being garish.
  lunar: {
    id: 'lunar',
    name: 'Lunar New Year',

    // Slightly warmer, richer lighting
    sunColor:      0xfff0cf,
    sunIntensity:  2.2,
    hemiSky:       0xffe5c0,
    hemiGround:    0xd4956c,   // richer amber-terracotta bounce
    hemiIntensity: 1.2,

    toonSteps: [0.5, 0.78, 1.0],

    // Ground: amber-gold base, slightly deeper greens
    groundBase:    0xe5d0a8,
    groundPatches: [0x96c268, 0xafd080, 0xd4c898, 0xbdd090, 0xe8dac0, 0xc8bc90],

    // Surfaces: slightly warmer greens + richer concrete
    grass:    0x8fbb60,
    grassLawn:0x96c266,
    concrete: 0xe8dcc8,
    road:     0x544e44,
    roadMark: 0xf0e4cc,

    // Vegetation: slightly deeper, richer tones
    treeCanopy:    0x88b860,
    treeCanopyAlt: 0xa8cc78,
    trunk:         0xb88c50,
    bush:          0x80ae60,
    rock:          0xd4c898,

    // Product stage: gold-warmed plinth tier, rich gold hero glow
    plinth:        0xfff4e0,
    plinthBase:    0xf4d88a,   // gold trim base tier
    heroGlow:      0xffa820,   // rich warm-gold glow
    contactShadow: 0x281408,

    // CSS vars: premium cardinal red (Chinese New Year red, not coral)
    cssVars: {
      '--accent':      '#c41e3a',
      '--accent-dark': '#9e1830',
      '--cream':       '#fff9f0',
    },

    // Photo frame: warm gold-cream background, cardinal red accent bar
    photoFrame: {
      cream:  '#fff4e0',
      accent: '#c41e3a',
      ink:    '#1c1b1b',
      subInk: '#6a6a6a',
    },

    // Sky overrides: warmer day horizon + richer golden hour
    skyPresets: {
      day: {
        sky: { top: 0x7ab0e0, bottom: 0xffddb8 },
        fog: 0xffe2c0,
        hemi: { sky: 0xffe5c0, ground: 0xd4956c, intensity: 1.2 },
        sun: { color: 0xfff0cf, intensity: 2.3, dir: [-0.45, 0.82, 0.32] },
        exposure: 1.06,
        clouds: { color: 0xfff0e8, opacity: 1.0, visible: true },
        stars: false,
        moon: false,
        sunDisc: { color: 0xffe8a8, size: 32, glow: 0xffd070 },
      },
      golden: {
        sky: { top: 0x7a4a90, bottom: 0xff9a50 },  // deeper purple zenith + richer orange
        fog: 0xffb080,
        hemi: { sky: 0xffb080, ground: 0x906040, intensity: 1.08 },
        sun: { color: 0xff6820, intensity: 2.3, dir: [-0.95, 0.18, 0.25] },
        exposure: 1.08,
        clouds: { color: 0xffc0b8, opacity: 1.0, visible: true, emissive: 0xff4070, emissiveIntensity: 0.6 },
        stars: false,
        moon: false,
        sunDisc: { color: 0xff9040, size: 44, glow: 0xff7030 },
      },
    },

    // Featured: colourful, warm-palette products that suit CNY gifting
    featuredProductIds: ['fruite', 'mallow-sling', 'soleil', 'rollie-pollie'],

    // Prop placement spec consumed by SeasonalDressing.js
    dressing: {
      type: 'lunar',
      // Lanterns
      lanternColor:    0xcc2200,  // deep vermilion body
      lanternCapColor: 0xd4a017,  // gold top/bottom caps
      lanternEmissive: 0xff4400,  // warm orange interior glow (night)
      // Kumquat pots
      kumquatFruit:    0xff8800,  // bright kumquat orange
      kumquatLeaf:     0x3a7c28,  // deep foliage green
      potColor:        0xb84808,  // terracotta
      potBase:         0x9c3c08,  // darker terracotta base ring
    },
  },
};

// ── Resolution logic ──────────────────────────────────────────────────────────

/**
 * Resolve the active theme at module-load time:
 *   1. ?season=<id> URL param wins (explicit override)
 *   2. DATE_WINDOWS table (automatic by local calendar date)
 *   3. Default fallback
 *
 * Invalid ?season= ids fall back to default so a typo never breaks the game.
 *
 * @returns {object} one of the THEMES entries
 */
export function resolveTheme() {
  // 1. URL override
  if (typeof window !== 'undefined') {
    const id = new URLSearchParams(window.location.search).get('season');
    if (id !== null) {
      // Explicit param present — valid id wins, invalid id → default (not date)
      return THEMES[id] ?? THEMES.default;
    }
  }

  // 2. Date windows
  const now = new Date();
  const m = now.getMonth() + 1; // 1-indexed
  const d = now.getDate();
  for (const win of DATE_WINDOWS) {
    if (THEMES[win.id] && _inWindow(m, d, win.from, win.to)) {
      return THEMES[win.id];
    }
  }

  // 3. Default
  return THEMES.default;
}

/** True when [m, d] falls inside the date window [from, to], with year-wrap. */
function _inWindow(m, d, from, to) {
  const cur = m * 100 + d;
  const f   = from[0] * 100 + from[1];
  const t   = to[0]   * 100 + to[1];
  if (f <= t) return cur >= f && cur <= t;       // normal window (no year-wrap)
  return cur >= f || cur <= t;                   // year-wrapping window
}

/** The single resolved theme for this page load. Stable — URL params don't
 *  change after load, so this is safe to import as a module-level constant. */
export const ACTIVE_THEME = resolveTheme();
