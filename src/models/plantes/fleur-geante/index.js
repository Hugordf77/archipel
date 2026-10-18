// Fleur géante (PLA-017) : longue tige, sept pétales roses, cœur doré, une feuille ; elle se balance.
import { Builder, G } from '../../../render/builder.js';
import { lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function fleurGeante() {
  const b = new Builder();
  b.add(G.cyl(0.08, 0.12, 2.2, 8), '#7fbf86', { p: [0, 1.1, 0], sway: 0.3 });
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    b.add(G.sphere(0.45, 10, 6), '#f4a2b4', { p: [Math.cos(a) * 0.5, 2.25, Math.sin(a) * 0.5], s: [1, 0.25, 0.6], r: [0, -a, 0.3], sway: 0.3 });
  }
  b.add(G.sphere(0.3, 10, 8), '#f6d27a', { p: [0, 2.3, 0] });
  b.add(G.sphere(0.5, 8, 4), '#86c98f', { p: [0.4, 0.8, 0], s: [1.4, 0.2, 0.7], sway: 0.2 });
  return { solid: b, obstacles: lire(physique.obstacles) };
}

export default fiche('PLA-017', 'fleur-geante', 'Fleur géante', part('fleur_geante'), { tags: ['curiosité'] });
