// Cabane d'ermite (BAT-009) : sur pilotis, toit menthe, porte et fenêtre, rampe d'accès.
import { Builder, G } from '../../../render/builder.js';
import { WOOD, WOOD_D, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function cabane(p, rand) {
  const b = new Builder();
  for (const [x, z] of [[-1.1, -0.9], [1.1, -0.9], [-1.1, 0.9], [1.1, 0.9]]) b.add(G.cyl(0.09, 0.11, 0.9, 8), WOOD_D, { p: [x, 0.45, z] });
  b.add(G.box(2.7, 0.16, 2.3, 0.04), WOOD, { p: [0, 0.9, 0] });
  b.add(G.box(2.3, 1.6, 1.9, 0.06), '#e0b07e', { p: [0, 1.75, 0] });
  b.add(G.box(2.8, 0.14, 1.5, 0.05), '#86c6bb', { p: [0, 2.9, -0.55], r: [0.62, 0, 0] });
  b.add(G.box(2.8, 0.14, 1.5, 0.05), '#86c6bb', { p: [0, 2.9, 0.55], r: [-0.62, 0, 0] });
  b.add(G.box(0.7, 1.15, 0.08, 0.03), WOOD_D, { p: [0.4, 1.55, 0.97] });
  b.add(G.box(0.55, 0.45, 0.06, 0.03), '#ffeab8', { p: [-0.55, 1.95, 0.97] });
  b.add(G.box(0.8, 0.12, 0.9, 0.03), WOOD, { p: [0.4, 0.45, 1.5], r: [-0.5, 0, 0] });
  return { solid: b, obstacles: lire(physique.obstacles, p) };
}

export default fiche('BAT-009', 'cabane-ermite', 'Cabane d\'ermite', part('cabane'));
