// Canots des îles : barque amarrée au village (NAV-005, quatre couleurs) et barque échouée sur le sable
// (NAV-006 : penchée, retournée ou radeau démonté).
import { Builder, G } from '../../../render/builder.js';
import { WOOD, WOOD_L, WOOD_D, ROPE, bx, lire } from '../../kit/lieux.js';
import { fiche, part, v3 } from '../../kit/fiches.js';
import physique from './physique.js';

function barque(p, stranded = false) {
  const b = new Builder();
  const cols = ['#86c6bb', '#f19b86', '#f6d27a', '#c7b2e6'];
  const c = cols[(p.v || 0) % cols.length];
  b.add(G.sphere(1, 16, 10), c, { p: [0, stranded ? 0.15 : 0.05, 0], s: [0.75, 0.42, 1.9] });
  b.add(G.sphere(1, 16, 10), '#f6ead2', { p: [0, stranded ? 0.32 : 0.22, 0], s: [0.62, 0.18, 1.7] });
  b.add(bx(1.2, 0.06, 0.32, 0.02), WOOD_L, { p: [0, stranded ? 0.42 : 0.32, 0.1] });
  return b;
}

// barque amarrée (lieu « barque_amarree »)
export function barqueAmarree(p) {
  return { solid: barque(p), obstacles: lire(physique.barque_amarree.obstacles) };
}

export function barqueEchouee(p) {
  const v = p.v || 0;
  if (v === 2) {
    // radeau démonté : rondins épars, mât couché
    const b = new Builder();
    for (let k = 0; k < 5; k++) b.add(G.cyl(0.18, 0.18, 2.6 - (k % 2) * 0.6, 10), k % 2 ? WOOD : WOOD_L, { p: [(k - 2) * 0.45 + (k % 3) * 0.2, 0.15, (k % 2) * 0.4], r: [Math.PI / 2, 0.2 * (k - 2), 0] });
    b.add(G.cyl(0.05, 0.05, 2.2, 6), WOOD_D, { p: [1.3, 0.1, -0.6], r: [Math.PI / 2, 0.8, 0] });
    b.add(G.torus(0.5, 0.04, 5, 12), ROPE, { p: [-1.2, 0.08, 0.8], r: [Math.PI / 2, 0, 0] });
    return { solid: b, obstacles: lire(physique.barque_echouee.obstacles, p) };
  }
  const b = new Builder();
  if (v === 1) {
    // coque retournée
    b.add(G.sphere(1, 16, 10), '#9cc8ec', { p: [0, 0.05, 0], s: [0.8, 0.5, 2.0], r: [Math.PI, 0, 0] });
    b.add(bx(0.08, 0.06, 3.6, 0.02), WOOD_D, { p: [0, 0.55, 0] });
  } else {
    // barque échouée, penchée sur le sable (réparable si v = 0)
    b.addBuilt(barque(p, true).build(), { r: [0, 0, 0.35] });
    b.add(G.cyl(0.04, 0.04, 2.2, 6), WOOD, { p: [0.9, 0.12, 0.4], r: [Math.PI / 2, 0.5, 0] });
    if (v === 3) b.add(bx(0.8, 0.08, 0.6, 0.02), WOOD_D, { p: [-0.4, 0.5, -0.6], r: [0.4, 0.3, 0] });
  }
  return { solid: b, obstacles: lire(physique.barque_echouee.obstacles, p) };
}

export default [
  fiche('NAV-005', 'barque-amarree', 'Barque amarrée', part('barque_amarree'), { variants: v3(['Corail', 'Menthe', 'Ciel']), params: { v: [0, 3] }, tags: ['village'] }),
  fiche('NAV-006', 'barque-echouee', 'Barque échouée', part('barque_echouee'), { params: { v: [0, 2] }, tags: ['épave'] }),
];
