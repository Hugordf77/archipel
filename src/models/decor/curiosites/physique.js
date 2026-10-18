// Physique : curiosités achetables à l'échoppe, par article.
// Données pures, sans import : encombrement r (m), rayon de l'article posé sur l'île ; au-delà de
// 0,3 m il bloque aussi le passage (gameplay/decor.js).

export default {
  telescope: { encombrement: 0.45 },
  moulin: { encombrement: 0.7 },
  arche: { encombrement: 0.25 },
  statue: { encombrement: 0.5 },
  fontaine: { encombrement: 0.95 },
};
