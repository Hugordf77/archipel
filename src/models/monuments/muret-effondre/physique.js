// Physique : muret effondré (MON-010).
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle (pied à l'origine, axe du mur le long de X, côté vent vers +Z).

// tracé du mur, partagé avec le constructeur : trois tronçons [x0, x1] le long de X, séparés par deux
// brèches de BRECHE m, pour une longueur hors tout len (12 à 24 m, 20 par défaut)
export const BRECHE = 2.2;
const PARTS = [0.36, 0.3, 0.34];
export function troncons(len = 20) {
  const reste = len - 2 * BRECHE;
  let x = -len / 2;
  return PARTS.map((f, k) => {
    const x0 = x;
    x += reste * f;
    const t = [x0, x];
    x += k < 2 ? BRECHE : 0;
    return t;
  });
}

// pierres tombées au pied du mur [x, z, longueur] : une pierre de la seconde assise par tronçon (côté
// alterné), et une pierre au pied de chaque bout tourné vers une brèche, hors du passage
export const EBOULIS_L = 0.75;
export function eboulis(len = 20) {
  const out = [];
  troncons(len).forEach(([x0, x1], k) => {
    const cote = k % 2 ? -1 : 1;
    out.push([x0 + (x1 - x0) * (0.3 + 0.2 * k), cote * 1.0, EBOULIS_L]);
    if (k > 0) out.push([x0 + 0.5, -cote * 0.85, 0.65]);
    if (k < 2) out.push([x1 - 0.5, cote * 0.85, 0.65]);
  });
  return out;
}

// cercles de 0,45 m le long de chaque tronçon (pas ≤ 0,55 m), rentrés de 0,3 m à chaque bout, et un
// cercle de 0,42 m par pierre tombée : aucun dans les brèches, qui restent libres sur BRECHE − 0,3 m
export default {
  obstacles: (p) => {
    const obs = [];
    for (const [x0, x1] of troncons(p.len || 20)) {
      const a = x0 + 0.3;
      const b = x1 - 0.3;
      const n = Math.max(1, Math.ceil((b - a) / 0.55));
      for (let k = 0; k <= n; k++) obs.push([a + ((b - a) * k) / n, 0, 0.45]);
    }
    for (const [x, z] of eboulis(p.len || 20)) obs.push([x, z, 0.42]);
    return obs;
  },
};
