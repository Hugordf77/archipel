// Palmier (ARB-007) : stipe courbe en six tronçons, sept palmes et trois noix de coco.
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { palmFrondGeometry } from '../../kit/shapes.js';
import { segment } from '../../kit/vegetal.js';
import { fiche, kind } from '../../kit/fiches.js';

export function palmier() {
  const b = new Builder();
  const pts = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    pts.push(new THREE.Vector3(Math.pow(t, 1.6) * 0.75, t * 4.2, 0));
  }
  for (let i = 0; i < 6; i++) {
    segment(b, i % 2 ? '#d8b58b' : '#cfa77c', pts[i], pts[i + 1], 0.2 - i * 0.012, 0.19 - (i + 1) * 0.012, 10);
  }
  const top = pts[6];
  const frond = palmFrondGeometry(2.4, 0.6);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    b.add(frond, k % 2 ? '#7fc98a' : '#8fd393', { p: [top.x, top.y, top.z], r: [0, a, 0.15], sway: 1.2 });
  }
  for (let k = 0; k < 3; k++) b.add(G.sphere(0.15, 10, 8), '#a8794f', { p: [top.x + Math.cos(k * 2.1) * 0.22, top.y - 0.15, top.z + Math.sin(k * 2.1) * 0.22], tint: 0 });
  return { solid: b.build(), crowns: [[top.x, top.y, 0, 1.8, 0.3]] };
}

export default fiche('ARB-007', 'palmier', 'Palmier', kind('palmier'), { tags: ['abattable', 'tropical'] });
