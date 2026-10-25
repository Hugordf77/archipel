// Physique : arche basse (MON-011).
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle (pied à l'origine, passage le long de Z).

// un obstacle par montant ; entre les deux cercles, 2,66 m libres (chemin principal : 2,4 m)
export const MONTANT_X = 1.88;
export default { obstacles: [[-MONTANT_X, 0, 0.55], [MONTANT_X, 0, 0.55]] };
