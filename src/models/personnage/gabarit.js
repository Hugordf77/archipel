// Gabarit du personnage : proportions du squelette et du crâne, et les raccords au jeu qui en découlent
// (visée de la caméra, ligne d'eau à la nage, main au sol, épée de dos, cadrage de l'aperçu).
// Deux gabarits :
//   aventurier : personnage 2.0, d'après les planches de l'utilisateur, ≈ 4 têtes au crâne, 1,50 m sans les
//     cheveux (docs/personnage-2/plan.md) ;
//   chibi : personnage 1.0, 2,7 têtes, 1,48 m, gardé le temps du chantier pour comparer.
// Choix : `?gabarit=chibi` dans l'adresse du jeu ou du catalogue, ou localStorage 'archipel.gabarit'.
// Lu une seule fois au chargement : le squelette et les longueurs des bras sont des constantes de module
// (locomotion/rig.js) ; changer de gabarit demande de recharger la page. Sans navigateur (tests) : aventurier.

// os (indices de commun.js, B) : HIPS, TORSO, HEAD, ARM_L, FORE_L, ARM_R, FORE_R, THIGH_L, SHIN_L,
// THIGH_R, SHIN_R, HAIR_A, HAIR_B, NECK, HAND_L, HAND_R, FOOT_L, FOOT_R, SKIRT, SCARF, HAIR_C, SCARF_B, BAG ; positions de
// repos absolues (repère du personnage, pieds en 0, avant = +z). Les os des cheveux (HAIR_A, HAIR_B, HAIR_C)
// sont posés par la coupe (coupes/, HAIR_STYLES[…].a, .b et .c ; sans .c, HAIR_C rejoint HAIR_A et ne
// porte rien : la coupe du chibi). Épaule, coude et main d'un même bras sont alignés à la
// verticale (même x, z = 0) : la cinématique inverse du bras (locomotion/rig.js, reachHand) le suppose.
const CHIBI = {
  nom: 'chibi',
  tetes: 2.7,
  hauteur: 1.48,
  HC: 1.12,
  FACE: { R: 0.28, SX: 1.06, SY: 0.98 },
  REST: [
    [0, 0.46, 0], [0, 0.52, 0], [0, 0.85, 0],
    [-0.17, 0.775, 0], [-0.17, 0.62, 0], [0.17, 0.775, 0], [0.17, 0.62, 0],
    [-0.085, 0.42, 0], [-0.085, 0.27, 0], [0.085, 0.42, 0], [0.085, 0.27, 0],
    [0, 1.32, -0.2], [0, 1.32, -0.2],
    [0, 0.82, 0], [-0.17, 0.455, 0], [0.17, 0.455, 0], [-0.085, 0.12, 0.03], [0.085, 0.12, 0.03],
    [0, 0.44, 0], [0.075, 0.74, 0.14], [0, 1.32, -0.2],
    // (SCARF_B et BAG : sans usage pour le chibi, qui ne porte qu'un pan et dessine son sac sur le torse ;
    // posés sur le pivot du torse, ils ne changent pas les poids de peau de ses sommets : Parts.build)
    [0, 0.52, 0], [0, 0.52, 0],
  ],
  // rayon de la main (sphère centrée sur l'os de la main)
  main: 0.058 * 1.05,
  // visée de la caméra au-dessus des pieds (CameraRig.lookOffset)
  visee: 0.7,
  // épée de dos dans le repère du torse : position, roulis
  epee: { p: [0.015, 0.12, -0.255], rz: 0.16 },
  // aperçu de l'inventaire : hauteur de la caméra et du point visé
  apercu: { cam: 1.05, vise: 0.66 },
  // main au sol (locomotion/pose.js) : pli latéral du buste et penchée en avant du corps (rad) qui
  // descendent l'épaule vers le sol
  pliMain: 0.34,
  penchMain: 0.12,
  // écart des bras au sol (rad) ajouté aux 0,2 rad de base des poses (locomotion/pose.js, ARM_BASE)
  ecartBras: 0,
  // grimpe (locomotion/pose.js, CLIMB) : prises le long du tronc, au-dessus (haut) et au-dessous (bas) de
  // l'épaule, en m à l'échelle du bras du chibi
  prise: { haut: 0.155, bas: 0.025, serre: 0.135 },
};

