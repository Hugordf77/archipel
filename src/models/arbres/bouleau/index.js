// Bouleau (ARB-008) : l'arbre fractal de l'utilisateur (kit/arbreFractal.js), élancé (tronc plus long,
// branches peu ouvertes et peu courbées), ramené à 5,2 m ; écorce blanche, feuillage clair.
import { arbreFeuillu } from '../../kit/arbreFractal.js';
import { fiche, kind } from '../../kit/fiches.js';

export const TEINTE = { h: [0.27, 0.2], s: [0.34, 0.5], l: [0.52, 0.8] };

export function bouleau() {
  return arbreFeuillu({
    recette: { graine: 5, longueurTronc: 3.6, rayonTronc: 0.34, ouverture: 26, courbure: 0.08, reduction: 0.74 },
    hauteur: 5.2,
    teinte: TEINTE,
    ecorce: '#f1ece3',
    seed: 41,
  });
}

export default fiche('ARB-008', 'bouleau', 'Bouleau', kind('bouleau'), { tags: ['abattable'] });
