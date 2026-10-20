// Grimper aux troncs (palmiers), partie A lot 1 : moteur pur (stepMotor avec un palmier de test, sol
// plat, obstacle rond comme celui de navigation.js) et raccord du Player à un vrai obstacle grimpe.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createMotor, stepMotor, resetMotor, interpolate, trunkLimits, wrapAngle, H } from '../src/entities/locomotion/motor.js';
import { tuningFor } from '../src/entities/locomotion/tuning.js';
import { trunkFrame, trunkClosest, trunkLength, trunkSAtY } from '../src/entities/locomotion/trunk.js';
import { troncMonde, troncsProches, setObstacles, addObstacle, removeObstacle, setGroundProvider, obstacleAt, pushOut } from '../src/world/navigation.js';
import { GRIMPE } from '../src/models/physique.gen.js';
import { Player } from '../src/entities/Player.js';

const T = tuningFor('realiste');
const DEG = Math.PI / 180;

// palmier d'île (format grimpe passé au monde par troncMonde), pied en (x, y, z), penché vers +x à rot = 0 ;
// obstacle de rayon 0,4 · sc (encombrement du palmier), comme IslandManager
const palmier = ({ x = 0, y = 0, z = 0, rot = 0, sc = 1 } = {}) => {
  const t = troncMonde({ kind: 'palmier', x, y, z, rot, sc, def: GRIMPE.palmier });
  t.encombrement = 0.4 * sc;
  return t;
};

// balayage de Player.free : obstacles ronds (rayon de l'obstacle + 0,9 · rayon du corps), glissement le
// long ; le tronc qu'on quitte (m.trunkExit) est ignoré
const ANGLES = [0.5, -0.5, 1.0, -1.0, 1.35, -1.35];
const sweepOf = (trunks) => (m, dx, dz, r, o) => {
  const free = (x, z) => !trunks().some((t) => t !== m.trunkExit && Math.hypot(x - t.pts[0][0], z - t.pts[0][2]) < t.encombrement + r * 0.9);
  o.hit = false;
  o.frac = 1;
  o.trip = false;
  if (free(m.x + dx, m.z + dz)) {
    o.x = m.x + dx;
    o.z = m.z + dz;
    return o;
  }
  o.hit = true;
  for (const a of ANGLES) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    const rx = (dx * c - dz * s) * c;
    const rz = (dx * s + dz * c) * c;
    if (free(m.x + rx, m.z + rz)) {
      o.x = m.x + rx;
      o.z = m.z + rz;
      o.frac = c * c;
      return o;
    }
  }
  o.x = m.x;
  o.z = m.z;
  o.frac = 0;
  return o;
};
// sol plat en y = 0 ; list : troncs présents (modifiable en cours de test)
const world = (list) => {
  const trunks = () => list;
  return { surface: 'grass', slopeX: 0, slopeZ: 0, ground: () => 0, sweep: sweepOf(trunks), trunks };
};
const intent = (o = {}) => ({ dirX: 0, dirZ: 1, mag: 0, sprint: false, walk: false, jump: false, jumpHeld: true, roll: false, noSkid: false, swim: false, speed: 0, stick: null, carry: false, ...o });
const toward = (o = {}) => intent({ mag: 1, ...o });

// pas fixes (120 Hz), relevé des événements ; it : intention ou fonction (m, t) → intention
const run = (m, it, seconds, env, fps = 120, each = null) => {
  const n = Math.round(seconds * fps);
  const ev = [];
  for (let i = 0; i < n; i++) {
    stepMotor(m, typeof it === 'function' ? it(m, i / fps) : it, env, 1 / fps);
    for (const e of m.events) ev.push(e);
    m.events.length = 0;
    each?.(m, (i + 1) / fps);
  }
  return ev;
};
const types = (ev) => ev.map((e) => e.type);
const footDist = (m, tr) => Math.hypot(m.x - tr.pts[0][0], m.z - tr.pts[0][2]);
const snapLeft = (m) => Math.hypot(m.snapX, m.snapY, m.snapZ);

// collé au palmier (côté −z, bloqué par l'obstacle), puis un saut : accroche au sol
const grabbed = (tr = palmier(), env = world([tr])) => {
  const m = createMotor();
  resetMotor(m, tr.pts[0][0], 0, tr.pts[0][2] - 2, 0);
  run(m, toward(), 1, env);
  const ev = run(m, intent({ jump: true }), 1 / 120, env);
  return { m, tr, env, ev };
};
// accroché, puis immobile jusqu'à ce que le raccord amorti soit fini (décalage remis à zéro)
const settled = (opts) => {
  const g = grabbed(opts?.tr, opts?.env);
  run(g.m, intent(), 2, g.env);
  expect(snapLeft(g.m)).toBe(0);
  return g;
};

