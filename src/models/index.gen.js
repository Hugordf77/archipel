// Généré par « npm run modeles:index » (scripts/modeles/index.mjs) : ne pas modifier à la main.
// Une entrée par dossier de modèle : sa fiche (ou celles de sa famille), avec son fichier source.
import batiments_bibliotheque_souche from './batiments/bibliotheque-souche/index.js';
import batiments_cabane_ermite from './batiments/cabane-ermite/index.js';
import batiments_chaumiere from './batiments/chaumiere/index.js';
import batiments_echoppe from './batiments/echoppe/index.js';
import batiments_etal_marche from './batiments/etal-marche/index.js';
import batiments_maison_village from './batiments/maison-village/index.js';
import batiments_moulin from './batiments/moulin/index.js';
import batiments_moulin_eau from './batiments/moulin-eau/index.js';
import batiments_observatoire from './batiments/observatoire/index.js';
import batiments_phare from './batiments/phare/index.js';
import batiments_temple from './batiments/temple/index.js';
import batiments_tour_guet from './batiments/tour-guet/index.js';
import monuments_cercle_pierres from './monuments/cercle-pierres/index.js';
import monuments_curiosites from './monuments/curiosites/index.js';
import monuments_grotte from './monuments/grotte/index.js';
import monuments_ruines from './monuments/ruines/index.js';
import monuments_statue_geante from './monuments/statue-geante/index.js';
import bateaux_barque from './bateaux/barque/index.js';
import bateaux_goelette from './bateaux/goelette/index.js';
import bateaux_radeau from './bateaux/radeau/index.js';
import bateaux_voilier from './bateaux/voilier/index.js';
import objets_flotteur_peche from './objets/flotteur-peche/index.js';
import animaux_abeille from './animaux/abeille/index.js';
import animaux_albatros from './animaux/albatros/index.js';
import animaux_canard from './animaux/canard/index.js';
import animaux_cerf from './animaux/cerf/index.js';
import animaux_chevre from './animaux/chevre/index.js';
import animaux_crabe from './animaux/crabe/index.js';
import animaux_ecureuil from './animaux/ecureuil/index.js';
import animaux_escargot from './animaux/escargot/index.js';
import animaux_faune_depart from './animaux/faune-depart/index.js';
import animaux_flamant from './animaux/flamant/index.js';
import animaux_grenouille from './animaux/grenouille/index.js';
import animaux_herisson from './animaux/herisson/index.js';
import animaux_hibou from './animaux/hibou/index.js';
import animaux_lapin from './animaux/lapin/index.js';
import animaux_lezard from './animaux/lezard/index.js';
import animaux_luciole from './animaux/luciole/index.js';
import animaux_mouette from './animaux/mouette/index.js';
import animaux_mouton from './animaux/mouton/index.js';
import animaux_papillon from './animaux/papillon/index.js';
import animaux_perroquet from './animaux/perroquet/index.js';
import animaux_phoque from './animaux/phoque/index.js';
import animaux_pingouin from './animaux/pingouin/index.js';
import animaux_poisson from './animaux/poisson/index.js';
import animaux_renard from './animaux/renard/index.js';
import animaux_tortue from './animaux/tortue/index.js';
import animaux_vache from './animaux/vache/index.js';
import personnage_accessoires from './personnage/accessoires/index.js';
import personnage_corps from './personnage/corps/index.js';
import personnage_coupes from './personnage/coupes/index.js';
import personnage_crayon from './personnage/crayon/index.js';
import personnage_outils from './personnage/outils/index.js';
import personnage_tenues from './personnage/tenues/index.js';

const avec = (f, source) => (Array.isArray(f) ? f : [f]).map((m) => ({ source, ...m }));

