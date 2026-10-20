// Raccord du moteur de locomotion au monde réel : Player lit le sol de navigation.js (relief
// fourni hors de l'île de départ), expose accélérations, inclinaison et main au sol dans loco.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Player } from '../src/entities/Player.js';
import { setGroundProvider, setObstacles, groundAt } from '../src/world/navigation.js';
import { tuningFor } from '../src/entities/locomotion/tuning.js';

const T = tuningFor('realiste');
// loin de l'île de départ (|x|, |z| ≥ 40 m) : le relief vient du fournisseur
const X0 = 300;
const Z0 = 300;
const BASE = 5; // m : herbe sèche (au-dessus de 0,75 m)

// personnage minimal : ni rendu, ni squelette
const stubCharacter = () => ({
  root: { position: new THREE.Vector3(), rotation: { y: 0 } },
  pose: 'idle',
  busy: false,
  poses: new Set(),
  setPose(p) {
    this.pose = p;
    this.poses.add(p);
  },
  update() {},
  bounce() {},
});

// 2 s de sprint vers +z, puis virage de 90° vers +x (ω > 0 : intérieur côté latéral +, ici +x).
// Relief : plat ; ramp = talus fixe qui monte vers +x dès x = X0 (le virage le gravit) ;
// inside = dévers qui monte côté intérieur autour du coureur, plat le long de sa trajectoire.
const sprintTurn = ({ ramp = 0, inside = 0 } = {}, fps = 60) => {
  const kr = Math.tan((ramp * Math.PI) / 180);
  const ki = Math.tan((inside * Math.PI) / 180);
  let m = null;
  setObstacles([]);
  setGroundProvider((x, z) => {
    if (m) return BASE + ki * ((x - m.x) * Math.cos(m.heading) - (z - m.z) * Math.sin(m.heading));
    return BASE + kr * Math.max(0, x - X0);
  });
  const c = stubCharacter();
  const p = new Player(c);
  p.place(X0 - 0.05, Z0, 0);
  const frames = [];
  const dt = 1 / fps;
  const straight = { move: new THREE.Vector3(0, 0, 1), sprint: true };
  const turn = { move: new THREE.Vector3(1, 0, 0), sprint: true };
  for (let i = 0; i < 2 * fps; i++) p.update(dt, straight);
  if (inside) m = p.motor;
  for (let i = 0; i < 1.5 * fps; i++) {
    p.update(dt, turn);
    frames.push({ ...p.loco, x: p.pos.x, y: p.pos.y, z: p.pos.z, facing: p.facing });
  }
  return { p, c, frames };
};

describe('Player : accélérations, inclinaison et main au sol au pas fixe', () => {
  it('expose aLat, aLong (= accF), bank, gripUse et la main intérieure, finis, avec la convention du moteur', () => {
    const { p, c, frames } = sprintTurn();
    const keys = ['aLat', 'aLong', 'accF', 'bank', 'bankTarget', 'gripUse', 'handX', 'handY', 'handZ', 'handRise'];
    for (const f of frames) {
      for (const k of keys) expect(Number.isFinite(f[k]), k).toBe(true);
      expect(f.accF).toBe(f.aLong);
      expect(f.accL).toBeUndefined();
    }
    const down = frames.filter((f) => f.handDown);
    expect(down.length).toBeGreaterThan(0);
    expect(down.length / 60).toBeLessThanOrEqual(T.handMaxTime + 1 / 60);
    for (const f of down) {
      // virage vers +x : bank, aLat et omega positifs, main du côté latéral + (cos θ, −sin θ)
      expect(f.handSide).toBe(1);
      expect(f.bank).toBeGreaterThan(T.handLiftAngle);
      expect(f.aLat).toBeGreaterThan(0);
      expect(f.omega).toBeGreaterThan(0);
      const lateral = (f.handX - f.x) * Math.cos(f.facing) - (f.handZ - f.z) * Math.sin(f.facing);
      expect(lateral).toBeGreaterThan(0.45);
      // sol plat : la main vise le sol à la hauteur des pieds
      expect(f.handY).toBeCloseTo(groundAt(f.handX, f.handZ).y, 9);
      expect(Math.abs(f.handRise)).toBeLessThan(0.02);
    }
    expect(Math.max(...frames.map((f) => f.bank))).toBeLessThanOrEqual(T.bankMax + 1e-9);
    const types = p.events.map((e) => e.type);
    expect(types.filter((t) => t === 'handTouch').length).toBe(1);
    expect(p.events.find((e) => e.type === 'handTouch')).toMatchObject({ side: 1, surface: 'grass' });
    // seuils d'animation rapportés à T.run : 3,3 m/s → 3,67 m/s, pose « run » au sprint
    expect(p.walkSpeed).toBeCloseTo((T.run * 3.3) / 5.4, 9);
    expect(c.poses.has('run')).toBe(true);
  });

  it('sur un dévers qui monte côté intérieur, la main touche plus tôt, moins penchée et plus haut que les pieds', () => {
    const touchOf = (frames) => frames.find((f) => f.handDown);
    const flat = sprintTurn().frames;
    const bank = sprintTurn({ inside: 10 }).frames;
    const a = touchOf(flat);
    const b = touchOf(bank);
    expect(a && b).toBeTruthy();
    expect(bank.indexOf(b)).toBeLessThan(flat.indexOf(a));
    expect(b.bank).toBeLessThan(a.bank);
    expect(b.handRise).toBeGreaterThan(0.05);
  });

  it('sur un talus fixe que le virage gravit, la sonde voit le relief mais le ralentissement retarde le contact', () => {
    // limite connue : en montée, la vitesse passe sous course + 0,5 · (sprint − course) et le seuil de
    // vitesse l'emporte sur l'avance donnée par le relief
    const flat = sprintTurn().frames;
    const ramp = sprintTurn({ ramp: 12 }).frames;
    const a = flat.find((f) => f.handDown);
    const b = ramp.find((f) => f.handDown);
    expect(Math.max(...ramp.slice(0, 30).map((f) => f.handRise))).toBeGreaterThan(0.08);
    if (b) {
      expect(ramp.indexOf(b)).toBeGreaterThanOrEqual(flat.indexOf(a));
      expect(Math.hypot(b.v, b.vLat)).toBeGreaterThanOrEqual(T.run + T.handSpeed * (T.sprint - T.run) - 1e-9);
    }
  });

  it('garde les mêmes contacts à 30, 60 et 144 Hz dans le jeu réel', () => {
    const runs = [30, 60, 144].map((fps) => {
      const { p } = sprintTurn({}, fps);
      return p.events.filter((e) => e.type === 'handTouch' || e.type === 'handLift').map((e) => [e.type, e.x, e.z]);
    });
    for (const r of runs.slice(1)) {
      expect(r.length).toBe(runs[0].length);
      r.forEach((e, i) => {
        expect(e[0]).toBe(runs[0][i][0]);
        expect(Math.hypot(e[1] - runs[0][i][1], e[2] - runs[0][i][2])).toBeLessThan(0.02);
      });
    }
  });
});
