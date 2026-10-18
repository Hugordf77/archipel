// Statue géante (MON-005) : gardien assis sur son socle, coiffé de mousse.
import { Builder, G } from '../../../render/builder.js';
import { STONE_D, MOSS, bx, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function statue() {
  const b = new Builder();
  const st = '#d6cbbd';
  b.add(bx(3.2, 1.0, 3.2, 0.1), STONE_D, { p: [0, 0.5, 0] });
  b.add(bx(2.4, 2.2, 1.8, 0.4), st, { p: [0, 2.1, -0.1] });
  b.add(bx(1.0, 1.2, 1.8, 0.3), st, { p: [-0.6, 1.4, 0.7] });
  b.add(bx(1.0, 1.2, 1.8, 0.3), st, { p: [0.6, 1.4, 0.7] });
  b.add(G.sphere(1.0, 14, 10), st, { p: [0, 4.0, 0], s: [1, 1.1, 0.95] });
  b.add(G.sphere(0.2, 8, 6), '#5b4a63', { p: [-0.35, 4.1, 0.85] });
  b.add(G.sphere(0.2, 8, 6), '#5b4a63', { p: [0.35, 4.1, 0.85] });
  b.add(G.sphere(1.1, 10, 6), MOSS, { p: [0, 4.65, -0.1], s: [1, 0.35, 1] });
  b.add(G.sphere(0.9, 10, 6), MOSS, { p: [1.0, 2.9, 0], s: [0.4, 0.8, 0.6] });
  return { solid: b, obstacles: lire(physique.obstacles) };
}

export default fiche('MON-005', 'statue-geante', 'Statue géante', part('statue'), { tags: ['repère'] });
