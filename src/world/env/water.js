import * as THREE from 'three';
import { U, nextId } from '../../core/globals.js';
import { NOISE, CURVE, TOON, MRT_OUT } from '../../render/shaders/chunks.js';
import { LAYOUT, heightAt, distToPolyline } from '../home/terrain.js';
import { waterLevelAt } from '../navigation.js';

// Paramètres partagés entre l'océan dessiné et les objets qui flottent.
export const WATER_PHYSICS = Object.freeze({
  calmWaveAmplitude: 0.18,
  stormWaveAmplitude: 0.46,
  pondWaveAmplitude: 0.025,
  riverWaveAmplitude: 0.015,
  shoreFadeDepth: 2.5,
  rainRoughness: 0.34,
});

let seaAmplitude = WATER_PHYSICS.calmWaveAmplitude;
let ocean = null;

// Le shader d'eau et le gameplay partagent uTime, le vent et cette même
// fonction de vague. Les coordonnées fournies sont absolues (origine flottante).
export function waveHeightAt(
  x,
  z,
  depth = 16,
  time = U.uTime.value,
  windX = U.uWindDir.value.x,
  windZ = U.uWindDir.value.y,
  windStrength = U.uWindStrength.value,
  amplitude = seaAmplitude,
) {
  const dx = windX + 0.0001;
  const dz = windZ + 0.0001;
  const invLen = 1 / Math.hypot(dx, dz);
  const dirX = dx * invLen;
  const dirZ = dz * invLen;
  const along = x * dirX + z * dirZ;
  const across = x * -dirZ + z * dirX;
  const wave = Math.sin(along * 0.32 + time * (0.75 + windStrength * 0.35)) * 0.5
    + Math.sin(across * 0.41 - time * 0.65 + along * 0.13) * 0.4
    + Math.sin((along + across) * 0.9 + time * 1.9) * 0.15;
  const shore = THREE.MathUtils.clamp(depth / WATER_PHYSICS.shoreFadeDepth, 0, 1);
  const shoreFade = shore * shore * (3 - 2 * shore);
  return wave * amplitude * (0.25 + 0.75 * shoreFade) * (0.82 + windStrength * 0.28);
}

export function waterSurfaceAt(x, z, depth = 16) {
  const pondDistance = Math.hypot(x - LAYOUT.pond.x, z - LAYOUT.pond.z);
  if (pondDistance < LAYOUT.pond.r + 0.4) {
    return LAYOUT.pond.level + waveHeightAt(x, z, depth, U.uTime.value, U.uWindDir.value.x, U.uWindDir.value.y, U.uWindStrength.value, WATER_PHYSICS.pondWaveAmplitude);
  }
  if (distToPolyline(x, z, LAYOUT.river).d < 0.9 && heightAt(x, z) > 2) {
    return LAYOUT.riverLevel + waveHeightAt(x, z, depth, U.uTime.value, U.uWindDir.value.x, U.uWindDir.value.y, U.uWindStrength.value, WATER_PHYSICS.riverWaveAmplitude);
  }
  // lacs et rivières des îles générées : eau calme à leur propre niveau
  const fresh = waterLevelAt(x, z);
  if (fresh > 0.01) return fresh + waveHeightAt(x, z, depth, U.uTime.value, U.uWindDir.value.x, U.uWindDir.value.y, U.uWindStrength.value, WATER_PHYSICS.pondWaveAmplitude);
  return LAYOUT.waterLevel + waveHeightAt(x, z, depth);
}

// Pluie et vent renforcent progressivement la houle, avec une amplitude
// plafonnée pour garder un contrôle stable et une mer lisible.
export function setSeaConditions(windStrength = 1, rain = 0, storm = false) {
  const severity = Math.max(storm ? 1 : 0, THREE.MathUtils.clamp((windStrength - 1) / 0.8, 0, 1), THREE.MathUtils.clamp(rain, 0, 1) * WATER_PHYSICS.rainRoughness);
  seaAmplitude = THREE.MathUtils.lerp(WATER_PHYSICS.calmWaveAmplitude, WATER_PHYSICS.stormWaveAmplitude, severity);
  if (ocean) ocean.material.uniforms.uWaveAmp.value = seaAmplitude;
  return seaAmplitude;
}

