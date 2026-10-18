import * as THREE from 'three';
import { U, nextId } from '../../core/globals.js';
import { NOISE, CURVE, WIND, SHADOW, TOON, MRT_OUT } from './chunks.js';

// ---------------------------------------------------------------------------
// Matériau toon générique (décors, terrain, personnages)
// ---------------------------------------------------------------------------
const toonVert = /* glsl */ `
${CURVE}
${WIND}
uniform float uWindAmount;
uniform vec3 uPlayerPos;
#ifdef USE_AID
attribute float aId;
varying float vId;
#endif
#ifdef USE_TINT
attribute float aTint;
#endif
#ifdef USE_SWAY
attribute float aSway;
#endif
#ifdef FACE
varying vec2 vUv;
#endif
#include <skinning_pars_vertex>
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec3 vColor;
varying float vViewDist;
void main() {
  vec3 transformed = position;
  vec3 objectNormal = normal;
  #ifdef USE_SKINNING
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <skinning_vertex>
  #endif
  #ifdef FACE
  vUv = uv;
  #endif
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
  m = modelMatrix * instanceMatrix;
  #endif
  vec4 wp = m * vec4(transformed, 1.0);
  #ifdef USE_WIND
  float hgt = max(position.y, 0.0);
  #ifdef USE_SWAY
  hgt = aSway;
  #endif
  wp.xyz += windOffset(wp.xyz, uWindAmount * hgt * hgt, m[3].x * 0.7 + m[3].z * 0.3 + wp.x * 0.37);
  // la végétation s'écarte doucement au passage du personnage
  vec2 dp = wp.xz - uPlayerPos.xz;
  float pd = length(dp);
  float push = smoothstep(0.9, 0.0, pd) * min(hgt * 2.2, 1.0);
  wp.xz += normalize(dp + 0.0001) * push * 0.22;
  wp.y -= push * 0.06;
  #endif
  vWorldPos = wp.xyz;
  vNormalW = normalize(transpose(inverse(mat3(m))) * objectNormal);
  vColor = vec3(1.0);
  #ifdef USE_COLOR
  vColor = color;
  #endif
  #ifdef USE_INSTANCING_COLOR
  #ifdef USE_TINT
  vColor *= mix(vec3(1.0), instanceColor, aTint);
  #else
  vColor *= instanceColor;
  #endif
  #endif
  #ifdef USE_AID
  vId = aId;
  #endif
  vec4 cp = applyCurve(wp);
  vec4 mv = viewMatrix * cp;
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const toonFrag = /* glsl */ `
${NOISE}
${SHADOW}
${TOON}
${MRT_OUT}
uniform vec3 uColor;
uniform float uId;
uniform float uOutline;
uniform float uRim;
uniform vec3 uEmissive;
uniform float uEmissiveNight;
uniform float uPigment;
#ifdef EMISSIVE_VCOLOR
uniform float uEmissiveVC;
#endif
#ifdef FACE
uniform sampler2D uFaceTex;
uniform vec4 uEyeCell;
uniform vec4 uMouthCell;
varying vec2 vUv;
#endif
#ifdef TERRAIN
uniform sampler2D uPathTex;
uniform vec4 uHeightBounds;
#endif
#ifdef TERRAIN_HOLE
// rectangle (local) où les tuiles au mètre remplacent ce relief simplifié
uniform vec4 uHole;
#endif
uniform vec3 uWorldOffset;
#ifdef USE_AID
varying float vId;
#endif
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec3 vColor;
varying float vViewDist;
void main() {
  #ifdef TERRAIN_HOLE
  if (vWorldPos.x > uHole.x && vWorldPos.x < uHole.z && vWorldPos.z > uHole.y && vWorldPos.z < uHole.w) discard;
  #endif
  vec3 N = normalize(vNormalW);
  #ifdef DOUBLE_SIDED
  if (!gl_FrontFacing) N = -N;
  #endif
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 albedo = uColor * vColor;
  // position absolue pour les bruits (continue quand l'origine se recentre)
  vec3 wA = vWorldPos + uWorldOffset;
  // variation de pigment, comme une couche de gouache irrégulière
  float pv = vnoise(wA.xz * 0.45 + wA.y * 0.6) * 0.65 + vnoise(wA.xz * 1.7 - wA.y) * 0.35;
  albedo *= 1.0 + (pv - 0.5) * 0.16 * uPigment;
  #ifdef FACE
  // visage peint : bouche puis yeux (atlas prémultiplié), sur la couleur de peau
  vec4 fm = texture(uFaceTex, uMouthCell.xy + vUv * uMouthCell.zw);
  albedo = albedo * (1.0 - fm.a) + fm.rgb;
  vec4 fe = texture(uFaceTex, uEyeCell.xy + vUv * uEyeCell.zw);
  albedo = albedo * (1.0 - fe.a) + fe.rgb;
  #endif
  #ifdef TERRAIN
  #ifndef NO_PATH
  // chemins peints : bord net mais irrégulier, lisière plus foncée
  vec2 puv = (vWorldPos.xz - uHeightBounds.xy) / uHeightBounds.zw;
  float pd = texture(uPathTex, puv).r * 2.0;
  float pw = 0.6 + (vnoise(wA.xz * 1.3) - 0.5) * 0.22 + (vnoise(wA.xz * 4.0) - 0.5) * 0.06;
  float onGround = smoothstep(0.72, 0.9, vWorldPos.y) * smoothstep(0.7, 0.85, N.y);
  float inner = smoothstep(pw + 0.04, pw - 0.04, pd) * onGround;
  float rim = (smoothstep(pw + 0.16, pw + 0.04, pd) - inner) * onGround;
  albedo = mix(albedo, vec3(0.86, 0.75, 0.56), clamp(rim, 0.0, 1.0) * 0.45);
  vec3 pathCol = vec3(0.965, 0.9, 0.76) * (0.95 + 0.08 * vnoise(wA.xz * 2.2));
  albedo = mix(albedo, pathCol, inner);
  #endif
  // rides de sable sur la plage
  float sand = smoothstep(0.78, 0.6, vWorldPos.y) * smoothstep(-0.2, 0.08, vWorldPos.y) * smoothstep(0.85, 0.95, N.y);
  float ripple = sin(dot(wA.xz, vec2(0.8, 0.6)) * 6.0 + vnoise(wA.xz * 0.7) * 5.0);
  albedo *= 1.0 - sand * smoothstep(0.6, 0.95, ripple) * 0.05;
  // touches peintes sur l'herbe et strates dans la falaise
  float patchN = vnoise(wA.xz * 0.12) * 0.7 + vnoise(wA.xz * 0.37) * 0.3;
  float grassMask = smoothstep(0.75, 0.9, N.y) * smoothstep(0.75, 0.95, vWorldPos.y);
  albedo = mix(albedo, albedo * vec3(0.9, 1.04, 0.92), grassMask * smoothstep(0.45, 0.7, patchN));
  albedo = mix(albedo, albedo * vec3(1.06, 1.05, 0.9), grassMask * smoothstep(0.5, 0.3, patchN) * 0.8);
  float cliff = 1.0 - smoothstep(0.55, 0.8, N.y);
  float strata = sin(vWorldPos.y * 5.5 + vnoise(wA.xz * 0.5) * 3.0);
  albedo = mix(albedo, albedo * (0.93 + 0.08 * strata), cliff);
  #endif
  float sh = sampleShadow(vWorldPos, N);
  vec3 col = toonShade(albedo, N, V, sh, uRim);
  col += lanternLight(albedo, vWorldPos, N);
  #ifdef CHARACTER
  // liseré de lune : le joueur reste lisible la nuit
  float fresC = 1.0 - max(dot(N, V), 0.0);
  col += vec3(0.62, 0.66, 0.95) * smoothstep(0.5, 0.9, fresC) * 0.34 * uNight;
  #endif
  col += uEmissive * mix(1.0, uNight, uEmissiveNight);
  #ifdef EMISSIVE_VCOLOR
  // lueur propre à chaque sommet (maillages fusionnés de plusieurs couleurs)
  col += vColor * uEmissiveVC * mix(1.0, uNight, uEmissiveNight);
  #endif
  col = applyFog(col, vViewDist);
  float id = uId;
  #ifdef USE_AID
  id = vId;
  #endif
  writeGBuffer(col, N, id, uOutline);
}
`;

export function toonMaterial(opts = {}) {
  const {
    color = 0xffffff,
    vertexColors = false,
    id = nextId(),
    outline = 1,
    rim = 1,
    wind = 0,
    emissive = 0x000000,
    emissiveNight = false,
    side = THREE.FrontSide,
    aId = false,
    terrain = false,
    paths = true,
    hole = false,
    pigment = 1,
    tintMask = false,
    sway = false,
    emissiveVColor = 0,
    face = null,
    character = false,
    warmShadow = 0,
  } = opts;
  const defines = {};
  if (wind > 0) defines.USE_WIND = '';
  if (aId) defines.USE_AID = '';
  if (terrain) defines.TERRAIN = '';
  if (terrain && !paths) defines.NO_PATH = '';
  if (hole) defines.TERRAIN_HOLE = '';
  if (tintMask) defines.USE_TINT = '';
  if (sway) defines.USE_SWAY = '';
  if (emissiveVColor > 0) defines.EMISSIVE_VCOLOR = '';
  if (face) defines.FACE = '';
  if (character) defines.CHARACTER = '';
  return new THREE.ShaderMaterial({
    name: 'toon',
    glslVersion: THREE.GLSL3,
    defines,
    uniforms: {
      ...U,
      uColor: { value: new THREE.Color(color) },
      uId: { value: id },
      uOutline: { value: outline },
      uRim: { value: rim },
      uWarmShadow: { value: warmShadow },
      uWindAmount: { value: wind },
      uEmissive: { value: new THREE.Color(emissive) },
      uEmissiveNight: { value: emissiveNight ? 1 : 0 },
      uPigment: { value: pigment },
      uEmissiveVC: { value: emissiveVColor },
      uFaceTex: { value: face },
      uEyeCell: { value: new THREE.Vector4(0, 0.75, 0.25, 0.25) },
      uMouthCell: { value: new THREE.Vector4(0, 0.25, 0.25, 0.25) },
      uHole: { value: new THREE.Vector4(1e9, 1e9, -1e9, -1e9) },
    },
    vertexShader: toonVert,
    fragmentShader: toonFrag,
    vertexColors,
    side,
  });
}

// ---------------------------------------------------------------------------
// Feuillages et nuages : touffes de billboards à normales sphériques
// ---------------------------------------------------------------------------
const foliageVert = /* glsl */ `
${CURVE}
${WIND}
attribute vec2 aCorner;
attribute vec4 aData;   // x: taille, y: aléa, z: ombrage interne (0 coeur, 1 surface), w: index atlas
attribute vec3 aCenter; // centre de la touffe
uniform float uWindAmount;
uniform float uCurveMul;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorldPos;
varying float vShade;
varying float vRand;
varying float vViewDist;
varying vec3 vColor;
void main() {
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
  m = modelMatrix * instanceMatrix;
  #endif
  vec4 wp = m * vec4(position, 1.0);
  vec3 center = (m * vec4(aCenter, 1.0)).xyz;
  float isc = length(m[0].xyz);
  #ifdef USE_WIND
  wp.xyz += windOffset(center, uWindAmount, center.x * 0.37 + center.z * 0.21);
  wp.xyz += vec3(sin(uTime * 3.1 + aData.y * 40.0), 0.0, cos(uTime * 2.7 + aData.y * 31.0)) * 0.035 * uWindAmount * uWindStrength * 4.0;
  #endif
  vWorldPos = wp.xyz;
  vec3 nW = normalize(mat3(m) * normal);
  vec4 cp = wp;
  cp.y += (applyCurve(wp).y - wp.y) * uCurveMul;
  vec4 mv = viewMatrix * cp;
  float ang = aData.y * 6.2831 + sin(uTime * 0.8 + aData.y * 10.0) * 0.06;
  float c = cos(ang);
  float s = sin(ang);
  vec2 corner = mat2(c, s, -s, c) * aCorner;
  mv.xy += corner * aData.x * isc;
  vec3 cornerW = transpose(mat3(viewMatrix)) * vec3(corner, 0.0);
  vNormalW = normalize(nW + cornerW * 0.45);
  float idx = aData.w;
  vec2 cell = vec2(mod(idx, 2.0), floor(idx / 2.0));
  vUv = (aCorner * 0.5 + 0.5 + cell) * 0.5;
  vShade = aData.z;
  vRand = aData.y;
  vColor = vec3(1.0);
  #ifdef USE_COLOR
  vColor = color;
  #endif
  #ifdef USE_INSTANCING_COLOR
  vColor *= instanceColor;
  #endif
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const foliageFrag = /* glsl */ `
${NOISE}
${SHADOW}
${TOON}
${MRT_OUT}
uniform sampler2D uLeafTex;
uniform vec3 uColor;
uniform vec3 uColor2;
uniform float uId;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorldPos;
varying float vShade;
varying float vRand;
varying float vViewDist;
varying vec3 vColor;
void main() {
  vec4 tex = texture(uLeafTex, vUv);
  if (tex.a < 0.5) discard;
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorldPos);
  {
  vec3 albedo = mix(uColor, uColor2, vRand) * vColor;
  albedo *= mix(0.62, 1.0, vShade);
  albedo *= 0.9 + 0.2 * tex.g;
  float sh = sampleShadow(vWorldPos, N);
  vec3 col = toonShade(albedo, N, V, sh, 1.0);
  col += lanternLight(albedo, vWorldPos, N);
  col = applyFog(col, vViewDist);
  writeGBuffer(col, N, uId, 0.5);
  }
}
`;

export function foliageMaterial(opts = {}) {
  const {
    color = 0x8fd18a,
    color2 = 0xb4e39a,
    leafTex,
    wind = 0.12,
    id = nextId(),
    vertexColors = false,
  } = opts;
  const defines = {};
  if (wind > 0) defines.USE_WIND = '';
  return new THREE.ShaderMaterial({
    name: 'foliage',
    glslVersion: THREE.GLSL3,
    defines,
    uniforms: {
      ...U,
      uLeafTex: { value: leafTex },
      uColor: { value: new THREE.Color(color) },
      uColor2: { value: new THREE.Color(color2) },
      uId: { value: id },
      uWindAmount: { value: wind },
      uCurveMul: { value: 1.0 },
    },
    vertexShader: foliageVert,
    fragmentShader: foliageFrag,
    vertexColors,
  });
}

// ---------------------------------------------------------------------------
// Herbe : touffes instanciées, pliées par le vent et par le joueur
// ---------------------------------------------------------------------------
const grassVert = /* glsl */ `
${CURVE}
${WIND}
uniform vec3 uPlayerPos;
varying vec3 vWorldPos;
varying vec3 vColor;
varying float vH;
varying float vViewDist;
void main() {
  mat4 m = modelMatrix * instanceMatrix;
  vec4 wp = m * vec4(position, 1.0);
  vec3 base = (m * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float h = uv.y;
  // près de la caméra : touffes plus basses et plus fines (lisibles en gros plan)
  float camD = distance(cameraPosition.xz, base.xz);
  float lod = mix(0.42, 1.0, smoothstep(3.0, 9.0, camD));
  vec3 local = wp.xyz - base;
  local.y *= lod;
  local.xz *= mix(0.65, 1.0, lod);
  wp.xyz = base + local;
  wp.xyz += windOffset(base, 0.28 * h * h, base.x * 0.9 + base.z * 0.4);
  vec3 d = wp.xyz - uPlayerPos;
  float dl = length(d.xz);
  float push = smoothstep(1.1, 0.0, dl) * h;
  wp.xz += normalize(d.xz + 0.0001) * push * 0.35;
  wp.y -= push * 0.18;
  vWorldPos = wp.xyz;
  vColor = vec3(1.0);
  #ifdef USE_INSTANCING_COLOR
  vColor = instanceColor;
  #endif
  vH = h;
  vec4 mv = viewMatrix * applyCurve(wp);
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const grassFrag = /* glsl */ `
${NOISE}
${SHADOW}
${TOON}
${MRT_OUT}
uniform float uId;
uniform vec3 uTipColor;
varying vec3 vWorldPos;
varying vec3 vColor;
varying float vH;
varying float vViewDist;
void main() {
  vec3 N = vec3(0.0, 1.0, 0.0);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 albedo = mix(vColor * 0.86, mix(vColor, uTipColor, 0.55) * 1.08, smoothstep(0.0, 1.0, vH));
  float sh = sampleShadow(vWorldPos, N);
  vec3 col = toonShade(albedo, N, V, sh, 0.4);
  col += lanternLight(albedo, vWorldPos, N);
  col = applyFog(col, vViewDist);
  writeGBuffer(col, N, uId, 0.0);
}
`;

export function grassMaterial(opts = {}) {
  const { id, tipColor = 0xd8efa0 } = opts;
  return new THREE.ShaderMaterial({
    name: 'grass',
    glslVersion: THREE.GLSL3,
    uniforms: {
      ...U,
      uId: { value: id },
      uTipColor: { value: new THREE.Color(tipColor) },
    },
    vertexShader: grassVert,
    fragmentShader: grassFrag,
    side: THREE.DoubleSide,
  });
}

// ---------------------------------------------------------------------------
// Lueurs additives (lucioles, halos de lanternes) — n'altèrent pas la normale
// ---------------------------------------------------------------------------
const glowVert = /* glsl */ `
${CURVE}
uniform float uSize;
varying vec2 vUv;
void main() {
  vec4 wp = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float sc = length(modelMatrix[0].xyz);
  #ifdef USE_INSTANCING
  wp = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  sc *= length(instanceMatrix[0].xyz);
  #endif
  vec4 mv = viewMatrix * applyCurve(wp);
  mv.xy += position.xy * uSize * sc;
  vUv = position.xy + 0.5;
  gl_Position = projectionMatrix * mv;
}
`;
const glowFrag = /* glsl */ `
layout(location = 0) out highp vec4 outColor;
layout(location = 1) out highp vec4 outNormal;
uniform vec3 uGlowColor;
uniform float uIntensity;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.0, d);
  a = a * a;
  outColor = vec4(uGlowColor * uIntensity, a * uIntensity);
  outNormal = vec4(0.0);
}
`;

export function glowMaterial(color = 0xffc070, size = 1) {
  return new THREE.ShaderMaterial({
    name: 'glow',
    glslVersion: THREE.GLSL3,
    uniforms: {
      ...U,
      uGlowColor: { value: new THREE.Color(color) },
      uIntensity: { value: 1 },
      uSize: { value: size },
    },
    vertexShader: glowVert,
    fragmentShader: glowFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}
