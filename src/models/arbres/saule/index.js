// Saule (ARB-009) : l'arbre fractal de l'utilisateur (kit/arbreFractal.js), courbure retournée (chaque
// segment plie vers l'extérieur : les branches retombent), ramené à 4,4 m ; touffes étirées en rideau,
// au bord de l'eau.
import { arbreFeuillu } from '../../kit/arbreFractal.js';
import { fiche, kind } from '../../kit/fiches.js';

export const TEINTE = { h: [0.27, 0.2], s: [0.34, 0.5], l: [0.46, 0.76] };

export function saule() {
  return arbreFeuillu({
    recette: { graine: 9, courbure: 0.06, retombee: 0.45, ouverture: 44, hasard: 0.3, rayonTronc: 0.5, longueurTronc: 4.4 },
    hauteur: 4.4,
    teinte: TEINTE,
    squash: 1.6,
    seed: 53,
    forme: 3,
  });
}

export default fiche('ARB-009', 'saule', 'Saule', kind('saule'), { tags: ['abattable', 'bord de l\'eau'] });
