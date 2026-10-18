// Physique : mobilier des îles, par type.
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle (pied à l'origine, face vers +Z).

export default {
  linge: { obstacles: [] },
  lanterne: { obstacles: [[0, 0, 0.2]] },
  lanterne_pierre: { obstacles: [[0, 0, 0.35]] },
  banc: { obstacles: [[0, 0, 0.6]] },
  casiers: { obstacles: [[0.6, 0, 0.8]] },
};
