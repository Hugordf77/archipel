// Hérisson (ANI-007) : dos couvert de piquants, museau pointu.
import { G } from '../../../render/builder.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

export const espece = {
  speed: 0.35, scale: 0.6,
  parts: () => [
    part((b) => { b.add(G.sphere(0.5, 10, 7), '#8a6a5c', { p: [0, 0.18, 0], s: [0.5, 0.36, 0.62] }); for (let k = 0; k < 14; k++) b.add(G.cone(0.05, 0.16, 4), '#5b4a5a', { p: [Math.cos(k * 1.7) * 0.18, 0.3 + (k % 3) * 0.04, Math.sin(k * 2.3) * 0.22], r: [Math.sin(k) * 0.6, 0, Math.cos(k) * 0.6] }); }, [0, 0, 0]),
    part((b) => { b.add(G.cone(0.12, 0.22, 8), '#e6d6c2', { p: [0, 0, 0.08], r: [Math.PI / 2, 0, 0] }); b.add(G.sphere(0.03, 5, 4), '#3d3049', { p: [0, 0, 0.2] }); }, [0, 0.16, 0.3], 'head'),
  ],
};

export default fiche('ANI-007', 'herisson', 'Hérisson', species('herisson', espece));
