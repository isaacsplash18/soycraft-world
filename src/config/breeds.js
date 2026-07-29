/**
 * ============================================================================
 *  SMALL DOG BREEDS  —  parameterized so we can support many breeds cheaply
 * ============================================================================
 *  Each breed is just data. DogFactory.js turns these params into a low-poly
 *  3D dog (no GLB needed). Add a breed by appending an entry here — it shows up
 *  in the in-game breed picker automatically.
 *
 *  Fields:
 *    id, name
 *    scale        overall size multiplier (small breeds differ a lot)
 *    body         { length, radius }   torso capsule
 *    legLength    leg height
 *    snout        { length, flat }     flat in [0..1]; 1 = squished (pug/frenchie)
 *    ears         'pointy' | 'floppy' | 'bat' | 'button' | 'butterfly'
 *    tail         'curl' | 'straight' | 'stubby' | 'plume'
 *    coat         'smooth' | 'fluffy' | 'curly'
 *    colors       { base, belly, ears?, mask? }   hex ints; ears/mask optional
 * ============================================================================
 */

export const BREEDS = [
  {
    id: 'pomeranian', name: 'Pomeranian', scale: 0.85,
    body: { length: 0.42, radius: 0.34 }, legLength: 0.28,
    snout: { length: 0.16, flat: 0.2 }, ears: 'pointy', tail: 'plume', coat: 'fluffy',
    colors: { base: 0xf6f1ea, belly: 0xffffff, ears: 0xe9e2d6 },
  },
  {
    id: 'chihuahua', name: 'Chihuahua', scale: 0.7,
    body: { length: 0.44, radius: 0.26 }, legLength: 0.3,
    snout: { length: 0.2, flat: 0.1 }, ears: 'bat', tail: 'straight', coat: 'smooth',
    colors: { base: 0xc99a63, belly: 0xe2c79b },
  },
  {
    id: 'dachshund', name: 'Dachshund', scale: 0.82,
    body: { length: 0.78, radius: 0.26 }, legLength: 0.2,
    snout: { length: 0.28, flat: 0.05 }, ears: 'floppy', tail: 'straight', coat: 'smooth',
    colors: { base: 0x6b3f1d, belly: 0x8a5a30, ears: 0x4f2d13 },
  },
  {
    id: 'shihtzu', name: 'Shih Tzu', scale: 0.82,
    body: { length: 0.5, radius: 0.32 }, legLength: 0.24,
    snout: { length: 0.14, flat: 0.6 }, ears: 'floppy', tail: 'plume', coat: 'fluffy',
    colors: { base: 0xe8dcc5, belly: 0xf2ecdd, ears: 0xb59a78 },
  },
  {
    id: 'pug', name: 'Pug', scale: 0.86,
    body: { length: 0.5, radius: 0.36 }, legLength: 0.24,
    snout: { length: 0.1, flat: 1.0 }, ears: 'button', tail: 'curl', coat: 'smooth',
    colors: { base: 0xe0c389, belly: 0xeed7a8, mask: 0x2a2a2a },
  },
  {
    id: 'frenchie', name: 'French Bulldog', scale: 0.86,
    body: { length: 0.5, radius: 0.38 }, legLength: 0.24,
    snout: { length: 0.1, flat: 1.0 }, ears: 'bat', tail: 'stubby', coat: 'smooth',
    colors: { base: 0xbdb6ad, belly: 0xe6e2da },
  },
  {
    id: 'corgi', name: 'Corgi', scale: 0.9,
    body: { length: 0.66, radius: 0.32 }, legLength: 0.18,
    snout: { length: 0.22, flat: 0.1 }, ears: 'pointy', tail: 'stubby', coat: 'smooth',
    colors: { base: 0xd98f43, belly: 0xf3efe6, ears: 0xc2752f },
  },
  {
    id: 'maltese', name: 'Maltese', scale: 0.78,
    body: { length: 0.46, radius: 0.3 }, legLength: 0.26,
    snout: { length: 0.16, flat: 0.3 }, ears: 'floppy', tail: 'plume', coat: 'fluffy',
    colors: { base: 0xf4efe6, belly: 0xfbf8f1 },
  },
  {
    id: 'yorkie', name: 'Yorkshire Terrier', scale: 0.72,
    body: { length: 0.44, radius: 0.27 }, legLength: 0.26,
    snout: { length: 0.18, flat: 0.15 }, ears: 'pointy', tail: 'straight', coat: 'fluffy',
    colors: { base: 0x5a5450, belly: 0xb98a4e, ears: 0x8a6a3a },
  },
  {
    id: 'poodle', name: 'Toy Poodle', scale: 0.8,
    body: { length: 0.48, radius: 0.3 }, legLength: 0.32,
    snout: { length: 0.22, flat: 0.1 }, ears: 'floppy', tail: 'plume', coat: 'curly',
    colors: { base: 0xe7d4b0, belly: 0xf2e6cc },
  },
  {
    id: 'shiba', name: 'Shiba Inu', scale: 0.92,
    body: { length: 0.56, radius: 0.32 }, legLength: 0.3,
    snout: { length: 0.22, flat: 0.1 }, ears: 'pointy', tail: 'curl', coat: 'fluffy',
    colors: { base: 0xd97a35, belly: 0xf4ede0, ears: 0xc2671f },
  },
  {
    id: 'jackrussell', name: 'Jack Russell', scale: 0.82,
    body: { length: 0.52, radius: 0.29 }, legLength: 0.3,
    snout: { length: 0.22, flat: 0.1 }, ears: 'button', tail: 'straight', coat: 'smooth',
    colors: { base: 0xf2ece1, belly: 0xfbf8f1, ears: 0xb07a45, mask: 0xb07a45 },
  },
  {
    id: 'bichon', name: 'Bichon Frise', scale: 0.8,
    body: { length: 0.46, radius: 0.33 }, legLength: 0.26,
    snout: { length: 0.14, flat: 0.35 }, ears: 'floppy', tail: 'plume', coat: 'curly',
    colors: { base: 0xfaf6ee, belly: 0xffffff },
  },
  {
    id: 'papillon', name: 'Papillon', scale: 0.74,
    body: { length: 0.46, radius: 0.27 }, legLength: 0.28,
    snout: { length: 0.2, flat: 0.1 }, ears: 'butterfly', tail: 'plume', coat: 'fluffy',
    colors: { base: 0xf4efe6, belly: 0xfbf8f1, ears: 0x7a4a25 },
  },
  {
    id: 'boston', name: 'Boston Terrier', scale: 0.82,
    body: { length: 0.5, radius: 0.32 }, legLength: 0.28,
    snout: { length: 0.12, flat: 0.8 }, ears: 'bat', tail: 'stubby', coat: 'smooth',
    colors: { base: 0x2c2a28, belly: 0xf4efe6, mask: 0xf4efe6 },
  },
  {
    id: 'cavalier', name: 'Cavalier King Charles', scale: 0.85,
    body: { length: 0.54, radius: 0.31 }, legLength: 0.28,
    snout: { length: 0.2, flat: 0.2 }, ears: 'floppy', tail: 'plume', coat: 'fluffy',
    colors: { base: 0xf2ece1, belly: 0xfbf8f1, ears: 0x9c4a22 },
  },
  {
    id: 'schnauzer', name: 'Mini Schnauzer', scale: 0.82,
    body: { length: 0.52, radius: 0.3 }, legLength: 0.3,
    snout: { length: 0.24, flat: 0.1 }, ears: 'button', tail: 'stubby', coat: 'fluffy',
    colors: { base: 0x8a8782, belly: 0xc7c3bc, ears: 0x5a5854 },
  },
  {
    id: 'pekingese', name: 'Pekingese', scale: 0.8,
    body: { length: 0.5, radius: 0.36 }, legLength: 0.18,
    snout: { length: 0.08, flat: 1.0 }, ears: 'floppy', tail: 'plume', coat: 'fluffy',
    colors: { base: 0xd9a04f, belly: 0xeccb8c, mask: 0x3a2a1a },
  },
  {
    id: 'westie', name: 'West Highland Terrier', scale: 0.8,
    body: { length: 0.5, radius: 0.3 }, legLength: 0.28,
    snout: { length: 0.2, flat: 0.15 }, ears: 'pointy', tail: 'straight', coat: 'fluffy',
    colors: { base: 0xf6f1e7, belly: 0xfffdf8 },
  },
  {
    id: 'beagle', name: 'Beagle', scale: 0.9,
    body: { length: 0.6, radius: 0.31 }, legLength: 0.3,
    snout: { length: 0.26, flat: 0.05 }, ears: 'floppy', tail: 'straight', coat: 'smooth',
    colors: { base: 0xb5793f, belly: 0xf4efe6, ears: 0x5a3a1f, mask: 0xf4efe6 },
  },

  // ── BIG DOGS ────────────────────────────────────────────────────────────
  // Bigger body params → clearly larger than the small breeds. `size: 'big'`
  // groups them in the breed picker.
  {
    id: 'golden', name: 'Golden Retriever', size: 'big', scale: 1.6,
    body: { length: 1.0, radius: 0.46 }, legLength: 0.62,
    snout: { length: 0.34, flat: 0.05 }, ears: 'floppy', tail: 'plume', coat: 'fluffy',
    colors: { base: 0xdca85c, belly: 0xeed0a0 },
  },
  {
    id: 'labrador', name: 'Labrador', size: 'big', scale: 1.6,
    body: { length: 1.0, radius: 0.46 }, legLength: 0.62,
    snout: { length: 0.34, flat: 0.05 }, ears: 'floppy', tail: 'straight', coat: 'smooth',
    colors: { base: 0xe3c98f, belly: 0xf2e6cc },
  },
  {
    id: 'gsd', name: 'German Shepherd', size: 'big', scale: 1.65,
    body: { length: 1.05, radius: 0.45 }, legLength: 0.64,
    snout: { length: 0.36, flat: 0.05 }, ears: 'pointy', tail: 'plume', coat: 'fluffy',
    colors: { base: 0xb5793f, belly: 0xe2c79b, mask: 0x2c2622, ears: 0x2c2622 },
  },
  {
    id: 'husky', name: 'Siberian Husky', size: 'big', scale: 1.55,
    body: { length: 0.98, radius: 0.45 }, legLength: 0.6,
    snout: { length: 0.32, flat: 0.05 }, ears: 'pointy', tail: 'curl', coat: 'fluffy',
    colors: { base: 0x9aa3ad, belly: 0xf6f4f0, mask: 0xf6f4f0, ears: 0x4a4f55 },
  },
  {
    id: 'samoyed', name: 'Samoyed', size: 'big', scale: 1.6,
    body: { length: 0.98, radius: 0.5 }, legLength: 0.6,
    snout: { length: 0.3, flat: 0.1 }, ears: 'pointy', tail: 'curl', coat: 'fluffy',
    colors: { base: 0xfaf7f1, belly: 0xffffff },
  },
  {
    id: 'collie', name: 'Border Collie', size: 'big', scale: 1.55,
    body: { length: 1.0, radius: 0.44 }, legLength: 0.62,
    snout: { length: 0.34, flat: 0.05 }, ears: 'pointy', tail: 'plume', coat: 'fluffy',
    colors: { base: 0x2c2a28, belly: 0xf4efe6, mask: 0xf4efe6 },
  },
  {
    id: 'greatdane', name: 'Great Dane', size: 'big', scale: 1.85,
    body: { length: 1.1, radius: 0.46 }, legLength: 0.78,
    snout: { length: 0.36, flat: 0.05 }, ears: 'button', tail: 'straight', coat: 'smooth',
    colors: { base: 0xc9a06a, belly: 0xe2c79b },
  },
  {
    id: 'rottweiler', name: 'Rottweiler', size: 'big', scale: 1.7,
    body: { length: 1.02, radius: 0.5 }, legLength: 0.62,
    snout: { length: 0.3, flat: 0.2 }, ears: 'button', tail: 'stubby', coat: 'smooth',
    colors: { base: 0x2a2420, belly: 0x8a5a2b, mask: 0x8a5a2b },
  },
  {
    id: 'doberman', name: 'Doberman', size: 'big', scale: 1.7,
    body: { length: 1.05, radius: 0.43 }, legLength: 0.7,
    snout: { length: 0.36, flat: 0.05 }, ears: 'pointy', tail: 'stubby', coat: 'smooth',
    colors: { base: 0x241f1c, belly: 0x7a4a25, ears: 0x241f1c },
  },
  {
    id: 'bernese', name: 'Bernese Mountain Dog', size: 'big', scale: 1.75,
    body: { length: 1.05, radius: 0.52 }, legLength: 0.62,
    snout: { length: 0.32, flat: 0.05 }, ears: 'floppy', tail: 'plume', coat: 'fluffy',
    colors: { base: 0x2c2a28, belly: 0xf2ece1, mask: 0xb5793f },
  },
  {
    id: 'boxer', name: 'Boxer', size: 'big', scale: 1.6,
    body: { length: 0.96, radius: 0.46 }, legLength: 0.62,
    snout: { length: 0.18, flat: 0.55 }, ears: 'button', tail: 'stubby', coat: 'smooth',
    colors: { base: 0xc98a4b, belly: 0xf4efe6, mask: 0x2c2622 },
  },
  {
    id: 'dalmatian', name: 'Dalmatian', size: 'big', scale: 1.6,
    body: { length: 1.0, radius: 0.44 }, legLength: 0.66,
    snout: { length: 0.34, flat: 0.05 }, ears: 'floppy', tail: 'straight', coat: 'smooth',
    colors: { base: 0xf6f1e7, belly: 0xffffff, ears: 0x2c2a28 },
  },
];

export const DEFAULT_BREED = 'shiba';
