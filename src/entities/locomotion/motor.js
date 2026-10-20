// Moteur de locomotion du personnage : physique pure et déterministe (ni THREE ni DOM).
// Modèle « cap + vitesse » : le corps a un cap θ qui tourne par un ressort amorti borné
// (inertie de rotation), une vitesse le long du cap et une petite glisse latérale.
// Par-dessus : dérapage et demi-tour, roulade et enchaînement, saut, chute, pentes.
// Pas fixe de 1/120 s avec accumulateur : même trajectoire quelle que soit la cadence d'image.
// À chaque pas : accélérations mesurées (aLat, aLong), inclinaison physique (bank), ellipse
// d'adhérence (gripUse) et main au sol (handDown), tous décidés au pas fixe.
//
// Convention de signes (monde, m, m/s, m/s², rad) :
// - avant = (sin θ, cos θ) ; latéral + = (cos θ, −sin θ), c'est-à-dire le x local + du personnage
//   (le modèle regarde vers son z local +) ; vitesse = avant · v + latéral · vLat.
// - ω > 0 (cap croissant) fait tourner la vitesse vers le latéral + : l'intérieur du virage est de
//   ce côté. aLat, bankTarget et bank ont alors le signe de ω (positifs), comme bankAngle de pose.js.
// - handSide : +1 = main du côté latéral + (intérieur quand bank > 0 ; os HAND_R du gabarit, à
//   x local + dans models/personnage), −1 = l'autre main, 0 hors contact.
// - aLong > 0 en accélération, < 0 au freinage.
import { tuningFor, SURFACES } from './tuning.js';

export const H = 1 / 120;
const TAU = Math.PI * 2;

// états au sol « libres » : même physique, l'étiquette ne sert qu'à l'animation et aux sons
export const LOCO = new Set(['IDLE', 'WALK', 'RUN', 'SPRINT']);
const AIR = new Set(['JUMP', 'FALL', 'TRIP']);
// le corps se penche dans la courbe (ailleurs, consigne nulle : roulade, air, dérapage, chute…)
const BANKING = new Set(['IDLE', 'WALK', 'RUN', 'SPRINT', 'LAND', 'ROLL_RECOVER', 'SLIDE']);
// l'adhérence porte le corps : au-delà de l'ellipse, la vitesse s'érode et la glisse augmente
const GRIP = new Set(['IDLE', 'WALK', 'RUN', 'SPRINT', 'LAND', 'ROLL_RECOVER']);
// rotation sur place : la direction de la vitesse tourne sans effort latéral
const ON_THE_SPOT = new Set(['TURN', 'PIVOT']);
// la main ne se pose qu'au sprint
const HAND_STATES = new Set(['SPRINT']);

export const wrapAngle = (a) => {
  let r = (a + Math.PI) % TAU;
  if (r < 0) r += TAU;
  return r - Math.PI;
};
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth01 = (t) => t * t * (3 - 2 * t);

// résultat de balayage réutilisé (aucune allocation par pas)
const OUT = { x: 0, z: 0, hit: false, frac: 1, trip: false };

export function createMotor(profile = 'realiste') {
  const T = tuningFor(profile);
  return {
    T,
    x: 0, y: 0, z: 0,
    heading: 0, omega: 0,
    v: 0, vLat: 0, vy: 0,
    // état précédent (interpolation de rendu)
    px: 0, py: 0, pz: 0, pHeading: 0,
    state: 'IDLE', prev: 'IDLE', t: 0,
    grounded: true, coyote: 0, airTime: 0,
    jumpBuf: 0, jumpCutDone: false, jumpLong: false,
    rollBuf: 0, rollQueued: false, chain: 0, sinceRoll: 10, carry: false,
    stopOnly: false, landHeavy: false, from: 0, to: 0,
    boostT: 0, hadInput: false, inputAngle: 0, slopeAlong: 0, slopeAngle: 0,
    sprintTime: 0, dist: 0, lastImpact: 0, pacePhase: 0,
    // accélérations mesurées (filtrées), inclinaison, adhérence, main au sol
    aLat: 0, aLong: 0,
    bank: 0, bankVel: 0, bankTarget: 0,
    gripUse: 0, gripOver: 0, surfGrip: 1, aPush: T.accel0,
    handDown: false, handSide: 0, handX: 0, handY: 0, handZ: 0, handRise: 0,
    handHoldT: 0, handT: 0, handCool: 0,
    // élan : vitesses des derniers pas (fenêtre handSpeedWindow), pointe d'inclinaison en cours
    speedHist: new Float64Array(Math.max(1, Math.round(T.handSpeedWindow / H))), speedIdx: 0, bankPeak: 0, bankPeakSide: 1, bankPeakT: 0, bankLean: 0,
    acc: 0,
    events: [],
  };
}

export function setProfile(m, profile) {
  m.T = tuningFor(profile);
}

// Recale le moteur (téléportation, sortie de bateau, de vol, de siège…)
export function resetMotor(m, x, y, z, heading = m.heading) {
  m.x = m.px = x;
  m.y = m.py = y;
  m.z = m.pz = z;
  m.heading = m.pHeading = heading;
  m.omega = m.v = m.vLat = m.vy = 0;
  m.pacePhase = 0;
  m.grounded = true;
  m.coyote = m.airTime = m.jumpBuf = m.rollBuf = m.boostT = 0;
  m.rollQueued = m.carry = false;
  m.aLat = m.aLong = m.bank = m.bankVel = m.bankTarget = m.gripUse = m.gripOver = 0;
  m.aPush = m.T.accel0; // poussée disponible à l'arrêt
  m.handDown = false;
  m.handSide = 0;
  m.handX = x;
  m.handY = y;
  m.handZ = z;
  m.handRise = 0;
  m.handHoldT = m.handT = m.handCool = 0;
  m.speedHist.fill(0);
  m.speedIdx = 0;
  m.bankPeak = 0;
  m.bankPeakSide = 1;
  m.bankPeakT = m.bankLean = 0;
  m.acc = 0;
  setState(m, 'IDLE');
}

