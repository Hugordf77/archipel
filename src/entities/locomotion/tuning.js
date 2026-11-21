// Réglages de la locomotion du personnage : une seule table, unités SI (m, s, rad).
// « realiste » est le profil par défaut (élan, inertie de rotation, dérapages) ;
// « reactif » garde les mêmes gestes avec beaucoup moins d'inertie.
import { GABARIT, GABARITS } from '../../models/personnage/gabarit.js';

// Mesures du corps lues dans le gabarit (models/personnage/gabarit.js, REST : os ARM_R = 5, FORE_R = 6,
// HAND_R = 15), jamais recopiées : épaule (écart au plan médian, hauteur au-dessus des pieds) et bras tendu
// de l'épaule au bout des doigts (épaule → coude → centre de la main, plus le rayon de la main), au cm.
// Chibi : 0,17 / 0,775 / 0,38 m ; héros : 0,19 / 1,17 / 0,56 m.
const epauleX = (g) => Math.abs(g.REST[5][0]);
const epauleY = (g) => g.REST[5][1];
const os = (g, a, b) => Math.hypot(g.REST[a][0] - g.REST[b][0], g.REST[a][1] - g.REST[b][1], g.REST[a][2] - g.REST[b][2]);
const bras = (g) => Math.round((os(g, 5, 6) + os(g, 6, 15) + g.main) * 100) / 100;
// part du bras du gabarit sur celui du chibi (réglages d'origine) : 1 pour le chibi, ≈ 1,47 pour le héros
const KB = bras(GABARIT) / bras(GABARITS.chibi);
// écart latéral de l'épaule intérieure, penchée de beta, corps pivotant aux pieds (comme motor.shoulderAt)
const lateralAt = (g, beta) => epauleX(g) * Math.cos(beta) + epauleY(g) * Math.sin(beta);
const HAND_TOUCH = 0.55; // rad (31,5°), même seuil pour tous les gabarits

