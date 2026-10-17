// Moteur d'apprentissage : mémoire espacée (SM-2 existant), cotes de type Elo,
// sélection adaptative, gains et points de savoir. Module pur : aucune dépendance
// navigateur, testé par Vitest et utilisé par la simulation d'économie.

import { reviewCard } from '../flashcards.js';
import { DOMAIN_IDS, RATING_START, defaultQuestionRating, levelOfRating, PROJECTS, PROJECT_STAGES } from './domains.js';
import { ECO, baseReward, recallMultiplier, minReadMs } from './economy.js';
import { readingLength } from './answers.js';

const DAY = 86400000;
export const MASTERY_TROPHY = 50; // 50 questions maîtrisées dans un domaine → objet unique

// ---------------------------------------------------------------------------
// État sauvegardé (state.knowledge)
// ---------------------------------------------------------------------------
export function createKnowledge() {
  return {
    v: 1,
    ratings: {}, // domaine → { r, n, placed }
    items: {}, // id de question → mémoire espacée + statistiques
    points: {}, // domaine → points de savoir
    daily: emptyDaily(''),
    farm: { fastWrong: 0, pausedUntil: 0 },
    projects: {}, // projet → étape construite (0..3)
    trophies: {}, // domaine → date d'obtention
    stats: { answered: 0, correct: 0, bestStreak: 0 },
  };
}

function emptyDaily(day) {
  return { day, earned: 0, frac: 0, firstQuiz: false, challenges: [], qotd: null };
}

const num = (v, d) => (Number.isFinite(v) ? v : d);

export function sanitizeKnowledge(raw) {
  const k = createKnowledge();
  if (!raw || typeof raw !== 'object') return k;
  if (raw.ratings && typeof raw.ratings === 'object') {
    for (const [d, r] of Object.entries(raw.ratings)) {
      if (DOMAIN_IDS.includes(d) && r) k.ratings[d] = { r: num(r.r, RATING_START), n: num(r.n, 0), placed: !!r.placed };
    }
  }
  if (raw.items && typeof raw.items === 'object') {
    for (const [id, it] of Object.entries(raw.items)) {
      if (!it || typeof it !== 'object') continue;
      k.items[id] = {
        ef: num(it.ef, 2.5), interval: num(it.interval, 0), reps: num(it.reps, 0), lapses: num(it.lapses, 0),
        due: num(it.due, 0), lastReview: it.lastReview ?? null, seen: num(it.seen, 0), ok: num(it.ok, 0),
        everCorrect: !!it.everCorrect, best: it.best || 'decouverte', qr: Number.isFinite(it.qr) ? it.qr : undefined,
        d: it.d, n: num(it.n, 1),
      };
    }
  }
  if (raw.points && typeof raw.points === 'object') for (const [d, p] of Object.entries(raw.points)) k.points[d] = num(p, 0);
  if (raw.daily && typeof raw.daily === 'object') {
    k.daily = { ...emptyDaily(raw.daily.day || ''), ...raw.daily };
    if (!Array.isArray(k.daily.challenges)) k.daily.challenges = [];
  }
  if (raw.farm) k.farm = { fastWrong: num(raw.farm.fastWrong, 0), pausedUntil: num(raw.farm.pausedUntil, 0) };
  if (raw.projects) for (const [p, s] of Object.entries(raw.projects)) if (PROJECTS[p]) k.projects[p] = Math.min(3, Math.max(0, num(s, 0)));
  if (raw.trophies) k.trophies = { ...raw.trophies };
  if (raw.stats) k.stats = { ...k.stats, ...raw.stats };
  return k;
}

// ---------------------------------------------------------------------------
// États de mémoire : découverte → apprise → ancrée (≥ 7 j) → maîtrisée (≥ 30 j)
// ---------------------------------------------------------------------------
export const STATES = ['nouvelle', 'decouverte', 'apprise', 'ancree', 'maitrisee'];
export const STATE_LABELS = { nouvelle: 'Nouvelle', decouverte: 'Découverte', apprise: 'Apprise', ancree: 'Ancrée', maitrisee: 'Maîtrisée' };

