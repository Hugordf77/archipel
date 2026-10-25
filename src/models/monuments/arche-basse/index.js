// Arche basse (MON-011) : porte de pierres levées à l'entrée de la table du plateau, deux montants et un
// linteau couché ; ouverture de 2,8 m sur 2,6 m de haut libre, passage le long de
// Z (type DIRZ : l'axe de passage suit rot), taches de mousse. Bien plus basse que l'arche marine STR-011.
import { Builder } from '../../../render/builder.js';
import { surface, patch } from '../../kit/formes.js';
import { STONE, STONE_D, MOSS, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import { pierreLevee, moellon, mousse } from '../menhir/forme.js';
import physique, { MONTANT_X } from './physique.js';

const ENTERRE = 0.1;
const MONTANT = { w: 0.95, h: 2.82, d: 0.75, effile: 0.1, dome: 0.07, biseau: 0, bosse: 0.04 };

export function archeBasse(p, rand = Math.random) {
  const b = new Builder();
  // montants : pierres levées à sommet presque plat, où repose le linteau ; une tache de mousse sur la
  // face +Z du montant ouest, une sur la face −Z du montant est
  for (const sx of [-1, 1]) {
    const forme = { ...MONTANT, graine: sx > 0 ? 3 : 5 };
    const pierre = new Builder();
    pierre.add(pierreLevee(forme), sx > 0 ? STONE : STONE_D);
    mousse(pierre, forme, { x: 0.12 * sx, y: (sx > 0 ? 0.55 : 0.32) * MONTANT.h, haut: 0.26, large: 0.22, graine: 7 + sx, couleur: MOSS });
    b.addBuilt(pierre.build(), { p: [sx * MONTANT_X, -ENTERRE, 0], r: [0, (sx > 0 ? Math.PI : 0) + (rand() - 0.5) * 0.06, sx * 0.012] });
  }
  // linteau : moellon couché sur les deux montants, à peine de travers ; mousse en tache sur le dessus
  const haut = MONTANT.h - ENTERRE - 0.05;
  const L = { l: 4.6, h: 0.56, d: 0.82 };
  const linteau = new Builder();
  linteau.add(moellon(L.l, L.h, L.d, { bout: 0.3, pas: 0.6, graine: 4 }), STONE);
  const dessus = surface([-0.9, 0, 0], [L.l / 2, L.h / 2, L.d / 2], 3.5);
  patch({ add: (g, _c, o) => linteau.add(g, MOSS, { ...o, tint: 0 }) }, dessus, [0, 1, 0], [0.7, 0.25], 9, { lift: 0.02, seg: 16, couronnes: [0.5, 1], tol: 0.004 });
  b.addBuilt(linteau.build(), { p: [0, haut + L.h / 2, 0], r: [0, (rand() - 0.5) * 0.04, 0.015] });
  return { solid: b, obstacles: lire(physique.obstacles, p) };
}

export default fiche('MON-011', 'arche-basse', 'Arche basse', part('arche_basse'), { tags: ['plateau'] });
