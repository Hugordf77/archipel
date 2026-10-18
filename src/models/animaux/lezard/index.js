// Lézard (ANI-022) : corps allongé, longue queue et quatre pattes courtes.
import { G } from '../../../render/builder.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

export const espece = {
  speed: 1.0, scale: 0.6,
  parts: () => [part((b) => { b.add(G.sphere(0.2, 8, 6), '#9fd09a', { p: [0, 0.08, 0], s: [0.7, 0.4, 1.6] }); b.add(G.cone(0.08, 0.5, 5), '#9fd09a', { p: [0, 0.06, -0.5], r: [-Math.PI / 2, 0, 0], s: [1, 1, 0.5] }); b.add(G.sphere(0.1, 8, 6), '#9fd09a', { p: [0, 0.1, 0.36], s: [1, 0.7, 1.3] }); for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) b.add(G.sphere(0.04, 5, 4), '#7fbf86', { p: [sx * 0.15, 0.04, sz * 0.15], s: [1.6, 0.5, 0.6] }); }, [0, 0, 0], 'tail')],
};

export default fiche('ANI-022', 'lezard', 'Lézard', species('lezard', espece));
