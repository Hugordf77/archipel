// Érable (ARB-010) : l'arbre fractal de l'utilisateur (kit/arbreFractal.js) sur une autre graine, plus
// ouvert, ramené à 4,7 m ; houppier d'automne en touffes peintes, rouille au cœur et abricot en
// périphérie (teinte par exposition de l'original).
import { arbreFeuillu } from '../../kit/arbreFractal.js';
import { fiche, kind } from '../../kit/fiches.js';

export const TEINTE = { h: [0.02, 0.085], s: [0.6, 0.82], l: [0.56, 0.76] };

export function erable() {
  return arbreFeuillu({ recette: { graine: 7, ouverture: 40 }, hauteur: 4.7, teinte: TEINTE, ecorce: '#a9806a', seed: 23, forme: 1 });
}

export default fiche('ARB-010', 'erable', 'Érable', kind('erable'), { tags: ['abattable', 'automne'] });
