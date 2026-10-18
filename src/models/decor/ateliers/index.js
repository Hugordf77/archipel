// Ateliers achetables à l'échoppe (DEC-014 à DEC-017) : établi, four, table de couture et chantier naval ; chacun
// ouvre sa station d'artisanat.
import { Builder, G } from '../../../render/builder.js';
import { PAL } from '../../kit/palette.js';
import { mesh, article } from '../commun.js';
import physique from './physique.js';

export const etabli = {
  name: 'Établi', r: physique.etabli.encombrement, station: 'etabli', desc: 'Un établi pour fabriquer outils et matériaux.',
  build() {
    const b = new Builder();
    b.add(G.box(1.35, 0.18, 0.72, 0.08), PAL.woodLight, { p: [0, 0.92, 0] });
    b.add(G.box(1.18, 0.62, 0.12, 0.04), PAL.wood, { p: [0, 0.53, -0.22] });
    for (const x of [-0.52, 0.52]) b.add(G.box(0.12, 0.82, 0.58, 0.04), PAL.woodDark, { p: [x, 0.42, 0] });
    b.add(G.box(0.34, 0.1, 0.24, 0.04), PAL.stone, { p: [-0.32, 1.06, 0.02] });
    b.add(G.cyl(0.04, 0.04, 0.34, 8), PAL.stoneWarm, { p: [0.28, 1.12, 0.02], r: [0, 0, Math.PI / 2] });
    return mesh(b);
  },
};

export const four = {
  name: 'Four', r: physique.four.encombrement, station: 'four', desc: 'Un four doux pour cuisiner.',
  build() {
    const b = new Builder();
    b.add(G.cyl(0.55, 0.62, 0.82, 16), PAL.cream, { p: [0, 0.42, 0] });
    b.add(G.cone(0.63, 0.28, 16), PAL.roof, { p: [0, 0.97, 0] });
    b.add(G.arc ? G.arc(0.22, 0.3, 0.2, 12) : G.torus(0.22, 0.035, 8, 16), PAL.woodDark, { p: [0, 0.3, 0.48], r: [Math.PI / 2, 0, 0] });
    b.add(G.box(0.1, 0.16, 0.04, 0.02), PAL.butter, { p: [0, 0.17, 0.54] });
    return mesh(b);
  },
};

export const couture = {
  name: 'Table de couture', r: physique.couture.encombrement, station: 'couture', desc: 'Une petite table de couture.',
  build() {
    const b = new Builder();
    b.add(G.box(1.2, 0.16, 0.68, 0.08), PAL.woodLight, { p: [0, 0.82, 0] });
    for (const x of [-0.48, 0.48]) b.add(G.box(0.1, 0.74, 0.55, 0.03), PAL.wood, { p: [x, 0.38, 0] });
    b.add(G.box(0.44, 0.28, 0.04, 0.02), PAL.lilac, { p: [0.12, 1.04, 0.08] });
    b.add(G.torus(0.16, 0.025, 6, 14), PAL.coral, { p: [-0.3, 1.02, 0.03], r: [Math.PI / 2, 0, 0] });
    return mesh(b);
  },
};

export const chantier = {
  name: 'Chantier naval', r: physique.chantier.encombrement, station: 'chantier', desc: 'Un établi robuste pour préparer son bateau.',
  build() {
    const b = new Builder();
    b.add(G.box(1.8, 0.18, 0.82, 0.08), PAL.woodLight, { p: [0, 0.78, 0] });
    for (const x of [-0.7, 0.7]) b.add(G.box(0.14, 0.68, 0.72, 0.04), PAL.woodDark, { p: [x, 0.36, 0] });
    b.add(G.box(1.3, 0.14, 0.3, 0.04), PAL.sky, { p: [0, 1.03, -0.05] });
    b.add(G.cone(0.18, 0.3, 8), PAL.coral, { p: [0.55, 1.24, 0.12] });
    return mesh(b);
  },
};

export default [
  article('DEC-014', 'etabli', etabli),
  article('DEC-015', 'four', four),
  article('DEC-016', 'couture', couture),
  article('DEC-017', 'chantier', chantier),
];
