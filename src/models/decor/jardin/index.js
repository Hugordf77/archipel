// Décor de jardin achetable à l'échoppe (DEC-001 à DEC-009) : pierres de chemin, pot de fleurs, clôture, lanterne,
// champignon lumineux, nichoir, banc, fanions et hamac.
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { PAL } from '../../kit/palette.js';
import { mesh, halo, article } from '../commun.js';
import physique from './physique.js';

export const pierre = {
  name: 'Pierres de chemin', price: 4, r: physique.pierre.encombrement, desc: 'Trois galets plats pour tracer un sentier.',
  build() {
    const b = new Builder();
    [[0, 0, 0.36], [0.5, 0.25, 0.28], [-0.45, 0.3, 0.3]].forEach(([x, z, r], i) => b.add(G.rock(r, i + 3), i % 2 ? PAL.stone : PAL.rock, { p: [x, 0.02, z], s: [1, 0.22, 1] }));
    return mesh(b, { rim: 0.5 });
  },
};

export const pot = {
  name: 'Pot de fleurs', price: 6, r: physique.pot.encombrement, desc: 'Un pot rond et des fleurs qui dansent.',
  build() {
    const b = new Builder();
    b.add(G.cyl(0.24, 0.18, 0.32, 14), '#e8987a', { p: [0, 0.16, 0] });
    b.add(G.torus(0.24, 0.05, 6, 16), '#f0a88a', { p: [0, 0.32, 0], r: [Math.PI / 2, 0, 0] });
    b.add(G.sphere(0.22, 12, 8), PAL.leaf, { p: [0, 0.4, 0], s: [1, 0.55, 1] });
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05;
      b.add(G.sphere(0.07, 8, 6), [PAL.coral, PAL.butter, PAL.lilac][i % 3], { p: [Math.cos(a) * 0.14, 0.5 + (i % 2) * 0.05, Math.sin(a) * 0.14] });
    }
    return mesh(b);
  },
};

export const cloture = {
  name: 'Bout de clôture', price: 5, r: physique.cloture.encombrement, desc: 'Trois piquets arrondis et deux traverses.',
  build() {
    const b = new Builder();
    for (const x of [-0.7, 0, 0.7]) {
      b.add(G.cyl(0.07, 0.08, 0.8, 8), PAL.woodLight, { p: [x, 0.38, 0] });
      b.add(G.sphere(0.08, 8, 6), PAL.woodLight, { p: [x, 0.78, 0] });
    }
    b.add(G.box(1.5, 0.08, 0.06, 0.03), PAL.wood, { p: [0, 0.55, 0] });
    b.add(G.box(1.5, 0.08, 0.06, 0.03), PAL.wood, { p: [0, 0.3, 0] });
    return mesh(b);
  },
};

export const lanterne = {
  name: 'Lanterne en papier', price: 12, r: physique.lanterne.encombrement, desc: 'Elle s\'allume toute seule à la tombée de la nuit.',
  build() {
    const g = new THREE.Group();
    const b = new Builder();
    b.add(G.cyl(0.05, 0.06, 1.4, 8), PAL.woodDark, { p: [0, 0.7, 0] });
    b.add(G.box(0.4, 0.05, 0.05, 0.02), PAL.woodDark, { p: [0.15, 1.38, 0] });
    g.add(mesh(b));
    const l = new Builder();
    l.add(G.sphere(0.2, 14, 10), '#ffd2b8', { p: [0.3, 1.12, 0], s: [1, 1.2, 1] });
    l.add(G.cyl(0.1, 0.1, 0.05, 10), PAL.coral, { p: [0.3, 1.36, 0] });
    l.add(G.cyl(0.1, 0.1, 0.05, 10), PAL.coral, { p: [0.3, 0.88, 0] });
    g.add(mesh(l, { emissive: 0xffa060, emissiveNight: true, rim: 0.3 }));
    const h = halo(1.12, 1.5);
    h.position.x = 0.3;
    g.add(h);
    return g;
  },
};

export const champi = {
  name: 'Lampe champignon', price: 14, r: physique.champi.encombrement, desc: 'Un gros champignon qui luit doucement la nuit.',
  build() {
    const g = new THREE.Group();
    const b = new Builder();
    b.add(G.cyl(0.09, 0.13, 0.45, 12), PAL.white, { p: [0, 0.22, 0] });
    g.add(mesh(b));
    const c = new Builder();
    c.add(G.sphere(0.34, 16, 12), '#f7b6c8', { p: [0, 0.5, 0], s: [1, 0.6, 1] });
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1;
      c.add(G.sphere(0.05, 8, 6), PAL.white, { p: [Math.cos(a) * 0.2, 0.66, Math.sin(a) * 0.2] });
    }
    g.add(mesh(c, { emissive: 0xd9709a, emissiveNight: true }));
    g.add(halo(0.5, 1.6, 0xffa8c8));
    return g;
  },
};

