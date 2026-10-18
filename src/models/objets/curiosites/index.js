// Petites découvertes : tonneaux (OBJ-003), charrette (OBJ-004), nid (OBJ-008), cercle de champignons
// (OBJ-009) et nichoir (OBJ-023).
import { Builder, G } from '../../../render/builder.js';
import { WOOD, WOOD_D, bx, seg, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function tonneaux() {
  const b = new Builder();
  for (let k = 0; k < 3; k++) {
    b.add(G.cyl(0.32, 0.32, 0.8, 12), WOOD, { p: [k * 0.7, 0.4, (k % 2) * 0.3] });
    for (const y of [0.15, 0.65]) b.add(G.torus(0.33, 0.025, 4, 14), '#8a7a99', { p: [k * 0.7, y, (k % 2) * 0.3], r: [Math.PI / 2, 0, 0] });
  }
  return { solid: b, obstacles: lire(physique.tonneaux.obstacles) };
}

export function charrette() {
  const b = new Builder();
  b.add(bx(1.6, 0.5, 1.1, 0.05), WOOD, { p: [0, 0.75, 0] });
  for (const sx of [-1, 1]) b.add(G.torus(0.42, 0.06, 6, 14), WOOD_D, { p: [0, 0.42, sx * 0.62] });
  seg(b, WOOD_D, 0.8, 0.6, -0.3, 2.0, 0.15, -0.3, 0.04, 0.04, 5);
  seg(b, WOOD_D, 0.8, 0.6, 0.3, 2.0, 0.15, 0.3, 0.04, 0.04, 5);
  for (let k = 0; k < 5; k++) b.add(G.sphere(0.16, 8, 6), k % 2 ? '#f39c4a' : '#f6d27a', { p: [-0.4 + (k % 3) * 0.35, 1.08, -0.2 + (k % 2) * 0.35] });
  return { solid: b, obstacles: lire(physique.charrette.obstacles) };
}

export function nid() {
  const b = new Builder();
  b.add(G.torus(0.35, 0.12, 6, 14), '#b89a72', { p: [0, 0.12, 0], r: [Math.PI / 2, 0, 0] });
  for (let k = 0; k < 3; k++) b.add(G.sphere(0.1, 8, 6), '#bfe4f2', { p: [Math.cos(k * 2.1) * 0.12, 0.14, Math.sin(k * 2.1) * 0.12], s: [1, 1.25, 1] });
  return { solid: b, obstacles: lire(physique.nid.obstacles) };
}

export function cercleChampi() {
  const b = new Builder();
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    b.add(G.cyl(0.05, 0.07, 0.25, 6), '#f6ecdc', { p: [Math.cos(a) * 1.1, 0.12, Math.sin(a) * 1.1] });
    b.add(G.sphere(0.16, 8, 5), k % 2 ? '#e9a3c4' : '#f2b8a0', { p: [Math.cos(a) * 1.1, 0.26, Math.sin(a) * 1.1], s: [1, 0.55, 1] });
  }
  return { solid: b, obstacles: lire(physique.cercle_champi.obstacles) };
}

export function nichoir() {
  const b = new Builder();
  b.add(G.cyl(0.05, 0.06, 1.8, 6), WOOD_D, { p: [0, 0.9, 0] });
  b.add(bx(0.4, 0.42, 0.36, 0.05), '#9fdcc8', { p: [0, 1.95, 0] });
  b.add(G.cone(0.36, 0.25, 4), '#f19b86', { p: [0, 2.28, 0], r: [0, Math.PI / 4, 0] });
  b.add(G.cyl(0.07, 0.07, 0.04, 8), '#5b4a63', { p: [0, 2.0, 0.19], r: [Math.PI / 2, 0, 0] });
  return { solid: b, obstacles: lire(physique.nichoir.obstacles) };
}

export default [
  fiche('OBJ-003', 'tonneaux', 'Tonneaux', part('tonneaux'), { tags: ['curiosité'] }),
  fiche('OBJ-004', 'charrette', 'Charrette', part('charrette'), { tags: ['curiosité'] }),
  fiche('OBJ-008', 'nid', 'Nid', part('nid'), { tags: ['curiosité'] }),
  fiche('OBJ-009', 'cercle-champignons', 'Cercle de champignons', part('cercle_champi'), { tags: ['curiosité'] }),
  fiche('OBJ-023', 'nichoir-lieu', 'Nichoir (lieu)', part('nichoir'), { tags: ['curiosité'] }),
];
