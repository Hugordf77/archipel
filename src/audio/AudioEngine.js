// Moteur audio Web Audio : ambiance et effets procéduraux, musique et certains sons en fichiers :
//   ambiance  : vagues, vent, cascade
//   nature    : oiseaux le jour, mouettes, grillons la nuit
//   météo     : pluie
//   effets    : « pop », coquillages, carillons, pas, arrosoir
//   musique   : piste Illumoria en boucle (boîte à musique de secours si le fichier est absent) ;
//               sur l'écran-titre, le thème au piano (pianoTitre.js), la piste du jeu attend
// Chaque canal a son propre volume, plus un volume général.
import { PianoTitre } from './pianoTitre.js';

export const CHANNELS = ['master', 'ambience', 'nature', 'weather', 'sfx', 'music'];
export const CHANNEL_LABELS = {
  master: 'Général',
  ambience: 'Vagues & vent',
  nature: 'Oiseaux & grillons',
  weather: 'Pluie',
  sfx: 'Effets',
  music: 'Musique',
};

const PENTA = [0, 2, 4, 7, 9]; // gamme pentatonique majeure
const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);

export class AudioEngine {
  constructor(volumes) {
    this.volumes = { ...volumes };
    this.ctx = null;
    this.muted = false;
    this.info = { coast: 0.5, waterfall: 0, night: 0, rain: 0, wind: 0.5, focus: false };
    this.timers = { bird: 2, gull: 12, cricket: 1, note: 1, pad: 2, drop: 0, step: 0 };
    this.wavePhase = 0;
    this.waveCrash = 0;
    this.grassFootstepBuffer = null;
    this.grassFootstepLoading = false;
    this.backgroundMusicBuffer = null;
    this.backgroundMusicSource = null;
    this.backgroundMusicLoading = false;
    this.jumpBuffer = null;
    this.jumpSoundLoading = false;
    // écran-titre : la musique du jeu attend la fin du titre (libererMusique), le thème joue
    this.musiqueRetenue = false;
    this.fonduMusique = 0;
    this.theme = null;
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  // Doit être appelé depuis un geste utilisateur (politique d'autoplay)
  resume() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().then(() => this.startBackgroundMusic());
    else this.startBackgroundMusic();
  }

