// Cultures des champs : lavande (PLA-007), tournesol (PLA-008), blé (PLA-009) et potiron (PLA-012).
import { Builder, G } from '../../../render/builder.js';
import { fiche, kind } from '../../kit/fiches.js';

export function lavande() {
  const b = new Builder();
  b.add(G.sphere(0.32, 8, 5), '#9fbf98', { p: [0, 0.12, 0], s: [1, 0.5, 1], tint: 0 });
  for (let k = 0; k < 9; k++) {
    const a = k * 2.4;
    const rr = 0.08 + (k % 3) * 0.08;
    b.add(G.cone(0.05, 0.32, 5), '#b49ae0', { p: [Math.cos(a) * rr, 0.42 + (k % 2) * 0.06, Math.sin(a) * rr], r: [Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25], sway: 0.5 });
  }
  return { solid: b.build() };
}

export function tournesol() {
  const b = new Builder();
  b.add(G.cyl(0.03, 0.04, 1.6, 6), '#7fbf86', { p: [0, 0.8, 0], tint: 0, sway: 0.5 });
  b.add(G.sphere(0.16, 6, 4), '#86c98f', { p: [0.12, 0.7, 0], s: [1.4, 0.25, 0.8], tint: 0, sway: 0.4 });
  b.add(G.cyl(0.26, 0.26, 0.06, 14), '#f6c84a', { p: [0, 1.65, 0.05], r: [Math.PI / 2 - 0.3, 0, 0], tint: 0, sway: 0.6 });
  b.add(G.cyl(0.13, 0.13, 0.08, 10), '#9f6b48', { p: [0, 1.66, 0.09], r: [Math.PI / 2 - 0.3, 0, 0], tint: 0, sway: 0.6 });
  return { solid: b.build() };
}

export function ble() {
  const b = new Builder();
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1;
    const x = Math.cos(a) * 0.08;
    const z = Math.sin(a) * 0.08;
    b.add(G.cyl(0.012, 0.016, 0.85, 3), '#d9c27a', { p: [x, 0.42, z], sway: 0.9 });
    b.add(G.cone(0.035, 0.2, 4), '#f0d58a', { p: [x, 0.92, z], r: [Math.PI, 0, 0], sway: 1 });
  }
  return { solid: b.build() };
}

export function potiron() {
  const b = new Builder();
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    b.add(G.sphere(0.2, 8, 6), '#f39c4a', { p: [Math.cos(a) * 0.12, 0.2, Math.sin(a) * 0.12], s: [0.8, 0.85, 0.8], tint: 0 });
  }
  b.add(G.cyl(0.03, 0.04, 0.12, 5), '#7a5a3c', { p: [0, 0.42, 0], tint: 0 });
  b.add(G.sphere(0.25, 8, 4), '#86c98f', { p: [0.3, 0.06, 0.1], s: [1.2, 0.2, 0.9], tint: 0 });
  return { solid: b.build() };
}

export default [
  fiche('PLA-007', 'lavande', 'Lavande', kind('lavande'), { tags: ['champs'] }),
  fiche('PLA-008', 'tournesol', 'Tournesol', kind('tournesol'), { tags: ['champs'] }),
  fiche('PLA-009', 'ble', 'Blé', kind('ble'), { tags: ['champs', 'récolte'] }),
  fiche('PLA-012', 'potiron', 'Potiron', kind('potiron'), { tags: ['récolte'] }),
];
