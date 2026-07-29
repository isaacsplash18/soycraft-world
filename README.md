# Soycraft World 🐾

A mobile-friendly **3D free-roam browser mini-game** for [Soycraft](https://www.soycraft.co).
Pick your dog, wander a minimal showroom-garden around a giant 3D **soycraft**
wordmark, walk up to real products (rendered as little 3D models) to see their
card, press **E** to open the shop page, and when you've found everything, drop
your email.

Built with **Three.js + Vite**, vanilla JS. Styled to the live soycraft.co brand
(cream / coral / Montserrat). Architecture follows the
[`NafisRayan/3D-Game-Template-Ultimate`](https://github.com/NafisRayan/3D-Game-Template-Ultimate)
pattern (Capsule-vs-Octree collision, first/third-person rig).

---

## Run it

```bash
npm install
npm run dev      # http://localhost:5173  (also exposed on your LAN for phone testing)
```

```bash
npm run build    # production build -> dist/
npm run preview  # serve the production build
```

> Test on a phone: `npm run dev` prints a `Network:` URL — open it on a phone on
> the same Wi-Fi for the touch joystick.

---

## Deploy / hosting (with a Shopify store)

The game is a **static site** (`npm run build` → `dist/`), so host it on any
static CDN and embed it in your Shopify store. **Don't** upload it to Shopify
"Files" — that serves individual files, not a directory with relative imports.

**1. Build & deploy `dist/`** to a static host (all have free tiers + global CDN):
- Cloudflare Pages, Vercel, or Netlify — drag-and-drop `dist/`, or connect the
  git repo and set build command `npm run build`, output dir `dist`.
- You'll get a URL like `https://soycraft-world.pages.dev`.

**2. Put it on a subdomain** `game.soycraft.co`:
- In **Shopify admin → Settings → Domains → your domain → DNS settings**, add a
  `CNAME` record: host `game` → your host's target (e.g. `cname.vercel-dns.com`
  or your `*.pages.dev`). Then add `game.soycraft.co` as a custom domain in the
  host's dashboard. (If Shopify's DNS won't add the record, point the domain's
  nameservers at Cloudflare and manage DNS there.)

**3. Embed it in the storefront** so it lives at `soycraft.co/pages/world`:
- Create a Page (**Online Store → Pages → Add page**).
- In your theme, add a template `page.world.liquid` (or a custom section) with a
  full-bleed iframe, and assign the page to it:
  ```html
  <iframe src="https://game.soycraft.co"
          style="position:fixed;inset:0;width:100%;height:100%;border:0"
          all=" fullscreen; accelerometer; gyroscope"></iframe>
  ```
- The build sets `base: './'`, so it works embedded in an iframe / subpath and in
  the Instagram in-app browser.

### Controls

| | Desktop | Mobile |
|---|---|---|
| Move | `WASD` / arrows | left-thumb joystick |
| Look | mouse (click to lock) | drag the right half |
| Run | hold `Shift` | push joystick to the edge |
| Jump | `Space` | ⤒ button |
| **Open product page** | **`E`** (when near a product) | **"Shop now"** on the card |
| Switch 1st/3rd person | `V` | 👁 button |
| _(first-person renders in dog colour-vision — blue/yellow)_ | | |
| Change dog breed | breed picker (bottom-left) | breed picker |
| Zoom (3rd person) | mouse wheel | — |
| Collision debug wireframe | `H` | — |

---

## Project structure

