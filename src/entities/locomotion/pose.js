// Poses de locomotion (pures, testables en Node) : longueur de pas, allures mélangées,
// effort du sprint, inclinaison en virage, regard anticipé, dérapage, roulade, saut…
// Le personnage (Character.js) applique ces valeurs d'articulations à son squelette.

import { BASE_TUNING } from './tuning.js';
import { trunkFrame } from './trunk.js';
import { GABARIT, GABARITS, BODY_Y_K } from '../../models/personnage/gabarit.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Cadences visées (appuis par seconde) aux allures de référence : la longueur d'appui
// en découle, et suit les vitesses de course et de sprint réglées dans tuning.js.
export const CADENCE = { run: 5.4 / 1.65, sprint: 8.2 / 2.35 }; // ≈ 3,27 et 3,49 appuis/s
// Distance entre appuis alternés (m), interpolée entre les allures de référence.
// Chaque appui correspond à la distance réellement parcourue.
const strideTable = (T) => [
  [0, 0.38],
  [T.walkMax, 1.05],
  [T.run, T.run / CADENCE.run],
  [T.sprint, T.sprint / CADENCE.sprint],
  [(T.sprint * 12) / 8.2, ((T.sprint / CADENCE.sprint) * 2.7) / 2.35],
];
const STRIDE = strideTable(BASE_TUNING);

// Mélanges d'allures rapportés aux vitesses réglées : course de 44 à 93 % de T.run,
// sprint de 7 à 93 % de l'écart entre course et sprint.
const RUN_BLEND = [(BASE_TUNING.run * 2.4) / 5.4, (BASE_TUNING.run * 5.0) / 5.4];
const SPRINT_BLEND = [
  BASE_TUNING.run + ((BASE_TUNING.sprint - BASE_TUNING.run) * 0.2) / 2.8,
  BASE_TUNING.run + ((BASE_TUNING.sprint - BASE_TUNING.run) * 2.6) / 2.8,
];

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
  TRIP: 'trip', FALLEN: 'fallen', GETUP: 'getup', CLIMB: 'climb', CLIMB_TOP: 'perch',
};
// demi-vie (s) de la transition vers chaque famille
export const FAMILY_HALFLIFE = { roll: 0.06, pivot: 0.07, land: 0.07, skid: 0.08, air: 0.1, bonk: 0.09, turn: 0.08, slide: 0.12, sol: 0.12, trip: 0.07, fallen: 0.06, getup: 0.1, climb: 0.08, perch: 0.14 };

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
    case 'climb':
      climbPose(p, T, X);
      break;
    case 'perch':
      perchPose(p, T, X);
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

// inclinaison dans la courbe (radians, positive = virage à gauche) estimée sur la vitesse
// angulaire : repli quand le moteur ne fournit pas sa propre inclinaison (loco.bank)
export function bankAngle(speed, omega) {
  return clamp(Math.atan((speed * omega) / 9.81) * 0.8, -0.35, 0.35);
}

// Inclinaison appliquée au corps : celle du moteur (filtrée au pas fixe), bornée ; sinon l'estimation.
export const BANK_MAX = BASE_TUNING.bankMax ?? 0.8; // même plafond que le moteur
export function bodyBank(p, speed) {
  return typeof p.bank === 'number' ? clamp(p.bank, -BANK_MAX, BANK_MAX) : bankAngle(speed, p.omega || 0);
}

// Abaissement du bassin selon l'inclinaison : rien sous 0,2 rad, 10 cm au plafond (« juste
// légèrement » : le corps s'abaisse à peine dans un virage ordinaire).
export const BANK_DROP = 0.1; // m : bassin abaissé au plus fort de l'inclinaison
export function bankDrop(bank) {
  return BANK_DROP * smooth(0.2, BANK_MAX, Math.abs(bank));
}
// main au sol : pli latéral du buste et penchée en avant (rad), abaissement supplémentaire (m)
const HAND_SIDE_BEND = GABARIT.pliMain;
const HAND_LEAN = GABARIT.penchMain;
const HAND_EXTRA_DROP = 0.06;
// écart de base des bras (rad, autour de z) au sol, bras le long du corps : 0,2 réglé sur le chibi, plus
// l'écart propre au gabarit (gabarit.ecartBras ; 0 pour le chibi)
const ARM_BASE = 0.2 + GABARIT.ecartBras;
// hanche → cheville (m) : 0,30 chez le chibi
const JAMBE = GABARIT.REST[9][1] - GABARIT.REST[17][1]; // os THIGH_R → FOOT_R

