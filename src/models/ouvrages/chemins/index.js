// Pièces de chemin des îles : pont (STR-003), pont de corde (STR-004), escalier (STR-005) et
// panneau indicateur (STR-013). Ponts et pont de corde portent un plancher marchable.
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { WOOD, WOOD_L, WOOD_D, STONE, STONE_D, ROPE, bx, seg, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique, { TABLIER, profilCorde } from './physique.js';

export function pont(p) {
  const b = new Builder();
  const len = p.len || 5;
  const y = TABLIER;
  b.add(bx(len, 0.16, 1.8, 0.04), WOOD_L, { p: [0, y, 0] });
  for (const sz of [-1, 1]) {
    b.add(bx(len, 0.08, 0.08, 0.02), WOOD, { p: [0, y + 0.75, sz * 0.85] });
    for (let x = -len / 2; x <= len / 2 + 0.01; x += len / 3) b.add(G.cyl(0.05, 0.06, 0.8, 6), WOOD_D, { p: [x, y + 0.38, sz * 0.85] });
  }
  return { solid: b, obstacles: lire(physique.pont.obstacles), decks: lire(physique.pont.planchers, p) };
}

export function pontCorde(p) {
  const b = new Builder();
  const { len, yAt } = profilCorde(p);
  const N = Math.max(6, Math.round(len / 0.9));
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    b.add(bx(0.38, 0.06, 1.3, 0.02), k % 2 ? WOOD : WOOD_L, { p: [t * len, yAt(t), 0] });
  }
  for (const sz of [-1, 1]) {
    for (let k = 0; k < N; k++) {
      const t0 = k / N;
      const t1 = (k + 1) / N;
      seg(b, ROPE, t0 * len, yAt(t0) + 0.9, sz * 0.7, t1 * len, yAt(t1) + 0.9, sz * 0.7, 0.025, 0.025, 4);
      if (k % 2 === 0) seg(b, ROPE, t0 * len, yAt(t0), sz * 0.66, t0 * len, yAt(t0) + 0.9, sz * 0.7, 0.015, 0.015, 3);
    }
    for (const t of [0, 1]) b.add(G.cyl(0.11, 0.13, 1.6, 8), WOOD_D, { p: [t * len, yAt(t) + 0.5, sz * 0.75] });
  }
  return { solid: b, obstacles: lire(physique.pont_corde.obstacles), decks: lire(physique.pont_corde.planchers, p) };
}

// marches en boîtes simples (36 sommets) : une montagne peut en compter plusieurs centaines
const STEP = new THREE.BoxGeometry(1, 1, 1);
export function escalier(p) {
  const b = new Builder();
  const len = p.len || 3;
  const rise = p.rise || 1.5;
  const steps = Math.max(2, Math.round(rise / 0.22));
  for (let k = 0; k < steps; k++) {
    const t = (k + 0.5) / steps;
    // chaque marche descend sous la suivante : aucun vide visible sous l'escalier
    b.add(STEP, k % 2 ? STONE : STONE_D, { p: [-len / 2 + t * len, -rise / 2 + t * rise - 0.2, 0], s: [len / steps + 0.08, 0.44, 1.6] });
  }
  return { solid: b, obstacles: lire(physique.escalier.obstacles) };
}

export function panneau() {
  const b = new Builder();
  b.add(G.cyl(0.06, 0.07, 2.0, 6), WOOD_D, { p: [0, 1.0, 0] });
  const cols = ['#f4a28c', '#9fdcc8', '#f6d27a'];
  for (let k = 0; k < 3; k++) b.add(bx(1.0, 0.24, 0.05, 0.03), cols[k], { p: [0.3 * (k % 2 ? -1 : 1), 1.75 - k * 0.32, 0], r: [0, k * 0.7, 0] });
  return { solid: b, obstacles: lire(physique.panneau.obstacles) };
}

export default [
  fiche('STR-003', 'pont', 'Pont', part('pont'), { params: { len: [3, 10] }, tags: ['chemins'] }),
  fiche('STR-004', 'pont-corde', 'Pont de corde', part('pont_corde', { x1: 12, z1: 0, y: 0, y1: 0 }), { params: { x1: [6, 20], y1: [-3, 3] }, tags: ['chemins'] }),
  fiche('STR-005', 'escalier', 'Escalier', part('escalier'), { params: { len: [2, 6], rise: [0.5, 3] }, tags: ['chemins'] }),
  fiche('STR-013', 'panneau', 'Panneau', part('panneau'), { tags: ['chemins'] }),
];
