// Le Navire-forteresse du Plateau venté (docs/forteresse-navire/memory.md) : depuis le 01/11/2026, à la
// demande de l'utilisateur, il vole « style château ambulant » autour du plateau, en décor (on ne monte pas
// à bord). Données pures : éléments du navire (BAT-014 à BAT-020) et trajectoire de vol ; l'assemblage et
// l'animation sont dans NavireVolant.js.
//
// Repère du navire : origine sous la quille, sur l'axe ; proue vers +Z. Chaque élément { t, forme, dx, dz,
// dy, rot } : dy = hauteur du pont à son emplacement (tonture et ressauts du château et du gaillard
// compris), rot = rotation de l'élément dans le repère du navire (le modèle tourne de −rot, comme dans le
// montage du catalogue).
import { pont } from '../../models/batiments/navire-coque/physique.js';

const PI = Math.PI;
const sur = (t, forme, dx, dz, rot = 0) => ({ t, forme, dx, dz, dy: Math.round(pont(dz) * 1000) / 1000, rot });
const sol = (t, forme, extra = {}) => ({ t, forme, dx: 0, dz: 0, dy: 0, rot: 0, ...extra });

// variante du montage du 27/10/2026, gardée par l'utilisateur (§8, « Premier montage ») ; en vol : coque
// sans berceau, ni escalier (13) ni passerelle (14)
export const ELEMENTS = [
  sol('navire_coque', 0, { vol: true }), // 1 coque, sans berceau
  sur('navire_tourelle', 1, 0, 25.8), // 2 tourelle de proue (coupole de cuivre), sur le gaillard
  sur('navire_mat', 1, 0, 19.5), // 3 mât de misaine (petit)
  sur('navire_maison', 0, -3.1, 11.8), // 4 grande maison à pignon
  sur('navire_maison', 1, 5, 7, PI / 2), // 5 maison étroite et haute
  sur('navire_moulin', 0, 1, -1, -PI / 2), // 6 tour-moulin centrale
  sur('navire_maison', 2, -5, -6, -PI / 2), // 7 maison basse à appentis
  sur('navire_tourelle', 0, 6, -11), // 8 tourelle ronde d'ardoise
  sur('navire_mat', 0, 0, -15), // 9 grand mât
  sur('navire_maison', 1, -3.3, -25.3, -PI / 2), // 10 maison de poupe étroite, sur le château
  sur('navire_maison', 2, 4.4, -24.4, PI / 2), // 11 maison de poupe basse, sur le château
  sur('navire_mat', 1, 0.8, -30), // 12 mât d'artimon (petit)
  sol('navire_fort', 0), // 15 habillage de forteresse (échauguettes, créneaux, maisonnettes, tuyaux)
  sol('navire_machinerie', 0), // 16 hélices de poupe, rotors du château, linge, tonneaux, ancres, lanternes
];

// vol : un tour du plateau, centré sur le dôme (repère de la Grande Île), à altitude fixe (y absolu : le
// sol du plateau culmine à 71,2 m, les moulins-tours à ≈ 87 m ; la nacelle du beaupré pend 2,3 m sous
// l'origine), sens trigonométrique ; houle, roulis vers l'intérieur du virage, tangage
export const VOL = { centre: [644, 316], rayon: 190, y: 108, tour: 360, houle: 1.2, periodeHoule: 9, roulis: 0.05, tangage: 0.02 };

// état du navire au temps t (s) : position (repère de l'île), cap (rot, convention DIRZ de
// src/models/lieux.js : la proue va dans la direction rot), roulis et tangage (rad)
export function vol(t, V = VOL) {
  const a = (2 * PI * t) / V.tour;
  const h = (2 * PI * t) / V.periodeHoule;
  return {
    x: V.centre[0] + V.rayon * Math.cos(a),
    z: V.centre[1] + V.rayon * Math.sin(a),
    y: V.y + V.houle * Math.sin(h),
    rot: a + PI / 2,
    roulis: V.roulis + 0.015 * Math.sin(h * 0.7),
    tangage: V.tangage * Math.sin(h * 1.3),
  };
}
