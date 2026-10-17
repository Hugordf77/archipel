// Placement des îles : grille de régions de 512 m, 0 à 2 îles par région,
// au moins 250 m entre deux îles, rien trop près de l'île de départ, et trois
// îles garanties (biomes différents) entre 300 et 600 m pour accrocher le joueur.
// Module pur et déterministe (mêmes graine → mêmes îles, quelle que soit la requête).
import { hashString, hash3, mulberry32, weighted } from './random.js';
import { makeNoise } from './noise.js';
import { BIOME_IDS, biomeWeight, climateFactor } from './biomes.js';
import { islandName, islandNameV2 } from './names.js';
import { rankArchetypes, islandTraits } from './archetypes.js';

// Version du générateur : enregistrée dans la sauvegarde (les différences liées à
// une ancienne génération — récoltes, terrassements — sont abandonnées proprement)
export const GEN_VERSION = 2;

export const REGION = 512;
export const HOME_CLEAR = 300; // aucune île générée à moins de 300 m de l'île de départ
export const MIN_GAP = 250; // distance minimale entre deux centres d'îles
export const NEIGHBOR_RANGE = 700; // deux îles plus proches n'ont jamais le même archétype
export const BIG_CHANCE = 0.034; // une grande île (300 à 480 m) par ~24 régions
export const HOME_RADIUS = 34; // l'île de départ (dessinée à la main) occupe ce disque

export const seedInt = (seed) => (typeof seed === 'number' ? seed >>> 0 : hashString(String(seed)));

const climateCache = new Map();
function climate(si) {
  let c = climateCache.get(si);
  if (!c) {
    c = { t: makeNoise(si ^ 0x7e3a1c55), h: makeNoise(si ^ 0x2b9d4e81) };
    climateCache.set(si, c);
  }
  return c;
}

function chooseBiome(si, x, z, dist, rng) {
  const c = climate(si);
  const t = c.t(x / 5200, z / 5200);
  const h = c.h(x / 4300 + 17.3, z / 4300 - 9.1);
  return weighted(rng, BIOME_IDS.map((id) => [id, biomeWeight(id, dist) * climateFactor(id, t, h)]));
}

function describe(si, id, x, z, r, biome, extra = {}) {
  const seed = hash3(si, Math.round(x * 8), Math.round(z * 8));
  return { id, x, z, r, biome, seed, name: islandName(biome, r, seed), dist: Math.hypot(x, z), ...extra };
}

// trois îles garanties autour de l'île de départ, de biomes différents
const guaranteedCache = new Map();
export function guaranteedIslands(si) {
  let g = guaranteedCache.get(si);
  if (g) return g;
  const rng = mulberry32(hash3(si, 0x47554152, 0x414e5445));
  const biomes = ['prairie', 'pins', 'tropical'];
  for (let i = biomes.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [biomes[i], biomes[j]] = [biomes[j], biomes[i]];
  }
  const a0 = rng() * Math.PI * 2;
  g = biomes.map((biome, i) => {
    const a = a0 + (i * Math.PI * 2) / 3 + (rng() - 0.5) * 0.5;
    let r = 46 + rng() * 30;
    const d = 330 + rng() * 200 + r * 0.3;
    // la prairie garantie est un village avec son moulin
    const extra = { guaranteed: true, priority: -1 };
    if (biome === 'prairie') {
      r = Math.max(r, 62);
      extra.forceArchetype = 'village';
    }
    return describe(si, `g${i}`, Math.cos(a) * d, Math.sin(a) * d, r, biome, extra);
  });
  // une vraie montagne à moins de 1,5 km du départ
  const am = rng() * Math.PI * 2;
  const dm = 880 + rng() * 360;
  const rm = 112 + rng() * 28;
  g.push(describe(si, 'g3', Math.cos(am) * dm, Math.sin(am) * dm, rm, 'pins', { guaranteed: true, priority: -1, forceArchetype: 'montagne', big: true }));
  guaranteedCache.set(si, g);
  return g;
}

