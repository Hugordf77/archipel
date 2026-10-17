import * as THREE from 'three';
import { U, nextId } from '../../core/globals.js';
import { NOISE, MRT_OUT } from '../../render/shaders/chunks.js';
import { buildClumpGeometry } from '../../render/foliage.js';
import { cloudAtlas } from '../../render/textures.js';

// Le monde courbé fait plonger l'horizon sous l'horizontale. Le ciel est donc
// exprimé dans un « espace ciel » relevé de uHorizonDip : l'horizon peint
// coïncide toujours avec le bord du rouleau, quel que soit l'angle de caméra.
const SKY_SPACE = /* glsl */ `
uniform float uHorizonDip;
vec3 toSkySpace(vec3 d) {
  float el = asin(clamp(d.y, -1.0, 1.0)) + uHorizonDip;
  vec2 hz = normalize(d.xz + vec2(1e-5));
  return vec3(hz.x * cos(el), sin(el), hz.y * cos(el));
}
vec3 fromSkySpace(vec3 d) {
  float el = asin(clamp(d.y, -1.0, 1.0)) - uHorizonDip;
  vec2 hz = normalize(d.xz + vec2(1e-5));
  return vec3(hz.x * cos(el), sin(el), hz.y * cos(el));
}
`;

// ---------------------------------------------------------------------------
// Dôme céleste peint : dégradé brossé, soleil, lune, étoiles
// ---------------------------------------------------------------------------
const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * wp;
  gl_Position.z = gl_Position.w * 0.99999;
}
`;

const skyFrag = /* glsl */ `
${NOISE}
${MRT_OUT}
${SKY_SPACE}
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uSunGlow;
uniform vec3 uSunSkyDir;
uniform vec3 uMoonDir;
uniform float uStars;
uniform float uNight;
uniform float uTime;
uniform float uRain;
varying vec3 vDir;

