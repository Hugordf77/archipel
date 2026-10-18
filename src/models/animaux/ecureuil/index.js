// Écureuil (ANI-008) : corps dressé et queue en panache ; il se déplace par bonds.
import { G } from '../../../render/builder.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

export const espece = {
  speed: 1.5, scale: 0.4, hop: true, shy: 5,
  parts: () => [
    part((b) => { b.add(G.sphere(0.5, 10, 8), '#d4734a', { p: [0, 0.35, 0], s: [0.42, 0.55, 0.5] }); b.add(G.sphere(0.24, 8, 6), '#d4734a', { p: [0, 0.75, -0.35], s: [0.8, 1.6, 0.9] }); }, [0, 0, 0]),
    part((b) => { b.add(G.sphere(0.17, 10, 8), '#d4734a', {}); for (const sx of [-1, 1]) b.add(G.cone(0.05, 0.12, 4), '#d4734a', { p: [sx * 0.08, 0.16, 0] }); }, [0, 0.72, 0.15], 'head'),
  ],
};

export default fiche('ANI-008', 'ecureuil', 'Écureuil', species('ecureuil', espece));
