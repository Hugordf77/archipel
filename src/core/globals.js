import * as THREE from 'three';

// Origine flottante : coordonnées absolues du point (0, 0, 0) de la scène.
// Tout le contenu du monde vit dans un groupe décalé de -ORIGIN ; la caméra,
// le ciel et l'océan restent en coordonnées locales (petites, donc précises).
export const ORIGIN = new THREE.Vector3();

// Uniformes globaux partagés par référence entre tous les matériaux :
// modifier U.uTime.value met à jour tous les shaders d'un coup.
export const U = {
  uTime: { value: 0 },
  // lumière / palette (mis à jour par le cycle jour-nuit)
  uSunDir: { value: new THREE.Vector3(0.3, 0.8, -0.4).normalize() },
  uSunColor: { value: new THREE.Color(1, 0.97, 0.88) },
  uSkyAmbient: { value: new THREE.Color(0.75, 0.85, 0.95) },
  uGroundAmbient: { value: new THREE.Color(0.85, 0.8, 0.7) },
  uShadowTint: { value: new THREE.Color(0.55, 0.55, 0.85) },
  uRimColor: { value: new THREE.Color(1, 0.9, 0.7) },
  uFogColor: { value: new THREE.Color(0.85, 0.93, 0.95) },
  uFogRange: { value: new THREE.Vector2(170, 3400) },
  uBands: { value: new THREE.Vector3(0.36, 0.55, 0.74) },
  uNight: { value: 0 },
  uSnow: { value: 0 },
  uWet: { value: 0 },
  uLanternPos: { value: Array.from({ length: 10 }, () => new THREE.Vector3(0, -999, 0)) },
  uLanternColor: { value: new THREE.Color(1.0, 0.72, 0.38) },
  // lot « lumière » (0 à 1, posés à chaque image par Pipeline selon settings et QUALITY)
  uRelief: { value: 0 },
  uBounce: { value: 0 },
  uBounceColor: { value: new THREE.Color(0.66, 0.87, 0.68) },
  uRimBoost: { value: 0 },
  uAerial: { value: 0 },
  // étalonnage par heure (cycle jour-nuit) : ombres, hautes lumières, plancher teinté,
  // contraste (x) et saturation (y)
  uGradeLow: { value: new THREE.Color(1, 1, 1) },
  uGradeHigh: { value: new THREE.Color(1, 1, 1) },
  uGradeLift: { value: new THREE.Color(0.06, 0.05, 0.1) },
  uGradeCS: { value: new THREE.Vector2(1, 1) },
  // monde courbé
  uCurveOrigin: { value: new THREE.Vector3() },
  uCurveDir: { value: new THREE.Vector2(0, -1) },
  uCurvature: { value: 0.000002 },
  uCurveSide: { value: 0.2 },
  // décalage absolu de l'origine (les bruits peints restent continus au recentrage)
  uWorldOffset: { value: ORIGIN },
  // vent
  uWindDir: { value: new THREE.Vector2(0.8, 0.35).normalize() },
  uWindStrength: { value: 1 },
  // ombres
  uShadowMap: { value: null },
  uShadowMatrix: { value: new THREE.Matrix4() },
  uShadowOn: { value: 0 },
  uShadowTexel: { value: new THREE.Vector2(1 / 2048, 1 / 2048) },
  // joueur (pour plier l'herbe)
  uPlayerPos: { value: new THREE.Vector3(0, -99, 0) },
  // terrain (hauteurs) pour l'eau
  uHeightTex: { value: null },
  uPathTex: { value: null },
  uHeightBounds: { value: new THREE.Vector4(-40, -40, 80, 80) },
  // fenêtre de hauteurs des îles générées autour du joueur (eau turquoise, écume)
  uDepthTex: { value: null },
  uDepthBounds: { value: new THREE.Vector4(1e7, 1e7, 1, 1) },
  // ciel
  uSkyTop: { value: new THREE.Color(0.5, 0.75, 0.95) },
  uSkyHorizon: { value: new THREE.Color(0.9, 0.95, 0.95) },
  uSunGlow: { value: new THREE.Color(1, 0.9, 0.7) },
  uStars: { value: 0 },
  uMoonDir: { value: new THREE.Vector3(-0.4, 0.6, -0.6).normalize() },
  uSunSkyDir: { value: new THREE.Vector3(0, 1, 0) },
  uHorizonDip: { value: 0.3 },
  uCloudRot: { value: 0 },
  // lot « ciel » (0 à 1, posés à chaque image par Pipeline) : voûte (voie lactée, étoiles), vie
  // (scintillement, étoiles filantes, étoile du berger), netteté (étoiles gardées nettes après la peinture)
  uVoute: { value: 0 },
  uVie: { value: 0 },
  uNettete: { value: 0 },
  // étoile du berger : direction en espace ciel, intensité (daycycle.js)
  uBerger: { value: new THREE.Vector4(0, 1, 0, 0) },
  uCloudLit: { value: new THREE.Color(1, 1, 1) },
  uCloudShade: { value: new THREE.Color(0.75, 0.75, 0.9) },
  // eau
  uWaterShallow: { value: new THREE.Color(0.55, 0.9, 0.85) },
  uWaterDeep: { value: new THREE.Color(0.2, 0.55, 0.75) },
  uSandColor: { value: new THREE.Color(0.95, 0.88, 0.7) },
  uRain: { value: 0 },
};

// Identifiants d'objets pour les contours (1..250 encodés en 0..1).
let idCounter = 7;
export function nextId() {
  idCounter = (idCounter * 37 + 11) % 251;
  if (idCounter === 0) idCounter = 1;
  return idCounter / 255;
}

// Identifiants réservés au joueur (jamais produits par nextId, qui s'arrête à 250) :
// la composition s'en sert pour garder le personnage net et l'encrer un peu plus
// fort. Les grandes masses ont chacune leur id pour que l'encre ne trace que
// leurs frontières (corps, cheveux, tête, membres).
export const CHAR_IDS = { body: 251 / 255, hair: 252 / 255, head: 253 / 255, limb: 254 / 255 };
export const CHAR_ID = CHAR_IDS.body;

export const LAYER_SHADOW = 1;
export const LAYER_OVERLAY = 2;
