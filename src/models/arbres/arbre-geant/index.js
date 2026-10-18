// Arbre géant (ARB-015) : repère d'île, chêne ou sapin aux racines et branches épaisses, ou champignon
// géant tacheté.
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { seg, lire } from '../../kit/lieux.js';
import { fiche, kind, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function arbreGeant(p) {
  const b = new Builder();
  const kind = p.kind || 'chene';
  if (kind === 'champi') {
    b.add(G.cyl(1.0, 1.5, 9, 16), '#f6ecdc', { p: [0, 4.5, 0] });
    b.add(new THREE.SphereGeometry(6, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), '#e9a3c4', { p: [0, 8.6, 0], s: [1, 0.55, 1] });
    for (let k = 0; k < 14; k++) b.add(G.sphere(0.45, 8, 6), '#fffaf0', { p: [Math.cos(k * 1.3) * (1.5 + (k % 4)), 9.0 + Math.sqrt(Math.max(0, 1 - ((1.5 + (k % 4)) / 6) ** 2)) * 3.0, Math.sin(k * 1.3) * (1.5 + (k % 4))], s: [1, 0.4, 1] });
    return { solid: b, obstacles: lire(physique.obstacles, p) };
  }
  const bark = '#a8795a';
  b.add(G.cyl(1.1, 1.8, 7, 14), bark, { p: [0, 3.5, 0] });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    seg(b, bark, Math.cos(a) * 1.2, 0.3, Math.sin(a) * 1.2, Math.cos(a) * 3.2, -0.2, Math.sin(a) * 3.2, 0.55, 0.22, 8);
    seg(b, bark, Math.cos(a) * 0.5, 6.5, Math.sin(a) * 0.5, Math.cos(a) * 4, 9.5, Math.sin(a) * 4, 0.45, 0.2, 8);
  }
  const leaf = kind === 'sapin' ? ['#d6e9e6', '#e9f3f2'] : ['#7fc48b', '#93d28c'];
  for (let k = 0; k < 9; k++) {
    const a = k * 0.8;
    const r = k === 0 ? 0 : 3.5;
    b.add(G.sphere(k === 0 ? 4.2 : 3.1, 14, 10), leaf[k % 2], { p: [Math.cos(a) * r, 11 + (k % 3) * 1.2, Math.sin(a) * r], s: [1, 0.85, 1] });
  }
  return { solid: b, obstacles: lire(physique.obstacles, p) };
}

export default fiche('ARB-015', 'arbre-geant', 'Arbre géant (lieu)', part('arbre_geant'), {
    variants: [{ label: 'Chêne', params: { kind: 'chene' } }, { label: 'Sapin', params: { kind: 'sapin' } }, { label: 'Champignon', params: { kind: 'champi' } }],
    params: { kind: ['chene', 'sapin', 'champi'] }, tags: ['repère'],
  });
