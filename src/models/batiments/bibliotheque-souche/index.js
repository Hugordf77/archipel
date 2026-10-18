// Bibliothèque-souche du hibou (BAT-003) : souche géante au toit-champignon, racines, porte ronde, enseigne.
// Posé par le jeu sur l'île de départ (world/home/props.js), avec les obstacles de physique.js.
import { G } from '../../../render/builder.js';
import { PAL } from '../../kit/palette.js';
import { fiche, ile } from '../../kit/fiches.js';

// Bibliothèque du hibou : souche géante au toit-champignon
export function bibliotheque(b, glass, x, y, z) {
  const stump = [[3.35, 0], [3.0, 0.4], [2.72, 1.2], [2.6, 2.6], [2.66, 3.5], [2.74, 3.8], [2.5, 3.98], [0, 4.02]];
  b.add(G.lathe(stump, 30), PAL.bark, {
    p: [x, y, z],
    colorFn: (c, px, py, pz) => c.multiplyScalar(0.9 + 0.1 * Math.sin(Math.atan2(pz - z, px - x) * 16 + py * 0.6)),
  });
  b.add(G.cyl(2.52, 2.52, 0.08, 30), '#ecd0a6', { p: [x, y + 4.0, z] });
  // toit-champignon
  const cap = [[0, 0], [3.0, 0.05], [3.25, 0.35], [2.9, 0.95], [2.0, 1.55], [0.9, 1.9], [0, 2.0]];
  b.add(G.lathe(cap, 30), PAL.roofTeal, { p: [x, y + 4.0, z] });
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + 0.3;
    const rr = 1.2 + (i % 3) * 0.5;
    b.add(G.sphere(0.24, 10, 8), PAL.white, { p: [x + Math.cos(a) * rr, y + 4.0 + 1.85 - rr * 0.42, z + Math.sin(a) * rr], s: [1, 0.5, 1] });
  }
  // racines
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.2;
    b.add(G.capsule(0.35, 1.4, 4, 10), PAL.barkDark, {
      p: [x + Math.cos(a) * 3.1, y + 0.2, z + Math.sin(a) * 3.1],
      r: [0, -a, Math.PI / 2 - 0.25],
      s: [1, 1, 0.8],
    });
  }
  // porte ronde (face +z)
  const dz = z + 2.62;
  b.add(G.box(1.1, 1.5, 0.3, 0.08), PAL.woodLight, { p: [x, y + 0.95, dz] });
  b.add(G.cyl(0.55, 0.55, 0.3, 20), PAL.woodLight, { p: [x, y + 1.7, dz], r: [Math.PI / 2, 0, 0] });
  b.add(G.torus(0.62, 0.08, 6, 20, Math.PI), PAL.woodDark, { p: [x, y + 1.7, dz + 0.12] });
  b.add(G.sphere(0.07, 8, 6), PAL.butter, { p: [x - 0.32, y + 1.0, dz + 0.17] });
  // auvent
  b.add(G.box(1.8, 0.1, 0.9, 0.04), PAL.coral, { p: [x, y + 2.55, dz + 0.4], r: [0.35, 0, 0] });
  // enseigne : livre ouvert
  b.add(G.box(1.0, 0.65, 0.1, 0.05), PAL.woodDark, { p: [x, y + 3.15, dz + 0.05] });
  b.add(G.box(0.38, 0.4, 0.06, 0.03), PAL.white, { p: [x - 0.19, y + 3.17, dz + 0.12], r: [0, 0.25, 0] });
  b.add(G.box(0.38, 0.4, 0.06, 0.03), PAL.white, { p: [x + 0.19, y + 3.17, dz + 0.12], r: [0, -0.25, 0] });
  // fenêtres
  for (const [a, h] of [[-0.75, 2.2], [0.8, 1.6], [2.2, 2.0], [-2.3, 1.7]]) {
    const wx = x + Math.sin(a) * 2.68;
    const wz = z + Math.cos(a) * 2.68;
    b.add(G.torus(0.4, 0.09, 8, 22), PAL.woodDark, { p: [wx, y + h, wz], r: [0, a, 0] });
    glass.add(G.cyl(0.38, 0.38, 0.12, 20), PAL.glass, { p: [wx, y + h, wz], r: [Math.PI / 2, a, 0] });
  }
}

export default fiche('BAT-003', 'bibliotheque-souche', 'Bibliothèque-souche du hibou', ile('bibliotheque', (b, glass) => bibliotheque(b, glass, 0, 0, 0)), { tags: ['hibou'] });
