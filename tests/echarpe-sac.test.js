// Écharpe à deux pans et sac à dos du personnage 2.0 : pièces sur os à ressort (Character.js, cheveux.js
// avec les réglages PAN et SAC ; données DYN_PANS, DYN_SAC de models/personnage/corps/). Les pans ne
// traversent ni le torse, ni le sac, ni la tête, même aux butées ; le sac ne rentre pas dans le dos ;
// l'épée de dos ne traverse pas le sac. Puis le mouvement : calme au repos et en tournant sur place,
// traînée à la course, flottement au saut, rebond borné du sac.
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { installCanvasStub } from './helpers/canvas.js';
import { defaultAvatar } from '../src/entities/character/avatar.js';
import { PAN, SAC as R_SAC, hairSpring, stepHair, hairAngles, stepRebond } from '../src/entities/character/cheveux.js';
import { B, GABARIT, DYN_PANS, DYN_SAC } from '../src/models/personnage/index.js';
import { versDessin } from '../src/models/personnage/commun.js';
import { VOLUMES } from '../src/models/personnage/corps/index.js';

installCanvasStub();

const { TORSO, ZT, SAC } = VOLUMES;
const radiusAt = (y) => {
  for (let i = 1; i < TORSO.length; i++) {
    const [y1, r1] = TORSO[i];
    if (y <= y1) {
      const [y0, r0] = TORSO[i - 1];
      return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
    }
  }
  return 0;
};
// rayon réduit (< 1 : dedans) d'un point de dessin dans le torse (ceinture comprise) et le cou
const torse = (p) => {
  let m = Infinity;
  if (p.y > 0.7 && p.y < 1.1) {
    const r = radiusAt(p.y) + (Math.abs(p.y - 0.8) < 0.018 ? 0.014 : 0);
    m = Math.hypot(p.x / r, p.z / (r * ZT));
  }
  if (p.y > 1.0 && p.y < 1.16) m = Math.min(m, Math.hypot(p.x / 0.068, (p.z + 0.012) / (0.068 * 0.88)));
  return m;
};
// boule (superellipsoïde) : valeur < 1 dedans
const boule = (q, [a, b, c], e) => (Math.abs(q.x / a) ** (2 / e) + Math.abs(q.y / b) ** (2 / e) + Math.abs(q.z / c) ** (2 / e)) ** (e / 2);
// point de dessin dans le sac (corps, poche, rabat), repère du sac
const _sacInv = new THREE.Matrix4().makeRotationX(SAC.penche).setPosition(...SAC.c).invert();
const sac = (p) => {
  const q = p.clone().applyMatrix4(_sacInv);
  let m = boule(q, SAC.h, SAC.e);
  for (const k of ['poche', 'rabat']) {
    const { p: c, h, r, e } = SAC[k];
    const l = q.clone().sub(new THREE.Vector3(...c)).applyEuler(new THREE.Euler(-r[0], 0, 0));
    m = Math.min(m, boule(l, h, e));
  }
  return m;
};
// bras au repos (dessin) : capsule de l'épaule au coude, écartée de 0,23 rad, rayon de la manche bouffante
const _ep = new THREE.Vector3(0.165, 0.96, 0);
const _co = _ep.clone().add(new THREE.Vector3(Math.sin(0.23), -Math.cos(0.23), 0).multiplyScalar(0.185));
const bras = (p) => {
  const q = new THREE.Vector3(Math.abs(p.x), p.y, p.z);
  const t = THREE.MathUtils.clamp(q.clone().sub(_ep).dot(_co.clone().sub(_ep)) / _co.distanceToSquared(_ep), 0, 1);
  return q.distanceTo(_ep.clone().lerp(_co, t)) / 0.066;
};
// tête (repère réel) : ellipsoïde du crâne
const tete = (p) => Math.hypot(p.x / (GABARIT.FACE.R * GABARIT.FACE.SX), (p.y - GABARIT.HC) / (GABARIT.FACE.R * GABARIT.FACE.SY), p.z / GABARIT.FACE.R);

