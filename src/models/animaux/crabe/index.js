// Crabe (ANI-010) : carapace corail, yeux sur pédoncules, pinces et six pattes ; il marche de côté.
import { G } from '../../../render/builder.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

export const espece = {
  speed: 0.7, scale: 0.6, sideways: true,
  parts: () => [
    part((b) => { b.add(G.sphere(0.2, 10, 7), '#f49d86', { p: [0, 0.14, 0], s: [1.25, 0.62, 1] }); for (const sx of [-1, 1]) { b.add(G.cyl(0.018, 0.018, 0.12, 5), '#f49d86', { p: [sx * 0.07, 0.25, 0.1] }); b.add(G.sphere(0.035, 6, 4), '#fffaf0', { p: [sx * 0.07, 0.32, 0.1] }); b.add(G.sphere(0.08, 8, 6), '#f49d86', { p: [sx * 0.3, 0.15, 0.14], s: [1, 0.7, 1.2] }); } }, [0, 0, 0]),
    ...[-1, 1].flatMap((sx) => [0, 1, 2].map((k) => part((b) => b.add(G.cyl(0.015, 0.012, 0.18, 4), '#e07a64', { p: [sx * 0.09, -0.04, 0], r: [0, 0, sx * 1.0] }), [sx * 0.18, 0.12, -0.08 + k * 0.08], 'leg', sx, k * 1.7))),
  ],
};

export default fiche('ANI-010', 'crabe', 'Crabe', species('crabe', espece));
