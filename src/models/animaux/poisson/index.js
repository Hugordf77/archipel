// Poisson (ANI-016) : ovale orange et nageoire caudale qui remue.
import { G } from '../../../render/builder.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

export const espece = {
  speed: 1.0, scale: 0.6, fish: true,
  parts: () => [part((b) => { b.add(G.sphere(0.25, 8, 6), '#f39c6b', { s: [0.6, 0.8, 1.4] }); b.add(G.cone(0.14, 0.2, 4), '#f6c08a', { p: [0, 0, -0.38], r: [-Math.PI / 2, 0, 0], s: [0.3, 1, 1] }); }, [0, 0, 0], 'tail')],
};

export default fiche('ANI-016', 'poisson', 'Poisson', species('poisson', espece));
