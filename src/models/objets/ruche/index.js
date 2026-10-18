// Ruche (OBJ-007) : trois hausses sur un support, toit corail, trou de vol.
import { Builder, G } from '../../../render/builder.js';
import { WOOD_D, bx, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function ruche() {
  const b = new Builder();
  b.add(bx(0.6, 0.12, 0.6, 0.02), WOOD_D, { p: [0, 0.45, 0] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(G.cyl(0.03, 0.03, 0.45, 5), WOOD_D, { p: [sx * 0.25, 0.22, sz * 0.25] });
  for (let k = 0; k < 3; k++) b.add(bx(0.55 - k * 0.04, 0.24, 0.55 - k * 0.04, 0.04), k % 2 ? '#f6d27a' : '#fbe7a8', { p: [0, 0.63 + k * 0.24, 0] });
  b.add(G.cone(0.48, 0.25, 4), '#f19b86', { p: [0, 1.48, 0], r: [0, Math.PI / 4, 0] });
  b.add(bx(0.18, 0.04, 0.03, 0.01), '#5b4a63', { p: [0, 0.6, 0.28] });
  return { solid: b, obstacles: lire(physique.obstacles) };
}

export default fiche('OBJ-007', 'ruche', 'Ruche', part('ruche'), { tags: ['champs'] });
