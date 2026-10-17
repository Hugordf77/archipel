// Modèle de sauvegarde d'Archipel (version 2 ; la version 1 était « Île d'étude »).
// Horodatages : millisecondes epoch. Jours : chaînes locales « YYYY-MM-DD ».

import { defaultAvatar, sanitizeAvatar, sanitizeWardrobe, STARTER } from '../entities/character/avatar.js';
import { GEN_VERSION, islandsInRange } from '../world/islands/regions.js';

export const SAVE_VERSION = 2;

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dayKeyOf(ts) {
  return todayKey(new Date(ts));
}

// Graine lisible du monde (« coquille-azur-4821 »)
const SEED_A = ['coquille', 'corail', 'lagon', 'embrun', 'phare', 'mouette', 'brise', 'galet', 'ressac', 'algue', 'perle', 'ancre'];
const SEED_B = ['azur', 'nacre', 'ambre', 'menthe', 'lilas', 'corail', 'sable', 'brume', 'aube', 'lune', 'opale', 'soleil'];
export function randomSeed() {
  const pick = (l) => l[Math.floor(Math.random() * l.length)];
  return `${pick(SEED_A)}-${pick(SEED_B)}-${1000 + Math.floor(Math.random() * 9000)}`;
}

export function createDefaultState() {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    // monde : graine (tout l'archipel en découle) et nom
    world: { seed: randomSeed(), name: 'Mon archipel', createdAt: now, genVersion: GEN_VERSION },
    // position absolue du joueur (l'origine flottante est gérée au rendu)
    player: { name: 'Mochi', x: 0, z: 4.5 },
    shells: 10,
    shellsEarned: 10,
    settings: {
      quality: 'medium',
      curvature: 1,
      paint: 1,
      outline: 1,
      paper: 0.85,
      weather: 'auto',
      season: 'auto',
      timeMode: 'real',
      timeOverride: 12,
      volumes: { master: 0.8, ambience: 0.7, nature: 0.6, weather: 0.6, sfx: 0.8, music: 0.25 },
      pad: { rumble: true, stepRumble: true, invertY: false, sensitivity: 1 },
      motion: { profile: 'realiste', shake: true },
    },
    inventory: {}, // décorations achetées, pas encore posées
    bag: [], // barre rapide + sac de ressources
    decor: [],
    collect: { day: '', taken: [], totals: {} },
    // éléments marins uniques déjà récupérés ; le reste est recalculé par graine
    marine: { taken: [] },
    intro: false,
    // apparence du joueur et garde-robe possédée
    avatar: defaultAvatar(),
    wardrobe: [...STARTER],
    avatarIntro: false,
    // exploration : îles découvertes, distance parcourue, brouillard levé de la carte
    explorer: { islands: {}, distance: 0, fog: {}, pins: [], pois: {}, animals: {} },
    // différences par rapport au monde généré : récoltes (identifiants stables), terrassements, coffres ouverts
    harvest: {},
    terra: {},
    opened: {},
    // bateau : modèle actuel, flotte possédée, mouillage (absolu)
    boat: { type: 'radeau', owned: ['radeau'], x: null, z: null, heading: 0 },
    sailTips: false,
  };
}

// Ce qui relevait de l'ancienne « Île d'étude » : conservé intact, plus utilisé
const LEGACY_KEYS = ['subjects', 'sessions', 'plants', 'cards', 'reviewLog', 'tasks', 'timer', 'cycle', 'knowledge'];
const LEGACY_SETTINGS = ['focusMin', 'breakMin', 'longBreakMin', 'longBreakEvery', 'autoBreak', 'notifications', 'lastSubjectId'];

// Heures d'étude de l'ancienne version (les fleurs qu'elles ont fait pousser restent)
export function legacyHours(state) {
  const sessions = state.legacy?.sessions;
  if (!Array.isArray(sessions)) return 0;
  return sessions.reduce((a, s) => a + (s.minutes || 0), 0) / 60;
}

