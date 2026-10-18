// Outils tenus en main (PER-025) : hache, pioche, pelle, canne à pêche et filet ; la tête prend la
// couleur du niveau de l'outil. Géométries en repère de la main (manche vers -y) ; le jeu les oriente
// dans la paume.
import { Builder, G } from '../../../render/builder.js';
import { assembleMesh } from '../../kit/assemble.js';
import { fiche, outil } from '../../kit/fiches.js';

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

export default fiche('PER-025', 'outils', 'Outils', outil({ ref: 'outils', build: ({ outil: o = 'hache', tete = '#c9cdd6' } = {}) => assembleMesh(outilGeometry(o, tete), 'tool') }), {
  variants: OUTILS.map((o) => ({ label: o[0].toUpperCase() + o.slice(1), params: { outil: o } })),
  params: { outil: OUTILS, tete: 'color' }, tags: ['objet tenu'],
});
