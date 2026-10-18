// Champignon géant (ARB-013) : pied crème, chapeau teinté par instance (cinq couleurs), taches claires.
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { fiche, kind, v3 } from '../../kit/fiches.js';

export function champiGeant() {
  const b = new Builder();
  b.add(G.cyl(0.3, 0.42, 2.6, 14), '#f6ecdc', { p: [0, 1.3, 0], tint: 0 });
  b.add(new THREE.SphereGeometry(1.6, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), '#ffffff', { p: [0, 2.45, 0], s: [1, 0.55, 1] });
  b.add(G.cyl(1.55, 1.2, 0.18, 22), '#fbe9e4', { p: [0, 2.42, 0], tint: 0 });
  for (let k = 0; k < 8; k++) {
    const a = k * 0.8;
    const rr = 0.5 + (k % 3) * 0.32;
    b.add(G.sphere(0.13, 8, 6), '#fffaf0', { p: [Math.cos(a) * rr, 2.45 + Math.sqrt(Math.max(0, 1 - (rr / 1.6) ** 2)) * 0.86, Math.sin(a) * rr], s: [1, 0.45, 1], tint: 0 });
  }
  return { solid: b.build(), crowns: [[0, 2.7, 0, 1.6, 0.5]], shadow: true };
}

export default fiche('ARB-013', 'champignon-geant', 'Champignon géant', kind('champi_geant'), { params: { v: [0, 4] }, variants: v3(['Rose', 'Pêche', 'Lilas', 'Menthe', 'Beurre']) });