function setState(m, s) {
  if (m.state === s) return;
  m.prev = m.state;
  m.state = s;
  m.t = 0;
}

function emit(m, type, data) {
  const e = { type, x: m.x, y: m.y, z: m.z, heading: m.heading, v: m.v };
  if (data) Object.assign(e, data);
  m.events.push(e);
}

// Vitesse visée par l'intention (allures) ; I.speed > 0 l'impose (déplacement vers un point)
export function gaitSpeed(I, T) {
  if (I.mag <= 0.05) return 0;
  if (I.speed > 0) return I.speed;
  if (I.swim) return I.sprint ? T.swimSprint : T.swim * Math.min(1, 0.4 + I.mag);
  if (I.sprint) return T.sprint;
  if (I.walk) return T.walkMin + (T.walkMax - T.walkMin) * Math.min(1, I.mag);
  if (I.mag < T.walkThreshold) return T.walkMin + (T.walkMax - T.walkMin) * (I.mag / T.walkThreshold);
  return T.run;
}

// Peut-on monter de dy (m) sur un pas de longueur dist ? Oui si la pente reste raisonnable,
// ou s'il s'agit d'une petite marche : le sol continue à plat au-delà (aheadDy ≈ 0).
// Les descentes sont toujours permises : au-delà de snapDown, on tombe.
export function climbable(dy, dist, aheadDy, T) {
  if (dy <= 0.08) return true;
  if (dy / Math.max(dist, 1e-3) <= 1.45) return true;
  return dy <= T.stepUp && Math.abs(aheadDy) < 0.15;
}

// Intention pour rejoindre un point (clic pour aller) : course au-delà de 8 m, freinage
// d'arrivée sur v²/(2·décélération), jamais de dérapage. Renvoie la distance restante.
export function arriveIntent(m, tx, tz, stopDist, far, out) {
  const T = m.T;
  const dx = tx - m.x;
  const dz = tz - m.z;
  const d = Math.hypot(dx, dz);
  out.noSkid = true;
  out.walk = out.sprint = out.jump = out.jumpHeld = out.roll = out.swim = false;
  if (d < stopDist || d < 1e-6) {
    out.mag = 0;
    out.dirX = out.dirZ = 0;
    out.speed = 0;
    return d;
  }
  out.dirX = dx / d;
  out.dirZ = dz / d;
  out.mag = 1;
  const brake = Math.sqrt(2 * T.slowDown * 0.8 * Math.max(0, d - stopDist * 0.5));
  out.speed = Math.max(0.35, Math.min(far ? T.run : T.walkMax, brake));
  return d;
}

function slopeFactor(sinAlong, T) {
  if (sinAlong > 0) return clamp(1 - T.uphillLoss * sinAlong, T.uphillMin, 1);
  return Math.min(T.downhillCap, 1 - T.downhillGain * sinAlong);
}

// Un pas de simulation pour une image : l'intention est constante sur l'image,
// les appuis fugitifs (saut, roulade) sont mémorisés dans des tampons.
export function stepMotor(m, I, env, dt) {
  const T = m.T;
  if (I.jump) m.jumpBuf = T.jumpBuffer;
  if (I.roll) m.rollBuf = T.rollBuffer;
  m.acc += Math.min(Math.max(dt, 0), 0.1);
  // marge d'arrondi : 4 pas pour une image à 30 Hz, jamais 3 puis 5
  while (m.acc >= H - 1e-7) {
    m.acc -= H;
    substep(m, I, env, H);
  }
}

// Position et cap interpolés entre les deux derniers pas (rendu fluide à toute cadence)
export function interpolate(m, out) {
  const a = clamp(m.acc / H, 0, 1);
  out.x = m.px + (m.x - m.px) * a;
  out.y = m.py + (m.y - m.py) * a;
  out.z = m.pz + (m.z - m.pz) * a;
  out.heading = m.pHeading + wrapAngle(m.heading - m.pHeading) * a;
  return out;
}

function substep(m, I, env, h) {
  // vitesse monde et état au début du pas : base des accélérations mesurées
  const fx = Math.sin(m.heading);
  const fz = Math.cos(m.heading);
  const vx0 = fx * m.v + fz * m.vLat;
  const vz0 = fz * m.v - fx * m.vLat;
  const from = m.state;
  stateStep(m, I, env, h);
  const surf = SURFACES[env.surface] || SURFACES.grass;
  measureAccel(m, I, h, surf, vx0, vz0, from);
  bankStep(m, I, h);
  handStep(m, I, env, h);
}

