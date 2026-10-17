// Réglages de la locomotion du personnage : une seule table, unités SI (m, s, rad).
// « realiste » est le profil par défaut (élan, inertie de rotation, dérapages) ;
// « reactif » garde les mêmes gestes avec beaucoup moins d'inertie.

export const BASE_TUNING = {
  // --- allures (m/s) -------------------------------------------------------
  walkMin: 0.6, // stick à peine incliné
  walkMax: 2.6, // stick à mi-course
  walkThreshold: 0.55, // au-delà de cette inclinaison : course
  run: 5.4,
  sprint: 8.2,
  swim: 1.8,
  swimSprint: 2.4,

  // --- accélération longitudinale -------------------------------------------
  // a(v) = accel0 · exp(−v / accelFade) : forte au départ, plus douce près de la vitesse visée
  accel0: 21, // m/s² au démarrage
  accelFade: 4.7, // m/s
  friction: 16, // m/s², stick relâché (arrêt depuis la course ≈ 0,35 s)
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
  gripRun: 16, // accélération latérale max (m/s²) en course : ωmax = gripRun / v
  gripSprint: 13, // … au sprint (rayon ≈ 5 m)
  // glisse : au-delà de la course, une part de la rotation du cap ne passe pas tout de suite
  // à la vitesse ; ce retard latéral s'efface avec l'adhérence (1/s)
  slipMax: 0.35,
  slipGrip: 9,

  // --- dérapage et demi-tour --------------------------------------------------
  skidMinSpeed: 3.8, // m/s
  skidAngle: (125 * Math.PI) / 180,
  skidDecel: 24, // m/s²
  skidEndSpeed: 1.2,
  skidMaxTime: 0.45,
  stopSkidSpeed: 6.5, // stick relâché à pleine allure : court dérapage d'arrêt
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
  rollBase: 5.2, // m/s : vitesse minimale en roulade
  rollBonus: 1.8, // élan d'une roulade « fraîche »
  rollTime: 0.52,
  rollTurnRate: 2.5, // rad/s
  rollRadius: 0.24, // m, rayon de collision en boule
  rollWindow: [0.36, 0.52], // s : fenêtre parfaite pour enchaîner
  rollChainBonus: 1.2,
  rollCap: 11.5,
  rollFriction: 1.0, // m/s²
  rollSlopeGain: 0.6, // part de la gravité gagnée en descente
  rollRest: 0.35, // s après une roulade sans élan « frais » (seul l'enchaînement paie)
  rollRecoverTime: 0.12,
  bonkSpeed: 4,
  bonkRebound: 0.35,
  bonkTime: 0.5,

  // --- trébucher (obstacle bas percuté trop vite) -------------------------------
  tripSpeed: 6.4, // m/s : au sprint (pas en simple course) on trébuche sur un obstacle bas
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
  accel0: 34,
  friction: 26,
  turnFreqWalk: 24,
  turnFreqSprint: 15,
  turnDampWalk: 1,
  turnDampSprint: 0.9,
  turnAccelStill: 120,
  turnAccelSprint: 45,
  turnRateWalk: 14,
  gripRun: 26,
  gripSprint: 22,
  slipMax: 0.12,
  skidAngle: (140 * Math.PI) / 180,
  skidDecel: 34,
  skidMaxTime: 0.3,
  stopSkidSpeed: 9,
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
