// Poses de locomotion (pures, testables en Node) : longueur de pas, allures mélangées,
// effort du sprint, inclinaison en virage, regard anticipé, dérapage, roulade, saut…
// Le personnage (Character.js) applique ces valeurs d'articulations à son squelette.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Distance entre appuis alternés (m). La cadence reste plausible aux vitesses de course
// et de sprint, et chaque appui correspond à la distance réellement parcourue.
const STRIDE = [[0, 0.38], [2.6, 1.05], [5.4, 1.65], [8.2, 2.35], [12, 2.7]];
export function strideLength(v) {
  const s = Math.max(0, v);
  for (let i = 1; i < STRIDE.length; i++) {
    const [v1, l1] = STRIDE[i];
    if (s <= v1) {
      const [v0, l0] = STRIDE[i - 1];
      return l0 + ((l1 - l0) * (s - v0)) / (v1 - v0);
    }
  }
  return STRIDE[STRIDE.length - 1][1];
}

// La pose a besoin des deux demi-cycles pour alterner les jambes ; la phase d'événements
// (sons de pas) est maintenue séparément par Player.
export function advanceGaitPhase(phase, distance, stride) {
  const next = phase + (Math.PI * Math.max(0, distance)) / Math.max(stride, 1e-6);
  return next % (Math.PI * 2);
}

const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
// Bascule du pied : talon légèrement relevé au contact, déroulé vers la pointe,
// puis pointe relevée pendant le retour de la jambe.
function footPitch(inStance, progress, amplitude) {
  const heelStrike = -amplitude * 0.35;
  const toeOff = amplitude * 1.1;
  const toeClearance = -amplitude * 1.15;
  if (inStance) {
    return heelStrike + smooth(0.08, 0.95, progress) * (toeOff - heelStrike);
  }
  const lift = toeOff + smooth(0, 0.4, progress) * (toeClearance - toeOff);
  return lift + smooth(0.78, 1, progress) * (heelStrike - toeClearance);
}
const TAU = Math.PI * 2;

// Familles de poses : on ne lisse (inertialise) qu'aux changements de famille ;
// au sein d'une famille, la pose varie continûment avec la vitesse et la phase.
export const LOCO_FAMILY = {
  IDLE: 'sol', WALK: 'sol', RUN: 'sol', SPRINT: 'sol', ROLL_RECOVER: 'sol', LAND: 'land',
  TURN: 'turn', SKID: 'skid', PIVOT: 'pivot', ROLL: 'roll', BONK: 'bonk', JUMP: 'air', FALL: 'air', SLIDE: 'slide',
  TRIP: 'trip', FALLEN: 'fallen', GETUP: 'getup',
};
// demi-vie (s) de la transition vers chaque famille
export const FAMILY_HALFLIFE = { roll: 0.06, pivot: 0.07, land: 0.07, skid: 0.08, air: 0.1, bonk: 0.09, turn: 0.08, slide: 0.12, sol: 0.12, trip: 0.07, fallen: 0.06, getup: 0.1 };

// Allures : amplitudes des membres, penchée, rebond, part de phase aérienne
const GAITS = {
  walk: { lean: 0.07, thigh: 0.5, shin: 0.75, foot: 0.18, arm: 0.5, armOff: 0, fore: 0.3, bounce: 0.035, torso: 0.09, hips: 0.03 },
  run: { lean: 0.2, thigh: 0.95, shin: 1.15, foot: 0.3, arm: 0.85, armOff: -0.05, fore: 0.55, bounce: 0.05, torso: 0.14, hips: 0.03 },
  sprint: { lean: 0.42, thigh: 1.15, shin: 1.6, foot: 0.4, arm: 1.0, armOff: -0.12, fore: 0.7, bounce: 0.06, torso: 0.2, hips: 0.025 },
};
const G = { ...GAITS.walk };
function blendGait(r, sp) {
  for (const k in G) G[k] = (GAITS.walk[k] + (GAITS.run[k] - GAITS.walk[k]) * r) * (1 - sp) + GAITS.sprint[k] * sp;
  return G;
}

/**
 * Pose de locomotion. p : instantané du moteur (Player.loco) complété par le personnage
 * (now, startT, breath) ; T : valeurs d'articulations (clés de BASE) déjà remises au repos ;
 * X : extras { spin (rotation de roulade), lift (pivot de roulade), expr (expression) }.
 */
