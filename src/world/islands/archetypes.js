// Archétypes d'îles : chaque île a une identité (montagne, village, champs de fleurs…)
// choisie selon son biome, sa taille et sa graine. Module pur (Worker, jeu, tests).
import { mulberry32, weighted, pick } from '../../core/random.js';

// minR / maxR : rayon (m) dans lequel l'archétype a du sens
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
export const ARCHETYPE_IDS = Object.keys(ARCHETYPES);

// préférences par biome : [archétype, poids]
export const BIOME_ARCHETYPES = {
  prairie: [['fleurs', 3], ['village', 2.3], ['foret', 1.4], ['falaises', 1], ['jumelles', 0.8], ['curiosite', 1], ['montagne', 1.6]],
  pins: [['foret', 2.6], ['montagne', 3.2], ['falaises', 1.4], ['village', 1.3], ['jumelles', 0.6], ['curiosite', 0.8]],
  tropical: [['village', 1.8], ['foret', 2], ['falaises', 1], ['jumelles', 0.8], ['curiosite', 1], ['montagne', 1.3], ['lagon', 0.7]],
  dunes: [['dunes', 4], ['village', 1.4], ['curiosite', 1], ['falaises', 1], ['jumelles', 0.6]],
  volcan: [['cratere', 4], ['montagne', 2.4], ['falaises', 1], ['curiosite', 0.8]],
  glace: [['montagne', 3.2], ['falaises', 1.5], ['village', 1.2], ['curiosite', 1], ['jumelles', 0.6]],
  champignons: [['foret', 3], ['fleurs', 1.5], ['montagne', 1.2], ['curiosite', 1], ['jumelles', 0.6]],
  atoll: [['lagon', 4], ['curiosite', 1.2], ['jumelles', 0.8], ['village', 0.7]],
};

// archétypes possibles, du plus au moins désiré (tirage pondéré sans remise)
export function rankArchetypes(desc) {
  const rng = mulberry32(desc.seed ^ 0x0a7c4e7b);
  const list = (BIOME_ARCHETYPES[desc.biome] || BIOME_ARCHETYPES.prairie).filter(([id]) => {
    const a = ARCHETYPES[id];
    return desc.r >= a.minR && desc.r <= (a.maxR ?? Infinity);
  });
  const keyed = list.map(([id, w]) => {
    let ww = w;
    // les grandes îles portent montagnes et villages ; les toutes petites, une curiosité
    if (desc.big && (id === 'montagne' || id === 'village')) ww *= 2.2;
    if (desc.r < 45 && id === 'curiosite') ww *= 2.5;
    return [id, Math.pow(rng(), 1 / ww)];
  });
  keyed.sort((a, b) => b[1] - a[1]);
  const out = keyed.map(([id]) => id);
  // filet de sécurité : d'autres archétypes plausibles quel que soit le biome
  const ok = (id) => desc.r >= ARCHETYPES[id].minR && desc.r <= (ARCHETYPES[id].maxR ?? Infinity);
  const fallback = ['curiosite', 'foret', 'falaises', 'fleurs', 'jumelles', 'village', 'montagne'];
  // un îlot peut toujours être un banc de sable ou un petit lagon
  if (desc.biome === 'tropical' || desc.biome === 'atoll' || desc.biome === 'dunes' || desc.r < 50) fallback.push('lagon', 'dunes');
  for (const id of fallback) if (!out.includes(id) && ok(id)) out.push(id);
  return out;
}

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
