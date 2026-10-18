// Maison de village (BAT-001) : trois tailles, toit et volets teintés, fenêtres éclairées la nuit, enseigne
// du marchand en option.
import { Builder, G } from '../../../render/builder.js';
import { WOOD, WOOD_D, STONE, STONE_D, GLASS, bx, lire } from '../../kit/lieux.js';
import { fiche, part, v3 } from '../../kit/fiches.js';
import physique, { MURS } from './physique.js';

// petite maison de village (3 tailles), toit coloré, volets, fenêtres éclairées la nuit
export function maison(p) {
  const b = new Builder();
  const g = new Builder();
  const v = p.v || 0;
  const w = MURS.w[v];
  const d = MURS.d[v];
  const hgt = [2.1, 2.3, 2.6][v];
  const W = { tint: 0.5 }; // mur : recoloré par la couleur de la maison
  const R = { tint: 1 }; // toit et volets
  const F = { tint: 0 }; // couleur fixe
  b.add(bx(w + 0.4, 0.3, d + 0.4, 0.06), STONE_D, { p: [0, 0.1, 0], ...F });
  b.add(bx(w, hgt, d, 0.08), '#ffffff', { p: [0, 0.25 + hgt / 2, 0], ...W });
  // toit à deux pans
  const rh = 1.3 + v * 0.2;
  const slope = Math.atan2(rh, d / 2);
  const pan = Math.hypot(rh, d / 2) + 0.25;
  // chaque pan monte vers le faîtage (z = 0)
  b.add(bx(w + 0.6, 0.16, pan, 0.05), '#ffffff', { p: [0, 0.25 + hgt + rh / 2, -d / 4 - 0.05], r: [-slope, 0, 0], ...R });
  b.add(bx(w + 0.6, 0.16, pan, 0.05), '#ffffff', { p: [0, 0.25 + hgt + rh / 2, d / 4 + 0.05], r: [slope, 0, 0], ...R });
  // pignons : pyramide à base carrée aplatie en x = triangle dans le plan du mur
  for (const sx of [-1, 1]) b.add(G.cone(d / 2, rh, 4), '#ffffff', { p: [sx * (w / 2 - 0.08), 0.25 + hgt + rh / 2, 0], s: [0.1, 1, 1], ...W });
  // porte, fenêtres et volets
  b.add(bx(0.8, 1.35, 0.08, 0.04), WOOD_D, { p: [0, 0.25 + 0.68, d / 2 + 0.03], ...F });
  b.add(G.sphere(0.04, 6, 4), '#f6d27a', { p: [0.25, 0.25 + 0.7, d / 2 + 0.09], ...F });
  for (const sx of [-1, 1]) {
    const x = sx * (w / 2 - 0.75);
    g.add(bx(0.55, 0.55, 0.06, 0.03), GLASS, { p: [x, 0.25 + 1.3, d / 2 + 0.03] });
    b.add(bx(0.2, 0.62, 0.05, 0.02), '#ffffff', { p: [x - 0.4, 0.25 + 1.3, d / 2 + 0.05], ...R });
    b.add(bx(0.2, 0.62, 0.05, 0.02), '#ffffff', { p: [x + 0.4, 0.25 + 1.3, d / 2 + 0.05], ...R });
    // jardinière fleurie sous la fenêtre
    b.add(bx(0.62, 0.14, 0.18, 0.03), WOOD, { p: [x, 0.25 + 0.95, d / 2 + 0.12], ...F });
    for (let k = 0; k < 3; k++) b.add(G.sphere(0.06, 6, 4), ['#f4a2b4', '#f6d27a', '#fffaf0'][k], { p: [x - 0.2 + k * 0.2, 0.25 + 1.06, d / 2 + 0.14], ...F });
  }
  // cheminée
  b.add(bx(0.45, 1.0, 0.45, 0.05), STONE, { p: [w / 2 - 0.7, 0.25 + hgt + rh * 0.7, -d / 4], ...F });
  if (p.merchant) {
    // enseigne du marchand
    b.add(G.cyl(0.03, 0.03, 0.9, 6), WOOD_D, { p: [w / 2 + 0.2, 0.25 + hgt - 0.2, d / 2 + 0.1], r: [0, 0, Math.PI / 2], ...F });
    b.add(bx(0.08, 0.5, 0.7, 0.04), '#f6d27a', { p: [w / 2 + 0.55, 0.25 + hgt - 0.5, d / 2 + 0.1], ...F });
  }
  return { solid: b, glow: g, obstacles: lire(physique.obstacles, p) };
}

export default fiche('BAT-001', 'maison-village', 'Maison de village', part('maison', { roof: '#f19b86', wall: '#fbf3e6' }), {
    variants: [...v3(['Petite', 'Moyenne', 'Grande']), { label: 'Marchand', params: { v: 1, merchant: true } }],
    params: { v: [0, 2], roof: 'color', wall: 'color', merchant: 'bool' }, tags: ['village', 'teinté'],
  });
