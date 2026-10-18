// Grotte (MON-003) : entrée sombre entourée de rochers, coiffée de mousse.
import { Builder, G } from '../../../render/builder.js';
import { MOSS, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function grotte(p, rand) {
  const b = new Builder();
  const rocks = [[-2.2, 0.8, 0, 1.6], [2.2, 0.8, 0, 1.6], [-1.3, 2.4, 0, 1.3], [1.3, 2.4, 0, 1.3], [0, 3.0, 0, 1.3], [-2.6, 0.3, -1.4, 1.2], [2.5, 0.3, -1.5, 1.2], [0, 2.2, -1.6, 1.6]];
  rocks.forEach(([x, y, z, r], k) => b.add(G.rock(r, 20 + k), k % 3 ? '#cfc3d4' : '#bfb4c8', { p: [x, y, z] }));
  b.add(G.sphere(1.5, 16, 10), '#4d4766', { p: [0, 0.6, -0.9], s: [1, 1.15, 0.6] });
  b.add(G.sphere(0.9, 12, 8), MOSS, { p: [0, 3.8, 0], s: [1.6, 0.3, 1] });
  return { solid: b, obstacles: lire(physique.obstacles, p) };
}

export default fiche('MON-003', 'grotte', 'Grotte', part('grotte'), { tags: ['falaises'] });
