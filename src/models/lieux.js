// Lieux des îles générées : table type → constructeur, un dossier par modèle ou par famille. Chaque
// constructeur reçoit l'élément p du plan d'île ({ t, x, z, rot, v, … }) et un hasard reproductible tiré de
// sa position ; il renvoie, en coordonnées locales (pied à l'origine, face vers +Z) :
//   { solid: Builder, glow?: Builder, anim?: [{ builder, pivot, axis, speed }], wheel?: Builder, light?,
//     obstacles: [[x, z, r]], decks: [{ x0, z0, x1, z1, w, y0, y1, sag }] }
// Obstacles et planchers viennent du physique.js de chaque dossier.
import * as THREE from 'three';
import { mulberry32 } from '../core/random.js';
import { TABLES } from './kit/tables.js';
import { maison } from './batiments/maison-village/index.js';
import { moulin } from './batiments/moulin/index.js';
import { moulinEau } from './batiments/moulin-eau/index.js';
import { moulinTour } from './batiments/moulin-tour/index.js';
import { navireCoque } from './batiments/navire-coque/index.js';
import { navireMaison } from './batiments/navire-maison/index.js';
import { navireTourelle } from './batiments/navire-tourelle/index.js';
import { navireMoulin } from './batiments/navire-moulin/index.js';
import { navireMat } from './batiments/navire-mat/index.js';
import { navireEscalier } from './batiments/navire-escalier/index.js';
import { navireFort } from './batiments/navire-fort/index.js';
import { navireMachinerie } from './batiments/navire-machinerie/index.js';
import { etal } from './batiments/etal-marche/index.js';
import { tourGuet } from './batiments/tour-guet/index.js';
import { observatoire } from './batiments/observatoire/index.js';
import { phare } from './batiments/phare/index.js';
import { temple } from './batiments/temple/index.js';
import { cabane } from './batiments/cabane-ermite/index.js';
import { jetee } from './ouvrages/jetee/index.js';
import { pont, pontCorde, escalier, panneau } from './ouvrages/chemins/index.js';
import { puits } from './ouvrages/puits/index.js';
import { dirigeable } from './bateaux/dirigeable/index.js';
import { clotureChamp, potager, epouvantail, archeFleurie } from './ouvrages/champs/index.js';
import { bassinChaud } from './ouvrages/bassin-chaud/index.js';
import { arche } from './ouvrages/arche/index.js';
import { linge, lanterne, lanternePierre, banc, casiers } from './ouvrages/mobilier/index.js';
import { cascade } from './ouvrages/cascade/index.js';
import { ruines } from './monuments/ruines/index.js';
import { grotte } from './monuments/grotte/index.js';
import { cerclePierres } from './monuments/cercle-pierres/index.js';
import { menhir } from './monuments/menhir/index.js';
import { muretEffondre } from './monuments/muret-effondre/index.js';
import { archeBasse } from './monuments/arche-basse/index.js';
import { ruinesAlternative } from './monuments/ruines-alternative/index.js';
import { statue } from './monuments/statue-geante/index.js';
import { totem, autel, cairn } from './monuments/curiosites/index.js';
import { barqueAmarree, barqueEchouee } from './bateaux/canots/index.js';
import { epave } from './bateaux/epaves/index.js';
import { ancre, boueeEchouee } from './bateaux/mouillage/index.js';
import { coffre } from './objets/coffre/index.js';
import { tonneaux, charrette, nid, cercleChampi, nichoir } from './objets/curiosites/index.js';
import { feuCamp, tente } from './objets/campement/index.js';
import { ruche } from './objets/ruche/index.js';
import { recif } from './objets/lagon/index.js';
import { boisPile, rondin } from './rochers/bois/index.js';
import { fleurGeante } from './plantes/fleur-geante/index.js';
import { arbreGeant } from './arbres/arbre-geant/index.js';

