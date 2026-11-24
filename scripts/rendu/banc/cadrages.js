// Cadrages fixes et nommés du banc de rendu (scripts/rendu/banc/banc.js). Coordonnées absolues du monde
// (mètres) ; le banc retire l'origine courante du monde, lue dans le jeu (__ile.U.uWorldOffset).
//   joueur : [x, z] où le joueur est posé (charge les îles, l'herbe et les niveaux de détail autour)
//   cam, vise : position de la caméra et point visé ; vise peut être remplacé par visee: 'soleil'
//     (caméra tournée vers l'astre) ou 'dos-soleil' (astre dans le dos), avec distance et pente
//   perso : cadrage centré sur le personnage (yaw relatif à son orientation, 0 = de face)
//   sol: true : hauteurs de cam et vise comptées depuis le sol sous chacun (relief chargé)
//   heure : heure figée ; exige : seuils de rejet automatique d'une capture vide (parts de l'image) :
//     decor (tout sauf ciel et mer), herbe (brins d'herbe), ecart (écart type de la luminance)
export const CADRAGES = {
  gameplay: {
    titre: 'Vue de jeu, Grande Île',
    joueur: [-100, -400], cam: [-100, 31.07, -361.79], vise: [-100, 14.31, -419.4],
    heure: 10, exige: { decor: 0.45, herbe: 0.04, ecart: 0.05 },
  },
  'face-soleil': {
    titre: 'Soleil dans le dos, sujets éclairés de face',
    joueur: [-100, -400], cam: [-100, 14, -400], sol: true, visee: 'dos-soleil', distance: 60, pente: -0.22,
    heure: 15.5, exige: { decor: 0.45, herbe: 0.03, ecart: 0.05 },
  },
  'contre-jour': {
    titre: 'Contre-jour, soleil bas devant la caméra',
    joueur: [-100, -400], cam: [-100, 22, -380], visee: 'soleil', distance: 60, pente: -0.12,
    heure: 17.6, exige: { decor: 0.3, herbe: 0.01, ecart: 0.04 },
  },
  foret: {
    titre: 'Forêt des souvenirs vue du coteau',
    joueur: [-700, -1490], cam: [-706, 1.8, -1476], vise: [-690, 2.6, -1510], sol: true,
    heure: 11, exige: { decor: 0.5, herbe: 0.0, ecart: 0.05 },
  },
  montagnes: {
    titre: 'Sommet givré depuis le sud, à 520 m',
    joueur: [-280, -1340], cam: [-262, 22, -1330], vise: [-280, -40, -1860], sol: true,
    heure: 9, exige: { decor: 0.4, herbe: 0.0, ecart: 0.04 },
  },
  nuit: {
    titre: 'Nuit sur Ton île',
    joueur: [1, 4], cam: [1, 24.52, 34.53], vise: [1, -9.69, -14.76],
    heure: 23, exige: { decor: 0.45, herbe: 0.02, ecart: 0.02 },
  },
  personnage: {
    titre: 'Personnage de trois quarts',
    perso: { at: [3.2, 3.6, 0.6], yaw: -0.7, dist: 2.9, pitch: 0.12, ty: 0.2 },
    heure: 11, exige: { decor: 0.5, herbe: 0.0, ecart: 0.05 },
  },
};

export const NOMS = Object.keys(CADRAGES);

// point visé d'un cadrage tourné vers l'astre (ou à l'opposé) : direction horizontale du soleil, pente
// donnée (radians, négative = vers le bas)
export function viseeSoleil(c, sunDir, cam = c.cam) {
  const k = c.visee === 'soleil' ? 1 : -1;
  const h = Math.hypot(sunDir[0], sunDir[2]) || 1;
  const dx = (sunDir[0] / h) * k;
  const dz = (sunDir[2] / h) * k;
  const d = c.distance || 60;
  return [cam[0] + dx * d, cam[1] + Math.tan(c.pente || 0) * d, cam[2] + dz * d];
}
