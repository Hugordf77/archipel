// Tour de guet (BAT-007) : sur pilotis de bois avec échelle, ou tour de pierre ; plateforme et toit.
import { Builder, G } from '../../../render/builder.js';
import { WOOD, WOOD_L, WOOD_D, STONE, bx, seg, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function tourGuet(p) {
  const b = new Builder();
  const stone = p.stone;
  const c = stone ? STONE : WOOD;
  if (stone) {
    b.add(G.cyl(1.4, 1.8, 6.5, 12), STONE, { p: [0, 3.25, 0] });
  } else {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) seg(b, WOOD_D, sx * 1.5, 0, sz * 1.5, sx * 1.1, 6.4, sz * 1.1, 0.13, 0.11, 8);
    for (const y of [2, 4.2]) b.add(bx(2.6, 0.1, 0.1, 0.02), WOOD, { p: [0, y, 1.3] });
    // échelle
    seg(b, WOOD_L, -0.3, 0, 1.8, -0.3, 6.4, 1.15, 0.04, 0.04, 5);
    seg(b, WOOD_L, 0.3, 0, 1.8, 0.3, 6.4, 1.15, 0.04, 0.04, 5);
    for (let y = 0.4; y < 6.3; y += 0.45) b.add(bx(0.62, 0.04, 0.05, 0.01), WOOD_L, { p: [0, y, 1.8 - (y / 6.4) * 0.65] });
  }
  b.add(bx(3.2, 0.18, 3.2, 0.05), c, { p: [0, 6.5, 0] });
  for (const sx of [-1, 1]) b.add(bx(3.2, 0.7, 0.1, 0.03), WOOD_L, { p: [0, 6.95, sx * 1.55] });
  for (const sx of [-1, 1]) b.add(bx(0.1, 0.7, 3.2, 0.03), WOOD_L, { p: [sx * 1.55, 6.95, 0] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(G.cyl(0.07, 0.07, 1.6, 6), WOOD_D, { p: [sx * 1.45, 7.4, sz * 1.45] });
  b.add(G.cone(2.4, 1.3, 4), stone ? '#86c6bb' : '#f19b86', { p: [0, 8.8, 0], r: [0, Math.PI / 4, 0] });
  b.add(bx(0.05, 0.7, 0.5, 0.02), '#f19b86', { p: [0, 9.9, 0.3], sway: 0.8 });
  return { solid: b, obstacles: lire(physique.obstacles, p) };
}

export default fiche('BAT-007', 'tour-guet', 'Tour de guet', part('tour_guet'), {
    variants: [{ label: 'Bois', params: { stone: false } }, { label: 'Pierre', params: { stone: true } }], params: { stone: 'bool' },
  });
