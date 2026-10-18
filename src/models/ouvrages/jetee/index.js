// Jetée (STR-001) : platelage sur pilotis, bittes d'amarrage, bouée ; longueur réglable.
import { Builder, G } from '../../../render/builder.js';
import { WOOD_L, WOOD_D, bx, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique, { HAUTEUR } from './physique.js';

export function jetee(p) {
  const b = new Builder();
  const len = p.len || 12;
  const y = HAUTEUR;
  b.add(bx(2.2, 0.14, len, 0.03), WOOD_L, { p: [0, y, len / 2] });
  for (let z = 0.8; z < len; z += 2.2) for (const sx of [-1, 1]) b.add(G.cyl(0.12, 0.12, 3.2, 8), WOOD_D, { p: [sx * 1.05, y - 1.2, z] });
  for (let z = 1.5; z < len; z += 4) b.add(G.cyl(0.13, 0.13, 0.7, 8), WOOD_D, { p: [1.05, y + 0.35, z] });
  b.add(G.torus(0.3, 0.06, 6, 14), '#f19b86', { p: [-1.12, y + 0.45, len * 0.6], r: [0, Math.PI / 2, 0] });
  return { solid: b, obstacles: lire(physique.obstacles), decks: lire(physique.planchers, p) };
}

export default fiche('STR-001', 'jetee', 'Jetée', part('jetee'), { params: { len: [6, 20] }, tags: ['village', 'accostage'] });
