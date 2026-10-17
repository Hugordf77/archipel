// Archétypes d'îles : chaque île de l'archipel a une identité (montagne, village, champs de
// fleurs…) ; ses traits (nom du village, couleur du moulin, curiosité) découlent de sa graine.
// Module pur (Worker, jeu, tests).
import { mulberry32, weighted, pick } from '../../core/random.js';

export const ARCHETYPES = {
  montagne: { name: 'Montagne', minR: 70 },
  village: { name: 'Île-village', minR: 52 },
  fleurs: { name: 'Champs de fleurs', minR: 30 },
  foret: { name: 'Forêt profonde', minR: 30 },
  cratere: { name: 'Cratère', minR: 36 },
  falaises: { name: 'Falaises', minR: 28 },
  lagon: { name: 'Lagon', minR: 0 },
  dunes: { name: 'Dunes', minR: 30 },
  jumelles: { name: 'Îles jumelles', minR: 58 },
  curiosite: { name: 'Îlot-curiosité', minR: 0, maxR: 72 },
};
export const MILL_COLORS = [['bleu', 'Bleu', '#7fa6d9'], ['rose', 'Rose', '#f2a7b8'], ['menthe', 'Menthe', '#8fd6c3'], ['jaune', 'Jaune', '#f2c86a'], ['corail', 'Corail', '#f4a28c']];
const VILLAGES = ['Brise-Lavande', 'Port-Galet', 'Bourg-Nacre', 'Val-Coquille', 'Anse-aux-Pommes', 'Clair-Moulin', 'Rive-Douce', 'Bel-Embrun', 'Pré-Salé', 'Sable-Doré', 'Mouette-sur-Mer', 'Petit-Varech', 'Haute-Brise', 'Port-Tilleul', 'Bourg-Lanterne', 'Pommeraie'];
// noms de navires avec leur article : « Épave de la Belle-Hortense », « Épave du Vent-Léger »
const WRECKS = ['la Belle-Hortense', 'le Vent-Léger', 'la Marie-Galante', 'la Petite-Sirène', "l'Albatros", 'la Douce-Étoile', 'le Coquelicot', 'le Grand-Pélican', 'la Nacre-Bleue', 'la Joyeuse'];

// Traits tirés de la graine, partagés par le nom de l'île et par son plan
export function islandTraits(desc, archetype) {
  const rng = mulberry32(desc.seed ^ 0x7a17c0de);
  const mill = pick(rng, MILL_COLORS);
  return {
    archetype,
    mill: { id: mill[0], label: mill[1], color: mill[2] },
    village: pick(rng, VILLAGES),
    wreck: pick(rng, WRECKS),
    landmark: archetype === 'curiosite' ? weighted(rng, [['phare', 1], ['epave_geante', 1], ['arche', 1], ['rocher_baleine', 0.8], ['statue', 0.6]]) : null,
    // couleur dominante des champs de fleurs et vent dominant (orientation des bandes, moulins)
    bloom: pick(rng, ['rose', 'jaune', 'bleue', 'blanche', 'mauve']),
    windAngle: rng() * Math.PI * 2,
  };
}