function stateStep(m, I, env, h) {
  const T = m.T;
  m.px = m.x;
  m.py = m.y;
  m.pz = m.z;
  m.pHeading = m.heading;
  m.t += h;
  m.sinceRoll += h;
  if (m.jumpBuf > 0) m.jumpBuf -= h;
  if (m.rollBuf > 0) m.rollBuf -= h;
  if (m.coyote > 0) m.coyote -= h;
  if (m.boostT > 0) m.boostT -= h;
  const surf = SURFACES[env.surface] || SURFACES.grass;
  // adhérence du sol sous les pieds (rotation, glisse) ; dans l'eau profonde, celle de la nage
  m.surfGrip = I.swim ? 1 : surf.grip;
  const has = I.mag > 0.05;
  const target = has ? Math.atan2(I.dirX, I.dirZ) : m.heading;
  const dTheta = has ? wrapAngle(target - m.heading) : 0;
  m.inputAngle = dTheta;
  // pente sous le personnage (gradient du sol) : sinus le long du cap, positif en montée
  const gx = env.slopeX || 0;
  const gz = env.slopeZ || 0;
  const along = gx * Math.sin(m.heading) + gz * Math.cos(m.heading);
  m.slopeAlong = along / Math.sqrt(1 + along * along);
  m.slopeAngle = Math.atan(Math.hypot(gx, gz));
  m.sprintTime = m.state === 'SPRINT' ? m.sprintTime + h : Math.max(0, m.sprintTime - h * 2);

  if (I.swim) {
    swimStep(m, I, env, h, has, dTheta);
    m.hadInput = has;
    return;
  }
  if (m.state === 'SWIM') setState(m, 'IDLE');

  // appuis mémorisés : saut puis roulade
  if (m.jumpBuf > 0 && (m.grounded || m.coyote > 0) && canJump(m)) startJump(m);
  else if (m.rollBuf > 0 && m.grounded) tryRoll(m, I, has, dTheta);

  switch (m.state) {
    case 'SKID':
      skidStep(m, I, env, h, surf, has, dTheta, target);
      break;
    case 'PIVOT':
      pivotStep(m, I, env, h, has, target);
      break;
    case 'TURN':
      turnStep(m, I, env, h, has, target);
      break;
    case 'ROLL':
      rollStep(m, I, env, h, has, dTheta);
      break;
    case 'BONK':
      bonkStep(m, env, h);
      break;
    case 'JUMP':
    case 'FALL':
      airStep(m, I, env, h, surf, has, dTheta);
      break;
    case 'SLIDE':
      slideStep(m, I, env, h, has, target);
      break;
    case 'TRIP':
      tripStep(m, env, h);
      break;
    case 'FALLEN':
      fallenStep(m, I, env, h, has);
      break;
    case 'GETUP':
      m.v = Math.max(0, m.v - 12 * h);
      move(m, env, h, T.radius);
      vertical(m, env, h);
      if (m.state === 'GETUP' && m.t >= T.getupTime) setLoco(m, has);
      break;
    case 'LAND':
      if (m.landHeavy) {
        m.v *= Math.exp(-12 * h);
        move(m, env, h, T.radius);
        vertical(m, env, h);
        if (m.t >= T.landHeavyTime) setLoco(m, has);
      } else {
        locoStep(m, I, env, h, surf, has, dTheta, target, 1);
        if (m.state === 'LAND' && m.t >= T.landTime) setLoco(m, has);
      }
      break;
    case 'ROLL_RECOVER':
      locoStep(m, I, env, h, surf, has, dTheta, target, 0.5);
      if (m.state === 'ROLL_RECOVER' && m.t >= T.rollRecoverTime) setLoco(m, has);
      break;
    default:
      locoStep(m, I, env, h, surf, has, dTheta, target, 1);
  }
  m.hadInput = has;
}

// ---------------------------------------------------------------------------
// Accélérations mesurées : variation de la vitesse monde pendant le pas, décomposée le long de
// la vitesse moyenne (aLong) et en travers (aLat = vitesse × dérivée de sa direction, pour une
// rotation pure). Les à-coups imposés par un changement d'état (relance après demi-tour, départ
// de roulade, rebond, trébuchement) n'alimentent pas les filtres ; la rotation sur place non plus.
function measureAccel(m, I, h, surf, vx0, vz0, from) {
  const T = m.T;
  const fx = Math.sin(m.heading);
  const fz = Math.cos(m.heading);
  const vx1 = fx * m.v + fz * m.vLat;
  const vz1 = fz * m.v - fx * m.vLat;
  const jolt = from !== m.state && !(LOCO.has(from) && LOCO.has(m.state));
  if (!jolt) {
    let tx = vx0 + vx1;
    let tz = vz0 + vz1;
    let tl = Math.hypot(tx, tz);
    if (tl < 1e-6) {
      tx = fx;
      tz = fz;
      tl = 1;
    }
    tx /= tl;
    tz /= tl;
    const ax = (vx1 - vx0) / h;
    const az = (vz1 - vz0) / h;
    // latéral de la vitesse moyenne : (tz, −tx), même convention que celui du cap
    const lat = ON_THE_SPOT.has(m.state) ? 0 : ax * tz - az * tx;
    const lon = ax * tx + az * tz;
    const k = 1 - Math.exp(-T.accelFilter * h);
    m.aLat += (lat - m.aLat) * k;
    m.aLong += (lon - m.aLong) * k;
    // poussée disponible à cette vitesse sur ce sol, filtrée comme aLong : en ligne droite,
    // l'accélération du moteur reste ainsi dans l'ellipse
    const push = T.accel0 * Math.exp(-Math.hypot(vx1, vz1) / T.accelFade) * surf.accel * (m.boostT > 0 ? T.relaunchBoost : 1);
    m.aPush += (push - m.aPush) * k;
  }
  // ellipse d'adhérence (au sol, à pied) : gLat = grip(v) · SURFACES.grip ; gLong = gLat, ou la
  // poussée disponible si elle est plus forte (au démarrage)
  let gLong = 1;
  if (m.grounded && !I.swim) {
    const gLat = gripAt(Math.hypot(vx1, vz1), T) * m.surfGrip;
    gLong = Math.max(gLat, m.aPush);
    m.gripUse = Math.hypot(m.aLat / gLat, m.aLong / gLong);
  } else m.gripUse = 0;
  // excès dû au virage seulement : accélérer ou freiner en ligne droite ne s'érode pas
  m.gripOver = m.grounded && !I.swim && GRIP.has(m.state) ? Math.max(0, m.gripUse - Math.max(1, Math.abs(m.aLong) / gLong)) : 0;
}

