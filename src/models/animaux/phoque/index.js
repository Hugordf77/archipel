// Phoque (ANI-020) : corps fuselé gris bleu et queue en nageoire.
import { G } from '../../../render/builder.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

export const espece = {
  speed: 0.3, scale: 1,
  parts: () => [
    part((b) => { b.add(G.sphere(0.4, 12, 8), '#bcc8d8', { p: [0, 0.28, 0], s: [0.9, 0.7, 1.9] }); b.add(G.cone(0.2, 0.3, 6), '#a9b6c8', { p: [0, 0.18, -0.85], r: [-Math.PI / 2, 0, 0], s: [1.4, 1, 0.4] }); }, [0, 0, 0]),
    part((b) => { b.add(G.sphere(0.24, 10, 8), '#bcc8d8', {}); b.add(G.sphere(0.04, 6, 4), '#3d3049', { p: [0.09, 0.06, 0.2] }); b.add(G.sphere(0.04, 6, 4), '#3d3049', { p: [-0.09, 0.06, 0.2] }); }, [0, 0.5, 0.65], 'head'),
  ],
};

export default fiche('ANI-020', 'phoque', 'Phoque', species('phoque', espece));
