// Arbre pompon (ARB-001) : tronc courbe évasé au pied, trois racines qui plongent dans le sol, et un
// houppier en quatre masses rondes (trois autour, une au sommet) portées chacune par une branche
// maîtresse, avec des trouées de ciel entre elles ; on l'abat à la hache.
// Enveloppe du houppier calée sur la forme lointaine (farveg.js : de 1,25 à 4,1 m de haut, 1,5 m de
// rayon) : pas de saut au changement de LOD, et l'ombre des couronnes sur l'herbe reste juste. Pas de
// touffes satellites : quatre masses franches, écartées pour laisser des trouées de ciel.
import { Builder } from '../../../render/builder.js';
import { troncRameux, couronneMasses } from '../../kit/vegetal.js';
import { fiche, kind } from '../../kit/fiches.js';

const VERT = '#8fd08a';
const VERT_OMBRE = '#86c884';
const VERT_HAUT = '#a6dc92';

export function arbrePompon() {
  const b = new Builder();
  // fourche à 1,9 m ; sa position dépend de la courbure du tronc (0,2)
  const fx = Math.sin(2.2) * 0.2;
  const fz = Math.sin(1.7) * 0.2 * 0.6;
  const masses = [
    { x: fx - 0.78, y: 2.2, z: fz + 0.45, r: 1.02, color: VERT },
    { x: fx + 0.82, y: 2.28, z: fz + 0.36, r: 1.0, color: VERT_OMBRE },
    { x: fx + 0.02, y: 2.15, z: fz - 0.9, r: 1.0, color: VERT },
    { x: fx + 0.1, y: 3.25, z: fz - 0.02, r: 1.05, color: VERT_HAUT },
  ];
  const { fourche } = troncRameux(b, { h: 1.9, r0: 0.24, r1: 0.15, bend: 0.2, racines: 3, masses, seed: 11 });
  return {
    solid: b.build(),
    clumps: couronneMasses(masses, { satellites: 0, seed: 11 }),
    crowns: [[fourche.x + 0.05, 2.75, fourche.z, 1.5, 0.85]],
  };
}

export default fiche('ARB-001', 'arbre-pompon', 'Arbre pompon', kind('arbre_pompon'), { tags: ['abattable'] });
