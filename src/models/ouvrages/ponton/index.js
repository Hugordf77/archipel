// Ponton de l'île de départ (STR-002) : planches sur pilotis, poutres, bouée de sauvetage.
import { G } from '../../../render/builder.js';
import { PAL } from '../../kit/palette.js';
import { rng } from '../../kit/shapes.js';
import { fiche, ile } from '../../kit/fiches.js';

// Ponton sur pilotis, bouée de sauvetage ; P = { x, z0, z1, w, h }
export function ponton(b, P) {
  const rand = rng(5);
  for (let zz = P.z0; zz <= P.z1; zz += 0.38) {
    const c = rand() > 0.5 ? PAL.woodLight : PAL.wood;
    b.add(G.box(P.w + (rand() - 0.5) * 0.12, 0.1, 0.32, 0.03), c, { p: [P.x + (rand() - 0.5) * 0.06, P.h, zz], r: [0, (rand() - 0.5) * 0.04, (rand() - 0.5) * 0.02] });
  }
  for (let zz = P.z0 + 0.3; zz <= P.z1 + 0.1; zz += 2.3) {
    for (const sx of [-1, 1]) {
      b.add(G.cyl(0.13, 0.15, 3.4, 10), PAL.woodDark, { p: [P.x + sx * (P.w / 2 + 0.05), P.h - 1.4, zz] });
      b.add(G.sphere(0.14, 10, 8), PAL.woodDark, { p: [P.x + sx * (P.w / 2 + 0.05), P.h + 0.3, zz] });
    }
  }
  // poutres sous le ponton
  for (const sx of [-1, 1]) {
    b.add(G.box(0.14, 0.14, P.z1 - P.z0, 0.04), PAL.woodDark, { p: [P.x + sx * (P.w / 2 - 0.2), P.h - 0.12, (P.z0 + P.z1) / 2] });
  }
  // bouée et corde
  b.add(G.torus(0.3, 0.11, 10, 20), PAL.coral, { p: [P.x + P.w / 2 + 0.2, P.h - 0.25, P.z1 - 3.0], r: [0, Math.PI / 2, 0] });
}

export default fiche('STR-002', 'ponton', 'Ponton', ile('ponton', (b) => ponton(b, { x: 0, z0: -5.5, z1: 5.5, w: 2.4, h: 0.86 })), { tags: ['accostage'] });
