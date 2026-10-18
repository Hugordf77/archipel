// Minerais : cristal lumineux (ROC-003), filons de cuivre (ROC-004) et de fer (ROC-005), obsidienne
// (ROC-006) ; la roche des filons prend la couleur du biome.
import { Builder, G } from '../../../render/builder.js';
import { fiche, kind } from '../../kit/fiches.js';

export function cristal() {
  const b = new Builder();
  [[0, 0, 1.2, 0], [0.28, 0.12, 0.8, 0.35], [-0.22, 0.18, 0.7, -0.4], [0.05, -0.28, 0.55, 0.2]].forEach(([x, z, h, tilt]) => {
    b.add(G.cyl(0.16, 0.16, h, 6), '#bfe4f2', { p: [x, h / 2, z], r: [tilt * 0.4, 0, tilt] });
    b.add(G.cone(0.16, 0.3, 6), '#e3f4fb', { p: [x + Math.sin(-tilt) * h * 0.5, h + 0.1, z + Math.sin(tilt * 0.4) * h * 0.5], r: [tilt * 0.4, 0, tilt] });
  });
  return { solid: b.build(), glow: true };
}

export function filonCuivre() {
  return ore('#e3975a', '#f0b27a');
}

export function filonFer() {
  return ore('#9aa6c4', '#c98a6a');
}

export function obsidienne() {
  const b = new Builder();
  [[0, 0, 0.9, 0], [0.3, 0.1, 0.6, 0.4], [-0.25, 0.15, 0.55, -0.45], [0.05, -0.3, 0.45, 0.25]].forEach(([x, z, h, t]) => {
    b.add(G.cone(0.24, h, 5), '#6c5a80', { p: [x, h / 2, z], r: [t * 0.5, 0, t] });
  });
  b.add(G.rock(0.45, 9), '#8a7a99', { p: [0, 0.08, 0], s: [1, 0.4, 1] });
  return { solid: b.build(), shadow: true };
}

function ore(nugget, nugget2) {
  const b = new Builder();
  b.add(G.rock(0.85, 11), '#ffffff', { p: [0, 0.3, 0], s: [1, 0.78, 0.92] });
  for (let k = 0; k < 7; k++) {
    const a = k * 0.95;
    const y = 0.25 + (k % 3) * 0.18;
    b.add(G.sphere(0.13, 8, 6), k % 2 ? nugget : nugget2, { p: [Math.cos(a) * 0.72, y, Math.sin(a) * 0.66], s: [1, 0.8, 1], tint: 0 });
  }
  return { solid: b.build(), shadow: true };
}

export default [
  fiche('ROC-003', 'cristal', 'Cristal', kind('cristal'), { tags: ['minable', 'lumineux'] }),
  fiche('ROC-004', 'filon-cuivre', 'Filon de cuivre', kind('filon_cuivre'), { params: { roche: 'color' }, tags: ['minable'] }),
  fiche('ROC-005', 'filon-fer', 'Filon de fer', kind('filon_fer'), { params: { roche: 'color' }, tags: ['minable'] }),
  fiche('ROC-006', 'obsidienne', 'Obsidienne', kind('obsidienne'), { params: { roche: 'color' }, tags: ['minable', 'cratère'] }),
];
