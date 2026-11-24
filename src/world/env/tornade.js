import * as THREE from 'three';
import { U, ORIGIN, nextId } from '../../core/globals.js';
import { NOISE, CURVE, MRT_OUT, SHADOW, TOON } from '../../render/shaders/chunks.js';

// TORNADE NOIRE (prototype, 23/11/2026, demande de l'utilisateur : « au loin dans l'open world une tornade
// noire avec éclairs rouges + shader lumière, pas méga détaillé, pour voir à quoi ça ressemble »).
// Décor seul (aucun effet de jeu, pas d'obstacle), posée en pleine mer. Trois pièces :
//   - l'entonnoir : un cylindre ouvert déformé dans le shader (rayon qui s'évase vers le haut, axe qui
//     ondule en S, rotation plus rapide en bas), bandes de nuées sombres qui tournent, bords effilochés ;
//     veines rouges qui s'allument dans la nuée pendant les éclairs ;
//   - l'enclume : un disque de nuages noirs qui tourne lentement au sommet ;
//   - les éclairs : un ruban en zigzag refait à chaque coup, de l'enclume vers la mer ou vers l'entonnoir.
// Lumière : U.uEclair (0 à 1) et U.uEclairPos (repère de la scène) : chaque coup éclaire en rouge le décor
// jusqu'à environ 900 m (TOON, chunks.js) et teinte le ciel dans sa direction (sky.js).

// position absolue : loin hors de la carte (archipel de 6 × 4 km), boss caché ; taille (m)
export const TORNADE = { x: 5200, z: -3400, hauteur: 1150, rBas: 30, rHaut: 380 };

