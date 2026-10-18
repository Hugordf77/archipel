// Trésors du jour sur les plages de l'île de départ : coquillage (OBJ-012), étoile de mer (OBJ-013), pêche
// (OBJ-014), perle (OBJ-015) et verre poli (OBJ-016) ; rnd tire la couleur et l'orientation.
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { toonMaterial } from '../../../render/shaders/materials.js';
import { nextId, LAYER_SHADOW } from '../../../core/globals.js';
import { mulberry32 } from '../../../core/random.js';
import { assembleMesh } from '../../kit/assemble.js';
import { fiche } from '../../kit/fiches.js';

export function collectibleMesh(kind, rnd) {
  const id = nextId();
  const b = new Builder(id);
  if (kind === 'coquillage') {
    const c = ['#ffd7c4', '#f9c0cf', '#fff1dc'][Math.floor(rnd() * 3)];
    for (let i = 0; i < 5; i++) {
      const a = (i / 4 - 0.5) * 1.5;
      b.add(G.sphere(0.07, 8, 6), c, { p: [Math.sin(a) * 0.08, 0.035, Math.cos(a) * 0.06 - 0.02], s: [0.45, 0.45, 1.5], r: [0, a, 0] });
    }
    b.add(G.sphere(0.05, 8, 6), '#e9a991', { p: [0, 0.03, -0.07], s: [1.4, 0.7, 0.8] });
  } else if (kind === 'etoile') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      b.add(G.sphere(0.06, 8, 6), '#f6a96f', { p: [Math.sin(a) * 0.09, 0.025, Math.cos(a) * 0.09], s: [0.7, 0.4, 1.9], r: [0, a, 0] });
    }
    b.add(G.sphere(0.06, 8, 6), '#f39a63', { p: [0, 0.035, 0], s: [1, 0.55, 1] });
  } else if (kind === 'verre') {
    const c = ['#9fdcc8', '#9cc8ec', '#c7b2e6'][Math.floor(rnd() * 3)];
    b.add(G.box(0.16, 0.06, 0.12, 0.03), c, { p: [0, 0.03, 0], r: [0, rnd() * 3, 0] });
  } else if (kind === 'perle') {
    b.add(G.sphere(0.12, 12, 8), '#f4dfe8', { p: [0, 0.03, 0], s: [1, 0.3, 1] });
    b.add(G.sphere(0.06, 12, 10), '#fffaf6', { p: [0, 0.08, 0.02] });
  } else if (kind === 'peche') {
    b.add(G.sphere(0.12, 12, 10), '#f7b48a', { p: [0, 0.11, 0] });
    b.add(G.sphere(0.05, 6, 4), '#9fd08a', { p: [0.05, 0.22, 0], s: [1, 0.4, 0.6] });
  }
  const mesh = new THREE.Mesh(b.build(), toonMaterial({ vertexColors: true, id, rim: 1.3 }));
  mesh.layers.enable(LAYER_SHADOW);
  return mesh;
}

// fiche d'un trésor : v tire une des six graines
const collect = (k) => ({ ref: `collect:${k}`, usedIn: ['plages de l\'île de départ'], params: { v: [0, 5] }, build: ({ v = 0 } = {}) => assembleMesh(collectibleMesh(k, mulberry32(7 + v))) });

export default [
  fiche('OBJ-012', 'coquillage', 'Coquillage', collect('coquillage'), { tags: ['trésor du jour'] }),
  fiche('OBJ-013', 'etoile-mer', 'Étoile de mer', collect('etoile'), { tags: ['trésor du jour'] }),
  fiche('OBJ-014', 'peche', 'Pêche', collect('peche'), { tags: ['trésor du jour'] }),
  fiche('OBJ-015', 'perle', 'Perle', collect('perle'), { tags: ['trésor du jour'] }),
  fiche('OBJ-016', 'verre-poli', 'Verre poli', collect('verre'), { tags: ['trésor du jour'] }),
];
