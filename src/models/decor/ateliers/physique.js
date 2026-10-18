// Physique : ateliers achetables à l'échoppe, par article.
// Données pures, sans import : encombrement r (m), rayon de l'article posé sur l'île ; au-delà de
// 0,3 m il bloque aussi le passage (gameplay/decor.js).

export default {
  etabli: { encombrement: 0.7 },
  four: { encombrement: 0.62 },
  couture: { encombrement: 0.65 },
  chantier: { encombrement: 1.0 },
};
