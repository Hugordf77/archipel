// Conifères : pin (ARB-004), pin givré (ARB-005) et sapin enneigé (ARB-006), un seul gabarit à quatre
// étages de feuillage, aux teintes de chacun.
import { Builder } from '../../../render/builder.js';
import { treeTrunk, col } from '../../kit/vegetal.js';
import { fiche, kind } from '../../kit/fiches.js';

export function pin() {
  return pine(['#5fae8e', '#6cbd98', '#7cc8a0', '#8fd4a6']);
}

export function pinGivre() {
  return pine(['#a9cfc9', '#bfdcd8', '#d4e8e5', '#ecf5f4']);
}

export function sapinNeige() {
  return pine(['#d6e9e6', '#e3f0ee', '#eef6f5', '#f8fcfb']);
}

function pine(cols) {
  const b = new Builder();
  const top = treeTrunk(b, 1.0, 0.22, 0.15, 0.08);
  const tiers = [[1.3, 0.55], [1.05, 1.45], [0.8, 2.2], [0.5, 2.8]];
  return {
    solid: b.build(),
    clumps: tiers.map(([r, dy], k) => ({ x: top.x, y: top.y + dy, z: top.z, r, squash: 0.62, color: col(cols[k]), density: 1.2 })),
    crowns: [[top.x, 2.1, top.z, 1.3, 1.5]],
  };
}

export default [
  fiche('ARB-004', 'pin', 'Pin', kind('pin'), { tags: ['abattable'] }),
  fiche('ARB-005', 'pin-givre', 'Pin givré', kind('pin_givre'), { tags: ['abattable', 'glace'] }),
  fiche('ARB-006', 'sapin-enneige', 'Sapin enneigé', kind('sapin_neige'), { tags: ['abattable', 'glace'] }),
];