void main() {
  vec3 d = toSkySpace(normalize(vDir));
  float h = d.y;
  float az = atan(d.z, d.x);
  // traits horizontaux comme des coups de brosse
  float stroke = fbm(vec2(az * 2.5, h * 9.0) + vec2(uTime * 0.004, 0.0));
  float stroke2 = vnoise(vec2(az * 9.0, h * 40.0));
  float hh = h + (stroke - 0.5) * 0.06 + (stroke2 - 0.5) * 0.012;
  float t = smoothstep(-0.01, 0.22, hh);
  vec3 col = mix(uSkyHorizon, uSkyTop, pow(t, 0.8));
  // bande chaude du côté du soleil près de l'horizon
  float sunAmt = max(dot(d, uSunSkyDir), 0.0);
  float horizonBand = smoothstep(0.16, -0.01, hh);
  col = mix(col, uSunGlow, horizonBand * pow(sunAmt, 1.5) * 0.6 * (1.0 - uNight * 0.8));
  col += uSunGlow * pow(sunAmt, 12.0) * 0.4 * (1.0 - uNight);
  // disque solaire doux
  float sunDisc = smoothstep(0.9985, 0.9991, sunAmt);
  col = mix(col, vec3(1.0, 0.98, 0.9), sunDisc * (1.0 - uNight) * (1.0 - uRain * 0.8));
  // lune (croissant)
  float moonAmt = dot(d, uMoonDir);
  float moon = smoothstep(0.99955, 0.9997, moonAmt);
  vec3 offs = normalize(uMoonDir + vec3(0.009, 0.006, 0.0));
  float bite = smoothstep(0.99955, 0.9997, dot(d, offs));
  col = mix(col, vec3(1.0, 0.97, 0.86), moon * (1.0 - bite * 0.9) * uNight);
  col += vec3(0.6, 0.7, 1.0) * pow(max(moonAmt, 0.0), 80.0) * 0.3 * uNight;
  // étoiles
  if (uStars > 0.01 && h > 0.0) {
    vec3 p = d * 160.0;
    vec3 cell = floor(p);
    vec3 f = fract(p);
    float hs = hash13(cell);
    if (hs > 0.972) {
      vec3 sp = vec3(hash13(cell + 1.7), hash13(cell + 3.1), hash13(cell + 5.3)) * 0.6 + 0.2;
      float s = smoothstep(0.18, 0.0, length(f - sp));
      float tw = 0.6 + 0.4 * sin(uTime * (1.5 + hs * 3.0) + hs * 50.0);
      col += vec3(1.0, 0.95, 0.85) * s * tw * uStars * smoothstep(0.0, 0.05, h);
    }
  }
  // sous l'horizon : brume marine
  col = mix(col, uSkyHorizon * vec3(0.94, 0.97, 1.0), smoothstep(0.0, -0.05, h));
  writeGBuffer(col, -normalize(vDir), 0.0, 0.0);
}
`;

// ---------------------------------------------------------------------------
// Nuages : bouffées billboard à normales sphériques, placées en espace ciel
// ---------------------------------------------------------------------------
const cloudVert = /* glsl */ `
${SKY_SPACE}
attribute vec2 aCorner;
attribute vec4 aData;
uniform float uCloudRot;
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormalW;
varying float vShade;
varying float vHeight;
void main() {
  // position en espace ciel (relative à la caméra), tournée lentement
  float c = cos(uCloudRot);
  float s = sin(uCloudRot);
  vec3 rel = vec3(c * position.x - s * position.z, position.y, s * position.x + c * position.z);
  float r = length(rel);
  vec3 dirW = fromSkySpace(rel / r);
  vHeight = rel.y / r;
  vec4 wp = vec4(cameraPosition + dirW * r, 1.0);
  vec4 mv = viewMatrix * wp;
  float ang = aData.y * 6.2831;
  vec2 corner = mat2(cos(ang), sin(ang), -sin(ang), cos(ang)) * aCorner;
  mv.xy += corner * aData.x;
  vec3 n = normal;
  n = vec3(c * n.x - s * n.z, n.y, s * n.x + c * n.z);
  vec3 cornerW = transpose(mat3(viewMatrix)) * vec3(corner, 0.0);
  vNormalW = normalize(n + cornerW * 0.45);
  float idx = aData.w;
  vec2 cell = vec2(mod(idx, 2.0), floor(idx / 2.0));
  vUv = (aCorner * 0.5 + 0.5 + cell) * 0.5;
  vShade = aData.z;
  gl_Position = projectionMatrix * mv;
}
`;
const cloudFrag = /* glsl */ `
${MRT_OUT}
uniform sampler2D uLeafTex;
uniform vec3 uSunDir;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform vec3 uSunGlow;
uniform vec3 uSkyHorizon;
uniform float uNight;
uniform float uRain;
uniform float uId;
varying vec2 vUv;
varying vec3 vNormalW;
varying float vShade;
varying float vHeight;
void main() {
  vec4 tex = texture(uLeafTex, vUv);
  if (tex.a < 0.5) discard;
  vec3 N = normalize(vNormalW);
  float ndl = dot(N, uSunDir) * 0.5 + 0.5;
  float r = smoothstep(0.36, 0.44, ndl) * 0.45 + smoothstep(0.58, 0.66, ndl) * 0.35 + smoothstep(0.78, 0.86, ndl) * 0.2;
  vec3 col = mix(uCloudShade, uCloudLit, r);
  col = mix(col, col * 0.93, (1.0 - vShade) * 0.4);
  col *= 0.97 + 0.06 * tex.g;
  col = mix(col, col * vec3(0.78, 0.8, 0.88), uRain * 0.6);
  // brume vers l'horizon
  col = mix(col, uSkyHorizon, smoothstep(0.12, 0.0, vHeight) * 0.45);
  writeGBuffer(col, N, uId, 0.5);
}
`;

function rng(seed) {
  let s = (seed * 9301 + 49297) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildClouds() {
  const rand = rng(12);
  const clumps = [];
  const count = 18;
  const R = 520;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rand() * 0.25;
    // élévation en espace ciel (radians) : bas sur l'horizon, quelques-uns plus hauts
    const el = 0.03 + Math.pow(rand(), 1.6) * 0.16;
    const cx = Math.cos(a) * Math.cos(el) * R;
    const cy = Math.sin(el) * R;
    const cz = Math.sin(a) * Math.cos(el) * R;
    const n = 5 + Math.floor(rand() * 5);
    const scale = 13 + rand() * 12;
    const tx = -Math.sin(a);
    const tz = Math.cos(a);
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1);
      const off = (u - 0.5) * scale * 2.8;
      const r = scale * (0.5 + Math.sin(u * Math.PI) * 0.65) * (0.8 + rand() * 0.3);
      clumps.push({
        x: cx + tx * off + (rand() - 0.5) * scale * 0.3,
        y: cy + r * 0.25 + (rand() - 0.5) * scale * 0.15,
        z: cz + tz * off + (rand() - 0.5) * scale * 0.3,
        r,
        squash: 0.6,
        density: 0.1,
      });
    }
  }
  const geo = buildClumpGeometry(clumps, 99, { sizeMul: 1.05, minQuads: 10, maxQuads: 24 });
  const mat = new THREE.ShaderMaterial({
    name: 'cloud',
    glslVersion: THREE.GLSL3,
    uniforms: { ...U, uLeafTex: { value: cloudAtlas() }, uId: { value: nextId() } },
    vertexShader: cloudVert,
    fragmentShader: cloudFrag,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -5;
  mesh.name = 'clouds';
  return mesh;
}

export class Sky {
  constructor() {
    this.group = new THREE.Group();
    const geo = new THREE.SphereGeometry(900, 48, 24);
    const mat = new THREE.ShaderMaterial({
      name: 'sky',
      glslVersion: THREE.GLSL3,
      uniforms: { ...U },
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.dome = new THREE.Mesh(geo, mat);
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    this.clouds = buildClouds();
    this.group.add(this.dome, this.clouds);
  }

  update(camera, dt) {
    this.dome.position.copy(camera.position);
    U.uCloudRot.value += dt * 0.004 * (1 + U.uRain.value * 2);
  }
}

// Calcule l'angle (radians) dont l'horizon du rouleau plonge sous l'horizontale
export function computeHorizonDip(camera, origin, forward, curvature) {
  let best = -Infinity;
  const cx = camera.position.x;
  const cy = camera.position.y;
  const cz = camera.position.z;
  for (let s = 0; s <= 3000; s += s < 80 ? 1.5 : s < 600 ? 8 : 40) {
    const px = origin.x + forward.x * s;
    const pz = origin.z + forward.y * s;
    const py = -curvature * s * s;
    const hd = Math.hypot(px - cx, pz - cz);
    const el = Math.atan2(py - cy, hd);
    if (el > best) best = el;
  }
  return Math.max(0, -best);
}
