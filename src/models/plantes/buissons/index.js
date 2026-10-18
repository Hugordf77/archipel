// Buissons : arbuste (PLA-001), buisson à baies (PLA-002, récolte) et buisson fleuri (PLA-003).
import { Builder, G } from '../../../render/builder.js';
import { col } from '../../kit/vegetal.js';
import { fiche, kind } from '../../kit/fiches.js';

export function arbuste() {
  return {
    clumps: [
      { x: 0, y: 0.55, z: 0, r: 0.85, squash: 0.75, color: col('#8fd08a'), density: 1.3 },
      { x: 0.55, y: 0.42, z: 0.15, r: 0.58, squash: 0.75, color: col('#7cc48a'), density: 1.3 },
    ],
    crowns: [[0.2, 0.5, 0, 0.9, 0.75]],
  };
}

export function buissonBaies() {
  const b = new Builder();
  for (let k = 0; k < 14; k++) {
    const a = k * 2.4;
    b.add(G.sphere(0.06, 7, 5), k % 3 ? '#e9786f' : '#8fa6e6', { p: [Math.cos(a) * 0.78, 0.3 + (k % 4) * 0.15, Math.sin(a) * 0.78], tint: 0 });
  }
  return {
    solid: b.build(),
    clumps: [{ x: 0, y: 0.55, z: 0, r: 0.85, squash: 0.75, color: col('#7fc48b'), density: 1.3 }],
    crowns: [[0, 0.5, 0, 0.85, 0.75]],
  };
}

export function buissonFleuri() {
  const b = new Builder();
  for (let k = 0; k < 10; k++) {
    const a = k * 2.4;
    b.add(G.sphere(0.08, 6, 4), k % 3 ? '#f4b4c6' : '#fffaf0', { p: [Math.cos(a) * 0.62, 0.35 + (k % 4) * 0.13, Math.sin(a) * 0.62], tint: 0 });
  }
  return {
    solid: b.build(),
    clumps: [{ x: 0, y: 0.5, z: 0, r: 0.75, squash: 0.8, color: col('#93d28c'), density: 1.3 }],
    crowns: [[0, 0.5, 0, 0.75, 0.8]],
  };
}

export default [
  fiche('PLA-001', 'arbuste', 'Arbuste', kind('arbuste')),
  fiche('PLA-002', 'buisson-baies', 'Buisson à baies', kind('buisson_baies'), { tags: ['récolte'] }),
  fiche('PLA-003', 'buisson-fleuri', 'Buisson fleuri', kind('buisson_fleuri')),
];