export function stateOf(item) {
  if (!item) return 'nouvelle';
  if (item.reps === 0) return 'decouverte';
  if (item.interval >= 30) return 'maitrisee';
  if (item.interval >= 7) return 'ancree';
  return 'apprise';
}
const rank = (s) => STATES.indexOf(s);

// ---------------------------------------------------------------------------
// Cotes
// ---------------------------------------------------------------------------
export const expected = (r, q) => 1 / (1 + 10 ** ((q - r) / 400));

export function ratingOf(k, domain) {
  return k.ratings[domain]?.r ?? RATING_START;
}

export function levelOf(k, domain) {
  return levelOfRating(ratingOf(k, domain));
}

export function questionRating(k, q) {
  return k.items[q.id]?.qr ?? q.difficulte ?? defaultQuestionRating(q.niveau);
}

function updateRatings(k, q, score, kPlayer = null) {
  const d = q.domaine;
  const pr = (k.ratings[d] = k.ratings[d] || { r: RATING_START, n: 0, placed: false });
  const qr = questionRating(k, q);
  const p = expected(pr.r, qr);
  const K = kPlayer ?? Math.max(24, 80 / Math.sqrt(1 + pr.n / 8));
  pr.r += K * (score - p);
  pr.n += 1;
  const it = k.items[q.id];
  if (it) it.qr = qr - 12 * (score - p);
}

// ---------------------------------------------------------------------------
// Sélection : viser 70–80 % de réussite, ~70 % de nouveautés et ~30 % de rappels
// ---------------------------------------------------------------------------
export function isDue(k, q, now = Date.now()) {
  const it = k.items[q.id];
  return !!it && it.due <= now;
}

export function pickNext(k, questions, { now = Date.now(), recent = [], target = 0.75, rng = Math.random, recallShare = 0.3 } = {}) {
  const avoid = new Set(recent);
  const due = [];
  const fresh = [];
  for (const q of questions) {
    if (avoid.has(q.id)) continue;
    const it = k.items[q.id];
    if (!it) fresh.push(q);
    else if (it.due <= now) due.push(q);
  }
  if (due.length && (!fresh.length || rng() < recallShare)) {
    // rappel : la plus en retard d'abord (un peu de hasard parmi les trois premières)
    due.sort((a, b) => k.items[a.id].due - k.items[b.id].due);
    return due[Math.floor(rng() * Math.min(3, due.length))];
  }
  const pool = fresh.length ? fresh : questions.filter((q) => !avoid.has(q.id));
  if (!pool.length) return null;
  let best = null;
  let bestScore = Infinity;
  for (const q of pool) {
    const p = expected(ratingOf(k, q.domaine), questionRating(k, q));
    const s = Math.abs(p - target) + rng() * 0.05;
    if (s < bestScore) {
      bestScore = s;
      best = q;
    }
  }
  return best;
}

// Test de placement : 5 questions de niveaux croissants (1 à 5), rapides à lire
export function placementSet(questions, rng = Math.random) {
  const out = [];
  for (let n = 1; n <= 5; n++) {
    const pool = questions.filter((q) => q.niveau === n && (q.type === 'qcm' || q.type === 'vf'));
    const any = pool.length ? pool : questions.filter((q) => q.niveau === n);
    if (any.length) out.push(any[Math.floor(rng() * any.length)]);
  }
  return out;
}

export function finishPlacement(k, domain) {
  const pr = (k.ratings[domain] = k.ratings[domain] || { r: RATING_START, n: 0, placed: false });
  pr.placed = true;
  return levelOfRating(pr.r);
}

// ---------------------------------------------------------------------------
// Journée : bonus, défis et plafond doux
// ---------------------------------------------------------------------------
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function rollDaily(k, day, { finishedProjects = [] } = {}) {
  if (k.daily.day === day) return false;
  k.daily = emptyDaily(day);
  const rng = seeded(`defis-${day}`);
  const ids = DOMAIN_IDS.slice();
  const pickDomain = () => ids.splice(Math.floor(rng() * ids.length), 1)[0];
  k.daily.challenges = [
    { id: 'c1', kind: 'correct', domain: pickDomain(), goal: 5, progress: 0, done: false },
    { id: 'c2', kind: 'new', domain: pickDomain(), goal: 3, progress: 0, done: false },
    { id: 'c3', kind: 'recall', domain: null, goal: 3, progress: 0, done: false },
  ];
  // chaque projet terminé ajoute un défi dans l'un de ses domaines
  finishedProjects.forEach((p, i) => {
    const doms = PROJECTS[p].domains;
    k.daily.challenges.push({ id: `p${i}`, kind: 'correct', domain: doms[Math.floor(rng() * doms.length)], goal: 4, progress: 0, done: false, project: p });
  });
  return true;
}

