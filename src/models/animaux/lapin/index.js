// Lapin (ANI-006) : corps rond et longues oreilles ; il se déplace par bonds.
import { G } from '../../../render/builder.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

export const espece = {
  speed: 1.6, scale: 0.5, hop: true, shy: 5,
  parts: () => [
    part((b) => { b.add(G.sphere(0.5, 10, 8), '#e6d6c2', { p: [0, 0.32, 0], s: [0.5, 0.48, 0.66] }); b.add(G.sphere(0.12, 6, 4), '#fffaf0', { p: [0, 0.38, -0.33] }); }, [0, 0, 0]),
    part((b) => { b.add(G.sphere(0.2, 10, 8), '#e6d6c2', { p: [0, 0, 0.08] }); for (const sx of [-1, 1]) b.add(G.sphere(0.08, 6, 5), '#e6d6c2', { p: [sx * 0.08, 0.27, 0], s: [0.6, 2.1, 0.5] }); }, [0, 0.55, 0.28], 'head'),
  ],
};

export default fiche('ANI-006', 'lapin', 'Lapin', species('lapin', espece));
