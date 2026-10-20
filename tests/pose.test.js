// Pose et animation de la locomotion (partie B) : inclinaison du moteur, tête à l'horizontale,
// bassin abaissé, main au sol par cinématique inverse, bras vivants, contre-rotation.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { tuningFor } from '../src/entities/locomotion/tuning.js';
import {
  locomotionPose, strideLength, LOCO_FAMILY, BANK_MAX, BANK_DROP, handWeightTarget, createArmDynamics, stepArmDynamics, ARM_DYN,
} from '../src/entities/locomotion/pose.js';
import { buildRig, applyJoints, shoulderInRoot, reachHand, handInRoot, HAND_RADIUS, HAND_BRUSH_GAP } from '../src/entities/locomotion/rig.js';

const T = tuningFor('realiste');
const DEG = Math.PI / 180;
// angles de contact et de relevé de la main, réglés dans le moteur (tuning.js)
const HAND_TOUCH = T.handTouchAngle;
const HAND_LIFT = T.handLiftAngle;
const REST = {
  bodyY: 0, lean: 0, bodyRoll: 0, sx: 1, sy: 1, hipsY: 0, hipsZ: 0, torsoX: 0, torsoY: 0, torsoZ: 0,
  neckX: 0, neckY: 0, neckZ: 0, headX: 0, headY: 0, headZ: 0,
  armLX: 0, armLZ: -0.2, armRX: 0, armRZ: 0.2, foreL: -0.15, foreR: -0.15,
  wristLX: 0, wristLZ: 0, wristRX: 0, wristRZ: 0,
  thighL: 0, thighR: 0, shinL: 0, shinR: 0, footL: 0, footR: 0,
};
const pose = (p) => {
  const J = { ...REST };
  locomotionPose({ state: 'SPRINT', t: 0.5, v: T.sprint, vLat: 0, vy: 0, omega: 0, phase: 0, now: 1, startT: 1, breath: 0, grounded: true, ...p }, J, {});
  return J;
};
// roulis de la tête dans le monde : corps, bassin, buste, cou et tête s'additionnent autour de z
const headRoll = (J) => J.bodyRoll + J.hipsZ + (J.torsoZ - J.hipsZ * 0.7) + J.neckZ + J.headZ;

// main au sol sur le squelette réel (même calcul que Character.js)
const rig = buildRig();
const sh = new THREE.Vector3();
const hand = new THREE.Vector3();
const target = new THREE.Vector3();
function handGap(J, side, rise = 0, w = 1) {
  applyJoints(rig.body, rig.bones, J, 0, true);
  shoulderInRoot(rig, side, sh);
  target.set(sh.x, rise + HAND_RADIUS * J.sy + HAND_BRUSH_GAP, sh.z + 0.04);
  reachHand(rig, J, side, target, w);
  handInRoot(rig, side, hand);
  return hand.y - HAND_RADIUS * J.sy - rise;
}

describe('inclinaison en virage (loco.bank)', () => {
  it('suit l’inclinaison du moteur, bornée au même plafond (bankMax), côté intérieur', () => {
    expect(BANK_MAX).toBe(T.bankMax);
    expect(pose({ bank: 0.4 }).bodyRoll).toBeCloseTo(-0.4, 9); // virage à gauche : vers +x
    expect(pose({ bank: -0.4 }).bodyRoll).toBeCloseTo(0.4, 9);
    expect(pose({ bank: 1.4 }).bodyRoll).toBeCloseTo(-BANK_MAX, 9);
    expect(Math.abs(pose({ bank: 0 }).bodyRoll)).toBeLessThan(1e-12);
  });

  it('garde la tête presque à l’horizontale (moins de 15 % de l’inclinaison)', () => {
    for (const bank of [0.3, 0.6, 0.8, -0.7]) {
      for (const handW of [0, 1]) {
        const J = pose({ bank, handW, handDown: handW > 0, handSide: Math.sign(bank) });
        expect(Math.abs(headRoll(J))).toBeLessThan(0.15 * Math.abs(bank));
      }
    }
  });

  it('abaisse légèrement le bassin (10 cm au plafond, 16 cm main au sol), et plie les genoux', () => {
    const flat = pose({ bank: 0 });
    const deep = pose({ bank: BANK_MAX });
    expect(flat.bodyY - deep.bodyY).toBeCloseTo(BANK_DROP, 9);
    expect(BANK_DROP).toBeLessThanOrEqual(0.1);
    expect(deep.shinL).toBeGreaterThan(flat.shinL + 0.4);
    const reaching = pose({ bank: BANK_MAX, handW: 1 });
    expect(flat.bodyY - reaching.bodyY).toBeLessThanOrEqual(0.16 + 1e-9);
    // virage ordinaire (≈ 20°) : à peine quelques centimètres ; virage doux : rien
    expect(flat.bodyY - pose({ bank: 20 * DEG }).bodyY).toBeLessThan(0.04);
    expect(flat.bodyY - pose({ bank: 0.15 }).bodyY).toBeLessThan(1e-9);
  });

  it('ouvre le bras extérieur pour l’équilibre', () => {
    const left = pose({ bank: BANK_MAX }); // extérieur : os L (x < 0)
    const right = pose({ bank: -BANK_MAX }); // extérieur : os R (x > 0)
    const straight = pose({ bank: 0 });
    expect(left.armLZ).toBeLessThan(straight.armLZ - 0.4);
    expect(right.armRZ).toBeGreaterThan(straight.armRZ + 0.4);
  });
});

