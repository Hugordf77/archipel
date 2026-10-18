// Physique : canots, par type.
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle (pied à l'origine, face vers +Z).

export default {
  barque_amarree: { obstacles: [[0, 0, 1.2]] },
  // radeau démonté (v = 2) plus étalé que la coque
  barque_echouee: { obstacles: (p) => [[0, 0, (p.v || 0) === 2 ? 1.4 : 1.3]] },
};
