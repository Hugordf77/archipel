// Thème de l'écran-titre, « L'aube sur le plateau » : pièce originale pour piano seul, écrite pour
// l'Archipel (aucune reprise), en mi bémol majeur, à 3/4, noire à 72. Main gauche en arpèges de croches
// sous la pédale, main droite en phrases simples. Forme : introduction (2 mesures), A (8), A' (8),
// B (8, plus lyrique, vers sol majeur), A'' (6, mélodie doublée à l'octave), puis retour à
// l'introduction : la boucle dure environ 1 min 23 s.
//
// Partition et calcul des événements : purs (tests/titre.test.js). Voix de piano : synthèse additive
// en Web Audio (partiels légèrement inharmoniques, cordes doublées un peu désaccordées, extinction en
// deux temps, bruit de marteau, filtre qui se referme), réverbération de salle propre au thème. Sortie
// sur le canal « Musique » du moteur audio (volume réglable dans les Options).
import { mulberry32 } from '../core/random.js';

export const TEMPO = 72; // noires par minute
export const TEMPS = 3; // temps par mesure

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const hz = (m) => 440 * 2 ** ((m - 69) / 12);

// Accords de la main gauche : basse (temps 0) et arpège de cinq croches (temps 0,5 à 2,5). Voicings
// ouverts, en numéros MIDI (60 = do 4). Par défaut l'arpège monte sur les quatre notes et redescend d'une.
const arp = (a, b, c, d) => [a, b, c, d, c];
export const ACCORDS = {
  'Mib9': { basse: 39, arpege: arp(46, 53, 55, 58) }, // mi♭ – si♭ fa sol si♭
  'Sib/Re': { basse: 38, arpege: arp(46, 50, 53, 58) },
  'Dom9': { basse: 36, arpege: arp(43, 50, 51, 58) },
  'Labmaj7': { basse: 44, arpege: arp(51, 55, 60, 63) },
  'Mib/Sol': { basse: 43, arpege: arp(46, 51, 55, 58) },
  'Lab9': { basse: 44, arpege: arp(51, 56, 58, 60) },
  'Fam7': { basse: 41, arpege: arp(48, 51, 56, 60) },
  // quarte suspendue (mi♭) qui se résout sur ré en fin de mesure
  'Sibsus': { basse: 34, arpege: [41, 46, 51, 46, 50] },
  'Solm/Sib': { basse: 46, arpege: arp(50, 55, 58, 62) },
  'Sib7': { basse: 34, arpege: arp(41, 46, 50, 56) },
  'Sib': { basse: 34, arpege: arp(41, 46, 50, 53) },
  'Solm7': { basse: 43, arpege: arp(50, 53, 58, 62) },
  'Sib/Lab': { basse: 44, arpege: arp(46, 50, 53, 58) },
  'Solsus': { basse: 43, arpege: arp(48, 50, 55, 60) },
  // sol majeur (si bécarre) : dominante de do mineur, le seul emprunt hors de la gamme
  'Sol': { basse: 43, arpege: arp(47, 50, 55, 59) },
  'Dom': { basse: 36, arpege: arp(43, 48, 51, 55) },
  'Mib/Sib': { basse: 34, arpege: arp(46, 51, 55, 58) },
  'Mibfin': { basse: 39, arpege: [46, 51, 55, 58, 63] },
};

