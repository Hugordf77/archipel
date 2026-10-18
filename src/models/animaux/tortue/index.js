// Tortue (ANI-009) : carapace bombée à écailles, pattes et tête qui dépassent.
import { G } from '../../../render/builder.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

export const espece = {
  speed: 0.2, scale: 0.8,
  parts: () => [
    part((b) => { b.add(G.sphere(0.5, 12, 8), '#7fb88a', { p: [0, 0.18, 0], s: [0.75, 0.42, 0.95] }); for (let k = 0; k < 5; k++) b.add(G.sphere(0.12, 6, 4), '#9fd09a', { p: [Math.cos(k * 1.25) * 0.15, 0.36, Math.sin(k * 1.25) * 0.2], s: [1, 0.3, 1] }); for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) b.add(G.sphere(0.08, 6, 4), '#c6d6a0', { p: [sx * 0.3, 0.08, sz * 0.32], s: [1.2, 0.6, 1.4] }); }, [0, 0, 0]),
    part((b) => { b.add(G.sphere(0.11, 8, 6), '#c6d6a0', { p: [0, 0, 0.06] }); }, [0, 0.15, 0.45], 'head'),
  ],
};

export default fiche('ANI-009', 'tortue', 'Tortue', species('tortue', espece));
