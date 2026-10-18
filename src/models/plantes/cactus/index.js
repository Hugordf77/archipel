// Cactus des dunes : cactus à deux bras (PLA-004) et cactus fleuri (PLA-005).
import { Builder, G } from '../../../render/builder.js';
import { fiche, kind } from '../../kit/fiches.js';

export function cactus() {
  const b = new Builder();
  b.add(G.capsule(0.3, 1.3, 4, 12), '#8fc79a', { p: [0, 0.95, 0] });
  b.add(G.capsule(0.16, 0.5, 4, 10), '#86c093', { p: [0.42, 1.15, 0], r: [0, 0, -0.2] });
  b.add(G.capsule(0.14, 0.35, 4, 10), '#86c093', { p: [-0.38, 0.95, 0.05], r: [0, 0, 0.25] });
  b.add(G.sphere(0.12, 10, 8), '#f4a2b4', { p: [0, 1.95, 0], tint: 0 });
  return { solid: b.build(), shadow: true };
}

export function cactusFleur() {
  const b = new Builder();
  b.add(G.capsule(0.28, 1.4, 4, 10), '#8fc79a', { p: [0, 0.95, 0] });
  b.add(G.capsule(0.15, 0.55, 4, 8), '#86c093', { p: [0.4, 1.2, 0], r: [0, 0, -0.25] });
  for (let k = 0; k < 4; k++) b.add(G.sphere(0.09, 8, 6), k % 2 ? '#f4a2b4' : '#f6d27a', { p: [Math.cos(k * 1.6) * 0.18, 1.95, Math.sin(k * 1.6) * 0.18], tint: 0 });
  return { solid: b.build(), shadow: true };
}

export default [
  fiche('PLA-004', 'cactus', 'Cactus', kind('cactus'), { tags: ['dunes'] }),
  fiche('PLA-005', 'cactus-fleuri', 'Cactus fleuri', kind('cactus_fleur'), { tags: ['dunes'] }),
];
