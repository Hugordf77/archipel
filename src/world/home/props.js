import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Builder, G } from '../../render/builder.js';
import { nextId, LAYER_SHADOW } from '../../core/globals.js';
import { LAYOUT, heightAt } from './terrain.js';
import { toonMaterial } from '../../render/shaders/materials.js';

// Palette pastel chaude (couleurs « gouache »)
export const PAL = {
  wood: '#c98f5f',
  woodLight: '#e0b07e',
  woodDark: '#9f6b48',
  cream: '#fbf0dc',
  stone: '#ddd2c6',
  stoneWarm: '#e6d4bd',
  rock: '#cfc3d4',
  rockWarm: '#dccbb8',
  roof: '#f19b86',
  roofTeal: '#86c6bb',
  bark: '#b98a64',
  barkDark: '#9a6f50',
  soil: '#b88a66',
  soilDark: '#a07658',
  glass: '#ffeab8',
  mint: '#9fdcc8',
  coral: '#f4a28c',
  butter: '#f6d78a',
  lilac: '#c7b2e6',
  sky: '#9cc8ec',
  white: '#fff8ee',
  leaf: '#8fd08a',
  leafDeep: '#74c08a',
  leafLight: '#b3e39a',
  blossom: '#f6b9c8',
  palm: '#7fc98a',
  palmTrunk: '#d8b58b',
};

function rng(seed) {
  let s = (seed * 9301 + 49297) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const UP = new THREE.Vector3(0, 1, 0);
// Ajoute un cylindre orienté entre deux points
function segment(b, color, a, c, rBottom, rTop, sides = 14) {
  const dir = new THREE.Vector3().subVectors(c, a);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  const mid = new THREE.Vector3().addVectors(a, c).multiplyScalar(0.5);
  b.add(G.cyl(rTop, rBottom, len, sides), color, { p: [mid.x, mid.y, mid.z], r: [e.x, e.y, e.z] });
}

// Feuille de palmier pliée, visible des deux côtés
export function palmFrondGeometry(len = 2.3, width = 0.6) {
  const segs = 9;
  const pos = [];
  const idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = t * len;
    const y = Math.sin(t * 1.6) * 0.45 - t * t * 1.25;
    const w = width * Math.sin(Math.min(1, t * 1.25 + 0.08) * Math.PI) * (1 - t * 0.25);
    const fold = w * 0.38;
    pos.push(x, y - fold, -w, x, y + fold * 0.4, 0, x, y - fold, w);
    if (i < segs) {
      const a = i * 3;
      idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
    }
  }
  const front = new THREE.BufferGeometry();
  front.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  front.setIndex(idx);
  front.computeVertexNormals();
  const back = front.clone();
  const bi = back.index.array.slice();
  for (let i = 0; i < bi.length; i += 3) {
    const t = bi[i];
    bi[i] = bi[i + 2];
    bi[i + 2] = t;
  }
  back.setIndex(Array.from(bi));
  back.computeVertexNormals();
  return mergeGeometries([front.toNonIndexed(), back.toNonIndexed()]);
}