describe('trunk.js : géométrie pure du tronc', () => {
  it('abscisse, point, rayon et tangente continue le long du stipe ; n(θ) ⟂ tangente, d’azimut θ', () => {
    const tr = palmier({ rot: 0.7, sc: 1.2, x: 3, y: 2, z: -1 });
    const L = trunkLength(tr.pts);
    expect(L).toBeGreaterThan(4.2 * 1.2);
    const f = {};
    let prev = null;
    for (let s = 0; s <= L; s += 0.01) {
      trunkFrame(tr.pts, s, 1.1, f);
      expect(Math.hypot(f.tx, f.ty, f.tz)).toBeCloseTo(1, 12);
      expect(Math.hypot(f.nx, f.ny, f.nz)).toBeCloseTo(1, 12);
      expect(f.nx * f.tx + f.ny * f.ty + f.nz * f.tz).toBeCloseTo(0, 12);
      // projection horizontale de n dans la direction (sin θ, cos θ)
      expect(Math.atan2(f.nx, f.nz)).toBeCloseTo(1.1, 12);
      if (prev) {
        // tangente continue : moins de 0,5° par centimètre, même au passage d'un point
        expect(Math.acos(Math.min(1, f.tx * prev.tx + f.ty * prev.ty + f.tz * prev.tz))).toBeLessThan(0.5 * DEG);
        expect(Math.hypot(f.x - prev.x, f.y - prev.y, f.z - prev.z)).toBeCloseTo(0.01, 4);
      }
      prev = { ...f };
    }
    // pied et haut : premiers et derniers points de pts
    trunkFrame(tr.pts, 0, 0, f);
    expect([f.x, f.y, f.z, f.r]).toEqual(tr.pts[0]);
    trunkFrame(tr.pts, L + 3, 0, f);
    expect(f.s).toBe(L);
    tr.pts.at(-1).forEach((v, i) => expect([f.x, f.y, f.z, f.r][i]).toBeCloseTo(v, 12));
    // point le plus proche et hauteur → abscisse
    trunkFrame(tr.pts, 2.345, 0.3, f);
    const c = trunkClosest(tr.pts, f.x + 0.5 * f.nx, f.y + 0.5 * f.ny, f.z + 0.5 * f.nz, {});
    expect(c.s).toBeCloseTo(2.345, 2);
    expect(c.d).toBeCloseTo(0.5, 2);
    expect(trunkSAtY(tr.pts, f.y)).toBeCloseTo(2.345, 9);
  });
});

describe('s’accrocher', () => {
  it('saut en courant vers un palmier : accroche en l’air (CLIMB), à moins de r + 0,75 m de l’axe', () => {
    const tr = palmier();
    const env = world([tr]);
    const m = createMotor();
    resetMotor(m, 0, 0, -3, 0);
    const ev = run(m, (mm, t) => toward({ jump: t >= 0.15 && t < 0.16 }), 1.2, env);
    const g = ev.find((e) => e.type === 'grab');
    expect(g).toBeTruthy();
    expect(g.fromGround).toBe(false);
    expect(g.impact).toBeGreaterThan(3);
    expect(m.state).toBe('CLIMB');
    expect(m.trunk).toBe(tr);
    // centre du corps au moment de l'accroche : entre le blocage de l'obstacle (0,67 m) et la portée
    const c = trunkClosest(tr.pts, g.x, g.y + T.trunkProbeY, g.z, {});
    expect(c.d).toBeLessThanOrEqual(c.r + T.radius + T.trunkGrabReach + 1e-9);
    expect(c.d).toBeGreaterThan(0.4 + 0.27);
  });

  it('au sol contre le tronc, un saut accroche directement (même un saut tapé, même sans entrée)', () => {
    for (const it of [intent({ jump: true, jumpHeld: false }), toward({ jump: true, jumpHeld: false })]) {
      const tr = palmier();
      const env = world([tr]);
      const m = createMotor();
      resetMotor(m, 0, 0, -2, 0);
      run(m, toward(), 1, env);
      // l'obstacle tient le corps à 0,4 + 0,27 m du pied
      expect(footDist(m, tr)).toBeCloseTo(0.67, 2);
      const ev = run(m, it, 1 / 120, env);
      expect(types(ev)).toEqual(['grab']);
      expect(ev[0]).toMatchObject({ fromGround: true, impact: 0 });
      expect(m.state).toBe('CLIMB');
    }
  });

  it('en marchant ou en courant sans sauter, jamais : le tronc reste un obstacle', () => {
    const tr = palmier();
    const env = world([tr]);
    for (const [x0, it] of [
      [0, toward()], // droit dedans
      [0, toward({ sprint: true })],
      [-0.72, toward({ sprint: true })], // au ras, de l'autre côté de la pente du stipe
      [0.5, toward({ walk: true })],
    ]) {
      const m = createMotor();
      resetMotor(m, x0, 0, -3, 0);
      const ev = run(m, it, 3, env, 120, (mm) => expect(mm.state).not.toMatch(/CLIMB/));
      expect(types(ev)).not.toContain('grab');
      expect(m.trunk).toBeNull();
    }
  });

  it('saut trop loin ou à côté : pas d’accroche', () => {
    const tr = palmier();
    const env = world([tr]);
    // saut sur place à 2,5 m, stick vers le tronc : on retombe à plus d'un mètre
    let m = createMotor();
    resetMotor(m, 0, 0, -2.5, 0);
    let closest = Infinity;
    let ev = run(m, (mm, t) => toward({ jump: t === 0 }), 0.6, env, 120, (mm) => {
      if (!mm.grounded) closest = Math.min(closest, trunkClosest(tr.pts, mm.x, mm.y + T.trunkProbeY, mm.z, {}).d);
    });
    expect(types(ev)).not.toContain('grab');
    expect(closest).toBeGreaterThan(1);
    // saut au sprint qui passe à 1,2 m de l'axe
    m = createMotor();
    resetMotor(m, -1.2, 0, -6, 0);
    ev = run(m, (mm, t) => toward({ sprint: true, jump: Math.abs(mm.z + 1.5) < 0.1 && mm.grounded }), 2, env);
    expect(types(ev)).toContain('jump');
    expect(types(ev)).not.toContain('grab');
    // à portée, mais stick tourné à l'opposé du tronc : on saute sans s'accrocher
    m = createMotor();
    resetMotor(m, 0, 0, -2, 0);
    run(m, toward(), 1, env);
    ev = run(m, intent({ mag: 1, dirZ: -1, jump: true }), 0.6, env);
    expect(types(ev)).toContain('jump');
    expect(types(ev)).not.toContain('grab');
  });

  it('pas d’accroche à un tronc dont l’obstacle a disparu', () => {
    const list = [palmier()];
    const env = world(list);
    const m = createMotor();
    resetMotor(m, 0, 0, -2, 0);
    run(m, toward(), 1, env);
    list.length = 0; // arbre coupé
    const ev = run(m, toward({ jump: true }), 1, env);
    expect(types(ev)).toContain('jump');
    expect(types(ev)).not.toContain('grab');
  });
});

