// Végétation et ressources des îles générées : table espèce → constructeur, un dossier par espèce ou par
// famille (arbres, plantes, rochers, corail). Chaque constructeur renvoie, en coordonnées locales (pied à
// l'origine) : { solid?, clumps?, crowns?, grass?, flower?, fieldFlower?, glow?, shadow? }
//   solid  : géométrie fusionnée (Builder) — tronc, fruits, rochers…
//   clumps : touffes de billboards (feuillages peints)
//   crowns : sphères d'ombre portée [x, y, z, r, aplatissement]
//   grass / flower / fieldFlower : rendus spéciaux (herbe, fleurs teintées par instance)
// L'encombrement de chaque espèce est dans le physique.js de son dossier (world/islands/gen/kinds.js).
import * as THREE from 'three';
import { buildClumpGeometry } from '../render/foliage.js';
import { tuftGeometry } from '../render/grass.js';
import { TABLES } from './kit/tables.js';
import { arbrePompon } from './arbres/arbre-pompon/index.js';
import { arbreFruitier } from './arbres/arbre-fruitier/index.js';
import { arbreCerisier } from './arbres/cerisier/index.js';
import { pin, pinGivre, sapinNeige } from './arbres/coniferes/index.js';
import { palmier } from './arbres/palmier/index.js';
import { arbuste, buissonBaies, buissonFleuri } from './plantes/buissons/index.js';
import { rocher, rocherMousse } from './rochers/blocs/index.js';
import { cactus, cactusFleur } from './plantes/cactus/index.js';
import { champiGeant } from './arbres/champignon-geant/index.js';
import { champiPetit, fougere } from './plantes/sous-bois/index.js';
import { cristal, filonCuivre, filonFer, obsidienne } from './rochers/mineraux/index.js';
import { corail } from './objets/lagon/index.js';
import { fleurs, fleurChamp, fieldFlowerGeometry, flowerGeometry } from './plantes/fleurs/index.js';
import { herbe } from './plantes/herbe/index.js';
import { souche, boisMort } from './rochers/bois/index.js';
import { bouleau } from './arbres/bouleau/index.js';
import { saule } from './arbres/saule/index.js';
import { erable } from './arbres/erable/index.js';
import { bambou } from './arbres/bambou/index.js';
import { tournesol, lavande, ble, potiron } from './plantes/champs/index.js';
import { roseau, nenuphar } from './plantes/bord-de-l-eau/index.js';
import { fougereArbo } from './arbres/fougere-arborescente/index.js';

// teintes posées par instance : les rochers et filons prennent la roche du biome,
// les champignons une couleur de chapeau
export const ROCKY = new Set(['rocher', 'rocher_mousse', 'filon_cuivre', 'filon_fer', 'obsidienne']);
export const CAP_COLORS = ['#e9a3c4', '#f2b8a0', '#c7b2e6', '#9fdcc8', '#f6d27a'].map((c) => new THREE.Color(c));

// espèce (world/islands/gen/kinds.js) → constructeur
const BUILDERS = {
  arbre_pompon: arbrePompon, arbre_fruitier: arbreFruitier, arbre_cerisier: arbreCerisier, pin, pin_givre: pinGivre, palmier,
  arbuste, buisson_baies: buissonBaies, rocher, rocher_mousse: rocherMousse, cactus, champi_geant: champiGeant,
  champi_petit: champiPetit, cristal, corail, fleurs, herbe, fougere,
  souche, bois_mort: boisMort, filon_cuivre: filonCuivre, filon_fer: filonFer, obsidienne, bouleau,
  saule, erable, sapin_neige: sapinNeige, bambou, tournesol, lavande,
  ble, roseau, nenuphar, buisson_fleuri: buissonFleuri, cactus_fleur: cactusFleur, fougere_arbo: fougereArbo,
  potiron, fleur_champ: fleurChamp,
};

const modelCache = new Map();
export function kindModel(kind) {
  let m = modelCache.get(kind);
  if (m) return m;
  m = BUILDERS[kind] ? BUILDERS[kind]() : {};
  if (m.clumps) m.clumpGeo = buildClumpGeometry(m.clumps, kind.length * 7 + 3);
  if (m.grass) m.grassGeo = tuftGeometry();
  if (m.flower) m.flowerGeo = flowerGeometry();
  if (m.fieldFlower) m.flowerGeo = fieldFlowerGeometry();
  modelCache.set(kind, m);
  return m;
}

// inscription au relais des tables (assemblage d'une espèce seule : catalogue, tests)
TABLES.vegetation = { kindModel, ROCKY, CAP_COLORS };
