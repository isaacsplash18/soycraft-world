import * as THREE from 'three';

import { createScene } from './core/SceneSetup.js';
import { Sky } from './world/Sky.js';
import { DogVision } from './world/DogVision.js';
import { Links } from './world/Links.js';
import { Bark } from './world/Bark.js';
import { World } from './core/World.js';
import { Physics } from './physics/Physics.js';
import { Player } from './player/Player.js';
import { Controls } from './controls/Controls.js';
import { Products } from './products/Products.js';
import { UI } from './ui/UI.js';
import { PhotoShare } from './share/PhotoShare.js';
import { PRODUCTS } from './config/products.js';
import { Wishlist } from './shop/Wishlist.js';
import { analytics } from './core/Analytics.js';
import { withUtm } from './shop/storeLink.js';
import { identity, COAT_COLOURS, ACCESSORIES } from './player/DogIdentity.js';
import { ACTIVE_THEME } from './config/themes.js';
import { buildSeasonalDressing } from './world/SeasonalDressing.js';

/**
 * Soycraft World — entry point.
 *
 * Wires the modules together and runs a fixed-timestep loop (the same pattern
 * as the 3D-Game-Template-Ultimate reference: physics is stepped N times per
 * rendered frame for stable collision regardless of framerate).
 */
const STEPS_PER_FRAME = 5;
const clock = new THREE.Clock();