// Mesures : accord, mélodie [[temps, durée en temps, note MIDI, vélocité facultative]…], nuance
// (facteur de vélocité), ralenti (allonge la mesure en fin de phrase), doublure (mélodie doublée à
// l'octave inférieure, plus douce).
export const MESURES = [
  // introduction : la main gauche seule
  { accord: 'Mib9', nuance: 0.85 },
  { accord: 'Labmaj7', nuance: 0.85 },
  // A
  { accord: 'Mib9', melodie: [[0, 1.5, 79], [1.5, 0.5, 77], [2, 1, 75]] },
  { accord: 'Sib/Re', melodie: [[0, 2, 74], [2, 1, 70]] },
  { accord: 'Dom9', melodie: [[0, 1, 72], [1, 1, 75], [2, 1, 79]] },
  { accord: 'Labmaj7', melodie: [[0, 2.5, 79], [2.5, 0.5, 77]] },
  { accord: 'Mib/Sol', melodie: [[0, 1.5, 75], [1.5, 0.5, 77], [2, 1, 79]] },
  { accord: 'Lab9', melodie: [[0, 1, 80], [1, 1, 84], [2, 1, 82]] },
  { accord: 'Fam7', melodie: [[0, 1.5, 80], [1.5, 0.5, 79], [2, 1, 77]] },
  { accord: 'Sibsus', melodie: [[0, 1.5, 75], [1.5, 1.5, 74]], ralenti: 1.08 },
  // A'
  { accord: 'Mib9', melodie: [[0, 1.5, 82], [1.5, 0.5, 79], [2, 1, 75]] },
  { accord: 'Sib/Re', melodie: [[0, 1, 77], [1, 1, 74], [2, 1, 70]] },
  { accord: 'Dom9', melodie: [[0, 1.5, 72], [1.5, 0.5, 74], [2, 1, 75]] },
  { accord: 'Solm/Sib', melodie: [[0, 3, 74]] },
  { accord: 'Labmaj7', melodie: [[0, 1, 72], [1, 1, 75], [2, 1, 79]] },
  { accord: 'Mib/Sol', melodie: [[0, 2, 82], [2, 0.5, 80], [2.5, 0.5, 79]] },
  { accord: 'Fam7', melodie: [[0, 1, 77], [1, 1, 80], [2, 1, 84]] },
  { accord: 'Sib7', melodie: [[0, 2, 82], [2, 1, 80]], ralenti: 1.08 },
  // B : plus ample, vers sol majeur
  { accord: 'Labmaj7', nuance: 1.08, melodie: [[0, 1, 79], [1, 1, 84], [2, 1, 82]] },
  { accord: 'Sib', nuance: 1.08, melodie: [[0, 1, 77], [1, 2, 82]] },
  { accord: 'Solm7', nuance: 1.1, melodie: [[0, 1.5, 82], [1.5, 0.5, 79], [2, 1, 77]] },
  { accord: 'Dom9', nuance: 1.1, melodie: [[0, 1, 75], [1, 1, 79], [2, 1, 84]] },
  { accord: 'Lab9', nuance: 1.12, melodie: [[0, 1.5, 84], [1.5, 0.5, 82], [2, 1, 80]] },
  { accord: 'Sib/Lab', nuance: 1.08, melodie: [[0, 1, 80], [1, 2, 77]] },
  { accord: 'Solsus', nuance: 1.05, melodie: [[0, 2, 84], [2, 1, 86]] },
  { accord: 'Sol', nuance: 1, melodie: [[0, 3, 83]], ralenti: 1.1 },
  // A'' : la mélodie doublée à l'octave, puis l'apaisement
  { accord: 'Dom', nuance: 1.05, doublure: true, melodie: [[0, 1.5, 84], [1.5, 0.5, 79], [2, 1, 75]] },
  { accord: 'Lab9', nuance: 1.02, doublure: true, melodie: [[0, 1, 80], [1, 1, 79], [2, 1, 77]] },
  { accord: 'Mib/Sib', nuance: 0.98, doublure: true, melodie: [[0, 1.5, 79], [1.5, 0.5, 77], [2, 1, 75]] },
  { accord: 'Sib', nuance: 0.94, doublure: true, melodie: [[0, 2, 74], [2, 1, 77]], ralenti: 1.06 },
  { accord: 'Mib9', nuance: 0.88, melodie: [[0, 3, 75]] },
  { accord: 'Mibfin', nuance: 0.72, melodie: [[1, 2, 82, 0.34]], ralenti: 1.12 },
];

// Gamme de mi bémol majeur (classes de hauteur) : mi♭ fa sol la♭ si♭ do ré
export const GAMME = [3, 5, 7, 8, 10, 0, 2];

