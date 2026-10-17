// Gabarits de grandes structures des îles : ruines, phare, épave, cabane, temple, grotte.
import { Builder, G } from '../../render/builder.js';

// ---------------------------------------------------------------------------
// Structures : gabarits construits à l'origine, tournés et posés ensuite
// Retour : { solid: Builder, glow?: Builder, obstacles: [[x, z, r]] }
// ---------------------------------------------------------------------------
const STONE = '#e6dccd';
const STONE_D = '#cfc2b0';
const MOSS = '#a9d4a0';
const WOOD = '#c98f5f';
const WOOD_D = '#9f6b48';

export const STRUCTURES = {
  ruines(rand) {
    const b = new Builder();
    const obs = [];
    b.add(G.box(7, 0.3, 5.5, 0.08), STONE_D, { p: [0, 0.05, 0] });
    for (let k = 0; k < 6; k++) {
      const x = (k % 3 - 1) * 2.6;
      const z = k < 3 ? -2 : 2;
      const h = rand() < 0.4 ? 0.8 + rand() * 0.8 : 2.4 + rand() * 0.6;
      b.add(G.cyl(0.32, 0.36, h, 12), STONE, { p: [x, 0.2 + h / 2, z] });
      if (h > 2) b.add(G.box(0.9, 0.25, 0.9, 0.05), STONE_D, { p: [x, 0.2 + h + 0.12, z] });
      else b.add(G.sphere(0.36, 10, 6), MOSS, { p: [x, 0.2 + h, z], s: [1, 0.3, 1] });
      obs.push([x, z, 0.45]);
    }
    b.add(G.cyl(0.3, 0.3, 2.2, 12), STONE, { p: [1.4, 0.45, 0.2], r: [0, 0.6, Math.PI / 2] });
    b.add(G.box(2.6, 1.1, 0.5, 0.06), STONE_D, { p: [-2.6, 0.75, 0] , r: [0, Math.PI / 2, 0] });
    b.add(G.sphere(0.7, 12, 8), MOSS, { p: [-2.6, 1.3, 0.4], s: [0.5, 0.3, 1] });
    obs.push([-2.6, 0, 0.6], [-2.6, 1, 0.6], [-2.6, -1, 0.6]);
    return { solid: b, obstacles: obs };
  },
  phare(rand) {
    const b = new Builder();
    const g = new Builder();
    b.add(G.cyl(2.2, 2.4, 0.6, 20), STONE_D, { p: [0, 0.3, 0] });
    b.add(G.cyl(1.05, 1.5, 7.6, 20), '#fbf3e6', { p: [0, 4.4, 0] });
    for (const y of [2.2, 4.6, 7.0]) b.add(G.cyl(1.42 - y * 0.055, 1.48 - y * 0.055, 0.8, 20), '#f19b86', { p: [0, y, 0] });
    b.add(G.cyl(1.55, 1.55, 0.2, 20), '#86c6bb', { p: [0, 8.3, 0] });
    b.add(G.torus(1.45, 0.05, 6, 24), '#86c6bb', { p: [0, 8.85, 0], r: [Math.PI / 2, 0, 0] });
    g.add(G.cyl(0.85, 0.85, 1.1, 14), '#ffe6a8', { p: [0, 9.0, 0] });
    b.add(G.cone(1.1, 1.0, 18), '#f19b86', { p: [0, 10.05, 0] });
    b.add(G.sphere(0.16, 10, 8), '#f6d27a', { p: [0, 10.6, 0] });
    b.add(G.box(0.8, 1.3, 0.2, 0.05), WOOD_D, { p: [0, 1.25, 1.42] });
    // petite maison du gardien
    b.add(G.box(2.4, 1.7, 2.0, 0.1), '#f6ead2', { p: [2.6, 0.85, 0.3] });
    b.add(G.box(2.7, 0.18, 1.4, 0.06), '#86c6bb', { p: [2.6, 1.95, -0.3], r: [0.55, 0, 0] });
    b.add(G.box(2.7, 0.18, 1.4, 0.06), '#86c6bb', { p: [2.6, 1.95, 0.9], r: [-0.55, 0, 0] });
    return { solid: b, glow: g, obstacles: [[0, 0, 2.3], [2.6, 0.3, 1.4]] };
  },
  epave(rand) {
    const b = new Builder();
    const tilt = 0.32;
    b.add(G.sphere(1, 18, 12), WOOD, { p: [0, -0.2, 0], r: [0, 0, tilt], s: [1.45, 0.8, 3.4] });
    b.add(G.sphere(1, 18, 12), '#8a6a5c', { p: [0.08, 0.08, 0], r: [0, 0, tilt], s: [1.2, 0.5, 3.1] });
    for (let k = 0; k < 5; k++) {
      b.add(G.torus(1.25, 0.08, 6, 14, Math.PI), WOOD_D, { p: [0, 0.05, -2.2 + k * 1.1], r: [0, 0, tilt] });
    }
    b.add(G.cyl(0.12, 0.15, 3.2, 10), WOOD_D, { p: [0.6, 1.4, 0.4], r: [0.3, 0, -0.6] });
    b.add(G.box(1.2, 0.08, 0.9, 0.03), '#f6ead2', { p: [1.3, 2.4, 0.7], r: [0.2, 0.4, -0.5] });
    b.add(G.box(0.7, 0.5, 0.6, 0.06), WOOD_D, { p: [-1.6, 0.25, 1.9], r: [0, 0.5, 0.2] });
    return { solid: b, obstacles: [[0, -1.8, 1.3], [0, 0, 1.4], [0, 1.8, 1.3]] };
  },
  cabane(rand) {
    const b = new Builder();
    for (const [x, z] of [[-1.1, -0.9], [1.1, -0.9], [-1.1, 0.9], [1.1, 0.9]]) b.add(G.cyl(0.09, 0.11, 0.9, 8), WOOD_D, { p: [x, 0.45, z] });
    b.add(G.box(2.7, 0.16, 2.3, 0.04), WOOD, { p: [0, 0.9, 0] });
    b.add(G.box(2.3, 1.6, 1.9, 0.06), '#e0b07e', { p: [0, 1.75, 0] });
    b.add(G.box(2.8, 0.14, 1.5, 0.05), '#86c6bb', { p: [0, 2.9, -0.55], r: [0.62, 0, 0] });
    b.add(G.box(2.8, 0.14, 1.5, 0.05), '#86c6bb', { p: [0, 2.9, 0.55], r: [-0.62, 0, 0] });
    b.add(G.box(0.7, 1.15, 0.08, 0.03), WOOD_D, { p: [0.4, 1.55, 0.97] });
    b.add(G.box(0.55, 0.45, 0.06, 0.03), '#ffeab8', { p: [-0.55, 1.95, 0.97] });
    b.add(G.box(0.8, 0.12, 0.9, 0.03), WOOD, { p: [0.4, 0.45, 1.5], r: [-0.5, 0, 0] });
    return { solid: b, obstacles: [[0, 0, 1.55]] };
  },
  temple(rand) {
    const b = new Builder();
    const g = new Builder();
    b.add(G.box(7, 0.5, 7, 0.08), STONE_D, { p: [0, 0.25, 0] });
    b.add(G.box(5.4, 0.5, 5.4, 0.08), STONE, { p: [0, 0.75, 0] });
    for (const [x, z] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]]) {
      b.add(G.cyl(0.3, 0.34, 2.6, 12), STONE, { p: [x, 2.3, z] });
      b.add(G.sphere(0.4, 10, 6), MOSS, { p: [x, 1.05, z], s: [1, 0.35, 1] });
    }
    b.add(G.box(5, 0.35, 5, 0.06), STONE_D, { p: [0, 3.75, 0] });
    b.add(G.cone(3.3, 1.6, 4), '#d6c8b4', { p: [0, 4.7, 0], r: [0, Math.PI / 4, 0] });
    b.add(G.cyl(0.5, 0.6, 0.6, 10), STONE_D, { p: [0, 1.3, 0] });
    g.add(G.sphere(0.32, 14, 10), '#9fdcc8', { p: [0, 1.85, 0], s: [1, 1.3, 1] });
    return { solid: b, glow: g, obstacles: [[-1.9, -1.9, 0.45], [1.9, -1.9, 0.45], [-1.9, 1.9, 0.45], [1.9, 1.9, 0.45], [0, 0, 0.7]] };
  },
  grotte(rand) {
    const b = new Builder();
    const rocks = [[-2.2, 0.8, 0, 1.6], [2.2, 0.8, 0, 1.6], [-1.3, 2.4, 0, 1.3], [1.3, 2.4, 0, 1.3], [0, 3.0, 0, 1.3], [-2.6, 0.3, -1.4, 1.2], [2.5, 0.3, -1.5, 1.2], [0, 2.2, -1.6, 1.6]];
    rocks.forEach(([x, y, z, r], k) => b.add(G.rock(r, 20 + k), k % 3 ? '#cfc3d4' : '#bfb4c8', { p: [x, y, z] }));
    b.add(G.sphere(1.5, 16, 10), '#4d4766', { p: [0, 0.6, -0.9], s: [1, 1.15, 0.6] });
    b.add(G.sphere(0.9, 12, 8), MOSS, { p: [0, 3.8, 0], s: [1.6, 0.3, 1] });
    return { solid: b, obstacles: [[-2.2, 0, 1.5], [2.2, 0, 1.5], [0, -1.6, 1.5]] };
  },
};
