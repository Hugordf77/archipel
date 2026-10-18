// Physique : bois, par type.
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle (pied à l'origine, face vers +Z) ; encombrement r (m) des espèces de la végétation.

export default {
  bois_pile: { obstacles: [[0, 0, 0.6]] },
  rondin: { obstacles: [[0, 0, 0.6]] },
  souche: { encombrement: 0.35 },
  bois_mort: { encombrement: 0.3 },
};
