// Animaux de l'île de départ : mouette, crabe, papillon (géométries par pièce ; le jeu
// les instancie et les anime dans entities/fauna/homeFauna.js).
import { Builder, G } from '../../../render/builder.js';
import { fiche, homeCreature } from '../../kit/fiches.js';

// pivots (repère de l'animal) : ailes de la mouette et du papillon, six pattes du crabe
export const GULL_PIVOTS = [[-0.12, 0.05, 0], [0.12, 0.05, 0]];
export const BUTTERFLY_PIVOTS = [[0, 0, 0], [0, 0, 0]];
export const CRAB_LEG_PIVOTS = [];
for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) CRAB_LEG_PIVOTS.push([sx * 0.18, 0.12, -0.08 + k * 0.08]);

export function butterflyGeometry(id) {
  const body = new Builder(id);
  body.add(G.capsule(0.022, 0.12, 4, 6), '#6b5a72', { r: [Math.PI / 2, 0, 0], tint: 0 });
  // ailes blanches teintées par instance, tache claire non teintée
  const wings = [-1, 1].map((sx) => {
    const w = new Builder(id);
    w.add(G.sphere(0.12, 10, 6), '#ffffff', { p: [sx * 0.11, 0, 0.04], s: [1, 0.05, 0.85] });
    w.add(G.sphere(0.08, 8, 6), '#ffffff', { p: [sx * 0.08, 0, -0.08], s: [1, 0.05, 0.8] });
    w.add(G.sphere(0.035, 6, 6), '#fffaf0', { p: [sx * 0.13, 0.008, 0.06], s: [1, 0.2, 1], tint: 0 });
    return w.build();
  });
  return [body.build(), ...wings];
}

export function crabGeometry(id) {
  const b = new Builder(id);
  const shell = '#f08a72';
  b.add(G.sphere(0.2, 14, 10), shell, { p: [0, 0.14, 0], s: [1.25, 0.62, 1] });
  for (const sx of [-1, 1]) {
    b.add(G.cyl(0.018, 0.018, 0.12, 6), shell, { p: [sx * 0.07, 0.25, 0.1] });
    b.add(G.sphere(0.04, 8, 6), '#fffaf0', { p: [sx * 0.07, 0.32, 0.1] });
    b.add(G.sphere(0.022, 6, 6), '#3d3049', { p: [sx * 0.07, 0.33, 0.13] });
    // pinces
    b.add(G.sphere(0.09, 10, 8), '#f49d86', { p: [sx * 0.3, 0.15, 0.14], s: [1, 0.7, 1.2] });
    b.add(G.sphere(0.05, 8, 6), '#f49d86', { p: [sx * 0.34, 0.18, 0.22], s: [0.8, 0.6, 1] });
  }
  const legs = [-1, 1].map((sx) => {
    const lb = new Builder(id);
    lb.add(G.cyl(0.018, 0.014, 0.18, 5), '#e07a64', { p: [sx * 0.07, -0.05, 0], r: [0, 0, sx * 1.0] });
    return lb.build();
  });
  return [b.build(), ...legs];
}

export function gullGeometry(id) {
  const b = new Builder(id);
  b.add(G.sphere(0.22, 14, 10), '#fbf7f2', { s: [0.8, 0.75, 1.5] });
  b.add(G.sphere(0.15, 12, 10), '#fbf7f2', { p: [0, 0.1, 0.28] });
  b.add(G.cone(0.05, 0.16, 8), '#f6b45e', { p: [0, 0.08, 0.46], r: [Math.PI / 2, 0, 0] });
  b.add(G.sphere(0.03, 6, 6), '#3d3049', { p: [0.07, 0.14, 0.37] });
  b.add(G.sphere(0.03, 6, 6), '#3d3049', { p: [-0.07, 0.14, 0.37] });
  b.add(G.cone(0.12, 0.25, 8), '#d8dce8', { p: [0, 0, -0.38], r: [-Math.PI / 2, 0, 0], s: [1, 1, 0.4] });
  const wings = [-1, 1].map((sx) => {
    const w = new Builder(id);
    w.add(G.sphere(0.5, 12, 8), '#f4f4f8', { p: [sx * 0.42, 0, 0], s: [1, 0.08, 0.32] });
    w.add(G.sphere(0.2, 10, 6), '#9aa0b8', { p: [sx * 0.82, 0, -0.02], s: [1, 0.09, 0.3] });
    return w.build();
  });
  return [b.build(), ...wings];
}


// fiches du registre : corps et pièces mobiles aux pivots du jeu
export default [
  fiche('ANI-024', 'mouette-depart', 'Mouette (île de départ)', homeCreature('mouette', gullGeometry, GULL_PIVOTS, 'gull', 'wing')),
  fiche('ANI-025', 'crabe-depart', 'Crabe (île de départ)', homeCreature('crabe', crabGeometry, CRAB_LEG_PIVOTS, 'crab', 'leg', 0.85)),
  fiche('ANI-026', 'papillon-depart', 'Papillon (île de départ)', homeCreature('papillon', butterflyGeometry, BUTTERFLY_PIVOTS, 'butterfly', 'wing')),
];
