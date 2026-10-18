// Abeille (ANI-018) : corps rayé et deux ailes ; elle bourdonne.
import { G } from '../../../render/builder.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

export const espece = {
  speed: 1.6, scale: 1, insect: 'buzz', height: 1.0,
  parts: () => [
    part((b) => { b.add(G.sphere(0.05, 6, 4), '#f6c46d', { s: [0.9, 0.9, 1.3] }); b.add(G.torus(0.045, 0.012, 4, 8), '#5b4a63', { r: [0, 0, 0] }); }, [0, 0, 0]),
    part((b) => b.add(G.sphere(0.035, 5, 3), '#fbfbff', { p: [0.03, 0.02, 0], s: [1.2, 0.2, 0.8] }), [0.02, 0.03, 0], 'wing', 1),
    part((b) => b.add(G.sphere(0.035, 5, 3), '#fbfbff', { p: [-0.03, 0.02, 0], s: [1.2, 0.2, 0.8] }), [-0.02, 0.03, 0], 'wing', -1),
  ],
};

export default fiche('ANI-018', 'abeille', 'Abeille', species('abeille', espece));
