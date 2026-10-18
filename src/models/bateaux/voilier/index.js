// Voilier (NAV-003) : coque crème bordée de corail, un mât et sa voile.
import { G } from '../../../render/builder.js';
import { WOOD_L, WOOD_D, hull, construire, boat } from '../commun.js';
import { fiche } from '../../kit/fiches.js';

export const caracteristiques = { name: 'Voilier', speed: 9, speedWind: 12, zone: Infinity, sail: true, hold: 0, len: 5.4, seat: [0, 0.5, -1.5], desc: 'Une voile à régler selon le vent : jusqu\'à 12 m/s au portant.' };

// mâts : [z, hauteur de voile, longueur de bôme]
export const MATS = [[0.7, 4.6, 2.2]];

export function dessin(b, { body, oars, m }) {
  hull(b, 5.4, 1.9, 0.7, '#fbf3e6', '#f19b86');
  b.add(G.box(1.4, 0.06, 2.6, 0.03), WOOD_L, { p: [0, 0.36, -0.2] });
  b.add(G.cyl(0.06, 0.08, 5.2, 10), WOOD_D, { p: [0, 2.9, 0.7] });
  b.add(G.cone(0.08, 0.2, 8), '#f19b86', { p: [0, 5.6, 0.7] });
  b.add(G.box(0.08, 0.5, 0.5, 0.02), WOOD_D, { p: [0, 0.0, -2.5] });
}

export default fiche('NAV-003', 'voilier', caracteristiques.name, boat('voilier', () => construire('voilier', caracteristiques, dessin, MATS)), { tags: ['monture', 'animé'] });
