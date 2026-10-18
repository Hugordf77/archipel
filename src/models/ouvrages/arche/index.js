// Arche (STR-011) : deux piliers rocheux et un linteau voûté, coiffés de mousse ; taille réglable.
import { Builder, G } from '../../../render/builder.js';
import { MOSS, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function arche(p) {
  const b = new Builder();
  const s = p.size || 1.2;
  // deux piliers rocheux et un linteau voûté (rochers déformés)
  for (const sz of [-1, 1]) {
    for (let k = 0; k < 3; k++) b.add(G.rock(1.6 * s, 30 + k + (sz > 0 ? 5 : 0)), k % 2 ? '#cfc3d4' : '#bfb4c8', { p: [0, k * 2.2 * s, sz * 3.2 * s], s: [1, 1.1, 0.9] });
  }
  for (let k = 0; k < 5; k++) {
    const a = (k / 4) * Math.PI;
    b.add(G.rock(1.3 * s, 40 + k), k % 2 ? '#cfc3d4' : '#c6b9cc', { p: [0, 6.2 * s + Math.sin(a) * 1.4 * s, -Math.cos(a) * 3.2 * s] });
  }
  b.add(G.sphere(1.6 * s, 10, 6), MOSS, { p: [0, 8.3 * s, 0], s: [1, 0.3, 2] });
  return { solid: b, obstacles: lire(physique.obstacles, p) };
}

export default fiche('STR-011', 'arche', 'Arche', part('arche'), { params: { size: [0.8, 2] } });