// question du jour : domaine et graine tirés de la date
export function qotdPick(day) {
  const rng = seeded(`qotd-${day}`);
  return { domain: DOMAIN_IDS[Math.floor(rng() * DOMAIN_IDS.length)], seed: rng() };
}

function pay(k, raw) {
  let v = raw;
  if (k.daily.earned >= ECO.dailySoftCap) v *= ECO.softFactor;
  k.daily.frac += v;
  const whole = Math.floor(k.daily.frac + 1e-9);
  k.daily.frac -= whole;
  k.daily.earned += whole;
  return { whole, exact: v };
}

// ---------------------------------------------------------------------------
// Enregistrer une réponse
//   outcome : 'correct' | 'hesitant' (« je le savais ») | 'wrong'
//   ms : temps de réponse ; renvoie les gains et ce qui a changé
// ---------------------------------------------------------------------------
export function recordAnswer(k, q, { outcome, ms = 10000, now = Date.now(), day = '', qotd = false } = {}) {
  if (day) rollDaily(k, day);
  const ok = outcome !== 'wrong';
  let item = k.items[q.id];
  const wasNew = !item;
  if (!item) {
    item = k.items[q.id] = { ef: 2.5, interval: 0, reps: 0, lapses: 0, due: now, lastReview: null, seen: 0, ok: 0, everCorrect: false, best: 'decouverte', d: q.domaine, n: q.niveau };
  }
  const before = wasNew ? 'nouvelle' : stateOf(item);
  const wasDue = !wasNew && item.due <= now;
  const prevInterval = item.interval;
  const firstCorrect = ok && !item.everCorrect;

  reviewCard(item, outcome === 'correct' ? 4 : outcome === 'hesitant' ? 3 : 1, now);
  item.seen += 1;
  if (ok) {
    item.ok += 1;
    item.everCorrect = true;
  }
  updateRatings(k, q, outcome === 'correct' ? 1 : outcome === 'hesitant' ? 0.7 : 0);

  const after = stateOf(item);
  const tooFast = ms < minReadMs(readingLength(q));
  const paused = k.farm.pausedUntil > now;
  const events = [];

  // coquillages
  let raw = 0;
  let reason = null;
  if (ok) {
    if (firstCorrect) {
      raw = baseReward(q.niveau);
      reason = 'nouvelle';
    } else if (wasDue) {
      raw = baseReward(q.niveau) * recallMultiplier(prevInterval);
      reason = 'rappel';
    }
    if (outcome === 'hesitant') raw *= ECO.hesitantFactor;
  }
  // passage à « ancrée » ou « maîtrisée » (une seule fois par question)
  let transition = null;
  if (rank(after) > rank(item.best || 'decouverte')) {
    if (after === 'ancree' || after === 'maitrisee') {
      transition = after;
      raw += (after === 'ancree' ? ECO.anchoredBonus : ECO.masteredBonus) * q.niveau;
    }
    item.best = after;
  }
  if (tooFast || paused) raw = 0;
  const { whole, exact } = pay(k, raw * ECO.scale);

  // points de savoir
  let points = 0;
  if (!tooFast) {
    if (firstCorrect) points += ECO.pointsNew * q.niveau;
    if (transition === 'ancree') points += ECO.pointsAnchored * q.niveau;
    if (transition === 'maitrisee') points += ECO.pointsMastered * q.niveau;
  }
  if (points) k.points[q.domaine] = (k.points[q.domaine] || 0) + points;

  // anti-hasard : 5 erreurs éclair d'affilée → pause des gains
  if (!ok && ms < ECO.fastMs) k.farm.fastWrong += 1;
  else k.farm.fastWrong = 0;
  if (k.farm.fastWrong >= ECO.fastStreak) {
    k.farm.fastWrong = 0;
    k.farm.pausedUntil = now + ECO.pauseMs;
    events.push('pause');
  }

  // bonus et défis du jour (seulement pour de vraies réponses)
  let bonus = 0;
  if (!tooFast && !paused) {
    if (!k.daily.firstQuiz) {
      k.daily.firstQuiz = true;
      bonus += ECO.bonus.firstQuiz;
      events.push('premier-quiz');
    }
    for (const c of k.daily.challenges) {
      if (c.done || !ok) continue;
      if (c.domain && c.domain !== q.domaine) continue;
      const counts = c.kind === 'correct' || (c.kind === 'new' && firstCorrect) || (c.kind === 'recall' && wasDue);
      if (!counts) continue;
      c.progress += 1;
      if (c.progress >= c.goal) {
        c.done = true;
        bonus += ECO.bonus.challenge;
        events.push(`defi:${c.id}`);
      }
    }
    if (qotd && ok) {
      bonus += ECO.bonus.qotd;
      events.push('qotd');
    }
  }
  if (qotd) k.daily.qotd = { id: q.id, correct: ok };

  // statistiques et trophées
  k.stats.answered += 1;
  if (ok) k.stats.correct += 1;
  if (transition === 'maitrisee' && !k.trophies[q.domaine] && masteredCount(k, q.domaine) >= MASTERY_TROPHY) {
    k.trophies[q.domaine] = now;
    events.push(`trophee:${q.domaine}`);
  }

  return { shells: whole + bonus, exact: exact + bonus, bonus, points, reason, before, after, transition, tooFast, paused, events };
}

