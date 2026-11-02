// Physique : dirigeable (NAV-012), décor qui vole vers 400 m au-dessus de l'archipel.
// Données pures, sans import (lisibles par le Worker). Ni obstacle ni plancher : on ne l'approche qu'en
// vol, et il passe au-dessus de tout.

// dimensions communes (m) : ballon (longueur, rayon), nacelle (longueur, hauteur sous le ballon)
export const BALLON = { L: 60, R: 9 };
export const NACELLE = { L: 15, h: 3.2, ecart: 3.4 };
// centre du ballon au-dessus du pied (dessous de la nacelle)
export const Y_BALLON = NACELLE.h + NACELLE.ecart + BALLON.R;

// forme 2 : ballon du navire volant (BAT-014 à BAT-022), dans le repère du navire (origine sous la quille,
// proue vers +Z) : ballon de 96 m dont le ventre passe 6 m au-dessus du point le plus haut du navire
// (31,4 m, les mâts) ; câbles du ventre aux lisses (demi-largeur W et hauteur de lisse de la coque,
// navire-coque/physique.js : z −24, −6, 14)
export const NAVIRE = {
  L: 96,
  R: 14,
  y: 51.5,
  ancrages: [[-24, 8.5, 17.9], [-6, 9.0, 14.1], [14, 8.4, 14.2]],
};

export default {
  obstacles: [],
};
