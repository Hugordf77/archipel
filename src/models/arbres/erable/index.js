// Érable (ARB-010) : tronc courbe évasé au pied, quatre racines, et un houppier d'automne en quatre
// masses orangées (trois autour, une au sommet, plus haute et plus claire), portées chacune par une
// branche maîtresse, avec des trouées de ciel entre elles. Plus ovale et plus haut que l'arbre pompon.
// Enveloppe calée sur la forme lointaine (farveg.js, SHAPES.erable : de 1,5 à 4,3 m de haut, 1,45 m de
// rayon) : pas de saut au changement de LOD.
import { Builder } from '../../../render/builder.js';
import { troncRameux, couronneMasses } from '../../kit/vegetal.js';
import { fiche, kind } from '../../kit/fiches.js';

const ORANGE = '#f2a07a';
const ROUILLE = '#ee8f78';
const ABRICOT = '#f6c08a';

export function erable() {
  const b = new Builder();
  // fourche à 2,1 m ; sa position dépend de la courbure du tronc (0,3)
  const fx = Math.sin(2.2) * 0.3;
  const fz = Math.sin(1.7) * 0.3 * 0.6;
  const masses = [
    { x: fx - 0.7, y: 2.35, z: fz + 0.35, r: 0.95, color: ORANGE },
    { x: fx + 0.72, y: 2.45, z: fz + 0.25, r: 0.92, color: ROUILLE },
    { x: fx + 0.05, y: 2.3, z: fz - 0.78, r: 0.9, color: ORANGE },
    { x: fx + 0.15, y: 3.2, z: fz - 0.05, r: 1.05, color: ABRICOT },
  ];
  const { fourche } = troncRameux(b, { h: 2.1, r0: 0.26, r1: 0.16, bend: 0.3, racines: 4, masses, seed: 23 });
  return {
    solid: b.build(),
    clumps: couronneMasses(masses, { satellites: 0, seed: 23 }),
    crowns: [[fourche.x, 2.9, fourche.z, 1.5, 0.85]],
  };
}

export default fiche('ARB-010', 'erable', 'Érable', kind('erable'), { tags: ['abattable', 'automne'] });
