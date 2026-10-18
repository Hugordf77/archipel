// Saule (ARB-009) : tronc épais et rideau de feuillage retombant, au bord de l'eau.
import { Builder } from '../../../render/builder.js';
import { treeTrunk, col } from '../../kit/vegetal.js';
import { fiche, kind } from '../../kit/fiches.js';

export function saule() {
  const b = new Builder();
  const top = treeTrunk(b, 2.2, 0.34, 0.22, 0.4);
  const clumps = [{ x: top.x, y: 2.9, z: top.z, r: 1.6, squash: 0.62, color: col('#9bd18c') }];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    clumps.push({ x: top.x + Math.cos(a) * 1.5, y: 1.9, z: top.z + Math.sin(a) * 1.5, r: 0.62, squash: 1.9, color: col(k % 2 ? '#a9d98e' : '#b6df96'), density: 1.5 });
  }
  return { solid: b.build(), clumps, crowns: [[top.x, 2.4, top.z, 1.9, 0.75]] };
}

export default fiche('ARB-009', 'saule', 'Saule', kind('saule'), { tags: ['abattable', 'bord de l\'eau'] });
