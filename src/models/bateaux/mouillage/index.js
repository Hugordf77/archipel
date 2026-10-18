// Mouillage : ancre échouée (NAV-009), bouée qui flotte (NAV-010, dessinée avec les objets de la mer,
// objets/mer) et bouée échouée (NAV-011).
import { Builder, G } from '../../../render/builder.js';
import { CREAM, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';
import { marine } from '../../objets/mer/index.js';

export function ancre() {
  const b = new Builder();
  b.add(G.cyl(0.07, 0.07, 1.6, 8), '#8a7a99', { p: [0, 0.12, 0], r: [Math.PI / 2, 0, 0.1] });
  b.add(G.torus(0.6, 0.08, 6, 14, Math.PI), '#8a7a99', { p: [0, 0.12, -0.75], r: [Math.PI / 2, 0, 0] });
  b.add(G.torus(0.18, 0.05, 6, 12), '#8a7a99', { p: [0, 0.1, 0.85], r: [Math.PI / 2, 0, 0] });
  return { solid: b, obstacles: lire(physique.ancre.obstacles) };
}

export function boueeEchouee() {
  const b = new Builder();
  b.add(G.torus(0.35, 0.12, 8, 16), '#f19b86', { p: [0, 0.1, 0], r: [Math.PI / 2 - 0.2, 0, 0] });
  b.add(G.torus(0.35, 0.125, 8, 4), CREAM, { p: [0, 0.1, 0], r: [Math.PI / 2 - 0.2, 0, 0.4] });
  return { solid: b, obstacles: lire(physique.bouee_echouee.obstacles) };
}

export default [
  fiche('NAV-009', 'ancre', 'Ancre', part('ancre'), { tags: ['curiosité'] }),
  fiche('NAV-010', 'bouee', 'Bouée', marine('bouee'), { tags: ['flotte'] }),
  fiche('NAV-011', 'bouee-echouee', 'Bouée échouée', part('bouee_echouee'), { tags: ['curiosité'] }),
];