export function locomotionPose(p, T, X) {
  X.spin = 0;
  X.lift = 0;
  X.expr = null;
  X.blend = 0;
  switch (LOCO_FAMILY[p.state] || 'sol') {
    case 'skid':
      skidPose(p, T, X);
      break;
    case 'pivot':
      pivotPose(p, T, X);
      break;
    case 'turn':
      turnPose(p, T, X);
      break;
    case 'roll':
      rollPose(p, T, X);
      break;
    case 'air':
      airPose(p, T, X);
      break;
    case 'land':
      if (p.landHeavy) crouchPose(p, T, X);
      else {
        groundPose(p, T, X);
        landOverlay(p, T, 1 - clamp(p.t / 0.18, 0, 1));
      }
      break;
    case 'bonk':
      bonkPose(p, T, X);
      break;
    case 'slide':
      slidePose(p, T, X);
      break;
    case 'trip':
      tripPose(p, T, X);
      break;
    case 'fallen':
      fallenPose(p, T, X);
      break;
    case 'getup':
      getupPose(p, T, X);
      break;
    default:
      groundPose(p, T, X);
      if (p.state === 'ROLL_RECOVER') {
        // sortie de roulade : on se déplie, encore un peu étiré
        const k = 1 - clamp(p.t / 0.12, 0, 1);
        T.sy += 0.06 * k;
        T.armLZ -= 0.3 * k;
        T.armRZ += 0.3 * k;
      }
  }
  return T;
}

// inclinaison dans la courbe (radians, positive = virage à gauche)
export function bankAngle(speed, omega) {
  return clamp(Math.atan((speed * omega) / 9.81) * 0.8, -0.35, 0.35);
}