async function personnage(av = defaultAvatar()) {
  const { Character } = await import('../src/entities/character/Character.js');
  return new Character(av);
}
// sommets (réels, au repos) portés par un os
function sommets(c, os) {
  const g = c.mesh.geometry;
  const pos = g.attributes.position;
  const si = g.attributes.skinIndex;
  const sw = g.attributes.skinWeight;
  const out = [];
  for (let i = 0; i < pos.count; i++) if (si.getX(i) === os && sw.getX(i) > 0.99) out.push(new THREE.Vector3().fromBufferAttribute(pos, i));
  return out;
}
// pose d'un os (repère du torse au repos) : rotation (Euler XYZ) autour de son pivot réel, puis
// translation verticale ; inverse : ramène un point dans le repère de l'os au repos
const matPose = (c, os, [x, y, z], ty = 0) => {
  const P = c.restLocal[os].clone().add(c.restLocal[B.TORSO]).add(c.restLocal[B.HIPS]);
  return new THREE.Matrix4().makeTranslation(P.x, P.y + ty, P.z).multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(x, y, z))).multiply(new THREE.Matrix4().makeTranslation(-P.x, -P.y, -P.z));
};
const pose = (c, os, a, ty = 0) => {
  const m = matPose(c, os, a, ty);
  return (v) => v.clone().applyMatrix4(m);
};
const inverse = (c, os, a, ty = 0) => {
  const m = matPose(c, os, a, ty).invert();
  return (v) => v.clone().applyMatrix4(m);
};
const enDessin = (v) => new THREE.Vector3(...versDessin(B.TORSO, v.toArray()));
// butées d'un ressort : combinaisons extrêmes
const extremes = (d, R) => {
  const out = [];
  const zs = Array.isArray(d.z) ? d.z : [-d.z, d.z];
  for (const x of [d.x[0], 0, d.x[1]]) for (const y of [-R.vrilleMax, 0, R.vrilleMax]) for (const z of [zs[0], 0, zs[1]]) out.push([x, y, z]);
  return out;
};

describe('écharpe à deux pans et sac à dos : butées', () => {
  it('ont chacun leur os, porté par le torse', async () => {
    const c = await personnage();
    for (const os of [B.SCARF, B.SCARF_B, B.BAG]) {
      expect(c.bones[os].parent).toBe(c.bones[B.TORSO]);
      expect(sommets(c, os).length).toBeGreaterThan(20);
    }
  });

  it('les pans restent hors du torse, du cou, du sac, de la tête et du bras au repos, même aux butées (et le sac aux siennes)', async () => {
    const c = await personnage();
    const pire = { torse: Infinity, sac: Infinity, tete: Infinity, bras: Infinity };
    const sacPoses = [[0, 0, 0, 0], ...[DYN_SAC.x[0], DYN_SAC.x[1]].flatMap((x) => DYN_SAC.z.map((z) => [x, 0, z, 0])), [0, 0, 0, R_SAC.rebond.max], [0, 0, 0, -R_SAC.rebond.max]];
    const inverses = Object.fromEntries(sacPoses.map(([x, y, z, ty]) => [`${x} ${y} ${z} ${ty}`, inverse(c, B.BAG, [x, y, z], ty)]));
    for (const d of DYN_PANS) {
      const pts = sommets(c, d.os);
      for (const a of extremes(d, PAN)) {
        const m = pose(c, d.os, a);
        for (const v of pts) {
          const q = m(v);
          const tq = torse(enDessin(q));
          pire.torse = Math.min(pire.torse, tq);
          pire.tete = Math.min(pire.tete, tete(q));
          const bq = bras(enDessin(q));
          pire.bras = Math.min(pire.bras, bq);
          // le sac à ses propres butées : on ramène le point du pan dans le repère du sac au repos
          for (const [x, y, z, ty] of sacPoses) {
            const sq = sac(enDessin(inverses[`${x} ${y} ${z} ${ty}`](q)));
            pire.sac = Math.min(pire.sac, sq);
          }
        }
      }
    }
    console.info(`pans aux butées : rayon réduit mini ${pire.torse.toFixed(3)} (torse), ${pire.sac.toFixed(3)} (sac), ${pire.tete.toFixed(3)} (tête), ${pire.bras.toFixed(3)} (bras au repos)`);
    expect(pire.torse).toBeGreaterThan(1.03);
    expect(pire.sac).toBeGreaterThan(1.03);
    expect(pire.tete).toBeGreaterThan(1.1);
    // bras au repos (il bouge : on ne demande que la pose de repos)
    expect(pire.bras).toBeGreaterThan(1.0);
  });

  it('le sac ne rentre pas dans le dos (ni la ceinture) à ses butées et à son rebond', async () => {
    const c = await personnage();
    const pts = sommets(c, B.BAG);
    let pire = Infinity;
    for (const x of DYN_SAC.x) for (const z of DYN_SAC.z) for (const ty of [-R_SAC.rebond.max, 0, R_SAC.rebond.max]) {
      const m = pose(c, B.BAG, [x, 0, z], ty);
      for (const v of pts) pire = Math.min(pire, torse(enDessin(m(v))));
    }
    console.info(`sac aux butées : rayon réduit mini ${pire.toFixed(3)} (torse)`);
    expect(pire).toBeGreaterThan(1.0);
  });

  it('l’épée de dos ne traverse pas le sac (elle est portée par lui) et le sac ne traverse pas l’épée', async () => {
    const c = await personnage();
    expect(c.backSword.parent).toBe(c.bones[B.BAG]);
    c.root.updateMatrixWorld(true);
    let pireEpee = Infinity;
    let dansEpee = 0;
    const v = new THREE.Vector3();
    const sacPts = sommets(c, B.BAG);
    for (const m of c.backSword.children) {
      const pos = m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        pireEpee = Math.min(pireEpee, sac(enDessin(v)), torse(enDessin(v)));
      }
      m.geometry.computeBoundingBox();
      const inv = m.matrixWorld.clone().invert();
      for (const p of sacPts) if (m.geometry.boundingBox.containsPoint(p.clone().applyMatrix4(inv))) dansEpee++;
    }
    console.info(`épée : rayon réduit mini ${pireEpee.toFixed(3)} (sac, torse), ${dansEpee} sommets du sac dans l'épée`);
    expect(pireEpee).toBeGreaterThan(1.0);
    expect(dansEpee).toBe(0);
    // sans le sac, elle retourne sur le torse
    const s = await personnage({ ...defaultAvatar(), back: null });
    expect(s.backSword.parent).toBe(s.bones[B.TORSO]);
  });
});

