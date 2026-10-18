// Herbe (PLA-016) : touffe instanciée par tuile, dessinée par render/grass.js (tuftGeometry).
import { fiche, kind } from '../../kit/fiches.js';

export function herbe() {
  return { grass: true };
}

export default fiche('PLA-016', 'herbe', 'Herbe', kind('herbe'), { tags: ['tuiles'] });
