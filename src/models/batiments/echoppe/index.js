// Échoppe (BAT-012) : comptoir, auvent rayé, enseigne coquillage, marchandises et caisses.
// Posé par le jeu sur l'île de départ (world/home/props.js), avec les obstacles de physique.js.
import { G } from '../../../render/builder.js';
import { PAL } from '../../kit/palette.js';
import { fiche, ile } from '../../kit/fiches.js';

// Échoppe de décorations : comptoir, auvent rayé, enseigne coquillage
export function echoppe(b, x, y, z) {
  b.add(G.box(1.1, 0.95, 2.4, 0.08), PAL.woodLight, { p: [x, y + 0.48, z] });
  b.add(G.box(1.25, 0.1, 2.55, 0.04), PAL.wood, { p: [x, y + 0.98, z] });
  for (const [px, pz] of [[-0.5, -1.15], [-0.5, 1.15], [0.6, -1.15], [0.6, 1.15]]) {
    b.add(G.cyl(0.06, 0.06, 2.4, 8), PAL.woodDark, { p: [x + px, y + 1.2, z + pz] });
  }
  // auvent rayé
  for (let i = 0; i < 6; i++) {
    b.add(G.box(1.6, 0.08, 0.44, 0.03), i % 2 ? PAL.white : PAL.mint, { p: [x - 0.05, y + 2.35 - 0.0, z - 1.1 + i * 0.44], r: [0, 0, 0.32] });
  }
  for (let i = 0; i < 6; i++) {
    b.add(G.sphere(0.12, 8, 6), i % 2 ? PAL.white : PAL.mint, { p: [x - 0.83, y + 2.05, z - 1.1 + i * 0.44], s: [0.6, 1, 1] });
  }
  // enseigne coquillage
  b.add(G.box(0.1, 0.7, 1.1, 0.05), PAL.woodDark, { p: [x + 0.65, y + 2.85, z] });
  for (let k = 0; k < 5; k++) {
    const a = (k / 4 - 0.5) * 1.6;
    b.add(G.sphere(0.12, 8, 6), '#ffd9c8', { p: [x + 0.55, y + 2.82 + Math.cos(a) * 0.18, z + Math.sin(a) * 0.22], s: [0.4, 1.6, 0.7], r: [a, 0, 0] });
  }
  // marchandises
  b.add(G.cyl(0.15, 0.12, 0.25, 10), PAL.coral, { p: [x - 0.1, y + 1.16, z - 0.7] });
  b.add(G.sphere(0.18, 10, 8), PAL.leaf, { p: [x - 0.1, y + 1.38, z - 0.7] });
  b.add(G.box(0.3, 0.3, 0.3, 0.06), PAL.butter, { p: [x - 0.05, y + 1.18, z + 0.1] });
  b.add(G.cone(0.14, 0.4, 10), PAL.lilac, { p: [x - 0.1, y + 1.24, z + 0.75] });
  // caisses
  b.add(G.box(0.6, 0.6, 0.6, 0.06), PAL.wood, { p: [x + 0.3, y + 0.3, z + 1.75], r: [0, 0.3, 0] });
  b.add(G.box(0.45, 0.45, 0.45, 0.06), PAL.woodLight, { p: [x + 0.25, y + 0.83, z + 1.7], r: [0, -0.2, 0] });
}

export default fiche('BAT-012', 'echoppe', 'Échoppe', ile('echoppe', (b) => echoppe(b, 0, 0, 0)), { tags: ['commerce'] });
