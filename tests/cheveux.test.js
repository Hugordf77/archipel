// Cheveux du personnage : une seule coupe (en pics), vers laquelle retombent les anciennes sauvegardes.
import { describe, expect, it } from 'vitest';
import { HAIRS, defaultAvatar, sanitizeAvatar } from '../src/entities/character/avatar.js';
import { migrate } from '../src/core/state.js';
import { HAIR_STYLES } from '../src/models/personnage/index.js';

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
  const { SPIKES, spikeFrame, spikeTip, CAP_C, CAP_SY, CAP_EXTRA } = await import('../src/models/personnage/coupes/index.js');
  const { FACE } = await import('../src/entities/character/face.js');
  const { HC } = await import('../src/models/personnage/index.js');
  const { a: A, b: Bd } = HAIR_STYLES.pics.dyn;
  // rayon réduit d'un point dans l'ellipsoïde du crâne et dans celui de la calotte (< 1 : dedans)
  const crane = (p) => Math.hypot(p.x / (FACE.R * FACE.SX), (p.y - HC) / (FACE.R * FACE.SY), p.z / FACE.R);
  const calotte = (p) => {
    const R = FACE.R + CAP_EXTRA;
    return Math.hypot(p.x / (R * FACE.SX), (p.y - CAP_C[1]) / (R * CAP_SY), (p.z - CAP_C[2]) / (R * 1.05));
  };
  const groupes = [
    ['couronne', HAIR_STYLES.pics.a, A],
    ['arriere', HAIR_STYLES.pics.b, Bd],
  ];

  it('gardent leurs pointes hors de la tête et de la calotte, même aux butées', () => {
    const e = new THREE.Euler();
    const pire = { crane: Infinity, calotte: Infinity };
    for (const [nom, pivot, d] of groupes) {
      const P = new THREE.Vector3(...pivot);
      for (const x of [d.x[0], 0, d.x[1]]) for (const y of [-0.3, 0, 0.3]) for (const z of [-d.z, 0, d.z]) {
        e.set(x, y, z);
        for (const s of SPIKES[nom]) {
          const f = spikeFrame(s);
          // pointe et point aux deux tiers de la mèche
          for (const q of [spikeTip(s), f.base.clone().addScaledVector(f.dir, (s[2] + 0.045) * 0.66)]) {
            pire.crane = Math.min(pire.crane, crane(q.sub(P).applyEuler(e).add(P)));
          }
          pire.calotte = Math.min(pire.calotte, calotte(spikeTip(s).sub(P).applyEuler(e).add(P)));
        }
      }
    }
    console.info(`pics aux butées : rayon réduit mini ${pire.crane.toFixed(3)} (crâne), ${pire.calotte.toFixed(3)} (calotte)`);
    expect(pire.crane).toBeGreaterThan(1.05);
    expect(pire.calotte).toBeGreaterThan(1.02);
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
    expect(enLAir.x).toBeGreaterThan(0.05); // couronne : se redresse vers l'avant
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

  it('restent stables et bornées sous des poussées violentes (roulade), à toute cadence', () => {
    for (const fps of [20, 60, 144]) {
      for (const d of [A, Bd]) {
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
});
