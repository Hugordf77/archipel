// Cascade (STR-027) : rochers autour du bassin au pied de la chute (l'eau est rendue par la rivière).
import { Builder, G } from '../../../render/builder.js';
import { MOSS, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function cascade(p) {
  const b = new Builder();
  // rochers autour du bassin au pied de la chute
  const w = (p.w || 3) * 0.6 + 1.5;
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    b.add(G.rock(0.55 + (k % 3) * 0.2, 90 + k), k % 2 ? '#cfc3d4' : '#bfb4c8', { p: [Math.cos(a) * w, -0.2, Math.sin(a) * w], s: [1, 0.7, 1] });
  }
  b.add(G.sphere(0.5, 8, 6), MOSS, { p: [w * 0.7, 0.2, w * 0.4], s: [1, 0.4, 1] });
  return { solid: b, obstacles: lire(physique.obstacles) };
}

export default fiche('STR-027', 'cascade', 'Cascade', part('cascade'), { params: { w: [1, 6] }, tags: ['rivière', 'animé'] });
