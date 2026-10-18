// Coffre (OBJ-001, et coffre caché OBJ-002) : bois cerclé d'or, couvercle bombé, serrure qui luit.
import { Builder, G } from '../../../render/builder.js';
import { bx, lire } from '../../kit/lieux.js';
import { fiche, part, SAME } from '../../kit/fiches.js';
import physique from './physique.js';

export function coffre() {
  const b = new Builder();
  const g = new Builder();
  b.add(bx(0.8, 0.45, 0.55, 0.05), '#c98f5f', { p: [0, 0.23, 0] });
  b.add(G.cyl(0.28, 0.28, 0.8, 12, 1, false, 0, Math.PI), '#b07a50', { p: [0, 0.45, 0], r: [0, 0, Math.PI / 2] });
  b.add(bx(0.84, 0.06, 0.06, 0.02), '#f6d27a', { p: [0, 0.3, 0.28] });
  g.add(bx(0.14, 0.16, 0.05, 0.02), '#f6d27a', { p: [0, 0.38, 0.29] });
  return { solid: b, glow: g, obstacles: lire(physique.obstacles) };
}

export default [
  fiche('OBJ-001', 'coffre', 'Coffre', part('coffre'), { tags: ['trésor'] }),
  fiche('OBJ-002', 'coffre-cache', 'Coffre caché', part('coffre_cache'), { ...SAME('OBJ-001'), tags: ['trésor', 'curiosité'] }),
];
