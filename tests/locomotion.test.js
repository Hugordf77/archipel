// Personnage 2.0 : moteur de locomotion pur (allures, inertie de rotation, dérapage,
// roulade, saut, rebords, pentes, clic pour aller) mesuré face aux cibles de réglage.
import { describe, expect, it } from 'vitest';
import { createMotor, stepMotor, interpolate, turnParams, climbable, arriveIntent, wrapAngle } from '../src/entities/locomotion/motor.js';
import { tuningFor } from '../src/entities/locomotion/tuning.js';
import { locomotionPose, strideLength, advanceGaitPhase, LOCO_FAMILY, CADENCE } from '../src/entities/locomotion/pose.js';

const T = tuningFor('realiste');
const DEG = Math.PI / 180;
const freeSweep = (m, dx, dz, r, o) => {
  o.x = m.x + dx;
  o.z = m.z + dz;
  o.hit = false;
  o.frac = 1;
  return o;
};
const flat = (extra = {}) => ({ surface: 'grass', slopeX: 0, slopeZ: 0, ground: () => 0, sweep: freeSweep, ...extra });
const intent = (o = {}) => ({ dirX: 0, dirZ: 1, mag: 1, sprint: false, walk: false, jump: false, jumpHeld: false, roll: false, noSkid: false, swim: false, speed: 0, ...o });
const run = (m, it, seconds, env = flat(), fps = 120, each = null) => {
  const n = Math.round(seconds * fps);
  for (let i = 0; i < n; i++) {
    stepMotor(m, typeof it === 'function' ? it(m, (i + 1) / fps) : it, env, 1 / fps);
    each?.(m, (i + 1) / fps);
  }
};
const press = (m, it, env = flat()) => stepMotor(m, it, env, 1 / 120);
const states = (m, it, seconds, env) => {
  const out = [];
  run(m, it, seconds, env, 120, (mm) => {
    if (out.at(-1) !== mm.state) out.push(mm.state);
  });
  return out;
};

describe('cadence', () => {
  it('suit la même trajectoire à 30, 60 et 144 Hz (2 cm près sur 3 s)', () => {
    // sprint, virage à 1 s, roulade à 2 s : les appuis tombent sur des images communes
    const script = (t) => intent({
      sprint: true,
      dirX: t >= 1 ? Math.sin(0.8) : 0,
      dirZ: t >= 1 ? Math.cos(0.8) : 1,
    });
    const ends = [30, 60, 144].map((fps) => {
      const m = createMotor();
      const n = 3 * fps;
      for (let i = 0; i < n; i++) {
        const t = i / fps;
        const it = script(t);
        if (i === 2 * fps) it.roll = true;
        stepMotor(m, it, flat(), 1 / fps);
      }
      return interpolate(m, {});
    });
    for (const e of ends) {
      expect(Math.hypot(e.x - ends[0].x, e.z - ends[0].z)).toBeLessThan(0.02);
      expect(Number.isFinite(e.x) && Number.isFinite(e.z)).toBe(true);
    }
  });
});

describe('allures', () => {
  const reach = (it, V) => {
    const m = createMotor();
    let at = null;
    run(m, it, 2, flat(), 120, (mm, t) => {
      if (at === null && mm.v >= V - 0.01) at = t;
    });
    return at;
  };

  it('atteint la course en 0,5 s au plus et le sprint entre 1,0 et 1,3 s', () => {
    expect(reach(intent(), T.run)).toBeLessThanOrEqual(0.5);
    const s = reach(intent({ sprint: true }), T.sprint);
    expect(s).toBeGreaterThanOrEqual(1.0);
    expect(s).toBeLessThanOrEqual(1.3);
  });

  it('marche au stick à moitié, s’arrête en ~0,35 s depuis la course', () => {
    const m = createMotor();
    run(m, intent({ mag: 0.4 }), 1.5);
    expect(m.v).toBeGreaterThan(T.walkMin);
    expect(m.v).toBeLessThanOrEqual(T.walkMax);
    run(m, intent(), 1.5);
    let stop = null;
    run(m, intent({ mag: 0 }), 1, flat(), 120, (mm, t) => {
      if (stop === null && mm.v < 0.05) stop = t;
    });
    expect(stop).toBeGreaterThan(0.25);
    expect(stop).toBeLessThan(0.42);
    expect(m.state).toBe('IDLE');
  });
});

