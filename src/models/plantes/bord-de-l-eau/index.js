// Bord de l'eau : roseaux à massettes (PLA-010) et nénuphar en fleur (PLA-011).
import { Builder, G } from '../../../render/builder.js';
import { fiche, kind } from '../../kit/fiches.js';

export function roseau() {
  const b = new Builder();
  for (let k = 0; k < 4; k++) {
    const a = k * 1.6;
    const x = Math.cos(a) * 0.12;
    const z = Math.sin(a) * 0.12;
    const h = 1.1 + (k % 2) * 0.3;
    b.add(G.cyl(0.012, 0.02, h, 3), '#9fbf78', { p: [x, h / 2, z], r: [Math.sin(a) * 0.1, 0, Math.cos(a) * 0.1], sway: 0.9 });
    if (k % 2 === 0) b.add(G.cyl(0.035, 0.035, 0.2, 5), '#9a6f50', { p: [x, h - 0.15, z], tint: 0, sway: 1 });
  }
  return { solid: b.build() };
}

export function nenuphar() {
  const b = new Builder();
  b.add(G.cyl(0.42, 0.42, 0.03, 10), '#7fc48b', { p: [0, 0, 0] });
  b.add(G.cyl(0.26, 0.26, 0.035, 8), '#93d29a', { p: [0.55, 0.005, 0.2] });
  b.add(G.sphere(0.12, 8, 5), '#f7c6d6', { p: [0.1, 0.08, 0.1], s: [1, 0.6, 1], tint: 0 });
  return { solid: b.build() };
}

export default [
  fiche('PLA-010', 'roseau', 'Roseau', kind('roseau'), { tags: ['bord de l\'eau'] }),
  fiche('PLA-011', 'nenuphar', 'Nénuphar', kind('nenuphar'), { tags: ['bord de l\'eau'] }),
];
