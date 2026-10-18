// Physique : ruines (MON-001, MON-002).
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle (pied à l'origine, face vers +Z).

// deux rangées de trois colonnes, puis le pan de mur couché
const colonnes = [];
for (let k = 0; k < 6; k++) colonnes.push([(k % 3 - 1) * 2.6, k < 3 ? -2 : 2, 0.45]);

export default { obstacles: [...colonnes, [-2.6, 0, 0.6], [-2.6, 1, 0.6], [-2.6, -1, 0.6]] };