// candidats bruts d'une région (avant résolution des conflits)
const candCache = new Map();
function candidates(si, rx, rz) {
  const key = `${si}:${rx}:${rz}`;
  let list = candCache.get(key);
  if (list) return list;
  const rng = mulberry32(hash3(si, rx, rz));
  const roll = rng();
  const count = roll < 0.16 ? 0 : roll < 0.78 ? 1 : 2;
  list = [];
  for (let k = 0; k < count; k++) {
    const x = rx * REGION + 70 + rng() * (REGION - 140);
    const z = rz * REGION + 70 + rng() * (REGION - 140);
    const r = 30 + Math.pow(rng(), 1.7) * 100; // 60 à 260 m de diamètre
    const priority = rng();
    const dist = Math.hypot(x, z);
    if (dist < HOME_CLEAR + r) continue;
    const biome = chooseBiome(si, x, z, dist, rng);
    list.push(describe(si, `${rx}_${rz}_${k}`, x, z, r, biome, { priority }));
  }
  // grandes îles (300 à 480 m) : tirage séparé pour ne pas déplacer les autres îles
  const brng = mulberry32(hash3(si ^ 0x0b16b16, rx, rz));
  if (brng() < BIG_CHANCE) {
    const r = 150 + brng() * 90;
    const x = rx * REGION + 60 + brng() * (REGION - 120);
    const z = rz * REGION + 60 + brng() * (REGION - 120);
    const dist = Math.hypot(x, z);
    if (dist > HOME_CLEAR + r + 200) {
      const biome = chooseBiome(si, x, z, dist, brng);
      list.push(describe(si, `${rx}_${rz}_G`, x, z, r, biome, { priority: -0.5 + brng() * 0.1, big: true }));
    }
  }
  if (candCache.size > 4000) candCache.clear();
  candCache.set(key, list);
  return list;
}

export const minGap = (a, b) => Math.max(MIN_GAP, a.r + b.r + 90);

// îles définitives d'une région : un candidat cède la place à un voisin trop proche
// de priorité plus forte (les îles garanties gagnent toujours)
const finalCache = new Map();
export function regionIslands(seed, rx, rz) {
  const si = seedInt(seed);
  const key = `${si}:${rx}:${rz}`;
  let out = finalCache.get(key);
  if (out) return out;
  const near = [];
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) near.push(...candidates(si, rx + dx, rz + dz));
  const guaranteed = guaranteedIslands(si);
  near.push(...guaranteed);
  const own = candidates(si, rx, rz).filter((a) => !near.some((b) => b !== a && b.priority < a.priority && Math.hypot(a.x - b.x, a.z - b.z) < minGap(a, b)));
  // les îles garanties appartiennent à la région qui contient leur centre
  for (const g of guaranteed) if (Math.floor(g.x / REGION) === rx && Math.floor(g.z / REGION) === rz) own.push(g);
  out = own;
  if (finalCache.size > 4000) finalCache.clear();
  finalCache.set(key, out);
  return out;
}

// îles « brutes » (sans archétype) dont le disque touche le cercle (x, z, range)
export function rawIslandsInRange(seed, x, z, range) {
  const out = [];
  const r0x = Math.floor((x - range - 140) / REGION);
  const r1x = Math.floor((x + range + 140) / REGION);
  const r0z = Math.floor((z - range - 140) / REGION);
  const r1z = Math.floor((z + range + 140) / REGION);
  for (let rx = r0x; rx <= r1x; rx++) {
    for (let rz = r0z; rz <= r1z; rz++) {
      for (const isl of regionIslands(seed, rx, rz)) if (Math.hypot(isl.x - x, isl.z - z) < range + isl.r) out.push(isl);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Archétypes : chaque île prend le premier de ses archétypes préférés qui n'est
// pas déjà celui d'une voisine plus « forte » (priorité plus basse). Le résultat ne
// dépend pas de l'ordre des requêtes (mémoïsation, chaîne de priorités finie).
const archCache = new Map();
// les îles à archétype imposé passent avant toutes les autres
const rank = (d) => (d.forceArchetype ? -2 : d.priority);
const stronger = (a, b) => rank(a) < rank(b) || (rank(a) === rank(b) && a.id < b.id);
export function archetypeOf(seed, desc) {
  const si = seedInt(seed);
  const key = `${si}:${desc.id}`;
  let a = archCache.get(key);
  if (a) return a;
  if (desc.forceArchetype) a = desc.forceArchetype;
  else {
    const taken = new Set();
    for (const n of rawIslandsInRange(seed, desc.x, desc.z, NEIGHBOR_RANGE)) {
      if (n.id === desc.id || Math.hypot(n.x - desc.x, n.z - desc.z) > NEIGHBOR_RANGE) continue;
      if (stronger(n, desc)) taken.add(archetypeOf(seed, n));
    }
    const ranked = rankArchetypes(desc);
    a = ranked.find((id) => !taken.has(id)) || ranked[0];
  }
  if (archCache.size > 20000) archCache.clear();
  archCache.set(key, a);
  return a;
}

// îles décorées : archétype, traits et nom
const decoCache = new Map();
export function decorate(seed, desc) {
  const key = `${seedInt(seed)}:${desc.id}`;
  let d = decoCache.get(key);
  if (d) return d;
  const archetype = archetypeOf(seed, desc);
  const traits = islandTraits(desc, archetype);
  d = { ...desc, archetype, traits, name: islandNameV2(desc, traits) };
  if (decoCache.size > 20000) decoCache.clear();
  decoCache.set(key, d);
  return d;
}

export function islandsInRange(seed, x, z, range) {
  return rawIslandsInRange(seed, x, z, range).map((d) => decorate(seed, d));
}
