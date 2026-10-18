// Physique : maison de village (BAT-001).
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle (pied à l'origine, face vers +Z).

// murs des trois tailles (petite, moyenne, grande), en mètres : la maison les dessine, l'obstacle les
// couvre (cercle de 0,55 fois le plus grand côté)
export const MURS = { w: [3.2, 3.8, 4.6], d: [3.0, 3.4, 4.0] };

export default {
  obstacles: (p) => {
    const v = p.v || 0;
    return [[0, 0, Math.max(MURS.w[v], MURS.d[v]) * 0.55]];
  },
};
