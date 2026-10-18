// Papillon (ANI-017) : corps fin et deux ailes qui battent.
import { G } from '../../../render/builder.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

export const espece = {
  speed: 1.2, scale: 1, insect: 'flutter', height: 1.1,
  parts: () => [
    part((b) => b.add(G.cyl(0.015, 0.015, 0.12, 4), '#5b4a63', { r: [Math.PI / 2, 0, 0] }), [0, 0, 0]),
    part((b) => { b.add(G.sphere(0.07, 6, 4), '#f6d27a', { p: [0.07, 0, 0.02], s: [1.2, 0.1, 1] }); b.add(G.sphere(0.05, 6, 4), '#f4a2b4', { p: [0.06, 0, -0.05], s: [1, 0.1, 1] }); }, [0.01, 0, 0], 'wing', 1),
    part((b) => { b.add(G.sphere(0.07, 6, 4), '#f6d27a', { p: [-0.07, 0, 0.02], s: [1.2, 0.1, 1] }); b.add(G.sphere(0.05, 6, 4), '#f4a2b4', { p: [-0.06, 0, -0.05], s: [1, 0.1, 1] }); }, [-0.01, 0, 0], 'wing', -1),
  ],
};

export default fiche('ANI-017', 'papillon', 'Papillon', species('papillon', espece));
