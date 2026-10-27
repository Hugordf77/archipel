// Physique : maison de pont du navire-forteresse (BAT-015).
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le repère de
// la maison (pied au centre de l'emprise, façade et porte vers +Z, côté de la rue). Intérieur non
// visitable : aucun plancher.

// formes (memory.md §6.2) : L le long de X (façade), P le long de Z ; niveaux [bas, haut] ; encorbellement
// des étages sur la façade et le dos ; faîtage
export const SOCLE = 0.3;
export const FORMES = [
  // 0 : grande à pignon (rez de bois, un étage à colombages, combles sous un toit de mousse à pignon sur rue)
  { L: 9, P: 7, niveaux: [[SOCLE, 3.2], [3.2, 6.0]], encorbellement: 0.25, faite: 10.5, toit: 'pignon' },
  // 1 : étroite et haute (rez de bois, deux étages à colombages, toit pointu d'ardoise)
  { L: 5, P: 5, niveaux: [[SOCLE, 3.0], [3.0, 5.6], [5.6, 8.2]], encorbellement: 0.2, faite: 13.5, toit: 'pointu' },
  // 2 : basse à appentis (rez de bois, toit d'une seule pente adossé, haut sur le dos)
  { L: 7, P: 4, niveaux: [[SOCLE, 3.2]], encorbellement: 0, faite: 4.6, toit: 'appentis' },
];
export const forme = (p) => FORMES[Math.min(FORMES.length - 1, Math.max(0, Math.round(p.forme ?? 0)))];

// obstacles : grille de cercles de 1,2 m sur l'emprise du rez, centres à 0,92 m en retrait des murs (ils
// débordent de 0,28 m au plus) et espacés de 1,7 m au plus (r √2 : aucun trou)
const R = 1.2;
const RETRAIT = 0.92;
function grille(L, P) {
  const axe = (n) => {
    const k = Math.max(1, Math.ceil((n - 2 * RETRAIT) / 1.7));
    return Array.from({ length: k + 1 }, (_, i) => -n / 2 + RETRAIT + ((n - 2 * RETRAIT) * i) / k);
  };
  const r2 = (v) => Math.round(v * 100) / 100;
  // petits cercles aux quatre coins du socle, que la grille ne couvre pas
  const coins = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [r2(sx * (L / 2 - 0.3)), r2(sz * (P / 2 - 0.3)), 0.55]));
  return [...axe(L).flatMap((x) => axe(P).map((z) => [r2(x), r2(z), R])), ...coins];
}

export default {
  obstacles: (p) => {
    const f = forme(p);
    return grille(f.L, f.P);
  },
};
