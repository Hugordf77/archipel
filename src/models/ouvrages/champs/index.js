// Aménagements des champs : clôture (STR-007), potager (STR-008), épouvantail (STR-009) et arche
// fleurie (STR-012).
import { Builder, G } from '../../../render/builder.js';
import { WOOD, WOOD_L, WOOD_D, bx, seg, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';

export function clotureChamp(p) {
  const b = new Builder();
  const w = p.w || 16;
  const d = p.d || 10;
  const posts = [];
  const side = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / 2.2));
    for (let k = 0; k <= n; k++) posts.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
    seg(b, WOOD, ax, 0.55, az, bx, 0.55, bz, 0.035, 0.035, 5);
    seg(b, WOOD, ax, 0.3, az, bx, 0.3, bz, 0.035, 0.035, 5);
  };
  // une ouverture sur le petit côté (accès au champ)
  side(-w / 2, -d / 2, w / 2, -d / 2);
  side(w / 2, -d / 2, w / 2, d / 2);
  side(w / 2, d / 2, -w / 2, d / 2);
  side(-w / 2, d / 2, -w / 2, 1);
  side(-w / 2, -1, -w / 2, -d / 2);
  for (const [x, z] of posts) b.add(G.cyl(0.06, 0.07, 0.8, 6), WOOD_D, { p: [x, 0.4, z] });
  return { solid: b, obstacles: lire(physique.cloture_champ.obstacles) };
}

export function potager() {
  const b = new Builder();
  b.add(bx(2.4, 0.25, 1.4, 0.05), WOOD, { p: [0, 0.12, 0] });
  b.add(bx(2.2, 0.08, 1.2, 0.03), '#9f7a5a', { p: [0, 0.26, 0] });
  for (let k = 0; k < 8; k++) b.add(G.sphere(0.13, 6, 4), k % 3 ? '#86c98f' : '#f39c4a', { p: [-0.9 + (k % 4) * 0.6, 0.36, k < 4 ? -0.3 : 0.3], s: [1, 0.7, 1] });
  return { solid: b, obstacles: lire(physique.potager.obstacles) };
}

export function epouvantail() {
  const b = new Builder();
  b.add(G.cyl(0.05, 0.05, 2.0, 6), WOOD_D, { p: [0, 1.0, 0] });
  b.add(G.cyl(0.04, 0.04, 1.4, 6), WOOD_D, { p: [0, 1.45, 0], r: [0, 0, Math.PI / 2] });
  b.add(bx(0.7, 0.75, 0.3, 0.08), '#e8705f', { p: [0, 1.3, 0] });
  b.add(G.sphere(0.24, 10, 8), '#f6ead2', { p: [0, 1.95, 0] });
  b.add(G.cone(0.42, 0.35, 12), '#e0b07e', { p: [0, 2.2, 0] });
  b.add(G.cyl(0.42, 0.42, 0.03, 12), '#e0b07e', { p: [0, 2.05, 0] });
  return { solid: b, obstacles: lire(physique.epouvantail.obstacles) };
}

export function archeFleurie() {
  const b = new Builder();
  for (const sx of [-1, 1]) b.add(G.cyl(0.07, 0.08, 2.4, 6), WOOD_L, { p: [sx * 1.1, 1.2, 0] });
  b.add(G.torus(1.1, 0.07, 6, 18, Math.PI), WOOD_L, { p: [0, 2.4, 0] });
  const cols = ['#f4a2b4', '#fffaf0', '#f6d27a', '#c7b2e6'];
  for (let k = 0; k < 22; k++) {
    const a = (k / 21) * Math.PI;
    const r = 1.1 + Math.sin(k * 3.1) * 0.08;
    b.add(G.sphere(0.13, 6, 4), k % 4 === 0 ? '#93d28c' : cols[k % 4], { p: [Math.cos(a) * r, 2.4 + Math.sin(a) * r, Math.sin(k) * 0.1], sway: 0.3 });
  }
  for (let k = 0; k < 10; k++) b.add(G.sphere(0.12, 6, 4), k % 2 ? '#93d28c' : cols[k % 4], { p: [(k % 2 ? 1 : -1) * 1.1, 0.3 + k * 0.21, 0.08] });
  return { solid: b, obstacles: lire(physique.arche_fleurie.obstacles) };
}

export default [
  fiche('STR-007', 'cloture-champ', 'Clôture de champ', part('cloture_champ'), { params: { w: [6, 24], d: [4, 16] }, tags: ['champs'] }),
  fiche('STR-008', 'potager', 'Potager', part('potager'), { tags: ['village'] }),
  fiche('STR-009', 'epouvantail', 'Épouvantail', part('epouvantail'), { tags: ['champs'] }),
  fiche('STR-012', 'arche-fleurie', 'Arche fleurie', part('arche_fleurie'), { tags: ['champs'] }),
];