// Inclinaison : ressort amorti critique vers bankGain · atan(aLat / g), bornée à bankMax
function bankStep(m, I, h) {
  const T = m.T;
  const banking = m.grounded && !I.swim && BANKING.has(m.state);
  const target = banking ? clamp(T.bankGain * Math.atan(m.aLat / T.bankGravity), -T.bankMax, T.bankMax) : 0;
  m.bankTarget = target;
  const w = T.bankFreq;
  m.bankVel += (w * w * (target - m.bank) - 2 * w * m.bankVel) * h;
  m.bank += m.bankVel * h;
  if (m.bank > T.bankMax) {
    m.bank = T.bankMax;
    if (m.bankVel > 0) m.bankVel = 0;
  } else if (m.bank < -T.bankMax) {
    m.bank = -T.bankMax;
    if (m.bankVel < 0) m.bankVel = 0;
  }
}

// Épaule intérieure pour une inclinaison beta (rad) vers son côté, corps pivotant aux pieds :
// écart latéral depuis le plan médian des pieds et hauteur au-dessus des pieds (m).
export function shoulderAt(beta, T, out) {
  const c = Math.cos(beta);
  const s = Math.sin(beta);
  out.lateral = T.handShoulderX * c + T.handShoulderY * s;
  out.height = T.handShoulderY * c - T.handShoulderX * s;
  return out;
}
const SH = { lateral: 0, height: 0 };

// Main au sol, un effleurement rare : la sonde lit le sol sous l'épaule intérieure. L'inclinaison
// « relief compris » dépasse un seuil quand l'épaule descend, au-dessus de ce sol, à la hauteur
// qu'elle a sur le plat à cet angle (un sol plus haut côté intérieur fait toucher plus tôt).
// Contact : au sol, en SPRINT, hors de l'eau, au-delà de handTouchAngle pendant handHold, avec un
// élan (vitesse maximale des handSpeedWindow dernières secondes : le virage fait plonger la vitesse
// instantanée) d'au moins course + handSpeed · (sprint − course), pendant que |bank| monte, ou reste
// à moins de handPeakSlack de sa pointe en cours et l'a quittée depuis au plus handPeakLate, et
// handCooldown écoulé depuis le dernier relevé.
// Relevé : sous handLiftAngle, ou après handMaxTime de contact.
function handStep(m, I, env, h) {
  const T = m.T;
  const side = m.handDown ? m.handSide : m.bank >= 0 ? 1 : -1;
  const beta = m.bank * side; // < 0 : le corps penche du côté opposé à la main
  shoulderAt(Math.max(0, beta), T, SH);
  const lateral = SH.lateral;
  const height = T.handShoulderY * Math.cos(beta) - T.handShoulderX * Math.sin(beta);
  m.handX = m.x + Math.cos(m.heading) * side * lateral;
  m.handZ = m.z - Math.sin(m.heading) * side * lateral;
  const onFoot = m.grounded && !I.swim;
  // en l'air ou à la nage, la sonde ne lit pas le sol
  m.handY = onFoot ? env.ground(m.handX, m.handZ) : m.y;
  m.handRise = m.handY - m.y;
  const can = onFoot && env.surface !== 'shallow' && HAND_STATES.has(m.state);
  const rise = Math.min(m.handRise, T.handRiseMax);
  if (m.handCool > 0) m.handCool -= h;
  // élan : vitesse maximale sur la fenêtre glissante (un échantillon par pas fixe)
  const hist = m.speedHist;
  hist[m.speedIdx] = speedOf(m);
  m.speedIdx = (m.speedIdx + 1) % hist.length;
  let momentum = 0;
  for (let i = 0; i < hist.length; i++) if (hist[i] > momentum) momentum = hist[i];
  // pointe d'inclinaison de la courbe en cours (remise à zéro au changement de côté ou redressé),
  // et temps depuis que |bank| a cessé de monter (ou de rester à sa borne)
  const lean = Math.abs(m.bank);
  if (lean < 0.05 || m.bank * m.bankPeakSide <= 0) {
    m.bankPeak = lean;
    m.bankPeakSide = m.bank >= 0 ? 1 : -1;
  } else if (lean > m.bankPeak) m.bankPeak = lean;
  m.bankPeakT = lean > m.bankLean || lean >= T.bankMax - 1e-9 ? 0 : m.bankPeakT + h;
  m.bankLean = lean;
  if (!m.handDown) {
    const leaning = can && m.handCool <= 0 && beta > 0 && height <= shoulderAt(T.handTouchAngle, T, SH).height + rise;
    m.handHoldT = leaning ? m.handHoldT + h : 0;
    const nearPeak = lean >= m.bankPeak - T.handPeakSlack && m.bankPeakT <= T.handPeakLate + 1e-9;
    if (m.handHoldT >= T.handHold - 1e-9 && nearPeak && momentum >= T.run + T.handSpeed * (T.sprint - T.run)) {
      m.handDown = true;
      m.handSide = side;
      m.handT = 0;
      handEvent(m, env, 'handTouch', side);
    }
  } else {
    m.handT += h;
    if (!can || m.handT >= T.handMaxTime - 1e-9 || height > shoulderAt(T.handLiftAngle, T, SH).height + rise) {
      handEvent(m, env, 'handLift', m.handSide);
      m.handDown = false;
      m.handSide = 0;
      m.handHoldT = 0;
      m.handCool = T.handCooldown;
    }
  }
}

