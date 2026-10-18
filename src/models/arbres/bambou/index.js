// Bambou (ARB-011) : six tiges à nœuds qui se balancent, feuillage léger au sommet.
import { Builder, G } from '../../../render/builder.js';
import { col } from '../../kit/vegetal.js';
import { fiche, kind } from '../../kit/fiches.js';

export function bambou() {
  const b = new Builder();
  for (let k = 0; k < 6; k++) {
    const a = k * 1.05;
    const x = Math.cos(a) * 0.35;
    const z = Math.sin(a) * 0.35;
    const h = 3.4 + (k % 3) * 0.6;
    b.add(G.cyl(0.06, 0.07, h, 6), k % 2 ? '#9fd08a' : '#8cc47e', { p: [x, h / 2, z], r: [Math.sin(a) * 0.06, 0, Math.cos(a) * 0.06], sway: 0.6 });
    for (let q = 1; q < 5; q++) b.add(G.cyl(0.075, 0.075, 0.05, 6), '#7aa86e', { p: [x, (h / 5) * q, z], tint: 0, sway: 0.3 });
  }
  return {
    solid: b.build(),
    clumps: [
      { x: 0, y: 3.6, z: 0, r: 0.9, squash: 1.1, color: col('#a7dc94'), density: 0.8 },
      { x: 0.3, y: 4.2, z: 0.2, r: 0.6, squash: 1.1, color: col('#b8e3a0'), density: 0.8 },
    ],
    crowns: [[0, 3.8, 0, 0.9, 1.2]],
  };
}

export default fiche('ARB-011', 'bambou', 'Bambou', kind('bambou'), { tags: ['abattable'] });
