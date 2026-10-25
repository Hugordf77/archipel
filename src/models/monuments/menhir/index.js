// Menhir (MON-009) : pierre levée seule, plus haute que celles du cercle MON-004, dalle épaisse à faces
// larges vers ±Z (+Z face au vent quand rot suit le vent, type DIRZ), un peu penchée sous le vent (−Z),
// taches de mousse côté vent ; trois variantes (v : dressé, trapu, élancé).
import { Builder } from '../../../render/builder.js';
import { STONE, STONE_D, MOSS, lire } from '../../kit/lieux.js';
import { fiche, part, v3 } from '../../kit/fiches.js';
import { pierreLevee, mousse, domeDe } from './forme.js';
import physique from './physique.js';

// variantes : largeur et épaisseur au pied, hauteur hors tout (dont 0,1 m enterré), amincissement,
// inclinaison sous le vent (rad), couleur
export const MENHIRS = [
  { w: 1.0, h: 3.2, d: 0.5, effile: 0.32, lean: 0.06, color: STONE },
  { w: 1.12, h: 2.75, d: 0.55, effile: 0.24, lean: 0.04, color: STONE_D },
  { w: 0.86, h: 3.45, d: 0.45, effile: 0.4, lean: 0.08, color: STONE },
];
const ENTERRE = 0.1;

export function menhir(p, rand = Math.random) {
  const v = MENHIRS[(p.v || 0) % MENHIRS.length];
  const graine = Math.floor(rand() * 7);
  const forme = { w: v.w, h: v.h, d: v.d, effile: v.effile, dome: domeDe(v), biseau: 0.05, bosse: 0.04, graine };
  const pierre = new Builder();
  pierre.add(pierreLevee(forme), v.color);
  // mousse côté vent (+Z) : une grande tache sous l'épaule, une plus petite plus bas, de l'autre côté ;
  // tailles rapportées à la demi-largeur de la dalle à leur hauteur, pour ne jamais déborder du bord
  const demi = (t) => (v.w / 2) * (1 - v.effile * t);
  mousse(pierre, forme, { x: 0.15 * demi(0.7), y: 0.7 * v.h, haut: 0.3, large: 0.55 * demi(0.7), graine: graine + 1, couleur: MOSS });
  mousse(pierre, forme, { x: -0.3 * demi(0.38), y: 0.38 * v.h, haut: 0.18, large: 0.4 * demi(0.38), graine: graine + 4, couleur: MOSS });
  // penchée sous le vent (−Z), un soupçon de travers
  const b = new Builder();
  b.addBuilt(pierre.build(), { p: [0, -ENTERRE, 0], r: [-v.lean, 0, (rand() - 0.5) * 0.04] });
  return { solid: b, obstacles: lire(physique.obstacles, p) };
}

export default fiche('MON-009', 'menhir', 'Menhir', part('menhir'), {
  variants: v3(['Dressé', 'Trapu', 'Élancé']),
  tags: ['plateau'],
});