// type de lieu (champ t du plan d'île) → constructeur (p, hasard)
const LIEUX = {
  // bâtiments
  maison, moulin, moulin_eau: moulinEau, moulin_tour: moulinTour, navire_coque: navireCoque, navire_maison: navireMaison, navire_tourelle: navireTourelle, navire_moulin: navireMoulin, navire_mat: navireMat, navire_escalier: navireEscalier, navire_fort: navireFort, navire_machinerie: navireMachinerie, etal, tour_guet: tourGuet, observatoire, phare, temple, cabane,
  // ouvrages et aménagements
  jetee, pont, pont_corde: pontCorde, escalier, panneau, puits, cloture_champ: clotureChamp, potager, epouvantail,
  arche_fleurie: archeFleurie, bassin_chaud: bassinChaud, arche, linge, lanterne, lanterne_pierre: lanternePierre, banc,
  banc_vue: banc, casiers, cascade,
  // ruines et monuments
  ruines, grotte, cercle_pierres: cerclePierres, statue, totem, autel, cairn,
  menhir, muret_effondre: muretEffondre, arche_basse: archeBasse, ruines_alternative: ruinesAlternative,
  // bateaux et épaves
  barque_amarree: barqueAmarree, barque_echouee: barqueEchouee, epave: (p) => epave(p), epave_geante: (p) => epave(p, true),
  ancre, bouee_echouee: boueeEchouee,
  // objets, bois, plantes et arbres
  coffre, coffre_cache: coffre, tonneaux, charrette, nid, cercle_champi: cercleChampi, nichoir, feu_camp: feuCamp, tente,
  ruche, recif, bois_pile: boisPile, rondin, fleur_geante: fleurGeante, arbre_geant: arbreGeant,
  // ciel
  dirigeable,
};
export const TYPES_DE_LIEUX = Object.keys(LIEUX);

// sens des rotations : 'face' (rotation.y = rot), 'dirz' (+Z vers l'angle rot), 'dirx' (+X vers l'angle rot)
const DIRZ = new Set(['jetee', 'barque_amarree', 'epave', 'epave_geante', 'barque_echouee', 'phare', 'arche', 'grotte', 'tente', 'etal', 'banc', 'banc_vue', 'statue', 'moulin', 'coffre', 'casiers', 'potager', 'cascade', 'menhir', 'arche_basse', 'moulin_tour', 'ruines_alternative', 'navire_coque', 'navire_maison', 'navire_tourelle', 'navire_moulin', 'navire_mat', 'navire_escalier', 'navire_fort', 'navire_machinerie', 'dirigeable']);
const DIRX = new Set(['pont_corde', 'pont', 'escalier', 'linge', 'cloture_champ', 'moulin_eau', 'rondin', 'muret_effondre']);
export function rotY(t, rot) {
  if (DIRZ.has(t)) return Math.PI / 2 - rot;
  if (DIRX.has(t)) return -rot;
  return rot;
}

// élément → modèle local
export function partModel(p) {
  const rng = mulberry32(Math.round(p.x * 31 + p.z * 17) >>> 0);
  return Object.hasOwn(LIEUX, p.t) ? LIEUX[p.t](p, rng) : null;
}

// maisons et moulins sont partagés en blanc : toit (marqueur de teinte 1) et murs (0,5)
// prennent ici la couleur de l'élément, sommets [i0, i1) des tampons color / aTint
const RECOLOR = new Set(['maison', 'moulin']);
const _cr = new THREE.Color();
const _cw = new THREE.Color();
export function recolorPart(p, C, T, i0, i1) {
  if (!RECOLOR.has(p.t)) return;
  const roof = p.t === 'maison' ? p.roof : p.color;
  _cr.set(roof || '#ffffff');
  _cw.set(p.wall || '#ffffff');
  for (let i = i0; i < i1; i++) {
    const c = T[i] > 0.75 ? _cr : T[i] > 0.25 ? _cw : null;
    if (!c) continue;
    C[i * 3] *= c.r;
    C[i * 3 + 1] *= c.g;
    C[i * 3 + 2] *= c.b;
  }
}

// inscription au relais des tables (assemblage d'un lieu seul : catalogue, tests)
TABLES.lieux = { partModel, recolorPart };
