// Objets tenus en main : outils (hache, pioche, pelle, canne à pêche, filet), crayon d'étude
// et flotteur de pêche.
// Géométries en repère de la main (manche vers -y) ; le jeu les oriente dans la paume.
import * as THREE from 'three';
import { Builder, G } from '../../render/builder.js';
import { RIBBON } from '../character/personnage.js';

export const OUTILS = ['hache', 'pioche', 'pelle', 'canne', 'filet'];

// tool : type d'outil ; head : couleur de la tête (niveau de l'outil)
export function outilGeometry(tool, head = '#c9cdd6') {
  const b = new Builder();
  const wood = '#b98a64';
  if (tool === 'hache') {
    b.add(G.cyl(0.018, 0.02, 0.5, 6), wood, { p: [0, -0.2, 0] });
    b.add(G.box(0.03, 0.12, 0.14, 0.02), head, { p: [0, -0.42, 0.07] });
  } else if (tool === 'pioche') {
    b.add(G.cyl(0.018, 0.02, 0.5, 6), wood, { p: [0, -0.2, 0] });
    b.add(G.cone(0.03, 0.18, 6), head, { p: [0, -0.43, 0.09], r: [Math.PI / 2, 0, 0] });
    b.add(G.cone(0.03, 0.18, 6), head, { p: [0, -0.43, -0.09], r: [-Math.PI / 2, 0, 0] });
  } else if (tool === 'pelle') {
    b.add(G.cyl(0.018, 0.02, 0.55, 6), wood, { p: [0, -0.22, 0] });
    b.add(G.box(0.14, 0.18, 0.02, 0.02), head, { p: [0, -0.56, 0] });
  } else if (tool === 'canne') {
    b.add(G.cyl(0.01, 0.018, 1.1, 6), wood, { p: [0, -0.5, 0] });
    b.add(G.sphere(0.04, 8, 6), head, { p: [0, -0.05, 0.03] });
  } else {
    b.add(G.cyl(0.015, 0.018, 0.6, 6), wood, { p: [0, -0.28, 0] });
    b.add(G.torus(0.12, 0.012, 5, 16), head, { p: [0, -0.68, 0], r: [0, Math.PI / 2, 0] });
    b.add(G.sphere(0.12, 10, 6), '#fffaf0', { p: [0, -0.7, 0], s: [0.3, 1, 1] });
  }
  return b.build();
}

export function crayonGeometry(id) {
  const b = new Builder(id);
  b.add(G.cyl(0.009, 0.009, 0.12, 6), '#f2c14e');
  b.add(G.cone(0.009, 0.025, 6), '#f6d8b0', { p: [0, -0.072, 0], r: [Math.PI, 0, 0] });
  b.add(G.cyl(0.0095, 0.0095, 0.016, 6), RIBBON, { p: [0, 0.067, 0] });
  return b.build();
}

// flotteur de pêche : boule corail coiffée de blanc, petite antenne
export function flotteurGeometry() {
  const b = new Builder();
  b.add(G.sphere(0.09, 10, 8), '#f4a28c', { p: [0, 0.04, 0] });
  b.add(new THREE.SphereGeometry(0.092, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#fffaf0', { p: [0, 0.05, 0] });
  b.add(G.cyl(0.01, 0.01, 0.12, 5), '#5b4a63', { p: [0, 0.16, 0] });
  return b.build();
}
