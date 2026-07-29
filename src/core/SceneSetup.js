import * as THREE from 'three';
import { SETTINGS, THEME, IS_TOUCH } from '../config/settings.js';

/**
 * Scene, camera, renderer and lights.
 * Adapted from the 3D-Game-Template-Ultimate reference (sceneSetup.js),
 * retuned for an outdoor park look and mobile performance.
 */
export function createScene() {
  const { world, perf } = SETTINGS;

  // --- Scene + fog (fog doubles as a cheap draw-distance limiter) ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(world.skyColor);
  scene.fog = new THREE.Fog(world.skyColor, world.fogNear, world.fogFar);

  // --- Camera (YXZ order so yaw/pitch compose cleanly, as in the reference) ---
  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.rotation.order = 'YXZ';

  // --- Lights (warm golden-hour key + soft hemisphere fill, §6.1) ---
  // Sky.js refines these per time-of-day; the starting values are the cozy,
  // warm day look driven from THEME so the whole art direction lives in config.
  const hemi = new THREE.HemisphereLight(THEME.hemiSky, THEME.hemiGround, THEME.hemiIntensity);
  hemi.position.set(0, 20, 0);
  scene.add(hemi);

  // Shadows are the single biggest mobile cost — keep them on desktop, off on
  // touch devices (the scene still reads well from the directional + hemi light).
  const enableShadows = perf.shadows && !IS_TOUCH;

  const sun = new THREE.DirectionalLight(THEME.sunColor, THEME.sunIntensity);
  sun.position.set(-14, 26, 10);
  sun.castShadow = enableShadows;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 80;
  sun.shadow.camera.right = world.halfSize;
  sun.shadow.camera.left = -world.halfSize;
  sun.shadow.camera.top = world.halfSize;
  sun.shadow.camera.bottom = -world.halfSize;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  const maxDpr = IS_TOUCH ? perf.maxPixelRatioMobile : perf.maxPixelRatioDesktop;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = enableShadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Keep camera/renderer in sync with the viewport.
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
  });

  return { scene, camera, renderer, sun, hemi };
}