// vitesse monde (cap + glisse)
function speedOf(m) {
  return Math.hypot(m.v, m.vLat);
}

function handEvent(m, env, type, side) {
  // x, y, z : point de contact de la main (et non le corps) ; t : durée du contact au relevé
  emit(m, type, { x: m.handX, y: m.handY, z: m.handZ, side, v: speedOf(m), surface: env.surface || 'grass', bank: m.bank, t: type === 'handLift' ? m.handT : 0 });
}

// ---------------------------------------------------------------------------
// Rotation : ressort amorti vers le cap visé, accélération et vitesse angulaires bornées.
// C'est l'inertie de rotation : à pleine vitesse le corps s'engage dans la courbe,
// dépasse un peu l'angle visé puis se stabilise ; le rayon de virage croît avec la vitesse.
// Adhérence latérale (m/s²) à la vitesse v, sur herbe : gripRun jusqu'à la course, puis vers gripSprint
export function gripAt(v, T) {
  const s = Math.abs(v);
  return s <= T.run ? T.gripRun : lerp(T.gripRun, T.gripSprint, clamp((s - T.run) / (T.sprint - T.run), 0, 1));
}

// gripScale : adhérence de la surface (SURFACES.grip) ; le rayon minimal vaut v² / (grip · gripScale)
export function turnParams(v, T, out, gripScale = 1) {
  const s = clamp((Math.abs(v) - T.walkMax) / (T.sprint - T.walkMax), 0, 1);
  out.wn = lerp(T.turnFreqWalk, T.turnFreqSprint, s);
  out.zeta = lerp(T.turnDampWalk, T.turnDampSprint, s);
  out.amax = lerp(T.turnAccelStill, T.turnAccelSprint, clamp(Math.abs(v) / T.sprint, 0, 1));
  const grip = gripAt(v, T) * gripScale;
  out.wmax = Math.abs(v) < 0.3 ? T.turnRateStill : Math.min(T.turnRateWalk, grip / Math.abs(v));
  return out;
}
const TP = { wn: 0, zeta: 0, amax: 0, wmax: 0 };

function steer(m, dTheta, h, rateScale = 1, wmaxOverride = 0) {
  const T = m.T;
  turnParams(m.v, T, TP, m.grounded ? m.surfGrip : 1);
  const wmax = (wmaxOverride || TP.wmax) * rateScale;
  const acc = clamp(TP.wn * TP.wn * dTheta - 2 * TP.zeta * TP.wn * m.omega, -TP.amax, TP.amax);
  m.omega = clamp(m.omega + acc * h, -wmax, wmax);
  rotate(m, m.omega * h);
}

// Le cap tourne de d ; au-delà de la course, la vitesse ne suit qu'une partie de la
// rotation (glisse) : ce retard devient une vitesse latérale qui s'efface avec l'adhérence.
// Au sol, cette part croît quand l'adhérence de la surface baisse (÷ SURFACES.grip) et avec
// l'excès d'ellipse du pas précédent.
function rotate(m, d) {
  const T = m.T;
  m.heading = wrapAngle(m.heading + d);
  let slip = T.slipMax * clamp((Math.abs(m.v) - T.run * 0.8) / (T.sprint - T.run * 0.8), 0, 1);
  if (m.grounded) {
    slip /= m.surfGrip;
    if (m.gripOver > 0 && GRIP.has(m.state)) slip += m.gripOver * T.gripSlide;
    slip = Math.min(0.9, slip);
  }
  const lag = d * slip;
  if (lag !== 0) {
    const c = Math.cos(lag);
    const s = Math.sin(lag);
    const v = m.v;
    const l = m.vLat;
    m.v = v * c + l * s;
    m.vLat = -v * s + l * c;
  }
}

// Vitesse le long du cap : accélération dégressive, freinage, survitesse qui s'étiole
function longitudinal(m, V, has, h, surf, aScale) {
  const T = m.T;
  const v = m.v;
  if (v < V) {
    const boost = m.boostT > 0 ? T.relaunchBoost : 1;
    const a = T.accel0 * Math.exp(-Math.max(0, v) / T.accelFade) * surf.accel * aScale * boost;
    m.v = Math.min(V, v + a * h);
  } else if (v > V) {
    const d = !has ? T.friction : m.carry ? T.overspeedDecay : T.slowDown;
    m.v = Math.max(V, v - d * h);
    if (m.v <= V + 1e-3) m.carry = false;
  }
}

function move(m, env, h, radius) {
  const fx = Math.sin(m.heading);
  const fz = Math.cos(m.heading);
  // latéral + = (cos θ, −sin θ) : x local + du personnage (voir la convention en tête)
  const vx = fx * m.v + fz * m.vLat;
  const vz = fz * m.v - fx * m.vLat;
  const T = m.T;
  m.vLat *= Math.exp(-T.slipGrip * (m.grounded ? m.surfGrip : 1) * h);
  const dx = vx * h;
  const dz = vz * h;
  if (dx === 0 && dz === 0) {
    OUT.hit = false;
    OUT.frac = 1;
    OUT.trip = false;
    return OUT;
  }
  OUT.trip = false;
  env.sweep(m, dx, dz, radius, OUT);
  m.dist += Math.hypot(OUT.x - m.x, OUT.z - m.z);
  m.x = OUT.x;
  m.z = OUT.z;
  if (OUT.hit) {
    // contre un mur : on glisse le long, en perdant une partie de l'élan
    m.v *= 0.6 + 0.4 * OUT.frac;
    m.vLat *= 0.5;
  }
  return OUT;
}