describe('variation naturelle de la course', () => {
  it('ajoute des relances et de petits ralentissements après la phase d’accélération', () => {
    const m = createMotor();
    const speeds = [];
    run(m, intent(), 16, flat(), 120, (mm) => {
      if (mm.v > T.run * 0.97) speeds.push(mm.v);
    });
    const low = Math.min(...speeds);
    const high = Math.max(...speeds);
    expect(high - low).toBeGreaterThan(0.18);
    expect(low).toBeGreaterThan(T.run * 0.95);
    expect(high).toBeLessThan(T.run * 1.08);
  });

  it('garde les mêmes variations à 30, 60 et 120 Hz', () => {
    const simulate = (fps) => {
      const m = createMotor();
      run(m, intent(), 14, flat(), fps);
      return m;
    };
    const motors = [30, 60, 120].map(simulate);
    for (const m of motors.slice(1)) {
      expect(Math.hypot(m.x - motors[0].x, m.z - motors[0].z)).toBeLessThan(0.02);
      expect(m.v).toBeCloseTo(motors[0].v, 4);
      expect(m.pacePhase).toBeCloseTo(motors[0].pacePhase, 8);
    }
  });
});

describe('inertie de rotation', () => {
  it('élargit le virage avec la vitesse : ≤ 0,6 m en marche, ≥ 4 m au sprint', () => {
    const radius = (v) => v / turnParams(v, T, {}).wmax;
    expect(radius(T.walkMax)).toBeLessThanOrEqual(0.6);
    expect(radius(T.sprint)).toBeGreaterThanOrEqual(4);
    // trajectoire réelle : au sprint, stick tenu un peu devant le cap
    const m = createMotor();
    run(m, intent({ sprint: true }), 2);
    let w = 0;
    let v = 0;
    run(m, (mm) => intent({ sprint: true, dirX: Math.sin(mm.heading + 0.35), dirZ: Math.cos(mm.heading + 0.35) }), 1.5, flat(), 120, (mm) => {
      w = Math.abs(mm.omega);
      v = Math.hypot(mm.v, mm.vLat);
    });
    expect(v / w).toBeGreaterThanOrEqual(4);
  });

  const step30 = (it) => {
    const m = createMotor();
    run(m, it, 2);
    const h0 = m.heading;
    const a = 30 * DEG;
    let peak = 0;
    let lastOut = 0;
    run(m, { ...it, dirX: Math.sin(a), dirZ: Math.cos(a) }, 1.5, flat(), 120, (mm, t) => {
      const d = wrapAngle(mm.heading - h0);
      peak = Math.max(peak, d);
      if (Math.abs(d - a) > DEG) lastOut = t;
    });
    return { over: (peak - a) / DEG, settle: lastOut };
  };

  it('au sprint, dépasse un peu l’angle visé (1 à 6°) puis se stabilise en moins de 0,5 s', () => {
    const { over, settle } = step30(intent({ sprint: true }));
    expect(over).toBeGreaterThanOrEqual(1);
    expect(over).toBeLessThanOrEqual(6);
    expect(settle).toBeLessThan(0.5);
  });

  it('en marche, ne dépasse pas (moins de 0,3°)', () => {
    expect(step30(intent({ mag: 0.5 })).over).toBeLessThan(0.3);
  });

  it('garde presque toute sa vitesse dans un virage à 90° au sprint, avec une petite glisse', () => {
    const m = createMotor();
    run(m, intent({ sprint: true }), 2);
    let slip = 0;
    run(m, intent({ sprint: true, dirX: 1, dirZ: 0 }), 0.6, flat(), 120, (mm) => {
      slip = Math.max(slip, Math.abs(mm.vLat));
    });
    expect(m.v).toBeGreaterThan(T.sprint * 0.85);
    expect(slip).toBeGreaterThan(0.05);
  });
});

