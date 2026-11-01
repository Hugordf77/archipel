// Physique : habillage de forteresse du navire (BAT-020).
// Données pures, sans import (lisibles par le Worker). Pièce posée à l'origine du navire, dans son repère
// (docs/forteresse-navire/memory.md §8).
//
// Ni obstacle ni plancher : échauguettes, maisonnettes et tuyaux sont accrochés au-dehors des flancs, à
// plus de 8 m du sol, et les créneaux sont posés sur la crête du pavois, au-dessus de son plancher étroit
// (navire-coque/physique.js, CRETE) que le joueur n'atteint pas depuis le pont.

export default {
  obstacles: [],
  planchers: [],
};
