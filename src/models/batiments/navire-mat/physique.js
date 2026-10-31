// Physique : mât et voile du navire-forteresse (BAT-018).
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le repère du
// mât (pied au centre, vergues le long de X, voiles bombées vers +Z). Aucun plancher.

// formes (memory.md §6.5) : hauteur du mât, vergues [hauteur, longueur, hauteur de la voile], hune
export const FORMES = [
  // 0 : grand mât de 18 m, deux vergues et deux voiles (basse voile et hunier), hune entre les deux
  { h: 18, vergues: [[9.6, 11.5, 5.0], [15.6, 9.0, 4.2]], hune: 10.7 },
  // 1 : petit mât de 14 m, une vergue
  { h: 14, vergues: [[11.6, 8.5, 5.0]], hune: 12.4 },
];
export const forme = (p) => FORMES[Math.min(FORMES.length - 1, Math.max(0, Math.round(p.forme ?? 0)))];
// collier de pied de mât (rayon) ; pieds des haubans, en arrière du mât, chacun sur un taquet de bois
export const PIED = 0.4;
export const HAUBANS = [[2.3, -0.5], [1.9, -1.4]].flatMap(([x, z]) => [[-x, z], [x, z]]);

export default {
  // un cercle au pied du mât, au rayon visible de son collier (memory.md §6.5 : 0,4 m), et un petit cercle
  // sur le taquet de chaque hauban (on ne traverse pas leur pied)
  obstacles: [[0, 0, 0.42], ...HAUBANS.map(([x, z]) => [x, z, 0.16])],
};
