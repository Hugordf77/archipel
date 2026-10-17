import * as THREE from 'three';
import { U } from '../../core/globals.js';

// Palettes clés (heures « canoniques » : lever 6.5, coucher 19.5).
// Les ombres sont toujours teintées (violet / bleu), jamais noires.
const KEYS = [
  {
    h: 0, name: 'nuit',
    skyTop: '#1c2654', skyHorizon: '#3e5592', sunGlow: '#6f7fc0', sun: '#93a8e2', skyAmb: '#4f62a2', groundAmb: '#2c2f5c',
    shadowTint: '#5254a0', fog: '#3a4d88', waterShallow: '#3d82a2', waterDeep: '#1b3668', sand: '#8e93b6',
    cloudLit: '#8290c8', cloudShade: '#3e4884', rim: '#a3b8ff', stars: 1, night: 1,
  },
  {
    h: 5.4, name: 'avant-aube',
    skyTop: '#2f3a78', skyHorizon: '#9c88ba', sunGlow: '#e8a0b4', sun: '#b9a8d8', skyAmb: '#7d7fbe', groundAmb: '#5a4f80',
    shadowTint: '#6a62aa', fog: '#8a82b4', waterShallow: '#6fa8c0', waterDeep: '#2f4f88', sand: '#c5b0b8',
    cloudLit: '#d8a8c4', cloudShade: '#6f6aa8', rim: '#f0b0c4', stars: 0.5, night: 0.75,
  },
  {
    h: 6.6, name: 'aube',
    skyTop: '#93a6de', skyHorizon: '#ffc9cf', sunGlow: '#ffb39e', sun: '#ffe2d0', skyAmb: '#d4c8f0', groundAmb: '#f2c4c8',
    shadowTint: '#9a8ad0', fog: '#f6cad2', waterShallow: '#a2dad8', waterDeep: '#5c88c2', sand: '#f3d8c8',
    cloudLit: '#ffdade', cloudShade: '#b5a2d8', rim: '#ffd2b2', stars: 0, night: 0.12,
  },
  {
    h: 8.4, name: 'matin',
    skyTop: '#78bcec', skyHorizon: '#e0f2f2', sunGlow: '#fff0cc', sun: '#fff7ea', skyAmb: '#c0e0f2', groundAmb: '#e6dcc4',
    shadowTint: '#8286cc', fog: '#d9eff2', waterShallow: '#90e4d6', waterDeep: '#3f9cc6', sand: '#f4e2b6',
    cloudLit: '#ffffff', cloudShade: '#c5cbec', rim: '#fff2d2', stars: 0, night: 0,
  },
  {
    h: 12.5, name: 'midi doré',
    skyTop: '#62b4ec', skyHorizon: '#e6f4ec', sunGlow: '#fff1c2', sun: '#fff6e2', skyAmb: '#c6e4f0', groundAmb: '#efe0bc',
    shadowTint: '#8287d0', fog: '#ddf0ee', waterShallow: '#8ee9d6', waterDeep: '#38a0cc', sand: '#f5e2b4',
    cloudLit: '#fffdf4', cloudShade: '#c8cdee', rim: '#fff0c4', stars: 0, night: 0,
  },
  {
    h: 16.0, name: 'après-midi',
    skyTop: '#7ab7e6', skyHorizon: '#f3ecd2', sunGlow: '#ffe0a4', sun: '#ffe8ba', skyAmb: '#cddbe8', groundAmb: '#f0d9b0',
    shadowTint: '#837ac4', fog: '#ece8d4', waterShallow: '#92e0cc', waterDeep: '#3f94c4', sand: '#f4dfb0',
    cloudLit: '#fff4dc', cloudShade: '#c9c0e2', rim: '#ffdba2', stars: 0, night: 0,
  },
  {
    h: 18.2, name: 'heure dorée',
    skyTop: '#8a9fd8', skyHorizon: '#ffcf94', sunGlow: '#ffac6a', sun: '#ffd49e', skyAmb: '#e6bcc8', groundAmb: '#f6c496',
    shadowTint: '#9e82c8', fog: '#ffd0a2', waterShallow: '#a8d8c2', waterDeep: '#4a7fb8', sand: '#f6cfa0',
    cloudLit: '#ffcf9c', cloudShade: '#c290b6', rim: '#ffc27a', stars: 0, night: 0.05,
  },
  {
    h: 19.4, name: 'crépuscule',
    skyTop: '#5a5ea8', skyHorizon: '#f5a490', sunGlow: '#ff907c', sun: '#f0a290', skyAmb: '#a88cba', groundAmb: '#b87a9c',
    shadowTint: '#6e5aa8', fog: '#d898a2', waterShallow: '#8fb4c6', waterDeep: '#3a5a98', sand: '#d9aaa6',
    cloudLit: '#ffaa96', cloudShade: '#8a6aaa', rim: '#ffa284', stars: 0.2, night: 0.4,
  },
  {
    h: 20.4, name: 'heure bleue',
    skyTop: '#2b3676', skyHorizon: '#6b76b2', sunGlow: '#8f86c8', sun: '#a0a8e0', skyAmb: '#5a64a8', groundAmb: '#3a3a72',
    shadowTint: '#5a5aa6', fog: '#5866a2', waterShallow: '#5090b2', waterDeep: '#23427c', sand: '#9ca0c2',
    cloudLit: '#9096ce', cloudShade: '#4a5092', rim: '#a8b6ff', stars: 0.7, night: 0.88,
  },
  { h: 21.6, ref: 0 },
  { h: 24, ref: 0 },
];

