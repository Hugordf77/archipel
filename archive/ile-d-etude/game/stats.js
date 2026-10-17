import { todayKey, dayKeyOf } from './state.js';

// Minutes étudiées par jour (clé locale YYYY-MM-DD)
export function minutesByDay(sessions) {
  const map = {};
  for (const s of sessions) {
    if (!s.minutes) continue;
    const k = dayKeyOf(s.end || s.start);
    map[k] = (map[k] || 0) + s.minutes;
  }
  return map;
}

export function minutesBySubject(sessions) {
  const map = {};
  for (const s of sessions) map[s.subjectId] = (map[s.subjectId] || 0) + (s.minutes || 0);
  return map;
}

export function totalMinutes(sessions) {
  return sessions.reduce((a, s) => a + (s.minutes || 0), 0);
}

export function todayMinutes(sessions) {
  const k = todayKey();
  return sessions.filter((s) => dayKeyOf(s.end || s.start) === k).reduce((a, s) => a + (s.minutes || 0), 0);
}

function shiftDay(key, delta) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return todayKey(dt);
}

// Série : jours consécutifs avec au moins une session terminée.
// Si rien aujourd'hui, la série d'hier compte encore (pas de culpabilité avant minuit).
export function streak(sessions) {
  const days = new Set(sessions.filter((s) => s.completed).map((s) => dayKeyOf(s.end || s.start)));
  let k = todayKey();
  if (!days.has(k)) k = shiftDay(k, -1);
  let n = 0;
  while (days.has(k)) {
    n++;
    k = shiftDay(k, -1);
  }
  return n;
}

export function bestStreak(sessions) {
  const days = [...new Set(sessions.filter((s) => s.completed).map((s) => dayKeyOf(s.end || s.start)))].sort();
  let best = 0;
  let cur = 0;
  let prev = null;
  for (const d of days) {
    cur = prev && shiftDay(prev, 1) === d ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
}

export { shiftDay };
