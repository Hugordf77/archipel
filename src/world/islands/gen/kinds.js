// Espèces végétales et minérales des îles. Les indices sont stables : les nouvelles
// espèces s'ajoutent à la fin. Module pur (Worker, jeu, tests).
import { ENCOMBREMENT } from '../../../models/physique.gen.js';

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

// rayon d'encombrement (m) : sert aussi d'obstacle de navigation ; lu dans le physique.js du dossier de
// chaque espèce (src/models/<catégorie>/<dossier>/physique.js, relevé par npm run modeles:index)
export const KIND_RADIUS = Object.fromEntries(KINDS.map((k) => [k, ENCOMBREMENT[k]]));

// grands arbres (repères de silhouette, ombres portées, abattage à la hache)
export const TREES = new Set(['arbre_pompon', 'arbre_fruitier', 'arbre_cerisier', 'pin', 'pin_givre', 'palmier', 'champi_geant', 'cactus', 'bois_mort', 'bouleau', 'saule', 'erable', 'sapin_neige', 'bambou', 'fougere_arbo', 'cactus_fleur']);
// petite végétation dense générée par tuile (vue de près seulement)
export const SMALL = new Set(['herbe', 'fleur_champ', 'roseau', 'ble', 'nenuphar', 'fleurs']);