async function boot() {
  // §6.5 Apply seasonal CSS custom-property overrides to :root so UI elements
  // (buttons, badges, accents) reflect the active theme immediately — before
  // any rendering or DOM manipulation by other modules.
  for (const [prop, value] of Object.entries(ACTIVE_THEME.cssVars)) {
    document.documentElement.style.setProperty(prop, value);
  }

  // 0. Analytics — initialise early; fires Meta Pixel PageView if configured.
  analytics.init();
  // §6.5 Include the active season id so every downstream event is segmented.
  analytics.track('session_start', { season: ACTIVE_THEME.id });

  // 1. Renderer / scene / camera
  const { scene, camera, renderer, sun, hemi } = createScene();
  document.getElementById('container').appendChild(renderer.domElement);

  // Time-of-day sky (day / golden hour / night) based on the user's local clock.
  const sky = new Sky({ scene, renderer, sun, hemi });

  // 2. Wishlist (localStorage-backed)
  const wishlist = new Wishlist();

  // 3. Input + UI
  const controls = new Controls(renderer.domElement);
  const ui = new UI({ controls, wishlist, analytics });
  ui.setTotal(PRODUCTS.length);

  // 4. World (placeholder park or GLB) -> collidable group
  const world = new World(scene);
  const collidables = await world.build();
  sky.apply(sky.presetName); // sync night lamps/emissives created during build

  // §6.5 Seasonal dressing — decorative props added OUTSIDE the collidable
  // group so the Octree (built later) is never affected. Safe to call here
  // because night-emissive registration is ready after sky.apply() above.
  buildSeasonalDressing(scene, ACTIVE_THEME);
  // Re-sync sky so lantern night emissives (registered above) get the correct
  // initial intensity for the current time-of-day preset.
  sky.apply(sky.presetName);

  ui.setProgress(60);

  // §6.5 Featured product ids — products that get an enhanced hero glow when
  // the active theme flags them as seasonal highlights.
  const _featuredIds = new Set(ACTIVE_THEME.featuredProductIds ?? []);

  // 5. Product props (added into the same collidable group)
  const products = new Products(scene, {
    onEnterRange: (product, isNew) => {
      ui.showCard(product);
      if (isNew) analytics.track('product_discovered', { id: product.id, name: product.name });
    },
    onLeaveRange: () => ui.hideCard(),
    onDiscover: (count, total) => {
      ui.setCount(count);
      if (count >= total) {
        // Let the player read the final card, then celebrate.
        setTimeout(() => ui.showCompletion(), 1300);
      }
    },
  });
  products.build(collidables, _featuredIds);

  // 5b. External link points (shop, Fur Away Journey, Instagram) — not counted
  // toward discovery.
  const links = new Links(scene, {
    onEnter: (link) => ui.showLinkCard(link),
    onLeave: () => ui.hideLinkCard(),
  });
  links.build(collidables);
  ui.setProgress(80);

  // 6. Physics — build the Octree from everything collidable
  const physics = new Physics();
  physics.buildFrom(collidables);
  physics.attachHelper(scene);

  // 7. Player (capsule + camera rig + character)
  // Player reads identity.breedId on construction so URL/localStorage prefs apply.
  const player = new Player(scene, camera);

  // Dog-vision post-processing (only rendered in first-person).
  const dogVision = new DogVision(renderer, scene, camera);

  // Single source of truth for "render one frame to the canvas": first-person
  // goes through the dog-vision filter, third-person renders straight. Reused by
  // the game loop AND by PhotoShare (which needs fresh pixels at capture time,
  // since the renderer has no preserveDrawingBuffer).
  const renderFrame = () => {
    if (player.viewMode === 'first') dogVision.render(1);
    else renderer.render(scene, camera);
  };

  // §6.2 Photo / Share moment — one-tap branded still of the dog.
  const photo = new PhotoShare({
    renderer, scene, camera, player, products, analytics, renderFrame,
  });
  ui.setupPhoto(() => { if (started) photo.capture(); });

  // In-game breed picker — populate from the player's breed list, switch on change.
  // Changing breed in-game preserves the current coat + accessory (setBreed reads identity).
  ui.setupBreedPicker(player.breeds, player.breedId, (id) => player.setBreed(id));

  // Start screen — extended with name input, coat swatches, and accessory pills.
  // Until "Start" is pressed the world renders (dog on show) but movement is frozen.
  let started = false;
  ui.setupStartScreen(
    player.breeds,
    {
      identity,
      coatColours: COAT_COLOURS,
      accessories: ACCESSORIES,

      onBreedChange: (id) => {
        identity.set({ breedId: id });
        player.setBreed(id);
        // Keep the in-game picker in sync.
        const picker = document.getElementById('breed-select');
        if (picker) picker.value = id;
      },

      onCoatChange: (id) => {
        identity.set({ coat: id });
        player.setCoat(id);
      },

      onAccessoryChange: (id) => {
        identity.set({ accessory: id });
        player.setAccessory(id);
      },

      onNameChange: (name) => {
        player.setDogName(name);
      },
    },
    () => {
      started = true;
      // Ensure name is committed (user may have typed without blur).
      identity.commit();
      // §6.3 analytics: fire once when the player presses Start.
      analytics.track('dog_customised', {
        breed:     identity.breedId,
        coat:      identity.coat,
        accessory: identity.accessory,
        named:     !!identity.name,
      });
      analytics.track('game_start');
    }
  );

  // §6.5 Seasonal completion copy — mention the drop name when a theme is active.
  if (ACTIVE_THEME.id !== 'default') {
    const completionP = document.querySelector('#completion .completion-card p:first-of-type');
    if (completionP) {
      completionP.textContent =
        `You found every product — happy ${ACTIVE_THEME.name}! Want early access to future drops?`;
    }
  }

  // Bark button (+ B key) — synth bark pitched to the breed, plus an animation.
  const bark = new Bark();
  const doBark = () => {
    bark.play(player.currentBreed);
    player.bark();
  };
  ui.setupBark(doBark);

  // Unlock audio on the very first user interaction (required on iOS/mobile).
  const unlockAudio = () => bark.unlock();
  ['touchstart', 'pointerdown', 'mousedown', 'keydown'].forEach((ev) =>
    window.addEventListener(ev, unlockAudio, { once: true, passive: true })
  );

  ui.setProgress(100);
  ui.hideLoading();

  // Dev-only debug hook (handy for testing / tweaking; no effect in play).
  if (import.meta.env?.DEV) {
    window.__soy = {
      scene, camera, renderer, player, products, links, controls,
      physics, ui, sky, dogVision, wishlist, analytics, photo,
      identity, // identity.shareUrl() + identity.displayName for photo/share agent
      theme: ACTIVE_THEME, // active season — useful for testing (?season=lunar)
    };
  }

  // Keyboard: H toggles the Octree wireframe, B barks.
  window.addEventListener('keydown', (e) => {
    const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
    if (typing) return;
    if (e.code === 'KeyH' && !e.repeat) physics.toggleHelper();
    if (e.code === 'KeyB' && !e.repeat) doBark();
    if (e.code === 'KeyP' && !e.repeat && started) photo.capture();
  });

  // Preload the brand logo during boot idle so the first capture is instant
  // (no per-frame cost — this is a one-off network fetch, then cached).
  const preloadPhoto = () => photo.preload();
  if ('requestIdleCallback' in window) requestIdleCallback(preloadPhoto, { timeout: 4000 });
  else setTimeout(preloadPhoto, 2000);

  // 8. Loop
  function animate() {
    const frameDelta = Math.min(0.05, clock.getDelta());
    const dt = frameDelta / STEPS_PER_FRAME;

    // Before "Start": freeze movement/input so the dog just stands on show.
    if (started) controls.update();
    else {
      controls.input.move.x = 0;
      controls.input.move.y = 0;
    }

    for (let i = 0; i < STEPS_PER_FRAME; i++) {
      player.update(dt, physics.octree, controls.input);
    }

    sky.update(frameDelta);

    if (started) {
      products.update(frameDelta, player.position);
      links.update(frameDelta, player.position);

      // E (or the mobile Shop button) opens whatever you're standing next to —
      // a product page, or an external link point (shop / partner / Instagram).
      if (controls.input.consumeInteract()) {
        if (products.activeProduct) {
          analytics.track('store_link_open', { id: products.activeProduct.id });
          window.open(withUtm(products.activeProduct.shopUrl), '_blank', 'noopener');
        } else if (links.activeLink) {
          const url = links.activeLink.url?.includes('soycraft.co')
            ? withUtm(links.activeLink.url)
            : links.activeLink.url;
          analytics.track('store_link_open', { id: links.activeLink.id || links.activeLink.url });
          window.open(url, '_blank', 'noopener');
        }
      }
    }

    // First-person renders through the dog-vision filter; third-person renders
    // straight (no post-processing cost when you don't need it).
    renderFrame();
  }

  renderer.setAnimationLoop(animate);
}

boot().catch((err) => {
  console.error('Failed to start Soycraft World:', err);
  const msg = document.querySelector('.loading-text');
  if (msg) msg.textContent = 'Something went wrong loading the game.';
});
