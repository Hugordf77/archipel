// Bouleau (ARB-008) : tronc blanc marqué de lenticelles, feuillage clair élancé.
import { Builder, G } from '../../../render/builder.js';
import { col } from '../../kit/vegetal.js';
import { fiche, kind } from '../../kit/fiches.js';

export function bouleau() {
  const b = new Builder();
  b.add(G.cyl(0.13, 0.2, 3.0, 9), '#f4efe6', { p: [0, 1.5, 0] });
  for (let k = 0; k < 6; k++) b.add(G.box(0.05, 0.08, 0.2, 0.01), '#5b4a63', { p: [Math.cos(k * 2.1) * 0.15, 0.5 + k * 0.42, Math.sin(k * 2.1) * 0.15], r: [0, -k * 2.1, 0], tint: 0 });
  return {
    solid: b.build(),
    clumps: [
      { x: 0, y: 3.0, z: 0, r: 1.1, squash: 1.25, color: col('#b8e0a0') },
      { x: 0.3, y: 3.9, z: -0.1, r: 0.75, squash: 1.2, color: col('#cdeab0') },
    ],
    crowns: [[0, 3.2, 0, 1.15, 1.2]],
  };
}

export default fiche('ARB-008', 'bouleau', 'Bouleau', kind('bouleau'), { tags: ['abattable'] });
