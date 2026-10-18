// Radeau (NAV-001) : cinq rondins ficelés, une caisse, un petit mât à fanion.
import { G } from '../../../render/builder.js';
import { WOOD, WOOD_L, WOOD_D, ROPE, construire, boat } from '../commun.js';
import { fiche } from '../../kit/fiches.js';

export const caracteristiques = { name: 'Radeau', speed: 4, zone: 600, sail: false, hold: 0, len: 3.2, seat: [0, 0.42, -0.4], desc: 'Quelques rondins bien ficelés. Parfait pour les îles voisines.' };

export function dessin(b, { body, oars, m }) {
  for (let k = -2; k <= 2; k++) b.add(G.cyl(0.21, 0.21, 3.2, 12), k % 2 ? WOOD : WOOD_L, { p: [k * 0.4, 0.12, 0], r: [Math.PI / 2, 0, 0] });
  for (const z of [-1.1, 0, 1.1]) b.add(G.torus(0.98, 0.04, 5, 16), ROPE, { p: [0, 0.12, z], s: [1.05, 0.4, 1] });
  b.add(G.box(1.5, 0.08, 0.9, 0.03), WOOD_D, { p: [0, 0.36, -0.4] });
  b.add(G.cyl(0.05, 0.06, 1.8, 8), WOOD_D, { p: [0, 1.2, 0.8] });
  b.add(G.box(0.7, 0.42, 0.03, 0.01), '#f19b86', { p: [0.36, 1.85, 0.8], sway: 1 });
  b.add(G.box(0.12, 0.08, 1.2, 0.03), WOOD_D, { p: [0, 0.3, -1.9] });
}

export default fiche('NAV-001', 'radeau', caracteristiques.name, boat('radeau', () => construire('radeau', caracteristiques, dessin)), { tags: ['monture', 'animé'] });