describe('main au sol', () => {
  it('ne la demande qu’au sol, en course ou au sprint, quand le moteur la pose', () => {
    expect(handWeightTarget({ state: 'SPRINT', handDown: true, grounded: true })).toBe(1);
    expect(handWeightTarget({ state: 'RUN', handDown: true, grounded: true })).toBe(1);
    expect(handWeightTarget({ state: 'WALK', handDown: true, grounded: true })).toBe(0);
    expect(handWeightTarget({ state: 'SPRINT', handDown: false, grounded: true })).toBe(0);
    expect(handWeightTarget({ state: 'SPRINT', handDown: true, grounded: false })).toBe(0);
    expect(handWeightTarget({ state: 'SPRINT', handDown: true, grounded: true, swim: true })).toBe(0);
    expect(handWeightTarget(null)).toBe(0);
  });

  it('la paume effleure un sol plat à moins de 3 cm, du relevé (handLiftAngle) au plafond, aux vitesses de contact', () => {
    let worst = -Infinity;
    let best = Infinity;
    const vMin = T.run + 0.5 * (T.sprint - T.run); // contact seulement au sprint franc
    for (const v of [vMin, T.sprint]) {
      for (let b = HAND_LIFT; b <= BANK_MAX + 1e-9; b += (BANK_MAX - HAND_LIFT) / 6) {
        for (const side of [1, -1]) {
          for (let k = 0; k < 16; k++) {
            const J = pose({ state: 'SPRINT', v, bank: side * b, handW: 1, handDown: true, handSide: side, phase: (k / 16) * Math.PI * 2 });
            const gap = handGap(J, side);
            worst = Math.max(worst, gap);
            best = Math.min(best, gap);
          }
        }
      }
    }
    expect(best).toBeGreaterThanOrEqual(0);
    expect(worst).toBeLessThan(0.03);
  });

  it('suit le relief : la main se pose sur un sol qui monte côté intérieur', () => {
    for (const rise of [0.04, 0.1]) {
      for (let k = 0; k < 8; k++) {
        const J = pose({ bank: (HAND_LIFT + BANK_MAX) / 2, handW: 1, handDown: true, handSide: 1, phase: (k / 8) * Math.PI * 2 });
        const gap = handGap(J, 1, rise);
        expect(gap).toBeGreaterThanOrEqual(0);
        expect(gap).toBeLessThan(0.03);
      }
    }
  });

  it('aucun contact main-sol en ligne droite ni en marche', () => {
    for (let k = 0; k < 16; k++) {
      const phase = (k / 16) * Math.PI * 2;
      for (const side of [1, -1]) {
        expect(handGap(pose({ bank: 0, phase }), side, 0, 0)).toBeGreaterThan(0.25);
        expect(handGap(pose({ state: 'WALK', v: T.walkMax, bank: side * 0.3, phase }), side, 0, 0)).toBeGreaterThan(0.15);
      }
    }
  });
});

