// Sous-bois : fougère (PLA-006) et petits champignons (PLA-013, chapeau teinté par instance).
import { Builder, G } from '../../../render/builder.js';
import { fiche, kind } from '../../kit/fiches.js';

export function fougere() {
  const b = new Builder();
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    b.add(G.sphere(0.5, 10, 6), k % 2 ? '#86c98f' : '#79bd88', { p: [Math.cos(a) * 0.38, 0.28, Math.sin(a) * 0.38], r: [0, -a, 0.55], s: [1, 0.08, 0.28], sway: 0.8 });
  }
  return { solid: b.build() };
}

export function champiPetit() {
  const b = new Builder();
  [[0, 0, 1], [0.3, 0.15, 0.7], [-0.2, 0.25, 0.55]].forEach(([x, z, s]) => {
    b.add(G.cyl(0.05 * s, 0.07 * s, 0.32 * s, 8), '#f6ecdc', { p: [x, 0.16 * s, z], tint: 0 });
    b.add(G.sphere(0.2 * s, 12, 8), '#ffffff', { p: [x, 0.32 * s, z], s: [1, 0.55, 1] });
  });
  return { solid: b.build() };
}

export default [
  fiche('PLA-006', 'fougere', 'Fougère', kind('fougere')),
  fiche('PLA-013', 'petit-champignon', 'Petit champignon', kind('champi_petit'), { params: { v: [0, 4] }, tags: ['récolte'] }),
];