export const BASE_TUNING = {
  // --- allures (m/s) -------------------------------------------------------
  walkMin: 0.6, // stick à peine incliné
  walkMax: 2.6, // stick à mi-course
  walkThreshold: 0.55, // au-delà de cette inclinaison : course
  run: 6.0, // (5,4 avant le chantier de course)
  sprint: 9.4, // (8,2 avant)
  // Variation d'effort en course soutenue : onde douce + impulsions rares, sans hasard.
  paceWaveRate: 0.9, // rad/s
  runPaceAmplitude: 0.035,
  sprintPaceAmplitude: 0.025,
  paceSurgeAmplitude: 0.035,
  swim: 1.8,
  swimSprint: 2.4,

  // --- accélération longitudinale -------------------------------------------
  // a(v) = accel0 · exp(−v / accelFade) : forte au départ, plus douce près de la vitesse visée.
  // Temps pour atteindre V depuis l'arrêt : (accelFade / accel0) · (exp(V / accelFade) − 1),
  // soit 0,46 s pour la course (90 % en 0,39 s) et 1,11 s pour le sprint (90 % en 0,89 s).
  accel0: 25, // m/s² au démarrage
  accelFade: 5.0, // m/s
  friction: 17, // m/s², stick relâché (arrêt depuis la course ≈ 0,35 s)
  slowDown: 12, // m/s², quand la vitesse visée baisse (stick moins incliné)
  overspeedDecay: 1.6, // m/s², survitesse (roulade, descente) tant qu'on pousse vers l'avant
  swimAccel: 5.5,
  swimDrag: 3.2,

  // --- rotation : cap à ressort amorti + vitesse angulaire bornée -----------
  // ω̇ = clamp(ωn²·Δθ − 2ζ·ωn·ω, −αmax, αmax) ; ωn, ζ, αmax varient avec la vitesse
  turnFreqWalk: 16, // ωn (rad/s) en marche
  turnFreqSprint: 16, // ωn au sprint
  turnDampWalk: 1.0, // ζ en marche : aucun dépassement
  turnDampSprint: 0.55, // ζ au sprint : léger dépassement (≈ 1°) puis stabilisation
  turnAccelStill: 60, // αmax (rad/s²) à l'arrêt
  turnAccelSprint: 24, // αmax au sprint
  turnRateWalk: 10, // ωmax (rad/s) en marche
  turnRateStill: 12, // ωmax sur place
  // adhérence latérale (m/s²) : ωmax = grip · SURFACES.grip / v, rayon minimal v² / grip
  gripRun: 16, // jusqu'à la course (rayon 0,42 m à walkMax, 2,25 m à la course)
  gripSprint: 15, // … au sprint : ωmax = 1,6 rad/s comme avant (rayon ≈ 5,9 m)
  // glisse : au-delà de la course, une part de la rotation du cap ne passe pas tout de suite
  // à la vitesse ; ce retard latéral s'efface avec l'adhérence (1/s, × SURFACES.grip au sol)
  slipMax: 0.35,
  slipGrip: 9,

  // --- accélérations mesurées, inclinaison, ellipse d'adhérence --------------
  // aLat, aLong : accélération réelle du corps (variation de la vitesse monde sur un pas fixe,
  // décomposée le long de la vitesse et en travers), lissées par un filtre du 1er ordre (1/s).
  accelFilter: 12,
  bankGravity: 9.81, // m/s² : vraie gravité (et non `gravity`, réglée pour le saut)
  // consigne = bankGain · atan(aLat / g), bornée à bankMax : un corps plus léger que le
  // pendule pur (virage de course ordinaire vers 20 à 28°)
  bankGain: 0.65,
  bankFreq: 14, // rad/s, ressort amorti critique (ζ = 1) : 63 % de la consigne en ≈ 0,15 s
  bankMax: 0.6, // rad (≈ 34°) ; lu aussi par la pose
  // gripUse = √((aLat / gLat)² + (aLong / gLong)²), gLat = grip(v) · SURFACES.grip,
  // gLong = max(gLat, poussée disponible accel0 · exp(−v / accelFade) · SURFACES.accel, filtrée
  // comme aLong) : la poussée du moteur en ligne droite reste dans l'ellipse ; au sprint gLong = gLat.
  // Au-delà de 1, l'excès dû au virage (gripUse − max(1, |aLong| / gLong)) freine
  // (excès × gLat × gripScrub, m/s²) et ajoute de la glisse (+ excès × gripSlide à la part de
  // rotation du cap qui ne passe pas à la vitesse).
  gripScrub: 1,
  gripSlide: 1,

  // --- main au sol : un effleurement rare dans un virage franc au sprint --------
  // Corps pivotant aux pieds, gabarit au repos (models/personnage/gabarit.js, REST) : épaule intérieure à
  // handShoulderX du plan médian et handShoulderY au-dessus des pieds.
  // Penché de β, l'épaule est à (X·cos β + Y·sin β) de côté et (Y·cos β − X·sin β) de haut ;
  // la sonde lit le sol juste sous elle. L'inclinaison « relief compris » compare la hauteur de
  // l'épaule au-dessus de ce sol à celle qu'elle aurait sur le plat à l'angle de seuil : un sol plus
  // haut côté intérieur fait toucher plus tôt, plus bas plus tard (relief compté jusqu'à handRiseMax :
  // au-delà, rocher ou rebord, l'excédent est ignoré).
  // Les angles de seuil ne dépendent pas de la taille : l'inclinaison vient de l'accélération latérale
  // (bankGain · atan(aLat / g)), identique pour tous les gabarits, et le rapport bras / hauteur d'épaule
  // est presque le même (chibi 0,49, héros 0,48) : l'effleurement reste aussi rare. Bras tendu
  // (handReach), la main n'atteint le plat qu'avec le corps abaissé à 31,5° : chibi ≈ 19 cm (épaule à
  // 0,57 m − 0,38 m), héros ≈ 34 cm (0,90 m − 0,56 m) ; la pose plie buste et bassin.
  // Contact : en SPRINT, au-delà de handTouchAngle tenu handHold, avec un élan (vitesse maximale
  // des handSpeedWindow dernières secondes) d'au moins course + handSpeed · (sprint − course), et
  // près de la pointe d'inclinaison ; relevé sous handLiftAngle ou après handMaxTime ;
  // puis handCooldown sans nouveau contact (un slalom ne touche pas à chaque virage).
  handShoulderX: epauleX(GABARIT), // m (chibi 0,17 ; héros 0,19)
  handShoulderY: epauleY(GABARIT), // m (chibi 0,775 ; héros 1,17)
  handReach: bras(GABARIT), // m : épaule → bout des doigts, bras tendu (chibi 0,38 ; héros 0,56)
  handTouchAngle: HAND_TOUCH, // rad (31,5°) : sonde à 0,55 m de côté sur le plat (héros : 0,77 m)
  handLiftAngle: 0.52, // rad (30°) : en dessous, la paume quitte un sol plat (cinématique de la pose)
  handHold: 0.08, // s au-delà du seuil avant le contact : un coup de stick bref ne suffit pas
  handMaxTime: 0.3, // s de contact au plus, même si le virage continue
  handCooldown: 1.2, // s après chaque relevé
  handSpeed: 0.5, // part de l'écart course → sprint : élan d'au moins 7,7 m/s
  handSpeedWindow: 0.6, // s : l'élan est la vitesse maximale sur cette durée (le virage la fait plonger)
  handPeakSlack: (1.5 * Math.PI) / 180, // rad : contact seulement pendant que |bank| monte ou reste
  // à moins de cet écart de sa pointe en cours, jamais quand le corps se redresse…
  handPeakLate: 0.05, // s : … et au plus tant après que |bank| a cessé de monter (ou d'être à sa borne)
  // m : 0,15 m pour le chibi, porté au gabarit avec l'écart latéral de la sonde au seuil (0,55 m → 0,77 m)
  // pour que le relief compte jusqu'à la même pente côté intérieur (atan(0,15 / 0,55) ≈ 15°) : 0,21 m
  // pour le héros (resté à 0,15 m, le relief ne compterait plus au-delà de 11°)
  handRiseMax: Math.round(0.15 * (lateralAt(GABARIT, HAND_TOUCH) / lateralAt(GABARITS.chibi, HAND_TOUCH)) * 1000) / 1000,

  // --- dérapage et demi-tour --------------------------------------------------
  skidMinSpeed: 3.8, // m/s
  skidAngle: (125 * Math.PI) / 180,
  skidDecel: 24, // m/s²
  skidEndSpeed: 1.2,
  skidMaxTime: 0.45,
  stopSkidSpeed: 7.3, // stick relâché à pleine allure : court dérapage d'arrêt (au-dessus de la course)
  stopSkidTime: 0.18,
  pivotTime: 0.16,
  pivotAngle: Math.PI / 2, // entrée encore à plus de 90° en fin de dérapage : demi-tour
  relaunchSpeed: 3,
  relaunchTime: 0.3,
  relaunchBoost: 1.4,
  turnInPlaceAngle: (100 * Math.PI) / 180,
  turnInPlaceSpeed: 2,
  turnInPlaceTime: 0.18,

  // --- roulade ------------------------------------------------------------------
  rollBase: 5.8, // m/s : vitesse minimale en roulade (≈ 0,97 × course)
  rollBonus: 1.8, // élan d'une roulade « fraîche »
  rollTime: 0.52,
  rollTurnRate: 2.5, // rad/s
  rollRadius: 0.24, // m, rayon de collision en boule
  rollWindow: [0.36, 0.52], // s : fenêtre parfaite pour enchaîner
  rollChainBonus: 1.2,
  rollCap: 13.2, // ≈ 1,4 × sprint
  rollFriction: 1.0, // m/s²
  rollSlopeGain: 0.6, // part de la gravité gagnée en descente
  rollRest: 0.35, // s après une roulade sans élan « frais » (seul l'enchaînement paie)
  rollRecoverTime: 0.12,
  bonkSpeed: 4,
  bonkRebound: 0.35,
  bonkTime: 0.5,

  // --- trébucher (obstacle bas percuté trop vite) -------------------------------
  tripSpeed: 7.2, // m/s : au sprint (pas en simple course, ≤ 6,4 m/s avec ses relances) on trébuche
  tripHop: 3.4, // m/s : petit envol en basculant par-dessus
  tripDrag: 2.5, // m/s² en l'air
  fallenFriction: 9, // m/s² : glissade à plat ventre
  fallenTime: 0.7, // s au sol avant de se relever seul
  fallenEarly: 0.3, // s : ensuite, sauter ou rouler relève plus vite
  getupTime: 0.5,

  // --- saut, chute, atterrissage -----------------------------------------------
  gravity: 26, // m/s²
  jumpSpeed: 7.2, // m/s ≈ 1 m de hauteur
  jumpCut: 0.5, // saut relâché tôt : vitesse verticale ×0,5
  apexHang: 0.6, // gravité ×0,6 tant que |vy| < apexBand
  apexBand: 1.5,
  fallGravity: 1.25,
  terminal: 22,
  coyoteTime: 0.1,
  jumpBuffer: 0.12,
  rollBuffer: 0.12,
  airAccel: 0.35,
  airTurn: 0.5,
  airDrag: 0.4, // m/s², sans entrée
  longJumpSpeed: 6.0,
  longJumpBoost: 1.0,
  stepUp: 0.4, // m : marche montée automatiquement
  snapDown: 0.35, // m : en dessous, on reste collé au sol ; au-delà, on tombe
  landHeavy: 9, // m/s d'impact : réception roulée (ou accroupie à l'arrêt)
  landTime: 0.12,
  landHeavyTime: 0.35,

  // --- pentes -------------------------------------------------------------------
  uphillLoss: 0.9, // vitesse visée × clamp(1 − 0,9·sin, 0,45, 1)
  uphillMin: 0.45,
  downhillGain: 0.6,
  downhillCap: 1.25,
  // on glisse là où l'on ne pourrait pas grimper (55°, la limite de marche) : les sentiers de
  // montagne générés dépassent 40° sur ~18 % de leur longueur, 55° sur moins de 3 %
  slideAngle: (55 * Math.PI) / 180,
  slideExitAngle: (48 * Math.PI) / 180,
  slideGain: 0.55, // part de la gravité
  slideFriction: 2,
  slideCap: 9,
  slideControl: 0.35,

  // --- grimper aux troncs (palmiers) : CLIMB et CLIMB_TOP --------------------------
  // Sur le tronc (locomotion/trunk.js) : racine en A(s) + (r(s) + trunkGap) · n(θ), cap θ + π (face au
  // tronc), s le long de l'axe depuis le pied. Mains à trunkHands au-dessus de la racine le long de
  // l'axe : quand elles atteignent sommetY, CLIMB_TOP (racine au haut de l'axe).
  trunkGap: 0.22, // m : de l'écorce à la racine
  // m : épaule + bras (handShoulderY + handReach), moins le buste plié (5,5 cm pour le chibi, à l'échelle
  // du bras) : chibi 0,775 + 0,38 − 0,055 = 1,1 ; héros 1,17 + 0,56 − 0,081 ≈ 1,65. Resté à 1,1 m, le
  // héros arriverait au sommet avec sa prise la plus haute (pose.js, CLIMB.high ≈ 1,40 m) 0,30 m au-dessus
  // de sommetY ; ainsi elle est 0,25 m en dessous (chibi : 0,17 m)
  trunkHands: Math.round((epauleY(GABARIT) + bras(GABARIT) - 0.055 * KB) * 1000) / 1000,
  trunkUp: 1.5, // m/s le long de l'axe, stick haut
  trunkDown: 1.8, // m/s, stick bas
  trunkAccel: 8, // m/s² : mise en route (0 → 1,5 m/s en 0,19 s, 0 → 1,8 m/s en 0,23 s)
  trunkBrake: 12, // m/s² : arrêt ou retournement (1,8 → 0 en 0,15 s, glissade 4 → 0 en 0,33 s)
  trunkTurn: 2.4, // rad/s autour de l'axe, stick gauche/droite
  trunkTurnAccel: 16, // rad/s² (pleine vitesse en 0,15 s)
  trunkDead: 0.2, // stick : zone morte de chaque axe…
  trunkSpan: 0.5, // … pleine commande à trunkDead + trunkSpan (0,7 ; le clavier donne 1 ou 0,71)
  trunkSlideStick: 0.8, // stick bas « franc » : y ≤ −0,8 (la diagonale du clavier, −0,71, n'en est pas)
  trunkSlideHold: 0.3, // s tenu avant la glissade
  trunkSlideSpeed: 4, // m/s
  trunkSlideAccel: 6, // m/s² (1,8 → 4 m/s en 0,37 s)
  // Accroche : le point du corps à trunkProbeY au-dessus de la racine passe à moins de trunkGrabReach
  // de l'écorce, distance mesurée au bord du corps (rayon `radius`) : centre à moins de
  // r + radius + trunkGrabReach de l'axe (0,95 m au pied d'un palmier de rayon 0,2). L'obstacle de
  // l'arbre (0,4 · échelle) plus 0,27 (balayage) tient le centre à 0,67 m au moins de l'axe au pied :
  // contre le tronc, on est toujours à portée ; à plus de 0,95 m, jamais. En l'air (saut ou chute),
  // racine entre trunkGrabMinH et sommetY au-dessus du pied ; au sol, un saut contre le tronc accroche
  // directement. Sans entrée, ou stick à moins de 75° du tronc (cos > trunkGrabCos).
  trunkGrabReach: 0.45, // m
  trunkGrabMinH: 0.3, // m
  trunkProbeY: 0.5, // m : milieu du corps
  trunkGrabCos: 0.26,
  trunkLowH: 0.45, // m : racine au plus bas à l'accroche, au-dessus du pied
  trunkGrabCarry: 0.3, // part de la vitesse d'arrivée que garde le corps à l'accroche (le reste : impact)
  // raccords (accroche, arrivée au sommet, retour du sommet) : décalage amorti critique, 95 % en 0,47 s
  trunkSnapFreq: 10, // rad/s
  trunkDropH: 0.2, // m : en descendant, racine à moins de cette hauteur du sol : pieds au sol
  trunkPushOff: 1.2, // m/s : en quittant le tronc vers le bas, on s'en écarte au moins à cette vitesse
  // jusqu'à sortir de son encombrement (balayage du tronc quitté ignoré jusque-là)
  trunkExitTime: 1, // s au sol au plus, ensuite le jeu repousse hors de l'obstacle
  trunkJumpH: 4.5, // m/s à l'horizontale : saut arrière (dos au tronc) et saut du sommet
  trunkJumpSpread: Math.PI / 3, // rad : saut arrière orientable de ±60° au stick x
  trunkTopJump: 1.15, // × jumpSpeed à la verticale, saut du sommet
  regrabDelay: 0.35, // s sans nouvelle accroche au même tronc après un saut (lâcher : jusqu'au sol)

  radius: 0.3,
};