describe('dérapage et demi-tour', () => {
  it('dérape en inversant à pleine course, puis repart dans l’autre sens', () => {
    for (const it of [intent(), intent({ sprint: true })]) {
      const m = createMotor();
      run(m, it, 2);
      let skid = 0;
      const seq = [];
      run(m, { ...it, dirZ: -1 }, 1.2, flat(), 120, (mm) => {
        if (mm.state === 'SKID') skid += 1 / 120;
        if (seq.at(-1) !== mm.state) seq.push(mm.state);
      });
      expect(seq.slice(0, 2)).toEqual(['SKID', 'PIVOT']);
      expect(skid).toBeLessThanOrEqual(T.skidMaxTime + 1e-6);
      expect(Math.abs(wrapAngle(m.heading - Math.PI))).toBeLessThan(10 * DEG);
      expect(m.v).toBeGreaterThan(T.run * 0.9);
      expect(m.events.map((e) => e.type)).toEqual(expect.arrayContaining(['skidStart', 'skidEnd', 'pivot']));
    }
  });

  it('ne dérape jamais en marche : demi-tour sur place', () => {
    const m = createMotor();
    run(m, intent({ mag: 0.5 }), 1.5);
    const seq = states(m, intent({ mag: 0.5, dirZ: -1 }), 0.8);
    expect(seq).not.toContain('SKID');
    expect(seq).toContain('TURN');
  });

  it('freine d’un court dérapage quand on lâche le stick à pleine allure', () => {
    const m = createMotor();
    run(m, intent({ sprint: true }), 2);
    expect(states(m, intent({ mag: 0 }), 1)[0]).toBe('SKID');
    expect(m.events.some((e) => e.type === 'pivot')).toBe(false);
  });
});

describe('roulade', () => {
  it('donne de l’élan, puis le garde en s’étiolant doucement', () => {
    const m = createMotor();
    run(m, intent(), 1.5);
    press(m, intent({ roll: true }));
    run(m, intent(), 0.05);
    expect(m.state).toBe('ROLL');
    expect(m.v).toBeGreaterThan(T.run + T.rollBonus - 0.2);
    run(m, intent(), 0.8);
    expect(m.v).toBeGreaterThan(T.run + 0.5); // survitesse encore là après la roulade
  });

  it('enchaîne dans la fenêtre parfaite (+1,2 m/s) jusqu’au plafond', () => {
    const m = createMotor();
    run(m, intent(), 1.5);
    press(m, intent({ roll: true }));
    const vs = [];
    for (let k = 0; k < 8; k++) {
      run(m, intent(), 0.4);
      vs.push(m.v);
      press(m, intent({ roll: true }));
    }
    run(m, intent(), 0.02);
    expect(m.chain).toBeGreaterThanOrEqual(6);
    expect(vs[2] - vs[1]).toBeGreaterThan(0.6);
    expect(m.v).toBeLessThanOrEqual(T.rollCap + 1e-6);
  });

  it('mémorise un appui trop tôt, sans bonus', () => {
    const m = createMotor();
    run(m, intent({ sprint: true }), 2);
    press(m, intent({ roll: true }));
    run(m, intent(), 0.1);
    const v = m.v;
    press(m, intent({ roll: true })); // à 0,1 s : trop tôt
    run(m, intent(), 0.5);
    expect(m.state).toBe('ROLL'); // la roulade mémorisée est partie
    expect(m.chain).toBe(0);
    expect(m.v).toBeLessThan(v);
  });

  it('rebondit contre un mur', () => {
    const wall = (mm, dx, dz, r, o) => {
      const nz = mm.z + dz;
      if (nz > 3) {
        o.x = mm.x;
        o.z = mm.z;
        o.hit = true;
        o.frac = 0;
      } else {
        o.x = mm.x + dx;
        o.z = nz;
        o.hit = false;
        o.frac = 1;
      }
      return o;
    };
    const env = flat({ sweep: wall });
    const m = createMotor();
    run(m, intent(), 0.3, env);
    press(m, intent({ roll: true }), env);
    const seq = states(m, intent(), 1, env);
    expect(seq).toContain('BONK');
    expect(m.events.some((e) => e.type === 'bonk')).toBe(true);
    expect(m.z).toBeLessThanOrEqual(3);
  });
});

