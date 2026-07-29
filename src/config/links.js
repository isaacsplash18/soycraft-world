/**
 * ============================================================================
 *  EXTERNAL LINK POINTS  — interactive spots that open a URL
 * ============================================================================
 *  These are NOT part of the products the player has to discover (they don't
 *  count toward the counter). Walk up and press E (or tap "Open") to visit.
 *
 *  kind:
 *    'logo'       no prop — uses the central 3D wordmark as its visual
 *    'counter'    a travel-agent check-in counter with an agent figure
 *    'instagram'  an Instagram "follow us" standee
 *
 *  Edit titles / URLs / positions freely.
 * ============================================================================
 */
export const LINKS = [
  {
    id: 'shop',
    kind: 'logo',
    tag: 'SHOP',
    title: 'Soycraft Store',
    subtitle: 'Browse the full range at soycraft.co',
    cta: 'Open shop →',
    icon: '🛍️',
    url: 'https://www.soycraft.co/',
    position: [0, 0, 0],
    radius: 6.5,
    labelHeight: 4.6,
  },
  {
    id: 'furaway',
    kind: 'counter',
    tag: 'TRAVEL PARTNER',
    title: 'Fur Away Journey',
    subtitle: 'Pet travel adventures — follow on Instagram',
    cta: 'Open Instagram →',
    icon: '✈️',
    url: 'https://www.instagram.com/furawayjourney/',
    position: [26, 0, 3],
    radius: 3.8,
    labelHeight: 3.2,
  },
  {
    id: 'instagram',
    kind: 'instagram',
    tag: 'FOLLOW US',
    title: '@soycraft.co',
    subtitle: 'Follow Soycraft on Instagram',
    cta: 'Open Instagram →',
    icon: '📸',
    url: 'https://www.instagram.com/soycraft.co/',
    position: [8, 0, 9],
    radius: 3.4,
    labelHeight: 2.6,
  },
];