```
src/
├── main.js                 # orchestrator + fixed-timestep loop + E-to-shop
├── config/
│   ├── products.js         # ★ ALL product data (name, category, price, url, photo, pos)
│   ├── breeds.js           # ★ dog breed definitions (parameterized)
│   ├── settings.js         # BRAND palette, world size, asset hooks, tuning
│   └── logoPath.js         # AUTO-GENERATED 3D wordmark outline (see gen-logo.mjs)
├── core/
│   ├── SceneSetup.js       # scene / camera / renderer / lights
│   └── World.js            # ground, fence, sage trees, paths + spawns the logo
├── world/
│   ├── ProductModels.js    # builds a 3D model per product category
│   ├── Landmarks.js        # mountain, park, plane, house, mall, car, taxi, bicycle
│   └── Logo.js             # extrudes the 3D "soycraft" wordmark
├── player/
│   ├── Player.js           # capsule + camera rig + breed switching + dog animation
│   └── DogFactory.js       # turns a breed config into a low-poly dog
├── physics/Physics.js      # Octree collision world + gravity
├── controls/
│   ├── Controls.js         # keyboard/mouse + joystick → unified input (incl. E)
│   └── Joystick.js         # zero-dependency touch joystick + look-drag
├── products/Products.js    # spawns props on pedestals, proximity discovery
└── ui/
    ├── UI.js               # HUD, product card, completion + email, breed picker
    └── styles.css          # brand-themed UI
scripts/
├── gen-logo.mjs            # regenerate the 3D wordmark from a font
└── Fredoka600.ttf          # font used for the wordmark
public/{world,character,products}/  # drop-in GLB / photo slots (each has a README)
```

---

## How to customize

### 1. Edit products (the main thing) — `src/config/products.js`

Each entry spawns a 3D prop and drives its info card. **No code changes needed.**

```js
{
  id: 't4-max',
  name: 'Pet Stroller — T4 Max',
  category: 'stroller',          // selects the 3D model — see below
  description: 'All-terrain pram with smooth suspension…',
  price: 'S$290',
  accent: 0x6a6a6a,              // trim color on the 3D model
  image: 'https://cdn.shopify.com/…/Grey.png',  // card photo (live CDN url or your own)
  shopUrl: 'https://www.soycraft.co/products/pet-stroller-t4-max',
  position: [0, 0, -22],         // [x, y(=0), z] in the world
  // model: '/products/foo.glb',  // optional: real GLB overrides the procedural model
  // scale: 1,
}
```

- **Add/remove products:** add or delete entries. The `/14` counter, completion,
  and props all update automatically.
- **Photos:** the cards currently use the live Soycraft CDN image URLs. Swap any
  `image` for your own (a CDN URL, or a file you drop in `public/products/`).
- **Layout:** the world reads as 5 category "zones" around the logo. Move a
  product by editing `position` (keep within `±world.halfSize`, default ±32).

### 2. Product categories → 3D models

`category` picks which low-poly model is built by `src/world/ProductModels.js`:

| category | model |
|---|---|
| `stroller` | pram with wheels, basket, canopy, handle |
| `bag` | soft carrier with mesh window, handles, strap |
| `harness` | harness + leash on a little display stand |
| `bed` | round bolster bed |
| `cushion` | tufted pad with piping |

To restyle a model or add a new category, edit the `BUILDERS` map in
`ProductModels.js`. To use a **real GLB** for one product instead, set `model:`
on it (section 1).

### Time-of-day sky

The sky reflects the **user's local clock** (`src/world/Sky.js`):

- **Day** (08–17): blue gradient + drifting low-poly clouds + warm high sun
- **Golden hour** (06–08, 17–19): warm sunset gradient + low golden sun
- **Night** (19–06): deep navy + twinkling stars + a glowing moon, with the
  world lit by **street lamps, the mall facade & entrance, plane cabin windows,
  and car/taxi headlights** (so products stay visible after dark)

Each preset also drives fog color, hemisphere/sun light, and tone-mapping
exposure. Override with `?sky=day|golden|night` in the URL, or press **T**
in-game to cycle. Edit the time windows / colors in the `PRESETS` map.

Night light sources are registered via `registerNightLight()` /
`registerNightEmissive()` (in `Sky.js`) — they're off by day and switch on with
the night preset. Add more by calling those from any landmark/world builder.

### World layout — landmarks & zones

The world is a ring of **landmark set-pieces** around the central logo, each
anchoring a product zone (`src/world/Landmarks.js`, `ANCHORS`):

| Landmark | Products (zone) |
|---|---|
| ✈️ Landed plane (E) | Pet Porter Carrier, Stroller X2 |
| 🌳 Park + ❄️ snow mountain (N) | Fruité / Yeppo / Haute harnesses |
| 🚲 Big-dog corner (NE) | Strollers X6, R7, R8 |
| 🛍️ Shopping mall (W) | Cloud Vanilla, Mallow Sling, Soleil carriers |
| 🏠 House (SW) | Yume beds |
| 🚗 Car (SE) | Strollers X3, T6 |
| 🚕 Taxi (S) | Strollers T4, T5 |