describe('saut, chute et rebords', () => {
  it('monte à environ 1 m, moins haut si on relâche tôt', () => {
    const top = (held) => {
      const m = createMotor();
      let y = 0;
      press(m, intent({ mag: 0, jump: true, jumpHeld: true }));
      run(m, intent({ mag: 0, jumpHeld: held }), 1, flat(), 120, (mm) => {
        y = Math.max(y, mm.y);
      });
      return y;
    };
    expect(top(true)).toBeGreaterThanOrEqual(0.9);
    expect(top(true)).toBeLessThanOrEqual(1.15);
    expect(top(false)).toBeLessThan(top(true) * 0.6);
  });

  it('saute plus loin au sprint (saut long) qu’en course', () => {
    const dist = (it) => {
      const m = createMotor();
      run(m, it, 2);
      const z0 = m.z;
      press(m, { ...it, jump: true, jumpHeld: true });
      let d = null;
      run(m, { ...it, jumpHeld: true }, 1.2, flat(), 120, (mm) => {
        if (d === null && mm.grounded) d = mm.z - z0;
      });
      return d;
    };
    expect(dist(intent({ sprint: true }))).toBeGreaterThan(dist(intent()) + 0.5);
  });

  const ledge = (h) => flat({ ground: (x, z) => (z < 2 ? h : 0) });

  it('tombe vraiment d’un rebord de plus de 0,35 m, reste collé en dessous', () => {
    const m = createMotor();
    m.y = 1;
    const seq = states(m, intent(), 1, ledge(1));
    expect(seq).toContain('FALL');
    expect(m.y).toBeCloseTo(0, 5);
    expect(m.events.some((e) => e.type === 'land')).toBe(true);
    const low = createMotor();
    low.y = 0.3;
    expect(states(low, intent(), 1, ledge(0.3))).not.toContain('FALL');
  });

  it('accorde le saut juste après avoir quitté un rebord, et retient un appui juste avant l’atterrissage', () => {
    const m = createMotor();
    m.y = 1;
    run(m, intent(), 0.6, ledge(1), 120);
    // on avance jusqu'au rebord puis on saute dans les 0,1 s
    let jumped = false;
    run(m, (mm) => intent({ jump: mm.state === 'FALL' && !jumped && (jumped = true), jumpHeld: true }), 0.6, ledge(1), 120);
    expect(m.events.some((e) => e.type === 'jump')).toBe(true);
    // tampon : appui 0,08 s avant de toucher le sol
    const b = createMotor();
    press(b, intent({ mag: 0, jump: true, jumpHeld: true }));
    let pressed = false;
    run(b, (mm) => intent({ mag: 0, jump: !pressed && mm.vy < 0 && mm.y < 0.25 && (pressed = true), jumpHeld: true }), 1.2);
    expect(b.events.filter((e) => e.type === 'jump').length).toBe(2);
  });

  it('franchit une petite marche, pas un mur', () => {
    expect(climbable(0.3, 0.04, 0.02, T)).toBe(true); // marche de 30 cm, plat derrière
    expect(climbable(0.3, 0.04, 0.3, T)).toBe(false); // le sol continue de monter : paroi
    expect(climbable(0.6, 0.04, 0, T)).toBe(false); // trop haut
    expect(climbable(0.04, 0.04, 0, T)).toBe(true); // pente douce
  });
});

describe('pentes', () => {
  const slope = (deg) => {
    const g = Math.tan(deg * DEG);
    return flat({ slopeZ: g, ground: (x, z) => z * g });
  };

  it('ralentit en montée, accélère un peu en descente', () => {
    const up = createMotor();
    run(up, intent(), 1.5, slope(20));
    const down = createMotor();
    run(down, intent(), 1.5, slope(-20));
    expect(up.v).toBeLessThan(T.run * 0.8);
    expect(down.v).toBeGreaterThan(T.run * 1.1);
  });

  it('glisse là où l’on ne pourrait pas grimper (au-delà de 55°), tient debout en dessous', () => {
    const m = createMotor();
    expect(states(m, intent({ mag: 0 }), 0.5, slope(60))).toContain('SLIDE');
    expect(m.v).toBeGreaterThan(2);
    const still = createMotor();
    expect(states(still, intent({ mag: 0 }), 0.5, slope(45))).not.toContain('SLIDE');
  });
});

describe('clic pour aller', () => {
  it('arrive dans stopDist sans déraper ni osciller', () => {
    for (const [tx, tz] of [[0, 12], [5, -6], [-2, 1.5]]) {
      const m = createMotor();
      const far = Math.hypot(tx, tz) > 8;
      const it = intent();
      let d = Infinity;
      let crossings = 0;
      let prevSign = 0;
      for (let i = 0; i < 600 && d >= 0.25; i++) {
        d = arriveIntent(m, tx, tz, 0.25, far, it);
        stepMotor(m, it, flat(), 1 / 60);
        const sign = Math.sign((tx - m.x) * it.dirX + (tz - m.z) * it.dirZ);
        if (prevSign && sign && sign !== prevSign) crossings++;
        prevSign = sign;
      }
      expect(d).toBeLessThan(0.25);
      expect(m.events.some((e) => e.type === 'skidStart')).toBe(false);
      expect(crossings).toBeLessThanOrEqual(1);
    }
  });
});

