// Curiosités (MON-006 totem, MON-007 autel, MON-008 cairn) : petites découvertes posées sur les îles.
import { Builder, G } from '../../../render/builder.js';
import { STONE, STONE_D, bx, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function totem() {
  const b = new Builder();
  const cols = ['#f19b86', '#86c6bb', '#f6d27a'];
  for (let k = 0; k < 3; k++) {
    b.add(G.cyl(0.32, 0.34, 0.7, 10), cols[k], { p: [0, 0.35 + k * 0.7, 0] });
    b.add(G.sphere(0.07, 6, 4), '#5b4a63', { p: [-0.12, 0.45 + k * 0.7, 0.31] });
    b.add(G.sphere(0.07, 6, 4), '#5b4a63', { p: [0.12, 0.45 + k * 0.7, 0.31] });
  }
  for (const sx of [-1, 1]) b.add(bx(0.7, 0.12, 0.2, 0.04), '#f19b86', { p: [sx * 0.5, 2.0, 0], r: [0, 0, sx * 0.3] });
  return { solid: b, obstacles: lire(physique.totem.obstacles) };
}

export function autel() {
  const b = new Builder();
  const g = new Builder();
  b.add(bx(1.0, 0.7, 0.6, 0.08), STONE, { p: [0, 0.35, 0] });
  b.add(bx(1.2, 0.1, 0.7, 0.04), STONE_D, { p: [0, 0.75, 0] });
  g.add(G.sphere(0.14, 10, 8), '#9fdcc8', { p: [0, 0.92, 0] });
  for (let k = 0; k < 3; k++) b.add(G.sphere(0.07, 6, 4), ['#f4a2b4', '#f6d27a', '#fffaf0'][k], { p: [-0.35 + k * 0.35, 0.86, 0.2] });
  return { solid: b, glow: g, obstacles: lire(physique.autel.obstacles) };
}

export function cairn() {
  const b = new Builder();
  for (let k = 0; k < 5; k++) b.add(G.rock(0.35 - k * 0.05, 100 + k), k % 2 ? STONE : STONE_D, { p: [0, 0.2 + k * 0.32, 0], s: [1, 0.55, 1] });
  return { solid: b, obstacles: lire(physique.cairn.obstacles) };
}

export default [
  fiche('MON-006', 'totem', 'Totem', part('totem'), { tags: ['curiosité'] }),
  fiche('MON-007', 'autel', 'Autel', part('autel'), { tags: ['curiosité'] }),
  fiche('MON-008', 'cairn', 'Cairn', part('cairn'), { tags: ['curiosité'] }),
];
