// Fougère arborescente (ARB-012) : stipe brun et huit grandes frondes, sous les tropiques.
import { Builder, G } from '../../../render/builder.js';
import { fiche, kind } from '../../kit/fiches.js';

export function fougereArbo() {
  const b = new Builder();
  b.add(G.cyl(0.13, 0.2, 2.3, 8), '#8a6a52', { p: [0, 1.15, 0] });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    b.add(G.sphere(0.9, 10, 5), k % 2 ? '#7fc48b' : '#6db87d', { p: [Math.cos(a) * 0.75, 2.35, Math.sin(a) * 0.75], r: [0, -a, 0.45], s: [1, 0.07, 0.3], sway: 1 });
  }
  return { solid: b.build(), crowns: [[0, 2.3, 0, 1.4, 0.4]], shadow: true };
}

export default fiche('ARB-012', 'fougere-arborescente', 'Fougère arborescente', kind('fougere_arbo'), { tags: ['tropical'] });