function groundPose(p, T, X) {
  const s = Math.hypot(p.v, p.vLat);
  const walk = clamp(s / 1.2, 0, 1);
  const still = 1 - walk;
  const r = smooth(2.4, 5.0, s);
  const sp = smooth(5.6, 8.0, s);
  const g = blendGait(r, sp);
  const ph = p.phase || 0;
  const sn = Math.sin(ph);
  const cs = Math.cos(ph);
  // Chaque demi-cycle est un pas : appui contrôlé (62 %) puis retour plus rapide.
  // Le déplacement du bassin pendant l'appui annule ainsi mieux la translation du pied.
  const cycle = ((ph / Math.PI) % 2 + 2) % 2;
  const stanceShare = 0.62;
  const leftPhase = cycle;
  const leftCycle = leftPhase / 2;
  const leftStance = leftCycle < stanceShare;
  const leftProgress = leftStance ? leftCycle / stanceShare : (leftCycle - stanceShare) / (1 - stanceShare);
  const leftSwing = leftStance ? 0 : Math.sin(leftProgress * Math.PI);
  const rightPhase = (cycle + 1) % 2;
  const rightCycle = rightPhase / 2;
  const rightStance = rightCycle < stanceShare;
  const rightProgress = rightStance ? rightCycle / stanceShare : (rightCycle - stanceShare) / (1 - stanceShare);
  const rightSwing = rightStance ? 0 : Math.sin(rightProgress * Math.PI);
  const breathe = Math.sin((p.now || 0) * (Math.PI * 2 / 3));
  // rebond : la marche est haute au passage des jambes, la course en suspension
  const up = (1 - r) * (1 - Math.abs(sn)) + r * Math.abs(sn);
  T.bodyY = g.bounce * walk * up;
  T.sy = 1 + breathe * 0.012 * still + Math.cos(ph * 2) * (0.014 + 0.012 * r) * walk;
  // penchée : allure + accélération (on se jette en avant, on se retient au freinage) + pente
  T.lean = g.lean * walk + clamp((p.accF || 0) * 0.03, -0.18, 0.15) + clamp((p.slopeAlong || 0) * 0.35, -0.1, 0.2);
  // inertie de rotation visible : le corps se penche dans la courbe, la tête garde l'horizon
  const bank = bankAngle(s, p.omega || 0);
  T.bodyRoll = -bank;
  T.headZ = bank * 0.6 + Math.sin((p.now || 0) * 0.9) * 0.04 * still;
  T.neckZ = bank * 0.2;
  // Cycle de jambe : poussée avant → extension arrière en appui → retour rapide genou plié.
  // Le cosinus garde la pose et sa vitesse continues aux transitions appui/vol.
  const kneeBase = 0.2 + 0.1 * r + 0.12 * sp;
  const kneePeak = Math.max(kneeBase, 0.72 + g.shin * 0.55);
  const thighL = (leftStance ? -Math.cos(Math.PI * leftProgress) : Math.cos(Math.PI * leftProgress)) * g.thigh;
  const thighR = (rightStance ? -Math.cos(Math.PI * rightProgress) : Math.cos(Math.PI * rightProgress)) * g.thigh;
  const shinL = kneeBase + leftSwing * (kneePeak - kneeBase);
  const shinR = kneeBase + rightSwing * (kneePeak - kneeBase);
  T.thighL = thighL * walk;
  T.thighR = thighR * walk;
  T.shinL = shinL * walk;
  T.shinR = shinR * walk;
  // Le pied déroule l'appui puis relève nettement la pointe pendant son retour.
  // La cible est l'orientation globale du pied ; on la convertit en rotation de cheville.
  T.footL = (footPitch(leftStance, leftProgress, g.foot) - thighL - shinL) * walk;
  T.footR = (footPitch(rightStance, rightProgress, g.foot) - thighR - shinR) * walk;
  // bras en balancier opposé, avant-bras pliés (≈ 95° au sprint), qui pompent
  const armDrive = clamp((p.accF || 0) * 0.012, -0.12, 0.16);
  T.armLX = (-thighL * g.arm / g.thigh + g.armOff + armDrive) * walk;
  T.armRX = (-thighR * g.arm / g.thigh + g.armOff + armDrive) * walk;
  // L'ouverture varie entre bras semi-repliés et presque horizontaux. Des rythmes
  // secondaires déphasés donnent des écarts spontanés sans introduire d'aléatoire.
  const armSpread = 0.18 * walk + 0.58 * r + 0.34 * sp;
  const armExpress = clamp(r + sp * 0.3, 0, 1);
  const openL = clamp(0.52 + 0.3 * Math.sin(ph * 0.5 + 0.4) + 0.18 * Math.sin(ph * 2.3 + 0.9), 0, 1);
  const openR = clamp(0.52 + 0.3 * Math.sin(ph * 0.5 + 2.2) + 0.18 * Math.sin(ph * 2.7 + 3.0), 0, 1);
  const spreadL = armSpread * (1 - armExpress * (0.65 * (1 - openL)));
  const spreadR = armSpread * (1 - armExpress * (0.65 * (1 - openR)));
  T.armLZ = -0.2 - spreadL;
  T.armRZ = 0.2 + spreadR;
  const elbowL = armExpress * (0.12 * Math.sin(ph * 1.7 + 0.3) + 0.08 * Math.sin(ph * 3.1 + 0.8));
  const elbowR = armExpress * (0.12 * Math.sin(ph * 1.9 + 2.1) + 0.08 * Math.sin(ph * 2.7 + 0.2));
  T.foreL = -(0.15 + g.fore * walk + Math.max(0, -sn) * 0.14 * r) + elbowL;
  T.foreR = -(0.15 + g.fore * walk + Math.max(0, sn) * 0.14 * r) + elbowR;
  T.wristLX = -0.04 - Math.max(0, sn) * 0.05 * r;
  T.wristRX = -0.04 - Math.max(0, -sn) * 0.05 * r;
  // torsion du buste opposée au bassin
  T.torsoY = -sn * g.torso * walk;
  T.torsoZ = -sn * 0.025 * r * walk + bank * 0.3;
  T.hipsZ = sn * g.hips * walk + Math.sin((p.now || 0) * 1.05) * 0.035 * still;
  // la tête suit la course : elle accompagne la penchée (sans la compenser tout à fait),
  // hoche à chaque appui, roule avec les hanches et traîne un peu à l'accélération
  const nod = Math.cos(ph * 2) * (0.035 + 0.05 * r + 0.035 * sp) * walk;
  T.neckX = -T.lean * 0.1 + nod * 0.4;
  T.headX = -T.lean * 0.25 + nod - clamp((p.accF || 0) * 0.012, -0.12, 0.14);
  T.headZ += Math.sin(ph) * (0.03 + 0.04 * r) * walk;
  T.neckZ += Math.sin(ph) * 0.02 * walk;
  const look = clamp((p.inputAngle || 0) * 0.8, -0.7, 0.7);
  T.headY = look + Math.sin(ph) * 0.05 * r * walk;
  T.torsoY += clamp((p.inputAngle || 0) * 0.4, -0.35, 0.35);
  // bras extérieur écarté dans un virage serré
  if (bank > 0) T.armRZ += bank * 0.8;
  else T.armLZ += bank * 0.8;
  // départ : petite compression avant de s'élancer
  if (p.startT !== undefined && p.startT < 0.14) {
    const k = Math.sin((p.startT / 0.14) * Math.PI);
    T.bodyY -= 0.05 * k;
    T.lean -= 0.04 * k;
    T.armLX -= 0.15 * k;
    T.armRX -= 0.15 * k;
  }
  // freinage : les bras partent en avant
  if ((p.accF || 0) < -4) {
    const k = clamp((-(p.accF || 0) - 4) * 0.05, 0, 0.35);
    T.armLX -= k;
    T.armRX -= k;
  }
  // essoufflement après un long sprint
  const br = p.breath || 0;
  if (br > 0) {
    T.sy += Math.sin((p.now || 0) * 7.5) * 0.022 * br * still;
    T.torsoX += (0.08 + Math.sin((p.now || 0) * 7.5) * 0.03) * br * still;
    T.headX += 0.06 * br * still;
  }
  // visage : effort au sprint (souffle un pas sur deux), plaisir en course
  if (sp > 0.4) X.expr = (Math.floor(ph / Math.PI) & 3) < 2 ? 'effort' : 'effortSouffle';
  else if (r > 0.5) X.expr = 'content';
  else if (br > 0.3 && still > 0.5) X.expr = 'essouffle';
}

