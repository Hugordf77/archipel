import * as THREE from 'three';
import { LAYER_SHADOW } from '../core/globals.js';

function rng(seed) {
  let s = (seed * 9301 + 49297) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Construit une géométrie de touffes de billboards.
// clumps : [{ x, y, z, r, squash = 0.85, density = 1, color? (THREE.Color) }]
// Chaque quad porte une normale sphérique (direction depuis le centre de la touffe),
// ce qui donne après éclairage toon l'aspect d'une boule peinte.
export function buildClumpGeometry(clumps, seed = 1, opts = {}) {
  const { sizeMul = 1, minQuads = 8, maxQuads = 70 } = opts;
  const rand = rng(seed);
  const pos = [];
  const nrm = [];
  const corner = [];
  const data = [];
  const center = [];
  const col = [];
  const idx = [];
  let v = 0;
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const c of clumps) {
    const squash = c.squash ?? 0.85;
    const count = Math.round(Math.min(maxQuads, Math.max(minQuads, c.r * c.r * 8 * (c.density ?? 1))));
    const color = c.color ?? new THREE.Color(1, 1, 1);
    for (let q = 0; q < count; q++) {
      // direction aléatoire, biaisée vers la surface pour une silhouette ronde
      let dx;
      let dy;
      let dz;
      do {
        dx = rand() * 2 - 1;
        dy = rand() * 2 - 1;
        dz = rand() * 2 - 1;
      } while (dx * dx + dy * dy + dz * dz > 1 || dx * dx + dy * dy + dz * dz < 0.01);
      const len = Math.hypot(dx, dy, dz);
      dx /= len;
      dy /= len;
      dz /= len;
      const shell = 0.45 + Math.pow(rand(), 0.6) * 0.55;
      const ox = dx * c.r * shell;
      const oy = dy * c.r * shell * squash;
      const oz = dz * c.r * shell;
      const nl = Math.hypot(dx, dy / squash, dz);
      const size = c.r * (0.55 + rand() * 0.3) * sizeMul;
      const rnd = rand();
      const atlas = Math.floor(rand() * 4);
      for (const [cx, cy] of corners) {
        pos.push(c.x + ox, c.y + oy, c.z + oz);
        nrm.push(dx / nl, dy / squash / nl, dz / nl);
        corner.push(cx, cy);
        data.push(size, rnd, shell, atlas);
        center.push(c.x, c.y, c.z);
        col.push(color.r, color.g, color.b);
      }
      idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
      v += 4;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aCorner', new THREE.Float32BufferAttribute(corner, 2));
  g.setAttribute('aData', new THREE.Float32BufferAttribute(data, 4));
  g.setAttribute('aCenter', new THREE.Float32BufferAttribute(center, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  // les billboards débordent de leur centre : on agrandit la sphère englobante
  g.boundingSphere.radius += 3;
  return g;
}

// Proxys sphériques invisibles qui projettent l'ombre des feuillages
// (instanciés : un seul appel de dessin dans la passe d'ombre)
export function buildShadowProxies(clumps) {
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshBasicMaterial(), clumps.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  clumps.forEach((c, i) => {
    p.set(c.x, c.y, c.z);
    s.set(c.r * 0.92, c.r * 0.92 * (c.squash ?? 0.85), c.r * 0.92);
    mesh.setMatrixAt(i, m.compose(p, q, s));
  });
  mesh.layers.set(LAYER_SHADOW);
  mesh.frustumCulled = false;
  return mesh;
}