describe('pose de locomotion', () => {
  const REST = {
    bodyY: 0, lean: 0, bodyRoll: 0, sx: 1, sy: 1, hipsZ: 0, torsoX: 0, torsoY: 0, torsoZ: 0,
    neckX: 0, neckY: 0, neckZ: 0, headX: 0, headY: 0, headZ: 0,
    armLX: 0, armLZ: -0.2, armRX: 0, armRZ: 0.2, foreL: -0.15, foreR: -0.15,
    wristLX: 0, wristLZ: 0, wristRX: 0, wristRZ: 0,
    thighL: 0, thighR: 0, shinL: 0, shinR: 0, footL: 0, footR: 0,
  };
  const pose = (p) => {
    const T = { ...REST };
    const X = {};
    locomotionPose({ state: 'RUN', t: 0.5, v: 0, vLat: 0, vy: 0, omega: 0, phase: 0, now: 1, startT: 1, breath: 0, ...p }, T, X);
    return { T, X };
  };

  it('conserve la phase des deux jambes au-delà des événements de pas', () => {
    const oneStep = advanceGaitPhase(0, 1.65, 1.65);
    const twoSteps = advanceGaitPhase(oneStep, 1.65, 1.65);
    expect(oneStep).toBeCloseTo(Math.PI, 8);
    expect(twoSteps).toBeCloseTo(0, 8);
    const lead = pose({ v: T.run, phase: oneStep }).T;
    const nextLead = pose({ v: T.run, phase: twoSteps }).T;
    expect(lead.thighR).toBeLessThan(0);
    expect(nextLead.thighL).toBeLessThan(0);
  });

  it('adapte la distance entre appuis alternés à une cadence crédible', () => {
    // Longueurs rapportées aux allures réglées : cadence ≈ 3,27 appuis/s en course, 3,49 au sprint
    // (soit 1,65 m et 2,35 m d'appui à 5,4 et 8,2 m/s).
    expect(strideLength(T.walkMax)).toBeCloseTo(1.05, 5);
    expect(T.run / strideLength(T.run)).toBeCloseTo(CADENCE.run, 5);
    expect(T.sprint / strideLength(T.sprint)).toBeCloseTo(CADENCE.sprint, 5);
    expect(strideLength(T.sprint)).toBeGreaterThan(strideLength(T.run));
    expect(T.sprint / strideLength(T.sprint)).toBeLessThan(4);
  });

  it('alterne les appuis et garde le pied en extension contrôlée pendant le contact', () => {
    const contact = pose({ v: T.run, phase: 0 }).T;
    const opposite = pose({ v: T.run, phase: Math.PI }).T;
    const drive = pose({ v: T.run, phase: Math.PI * 1.15 }).T;
    const swing = pose({ v: T.run, phase: Math.PI * 1.6 }).T;
    const touchdown = pose({ v: T.run, phase: Math.PI * 1.98 }).T;
    const sprintSwing = pose({ v: T.sprint, phase: Math.PI * 1.6 }).T;
    expect(contact.thighL).toBeLessThan(0); // genou/cuisse projettent la jambe vers l’avant à l’appui
    expect(opposite.thighR).toBeLessThan(0);
    expect(contact.thighL).toBeCloseTo(opposite.thighR, 5);
    expect(contact.thighR).toBeCloseTo(opposite.thighL, 5);
    expect(contact.shinL).toBeGreaterThan(0.25);
    expect(swing.shinL).toBeGreaterThan(contact.shinL + 0.6);
    expect(sprintSwing.shinL).toBeLessThan(1.8);
    expect(contact.thighL + contact.shinL + contact.footL).toBeLessThan(-0.07); // pointe relevée au contact
    expect(drive.thighL).toBeGreaterThan(0.7);
    expect(contact.thighL).toBeLessThan(-0.7);
    expect(drive.thighL + drive.shinL + drive.footL).toBeGreaterThan(0.2); // poussée sur la pointe
    expect(swing.thighL + swing.shinL + swing.footL).toBeLessThan(-0.25); // pointe dégagée en l'air
    expect(touchdown.thighL + touchdown.shinL + touchdown.footL).toBeLessThan(-0.07); // prépare le contact suivant
  });

  it('reste finie et continue quand la vitesse et la phase évoluent (aucun saut de pose)', () => {
    const hz = 240;
    let phase = 0;
    let prev = null;
    let worst = 0;
    for (let i = 0; i < hz * 6; i++) {
      const t = i / hz;
      const v = T.sprint * Math.sin((Math.PI * t) / 6); // 0 → sprint → 0
      phase += (Math.PI * v) / hz / strideLength(v);
      const { T: cur } = pose({ state: v < 0.2 ? 'IDLE' : 'RUN', v, phase, omega: Math.sin(t * 2) * 1.2, inputAngle: Math.sin(t) * 0.5, now: t, accF: Math.cos((Math.PI * t) / 6) * 8 });
      for (const k in cur) {
        expect(Number.isFinite(cur[k]), k).toBe(true);
        if (prev) worst = Math.max(worst, Math.abs(cur[k] - prev[k]));
      }
      prev = cur;
    }
    expect(worst).toBeLessThan(0.15);
  });

  it('fait varier les bras de façon expressive, bornée et déterministe', () => {
    const walk = pose({ v: T.walkMax }).T;
    let minSpread = Infinity;
    let maxSpread = -Infinity;
    let minElbow = Infinity;
    let maxElbow = -Infinity;
    for (let k = 0; k < 96; k++) {
      const phase = (k / 96) * Math.PI * 2;
      const run = pose({ v: T.run, phase }).T;
      const repeated = pose({ v: T.run, phase }).T;
      expect(run.armLZ).toBe(repeated.armLZ);
      expect(run.foreR).toBe(repeated.foreR);
      minSpread = Math.min(minSpread, Math.abs(run.armLZ), Math.abs(run.armRZ));
      maxSpread = Math.max(maxSpread, Math.abs(run.armLZ), Math.abs(run.armRZ));
      minElbow = Math.min(minElbow, Math.abs(run.foreL), Math.abs(run.foreR));
      maxElbow = Math.max(maxElbow, Math.abs(run.foreL), Math.abs(run.foreR));
    }
    expect(Math.abs(walk.armLZ)).toBeLessThan(minSpread);
    expect(minSpread).toBeGreaterThan(0.45);
    expect(maxSpread).toBeLessThan(1.3);
    expect(maxSpread - minSpread).toBeGreaterThan(0.25);
    expect(minElbow).toBeGreaterThan(0.25);
    expect(maxElbow - minElbow).toBeGreaterThan(0.1);
  });

  it('se penche davantage et pompe plus des bras au sprint qu’en course', () => {
    const cycle = (v) => {
      let lean = 0;
      let arm = 0;
      for (let k = 0; k < 64; k++) {
        const { T: p } = pose({ v, phase: (k / 64) * Math.PI * 2 });
        lean = Math.max(lean, p.lean);
        arm = Math.max(arm, Math.abs(p.armLX));
      }
      return { lean, arm };
    };
    const run = cycle(T.run);
    const sprint = cycle(T.sprint);
    expect(sprint.lean).toBeGreaterThan(run.lean + 0.1);
    expect(sprint.arm).toBeGreaterThan(run.arm);
  });

  it('penche le corps dans le virage, côté intérieur', () => {
    expect(pose({ v: T.sprint, omega: 1.4 }).T.bodyRoll).toBeLessThan(-0.15); // virage à gauche
    expect(pose({ v: T.sprint, omega: -1.4 }).T.bodyRoll).toBeGreaterThan(0.15);
    expect(Math.abs(pose({ v: T.sprint, omega: 0 }).T.bodyRoll)).toBeLessThan(1e-9);
  });

  it('donne une pose finie à chaque état, et un tour complet en roulade', () => {
    for (const state of Object.keys(LOCO_FAMILY)) {
      const { T: p, X } = pose({ state, v: 5, vy: 3, rollT: 0.5, airTime: 0.8, impact: 10, t: 0.1 });
      for (const k in p) expect(Number.isFinite(p[k]), `${state}.${k}`).toBe(true);
      expect(X.spin).toBeGreaterThanOrEqual(0);
      expect(X.spin).toBeLessThan(Math.PI * 2);
    }
    expect(pose({ state: 'ROLL', rollT: 0.5 }).X.spin).toBeCloseTo(Math.PI, 5);
    expect(pose({ state: 'SKID', t: 0.1 }).T.lean).toBeLessThan(-0.2); // buste en arrière
  });
});