describe('continuité de la pose', () => {
  it('écart < 0,15 rad par échantillon à 240 Hz dans un virage serré main au sol, bras vivants compris', () => {
    const hz = 240;
    const dyn = createArmDynamics();
    const out = {};
    const q = rig.bones.map(() => new THREE.Quaternion());
    let prev = null;
    let worst = 0;
    let worstBone = 0;
    let handW = 0;
    let down = false;
    let phase = 0;
    for (let i = 0; i < hz * 3; i++) {
      const t = i / hz;
      const bank = t < 1.6 ? BANK_MAX * Math.sin((Math.PI * t) / 1.6) ** 2 : 0;
      // hystérésis du moteur : entrée à handTouchAngle, sortie à handLiftAngle
      if (!down && bank > HAND_TOUCH) down = true;
      else if (down && bank < HAND_LIFT) down = false;
      const want = handWeightTarget({ state: 'SPRINT', handDown: down, grounded: true });
      handW += (want - handW) * (1 - Math.exp(-(want > handW ? 24 : 14) / hz));
      const v = T.sprint * (1 - 0.25 * Math.sin((Math.PI * Math.min(t, 1.6)) / 1.6));
      phase += (Math.PI * v) / hz / strideLength(v);
      const p = { state: 'SPRINT', v, bank, aLat: 9.81 * Math.tan(bank), aLong: -3 + 5 * Math.min(1, Math.max(0, (t - 1.4) / 0.4)), handDown: down, handSide: 1, handW, phase, now: t };
      const J = pose(p);
      const d = stepArmDynamics(dyn, p, 1 / hz, out);
      J.armLX += d.armLX;
      J.armRX += d.armRX;
      J.armLZ += d.armLZ;
      J.armRZ += d.armRZ;
      for (const k in J) {
        expect(Number.isFinite(J[k]), k).toBe(true);
        if (prev) worst = Math.max(worst, Math.abs(J[k] - prev[k]));
      }
      prev = J;
      applyJoints(rig.body, rig.bones, J, 0, true);
      shoulderInRoot(rig, 1, sh);
      target.set(sh.x, HAND_RADIUS * J.sy + HAND_BRUSH_GAP, sh.z + 0.04);
      reachHand(rig, J, 1, target, handW);
      rig.bones.forEach((b, n) => {
        if (i > 0) worstBone = Math.max(worstBone, b.quaternion.angleTo(q[n]));
        q[n].copy(b.quaternion);
      });
    }
    expect(worst).toBeLessThan(0.15);
    expect(worstBone).toBeLessThan(0.15);
  });

  it('chaque état du moteur a sa famille de pose (la nage passe par la pose « swim »)', () => {
    const src = readFileSync(new URL('../src/entities/locomotion/motor.js', import.meta.url), 'utf8');
    const states = new Set();
    for (const m of src.matchAll(/(?:setState\(m, |state = |\bs = )'([A-Z_]+)'/g)) states.add(m[1]);
    for (const s of ['IDLE', 'WALK', 'RUN', 'SPRINT']) states.add(s);
    states.delete('SWIM');
    expect(states.size).toBeGreaterThan(10);
    for (const s of states) expect(LOCO_FAMILY[s], s).toBeTruthy();
  });
});

describe('bras vivants', () => {
  const run = (inputs, hz, seconds, record = null) => {
    const s = createArmDynamics();
    const out = {};
    const n = Math.round(seconds * hz);
    for (let i = 0; i < n; i++) {
      const t = i / hz;
      stepArmDynamics(s, inputs(t), 1 / hz, out);
      if (record) record(t + 1 / hz, { ...out });
    }
    return out;
  };

  it('traînent à l’accélération, partent en avant au freinage, sont chassés hors du virage', () => {
    const accel = run(() => ({ state: 'RUN', aLong: 8 }), 120, 0.6);
    const brake = run(() => ({ state: 'RUN', aLong: -10 }), 120, 0.6);
    const turn = run(() => ({ state: 'SPRINT', aLat: 10 }), 120, 0.6); // virage à gauche : vers −x
    expect(accel.armLX).toBeGreaterThan(0.08);
    expect(accel.armRX).toBeCloseTo(accel.armLX, 9);
    expect(brake.armLX).toBeLessThan(-0.1);
    expect(turn.armLZ).toBeLessThan(-0.15);
    expect(turn.armRZ).toBeLessThan(-0.15);
    const big = run(() => ({ state: 'SPRINT', aLong: 25, aLat: -20 }), 120, 1);
    for (const k in big) expect(Math.abs(big[k])).toBeLessThanOrEqual(ARM_DYN.cap + 1e-12);
  });

  it('encaissent la réception : les bras descendent puis reviennent', () => {
    let peak = 0;
    let peakT = 0;
    let late = 0;
    run((t) => (t < 0.2 ? { state: 'FALL' } : { state: 'LAND', impact: 10 }), 240, 1.2, (t, o) => {
      if (o.armLX > peak) {
        peak = o.armLX;
        peakT = t;
      }
      if (t > 1.0) late = Math.max(late, Math.abs(o.armLX));
    });
    expect(peak).toBeGreaterThan(0.08);
    expect(peakT).toBeLessThan(0.45);
    expect(late).toBeLessThan(peak * 0.2);
  });

  it('plus lâches avec la fatigue du sprint (dépassement plus grand)', () => {
    const overshoot = (fatigue) => {
      let min = 0;
      run((t) => ({ state: 'SPRINT', aLong: t < 0.4 ? 8 : 0, fatigue }), 240, 1.2, (t, o) => {
        if (t > 0.4) min = Math.min(min, o.armLX);
      });
      return -min;
    };
    expect(overshoot(1)).toBeGreaterThan(overshoot(0) * 1.3);
  });

  it('mêmes valeurs à 30, 60 et 240 Hz aux images communes', () => {
    // entrées constantes par tranche de 1/30 s : seules les cadences diffèrent
    const inputs = (t) => {
      const k = Math.floor(t * 30 + 1e-9);
      return k < 12 ? { state: 'RUN', aLong: 6, aLat: (k % 5) - 2 } : k < 20 ? { state: 'FALL' } : { state: 'LAND', impact: 8, aLat: 4 };
    };
    const at = (hz) => {
      const rec = new Map();
      run(inputs, hz, 1.2, (t, o) => rec.set(Math.round(t * 30 * 1000) / 1000, o));
      return rec;
    };
    const a = at(30);
    const b = at(60);
    const c = at(240);
    let worst = 0;
    for (const [t, o] of a) {
      for (const k in o) {
        worst = Math.max(worst, Math.abs(o[k] - b.get(t)[k]), Math.abs(o[k] - c.get(t)[k]));
      }
    }
    expect(worst).toBeLessThan(1e-9);
  });
});

describe('effort, fatigue et contre-rotation', () => {
  const cycle = (p) => {
    let armMin = Infinity;
    let armMax = -Infinity;
    let fore = 0;
    let hips = 0;
    let torso = 0;
    for (let k = 0; k < 64; k++) {
      const J = pose({ ...p, phase: (k / 64) * Math.PI * 2 });
      armMin = Math.min(armMin, J.armLX);
      armMax = Math.max(armMax, J.armLX);
      fore = Math.max(fore, Math.abs(J.foreL));
      hips = Math.max(hips, Math.abs(J.hipsY));
      torso = Math.max(torso, Math.abs(J.torsoY));
    }
    return { arm: armMax - armMin, fore, hips, torso }; // arm : amplitude crête à crête
  };

  it('pompe davantage à l’accélération, se relâche avec la fatigue', () => {
    const fresh = cycle({ fatigue: 0 });
    const pushing = cycle({ fatigue: 0, aLong: 6 });
    const tired = cycle({ fatigue: 1 });
    expect(pushing.arm).toBeGreaterThan(fresh.arm);
    expect(tired.arm).toBeLessThan(fresh.arm);
    expect(tired.fore).toBeLessThan(fresh.fore);
  });

  it('le bassin contre-tourne les épaules, plus au sprint qu’en marche', () => {
    const J = pose({ phase: Math.PI / 2 });
    expect(Math.sign(J.hipsY)).toBe(-Math.sign(J.torsoY));
    expect(cycle({}).hips).toBeGreaterThan(cycle({ state: 'WALK', v: T.walkMax }).hips * 1.5);
  });
});
