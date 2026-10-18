// Pingouin (ANI-021) : dos sombre, ventre blanc, pattes et bec orange ; il se dandine.
import { G } from '../../../render/builder.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

export const espece = {
  speed: 0.5, scale: 0.8, waddle: true,
  parts: () => [
    part((b) => { b.add(G.sphere(0.3, 10, 8), '#4d4766', { p: [0, 0.4, 0], s: [0.85, 1.4, 0.8] }); b.add(G.sphere(0.27, 10, 8), '#fbf7f2', { p: [0, 0.38, 0.06], s: [0.75, 1.25, 0.7] }); for (const sx of [-1, 1]) b.add(G.sphere(0.07, 6, 4), '#f6b45e', { p: [sx * 0.1, 0.02, 0.08], s: [1, 0.4, 1.6] }); }, [0, 0, 0]),
    part((b) => { b.add(G.sphere(0.17, 10, 8), '#4d4766', {}); b.add(G.cone(0.04, 0.14, 5), '#f6b45e', { p: [0, -0.02, 0.17], r: [Math.PI / 2, 0, 0] }); }, [0, 0.85, 0.02], 'head'),
  ],
};

export default fiche('ANI-021', 'pingouin', 'Pingouin', species('pingouin', espece));