describe('trébucher', () => {
  // obstacle bas (rocher, souche…) entre z = 5 et z = 5,6 : on bascule par-dessus en trébuchant
  const rock = (mm, dx, dz, r, o) => {
    const nz = mm.z + dz;
    const blocked = mm.state !== 'TRIP' && nz > 5 && mm.z <= 5.6;
    o.x = blocked ? mm.x : mm.x + dx;
    o.z = blocked ? mm.z : nz;
    o.hit = blocked;
    o.frac = blocked ? 0 : 1;
    o.trip = blocked;
    return o;
  };
  const env = () => flat({ sweep: rock });

  it('au sprint, trébuche sur un obstacle bas, tombe à plat ventre puis se relève', () => {
    const m = createMotor();
    m.z = -12;
    const seq = states(m, intent({ sprint: true }), 4, env());
    expect(seq).toEqual(expect.arrayContaining(['TRIP', 'FALLEN', 'GETUP']));
    expect(seq.indexOf('TRIP')).toBeLessThan(seq.indexOf('FALLEN'));
    expect(seq.indexOf('FALLEN')).toBeLessThan(seq.indexOf('GETUP'));
    expect(m.z).toBeGreaterThan(5.6); // on a basculé par-dessus
    const types = m.events.map((e) => e.type);
    expect(types).toEqual(expect.arrayContaining(['trip', 'faceplant', 'getup']));
    expect(['RUN', 'SPRINT', 'WALK']).toContain(m.state); // reparti
  });

  it('ne trébuche pas en simple course : l’obstacle arrête', () => {
    const m = createMotor();
    m.z = -12;
    const seq = states(m, intent(), 4, env());
    expect(seq).not.toContain('TRIP');
    expect(m.z).toBeLessThanOrEqual(5.6);
  });

  it('se relève plus vite si l’on appuie sur saut ou roulade une fois à terre', () => {
    const ground = (hurry) => {
      const m = createMotor();
      m.z = -12;
      let t = 0;
      let down = null;
      run(m, (mm) => intent({ sprint: true, roll: hurry && mm.state === 'FALLEN' && mm.t > 0.35 }), 5, env(), 120, (mm, tt) => {
        if (mm.state === 'FALLEN' && down === null) down = tt;
        if (mm.state === 'GETUP' && !t) t = tt;
      });
      return t - down;
    };
    expect(ground(true)).toBeLessThan(ground(false) - 0.15);
  });

  it('ne peut ni sauter ni rouler pendant la chute', () => {
    const m = createMotor();
    m.z = -12;
    run(m, (mm) => intent({ sprint: true, jump: mm.state === 'TRIP', roll: mm.state === 'TRIP' }), 4, env());
    const types = m.events.map((e) => e.type);
    expect(types.filter((t) => t === 'jump' || t === 'roll')).toEqual([]);
  });
});