describe('sur le tronc', () => {
  it('monte à 1,5 m/s jusqu’au sommet (CLIMB_TOP), corps à r(s) + 0,22 m de l’axe à 1 cm près, face au tronc', () => {
    const { m, tr, env } = grabbed();
    const lim = { ...trunkLimits(tr, T) };
    const s0 = m.climbS;
    expect(s0).toBeCloseTo(lim.low, 9);
    let tTop = null;
    let worst = 0;
    let checked = 0;
    let vMax = 0;
    const ev = run(m, intent({ stick: { x: 0, y: 1 } }), 3, env, 120, (mm, t) => {
      vMax = Math.max(vMax, mm.climbSpeed);
      if (tTop === null && mm.state === 'CLIMB_TOP') tTop = t;
      if (mm.state !== 'CLIMB' || snapLeft(mm) > 1e-3) return;
      const c = trunkClosest(tr.pts, mm.x, mm.y, mm.z, {});
      worst = Math.max(worst, Math.abs(c.d - (mm.trunkR + T.trunkGap)), Math.abs(c.s - mm.climbS));
      checked++;
      // face au tronc : l'avant vise l'axe à l'horizontale
      const ax = c.x - mm.x;
      const az = c.z - mm.z;
      expect((Math.sin(mm.heading) * ax + Math.cos(mm.heading) * az) / Math.hypot(ax, az)).toBeGreaterThan(0.9999);
    });
    expect(checked).toBeGreaterThan(100);
    expect(worst).toBeLessThan(0.01);
    expect(vMax).toBe(T.trunkUp);
    // de la racine la plus basse aux mains au sommet : (max − low) / 1,5 + rampe de mise en route
    const expected = (lim.max - lim.low) / T.trunkUp + T.trunkUp / (2 * T.trunkAccel);
    expect(Math.abs(tTop - expected)).toBeLessThan(2 * H);
    expect(types(ev)).toContain('climbTop');
    expect(m.state).toBe('CLIMB_TOP');
    // racine au haut de l'axe (point le plus haut de pts), cap θ + π
    tr.pts.at(-1).slice(0, 3).forEach((v, i) => expect([m.x, m.y, m.z][i]).toBeCloseTo(v, 3));
    expect(wrapAngle(m.heading - m.climbTheta - Math.PI)).toBeCloseTo(0, 6);
    expect(m.climbDist).toBeCloseTo(lim.max - s0, 6);
  });

  it('descend à 1,8 m/s ; sans entrée, s’arrête en douceur puis reste immobile (pas de glissade lente)', () => {
    const { m, env } = settled();
    run(m, intent({ stick: { x: 0, y: 1 } }), 1, env);
    let vMin = 0;
    let dvMax = 0;
    let last = m.climbSpeed;
    run(m, intent({ stick: { x: 0, y: -0.7 } }), 0.5, env, 120, (mm) => {
      vMin = Math.min(vMin, mm.climbSpeed);
      dvMax = Math.max(dvMax, Math.abs(mm.climbSpeed - last));
      last = mm.climbSpeed;
    });
    expect(vMin).toBeCloseTo(-T.trunkDown, 9);
    expect(m.sliding).toBe(false); // −0,7 n'est pas un stick bas franc
    run(m, intent(), 0.3, env, 120, (mm) => {
      dvMax = Math.max(dvMax, Math.abs(mm.climbSpeed - last));
      last = mm.climbSpeed;
    });
    // aucune vitesse qui saute d'un pas à l'autre : au plus trunkBrake · h
    expect(dvMax).toBeLessThanOrEqual(T.trunkBrake * H + 1e-9);
    expect(m.climbSpeed).toBe(0);
    const y = m.y;
    run(m, intent(), 2, env);
    expect(m.y).toBe(y);
    expect(m.state).toBe('CLIMB');
  });

  it('fait un tour complet à 2,4 rad/s, toujours face au tronc ; stick droit : θ croît, climbArc décroît', () => {
    const { m, tr, env } = settled();
    const s = m.climbS;
    const D = m.trunkR + T.trunkGap;
    const arc0 = m.climbArc;
    let turned = 0;
    let tFull = null;
    run(m, intent({ stick: { x: 1, y: 0 } }), 3, env, 120, (mm, t) => {
      turned += wrapAngle(mm.heading - mm.pHeading);
      if (tFull === null && turned >= 2 * Math.PI) tFull = t;
      const c = trunkFrame(tr.pts, mm.climbS, mm.climbTheta, {});
      const ax = c.x - mm.x;
      const az = c.z - mm.z;
      expect((Math.sin(mm.heading) * ax + Math.cos(mm.heading) * az) / Math.hypot(ax, az)).toBeGreaterThan(0.9999);
      expect(Math.hypot(mm.x - c.x - D * c.nx, mm.y - c.y - D * c.ny, mm.z - c.z - D * c.nz)).toBeLessThan(1e-9);
    });
    expect(m.climbTurn).toBe(T.trunkTurn);
    // 2π / 2,4 plus la rampe (2,4 / (2 · 16))
    expect(Math.abs(tFull - (2 * Math.PI / T.trunkTurn + T.trunkTurn / (2 * T.trunkTurnAccel)))).toBeLessThan(2 * H);
    expect(m.climbS).toBe(s);
    // θ croissant déplace la racine vers (cos θ, −sin θ) : la droite de l'écran caméra derrière, le x
    // local − du personnage ; climbArc (+ vers le x local +) décroît d'autant
    expect(m.climbArc - arc0).toBeCloseTo(-turned * D, 6);
    const th = m.climbTheta;
    const x = m.x;
    const z = m.z;
    run(m, intent({ stick: { x: 1, y: 0 } }), 1 / 120, env);
    const dx = m.x - x;
    const dz = m.z - z;
    expect(dx * Math.cos(th) - dz * Math.sin(th)).toBeGreaterThan(0);
    expect(dx * Math.cos(m.heading) - dz * Math.sin(m.heading)).toBeLessThan(0);
    // stick gauche : l'autre sens
    run(m, intent({ stick: { x: -1, y: 0 } }), 1, env);
    expect(m.climbTurn).toBe(-T.trunkTurn);
  });

  it('glissade : stick bas franc tenu 0,3 s, jusqu’à 4 m/s, puis réception sans dégât au pied', () => {
    const { m, tr, env } = settled();
    run(m, intent({ stick: { x: 0, y: 1 } }), 3, env); // au sommet
    run(m, intent({ stick: { x: 0, y: -1 } }), 0.25, env); // redescend sous les mains
    run(m, intent(), 0.3, env);
    expect(m.state).toBe('CLIMB');
    let start = null;
    let vMin = 0;
    const ev = run(m, intent({ stick: { x: 0, y: -1 } }), 3, env, 120, (mm, t) => {
      if (start === null && mm.sliding) start = t;
      vMin = Math.min(vMin, mm.climbSpeed);
    });
    expect(Math.abs(start - T.trunkSlideHold)).toBeLessThanOrEqual(H + 1e-9);
    expect(vMin).toBe(-T.trunkSlideSpeed);
    const t = types(ev);
    expect(t.slice(0, 5)).toEqual(['slideStart', 'slideStop', 'climbRelease', 'land', ...t.slice(4, 5)]);
    expect(ev.find((e) => e.type === 'climbRelease').cause).toBe('pied');
    const land = ev.find((e) => e.type === 'land');
    expect(land.impact).toBeLessThan(T.landHeavy);
    expect(t).not.toContain('roll');
    // sorti de l'encombrement du tronc, le balayage le compte à nouveau
    expect(footDist(m, tr)).toBeGreaterThanOrEqual(tr.encombrement + T.radius - 1e-6);
    expect(m.trunkExit).toBeNull();
    expect(m.grounded).toBe(true);
    expect(m.landHeavy).toBe(false);
  });

  it('la glissade s’arrête dès que le stick n’est plus franc (slideStop), puis l’arrêt est amorti', () => {
    const { m, env } = settled();
    run(m, intent({ stick: { x: 0, y: 1 } }), 1.2, env);
    const ev = run(m, intent({ stick: { x: 0, y: -1 } }), 0.45, env);
    expect(types(ev)).toEqual(['slideStart']);
    const ev2 = run(m, intent({ stick: { x: 0, y: -0.5 } }), 1 / 120, env);
    expect(types(ev2)).toEqual(['slideStop']);
    run(m, intent(), 0.5, env);
    expect(m.climbSpeed).toBe(0);
    expect(m.sliding).toBe(false);
  });
});

