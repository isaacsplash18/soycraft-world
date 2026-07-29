/**
 * ============================================================================
 *  SOYCRAFT PRODUCTS  —  THE ONLY FILE YOU NEED TO EDIT FOR PRODUCTS
 * ============================================================================
 *  Real products from soycraft.co, placed at the world's landmark "zones"
 *  (see world/Landmarks.js for the matching set-pieces & ANCHORS).
 *
 *  Fields:
 *    id, name
 *    category    'stroller' | 'bag' | 'harness' | 'bed' | 'cushion'
 *                → selects the procedural 3D model (world/ProductModels.js)
 *    zone        which landmark it belongs to (documentation only)
 *    description one-line card blurb
 *    price       display string
 *    accent      hex trim color on the 3D model
 *    image       card photo (live Shopify CDN urls — swap for your own)
 *    shopUrl     product page (opened by "Shop now" and the E key)
 *    position    [x, y(=0), z] in the world (sits near its landmark)
 *    model       OPTIONAL '/products/foo.glb' to override the procedural model
 *
 *    variantId   Numeric Shopify variant ID used to build cart permalinks.
 *                null  → no cart handoff; the wishlist panel shows a "View in
 *                         store" link only and the item is excluded from the
 *                         /cart/ permalink (e.g. DRAFT products).
 *                number → included as `{variantId}:1` in the cart URL.
 *
 *  Variant map last refreshed: 6 Jul 2026 (from Shopify Admin API).
 * ============================================================================
 */

const SHOP = 'https://www.soycraft.co/products/';
const IMG = 'https://cdn.shopify.com/s/files/1/0615/3987/7091/files/';

