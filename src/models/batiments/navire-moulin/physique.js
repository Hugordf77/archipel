// Physique : tour-moulin centrale du navire-forteresse (BAT-017).
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le repère de
// la tour (pied au centre du socle, ailes vers +Z, porte vers −Z). Intérieur non visitable : aucun plancher.

// socle de pierre (côté, haut) ; étages en tronc de pyramide : bas, haut, côté au pied s et en tête t (t = côté
// du suivant + 0,06 : la silhouette s'affine sans marche, de 6 à 4 m)
export const SOCLE = { c: 6.4, h: 0.4 };
export const ETAGES = [
  { y0: 0.4, y1: 3.3, s: 6.0, t: 5.5 },
  { y0: 3.3, y1: 6.0, s: 5.44, t: 4.98 },
  { y0: 6.0, y1: 8.6, s: 4.92, t: 4.46 },
  { y0: 8.6, y1: 11.0, s: 4.4, t: 3.96 },
];
// galerie à garde-corps au plancher du dernier étage ; cou ; tête de bois ; moyeu des ailes (≈ 14 m au-dessus
// du pont, corps jusqu'à ≈ 16 m : memory.md §6.4)
export const GALERIE = { y: 8.6, demi: 3.1, haut: 1.05 };
export const COU = { y0: 11.1, s: 3.96, t: 3.0 };
export const TETE = { y0: 12.6, y1: 14.5, faite: 15.5, demi: 1.55, av: 3.0, ar: -4.2 };
export const MOYEU = [0, 13.9, 3.7];
export const R_AILE = 8;

const c = SOCLE.c / 2;
export default {
  // socle de 6,4 m : un grand cercle au centre, quatre aux angles et quatre au milieu des faces (les grandes
  // faces n'ont de sommets qu'aux coins : un seul cercle jusqu'au bord y déborderait, memory.md §13)
  obstacles: [
    [0, 0, 2.7],
    ...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => [sx * (c - 0.9), sz * (c - 0.9), 1.12]),
    ...[[0, -1], [1, 0], [0, 1], [-1, 0]].map(([sx, sz]) => [sx * (c - 0.9), sz * (c - 0.9), 1.12]),
  ],
};