// Sol et air : collé au sol jusqu'à snapDown, au-delà on tombe vraiment
function vertical(m, env, h) {
  const T = m.T;
  const gy = env.ground(m.x, m.z);
  if (m.grounded) {
    if (gy < m.y - T.snapDown) {
      m.grounded = false;
      m.coyote = T.coyoteTime;
      m.vy = 0;
      m.airTime = 0;
      if (!AIR.has(m.state)) setState(m, 'FALL');
    } else m.y = gy;
    return;
  }
  let g = T.gravity;
  if (Math.abs(m.vy) < T.apexBand) g *= T.apexHang;
  else if (m.vy < 0) g *= T.fallGravity;
  m.vy = Math.max(-T.terminal, m.vy - g * h);
  m.y += m.vy * h;
  m.airTime += h;
  if (m.y <= gy && m.vy <= 0) land(m, gy, -m.vy);
}

function land(m, gy, impact) {
  const T = m.T;
  m.y = gy;
  m.vy = 0;
  m.grounded = true;
  m.lastImpact = impact;
  const airTime = m.airTime;
  m.airTime = 0;
  if (m.state === 'TRIP') {
    // à plat ventre, on glisse encore un peu
    setState(m, 'FALLEN');
    emit(m, 'faceplant', { impact: impact + m.v });
    return;
  }
  emit(m, 'land', { impact, airTime });
  if (impact > T.landHeavy) {
    if (m.v > 2) {
      startRoll(m, null, false, 0, 'land');
      return;
    }
    m.landHeavy = true;
  } else m.landHeavy = false;
  setState(m, 'LAND');
}

// Petite variation d'effort au train de course : une onde lente, plus quelques
// relances courtes. L'horloge avance au pas fixe et s'arrête hors course soutenue.
function runningPaceVariation(m, I, T, baseSpeed, h) {
  if (!m.grounded || !LOCO.has(m.state) || I.walk || I.speed > 0 || I.mag < T.walkThreshold) return 0;
  // Ne pas perturber l'accélération initiale ni les transitions marche/course/sprint.
  if (m.v < baseSpeed * 0.985) return 0;
  m.pacePhase += h * T.paceWaveRate;
  const phase = m.pacePhase;
  const wave = 0.7 * Math.sin(phase) + 0.3 * Math.sin(phase * 2.37 + 0.8);
  const burst = Math.pow(Math.max(0, Math.sin(phase * 0.65 - 0.45)), 4);
  const amplitude = I.sprint ? T.sprintPaceAmplitude : T.runPaceAmplitude;
  return amplitude * wave + T.paceSurgeAmplitude * (burst - 0.18);
}

function setLoco(m, has) {
  const T = m.T;
  let s;
  if (!has && m.v < 0.2) s = 'IDLE';
  else if (m.v <= T.walkMax + 0.4) s = 'WALK';
  else if (m.v <= T.run + 0.8) s = 'RUN';
  else s = 'SPRINT';
  if (s === 'IDLE' && m.v > 0.2) s = 'WALK';
  setState(m, s);
}

// ---------------------------------------------------------------------------
// États
function locoStep(m, I, env, h, surf, has, dTheta, target, aScale) {
  const T = m.T;
  const free = LOCO.has(m.state);
  if (free || m.state === 'LAND' || m.state === 'ROLL_RECOVER') {
    // demi-tour à pleine allure : dérapage
    if (has && !I.noSkid && m.v > T.skidMinSpeed && Math.abs(dTheta) > T.skidAngle) {
      startSkid(m, false);
      return;
    }
    // stick relâché à pleine allure : court dérapage d'arrêt
    if (!has && m.hadInput && !I.noSkid && m.v > T.stopSkidSpeed) {
      startSkid(m, true);
      return;
    }
    // demi-tour à petite allure : sur place, en petits pas
    if (free && has && m.v < T.turnInPlaceSpeed && Math.abs(dTheta) > T.turnInPlaceAngle) {
      m.from = m.heading;
      m.to = target;
      setState(m, 'TURN');
      emit(m, 'turn');
      return;
    }
    // pente trop raide : on glisse (sauf en poussant vers le haut)
    if (m.grounded && m.slopeAngle > T.slideAngle) {
      const up = has && I.dirX * (env.slopeX || 0) + I.dirZ * (env.slopeZ || 0) > 0.3;
      if (!up) {
        setState(m, 'SLIDE');
        emit(m, 'slide');
        return;
      }
    }
  }
  steer(m, dTheta, h);
  let V = gaitSpeed(I, T) * surf.speed * slopeFactor(m.slopeAlong, T);
  V *= 1 + runningPaceVariation(m, I, T, V, h);
  // virage franc : on ralentit un peu pour tourner (jamais plus de 40 %)
  if (has) V *= 0.6 + 0.4 * Math.max(0, Math.cos(dTheta));
  longitudinal(m, V, has, h, surf, aScale);
  // ellipse d'adhérence dépassée (pas précédent) : la vitesse s'érode selon l'excès
  if (m.gripOver > 0 && m.grounded) m.v = Math.max(0, m.v - T.gripScrub * m.gripOver * gripAt(m.v, T) * m.surfGrip * h);
  const speed = m.v;
  const r = move(m, env, h, T.radius);
  // obstacle bas percuté de face, trop vite : on trébuche
  if (r.trip && speed > T.tripSpeed && m.grounded && (free || m.state === 'LAND')) {
    startTrip(m, speed);
    return;
  }
  vertical(m, env, h);
  // (vertical a pu passer en chute : on ne réétiquette que les états libres)
  if (LOCO.has(m.state)) setLoco(m, has);
}

