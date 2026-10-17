import { uid, todayKey } from './state.js';

// Répétition espacée SM-2 (SuperMemo 2).
// Notes : 1 = à revoir, 3 = difficile, 4 = bien, 5 = facile.
export const GRADES = [
  { q: 1, label: 'À revoir', key: '1', tone: 'coral' },
  { q: 3, label: 'Difficile', key: '2', tone: '' },
  { q: 4, label: 'Bien', key: '3', tone: 'primary' },
  { q: 5, label: 'Facile', key: '4', tone: 'primary' },
];

const DAY = 86400000;

function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(4, 0, 0, 0); // une fiche « pour demain » est prête dès 4 h du matin
  return d.getTime();
}

export function newCard(subjectId, front, back) {
  const now = Date.now();
  return { id: uid('cd'), subjectId, front, back, createdAt: now, ef: 2.5, interval: 0, reps: 0, lapses: 0, due: now, lastReview: null };
}

export function reviewCard(card, q, now = Date.now()) {
  if (q < 3) {
    card.reps = 0;
    card.interval = 0;
    card.lapses = (card.lapses || 0) + 1;
    card.due = now + 10 * 60000; // revient dans 10 minutes
  } else {
    if (card.reps === 0) card.interval = 1;
    else if (card.reps === 1) card.interval = 6;
    else card.interval = Math.max(1, Math.round(card.interval * card.ef));
    if (q === 5 && card.reps === 0) card.interval = 3;
    card.reps += 1;
    card.due = startOfDay(now) + card.interval * DAY;
  }
  card.ef = Math.max(1.3, card.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  card.lastReview = now;
  return card;
}

export function dueCards(cards, subjectId = null, now = Date.now()) {
  return cards.filter((c) => c.due <= now && (!subjectId || c.subjectId === subjectId));
}

export function nextDue(cards, now = Date.now()) {
  const future = cards.filter((c) => c.due > now).map((c) => c.due);
  return future.length ? Math.min(...future) : null;
}

// Niveau de maîtrise lisible (0..4) façon boîtes de Leitner, pour l'affichage
export function masteryLevel(card) {
  if (card.reps === 0) return 0;
  if (card.interval < 3) return 1;
  if (card.interval < 10) return 2;
  if (card.interval < 30) return 3;
  return 4;
}

// File de révision : fiches dues mélangées, au plus 20
export function buildQueue(cards, subjectId = null, limit = 20) {
  const due = dueCards(cards, subjectId);
  for (let i = due.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [due[i], due[j]] = [due[j], due[i]];
  }
  return due.slice(0, limit);
}

export function logReview(state, correct) {
  const k = todayKey();
  const log = (state.reviewLog[k] = state.reviewLog[k] || { count: 0, correct: 0 });
  log.count += 1;
  if (correct) log.correct += 1;
}

export function formatDue(ts, now = Date.now()) {
  if (ts <= now) return 'à revoir';
  const days = Math.round((startOfDay(ts) - startOfDay(now)) / DAY);
  if (days <= 0) return 'plus tard aujourd\'hui';
  if (days === 1) return 'demain';
  if (days < 7) return `dans ${days} jours`;
  if (days < 30) return `dans ${Math.round(days / 7)} sem.`;
  return `dans ${Math.round(days / 30)} mois`;
}