// Aventurier : d'après les planches de l'utilisateur (docs/personnage-2/references/), mesurées sur la vue
// de face. 1,50 m au sommet du crâne (≈ 1,68 m avec les cheveux), ≈ 4 têtes au crâne ; grosse tête ronde
// (crâne de 0,37 m), buste court en colonne, jambes à 40 % (hanche à 0,62 m), bras ronds (épaule → centre
// du poing 0,36 m, 0,42 m au bout du poing), poings à hauteur de l'entrejambe, bottes massives.
const AVENTURIER_DESSIN = {
  nom: 'aventurier',
  tetes: 4,
  hauteur: 1.5,
  HC: 1.3,
  // forme : visage ovale de manga (tete.js) ; sous la ligne des yeux (yeux, part de la demi-hauteur), joues
  // pleines, mâchoire affinée vers un menton doux qui descend (menton · R), devant un peu aplati, nuque qui
  // rentre ; lumiere : normales du visage tournées vers l'avant (pas de bande d'ombre sur les joues)
  FACE: { R: 0.19, SX: 1.06, SY: 0.98, forme: { yeux: -0.22, joues: 0.08, machoire: 0.2, menton: 0.01, aplat: 0.05, nuque: 0.3, lumiere: 1.3, oreille: { r: 0.042, y: -0.035, x: 0.985, z: -0.012, ouvre: 0.3 } } },
  REST: [
    [0, 0.66, 0], [0, 0.72, 0], [0, 1.11, 0],
    [-0.165, 0.96, 0], [-0.165, 0.775, 0], [0.165, 0.96, 0], [0.165, 0.775, 0],
    [-0.1, 0.62, 0], [-0.1, 0.35, 0], [0.1, 0.62, 0], [0.1, 0.35, 0],
    [0, 1.436, -0.136], [0, 1.436, -0.136],
    [0, 1.07, 0], [-0.165, 0.6, 0], [0.165, 0.6, 0], [-0.1, 0.085, 0.03], [0.1, 0.085, 0.03],
    [0, 0.66, 0], [0.118, 1.08, -0.022], [0, 1.436, -0.136],
    // pans de l'écharpe (SCARF, SCARF_B) : pivots dans le nœud, sur le côté gauche du cou ; sac (BAG) :
    // pivot au haut du sac, dans son volume (corps/index.js, NOEUD et SAC)
    [0.124, 1.072, -0.018], [0, 1.0, -0.218],
  ],
  main: 0.06 * 1.05,
  visee: 0.85,
  epee: { p: [0.012, 0.2, -0.15], rz: 0.16 },
  // épée de dos quand le sac est porté : debout sur la droite du sac (repère de l'os BAG, pivot au haut du
  // sac), à plat sur sa face arrière, penchée comme lui (rx) ; garde au-dessus du sac, lame à côté de la
  // poche (corps/index.js, SAC). Les mains qui balancent n'y vont pas (|x| < 0,14).
  epeeSac: { p: [-0.1, 0.024, -0.105], rx: 0.08, ry: -0.9, rz: 0 },
  apercu: { cam: 1.1, vise: 0.8 },
  // Bras au repos : les poses au sol écartent déjà les bras de 0,2 rad ; avec l'avant-bras à peine plié,
  // le centre du poing est à x ±0,236, à 6 mm du bassin (r 0,172 à y 0,63, aplati 0,72). La planche
  // le met à ±0,245 (≈ 14°) : 0,03 rad de plus, soit 0,23 rad, poing à ≈ ±0,246, 1,5 cm du bassin.
  ecartBras: 0.03,
  // Main au sol : bras de 0,42 m (épaule → bout du poing) sous une épaule haute (0,96 m) : à l'inclinaison
  // du contact (0,52 à 0,6 rad, tuning.js), l'épaule descend d'≈ 0,30 m (chibi ≈ 0,19 m) pour que la
  // paume effleure le plat. Repris par le pli latéral et la penchée en avant : paume au plus à 2,2 cm du
  // sol (tests/pose.test.js, < 3 cm). Valeurs du chibi (0,34 / 0,12) : 8,5 cm ; pli 0,44 seul : 6,1 cm.
  pliMain: 0.52,
  penchMain: 0.2,
  // Grimpe : prises haute et basse à 0,08 m (à l'échelle du bras, ≈ 0,09 m) au-dessus et au-dessous de
  // l'épaule, course d'une main 0,18 m (comme le chibi) ; mains serrées de la glissade à hauteur d'épaule
  // (serre 0 ; chibi 0,135 dessous). Au début de la glissade, la cible des mains saute de la prise vers
  // le tronc serré ; plus ce saut est long, plus le bras traîne (ARM_RATE de Character.js) et la main
  // traverse l'écorce. Mesuré sur 32 variantes du scénario de grimpe-pose (début du tour et de la
  // glissade décalés de −0,3 à +0,2 s, deux caps, deux troncs) : mains entre +1,5 et +4,3 mm de
  // l'écorce (valeurs du chibi : jusqu'à 2,4 cm dedans ; serre 0,135 : 1 cm). Course de 0,18 m à
  // 0,09 / 0,09 : genou 4 mm dans le palmier de la maison (phase des jambes, CLIMB_CYCLE).
  prise: { haut: 0.08, bas: 0.08, serre: 0 },
};