  init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = new AC();
    this.ctx = c;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    comp.connect(c.destination);
    this.out = c.createGain();
    this.out.connect(comp);
    this.bus = {};
    for (const ch of CHANNELS) {
      if (ch === 'master') continue;
      const g = c.createGain();
      g.connect(this.out);
      this.bus[ch] = g;
    }
    // réverbération douce partagée
    this.reverb = c.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.6, 2.4);
    this.reverbOut = c.createGain();
    this.reverbOut.gain.value = 0.35;
    this.reverb.connect(this.reverbOut);
    this.reverbOut.connect(this.out);
    this.sendFx = c.createGain();
    this.sendFx.gain.value = 0.5;
    this.sendFx.connect(this.reverb);

    // bruits en boucle
    this.noise = { white: this.makeNoise('white'), pink: this.makeNoise('pink'), brown: this.makeNoise('brown') };
    this.buildAmbience();
    this.applyVolumes();
    this.loadGrassFootstep();
    this.loadBackgroundMusic();
    this.loadJumpSound();
  }

  async loadJumpSound() {
    if (!this.ctx || this.jumpBuffer || this.jumpSoundLoading) return;
    const ctx = this.ctx;
    this.jumpSoundLoading = true;
    try {
      const response = await fetch('/audio/jump.m4a');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const encoded = await response.arrayBuffer();
      const decoded = await ctx.decodeAudioData(encoded);
      if (this.ctx === ctx) this.jumpBuffer = decoded;
    } catch (error) {
      console.warn('Son de saut indisponible ; utilisation du son synthétique de secours.', error);
    } finally {
      this.jumpSoundLoading = false;
    }
  }

  async loadBackgroundMusic() {
    if (!this.ctx || this.backgroundMusicBuffer || this.backgroundMusicLoading) return;
    const ctx = this.ctx;
    this.backgroundMusicLoading = true;
    try {
      const response = await fetch('/audio/Illumoria.mp3');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const encoded = await response.arrayBuffer();
      const decoded = await ctx.decodeAudioData(encoded);
      if (this.ctx !== ctx) return;
      this.backgroundMusicBuffer = decoded;
      this.startBackgroundMusic();
    } catch (error) {
      console.warn('Musique de fond indisponible ; utilisation de la boîte à musique de secours.', error);
    } finally {
      this.backgroundMusicLoading = false;
    }
  }

  startBackgroundMusic() {
    if (!this.ctx || !this.backgroundMusicBuffer || this.backgroundMusicSource || this.musiqueRetenue) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.backgroundMusicBuffer;
    source.loop = true;
    // entrée en fondu après l'écran-titre
    const fondu = this.ctx.createGain();
    const t = this.ctx.currentTime;
    fondu.gain.setValueAtTime(this.fonduMusique ? 0 : 1, t);
    if (this.fonduMusique) fondu.gain.linearRampToValueAtTime(1, t + this.fonduMusique);
    source.connect(fondu);
    fondu.connect(this.bus.music);
    source.onended = () => {
      if (this.backgroundMusicSource === source) this.backgroundMusicSource = null;
    };
    source.start();
    this.backgroundMusicSource = source;
  }

  // ---------------------------------------------------------------------------
  // Écran-titre : la musique du jeu attend, le thème au piano joue en boucle
  retenirMusique() {
    this.musiqueRetenue = true;
  }

  jouerTheme() {
    if (!this.ctx) this.init();
    if (!this.ctx || this.theme) return;
    this.theme = new PianoTitre(this);
    this.theme.demarrer();
  }

  arreterTheme(fondu = 2.5) {
    this.theme?.arreter(fondu);
    this.theme = null;
  }

  // fin du titre : la musique du jeu entre en fondu (s)
  libererMusique(fondu = 4) {
    this.musiqueRetenue = false;
    this.fonduMusique = fondu;
    this.startBackgroundMusic();
  }

  async loadGrassFootstep() {
    if (!this.ctx || this.grassFootstepBuffer || this.grassFootstepLoading) return;
    const ctx = this.ctx;
    this.grassFootstepLoading = true;
    try {
      const response = await fetch('/audio/walking-grass.mp3');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const encoded = await response.arrayBuffer();
      const decoded = await ctx.decodeAudioData(encoded);
      if (this.ctx === ctx) this.grassFootstepBuffer = decoded;
    } catch (error) {
      // Le pas synthétique reste disponible si le fichier manque ou si le navigateur ne le décode pas.
      console.warn('Son de pas dans l’herbe indisponible ; utilisation du son de secours.', error);
    } finally {
      this.grassFootstepLoading = false;
    }
  }

  makeNoise(kind, seconds = 4) {
    const c = this.ctx;
    const len = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (kind === 'white') d[i] = w * 0.5;
        else if (kind === 'pink') {
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        } else {
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.5;
        }
      }
    }
    return buf;
  }

  makeImpulse(seconds, decay) {
    const c = this.ctx;
    const len = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  loop(buffer) {
    const s = this.ctx.createBufferSource();
    s.buffer = buffer;
    s.loop = true;
    s.loopStart = Math.random();
    s.start(0, Math.random() * buffer.duration);
    return s;
  }

  buildAmbience() {
    const c = this.ctx;
    const A = this.bus.ambience;
    // vagues : bruit brun filtré + écume
    const wave = this.loop(this.noise.brown);
    this.waveFilter = c.createBiquadFilter();
    this.waveFilter.type = 'lowpass';
    this.waveFilter.frequency.value = 500;
    this.waveGain = c.createGain();
    this.waveGain.gain.value = 0;
    wave.connect(this.waveFilter).connect(this.waveGain).connect(A);
    const foam = this.loop(this.noise.white);
    this.foamFilter = c.createBiquadFilter();
    this.foamFilter.type = 'bandpass';
    this.foamFilter.frequency.value = 2600;
    this.foamFilter.Q.value = 0.6;
    this.foamGain = c.createGain();
    this.foamGain.gain.value = 0;
    foam.connect(this.foamFilter).connect(this.foamGain).connect(A);
    // vent
    const wind = this.loop(this.noise.pink);
    this.windFilter = c.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 500;
    this.windFilter.Q.value = 0.8;
    this.windGain = c.createGain();
    this.windGain.gain.value = 0;
    wind.connect(this.windFilter).connect(this.windGain).connect(A);
    // cascade
    const fall = this.loop(this.noise.white);
    const ff = c.createBiquadFilter();
    ff.type = 'bandpass';
    ff.frequency.value = 1100;
    ff.Q.value = 0.5;
    this.fallGain = c.createGain();
    this.fallGain.gain.value = 0;
    fall.connect(ff).connect(this.fallGain).connect(A);
    // pluie
    const rain = this.loop(this.noise.pink);
    const rf = c.createBiquadFilter();
    rf.type = 'highpass';
    rf.frequency.value = 900;
    this.rainGain = c.createGain();
    this.rainGain.gain.value = 0;
    rain.connect(rf).connect(this.rainGain).connect(this.bus.weather);
    const rain2 = this.loop(this.noise.brown);
    const rf2 = c.createBiquadFilter();
    rf2.type = 'lowpass';
    rf2.frequency.value = 350;
    this.rainLowGain = c.createGain();
    this.rainLowGain.gain.value = 0;
    rain2.connect(rf2).connect(this.rainLowGain).connect(this.bus.weather);
  }

  // ---------------------------------------------------------------------------
  vol(ch) {
    const v = this.volumes[ch] ?? 0.7;
    return v * v;
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.out.gain.setTargetAtTime(this.muted ? 0 : this.vol('master'), t, 0.05);
    for (const ch of Object.keys(this.bus)) this.bus[ch].gain.setTargetAtTime(this.vol(ch), t, 0.05);
  }

  setVolume(ch, v) {
    this.volumes[ch] = v;
    this.applyVolumes();
  }

  setMuted(m) {
    this.muted = m;
    this.applyVolumes();
  }

  // ---------------------------------------------------------------------------
  // Mise à jour continue de l'ambiance (appelée à chaque image)
  update(dt, info) {
    Object.assign(this.info, info);
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime;
    const I = this.info;
    // houle : cycle lent, déferlement au sommet
    this.wavePhase += dt / 7.5;
    const ph = this.wavePhase % 1;
    const swell = Math.pow(Math.sin(ph * Math.PI), 2);
    const near = 0.25 + I.coast * 0.75;
    this.waveGain.gain.setTargetAtTime((0.12 + swell * 0.28) * near, t, 0.25);
    // au large, la houle est plus sourde et plus ample
    const deep = I.deep || 0;
    this.waveFilter.frequency.setTargetAtTime((300 + swell * 650) * (1 - deep * 0.45), t, 0.3);
    if (ph > 0.55 && ph < 0.62) this.waveCrash = 1;
    this.waveCrash = Math.max(0, this.waveCrash - dt * 0.6);
    this.foamGain.gain.setTargetAtTime(this.waveCrash * 0.06 * near, t, 0.15);
    // vent qui respire
    const w = 0.55 + 0.45 * Math.sin(t * 0.13) * Math.sin(t * 0.071 + 1);
    this.windGain.gain.setTargetAtTime((0.025 + w * 0.05) * (0.6 + I.wind * 0.8) * (1 + I.rain * 0.5) * (I.sailing ? 1.7 : 1), t, 0.5);
    this.windFilter.frequency.setTargetAtTime(380 + w * 520, t, 0.6);
    this.fallGain.gain.setTargetAtTime(I.waterfall * 0.16, t, 0.3);
    this.rainGain.gain.setTargetAtTime(I.rain * 0.16, t, 0.6);
    this.rainLowGain.gain.setTargetAtTime(I.rain * 0.2, t, 0.6);

    // événements ponctuels
    const day = 1 - I.night;
    const T = this.timers;
    T.bird -= dt;
    if (T.bird <= 0) {
      T.bird = rand(1.6, 6) / Math.max(0.2, day);
      if (day > 0.4 && I.rain < 0.5) this.birdSong();
    }
    T.gull -= dt;
    if (T.gull <= 0) {
      T.gull = rand(14, 40);
      if (day > 0.5 && I.coast > 0.3) this.gullCall();
    }
    T.cricket -= dt;
    if (T.cricket <= 0) {
      T.cricket = rand(0.35, 1.3);
      if (I.night > 0.5) this.cricket();
    }
    if (I.rain > 0.05) {
      T.drop -= dt;
      if (T.drop <= 0) {
        T.drop = rand(0.02, 0.18) / I.rain;
        this.raindrop();
      }
    }
    T.note -= dt;
    if (T.note <= 0) {
      T.note = rand(0.7, 1.6) * (I.night > 0.5 ? 1.5 : 1);
      if (!this.backgroundMusicBuffer && !this.musiqueRetenue && this.vol('music') > 0.001) this.musicNote();
    }
    T.pad -= dt;
    if (T.pad <= 0) {
      T.pad = 9;
      if (!this.backgroundMusicBuffer && !this.musiqueRetenue && this.vol('music') > 0.001) this.musicPad();
    }
  }

  // ---------------------------------------------------------------------------
  // Synthèse
  env(gainNode, t0, peak, attack, decay) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(peak, t0 + attack);
    g.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }

  tone(freq, { type = 'sine', t0 = this.ctx.currentTime, peak = 0.1, attack = 0.005, decay = 0.3, dest = this.bus.sfx, send = 0, glide = null, pan = 0 } = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t0 + attack + decay * 0.6);
    const g = c.createGain();
    this.env(g, t0, peak, attack, decay);
    let node = o.connect(g);
    if (pan && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = pan;
      node = node.connect(p);
    }
    node.connect(dest);
    if (send) {
      const s = c.createGain();
      s.gain.value = send;
      node.connect(s).connect(this.sendFx);
    }
    o.start(t0);
    o.stop(t0 + attack + decay + 0.05);
  }

  noiseBurst({ t0 = this.ctx.currentTime, type = 'bandpass', freq = 1000, q = 1, peak = 0.05, attack = 0.005, decay = 0.08, dest = this.bus.sfx, kind = 'white', pan = 0, sweep = null } = {}) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise[kind];
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    // balayage du filtre (souffle de roulade, frottement qui s'éteint)
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t0 + attack + decay);
    f.Q.value = q;
    const g = c.createGain();
    this.env(g, t0, peak, attack, decay);
    let node = s.connect(f).connect(g);
    if (pan && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = pan;
      node = node.connect(p);
    }
    node.connect(dest);
    s.start(t0, Math.random() * 2);
    s.stop(t0 + attack + decay + 0.05);
  }

  bell(freq, t0, peak = 0.08, decay = 1.6, send = 0.6) {
    // cloche douce : fondamentale + partiels inharmoniques
    this.tone(freq, { t0, peak, attack: 0.004, decay, send });
    this.tone(freq * 2.0, { t0, peak: peak * 0.35, attack: 0.003, decay: decay * 0.6, send });
    this.tone(freq * 3.01, { t0, peak: peak * 0.15, attack: 0.002, decay: decay * 0.35, send });
  }

  birdSong() {
    const t0 = this.ctx.currentTime + 0.02;
    const base = rand(2300, 4200);
    const notes = 2 + Math.floor(Math.random() * 4);
    const pan = rand(-0.7, 0.7);
    for (let i = 0; i < notes; i++) {
      const f = base * (1 + (Math.random() - 0.5) * 0.25);
      this.tone(f, { t0: t0 + i * rand(0.08, 0.14), peak: 0.035, attack: 0.01, decay: 0.07, glide: f * rand(1.15, 1.45), dest: this.bus.nature, send: 0.4, pan });
    }
  }

  gullCall() {
    const c = this.ctx;
    const t0 = c.currentTime + 0.05;
    for (let i = 0; i < 2; i++) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      const s = t0 + i * 0.4;
      o.frequency.setValueAtTime(1050, s);
      o.frequency.exponentialRampToValueAtTime(680, s + 0.32);
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1400;
      f.Q.value = 2.5;
      const g = c.createGain();
      this.env(g, s, 0.018, 0.03, 0.3);
      o.connect(f).connect(g).connect(this.bus.nature);
      o.start(s);
      o.stop(s + 0.4);
    }
  }

  cricket() {
    const c = this.ctx;
    const t0 = c.currentTime + 0.02;
    const f = rand(4300, 4900);
    const pulses = 3 + Math.floor(Math.random() * 3);
    const pan = rand(-0.8, 0.8);
    for (let i = 0; i < pulses; i++) {
      this.tone(f, { t0: t0 + i * 0.045, peak: 0.012 * this.info.night, attack: 0.004, decay: 0.03, dest: this.bus.nature, pan });
    }
  }

  raindrop() {
    const t0 = this.ctx.currentTime;
    this.tone(rand(1800, 5000), { t0, peak: 0.012 * this.info.rain, attack: 0.001, decay: 0.03, dest: this.bus.weather, pan: rand(-0.9, 0.9) });
  }

  musicNote() {
    const night = this.info.night > 0.5;
    const root = night ? 60 : 67; // do4 la nuit, sol4 le jour
    const deg = PENTA[Math.floor(Math.random() * PENTA.length)];
    const oct = Math.random() < 0.3 ? 12 : 0;
    const f = midiToHz(root + deg + oct);
    if (Math.random() < 0.55) return; // laisser respirer : beaucoup de silences
    const t0 = this.ctx.currentTime + 0.02;
    this.tone(f, { t0, peak: 0.05, attack: 0.004, decay: 1.4, dest: this.bus.music, send: 0.5 });
    this.tone(f * 4.07, { t0, peak: 0.008, attack: 0.002, decay: 0.25, dest: this.bus.music, send: 0.3 });
  }

  musicPad() {
    const night = this.info.night > 0.5;
    const chords = night ? [[48, 55, 64], [45, 52, 60], [53, 57, 64]] : [[55, 59, 64], [52, 59, 64], [57, 60, 67], [53, 60, 64]];
    const ch = chords[Math.floor(Math.random() * chords.length)];
    const t0 = this.ctx.currentTime + 0.05;
    for (const m of ch) this.tone(midiToHz(m), { t0, peak: 0.02, attack: 2.5, decay: 6, dest: this.bus.music, send: 0.7 });
  }

  // ---------------------------------------------------------------------------
  // Effets d'interface et de jeu
  pop(pitch = 1) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    this.tone(320 * pitch, { t0, peak: 0.14, attack: 0.004, decay: 0.12, glide: 880 * pitch });
    this.tone(1200 * pitch, { t0: t0 + 0.01, peak: 0.03, attack: 0.002, decay: 0.05, type: 'triangle' });
  }

  // sons doux de l'inventaire : ouverture, fermeture, curseur, onglet, refus
  menu(kind = 'tick') {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    if (kind === 'open') {
      this.bell(587.33, t0, 0.035, 0.5, 0.4);
      this.bell(880, t0 + 0.06, 0.03, 0.6, 0.4);
    } else if (kind === 'close') {
      this.bell(880, t0, 0.03, 0.4, 0.3);
      this.bell(587.33, t0 + 0.06, 0.03, 0.5, 0.3);
    } else if (kind === 'tab') {
      this.tone(660, { t0, peak: 0.035, attack: 0.003, decay: 0.09, type: 'triangle', glide: 990 });
    } else if (kind === 'no') {
      this.tone(220, { t0, peak: 0.05, attack: 0.004, decay: 0.12, type: 'triangle', glide: 180 });
    } else {
      this.tone(1320, { t0, peak: 0.018, attack: 0.002, decay: 0.045, type: 'triangle' });
    }
  }

  coin() {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    this.bell(1318.5, t0, 0.06, 0.5, 0.3);
    this.bell(1760, t0 + 0.08, 0.06, 0.7, 0.3);
  }

  chime(kind = 'end') {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime + 0.05;
    if (kind === 'end') {
      // carillon doux de fin de session
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.bell(f, t0 + i * 0.2, 0.07, 2.6, 0.9));
      this.bell(261.63, t0, 0.04, 3.5, 0.8);
    } else if (kind === 'start') {
      [392, 523.25, 659.25].forEach((f, i) => this.bell(f, t0 + i * 0.14, 0.045, 1.4, 0.7));
    } else {
      [659.25, 783.99].forEach((f, i) => this.bell(f, t0 + i * 0.18, 0.05, 1.8, 0.8));
    }
  }

  water() {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime + 0.25;
    this.noiseBurst({ t0, freq: 1600, q: 0.8, peak: 0.07, attack: 0.15, decay: 0.9 });
    for (let i = 0; i < 6; i++) this.tone(rand(500, 900), { t0: t0 + 0.1 + i * 0.13, peak: 0.02, attack: 0.005, decay: 0.06, glide: rand(900, 1400) });
  }

  // --- navigation ---------------------------------------------------------
  creak(pitch = 1) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    this.tone(rand(85, 120) * pitch, { t0, type: 'sawtooth', peak: 0.025, attack: 0.08, decay: 0.45, glide: rand(130, 170) * pitch });
    this.noiseBurst({ t0: t0 + 0.05, freq: 700 * pitch, q: 4, peak: 0.02, attack: 0.05, decay: 0.3 });
  }

  splash(amount = 1) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    this.noiseBurst({ t0, type: 'lowpass', freq: 1400, q: 0.6, peak: 0.09 * amount, attack: 0.01, decay: 0.55, kind: 'pink' });
    for (let i = 0; i < 4; i++) this.tone(rand(600, 1000), { t0: t0 + 0.08 + i * 0.07, peak: 0.015 * amount, attack: 0.004, decay: 0.05, glide: rand(1000, 1500) });
  }

  bump() {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    this.tone(70, { t0, peak: 0.12, attack: 0.005, decay: 0.25, glide: 50 });
    this.noiseBurst({ t0, type: 'lowpass', freq: 500, peak: 0.05, decay: 0.2, kind: 'pink' });
  }

  // --- outils --------------------------------------------------------------
  chop() {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    this.tone(rand(200, 240), { t0, type: 'triangle', peak: 0.09, attack: 0.002, decay: 0.09 });
    this.noiseBurst({ t0, freq: 1800, q: 1.5, peak: 0.05, decay: 0.06 });
  }

  mine() {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    this.tone(rand(1500, 1900), { t0, type: 'triangle', peak: 0.05, attack: 0.001, decay: 0.18 });
    this.tone(rand(2500, 2900), { t0, type: 'sine', peak: 0.025, attack: 0.001, decay: 0.12 });
    this.noiseBurst({ t0, freq: 3000, q: 2, peak: 0.03, decay: 0.04 });
  }

  dig() {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    this.noiseBurst({ t0, type: 'lowpass', freq: 650, q: 0.7, peak: 0.08, attack: 0.01, decay: 0.16, kind: 'pink' });
  }

  plop() {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    this.tone(420, { t0, peak: 0.06, attack: 0.003, decay: 0.12, glide: 900 });
  }

  // --- locomotion -------------------------------------------------------------
  // dérapage : chuintement sur l'herbe, sifflement sur le sable, grincement sur le bois
  skid(surface = 'grass', amount = 1) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    const a = Math.min(1.3, amount);
    if (surface === 'wood') {
      this.tone(rand(820, 960), { t0, type: 'triangle', peak: 0.035 * a, attack: 0.01, decay: 0.3, glide: rand(520, 600) });
      this.noiseBurst({ t0, freq: 1400, q: 3, peak: 0.03 * a, attack: 0.01, decay: 0.25 });
    } else if (surface === 'sand') {
      this.noiseBurst({ t0, type: 'highpass', freq: 2600, q: 0.7, peak: 0.06 * a, attack: 0.015, decay: 0.32, sweep: 1400 });
    } else if (surface === 'shallow') {
      this.splash(0.7 * a);
    } else {
      this.noiseBurst({ t0, freq: 2200, q: 0.8, peak: 0.05 * a, attack: 0.012, decay: 0.3, sweep: 900, kind: 'pink' });
    }
  }

  // roulade : un souffle qui tourne, puis le « tchouc » de la réception
  roll(chain = 0) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    const up = 1 + Math.min(4, chain) * 0.08;
    this.noiseBurst({ t0, freq: 600 * up, q: 1.4, peak: 0.05, attack: 0.08, decay: 0.32, sweep: 1800 * up, kind: 'pink' });
    this.tone(95 * up, { t0: t0 + 0.42, peak: 0.08, attack: 0.004, decay: 0.12, glide: 60 });
    this.noiseBurst({ t0: t0 + 0.42, type: 'lowpass', freq: 700, peak: 0.04, decay: 0.1, kind: 'pink' });
    if (chain > 0) this.tone(520 * up, { t0, type: 'triangle', peak: 0.025, attack: 0.004, decay: 0.12, glide: 880 * up });
  }

  // main qui effleure le sol dans un virage serré : frottement bref et discret
  handBrush(surface = 'grass', v = 6) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    const a = Math.max(0.4, Math.min(1, v / 9));
    if (surface === 'shallow') {
      this.noiseBurst({ t0, type: 'highpass', freq: 1800, q: 0.6, peak: 0.022 * a, attack: 0.01, decay: 0.16 });
    } else if (surface === 'sand') {
      this.noiseBurst({ t0, type: 'highpass', freq: 3000, q: 0.7, peak: 0.024 * a, attack: 0.012, decay: 0.2, sweep: 1800 });
    } else if (surface === 'wood') {
      this.noiseBurst({ t0, freq: 1600, q: 2.2, peak: 0.018 * a, attack: 0.008, decay: 0.12 });
    } else {
      this.noiseBurst({ t0, freq: 2400, q: 0.9, peak: 0.02 * a, attack: 0.012, decay: 0.18, sweep: 1200, kind: 'pink' });
    }
  }

  // grimpe : « toc » boisé à l'accroche, plus sourd et plus fort avec la vitesse d'impact (m/s)
  woodKnock(impact = 3) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    const k = Math.max(0.4, Math.min(1.2, impact / 5));
    this.tone(420 - k * 60, { t0, type: 'triangle', peak: 0.05 + 0.03 * k, attack: 0.002, decay: 0.07, glide: 300 });
    this.tone(180, { t0, peak: 0.04 * k, attack: 0.002, decay: 0.09, glide: 140 });
    this.noiseBurst({ t0, freq: 1100, q: 3, peak: 0.02 * k, attack: 0.002, decay: 0.05 });
  }

  // grimpe : frottement d'écorce, rejoué par petits grains tant que l'on glisse (v en m/s)
  barkRub(v = 2) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    const a = Math.max(0.3, Math.min(1, v / 4));
    this.noiseBurst({ t0, freq: 700 + 500 * a, q: 1.4, peak: 0.016 * a, attack: 0.01, decay: 0.09, kind: 'pink' });
    this.noiseBurst({ t0: t0 + 0.02, type: 'highpass', freq: 2600, q: 0.7, peak: 0.006 * a, attack: 0.005, decay: 0.05 });
  }

  // herbe fauchée à l'épée : bruissement bref, plus fourni quand l'herbe était haute (amount 0 à 1)
  grassCut(amount = 1) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    const a = Math.max(0.3, Math.min(1, amount));
    this.noiseBurst({ t0, type: 'highpass', freq: 2600, q: 0.7, peak: 0.03 * a, attack: 0.006, decay: 0.14, sweep: 4200, kind: 'pink' });
    this.noiseBurst({ t0: t0 + 0.04, freq: 1500, q: 1.2, peak: 0.014 * a, attack: 0.01, decay: 0.1 });
  }

  // grimpe : bruissement des palmes au sommet
  palmRustle() {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      this.noiseBurst({ t0: t0 + i * 0.07, type: 'highpass', freq: 3200 - i * 400, q: 0.6, peak: 0.014, attack: 0.03, decay: 0.22, sweep: 1600, kind: 'pink' });
    }
  }

  hop(long = false) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    this.tone(long ? 260 : 320, { t0, type: 'triangle', peak: 0.05, attack: 0.004, decay: 0.12, glide: long ? 480 : 560 });
    this.noiseBurst({ t0, type: 'lowpass', freq: 900, peak: 0.025, decay: 0.06, kind: 'pink' });
  }

  jumpSound(long = false) {
    if (!this.ready) return;
    if (!this.jumpBuffer) {
      this.hop(long);
      return;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = this.jumpBuffer;
    source.playbackRate.value = long ? 1.04 : 1;
    source.connect(this.bus.sfx);
    source.start();
  }

  // « poc » d'atterrissage, plus sourd et plus fort avec l'impact
  land(impact = 5, surface = 'grass') {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    const k = Math.min(1.5, impact / 8);
    this.tone(90 - k * 20, { t0, peak: 0.05 + 0.06 * k, attack: 0.003, decay: 0.12 + 0.1 * k, glide: 50 });
    this.noiseBurst({ t0, type: 'lowpass', freq: surface === 'sand' ? 1100 : 700, peak: 0.03 + 0.04 * k, attack: 0.005, decay: 0.12 + 0.08 * k, kind: 'pink' });
  }

  bonk() {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    this.tone(180, { t0, type: 'triangle', peak: 0.08, attack: 0.003, decay: 0.35, glide: 420 });
    this.tone(260, { t0: t0 + 0.06, type: 'sine', peak: 0.04, attack: 0.003, decay: 0.25, glide: 200 });
    this.noiseBurst({ t0, type: 'lowpass', freq: 500, peak: 0.05, decay: 0.12, kind: 'pink' });
  }

  // trébucher : petit cri qui descend
  trip() {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    this.tone(520, { t0, type: 'triangle', peak: 0.05, attack: 0.01, decay: 0.22, glide: 260 });
    this.noiseBurst({ t0, freq: 1500, q: 1, peak: 0.02, attack: 0.01, decay: 0.12, kind: 'pink' });
  }

  // halètement discret après un long sprint
  pant() {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    this.noiseBurst({ t0, type: 'bandpass', freq: 1300, q: 1.2, peak: 0.012, attack: 0.03, decay: 0.12, kind: 'pink' });
    this.noiseBurst({ t0: t0 + 0.22, type: 'bandpass', freq: 1100, q: 1.2, peak: 0.009, attack: 0.03, decay: 0.14, kind: 'pink' });
  }

  step(surface, speed = 1, pan = 0) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    const v = 0.5 + speed * 0.5;
    if (surface === 'water') {
      this.noiseBurst({ t0, type: 'lowpass', freq: 900, q: 0.6, peak: 0.03 * v, attack: 0.02, decay: 0.2, kind: 'pink' });
      return;
    }
    if (surface === 'grass' && this.grassFootstepBuffer) {
      const source = this.ctx.createBufferSource();
      source.buffer = this.grassFootstepBuffer;
      source.playbackRate.value = Math.max(0.92, Math.min(1.08, 0.96 + Math.random() * 0.06 + Math.min(1.4, speed) * 0.025));
      const gain = this.ctx.createGain();
      const amount = Math.max(0, Math.min(1, speed / 1.4));
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.11 + amount * 0.07, t0 + 0.008);
      let node = source.connect(gain);
      if (pan && this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = pan;
        node = node.connect(panner);
      }
      node.connect(this.bus.sfx);
      source.start(t0);
      return;
    }
    if (surface === 'wood') {
      this.tone(rand(150, 190), { t0, peak: 0.06 * v, attack: 0.002, decay: 0.08, pan });
      this.noiseBurst({ t0, freq: 900, q: 1.2, peak: 0.02 * v, decay: 0.05, pan });
    } else if (surface === 'sand') {
      this.noiseBurst({ t0, type: 'lowpass', freq: 1100, q: 0.5, peak: 0.035 * v, attack: 0.01, decay: 0.09, kind: 'pink', pan });
    } else {
      this.noiseBurst({ t0, freq: rand(2200, 3200), q: 0.9, peak: 0.018 * v, attack: 0.01, decay: 0.07, pan });
    }
  }
}
