// Physique : petites découvertes, par type.
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle (pied à l'origine, face vers +Z).

export default {
  tonneaux: { obstacles: [[0.7, 0, 1.0]] },
  charrette: { obstacles: [[0, 0, 1.0]] },
  nid: { obstacles: [] },
  cercle_champi: { obstacles: [] },
  nichoir: { obstacles: [[0, 0, 0.2]] },
};
