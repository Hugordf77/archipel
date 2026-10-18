// Lagon : récif de coraux ronds (OBJ-010, taille réglable) et corail en branches (OBJ-011).
import { Builder, G } from '../../../render/builder.js';
import { mulberry32 } from '../../../core/random.js';
import { lire } from '../../kit/lieux.js';
import { fiche, kind, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function recif(p) {
  const b = new Builder();
  const s = p.size || 1;
  const cols = ['#f4a2a0', '#f6b98a', '#c7b2e6', '#9fdcc8'];
  for (let k = 0; k < 6; k++) b.add(G.sphere(0.5 * s, 8, 6), cols[k % 4], { p: [Math.cos(k) * 0.8 * s, 0.2, Math.sin(k * 1.7) * 0.8 * s], s: [1, 0.6 + (k % 3) * 0.3, 1] });
  return { solid: b, obstacles: lire(physique.recif.obstacles) };
}


export function corail() {
  const b = new Builder();
  const rand = mulberry32(17);
  for (let k = 0; k < 7; k++) {
    const a = rand() * Math.PI * 2;
    const l = 0.25 + rand() * 0.35;
    b.add(G.capsule(0.06, l, 3, 8), k % 2 ? '#f4a2a0' : '#f6b98a', { p: [Math.cos(a) * 0.15, l * 0.5, Math.sin(a) * 0.15], r: [Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5] });
  }
  return { solid: b.build() };
}

export default [
  fiche('OBJ-010', 'recif', 'Récif', part('recif'), { params: { size: [0.6, 2] }, tags: ['lagon'] }),
  fiche('OBJ-011', 'corail', 'Corail', kind('corail'), { tags: ['lagon'] }),
];
