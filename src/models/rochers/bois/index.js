// Bois : pile de bûches (ROC-009) et rondin couché (ROC-010). Souche et bois mort rejoignent ce dossier
// avec la végétation.
import { Builder, G } from '../../../render/builder.js';
import { WOOD, WOOD_L, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function boisPile() {
  const b = new Builder();
  for (let k = 0; k < 6; k++) b.add(G.cyl(0.14, 0.14, 1.2, 8), k % 2 ? WOOD : WOOD_L, { p: [(k % 3) * 0.3 - 0.3, 0.15 + Math.floor(k / 3) * 0.26, 0], r: [Math.PI / 2, 0, 0] });
  return { solid: b, obstacles: lire(physique.bois_pile.obstacles) };
}

export function rondin() {
  const b = new Builder();
  b.add(G.cyl(0.28, 0.3, 2.0, 10), WOOD, { p: [0, 0.27, 0], r: [0, 0, Math.PI / 2] });
  b.add(G.cyl(0.26, 0.26, 0.02, 10), '#ecd3a8', { p: [1.01, 0.27, 0], r: [0, 0, Math.PI / 2] });
  return { solid: b, obstacles: lire(physique.rondin.obstacles) };
}

export default [
  fiche('ROC-009', 'pile-bois', 'Pile de bois', part('bois_pile'), { tags: ['bois'] }),
  fiche('ROC-010', 'rondin', 'Rondin', part('rondin'), { tags: ['bois', 'assise'] }),
];