describe('sommet et départs', () => {
  const atTop = () => {
    const g = settled();
    run(g.m, intent({ stick: { x: 0, y: 1 } }), 3, g.env);
    run(g.m, intent(), 2, g.env);
    expect(g.m.state).toBe('CLIMB_TOP');
    expect(snapLeft(g.m)).toBe(0);
    return g;
  };
  // élévation maximale au-dessus du point de départ
  const rise = (m, it, env) => {
    const y0 = m.y;
    let top = y0;
    run(m, it, 1.5, env, 120, (mm) => (top = Math.max(top, mm.y)));
    return top - y0;
  };

  it('au sommet : tourne sur place, redescend au stick bas, saute plus haut qu’au sol', () => {
    let { m, tr, env } = atTop();
    const p = [m.x, m.y, m.z];
    const th = m.climbTheta;
    run(m, intent({ stick: { x: 1, y: 0 } }), 0.5, env);
    expect([m.x, m.y, m.z]).toEqual(p);
    expect(wrapAngle(m.climbTheta - th)).toBeGreaterThan(0.9);
    expect(wrapAngle(m.heading - m.climbTheta - Math.PI)).toBeCloseTo(0, 9);
    expect(m.topT).toBeGreaterThan(2);
    run(m, intent({ stick: { x: 0, y: -1 } }), 0.6, env);
    expect(m.state).toBe('CLIMB');
    expect(m.climbS).toBeLessThan(trunkLimits(tr, T).max - 0.3);
    // saut du sommet : 1,15 × jumpSpeed, droit devant (cap θ + π, le tronc dans le dos) sans entrée
    ({ m, env } = atTop());
    const dir = m.heading;
    const yTop = m.y;
    expect(yTop).toBeCloseTo(tr.pts.at(-1)[1], 9);
    const ev = run(m, intent({ jump: true }), 1 / 120, env);
    expect(ev.find((e) => e.type === 'climbJump')).toMatchObject({ kind: 'top' });
    expect(m.trunkJump).toBe('top');
    expect(m.heading).toBeCloseTo(dir, 9);
    expect(m.v).toBe(T.trunkJumpH);
    expect(m.vy).toBeCloseTo(T.jumpSpeed * T.trunkTopJump, 9);
    // plus haut qu'un saut au sol (même appui tenu) : (1,15)² ≈ 1,32 fois l'élévation
    const y1 = m.y;
    const top = rise(m, intent(), env) + (y1 - yTop);
    const flat = rise(createMotor(), (mm, t) => intent({ jump: t === 0 }), world([]));
    expect(top / flat).toBeGreaterThan(1.25);
    // vers le stick (direction monde de l'intention)
    ({ m, env } = atTop());
    run(m, toward({ jump: true, dirX: 1, dirZ: 0 }), 1 / 120, env);
    expect(m.heading).toBeCloseTo(Math.PI / 2, 9);
  });

  it('saut arrière : dos au tronc, 4,5 m/s, orientable de ±60° au stick x ; sort de l’obstacle sans blocage', () => {
    for (const sx of [0, 1, -1]) {
      const { m, tr, env } = settled();
      run(m, intent({ stick: { x: 0, y: 1 } }), 0.4, env);
      run(m, intent(), 0.3, env);
      const th = m.climbTheta;
      const x0 = m.x;
      const z0 = m.z;
      const ev = run(m, intent({ jump: true, stick: { x: sx, y: 0 } }), 1 / 120, env);
      expect(ev.find((e) => e.type === 'climbJump')).toMatchObject({ kind: 'back' });
      expect(m.state).toBe('JUMP');
      expect(wrapAngle(m.heading - th - sx * T.trunkJumpSpread)).toBeCloseTo(0, 9);
      expect(m.v).toBe(T.trunkJumpH);
      expect(m.vy).toBe(T.jumpSpeed);
      let blocked = false;
      const ev2 = run(m, intent(), 1.5, env, 120, (mm) => {
        if (!mm.grounded && Math.hypot(mm.x - mm.px, mm.z - mm.pz) < 0.9 * mm.v * H) blocked = true;
      });
      expect(blocked).toBe(false);
      expect(types(ev2)).not.toContain('grab');
      expect(m.trunkJump).toBeNull(); // remis à zéro à la réception
      const land = ev2.find((e) => e.type === 'land');
      const dir = Math.atan2(land.x - x0, land.z - z0);
      expect(Math.abs(wrapAngle(dir - th - sx * T.trunkJumpSpread))).toBeLessThan(0.5 * DEG);
      expect(Math.hypot(land.x - x0, land.z - z0)).toBeGreaterThan(2.5);
      expect(footDist(m, tr)).toBeGreaterThan(tr.encombrement + T.radius);
    }
  });

  it('pas de nouvelle accroche au même tronc pendant 0,35 s après un saut ; un autre tronc, oui', () => {
    // sans le délai, le corps encore à portée se raccrocherait au premier pas
    for (const delay of [T.regrabDelay, 0]) {
      const { m, env } = settled();
      run(m, intent({ stick: { x: 0, y: 1 } }), 0.4, env);
      m.T = Object.freeze({ ...T, regrabDelay: delay });
      const ev = run(m, intent({ jump: true }), 1 / 120, env);
      ev.push(...run(m, intent(), 0.3, env));
      expect(types(ev).includes('grab')).toBe(delay === 0);
    }
    const { m, env } = settled();
    run(m, intent(), 0.3, env);
    run(m, intent({ jump: true }), 1 / 120, env);
    run(m, intent(), T.regrabDelay - 2 * H, env);
    expect(m.noGrabT).toBeGreaterThan(0);
    run(m, intent(), 2 * H, env);
    expect(m.noGrabT).toBeLessThanOrEqual(1e-9);
    // d'un palmier à l'autre : saut arrière vers un second tronc, pieds à 3,2 m
    const a = palmier();
    const b = palmier({ z: -3.2, rot: Math.PI });
    const env2 = world([a, b]);
    const g = { m: createMotor() };
    resetMotor(g.m, 0, 0, -1.5, 0);
    run(g.m, toward(), 1, env2);
    run(g.m, intent({ jump: true }), 1 / 120, env2);
    run(g.m, intent(), 2, env2);
    expect(g.m.trunk).toBe(a);
    run(g.m, intent({ stick: { x: 0, y: 1 } }), 0.3, env2);
    const ev = run(g.m, intent({ jump: true }), 1 / 120, env2);
    ev.push(...run(g.m, intent(), 0.8, env2));
    expect(types(ev)).toEqual(['climbJump', 'grab']);
    expect(g.m.trunk).toBe(b);
    expect(g.m.trunkJump).toBeNull();
  });

  it('roulade : lâche prise, chute le long du tronc sans s’y raccrocher, réception normale, sortie de l’obstacle', () => {
    // lâché bas (racine à 0,75 m) : réception légère ; plus haut que ~1,25 m, réception lourde comme au sol
    const { m, tr, env } = settled();
    run(m, intent({ stick: { x: 0, y: 1 } }), 0.25, env);
    run(m, intent(), 0.3, env);
    let jump = 0;
    const ev = run(m, intent({ roll: true }), 1 / 120, env);
    expect(ev[0]).toMatchObject({ type: 'climbRelease', cause: 'lacher' });
    expect(m.state).toBe('FALL');
    const ev2 = run(m, intent(), 1.5, env, 120, (mm) => (jump = Math.max(jump, Math.hypot(mm.x - mm.px, mm.z - mm.pz))));
    expect(types(ev2)).not.toContain('grab');
    expect(types(ev2)).toContain('land');
    expect(ev2.find((e) => e.type === 'land').impact).toBeLessThan(T.landHeavy);
    expect(jump).toBeLessThan(0.03); // jamais repoussé d'un coup
    expect(footDist(m, tr)).toBeGreaterThanOrEqual(tr.encombrement + T.radius - 1e-6);
  });
});

