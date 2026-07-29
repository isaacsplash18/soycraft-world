// One-off generator for placeholder product card images.
// Run: node scripts/gen-placeholders.mjs
// These SVGs are intentionally simple stand-ins.
// TODO: replace the generated files in /public/products with real product photos.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'products');
mkdirSync(outDir, { recursive: true });

// [filename, label, hex] — must match image paths in src/config/products.js
const items = [
  ['placeholder-stroller.svg', 'Stroller', '#e07a5f'],
  ['placeholder-carrier.svg', 'Carrier', '#81b29a'],
  ['placeholder-sling.svg', 'Sling', '#f2cc8f'],
  ['placeholder-backpack.svg', 'Backpack', '#6d9dc5'],
  ['placeholder-double.svg', 'Double', '#b56576'],
  ['placeholder-bed.svg', 'Travel Bed', '#9c89b8'],
  ['placeholder-trolley.svg', 'Trolley', '#3d8361'],
];

const svg = (label, hex) => `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
  <rect width="320" height="240" fill="${hex}" opacity="0.18"/>
  <rect x="70" y="60" width="180" height="120" rx="14" fill="${hex}"/>
  <circle cx="110" cy="190" r="16" fill="#2b2b2b"/>
  <circle cx="210" cy="190" r="16" fill="#2b2b2b"/>
  <text x="160" y="128" font-family="system-ui, sans-serif" font-size="24" font-weight="700"
    fill="#fff" text-anchor="middle">${label}</text>
  <text x="160" y="222" font-family="system-ui, sans-serif" font-size="13"
    fill="#5a5a5a" text-anchor="middle">placeholder — replace with photo</text>
</svg>`;

for (const [file, label, hex] of items) {
  writeFileSync(join(outDir, file), svg(label, hex));
  console.log('wrote', file);
}
