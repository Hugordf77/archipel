// Le Navire-forteresse du Plateau venté (docs/forteresse-navire/memory.md §7 et §8) : un lieu, posé à la
// main au centre du dôme du plateau, fait de plusieurs éléments (BAT-014 à BAT-019). Données pures,
// importables par le Worker (seul import : la physique de la coque, elle-même sans import).
//
// Repère du navire : origine au pied du berceau, sur l'axe ; proue vers +Z, flanc de l'escalier vers +X.
// Chaque élément { t, forme, dx, dz, dy, rot } : dy = hauteur du pont à son emplacement (tonture et
// ressauts du château et du gaillard compris), rot = rotation de l'élément dans le repère du navire (le
// modèle tourne de −rot, comme dans le montage du catalogue). gen/pois.js (poserLieux) passe au monde :
// rot de l'élément = rot du navire + rot.
import { pont } from '../../models/batiments/navire-coque/physique.js';

const PI = Math.PI;
const sur = (t, forme, dx, dz, rot = 0) => ({ t, forme, dx, dz, dy: Math.round(pont(dz) * 1000) / 1000, rot });
const sol = (t, forme) => ({ t, forme, dx: 0, dz: 0, dy: 0, rot: 0 });

// variante du montage du 27/10/2026, gardée par l'utilisateur (§8, « Premier montage ») ; sans la
// passerelle (élément 14) : château et gaillard restent fermés par leurs rambardes (BAT-014)
export const ELEMENTS = [
  sol('navire_coque', 0), // 1 coque et berceau
  sur('navire_tourelle', 1, 0, 25.8), // 2 tourelle de proue (coupole de cuivre), sur le gaillard
  sur('navire_mat', 1, 0, 19.5), // 3 mât de misaine (petit)
  sur('navire_maison', 0, -3.1, 11.8), // 4 grande maison à pignon
  sur('navire_maison', 1, 5, 7, PI / 2), // 5 maison étroite et haute
  sur('navire_moulin', 0, 1, -1, -PI / 2), // 6 tour-moulin centrale, ailes au vent (5,25 − π/2 = 3,68)
  sur('navire_maison', 2, -5, -6, -PI / 2), // 7 maison basse à appentis
  sur('navire_tourelle', 0, 6, -11), // 8 tourelle ronde d'ardoise
  sur('navire_mat', 0, 0, -15), // 9 grand mât
  sur('navire_maison', 1, -3.3, -25.3, -PI / 2), // 10 maison de poupe étroite, sur le château
  sur('navire_maison', 2, 4.4, -24.4, PI / 2), // 11 maison de poupe basse, sur le château
  sur('navire_mat', 1, 0.8, -30), // 12 mât d'artimon (petit)
  sol('navire_escalier', 0), // 13 escalier du flanc +X, du sol au pont
];

// aplanissement : une file de plates-formes le long de l'axe (rayon 13 m : demi-largeur de 9 m, escalier
// jusqu'à x = 12,1), de la poupe à la proue
export const SITES = [-30, -20, -10, 0, 10, 20, 30].map((dz) => ({ dx: 0, dz, r: 13 }));

// emplacement (§7, option (b) tranchée le 27/10/2026) : centre du dôme, repère de la Grande Île ; navire
// tourné de 90° par rapport au vent (flanc au vent), escalier côté cercle de pierres. r : enveloppe du
// lieu (découverte à r + 15 m)
export const NAVIRE = { t: 'navire_coque', at: [644, 316], rot: 5.25, r: 34, nom: 'Le Navire-forteresse', elements: ELEMENTS, sites: SITES };

// repère du navire → repère de l'île (rotation du modèle de π/2 − rot autour de Y, convention DIRZ de
// src/models/lieux.js) : la proue (dz > 0) va dans la direction rot
export function versIle({ at: [cx, cz], rot }, dx, dz) {
  const [c, s] = [Math.cos(rot), Math.sin(rot)];
  return [cx + dz * c + dx * s, cz + dz * s - dx * c];
}
