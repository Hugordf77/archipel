// Renard (ANI-005) : quadrupède roux, museau et bout de queue crème ; timide.
import { G } from '../../../render/builder.js';
import { quad } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

export const espece = {
  speed: 1.2, scale: 0.75, shadow: true, shy: 6,
  parts: () => quad({
    body: '#f39c4a', bodyS: [0.42, 0.42, 0.9], head: '#f39c4a', headS: [0.3, 0.28, 0.38], leg: '#5b4a63', legLen: 0.28,
    ears: (b) => { for (const sx of [-1, 1]) b.add(G.cone(0.07, 0.18, 4), '#f39c4a', { p: [sx * 0.1, 0.17, 0] }); b.add(G.sphere(0.08, 6, 4), '#fbf7f2', { p: [0, -0.05, 0.2], s: [1, 0.7, 1] }); },
    tail: (b) => { b.add(G.sphere(0.16, 8, 6), '#f39c4a', { p: [0, 0.05, -0.25], s: [0.9, 0.9, 2] }); b.add(G.sphere(0.1, 6, 4), '#fbf7f2', { p: [0, 0.08, -0.55] }); },
  }),
};

export default fiche('ANI-005', 'renard', 'Renard', species('renard', espece));