// ---------------------------------------------------------------------------
// Shader d'eau : dégradé de profondeur, écume animée, reflets peints, vagues
// ---------------------------------------------------------------------------
// Relief sous l'eau : île de départ (texture fine) et îles générées (fenêtre
// autour du joueur, recalculée par le Worker). Coordonnées locales.
const HEIGHT_FN = /* glsl */ `
uniform sampler2D uHeightTex;
uniform vec4 uHeightBounds;
uniform sampler2D uDepthTex;
uniform vec4 uDepthBounds;
float terrainH(vec2 p) {
  float h = -16.0;
  vec2 uv = (p - uHeightBounds.xy) / uHeightBounds.zw;
  if (uv.x > 0.0 && uv.y > 0.0 && uv.x < 1.0 && uv.y < 1.0) h = texture(uHeightTex, uv).r;
  vec2 uv2 = (p - uDepthBounds.xy) / uDepthBounds.zw;
  if (uv2.x > 0.0 && uv2.y > 0.0 && uv2.x < 1.0 && uv2.y < 1.0) h = max(h, texture(uDepthTex, uv2).r);
  return h;
}
`;

const waterVert = /* glsl */ `
${CURVE}
${HEIGHT_FN}
uniform float uTime;
uniform float uLevel;
uniform float uWaveAmp;
uniform vec2 uWindDir;
uniform float uWindStrength;
varying vec3 vWorldPos;
varying float vViewDist;
varying float vWave;
float waveH(vec2 p, float t) {
  vec2 d = normalize(uWindDir + vec2(0.0001));
  float along = dot(p, d);
  float across = dot(p, vec2(-d.y, d.x));
  return sin(along * 0.32 + t * (0.75 + uWindStrength * 0.35)) * 0.5
       + sin(across * 0.41 - t * 0.65 + along * 0.13) * 0.4
       + sin((along + across) * 0.9 + t * 1.9) * 0.15;
}
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float depth = uLevel - terrainH(wp.xz);
  float amp = uWaveAmp * (0.25 + 0.75 * smoothstep(0.0, 2.5, depth)) * (0.82 + uWindStrength * 0.28);
  float w = waveH(wp.xz + uWorldOffset.xz, uTime);
  wp.y = uLevel + w * amp;
  vWave = w;
  vWorldPos = wp.xyz;
  vec4 mv = viewMatrix * applyCurve(wp);
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const waterFrag = /* glsl */ `
${NOISE}
${TOON}
${MRT_OUT}
${HEIGHT_FN}
uniform float uTime;
uniform float uLevel;
uniform vec2 uFlow;
uniform float uFoamAmt;
uniform vec3 uWaterShallow;
uniform vec3 uWaterDeep;
uniform vec3 uSandColor;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyTop;
uniform vec3 uMoonDir;
uniform float uRain;
uniform vec3 uWorldOffset;
varying vec3 vWorldPos;
varying float vViewDist;
varying float vWave;

float ripples(vec2 p, float t) {
  // petits cercles de pluie
  vec2 cell = floor(p * 1.4);
  vec2 f = fract(p * 1.4) - 0.5;
  float h = hash12(cell);
  float ph = fract(t * 0.9 + h);
  vec2 o = vec2(hash12(cell + 3.1), hash12(cell + 7.7)) - 0.5;
  float d = length(f - o * 0.5);
  float ring = smoothstep(0.05, 0.0, abs(d - ph * 0.45)) * (1.0 - ph);
  return ring * step(0.35, h);
}

