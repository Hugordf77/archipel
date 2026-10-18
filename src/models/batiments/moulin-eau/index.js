// Moulin à eau (BAT-005) : maison de pierre, toit menthe, roue à aubes dans le bief.
import { Builder, G } from '../../../render/builder.js';
import { WOOD, WOOD_L, WOOD_D, STONE, STONE_D, bx, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function moulinEau(p) {
  const b = new Builder();
  b.add(bx(3.6, 0.3, 3.2, 0.06), STONE_D, { p: [0, 0.15, 0] });
  b.add(bx(3.2, 2.4, 2.8, 0.08), STONE, { p: [0, 1.5, 0] });
  b.add(bx(3.6, 0.16, 1.9, 0.05), '#86c6bb', { p: [0, 3.15, -0.7], r: [0.6, 0, 0] });
  b.add(bx(3.6, 0.16, 1.9, 0.05), '#86c6bb', { p: [0, 3.15, 0.7], r: [-0.6, 0, 0] });
  b.add(bx(0.8, 1.3, 0.08, 0.04), WOOD_D, { p: [0, 0.95, 1.43] });
  const wheel = new Builder();
  wheel.add(G.torus(1.3, 0.09, 6, 20), WOOD, { r: [0, Math.PI / 2, 0] });
  wheel.add(G.cyl(0.18, 0.18, 0.7, 8), WOOD_D, { r: [0, 0, Math.PI / 2] });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    wheel.add(bx(0.5, 0.06, 0.45, 0.02), WOOD_L, { p: [0, Math.sin(a) * 1.3, Math.cos(a) * 1.3], r: [a, 0, 0] });
    wheel.add(bx(0.06, 1.25, 0.06, 0.01), WOOD_D, { p: [0, Math.sin(a) * 0.65, Math.cos(a) * 0.65], r: [a, 0, 0] });
  }
  return { solid: b, obstacles: lire(physique.obstacles, p), wheel };
}

export default fiche('BAT-005', 'moulin-eau', 'Moulin à eau', part('moulin_eau'), { tags: ['village', 'animé', 'rivière'] });
