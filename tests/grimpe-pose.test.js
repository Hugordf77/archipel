// Grimper aux arbres, partie B : pose et animation sur le vrai personnage (Character.js), le long
// des vrais stipes (palmier d'île, palmier de la maison) : mains sur l'écorce, aucun membre dans
// le tronc, continuité à 240 Hz de l'accroche au saut arrière, familles finies.
import * as THREE from 'three';
import { describe, it, expect, beforeAll } from 'vitest';
import { installCanvasStub } from './helpers/canvas.js';

installCanvasStub();

let Character;
let P;
let B;
let HAND_RADIUS;
let TRONCS;
beforeAll(async () => {
  ({ Character } = await import('../src/entities/character/Character.js'));
  P = await import('../src/entities/locomotion/pose.js');
  ({ B } = await import('../src/models/personnage/commun.js'));
  ({ HAND_RADIUS } = await import('../src/entities/locomotion/rig.js'));
  const { GRIMPE } = await import('../src/models/physique.gen.js');
  const { PALMIER_MAISON } = await import('../src/world/home/props.js');
  // polylignes monde : modèle posé, tourné, à l'échelle (île) ; palmier de la maison
  const monde = (def, x, y, z, rot, sc) => def.tronc.map(([px, py, pz, r]) => [
    x + (px * Math.cos(rot) + pz * Math.sin(rot)) * sc, y + py * sc, z + (-px * Math.sin(rot) + pz * Math.cos(rot)) * sc, r * sc,
  ]);
  TRONCS = {
    ile: monde(GRIMPE.palmier, 2, 0.5, -3, 0.7, 1.1),
    maison: monde(PALMIER_MAISON, -20, 0.3, 11, 2.2, 1),
  };
});

const longueur = (pts) => pts.slice(1).reduce((L, p, i) => L + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1], p[2] - pts[i][2]), 0);

// distance d'un point à l'axe (segment le plus proche), rayon de l'écorce là, et s'il est dans le
// cylindre fini (au-dessus du sommet ou sous le pied : dehors)
function surAxe(pts, x, y, z) {
  let best = { d: Infinity, r: 0, inside: false };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const raw = ((x - a[0]) * ux + (y - a[1]) * uy + (z - a[2]) * uz) / (ux * ux + uy * uy + uz * uz);
    const t = Math.min(1, Math.max(0, raw));
    const d = Math.hypot(x - a[0] - ux * t, y - a[1] - uy * t, z - a[2] - uz * t);
    const within = !((i === 0 && raw < 0) || (i === pts.length - 2 && raw > 1));
    if (d < best.d) best = { d, r: a[3] + (b[3] - a[3]) * t, inside: within };
  }
  return best;
}

// instantané du moteur sur le tronc (mêmes champs que Player.loco)
function locoSurTronc(pts, o) {
  const A = P.axisPoint(pts, o.s);
  return {
    state: o.state || 'CLIMB', t: o.t ?? 1, v: 0, vLat: 0, vy: o.vy ?? 0, omega: 0, heading: o.heading, inputAngle: 0, grounded: false,
    phase: 0, stride: 0.5, sprintTime: 0, slopeAlong: 0, chain: 0, airTime: o.airTime ?? 0, impact: 0, rollT: 0, landHeavy: false,
    stopOnly: false, jumpLong: false, swim: false, surface: 'grass', accF: 0, aLat: 0, aLong: 0, bank: 0, bankTarget: 0, gripUse: 0,
    handDown: false, handSide: 0, handX: 0, handY: 0, handZ: 0, handRise: 0,
    climbS: o.s, climbTheta: o.heading - Math.PI, climbTangent: [A.tx, A.ty, A.tz], trunkR: A.r, climbSpeed: o.climbSpeed ?? 0,
    climbTurn: o.climbTurn ?? 0, climbArc: o.arc ?? 0, climbDist: 0, sliding: !!o.sliding, onTop: o.state === 'CLIMB_TOP',
    topT: o.topT ?? 0, trunk: { pts }, trunkJump: o.trunkJump ?? null,
  };
}

// un pas d'animation : racine posée comme Player.sync (sur le tronc : repère de la racine)
const ZERO = new THREE.Vector3();
function anime(c, L, dt, root = null) {
  if (root) {
    c.root.position.set(root.x, root.y, root.z);
    c.root.rotation.y = L.heading;
  }
  c.update(dt, 0, { loco: L, facing: L.heading, vel: ZERO, turnRate: 0 });
  c.root.updateMatrixWorld(true);
}

