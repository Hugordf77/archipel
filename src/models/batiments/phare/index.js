// Phare (BAT-006) : tour rayée, lanterne lumineuse, maison du gardien.
import { Builder, G } from '../../../render/builder.js';
import { WOOD_D, STONE_D, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function phare(p, rand) {
  const b = new Builder();
  const g = new Builder();
  b.add(G.cyl(2.2, 2.4, 0.6, 20), STONE_D, { p: [0, 0.3, 0] });
  b.add(G.cyl(1.05, 1.5, 7.6, 20), '#fbf3e6', { p: [0, 4.4, 0] });
  for (const y of [2.2, 4.6, 7.0]) b.add(G.cyl(1.42 - y * 0.055, 1.48 - y * 0.055, 0.8, 20), '#f19b86', { p: [0, y, 0] });
  b.add(G.cyl(1.55, 1.55, 0.2, 20), '#86c6bb', { p: [0, 8.3, 0] });
  b.add(G.torus(1.45, 0.05, 6, 24), '#86c6bb', { p: [0, 8.85, 0], r: [Math.PI / 2, 0, 0] });
  g.add(G.cyl(0.85, 0.85, 1.1, 14), '#ffe6a8', { p: [0, 9.0, 0] });
  b.add(G.cone(1.1, 1.0, 18), '#f19b86', { p: [0, 10.05, 0] });
  b.add(G.sphere(0.16, 10, 8), '#f6d27a', { p: [0, 10.6, 0] });
  b.add(G.box(0.8, 1.3, 0.2, 0.05), WOOD_D, { p: [0, 1.25, 1.42] });
  // petite maison du gardien
  b.add(G.box(2.4, 1.7, 2.0, 0.1), '#f6ead2', { p: [2.6, 0.85, 0.3] });
  b.add(G.box(2.7, 0.18, 1.4, 0.06), '#86c6bb', { p: [2.6, 1.95, -0.3], r: [0.55, 0, 0] });
  b.add(G.box(2.7, 0.18, 1.4, 0.06), '#86c6bb', { p: [2.6, 1.95, 0.9], r: [-0.55, 0, 0] });
  return { solid: b, glow: g, obstacles: lire(physique.obstacles, p) };
}

export default fiche('BAT-006', 'phare', 'Phare', part('phare'), { tags: ['falaises', 'lumineux'] });