describe('interdits et tronc qui disparaît', () => {
  it('jamais en portant ni à la nage', () => {
    const tr = palmier();
    const env = world([tr]);
    let m = createMotor();
    resetMotor(m, 0, 0, -2, 0);
    run(m, toward({ carry: true }), 1, env);
    let ev = run(m, toward({ carry: true, jump: true }), 1, env);
    expect(types(ev)).toContain('jump');
    expect(types(ev)).not.toContain('grab');
    m = createMotor();
    resetMotor(m, 0, 0, -2, 0);
    run(m, toward(), 1, env);
    ev = run(m, toward({ swim: true, jump: true }), 1, env);
    expect(types(ev)).not.toContain('grab');
    expect(m.state).toBe('SWIM');
    // déjà sur le tronc : on le lâche
    for (const extra of [{ carry: true }, { swim: true }]) {
      const g = settled();
      ev = run(g.m, intent(extra), 1 / 120, g.env);
      expect(ev[0]).toMatchObject({ type: 'climbRelease', cause: 'interdit' });
      expect(g.m.trunk).toBeNull();
      expect(g.m.state).toBe(extra.swim ? 'SWIM' : 'FALL');
    }
  });

  it('tronc qui disparaît en cours de montée : chute propre (FALL), puis réception', () => {
    const list = [palmier()];
    const env = world(list);
    const { m } = settled({ tr: list[0], env });
    run(m, intent({ stick: { x: 0, y: 1 } }), 0.6, env);
    const vy = m.cvy;
    list.length = 0;
    const ev = run(m, intent({ stick: { x: 0, y: 1 } }), 1 / 120, env);
    expect(ev[0]).toMatchObject({ type: 'climbRelease', cause: 'disparu' });
    expect(m.state).toBe('FALL');
    expect(m.vy).toBeCloseTo(vy, 9); // l'élan de la montée continue
    expect(m.trunkExit).toBeNull();
    const ev2 = run(m, intent(), 1.5, env);
    expect(types(ev2)).toContain('land');
    expect(m.grounded).toBe(true);
  });
});

