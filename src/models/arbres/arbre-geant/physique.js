// Physique : arbre géant (ARB-015).
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle (pied à l'origine, face vers +Z).

// tronc : pied du champignon plus fin que celui du chêne et du sapin
export default { obstacles: (p) => [[0, 0, (p.kind || 'chene') === 'champi' ? 1.6 : 2.0]] };
