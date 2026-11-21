// Personnage 2.0 : moteur de locomotion pur (allures, inertie de rotation, dérapage,
// roulade, saut, rebords, pentes, clic pour aller) mesuré face aux cibles de réglage.
import { describe, expect, it, vi } from 'vitest';
import { createMotor, stepMotor, interpolate, turnParams, climbable, arriveIntent, wrapAngle } from '../src/entities/locomotion/motor.js';
import { tuningFor, SURFACES } from '../src/entities/locomotion/tuning.js';
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

  it('court à 6,0 m/s et sprinte à 9,4 m/s, marche inchangée ; 90 % de la course en moins de 0,5 s', () => {
    expect(T.walkMax).toBe(2.6);
    for (const profile of ['realiste', 'reactif']) {
      const P = tuningFor(profile);
      expect(P.run).toBe(6.0);
      expect(P.sprint).toBe(9.4);
      const steady = (it) => {
        const m = createMotor(profile);
        let sum = 0;
        let n = 0;
        let t90 = null;
        run(m, it, 10, flat(), 120, (mm, t) => {
          if (t90 === null && mm.v >= 0.9 * (it.sprint ? P.sprint : P.run)) t90 = t;
          if (t > 4) {
            sum += mm.v;
            n++;
          }
        });
        return { mean: sum / n, t90 };
      };
      const r = steady(intent());
      const s = steady(intent({ sprint: true }));
      expect(r.mean).toBeGreaterThan(P.run * 0.97);
      expect(r.mean).toBeLessThan(P.run * 1.03);
      expect(s.mean).toBeGreaterThan(P.sprint * 0.97);
      expect(s.mean).toBeLessThan(P.sprint * 1.03);
      expect(r.t90).toBeLessThanOrEqual(0.5);
      expect(s.t90).toBeLessThan(1.3);
    }
  });

  it('en simple course, même relancée et sur ponton, reste sous les seuils de trébuchement et de dérapage d’arrêt', () => {
    for (const surface of ['grass', 'wood']) {
      const m = createMotor();
      let top = 0;
      run(m, intent(), 16, flat({ surface }), 120, (mm) => {
        top = Math.max(top, mm.v);
      });
      expect(top).toBeLessThan(T.tripSpeed);
      expect(top).toBeLessThan(T.stopSkidSpeed);
    }
    expect(T.tripSpeed).toBeLessThan(T.sprint);
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

describe('accélérations, inclinaison et main au sol', () => {
  // vitesse monde (avant · v + latéral · vLat, latéral = (cos θ, −sin θ))
  const speedOf = (m) => Math.hypot(m.v, m.vLat);
  // côté latéral du point (x, z) par rapport au corps : > 0 du côté latéral +
  const lateralOf = (m, x, z) => (x - m.x) * Math.cos(m.heading) - (z - m.z) * Math.sin(m.heading);
  // virage franc au sprint : 2 s en ligne droite, puis stick tourné de deg (> 0 : vers le latéral +)
  const sprintTurn = (deg, { env = flat(), fps = 120, seconds = 1.5, profile = 'realiste', base = intent({ sprint: true }), each = null } = {}) => {
    const m = createMotor(profile);
    run(m, base, 2, env, fps);
    const a = m.heading + deg * DEG;
    const out = { m, v0: speedOf(m), bankPeak: 0, handTime: 0, touchT: null, touchBank: null, liftBank: null, aLatPeak: 0, gripPeak: 0, vMin: Infinity };
    run(m, { ...base, dirX: Math.sin(a), dirZ: Math.cos(a) }, seconds, env, fps, (mm, t) => {
      out.bankPeak = Math.max(out.bankPeak, Math.abs(mm.bank));
      out.aLatPeak = Math.max(out.aLatPeak, Math.abs(mm.aLat));
      out.gripPeak = Math.max(out.gripPeak, mm.gripUse);
      out.vMin = Math.min(out.vMin, speedOf(mm));
      if (mm.handDown) {
        out.handTime += 1 / fps;
        if (out.touchT === null) {
          out.touchT = t;
          out.touchBank = Math.abs(mm.bank);
        }
      } else if (out.touchT !== null && out.liftBank === null) out.liftBank = Math.abs(mm.bank);
      each?.(mm, t);
    });
    return out;
  };

  const touchesOf = (m) => m.events.filter((e) => e.type === 'handTouch');
  const liftsOf = (m) => m.events.filter((e) => e.type === 'handLift');

  it('au sprint, un virage de 90° penche le corps d’au plus 0,6 rad et effleure le sol une seule fois, 0,1 à 0,3 s', () => {
    for (const profile of ['realiste', 'reactif']) {
      for (const side of [1, -1]) {
        let sideOk = true;
        const r = sprintTurn(90 * side, {
          profile,
          seconds: 2,
          each: (mm) => {
            if (!mm.handDown) return;
            // main du côté où penche le corps (signe de omega), point de contact de ce côté
            if (mm.handSide !== side || Math.sign(mm.bank) !== side || lateralOf(mm, mm.handX, mm.handZ) * side < 0.45) sideOk = false;
          },
        });
        expect(r.bankPeak).toBeLessThanOrEqual(0.6 + 1e-9);
        expect(r.bankPeak).toBeGreaterThan(T.handTouchAngle);
        expect(sideOk).toBe(true);
        const touches = touchesOf(r.m);
        const lifts = liftsOf(r.m);
        expect(touches.length).toBe(1);
        expect(lifts.length).toBe(1);
        expect(r.handTime).toBeGreaterThanOrEqual(0.1);
        expect(r.handTime).toBeLessThanOrEqual(0.3 + 1e-6);
        expect(lifts[0].t).toBeLessThanOrEqual(T.handMaxTime + 1e-6);
        expect(touches[0]).toMatchObject({ side, surface: 'grass' });
        expect(lifts[0]).toMatchObject({ side, surface: 'grass' });
        expect(touches[0].v).toBeGreaterThanOrEqual(T.run + 0.5 * (T.sprint - T.run));
        for (const k of ['x', 'y', 'z', 'v', 'bank']) expect(Number.isFinite(touches[0][k]), k).toBe(true);
      }
    }
  });

  it('sur le plat, pose la main après 0,08 s au-delà de 31,5° et la relève sous 30° ou après 0,3 s', () => {
    let above = 0;
    let atTouch = null;
    let was = false;
    let liftOk = null;
    const r = sprintTurn(90, {
      seconds: 2,
      each: (mm) => {
        above = Math.abs(mm.bank) >= T.handTouchAngle ? above + 1 : 0;
        if (mm.handDown && !was) atTouch = above;
        if (!mm.handDown && was) {
          const lift = liftsOf(mm).at(-1);
          liftOk = Math.abs(mm.bank) < T.handLiftAngle || lift.t >= T.handMaxTime - 1e-6;
        }
        was = mm.handDown;
      },
    });
    expect(r.touchT).not.toBeNull();
    expect(atTouch).toBeGreaterThanOrEqual(Math.ceil(T.handHold * 120 - 1e-6)); // 10 pas de 1/120 s
    expect(liftOk).toBe(true);
    expect([T.handTouchAngle, T.handLiftAngle, T.handHold, T.handMaxTime, T.handCooldown]).toEqual([0.55, 0.52, 0.08, 0.3, 1.2]);
  });

  it('aLat suit la rotation de la vitesse, bank tend vers 0,65 · atan(aLat / g), aLong a le signe de l’accélération', () => {
    const m = createMotor();
    let launch = 0;
    run(m, intent({ sprint: true }), 2, flat(), 120, (mm, t) => {
      if (t < 0.3) launch = Math.max(launch, mm.aLong);
    });
    expect(launch).toBeGreaterThan(10);
    // virage établi (stick un peu devant le cap) : aLat ≈ vitesse × omega, même signe
    run(m, (mm) => intent({ sprint: true, dirX: Math.sin(mm.heading + 0.1), dirZ: Math.cos(mm.heading + 0.1) }), 1.5);
    expect(m.omega).toBeGreaterThan(0.5);
    expect(m.aLat / (speedOf(m) * m.omega)).toBeGreaterThan(0.97);
    expect(m.aLat / (speedOf(m) * m.omega)).toBeLessThan(1.03);
    expect(m.bankTarget).toBeCloseTo(Math.min(T.bankMax, T.bankGain * Math.atan(m.aLat / 9.81)), 6);
    expect(m.bank).toBeGreaterThan(0);
    let stop = 0;
    run(m, intent({ mag: 0 }), 0.3, flat(), 120, (mm) => {
      stop = Math.min(stop, mm.aLong);
    });
    expect(stop).toBeLessThan(-8);
  });

  it('une courbe ordinaire en course penche de 20 à 28°, sans jamais poser la main', () => {
    const m = createMotor();
    run(m, intent(), 2);
    // stick 0,1 rad devant le cap : rayon d’environ 6 m à 6 m/s
    run(m, (mm) => intent({ dirX: Math.sin(mm.heading + 0.1), dirZ: Math.cos(mm.heading + 0.1) }), 2);
    expect(m.state).toBe('RUN');
    expect(m.bank).toBeGreaterThanOrEqual(20 * DEG);
    expect(m.bank).toBeLessThanOrEqual(28 * DEG);
    expect(touchesOf(m)).toEqual([]);
  });

  it('ne pose jamais la main en course, en marche, en ligne droite, en l’air, à la nage ni dans l’eau peu profonde', () => {
    const never = (r) => r.handTime === 0 && touchesOf(r.m).length === 0;
    // ligne droite au sprint : aucune inclinaison
    const straight = createMotor();
    let bank = 0;
    run(straight, intent({ sprint: true }), 4, flat(), 120, (mm) => {
      bank = Math.max(bank, Math.abs(mm.bank));
      expect(mm.handDown).toBe(false);
    });
    expect(bank).toBeLessThan(1e-9);
    for (const profile of ['realiste', 'reactif']) {
      for (const side of [1, -1]) {
        // course à T.run : virage de 90° et demi-tour ; marche : virage de 90°
        expect(never(sprintTurn(90 * side, { profile, base: intent() }))).toBe(true);
        expect(never(sprintTurn(180 * side, { profile, base: intent() }))).toBe(true);
        expect(never(sprintTurn(90 * side, { profile, base: intent({ mag: 0.5 }) }))).toBe(true);
      }
    }
    // nage et eau peu profonde
    expect(never(sprintTurn(90, { base: intent({ sprint: true, swim: true }) }))).toBe(true);
    expect(never(sprintTurn(90, { env: flat({ surface: 'shallow' }) }))).toBe(true);
    // un saut pendant l’appui relève la main au décollage, avant l’atterrissage
    const j = createMotor();
    run(j, intent({ sprint: true }), 2);
    const a = j.heading + Math.PI / 2;
    let jumped = false;
    let airborneDown = false;
    run(j, (mm) => intent({ sprint: true, dirX: Math.sin(a), dirZ: Math.cos(a), jump: mm.handDown && !jumped && (jumped = true), jumpHeld: true }), 1.2, flat(), 120, (mm) => {
      if (!mm.grounded && mm.handDown) airborneDown = true;
    });
    expect(jumped).toBe(true);
    expect(airborneDown).toBe(false);
    const types = j.events.map((e) => e.type);
    expect(types.indexOf('handTouch')).toBeLessThan(types.indexOf('jump'));
    expect(types.indexOf('handLift')).toBeGreaterThan(types.indexOf('jump'));
    expect(types.indexOf('handLift')).toBeLessThan(types.indexOf('land'));
    run(j, intent({ sprint: true, dirX: Math.sin(a), dirZ: Math.cos(a) }), 2);
    expect(j.handDown).toBe(false);
    expect(liftsOf(j).length).toBe(touchesOf(j).length);
  });

  it('en slalom au sprint (virages alternés de 0,6 s), touche au plus une fois par tranche de 1,2 s', () => {
    for (const profile of ['realiste', 'reactif']) {
      for (const amp of [45, 70, 90]) {
        const m = createMotor(profile);
        run(m, intent({ sprint: true }), 2);
        const h0 = m.heading;
        const times = [];
        let was = false;
        run(m, (mm, t) => {
          const k = Math.floor((t - 1 / 120) / 0.6) % 2 ? -1 : 1;
          const a = h0 + (k * amp * DEG) / 2;
          return intent({ sprint: true, dirX: Math.sin(a), dirZ: Math.cos(a) });
        }, 8, flat(), 120, (mm, t) => {
          if (mm.handDown && !was) times.push(t);
          was = mm.handDown;
        });
        expect(times.length).toBeGreaterThan(0); // le slalom touche bien, mais rarement
        for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(1.2);
        expect(times.length).toBeLessThanOrEqual(Math.ceil(8 / 1.2));
      }
    }
  });

  it('donne la même inclinaison et pose la main aux mêmes pas à 30, 60 et 144 Hz', () => {
    const scenario = (fps) => {
      // le balayage est appelé une fois par pas fixe : on y lit l’état laissé par le pas précédent
      let steps = 0;
      let down = false;
      const flips = [];
      const env = flat({
        sweep: (mm, dx, dz, r, o) => {
          if (mm.handDown !== down) {
            down = mm.handDown;
            flips.push(steps);
          }
          steps++;
          return freeSweep(mm, dx, dz, r, o);
        },
      });
      const m = createMotor();
      const banks = [];
      for (let i = 0; i < 4 * fps; i++) {
        // virage de 90° au sprint à 2 s (image commune aux trois cadences)
        stepMotor(m, i >= 2 * fps ? intent({ sprint: true, dirX: 1, dirZ: 0 }) : intent({ sprint: true }), env, 1 / fps);
        const t = (i + 1) / fps;
        if (Math.abs(t * 6 - Math.round(t * 6)) < 1e-9) banks.push(m.bank); // images communes : k / 6 s
      }
      return { banks, flips };
    };
    const [a, b, c] = [30, 60, 144].map(scenario);
    expect(a.flips.length).toBeGreaterThanOrEqual(2);
    expect(a.banks.length).toBe(24);
    for (const o of [b, c]) {
      expect(o.banks.length).toBe(a.banks.length);
      o.banks.forEach((v, i) => expect(Math.abs(v - a.banks[i])).toBeLessThanOrEqual(1 * DEG));
      expect(o.flips.length).toBe(a.flips.length);
      o.flips.forEach((s, i) => expect(Math.abs(s - a.flips[i])).toBeLessThanOrEqual(1));
    }
  });

  it('sur le sable, tourne plus large et glisse davantage ; l’adhérence n’est dépassée que dans le virage franc', () => {
    // rayons minimaux : v² / (grip · SURFACES.grip)
    const R = (v, s) => v / turnParams(v, T, {}, SURFACES[s].grip).wmax;
    expect(R(T.sprint * SURFACES.sand.speed, 'sand')).toBeGreaterThan(R(T.sprint, 'grass'));
    const steady = (surface) => {
      const m = createMotor();
      const env = flat({ surface });
      let grip = 0;
      run(m, intent({ sprint: true }), 2, env, 120, (mm) => {
        grip = Math.max(grip, mm.gripUse); // élan en ligne droite : dans l’ellipse
      });
      expect(grip).toBeLessThanOrEqual(1);
      let slip = 0;
      let use = 0;
      run(m, (mm) => intent({ sprint: true, dirX: Math.sin(mm.heading + 0.35), dirZ: Math.cos(mm.heading + 0.35) }), 1.5, env, 120, (mm, t) => {
        if (t < 0.5) return;
        slip = Math.max(slip, Math.abs(Math.atan2(mm.vLat, mm.v)));
        use = Math.max(use, mm.gripUse);
      });
      return { radius: speedOf(m) / Math.abs(m.omega), slip, use };
    };
    const grass = steady('grass');
    const sand = steady('sand');
    expect(sand.radius).toBeGreaterThan(grass.radius * 1.1);
    expect(sand.slip).toBeGreaterThan(grass.slip * 1.2);
    // virage établi à la limite d’adhérence : gripUse y reste (à 1 % près), sans la dépasser
    expect(grass.use).toBeLessThanOrEqual(1.01);
    expect(sand.use).toBeLessThanOrEqual(1.01);
    // virage franc au sprint (freinage et virage ensemble) : dépassement voulu, plus fort sur le sable
    const hardGrass = sprintTurn(90);
    const hardSand = sprintTurn(90, { env: flat({ surface: 'sand' }) });
    expect(hardSand.gripPeak).toBeGreaterThan(1.1);
    expect(hardSand.gripPeak).toBeGreaterThan(hardGrass.gripPeak);
  });

  it('quand la vitesse plonge dans le virage, l’élan suffit : la main se pose à la pointe d’inclinaison, jamais en se redressant', () => {
    // virage de 90° au sprint sur le sable, dévers de 10° côté intérieur : la vitesse tombe sous
    // course + 0,5 · (sprint − course) pendant que le corps se penche (lot 1 : contact à 0,825 s,
    // sur le palier d’inclinaison, quand la vitesse remontait)
    const threshold = T.run + T.handSpeed * (T.sprint - T.run);
    for (const [surface, deg] of [['sand', 10], ['grass', 10], ['grass', 0]]) {
      let m = null;
      const k = Math.tan(deg * DEG);
      const banks = [];
      let touch = null;
      let touchSpeed = null;
      const env = flat({ surface, ground: (x, z) => (m ? k * lateralOf(m, x, z) : 0) });
      sprintTurn(90, {
        env,
        seconds: 2,
        each: (mm) => {
          m = mm;
          banks.push(Math.abs(mm.bank));
          if (mm.handDown && touch === null) {
            touch = banks.length - 1;
            touchSpeed = speedOf(mm);
          }
        },
      });
      expect(touch, `${surface} ${deg}°`).not.toBeNull();
      if (surface === 'sand') {
        expect(touchSpeed).toBeLessThan(threshold);
        expect((touch + 1) / 120).toBeLessThan(0.7);
      }
      const peakAt = banks.indexOf(Math.max(...banks));
      expect(touch).toBeLessThanOrEqual(peakAt + 6); // avant la pointe, ou au plus 0,05 s après
      expect(banks[touch]).toBeGreaterThan(Math.max(...banks.slice(0, touch + 1)) - 2 * DEG);
    }
  });

  it('pose la main plus tôt quand le sol monte côté intérieur, plus tard ou pas du tout quand il descend', () => {
    // sol incliné de k dans la direction latérale + du corps, plat sous les pieds
    const lean = (k) => {
      let m = null;
      const env = flat({ ground: (x, z) => (m ? k * lateralOf(m, x, z) : 0) });
      const r = sprintTurn(90, { env, each: (mm) => (m = mm) });
      return r;
    };
    // le sol sous la main est relevé de la pente fois l’écart latéral de la sonde
    const flatTurn = lean(0);
    const up = lean(Math.tan(10 * DEG));
    const down = lean(-Math.tan(3 * DEG));
    expect(flatTurn.touchT).not.toBeNull();
    expect(up.touchT).toBeLessThan(flatTurn.touchT);
    expect(up.touchBank).toBeLessThan(flatTurn.touchBank - 2 * DEG);
    expect(up.touchBank).toBeLessThan(T.handTouchAngle);
    expect(touchesOf(up.m)[0].y).toBeGreaterThan(0.05); // contact sur le talus, au-dessus des pieds
    expect(down.touchT === null || down.touchT > flatTurn.touchT).toBe(true);
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

describe('gabarit : mesures du corps dans les réglages (main au sol, prise au sommet)', () => {
  const MAIN = ['handShoulderX', 'handShoulderY', 'handReach', 'handTouchAngle', 'handLiftAngle', 'handRiseMax', 'trunkHands'];
  const lateral = (t) => t.handShoulderX * Math.cos(t.handTouchAngle) + t.handShoulderY * Math.sin(t.handTouchAngle);

  it('épaule, bras, relief et prise au sommet lus dans le gabarit, valeurs d’origine pour le chibi', async () => {
    const { GABARIT } = await import('../src/models/personnage/gabarit.js');
    const R = GABARIT.REST; // os ARM_R = 5, FORE_R = 6, HAND_R = 15
    const os = (a, b) => Math.hypot(R[a][0] - R[b][0], R[a][1] - R[b][1], R[a][2] - R[b][2]);
    expect(T.handShoulderX).toBe(Math.abs(R[5][0]));
    expect(T.handShoulderY).toBe(R[5][1]);
    expect(Math.abs(T.handReach - (os(5, 6) + os(6, 15) + GABARIT.main))).toBeLessThanOrEqual(0.005);
    // buste plié : la prise au sommet est sous l'épaule + le bras tendu, de moins de 10 cm
    expect(T.handShoulderY + T.handReach - T.trunkHands).toBeGreaterThan(0);
    expect(T.handShoulderY + T.handReach - T.trunkHands).toBeLessThan(0.1);
    vi.resetModules();
    globalThis.location = { search: '?gabarit=chibi' };
    let C;
    try {
      const { GABARIT: G } = await import('../src/models/personnage/gabarit.js');
      expect(G.nom).toBe('chibi');
      C = (await import('../src/entities/locomotion/tuning.js')).tuningFor('realiste');
    } finally {
      delete globalThis.location;
      vi.resetModules();
    }
    expect(MAIN.map((k) => C[k])).toEqual([0.17, 0.775, 0.38, 0.55, 0.52, 0.15, 1.1]);
    // seuils d'inclinaison communs à tous les gabarits ; relief compté jusqu'à la même pente côté intérieur
    expect([T.handTouchAngle, T.handLiftAngle]).toEqual([C.handTouchAngle, C.handLiftAngle]);
    expect(T.handRiseMax / lateral(T)).toBeCloseTo(C.handRiseMax / lateral(C), 2);
  });
});
