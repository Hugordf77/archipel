// Cerisier (ARB-003) : l'arbre fractal de l'utilisateur (kit/arbreFractal.js), branches plus courbes et
// plus capricieuses, ramené à 4,3 m ; houppier en fleurs roses, vieux rose au cœur et rose pâle en
// périphérie ; on l'abat à la hache.
import { arbreFeuillu } from '../../kit/arbreFractal.js';
import { fiche, kind } from '../../kit/fiches.js';

export const TEINTE = { h: [0.95, 0.97], s: [0.45, 0.72], l: [0.72, 0.87] };

export function arbreCerisier() {
  return arbreFeuillu({ recette: { graine: 3, courbure: 0.14, hasard: 0.42 }, hauteur: 4.3, teinte: TEINTE, ecorce: '#a3786c', seed: 31, forme: 2 });
}

export default fiche('ARB-003', 'cerisier', 'Cerisier', kind('arbre_cerisier'), { tags: ['abattable', 'fleuri'] });
