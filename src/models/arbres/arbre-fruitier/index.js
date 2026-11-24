// Arbre fruitier (ARB-002) : l'arbre fractal de l'utilisateur (kit/arbreFractal.js) sur une autre graine,
// ramené à 4,3 m, et sept fruits pêche posés au bord des touffes les plus exposées ; on l'abat à la hache.
import { G } from '../../../render/builder.js';
import { arbreFeuillu } from '../../kit/arbreFractal.js';
import { fiche, kind } from '../../kit/fiches.js';

export const TEINTE = { h: [0.31, 0.24], s: [0.36, 0.52], l: [0.5, 0.76] };

// sept fruits, sur la face extérieure des touffes les mieux exposées
function fruits(b, touffes, c) {
  const exposees = touffes.slice().sort((a, z) => z.expo - a.expo).slice(0, 7);
  for (const t of exposees) {
    const dx = t.x - c.x;
    const dz = t.z - c.z;
    const l = Math.hypot(dx, dz) || 1;
    b.add(G.sphere(0.15, 7, 5), '#f7b48a', { p: [t.x + (dx / l) * t.r * 0.7, t.y - t.r * 0.25, t.z + (dz / l) * t.r * 0.7], tint: 0 });
  }
}

export function arbreFruitier() {
  return arbreFeuillu({ recette: { graine: 21 }, hauteur: 4.3, teinte: TEINTE, seed: 17, decor: fruits });
}

export default fiche('ARB-002', 'arbre-fruitier', 'Arbre fruitier', kind('arbre_fruitier'), { tags: ['abattable', 'fruits'] });
