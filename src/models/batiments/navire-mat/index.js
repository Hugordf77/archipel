// Mât et voile du navire-forteresse (BAT-018), pièce de la forteresse-navire du Plateau venté
// (docs/forteresse-navire/memory.md §6.5) : collier de pied, mât effilé, hune, vergues le long de X, voiles
// carrées crème bombées vers +Z à emblème bleu (toile des formes communes : quadrillage et balancement qui
// croît vers le bas, comme la bannière de MON-014), flamme bleue en tête, quatre haubans en arrière du mât.
// Deux formes (paramètre forme) : 0 grand mât de 18 m à deux vergues, 1 petit mât de 14 m à une vergue.
// Variante v 1 : version allégée, pour la vue lointaine.
import { Builder, G } from '../../../render/builder.js';
import { nextId } from '../../../core/globals.js';
import { mulberry32 } from '../../../core/random.js';
import { lire, seg } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique, { forme, PIED, HAUBANS } from './physique.js';
import { prisme, oc, barre, rect, toile, flamme, POUTRE, POUTRE_F, BOIS_TOIT, TOILE, TOILE_B, BLEU, CORDAGE } from '../navire-coque/forme.js';

const F = { tint: 0 };

export function navireMat(p) {
  const b = new Builder();
  const f = forme(p);
  const k = Math.min(1, Math.max(0, Math.round(p.forme ?? 0)));
  const o = { rand: mulberry32(2018 + 977 * k), leger: p.v === 1, idBois: nextId(), idToile: nextId(), idCorde: nextId() };
  const cotes = o.leger ? 8 : 10;
  // collier de pied de mât, mât effilé, pomme
  b.add(G.lathe([[PIED, 0], [PIED, 0.45], [PIED - 0.06, 0.62], [0.31, 0.7]], o.leger ? 8 : 12), POUTRE_F, { id: o.idBois, ...F });
  b.add(G.cyl(0.18, 0.3, f.h, cotes), POUTRE_F, { p: [0, f.h / 2, 0], id: o.idBois, ...F });
  if (!o.leger) b.add(G.sphere(0.17, 10, 8), POUTRE, { p: [0, f.h + 0.05, 0], id: o.idBois, ...F });
  // hune : plate-forme sur deux élongis, en arrière des vergues
  b.add(prisme(oc(o, 1.7, 1.4, 0.12), 0.16), BOIS_TOIT, { p: [0, f.hune, -0.25], id: o.idBois, ...F });
  if (!o.leger) for (const sx of [-1, 1]) barre(b, POUTRE_F, [sx * 0.35, f.hune - 0.14, 0.4], [sx * 0.35, f.hune - 0.14, -0.9], rect(0.12, 0.12), { id: o.idBois });
  // vergues et voiles (emblème à l'échelle de la voile)
  for (const [y, L, H] of f.vergues) {
    b.add(G.cyl(0.1, 0.1, L, o.leger ? 6 : 8), POUTRE, { p: [0, y, 0.3], r: [0, 0, Math.PI / 2], id: o.idBois, ...F });
    const lv = L * 0.92;
    b.addBuilt(toile(o, lv, H, { face: TOILE, dos: TOILE_B, blason: BLEU, ech: lv * 0.38, encoche: 0, creux: 0.7, cols: 6, rows: 8, ourlet: TOILE_B }), { p: [0, y - 0.1, 0.42] });
  }
  // flamme bleue en tête (flotte vers +X local)
  b.addBuilt(flamme(o, 2.4, 0.55), { p: [0.1, f.h - 0.35, 0] });
  // haubans : quatre cordages du dessous de la hune à un taquet de bois sur le pont, en arrière du mât
  // (loin des voiles)
  for (const [x, z] of HAUBANS) {
    seg(b, CORDAGE, Math.sign(x) * 0.16, f.hune - 0.2, -0.12, x, 0.2, z, 0.035, 0.035, o.leger ? 4 : 5, { id: o.idCorde, ...F });
    b.add(prisme(oc(o, 0.22, 0.22, 0.05), 0.26), POUTRE_F, { p: [x, 0.13, z], id: o.idBois, ...F });
  }
  return { solid: b, obstacles: lire(physique.obstacles, p) };
}

export default fiche('BAT-018', 'navire-mat', 'Mât et voile du navire-forteresse', part('navire_mat', { forme: 0 }), {
  variants: [
    { label: 'Grand mât (18 m)', params: { forme: 0, v: 0 } },
    { label: 'Grand mât, allégé (au loin)', params: { forme: 0, v: 1 } },
    { label: 'Petit mât (14 m)', params: { forme: 1, v: 0 } },
    { label: 'Petit mât, allégé (au loin)', params: { forme: 1, v: 1 } },
  ],
  // budget accordé par l'utilisateur le 26/10/2026 (forteresse-navire, ≈ 60 000 en pièces) : 1 500 de
  // près, 600 allégé, pour chaque forme
  budget: { triangles: 1500, lod: 600 },
  tags: ['plateau', 'forteresse'],
});