function landOverlay(p, T, k) {
  if (k <= 0) return;
  const imp = clamp((p.impact || 0) * 0.03, 0, 0.3);
  T.sy *= 1 - imp * k;
  T.sx *= 1 + imp * 0.5 * k;
  T.bodyY -= 0.12 * k;
  T.thighL -= 0.6 * k;
  T.thighR -= 0.6 * k;
  T.shinL += 1.2 * k;
  T.shinR += 1.2 * k;
  T.armLZ -= 0.5 * k;
  T.armRZ += 0.5 * k;
  T.lean += 0.12 * k;
}

function crouchPose(p, T, X) {
  // réception lourde à l'arrêt : accroupi, mains vers le sol, puis on se relève
  const k = p.t < 0.25 ? 1 : 1 - clamp((p.t - 0.25) / 0.1, 0, 1);
  const imp = clamp((p.impact || 0) * 0.03, 0, 0.3);
  T.sy = 1 - imp * k;
  T.sx = 1 + imp * 0.5 * k;
  T.bodyY = -0.25 * k;
  T.thighL = T.thighR = -1.2 * k;
  T.shinL = T.shinR = 2.0 * k;
  T.footL = T.footR = 0.25 * k;
  T.lean = 0.3 * k;
  T.armLX = T.armRX = -0.7 * k;
  T.armLZ = -0.2 - 0.3 * k;
  T.armRZ = 0.2 + 0.3 * k;
  T.headX = -0.2 * k;
  X.expr = 'concentre';
}

function skidPose(p, T, X) {
  // freinage : buste en arrière, jambe avant tendue en frein, bras qui moulinent
  const k = p.stopOnly ? 0.7 : 1;
  const flail = Math.sin(p.t * TAU * 18) * 0.12;
  T.lean = -0.35 * k;
  T.bodyY = -0.12 * k;
  T.sy = 0.96;
  T.thighL = -0.9 * k;
  T.shinL = 0.15;
  T.footL = -0.4 * k;
  T.thighR = 0.35 * k;
  T.shinR = 0.9 * k;
  T.footR = 0.2;
  T.armLX = -1.2 * k + flail;
  T.armRX = -1.0 * k - flail;
  T.armLZ = -0.55;
  T.armRZ = 0.55;
  T.foreL = T.foreR = -0.5;
  T.torsoX = -0.1;
  T.headX = 0.18;
  X.expr = 'surpris';
}

function pivotPose(p, T, X) {
  // demi-tour en bond : bras rentrés puis ouverts, petit écrasement à l'appui
  const k = clamp(p.t / 0.16, 0, 1);
  const hop = Math.sin(Math.PI * k);
  T.bodyY = 0.12 * hop;
  T.sy = 1 + 0.06 * hop - (k > 0.8 ? ((k - 0.8) / 0.2) * 0.08 : 0);
  T.thighL = T.thighR = -0.45 * hop;
  T.shinL = T.shinR = 0.9 * hop;
  T.armLX = T.armRX = -0.4 + 0.3 * k;
  T.foreL = T.foreR = -1.6 * (1 - k) - 0.3;
  T.armLZ = -0.2 - 0.6 * k;
  T.armRZ = 0.2 + 0.6 * k;
  T.lean = 0.15 * k;
  X.expr = 'concentre';
}

