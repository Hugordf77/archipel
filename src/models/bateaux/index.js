// Bateaux : API que le jeu importe (entities/Sailing.js, ui/mapPanel.js, app/Game.js).
import * as radeau from './radeau/index.js';
import * as barque from './barque/index.js';
import * as voilier from './voilier/index.js';
import * as goelette from './goelette/index.js';
import { construire } from './commun.js';

// vitesse (m/s), zone autorisée (m depuis l'île de départ ; au-delà, la limite de l'archipel),
// voile, cale (emplacements)
export const BOATS = { radeau: radeau.caracteristiques, barque: barque.caracteristiques, voilier: voilier.caracteristiques, goelette: goelette.caracteristiques };
export const BOAT_ORDER = ['radeau', 'barque', 'voilier', 'goelette'];

const PLANS = { radeau, barque, voilier, goelette };
// Retour : { group, body, sail (pivots des bômes) | null, oars [], seat Vector3, len }
export function buildBoat(type) {
  return construire(type, BOATS[type], PLANS[type].dessin, PLANS[type].MATS);
}