const _v = new THREE.Vector3();
// écart main ↔ écorce (m) : distance du centre de la main à l'axe, moins rayon et rayon de la main
function ecartMain(c, pts, side) {
  c.bones[side > 0 ? B.HAND_R : B.HAND_L].getWorldPosition(_v);
  const { d, r } = surAxe(pts, _v.x, _v.y, _v.z);
  return d - r - HAND_RADIUS * c.j.sy;
}

describe('grimpe aux arbres : pose sur le tronc', () => {
  it('les mains tiennent l’écorce à moins de 1,5 cm pendant la montée, le tour et la glissade', () => {
    for (const [nom, pts] of Object.entries(TRONCS)) {
      const c = new Character();
      const top = longueur(pts) - 1.15;
      let s = 0.4;
      let arc = 0;
      let heading = 1.3;
      let worst = 0;
      let inside = 0;
      let n = 0;
      const hz = 120;
      for (let i = 0; i < hz * 6.5; i++) {
        const t = i / hz;
        // 0–2,4 s : montée à 1,5 m/s ; 2,4–3,6 s : tour du tronc à 2,4 rad/s ; puis glissade à 4 m/s
        let climbSpeed = 0;
        let climbTurn = 0;
        let sliding = false;
        if (t < 2.4) climbSpeed = Math.min(1.5, t * 6);
        else if (t < 3.6) climbTurn = 2.4;
        else if (t < 4.6) {
          sliding = true;
          climbSpeed = -Math.min(4, (t - 3.6) * 8);
        } else climbSpeed = 1.5;
        s = Math.min(top, Math.max(0.3, s + climbSpeed / hz));
        const A = P.axisPoint(pts, s);
        heading += climbTurn / hz;
        arc -= (climbTurn * (A.r + P.CLIMB_GAP)) / hz; // θ croît : déplacement vers x −
        const L = locoSurTronc(pts, { s, heading, climbSpeed, climbTurn, arc, sliding });
        anime(c, L, 1 / hz, P.climbRootFrame(pts, s, heading));
        if (t < 0.35) continue; // les mains rejoignent l'écorce
        for (const side of [1, -1]) {
          const e = ecartMain(c, pts, side);
          worst = Math.max(worst, e);
          inside = Math.min(inside, e);
          n++;
        }
      }
      expect(n, nom).toBeGreaterThan(1000);
      expect(worst, `${nom} : main la plus loin`).toBeLessThanOrEqual(0.015);
      expect(inside, `${nom} : main dans l'écorce`).toBeGreaterThan(-0.003);
    }
  });

  it('aucun membre dans le tronc : chaque os reste à au moins un rayon de l’axe', () => {
    for (const [nom, pts] of Object.entries(TRONCS)) {
      const c = new Character();
      const top = longueur(pts) - 1.15;
      let heading = -0.4;
      let arc = 0;
      let worst = Infinity;
      let worstBone = -1;
      const hz = 60;
      for (let i = 0; i < hz * 5; i++) {
        const t = i / hz;
        const s = Math.min(top, 0.4 + 1.5 * t);
        const climbTurn = t > 2.5 && t < 3.5 ? -2.4 : 0;
        const A = P.axisPoint(pts, s);
        heading += climbTurn / hz;
        arc -= (climbTurn * (A.r + P.CLIMB_GAP)) / hz;
        const sliding = t > 4;
        const L = locoSurTronc(pts, { s, heading, climbSpeed: sliding ? -3 : 1.5, climbTurn, arc, sliding });
        anime(c, L, 1 / hz, P.climbRootFrame(pts, s, heading));
        if (t < 0.4) continue;
        c.bones.forEach((b, k) => {
          b.getWorldPosition(_v);
          const q = surAxe(pts, _v.x, _v.y, _v.z);
          if (!q.inside) return;
          const marge = q.d - q.r;
          if (marge < worst) {
            worst = marge;
            worstBone = k;
          }
        });
      }
      expect(worst, `${nom} : os ${worstBone}`).toBeGreaterThanOrEqual(0);
    }
  });

  it('écart < 0,15 rad par échantillon à 240 Hz : accroche, montée, tour, poirier, saut arrière', () => {
    const pts = TRONCS.ile;
    const c = new Character();
    const top = longueur(pts) - 1.1;
    const hz = 240;
    const q = c.bones.map(() => new THREE.Quaternion());
    let prev = null;
    let prevSpin = 0;
    let worst = 0;
    let worstKey = '';
    let worstBone = 0;
    let worstSpin = 0;
    let s = 0.6;
    let heading = 0.5;
    let arc = 0;
    let perched = false;
    const seq = new Set();
    for (let i = 0; i < hz * 7; i++) {
      const t = i / hz;
      let L;
      let root = null;
      if (t < 0.4) {
        // chute vers le tronc
        L = { ...locoSurTronc(pts, { s, heading }), state: 'FALL', vy: -2 - 6 * t, airTime: 0.1 + t, trunk: null };
      } else if (t < 4.3) {
        // accroche, montée, tour, montée jusqu'au sommet
        let climbSpeed = 0;
        let climbTurn = 0;
        if (t < 2.2) climbSpeed = Math.min(1.5, (t - 0.45) * 6);
        else if (t < 3.2) climbTurn = 2.4 * Math.min(1, (t - 2.2) * 8, (3.2 - t) * 8); // transitions amorties, comme le moteur
        else climbSpeed = Math.min(1.5, (t - 3.2) * 6);
        s = Math.min(top, Math.max(0.3, s + Math.max(0, climbSpeed) / hz));
        const A = P.axisPoint(pts, s);
        heading += climbTurn / hz;
        arc -= (climbTurn * (A.r + P.CLIMB_GAP)) / hz;
        L = locoSurTronc(pts, { s, heading, climbSpeed, climbTurn, arc, t: t - 0.4 });
        root = P.climbRootFrame(pts, s, heading);
      } else if (t < 5.6) {
        // poirier au sommet
        const end = pts[pts.length - 1];
        L = locoSurTronc(pts, { s: longueur(pts), heading, state: 'CLIMB_TOP', topT: t - 4.3 });
        root = { x: end[0], y: end[1], z: end[2] };
      } else if (t < 6.0) {
        // redescente sur le tronc
        L = locoSurTronc(pts, { s: top, heading, climbSpeed: -1.8, arc });
        root = P.climbRootFrame(pts, top, heading);
      } else {
        // saut arrière, dos au tronc, puis réception
        const air = t - 6.0;
        const flying = air < 0.7;
        L = { ...locoSurTronc(pts, { s: top, heading }), state: flying ? 'FALL' : 'LAND', vy: 7.2 - 26 * air, airTime: air, t: flying ? air : air - 0.7, trunk: null, trunkJump: flying ? 'back' : null };
      }
      anime(c, L, 1 / hz, root);
      if (L.state === 'CLIMB_TOP' && c.spinCur > 3) perched = true;
      const J = c.j;
      for (const k in J) {
        expect(Number.isFinite(J[k]), `${k} à ${t.toFixed(3)} s`).toBe(true);
        if (prev && Math.abs(J[k] - prev[k]) > worst) {
          worst = Math.abs(J[k] - prev[k]);
          worstKey = `${k} à ${t.toFixed(3)} s`;
        }
      }
      prev = { ...J };
      if (i > 0) worstSpin = Math.max(worstSpin, Math.abs(c.spinCur - prevSpin));
      prevSpin = c.spinCur;
      c.bones.forEach((b, n) => {
        if (i > 0) worstBone = Math.max(worstBone, b.quaternion.angleTo(q[n]));
        q[n].copy(b.quaternion);
      });
      seq.add(L.state);
    }
    expect(seq).toEqual(new Set(['FALL', 'CLIMB', 'CLIMB_TOP', 'LAND']));
    expect(perched).toBe(true);
    expect(worst, worstKey).toBeLessThan(0.15);
    expect(worstBone).toBeLessThan(0.15);
    expect(worstSpin).toBeLessThan(0.15);
  });

  it('au poirier, les mains se posent sur le sommet et le corps est retourné', () => {
    const pts = TRONCS.ile;
    const c = new Character();
    const end = pts[pts.length - 1];
    for (let i = 0; i < 120; i++) {
      const L = locoSurTronc(pts, { s: longueur(pts), heading: 0.3, state: 'CLIMB_TOP', topT: i / 60 });
      anime(c, L, 1 / 60, { x: end[0], y: end[1], z: end[2] });
    }
    expect(c.spinCur).toBeCloseTo(Math.PI, 1);
    for (const side of [1, -1]) {
      c.bones[side > 0 ? B.HAND_R : B.HAND_L].getWorldPosition(_v);
      // centre de la main à un rayon de main au-dessus du sommet, à 9 cm de l'axe au plus
      expect(_v.y - end[1]).toBeGreaterThan(HAND_RADIUS * 0.6);
      expect(_v.y - end[1]).toBeLessThan(HAND_RADIUS + 0.03);
      expect(Math.hypot(_v.x - end[0], _v.z - end[2])).toBeLessThan(0.09);
    }
    // les pieds au-dessus de la tête
    const pied = new THREE.Vector3();
    c.bones[B.FOOT_L].getWorldPosition(pied);
    c.bones[B.HEAD].getWorldPosition(_v);
    expect(pied.y).toBeGreaterThan(_v.y + 0.4);
  });

  it('les mains se relaient : il y en a toujours une qui tient l’écorce, fixe tant qu’elle tient', () => {
    for (let s = 0; s < 3; s += 0.003) {
      const r = P.climbGrip({ climbS: s }, 1);
      const l = P.climbGrip({ climbS: s }, -1);
      expect(r.hold + l.hold, `s = ${s}`).toBeGreaterThanOrEqual(1);
      expect(Math.max(r.h, l.h)).toBeLessThanOrEqual(P.CLIMB.high + 1e-9);
      expect(Math.min(r.h, l.h)).toBeGreaterThanOrEqual(P.CLIMB.low - 1e-9);
    }
    // pendant la prise, la main reste fixe sur l'écorce : sa hauteur baisse autant que le corps monte
    let checked = 0;
    for (let s = 0; s < 1; s += 0.01) {
      const a = P.climbGrip({ climbS: s }, 1);
      const b = P.climbGrip({ climbS: s + 0.005 }, 1);
      if (a.hold && b.hold) {
        expect(a.h - b.h).toBeCloseTo(0.005, 9);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(30);
  });

  it('toutes les familles de pose donnent des valeurs finies, grimpe et poirier compris', () => {
    const REST = { bodyY: 0, lean: 0, bodyRoll: 0, sx: 1, sy: 1, hipsY: 0, hipsZ: 0, torsoX: 0, torsoY: 0, torsoZ: 0, neckX: 0, neckY: 0, neckZ: 0, headX: 0, headY: 0, headZ: 0, armLX: 0, armLZ: -0.2, armRX: 0, armRZ: 0.2, foreL: -0.15, foreR: -0.15, wristLX: 0, wristLZ: 0, wristRX: 0, wristRZ: 0, thighL: 0, thighR: 0, shinL: 0, shinR: 0, footL: 0, footR: 0 };
    expect(P.LOCO_FAMILY.CLIMB).toBe('climb');
    expect(P.LOCO_FAMILY.CLIMB_TOP).toBe('perch');
    for (const fam of new Set(Object.values(P.LOCO_FAMILY))) expect(P.FAMILY_HALFLIFE[fam], fam).toBeGreaterThan(0);
    for (const state of Object.keys(P.LOCO_FAMILY)) {
      for (const extra of [{}, { climbTangent: [0.2, 0.97, 0.1], climbS: 1.3, climbArc: -0.7, climbTurn: 2.4, slideW: 0.5, trunkR: 0.17, topT: 0.4, trunkJump: 'back' }]) {
        const J = { ...REST };
        const X = {};
        P.locomotionPose({ state, t: 0.1, v: 0, vLat: 0, vy: 0, omega: 0, phase: 0, now: 1, airTime: 0.2, ...extra }, J, X);
        for (const k in J) expect(Number.isFinite(J[k]), `${state} ${k}`).toBe(true);
        for (const k of ['spin', 'lift']) expect(Number.isFinite(X[k]), `${state} ${k}`).toBe(true);
      }
    }
  });

  it('avec le vrai moteur (Player) : accroche, montée, tour, poirier, redescente, saut arrière — continu à 240 Hz, mains sur l’écorce', async () => {
    const { Player } = await import('../src/entities/Player.js');
    const nav = await import('../src/world/navigation.js');
    const { GRIMPE } = await import('../src/models/physique.gen.js');
    const X0 = 300;
    const Z0 = 300;
    const SOL = 5;
    nav.setObstacles([]);
    nav.setGroundProvider(() => SOL);
    const sc = 1.1;
    nav.addObstacle({ x: X0, z: Z0, r: 0.4 * sc, low: false, grimpe: { kind: 'palmier', x: X0, y: SOL - 0.04, z: Z0, rot: 0.8, sc, def: GRIMPE.palmier } });
    const c = new Character();
    const p = new Player(c);
    p.place(X0, Z0 - 3.6, 0);
    const hz = 240;
    const fwd = new THREE.Vector3(0, 0, 1);
    const none = new THREE.Vector3();
    // script : [durée (s), intention] — élan, saut vers le palmier, accroche en l'air, puis grimpe
    const script = [
      [0.3, { move: fwd }],
      [1 / hz, { move: fwd, jump: true, jumpHeld: true }],
      [0.6, { move: fwd, jumpHeld: true }],
      [1.2, { move: none, stick: { x: 0, y: 1 } }],
      [1.0, { move: none, stick: { x: 1, y: 0 } }],
      [2.0, { move: none, stick: { x: 0, y: 1 } }],
      [1.0, { move: none, stick: { x: 0, y: 0 } }],
      [0.5, { move: none, stick: { x: 0, y: -0.6 } }],
      [0.5, { move: none, stick: { x: 0, y: 0 } }],
      [1 / hz, { move: none, stick: { x: 0, y: 0 }, jump: true, jumpHeld: true }],
      [1.5, { move: none, stick: { x: 0, y: 0 } }],
    ];
    const q = c.bones.map(() => new THREE.Quaternion());
    let prev = null;
    let prevSpin = 0;
    let worst = 0;
    let worstKey = '';
    let worstBone = 0;
    let worstSpin = 0;
    let climbT = 0;
    let gapWorst = 0;
    let gapN = 0;
    let landed = false;
    let jumped = false;
    const states = new Set();
    let t = 0;
    for (const [dur, intent] of script) {
      for (let i = 0; i < Math.round(dur * hz) || i === 0; i++) {
        p.update(1 / hz, intent);
        p.events.length = 0;
        c.root.updateMatrixWorld(true);
        t += 1 / hz;
        const L = p.loco;
        states.add(L.state);
        if (L.trunkJump === 'back') jumped = true;
        if (jumped && L.grounded) landed = true;
        if (landed) continue; // la réception (roulade si lourde) n'est pas de la grimpe
        climbT = L.state === 'CLIMB' ? climbT + 1 / hz : 0;
        // mains sur l'écorce, une fois les raccords du moteur et des cibles finis
        if (climbT > 0.6) {
          for (const side of [1, -1]) {
            gapWorst = Math.max(gapWorst, Math.abs(ecartMain(c, L.trunk.pts, side)));
            gapN++;
          }
        }
        const J = c.j;
        for (const k in J) {
          expect(Number.isFinite(J[k]), `${k} à ${t.toFixed(3)} s`).toBe(true);
          if (prev && Math.abs(J[k] - prev[k]) > worst) {
            worst = Math.abs(J[k] - prev[k]);
            worstKey = `${k} à ${t.toFixed(3)} s (${L.state})`;
          }
        }
        const first = !prev;
        prev = { ...J };
        worstSpin = Math.max(worstSpin, Math.abs(c.spinCur - prevSpin));
        prevSpin = c.spinCur;
        c.bones.forEach((b, n) => {
          if (!first) worstBone = Math.max(worstBone, b.quaternion.angleTo(q[n]));
          q[n].copy(b.quaternion);
        });
      }
    }
    nav.setObstacles([]);
    nav.setGroundProvider(null);
    for (const st of ['RUN', 'JUMP', 'CLIMB', 'CLIMB_TOP']) expect(states.has(st), st).toBe(true);
    expect(jumped && landed).toBe(true);
    expect(gapN).toBeGreaterThan(400);
    expect(gapWorst).toBeLessThanOrEqual(0.015);
    expect(worst, worstKey).toBeLessThan(0.15);
    expect(worstBone).toBeLessThan(0.15);
    expect(worstSpin).toBeLessThan(0.15);
  });
});
