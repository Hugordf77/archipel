// Muret effondré (MON-010) : mur de pierres sèches en ruine, environ 20 m (len 12 à 24) en trois tronçons
// le long de X, séparés par deux brèches praticables ; deux assises de moellons (la seconde tombée vers
// les brèches), pierres éboulées au pied, mousse côté vent (+Z). Type DIRX : l'axe du mur suit rot.
import { Builder } from '../../../render/builder.js';
import { surface, patch } from '../../kit/formes.js';
import { STONE, STONE_D, MOSS, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import { moellon } from '../menhir/forme.js';
import physique, { troncons, eboulis } from './physique.js';

const EP = 0.72; // épaisseur du mur
const ENTERRE = 0.06;

export function muretEffondre(p, rand = Math.random) {
  const b = new Builder();
  // une pierre : son propre identifiant de contour (trait d'encre aux joints), mousse éventuelle sur le
  // dessus, côté vent (tache du kit épousant la pierre)
  const pierre = (L, H, D, couleur, { p: at, r, mousse = false }) => {
    const sb = new Builder();
    sb.add(moellon(L, H, D, { graine: Math.floor(rand() * 9) }), couleur);
    if (mousse) {
      const dessus = surface([(rand() - 0.5) * L * 0.3, 0, D * 0.12], [L / 2, H / 2, D / 2], 3.5);
      patch({ add: (g, _c, o) => sb.add(g, MOSS, { ...o, tint: 0 }) }, dessus, [0, 1, 0], [0.65, Math.min(0.6, 0.45 / L)], Math.floor(rand() * 9), { lift: 0.02, seg: 14, couronnes: [0.5, 1], tol: 0.004 });
    }
    b.addBuilt(sb.build(), { p: at, r });
  };
  let mousses = 0;
  troncons(p.len || 20).forEach(([x0, x1], k) => {
    const L = x1 - x0;
    // première assise : 2 ou 3 moellons bout à bout, qui se chevauchent un peu
    const n = Math.min(3, Math.max(2, Math.round(L / 1.7)));
    const l = L / n;
    for (let i = 0; i < n; i++) {
      const H = 0.62 + rand() * 0.06;
      const li = l + (i > 0 && i < n - 1 ? 0.12 : 0.06);
      const cx = x0 + l * (i + 0.5) + (i === 0 ? 0.03 : i === n - 1 ? -0.03 : 0);
      pierre(li, H, EP * (0.96 + rand() * 0.08), i % 2 ? STONE_D : STONE, { p: [cx, H / 2 - ENTERRE, (rand() - 0.5) * 0.06], r: [0, (rand() - 0.5) * 0.05, (rand() - 0.5) * 0.03] });
    }
    // seconde assise sur le milieu du tronçon (de 15 à 85 %), à joints décalés ; la pierre qui manque
    // est tombée au pied du mur (eboulis de physique.js)
    const u0 = x0 + L * 0.15;
    const u1 = x1 - L * 0.15;
    const lu = (u1 - u0) / n;
    const manque = (k + 1) % n;
    for (let i = 0; i < n; i++) {
      const H = 0.32 + rand() * 0.18;
      const cx = u0 + lu * (i + 0.5);
      if (i === manque) continue;
      const y = 0.62 - ENTERRE + H / 2 - 0.04;
      const mousse = mousses < 3 && rand() < 0.5;
      if (mousse) mousses++;
      pierre(lu * 0.98, H, EP * (0.82 + rand() * 0.08), i % 2 ? STONE : STONE_D, { p: [cx, y, (rand() - 0.5) * 0.08], r: [(rand() - 0.5) * 0.06, (rand() - 0.5) * 0.08, (rand() - 0.5) * 0.08], mousse });
    }
  });
  // éboulis : pierres couchées au pied du mur, un peu de biais
  for (const [x, z, l] of eboulis(p.len || 20)) {
    const H = 0.3 + rand() * 0.06;
    pierre(l, H, 0.46, STONE_D, { p: [x, H / 2 - 0.05, z], r: [Math.sign(z) * 0.2, (rand() - 0.5) * 0.6, (rand() - 0.5) * 0.2] });
  }
  return { solid: b, obstacles: lire(physique.obstacles, p) };
}

export default fiche('MON-010', 'muret-effondre', 'Muret effondré', part('muret_effondre'), {
  params: { len: [12, 24] },
  defaults: { len: 20 },
  tags: ['plateau'],
});
