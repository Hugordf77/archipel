// Puits (STR-006) : margelle de pierre, eau, treuil et petit toit.
import { Builder, G } from '../../../render/builder.js';
import { WOOD, WOOD_D, STONE, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function puits() {
  const b = new Builder();
  b.add(G.cyl(0.85, 0.95, 0.85, 14), STONE, { p: [0, 0.42, 0] });
  b.add(G.cyl(0.62, 0.62, 0.05, 14), '#7fb3c2', { p: [0, 0.8, 0] });
  for (const sx of [-1, 1]) b.add(G.cyl(0.06, 0.07, 1.5, 6), WOOD_D, { p: [sx * 0.75, 1.3, 0] });
  b.add(G.cyl(0.05, 0.05, 1.6, 6), WOOD, { p: [0, 1.85, 0], r: [0, 0, Math.PI / 2] });
  b.add(G.cone(1.1, 0.6, 4), '#f19b86', { p: [0, 2.25, 0], r: [0, Math.PI / 4, 0] });
  b.add(G.cyl(0.14, 0.11, 0.22, 8), WOOD, { p: [0, 1.4, 0] });
  return { solid: b, obstacles: lire(physique.obstacles) };
}

export default fiche('STR-006', 'puits', 'Puits', part('puits'), { tags: ['village'] });
