// Cheveux du personnage : une seule coupe (en pics), vers laquelle retombent les anciennes sauvegardes.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installCanvasStub } from './helpers/canvas.js';
import { HAIRS, defaultAvatar, sanitizeAvatar } from '../src/entities/character/avatar.js';
import { migrate } from '../src/core/state.js';
import { HAIR_STYLES } from '../src/models/personnage/index.js';

installCanvasStub();

describe('coupe unique en pics', () => {
  it('est la seule coupe, celle du look par défaut, et elle a sa géométrie', () => {
    expect(Object.keys(HAIRS)).toEqual(['pics']);
    expect(Object.keys(HAIR_STYLES)).toEqual(['pics']);
    expect(defaultAvatar().hair).toBe('pics');
  });

  it('remplace les anciennes coupes des sauvegardes, sans toucher au reste du look', () => {
    for (const old of ['bol', 'carre', 'queue', 'macarons', 'boucles', 'longs', undefined, 42]) {
      const raw = { ...defaultAvatar(), hair: old, hairColor: 4, eyes: 'amande', top: 'gilet' };
      const av = sanitizeAvatar(raw);
      expect(av.hair).toBe('pics');
      expect(av.hairColor).toBe(4);
      expect(av.eyes).toBe('amande');
      expect(av.top).toBe('gilet');
      expect(migrate({ version: 2, avatar: raw }).avatar.hair).toBe('pics');
    }
  });
});

