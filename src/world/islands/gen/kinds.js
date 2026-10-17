// Espèces végétales et minérales des îles. Les indices sont stables : les nouvelles
// espèces s'ajoutent à la fin. Module pur (Worker, jeu, tests).
export const KINDS = [
  'arbre_pompon', 'arbre_fruitier', 'arbre_cerisier', 'pin', 'pin_givre', 'palmier', 'arbuste', 'buisson_baies',
  'rocher', 'rocher_mousse', 'cactus', 'champi_geant', 'champi_petit', 'cristal', 'corail', 'fleurs', 'herbe',
  'fougere', 'souche', 'bois_mort', 'filon_cuivre', 'filon_fer', 'obsidienne',
  // v2
  'bouleau', 'saule', 'erable', 'sapin_neige', 'bambou', 'tournesol', 'lavande', 'ble', 'roseau', 'nenuphar',
  'buisson_fleuri', 'cactus_fleur', 'fougere_arbo', 'potiron', 'fleur_champ',
];
export const KIND_INDEX = Object.fromEntries(KINDS.map((k, i) => [k, i]));
export const STRIDE = 7; // espèce, x, y, z, rotation, échelle, variante

// rayon d'encombrement (m) : sert aussi d'obstacle de navigation
export const KIND_RADIUS = {
  arbre_pompon: 0.55, arbre_fruitier: 0.55, arbre_cerisier: 0.55, pin: 0.5, pin_givre: 0.5, palmier: 0.4, arbuste: 0.5,
  buisson_baies: 0.5, rocher: 0.7, rocher_mousse: 0.7, cactus: 0.4, champi_geant: 0.6, champi_petit: 0, cristal: 0.45,
  corail: 0, fleurs: 0, herbe: 0, fougere: 0, souche: 0.35, bois_mort: 0.3, filon_cuivre: 0.6, filon_fer: 0.6, obsidienne: 0.55,
  bouleau: 0.4, saule: 0.6, erable: 0.55, sapin_neige: 0.5, bambou: 0.35, tournesol: 0, lavande: 0, ble: 0, roseau: 0,
  nenuphar: 0, buisson_fleuri: 0.45, cactus_fleur: 0.4, fougere_arbo: 0.45, potiron: 0.3, fleur_champ: 0,
};

// grands arbres (repères de silhouette, ombres portées, abattage à la hache)
export const TREES = new Set(['arbre_pompon', 'arbre_fruitier', 'arbre_cerisier', 'pin', 'pin_givre', 'palmier', 'champi_geant', 'cactus', 'bois_mort', 'bouleau', 'saule', 'erable', 'sapin_neige', 'bambou', 'fougere_arbo', 'cactus_fleur']);
// petite végétation dense générée par tuile (vue de près seulement)
export const SMALL = new Set(['herbe', 'fleur_champ', 'roseau', 'ble', 'nenuphar', 'fleurs']);
