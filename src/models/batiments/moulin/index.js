// Moulin à vent (BAT-004) : tour crème, toit teinté, ailes de toile qui tournent au vent.
import { Builder, G } from '../../../render/builder.js';
import { WOOD, WOOD_D, STONE_D, CREAM, bx, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function moulin(p) {
  const b = new Builder();
  const F = { tint: 0 };
  b.add(G.cyl(1.9, 2.3, 0.4, 16), STONE_D, { p: [0, 0.2, 0], ...F });
  b.add(G.cyl(1.35, 1.9, 6.2, 16), CREAM, { p: [0, 3.5, 0], ...F });
  b.add(G.cone(1.75, 1.6, 16), '#ffffff', { p: [0, 7.4, 0], tint: 1 });
  b.add(bx(0.9, 1.5, 0.1, 0.04), WOOD_D, { p: [0, 1.05, 1.86], r: [-0.08, 0, 0], ...F });
  b.add(bx(0.55, 0.6, 0.08, 0.03), '#ffffff', { p: [0, 4.2, 1.6], r: [-0.08, 0, 0], tint: 1 });
  b.add(G.cyl(0.2, 0.2, 0.7, 10), WOOD_D, { p: [0, 6.6, 1.6], r: [Math.PI / 2, 0, 0], ...F });
  // ailes (animées) : quatre bras en croix, toile crème
  // les toiles tournent avec les bras : on décale chaque toile le long de son bras
  const sails = new Builder();
  sails.add(G.cyl(0.32, 0.32, 0.22, 10), WOOD_D, { r: [Math.PI / 2, 0, 0] });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    sails.add(bx(0.12, 4.8, 0.08, 0.02), WOOD, { p: [ux * 2.3, uy * 2.3, 0.05], r: [0, 0, a - Math.PI / 2] });
    sails.add(bx(0.95, 3.6, 0.04, 0.02), k % 2 ? CREAM : '#f6ead2', { p: [ux * 2.6 - uy * 0.55, uy * 2.6 + ux * 0.55, 0.1], r: [0, 0, a - Math.PI / 2] });
  }
  return { solid: b, anim: [{ builder: sails, pivot: [0, 6.6, 2.0], axis: 'z', speed: 0.8, wind: true }], obstacles: lire(physique.obstacles, p) };
}

export default fiche('BAT-004', 'moulin', 'Moulin à vent', part('moulin', { color: '#f19b86', wall: '#fbf3e6' }), { params: { color: 'color', wall: 'color' }, tags: ['village', 'animé', 'teinté'] });
