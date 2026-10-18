// Physique : jetée (STR-001).
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle (pied à l'origine, face vers +Z) ; planchers marchables { x0, z0, x1, z1, w, y0, y1 }.

// hauteur du platelage au-dessus de l'eau (m)
export const HAUTEUR = 0.85;

export default {
  obstacles: [],
  planchers: (p) => {
    const len = p.len || 12;
    return [{ x0: 0, z0: -0.5, x1: 0, z1: len, w: 2.2, y0: HAUTEUR + 0.07, y1: HAUTEUR + 0.07 }];
  },
};
