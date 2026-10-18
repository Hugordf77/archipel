// Chaumière du joueur (BAT-002) : maison ronde au toit gonflé, porte et fenêtres rondes, boîte aux lettres.
// Posé par le jeu sur l'île de départ (world/home/props.js), avec les obstacles de physique.js.
import * as THREE from 'three';
import { G } from '../../../render/builder.js';
import { PAL } from '../../kit/palette.js';
import { fiche, ile } from '../../kit/fiches.js';

// Maison du joueur : chaumière ronde au toit gonflé (porte face +z)
export function chaumiere(b, glass, x, y, z) {
  b.add(G.cyl(2.35, 2.55, 0.4, 28), PAL.stone, { p: [x, y + 0.1, z] });
  b.add(G.cyl(2.0, 2.12, 2.3, 28), PAL.cream, {
    p: [x, y + 1.45, z],
    colorFn: (c, px, py) => c.multiplyScalar(0.94 + 0.06 * THREE.MathUtils.clamp(py - y - 0.3, 0, 1)),
  });
  b.add(G.torus(2.04, 0.1, 8, 36), PAL.wood, { p: [x, y + 2.55, z], r: [Math.PI / 2, 0, 0] });
  const roof = [[2.45, 0], [2.9, 0.14], [2.85, 0.42], [2.25, 1.05], [1.35, 1.8], [0.5, 2.25], [0, 2.33]];
  b.add(G.lathe(roof, 30), PAL.roof, {
    p: [x, y + 2.5, z],
    colorFn: (c, px, py) => c.lerp(new THREE.Color('#e4826f'), THREE.MathUtils.clamp(1.0 - (py - y - 2.5) / 1.2, 0, 1) * 0.35),
  });
  // petite boule sur le toit
  b.add(G.sphere(0.22, 12, 10), PAL.butter, { p: [x, y + 4.9, z] });
  // cheminée
  b.add(G.cyl(0.27, 0.32, 1.1, 12), PAL.stone, { p: [x + 1.0, y + 4.2, z - 0.7] });
  b.add(G.cyl(0.37, 0.37, 0.18, 12), PAL.stoneWarm, { p: [x + 1.0, y + 4.8, z - 0.7] });
  // porte arrondie (face +z)
  const dz = z + 2.0;
  b.add(G.box(1.0, 1.45, 0.22, 0.06), PAL.wood, { p: [x, y + 0.98, dz] });
  b.add(G.cyl(0.5, 0.5, 0.22, 20), PAL.wood, { p: [x, y + 1.7, dz], r: [Math.PI / 2, 0, 0] });
  b.add(G.torus(0.56, 0.07, 6, 20, Math.PI), PAL.woodDark, { p: [x, y + 1.7, dz + 0.1] });
  b.add(G.sphere(0.07, 8, 6), PAL.butter, { p: [x + 0.3, y + 1.05, dz + 0.14] });
  b.add(G.box(1.5, 0.16, 0.8, 0.06), PAL.stoneWarm, { p: [x, y + 0.25, dz + 0.55] });
  // fenêtres rondes + jardinières
  for (const a of [-0.8, 0.8]) {
    const wx = x + Math.sin(a) * 2.05;
    const wz = z + Math.cos(a) * 2.05;
    b.add(G.torus(0.42, 0.08, 8, 22), PAL.woodLight, { p: [wx, y + 1.65, wz], r: [0, a, 0] });
    glass.add(G.cyl(0.4, 0.4, 0.1, 20), PAL.glass, { p: [wx - Math.sin(a) * 0.02, y + 1.65, wz - Math.cos(a) * 0.02], r: [Math.PI / 2, a, 0] });
    const bx = x + Math.sin(a) * 2.25;
    const bz = z + Math.cos(a) * 2.25;
    b.add(G.box(0.85, 0.22, 0.3, 0.05), PAL.woodDark, { p: [bx, y + 1.05, bz], r: [0, a, 0] });
    for (let k = -1; k <= 1; k++) {
      const fx = bx + Math.cos(a) * k * 0.25;
      const fz = bz - Math.sin(a) * k * 0.25;
      b.add(G.sphere(0.13, 8, 6), [PAL.coral, PAL.butter, PAL.lilac][k + 1], { p: [fx, y + 1.25, fz] });
    }
  }
  // boîte aux lettres
  b.add(G.cyl(0.06, 0.06, 0.9, 8), PAL.woodDark, { p: [x - 2.0, y + 0.5, z + 2.6] });
  b.add(G.box(0.4, 0.32, 0.55, 0.12), PAL.sky, { p: [x - 2.0, y + 1.05, z + 2.6] });
  b.add(G.box(0.05, 0.18, 0.08, 0.02), PAL.coral, { p: [x - 1.78, y + 1.2, z + 2.55] });
}

export default fiche('BAT-002', 'chaumiere', 'Chaumière du joueur', ile('chaumiere', (b, glass) => chaumiere(b, glass, 0, 0, 0)), { tags: ['maison'] });
