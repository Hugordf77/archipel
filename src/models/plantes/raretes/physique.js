// Physique : raretés fleuries de l'île de départ, par pièce.
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle ; bas : obstacle bas (on peut trébucher dessus en courant). Le jeu les pose
// autour de chaque pièce (world/home/flowers.js).

export default {
  lavandeGeante: { obstacles: [[0, 0, 0.6]], bas: true },
  // un pilier de chaque côté de l'arche
  archeGlycine: { obstacles: [[0, -1.25, 0.2], [0, 1.25, 0.2]] },
};
