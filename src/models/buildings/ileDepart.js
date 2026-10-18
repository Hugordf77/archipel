// Modèles de l'île de départ : chaumière, bibliothèque, bureau, grand arbre, ponton, pont,
// échoppe, panneau, banc, lanterne, parasol et transats, raretés fleuries.
// Chaque fonction ajoute ses pièces à un Builder à la position donnée : le jeu passe les
// coordonnées de l'île, le catalogue des modèles (0, 0, 0).
import * as THREE from 'three';
import { G } from '../../render/builder.js';
import { PAL } from '../kit/palette.js';
import { rng, segment } from '../kit/shapes.js';

// tronc courbe en segments (grand arbre, petits arbres de l'île)
export function trunkAlong(b, x, z, y, height, r0, r1, bend, seed) {
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

// Grand arbre : tronc, racines et branches ; renvoie le sommet du tronc
export function grandArbre(b, x, y, z) {
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
  return top;
}

// Houppier du grand arbre (touffes de feuillage autour du sommet)
export function grandArbreClumps(top) {
  const clumps = [];
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
  return clumps;
}

// Touffe de lavandes géantes (rareté, 10 h d'étude) ; r : suite aléatoire partagée
export function lavandeGeante(b, cx, y, cz, r = rng(31)) {
  for (let k = 0; k < 26; k++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.55;
    const h = 0.75 + r() * 0.45;
    const x = cx + Math.cos(a) * d;
    const z = cz + Math.sin(a) * d;
    b.add(G.cyl(0.012, 0.016, h, 4), '#8fb88c', { p: [x, y + h / 2, z], r: [(r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4], tint: 0 });
    for (let j = 0; j < 7; j++) b.add(G.sphere(0.035 - j * 0.002, 6, 4), j % 2 ? '#b49be8' : '#a58ae0', { p: [x, y + h * (0.62 + j * 0.06), z], tint: 0 });
  }
  b.add(G.sphere(0.6, 10, 7), '#94bf93', { p: [cx, y + 0.12, cz], s: [1.1, 0.35, 1.1], tint: 0 });
}

// Arche de glycine (rareté, 25 h d'étude), piliers à z ± 1,25
export function archeGlycine(b, ax, y0, az, r = rng(31)) {
  for (const dz of [-1.25, 1.25]) {
    b.add(G.cyl(0.08, 0.1, 2.2, 8), '#c98f5f', { p: [ax, y0 + 1.1, az + dz], tint: 0 });
  }
  b.add(G.torus(1.25, 0.08, 8, 24, Math.PI), '#c98f5f', { p: [ax, y0 + 2.2, az], r: [0, Math.PI / 2, 0], tint: 0 });
  for (let i = 0; i < 26; i++) {
    const a = (i / 25) * Math.PI;
    const px = ax + (r() - 0.5) * 0.4;
    const py = y0 + 2.2 + Math.sin(a) * 1.25;
    const pz = az + Math.cos(a) * 1.25;
    b.add(G.sphere(0.16, 8, 6), i % 3 ? '#9fd08a' : '#86c48a', { p: [px, py + 0.05, pz], tint: 0 });
    if (i % 2 === 0) {
      const len = 0.45 + r() * 0.35;
      b.add(G.cone(0.1, len, 7), i % 4 ? '#c3a6ee' : '#ae92e6', { p: [px, py - len / 2 - 0.05, pz], r: [Math.PI, 0, 0], tint: 0 });
    }
  }
}