describe('cadence', () => {
  it('même trajectoire sur le tronc à 30, 60 et 144 Hz (2 cm) : accroche, montée, tour, sommet, saut', () => {
    const script = (t) => {
      // l'appui (une image) porte déjà le stick qui suit : sa durée varie avec la cadence
      if (t < 0.5) return toward();
      if (t < 1.5) return intent({ stick: { x: 0, y: 1 }, jump: t < 0.5 + 1e-9, jumpHeld: false });
      if (t < 2.0) return intent({ stick: { x: 0.8, y: 0.5 } });
      if (t < 3.5) return intent({ stick: { x: 0, y: 1 } });
      if (t < 4.0) return intent({ stick: { x: -1, y: 0 } });
      if (t < 4.0 + 1e-9) return intent({ jump: true });
      return intent();
    };
    const marks = [1.5, 3.0, 4.0, 5.5];
    const runs = [30, 60, 144].map((fps) => {
      const tr = palmier({ rot: 0.6 });
      const env = world([tr]);
      const m = createMotor();
      resetMotor(m, 0, 0, -2, 0);
      const out = [];
      const ev = [];
      for (let i = 0; i < 5.5 * fps; i++) {
        stepMotor(m, script(i / fps), env, 1 / fps);
        for (const e of m.events) ev.push(e.type);
        m.events.length = 0;
        if (marks.some((t) => Math.abs((i + 1) / fps - t) < 1e-9)) out.push(interpolate(m, {}));
      }
      return { out, ev };
    });
    // 4,2 m de haut : réception lourde, roulée (vitesse horizontale de 4,5 m/s), comme d'un rebord
    expect(runs[0].ev).toEqual(['grab', 'climbTop', 'climbJump', 'land', 'roll']);
    for (const r of runs.slice(1)) {
      expect(r.ev).toEqual(runs[0].ev);
      r.out.forEach((p, i) => {
        const q = runs[0].out[i];
        expect(Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z)).toBeLessThan(0.02);
        expect(Number.isFinite(p.x + p.y + p.z + p.heading)).toBe(true);
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Raccord réel : Player, navigation.js (obstacle grimpe d'un palmier d'île), sol fourni hors de l'île de
// départ. Personnage minimal, sans rendu.
const stubCharacter = () => ({
  root: { position: new THREE.Vector3(), rotation: { y: 0 } },
  pose: 'idle',
  busy: false,
  setPose(p) {
    this.pose = p;
  },
  update() {},
  bounce() {},
});
const X0 = 300;
const Z0 = 300;
const BASE = 5;

describe('Player : raccord au vrai obstacle grimpe', () => {
  const setup = () => {
    setObstacles([]);
    setGroundProvider(() => BASE);
    const sc = 1.1;
    const o = { x: X0, z: Z0, r: 0.4 * sc, low: false, grimpe: { kind: 'palmier', x: X0, y: BASE - 0.04, z: Z0, rot: 0.8, sc, def: GRIMPE.palmier } };
    addObstacle(o);
    const p = new Player(stubCharacter());
    p.place(X0, Z0 - 2.5, 0);
    const events = [];
    const step = (it, seconds, fps = 60, each = null) => {
      for (let i = 0; i < Math.round(seconds * fps); i++) {
        p.update(1 / fps, it);
        events.push(...p.events);
        p.events.length = 0;
        each?.(p);
      }
    };
    const fwd = new THREE.Vector3(0, 0, 1);
    const none = new THREE.Vector3();
    // collé au tronc, puis un saut
    const grab = () => {
      step({ move: fwd }, 1);
      step({ move: fwd, jump: true, jumpHeld: true }, 1 / 60);
      step({ move: none, stick: { x: 0, y: 0 } }, 2);
    };
    return { o, p, step, grab, events, fwd, none };
  };

  it('s’accroche, grimpe : pos suit exactement le moteur, loco expose le tronc, savePosition reste au sol', () => {
    const { o, p, step, grab, events, none } = setup();
    expect(troncsProches(X0, Z0, 4)[0]).toBe(troncsProches(X0, Z0 + 1, 4)[0]); // même objet d'un appel à l'autre
    grab();
    expect(events.map((e) => e.type)).toContain('grab');
    expect(p.loco.state).toBe('CLIMB');
    expect(p.climbing).toBe(true);
    const tr = p.loco.trunk;
    expect(tr).toBe(troncsProches(X0, Z0, 4)[0]);
    expect(tr.obstacle).toBe(o);
    const view = {};
    step({ move: none, stick: { x: 0.3, y: 1 } }, 3, 60, (pp) => {
      const L = pp.loco;
      interpolate(pp.motor, view);
      expect([pp.pos.x, pp.pos.y, pp.pos.z, pp.facing]).toEqual([view.x, view.y, view.z, view.heading]);
      expect(L.trunk).toBe(tr);
      expect(Math.hypot(...L.climbTangent)).toBeCloseTo(1, 9);
      for (const k of ['climbS', 'climbTheta', 'trunkR', 'climbSpeed', 'climbTurn', 'climbDist', 'climbArc', 'topT']) expect(Number.isFinite(L[k]), k).toBe(true);
      // la sauvegarde ne retient jamais une position sur le tronc
      const s = pp.savePosition();
      expect(obstacleAt(s.x, s.z, pp.radius)).toBeNull();
      expect(Math.hypot(s.x - X0, s.z - Z0)).toBeLessThan(o.r + pp.radius + 0.06);
    });
    expect(p.loco.onTop).toBe(true);
    expect(p.loco.climbDist).toBeGreaterThan(2.5);
    expect(events.map((e) => e.type)).toContain('climbTop');
    // hors du tronc : la position courante
    const { p: q } = setup();
    expect(q.savePosition()).toEqual({ x: q.pos.x, z: q.pos.z });
  });

  it('stick absent sur le tronc : immobile ; clic pour aller ignoré', () => {
    const { p, step, grab } = setup();
    grab();
    const y = p.pos.y;
    step({ move: new THREE.Vector3(0, 0, 1) }, 1);
    expect(p.loco.state).toBe('CLIMB');
    expect(p.pos.y).toBe(y);
    p.goTo(X0 + 5, Z0);
    step(null, 0.5);
    expect(p.mode).toBe('free');
    expect(p.pos.y).toBe(y);
  });

  it('l’arbre coupé pendant la montée : chute propre, puis réception au sol', () => {
    const { o, p, step, grab, events, none } = setup();
    grab();
    step({ move: none, stick: { x: 0, y: 1 } }, 0.6);
    removeObstacle(o);
    step({ move: none, stick: { x: 0, y: 1 } }, 1 / 60);
    expect(events.find((e) => e.type === 'climbRelease')?.cause).toBe('disparu');
    expect(p.loco.state).toBe('FALL');
    step({ move: none }, 1.5);
    expect(p.motor.grounded).toBe(true);
    expect(p.pos.y).toBeCloseTo(BASE, 6);
  });

  it('saut arrière et lâcher : le corps sort de l’obstacle sans être bloqué ni repoussé d’un coup', () => {
    for (const how of [{ jump: true, jumpHeld: true }, { roll: true }]) {
      const { o, p, step, grab, events, none } = setup();
      grab();
      step({ move: none, stick: { x: 0, y: 1 } }, 0.3);
      step({ move: none, stick: { x: 0, y: 0 } }, 0.3);
      let jump = 0;
      let prev = { x: p.pos.x, z: p.pos.z };
      step({ move: none, stick: { x: 0, y: 0 }, ...how }, 1 / 60);
      step({ move: none }, 1.5, 60, (pp) => {
        jump = Math.max(jump, Math.hypot(pp.pos.x - prev.x, pp.pos.z - prev.z));
        prev = { x: pp.pos.x, z: pp.pos.z };
      });
      expect(events.map((e) => e.type)).toContain(how.jump ? 'climbJump' : 'climbRelease');
      expect(events.map((e) => e.type)).toContain('land');
      expect(jump).toBeLessThan(how.jump ? T.trunkJumpH / 60 + 0.01 : 0.05);
      expect(Math.hypot(p.pos.x - o.x, p.pos.z - o.z)).toBeGreaterThanOrEqual(o.r + p.radius - 1e-3);
      expect(p.motor.trunkExit).toBeNull();
      // plus rien à repousser : le jeu ne le déplace plus
      const at = { x: p.motor.x, z: p.motor.z };
      pushOut(at, p.radius);
      expect(at).toEqual({ x: p.motor.x, z: p.motor.z });
    }
  });

  it('en portant : pas d’accroche', () => {
    const { p, step, events, fwd } = setup();
    step({ move: fwd, carry: true }, 1);
    step({ move: fwd, carry: true, jump: true, jumpHeld: true }, 1);
    expect(events.map((e) => e.type)).toContain('jump');
    expect(events.map((e) => e.type)).not.toContain('grab');
    expect(p.climbing).toBe(false);
  });
});
