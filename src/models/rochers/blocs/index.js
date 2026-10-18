// Rochers (ROC-001) et rochers moussus (ROC-002) : la roche prend la couleur du biome (par instance).
import { Builder, G } from '../../../render/builder.js';
import { fiche, kind } from '../../kit/fiches.js';

export function rocher() {
  const b = new Builder();
  b.add(G.rock(0.8, 3), '#ffffff', { p: [0, 0.2, 0], s: [1, 0.66, 0.9] });
  b.add(G.rock(0.42, 7), '#f2f0ec', { p: [0.7, 0.05, 0.35], s: [1, 0.7, 1] });
  return { solid: b.build(), shadow: true };
}

export function rocherMousse() {
  const b = new Builder();
  b.add(G.rock(0.8, 5), '#ffffff', { p: [0, 0.2, 0], s: [1, 0.7, 0.95] });
  b.add(G.sphere(0.62, 14, 8), '#9fd09a', { p: [0.05, 0.62, 0], s: [1, 0.34, 0.92], tint: 0 });
  return { solid: b.build(), shadow: true };
}

export default [
  fiche('ROC-001', 'rocher', 'Rocher', kind('rocher'), { params: { roche: 'color' }, tags: ['minable'] }),
  fiche('ROC-002', 'rocher-moussu', 'Rocher moussu', kind('rocher_mousse'), { params: { roche: 'color' }, tags: ['minable'] }),
];