function startSkid(m, stopOnly) {
  m.stopOnly = stopOnly;
  m.omega = 0;
  m.carry = false;
  setState(m, 'SKID');
  emit(m, 'skidStart', { stopOnly });
}

function skidStep(m, I, env, h, surf, has, dTheta, target) {
  const T = m.T;
  m.omega = 0;
  m.v = Math.max(0, m.v - T.skidDecel * surf.skid * h);
  move(m, env, h, T.radius);
  vertical(m, env, h);
  if (m.state !== 'SKID') return;
  const maxT = m.stopOnly ? T.stopSkidTime : T.skidMaxTime;
  if (m.t >= maxT || m.v < T.skidEndSpeed) {
    emit(m, 'skidEnd');
    if (!m.stopOnly && has && Math.abs(dTheta) > T.pivotAngle) {
      m.from = m.heading;
      m.to = target;
      setState(m, 'PIVOT');
      emit(m, 'pivot');
    } else setLoco(m, has);
  }
}

function pivotStep(m, I, env, h, has, target) {
  const T = m.T;
  if (has) m.to = target;
  const k = smooth01(clamp(m.t / T.pivotTime, 0, 1));
  m.heading = wrapAngle(m.from + wrapAngle(m.to - m.from) * k);
  m.v *= Math.exp(-18 * h);
  move(m, env, h, T.radius);
  vertical(m, env, h);
  if (m.state === 'PIVOT' && m.t >= T.pivotTime) {
    m.heading = m.to;
    m.omega = 0;
    m.vLat = 0;
    // relance : petite poussée dans la nouvelle direction
    m.v = has ? T.relaunchSpeed : 0;
    m.boostT = T.relaunchTime;
    setLoco(m, has);
  }
}

function turnStep(m, I, env, h, has, target) {
  const T = m.T;
  if (has) m.to = target;
  const k = smooth01(clamp(m.t / T.turnInPlaceTime, 0, 1));
  m.heading = wrapAngle(m.from + wrapAngle(m.to - m.from) * k);
  m.omega = 0;
  m.v *= Math.exp(-10 * h);
  move(m, env, h, T.radius);
  vertical(m, env, h);
  if (m.state === 'TURN' && m.t >= T.turnInPlaceTime) {
    m.heading = m.to;
    setLoco(m, has);
  }
}

function canJump(m) {
  if (m.state === 'BONK' || m.state === 'JUMP' || m.state === 'TRIP' || m.state === 'FALLEN' || m.state === 'GETUP') return false;
  if (m.state === 'LAND' && m.landHeavy) return false;
  if (m.state === 'FALL') return m.coyote > 0;
  return true;
}

function startJump(m) {
  const T = m.T;
  const long = m.state === 'SPRINT' || m.state === 'ROLL' || m.v > T.run + 1;
  m.vy = long ? T.longJumpSpeed : T.jumpSpeed;
  if (long) m.v += T.longJumpBoost;
  m.jumpLong = long;
  m.grounded = false;
  m.coyote = 0;
  m.jumpBuf = 0;
  m.jumpCutDone = false;
  m.airTime = 0;
  setState(m, 'JUMP');
  emit(m, 'jump', { long });
}

function airStep(m, I, env, h, surf, has, dTheta) {
  const T = m.T;
  steer(m, dTheta, h, T.airTurn);
  if (has) {
    const V = gaitSpeed(I, T) * (0.35 + 0.65 * Math.max(0, Math.cos(dTheta)));
    // en l'air on garde son élan : on accélère un peu, on ne freine pas
    if (m.v < V) longitudinal(m, V, has, h, surf, T.airAccel);
  } else if (m.v > 0) m.v = Math.max(0, m.v - T.airDrag * h);
  // saut relâché tôt : plus court
  if (m.state === 'JUMP' && !I.jumpHeld && m.vy > 0 && !m.jumpCutDone) {
    m.vy *= T.jumpCut;
    m.jumpCutDone = true;
  }
  move(m, env, h, T.radius);
  vertical(m, env, h);
  if (m.state === 'JUMP' && m.vy <= 0) setState(m, 'FALL');
}

// ---------------------------------------------------------------------------
// Roulade
function tryRoll(m, I, has, dTheta) {
  const T = m.T;
  switch (m.state) {
    case 'ROLL':
      if (m.t >= T.rollWindow[0]) startRoll(m, I, has, dTheta, 'chain');
      else {
        // trop tôt : mémorisé, part à la fin sans bonus
        m.rollQueued = true;
        m.rollBuf = 0;
      }
      return;
    case 'BONK':
    case 'SLIDE':
    case 'JUMP':
    case 'FALL':
    case 'TRIP':
    case 'FALLEN':
    case 'GETUP':
      return;
    case 'LAND':
      if (m.landHeavy) return;
      startRoll(m, I, has, dTheta, 'fresh');
      return;
    case 'SKID':
      startRoll(m, I, has, dTheta, 'skid');
      return;
    default:
      startRoll(m, I, has, dTheta, 'fresh');
  }
}

