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

  it('sur un talus fixe que le virage gravit, la main touche aussi plus tôt malgré le ralentissement', () => {
    // l'élan (vitesse maximale des 0,6 dernières secondes) compte, pas la vitesse instantanée qui
    // plonge en montée : avant, le contact attendait que la vitesse remonte (image 42 contre 28)
    const flat = sprintTurn().frames;
    const ramp = sprintTurn({ ramp: 12 }).frames;
    const a = flat.find((f) => f.handDown);
    const b = ramp.find((f) => f.handDown);
    expect(a && b).toBeTruthy();
    expect(ramp.indexOf(b)).toBeLessThan(flat.indexOf(a));
    expect(b.handRise).toBeGreaterThan(0.05);
  });

  it('île de départ, plage : la main se pose à la pointe d’inclinaison, pas quand le corps se redresse', () => {
    // cas vu en jeu : tp(0, 4.5), sprint 2 s vers +z, puis stick vers +x, 60 Hz ; la vitesse plonge
    // à 6,6–7,5 m/s (sous course + 0,5 · (sprint − course)) pendant la pointe d'inclinaison
    setObstacles([]);
    setGroundProvider(null);
    const p = new Player(stubCharacter());
    p.place(0, 4.5, 0);
    for (let i = 0; i < 120; i++) p.update(1 / 60, { move: new THREE.Vector3(0, 0, 1), sprint: true });
    const frames = [];
    for (let i = 0; i < 90; i++) {
      p.update(1 / 60, { move: new THREE.Vector3(1, 0, 0), sprint: true });
      frames.push({ ...p.loco });
    }
    const speed = (f) => Math.hypot(f.v, f.vLat);
    const peakAt = frames.reduce((k, f, i) => (Math.abs(f.bank) > Math.abs(frames[k].bank) ? i : k), 0);
    const touchAt = frames.findIndex((f) => f.handDown);
    expect(speed(frames[peakAt])).toBeLessThan(T.run + T.handSpeed * (T.sprint - T.run)); // la vitesse a plongé
    // avant : contact à l'image 41, 0,1 s après la pointe, pendant la redescente ; ici la pointe
    // (28,7°, sous 31,5°) ne suffit qu'avec le relief, atteint trop tard : pas de contact
    if (touchAt >= 0) {
      expect(touchAt).toBeLessThanOrEqual(peakAt + 3); // avant la pointe, ou au plus 0,05 s après
      let peak = 0;
      for (let i = 0; i <= touchAt; i++) peak = Math.max(peak, Math.abs(frames[i].bank));
      expect(Math.abs(frames[touchAt].bank)).toBeGreaterThan(peak - (2 * Math.PI) / 180);
    }
    // jamais de contact qui commence après que |bank| a perdu plus de 2° depuis sa pointe
    for (let i = 1; i < frames.length; i++) {
      if (!frames[i].handDown || frames[i - 1].handDown) continue;
      let peak = 0;
      for (let j = 0; j <= i; j++) peak = Math.max(peak, Math.abs(frames[j].bank));
      expect(Math.abs(frames[i].bank)).toBeGreaterThan(peak - (2 * Math.PI) / 180);
    }
    expect(frames.filter((f) => f.handDown).length / 60).toBeLessThanOrEqual(T.handMaxTime + 1 / 60);
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
