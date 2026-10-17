import * as THREE from 'three';
import { toonMaterial } from '../shaders/materials.js';
import { U, nextId, LAYER_SHADOW } from './globals.js';

// ---------------------------------------------------------------------------
// Outils mathématiques
// ---------------------------------------------------------------------------
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
function hash(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
export function vnoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return lerp(lerp(hash(ix, iy), hash(ix + 1, iy), ux), lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), ux), uy);
}
export function distToPolyline(x, z, pts) {
  let best = Infinity;
  let bestT = 0;
  let acc = 0;
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) total += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz;
    const len = Math.sqrt(len2);
    const t = clamp(((x - ax) * dx + (z - az) * dz) / len2, 0, 1);
    const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
    if (d < best) {
      best = d;
      bestT = (acc + t * len) / total;
    }
    acc += len;
  }
  return { d: best, t: bestT };
}

// ---------------------------------------------------------------------------
// Plan de l'île (unités ≈ mètres ; le personnage mesure ~1)
// ---------------------------------------------------------------------------
export const LAYOUT = {
  waterLevel: 0,
  grassH: 1.0,
  upperH: 3.4,
  plateau: { cx: 2, cz: -17, rx: 15, rz: 8 },
  ramp: { x0: 11.6, x1: 14.8, zBottom: -7.2, zTop: -12.8 },
  river: [[-6.5, -23.5], [-5.6, -19.5], [-3.2, -16], [-3.8, -12.6], [-2, -9.2]],
  riverLevel: 3.16,
  pond: { x: -2, z: -7.0, r: 2.2, level: 0.74 },
  house: { x: 9, z: -1.2 },
  library: { x: 6.5, z: -18.2 },
  owl: { x: 6.5, z: -14.6 },
  tree: { x: -12.2, z: -0.6 },
  desk: { x: -11, z: 2.4 },
  pier: { x: 10.5, z0: 20.5, z1: 32, w: 2.4, h: 0.86 },
  garden: { x: -3, z: 9 },
  shop: { x: 16.5, z: 6.5 },
  spawn: { x: 0, z: 4 },
  paths: [
    [[9, 1.4], [6, 3], [2, 3.6], [-3, 3.8], [-7.5, 3.9], [-10.2, 3.6]],
    [[2, 3.6], [2.6, 6], [4.5, 12], [8, 17], [10.5, 20.8]],
    [[9, 1.4], [12, -2.5], [13.2, -7.2]],
    [[13.2, -12.8], [11.5, -14.4], [7.6, -14.8]],
    [[-3, 3.8], [-2.6, -4.2]],
    [[6, 3], [12, 5.5], [15.5, 6.2]],
  ],
};

// buttes : [x, z, rayon, hauteur]
const MOUNDS = [[12.5, 13.5, 3.8, 0.55], [-15.5, 8.2, 3.2, 0.45], [-5.2, 16.6, 2.8, 0.4]];

function beachProfile(rr) {
  const K = [[20.8, 0.55], [21.8, 0.5], [24.2, 0.32], [26.8, 0.0], [28.4, -0.55], [31, -1.6], [36, -3.2], [48, -4.6]];
  if (rr <= K[0][0]) return K[0][1];
  for (let i = 0; i < K.length - 1; i++) {
    if (rr < K[i + 1][0]) {
      const t = (rr - K[i][0]) / (K[i + 1][0] - K[i][0]);
      return lerp(K[i][1], K[i + 1][1], t);
    }
  }
  return K[K.length - 1][1];
}

export function coastRadius(angle) {
  return Math.sin(angle * 3 + 0.5) * 0.8 + Math.sin(angle * 5 + 2.1) * 0.45 + Math.sin(angle * 11 + 4.0) * 0.2;
}

// Hauteur brute du terrain (sans le ponton)
export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  const ang = Math.atan2(z, x);
  const rr = r + coastRadius(ang);
  let h = beachProfile(rr);
  const grass = smooth(21.3, 20.5, rr);
  h += grass * 0.45;
  h += grass * (vnoise(x * 0.18, z * 0.18) - 0.5) * 0.22;

  // buttes douces dans les grands prés
  for (const [bx, bz, br, bh] of MOUNDS) {
    const d = Math.hypot(x - bx, z - bz);
    if (d < br) h += bh * grass * (1 - smooth(0, br, d));
  }

  // plateau supérieur
  const P = LAYOUT.plateau;
  const ex = (x - P.cx) / P.rx;
  const ez = (z - P.cz) / P.rz;
  const ed = Math.sqrt(ex * ex + ez * ez) + (vnoise(x * 0.35, z * 0.35) - 0.5) * 0.07;
  const up = smooth(1.035, 0.975, ed);
  h = lerp(h, LAYOUT.upperH + (vnoise(x * 0.2 + 7, z * 0.2) - 0.5) * 0.16, up);

  // rampe vers le plateau
  const R = LAYOUT.ramp;
  const mx = smooth(R.x0 - 0.2, R.x0 + 0.3, x) * smooth(R.x1 + 0.2, R.x1 - 0.3, x);
  const mz = smooth(R.zBottom + 1.2, R.zBottom - 0.2, z);
  const t = clamp((R.zBottom - z) / (R.zBottom - R.zTop), 0, 1);
  const rampH = lerp(LAYOUT.grassH, LAYOUT.upperH, t);
  h = Math.max(h, lerp(h, rampH, mx * mz));

  // rivière creusée dans le plateau
  const riv = distToPolyline(x, z, LAYOUT.river);
  const channel = smooth(1.05, 0.4, riv.d) * smooth(0.6, 0.9, up);
  h -= channel * 0.5;

  // bassin au pied de la cascade
  const pd = Math.hypot(x - LAYOUT.pond.x, z - LAYOUT.pond.z);
  const pm = smooth(LAYOUT.pond.r + 0.5, LAYOUT.pond.r - 0.5, pd);
  h = Math.min(h, lerp(h, 0.05 + Math.pow(pd / LAYOUT.pond.r, 2) * 0.6, pm));
  return h;
}

