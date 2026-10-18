// Physique : cercle de pierres (MON-004).
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle (pied à l'origine, face vers +Z).

// un obstacle par menhir, sur le cercle de 4 m
export default {
  obstacles: (p) => {
    const count = p.count || 8;
    const obs = [];
    for (let k = 0; k < count; k++) obs.push([Math.cos((k / count) * Math.PI * 2) * 4, Math.sin((k / count) * Math.PI * 2) * 4, 0.45]);
    return obs;
  },
};
