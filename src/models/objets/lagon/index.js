// Lagon : récif de coraux ronds (OBJ-010, taille réglable). Le corail isolé (OBJ-011) rejoint ce
// dossier avec la végétation.
import { Builder, G } from '../../../render/builder.js';
import { lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function recif(p) {
  const b = new Builder();
  const s = p.size || 1;
  const cols = ['#f4a2a0', '#f6b98a', '#c7b2e6', '#9fdcc8'];
  for (let k = 0; k < 6; k++) b.add(G.sphere(0.5 * s, 8, 6), cols[k % 4], { p: [Math.cos(k) * 0.8 * s, 0.2, Math.sin(k * 1.7) * 0.8 * s], s: [1, 0.6 + (k % 3) * 0.3, 1] });
  return { solid: b, obstacles: lire(physique.recif.obstacles) };
}

export default fiche('OBJ-010', 'recif', 'Récif', part('recif'), { params: { size: [0.6, 2] }, tags: ['lagon'] });