function turnPose(p, T, X) {
  // demi-tour sur place : petits pas rapides, la tête d'abord
  const k = clamp(p.t / 0.18, 0, 1);
  const st = Math.sin(k * TAU);
  T.thighL = st * 0.35;
  T.thighR = -st * 0.35;
  T.shinL = Math.max(0, -st) * 0.6;
  T.shinR = Math.max(0, st) * 0.6;
  T.bodyY = Math.abs(st) * 0.03;
  T.armLX = -st * 0.3;
  T.armRX = st * 0.3;
  T.headY = clamp((p.inputAngle || 0) * 0.8, -0.7, 0.7);
}

function rollPose(p, T, X) {
  // en boule, un tour complet autour de l'axe transversal (rapide au milieu)
  const u = clamp(p.rollT || 0, 0, 1);
  const e = u * u * (3 - 2 * u);
  X.spin = (TAU * e) % TAU;
  // pivot au milieu de la silhouette (grosse tête comprise) : la boule ne traverse pas le sol
  X.lift = 0.62;
  T.thighL = T.thighR = -1.9;
  T.shinL = T.shinR = 2.2;
  T.footL = T.footR = 0.3;
  T.armLX = T.armRX = -1.0;
  T.foreL = T.foreR = -1.7;
  T.armLZ = -0.1;
  T.armRZ = 0.1;
  T.headX = 0.35;
  T.neckX = 0.2;
  T.torsoX = 0.25;
  T.lean = 0;
  T.bodyY = 0.12;
  // ramassé en boule, écrasé à l'entrée, étiré à la sortie
  const sq = u < 0.15 ? 0.85 + u : u > 0.85 ? 1 + Math.sin(((u - 0.85) / 0.15) * Math.PI) * 0.1 : 1;
  T.sy = sq * 0.86;
  T.sx = (1 + (1 - sq) * 0.5) * 0.94;
  X.expr = (p.chain || 0) > 0 ? 'joie' : 'concentre';
}

function airPose(p, T, X) {
  const vy = p.vy || 0;
  const rise = clamp(vy / 7.2, 0, 1);
  const apex = 1 - clamp(Math.abs(vy) / 1.5, 0, 1);
  const flail = p.state === 'FALL' && (p.airTime || 0) > 0.6;
  // saut : un genou levé, l'autre jambe en arrière, bras vers le ciel
  T.sy = 1 + 0.08 * rise;
  T.sx = 1 - 0.04 * rise;
  T.thighL = -0.9 - 0.2 * apex;
  T.shinL = 1.3 + 0.3 * apex;
  T.thighR = 0.35 - 0.9 * apex;
  T.shinR = 0.7 + 0.8 * apex;
  T.footL = T.footR = 0.3;
  T.armLX = -1.2 - 1.0 * rise;
  T.armRX = -0.6 - 0.4 * rise;
  T.armLZ = -0.35;
  T.armRZ = 0.45;
  T.foreL = T.foreR = -0.35;
  T.lean = 0.12;
  if (p.jumpLong) {
    // saut long : corps allongé, bras devant
    T.lean = 0.5;
    T.armLX = T.armRX = -1.6;
    T.thighL = T.thighR = 0.25;
    T.shinL = T.shinR = 0.6;
  }
  if (flail) {
    // longue chute : les bras battent, les jambes pédalent
    const w = (p.airTime || 0) * 14;
    T.armLX = -2.4 + Math.sin(w) * 0.5;
    T.armRX = -2.4 - Math.sin(w) * 0.5;
    T.armLZ = -0.8;
    T.armRZ = 0.8;
    T.thighL = Math.sin(w * 0.7) * 0.6 - 0.3;
    T.thighR = -Math.sin(w * 0.7) * 0.6 - 0.3;
    T.shinL = T.shinR = 0.8;
    T.lean = 0;
    X.expr = 'surpris';
  }
  const bank = bankAngle(Math.hypot(p.v, p.vLat), p.omega || 0);
  T.bodyRoll = -bank * 0.6;
}

