// Mobilier des îles : corde à linge (STR-014), lanterne (STR-015), lanterne de pierre (STR-016),
// banc (STR-017, aussi banc avec vue STR-018) et casiers de pêche (STR-019).
import { Builder, G } from '../../../render/builder.js';
import { WOOD_L, WOOD_D, STONE, STONE_D, ROPE, bx, lire } from '../../kit/lieux.js';
import { fiche, part, SAME } from '../../kit/fiches.js';
import physique from './physique.js';

export function linge(p) {
  const b = new Builder();
  const len = Math.max(2, p.len || 4);
  for (const sx of [-1, 1]) b.add(G.cyl(0.04, 0.05, 2.0, 6), WOOD_D, { p: [sx * len / 2, 1.0, 0] });
  b.add(G.cyl(0.01, 0.01, len, 4), ROPE, { p: [0, 1.85, 0], r: [0, 0, Math.PI / 2] });
  const cols = ['#f4a2b4', '#9cc8ec', '#fffaf0', '#f6d27a', '#a6d98f'];
  for (let k = 0; k < Math.floor(len / 0.8); k++) b.add(bx(0.45, 0.55, 0.02, 0.01), cols[k % 5], { p: [-len / 2 + 0.5 + k * 0.8, 1.55, 0], sway: 0.6 });
  return { solid: b, obstacles: lire(physique.linge.obstacles) };
}

export function lanterne() {
  const b = new Builder();
  const g = new Builder();
  b.add(G.cyl(0.05, 0.07, 2.2, 6), WOOD_D, { p: [0, 1.1, 0] });
  b.add(bx(0.45, 0.05, 0.05, 0.02), WOOD_D, { p: [0.18, 2.15, 0] });
  g.add(G.sphere(0.18, 10, 8), '#ffd2a0', { p: [0.36, 1.92, 0], s: [1, 1.2, 1] });
  b.add(G.cone(0.2, 0.15, 8), '#f19b86', { p: [0.36, 2.12, 0] });
  return { solid: b, glow: g, obstacles: lire(physique.lanterne.obstacles), light: [0.36, 1.92, 0] };
}

export function lanternePierre() {
  const b = new Builder();
  const g = new Builder();
  b.add(bx(0.5, 0.6, 0.5, 0.06), STONE_D, { p: [0, 0.3, 0] });
  b.add(G.cyl(0.12, 0.14, 0.4, 8), STONE, { p: [0, 0.8, 0] });
  b.add(bx(0.55, 0.12, 0.55, 0.04), STONE, { p: [0, 1.05, 0] });
  g.add(bx(0.32, 0.3, 0.32, 0.04), '#ffd2a0', { p: [0, 1.26, 0] });
  b.add(G.cone(0.48, 0.35, 4), STONE_D, { p: [0, 1.6, 0], r: [0, Math.PI / 4, 0] });
  return { solid: b, glow: g, obstacles: lire(physique.lanterne_pierre.obstacles) };
}

export function banc() {
  const b = new Builder();
  b.add(bx(1.6, 0.08, 0.45, 0.03), WOOD_L, { p: [0, 0.45, 0] });
  b.add(bx(1.6, 0.35, 0.06, 0.03), WOOD_L, { p: [0, 0.75, -0.2] });
  for (const sx of [-1, 1]) b.add(bx(0.08, 0.45, 0.4, 0.02), WOOD_D, { p: [sx * 0.7, 0.22, 0] });
  return { solid: b, obstacles: lire(physique.banc.obstacles) };
}

export function casiers() {
  const b = new Builder();
  for (let k = 0; k < 3; k++) {
    b.add(bx(0.6, 0.45, 0.45, 0.04), WOOD_L, { p: [k * 0.65, 0.22 + (k === 2 ? 0 : 0), (k % 2) * 0.1] });
    b.add(G.torus(0.15, 0.025, 4, 10), ROPE, { p: [k * 0.65, 0.46, 0], r: [Math.PI / 2, 0, 0] });
  }
  b.add(G.sphere(0.18, 10, 8), '#f19b86', { p: [-0.5, 0.18, 0.4] });
  return { solid: b, obstacles: lire(physique.casiers.obstacles) };
}

export default [
  fiche('STR-014', 'corde-linge', 'Corde à linge', part('linge'), { params: { len: [2, 8] }, tags: ['village'] }),
  fiche('STR-015', 'lanterne', 'Lanterne', part('lanterne'), { tags: ['lumineux'] }),
  fiche('STR-016', 'lanterne-pierre', 'Lanterne de pierre', part('lanterne_pierre'), { tags: ['curiosité', 'lumineux'] }),
  fiche('STR-017', 'banc', 'Banc', part('banc'), { tags: ['assise'] }),
  fiche('STR-018', 'banc-vue', 'Banc avec vue', part('banc_vue'), { ...SAME('STR-017'), tags: ['assise', 'curiosité'] }),
  fiche('STR-019', 'casiers', 'Casiers', part('casiers'), { tags: ['village', 'pêche'] }),
];
