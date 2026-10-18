// Physique : décor de jardin achetable à l'échoppe, par article.
// Données pures, sans import : encombrement r (m), rayon de l'article posé sur l'île ; au-delà de
// 0,3 m il bloque aussi le passage (gameplay/decor.js).

export default {
  pierre: { encombrement: 0.45 },
  pot: { encombrement: 0.32 },
  cloture: { encombrement: 0.5 },
  lanterne: { encombrement: 0.3 },
  champi: { encombrement: 0.35 },
  nichoir: { encombrement: 0.3 },
  banc: { encombrement: 0.75 },
  fanions: { encombrement: 0.3 },
  hamac: { encombrement: 1.0 },
};