void main() {
  float t = uTime;
  float depth = uLevel - terrainH(vWorldPos.xz);
  // position absolue pour les motifs (continue quand l'origine se recentre)
  vec2 p = vWorldPos.xz + uWorldOffset.xz;
  vec2 fp = p - uFlow * t;

  // normale peinte : bruit lent + vagues
  float n1 = vnoise(fp * 0.7 + vec2(t * 0.05, t * 0.03));
  float n2 = vnoise(fp * 0.7 + vec2(5.2, 1.3) - vec2(t * 0.04, -t * 0.02));
  vec3 N = normalize(vec3((n1 - 0.5) * 0.5, 1.0, (n2 - 0.5) * 0.5));
  vec3 V = normalize(cameraPosition - vWorldPos);

  // couleur selon la profondeur, avec des bandes irrégulières comme au pinceau
  float dN = depth + (fbm(p * 0.22 + t * 0.015) - 0.5) * 0.8;
  vec3 col = mix(uWaterShallow, uWaterDeep, smoothstep(0.3, 4.5, dN));
  // bande turquoise intermédiaire
  col = mix(col, mix(uWaterShallow, vec3(0.6, 1.0, 0.92), 0.25), smoothstep(1.2, 0.5, abs(dN - 1.0)) * 0.25);
  // eau très peu profonde : le sable transparaît
  vec3 sandUnder = mix(uSandColor, uWaterShallow, 0.4);
  col = mix(sandUnder, col, smoothstep(0.0, 0.75, dN));

  // éclairage doux
  float ndl = dot(N, uSunDir) * 0.5 + 0.5;
  col *= mix(uShadowTint * 1.25, uSunColor, smoothstep(0.35, 0.6, ndl) * 0.6 + 0.4);

  // reflet du ciel (Fresnel) + touches de lumière peintes
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col = mix(col, mix(uSkyHorizon, uSkyTop, 0.25), fres * 0.5);
  vec3 R = reflect(-V, N);
  float dabs = smoothstep(0.55, 0.7, vnoise(fp * vec2(1.1, 4.0) + vec2(t * 0.35, 0.0)));
  float glint = pow(max(dot(R, uSunDir), 0.0), 24.0) * dabs;
  col += uSunColor * glint * 0.75 * (1.0 - uNight);
  float moonGlint = pow(max(dot(R, uMoonDir), 0.0), 30.0) * dabs;
  col += vec3(0.75, 0.85, 1.0) * moonGlint * 0.5 * uNight;

  // crêtes des vagues au large : petits traits blancs
  float crest = smoothstep(0.8, 0.86, vnoise(p * vec2(0.45, 1.5) + vec2(t * 0.22, -t * 0.08)));
  crest *= smoothstep(2.5, 6.0, depth) * smoothstep(0.1, 0.5, vWave);
  vec3 foamCol = mix(vec3(1.0, 0.99, 0.95), uSunColor, 0.25) * mix(1.0, 0.7, uNight);
  col = mix(col, foamCol, crest * 0.45);

  // écume du rivage : liseré + bandes qui avancent vers la plage
  float wob = (vnoise(p * 1.6 + t * 0.25) - 0.5) * 0.22;
  float edge = smoothstep(0.3, 0.06, depth + wob);
  float bands = sin(depth * 6.5 - t * 1.5 + vnoise(p * 0.7) * 3.0);
  float bandFoam = smoothstep(0.72, 0.9, bands) * smoothstep(1.5, 0.35, depth)
                 * smoothstep(0.3, 0.5, vnoise(p * 2.0 + vec2(t * 0.3, 0.0)));
  float foam = max(edge, bandFoam) * uFoamAmt;
  col = mix(col, foamCol, foam * 0.92);

  // pluie
  if (uRain > 0.01) {
    col = mix(col, foamCol, ripples(p, t) * uRain * 0.5);
  }

  col = applyFog(col, vViewDist);
  writeGBuffer(col, vec3(0.0, 1.0, 0.0), 0.0, 0.0);
}
`;

export function waterMaterial({ level = 0, waveAmp = 0.1, flow = [0, 0], foam = 1 } = {}) {
  return new THREE.ShaderMaterial({
    name: 'water',
    glslVersion: THREE.GLSL3,
    uniforms: {
      ...U,
      uLevel: { value: level },
      uWaveAmp: { value: waveAmp },
      uFlow: { value: new THREE.Vector2(flow[0], flow[1]) },
      uFoamAmt: { value: foam },
    },
    vertexShader: waterVert,
    fragmentShader: waterFrag,
  });
}

// Océan : disque radial qui suit le joueur, dense au centre, lâche vers l'horizon
export function buildOcean() {
  const radii = [];
  for (let r = 0; r <= 44; r += 0.9) radii.push(r);
  let r = 44;
  while (r < 4500) {
    r *= 1.075;
    radii.push(r);
  }
  const seg = 192;
  const verts = [];
  const idx = [];
  verts.push(0, 0, 0);
  for (let i = 1; i < radii.length; i++) {
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * Math.PI * 2;
      verts.push(Math.cos(a) * radii[i], 0, Math.sin(a) * radii[i]);
    }
  }
  for (let s = 0; s < seg; s++) idx.push(0, 1 + ((s + 1) % seg), 1 + s);
  for (let i = 1; i < radii.length - 1; i++) {
    const a0 = 1 + (i - 1) * seg;
    const a1 = 1 + i * seg;
    for (let s = 0; s < seg; s++) {
      const s1 = (s + 1) % seg;
      idx.push(a0 + s, a0 + s1, a1 + s);
      idx.push(a0 + s1, a1 + s1, a1 + s);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(verts.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, waterMaterial({ level: LAYOUT.waterLevel, waveAmp: seaAmplitude }));
  mesh.name = 'ocean';
  mesh.frustumCulled = false;
  ocean = mesh;
  return mesh;
}

export function buildPond() {
  const P = LAYOUT.pond;
  const geo = new THREE.CircleGeometry(P.r + 0.9, 40);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, waterMaterial({ level: P.level, waveAmp: 0.025, foam: 0.8 }));
  mesh.position.set(P.x, 0, P.z);
  mesh.name = 'pond';
  return mesh;
}

// Rivière : ruban qui suit la polyligne sur le plateau
export function buildRiver() {
  const pts = LAYOUT.river.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(pts);
  const N = 60;
  const width = 1.9;
  const verts = [];
  const idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = curve.getPoint(t);
    const tg = curve.getTangent(t);
    const nx = -tg.z;
    const nz = tg.x;
    verts.push(p.x + nx * width * 0.5, 0, p.z + nz * width * 0.5);
    verts.push(p.x - nx * width * 0.5, 0, p.z - nz * width * 0.5);
    if (i < N) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(verts.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, waterMaterial({ level: LAYOUT.riverLevel, waveAmp: 0.015, flow: [0.25, 1.1], foam: 0.7 }));
  mesh.name = 'river';
  return mesh;
}

// ---------------------------------------------------------------------------
// Cascade : ruban courbe avec traînées qui défilent + écume au pied
// ---------------------------------------------------------------------------
const fallVert = /* glsl */ `
${CURVE}
uniform float uTime;
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vViewDist;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  wp.x += sin(uv.y * 9.0 - uTime * 4.0) * 0.03 * uv.y;
  vUv = uv;
  vWorldPos = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 mv = viewMatrix * applyCurve(wp);
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;
const fallFrag = /* glsl */ `
${NOISE}
${TOON}
${MRT_OUT}
uniform float uTime;
uniform float uId;
uniform vec3 uWaterShallow;
uniform vec3 uWaterDeep;
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vViewDist;
void main() {
  float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
  float streak = vnoise(vec2(vUv.x * 9.0, vUv.y * 2.2 - uTime * 2.6));
  float streak2 = vnoise(vec2(vUv.x * 17.0 + 3.0, vUv.y * 4.0 - uTime * 3.4));
  vec3 base = mix(uWaterShallow, uWaterDeep, 0.25 + 0.3 * streak);
  vec3 col = mix(base, vec3(1.0), smoothstep(0.55, 0.75, streak2) * 0.85);
  col = mix(col, vec3(1.0), smoothstep(0.75, 1.0, vUv.y) * 0.7);
  col = mix(col, vec3(0.97, 1.0, 1.0), (1.0 - edge) * 0.6);
  col *= mix(uShadowTint * 1.3, uSunColor, 0.75);
  col = applyFog(col, vViewDist);
  writeGBuffer(col, normalize(vNormalW), uId, 0.5);
}
`;