const COLOR_FIELDS = ['skyTop', 'skyHorizon', 'sunGlow', 'sun', 'skyAmb', 'groundAmb', 'shadowTint', 'fog', 'waterShallow', 'waterDeep', 'sand', 'cloudLit', 'cloudShade', 'rim'];

// Prépare les couleurs
const PREPARED = KEYS.map((k) => {
  const src = k.ref !== undefined ? KEYS[k.ref] : k;
  const out = { h: k.h, name: src.name, stars: src.stars, night: src.night };
  for (const f of COLOR_FIELDS) out[f] = new THREE.Color(src[f]);
  return out;
});

// Lever / coucher approximés selon la saison (latitude moyenne européenne)
export function sunTimes(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const doy = (date - start) / 86400000;
  const dayLength = 12 + 3.6 * Math.sin((2 * Math.PI * (doy - 80)) / 365);
  const noon = 13.4;
  return { rise: noon - dayLength / 2, set: noon + dayLength / 2 };
}

// Convertit l'heure réelle en heure canonique (lever 6.5, coucher 19.5)
export function canonicalHour(hour, date = new Date()) {
  const { rise, set } = sunTimes(date);
  if (hour >= rise && hour <= set) return 6.5 + ((hour - rise) / (set - rise)) * 13;
  let t = hour < rise ? hour + 24 : hour;
  const nightLen = rise + 24 - set;
  const c = 19.5 + ((t - set) / nightLen) * 11;
  return c >= 24 ? c - 24 : c;
}

const tmpColor = new THREE.Color();
const grey = new THREE.Color('#9aa6b8');
const MOON_SKY = new THREE.Vector3(-0.42, 0.13, -0.9).normalize();
const MOON_LIGHT = new THREE.Vector3(-0.35, 0.75, -0.55).normalize();

export class DayCycle {
  constructor() {
    this.hour = 12;
    this.canon = 12;
    this.override = null; // heure forcée (réglages / ?t=)
    this.state = { name: '', night: 0 };
    const t = new URLSearchParams(location.search).get('t');
    if (t !== null && !Number.isNaN(parseFloat(t))) this.override = parseFloat(t);
  }

  currentHour() {
    if (this.override !== null) return this.override;
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  }

  update(rain = 0) {
    this.hour = this.currentHour();
    const ch = this.override !== null ? this.override : canonicalHour(this.hour);
    this.canon = ch;
    let i = 0;
    while (i < PREPARED.length - 1 && PREPARED[i + 1].h <= ch) i++;
    const a = PREPARED[i];
    const b = PREPARED[Math.min(i + 1, PREPARED.length - 1)];
    const span = b.h - a.h || 1;
    let t = THREE.MathUtils.clamp((ch - a.h) / span, 0, 1);
    t = t * t * (3 - 2 * t);
    const mix = (field, uniform) => {
      tmpColor.copy(a[field]).lerp(b[field], t);
      if (rain > 0) tmpColor.lerp(grey, rain * 0.32);
      uniform.value.copy(tmpColor);
    };
    mix('skyTop', U.uSkyTop);
    mix('skyHorizon', U.uSkyHorizon);
    mix('sunGlow', U.uSunGlow);
    mix('sun', U.uSunColor);
    mix('skyAmb', U.uSkyAmbient);
    mix('groundAmb', U.uGroundAmbient);
    mix('shadowTint', U.uShadowTint);
    mix('fog', U.uFogColor);
    mix('waterShallow', U.uWaterShallow);
    mix('waterDeep', U.uWaterDeep);
    mix('sand', U.uSandColor);
    mix('cloudLit', U.uCloudLit);
    mix('cloudShade', U.uCloudShade);
    mix('rim', U.uRimColor);
    if (rain > 0) U.uSunColor.value.multiplyScalar(1 - rain * 0.18);
    U.uStars.value = THREE.MathUtils.lerp(a.stars, b.stars, t) * (1 - rain);
    const night = THREE.MathUtils.lerp(a.night, b.night, t);
    U.uNight.value = night;

    // trajectoire du soleil : est → (haut, un peu vers le sud) → ouest
    const p = (ch - 6.5) / 13;
    const th = p * Math.PI;
    const sun = new THREE.Vector3(Math.cos(th), Math.sin(th) * 1.45, Math.sin(th) * 0.95).normalize();
    U.uSunSkyDir.value.copy(sun);
    const dayAmt = THREE.MathUtils.smoothstep(sun.y, -0.06, 0.14);
    const light = new THREE.Vector3(sun.x, Math.max(sun.y, 0.34), sun.z).normalize();
    light.lerp(MOON_LIGHT, 1 - dayAmt).normalize();
    U.uSunDir.value.copy(light);
    U.uMoonDir.value.copy(MOON_SKY);
    this.state = { name: t < 0.5 ? a.name : b.name, night, hour: this.hour, canon: ch };
    return this.state;
  }
}
