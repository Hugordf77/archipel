// Minuteur Pomodoro fondé sur des horodatages (Date.now), jamais sur requestAnimationFrame :
// il reste exact onglet caché, et une session terminée pendant l'absence est
// simplement validée au retour (la plante attend, rien ne se perd).

// Petit worker inline : ses minuteries ne sont pas bridées comme celles de la page
// en arrière-plan, il prévient donc à l'heure pile.
const WORKER_SRC = `
let t = null;
self.onmessage = (e) => {
  const m = e.data;
  if (t) { clearTimeout(t); t = null; }
  if (m && m.type === 'schedule') {
    const delay = Math.max(0, m.at - Date.now());
    t = setTimeout(() => self.postMessage({ type: 'due', at: m.at }), delay);
  }
};
`;

export class Pomodoro {
  constructor(timerState, { onComplete, onTick } = {}) {
    this.s = timerState;
    this.onComplete = onComplete;
    this.onTick = onTick;
    try {
      const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
      this.worker = new Worker(url);
      this.worker.onmessage = () => this.tick();
    } catch {
      this.worker = null;
    }
    this.fallback = null;
    // filet de sécurité : vérification régulière (aussi utile pour le titre de l'onglet)
    this.interval = setInterval(() => this.tick(), 1000);
    this.schedule();
  }

  get phase() {
    return this.s.phase || 'idle';
  }

  get active() {
    return this.phase === 'focus' || this.phase === 'break';
  }

  get paused() {
    return this.active && this.s.pausedAt != null;
  }

  remaining(now = Date.now()) {
    if (!this.active) return 0;
    if (this.paused) return this.s.remainingMs;
    return Math.max(0, this.s.endsAt - now);
  }

  total() {
    return (this.s.plannedMin || 1) * 60000;
  }

  progress(now = Date.now()) {
    if (!this.active) return 0;
    return 1 - this.remaining(now) / this.total();
  }

  elapsedMinutes(now = Date.now()) {
    if (!this.active) return 0;
    return (this.total() - this.remaining(now)) / 60000;
  }

  start(phase, minutes, extra = {}) {
    const now = Date.now();
    Object.assign(this.s, {
      phase,
      plannedMin: minutes,
      startedAt: now,
      endsAt: now + minutes * 60000,
      pausedAt: null,
      remainingMs: null,
      ...extra,
    });
    this.schedule();
  }

  pause() {
    if (!this.active || this.paused) return;
    this.s.remainingMs = Math.max(0, this.s.endsAt - Date.now());
    this.s.pausedAt = Date.now();
    this.schedule();
  }

  resume() {
    if (!this.paused) return;
    this.s.endsAt = Date.now() + this.s.remainingMs;
    this.s.pausedAt = null;
    this.s.remainingMs = null;
    this.schedule();
  }

  // Arrêt volontaire : renvoie les infos de la phase interrompue
  stop() {
    const info = { ...this.s, elapsedMin: this.elapsedMinutes() };
    this.reset();
    return info;
  }

  reset() {
    for (const k of Object.keys(this.s)) delete this.s[k];
    this.s.phase = 'idle';
    this.schedule();
  }

  schedule() {
    const at = this.active && !this.paused ? this.s.endsAt : null;
    if (this.worker) this.worker.postMessage(at ? { type: 'schedule', at } : { type: 'cancel' });
    if (this.fallback) clearTimeout(this.fallback);
    this.fallback = at ? setTimeout(() => this.tick(), Math.max(0, at - Date.now()) + 50) : null;
  }

  tick() {
    if (!this.active) {
      this.onTick?.(this);
      return;
    }
    if (!this.paused && Date.now() >= this.s.endsAt) {
      const finished = { ...this.s, elapsedMin: this.s.plannedMin, completedAt: Date.now() };
      this.reset();
      this.onComplete?.(finished);
    }
    this.onTick?.(this);
  }
}

// Notifications système (permission demandée au premier lancement d'une session)
export async function ensureNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

export function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, { body, tag: 'ile-etude', renotify: true, silent: false });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* certains navigateurs exigent un service worker : on ignore */
  }
}
