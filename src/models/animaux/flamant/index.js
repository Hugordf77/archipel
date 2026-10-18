// Flamant rose (ANI-013) : hautes pattes et long cou ; il patauge.
import { G } from '../../../render/builder.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

export const espece = {
  speed: 0.3, scale: 1.1, wade: true,
  parts: () => [
    part((b) => { b.add(G.sphere(0.25, 10, 8), '#f4a2b4', { p: [0, 1.05, 0], s: [0.9, 0.7, 1.4] }); b.add(G.cyl(0.02, 0.02, 0.9, 4), '#f08aa0', { p: [0, 0.48, 0] }); b.add(G.cyl(0.02, 0.02, 0.5, 4), '#f08aa0', { p: [0.06, 0.8, 0.05], r: [1.2, 0, 0] }); }, [0, 0, 0]),
    part((b) => { b.add(G.cyl(0.03, 0.035, 0.7, 5), '#f4a2b4', { p: [0, 0.35, 0], r: [0.25, 0, 0] }); b.add(G.sphere(0.08, 8, 6), '#f4a2b4', { p: [0, 0.72, 0.12] }); b.add(G.cone(0.03, 0.12, 5), '#3d3049', { p: [0, 0.68, 0.22], r: [2.2, 0, 0] }); }, [0, 1.12, 0.25], 'head'),
  ],
};

export default fiche('ANI-013', 'flamant', 'Flamant rose', species('flamant', espece));
