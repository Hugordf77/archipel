// Escargot géant (ANI-023) : pied crème, coquille lilas en spirale et deux cornes.
import { G } from '../../../render/builder.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

export const espece = {
  speed: 0.12, scale: 1,
  parts: () => [part((b) => { b.add(G.sphere(0.2, 8, 6), '#e6d6c2', { p: [0, 0.08, 0.1], s: [0.8, 0.5, 2] }); b.add(G.torus(0.18, 0.1, 8, 14), '#c7b2e6', { p: [0, 0.32, -0.05], r: [0, Math.PI / 2, 0] }); b.add(G.sphere(0.12, 8, 6), '#e2a5c9', { p: [0, 0.32, -0.05] }); for (const sx of [-1, 1]) b.add(G.cyl(0.012, 0.012, 0.18, 4), '#e6d6c2', { p: [sx * 0.05, 0.2, 0.42], r: [0.4, 0, 0] }); }, [0, 0, 0])],
};

export default fiche('ANI-023', 'escargot', 'Escargot géant', species('escargot', espece));