describe('physique des pics', async () => {
  const THREE = await import('three');
  const { RESSORT, hairSpring, stepHair, hairAngles } = await import('../src/entities/character/cheveux.js');
  const { MECHES, ZONES, FORMES, mechePoint, CAP, NUQUE } = await import('../src/models/personnage/coupes/index.js');
  const { FACE } = await import('../src/entities/character/face.js');
  const { HC, B, ID, GABARIT } = await import('../src/models/personnage/index.js');
  const { a: A, b: Bd, c: C } = HAIR_STYLES.pics.dyn;
  // rayon réduit d'un point dans l'ellipsoïde du crâne, de la calotte et de la masse de la nuque (< 1 : dedans)
  // crâne du gabarit : ellipsoïde déformé sous la ligne des yeux (tete.js, deformeTete : joues, mâchoire,
  // devant aplati, nuque qui rentre) ; on ramène le point dans la sphère d'origine
  const f = GABARIT.FACE.forme;
  const smooth = (t) => t * t * (3 - 2 * t);
  const crane = (p) => {
    let { x, z } = p;
    const y = p.y - HC;
    const d = f ? Math.min(1, Math.max(0, (f.yeux - y / (FACE.R * FACE.SY)) / (1 + f.yeux))) : 0;
    if (d > 0) {
      x /= (1 + f.joues * Math.sin(Math.PI * d)) * (1 - f.machoire * d ** 1.6);
      z /= z > 0 ? 1 - f.aplat * d : 1 - f.nuque * smooth(d);
    }
    return Math.hypot(x / (FACE.R * FACE.SX), y / (FACE.R * FACE.SY), z / FACE.R);
  };
  const ell = ({ c, r }) => (p) => Math.hypot((p.x - c[0]) / r[0], (p.y - c[1]) / r[1], (p.z - c[2]) / r[2]);
  const calotte = ell(CAP);
  const nuque = ell(NUQUE);
  // oreilles (tete.js, oreilles) : sphère de rayon r aplatie (0,48 × 1 × 0,78), ouverte vers l'avant
  const o = GABARIT.FACE.forme.oreille;
  const oreille = (p) => {
    const sx = p.x < 0 ? -1 : 1;
    const q = new THREE.Vector3(p.x - sx * FACE.R * FACE.SX * o.x, p.y - HC - o.y, p.z - o.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), -sx * o.ouvre);
    return Math.hypot(q.x / (o.r * 0.48), q.y / o.r, q.z / (o.r * 0.78));
  };
  // groupes montés sur ressort : os, pivot, dynamique, mèches
  const groupes = [
    ['dessus', HAIR_STYLES.pics.a, A, [...MECHES.dessus, ...MECHES.epi]],
    ['nuque', HAIR_STYLES.pics.b, Bd, MECHES.nuque],
    ['cotes', HAIR_STYLES.pics.c, C, MECHES.cotes],
  ];

  it('gardent leurs pointes hors de la tête, des oreilles et de la calotte, même aux butées', () => {
    const e = new THREE.Euler();
    const pire = { crane: Infinity, oreille: Infinity, calotte: Infinity };
    for (const [, pivot, d, list] of groupes) {
      const P = new THREE.Vector3(...pivot);
      for (const x of [d.x[0], 0, d.x[1]]) for (const y of [-RESSORT.vrilleMax, 0, RESSORT.vrilleMax]) for (const z of [-d.z, 0, d.z]) {
        e.set(x, y, z);
        const bouge = (q) => q.sub(P).applyEuler(e).add(P);
        for (const s of list) {
          // pointe et point aux deux tiers de la mèche
          for (const t of [1, 0.66]) {
            const q = bouge(mechePoint(s, t));
            pire.crane = Math.min(pire.crane, crane(q));
            pire.oreille = Math.min(pire.oreille, oreille(q));
          }
          const tip = bouge(mechePoint(s, 1));
          pire.calotte = Math.min(pire.calotte, Math.max(calotte(tip), nuque(tip)));
        }
      }
    }
    console.info(`pics aux butées : rayon réduit mini ${pire.crane.toFixed(3)} (crâne), ${pire.oreille.toFixed(3)} (oreilles), ${pire.calotte.toFixed(3)} (calotte)`);
    expect(pire.crane).toBeGreaterThan(1.05);
    expect(pire.oreille).toBeGreaterThan(1.05);
    expect(pire.calotte).toBeGreaterThan(1.02);
  });

  it('font une masse de 25 à 35 mèches, plus large que le crâne, aux identifiants de contour alternés', () => {
    const toutes = Object.entries(MECHES).flatMap(([zone, l]) => l.map((s) => ({ zone, s })));
    expect(toutes.length).toBeGreaterThanOrEqual(25);
    expect(toutes.length).toBeLessThanOrEqual(35);
    expect(Object.keys(ZONES).sort()).toEqual(Object.keys(MECHES).sort());
    // aucune mèche n'a l'identifiant de la peau (crâne, visage) ; celles des côtés pas celui des oreilles
    for (const { zone, s } of toutes) {
      expect(s[7]).not.toBe(ID.head);
      if (zone === 'cotes') expect(s[7]).not.toBe(ID.body);
    }
    // deux mèches qui se touchent (axes à moins de 1,5 fois la somme des rayons) : identifiants différents
    const ts = [0.25, 0.4, 0.55, 0.7, 0.85, 1];
    const pts = toutes.map(({ s }) => {
      const { profile, flat } = FORMES[s[9]];
      return ts.map((t) => {
        const k = Math.min(2, Math.floor(t * 3));
        return { p: mechePoint(s, t), r: (profile[k] + (profile[k + 1] - profile[k]) * (t * 3 - k)) * s[3] * ((1 + flat) / 2) };
      });
    });
    let contacts = 0;
    for (let i = 0; i < toutes.length; i++) for (let j = i + 1; j < toutes.length; j++) {
      if (!pts[i].some((p) => pts[j].some((q) => p.p.distanceTo(q.p) < (p.r + q.r) * 1.5))) continue;
      contacts++;
      expect(toutes[i].s[7], `${toutes[i].zone} ${i} / ${toutes[j].zone} ${j}`).not.toBe(toutes[j].s[7]);
    }
    expect(contacts).toBeGreaterThan(20);
    // largeur de la masse (pointes comprises) : au moins 1,35 fois celle du crâne
    const xs = toutes.map(({ s }) => Math.abs(mechePoint(s, 1).x));
    expect((2 * Math.max(...xs)) / (2 * FACE.R * FACE.SX)).toBeGreaterThan(1.35);
  });

  // rejoue une poussée (m/s², repère de la tête) pendant `duree` secondes à `fps` images par seconde
  const rejoue = (push, duree, fps, s = hairSpring(), d = A, apres = null) => {
    const n = Math.round(duree * fps);
    for (let i = 0; i < n; i++) {
      stepHair(s, d, typeof push === 'function' ? push(i / fps) : push, 1 / fps);
      apres?.(s);
    }
    return s;
  };

  it('se dressent en l’air (chute libre), se couchent à la réception, puis reviennent au repos', () => {
    const enLAir = rejoue([0, 9.8, 0], 0.4, 60);
    expect(enLAir.x).toBeGreaterThan(0.05); // dessus : se redresse vers l'avant
    const arriere = rejoue([0, 9.8, 0], 0.4, 60, hairSpring(), Bd);
    expect(arriere.x).toBeGreaterThan(0.05); // arrière : pointes qui remontent
    // réception : la tête freine sa chute (poussée vers le bas) pendant 0,1 s
    const recep = rejoue((t) => (t < 0.1 ? [0, -45, 0] : [0, 0, 0]), 0.1, 60, enLAir);
    expect(recep.x).toBeLessThan(0);
    rejoue([0, 0, 0], 1.5, 60, recep);
    expect(Math.abs(recep.x) + Math.abs(recep.vx)).toBeLessThan(0.01);
  });

  it('se couchent vers l’arrière à l’élan d’une course et partent en avant à l’arrêt brusque', () => {
    // départ : la tête accélère vers l'avant (+z) → poussée vers l'arrière
    expect(rejoue([0, 0, -12], 0.15, 60).x).toBeLessThan(-0.05);
    // course établie : vent de course de 5 m/s
    const course = rejoue([0, 0, -5 * RESSORT.vent], 1, 60);
    expect(course.x).toBeLessThan(-0.02);
    // arrêt brusque : la tête freine → poussée vers l'avant
    expect(rejoue([0, 0, 14], 0.15, 60, course).x).toBeGreaterThan(0.05);
  });

  it('traînent derrière à la course : nuque et côtés (pendules qui pendent) partent en arrière', () => {
    // vent de course de 5 m/s : les mèches pendantes basculent en arrière (x > 0, vers −z), sans dépasser
    for (const d of [Bd, C]) {
      const s = rejoue([0, 0, -5 * RESSORT.vent], 1, 60, hairSpring(), d);
      expect(s.x).toBeGreaterThan(0.02);
      expect(hairAngles(s, d).x).toBeLessThanOrEqual(d.x[1]);
    }
  });

  it('restent stables et bornées sous des poussées violentes (roulade), à toute cadence', () => {
    for (const fps of [20, 60, 144]) {
      for (const d of [A, Bd, C]) {
        let depasse = 0;
        // roulade : poussée de 60 m/s² qui tourne d'un tour en 0,6 s, puis du bruit
        const roulade = (t) => (t < 0.6 ? [0, 60 * Math.cos(t * 10.5), 60 * Math.sin(t * 10.5)] : [Math.sin(t * 97) * 30, Math.cos(t * 61) * 30, Math.sin(t * 43) * 30]);
        const s = rejoue(roulade, 3, fps, hairSpring(), d, (q) => {
          const a = hairAngles(q, d);
          depasse = Math.max(depasse, Math.abs(q.x - a.x), Math.abs(q.z - a.z));
        });
        expect(Number.isFinite(s.x) && Number.isFinite(s.z)).toBe(true);
        expect(depasse).toBeLessThan(0.05); // le ressort ne dépasse pas ses butées de plus de 3°
      }
    }
  });

  it('suivent le même mouvement à 30, 60 et 144 images par seconde', () => {
    const elan = (t) => (t < 0.2 ? [0, -20, -10] : [0, 9.8, 0]);
    const ref = rejoue(elan, 0.5, 240);
    for (const fps of [30, 60, 144]) expect(Math.abs(rejoue(elan, 0.5, fps).x - ref.x)).toBeLessThan(0.02);
  });

  afterEach(() => vi.restoreAllMocks());

  it('restent calmes et bornées sur un personnage immobile qu’on fait tourner (miroir, aperçu de l’inventaire)', async () => {
    // déterministe : regard, clignements et gestes d'attente tirent Math.random (Character.js), la
    // respiration lit l'horloge ; suite fixe et horloge qui avance d'une image à chaque pas
    let graine = 12345;
    vi.spyOn(Math, 'random').mockImplementation(() => (graine = (graine * 16807) % 2147483647) / 2147483647);
    let ms = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => ms);
    const { Character } = await import('../src/entities/character/Character.js');
    const c = new Character(defaultAvatar());
    const os = [[B.HAIR_A, A, 'hairA'], [B.HAIR_B, Bd, 'hairB'], [B.HAIR_C, C, 'hairC']];
    for (let i = 0; i < 120; i++) {
      c.root.rotation.y = i < 60 ? i * 0.1 : 6; // glissé rapide (6 rad/s), puis lâché
      ms += 1000 / 60;
      c.update(1 / 60, 0, null);
      for (const [bone, d] of os) {
        const r = c.bones[bone].rotation;
        expect(Number.isFinite(r.x + r.y + r.z)).toBe(true);
        expect(r.x).toBeGreaterThanOrEqual(d.x[0] - 1e-9);
        expect(r.x).toBeLessThanOrEqual(d.x[1] + 1e-9);
      }
    }
    for (let i = 0; i < 120; i++) {
      ms += 1000 / 60;
      c.update(1 / 60, 0, null);
    }
    const residu = os.reduce((m, [, , k]) => m + Math.abs(c.clothSprings[k].x), 0);
    console.info(`résidu après le tour : ${residu.toFixed(4)} rad`);
    expect(Math.abs(c.clothSprings.hairA.x) + Math.abs(c.clothSprings.hairB.x)).toBeLessThan(0.03);
    expect(Math.abs(c.clothSprings.hairC.x)).toBeLessThan(0.03);
  });
});
