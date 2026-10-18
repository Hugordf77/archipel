// Ruines (MON-001) : dalle, six colonnes (debout ou brisées, moussues), fût couché, pan de mur ; MON-002 :
// les mêmes, à demi ensablées (dune).
import { Builder, G } from '../../../render/builder.js';
import { STONE, STONE_D, MOSS, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function ruines(p, rand) {
  const b = new Builder();
  b.add(G.box(7, 0.3, 5.5, 0.08), STONE_D, { p: [0, 0.05, 0] });
  for (let k = 0; k < 6; k++) {
    const x = (k % 3 - 1) * 2.6;
    const z = k < 3 ? -2 : 2;
    const h = rand() < 0.4 ? 0.8 + rand() * 0.8 : 2.4 + rand() * 0.6;
    b.add(G.cyl(0.32, 0.36, h, 12), STONE, { p: [x, 0.2 + h / 2, z] });
    if (h > 2) b.add(G.box(0.9, 0.25, 0.9, 0.05), STONE_D, { p: [x, 0.2 + h + 0.12, z] });
    else b.add(G.sphere(0.36, 10, 6), MOSS, { p: [x, 0.2 + h, z], s: [1, 0.3, 1] });
  }
  b.add(G.cyl(0.3, 0.3, 2.2, 12), STONE, { p: [1.4, 0.45, 0.2], r: [0, 0.6, Math.PI / 2] });
  b.add(G.box(2.6, 1.1, 0.5, 0.06), STONE_D, { p: [-2.6, 0.75, 0] , r: [0, Math.PI / 2, 0] });
  b.add(G.sphere(0.7, 12, 8), MOSS, { p: [-2.6, 1.3, 0.4], s: [0.5, 0.3, 1] });
  if (p.sand) b.add(G.sphere(4, 14, 8), '#f5dab8', { p: [0, -1.6, 0], s: [1.2, 0.5, 1] });
  return { solid: b, obstacles: lire(physique.obstacles, p) };
}

export default [
  fiche('MON-001', 'ruines', 'Ruines', part('ruines')),
  fiche('MON-002', 'ruines-ensablees', 'Ruines ensablées', part('ruines', { sand: true }), { tags: ['dunes'] }),
];
