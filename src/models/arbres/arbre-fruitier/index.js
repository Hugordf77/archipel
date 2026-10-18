// Arbre fruitier (ARB-002) : tronc courbe, houppier rond et sept fruits pêche ; on l'abat à la hache.
import { Builder, G } from '../../../render/builder.js';
import { treeTrunk, col } from '../../kit/vegetal.js';
import { fiche, kind } from '../../kit/fiches.js';

export function arbreFruitier() {
  const b = new Builder();
  const top = treeTrunk(b, 1.9, 0.25, 0.16);
  for (let k = 0; k < 7; k++) {
    const a = k * 1.1;
    b.add(G.sphere(0.15, 10, 8), '#f7b48a', { p: [top.x + Math.cos(a) * 1.2, 2.2 + (k % 2) * 0.5, top.z + Math.sin(a) * 1.2], tint: 0 });
  }
  return {
    solid: b.build(),
    clumps: [{ x: top.x, y: 2.55, z: top.z, r: 1.45, color: col('#93d28c') }],
    crowns: [[top.x, 2.6, top.z, 1.5, 0.85]],
  };
}

export default fiche('ARB-002', 'arbre-fruitier', 'Arbre fruitier', kind('arbre_fruitier'), { tags: ['abattable', 'fruits'] });
