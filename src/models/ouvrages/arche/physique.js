// Physique : arche (STR-011).
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle (pied à l'origine, face vers +Z).

// un obstacle par pilier
export default {
  obstacles: (p) => {
    const s = p.size || 1.2;
    return [[0, -3.2 * s, 1.8 * s], [0, 3.2 * s, 1.8 * s]];
  },
};
