// Physique : moulin-tour du plateau (BAT-013).
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle (pied de la tour à l'origine, ailes vers +Z, annexe vers +X, maisonnette vers −Z).

// maisonnette : centre et demi-largeur du passage voûté (le long de X) ; les cercles des piédroits
// s'arrêtent à PASSAGE + 0,03 de l'axe, ce qui laisse 2,5 m libres (≥ 2,4 m demandés)
export const MAISONNETTE = [2.1, -5.0];
export const PASSAGE = 1.22;
const [mx, mz] = MAISONNETTE;
// piédroits : trois cercles de chaque côté, bord intérieur à PASSAGE + 0,03 de l'axe
const R_PIEDROIT = 0.45;
const piedroits = [];
for (const sz of [-1, 1]) for (const dx of [-1.1, -0.05, 1.05]) piedroits.push([mx + dx, mz + sz * (PASSAGE + 0.03 + R_PIEDROIT), R_PIEDROIT]);

export default {
  obstacles: [
    // tour (socle de 3 m de côté) et avancée à pignon sur +Z : trois grands cercles qui se recouvrent, un
    // petit à l'angle −X −Z
    [0, 0, 1.72], [0, 0.9, 1.72], [1.1, 0, 1.72], [-1.4, -1.4, 0.45],
    // annexe accolée à la face +X (x 1,3 à 4,0 ; z −1,45 à 1,45) : un grand cercle, deux aux angles du pignon
    [2.5, 0, 1.72], [3.5, -1.1, 0.75], [3.6, 1.1, 0.65],
    // maisonnette : piédroits de part et d'autre du passage
    ...piedroits,
  ],
};