function bonkPose(p, T, X) {
  // assis, sonné : la tête oscille, les bras écartés
  const k = clamp(p.t / 0.5, 0, 1);
  const wob = Math.sin(p.t * 14) * 0.22 * (1 - k);
  T.bodyY = -0.33;
  T.thighL = T.thighR = -1.45;
  T.shinL = T.shinR = 1.2;
  T.lean = -0.25;
  T.headZ = wob;
  T.headY = wob * 0.5;
  T.armLZ = -1.0;
  T.armRZ = 1.0;
  T.foreL = T.foreR = -0.4;
  X.expr = 'surpris';
}

function tripPose(p, T, X) {
  // le pied accroche : on pique du nez, bras tendus devant, jambes qui partent en arrière
  const k = clamp(p.t / 0.3, 0, 1);
  const flail = Math.sin(p.t * 26) * 0.35;
  T.lean = 0.35 + 0.95 * k;
  T.bodyY = 0.05;
  T.thighL = 0.5 + 0.2 * k;
  T.thighR = 0.2 + 0.4 * k;
  T.shinL = 0.6;
  T.shinR = 1.0;
  T.footL = T.footR = 0.3;
  T.armLX = -2.0 + flail;
  T.armRX = -1.7 - flail;
  T.armLZ = -0.6;
  T.armRZ = 0.6;
  T.foreL = T.foreR = -0.2;
  T.headX = -0.5 * k;
  X.expr = 'surpris';
}

function fallenPose(p, T, X) {
  // à plat ventre : petit écrasement à l'impact, les pieds battent, la tête sonnée oscille
  const k = clamp(p.t / 0.15, 0, 1);
  const kick = Math.sin(clamp(p.t / 0.5, 0, 1) * Math.PI);
  T.lean = 1.45;
  T.bodyY = 0.16 + 0.04 * (1 - k);
  T.sy = 1 - 0.08 * (1 - k);
  T.sx = 1 + 0.05 * (1 - k);
  T.thighL = T.thighR = 0.15;
  T.shinL = 0.9 * kick + 0.2;
  T.shinR = 0.7 * kick + 0.2;
  T.armLX = T.armRX = -2.6;
  T.armLZ = -0.5;
  T.armRZ = 0.5;
  T.foreL = T.foreR = -0.3;
  T.headX = -0.7;
  T.headZ = Math.sin(p.t * 9) * 0.12 * (1 - clamp(p.t / 0.7, 0, 1));
  X.expr = p.t < 0.25 ? 'surpris' : 'endormi';
}

function getupPose(p, T, X) {
  // à quatre pattes, puis debout ; un petit geste pour s'épousseter
  const k = clamp(p.t / 0.5, 0, 1);
  if (k < 0.5) {
    const u = k / 0.5;
    T.lean = 1.45 - 0.75 * u;
    T.bodyY = 0.16 - 0.5 * u;
    T.thighL = T.thighR = 0.15 - 1.55 * u;
    T.shinL = T.shinR = 0.2 + 1.8 * u;
    T.armLX = T.armRX = -2.6 + 1.6 * u;
    T.headX = -0.7 + 0.5 * u;
  } else {
    const u = (k - 0.5) / 0.5;
    const e = u * u * (3 - 2 * u);
    T.lean = 0.7 - 0.65 * e;
    T.bodyY = -0.34 * (1 - e);
    T.thighL = T.thighR = -1.4 * (1 - e);
    T.shinL = T.shinR = 2.0 * (1 - e);
    T.armLX = -1.0 * (1 - e) + Math.sin(u * Math.PI * 3) * 0.3 * e;
    T.armRX = -1.0 * (1 - e);
    T.foreL = -0.15 - 1.2 * e * (1 - u);
    T.headX = -0.2 * (1 - e);
  }
  X.expr = k < 0.6 ? 'concentre' : 'content';
}

function slidePose(p, T, X) {
  // glissade sur la pente : surf, bras en balancier, un pied devant
  const bank = bankAngle(Math.hypot(p.v, p.vLat), p.omega || 0);
  T.lean = -0.2;
  T.bodyY = -0.1;
  T.bodyRoll = -bank;
  T.thighL = -0.6;
  T.shinL = 0.3;
  T.thighR = 0.4;
  T.shinR = 1.2;
  T.armLZ = -1.1 + Math.sin((p.now || 0) * 6) * 0.1;
  T.armRZ = 1.1 - Math.sin((p.now || 0) * 6) * 0.1;
  T.armLX = T.armRX = -0.3;
  X.expr = 'joie';
}

export { clamp };