// Partition → événements datés (s) d'une boucle : { t, fin, midi, vel, voix }, triés ; duree : longueur
// de la boucle (s). La pédale change à chaque barre de mesure : toutes les notes d'une mesure tiennent
// jusqu'à la barre. Petites variations humaines de temps et de vélocité, tirées d'une graine (même
// partition → mêmes événements).
export function evenements(mesures = MESURES, { tempo = TEMPO, graine = 7 } = {}) {
  const rnd = mulberry32(graine);
  const jit = (s) => (rnd() * 2 - 1) * s;
  const noire = 60 / tempo;
  const out = [];
  let t = 0;
  for (const M of mesures) {
    const A = ACCORDS[M.accord];
    if (!A) throw new Error(`accord inconnu : ${M.accord}`);
    const n = M.nuance ?? 1;
    const pas = noire * (M.ralenti ?? 1);
    const fin = t + TEMPS * pas;
    const pedale = fin + 0.06;
    out.push({ t, fin: pedale, midi: A.basse, vel: 0.46 * n + jit(0.02), voix: 'basse' });
    A.arpege.forEach((m, k) => {
      out.push({ t: t + (k + 1) * 0.5 * pas + jit(0.008), fin: pedale, midi: m, vel: (k === 0 ? 0.34 : 0.29) * n + jit(0.025), voix: 'arpege' });
    });
    for (const [b, d, m, v] of M.melodie || []) {
      // la mélodie chante un rien après la main gauche
      const debut = t + b * pas + 0.012 + jit(0.006);
      const tenue = Math.max(debut + d * pas, pedale);
      const vel = (v ?? clamp(0.5 + (m - 72) / 60, 0.44, 0.7)) * n + jit(0.025);
      out.push({ t: debut, fin: tenue, midi: m, vel, voix: 'melodie' });
      if (M.doublure) out.push({ t: debut + 0.006, fin: tenue, midi: m - 12, vel: vel * 0.55, voix: 'doublure' });
    }
    t = fin;
  }
  for (const e of out) e.vel = clamp(e.vel, 0.05, 1);
  out.sort((a, b) => a.t - b.t);
  return { evenements: out, duree: t };
}

