// Physique : Palmier (ARB-007).
// Données pures, sans import (lisibles par le Worker) : encombrement r (m), le rayon que gardent
// libre la génération des îles et la navigation (obstacle) autour du pied ; grimpe : le stipe, pour
// grimper (format dans docs/modeles-arborescence.md).
//
// Stipe de palmier() : points (t^1,6 · 0,75 ; 4,2 t ; 0), t = i / 6. Le tronçon i va du rayon
// 0,2 − 0,012 i (bas) à 0,19 − 0,012 (i + 1) (haut) : à chaque jonction, la moyenne des deux rayons
// (5 mm d'écart au plus), 0,2 au pied et 0,118 au sommet. Sommet : la base des palmes, où l'on fait
// le poirier.

export default {
  encombrement: 0.4,
  grimpe: {
    tronc: [
      [0, 0, 0, 0.2],
      [0.0427, 0.7, 0, 0.183],
      [0.1293, 1.4, 0, 0.171],
      [0.2474, 2.1, 0, 0.159],
      [0.392, 2.8, 0, 0.147],
      [0.5602, 3.5, 0, 0.135],
      [0.75, 4.2, 0, 0.118],
    ],
    sommet: { y: 4.2, pose: 'poirier' },
  },
};