describe('écharpe à deux pans et sac à dos : mouvement', () => {
  const rejoue = (push, duree, fps, d, R, s = hairSpring(), apres = null) => {
    const n = Math.round(duree * fps);
    for (let i = 0; i < n; i++) {
      stepHair(s, d, typeof push === 'function' ? push(i / fps) : push, 1 / fps, 0, R);
      apres?.(s);
    }
    return s;
  };

  it('les pans traînent derrière à la course, sans dépasser leurs butées', () => {
    for (const d of DYN_PANS) {
      const s = rejoue([0, 0, -5 * PAN.vent], 1, 60, d, PAN);
      expect(s.x).toBeGreaterThan(0.25);
      expect(hairAngles(s, d, PAN).x).toBeLessThanOrEqual(d.x[1]);
    }
  });

  it('les pans flottent au saut (chute libre : levés en arrière et en dehors), puis retombent', () => {
    for (const d of DYN_PANS) {
      const s = rejoue([0, 9.8, 0], 0.4, 60, d, PAN);
      expect(s.x).toBeGreaterThan(0.2);
      expect(s.z).toBeGreaterThan(0.05);
      rejoue([0, 0, 0], 2.5, 60, d, PAN, s);
      expect(Math.abs(s.x) + Math.abs(s.z) + Math.abs(s.vx)).toBeLessThan(0.02);
    }
  });

  it('pans et sac restent bornés sous des poussées violentes (roulade), à toute cadence', () => {
    const roulade = (t) => (t < 0.6 ? [0, 60 * Math.cos(t * 10.5), 60 * Math.sin(t * 10.5)] : [Math.sin(t * 97) * 30, Math.cos(t * 61) * 30, Math.sin(t * 43) * 30]);
    for (const fps of [20, 60, 144]) {
      for (const [d, R] of [...DYN_PANS.map((d) => [d, PAN]), [DYN_SAC, R_SAC]]) {
        let depasse = 0;
        const s = rejoue(roulade, 3, fps, d, R, hairSpring(), (q) => {
          const a = hairAngles(q, d, R);
          depasse = Math.max(depasse, Math.abs(q.x - a.x), Math.abs(q.z - a.z));
        });
        expect(Number.isFinite(s.x) && Number.isFinite(s.z)).toBe(true);
        expect(depasse).toBeLessThan(0.05);
      }
    }
  });

  it('le sac rebondit un peu à la réception (borné), bascule à l’élan d’une course, puis revient', () => {
    const s = hairSpring();
    let mini = 0;
    // réception : le torse freine sa chute (poussée vers le bas) pendant 0,1 s, puis plus rien
    for (let i = 0; i < 90; i++) {
      const fy = i < 6 ? -40 : 0;
      mini = Math.min(mini, stepRebond(s, fy, 1 / 60));
    }
    expect(mini).toBeLessThan(-0.006);
    expect(mini).toBeGreaterThanOrEqual(-R_SAC.rebond.max);
    expect(Math.abs(s.ty)).toBeLessThan(0.001);
    // élan : le torse accélère vers l'avant → le bas du sac part en arrière (x > 0), borné
    const e = rejoue([0, 0, -8], 0.25, 60, DYN_SAC, R_SAC);
    expect(e.x).toBeGreaterThan(0.03);
    expect(hairAngles(e, DYN_SAC, R_SAC).x).toBeLessThanOrEqual(DYN_SAC.x[1]);
  });

  afterEach(() => vi.restoreAllMocks());

  it('restent calmes et bornés au repos et sur un personnage qu’on fait tourner sur place', async () => {
    let graine = 12345;
    vi.spyOn(Math, 'random').mockImplementation(() => (graine = (graine * 16807) % 2147483647) / 2147483647);
    let ms = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => ms);
    const c = await personnage();
    const os = [...DYN_PANS.map((d) => [d.os, d, PAN]), [B.BAG, DYN_SAC, R_SAC]];
    const borne = () => {
      for (const [bone, d, R] of os) {
        const r = c.bones[bone].rotation;
        const zs = Array.isArray(d.z) ? d.z : [-d.z, d.z];
        expect(Number.isFinite(r.x + r.y + r.z)).toBe(true);
        expect(r.x).toBeGreaterThanOrEqual(d.x[0] - 1e-9);
        expect(r.x).toBeLessThanOrEqual(d.x[1] + 1e-9);
        expect(r.z).toBeGreaterThanOrEqual(zs[0] - 1e-9);
        expect(r.z).toBeLessThanOrEqual(zs[1] + 1e-9);
        expect(Math.abs(r.y)).toBeLessThanOrEqual(R.vrilleMax + 1e-9);
      }
    };
    // repos : 3 s, le vent du monde seul ; les pans ondulent à peine
    const ecart = { x: [Infinity, -Infinity], z: [Infinity, -Infinity] };
    for (let i = 0; i < 180; i++) {
      ms += 1000 / 60;
      c.update(1 / 60, 0, null);
      borne();
      if (i > 60) {
        const r = c.bones[B.SCARF].rotation;
        ecart.x = [Math.min(ecart.x[0], r.x), Math.max(ecart.x[1], r.x)];
        ecart.z = [Math.min(ecart.z[0], r.z), Math.max(ecart.z[1], r.z)];
      }
    }
    console.info(`repos : pan haut entre ${ecart.x.map((v) => v.toFixed(3)).join(' et ')} (x), ${ecart.z.map((v) => v.toFixed(3)).join(' et ')} (z)`);
    expect(ecart.x[1] - ecart.x[0]).toBeLessThan(0.2);
    expect(ecart.z[1] - ecart.z[0]).toBeLessThan(0.2);
    expect(Math.abs(c.bones[B.BAG].position.y - c.restLocal[B.BAG].y)).toBeLessThan(0.003);
    // tour sur place (glissé à 6 rad/s, puis lâché) : bornés, et pas d'à-coup au-delà de l'ondulation
    const avant = c.bones[B.SCARF].rotation.x;
    for (let i = 0; i < 120; i++) {
      c.root.rotation.y = i < 60 ? i * 0.1 : 6;
      ms += 1000 / 60;
      c.update(1 / 60, 0, null);
      borne();
      expect(Math.abs(c.bones[B.SCARF].rotation.x - avant)).toBeLessThan(0.3);
    }
  });
});
