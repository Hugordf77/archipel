// Physique : menhir (MON-009).
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle (pied à l'origine, face vers +Z).

// un seul obstacle au pied, au rayon de la dalle (variantes dressé, trapu, élancé)
const R = [0.6, 0.65, 0.55];
export default {
  obstacles: (p) => [[0, 0, R[(p.v || 0) % R.length]]],
};
