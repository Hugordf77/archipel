// Bassin chaud (STR-010) : eau turquoise cerclée de rochers, bouffées de vapeur.
import { Builder, G } from '../../../render/builder.js';
import { lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function bassinChaud(p) {
  const b = new Builder();
  const s = p.size || 1;
  for (let k = 0; k < 10; k++) b.add(G.rock(0.4 * s, 80 + k), k % 2 ? '#cfc3d4' : '#bfb4c8', { p: [Math.cos(k * 0.63) * 1.25 * s, 0.05, Math.sin(k * 0.63) * 1.25 * s], s: [1, 0.6, 1] });
  b.add(G.cyl(1.15 * s, 1.15 * s, 0.05, 16), '#9fe0e6', { p: [0, 0.1, 0] });
  const g = new Builder();
  // vapeur : bouffées pâles légèrement lumineuses
  for (let k = 0; k < 3; k++) g.add(G.sphere(0.35 * s, 8, 6), '#ffffff', { p: [Math.cos(k * 2) * 0.4, 0.5 + k * 0.45, Math.sin(k * 2) * 0.4], s: [1, 0.7, 1] });
  return { solid: b, glow: g, obstacles: lire(physique.obstacles) };
}

export default fiche('STR-010', 'bassin-chaud', 'Bassin chaud', part('bassin_chaud'), { params: { size: [0.6, 1.6] }, tags: ['cratère'] });
