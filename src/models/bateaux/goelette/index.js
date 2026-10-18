// Goélette (NAV-004) : grande coque de bois, cabine, deux mâts et deux voiles.
import { G } from '../../../render/builder.js';
import { WOOD_L, WOOD_D, ROPE, hull, construire, boat } from '../commun.js';
import { fiche } from '../../kit/fiches.js';

export const caracteristiques = { name: 'Goélette', speed: 11, speedWind: 13, zone: Infinity, sail: true, hold: 24, len: 8, seat: [0, 1.0, -2.8], desc: 'Deux mâts, une cale de 24 emplacements, et toute la mer devant soi.' };

// mâts : [z, hauteur de voile, longueur de bôme]
export const MATS = [[1.4, 5.6, 2.6], [-0.4, 4.6, 2.2]];

export function dessin(b, { body, oars, m }) {
  hull(b, 8, 2.6, 1.0, '#e0b07e', '#9f6b48');
  b.add(G.box(2.0, 0.08, 6.2, 0.04), WOOD_L, { p: [0, 0.62, 0] });
  b.add(G.box(1.4, 0.9, 1.6, 0.08), '#f6ead2', { p: [0, 1.1, -2.2] });
  b.add(G.box(1.6, 0.12, 1.8, 0.05), '#86c6bb', { p: [0, 1.6, -2.2] });
  for (const z of [1.4, -0.4]) b.add(G.cyl(0.07, 0.09, 6.4, 10), WOOD_D, { p: [0, 3.8, z] });
  b.add(G.box(0.08, 0.7, 0.6, 0.02), WOOD_D, { p: [0, 0.2, -3.9] });
  b.add(G.cyl(0.03, 0.03, 2.2, 6), ROPE, { p: [0, 1.4, 3.6], r: [0.9, 0, 0] });
}

export default fiche('NAV-004', 'goelette', caracteristiques.name, boat('goelette', () => construire('goelette', caracteristiques, dessin, MATS)), { tags: ['monture', 'animé'] });
