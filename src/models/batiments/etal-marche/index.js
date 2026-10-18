// Étal du marché (BAT-011) : comptoir, auvent rayé (trois couleurs), fruits et légumes.
import { Builder, G } from '../../../render/builder.js';
import { WOOD_L, WOOD_D, CREAM, bx, lire } from '../../kit/lieux.js';
import { fiche, part, v3 } from '../../kit/fiches.js';
import physique from './physique.js';

export function etal(p) {
  const b = new Builder();
  const awn = ['#f19b86', '#86c6bb', '#f2c86a'][(p.v || 0) % 3];
  b.add(bx(2.0, 0.9, 0.9, 0.05), WOOD_L, { p: [0, 0.45, 0] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(G.cyl(0.05, 0.05, 2.0, 6), WOOD_D, { p: [sx * 0.95, 1.0, sz * 0.42] });
  for (let k = 0; k < 4; k++) b.add(bx(0.5, 0.06, 1.1, 0.02), k % 2 ? awn : CREAM, { p: [-0.75 + k * 0.5, 2.05, 0.1], r: [0.25, 0, 0] });
  const goods = [['#f39c4a', 0.12], ['#e9786f', 0.09], ['#a6d98f', 0.1], ['#f6d27a', 0.1]];
  goods.forEach(([c, r], k) => {
    for (let q = 0; q < 3; q++) b.add(G.sphere(r, 8, 6), c, { p: [-0.7 + k * 0.46 + (q % 2) * 0.1, 0.98 + q * 0.04, -0.1 + q * 0.12] });
  });
  return { solid: b, obstacles: lire(physique.obstacles, p) };
}

export default fiche('BAT-011', 'etal-marche', 'Étal du marché', part('etal'), { variants: v3(['Corail', 'Menthe', 'Beurre']), params: { v: [0, 2] }, tags: ['village'] });
