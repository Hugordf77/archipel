// Physique : campement, par type.
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle (pied à l'origine, face vers +Z).

export default {
  feu_camp: { obstacles: [[0, 0, 0.8]] },
  tente: { obstacles: [[0, 0, 1.3]] },
};