export function buildProps() {
  const statics = [];
  const glass = new Builder(nextId());
  const clumps = [];
  const obstacles = [];
  const lanterns = [];
  const spots = { plots: [] };
  const push = (b) => statics.push(b.build());

  // -------------------------------------------------------------------------
  // Maison du joueur : chaumière ronde au toit gonflé
  // -------------------------------------------------------------------------
  {
    const { x, z } = LAYOUT.house;
    const y = heightAt(x, z) - 0.05;
    const b = new Builder();
    b.add(G.cyl(2.35, 2.55, 0.4, 28), PAL.stone, { p: [x, y + 0.1, z] });
    b.add(G.cyl(2.0, 2.12, 2.3, 28), PAL.cream, {
      p: [x, y + 1.45, z],
      colorFn: (c, px, py) => c.multiplyScalar(0.94 + 0.06 * THREE.MathUtils.clamp(py - y - 0.3, 0, 1)),
    });
    b.add(G.torus(2.04, 0.1, 8, 36), PAL.wood, { p: [x, y + 2.55, z], r: [Math.PI / 2, 0, 0] });
    const roof = [[2.45, 0], [2.9, 0.14], [2.85, 0.42], [2.25, 1.05], [1.35, 1.8], [0.5, 2.25], [0, 2.33]];
    b.add(G.lathe(roof, 30), PAL.roof, {
      p: [x, y + 2.5, z],
      colorFn: (c, px, py) => c.lerp(new THREE.Color('#e4826f'), THREE.MathUtils.clamp(1.0 - (py - y - 2.5) / 1.2, 0, 1) * 0.35),
    });
    // petite boule sur le toit
    b.add(G.sphere(0.22, 12, 10), PAL.butter, { p: [x, y + 4.9, z] });
    // cheminée
    b.add(G.cyl(0.27, 0.32, 1.1, 12), PAL.stone, { p: [x + 1.0, y + 4.2, z - 0.7] });
    b.add(G.cyl(0.37, 0.37, 0.18, 12), PAL.stoneWarm, { p: [x + 1.0, y + 4.8, z - 0.7] });
    // porte arrondie (face +z)
    const dz = z + 2.0;
    b.add(G.box(1.0, 1.45, 0.22, 0.06), PAL.wood, { p: [x, y + 0.98, dz] });
    b.add(G.cyl(0.5, 0.5, 0.22, 20), PAL.wood, { p: [x, y + 1.7, dz], r: [Math.PI / 2, 0, 0] });
    b.add(G.torus(0.56, 0.07, 6, 20, Math.PI), PAL.woodDark, { p: [x, y + 1.7, dz + 0.1] });
    b.add(G.sphere(0.07, 8, 6), PAL.butter, { p: [x + 0.3, y + 1.05, dz + 0.14] });
    b.add(G.box(1.5, 0.16, 0.8, 0.06), PAL.stoneWarm, { p: [x, y + 0.25, dz + 0.55] });
    // fenêtres rondes + jardinières
    for (const a of [-0.8, 0.8]) {
      const wx = x + Math.sin(a) * 2.05;
      const wz = z + Math.cos(a) * 2.05;
      b.add(G.torus(0.42, 0.08, 8, 22), PAL.woodLight, { p: [wx, y + 1.65, wz], r: [0, a, 0] });
      glass.add(G.cyl(0.4, 0.4, 0.1, 20), PAL.glass, { p: [wx - Math.sin(a) * 0.02, y + 1.65, wz - Math.cos(a) * 0.02], r: [Math.PI / 2, a, 0] });
      const bx = x + Math.sin(a) * 2.25;
      const bz = z + Math.cos(a) * 2.25;
      b.add(G.box(0.85, 0.22, 0.3, 0.05), PAL.woodDark, { p: [bx, y + 1.05, bz], r: [0, a, 0] });
      for (let k = -1; k <= 1; k++) {
        const fx = bx + Math.cos(a) * k * 0.25;
        const fz = bz - Math.sin(a) * k * 0.25;
        b.add(G.sphere(0.13, 8, 6), [PAL.coral, PAL.butter, PAL.lilac][k + 1], { p: [fx, y + 1.25, fz] });
      }
    }
    // boîte aux lettres
    b.add(G.cyl(0.06, 0.06, 0.9, 8), PAL.woodDark, { p: [x - 2.0, y + 0.5, z + 2.6] });
    b.add(G.box(0.4, 0.32, 0.55, 0.12), PAL.sky, { p: [x - 2.0, y + 1.05, z + 2.6] });
    b.add(G.box(0.05, 0.18, 0.08, 0.02), PAL.coral, { p: [x - 1.78, y + 1.2, z + 2.55] });
    push(b);
    obstacles.push({ x, z, r: 2.55 });
    obstacles.push({ x: x - 2.0, z: z + 2.6, r: 0.3 });
    spots.house = { x, z: z + 3.1 };
  }

  // -------------------------------------------------------------------------
  // Bibliothèque du hibou : souche géante sur le plateau
  // -------------------------------------------------------------------------
  {
    const { x, z } = LAYOUT.library;
    const y = heightAt(x, z) - 0.1;
    const b = new Builder();
    const stump = [[3.35, 0], [3.0, 0.4], [2.72, 1.2], [2.6, 2.6], [2.66, 3.5], [2.74, 3.8], [2.5, 3.98], [0, 4.02]];
    b.add(G.lathe(stump, 30), PAL.bark, {
      p: [x, y, z],
      colorFn: (c, px, py, pz) => c.multiplyScalar(0.9 + 0.1 * Math.sin(Math.atan2(pz - z, px - x) * 16 + py * 0.6)),
    });
    b.add(G.cyl(2.52, 2.52, 0.08, 30), '#ecd0a6', { p: [x, y + 4.0, z] });
    // toit-champignon
    const cap = [[0, 0], [3.0, 0.05], [3.25, 0.35], [2.9, 0.95], [2.0, 1.55], [0.9, 1.9], [0, 2.0]];
    b.add(G.lathe(cap, 30), PAL.roofTeal, { p: [x, y + 4.0, z] });
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + 0.3;
      const rr = 1.2 + (i % 3) * 0.5;
      b.add(G.sphere(0.24, 10, 8), PAL.white, { p: [x + Math.cos(a) * rr, y + 4.0 + 1.85 - rr * 0.42, z + Math.sin(a) * rr], s: [1, 0.5, 1] });
    }
    // racines
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.2;
      b.add(G.capsule(0.35, 1.4, 4, 10), PAL.barkDark, {
        p: [x + Math.cos(a) * 3.1, y + 0.2, z + Math.sin(a) * 3.1],
        r: [0, -a, Math.PI / 2 - 0.25],
        s: [1, 1, 0.8],
      });
    }
    // porte ronde (face +z)
    const dz = z + 2.62;
    b.add(G.box(1.1, 1.5, 0.3, 0.08), PAL.woodLight, { p: [x, y + 0.95, dz] });
    b.add(G.cyl(0.55, 0.55, 0.3, 20), PAL.woodLight, { p: [x, y + 1.7, dz], r: [Math.PI / 2, 0, 0] });
    b.add(G.torus(0.62, 0.08, 6, 20, Math.PI), PAL.woodDark, { p: [x, y + 1.7, dz + 0.12] });
    b.add(G.sphere(0.07, 8, 6), PAL.butter, { p: [x - 0.32, y + 1.0, dz + 0.17] });
    // auvent
    b.add(G.box(1.8, 0.1, 0.9, 0.04), PAL.coral, { p: [x, y + 2.55, dz + 0.4], r: [0.35, 0, 0] });
    // enseigne : livre ouvert
    b.add(G.box(1.0, 0.65, 0.1, 0.05), PAL.woodDark, { p: [x, y + 3.15, dz + 0.05] });
    b.add(G.box(0.38, 0.4, 0.06, 0.03), PAL.white, { p: [x - 0.19, y + 3.17, dz + 0.12], r: [0, 0.25, 0] });
    b.add(G.box(0.38, 0.4, 0.06, 0.03), PAL.white, { p: [x + 0.19, y + 3.17, dz + 0.12], r: [0, -0.25, 0] });
    // fenêtres
    for (const [a, h] of [[-0.75, 2.2], [0.8, 1.6], [2.2, 2.0], [-2.3, 1.7]]) {
      const wx = x + Math.sin(a) * 2.68;
      const wz = z + Math.cos(a) * 2.68;
      b.add(G.torus(0.4, 0.09, 8, 22), PAL.woodDark, { p: [wx, y + h, wz], r: [0, a, 0] });
      glass.add(G.cyl(0.38, 0.38, 0.12, 20), PAL.glass, { p: [wx, y + h, wz], r: [Math.PI / 2, a, 0] });
    }
    push(b);
    obstacles.push({ x, z, r: 3.4 });

    // pupitre du hibou + chariot de livres
    const o = LAYOUT.owl;
    const oy = heightAt(o.x, o.z);
    const p = new Builder();
    p.add(G.cyl(0.12, 0.18, 1.0, 10), PAL.woodDark, { p: [o.x, oy + 0.5, o.z] });
    p.add(G.box(0.8, 0.1, 0.55, 0.04), PAL.wood, { p: [o.x, oy + 1.04, o.z], r: [0.25, 0, 0] });
    p.add(G.cyl(0.4, 0.45, 0.12, 14), PAL.woodDark, { p: [o.x, oy + 0.06, o.z] });
    // perchoir
    p.add(G.cyl(0.05, 0.05, 1.3, 8), PAL.woodDark, { p: [o.x + 1.0, oy + 0.65, o.z - 0.1] });
    p.add(G.cyl(0.05, 0.05, 0.8, 8), PAL.woodDark, { p: [o.x + 1.0, oy + 1.3, o.z - 0.1], r: [0, 0, Math.PI / 2] });
    // chariot de livres
    const cx = o.x - 1.7;
    const cz = o.z - 0.5;
    p.add(G.box(1.1, 0.7, 0.55, 0.06), PAL.wood, { p: [cx, oy + 0.6, cz] });
    for (const wx of [-0.4, 0.4]) p.add(G.cyl(0.14, 0.14, 0.08, 12), PAL.woodDark, { p: [cx + wx, oy + 0.15, cz + 0.3], r: [Math.PI / 2, 0, 0] });
    const books = [PAL.coral, PAL.sky, PAL.butter, PAL.mint, PAL.lilac, PAL.roof];
    for (let i = 0; i < 6; i++) {
      p.add(G.box(0.13, 0.36 + (i % 3) * 0.05, 0.4, 0.03), books[i], { p: [cx - 0.38 + i * 0.15, oy + 1.12, cz], r: [0, 0, (i === 5 ? 0.25 : 0)] });
    }
    push(p);
    obstacles.push({ x: o.x, z: o.z, r: 0.45 }, { x: cx, z: cz, r: 0.6 });
    spots.owl = { x: o.x, z: o.z + 1.2, perch: new THREE.Vector3(o.x + 1.0, oy + 1.38, o.z - 0.1), lectern: new THREE.Vector3(o.x, oy + 1.1, o.z) };
  }

  // -------------------------------------------------------------------------
  // Bureau d'étude sous le grand arbre
  // -------------------------------------------------------------------------
  {
    const { x, z } = LAYOUT.desk;
    const y = heightAt(x, z);
    const b = new Builder();
    // tapis rond
    b.add(G.cyl(1.7, 1.7, 0.04, 30), '#f3c9a8', { p: [x, y + 0.02, z - 0.4], s: [1.2, 1, 0.9] });
    b.add(G.torus(1.5, 0.05, 6, 30), '#e9a98b', { p: [x, y + 0.05, z - 0.4], r: [Math.PI / 2, 0, 0], s: [1.2, 0.9, 1] });
    // plateau + pieds
    b.add(G.box(1.9, 0.12, 0.95, 0.05), PAL.woodLight, { p: [x, y + 0.8, z] });
    for (const [lx, lz] of [[-0.82, -0.38], [0.82, -0.38], [-0.82, 0.38], [0.82, 0.38]]) {
      b.add(G.cyl(0.06, 0.05, 0.78, 8), PAL.wood, { p: [x + lx, y + 0.4, z + lz] });
    }
    b.add(G.box(0.62, 0.24, 0.85, 0.05), PAL.wood, { p: [x + 0.55, y + 0.62, z] });
    b.add(G.sphere(0.05, 6, 6), PAL.butter, { p: [x + 0.55, y + 0.62, z + 0.44] });
    // livres empilés
    const bc = [PAL.coral, PAL.sky, PAL.mint];
    for (let i = 0; i < 3; i++) {
      b.add(G.box(0.5, 0.11, 0.36, 0.03), bc[i], { p: [x - 0.62, y + 0.92 + i * 0.115, z + 0.05], r: [0, i * 0.2 - 0.1, 0] });
    }
    // cahier ouvert
    b.add(G.box(0.34, 0.03, 0.46, 0.01), PAL.white, { p: [x - 0.08, y + 0.885, z + 0.08], r: [0, 0, 0.06] });
    b.add(G.box(0.34, 0.03, 0.46, 0.01), PAL.white, { p: [x + 0.26, y + 0.885, z + 0.08], r: [0, 0, -0.06] });
    // pot à crayons
    b.add(G.cyl(0.08, 0.07, 0.18, 10), PAL.lilac, { p: [x + 0.72, y + 0.95, z - 0.25] });
    for (const [px, c] of [[-0.03, PAL.butter], [0.03, PAL.coral], [0.0, PAL.sky]]) {
      b.add(G.cyl(0.015, 0.015, 0.22, 5), c, { p: [x + 0.72 + px, y + 1.07, z - 0.25 + px], r: [px * 4, 0, px * 3] });
    }
    // lampe de bureau
    b.add(G.cyl(0.13, 0.15, 0.05, 12), PAL.mint, { p: [x + 0.62, y + 0.89, z + 0.25] });
    segment(b, PAL.mint, new THREE.Vector3(x + 0.62, y + 0.9, z + 0.25), new THREE.Vector3(x + 0.55, y + 1.32, z + 0.18), 0.025, 0.025, 6);
    segment(b, PAL.mint, new THREE.Vector3(x + 0.55, y + 1.32, z + 0.18), new THREE.Vector3(x + 0.3, y + 1.38, z + 0.15), 0.025, 0.025, 6);
    b.add(G.cone(0.17, 0.2, 14), PAL.mint, { p: [x + 0.28, y + 1.32, z + 0.15], r: [0, 0, 0.3] });
    glass.add(G.sphere(0.07, 8, 6), PAL.glass, { p: [x + 0.28, y + 1.24, z + 0.15] });
    // tabouret (derrière le bureau, côté arbre)
    const sz = z - 0.85;
    b.add(G.cyl(0.3, 0.26, 0.42, 16), PAL.wood, { p: [x, y + 0.21, sz] });
    b.add(G.sphere(0.34, 14, 10), PAL.coral, { p: [x, y + 0.45, sz], s: [1, 0.32, 1] });
    push(b);
    obstacles.push({ x: x - 0.55, z, r: 0.6 }, { x: x + 0.55, z, r: 0.6 });
    spots.desk = { x, z: sz, seatY: y + 0.52, deskTop: new THREE.Vector3(x, y + 0.86, z), potPos: new THREE.Vector3(x - 0.25, y + 0.86, z - 0.2) };
  }

  // -------------------------------------------------------------------------
  // Grand arbre
  // -------------------------------------------------------------------------
  function trunkAlong(b, x, z, y, height, r0, r1, bend, seed) {
    const rand = rng(seed);
    const pts = [];
    const n = 5;
    const bx = (rand() - 0.5) * bend;
    const bz = (rand() - 0.5) * bend;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(new THREE.Vector3(x + Math.sin(t * 2.2) * bx, y + t * height, z + Math.sin(t * 2.2) * bz));
    }
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      segment(b, PAL.bark, pts[i], pts[i + 1], THREE.MathUtils.lerp(r0, r1, t0), THREE.MathUtils.lerp(r0, r1, t1), 14);
      if (i > 0) b.add(G.sphere(THREE.MathUtils.lerp(r0, r1, t0) * 1.0, 12, 8), PAL.bark, { p: [pts[i].x, pts[i].y, pts[i].z] });
    }
    return pts[n];
  }

  {
    const { x, z } = LAYOUT.tree;
    const y = heightAt(x, z) - 0.1;
    const b = new Builder();
    const top = trunkAlong(b, x, z, y, 4.0, 0.72, 0.38, 0.9, 7);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      b.add(G.capsule(0.28, 1.1, 4, 10), PAL.barkDark, {
        p: [x + Math.cos(a) * 0.85, y + 0.18, z + Math.sin(a) * 0.85],
        r: [0, -a, Math.PI / 2 - 0.35],
      });
    }
    const branches = [[1.6, 0.9, 0.3], [-1.4, 1.1, 0.6], [0.3, 1.0, -1.5], [-0.4, 0.8, 1.3]];
    for (const [bx, by, bz] of branches) {
      segment(b, PAL.bark, new THREE.Vector3(top.x, top.y - 0.6, top.z), new THREE.Vector3(top.x + bx, top.y + by, top.z + bz), 0.24, 0.12, 10);
    }
    push(b);
    const cy = top.y + 1.6;
    const cc = new THREE.Color(PAL.leaf);
    const cDeep = new THREE.Color(PAL.leafDeep);
    const cLight = new THREE.Color(PAL.leafLight);
    clumps.push(
      { x: top.x, y: cy + 0.6, z: top.z, r: 2.5, color: cc },
      { x: top.x + 1.9, y: cy, z: top.z + 0.4, r: 2.0, color: cLight },
      { x: top.x - 1.8, y: cy + 0.2, z: top.z + 0.6, r: 2.0, color: cc },
      { x: top.x + 0.4, y: cy - 0.1, z: top.z - 1.9, r: 2.0, color: cDeep },
      { x: top.x - 0.5, y: cy - 0.3, z: top.z + 1.7, r: 1.9, color: cLight },
      { x: top.x + 1.2, y: cy + 1.5, z: top.z - 0.6, r: 1.6, color: cLight },
      { x: top.x - 1.2, y: cy + 1.3, z: top.z - 0.8, r: 1.6, color: cDeep },
    );
    obstacles.push({ x, z, r: 0.95 });
    spots.tree = { x, z, top };
  }

  // -------------------------------------------------------------------------
  // Petits arbres « pompons », arbre en fleurs et buissons
  // -------------------------------------------------------------------------
  // [x, z, espèce, échelle] — 0 pompon, 1 fruitier, 2 cerisier, 3 conifère rond, 4 saule
  const smallTrees = [
    [-16.5, -6.5, 0, 1.0], [-18.5, 6.5, 3, 1.15], [17.5, -3.0, 0, 0.8], [-7.5, 14.5, 0, 1.0], [12.5, 12.5, 3, 1.3],
    [-15.5, 12.5, 1, 1.0], [16.5, 14.5, 0, 0.8], [-8, -19.5, 3, 1.2], [12.5, -20.5, 0, 1.1], [0.5, -22.5, 3, 0.9],
    [-6.5, -4.5, 4, 1.15], [3.0, -6.5, 2, 1.0], [-11.5, -10.5, 0, 0.9], [17.0, -14.5, 3, 1.0],
    [9.8, 14.2, 2, 0.85], [17.8, 10.2, 0, 1.15], [14.2, 17.4, 1, 0.9], [-19.2, -8.5, 0, 0.8],
    [1.0, -19.0, 2, 0.9], [-10.5, -16.5, 3, 1.1], [-20.5, -1.5, 3, 0.85],
  ];
  smallTrees.forEach(([x, z, kind, sc], i) => {
    const y = heightAt(x, z) - 0.05;
    const b = new Builder();
    if (kind === 3) {
      // conifère rond : étages de boules de plus en plus petites
      const top = trunkAlong(b, x, z, y, 1.1 * sc, 0.26 * sc, 0.18 * sc, 0.2, 30 + i);
      push(b);
      const tiers = [[1.3, 0.55], [1.05, 1.45], [0.8, 2.2], [0.5, 2.8]];
      const cols = ['#5fae8e', '#6cbd98', '#7cc8a0', '#8fd4a6'];
      tiers.forEach(([r, dy], k) => clumps.push({ x: top.x, y: top.y + dy * sc, z: top.z, r: r * sc, squash: 0.62, color: new THREE.Color(cols[k]), density: 1.2 }));
      obstacles.push({ x, z, r: 0.4 * sc });
      return;
    }
    if (kind === 4) {
      // saule : couronne + rideaux de feuilles qui retombent
      const top = trunkAlong(b, x, z, y, 2.4 * sc, 0.34 * sc, 0.2 * sc, 1.1, 40 + i);
      push(b);
      clumps.push({ x: top.x, y: top.y + 0.7 * sc, z: top.z, r: 1.55 * sc, squash: 0.62, color: new THREE.Color('#9bd18c') });
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        clumps.push({ x: top.x + Math.cos(a) * 1.45 * sc, y: top.y - 0.35 * sc, z: top.z + Math.sin(a) * 1.45 * sc, r: 0.62 * sc, squash: 1.9, color: new THREE.Color(k % 2 ? '#a9d98e' : '#b6df96'), density: 1.6 });
      }
      obstacles.push({ x, z, r: 0.5 * sc });
      return;
    }
    const h = (1.8 + (i % 3) * 0.4) * sc;
    const top = trunkAlong(b, x, z, y, h, 0.28 * sc, 0.18 * sc, 0.5, 30 + i);
    push(b);
    const base = kind === 2 ? new THREE.Color(PAL.blossom) : new THREE.Color(i % 2 ? PAL.leaf : PAL.leafLight);
    const alt = kind === 2 ? new THREE.Color('#f9cfd8') : new THREE.Color(PAL.leafDeep);
    const r = (1.35 + (i % 4) * 0.15) * sc;
    clumps.push({ x: top.x, y: top.y + r * 0.6, z: top.z, r, color: base });
    if (kind !== 1) clumps.push({ x: top.x + 0.5 * sc, y: top.y + r * 1.25, z: top.z - 0.3 * sc, r: r * 0.65, color: alt });
    if (kind === 1) {
      // arbre fruitier : petites pêches
      const fb = new Builder();
      for (let k = 0; k < 7; k++) {
        const a = k * 1.1;
        fb.add(G.sphere(0.16 * sc, 10, 8), '#f7b48a', { p: [top.x + Math.cos(a) * r * 0.85, top.y + r * 0.35 + (k % 2) * 0.5, top.z + Math.sin(a) * r * 0.85] });
      }
      push(fb);
    }
    obstacles.push({ x, z, r: 0.45 * sc });
  });

  const bushes = [
    [6.2, 1.5], [11.8, 0.8], [-13.8, 3.2], [-9.2, -1.8], [4.0, -15.0], [9.6, -15.6],
    [-0.5, -9.8], [-4.4, -9.6], [14.6, -5.0], [-17.0, -1.0], [7.5, 9.5], [-12.0, 9.0],
    [18.5, 3.0], [-19.5, -4.5], [1.0, 15.5],
  ];
  bushes.forEach(([x, z], i) => {
    const y = heightAt(x, z);
    const r = 0.75 + (i % 3) * 0.18;
    const col = new THREE.Color(i % 3 === 0 ? PAL.leafDeep : PAL.leaf);
    clumps.push({ x, y: y + r * 0.55, z, r, squash: 0.75, color: col, density: 1.3 });
    if (i % 2 === 0) clumps.push({ x: x + r * 0.7, y: y + r * 0.4, z: z + 0.2, r: r * 0.7, squash: 0.75, color: col, density: 1.3 });
    obstacles.push({ x, z, r: r * 0.8, low: true });
    // baies rouges ou bleues sur certains buissons
    if (i % 4 === 2) {
      const bb = new Builder();
      const berry = i % 8 === 2 ? '#e9786f' : '#8fa6e6';
      for (let k = 0; k < 14; k++) {
        const a = k * 2.4;
        const yy = y + r * (0.35 + (k % 4) * 0.18);
        bb.add(G.sphere(0.055, 7, 5), berry, { p: [x + Math.cos(a) * r * 0.92, yy, z + Math.sin(a) * r * 0.92] });
      }
      push(bb);
    }
    // quelques fleurs sur certains buissons
    if (i % 3 === 1) {
      const fb = new Builder();
      for (let k = 0; k < 5; k++) {
        const a = k * 1.3 + i;
        fb.add(G.sphere(0.09, 8, 6), [PAL.coral, PAL.white, PAL.butter][k % 3], { p: [x + Math.cos(a) * r * 0.7, y + r * 0.9 + (k % 2) * 0.15, z + Math.sin(a) * r * 0.7] });
      }
      push(fb);
    }
  });

  // -------------------------------------------------------------------------
  // Palmiers sur la plage
  // -------------------------------------------------------------------------
  const frond = palmFrondGeometry();
  const palms = [[-20.5, 11.5], [-22.5, 4.5], [20.0, 12.5], [22.0, -6.5], [-14.5, 19.0], [5.0, 23.0]];
  palms.forEach(([x, z], i) => {
    const y = heightAt(x, z) - 0.1;
    const b = new Builder();
    const out = new THREE.Vector3(x, 0, z).normalize();
    const pts = [];
    const n = 6;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      pts.push(new THREE.Vector3(x + out.x * t * t * 1.8, y + t * 4.3, z + out.z * t * t * 1.8));
    }
    for (let k = 0; k < n; k++) {
      const r0 = THREE.MathUtils.lerp(0.3, 0.17, k / n);
      const r1 = THREE.MathUtils.lerp(0.3, 0.17, (k + 1) / n);
      segment(b, PAL.palmTrunk, pts[k], pts[k + 1], r0, r1, 12);
      b.add(G.torus(r1 * 1.02, 0.045, 6, 14), '#c49d74', { p: [pts[k + 1].x, pts[k + 1].y - 0.05, pts[k + 1].z], r: [Math.PI / 2, 0, 0] });
    }
    const top = pts[n];
    b.add(G.sphere(0.32, 12, 10), '#a5c97e', { p: [top.x, top.y + 0.05, top.z] });
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + i;
      b.add(G.sphere(0.17, 10, 8), '#a8794f', { p: [top.x + Math.cos(a) * 0.25, top.y - 0.18, top.z + Math.sin(a) * 0.25] });
    }
    push(b);
    const fl = new Builder();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + i;
      fl.add(frond, k % 2 ? PAL.palm : '#93d38f', { p: [top.x, top.y + 0.1, top.z], r: [0, -a, 0.15 + (k % 3) * 0.12], s: 1.05 - (k % 2) * 0.15 });
    }
    statics.push(fl.build());
    obstacles.push({ x, z, r: 0.4 });
  });

  // -------------------------------------------------------------------------
  // Rochers
  // -------------------------------------------------------------------------
  const rocks = [
    [-9.5, -11.0, 1.1], [-7.8, -10.6, 0.7], [4.0, -10.2, 0.9], [16.2, -10.0, 1.0], [-14.0, -12.5, 1.2],
    [21.5, 4.0, 0.8], [-23.0, -3.0, 0.9], [-19.0, 16.0, 0.7], [14.5, 21.5, 0.6], [-3.6, -6.2, 0.5],
    [-0.6, -5.6, 0.45], [24.5, -1.5, 0.7], [-8.0, 24.0, 0.8], [2.0, -25.5, 1.3], [-12.0, -22.0, 1.1],
  ];
  rocks.forEach(([x, z, r], i) => {
    const y = heightAt(x, z);
    const b = new Builder();
    b.add(G.rock(r, i * 3.7), i % 2 ? PAL.rock : PAL.rockWarm, { p: [x, y + r * 0.25, z], s: [1, 0.72, 1], r: [0, i, 0] });
    if (r > 0.8) b.add(G.rock(r * 0.5, i * 1.3 + 5), PAL.rock, { p: [x + r * 0.9, y + r * 0.1, z + r * 0.3], s: [1, 0.7, 1] });
    push(b);
    obstacles.push({ x, z, r: r * 0.9 });
  });

  // -------------------------------------------------------------------------
  // Ponton
  // -------------------------------------------------------------------------
  {
    const P = LAYOUT.pier;
    const b = new Builder();
    const rand = rng(5);
    for (let zz = P.z0; zz <= P.z1; zz += 0.38) {
      const c = rand() > 0.5 ? PAL.woodLight : PAL.wood;
      b.add(G.box(P.w + (rand() - 0.5) * 0.12, 0.1, 0.32, 0.03), c, { p: [P.x + (rand() - 0.5) * 0.06, P.h, zz], r: [0, (rand() - 0.5) * 0.04, (rand() - 0.5) * 0.02] });
    }
    for (let zz = P.z0 + 0.3; zz <= P.z1 + 0.1; zz += 2.3) {
      for (const sx of [-1, 1]) {
        b.add(G.cyl(0.13, 0.15, 3.4, 10), PAL.woodDark, { p: [P.x + sx * (P.w / 2 + 0.05), P.h - 1.4, zz] });
        b.add(G.sphere(0.14, 10, 8), PAL.woodDark, { p: [P.x + sx * (P.w / 2 + 0.05), P.h + 0.3, zz] });
      }
    }
    // poutres sous le ponton
    for (const sx of [-1, 1]) {
      b.add(G.box(0.14, 0.14, P.z1 - P.z0, 0.04), PAL.woodDark, { p: [P.x + sx * (P.w / 2 - 0.2), P.h - 0.12, (P.z0 + P.z1) / 2] });
    }
    // bouée et corde
    b.add(G.torus(0.3, 0.11, 10, 20), PAL.coral, { p: [P.x + P.w / 2 + 0.2, P.h - 0.25, P.z1 - 3.0], r: [0, Math.PI / 2, 0] });
    push(b);
    spots.pierEnd = { x: P.x, z: P.z1 - 0.6 };
  }

  // -------------------------------------------------------------------------
  // Pont sur la rivière (plateau)
  // -------------------------------------------------------------------------
  {
    const b = new Builder();
    const z = -14.2;
    const x0 = -5.4;
    const x1 = -1.6;
    const base = LAYOUT.upperH - 0.02;
    const n = 11;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = THREE.MathUtils.lerp(x0, x1, t);
      const y = base + Math.sin(t * Math.PI) * 0.38;
      const slope = Math.cos(t * Math.PI) * 0.38 * Math.PI / (x1 - x0);
      b.add(G.box(0.3, 0.09, 1.5, 0.03), i % 2 ? PAL.woodLight : PAL.wood, { p: [x, y, z], r: [0, 0, Math.atan(slope)] });
      if (i % 2 === 0) {
        for (const sz of [-0.72, 0.72]) b.add(G.cyl(0.05, 0.05, 0.55, 6), PAL.woodDark, { p: [x, y + 0.27, z + sz] });
      }
    }
    for (const sz of [-0.72, 0.72]) {
      for (let i = 0; i < n; i++) {
        const t0 = i / n;
        const t1 = (i + 1) / n;
        const a = new THREE.Vector3(THREE.MathUtils.lerp(x0, x1, t0), base + Math.sin(t0 * Math.PI) * 0.38 + 0.52, z + sz);
        const c = new THREE.Vector3(THREE.MathUtils.lerp(x0, x1, t1), base + Math.sin(t1 * Math.PI) * 0.38 + 0.52, z + sz);
        segment(b, PAL.wood, a, c, 0.04, 0.04, 6);
      }
    }
    push(b);
    spots.bridge = { x0, x1, z, base, w: 1.5 };
  }

  // -------------------------------------------------------------------------
  // Échoppe de décorations
  // -------------------------------------------------------------------------
  {
    const { x, z } = LAYOUT.shop;
    const y = heightAt(x, z);
    const b = new Builder();
    b.add(G.box(1.1, 0.95, 2.4, 0.08), PAL.woodLight, { p: [x, y + 0.48, z] });
    b.add(G.box(1.25, 0.1, 2.55, 0.04), PAL.wood, { p: [x, y + 0.98, z] });
    for (const [px, pz] of [[-0.5, -1.15], [-0.5, 1.15], [0.6, -1.15], [0.6, 1.15]]) {
      b.add(G.cyl(0.06, 0.06, 2.4, 8), PAL.woodDark, { p: [x + px, y + 1.2, z + pz] });
    }
    // auvent rayé
    for (let i = 0; i < 6; i++) {
      b.add(G.box(1.6, 0.08, 0.44, 0.03), i % 2 ? PAL.white : PAL.mint, { p: [x - 0.05, y + 2.35 - 0.0, z - 1.1 + i * 0.44], r: [0, 0, 0.32] });
    }
    for (let i = 0; i < 6; i++) {
      b.add(G.sphere(0.12, 8, 6), i % 2 ? PAL.white : PAL.mint, { p: [x - 0.83, y + 2.05, z - 1.1 + i * 0.44], s: [0.6, 1, 1] });
    }
    // enseigne coquillage
    b.add(G.box(0.1, 0.7, 1.1, 0.05), PAL.woodDark, { p: [x + 0.65, y + 2.85, z] });
    for (let k = 0; k < 5; k++) {
      const a = (k / 4 - 0.5) * 1.6;
      b.add(G.sphere(0.12, 8, 6), '#ffd9c8', { p: [x + 0.55, y + 2.82 + Math.cos(a) * 0.18, z + Math.sin(a) * 0.22], s: [0.4, 1.6, 0.7], r: [a, 0, 0] });
    }
    // marchandises
    b.add(G.cyl(0.15, 0.12, 0.25, 10), PAL.coral, { p: [x - 0.1, y + 1.16, z - 0.7] });
    b.add(G.sphere(0.18, 10, 8), PAL.leaf, { p: [x - 0.1, y + 1.38, z - 0.7] });
    b.add(G.box(0.3, 0.3, 0.3, 0.06), PAL.butter, { p: [x - 0.05, y + 1.18, z + 0.1] });
    b.add(G.cone(0.14, 0.4, 10), PAL.lilac, { p: [x - 0.1, y + 1.24, z + 0.75] });
    // caisses
    b.add(G.box(0.6, 0.6, 0.6, 0.06), PAL.wood, { p: [x + 0.3, y + 0.3, z + 1.75], r: [0, 0.3, 0] });
    b.add(G.box(0.45, 0.45, 0.45, 0.06), PAL.woodLight, { p: [x + 0.25, y + 0.83, z + 1.7], r: [0, -0.2, 0] });
    push(b);
    obstacles.push({ x, z: z - 0.6, r: 0.75 }, { x, z: z + 0.6, r: 0.75 }, { x: x + 0.3, z: z + 1.75, r: 0.45 });
    spots.shop = { x: x - 1.5, z };
  }

  // -------------------------------------------------------------------------
  // Potager : parcelles vides + clôture
  // -------------------------------------------------------------------------
  {
    const { x: gx, z: gz } = LAYOUT.garden;
    const b = new Builder();
    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 4; i++) {
        const px = gx - 3 + i * 2;
        const pz = gz - 2 + j * 2;
        const y = heightAt(px, pz);
        // bordure de terre + paillage clair (jamais de terre nue en bloc)
        b.add(G.box(1.55, 0.16, 1.55, 0.08), PAL.soil, { p: [px, y + 0.02, pz] });
        b.add(G.box(1.36, 0.06, 1.36, 0.03), '#e6cf9d', { p: [px, y + 0.11, pz] });
        const rr = rng(i * 7 + j * 13 + 5);
        for (let k = 0; k < 16; k++) {
          const sx = (rr() - 0.5) * 1.15;
          const sz = (rr() - 0.5) * 1.15;
          b.add(G.box(0.26 + rr() * 0.12, 0.018, 0.035, 0.008), rr() > 0.5 ? '#f3dfaa' : '#d6b980', { p: [px + sx, y + 0.145, pz + sz], r: [0, rr() * Math.PI, 0] });
        }
        spots.plots.push({ x: px, z: pz, y: y + 0.15 });
      }
    }
    // clôture (ouverture côté nord, face au chemin)
    const x0 = gx - 4.4;
    const x1 = gx + 4.4;
    const z0 = gz - 3.3;
    const z1 = gz + 3.3;
    const posts = [];
    for (let x = x0; x <= x1 + 0.01; x += 1.1) posts.push([x, z1]);
    for (let z = z0; z < z1; z += 1.1) {
      posts.push([x0, z]);
      posts.push([x1, z]);
    }
    for (let x = x0 + 1.1; x < x1; x += 1.1) if (Math.abs(x - gx) > 1.3) posts.push([x, z0]);
    for (const [px, pz] of posts) {
      const y = heightAt(px, pz);
      b.add(G.cyl(0.07, 0.08, 0.8, 8), PAL.woodLight, { p: [px, y + 0.35, pz] });
      b.add(G.sphere(0.08, 8, 6), PAL.woodLight, { p: [px, y + 0.76, pz] });
      obstacles.push({ x: px, z: pz, r: 0.25 });
    }
    const rail = (ax, az, cx, cz) => {
      const ya = heightAt(ax, az);
      const yc = heightAt(cx, cz);
      segment(b, PAL.wood, new THREE.Vector3(ax, ya + 0.55, az), new THREE.Vector3(cx, yc + 0.55, cz), 0.04, 0.04, 6);
      segment(b, PAL.wood, new THREE.Vector3(ax, ya + 0.3, az), new THREE.Vector3(cx, yc + 0.3, cz), 0.04, 0.04, 6);
    };
    rail(x0, z1, x1, z1);
    rail(x0, z0, x0, z1);
    rail(x1, z0, x1, z1);
    rail(x0, z0, gx - 1.3, z0);
    rail(gx + 1.3, z0, x1, z0);
    // arrosoir posé près de l'entrée
    const wy = heightAt(gx + 1.7, z0 + 0.6);
    b.add(G.cyl(0.18, 0.2, 0.3, 12), PAL.sky, { p: [gx + 1.7, wy + 0.15, z0 + 0.6] });
    segment(b, PAL.sky, new THREE.Vector3(gx + 1.85, wy + 0.15, z0 + 0.6), new THREE.Vector3(gx + 2.15, wy + 0.38, z0 + 0.6), 0.04, 0.03, 6);
    push(b);
    spots.garden = { x: gx, z: gz, entrance: { x: gx, z: z0 - 0.8 } };
  }

  // -------------------------------------------------------------------------
  // Panneau indicateur sur la place
  // -------------------------------------------------------------------------
  {
    const x = 0.6;
    const z = 2.0;
    const y = heightAt(x, z);
    const b = new Builder();
    b.add(G.cyl(0.08, 0.09, 1.7, 8), PAL.woodDark, { p: [x, y + 0.85, z] });
    b.add(G.box(0.9, 0.24, 0.07, 0.04), PAL.woodLight, { p: [x + 0.35, y + 1.5, z], r: [0, 0.3, 0] });
    b.add(G.box(0.9, 0.24, 0.07, 0.04), PAL.wood, { p: [x - 0.35, y + 1.2, z], r: [0, -0.5, 0] });
    b.add(G.box(0.8, 0.22, 0.07, 0.04), PAL.woodLight, { p: [x, y + 0.92, z + 0.2], r: [0, 1.4, 0] });
    push(b);
    obstacles.push({ x, z, r: 0.25 });
  }

  // -------------------------------------------------------------------------
  // Banc près du bassin
  // -------------------------------------------------------------------------
  {
    const x = -5.2;
    const z = -3.4;
    const y = heightAt(x, z);
    const b = new Builder();
    b.add(G.box(1.4, 0.1, 0.45, 0.04), PAL.woodLight, { p: [x, y + 0.45, z], r: [0, 0.5, 0] });
    b.add(G.box(1.4, 0.32, 0.08, 0.04), PAL.wood, { p: [x - Math.sin(0.5) * 0.22, y + 0.72, z - Math.cos(0.5) * 0.22], r: [0, 0.5, 0] });
    for (const s of [-0.55, 0.55]) b.add(G.box(0.08, 0.45, 0.4, 0.03), PAL.woodDark, { p: [x + Math.cos(0.5) * s, y + 0.22, z - Math.sin(0.5) * s], r: [0, 0.5, 0] });
    push(b);
    obstacles.push({ x, z, r: 0.7 });
  }

  // -------------------------------------------------------------------------
  // Lanternes (lumières ponctuelles la nuit)
  // -------------------------------------------------------------------------
  const lanternSpots = [
    [-8.8, 4.9], [7.0, 2.2], [3.4, 2.3], [LAYOUT.pier.x + 1.0, LAYOUT.pier.z1 - 0.4, LAYOUT.pier.h],
    [LAYOUT.pier.x - 1.6, LAYOUT.pier.z0 - 0.2], [-1.6, 5.4], [11.0, -6.4], [8.9, -13.8], [14.6, 4.8], [-4.8, -4.4],
  ];
  for (const [x, z, fixedY] of lanternSpots) {
    const y = fixedY ?? heightAt(x, z);
    const b = new Builder();
    b.add(G.cyl(0.07, 0.09, 1.55, 8), PAL.woodDark, { p: [x, y + 0.77, z] });
    b.add(G.cyl(0.18, 0.2, 0.08, 10), PAL.woodDark, { p: [x, y + 0.04, z] });
    b.add(G.cone(0.28, 0.2, 10), PAL.roofTeal, { p: [x, y + 1.95, z] });
    b.add(G.sphere(0.05, 6, 6), PAL.butter, { p: [x, y + 2.08, z] });
    b.add(G.cyl(0.13, 0.13, 0.05, 10), PAL.woodDark, { p: [x, y + 1.55, z] });
    glass.add(G.box(0.24, 0.3, 0.24, 0.07), PAL.glass, { p: [x, y + 1.72, z] });
    push(b);
    obstacles.push({ x, z, r: 0.2 });
    lanterns.push(new THREE.Vector3(x, y + 1.72, z));
  }

  // -------------------------------------------------------------------------
  // Assemblage
  // -------------------------------------------------------------------------
  const geo = mergeGeometries(statics, false);
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, toonMaterial({ vertexColors: true, aId: true }));
  mesh.name = 'props';
  mesh.layers.enable(LAYER_SHADOW);
  const glassMesh = new THREE.Mesh(
    glass.build(),
    toonMaterial({ vertexColors: true, aId: true, emissive: 0xffa94a, emissiveNight: true, rim: 0.2 }),
  );
  glassMesh.name = 'glass';
  return { mesh, glassMesh, clumps, obstacles, lanterns, spots };
}