// Surfaces : multiplicateurs de vitesse, d'accélération et d'adhérence
export const SURFACES = {
  grass: { speed: 1, accel: 1, grip: 1, skid: 1 },
  sand: { speed: 0.85, accel: 0.7, grip: 0.6, skid: 0.75 },
  wood: { speed: 1.05, accel: 1, grip: 1, skid: 1 },
  shallow: { speed: 0.6, accel: 1, grip: 1, skid: 0.9 },
};

const REACTIF = {
  accel0: 40, // course en 0,29 s, sprint en 0,69 s
  friction: 29,
  turnFreqWalk: 24,
  turnFreqSprint: 15,
  turnDampWalk: 1,
  turnDampSprint: 0.9,
  turnAccelStill: 120,
  turnAccelSprint: 45,
  turnRateWalk: 14,
  gripRun: 26,
  gripSprint: 25, // ωmax au sprint ≈ 2,66 rad/s comme avant (rayon ≈ 3,5 m)
  slipMax: 0.12,
  skidAngle: (140 * Math.PI) / 180,
  skidDecel: 34,
  skidMaxTime: 0.3,
  stopSkidSpeed: 10.3, // au-dessus du sprint : seulement en survitesse
};

const cache = new Map();
export function tuningFor(profile = 'realiste') {
  let t = cache.get(profile);
  if (!t) {
    t = Object.freeze({ ...BASE_TUNING, ...(profile === 'reactif' ? REACTIF : {}) });
    cache.set(profile, t);
  }
  return t;
}