describe('tête en course', () => {
  it('hoche et roule à chaque appui au sprint au lieu de rester figée', () => {
    let lo = Infinity;
    let hi = -Infinity;
    let zlo = Infinity;
    let zhi = -Infinity;
    for (let k = 0; k < 64; k++) {
      const T0 = { bodyY: 0, lean: 0, bodyRoll: 0, sx: 1, sy: 1, hipsZ: 0, torsoX: 0, torsoY: 0, torsoZ: 0, neckX: 0, neckY: 0, neckZ: 0, headX: 0, headY: 0, headZ: 0, armLX: 0, armLZ: -0.2, armRX: 0, armRZ: 0.2, foreL: -0.15, foreR: -0.15, wristLX: 0, wristLZ: 0, wristRX: 0, wristRZ: 0, thighL: 0, thighR: 0, shinL: 0, shinR: 0, footL: 0, footR: 0 };
      locomotionPose({ state: 'SPRINT', t: 1, v: T.sprint, vLat: 0, omega: 0, phase: (k / 64) * Math.PI * 2, now: 1 }, T0, {});
      lo = Math.min(lo, T0.headX);
      hi = Math.max(hi, T0.headX);
      zlo = Math.min(zlo, T0.headZ);
      zhi = Math.max(zhi, T0.headZ);
    }
    expect(hi - lo).toBeGreaterThan(0.15);
    expect(zhi - zlo).toBeGreaterThan(0.1);
  });
});