To move a zone, edit its `ANCHORS` entry and the matching products' `position`
in `products.js`. To restyle a landmark, edit its builder in `Landmarks.js`.

### 3. Change / add dog breeds — `src/config/breeds.js`

20 small breeds + 12 big breeds ship in, selectable from the in-game **breed
picker** (grouped Small / Big). Each breed is pure data (proportions, ear/tail/
coat type, colors); `player/DogFactory.js` turns it into a 3D dog. **Add a breed
by appending an entry** — it appears in the picker automatically. Set
`size: 'big'` to put it in the Big-dogs group and give it larger `body` params:

```js
{
  id: 'corgi', name: 'Corgi', scale: 0.9,
  body: { length: 0.66, radius: 0.32 }, legLength: 0.18,
  snout: { length: 0.22, flat: 0.1 },
  ears: 'pointy',   // pointy | floppy | bat | button | butterfly
  tail: 'stubby',   // curl | straight | stubby | plume
  coat: 'smooth',   // smooth | fluffy | curly
  colors: { base: 0xd98f43, belly: 0xf3efe6, ears: 0xc2752f, mask: 0x... },
}
```

Change the default breed with `DEFAULT_BREED` at the bottom of the file.

### 4. Replace the dog with a rigged GLB

Drop a rigged dog GLB in `public/character/`, then in `src/config/settings.js`:

```js
assets: { dogModel: '/character/soycraft-dog.glb', dogScale: 1.0 }
```

It looks for animation clips `Idle` / `Walk` / `Run`. When set, the GLB replaces
the procedural breeds entirely. See `public/character/README.md`.

### 5. Change the environment

Drop a low-poly park GLB in `public/world/` and set
`assets.worldModel = '/world/your-park.glb'` in `settings.js`. The procedural
garden is skipped and collision is built from your GLB. See `public/world/README.md`.

### 6. The 3D "soycraft" logo

The wordmark is generated from a rounded font into `src/config/logoPath.js`, then
extruded into 3D by `src/world/Logo.js`. To change the text or font:

```bash
# edit WORD / FONT in scripts/gen-logo.mjs (drop a .ttf next to it), then:
node scripts/gen-logo.mjs
```

Position/size/material live in `Logo.js`.

### 7. Wire up real email capture

The completion form logs the email and shows a thank-you. To send it somewhere
real, replace the marked `TODO` in `src/ui/UI.js` (`_onEmailSubmit`) with a
`fetch()` to Klaviyo / Mailchimp / your Shopify endpoint.

### 8. Brand & tuning

`BRAND` (palette) and `SETTINGS` (world size, speeds, fog, interaction radius,
mobile pixel-ratio caps) both live in `src/config/settings.js`. UI colors/font are
in `src/ui/styles.css`.

---

## Performance notes (mobile-first)

- **Instanced** trees / bushes / rocks (one draw call each), kept to a perimeter ring.
- **Capped pixel ratio** on phones (≤1.5); **fog** limits draw distance.
- **Shadows auto-off on touch devices** (the biggest mobile saving) — kept on desktop.
- **Fewer stars/clouds on mobile**, and the dog-vision post-processing pass only
  runs in first-person (third-person renders straight to screen, no extra cost).
- Night point-lights are off by day (no per-pixel cost) and cast no shadows.
- Procedural dogs/products rebuild cheaply (old geometry is disposed on breed swap).
- `base: './'` so the build works embedded in a subpath / iframe (Instagram, etc).
- Bundle ≈ 190 kB gzipped (mostly Three.js).

Touch vs desktop is detected via `IS_TOUCH` (`config/settings.js`); tune the
mobile fallbacks there and in `SceneSetup.js` / `Sky.js`.

When you add GLBs, keep them low-poly and use compressed (KTX2/Basis) textures.

## Placeholders & data

- Product **data and photos** are real, pulled from soycraft.co (photos hot-linked
  from the Shopify CDN — swap for your own anytime).
- Product **3D models**, the **dogs**, and the **environment** are procedural
  placeholders with clearly-marked GLB swap-in hooks (sections 2–5).
- No real 3D models are bundled.