// Masque de chemin (0..1)
export function pathMask(x, z) {
  let m = 0;
  for (const p of LAYOUT.paths) {
    const { d } = distToPolyline(x, z, p);
    const w = 0.62 + (vnoise(x * 0.9, z * 0.9) - 0.5) * 0.35;
    m = Math.max(m, smooth(w + 0.2, w - 0.15, d));
  }
  return m;
}

// ---------------------------------------------------------------------------
// Maillage du terrain
// ---------------------------------------------------------------------------
const C = {
  sandDry: new THREE.Color('#f8ecd5'),
  sandWet: new THREE.Color('#e4cfa9'),
  sandDeep: new THREE.Color('#cbb994'),
  grass: new THREE.Color('#97d6a0'),
  grassLight: new THREE.Color('#a9ddae'),
  grassDark: new THREE.Color('#84c99d'),
  grassYellow: new THREE.Color('#c0db90'),
  upper: new THREE.Color('#a9dc9c'),
  cliff: new THREE.Color('#dcb48f'),
  cliffDark: new THREE.Color('#c99e80'),
  path: new THREE.Color('#f2e2bd'),
};

export function buildTerrain() {
  const size = 78;
  const seg = 250;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
  }
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = nrm.getY(i);
    const n = vnoise(x * 0.25, z * 0.25);
    // sable
    c.copy(C.sandDry);
    c.lerp(C.sandWet, smooth(0.35, 0.08, y));
    c.lerp(C.sandDeep, smooth(0.0, -1.5, y));
    // herbe : 4 tons peints (3 menthes + 1 vert-jaune), lisière irrégulière avec le sable
    const edgeN = (vnoise(x * 0.9 + 3, z * 0.9) - 0.5) * 0.22;
    const grassAmt = smooth(0.8, 0.9, y + edgeN) * smooth(0.6, 0.8, ny);
    const n2 = vnoise(x * 0.11 + 9, z * 0.11 - 4);
    tmp.copy(C.grass).lerp(n > 0.5 ? C.grassLight : C.grassDark, Math.abs(n - 0.5) * 1.6);
    tmp.lerp(C.grassYellow, smooth(0.62, 0.8, n2) * 0.75);
    if (y > 2.6) tmp.lerp(C.upper, 0.5);
    c.lerp(tmp, grassAmt);
    // chemins : sous-couche douce (le tracé net est peint dans le shader)
    const pm = pathMask(x, z) * smooth(0.7, 0.9, y);
    c.lerp(C.path, pm * 0.45);
    // falaises
    const cliffAmt = 1 - smooth(0.5, 0.78, ny);
    tmp.copy(C.cliff).lerp(C.cliffDark, vnoise(x * 0.6, y * 2.5));
    c.lerp(tmp, cliffAmt * smooth(0.2, 0.7, y));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const id = nextId();
  const mat = toonMaterial({ vertexColors: true, terrain: true, id, outline: 1, rim: 0.6 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'terrain';
  mesh.layers.enable(LAYER_SHADOW);
  mesh.userData.terrainId = id;
  return mesh;
}

// Texture de distance aux chemins (R8) : le shader du terrain y peint des
// chemins aux bords nets mais irréguliers, avec une lisière plus foncée.
export function buildPathTexture() {
  const N = 512;
  const b = U.uHeightBounds.value;
  const data = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = b.x + ((i + 0.5) / N) * b.z;
      const z = b.y + ((j + 0.5) / N) * b.w;
      let d = 2;
      if (Math.abs(x) < 28 && Math.abs(z) < 28) {
        for (const p of LAYOUT.paths) d = Math.min(d, distToPolyline(x, z, p).d);
      }
      data[j * N + i] = Math.round(Math.min(1, d / 2) * 255);
    }
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RedFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

// Texture de hauteurs (R16F) utilisée par l'eau pour sa profondeur et son écume
export function buildHeightTexture() {
  const N = 256;
  const b = U.uHeightBounds.value; // minX, minZ, sizeX, sizeZ
  const data = new Uint16Array(N * N);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = b.x + ((i + 0.5) / N) * b.z;
      const z = b.y + ((j + 0.5) / N) * b.w;
      data[j * N + i] = THREE.DataUtils.toHalfFloat(heightAt(x, z));
    }
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RedFormat, THREE.HalfFloatType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}
