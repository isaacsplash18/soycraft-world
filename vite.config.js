import { defineConfig } from 'vite';

// Standard Vite config for a vanilla JS + Three.js app.
// `base: './'` makes the production build portable (works when embedded in a
// subpath, an iframe, or a static host) — important since most traffic is
// mobile / Instagram in-app browsers.
export default defineConfig({
  base: './',
  server: {
    host: true, // expose on LAN so you can test on a real phone
    port: 5173,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
  },
});
