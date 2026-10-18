// Physique : pièces de chemin, par type.
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle (pied à l'origine, face vers +Z) ; planchers marchables { x0, z0, x1, z1, w, y0, y1 }.

// hauteur du tablier du pont (m)
export const TABLIER = 0.25;

// profil du pont de corde tendu de (x, y, z) à (x1, y1, z1) : longueur, dénivelé, flèche, et hauteur
// du tablier en t ∈ [0, 1] (le pont la dessine, le plancher la suit)
export function profilCorde(p) {
  const len = Math.hypot(p.x1 - p.x, p.z1 - p.z);
  const dy = (p.y1 ?? p.y) - p.y;
  const sag = Math.min(2.2, len * 0.06);
  const yAt = (t) => t * dy - Math.sin(t * Math.PI) * sag + 0.3;
  return { len, dy, sag, yAt };
}

export default {
  pont: {
    obstacles: [],
    planchers: (p) => {
      const len = p.len || 5;
      return [{ x0: -len / 2 - 0.6, z0: 0, x1: len / 2 + 0.6, z1: 0, w: 1.8, y0: TABLIER + 0.08, y1: TABLIER + 0.08, rel: true }];
    },
  },
  pont_corde: {
    obstacles: [],
    planchers: (p) => {
      const { len, sag, yAt } = profilCorde(p);
      return [{ x0: 0, z0: 0, x1: len, z1: 0, w: 1.3, y0: yAt(0) + 0.03, y1: yAt(1) + 0.03, sag }];
    },
  },
  escalier: { obstacles: [] },
  panneau: { obstacles: [[0, 0, 0.2]] },
};