// Complète une sauvegarde ancienne ou partielle avec les valeurs par défaut
export function migrate(raw) {
  const base = createDefaultState();
  if (!raw || typeof raw !== 'object') return base;
  const s = { ...base, ...raw };
  // données d'étude rangées dans legacy, sans rien effacer
  if (raw.legacy && typeof raw.legacy === 'object') s.legacy = raw.legacy;
  else {
    const legacy = {};
    for (const k of LEGACY_KEYS) if (k in raw) legacy[k] = raw[k];
    const ls = {};
    for (const k of LEGACY_SETTINGS) if (raw.settings && k in raw.settings) ls[k] = raw.settings[k];
    if (Object.keys(ls).length) legacy.settings = ls;
    if (Object.keys(legacy).length) s.legacy = { ...legacy, archivedAt: Date.now() };
  }
  for (const k of LEGACY_KEYS) delete s[k];
  s.settings = { ...base.settings, ...(raw.settings || {}) };
  for (const k of LEGACY_SETTINGS) delete s.settings[k];
  s.settings.volumes = { ...base.settings.volumes, ...((raw.settings || {}).volumes || {}) };
  s.settings.pad = { ...base.settings.pad, ...((raw.settings || {}).pad || {}) };
  s.settings.motion = { ...base.settings.motion, ...((raw.settings || {}).motion || {}) };
  s.world = raw.world && typeof raw.world.seed === 'string' ? { ...base.world, ...raw.world } : base.world;
  // un monde existant garde sa version de générateur (1 si absente) : le jeu rattache ensuite le journal
  if (raw.world && typeof raw.world.seed === 'string') s.world.genVersion = raw.world.genVersion || 1;
  s.player = { ...base.player, ...(raw.player || {}) };
  s.collect = { ...base.collect, ...(raw.collect || {}) };
  const marine = raw.marine && typeof raw.marine === 'object' ? raw.marine : {};
  s.marine = { taken: Array.isArray(marine.taken) ? marine.taken : [] };
  const bo = raw.boat && typeof raw.boat === 'object' ? raw.boat : {};
  const BOAT_TYPES = ['radeau', 'barque', 'voilier', 'goelette'];
  const owned = Array.isArray(bo.owned) ? bo.owned.filter((t) => BOAT_TYPES.includes(t)) : [];
  if (!owned.includes('radeau')) owned.unshift('radeau');
  s.boat = {
    type: owned.includes(bo.type) ? bo.type : 'radeau',
    owned,
    x: Number.isFinite(bo.x) ? bo.x : null,
    z: Number.isFinite(bo.z) ? bo.z : null,
    heading: Number.isFinite(bo.heading) ? bo.heading : 0,
  };
  const ex = raw.explorer && typeof raw.explorer === 'object' ? raw.explorer : {};
  s.explorer = {
    islands: ex.islands && typeof ex.islands === 'object' ? ex.islands : {},
    distance: Number.isFinite(ex.distance) ? ex.distance : 0,
    fog: ex.fog && typeof ex.fog === 'object' ? ex.fog : {},
    pins: Array.isArray(ex.pins) ? ex.pins : [],
    pois: ex.pois && typeof ex.pois === 'object' ? ex.pois : {},
    animals: ex.animals && typeof ex.animals === 'object' ? ex.animals : {},
  };
  // générateur d'îles plus ancien : les récoltes et terrassements visaient d'autres éléments
  const oldGen = (raw.world?.genVersion || 1) < GEN_VERSION;
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  s.harvest = oldGen ? {} : obj(raw.harvest);
  s.terra = oldGen ? {} : obj(raw.terra);
  s.opened = obj(raw.opened);
  if (!Array.isArray(s.decor)) s.decor = [];
  if (typeof s.inventory !== 'object' || !s.inventory) s.inventory = {};
  s.bag = Array.isArray(raw.bag) ? raw.bag : [];
  // anciennes sauvegardes (ourson) : look par défaut, garde-robe de départ
  s.avatar = sanitizeAvatar(raw.avatar);
  s.wardrobe = sanitizeWardrobe(raw.wardrobe, s.avatar);
  s.avatarIntro = raw.avatarIntro === true;
  s.version = SAVE_VERSION;
  return s;
}

// Ancienne génération d'îles : chaque île notée au journal est rattachée à la nouvelle île la plus
// proche (à moins de 60 m), puis la sauvegarde passe à la génération courante. Renvoie true si
// quelque chose a changé.
export function relinkDiscoveries(state) {
  const ex = state.explorer;
  if ((state.world.genVersion || 1) >= GEN_VERSION) return false;
  const next = {};
  for (const rec of Object.values(ex.islands)) {
    const near = islandsInRange(state.world.seed, rec.x, rec.z, 60).sort((a, b) => Math.hypot(a.x - rec.x, a.z - rec.z) - Math.hypot(b.x - rec.x, b.z - rec.z))[0];
    if (near && !next[near.id]) next[near.id] = { ...rec, name: near.name, biome: near.biome, archetype: near.archetype, x: Math.round(near.x), z: Math.round(near.z), r: Math.round(near.r), pois: [], animals: [] };
  }
  ex.islands = next;
  state.world.genVersion = GEN_VERSION;
  return true;
}

// Vérification minimale d'un fichier importé
export function validateImport(obj) {
  if (!obj || typeof obj !== 'object') return 'Fichier illisible.';
  if (!['archipel', 'ile-etude'].includes(obj.app) || !obj.data || typeof obj.data !== 'object') return "Ce fichier ne vient pas d'Archipel.";
  return null;
}
