// Objets et petites découvertes : trésors du jour (coquillage, étoile de mer, verre poli, perle,
// pêche) et objets flottants de la mer (algue, récif, bouée, bouteille, caisse, flotteurs).
import * as THREE from 'three';
import { Builder, G } from '../../render/builder.js';
import { toonMaterial } from '../../render/shaders/materials.js';
import { nextId, LAYER_SHADOW } from '../../core/globals.js';

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
