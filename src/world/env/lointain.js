// PAYSAGES LOINTAINS FACTICES (24/11/2026, demande de l'utilisateur : « créer des faux paysages ultra loin pour
// faire l'illusion que l'open world est immense »). Trois anneaux de silhouettes peintes, centrés sur la
// caméra (ils ne se rapprochent jamais, comme un ciel), juste en deçà du plan lointain (4,5 km) : îles et
// collines coupées par la mer à 3,8 km, chaînes à 4,1 km, grands massifs enneigés à 4,4 km. Chaque plan se
// fond un peu plus dans la couleur de l'horizon (perspective aérienne) ; la base se perd dans la brume de la
// mer, le haut des plus lointains garde un liseré de neige. Le relief réel de l'archipel est plus près : il
// passe devant. Décor seul (pas d'ombre, pas d'obstacle) ; identifiant 0 du G-buffer (comme le ciel : pas
// d'encre). Bascule A/B : pipeline.settings.lointain (0 = coupé).
import * as THREE from 'three';
import { U } from '../../core/globals.js';
import { CURVE, MRT_OUT, NOISE } from '../../render/shaders/chunks.js';

// rayon (m), hauteurs (min, max, m), brume (part de l'horizon), mer (cols sous l'eau : îles), segments
export const PLANS = [
  { R: 3800, h: [-30, 300], brume: 0.16, mer: 0.3, graine: 3, segments: 420 },
  { R: 4100, h: [60, 560], brume: 0.3, mer: 0.08, graine: 11, segments: 360 },
  { R: 4400, h: [200, 900], brume: 0.44, mer: 0, graine: 29, segments: 300 },
];

// silhouette : crêtes (|sin| retournés) de plusieurs périodes, pics aigus, cols ; t : angle (0 à 2π)
export function profil(t, P) {
  const s = P.graine;
  let v = 0;
  let amp = 1;
  let tot = 0;
  for (const [f, ph] of [[3, 0.3], [7, 1.7], [13, 4.1], [29, 2.2], [61, 5.3]]) {
    const k = f + (s % 3);
    v += amp * (1 - Math.abs(Math.sin(t * k * 0.5 + ph + s)));
    tot += amp;
    amp *= 0.52;
  }
  v /= tot;
  // grandes masses : certains secteurs plus hauts que d'autres
  const masse = 0.55 + 0.45 * Math.sin(t * (2 + (s % 2)) + s * 0.7);
  v = Math.pow(v, 2.3) * masse * 1.35;
  let h = P.h[0] + (P.h[1] - P.h[0]) * v;
  // archipel lointain : des cols descendent sous la mer, la silhouette s'y coupe en îles
  if (P.mer > 0) h -= P.mer * (P.h[1] - P.h[0]) * (0.5 + 0.5 * Math.sin(t * 9 + s));
  return h;
}

const BAS = -60;
function ruban(P, k) {
  const pos = [];
  const att = [];
  const n = P.segments;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const h = Math.max(profil(t, P), BAS + 1);
    const x = Math.cos(t) * P.R;
    const z = Math.sin(t) * P.R;
    pos.push(x, BAS, z, x, h, z);
    att.push(k, 0, k, 1);
  }
  const idx = [];
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  return { pos, att, idx, count: (n + 1) * 2 };
}

const VERT = /* glsl */ `
${CURVE}
in vec2 aPlan;
out vec2 vPlan;
out float vY;
out vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPlan = aPlan;
  vY = position.y;
  vDir = normalize(position);
  gl_Position = projectionMatrix * viewMatrix * applyCurve(wp);
}
`;

const FRAG = /* glsl */ `
${NOISE}
${MRT_OUT}
uniform vec3 uSkyHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uNight;
uniform float uBrume[3];
uniform float uHaut[3];
in vec2 vPlan;
in float vY;
in vec3 vDir;
void main() {
  int k = int(vPlan.x + 0.5);
  float brume = uBrume[k];
  // valeur de la roche lointaine : l'horizon assombri et bleui, plus sombre au premier plan
  vec3 roche = uSkyHorizon * mix(vec3(0.46, 0.52, 0.74), vec3(0.74, 0.77, 0.92), float(k) * 0.5);
  // touche peinte : variation lente le long de l'anneau
  float n = vnoise(vec2(atan(vDir.z, vDir.x) * 40.0, vY * 0.01));
  roche *= 0.94 + n * 0.1;
  // flanc tourné vers le soleil un peu réchauffé (le jour)
  float face = max(dot(normalize(vec3(vDir.x, 0.0, vDir.z)), -normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), 0.0);
  roche = mix(roche, roche * (0.9 + 0.25 * uSunColor), face * 0.35 * (1.0 - uNight));
  // neige sur les hauts du plan le plus lointain
  float neige = smoothstep(uHaut[k] * 0.72, uHaut[k] * 0.9, vY + n * 30.0) * step(1.5, float(k));
  roche = mix(roche, mix(uSkyHorizon, vec3(1.0), 0.55), neige * 0.6);
  // perspective aérienne : le plan se fond dans l'horizon, la base dans la brume de la mer
  float base = smoothstep(80.0 + float(k) * 40.0, -20.0, vY);
  vec3 col = mix(roche, uSkyHorizon, clamp(brume + base * 0.35, 0.0, 0.9));
  writeGBuffer(col, vec3(0.0, 1.0, 0.0), 0.0, 0.0);
}
`;

export class Lointain {
  constructor(scene) {
    const pos = [];
    const pl = [];
    const idx = [];
    let base = 0;
    PLANS.forEach((P, k) => {
      const r = ruban(P, k);
      pos.push(...r.pos);
      pl.push(...r.att);
      for (const i of r.idx) idx.push(i + base);
      base += r.count;
    });
    // un seul maillage : les trois rubans fusionnés (une passe de dessin)
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aPlan', new THREE.Float32BufferAttribute(pl, 2));
    geo.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
      name: 'lointain',
      glslVersion: THREE.GLSL3,
      uniforms: {
        ...U,
        uBrume: { value: PLANS.map((p) => p.brume) },
        uHaut: { value: PLANS.map((p) => p.h[1]) },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.name = 'lointain';
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  // centré sur la caméra (repère de la scène) ; reglage : pipeline.settings.lointain (null = actif, 0 = coupé)
  update(camera, reglage) {
    this.mesh.visible = reglage !== 0;
    this.mesh.position.set(camera.position.x, 0, camera.position.z);
  }
}