// Partiels d'une note de piano : fréquence (étirée par l'inharmonicité des cordes, plus forte dans
// l'aigu), amplitude relative (plus brillante quand on joue fort), constante d'extinction (s) : les
// graves tiennent longtemps, les partiels hauts s'éteignent vite.
export function partiels(midi, vel = 0.5) {
  const f0 = hz(midi);
  const B = Math.min(0.0012, 0.00008 * 2 ** ((midi - 48) / 13));
  const T = clamp(7.5 - (midi - 40) * 0.085, 1.6, 7.5);
  const eclat = clamp(0.5 + 0.38 * vel - (midi - 60) * 0.006, 0.28, 0.9);
  const out = [];
  for (let n = 1; n <= 6; n++) {
    const f = n * f0 * Math.sqrt(1 + B * n * n);
    if (f > 9000) break;
    // fondamentale plus discrète dans l'extrême grave, comme sur un vrai piano
    const a = n === 1 ? (midi < 45 ? 0.62 : 1) : (0.95 * eclat ** (n - 1)) / n ** 0.35;
    out.push({ n, f, a, tau: T / (4 * (1 + 0.5 * (n - 1))) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Voix et lecture en boucle
export class PianoTitre {
  // audio : le moteur (AudioEngine) : ctx, bus.music, noise.white, makeImpulse ; sortie : nœud de
  // destination (par défaut le canal « Musique »)
  constructor(audio, { partition = evenements(), sortie = null } = {}) {
    this.audio = audio;
    this.partition = partition;
    this.dest = sortie;
    this.actif = false;
    this.timer = 0;
  }

  // chaîne de sortie : sec + salle (pré-délai, convolution, réverbération adoucie)
  construire() {
    const a = this.audio;
    const c = a.ctx;
    this.sortie = c.createGain();
    this.sortie.gain.value = 0.85;
    this.sortie.connect(this.dest || a.bus.music);
    this.sec = c.createGain();
    this.sec.gain.value = 1;
    this.sec.connect(this.sortie);
    this.envoi = c.createGain();
    this.envoi.gain.value = 0.42;
    const pre = c.createDelay(0.1);
    pre.delayTime.value = 0.028;
    const salle = c.createConvolver();
    salle.buffer = a.makeImpulse(3.6, 2.8);
    const doux = c.createBiquadFilter();
    doux.type = 'lowpass';
    doux.frequency.value = 4800;
    this.envoi.connect(pre);
    pre.connect(salle);
    salle.connect(doux);
    doux.connect(this.sortie);
    this.noeuds = [this.sortie, this.sec, this.envoi, pre, salle, doux];
  }

  // une note : t0 (s, horloge du contexte), fin : levée de la pédale
  note(midi, t0, fin, vel) {
    const a = this.audio;
    const c = a.ctx;
    const f0 = hz(midi);
    const voix = c.createGain();
    voix.gain.value = 0.36 * vel ** 1.5;
    const filtre = c.createBiquadFilter();
    filtre.type = 'lowpass';
    filtre.Q.value = 0.5;
    filtre.frequency.setValueAtTime(Math.min(12000, f0 * (5 + 10 * vel)), t0);
    filtre.frequency.setTargetAtTime(Math.max(700, f0 * 2.5), t0 + 0.01, 0.7);
    const pan = c.createStereoPanner();
    pan.pan.value = clamp((midi - 60) / 60, -0.35, 0.35);
    filtre.connect(voix);
    voix.connect(pan);
    pan.connect(this.sec);
    pan.connect(this.envoi);
    const relache = midi < 48 ? 0.22 : 0.11;
    const arret = fin + relache * 6;
    const att = 0.003 + (1 - vel) * 0.004;
    for (const p of partiels(midi, vel)) {
      // deux cordes un peu désaccordées pour la fondamentale : battement lent
      const cordes = p.n === 1 ? [-0.8, 0.8] : [0];
      for (const cents of cordes) {
        const o = c.createOscillator();
        o.frequency.value = p.f;
        o.detune.value = cents;
        const g = c.createGain();
        const crete = p.a / cordes.length;
        const vif = Math.min(0.35, p.tau * 0.25);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(crete, t0 + att);
        // extinction en deux temps : son « prompt » rapide, puis longue résonance
        g.gain.setTargetAtTime(crete * 0.5, t0 + att, vif);
        g.gain.setTargetAtTime(0, t0 + att + vif * 2.5, p.tau);
        g.gain.setTargetAtTime(0, fin, relache);
        o.connect(g);
        g.connect(filtre);
        o.start(t0);
        // un partiel éteint (sous −60 dB) n'a plus besoin de tourner
        o.stop(Math.min(arret, t0 + att + vif * 2.5 + p.tau * 7));
      }
    }
    // marteau : souffle très bref, plus clair dans l'aigu
    const bruit = a.noise?.white;
    if (bruit) {
      const s = c.createBufferSource();
      s.buffer = bruit;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = Math.min(5000, f0 * 7);
      bp.Q.value = 0.9;
      const g = c.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.22 * vel, t0 + 0.001);
      g.gain.setTargetAtTime(0, t0 + 0.001, 0.012);
      s.connect(bp);
      bp.connect(g);
      g.connect(voix);
      s.start(t0, Math.random() * (bruit.duration - 0.2));
      s.stop(t0 + 0.12);
    }
  }

  // programme les notes dont le début tombe avant « horizon » (s, horloge du contexte)
  planifier(horizon) {
    const { evenements: E, duree } = this.partition;
    const maintenant = this.audio.ctx.currentTime;
    for (;;) {
      const e = E[this.index];
      const base = this.t0 + this.boucle * duree;
      if (base + e.t > horizon) break;
      // onglet longtemps caché : on saute ce qui est passé plutôt que de tout jouer d'un coup
      if (base + e.t >= maintenant - 0.05) this.note(e.midi, base + e.t, base + e.fin, e.vel);
      this.index++;
      if (this.index >= E.length) {
        this.index = 0;
        this.boucle++;
      }
    }
  }

  demarrer() {
    const c = this.audio.ctx;
    if (this.actif || !c) return;
    this.construire();
    this.actif = true;
    this.index = 0;
    this.boucle = 0;
    this.t0 = null;
    const tic = () => {
      if (c.state !== 'running') return;
      if (this.t0 === null) this.t0 = c.currentTime + 0.3;
      // 1,5 s d'avance : les minuteries d'un onglet caché ne tournent plus qu'une fois par seconde
      this.planifier(c.currentTime + 1.5);
    };
    this.timer = setInterval(tic, 60);
    tic();
  }

  // fondu de sortie (s), puis tout est débranché
  arreter(fondu = 2.5) {
    if (!this.actif) return;
    this.actif = false;
    const c = this.audio.ctx;
    this.sortie.gain.setTargetAtTime(0, c.currentTime, Math.max(0.05, fondu / 4));
    const timer = this.timer;
    const noeuds = this.noeuds;
    setTimeout(() => {
      clearInterval(timer);
      for (const n of noeuds) n.disconnect();
    }, fondu * 1000 + 400);
  }

  // rendu hors ligne (OfflineAudioContext) : programme d'un coup les notes de [0, duree] s
  toutPlanifier(duree) {
    this.construire();
    this.index = 0;
    this.boucle = 0;
    this.t0 = 0.05;
    this.planifier(duree);
  }
}
