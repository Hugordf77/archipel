// Grenouille (ANI-015) : corps vert et gros yeux ; elle se déplace par bonds.
import { G } from '../../../render/builder.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

export const espece = {
  speed: 1.2, scale: 0.35, hop: true,
  parts: () => [part((b) => { b.add(G.sphere(0.3, 10, 8), '#8fc79a', { p: [0, 0.18, 0], s: [1, 0.65, 1.1] }); for (const sx of [-1, 1]) { b.add(G.sphere(0.08, 8, 6), '#fffaf0', { p: [sx * 0.12, 0.38, 0.12] }); b.add(G.sphere(0.04, 6, 4), '#3d3049', { p: [sx * 0.12, 0.4, 0.18] }); b.add(G.sphere(0.12, 6, 4), '#7fbf86', { p: [sx * 0.24, 0.08, -0.1], s: [0.8, 0.5, 1.4] }); } }, [0, 0, 0])],
};

export default fiche('ANI-015', 'grenouille', 'Grenouille', species('grenouille', espece));