const funnelVert = /* glsl */ `
${CURVE}
uniform float uTime;
uniform float uH;
uniform float uRb;
uniform float uRt;
varying float vV;
varying float vA;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vViewDist;
// axe de l'entonnoir : un S lent qui ondule (m, repère local)
vec2 axe(float v, float t) {
  return vec2(sin(v * 2.6 + t * 0.35) * 28.0 + sin(v * 5.1 - t * 0.6) * 9.0, cos(v * 2.1 + t * 0.28) * 22.0) * smoothstep(0.0, 0.4, v);
}
void main() {
  float v = position.y + 0.5;
  float a = atan(position.z, position.x);
  float t = uTime;
  // rotation plus rapide en bas (le cou serré tourne vite)
  float ang = a + t * mix(1.6, 0.35, v);
  float r = mix(uRb, uRt, pow(v, 2.2));
  // bourrelets qui montent le long de l'entonnoir
  r *= 1.0 + 0.12 * sin(v * 22.0 - t * 2.0 + a * 2.0) + 0.06 * sin(a * 5.0 + t);
  vec2 c = axe(v, t);
  vec3 p = vec3(c.x + cos(ang) * r, v * uH, c.y + sin(ang) * r);
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorldPos = wp.xyz;
  vNormalW = normalize(vec3(cos(ang), -0.25, sin(ang)));
  vV = v;
  vA = a;
  vec4 mv = viewMatrix * applyCurve(wp);
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const funnelFrag = /* glsl */ `
${NOISE}
${SHADOW}
${TOON}
${MRT_OUT}
uniform float uTime;
uniform float uId;
varying float vV;
varying float vA;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vViewDist;
void main() {
  float t = uTime;
  // nuées en bandes qui tournent et montent
  vec2 q = vec2(vA * 2.0 - t * mix(1.4, 0.3, vV), vV * 9.0 - t * 0.5);
  float n = fbm(q) * 0.7 + fbm(q * 2.7 + 5.0) * 0.3;
  // bords effilochés : trous dans la nuée, surtout au pied (embruns) et en haut
  float bord = smoothstep(0.0, 0.08, vV) * smoothstep(1.0, 0.85, vV);
  if (n < mix(0.62, 0.28, bord)) discard;
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorldPos);
  // noir bleuté, plus clair sur les bourrelets, plus noir dans les creux
  vec3 albedo = mix(vec3(0.05, 0.045, 0.06), vec3(0.2, 0.18, 0.23), smoothstep(0.45, 0.85, n));
  vec3 col = toonShade(albedo, N, V, 1.0, 0.6) * 0.75;
  // liseré à contre-jour : silhouette lisible sur le ciel
  col += vec3(0.35, 0.3, 0.36) * pow(1.0 - abs(dot(N, V)), 3.0) * 0.25 * (1.0 - uNight);
  // veines rouges dans la nuée pendant les éclairs
  float veine = smoothstep(0.035, 0.0, abs(fbm(q * 1.7 + vec2(t * 3.0, 0.0)) - 0.5));
  col += vec3(1.0, 0.12, 0.08) * veine * uEclair * 2.2 * (0.4 + 0.6 * vV);
  col += vec3(0.6, 0.05, 0.04) * uEclair * 0.35;
  // dans l'air, mais moins voilée que le reste : on doit la voir de loin
  col = mix(col, applyFog(col, vViewDist * 0.3, vWorldPos), 0.7);
  writeGBuffer(col, N, uId, 0.5);
}
`;

const capVert = /* glsl */ `
${CURVE}
varying vec3 vWorldPos;
varying vec3 vLocal;
varying float vViewDist;
void main() {
  vLocal = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vec4 mv = viewMatrix * applyCurve(wp);
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const capFrag = /* glsl */ `
${NOISE}
${SHADOW}
${TOON}
${MRT_OUT}
uniform float uTime;
uniform float uId;
varying vec3 vWorldPos;
varying vec3 vLocal;
varying float vViewDist;
void main() {
  float r = length(vLocal.xz);
  float a = atan(vLocal.z, vLocal.x) - uTime * 0.08 + r * 0.004;
  float n = fbm(vec2(a * 3.0, r * 0.012 - uTime * 0.05)) * 0.7 + fbm(vLocal.xz * 0.006 + uTime * 0.01) * 0.3;
  // enclume discrète : plus petite, plus trouée, bord vite effiloché
  if (n < smoothstep(0.3, 1.0, r / 620.0) * 0.8 + 0.34) discard;
  vec3 albedo = mix(vec3(0.05, 0.045, 0.06), vec3(0.22, 0.19, 0.25), smoothstep(0.4, 0.85, n));
  vec3 col = albedo * mix(vec3(0.55), uSkyAmbient + 0.2, 0.5);
  col += vec3(1.0, 0.14, 0.1) * uEclair * smoothstep(0.5, 0.9, n) * 0.9 * (1.0 - smoothstep(0.0, 500.0, r) * 0.6) * 0.6;
  col = mix(col, applyFog(col, vViewDist * 0.3, vWorldPos), 0.7);
  writeGBuffer(col, vec3(0.0, -1.0, 0.0), uId, 0.5);
}
`;

const boltVert = /* glsl */ `
${CURVE}
attribute float aBord;
varying float vBord;
void main() {
  vBord = aBord;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * applyCurve(wp);
}
`;

const boltFrag = /* glsl */ `
${MRT_OUT}
uniform float uEclair;
uniform float uId;
varying float vBord;
void main() {
  if (uEclair < 0.02) discard;
  // cœur presque blanc, gaine rouge
  vec3 col = mix(vec3(1.0, 0.85, 0.8), vec3(1.0, 0.1, 0.06), smoothstep(0.0, 0.8, vBord));
  writeGBuffer(col * (0.6 + 0.6 * uEclair), vec3(0.0, 1.0, 0.0), uId, 0.0);
}
`;

function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

const _p = new THREE.Vector3();

export class Tornade {
  constructor(scene) {
    const T = TORNADE;
    this.group = new THREE.Group();
    this.group.name = 'tornade';
    const mat = (name, vertexShader, fragmentShader, extra = {}) =>
      new THREE.ShaderMaterial({
        name, glslVersion: THREE.GLSL3, side: THREE.DoubleSide, vertexShader, fragmentShader,
        uniforms: { ...U, uId: { value: nextId() }, ...extra },
      });
    // entonnoir : cylindre unité (y de −0,5 à 0,5), déformé dans le shader
    this.funnel = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 48, 72, true),
      mat('tornade', funnelVert, funnelFrag, { uH: { value: T.hauteur }, uRb: { value: T.rBas }, uRt: { value: T.rHaut } }));
    // enclume : disque de nuées au sommet
    const cGeo = new THREE.CircleGeometry(640, 64);
    cGeo.rotateX(Math.PI / 2);
    this.cap = new THREE.Mesh(cGeo, mat('tornade-enclume', capVert, capFrag));
    this.cap.position.y = T.hauteur * 0.98;
    // éclair : ruban refait à chaque coup
    this.bolt = new THREE.Mesh(new THREE.BufferGeometry(), mat('tornade-eclair', boltVert, boltFrag));
    for (const m of [this.funnel, this.cap, this.bolt]) m.frustumCulled = false;
    this.group.add(this.funnel, this.cap, this.bolt);
    scene.add(this.group);
    this.rand = rng(77);
    this.prochain = 1.5;
    this.flash = 0;
    this.coups = 0;
    this.posEclair = new THREE.Vector3(0, T.hauteur * 0.6, 0);
  }

  // trait en zigzag de a vers b (repère local), ruban tourné vers la caméra (largeur w)
  eclair(a, b, w, camLocal) {
    const n = 26;
    const dir = new THREE.Vector3().subVectors(b, a);
    const L = dir.length();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    const up = new THREE.Vector3().crossVectors(dir, side).normalize();
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const amp = L * 0.06 * Math.sin(f * Math.PI);
      pts.push(a.clone().addScaledVector(dir, f).addScaledVector(side, (this.rand() - 0.5) * amp * 2).addScaledVector(up, (this.rand() - 0.5) * amp));
    }
    const pos = [];
    const bord = [];
    const idx = [];
    for (let i = 0; i <= n; i++) {
      const p = pts[i];
      const t = pts[Math.min(i + 1, n)].clone().sub(pts[Math.max(i - 1, 0)]).normalize();
      const vue = camLocal.clone().sub(p).normalize();
      const o = new THREE.Vector3().crossVectors(t, vue).normalize().multiplyScalar(w * (1 - (i / n) * 0.5));
      pos.push(p.x - o.x, p.y - o.y, p.z - o.z, p.x, p.y, p.z, p.x + o.x, p.y + o.y, p.z + o.z);
      bord.push(1, 0, 1);
      if (i < n) {
        const k = i * 3;
        idx.push(k, k + 3, k + 1, k + 1, k + 3, k + 4, k + 1, k + 4, k + 2, k + 2, k + 4, k + 5);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aBord', new THREE.Float32BufferAttribute(bord, 1));
    g.setIndex(idx);
    this.bolt.geometry.dispose();
    this.bolt.geometry = g;
  }

  update(dt, camera) {
    const T = TORNADE;
    // loin hors de la carte, au-delà du plan lointain de la caméra (4,5 km) : dessinée en maquette, ramenée
    // à 3,6 km au plus et réduite d'autant (même taille à l'écran, même direction), pour rester visible
    _p.set(T.x - ORIGIN.x, -ORIGIN.y, T.z - ORIGIN.z).sub(camera.position);
    const dist = _p.length();
    const k = Math.min(1, 3600 / Math.max(dist, 1));
    this.group.position.copy(camera.position).addScaledVector(_p, k);
    this.group.scale.setScalar(k);
    // coups toutes les 1,5 à 5 s, parfois doublés ; l'éclat retombe en 0,35 s
    this.prochain -= dt;
    if (this.prochain <= 0) {
      this.coups = this.rand() < 0.35 ? 2 : 1;
      this.prochain = 1.5 + this.rand() * 3.5;
      this.flash = 1;
      const camLocal = camera.position.clone().sub(this.group.position).divideScalar(this.group.scale.x);
      const h = T.hauteur;
      const ang = this.rand() * Math.PI * 2;
      const r0 = 60 + this.rand() * 200;
      const a = new THREE.Vector3(Math.cos(ang) * r0, h * 0.96, Math.sin(ang) * r0);
      const loin = r0 + 80 + this.rand() * 200;
      const b = this.rand() < 0.6
        ? new THREE.Vector3(Math.cos(ang + 0.6) * loin, 0, Math.sin(ang + 0.6) * loin)
        : new THREE.Vector3(Math.cos(ang + 1.4) * 40, h * (0.2 + this.rand() * 0.3), Math.sin(ang + 1.4) * 40);
      this.eclair(a, b, 3.2, camLocal);
      this.posEclair.copy(a).lerp(b, 0.5);
    } else if (this.coups > 1 && this.flash < 0.25) {
      this.coups = 1;
      this.flash = 0.85;
    }
    this.flash = Math.max(0, this.flash - dt / 0.35);
    // scintillement de l'éclat (pas une rampe lisse)
    const e = this.flash > 0 ? this.flash * (0.75 + 0.25 * Math.sin(performance.now() * 0.09)) : 0;
    U.uEclair.value = e;
    U.uEclairPos.value.copy(this.posEclair).multiplyScalar(this.group.scale.x).add(this.group.position);
    this.bolt.visible = e > 0.02;
  }
}
