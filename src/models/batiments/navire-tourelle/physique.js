// Physique : tourelle du navire-forteresse (BAT-016).
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le repère de
// la tourelle (pied au centre, porte vers +Z). Intérieur non visitable : aucun plancher.

// socle de pierre (rayon, haut) et fût en encorbellement sur consoles (rayon, bas, haut)
export const SOCLE = { r: 1.7, h: 2.2 };
export const FUT = { r: 1.95, y0: 2.3, y1: 7.0 };

export default {
  // un cercle au pied : le socle (1,7 m), son empattement et le chambranle de sa porte ; à 5 % sous le rayon
  // du fût, qui déborde au-dessus de 1,85 m (consoles)
  obstacles: [[0, 0, 1.85]],
};
