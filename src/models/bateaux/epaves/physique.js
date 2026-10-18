// Physique : épaves (NAV-007, NAV-008).
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle (pied à l'origine, face vers +Z).

// trois cercles le long de la coque, à l'échelle de sa longueur
export default {
  obstacles: (p) => {
    const L = (p.len || 14) / 14;
    return [[0, -4 * L, 1.8 * L], [0, 0, 2 * L], [0, 4 * L, 1.8 * L]];
  },
};
