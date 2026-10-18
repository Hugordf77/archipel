// Canard (ANI-014) : corps crème, tête verte et bec orange ; il nage.
import { G } from '../../../render/builder.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

export const espece = {
  speed: 0.6, scale: 0.6, swim: true,
  parts: () => [
    part((b) => { b.add(G.sphere(0.3, 10, 8), '#f6ead2', { p: [0, 0.1, 0], s: [0.8, 0.6, 1.2] }); b.add(G.cone(0.08, 0.14, 4), '#f6ead2', { p: [0, 0.2, -0.33], r: [-1.2, 0, 0] }); }, [0, 0, 0]),
    part((b) => { b.add(G.sphere(0.13, 8, 6), '#3f8f8a', {}); b.add(G.cone(0.05, 0.14, 6), '#f6b45e', { p: [0, -0.02, 0.15], r: [Math.PI / 2, 0, 0], s: [1.3, 1, 0.6] }); }, [0, 0.38, 0.22], 'head'),
  ],
};

export default fiche('ANI-014', 'canard', 'Canard', species('canard', espece));