function startRoll(m, I, has, dTheta, mode) {
  const T = m.T;
  let v = Math.max(0, m.v);
  if (has && I) {
    // la roulade part dans la direction du stick ; à contresens, elle repart de zéro
    if (Math.abs(dTheta) > (100 * Math.PI) / 180) v = 0;
    m.heading = Math.atan2(I.dirX, I.dirZ);
  }
  if (mode === 'skid') v = 0;
  if (mode === 'chain') v += T.rollChainBonus;
  else if (mode === 'queued' || mode === 'land' || m.sinceRoll < T.rollRest) v = Math.max(v, T.rollBase);
  else v = Math.max(v, T.rollBase) + T.rollBonus;
  m.v = Math.min(T.rollCap, v);
  m.vLat = 0;
  m.omega = 0;
  m.carry = true;
  m.chain = mode === 'chain' ? m.chain + 1 : 0;
  m.rollBuf = 0;
  m.rollQueued = false;
  // un nouvel état même si l'on roulait déjà
  m.prev = m.state;
  m.state = 'ROLL';
  m.t = 0;
  emit(m, 'roll', { mode, chain: m.chain });
}

function rollStep(m, I, env, h, has, dTheta) {
  const T = m.T;
  steer(m, has ? dTheta : 0, h, 1, T.rollTurnRate);
  m.v = Math.max(0, m.v - T.rollFriction * h);
  // en descente, la boule prend de la vitesse
  if (m.slopeAlong < 0) m.v = Math.min(T.rollCap, m.v - m.slopeAlong * T.gravity * T.rollSlopeGain * h);
  const r = move(m, env, h, T.rollRadius);
  if (r.hit && r.frac < 0.4 && m.v > T.bonkSpeed * 0.6) {
    bonk(m);
    return;
  }
  vertical(m, env, h);
  if (m.state !== 'ROLL') return;
  if (m.t >= T.rollTime) {
    if (m.rollQueued) startRoll(m, I, has, dTheta, 'queued');
    else {
      m.sinceRoll = 0;
      setState(m, 'ROLL_RECOVER');
    }
  }
}

function bonk(m) {
  const T = m.T;
  // vitesse avant le choc (le balayage l'a déjà réduite)
  m.v = -T.bonkRebound * Math.max(T.bonkSpeed, m.v / (0.6 + 0.4 * OUT.frac));
  m.vLat = 0;
  m.omega = 0;
  m.carry = false;
  m.rollQueued = false;
  setState(m, 'BONK');
  emit(m, 'bonk');
}

function bonkStep(m, env, h) {
  const T = m.T;
  m.omega = 0;
  m.v = m.v < 0 ? Math.min(0, m.v + 10 * h) : Math.max(0, m.v - 10 * h);
  move(m, env, h, T.radius);
  vertical(m, env, h);
  if (m.state === 'BONK' && m.t >= T.bonkTime) setLoco(m, false);
}

// ---------------------------------------------------------------------------
// Trébucher : un obstacle bas percuté trop vite fait basculer par-dessus, puis on
// atterrit à plat ventre, on glisse un peu, et l'on se relève (plus vite si on insiste).
function startTrip(m, speed) {
  const T = m.T;
  m.v = speed * 0.85;
  m.vLat = 0;
  m.omega = 0;
  m.vy = T.tripHop;
  m.grounded = false;
  m.coyote = 0;
  m.jumpBuf = 0;
  m.rollBuf = 0;
  m.carry = false;
  m.airTime = 0;
  setState(m, 'TRIP');
  emit(m, 'trip', { v: speed });
}

function tripStep(m, env, h) {
  const T = m.T;
  m.v = Math.max(0, m.v - T.tripDrag * h);
  move(m, env, h, T.radius);
  vertical(m, env, h);
}

function fallenStep(m, I, env, h, has) {
  const T = m.T;
  m.omega = 0;
  m.v = Math.max(0, m.v - T.fallenFriction * h);
  move(m, env, h, T.radius);
  vertical(m, env, h);
  if (m.state !== 'FALLEN') return;
  const hurry = m.t > T.fallenEarly && (m.jumpBuf > 0 || m.rollBuf > 0);
  if (m.t >= T.fallenTime || hurry) {
    m.jumpBuf = m.rollBuf = 0;
    setState(m, 'GETUP');
    emit(m, 'getup');
  }
}

// ---------------------------------------------------------------------------
// Glissade sur une pente trop raide : le corps part vers le bas, un peu dirigeable
function slideStep(m, I, env, h, has, target) {
  const T = m.T;
  const gx = env.slopeX || 0;
  const gz = env.slopeZ || 0;
  const down = Math.atan2(-gx, -gz);
  let want = down;
  if (has) want = down + clamp(wrapAngle(target - down), -0.6, 0.6) * T.slideControl * 2;
  steer(m, wrapAngle(want - m.heading), h);
  m.v = clamp(m.v + (T.gravity * Math.sin(m.slopeAngle) * T.slideGain - T.slideFriction) * h, 0, T.slideCap);
  move(m, env, h, T.radius);
  vertical(m, env, h);
  if (m.state === 'SLIDE' && m.slopeAngle < T.slideExitAngle) {
    m.carry = true;
    setLoco(m, has);
  }
}

// Nage : la hauteur est donnée par le jeu (surface de l'eau)
function swimStep(m, I, env, h, has, dTheta) {
  const T = m.T;
  if (m.state !== 'SWIM') {
    setState(m, 'SWIM');
    m.grounded = true;
    m.vy = 0;
    m.vLat = 0;
  }
  m.jumpBuf = 0;
  m.rollBuf = 0;
  steer(m, dTheta, h);
  const V = has ? gaitSpeed(I, T) * (0.35 + 0.65 * Math.max(0, Math.cos(dTheta))) : 0;
  if (m.v < V) m.v = Math.min(V, m.v + T.swimAccel * h);
  else m.v = Math.max(V, m.v - T.swimDrag * h);
  move(m, env, h, T.radius);
}
