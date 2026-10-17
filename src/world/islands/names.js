// Noms d'îles générés en français (« Île des Trois Pins », « Atoll de la Brume »…).
import { mulberry32, pick } from '../../core/random.js';

const COMPLEMENTS = {
  prairie: ['des Coquelicots', 'aux Pâquerettes', 'des Prés Doux', 'des Brises', 'aux Lapins', 'des Cerisiers', 'du Trèfle', 'des Abeilles', 'du Moulin', 'des Papillons'],
  pins: ['des Trois Pins', 'des Pins Sages', 'de la Résine', 'aux Écureuils', 'des Mousses', 'des Grands Pins', 'du Hibou', 'de la Pomme de Pin'],
  tropical: ['des Cocotiers', 'aux Perroquets', 'des Mangues', 'du Lagon Bleu', 'des Hibiscus', 'des Tortues', 'du Soleil', 'des Ananas'],
  dunes: ['des Sables Roses', 'des Dunes', 'des Mirages', 'des Vents Chauds', 'aux Cactus', 'du Grand Sablier', 'des Caravanes'],
  volcan: ['des Braises', 'des Fumerolles', "de l'Obsidienne", 'du Mont Tiède', 'des Cendres', 'du Dragon Endormi'],
  glace: ['des Givres', 'des Cristaux', 'des Neiges', 'des Aurores', 'du Grand Froid', 'des Flocons', 'du Morse'],
  champignons: ['aux Lucioles', 'des Champignons Lune', 'des Spores', 'des Lanternes', 'du Bois Bleu', 'des Rêves'],
  atoll: ['de la Brume', 'des Coraux', 'aux Tortues', 'du Lagon', 'des Murmures', 'de la Nacre', 'des Raies'],
};

export function islandName(biome, radius, seed) {
  const rng = mulberry32(seed ^ 0x51ed270b);
  let kind;
  if (biome === 'atoll') kind = 'Atoll';
  else if (biome === 'volcan' && rng() < 0.5) kind = 'Mont';
  else if (radius < 48) kind = pick(rng, ['Îlot', 'Caye', 'Îlot']);
  else if (radius > 105) kind = pick(rng, ['Grande Île', 'Île']);
  else kind = pick(rng, ['Île', 'Île', 'Anse', 'Récif']);
  if (kind === 'Récif' && biome !== 'atoll' && biome !== 'tropical') kind = 'Île';
  const comp = pick(rng, COMPLEMENTS[biome] || COMPLEMENTS.prairie);
  // pas de « Mont du Mont Tiède »
  if (kind === 'Mont' && comp.includes('Mont')) kind = 'Île';
  return `${kind} ${comp}`;
}

// ---------------------------------------------------------------------------
// Noms v2 : le nom découle de l'archétype et des traits de l'île
const MOUNT = {
  pins: ['des Trois Pics', 'des Sapins', 'du Vent Froid', 'des Aigles', 'aux Écureuils'],
  glace: ['Blanc', 'des Neiges', 'de Givre', 'des Glaciers', 'des Aurores'],
  volcan: ['Fumant', 'des Braises', 'de Cendre', 'du Dragon Endormi'],
  prairie: ['Lavande', 'des Bergers', 'Vert', 'des Trois Pics', 'des Nuages'],
  tropical: ['des Nuages', 'des Perroquets', 'des Cascades'],
  champignons: ['des Spores', 'Lunaire', 'des Rêves'],
  dunes: ['Ocre', 'des Mirages'],
  atoll: ['Corail'],
};
// « de » élidé devant une voyelle (Village d'Anse-aux-Pommes) ; le h des noms d'ici est aspiré
const de = (name) => (/^[AEIOUÉÈÎÔ]/i.test(name) ? `d'${name}` : `de ${name}`);
const FLOWERS = { rose: 'Roses', jaune: 'Dorés', bleue: 'Bleus', blanche: 'Blancs', mauve: 'Mauves' };
const NAMES = {
  fleurs: (t, b, rng) => pick(rng, ['Île aux Mille Fleurs', `Les Prés ${FLOWERS[t.bloom]}`, `Île des Champs ${FLOWERS[t.bloom]}`, 'Île des Ruchers', 'Île des Butineuses']),
  foret: (t, b, rng) => pick(rng, b === 'champignons' ? ['Bois des Lanternes', 'Sylve aux Spores', 'Forêt des Rêves'] : b === 'tropical' ? ['Jungle des Perroquets', 'Forêt des Lianes', 'Île des Fougères'] : ['Forêt des Murmures', 'Île du Bois-Profond', 'Île de la Grande Futaie', 'Sylve aux Lucioles', 'Bois des Mousses']),
  cratere: (t, b, rng) => pick(rng, ['Cratère de Braise', 'Mont Fumant', 'Île du Lac de Feu', 'Cratère des Fumerolles']),
  falaises: (t, b, rng) => pick(rng, ['Falaises de Nacre', 'Cap des Mouettes', 'Île des Hautes Falaises', 'Les Aiguilles', 'Cap du Vent']),
  lagon: (t, b, rng) => pick(rng, ['Lagon Turquoise', 'Atoll aux Tortues', 'Récif des Coraux', 'Lagon des Raies', 'Atoll de la Nacre']),
  dunes: (t, b, rng) => pick(rng, ['Dunes du Mirage', 'Oasis des Palmes', 'Île des Sables Roses', 'Dunes de la Caravane']),
  jumelles: (t, b, rng) => pick(rng, ['Les Sœurs Jumelles', 'Îles Siamoises', 'Les Deux Galets', 'Îles des Deux Rives']),
  village: (t, b, rng) => (rng() < 0.5 ? `Île du Moulin ${t.mill.label}` : `Village ${de(t.village)}`),
  montagne: (t, b, rng) => {
    const comp = pick(rng, MOUNT[b] || MOUNT.pins);
    return `${pick(rng, ['Mont', 'Pic', 'Massif'])} ${comp}`;
  },
  curiosite: (t, b, rng) => ({
    phare: pick(rng, ['Îlot du Phare', 'Rocher du Vieux Phare', 'Îlot de la Lanterne']),
    epave_geante: `Anse de l'Épave ${pick(rng, ['Rousse', 'Bleue', 'Oubliée'])}`,
    arche: pick(rng, ['Île de l\'Arche', 'Rocher Percé', 'Île de la Porte']),
    rocher_baleine: 'Rocher de la Baleine',
    statue: pick(rng, ['Îlot du Géant Endormi', 'Île de la Statue']),
  })[t.landmark] || 'Îlot Curieux',
};

export function islandNameV2(desc, traits) {
  const rng = mulberry32(desc.seed ^ 0x2b7e1516);
  const fn = NAMES[traits.archetype];
  return fn ? fn(traits, desc.biome, rng) : islandName(desc.biome, desc.r, desc.seed);
}
