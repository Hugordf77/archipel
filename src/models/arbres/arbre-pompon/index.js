// Arbre pompon (ARB-001) : l'arbre fractal de l'utilisateur (kit/arbreFractal.js, sa recette telle
// quelle, graine 42), ramené à 4,7 m : tronc évasé au pied, six générations de branches courbées, trois
// filles par branche ; bois dessiné jusqu'à la 3e génération, feuillage en 27 touffes peintes (une par
// sous-arbre), vert sombre au cœur et clair en périphérie ; on l'abat à la hache.
import { arbreFeuillu } from '../../kit/arbreFractal.js';
import { fiche, kind } from '../../kit/fiches.js';

// teinte des feuilles par exposition (HSL : cœur → périphérie), celle de l'original éclaircie au pastel
export const TEINTE = { h: [0.33, 0.22], s: [0.34, 0.52], l: [0.5, 0.76] };

export function arbrePompon() {
  return arbreFeuillu({ hauteur: 4.7, teinte: TEINTE, seed: 11 });
}

export default fiche('ARB-001', 'arbre-pompon', 'Arbre pompon', kind('arbre_pompon'), { tags: ['abattable'] });
