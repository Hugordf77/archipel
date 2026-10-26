// Physique : nef effondrée du plateau (MON-014).
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] et planchers marchables
// { x0, z0, x1, z1, w, y0, y1 } en mètres, dans le repère du modèle (pied à l'origine, axe de la nef le
// long de Z, entrée vers +Z, chevet vers −Z). Le plan de la ruine, partagé avec le constructeur, vit ici.

// dallage de la nef : trois contremarches de 0,3 m au-dessus du sol (deux marches devant, puis le bord) ;
// grandes dalles au milieu, bordure de pavés de BORD m de large sous les colonnes
export const CONTRE = 0.3;
export const GIRON = 0.45;
export const NEF = 3 * CONTRE;
export const DALLAGE = { x: 3.3, z0: -6.0, z1: 4.0, bord: 0.5 };
// chevet : mur plein sur toute la largeur, du sol, pignon brisé ; grande baie haute à meneau
export const CHEVET = { x0: -3.9, x1: 3.9, z: -6.45, ep: 0.9, assise: 0.6 };
export const VITRAIL = { xc: 0, yb: NEF + 1.7, ys: 4.7, w: 0.85, R: 1.7, t: 0.32 };
// façade d'entrée posée sur le dallage, sur toute sa largeur ; portail ogival effondré (3,2 m d'ouverture)
export const FACADE = { x0: -DALLAGE.x, x1: DALLAGE.x, z: 3.6, ep: 0.8, assise: 0.55 };
export const PORTAIL = { xc: 0, yb: NEF, ys: NEF + 2.5, w: 1.6, R: 2.6, t: 0.4 };
// colonnade : deux rangées de quatre colonnes (x = ±X), fût de rayon r, colonnes entières de HAUT m ;
// hauteurs par colonne (avant → chevet), la colonne est brisée sous HAUT
export const COLONNES = { X: 2.55, Z: [2.2, -0.2, -2.6, -5.0], r: 0.24, HAUT: 4.2, gauche: [4.2, 4.2, 4.2, 1.5], droite: [4.2, 2.3, 0.8, 4.2] };
// arcade qui court sur les trois premières colonnes de gauche : deux arcs brisés, mur de 0,58 m
export const ARCADE = { y0: NEF + COLONNES.HAUT, ep: 0.58, assise: 0.5, arcs: [1.0, -1.4], w: 0.86, R: 1.45, t: 0.3 };
// contrefort à degrés derrière l'angle gauche du chevet (le long de Z), côté du pignon resté haut
export const CONTREFORTS = [{ x: -3.4, z0: -7.85, z1: -6.9, ep: 0.85 }];
// escalier d'entrée : monte vers −Z jusqu'au dallage
export const ESC = { xc: 0, l: 3.2, zPied: DALLAGE.z1 + 2 * GIRON, dir: -1, n: 2 };
// tambours de colonnes tombés [x, y0, z, longueur, cap] : au sol à droite, sur le dallage entre deux
// colonnes de droite (hors du passage)
export const TAMBOURS = [[4.55, 0, 0.7, 0.95, 0.5], [2.98, NEF, 1.0, 0.75, Math.PI / 2]];
// chapiteau tombé [x, z]
export const CHAPITEAU = [4.25, 2.7];
// éboulis [x, z, taille]
export const EBOULIS = [
  [-4.5, 2.5, 0.7], [4.5, 3.6, 0.6], [-4.6, -1.6, 0.55], [4.4, -3.7, 0.65], [-1.3, -8.3, 0.6], [3.1, 5.5, 0.5],
  [-3.0, 5.4, 0.55],
];
// fougères [x, y, z, taille] : sur la bordure du dallage ou dans les éboulis (dans les cercles d'obstacle
// de ce qu'elles bordent)
export const FOUGERES = [
  [3.1, NEF, -1.4, 0.42], [-3.1, NEF, -3.8, 0.42], [3.1, NEF, -5.4, 0.45], [-4.5, 0, 2.5, 0.6], [3.1, 0, 5.5, 0.5],
  [-3.0, 0, 5.4, 0.5],
];

// rangée de cercles de rayon r centrés sur un segment, bouts compris, au pas d'au plus pas
function rang(x0, z0, x1, z1, r = 0.26, pas = 0.3) {
  const L = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.ceil(L / pas));
  return Array.from({ length: n + 1 }, (_, k) => [x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n, r]);
}
// mur le long de X (épaisseur ep, axe en z) : une rangée de cercles de rayon r sur chaque face
const mur = (x0, x1, z, ep, r = 0.26) => [...rang(x0, z - ep / 2, x1, z - ep / 2, r), ...rang(x0, z + ep / 2, x1, z + ep / 2, r)];
// mur le long de Z (épaisseur ep, axe en x)
const murZ = (x, z0, z1, ep) => [...rang(x - ep / 2, z0, x - ep / 2, z1), ...rang(x + ep / 2, z0, x + ep / 2, z1)];
const R = 0.26;
const pa = PORTAIL.w + R + 0.01;
const { X, Z } = COLONNES;
const xb = DALLAGE.x - 0.2;

export default {
  // chevet, façade hors du portail, bordure du dallage, colonnes, contreforts, tambours et éboulis ; rien
  // dans la nef (4,26 m libres entre les colonnes), dans le portail (3,22 m libres) ni sur l'escalier
  obstacles: [
    ...mur(CHEVET.x0, CHEVET.x1, CHEVET.z, CHEVET.ep, 0.2),
    ...mur(FACADE.x0, -pa, FACADE.z, FACADE.ep), ...mur(pa, FACADE.x1, FACADE.z, FACADE.ep),
    // bordure du dallage : une rangée sur la bande de pavés, du bord extérieur au joint des grandes dalles
    ...[-1, 1].flatMap((s) => rang(s * xb, DALLAGE.z0, s * xb, DALLAGE.z1, 0.32)),
    ...Z.flatMap((z) => [[-X, z, 0.42], [X, z, 0.42]]),
    ...CONTREFORTS.flatMap((c) => murZ(c.x, c.z0, c.z1, c.ep)),
    ...TAMBOURS.flatMap(([x, , z, L, cap]) => [-1, 1].map((s) => [x + s * Math.cos(cap) * L * 0.25, z - s * Math.sin(cap) * L * 0.25, 0.3])),
    [CHAPITEAU[0], CHAPITEAU[1], 0.36],
    ...EBOULIS.map(([x, z, s]) => [x, z, s * (s > 0.62 ? 0.7 : 0.8)]),
  ],
  // planchers : marches d'entrée, dallage de la nef (prêts pour le jeu)
  planchers: [
    ...Array.from({ length: ESC.n }, (_, k) => {
      const z0 = ESC.zPied - k * GIRON;
      return { x0: 0, z0, x1: 0, z1: z0 - GIRON, w: ESC.l - 0.06, y0: (k + 1) * CONTRE, y1: (k + 1) * CONTRE };
    }),
    { x0: 0, z0: DALLAGE.z1, x1: 0, z1: DALLAGE.z0 + 0.1, w: 2 * DALLAGE.x - 0.3, y0: NEF, y1: NEF },
  ],
};