export const FICHES = [
  ...avec(batiments_bibliotheque_souche, 'src/models/batiments/bibliotheque-souche/index.js'),
  ...avec(batiments_cabane_ermite, 'src/models/batiments/cabane-ermite/index.js'),
  ...avec(batiments_chaumiere, 'src/models/batiments/chaumiere/index.js'),
  ...avec(batiments_echoppe, 'src/models/batiments/echoppe/index.js'),
  ...avec(batiments_etal_marche, 'src/models/batiments/etal-marche/index.js'),
  ...avec(batiments_maison_village, 'src/models/batiments/maison-village/index.js'),
  ...avec(batiments_moulin, 'src/models/batiments/moulin/index.js'),
  ...avec(batiments_moulin_eau, 'src/models/batiments/moulin-eau/index.js'),
  ...avec(batiments_observatoire, 'src/models/batiments/observatoire/index.js'),
  ...avec(batiments_phare, 'src/models/batiments/phare/index.js'),
  ...avec(batiments_temple, 'src/models/batiments/temple/index.js'),
  ...avec(batiments_tour_guet, 'src/models/batiments/tour-guet/index.js'),
  ...avec(monuments_cercle_pierres, 'src/models/monuments/cercle-pierres/index.js'),
  ...avec(monuments_curiosites, 'src/models/monuments/curiosites/index.js'),
  ...avec(monuments_grotte, 'src/models/monuments/grotte/index.js'),
  ...avec(monuments_ruines, 'src/models/monuments/ruines/index.js'),
  ...avec(monuments_statue_geante, 'src/models/monuments/statue-geante/index.js'),
  ...avec(bateaux_barque, 'src/models/bateaux/barque/index.js'),
  ...avec(bateaux_goelette, 'src/models/bateaux/goelette/index.js'),
  ...avec(bateaux_radeau, 'src/models/bateaux/radeau/index.js'),
  ...avec(bateaux_voilier, 'src/models/bateaux/voilier/index.js'),
  ...avec(objets_flotteur_peche, 'src/models/objets/flotteur-peche/index.js'),
  ...avec(animaux_abeille, 'src/models/animaux/abeille/index.js'),
  ...avec(animaux_albatros, 'src/models/animaux/albatros/index.js'),
  ...avec(animaux_canard, 'src/models/animaux/canard/index.js'),
  ...avec(animaux_cerf, 'src/models/animaux/cerf/index.js'),
  ...avec(animaux_chevre, 'src/models/animaux/chevre/index.js'),
  ...avec(animaux_crabe, 'src/models/animaux/crabe/index.js'),
  ...avec(animaux_ecureuil, 'src/models/animaux/ecureuil/index.js'),
  ...avec(animaux_escargot, 'src/models/animaux/escargot/index.js'),
  ...avec(animaux_faune_depart, 'src/models/animaux/faune-depart/index.js'),
  ...avec(animaux_flamant, 'src/models/animaux/flamant/index.js'),
  ...avec(animaux_grenouille, 'src/models/animaux/grenouille/index.js'),
  ...avec(animaux_herisson, 'src/models/animaux/herisson/index.js'),
  ...avec(animaux_hibou, 'src/models/animaux/hibou/index.js'),
  ...avec(animaux_lapin, 'src/models/animaux/lapin/index.js'),
  ...avec(animaux_lezard, 'src/models/animaux/lezard/index.js'),
  ...avec(animaux_luciole, 'src/models/animaux/luciole/index.js'),
  ...avec(animaux_mouette, 'src/models/animaux/mouette/index.js'),
  ...avec(animaux_mouton, 'src/models/animaux/mouton/index.js'),
  ...avec(animaux_papillon, 'src/models/animaux/papillon/index.js'),
  ...avec(animaux_perroquet, 'src/models/animaux/perroquet/index.js'),
  ...avec(animaux_phoque, 'src/models/animaux/phoque/index.js'),
  ...avec(animaux_pingouin, 'src/models/animaux/pingouin/index.js'),
  ...avec(animaux_poisson, 'src/models/animaux/poisson/index.js'),
  ...avec(animaux_renard, 'src/models/animaux/renard/index.js'),
  ...avec(animaux_tortue, 'src/models/animaux/tortue/index.js'),
  ...avec(animaux_vache, 'src/models/animaux/vache/index.js'),
  ...avec(personnage_accessoires, 'src/models/personnage/accessoires/index.js'),
  ...avec(personnage_corps, 'src/models/personnage/corps/index.js'),
  ...avec(personnage_coupes, 'src/models/personnage/coupes/index.js'),
  ...avec(personnage_crayon, 'src/models/personnage/crayon/index.js'),
  ...avec(personnage_outils, 'src/models/personnage/outils/index.js'),
  ...avec(personnage_tenues, 'src/models/personnage/tenues/index.js'),
];
