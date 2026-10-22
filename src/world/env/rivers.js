// Eau douce des îles générées : rivières (rubans qui suivent leur niveau, donc des
// cascades là où il chute), lacs (shader d'eau au niveau du lac), écume au pied des chutes.
import * as THREE from 'three';
import { U } from '../../core/globals.js';
import { NOISE, CURVE, TOON, MRT_OUT } from '../../render/shaders/chunks.js';
import { waterMaterial } from './water.js';

const riverVert = /* glsl */ `
${CURVE}
attribute vec2 aFlow; // x : distance le long du lit (m), y : pente (chute par mètre)
varying vec3 vWorldPos;
varying vec2 vUv;
varying float vSlope;
varying float vViewDist;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vUv = vec2(uv.x, aFlow.x);
  vSlope = aFlow.y;
  vec4 mv = viewMatrix * applyCurve(wp);
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;
const riverFrag = /* glsl */ `
${NOISE}
${TOON}
${MRT_OUT}
uniform float uTime;
uniform vec3 uWaterShallow;
uniform vec3 uWaterDeep;
uniform vec3 uSkyHorizon;
uniform vec3 uWorldOffset;
varying vec3 vWorldPos;
varying vec2 vUv;
varying float vSlope;
varying float vViewDist;
void main() {
  float across = abs(vUv.x - 0.5) * 2.0;
  float fall = smoothstep(0.25, 0.7, vSlope);
  float speed = 0.6 + vSlope * 6.0;
  float n1 = vnoise(vec2(vUv.x * 4.0, vUv.y * 0.35 - uTime * speed));
  float n2 = vnoise(vec2(vUv.x * 9.0 + 3.0, vUv.y * 0.9 - uTime * speed * 1.4));
  vec3 col = mix(uWaterShallow, uWaterDeep, (1.0 - across) * 0.55 + n1 * 0.15);
  col = mix(col, mix(uSkyHorizon, vec3(1.0), 0.4), smoothstep(0.55, 0.8, n2) * 0.25);
  // berges et chutes : écume blanche
  vec3 foamCol = mix(vec3(1.0, 0.99, 0.95), uSunColor, 0.2) * mix(1.0, 0.7, uNight);
  float foam = smoothstep(0.72, 0.98, across + (n1 - 0.5) * 0.3);
  foam = max(foam, fall * (0.55 + 0.45 * smoothstep(0.35, 0.7, n2)));
  col = mix(col, foamCol, clamp(foam, 0.0, 1.0) * 0.85);
  col *= mix(uShadowTint * 1.25, uSunColor, 0.75);
  col = applyFog(col, vViewDist);
  writeGBuffer(col, vec3(0.0, 1.0, 0.0), 0.0, 0.0);
}
`;

let riverMat = null;
function riverMaterial() {
  riverMat ||= new THREE.ShaderMaterial({
    name: 'riviere',
    glslVersion: THREE.GLSL3,
    uniforms: { ...U },
    vertexShader: riverVert,
    fragmentShader: riverFrag,
    side: THREE.DoubleSide,
  });
  return riverMat;
}

// rubans de toutes les rivières d'une île (coordonnées locales à l'île)
export function buildRivers(rivers) {
  const pos = [];
  const uv = [];
  const flow = [];
  const idx = [];
  let v = 0;
  for (const rv of rivers) {
    const p = rv.pts;
    const m = p.length / 4;
    if (m < 2) continue;
    let dist = 0;
    for (let i = 0; i < m; i++) {
      const a = Math.max(0, i - 1);
      const b = Math.min(m - 1, i + 1);
      let tx = p[b * 4] - p[a * 4];
      let tz = p[b * 4 + 1] - p[a * 4 + 1];
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl;
      tz /= tl;
      if (i > 0) dist += Math.hypot(p[i * 4] - p[(i - 1) * 4], p[i * 4 + 1] - p[(i - 1) * 4 + 1]);
      const half = p[i * 4 + 3] * 0.5 + 0.35;
      const drop = (p[a * 4 + 2] - p[b * 4 + 2]) / Math.max(0.5, tl);
      const y = p[i * 4 + 2] + 0.02;
      // à l'embouchure, le ruban plonge doucement sous la mer
      for (const side of [-1, 1]) {
        pos.push(p[i * 4] - tz * half * side, y, p[i * 4 + 1] + tx * half * side);
        uv.push(side < 0 ? 0 : 1, 0);
        flow.push(dist, drop);
      }
      if (i < m - 1) idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
      v += 2;
    }
  }
  if (!v) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, riverMaterial());
  mesh.name = 'rivieres';
  mesh.renderOrder = 2;
  return mesh;
}

// un lac : cellules de 4 m (débordant d'une cellule, le relief cache le surplus)
export function buildLake(lake, plan) {
  const { n, s, ext } = plan;
  // clip : cases dessinées [i0, j0, i1, j1] (sections des grandes îles : leur carré seulement)
  const [i0, j0, i1, j1] = lake.clip || [0, 0, n - 1, n - 1];
  const cells = new Set();
  for (const c of lake.cells) {
    const i = c % n;
    const j = (c - i) / n;
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (i + di < i0 || i + di > i1 || j + dj < j0 || j + dj > j1) continue;
        cells.add((j + dj) * n + (i + di));
      }
    }
  }
  if (!cells.size) return null;
  const pos = [];
  const idx = [];
  let v = 0;
  for (const c of cells) {
    const i = c % n;
    const j = (c - i) / n;
    const x = -ext + i * s - s / 2;
    const z = -ext + j * s - s / 2;
    pos.push(x, 0, z, x + s, 0, z, x, 0, z + s, x + s, 0, z + s);
    idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
    v += 4;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(pos.length).map((_, k) => (k % 3 === 1 ? 1 : 0)), 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, waterMaterial({ level: lake.level, waveAmp: 0.025, foam: 0.85 }));
  mesh.name = 'lac';
  return mesh;
}

// écume au pied des cascades : taches claires posées à plat (même rendu que le sillage)
const FOAM_VERT = /* glsl */ `
${CURVE}
uniform float uTime;
attribute float aSeed;
varying vec2 vUv;
varying float vSeed;
void main() {
  float pulse = 1.0 + 0.15 * sin(uTime * 3.0 + aSeed * 6.0);
  vec4 wp = modelMatrix * instanceMatrix * vec4(position.x * pulse, 0.0, position.y * pulse, 1.0);
  vUv = position.xy + 0.5;
  vSeed = aSeed;
  gl_Position = projectionMatrix * viewMatrix * applyCurve(wp);
}
`;
const FOAM_FRAG = /* glsl */ `
layout(location = 0) out highp vec4 outColor;
layout(location = 1) out highp vec4 outNormal;
uniform float uTime;
uniform float uNight;
varying vec2 vUv;
varying float vSeed;
float h21(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 q = vUv - 0.5;
  float d = length(q) * 2.0;
  float n = h21(floor((vUv + vec2(uTime * 0.05, vSeed)) * 10.0)) * 0.3;
  float a = smoothstep(1.0, 0.45, d + n);
  outColor = vec4(vec3(1.0, 0.99, 0.96) * mix(1.0, 0.7, uNight), a * 0.8);
  outNormal = vec4(0.0);
}
`;
export function buildFallFoam(falls) {
  if (!falls.length) return null;
  const geo = new THREE.InstancedBufferGeometry();
  const plane = new THREE.PlaneGeometry(1, 1);
  geo.index = plane.index;
  geo.setAttribute('position', plane.attributes.position);
  const seeds = new Float32Array(falls.length * 3);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  const mat = new THREE.ShaderMaterial({ name: 'ecume-cascade', glslVersion: THREE.GLSL3, uniforms: { ...U }, vertexShader: FOAM_VERT, fragmentShader: FOAM_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geo, mat, falls.length * 3);
  const m = new THREE.Matrix4();
  falls.forEach((f, i) => {
    const dl = Math.hypot(f.dx, f.dz) || 1;
    for (let k = 0; k < 3; k++) {
      const s = (f.w || 3) * (1.2 + k * 0.5);
      m.makeScale(s, 1, s).setPosition(f.x + (f.dx / dl) * (2 + k * 1.5), f.bottom + 0.08, f.z + (f.dz / dl) * (2 + k * 1.5));
      mesh.setMatrixAt(i * 3 + k, m);
    }
  });
  mesh.renderOrder = 6;
  mesh.computeBoundingSphere();
  mesh.name = 'ecume-cascades';
  return mesh;
}
