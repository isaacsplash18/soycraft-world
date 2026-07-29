import * as THREE from 'three';
import { IS_TOUCH } from '../config/settings.js';
import { ACTIVE_THEME } from '../config/themes.js';

/**
 * Time-of-day sky.
 *
 * Picks a preset from the user's LOCAL clock:
 *   • day        — blue gradient sky + drifting clouds + warm high sun
 *   • golden     — warm sunset gradient + low golden sun (dawn & dusk)
 *   • night      — deep navy + twinkling stars + a glowing moon
 *
 * Adjusts the gradient skydome, fog, hemisphere/sun light, tone-mapping
 * exposure, clouds, stars and the sun/moon disc to match.
 *
 * Override for testing: add `?sky=day|golden|night` to the URL, or press **T**
 * in-game to cycle through the presets.
 */

const PRESETS = {
  day: {
    // Soft warm "golden-hour" day — gentle blue zenith melting into a warm
    // peach horizon, cozy butter sun. Reads as a designed, premium space (§6.1).
    sky: { top: 0x7fb4e2, bottom: 0xffe4c1 },
    fog: 0xffe6cd,
    hemi: { sky: 0xffe9cf, ground: 0xd6b58c, intensity: 1.15 },
    sun: { color: 0xfff0cf, intensity: 2.2, dir: [-0.45, 0.82, 0.32] },
    exposure: 1.04,
    clouds: { color: 0xfff6ea, opacity: 1.0, visible: true }, // creamy stylised puffs
    stars: false,
    moon: false,
    sunDisc: { color: 0xfff3d6, size: 30, glow: 0xffe6b8 },
  },
  golden: {
    sky: { top: 0x6a5690, bottom: 0xffb673 }, // purple zenith → warm horizon
    fog: 0xffc59a,
    hemi: { sky: 0xffc79a, ground: 0x8a6a4a, intensity: 1.05 },
    sun: { color: 0xff7a33, intensity: 2.2, dir: [-0.95, 0.18, 0.25] },
    exposure: 1.05,
    // pink sunset clouds — emissive so they stay pink under the orange sun
    clouds: { color: 0xffc6da, opacity: 1.0, visible: true, emissive: 0xff5f97, emissiveIntensity: 0.55 },
    stars: false,
    moon: false,
    sunDisc: { color: 0xffa64d, size: 40, glow: 0xff8a3d },
  },
  night: {
    // Moonlit night — bright enough to roam, but a touch dimmer than before.
    sky: { top: 0x0a142f, bottom: 0x324b75 },
    fog: 0x2e4163,
    hemi: { sky: 0x6c80b0, ground: 0x303c56, intensity: 1.12 },
    sun: { color: 0xe2eaff, intensity: 1.65, dir: [0.4, 0.85, -0.3] }, // moonlight
    exposure: 1.12,
    clouds: { color: 0x9aa6c8, opacity: 0.5, visible: true },
    stars: true,
    moon: true,
    sunDisc: null,
  },
};

const SKY_RADIUS = 480;

