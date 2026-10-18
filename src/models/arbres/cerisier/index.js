// Cerisier (ARB-003) : tronc plus courbe, houppier en fleurs roses ; on l'abat à la hache.
import { Builder } from '../../../render/builder.js';
import { treeTrunk, col } from '../../kit/vegetal.js';
import { fiche, kind } from '../../kit/fiches.js';

export function arbreCerisier() {
  const b = new Builder();
  const top = treeTrunk(b, 1.9, 0.24, 0.15, 0.35);
  return {
    solid: b.build(),
    clumps: [
      { x: top.x, y: 2.55, z: top.z, r: 1.45, color: col('#f6b9c8') },
      { x: top.x + 0.45, y: 3.25, z: top.z - 0.25, r: 0.95, color: col('#f9d3dc') },
    ],
    crowns: [[top.x, 2.6, top.z, 1.5, 0.85]],
  };
}

export default fiche('ARB-003', 'cerisier', 'Cerisier', kind('arbre_cerisier'), { tags: ['abattable', 'fleuri'] });
