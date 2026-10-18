// Grand arbre de l'île de départ (ARB-014) : tronc courbe, racines, branches et houppier de sept touffes ;
// repère de l'île, le bureau d'étude est à son pied. trunkAlong sert aussi aux petits arbres de l'île.
import * as THREE from 'three';
import { G } from '../../../render/builder.js';
import { PAL } from '../../kit/palette.js';
import { rng, segment } from '../../kit/shapes.js';
import { fiche, ile } from '../../kit/fiches.js';

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

export default fiche('ARB-014', 'grand-arbre', 'Grand arbre de l\'île de départ', ile('grandArbre', (b) => grandArbreClumps(grandArbre(b, 0, 0, 0))), { tags: ['repère'] });