export function masteredCount(k, domain) {
  let n = 0;
  for (const it of Object.values(k.items)) if (it.d === domain && stateOf(it) === 'maitrisee') n++;
  return n;
}

// Récapitulatif d'un domaine pour l'Encyclopédie
export function domainSummary(k, domain, total = 0, now = Date.now()) {
  const counts = { decouverte: 0, apprise: 0, ancree: 0, maitrisee: 0 };
  let due = 0;
  let next = Infinity;
  for (const it of Object.values(k.items)) {
    if (it.d !== domain) continue;
    counts[stateOf(it)] += 1;
    if (it.due <= now) due += 1;
    else next = Math.min(next, it.due);
  }
  const seen = counts.decouverte + counts.apprise + counts.ancree + counts.maitrisee;
  const learned = counts.apprise + counts.ancree + counts.maitrisee;
  return { counts, seen, learned, due, next: Number.isFinite(next) ? next : null, total, points: k.points[domain] || 0, level: levelOf(k, domain), placed: !!k.ratings[domain]?.placed };
}

// ---------------------------------------------------------------------------
// Projets d'île
// ---------------------------------------------------------------------------
export function projectPoints(k, projectId) {
  return PROJECTS[projectId].domains.reduce((s, d) => s + (k.points[d] || 0), 0);
}

// étape suivante possible ? (points suffisants ; le prix est vérifié par le jeu)
export function nextProjectStage(k, projectId) {
  const built = k.projects[projectId] || 0;
  if (built >= PROJECT_STAGES.length) return null;
  const st = PROJECT_STAGES[built];
  return { index: built, ...st, unlocked: projectPoints(k, projectId) >= st.points };
}

// Fiches du joueur (« Mes cours ») : même barème, niveau 2 par défaut
export function cardReward(card, outcomeGrade, { prevInterval, wasDue, firstCorrect, before, after }) {
  if (outcomeGrade < 3) return 0;
  const niveau = card.niveau || 2;
  let raw = 0;
  if (firstCorrect) raw = baseReward(niveau);
  else if (wasDue) raw = baseReward(niveau) * recallMultiplier(prevInterval);
  if (rank(after) > rank(before) && (after === 'ancree' || after === 'maitrisee')) raw += (after === 'ancree' ? ECO.anchoredBonus : ECO.masteredBonus) * niveau;
  return raw * ECO.scale;
}

export { DAY };
