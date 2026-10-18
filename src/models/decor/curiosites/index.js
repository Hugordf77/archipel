// Curiosités achetables à l'échoppe : télescope (DEC-010), moulin miniature (DEC-011), arche (DEC-012), statue
// (DEC-013) et fontaine (DEC-018) ; moulin et fontaine sont animés.
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { PAL } from '../../kit/palette.js';
import { mesh, article } from '../commun.js';
import physique from './physique.js';

export const telescope = {
  name: 'Télescope', price: 45, r: physique.telescope.encombrement, desc: 'Pour observer les étoiles les soirs de révision.',
  build() {
    const b = new Builder();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      b.add(G.cyl(0.03, 0.04, 1.0, 6), PAL.woodDark, { p: [Math.cos(a) * 0.18, 0.47, Math.sin(a) * 0.18], r: [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3] });
    }
    b.add(G.cyl(0.09, 0.12, 0.8, 12), PAL.sky, { p: [0, 1.05, 0.1], r: [-1.0, 0, 0] });
    b.add(G.torus(0.12, 0.03, 6, 14), PAL.butter, { p: [0, 1.25, -0.2], r: [-1.0 + Math.PI / 2, 0, 0] });
    return mesh(b);
  },
};

export const moulin = {
  name: 'Moulin à vent', price: 50, r: physique.moulin.encombrement, desc: 'Ses ailes tournent avec la brise.',
  build() {
    const g = new THREE.Group();
    const b = new Builder();
    b.add(G.cyl(0.32, 0.5, 1.6, 12), PAL.cream, { p: [0, 0.8, 0] });
    b.add(G.cone(0.48, 0.55, 12), PAL.roof, { p: [0, 1.85, 0] });
    b.add(G.box(0.3, 0.45, 0.05, 0.05), PAL.wood, { p: [0, 0.25, 0.45] });
    g.add(mesh(b));
    const s = new Builder();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      s.add(G.box(0.18, 0.75, 0.03, 0.03), i % 2 ? PAL.white : PAL.mint, { p: [Math.sin(a) * 0.42, Math.cos(a) * 0.42, 0], r: [0, 0, -a] });
    }
    s.add(G.sphere(0.07, 8, 6), PAL.butter);
    const sails = mesh(s);
    sails.position.set(0, 1.5, 0.42);
    g.add(sails);
    g.userData.anim = (dt) => {
      sails.rotation.z -= dt * 1.2;
    };
    return g;
  },
};

export const arche = {
  name: 'Arche fleurie', price: 55, r: physique.arche.encombrement, desc: 'Une arche couverte de fleurs pour une entrée de jardin.',
  build() {
    const b = new Builder();
    for (const x of [-0.75, 0.75]) b.add(G.cyl(0.07, 0.08, 1.8, 8), PAL.woodLight, { p: [x, 0.9, 0] });
    b.add(G.torus(0.75, 0.07, 8, 24, Math.PI), PAL.woodLight, { p: [0, 1.8, 0] });
    for (let i = 0; i < 16; i++) {
      const a = (i / 15) * Math.PI;
      const r = i % 2 ? 0.1 : 0.13;
      b.add(G.sphere(r, 8, 6), i % 3 === 0 ? PAL.leaf : [PAL.blossom, PAL.white, PAL.butter][i % 3], { p: [Math.cos(a) * 0.75, 1.8 + Math.sin(a) * 0.75, (i % 2 ? 0.06 : -0.06)] });
    }
    return mesh(b);
  },
};

export const statue = {
  name: 'Statue du hibou', price: 70, r: physique.statue.encombrement, desc: 'Un hommage en pierre au bibliothécaire de l\'île.',
  build() {
    const b = new Builder();
    b.add(G.box(0.7, 0.4, 0.7, 0.08), PAL.stone, { p: [0, 0.2, 0] });
    b.add(G.sphere(0.32, 14, 10), '#d9d2e0', { p: [0, 0.72, 0], s: [1, 1.1, 0.95] });
    b.add(G.sphere(0.27, 14, 10), '#d9d2e0', { p: [0, 1.15, 0] });
    for (const sx of [-1, 1]) {
      b.add(G.sphere(0.09, 10, 8), '#f2edf4', { p: [sx * 0.1, 1.18, 0.22], s: [1, 1, 0.5] });
      b.add(G.cone(0.07, 0.16, 8), '#c9c0d2', { p: [sx * 0.18, 1.42, -0.02], r: [0, 0, -sx * 0.4] });
    }
    return mesh(b, { rim: 1.4 });
  },
};

export const fontaine = {
  name: 'Fontaine', price: 90, r: physique.fontaine.encombrement, desc: 'Une vasque ronde qui gazouille au soleil.',
  build() {
    const g = new THREE.Group();
    const b = new Builder();
    b.add(G.cyl(0.9, 1.0, 0.35, 24), PAL.stone, { p: [0, 0.17, 0] });
    b.add(G.torus(0.9, 0.1, 8, 28), PAL.stoneWarm, { p: [0, 0.36, 0], r: [Math.PI / 2, 0, 0] });
    b.add(G.cyl(0.12, 0.16, 0.8, 12), PAL.stone, { p: [0, 0.6, 0] });
    b.add(G.cyl(0.42, 0.18, 0.14, 16), PAL.stoneWarm, { p: [0, 1.0, 0] });
    g.add(mesh(b));
    const w = new Builder();
    w.add(G.cyl(0.84, 0.84, 0.04, 24), '#9fdcf0', { p: [0, 0.33, 0] });
    w.add(G.cyl(0.36, 0.36, 0.03, 16), '#9fdcf0', { p: [0, 1.06, 0] });
    w.add(G.sphere(0.1, 10, 8), '#e8f8ff', { p: [0, 1.2, 0], s: [1, 1.6, 1] });
    const water = mesh(w, { rim: 1.2, emissive: 0x406070, outline: 0.5 });
    g.add(water);
    g.userData.anim = (dt, t) => {
      water.scale.y = 1 + Math.sin(t * 6) * 0.06;
    };
    return g;
  },
};

export default [
  article('DEC-010', 'telescope', telescope),
  article('DEC-011', 'moulin', moulin),
  article('DEC-012', 'arche', arche),
  article('DEC-013', 'statue', statue),
  article('DEC-018', 'fontaine', fontaine),
];