export const nichoir = {
  name: 'Nichoir', price: 16, r: physique.nichoir.encombrement, desc: 'Une petite maison pour les oiseaux de passage.',
  build() {
    const b = new Builder();
    b.add(G.cyl(0.05, 0.06, 1.4, 8), PAL.woodDark, { p: [0, 0.7, 0] });
    b.add(G.box(0.36, 0.38, 0.32, 0.06), PAL.sky, { p: [0, 1.55, 0] });
    b.add(G.cone(0.3, 0.25, 4), PAL.coral, { p: [0, 1.86, 0], r: [0, Math.PI / 4, 0] });
    b.add(G.cyl(0.07, 0.07, 0.04, 12), '#5b4a63', { p: [0, 1.58, 0.16], r: [Math.PI / 2, 0, 0] });
    b.add(G.cyl(0.015, 0.015, 0.12, 5), PAL.woodDark, { p: [0, 1.46, 0.2], r: [Math.PI / 2, 0, 0] });
    return mesh(b);
  },
};

export const banc = {
  name: 'Banc rond', price: 18, r: physique.banc.encombrement, desc: 'Pour faire une pause et regarder les nuages.',
  build() {
    const b = new Builder();
    b.add(G.box(1.4, 0.1, 0.45, 0.04), PAL.woodLight, { p: [0, 0.45, 0] });
    b.add(G.box(1.4, 0.34, 0.08, 0.04), PAL.wood, { p: [0, 0.72, -0.22] });
    for (const x of [-0.55, 0.55]) b.add(G.box(0.08, 0.45, 0.4, 0.03), PAL.woodDark, { p: [x, 0.22, 0] });
    b.add(G.sphere(0.13, 10, 8), PAL.coral, { p: [-0.4, 0.55, -0.05], s: [1, 0.6, 1] });
    return mesh(b);
  },
};

export const fanions = {
  name: 'Guirlande de fanions', price: 20, r: physique.fanions.encombrement, desc: 'Des petits drapeaux pastel entre deux piquets.',
  build() {
    const b = new Builder();
    for (const x of [-1.1, 1.1]) b.add(G.cyl(0.05, 0.06, 1.7, 8), PAL.woodDark, { p: [x, 0.85, 0] });
    const cols = [PAL.coral, PAL.butter, PAL.mint, PAL.lilac, PAL.sky];
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const x = -1.0 + t * 2.0;
      const y = 1.6 - Math.sin(t * Math.PI) * 0.3;
      b.add(G.cone(0.1, 0.22, 3), cols[i % cols.length], { p: [x, y - 0.12, 0], r: [Math.PI, 0, 0], s: [1, 1, 0.25] });
    }
    return mesh(b, { wind: 0.4, side: THREE.DoubleSide });
  },
};

export const hamac = {
  name: 'Hamac', price: 35, r: physique.hamac.encombrement, desc: 'Tendu entre deux poteaux, parfait pour rêvasser.',
  build() {
    const b = new Builder();
    for (const x of [-1.2, 1.2]) b.add(G.cyl(0.07, 0.09, 1.5, 8), PAL.woodDark, { p: [x, 0.75, 0] });
    for (let i = 0; i < 8; i++) {
      const t = (i + 0.5) / 8;
      const x = -1.0 + t * 2.0;
      const y = 1.15 - Math.sin(t * Math.PI) * 0.45;
      b.add(G.box(0.27, 0.05, 0.7, 0.02), i % 2 ? PAL.mint : PAL.white, { p: [x, y, 0], r: [0, 0, Math.cos(t * Math.PI) * 0.4] });
    }
    return mesh(b);
  },
};

export default [
  article('DEC-001', 'pierre', pierre),
  article('DEC-002', 'pot', pot),
  article('DEC-003', 'cloture', cloture),
  article('DEC-004', 'lanterne', lanterne),
  article('DEC-005', 'champi', champi),
  article('DEC-006', 'nichoir', nichoir),
  article('DEC-007', 'banc', banc),
  article('DEC-008', 'fanions', fanions),
  article('DEC-009', 'hamac', hamac),
];
