// Crayon d'étude (PER-024), tenu en main pendant l'étude (repère de la main, mine vers -y).
import { Builder, G } from '../../../render/builder.js';
import { RIBBON } from '../coupes/index.js';
import { assembleMesh } from '../../kit/assemble.js';
import { fiche, outil } from '../../kit/fiches.js';

export function crayonGeometry(id) {
  const b = new Builder(id);
  b.add(G.cyl(0.009, 0.009, 0.12, 6), '#f2c14e');
  b.add(G.cone(0.009, 0.025, 6), '#f6d8b0', { p: [0, -0.072, 0], r: [Math.PI, 0, 0] });
  b.add(G.cyl(0.0095, 0.0095, 0.016, 6), RIBBON, { p: [0, 0.067, 0] });
  return b.build();
}

export default fiche('PER-024', 'crayon', 'Crayon d\'étude', outil({ ref: 'crayon', build: () => assembleMesh(crayonGeometry(), 'tool') }), { tags: ['objet tenu'] });