export const PRODUCTS = [
  // ── PLANE (airline travel) ───────────────────────────────────────────────
  {
    id: 'pet-porter', name: 'Pet Porter Carrier', category: 'bag', zone: 'plane',
    description: 'Airline-compliant carrier built for the cabin under your seat.',
    price: 'S$328', accent: 0x6a6a6a,
    image: IMG + 'flightcompliantpetporterpetcarrier.jpg?v=1771731979',
    shopUrl: SHOP + 'pet-porter-v2-improved-version', position: [27, 0, -9],
    variantId: 46258583306467,
  },
  {
    id: 'x2', name: 'Pet Stroller — X2', category: 'stroller', zone: 'plane',
    description: 'Versatile, jet-set-ready stroller that handles every terminal.',
    price: 'S$340', accent: 0x2c2a28,
    image: IMG + 'X2Black.png?v=1767710961',
    shopUrl: SHOP + 'x2-stroller', position: [28, 0, -1],
    variantId: 45815524393187,
  },

  // ── PARK (walks) ──────────────────────────────────────────────────────────
  {
    id: 'fruite', name: 'Fruité Harness & Leash Set', category: 'harness', zone: 'park',
    description: 'Juicy-bright harness, leash and poop-bag set for park days.',
    price: 'S$81', accent: 0xf94c43,
    image: IMG + 'E1E8F9CF-52B1-4206-91AF-CC428C097647.jpg?v=1765542642',
    shopUrl: SHOP + 'fruite-edit-harness-leash-and-poop-bag-set', position: [0, 0, -26],
    variantId: 47371042554083,
  },

  // ── BIG-DOG CORNER (bicycle) ──────────────────────────────────────────────
  {
    id: 'x6', name: 'Pet Stroller — X6', category: 'stroller', zone: 'bigdog',
    description: 'Fully collapsible and roomy — great for a bigger best friend.',
    price: 'S$400', accent: 0xf94c43,
    image: IMG + '319F1A6C-14E1-4968-A608-67D56B1C18DE.jpg?v=1775460634',
    shopUrl: SHOP + 'x6-stroller', position: [20, 0, -23],
    variantId: 46305392460003,
  },
  {
    id: 'r7', name: 'Pet Stroller — R7', category: 'stroller', zone: 'bigdog',
    description: 'Plush, spacious ride with a panoramic canopy.',
    price: 'S$400', accent: 0xc98a8a,
    image: IMG + 'IMG-0194.png?v=1772733140',
    shopUrl: SHOP + 'r7-stroller', position: [27, 0, -32],
    variantId: 47914077126883,
  },
  {
    id: 'r8', name: 'Pet Stroller / Bike Trailer — R8', category: 'stroller', zone: 'bigdog',
    description: 'Stroller and bike trailer in one — for the long-haul adventurers.',
    price: 'S$550', accent: 0x3d8361,
    image: IMG + 'harnessandleash.png?v=1762577727',
    shopUrl: SHOP + 'pet-stroller-r8', position: [33, 0, -24],
    variantId: 46805721743587,
  },

  // ── SHOPPING MALL (carriers) ──────────────────────────────────────────────
  {
    id: 'vanilla-cloud', name: 'Cloud Carrier — Vanilla', category: 'bag', zone: 'mall',
    description: 'The cloud-soft carrier in a warm oat-milk vanilla cream.',
    price: 'S$220', accent: 0xeae3d6,
    image: IMG + 'petbedcozywaterproof-75.jpg?v=1755253331',
    shopUrl: SHOP + 'cloud-edit-in-oat-milk-creme-ivory-vanilla-size-m', position: [-29, 0, -7],
    variantId: 46951238238435,
  },
  {
    id: 'mallow-sling', name: 'Mallow Sling — Dusty Rose', category: 'bag', zone: 'mall',
    description: 'Hands-free shoulder sling in a soft, marshmallowy rose.',
    price: 'S$220', accent: 0xd79b9b,
    image: IMG + '4F0991AA-97A5-4872-8ADC-FBC3A3F17E28.jpg?v=1771576002',
    shopUrl: SHOP + 'mallow-sling-bag-dusty-rose', position: [-29, 0, 0],
    variantId: 46951226507491,
  },
  {
    id: 'soleil', name: 'Soleil Woven Carrier', category: 'bag', zone: 'mall',
    description: 'A sun-drenched woven carrier — breezy, structured, chic.',
    price: 'S$220', accent: 0xe0b15a,
    image: IMG + 'EBITDA-913.jpg?v=1751339323',
    shopUrl: SHOP + 'soleil-carrier', position: [-29, 0, 7],
    variantId: 46306007089379,
  },

  // ── HOUSE (beds & cushions) ───────────────────────────────────────────────
  {
    id: 'yume-bed', name: 'Yume Bed (M)', category: 'bed', zone: 'house',
    description: 'A cloud-soft bolster bed for the deepest of puppy dreams.',
    price: 'S$90', accent: 0xc7b8a0,
    image: IMG + 'yume_bed_M-07.jpg?v=1780197408',
    shopUrl: SHOP + 'yume-bed', position: [-22, 0, 23],
    variantId: 45899007197411,
  },
  {
    id: 'moon-hug', name: 'Moon Hug Cushion', category: 'cushion', zone: 'house',
    description: 'A cooling cushion that hugs back on warm afternoons.',
    price: 'S$35', accent: 0x8aa6c9,
    image: IMG + 'BE870F9D-65F6-40A7-BB1A-CE777AFD9775.jpg?v=1771731979',
    shopUrl: SHOP + 'moon-hug-cushion', position: [-24, 0, 30],
    variantId: 46078924783843,
  },
  {
    id: 'rollie-pollie', name: 'Rollie Pollie Cushion', category: 'cushion', zone: 'house',
    description: 'A plump, roly-poly cushion made for flopping onto.',
    price: 'S$41', accent: 0xe0a85a,
    image: IMG + '9D64D412-EA97-4E63-AD42-3BB0A038EA30.jpg?v=1772162742',
    shopUrl: SHOP + 'pet-porter-cushion', position: [-21, 0, 28],
    variantId: 47761919377635,
  },

  // ── CAR (on the mall road) ────────────────────────────────────────────────
  {
    id: 'x3', name: 'Pet Stroller — X3', category: 'stroller', zone: 'car',
    description: 'Versatile everyday stroller that folds into the boot with ease.',
    price: 'S$380', accent: 0x8aa6c9,
    image: IMG + 'sgpf_817699ca-e4aa-4c4d-8ed4-22ffa124b9aa.png?v=1758268569',
    shopUrl: SHOP + 'pet-stroller-x3', position: [-27, 0, -13],
    variantId: 46772080935139,
  },
  {
    id: 't6', name: 'Pet Stroller — T6', category: 'stroller', zone: 'car',
    description: 'Detachable basket lifts straight into the car seat.',
    price: 'S$300', accent: 0x6a6a6a,
    image: IMG + '45_7bf2811f-0ccd-4423-8528-ccf371bc920b.jpg?v=1706427375',
    shopUrl: SHOP + 'stroller-t6', position: [-19, 0, -11],
    variantId: null, // DRAFT on Shopify — not purchasable; cart falls back to shop page
  },

  // ── TAXI (on the mall road) ───────────────────────────────────────────────
  {
    id: 't4', name: 'Pet Stroller — T4', category: 'stroller', zone: 'taxi',
    description: 'Fully collapsible — folds in one motion for the cab.',
    price: 'S$300', accent: 0xc7b8a0,
    image: IMG + 'PetStroller-T4Beige.jpg?v=1715192952',
    shopUrl: SHOP + 'pet-stroller-t4', position: [-27, 0, 13],
    variantId: 45815513481443,
  },
  {
    id: 't5', name: 'Pet Stroller — T5', category: 'stroller', zone: 'taxi',
    description: 'Lightweight, collapsible, and ready to hail a ride.',
    price: 'S$350', accent: 0x2c2a28,
    image: IMG + 'T5beige.png?v=1736139848',
    shopUrl: SHOP + 'pet-stroller-t5', position: [-19, 0, 11],
    variantId: 45821261644003,
  },
];