// Fatigue du sprint (0 à 1) : celle du moteur si elle existe, sinon déduite du temps de sprint.
function fatigueOf(p) {
  if (typeof p.fatigue === 'number') return clamp(p.fatigue, 0, 1);
  return clamp(((p.sprintTime || 0) - 4) / 6, 0, 1);
}

// Main au sol voulue par l'état du moteur : seulement au sol, en course ou au sprint.
export function handWeightTarget(p) {
  return p && p.handDown && p.grounded !== false && (p.state === 'RUN' || p.state === 'SPRINT') && !p.swim ? 1 : 0;
}

function groundPose(p, T, X) {
  const s = Math.hypot(p.v, p.vLat);
  const walk = clamp(s / 1.2, 0, 1);
  const still = 1 - walk;
  const r = smooth(RUN_BLEND[0], RUN_BLEND[1], s);
  const sp = smooth(SPRINT_BLEND[0], SPRINT_BLEND[1], s);
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
  // accélération longitudinale : celle du moteur au pas fixe (aLong), sinon l'ancienne (accF)
  const aLong = p.aLong ?? p.accF ?? 0;
  // penchée : allure + accélération (on se jette en avant, on se retient au freinage) + pente
  T.lean = g.lean * walk + clamp(aLong * 0.03, -0.18, 0.15) + clamp((p.slopeAlong || 0) * 0.35, -0.1, 0.2);
  // Inclinaison dans la courbe, pivot aux pieds (Character) : le corps entier penche, le buste
  // un peu plus quand la main va au sol, et la tête compense pour garder l'horizon (≈ 10 % restant).
  const bank = bodyBank(p, s);
  const ab = Math.abs(bank);
  const hw = clamp(p.handW || 0, 0, 1);
  T.bodyRoll = -bank;
  // main au sol : le buste se plie vers l'intérieur et se penche un peu en avant pour
  // descendre l'épaule
  const side = Math.sign(bank);
  T.lean += HAND_LEAN * hw;
  const torsoBank = bank * 0.1 - side * HAND_SIDE_BEND * hw;
  T.neckZ = bank * 0.3 + side * 0.1 * hw;
  T.headZ = bank * 0.5 + side * (HAND_SIDE_BEND - 0.1) * hw + Math.sin((p.now || 0) * 0.9) * 0.04 * still;
  // le bassin s'abaisse et les genoux plient avec l'inclinaison, un peu plus main au sol
  // (15 cm au plus, main au sol)
  const drop = Math.min(BANK_DROP + HAND_EXTRA_DROP, bankDrop(bank) + HAND_EXTRA_DROP * hw) * walk;
  T.bodyY -= drop;
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
  // genoux pliés pour l'abaissement (hanche → cheville : 0,30 m chez le chibi ; l'abaissement rendu est
  // drop · BODY_Y_K) : cuisse en avant, tibia replié deux fois plus, pied gardé dans son orientation
  if (drop > 1e-5) {
    const knee = Math.acos(clamp(1 - (drop * BODY_Y_K) / JAMBE, -1, 1)) * 0.85;
    T.thighL -= knee;
    T.thighR -= knee;
    T.shinL += 2 * knee;
    T.shinR += 2 * knee;
    T.footL -= knee;
    T.footR -= knee;
  }
  // bras en balancier opposé, avant-bras pliés (≈ 95° au sprint), qui pompent ; l'effort
  // (sprint, accélération) les pompe davantage, la fatigue du sprint les relâche
  const fat = fatigueOf(p) * sp;
  const effort = clamp(sp + Math.max(0, aLong) / 10, 0, 1.3);
  const swingGain = 1 + 0.12 * effort - 0.25 * fat;
  const foreGain = 1 + 0.15 * effort - 0.35 * fat;
  const armDrive = clamp(aLong * 0.012, -0.12, 0.16);
  T.armLX = (-thighL * g.arm / g.thigh * swingGain + g.armOff + armDrive) * walk;
  T.armRX = (-thighR * g.arm / g.thigh * swingGain + g.armOff + armDrive) * walk;
  // L'ouverture varie entre bras semi-repliés et presque horizontaux. Des rythmes
  // secondaires déphasés donnent des écarts spontanés sans introduire d'aléatoire.
  const armSpread = (0.18 * walk + 0.58 * r + 0.34 * sp) * (1 + 0.2 * fat);
  const armExpress = clamp(r + sp * 0.3, 0, 1);
  const openL = clamp(0.52 + 0.3 * Math.sin(ph * 0.5 + 0.4) + 0.18 * Math.sin(ph * 2.3 + 0.9), 0, 1);
  const openR = clamp(0.52 + 0.3 * Math.sin(ph * 0.5 + 2.2) + 0.18 * Math.sin(ph * 2.7 + 3.0), 0, 1);
  const spreadL = armSpread * (1 - armExpress * (0.65 * (1 - openL)));
  const spreadR = armSpread * (1 - armExpress * (0.65 * (1 - openR)));
  T.armLZ = -ARM_BASE - spreadL;
  T.armRZ = ARM_BASE + spreadR;
  const elbowL = armExpress * (0.12 * Math.sin(ph * 1.7 + 0.3) + 0.08 * Math.sin(ph * 3.1 + 0.8));
  const elbowR = armExpress * (0.12 * Math.sin(ph * 1.9 + 2.1) + 0.08 * Math.sin(ph * 2.7 + 0.2));
  T.foreL = -(0.15 + g.fore * walk * foreGain + Math.max(0, -sn) * 0.14 * r) + elbowL;
  T.foreR = -(0.15 + g.fore * walk * foreGain + Math.max(0, sn) * 0.14 * r) + elbowR;
  T.wristLX = -0.04 - Math.max(0, sn) * 0.05 * r;
  T.wristRX = -0.04 - Math.max(0, -sn) * 0.05 * r;
  // torsion du buste opposée au bassin ; le bassin contre-tourne davantage avec la vitesse
  T.torsoY = -sn * g.torso * walk;
  T.hipsY = sn * (0.02 + 0.03 * r + 0.05 * sp) * walk;
  T.torsoZ = -sn * 0.025 * r * walk + torsoBank;
  T.hipsZ = sn * g.hips * walk + Math.sin((p.now || 0) * 1.05) * 0.035 * still;
  // la tête suit la course : elle accompagne la penchée (sans la compenser tout à fait),
  // hoche à chaque appui, roule avec les hanches et traîne un peu à l'accélération
  const nod = Math.cos(ph * 2) * (0.035 + 0.05 * r + 0.035 * sp) * walk;
  T.neckX = -T.lean * 0.1 + nod * 0.4;
  T.headX = -T.lean * 0.25 + nod - clamp(aLong * 0.012, -0.12, 0.14);
  T.headZ += Math.sin(ph) * (0.03 + 0.04 * r) * walk;
  T.neckZ += Math.sin(ph) * 0.02 * walk;
  const look = clamp((p.inputAngle || 0) * 0.8, -0.7, 0.7);
  T.headY = look + Math.sin(ph) * 0.05 * r * walk;
  T.torsoY += clamp((p.inputAngle || 0) * 0.4, -0.35, 0.35);
  // Virage : le bras extérieur s'ouvre et se lève un peu pour l'équilibre, l'intérieur s'écarte
  // vers le sol (Character l'y amène par cinématique inverse quand la main touche).
  // Os R côté +x : intérieur d'un virage à gauche (bank > 0).
  const outerOpen = 0.9 * ab;
  const innerReach = 0.45 * ab;
  if (bank > 0) {
    T.armRZ += innerReach;
    T.armLZ -= outerOpen;
    T.armLX -= 0.25 * ab;
    T.foreL += 0.25 * ab;
  } else if (bank < 0) {
    T.armLZ -= innerReach;
    T.armRZ += outerOpen;
    T.armRX -= 0.25 * ab;
    T.foreR += 0.25 * ab;
  }
  // départ : petite compression avant de s'élancer
  if (p.startT !== undefined && p.startT < 0.14) {
    const k = Math.sin((p.startT / 0.14) * Math.PI);
    T.bodyY -= 0.05 * k;
    T.lean -= 0.04 * k;
    T.armLX -= 0.15 * k;
    T.armRX -= 0.15 * k;
  }
  // freinage : les bras partent en avant
  if (aLong < -4) {
    const k = clamp((-aLong - 4) * 0.05, 0, 0.35);
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
  T.armLZ = -ARM_BASE - 0.3 * k;
  T.armRZ = ARM_BASE + 0.3 * k;
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
  T.armLZ = -ARM_BASE - 0.6 * k;
  T.armRZ = ARM_BASE + 0.6 * k;
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
  // longue chute (au-delà de 0,6 s, fréquente depuis un arbre) : les bras se mettent à battre en 0,25 s
  const flail = p.state === 'FALL' ? smooth(0.6, 0.85, p.airTime || 0) : 0;
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
  if (flail > 0) {
    // longue chute : les bras battent, les jambes pédalent
    const w = (p.airTime || 0) * 14;
    const f = flail;
    T.armLX += (-2.4 + Math.sin(w) * 0.5 - T.armLX) * f;
    T.armRX += (-2.4 - Math.sin(w) * 0.5 - T.armRX) * f;
    T.armLZ += (-0.8 - T.armLZ) * f;
    T.armRZ += (0.8 - T.armRZ) * f;
    T.thighL += (Math.sin(w * 0.7) * 0.6 - 0.3 - T.thighL) * f;
    T.thighR += (-Math.sin(w * 0.7) * 0.6 - 0.3 - T.thighR) * f;
    T.shinL += (0.8 - T.shinL) * f;
    T.shinR += (0.8 - T.shinR) * f;
    T.lean *= 1 - f;
    if (f > 0.5) X.expr = 'surpris';
  }
  // saut arrière depuis un tronc : dos cambré, bras ouverts, jambes serrées, qui s'efface en l'air
  if (p.trunkJump === 'back') {
    const k = 1 - smooth(0.25, 0.7, p.airTime || 0);
    T.lean += (-0.3 - T.lean) * k;
    T.torsoX += -0.28 * k;
    T.headX += (-0.3 - T.headX) * k;
    T.armLX += (-0.7 - T.armLX) * k;
    T.armRX += (-0.7 - T.armRX) * k;
    T.armLZ += (-1.35 - T.armLZ) * k;
    T.armRZ += (1.35 - T.armRZ) * k;
    T.foreL += (-0.15 - T.foreL) * k;
    T.foreR += (-0.15 - T.foreR) * k;
    T.thighL += (0.25 - T.thighL) * k;
    T.thighR += (0.3 - T.thighR) * k;
    T.shinL += (0.55 - T.shinL) * k;
    T.shinR += (0.5 - T.shinR) * k;
    X.expr = 'joie';
  }
  const bank = bodyBank(p, Math.hypot(p.v, p.vLat));
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
  const bank = bodyBank(p, Math.hypot(p.v, p.vLat));
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

// ---------------------------------------------------------------------------
// Grimpe aux arbres (CLIMB, puis CLIMB_TOP au sommet). Repère racine : pieds en 0, avant = +z,
// face au tronc ; l'axe passe devant, à r + CLIMB_GAP de la racine (moteur), et le corps suit sa
// tangente. Les mains montent l'une après l'autre et tiennent l'écorce (Character les y pose par
// cinématique inverse, cibles de climbHandTarget) ; les jambes serrent puis poussent comme une
// grenouille, une poussée par cycle des mains. Tout le cycle avance avec la position sur le tronc (s en
// montée, climbArc autour), comme les foulées avec la distance : immobile, la pose ne bouge pas.
// ---------------------------------------------------------------------------
export const CLIMB_GAP = 0.22; // m : racine ↔ écorce (moteur)
// Hauteurs des prises réglées sur le chibi (épaule à 0,775 m, bras de 0,38 m main comprise), portées au
// gabarit : écart à l'épaule (gabarit.prise, chibi 0,155 au-dessus et 0,025 au-dessous) à l'échelle du
// bras, levée du poirier à l'échelle de l'épaule
const epaule = (g) => g.REST[5][1]; // os ARM_R
const bras = (g) => g.REST[5][1] - g.REST[15][1] + g.main; // épaule → bout de la main (os HAND_R)
const EPAULE = epaule(GABARIT);
const KB = bras(GABARIT) / bras(GABARITS.chibi);
const KE = EPAULE / epaule(GABARITS.chibi);
// Jambes en grenouille réglées sur le chibi (cuisse de 0,15 m : genou à 15 cm devant la racine, l'écorce
// est à 0,22 m). Une cuisse plus longue fléchit moins, pour garder le genou à la même distance ; le tibia
// garde son orientation (FLEX = 1 pour le chibi).
const CUISSE = GABARIT.REST[9][1] - GABARIT.REST[10][1]; // os THIGH_R → SHIN_R
const FLEX = Math.min(1, Math.asin(Math.min(1, 0.15 / CUISSE)) / 1.55);
export const CLIMB = {
  low: EPAULE - GABARIT.prise.bas * KB, // m le long du tronc au-dessus de la racine : prise la plus basse (à hauteur d'épaule)…
  high: EPAULE + GABARIT.prise.haut * KB, // … et la plus haute, bras presque tendu (au-delà, la main n'atteint plus l'écorce)
  grip: 0.6, // part du cycle d'une main où elle tient l'écorce (les deux mains se relaient)
  angle: 0.42, // rad : prise tournée autour de l'axe vers l'épaule de son côté
  arcCycle: 0.3, // m de tour (climbArc) pour le cycle latéral d'une main
  shuffle: 0.15, // rad : amplitude de ce cycle latéral (pas chassés)
  hugH: EPAULE - GABARIT.prise.serre * KB, // glissade : mains serrées autour du tronc, à hauteur d'épaule…
  hugAngle: 0.75, // … et presque sur les côtés
  handGap: 0.004, // m de jour entre la main et l'écorce
  perchLift: 0.54 * KE, // m : pivot du poirier : retourné, l'épaule passe à 0,31 m (chibi) au-dessus du
  // sommet et la main s'y pose coude fléchi (bras tendu, le coude plierait d'un coup au retour de la bascule)
};
// distance de montée pour le cycle complet d'une main : pendant la prise, le corps monte d'autant
// que la main descend dans son repère (la main ne glisse pas sur l'écorce)
export const CLIMB_CYCLE = (CLIMB.high - CLIMB.low) / CLIMB.grip;
const frac = (x) => x - Math.floor(x);
// dent de scie : de hi à lo pendant la prise (part grip), retour adouci de lo à hi ensuite
function sawGrip(u, hi, lo, grip) {
  if (u < grip) return hi + ((lo - hi) * u) / grip;
  return lo + (hi - lo) * smooth(0, 1, (u - grip) / (1 - grip));
}

// Inclinaison du corps qui suit l'axe, dans le repère du cap : direction bodyTangent (corde de
// trunkChord, posée par Character), sinon la tangente du moteur (climbTangent) ; lean (autour de x,
// + vers l'avant) et roulis du corps (Euler XYZ de applyJoints).
export function trunkTilt(p, out = {}) {
  const t = p.bodyTangent || p.climbTangent;
  if (!t) {
    out.lean = 0;
    out.roll = 0;
    return out;
  }
  const h = p.heading || 0;
  const c = Math.cos(h);
  const sn = Math.sin(h);
  const lx = t[0] * c - t[2] * sn;
  const lz = t[0] * sn + t[2] * c;
  out.lean = Math.atan2(lz, t[1]);
  out.roll = -Math.asin(clamp(lx, -1, 1));
  return out;
}

// Prise d'une main (side +1 : os R, x > 0 ; −1 : os L) au cycle de la grimpe : h (m le long du
// tronc au-dessus de la racine), a (rad autour de l'axe, + vers x +), hold (1 si elle tient).
export function climbGrip(p, side, out = {}) {
  const C = CLIMB;
  const u = frac((p.climbS || 0) / CLIMB_CYCLE + (side > 0 ? 0.5 : 0));
  out.h = sawGrip(u, C.high, C.low, C.grip);
  out.hold = u < C.grip ? 1 : 0;
  // pas chassés : la main tient pendant que le corps tourne, puis rattrape (climbArc croît vers x +)
  const ua = frac((p.climbArc || 0) / C.arcCycle + (side > 0 ? 0 : 0.5));
  out.a = side * C.angle + sawGrip(ua, C.shuffle, -C.shuffle, C.grip);
  // glissade : mains serrées autour du tronc
  const w = clamp(p.slideW || 0, 0, 1);
  out.h += (C.hugH - out.h) * w;
  out.a += (side * C.hugAngle - out.a) * w;
  return out;
}

// Cible (repère racine) du centre de la main sur l'écorce. axisAt(ds, o) rend dans le repère racine
// le point de l'axe à s + ds, sa tangente unitaire et son rayon : { x, y, z, tx, ty, tz, r }.
// handR : rayon de la main (échelle du corps comprise).
const _grip = {};
const _ax = {};
export function climbHandTarget(p, side, axisAt, handR, out) {
  const g = climbGrip(p, side, _grip);
  const A = axisAt(g.h, _ax);
  // de l'axe vers le personnage (−z), tourné de a vers x +, puis rendu perpendiculaire à l'axe
  let dx = Math.sin(g.a);
  let dy = 0;
  let dz = -Math.cos(g.a);
  const d = dx * A.tx + dz * A.tz;
  dx -= d * A.tx;
  dy -= d * A.ty;
  dz -= d * A.tz;
  const n = Math.hypot(dx, dy, dz) || 1;
  const R = A.r + handR + CLIMB.handGap;
  out.x = A.x + (dx / n) * R;
  out.y = A.y + (dy / n) * R;
  out.z = A.z + (dz / n) * R;
  return out;
}

// Axe du tronc (polyligne monde [x, y, z, r], du pied vers le haut) à l'abscisse curviligne s :
// point, tangente unitaire (lissée aux coudes, comme le moteur : locomotion/trunk.js), rayon.
const _tf = {};
export function axisPoint(pts, s, out = {}) {
  const f = trunkFrame(pts, s, 0, _tf);
  out.x = f.x;
  out.y = f.y;
  out.z = f.z;
  out.r = f.r;
  out.tx = f.tx;
  out.ty = f.ty;
  out.tz = f.tz;
  return out;
}

// Direction (monde, unitaire) que suit le corps sur un tronc courbe : la corde de l'axe entre les
// pieds (s) et la plus haute prise des mains (s + CLIMB.high), pas la seule tangente aux pieds (le
// stipe de la maison s'en écarte de 10 cm en 1 m, hors de portée des bras).
const _ca = {};
const _cb = {};
export function trunkChord(pts, s, out = [0, 1, 0]) {
  const a = axisPoint(pts, s, _ca);
  const b = axisPoint(pts, s + CLIMB.high, _cb);
  const x = b.x - a.x;
  const y = b.y - a.y;
  const z = b.z - a.z;
  const n = Math.hypot(x, y, z);
  if (n < 1e-6) {
    out[0] = a.tx;
    out[1] = a.ty;
    out[2] = a.tz;
  } else {
    out[0] = x / n;
    out[1] = y / n;
    out[2] = z / n;
  }
  return out;
}

// Repère de la racine sur le tronc, comme le moteur : racine en A(s) + (r(s) + CLIMB_GAP) · n(θ),
// θ = cap − π (le personnage regarde le tronc ; n(θ) de locomotion/trunk.js).
export function climbRootFrame(pts, s, heading, out = {}) {
  const f = trunkFrame(pts, s, heading - Math.PI, _tf);
  const R = f.r + CLIMB_GAP;
  out.x = f.x + f.nx * R;
  out.y = f.y + f.ny * R;
  out.z = f.z + f.nz * R;
  out.heading = heading;
  out.s = s;
  out.pts = pts;
  return out;
}

// Repère de la racine telle qu'elle est rendue (position et cap de Player : pendant les raccords du
// moteur, elle s'écarte de sa place sur le tronc) : les mains visent l'écorce réelle, à partir de
// l'abscisse s de la racine (interpolée comme le rendu).
export function climbRenderFrame(pts, s, pos, heading, out = {}) {
  out.x = pos.x;
  out.y = pos.y;
  out.z = pos.z;
  out.heading = heading;
  out.s = s;
  out.pts = pts;
  return out;
}

// Point de l'axe à s + ds dans le repère racine (x à droite, y en haut, z vers l'avant), d'après
// le repère de climbRootFrame : même format que axisAt de climbHandTarget.
export function axisInRoot(frame, ds, out = {}) {
  const A = axisPoint(frame.pts, frame.s + ds, out);
  const c = Math.cos(frame.heading);
  const sn = Math.sin(frame.heading);
  const wx = A.x - frame.x;
  const wy = A.y - frame.y;
  const wz = A.z - frame.z;
  const tx = A.tx;
  const tz = A.tz;
  out.x = wx * c - wz * sn;
  out.y = wy;
  out.z = wx * sn + wz * c;
  out.tx = tx * c - tz * sn;
  out.tz = tx * sn + tz * c;
  return out;
}

const _tilt = { lean: 0, roll: 0 };
function climbPose(p, T, X) {
  const tilt = trunkTilt(p, _tilt);
  T.lean = tilt.lean;
  T.bodyRoll = tilt.roll;
  const slide = clamp(p.slideW || 0, 0, 1);
  // jambes en grenouille : une poussée par cycle des mains (au-delà, à 1,5 m/s, elles s'affolent),
  // repli plus court que la poussée ; le bassin monte avec
  const legU = frac((p.climbS || 0) / CLIMB_CYCLE + 0.15);
  const ext = legU < 0.6 ? smooth(0, 0.6, legU) : 1 - smooth(0.6, 1, legU);
  let push = ext * (1 - slide);
  // pas chassés en tournant autour : le buste suit, la tête regarde où l'on va, les jambes alternent
  const arcV = (p.climbTurn || 0) * ((p.trunkR || 0.2) + CLIMB_GAP); // m/s, + vers x −  (θ croît)
  const turn = smooth(0.05, 0.5, Math.abs(arcV)) * (1 - slide);
  const dir = arcV > 0 ? -1 : 1; // côté (x local) vers lequel on se déplace
  const shuffle = Math.sin(TAU * frac((p.climbArc || 0) / CLIMB.arcCycle)) * turn;
  push *= 1 - 0.5 * turn;
  T.thighL = -1.55 + 0.8 * push + 0.3 * shuffle;
  T.thighR = -1.5 + 0.8 * push - 0.3 * shuffle;
  T.shinL = 2.1 - 1.1 * push;
  T.shinR = 2.05 - 1.1 * push;
  T.footL = T.footR = 0.35 - 0.25 * push;
  T.hipsZ = 0.12 * shuffle;
  T.bodyY = -0.06 + 0.05 * push;
  // buste contre le tronc, bras vers le haut (la cinématique inverse les pose sur l'écorce)
  T.torsoX = 0.1 + 0.12 * slide;
  T.lean += 0.06 * slide;
  T.armLX = T.armRX = -2.5;
  T.armLZ = -0.3;
  T.armRZ = 0.3;
  T.foreL = T.foreR = -0.6;
  T.torsoY = dir * 0.18 * turn;
  T.headX = -0.32 + 0.2 * slide;
  T.headY = dir * 0.55 * turn;
  T.neckY = dir * 0.15 * turn;
  // glissade : jambes serrées autour du tronc
  if (slide > 0) {
    T.thighL += (-1.15 - T.thighL) * slide;
    T.thighR += (-1.1 - T.thighR) * slide;
    T.shinL += (1.75 - T.shinL) * slide;
    T.shinR += (1.7 - T.shinR) * slide;
    T.bodyY += (-0.02 - T.bodyY) * slide;
  }
  if (FLEX < 1) {
    for (const [th, sh] of [['thighL', 'shinL'], ['thighR', 'shinR']]) {
      const a = T[th] * FLEX;
      T[sh] += T[th] - a;
      T[th] = a;
    }
  }
  // accroche : petit écrasement à l'impact
  const k = 1 - clamp((p.grabT ?? 1) / 0.16, 0, 1);
  if (k > 0) {
    T.sy *= 1 - 0.1 * k;
    T.sx *= 1 + 0.06 * k;
    T.bodyY -= 0.04 * k;
  }
  X.expr = slide > 0.5 ? 'surpris' : Math.abs(p.climbSpeed || 0) > 0.8 ? 'effort' : 'concentre';
}

// Poirier au sommet : le corps bascule par-dessus les mains (rotation de π autour de x, pivot à
// perchLift : les mains levées au-dessus de la tête se posent sur le sommet, en racine), léger
// balancement ; tourner sur place fait alterner les mains.
function perchPose(p, T, X) {
  const t = p.topT || 0;
  X.spin = Math.PI;
  X.lift = CLIMB.perchLift;
  T.lean = 0.05 * Math.sin(t * 1.7);
  T.bodyRoll = 0.05 * Math.sin(t * 1.25 + 1);
  T.armLX = T.armRX = -3.05;
  T.armLZ = -0.18;
  T.armRZ = 0.18;
  T.foreL = T.foreR = 0;
  T.torsoX = -0.12;
  T.thighL = 0.1 * Math.sin(t * 1.6) + 0.06;
  T.thighR = -0.1 * Math.sin(t * 1.6) - 0.04;
  T.shinL = 0.12;
  T.shinR = 0.18;
  T.footL = T.footR = 0.35;
  T.headX = 0.25;
  T.headY = 0.15 * Math.sin(t * 0.7);
  // en tournant sur place, les mains se relaient
  const hop = Math.sin(TAU * frac((p.climbArc || 0) / CLIMB.arcCycle)) * smooth(0.05, 0.4, Math.abs(p.climbTurn || 0) * 0.3);
  T.armLZ -= 0.06 * hop;
  T.armRZ -= 0.06 * hop;
  X.expr = 'joie';
}

// Cible (repère racine) du centre de la main au poirier : sur le sommet, de part et d'autre de la racine.
export function perchHandTarget(side, handR, out) {
  out.x = side * 0.075;
  out.y = handR + CLIMB.handGap;
  out.z = 0;
  return out;
}

// ---------------------------------------------------------------------------
// Bras vivants : un ressort amorti par bras, entraîné par l'inertie du corps.
// x : balancier (positif = vers l'arrière), z : écart (positif = vers +x, pour les deux bras).
// À l'accélération les bras traînent en arrière, au freinage ils partent en avant ; en virage
// ils sont chassés vers l'extérieur ; la réception et la main qui touche donnent un à-coup.
// La fatigue du sprint amortit moins (bras plus lâches). Pas fixe de 1/240 s : mêmes valeurs
// à 30, 60 et 240 Hz aux images communes.
// ---------------------------------------------------------------------------
export const ARM_DYN = {
  freq: 12, // rad/s (période ≈ 0,5 s)
  damp: 0.45, // dépassement ≈ 20 %
  dampTired: 0.28,
  long: 0.02, // rad par m/s² d'accélération longitudinale
  lat: 0.028, // rad par m/s² d'accélération latérale
  cap: 0.5, // rad
  land: 0.2, // rad/s d'à-coup par m/s d'impact
  touch: 2.4, // rad/s : le bras extérieur chassé quand la main touche
  step: 1 / 240,
};

export function createArmDynamics() {
  return { lx: 0, lvx: 0, lz: 0, lvz: 0, rx: 0, rvx: 0, rz: 0, rvz: 0, acc: 0, state: null, hand: false };
}

export function stepArmDynamics(s, p, dt, out = {}) {
  const C = ARM_DYN;
  const aLong = clamp(p.aLong ?? p.accF ?? 0, -25, 25);
  const aLat = clamp(p.aLat ?? 0, -20, 20);
  const fat = fatigueOf(p) * (p.state === 'SPRINT' ? 1 : 0.6);
  // à-coups : réception (selon l'impact) : les bras descendent et se rapprochent du corps
  if (p.state === 'LAND' && s.state !== 'LAND') {
    const k = clamp((p.impact || 0) * C.land, 0, 2.6);
    s.lvx += k;
    s.rvx += k;
    s.lvz += k * 0.6;
    s.rvz -= k * 0.6;
  }
  // main qui touche le sol : le bras extérieur est chassé vers l'extérieur
  const hand = !!p.handDown;
  if (hand && !s.hand) {
    if ((p.handSide || 0) > 0) s.lvz -= C.touch;
    else if ((p.handSide || 0) < 0) s.rvz += C.touch;
  }
  s.hand = hand;
  s.state = p.state;
  const gain = 1 + 0.3 * fat;
  const ex = clamp(C.long * aLong * gain, -C.cap, C.cap);
  const ez = clamp(-C.lat * aLat * gain, -C.cap, C.cap);
  const wn = C.freq;
  const z = C.damp + (C.dampTired - C.damp) * fat;
  const kk = wn * wn;
  const cc = 2 * z * wn;
  const h = C.step;
  s.acc += Math.min(Math.max(dt, 0), 0.1);
  while (s.acc >= h - 1e-9) {
    s.acc -= h;
    s.lvx += (kk * (ex - s.lx) - cc * s.lvx) * h;
    s.rvx += (kk * (ex - s.rx) - cc * s.rvx) * h;
    s.lvz += (kk * (ez - s.lz) - cc * s.lvz) * h;
    s.rvz += (kk * (ez - s.rz) - cc * s.rvz) * h;
    s.lx += s.lvx * h;
    s.rx += s.rvx * h;
    s.lz += s.lvz * h;
    s.rz += s.rvz * h;
  }
  out.armLX = clamp(s.lx, -C.cap, C.cap);
  out.armRX = clamp(s.rx, -C.cap, C.cap);
  out.armLZ = clamp(s.lz, -C.cap, C.cap);
  out.armRZ = clamp(s.rz, -C.cap, C.cap);
  return out;
}

export { clamp };
