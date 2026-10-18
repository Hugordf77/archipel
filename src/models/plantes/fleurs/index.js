// Fleurs : massif de quatre fleurs (PLA-014) et fleur des champs très légère (PLA-015, les champs en
// comptent des milliers) ; pétales teintés par instance, tiges et cœurs fixes.
import { Builder, G } from '../../../render/builder.js';
import { fiche, kind } from '../../kit/fiches.js';

export function fleurs() {
  return { flower: true };
}

export function fleurChamp() {
  return { fieldFlower: true };
}

// fleur des champs très légère (les champs en comptent des milliers) :
// tige, deux feuilles, corolle à six pétales teintée par instance, cœur doré
export function fieldFlowerGeometry() {
  const b = new Builder();
  b.add(G.cyl(0.012, 0.016, 0.34, 3), '#7fbf86', { p: [0, 0.17, 0], tint: 0, sway: 0.6 });
  b.add(G.sphere(0.05, 4, 3), '#86c98f', { p: [0.04, 0.1, 0], s: [1.5, 0.3, 0.7], tint: 0, sway: 0.4 });
  b.add(G.cyl(0.085, 0.06, 0.04, 6), '#ffffff', { p: [0, 0.35, 0], sway: 0.7 });
  b.add(G.sphere(0.03, 4, 3), '#f6d27a', { p: [0, 0.38, 0], tint: 0, sway: 0.7 });
  return b.build();
}

// trois fleurs sur tiges : pétales teintés par instance, tiges et cœurs fixes
export function flowerGeometry() {
  const b = new Builder();
  [[0, 0, 0.42], [0.22, 0.12, 0.32], [-0.16, 0.2, 0.36], [0.08, -0.22, 0.3]].forEach(([x, z, h]) => {
    b.add(G.cyl(0.016, 0.022, h, 5), '#7fbf86', { p: [x, h / 2, z], tint: 0, sway: 0.6 });
    b.add(G.sphere(0.06, 6, 4), '#86c98f', { p: [x + 0.05, h * 0.4, z], s: [1.4, 0.3, 0.7], tint: 0, sway: 0.4 });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      b.add(G.sphere(0.075, 8, 5), '#ffffff', { p: [x + Math.cos(a) * 0.075, h, z + Math.sin(a) * 0.075], s: [1, 0.45, 1], sway: 0.6 });
    }
    b.add(G.sphere(0.045, 6, 5), '#f6d27a', { p: [x, h + 0.015, z], tint: 0, sway: 0.6 });
  });
  return b.build();
}

export default [
  fiche('PLA-014', 'massif-fleurs', 'Massif de fleurs', kind('fleurs'), { params: { fleur: 'color' }, tags: ['teinté par instance'] }),
  fiche('PLA-015', 'fleur-des-champs', 'Fleur des champs', kind('fleur_champ'), { params: { fleur: 'color' }, tags: ['teinté par instance'] }),
];
