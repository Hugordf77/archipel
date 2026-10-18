// Flotteur de pêche (OBJ-020), au bout de la ligne de la canne.
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { assembleMesh } from '../../kit/assemble.js';
import { fiche, outil } from '../../kit/fiches.js';

// flotteur de pêche : boule corail coiffée de blanc, petite antenne
export function flotteurGeometry() {
  const b = new Builder();
  b.add(G.sphere(0.09, 10, 8), '#f4a28c', { p: [0, 0.04, 0] });
  b.add(new THREE.SphereGeometry(0.092, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#fffaf0', { p: [0, 0.05, 0] });
  b.add(G.cyl(0.01, 0.01, 0.12, 5), '#5b4a63', { p: [0, 0.16, 0] });
  return b.build();
}

export default fiche('OBJ-020', 'flotteur-peche', 'Flotteur de pêche', outil({ ref: 'flotteur', build: () => assembleMesh(flotteurGeometry(), 'bobber') }), { usedIn: ['pêche'] });
