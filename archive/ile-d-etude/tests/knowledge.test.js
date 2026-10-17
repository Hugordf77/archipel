import { describe, it, expect } from 'vitest';
import { normalize, canon, checkShort, checkAnswer, parseNumber } from '../src/game/knowledge/answers.js';
import { createKnowledge, sanitizeKnowledge, recordAnswer, pickNext, placementSet, finishPlacement, expected, ratingOf, stateOf, rollDaily } from '../src/game/knowledge/engine.js';
import { ECO, minReadMs } from '../src/game/knowledge/economy.js';
import { migrate, createDefaultState } from '../src/game/state.js';

const DAY = 86400000;
const T0 = new Date(2026, 9, 1, 10).getTime();

function rngOf(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const q = (id, niveau = 3, extra = {}) => ({
  id, domaine: 'histoire', niveau, type: 'qcm', enonce: 'Question de test assez courte ?', choix: ['a', 'b', 'c', 'd'], reponse: 0,
  explication: 'x'.repeat(50), tags: [], difficulte: 500 + 200 * niveau, ...extra,
});
const slow = 15000;

describe('réponses courtes', () => {
  it('ignore casse, accents, articles et pluriels', () => {
    expect(normalize('  L’Élysée  ')).toBe('l elysee');
    expect(canon('Les Pyrénées')).toBe('pyrenee');
    expect(checkShort(['Canberra'], 'canberra')).toBe(true);
    expect(checkShort(['la Seine'], 'Seine')).toBe(true);
    expect(checkShort(['Pyrénées'], 'les pyrenees')).toBe(true);
    expect(checkShort(['Victor Hugo'], 'victor hugo')).toBe(true);
  });
  it('pardonne une faute de frappe sur les mots longs, pas sur les courts', () => {
    expect(checkShort(['Baudelaire'], 'Baudelair')).toBe(true);
    expect(checkShort(['Rome'], 'Rame')).toBe(false);
    expect(checkShort(['1789'], '1788')).toBe(false);
  });
  it('refuse une réponse différente ou vide', () => {
    expect(checkShort(['Autriche'], 'Australie')).toBe(false);
    expect(checkShort(['Paris'], '')).toBe(false);
  });
});

describe('types de questions', () => {
  it('estimation avec tolérance', () => {
    const e = { type: 'estim', reponse: 8849, tolerance: 5 };
    expect(parseNumber('8 849')).toBe(8849);
    expect(checkAnswer(e, '8600')).toBe(true);
    expect(checkAnswer(e, '8000')).toBe(false);
    expect(checkAnswer(e, 'beaucoup')).toBe(false);
  });
  it('chronologie et association', () => {
    expect(checkAnswer({ type: 'chrono', elements: ['a', 'b', 'c', 'd'] }, ['a', 'b', 'c', 'd'])).toBe(true);
    expect(checkAnswer({ type: 'chrono', elements: ['a', 'b', 'c', 'd'] }, ['b', 'a', 'c', 'd'])).toBe(false);
    const as = { type: 'assoc', paires: [['x', '1'], ['y', '2']] };
    expect(checkAnswer(as, { x: '1', y: '2' })).toBe(true);
    expect(checkAnswer(as, { x: '2', y: '1' })).toBe(false);
  });
  it('QCM et vrai/faux', () => {
    expect(checkAnswer(q('a'), 0)).toBe(true);
    expect(checkAnswer(q('a'), 2)).toBe(false);
    expect(checkAnswer({ type: 'vf', reponse: false }, false)).toBe(true);
  });
});

describe('barème', () => {
  it('une nouvelle bonne réponse rapporte la base du niveau', () => {
    const k = createKnowledge();
    const r = recordAnswer(k, q('n1', 5), { outcome: 'correct', ms: slow, now: T0, day: 'd1' });
    expect(r.reason).toBe('nouvelle');
    expect(r.exact - r.bonus).toBeCloseTo(3 * ECO.scale, 5);
    expect(r.points).toBe(5);
  });
  it('une question réussie mais pas encore échue ne rapporte rien', () => {
    const k = createKnowledge();
    recordAnswer(k, q('n1'), { outcome: 'correct', ms: slow, now: T0, day: 'd1' });
    const r = recordAnswer(k, q('n1'), { outcome: 'correct', ms: slow, now: T0 + 60000, day: 'd1' });
    expect(r.exact).toBe(0);
  });
  it('un rappel espacé réussi rapporte davantage', () => {
    const k = createKnowledge();
    const Q = q('n1', 3);
    recordAnswer(k, Q, { outcome: 'correct', ms: slow, now: T0, day: 'd1' }); // intervalle 1
    recordAnswer(k, Q, { outcome: 'correct', ms: slow, now: T0 + 2 * DAY, day: 'd3' }); // intervalle 6
    const r = recordAnswer(k, Q, { outcome: 'correct', ms: slow, now: T0 + 9 * DAY, day: 'd10' });
    expect(r.reason).toBe('rappel');
    // base 2 × (1 + 0,5 × log2(7)) ≈ 2 × 2,40 ; +3 × 3 de passage à « ancrée »
    expect(r.transition).toBe('ancree');
    expect(r.exact - r.bonus).toBeCloseTo((2 * (1 + 0.5 * Math.log2(7)) + 9) * ECO.scale, 4);
  });
  it('une erreur ne rapporte rien et ne retire jamais rien', () => {
    const k = createKnowledge();
    const r = recordAnswer(k, q('n1'), { outcome: 'wrong', ms: slow, now: T0, day: 'd1' });
    // seul le petit bonus de participation du premier quiz du jour est versé
    expect(r.shells - r.bonus).toBe(0);
    expect(r.exact - r.bonus).toBe(0);
    expect(r.shells).toBeGreaterThanOrEqual(0);
    expect(stateOf(k.items.n1)).toBe('decouverte');
  });
  it('« je le savais » compte pour moitié', () => {
    const k = createKnowledge();
    const r = recordAnswer(k, q('n1', 1), { outcome: 'hesitant', ms: slow, now: T0, day: 'd1' });
    expect(r.exact - r.bonus).toBeCloseTo(1 * ECO.hesitantFactor * ECO.scale, 5);
  });
  it('une réponse plus rapide que la lecture ne rapporte rien', () => {
    const k = createKnowledge();
    const r = recordAnswer(k, q('n1'), { outcome: 'correct', ms: 300, now: T0, day: 'd1' });
    expect(r.tooFast).toBe(true);
    expect(r.shells).toBe(0);
    expect(minReadMs(10)).toBe(ECO.minReadBase);
  });
  it('premier quiz du jour : petit bonus une seule fois', () => {
    const k = createKnowledge();
    const a = recordAnswer(k, q('n1'), { outcome: 'wrong', ms: slow, now: T0, day: 'd1' });
    const b = recordAnswer(k, q('n2'), { outcome: 'wrong', ms: slow, now: T0, day: 'd1' });
    expect(a.bonus).toBe(ECO.bonus.firstQuiz);
    expect(b.bonus).toBe(0);
  });
});

describe('anti-farming', () => {
  it('5 erreurs éclair d’affilée suspendent les gains 2 minutes', () => {
    const k = createKnowledge();
    let events = [];
    for (let i = 0; i < 5; i++) events = recordAnswer(k, q(`w${i}`), { outcome: 'wrong', ms: 500, now: T0 + i * 1000, day: 'd1' }).events;
    expect(events).toContain('pause');
    const during = recordAnswer(k, q('ok1'), { outcome: 'correct', ms: slow, now: T0 + 60000, day: 'd1' });
    expect(during.paused).toBe(true);
    expect(during.shells).toBe(0);
    const after = recordAnswer(k, q('ok2'), { outcome: 'correct', ms: slow, now: T0 + 6 * 60000, day: 'd1' });
    expect(after.paused).toBe(false);
    expect(after.exact).toBeGreaterThan(0);
  });
  it('au-delà du plafond quotidien, les gains de quiz sont divisés par deux', () => {
    const k = createKnowledge();
    rollDaily(k, 'd1');
    k.daily.firstQuiz = true;
    k.daily.earned = ECO.dailySoftCap;
    const r = recordAnswer(k, q('n1', 5), { outcome: 'correct', ms: slow, now: T0, day: 'd1' });
    expect(r.exact).toBeCloseTo(3 * ECO.scale * ECO.softFactor, 5);
  });
});

describe('sélection adaptative', () => {
  // banque synthétique : 6 niveaux × 120 questions, difficulté réelle bruitée
  function bank(rng) {
    const out = [];
    for (let n = 1; n <= 6; n++) {
      for (let i = 0; i < 120; i++) {
        const base = 500 + 200 * n;
        out.push({ ...q(`s${n}-${i}`, n), difficulte: base, vraie: base + (rng() - 0.5) * 160 });
      }
    }
    return out;
  }
  it('vise 70–80 % de réussite pour un joueur de niveau fixe', () => {
    const rates = [];
    for (const [seed, T] of [[1, 900], [2, 1200], [3, 1400], [4, 1600], [5, 1100]]) {
      const rng = rngOf(seed);
      const questions = bank(rng);
      const k = createKnowledge();
      let now = T0;
      for (const Q of placementSet(questions, rng)) {
        const ok = rng() < expected(T, Q.vraie);
        recordAnswer(k, Q, { outcome: ok ? 'correct' : 'wrong', ms: slow, now: (now += 30000), day: 'd1' });
      }
      finishPlacement(k, 'histoire');
      let correct = 0;
      const recent = [];
      for (let i = 0; i < 50; i++) {
        const Q = pickNext(k, questions, { now, recent, rng });
        const ok = rng() < expected(T, Q.vraie);
        if (ok) correct++;
        recordAnswer(k, Q, { outcome: ok ? 'correct' : 'wrong', ms: slow, now: (now += 30000), day: 'd1' });
        recent.push(Q.id);
        if (recent.length > 8) recent.shift();
      }
      rates.push(correct / 50);
    }
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    expect(mean).toBeGreaterThanOrEqual(0.65);
    expect(mean).toBeLessThanOrEqual(0.8);
  });
  it('le placement rapproche la cote du vrai niveau', () => {
    const rng = rngOf(9);
    const questions = bank(rng);
    const k = createKnowledge();
    for (const Q of placementSet(questions, rng)) recordAnswer(k, Q, { outcome: Q.niveau <= 3 ? 'correct' : 'wrong', ms: slow, now: T0, day: 'd1' });
    expect(ratingOf(k, 'histoire')).toBeGreaterThan(1000);
    expect(ratingOf(k, 'histoire')).toBeLessThan(1400);
  });
});

describe('sauvegarde', () => {
  it('une ancienne sauvegarde se charge avec un savoir vierge et garde les fiches', () => {
    const old = createDefaultState();
    delete old.knowledge;
    old.cards = [{ id: 'cd_1', subjectId: 'sub_maths', front: 'Q', back: 'R', ef: 2.5, interval: 6, reps: 2, lapses: 0, due: T0 }];
    const s = migrate(JSON.parse(JSON.stringify(old)));
    expect(s.knowledge.items).toEqual({});
    expect(s.cards).toHaveLength(1);
    expect(s.cards[0].front).toBe('Q');
  });
  it('des données abîmées sont réparées sans erreur', () => {
    const k = sanitizeKnowledge({ ratings: { histoire: { r: 'x' }, inconnu: { r: 1 } }, items: { a: null, b: { reps: 2 } }, projects: { serre: 9, faux: 1 } });
    expect(k.ratings.histoire.r).toBe(1000);
    expect(k.ratings.inconnu).toBeUndefined();
    expect(k.items.b.ef).toBe(2.5);
    expect(k.projects.serre).toBe(3);
    expect(k.projects.faux).toBeUndefined();
  });
});
