// Campement : feu de camp (OBJ-005, flammes lumineuses) et tente (OBJ-006, corail ou menthe).
import { Builder, G } from '../../../render/builder.js';
import { WOOD_D, seg, lire } from '../../kit/lieux.js';
import { fiche, part, v3 } from '../../kit/fiches.js';
import physique from './physique.js';

export function feuCamp() {
  const b = new Builder();
  const g = new Builder();
  for (let k = 0; k < 8; k++) b.add(G.rock(0.22, 60 + k), '#bfb4c8', { p: [Math.cos(k * 0.785) * 0.7, 0.08, Math.sin(k * 0.785) * 0.7] });
  for (let k = 0; k < 4; k++) seg(b, WOOD_D, Math.cos(k * 1.57) * 0.45, 0.05, Math.sin(k * 1.57) * 0.45, 0, 0.55, 0, 0.06, 0.04, 6);
  g.add(G.cone(0.3, 0.7, 8), '#f6b45e', { p: [0, 0.45, 0] });
  g.add(G.cone(0.16, 0.45, 8), '#ffe08a', { p: [0, 0.45, 0] });
  return { solid: b, glow: g, obstacles: lire(physique.feu_camp.obstacles), light: [0, 0.6, 0] };
}

export function tente(p) {
  const b = new Builder();
  const c = (p.v || 0) % 2 ? '#86c6bb' : '#f19b86';
  b.add(G.cone(1.5, 1.9, 4), c, { p: [0, 0.95, 0], r: [0, Math.PI / 4, 0], s: [1, 1, 1.3] });
  b.add(G.cone(0.5, 1.0, 3), '#5b4a63', { p: [0, 0.5, 1.0], r: [0, Math.PI, 0], s: [1, 1, 0.25] });
  b.add(G.cyl(0.03, 0.03, 0.6, 5), WOOD_D, { p: [0, 2.1, 0] });
  return { solid: b, obstacles: lire(physique.tente.obstacles) };
}

export default [
  fiche('OBJ-005', 'feu-camp', 'Feu de camp', part('feu_camp'), { tags: ['lumineux'] }),
  fiche('OBJ-006', 'tente', 'Tente', part('tente'), { variants: v3(['Corail', 'Menthe']), params: { v: [0, 1] } }),
];
