// Physique : aménagements des champs, par type.
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle (pied à l'origine, face vers +Z).

export default {
  cloture_champ: { obstacles: [] },
  potager: { obstacles: [[0, 0, 1.0]] },
  epouvantail: { obstacles: [[0, 0, 0.3]] },
  arche_fleurie: { obstacles: [[-1.1, 0, 0.2], [1.1, 0, 0.2]] },
};
