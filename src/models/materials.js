// Réglages des matériaux des modèles, partagés par le jeu et le catalogue des modèles :
// un modèle s'affiche partout avec le même rendu. Chaque entrée est passée (copiée) à
// toonMaterial, ou à foliageMaterial pour les feuillages.
import * as THREE from 'three';

export const MAT = Object.freeze({
  // végétation et ressources des îles (instanciées, teinte par instance)
  solid: { vertexColors: true, aId: true, tintMask: true, wind: 0.06, sway: true, rim: 0.9 },
  glow: { vertexColors: true, aId: true, tintMask: true, emissiveVColor: 0.4, emissiveNight: true },
  foliage: { color: 0xffffff, color2: 0xf2f7d8, vertexColors: true, wind: 0.11 },
  flower: { vertexColors: true, aId: true, tintMask: true, wind: 0.12, sway: true, outline: 0.5, rim: 0.5 },
  // lieux et structures des îles (géométrie fusionnée par île)
  struct: { vertexColors: true, aId: true, rim: 0.8, wind: 0.05, sway: true },
  structGlow: { vertexColors: true, aId: true, emissiveVColor: 0.9, emissiveNight: true },
  // île de départ : pièces fusionnées et vitres qui s'allument le soir
  home: { vertexColors: true, aId: true },
  homeGlass: { vertexColors: true, aId: true, emissive: 0xffa94a, emissiveNight: true, rim: 0.2 },
  // faune des îles (pièces instanciées) ; le pelage prend la robe de chaque animal ; ombres
  // ramenées vers un gris chaud (un pelage blanc ne vire pas au violet)
  fauna: { vertexColors: true, aId: true, tintMask: true, rim: 1.0, outline: 0.6, warmShadow: 0.6 },
  // faune de l'île de départ (l'identifiant de contour est ajouté par le jeu)
  gull: { vertexColors: true, rim: 1, pigment: 0.4 },
  crab: { vertexColors: true, rim: 1, pigment: 0.5 },
  butterfly: { vertexColors: true, rim: 0.6, pigment: 0.2, side: THREE.DoubleSide, outline: 0.5, tintMask: true },
  // raretés fleuries de l'île de départ
  lavender: { vertexColors: true, wind: 0.9, rim: 1 },
  wisteria: { vertexColors: true, wind: 0.35, rim: 1 },
  // objets tenus en main et flotteur de pêche
  tool: { vertexColors: true, aId: true, rim: 0.8 },
  bobber: { vertexColors: true, aId: true, rim: 0.5 },
});