export class Sky {
  constructor({ scene, renderer, sun, hemi }) {
    this.scene = scene;
    this.renderer = renderer;
    this.sun = sun;
    this.hemi = hemi;
    this.clouds = [];
    this._t = 0;

    // Registry for landmark lights/emissives that switch ON only at night.
    this.scene.userData.nightLights ||= [];
    this.scene.userData.nightEmissives ||= [];

    // §6.5 Merge active-theme sky-preset overrides on top of the base PRESETS.
    // A theme's skyPresets object provides only the keys it wants to change;
    // the rest fall through to the base values. Deep-merge one level down.
    this._presets = _deepMergePresets(PRESETS, ACTIVE_THEME.skyPresets);

    this._buildDome();
    this._buildSunDisc();
    this._buildMoon();
    this._buildStars();
    this._buildClouds();

    // Resolve preset order for the T-key cycle.
    this._order = ['day', 'golden', 'night'];
    this.presetName = this._resolveInitial();
    this.apply(this.presetName);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyT' && !e.repeat) {
        const i = this._order.indexOf(this.presetName);
        this.apply(this._order[(i + 1) % this._order.length]);
      }
    });
  }

  _resolveInitial() {
    const override = new URLSearchParams(location.search).get('sky');
    if (override && PRESETS[override]) return override;
    const h = new Date().getHours(); // user's LOCAL hour
    if (h >= 8 && h < 17) return 'day';
    if ((h >= 6 && h < 8) || (h >= 17 && h < 19)) return 'golden';
    return 'night';
  }

  // ── Build ───────────────────────────────────────────────────────────────
  _buildDome() {
    this._domeUniforms = {
      top: { value: new THREE.Color(0x3f8fe0) },
      bottom: { value: new THREE.Color(0xcfe8fb) },
      offset: { value: 12 },
      exponent: { value: 0.7 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this._domeUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 top; uniform vec3 bottom;
        uniform float offset; uniform float exponent;
        varying vec3 vPos;
        void main() {
          float h = normalize(vPos + vec3(0.0, offset, 0.0)).y;
          float t = pow(max(h, 0.0), exponent);
          gl_FragColor = vec4(mix(bottom, top, t), 1.0);
        }`,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS, 32, 16), mat);
    this.dome.renderOrder = -1;
    this.scene.add(this.dome);
  }

  _buildSunDisc() {
    this.sunDisc = makeGlowSprite(0xffffff, 0xfff2cf);
    this.sunDisc.visible = false;
    this.scene.add(this.sunDisc);
  }

  _buildMoon() {
    this.moon = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(19, 28, 28),
      new THREE.MeshBasicMaterial({ color: 0xfffdf3, fog: false })
    );
    this.moon.add(body);
    // a few subtle craters
    for (const [x, y, z, r] of [[6, 5, 16, 3.4], [-7, -4, 16, 2.8], [3, -9, 16, 2.1], [-4, 9, 16, 1.8]]) {
      const c = new THREE.Mesh(
        new THREE.CircleGeometry(r, 16),
        new THREE.MeshBasicMaterial({ color: 0xe9e2cb, fog: false })
      );
      c.position.set(x, y, z);
      c.lookAt(x * 3, y * 3, z * 3);
      this.moon.add(c);
    }
    // big soft halo so it reads as a bright light source
    const glow = makeGlowSprite(0xffffff, 0xb8c4e8);
    glow.scale.setScalar(170);
    this.moon.add(glow);
    this.moon.visible = false;
    this.scene.add(this.moon);
  }

  _buildStars() {
    const COUNT = IS_TOUCH ? 340 : 700;
    const positions = new Float32Array(COUNT * 3);
    const v = new THREE.Vector3();
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < COUNT; i++) {
      // upper hemisphere, on a shell just inside the dome
      const u = rnd();
      const theta = rnd() * Math.PI * 2;
      const phi = Math.acos(0.15 + u * 0.85); // bias toward overhead
      v.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
      v.multiplyScalar(SKY_RADIUS * 0.9);
      positions.set([v.x, Math.abs(v.y), v.z], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.2,
      sizeAttenuation: true,
      transparent: true,
      fog: false,
      depthWrite: false,
    });
    this.stars = new THREE.Points(geo, this.starMat);
    this.stars.visible = false;
    this.scene.add(this.stars);
  }

  _buildClouds() {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    this.cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      flatShading: true,
      fog: false,
      transparent: true,
      opacity: 1,
    });
    let seed = 99;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const cloudCount = IS_TOUCH ? 14 : 24; // plenty, so golden hour is full of clouds
    for (let i = 0; i < cloudCount; i++) {
      const cloud = new THREE.Group();
      const puffs = 3 + Math.floor(rnd() * 3);
      for (let p = 0; p < puffs; p++) {
        const puff = new THREE.Mesh(geo, this.cloudMat);
        puff.position.set((p - puffs / 2) * 3 + rnd() * 1.5, rnd() * 1.5, rnd() * 2);
        puff.scale.set(3 + rnd() * 2.5, 2 + rnd() * 1.2, 3 + rnd() * 2);
        cloud.add(puff);
      }
      cloud.position.set((rnd() * 2 - 1) * 110, 42 + rnd() * 26, (rnd() * 2 - 1) * 110);
      cloud.userData.speed = 0.6 + rnd() * 0.8;
      this.clouds.push(cloud);
      this.scene.add(cloud);
    }
  }

  // ── Apply a preset ────────────────────────────────────────────────────────
  apply(name) {
    const p = this._presets[name];
    if (!p) return;
    this.presetName = name;

    this._domeUniforms.top.value.setHex(p.sky.top);
    this._domeUniforms.bottom.value.setHex(p.sky.bottom);

    if (this.scene.fog) this.scene.fog.color.setHex(p.fog);
    this.scene.background = new THREE.Color(p.sky.bottom);

    this.hemi.color.setHex(p.hemi.sky);
    this.hemi.groundColor.setHex(p.hemi.ground);
    this.hemi.intensity = p.hemi.intensity;

    this.sun.color.setHex(p.sun.color);
    this.sun.intensity = p.sun.intensity;
    const d = new THREE.Vector3(...p.sun.dir).normalize();
    this.sun.position.copy(d).multiplyScalar(40);

    this.renderer.toneMappingExposure = p.exposure;

    // clouds
    this.cloudMat.color.setHex(p.clouds.color);
    this.cloudMat.opacity = p.clouds.opacity;
    if (p.clouds.emissive != null) {
      this.cloudMat.emissive.setHex(p.clouds.emissive);
      this.cloudMat.emissiveIntensity = p.clouds.emissiveIntensity ?? 0.5;
    } else {
      this.cloudMat.emissiveIntensity = 0;
    }
    for (const c of this.clouds) c.visible = p.clouds.visible;

    // stars + moon
    this.stars.visible = p.stars;
    this.moon.visible = p.moon;
    if (p.moon) {
      // place the moon along the light direction
      this.moon.position.copy(d).multiplyScalar(SKY_RADIUS * 0.78);
    }

    // sun disc
    if (p.sunDisc) {
      this.sunDisc.visible = true;
      this.sunDisc.material.color.setHex(p.sunDisc.glow);
      this.sunDisc.scale.setScalar(p.sunDisc.size);
      this.sunDisc.position.copy(d).multiplyScalar(SKY_RADIUS * 0.8);
    } else {
      this.sunDisc.visible = false;
    }

    // Night light sources (street lamps, mall/plane windows, headlights).
    const night = name === 'night';
    for (const L of this.scene.userData.nightLights) L.intensity = night ? (L.userData.ni ?? 1) : 0;
    for (const m of this.scene.userData.nightEmissives) {
      m.emissiveIntensity = night ? (m.userData.ne ?? 1) : 0;
    }
  }

  // ── Per-frame ───────────────────────────────────────────────────────────
  update(dt) {
    this._t += dt;
    // drift clouds; wrap around
    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 120) c.position.x = -120;
    }
    // gentle star twinkle
    if (this.stars.visible) {
      this.starMat.opacity = 0.65 + Math.sin(this._t * 1.5) * 0.2;
      this.stars.rotation.y += dt * 0.005;
    }
  }
}

/**
 * Register a light that should be ON only at night (intensity stored, set to 0
 * until the Sky switches to the night preset). Used for street lamps, headlights
 * and interior lights placed by World / Landmarks.
 */
export function registerNightLight(scene, light, intensity) {
  (scene.userData.nightLights ||= []).push(light);
  light.userData.ni = intensity;
  light.intensity = 0;
}

/** Register a material to glow (emissive) only at night — windows, lamp bulbs. */
export function registerNightEmissive(scene, material, color, intensity = 1) {
  (scene.userData.nightEmissives ||= []).push(material);
  material.emissive = new THREE.Color(color);
  material.userData.ne = intensity;
  material.emissiveIntensity = 0;
  return material;
}

// §6.5 Merge theme skyPreset overrides on top of the base PRESETS.
// Only the explicitly supplied keys are overridden; all others fall through.
function _deepMergePresets(base, overrides) {
  if (!overrides) return base;
  const merged = {};
  for (const name of Object.keys(base)) {
    const over = overrides[name];
    if (!over) { merged[name] = base[name]; continue; }
    // One-level deep merge (sky/hemi/sun/clouds/sunDisc are shallow objects).
    const m = { ...base[name] };
    for (const [k, v] of Object.entries(over)) {
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        m[k] = { ...base[name][k], ...v };
      } else {
        m[k] = v;
      }
    }
    merged[name] = m;
  }
  return merged;
}

// Soft radial-gradient sprite used for sun glow + moon halo.
function makeGlowSprite(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  const ci = new THREE.Color(inner);
  const co = new THREE.Color(outer);
  g.addColorStop(0, `rgba(${(ci.r * 255) | 0},${(ci.g * 255) | 0},${(ci.b * 255) | 0},1)`);
  g.addColorStop(0.35, `rgba(${(co.r * 255) | 0},${(co.g * 255) | 0},${(co.b * 255) | 0},0.85)`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false })
  );
  sprite.scale.setScalar(26);
  return sprite;
}
