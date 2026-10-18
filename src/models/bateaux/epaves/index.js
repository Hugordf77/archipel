// Épaves (NAV-007, et grande épave NAV-008 avec château arrière et figure de proue) : coque penchée,
// membrures, mâts brisés, voile en lambeaux ; longueur réglable, posée ou à demi coulée.
import { Builder, G } from '../../../render/builder.js';
import { WOOD, WOOD_L, WOOD_D, ROPE, bx, seg, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function epave(p, big = false) {
  const b = new Builder();
  const L = (p.len || 14) / 14;
  const tilt = p.sunk ? 0.15 : 0.32;
  b.add(G.sphere(1, 20, 12), WOOD, { p: [0, -0.2 * L, 0], r: [0, 0, tilt], s: [1.9 * L, 1.1 * L, 7 * L] });
  b.add(G.sphere(1, 20, 12), '#8a6a5c', { p: [0.1, 0.25 * L, 0], r: [0, 0, tilt], s: [1.55 * L, 0.6 * L, 6.4 * L] });
  for (let k = 0; k < 9; k++) b.add(G.torus(1.75 * L, 0.11 * L, 6, 14, Math.PI), WOOD_D, { p: [0, 0.1, (-5.2 + k * 1.3) * L], r: [0, 0, tilt] });
  // mâts brisés, cordages, voile en lambeaux
  seg(b, WOOD_D, 0.6 * L, 0.5 * L, 1.5 * L, 2.2 * L, 4.4 * L, 2.2 * L, 0.16 * L, 0.11 * L, 8);
  seg(b, WOOD_D, -0.3 * L, 0.5 * L, -2 * L, 0.8 * L, 2.6 * L, -2.6 * L, 0.14 * L, 0.1 * L, 8);
  b.add(bx(1.6 * L, 0.06, 1.2 * L, 0.03), '#f6ead2', { p: [2.1 * L, 3.6 * L, 2.4 * L], r: [0.25, 0.5, -0.6], sway: 0.5 });
  seg(b, ROPE, 2.2 * L, 4.3 * L, 2.2 * L, 3.5 * L, 0, 5 * L, 0.025, 0.025, 4);
  b.add(bx(1.0 * L, 0.6 * L, 0.8 * L, 0.06), WOOD_D, { p: [-2.4 * L, 0.3, 5.4 * L], r: [0, 0.5, 0.2] });
  if (big) {
    b.add(bx(2.2 * L, 1.4 * L, 2.4 * L, 0.1), WOOD_L, { p: [0.4 * L, 1.2 * L, -4.2 * L], r: [0, 0, tilt] });
    b.add(G.cone(0.5 * L, 1.4 * L, 6), '#f6d27a', { p: [0, 0.8 * L, 7.3 * L], r: [Math.PI / 2, 0, 0] });
  }
  return { solid: b, obstacles: lire(physique.obstacles, p) };
}

export default [
  fiche('NAV-007', 'epave', 'Épave', part('epave'), { params: { len: [8, 20], sunk: 'bool' }, tags: ['épave'] }),
  fiche('NAV-008', 'grande-epave', 'Grande épave', part('epave_geante'), { tags: ['épave', 'repère'] }),
];
