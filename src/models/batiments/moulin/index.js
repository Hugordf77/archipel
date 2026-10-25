// Moulin à vent (BAT-004) : tour crème, toit teinté, ailes de toile qui tournent au vent ; variante
// « pierre du plateau » (v 1) : tour trapue en pierre et moellons, toit de bardeaux galbé, mêmes ailes.
import { Builder, G } from '../../../render/builder.js';
import { WOOD, WOOD_D, STONE, STONE_D, CREAM, bx, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

// tour en pierre du plateau (v 1) : plus large au pied et plus basse que la tour crème, en pierre grise du
// kit, bandeaux d'assises et moellons en saillie ; toit de bardeaux galbé (profil tourné, teinté) à deux
// rangs marqués ; moyeu un peu plus bas et plus avancé, dégagé du toit
const rTour = (y) => 2.0 - (0.45 * (y - 0.45)) / 5.5;
// moellons en saillie : [angle autour de la tour (0 = face +Z), hauteur], hors de la porte et de la lucarne
const MOELLONS = [[0.9, 0.9], [2.1, 1.25], [-1.3, 1.1], [-2.6, 0.85], [1.6, 2.5], [-0.8, 2.65], [-2.1, 2.35], [3.0, 2.8], [0.8, 3.8], [-1.6, 4.1], [2.3, 4.6], [-0.6, 5.2]];
function tourPierre(b, F) {
  b.add(G.cyl(2.05, 2.3, 0.45, 18), STONE_D, { p: [0, 0.22, 0], ...F });
  b.add(G.cyl(1.55, 2.0, 5.5, 18), STONE_D, { p: [0, 3.2, 0], ...F });
  for (const [y, r] of [[1.95, rTour(1.95) + 0.03], [3.55, rTour(3.55) + 0.03]]) b.add(G.cyl(r - 0.01, r + 0.01, 0.16, 18), STONE, { p: [0, y, 0], ...F });
  for (const [a, y] of MOELLONS) {
    const r = rTour(y) + 0.01;
    b.add(bx(0.5 + (y * 7) % 0.2, 0.3, 0.16, 0.05), STONE, { p: [Math.sin(a) * r, y, Math.cos(a) * r], r: [-0.08, a, 0], ...F });
  }
  b.add(G.cyl(1.72, 1.66, 0.22, 18), WOOD_D, { p: [0, 6.02, 0], ...F });
  // toit galbé, bord retroussé, deux rangs de bardeaux marqués
  b.add(G.lathe([[0, 0], [2.08, 0.0], [2.02, 0.16], [1.72, 0.55], [1.32, 1.05], [0.86, 1.55], [0.42, 1.98], [0.12, 2.2], [0, 2.24]], 18), '#ffffff', { p: [0, 6.08, 0], tint: 1 });
  for (const [y, r] of [[0.55, 1.72], [1.05, 1.32]]) b.add(G.cyl(r + 0.02, r + 0.07, 0.1, 18), '#eeeeee', { p: [0, 6.08 + y - 0.05, 0], tint: 1 });
  b.add(G.sphere(0.16, 10, 8), WOOD_D, { p: [0, 8.36, 0], ...F });
  b.add(bx(0.95, 1.55, 0.1, 0.04), WOOD_D, { p: [0, 1.05, 1.98], r: [-0.08, 0, 0], ...F });
  b.add(bx(0.5, 0.55, 0.08, 0.03), '#ffffff', { p: [0, 3.9, 1.74], r: [-0.08, 0, 0], tint: 1 });
  b.add(G.cyl(0.2, 0.2, 1.1, 10), WOOD_D, { p: [0, 6.4, 1.7], r: [Math.PI / 2, 0, 0], ...F });
  return [0, 6.4, 2.25];
}

export function moulin(p) {
  const b = new Builder();
  const F = { tint: 0 };
  let moyeu = [0, 6.6, 2.0];
  if (p.v === 1) moyeu = tourPierre(b, F);
  else {
    b.add(G.cyl(1.9, 2.3, 0.4, 16), STONE_D, { p: [0, 0.2, 0], ...F });
    b.add(G.cyl(1.35, 1.9, 6.2, 16), CREAM, { p: [0, 3.5, 0], ...F });
    b.add(G.cone(1.75, 1.6, 16), '#ffffff', { p: [0, 7.4, 0], tint: 1 });
    b.add(bx(0.9, 1.5, 0.1, 0.04), WOOD_D, { p: [0, 1.05, 1.86], r: [-0.08, 0, 0], ...F });
    b.add(bx(0.55, 0.6, 0.08, 0.03), '#ffffff', { p: [0, 4.2, 1.6], r: [-0.08, 0, 0], tint: 1 });
    b.add(G.cyl(0.2, 0.2, 0.7, 10), WOOD_D, { p: [0, 6.6, 1.6], r: [Math.PI / 2, 0, 0], ...F });
  }
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
  return { solid: b, anim: [{ builder: sails, pivot: moyeu, axis: 'z', speed: 0.8, wind: true }], obstacles: lire(physique.obstacles, p) };
}

export default fiche('BAT-004', 'moulin', 'Moulin à vent', part('moulin', { color: '#f19b86', wall: '#fbf3e6' }), {
  variants: [{ label: 'Tour crème', params: { v: 0 } }, { label: 'Pierre du plateau', params: { v: 1 } }],
  params: { color: 'color', wall: 'color' }, tags: ['village', 'animé', 'teinté', 'plateau'],
});
