// Observatoire (BAT-010) : tour ronde de pierre, coupole et lunette.
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { WOOD_D, STONE, GLASS, bx, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function observatoire() {
  const b = new Builder();
  const g = new Builder();
  b.add(G.cyl(2.2, 2.4, 3.0, 18), STONE, { p: [0, 1.5, 0] });
  b.add(new THREE.SphereGeometry(2.25, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#9cc8ec', { p: [0, 3.0, 0] });
  b.add(bx(0.6, 2.2, 0.3, 0.05), '#5b4a63', { p: [0, 4.0, 1.4], r: [-0.5, 0, 0] });
  b.add(G.cyl(0.22, 0.3, 2.2, 10), '#f6d27a', { p: [0, 4.6, 1.2], r: [-0.9, 0, 0] });
  b.add(bx(0.9, 1.5, 0.1, 0.04), WOOD_D, { p: [0, 0.75, 2.25] });
  g.add(bx(0.5, 0.5, 0.06, 0.02), GLASS, { p: [1.3, 1.7, 1.75], r: [0, 0.6, 0] });
  return { solid: b, glow: g, obstacles: lire(physique.obstacles) };
}

export default fiche('BAT-010', 'observatoire', 'Observatoire', part('observatoire'), { tags: ['montagne'] });