// Os de la tête : ils suivent le cou sans changer de taille quand le corps est réduit
export const OS_TETE = [2, 11, 12, 20]; // HEAD, HAIR_A, HAIR_B, HAIR_C

// Gabarit réduit : le corps sous le cou mis à l'échelle k depuis les pieds (buste, bras, jambes,
// bottes, en largeur comme en hauteur), la tête et les cheveux descendus avec le cou, à leur taille.
// Les pièces se dessinent dans les positions de `dessin` (corps/, coupes/, tete.js) ; l'assemblage
// (commun.js, Parts.build) les porte aux positions réduites, celles du squelette et de tout le jeu
// (REST, HC, caméra, nage, locomotion). k = 1 : gabarit inchangé (chibi).
function reduit(g, k) {
  const teteDy = (1 - k) * g.REST[2][1];
  const enReel = (i, [x, y, z]) => (OS_TETE.includes(i) ? [x, y - teteDy, z] : [x * k, y * k, z * k]);
  return {
    ...g,
    corps: k,
    teteDy,
    dessin: { REST: g.REST, HC: g.HC },
    REST: g.REST.map((p, i) => enReel(i, p)),
    HC: g.HC - teteDy,
    hauteur: g.hauteur - teteDy,
    main: g.main * k,
    visee: g.visee * k,
    epee: { ...g.epee, p: g.epee.p.map((v) => v * k) },
    epeeSac: g.epeeSac && { ...g.epeeSac, p: g.epeeSac.p.map((v) => v * k) },
    apercu: { cam: g.apercu.cam * k, vise: g.apercu.vise * k },
  };
}

// Aventurier : corps réduit de 12 % sous le cou (demande de l'utilisateur, 03/11) : ≈ 1,53 m avec les
// cheveux, tête ≈ 33 % de la hauteur
const AVENTURIER = reduit(AVENTURIER_DESSIN, 0.88);

export const GABARITS = { aventurier: AVENTURIER, chibi: reduit(CHIBI, 1) };

function choix() {
  try {
    const q = globalThis.location?.search ? new URLSearchParams(globalThis.location.search).get('gabarit') : null;
    const s = q || globalThis.localStorage?.getItem('archipel.gabarit');
    if (s && GABARITS[s]) return s;
  } catch {
    // stockage indisponible (navigation privée, tests) : gabarit par défaut
  }
  return 'aventurier';
}

export const GABARIT = GABARITS[choix()];

// position de dessin ↔ position réduite d'un os (ou d'un point porté par lui) du gabarit choisi
export function versReel(os, [x, y, z]) {
  const k = GABARIT.corps;
  return OS_TETE.includes(os) ? [x, y - GABARIT.teteDy, z] : [x * k, y * k, z * k];
}
export function versDessin(os, [x, y, z]) {
  const k = GABARIT.corps;
  return OS_TETE.includes(os) ? [x, y + GABARIT.teteDy, z] : [x / k, y / k, z / k];
}

// part du crâne du gabarit sur le crâne chibi : les pièces de la tête dessinées en mètres pour le chibi
// (mèches, accessoires de tête) se mettent à l'échelle par ce facteur
export const TETE_K = GABARIT.FACE.R / CHIBI.FACE.R;

// ligne d'eau à la nage : la racine (pieds) descend de tant sous la surface. Brasse penchée de 0,55 rad,
// tête hors de l'eau de 0,29 m (le chibi : 1,12 · cos 0,55 − 0,29 ≈ 0,66, la valeur d'origine)
export const NAGE = GABARIT.HC * Math.cos(0.55) - 0.29;

// Les décalages verticaux des poses (bodyY : assis, accroupi, réception, rebond de la foulée…) sont réglés
// sur le chibi (bassin à 0,46 m) ; ils suivent la longueur des jambes du gabarit. Échelle prise pour que le
// bassin d'un personnage assis (bodyY −0,39 : bassin à 7 cm au-dessus de la racine) tombe au même endroit
// quel que soit le gabarit (locomotion/rig.js, applyJoints).
export const BODY_Y_K = (GABARIT.REST[0][1] - 0.07) / (CHIBI.REST[0][1] - 0.07);
