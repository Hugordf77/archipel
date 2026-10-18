// Objets de la mer, tirés au sort par world/marine.js : algue (OBJ-019), récif marin (OBJ-021), banc de
// poissons (OBJ-022), bouée (NAV-010, sa fiche est dans bateaux/mouillage), bouteille (OBJ-017) et caisse
// flottante (OBJ-018) ; rnd fait varier hauteurs et inclinaisons.
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { toonMaterial } from '../../../render/shaders/materials.js';
import { nextId } from '../../../core/globals.js';
import { mulberry32 } from '../../../core/random.js';
import { assembleMesh } from '../../kit/assemble.js';
import { fiche } from '../../kit/fiches.js';

// objets de la mer que sait dessiner marineMesh (tirés au sort par marine.js)
export const MARINE_TYPES = ['algue', 'recif', 'poissons', 'bouee', 'bouteille', 'caisse'];

export function marineMesh(type, rnd) {
  const b = new Builder();
  if (type === 'algue') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      b.add(G.cyl(0.025, 0.04, 0.7 + rnd() * 0.35, 5), ['#73c9aa', '#4fae9e', '#9ad4a4'][i % 3], {
        p: [Math.cos(a) * 0.12, -0.28, Math.sin(a) * 0.12],
        r: [0, a, (rnd() - 0.5) * 0.35],
      });
    }
  } else if (type === 'recif') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      b.add(G.sphere(0.2 + rnd() * 0.12, 8, 6), ['#e5a3bd', '#e6c27a', '#a9c7df'][i % 3], {
        p: [Math.cos(a) * 0.3, -0.45, Math.sin(a) * 0.22],
        s: [1, 0.65 + rnd() * 0.5, 1],
      });
    }
  } else if (type === 'bouee') {
    b.add(G.cyl(0.17, 0.2, 0.12, 12), '#f4a28c', { p: [0, 0.02, 0] });
    b.add(G.cyl(0.025, 0.03, 0.42, 6), '#fff1dc', { p: [0, 0.25, 0] });
    b.add(G.sphere(0.08, 8, 6), '#f6d27a', { p: [0, 0.47, 0] });
  } else if (type === 'bouteille') {
    b.add(G.cyl(0.07, 0.08, 0.32, 8), '#9fdcc8', { p: [0, 0.06, 0], r: [0, 0, 0.4] });
    b.add(G.cyl(0.035, 0.04, 0.08, 8), '#d6a879', { p: [0, 0.25, 0], r: [0, 0, 0.4] });
  } else if (type === 'caisse') {
    b.add(G.box(0.34, 0.25, 0.3, 0.04), '#b98a64', { p: [0, 0.1, 0] });
    b.add(G.box(0.38, 0.035, 0.035, 0.02), '#e2bb83', { p: [0, 0.1, 0.16] });
    b.add(G.box(0.035, 0.26, 0.035, 0.02), '#e2bb83', { p: [0, 0.1, 0] });
  } else {
    for (let i = 0; i < 4; i++) {
      b.add(G.sphere(0.08, 8, 6), i % 2 ? '#f6d27a' : '#9fdcc8', {
        p: [(i - 1.5) * 0.18, 0, Math.sin(i) * 0.12],
        s: [1.4, 0.45, 0.8],
      });
    }
  }
  const mat = toonMaterial({ vertexColors: true, aId: true, id: nextId(), rim: type === 'recif' ? 0.45 : 0.9, wind: type === 'algue' ? 0.25 : 0 });
  const mesh = new THREE.Mesh(b.build(), mat);
  mesh.layers.enable(1);
  return mesh;
}


// fiche d'un objet de la mer : v tire une des six graines
export function marine(t) {
  return { ref: `marine:${t}`, usedIn: ['mer'], params: { v: [0, 5] }, build: ({ v = 0 } = {}) => assembleMesh(marineMesh(t, mulberry32(11 + v))) };
}

export default [
  fiche('OBJ-017', 'bouteille-mer', 'Bouteille à la mer', marine('bouteille'), { tags: ['flotte'] }),
  fiche('OBJ-018', 'caisse-flottante', 'Caisse flottante', marine('caisse'), { tags: ['flotte'] }),
  fiche('OBJ-019', 'algue', 'Algue', marine('algue'), { tags: ['sous l\'eau'] }),
  fiche('OBJ-021', 'recif-marin', 'Récif marin', marine('recif'), { tags: ['sous l\'eau'] }),
  fiche('OBJ-022', 'banc-poissons', 'Banc de poissons', marine('poissons'), { tags: ['pêche'] }),
];
