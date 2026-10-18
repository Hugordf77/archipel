// Bois : souche (ROC-007), bois mort (ROC-008), pile de bûches (ROC-009) et rondin couché (ROC-010).
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { segment, BARK } from '../../kit/vegetal.js';
import { WOOD, WOOD_L, lire } from '../../kit/lieux.js';
import { fiche, kind, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function boisPile() {
  const b = new Builder();
  for (let k = 0; k < 6; k++) b.add(G.cyl(0.14, 0.14, 1.2, 8), k % 2 ? WOOD : WOOD_L, { p: [(k % 3) * 0.3 - 0.3, 0.15 + Math.floor(k / 3) * 0.26, 0], r: [Math.PI / 2, 0, 0] });
  return { solid: b, obstacles: lire(physique.bois_pile.obstacles) };
}

export function rondin() {
  const b = new Builder();
  b.add(G.cyl(0.28, 0.3, 2.0, 10), WOOD, { p: [0, 0.27, 0], r: [0, 0, Math.PI / 2] });
  b.add(G.cyl(0.26, 0.26, 0.02, 10), '#ecd3a8', { p: [1.01, 0.27, 0], r: [0, 0, Math.PI / 2] });
  return { solid: b, obstacles: lire(physique.rondin.obstacles) };
}


export function souche() {
  const b = new Builder();
  b.add(G.cyl(0.36, 0.44, 0.42, 14), BARK, { p: [0, 0.21, 0] });
  b.add(G.cyl(0.34, 0.34, 0.03, 14), '#ecd3a8', { p: [0, 0.43, 0], tint: 0 });
  return { solid: b.build(), shadow: true };
}

export function boisMort() {
  const b = new Builder();
  const c = '#b6a596';
  segment(b, c, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.2, 1.6, 0), 0.13, 0.08, 8);
  segment(b, c, new THREE.Vector3(0.1, 0.9, 0), new THREE.Vector3(0.7, 1.4, 0.1), 0.07, 0.04, 6);
  segment(b, c, new THREE.Vector3(0.15, 1.2, 0), new THREE.Vector3(-0.4, 1.8, -0.2), 0.06, 0.035, 6);
  return { solid: b.build(), shadow: true };
}

export default [
  fiche('ROC-007', 'souche', 'Souche', kind('souche'), { tags: ['bois'] }),
  fiche('ROC-008', 'bois-mort', 'Bois mort', kind('bois_mort'), { tags: ['bois'] }),
  fiche('ROC-009', 'pile-bois', 'Pile de bois', part('bois_pile'), { tags: ['bois'] }),
  fiche('ROC-010', 'rondin', 'Rondin', part('rondin'), { tags: ['bois', 'assise'] }),
];