export function buildWaterfall() {
  const group = new THREE.Group();
  group.name = 'waterfall';
  const end = LAYOUT.river[LAYOUT.river.length - 1];
  const top = new THREE.Vector3(end[0], LAYOUT.riverLevel + 0.02, end[1] - 0.2);
  const P = LAYOUT.pond;
  const bottomY = P.level;
  // profil : sortie de la rivière, arc, chute presque verticale
  const prof = [];
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const y = THREE.MathUtils.lerp(top.y, bottomY - 0.05, t * t * 0.4 + t * 0.6);
    const z = top.z + 0.25 + Math.sqrt(t) * 0.75;
    prof.push([y, z]);
  }
  const width = 1.25;
  const verts = [];
  const uvs = [];
  const nrms = [];
  const idx = [];
  const cols = 6;
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= cols; j++) {
      const u = j / cols;
      const bulge = Math.sin(u * Math.PI) * 0.12;
      verts.push(top.x + (u - 0.5) * width * (1 + i / N * 0.25), prof[i][0], prof[i][1] + bulge);
      uvs.push(u, i / N);
      nrms.push(0, 0.25, 1);
      if (i < N && j < cols) {
        const a = i * (cols + 1) + j;
        const b = a + cols + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrms, 3));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    name: 'waterfall',
    glslVersion: THREE.GLSL3,
    uniforms: { ...U, uId: { value: nextId() } },
    vertexShader: fallVert,
    fragmentShader: fallFrag,
    side: THREE.DoubleSide,
  });
  const sheet = new THREE.Mesh(geo, mat);
  group.add(sheet);
  group.userData.foamPos = new THREE.Vector3(top.x, bottomY, prof[N][1] + 0.1);
  return group;
}

// Profondeur d'eau à une position (utile pour le gameplay)
export function waterDepthAt(x, z) {
  const pd = Math.hypot(x - LAYOUT.pond.x, z - LAYOUT.pond.z);
  if (pd < LAYOUT.pond.r + 0.4) return LAYOUT.pond.level - heightAt(x, z);
  const riv = distToPolyline(x, z, LAYOUT.river);
  if (riv.d < 0.9 && heightAt(x, z) > 2) return LAYOUT.riverLevel - heightAt(x, z);
  return -heightAt(x, z);
}
