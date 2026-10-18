// Temple (BAT-008) : socle à deux degrés, quatre colonnes, toit pyramidal, gemme lumineuse.
import { Builder, G } from '../../../render/builder.js';
import { STONE, STONE_D, MOSS, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function temple(p, rand) {
  const b = new Builder();
  const g = new Builder();
  b.add(G.box(7, 0.5, 7, 0.08), STONE_D, { p: [0, 0.25, 0] });
  b.add(G.box(5.4, 0.5, 5.4, 0.08), STONE, { p: [0, 0.75, 0] });
  for (const [x, z] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]]) {
    b.add(G.cyl(0.3, 0.34, 2.6, 12), STONE, { p: [x, 2.3, z] });
    b.add(G.sphere(0.4, 10, 6), MOSS, { p: [x, 1.05, z], s: [1, 0.35, 1] });
  }
  b.add(G.box(5, 0.35, 5, 0.06), STONE_D, { p: [0, 3.75, 0] });
  b.add(G.cone(3.3, 1.6, 4), '#d6c8b4', { p: [0, 4.7, 0], r: [0, Math.PI / 4, 0] });
  b.add(G.cyl(0.5, 0.6, 0.6, 10), STONE_D, { p: [0, 1.3, 0] });
  g.add(G.sphere(0.32, 14, 10), '#9fdcc8', { p: [0, 1.85, 0], s: [1, 1.3, 1] });
  return { solid: b, glow: g, obstacles: lire(physique.obstacles, p) };
}

export default fiche('BAT-008', 'temple', 'Temple', part('temple'));
