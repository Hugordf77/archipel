// Physique : mouillage, par type.
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle (pied à l'origine, face vers +Z).

export default {
  ancre: { obstacles: [[0, 0, 0.5]] },
  bouee_echouee: { obstacles: [] },
};
