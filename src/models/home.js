// Modèles de l'île de départ : chaumière, bibliothèque, bureau, grand arbre, ponton, pont,
// échoppe, panneau, banc, lanterne, parasol et transats, raretés fleuries.
// Chaque fonction ajoute ses pièces à un Builder à la position donnée : le jeu passe les
// coordonnées de l'île, le catalogue des modèles (0, 0, 0).
import * as THREE from 'three';
import { G } from '../render/builder.js';
import { PAL } from './palette.js';
import { rng, segment } from './shapes.js';

// Maison du joueur : chaumière ronde au toit gonflé (porte face +z)
export function chaumiere(b, glass, x, y, z) {
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
}

// Bibliothèque du hibou : souche géante au toit-champignon
export function bibliotheque(b, glass, x, y, z) {
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
}

// Pupitre, perchoir et chariot de livres du hibou
export function pupitreHibou(p, o, oy) {
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
}

// Bureau d'étude : tapis, plateau, livres, lampe, tabouret
export function bureauEtude(b, glass, x, y, z) {
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
}

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

// Ponton sur pilotis, bouée de sauvetage ; P = { x, z0, z1, w, h }
export function ponton(b, P) {
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
}

// Petit pont en arc avec garde-corps
export function pontRiviere(b, x0, x1, z, base) {
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
}

// Échoppe de décorations : comptoir, auvent rayé, enseigne coquillage
export function echoppe(b, x, y, z) {
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
}

// Panneau indicateur à trois flèches
export function panneauPlace(b, x, y, z) {
  b.add(G.cyl(0.08, 0.09, 1.7, 8), PAL.woodDark, { p: [x, y + 0.85, z] });
  b.add(G.box(0.9, 0.24, 0.07, 0.04), PAL.woodLight, { p: [x + 0.35, y + 1.5, z], r: [0, 0.3, 0] });
  b.add(G.box(0.9, 0.24, 0.07, 0.04), PAL.wood, { p: [x - 0.35, y + 1.2, z], r: [0, -0.5, 0] });
  b.add(G.box(0.8, 0.22, 0.07, 0.04), PAL.woodLight, { p: [x, y + 0.92, z + 0.2], r: [0, 1.4, 0] });
}

// Banc de bois (orienté de 0,5 rad)
export function bancBois(b, x, y, z) {
  b.add(G.box(1.4, 0.1, 0.45, 0.04), PAL.woodLight, { p: [x, y + 0.45, z], r: [0, 0.5, 0] });
  b.add(G.box(1.4, 0.32, 0.08, 0.04), PAL.wood, { p: [x - Math.sin(0.5) * 0.22, y + 0.72, z - Math.cos(0.5) * 0.22], r: [0, 0.5, 0] });
  for (const s of [-0.55, 0.55]) b.add(G.box(0.08, 0.45, 0.4, 0.03), PAL.woodDark, { p: [x + Math.cos(0.5) * s, y + 0.22, z - Math.sin(0.5) * s], r: [0, 0.5, 0] });
}

// Lanterne de jardin sur poteau (vitre lumineuse la nuit)
export function lanterneJardin(b, glass, x, y, z) {
  b.add(G.cyl(0.07, 0.09, 1.55, 8), PAL.woodDark, { p: [x, y + 0.77, z] });
  b.add(G.cyl(0.18, 0.2, 0.08, 10), PAL.woodDark, { p: [x, y + 0.04, z] });
  b.add(G.cone(0.28, 0.2, 10), PAL.roofTeal, { p: [x, y + 1.95, z] });
  b.add(G.sphere(0.05, 6, 6), PAL.butter, { p: [x, y + 2.08, z] });
  b.add(G.cyl(0.13, 0.13, 0.05, 10), PAL.woodDark, { p: [x, y + 1.55, z] });
  glass.add(G.box(0.24, 0.3, 0.24, 0.07), PAL.glass, { p: [x, y + 1.72, z] });
}
