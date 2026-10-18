// Cercle de pierres (MON-004) : menhirs dressés en cercle (5 à 12), mousse, pierre plate au centre.
import { Builder, G } from '../../../render/builder.js';
import { mulberry32 } from '../../../core/random.js';
import { rng } from '../../kit/shapes.js';
import { STONE, STONE_D, MOSS, bx, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function cerclePierres(p) {
  const b = new Builder();
  const rng = mulberry32(Math.round(p.x * 13 + p.z * 7));
  const count = p.count || 8;
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2;
    const h = 1.6 + rng() * 1.2;
    b.add(bx(0.7, h, 0.45, 0.12), k % 3 ? STONE : STONE_D, { p: [Math.cos(a) * 4, h / 2 - 0.1, Math.sin(a) * 4], r: [(rng() - 0.5) * 0.12, -a, (rng() - 0.5) * 0.1] });
    if (rng() < 0.5) b.add(G.sphere(0.35, 8, 5), MOSS, { p: [Math.cos(a) * 4, h - 0.05, Math.sin(a) * 4], s: [1, 0.3, 0.8] });
  }
  b.add(G.cyl(0.9, 1.0, 0.35, 12), STONE_D, { p: [0, 0.15, 0] });
  return { solid: b, obstacles: lire(physique.obstacles, p) };
}

export default fiche('MON-004', 'cercle-pierres', 'Cercle de pierres', part('cercle_pierres'), { params: { count: [5, 12] } });
