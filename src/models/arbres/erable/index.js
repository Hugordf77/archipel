// Érable (ARB-010) : houppier d'automne en trois touffes orangées.
import { Builder } from '../../../render/builder.js';
import { treeTrunk, col } from '../../kit/vegetal.js';
import { fiche, kind } from '../../kit/fiches.js';

export function erable() {
  const b = new Builder();
  const top = treeTrunk(b, 2.1, 0.26, 0.16, 0.3);
  return {
    solid: b.build(),
    clumps: [
      { x: top.x, y: 2.8, z: top.z, r: 1.45, color: col('#f2a07a') },
      { x: top.x + 0.5, y: 3.5, z: top.z + 0.2, r: 0.95, color: col('#f6c08a') },
      { x: top.x - 0.6, y: 3.2, z: top.z - 0.3, r: 0.8, color: col('#ee8f78') },
    ],
    crowns: [[top.x, 2.9, top.z, 1.5, 0.85]],
  };
}

export default fiche('ARB-010', 'erable', 'Érable', kind('erable'), { tags: ['abattable', 'automne'] });
