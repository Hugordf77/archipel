// Généré par « npm run modeles:index » (scripts/modeles/index.mjs) : ne pas modifier à la main.
// Encombrement (m) de chaque espèce de la végétation, lu dans le physique.js de son dossier. Module pur,
// sans Three : le Worker le lit (world/islands/gen/kinds.js).
import arbres_arbre_fruitier from './arbres/arbre-fruitier/physique.js';
import arbres_arbre_pompon from './arbres/arbre-pompon/physique.js';
import arbres_bambou from './arbres/bambou/physique.js';
import arbres_bouleau from './arbres/bouleau/physique.js';
import arbres_cerisier from './arbres/cerisier/physique.js';
import arbres_champignon_geant from './arbres/champignon-geant/physique.js';
import arbres_coniferes from './arbres/coniferes/physique.js';
import arbres_erable from './arbres/erable/physique.js';
import arbres_fougere_arborescente from './arbres/fougere-arborescente/physique.js';
import arbres_palmier from './arbres/palmier/physique.js';
import arbres_saule from './arbres/saule/physique.js';
import plantes_bord_de_l_eau from './plantes/bord-de-l-eau/physique.js';
import plantes_buissons from './plantes/buissons/physique.js';
import plantes_cactus from './plantes/cactus/physique.js';
import plantes_champs from './plantes/champs/physique.js';
import plantes_fleurs from './plantes/fleurs/physique.js';
import plantes_herbe from './plantes/herbe/physique.js';
import plantes_sous_bois from './plantes/sous-bois/physique.js';
import rochers_blocs from './rochers/blocs/physique.js';
import rochers_bois from './rochers/bois/physique.js';
import rochers_mineraux from './rochers/mineraux/physique.js';
import objets_lagon from './objets/lagon/physique.js';

export const ENCOMBREMENT = {
  arbre_pompon: arbres_arbre_pompon.encombrement,
  arbre_fruitier: arbres_arbre_fruitier.encombrement,
  arbre_cerisier: arbres_cerisier.encombrement,
  pin: arbres_coniferes.pin.encombrement,
  pin_givre: arbres_coniferes.pin_givre.encombrement,
  sapin_neige: arbres_coniferes.sapin_neige.encombrement,
  palmier: arbres_palmier.encombrement,
  bouleau: arbres_bouleau.encombrement,
  saule: arbres_saule.encombrement,
  erable: arbres_erable.encombrement,
  bambou: arbres_bambou.encombrement,
  fougere_arbo: arbres_fougere_arborescente.encombrement,
  champi_geant: arbres_champignon_geant.encombrement,
  arbuste: plantes_buissons.arbuste.encombrement,
  buisson_baies: plantes_buissons.buisson_baies.encombrement,
  buisson_fleuri: plantes_buissons.buisson_fleuri.encombrement,
  cactus: plantes_cactus.cactus.encombrement,
  cactus_fleur: plantes_cactus.cactus_fleur.encombrement,
  fougere: plantes_sous_bois.fougere.encombrement,
  lavande: plantes_champs.lavande.encombrement,
  tournesol: plantes_champs.tournesol.encombrement,
  ble: plantes_champs.ble.encombrement,
  roseau: plantes_bord_de_l_eau.roseau.encombrement,
  nenuphar: plantes_bord_de_l_eau.nenuphar.encombrement,
  potiron: plantes_champs.potiron.encombrement,
  champi_petit: plantes_sous_bois.champi_petit.encombrement,
  fleurs: plantes_fleurs.fleurs.encombrement,
  fleur_champ: plantes_fleurs.fleur_champ.encombrement,
  herbe: plantes_herbe.encombrement,
  rocher: rochers_blocs.rocher.encombrement,
  rocher_mousse: rochers_blocs.rocher_mousse.encombrement,
  cristal: rochers_mineraux.cristal.encombrement,
  filon_cuivre: rochers_mineraux.filon_cuivre.encombrement,
  filon_fer: rochers_mineraux.filon_fer.encombrement,
  obsidienne: rochers_mineraux.obsidienne.encombrement,
  souche: rochers_bois.souche.encombrement,
  bois_mort: rochers_bois.bois_mort.encombrement,
  corail: objets_lagon.corail.encombrement,
};
