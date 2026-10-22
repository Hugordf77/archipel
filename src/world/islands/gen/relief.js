// Passe 1a — relief de base (avant érosion), analytique : chaque archétype a sa
// silhouette (crêtes de montagne, anse portuaire, cratère, plateau à falaises,
// lobes jumeaux, dunes et oasis…). Aussi utilisé tel quel par la carte du jeu.
import { makeNoise, fbm, ridged } from '../../../core/noise.js';
import { mulberry32 } from '../../../core/random.js';
import { BIOMES } from '../biomes.js';
import { smooth, clamp } from './grid.js';
import { formeContext, formeHeight, formeHeightL, coastGrid } from './forme.js';

export const SEA_FLOOR = -16;
export const CELL = 4;

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz || 1e-9;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
  return [Math.hypot(px - (ax + dx * t), pz - (az + dz * t)), t];
}

// Contexte d'une île : bruits, disposition (crêtes, anse, colline du moulin…)
const cache = new Map();
export function reliefContext(desc) {
  const key = `${desc.id}:${desc.seed}:${desc.archetype}`;
  let c = cache.get(key);
  if (c) return c;
  // îles de la carte (open world) : silhouette et reliefs tracés à la main (forme.js)
  if (desc.forme) {
    c = formeContext(desc);
    if (cache.size > 64) cache.delete(cache.keys().next().value);
    cache.set(key, c);
    return c;
  }
  const s = desc.seed;
  const rng = mulberry32(s ^ 0x5eed12e1);
  const arch = desc.archetype || 'foret';
  const biome = BIOMES[desc.biome] || BIOMES.prairie;
  const r = desc.r;
  const ext = r * 1.38;
  c = {
    desc,
    arch,
    biome,
    r,
    ext,
    n: Math.ceil((2 * ext) / CELL) + 1,
    n1: makeNoise(s ^ 0x11111111),
    n2: makeNoise(s ^ 0x22222222),
    n3: makeNoise(s ^ 0x33333333),
    n4: makeNoise(s ^ 0x44444444),
    n5: makeNoise(s ^ 0x55555555),
    n6: makeNoise(s ^ 0x66666666),
    bw: biome.beach,
    edgeAmp: arch === 'falaises' ? 1.4 : arch === 'lagon' ? 0.6 : 1,
  };
  // direction d'accostage (plage garantie) — l'anse du village y est creusée
  c.landA = rng() * Math.PI * 2;
  c.cliff = { montagne: 0.45, village: 0.15, fleurs: 0.1, foret: 0.2, cratere: 0.45, falaises: 0.95, lagon: 0, dunes: 0, jumelles: 0.35, curiosite: 0.4 }[arch];
  if (desc.biome === 'dunes' || desc.biome === 'atoll') c.cliff *= 0.3;
  if (arch === 'village') {
    c.bay = { x: Math.cos(c.landA) * 0.84, z: Math.sin(c.landA) * 0.84, depth: 0.42, w: 0.07 };
    const ha = c.landA + Math.PI + (rng() - 0.5) * 1.6;
    c.hill = { x: Math.cos(ha) * 0.42, z: Math.sin(ha) * 0.42, h: 9 + rng() * 6 };
  }
  if (arch === 'montagne') {
    c.Hp = clamp(40 + r * 0.62, 60, 145) * (0.9 + rng() * 0.15);
    const sa = rng() * Math.PI * 2;
    c.summit = { x: Math.cos(sa) * 0.18 * rng(), z: Math.sin(sa) * 0.18 * rng() };
    const k = 2 + Math.floor(rng() * 2);
    c.ridges = [];
    for (let i = 0; i < k; i++) {
      const a = sa + (i / k) * Math.PI * 2 + (rng() - 0.5) * 0.9;
      const len = 0.62 + rng() * 0.2;
      // crête légèrement coudée (deux segments)
      const mid = { x: c.summit.x + Math.cos(a) * len * 0.5, z: c.summit.z + Math.sin(a) * len * 0.5 };
      const a2 = a + (rng() - 0.5) * 0.8;
      c.ridges.push([c.summit, mid, { x: mid.x + Math.cos(a2) * len * 0.5, z: mid.z + Math.sin(a2) * len * 0.5 }]);
    }
    c.rw = 0.16 + rng() * 0.06;
  }
  if (arch === 'cratere') {
    c.Hc = clamp(30 + r * 0.5, 40, 95);
    c.crater = { x: (rng() - 0.5) * 0.12, z: (rng() - 0.5) * 0.12, r: 0.2 + rng() * 0.05 };
  }
  if (arch === 'falaises') c.Hf = clamp(18 + r * 0.16, 20, 40);
  if (arch === 'dunes') {
    c.dir = rng() * Math.PI;
    const oa = rng() * Math.PI * 2;
    c.oasis = { x: Math.cos(oa) * 0.15, z: Math.sin(oa) * 0.15 };
  }
  if (arch === 'jumelles') {
    const a = rng() * Math.PI;
    const ca = Math.cos(a);
    const sa2 = Math.sin(a);
    c.lobes = [
      { x: -0.5 * ca, z: -0.5 * sa2, r: 0.43, h: 8 + rng() * 6 },
      { x: 0.52 * ca + 0.06 * sa2, z: 0.52 * sa2 - 0.06 * ca, r: 0.38, h: 14 + rng() * 12 },
    ];
    c.tombolo = rng() < 0.55;
  }
  if (arch === 'curiosite') {
    c.landmark = desc.traits?.landmark || 'phare';
    c.whaleA = rng() * Math.PI;
  }
  if (arch === 'lagon') {
    c.islets = [];
    const m = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < m; i++) {
      const a = rng() * Math.PI * 2;
      c.islets.push({ x: Math.cos(a) * 0.32 * rng(), z: Math.sin(a) * 0.32 * rng(), r: 0.05 + rng() * 0.05 });
    }
  }
  if (arch === 'foret' || arch === 'fleurs') {
    c.hills = [];
    for (let i = 0; i < 2; i++) {
      const a = rng() * Math.PI * 2;
      c.hills.push({ x: Math.cos(a) * 0.35, z: Math.sin(a) * 0.35, h: (arch === 'foret' ? 7 : 4) + rng() * 5 });
    }
  }
  if (cache.size > 64) cache.delete(cache.keys().next().value);
  cache.set(key, c);
  return c;
}

// « terre » normalisée : > 0 sur l'île, < 0 en mer ; d = distance déformée au centre
const LT = { L: 0, d: 0, cliff: 0, lobe: 0 };
function landness(c, qx, qz) {
  const wx = qx + 0.3 * fbm(c.n1, qx * 1.1 + 3.1, qz * 1.1 - 1.7, 2);
  const wz = qz + 0.3 * fbm(c.n2, qx * 1.1 - 5.3, qz * 1.1 + 2.9, 2);
  let d;
  let lobe = 0;
  if (c.lobes) {
    const [a, b] = c.lobes;
    const da = Math.hypot(wx - a.x, wz - a.z) / a.r;
    const db = Math.hypot(wx - b.x, wz - b.z) / b.r;
    lobe = db < da ? 1 : 0;
    d = Math.min(da, db) * 0.92;
  } else d = Math.hypot(wx, wz);
  d += 0.1 * c.edgeAmp * fbm(c.n3, qx * 2.6, qz * 2.6, 2);
  let L = c.arch === 'lagon' ? 0.2 - Math.abs(d - 0.74) : 0.92 - d;
  if (c.islets) for (const t of c.islets) L = Math.max(L, 0.04 - (Math.hypot(qx - t.x, qz - t.z) - t.r) * 1.2);
  if (c.bay) L -= c.bay.depth * Math.exp(-((qx - c.bay.x) ** 2 + (qz - c.bay.z) ** 2) / c.bay.w);
  if (c.lobes && c.tombolo) {
    const [a, b] = c.lobes;
    const [ds] = segDist(qx, qz, a.x, a.z, b.x, b.z);
    L = Math.max(L, 0.03 - ds * 0.9);
  }
  // falaises : un masque de bruit, jamais sur la plage d'accostage
  const ang = Math.atan2(qz, qx);
  let da = Math.abs(((ang - c.landA + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  const landing = Math.exp(-(da * da) / 0.3);
  const cm = smooth(-0.15, 0.25, c.n5(qx * 1.6 + 7, qz * 1.6 - 3));
  LT.L = L;
  LT.d = d;
  LT.cliff = clamp(cm * c.cliff * 1.4, 0, 1) * (1 - landing);
  LT.lobe = lobe;
  return LT;
}

function interior(c, u, qx, qz, lx, lz, lobe) {
  const v = 0.5 + 0.5 * fbm(c.n4, qx * 1.7, qz * 1.7, 3);
  // relief au mètre près : bosses à l'échelle absolue (même grain sur toutes les îles)
  const bumps = (fbm(c.n3, lx / 26, lz / 26, 3) * 0.9 + fbm(c.n6, lx / 9, lz / 9, 2) * 0.25) * Math.min(1, u * 3);
  const gauss = (x, z, w) => Math.exp(-((qx - x) ** 2 + (qz - z) ** 2) / w);
  switch (c.arch) {
    case 'montagne': {
      let m = 0;
      for (const rg of c.ridges) {
        for (let k = 0; k < rg.length - 1; k++) {
          const [dr, t] = segDist(qx, qz, rg[k].x, rg[k].z, rg[k + 1].x, rg[k + 1].z);
          const tt = (k + t) / (rg.length - 1);
          const w = c.rw * (1 + tt * 0.8);
          m = Math.max(m, c.Hp * (1 - 0.62 * Math.pow(tt, 1.3)) * Math.exp(-((dr / w) ** 2)));
        }
      }
      const cone = c.Hp * 0.78 * Math.pow(Math.max(0, 1 - Math.hypot(qx - c.summit.x, qz - c.summit.z) / 0.95), 1.6);
      m = Math.max(m, cone);
      // rochers escarpés : bruit « en crêtes » proportionnel à l'altitude
      m += (ridged(c.n4, lx / 38, lz / 38, 3) - 0.35) * 0.32 * m;
      const foot = (4 + 6 * v) * Math.pow(u, 0.8);
      return Math.max(m * smooth(0, 0.35, u), foot) + bumps;
    }
    case 'village': {
      const near = gauss(c.bay.x * 0.7, c.bay.z * 0.7, 0.08);
      const base = (5 + 4 * v) * Math.pow(u, 1.1);
      const hill = c.hill.h * gauss(c.hill.x, c.hill.z, 0.05);
      return base * (1 - near * 0.55) + hill + bumps * (1 - near * 0.8);
    }
    case 'fleurs': {
      let h = (4 + 5 * v) * Math.pow(u, 1.1) + Math.sin(lx / 17 + v * 3) * Math.sin(lz / 21) * 0.8 * u;
      for (const t of c.hills) h += t.h * gauss(t.x, t.z, 0.06);
      return h + bumps * 0.5;
    }
    case 'foret': {
      let h = (7 + 8 * v) * Math.pow(u, 1.2);
      for (const t of c.hills) h += t.h * gauss(t.x, t.z, 0.05);
      return h + bumps;
    }
    case 'cratere': {
      // profil concave des vrais volcans : piémont doux, cône raide vers le sommet
      let h = c.Hc * (0.12 * u + 0.88 * Math.pow(u, 2.1)) * (0.9 + 0.1 * v);
      const dc = Math.hypot(qx - c.crater.x, qz - c.crater.z) / c.crater.r;
      if (dc < 1.25) {
        const rim = c.Hc * (0.96 + 0.04 * v);
        h = Math.max(h, rim * smooth(1.25, 0.95, dc));
        if (dc < 1) h = rim - Math.pow(1 - dc, 1.2) * c.Hc * 0.42;
      }
      return h + bumps * 0.6;
    }
    case 'falaises':
      return c.Hf * smooth(0.0, 0.2, u) * (0.82 + 0.18 * v) + bumps * 0.7;
    case 'lagon':
      return 0.4 + 1.8 * u + bumps * 0.25;
    case 'dunes': {
      const k = qx * Math.cos(c.dir) + qz * Math.sin(c.dir);
      const ridge = Math.pow(Math.max(0, Math.sin((k * 6.5 + fbm(c.n4, qx * 1.4, qz * 1.4, 2) * 2.2) * Math.PI)), 2);
      let h = 3 + 4 * Math.pow(u, 0.8) + ridge * 2.6 * Math.min(1, u * 2.5);
      // oasis : cuvette au cœur des dunes (le remplissage hydrologique en fera un lac)
      h *= 1 - 0.88 * gauss(c.oasis.x, c.oasis.z, 0.022);
      return h;
    }
    case 'jumelles': {
      const L = c.lobes[lobe];
      return L.h * Math.pow(u, lobe ? 1.3 : 1.1) * (0.8 + 0.2 * v) + bumps;
    }
    case 'curiosite': {
      if (c.landmark === 'rocher_baleine') {
        const ca = Math.cos(c.whaleA);
        const sa = Math.sin(c.whaleA);
        const ex = (qx * ca + qz * sa) / 0.55;
        const ez = (-qx * sa + qz * ca) / 0.24;
        return 2 * u + 17 * Math.pow(Math.max(0, 1 - ex * ex - ez * ez), 0.55) + bumps * 0.3;
      }
      if (c.landmark === 'phare') return (8 + 6 * v) * Math.pow(u, 0.8) + bumps;
      if (c.landmark === 'epave_geante') return 1.4 + 1.6 * u + bumps * 0.3;
      return (5 + 6 * v) * Math.pow(u, 0.9) + bumps;
    }
    default:
      return (6 + 6 * v) * u + bumps;
  }
}

// hauteur de base (m) en coordonnées locales à l'île, avant érosion et rivières
export function baseHeight(c, lx, lz) {
  if (c.forme) return formeHeight(c, lx, lz);
  const qx = lx / c.r;
  const qz = lz / c.r;
  const T = landness(c, qx, qz);
  const L = T.L;
  if (L < 0) {
    if (c.arch === 'lagon' && T.d < 0.74) return Math.max(-2.2, -0.6 + L * c.r * 0.12);
    return Math.max(SEA_FLOOR, L * c.r * 0.33 - 0.35);
  }
  const cliff = T.cliff;
  const bw = (c.arch === 'lagon' ? c.bw * 0.25 : c.bw) * (1 - cliff * 0.95);
  const lobe = T.lobe;
  if (L < bw) return -0.35 + (L / Math.max(bw, 1e-4)) * 1.55;
  const span = (c.arch === 'lagon' ? 0.2 : 0.92) - bw;
  const u = Math.min(1, (L - bw) / Math.max(0.04, span));
  const env = cliff > 0.5 ? smooth(0, 0.06, L - bw) : smooth(0, 0.22, L - bw);
  const h = interior(c, u, qx, qz, lx, lz, lobe);
  return 1.2 + Math.max(0, h) * Math.max(env, smooth(0, 0.5, u));
}

// grille de 4 m du relief de base
export function baseGrid(c) {
  const n = c.n;
  if (c.forme) {
    // îles de la carte : pas de 4 m exact (les sections se taillent dans la grille)
    const H = new Float32Array(n * n);
    const L = coastGrid(c);
    for (let j = 0; j < n; j++) {
      const z = -c.ext + j * CELL;
      for (let i = 0; i < n; i++) H[j * n + i] = formeHeightL(c, -c.ext + i * CELL, z, L[j * n + i]);
    }
    return { H, n, s: CELL };
  }
  const s = (2 * c.ext) / (n - 1);
  const H = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    const z = -c.ext + j * s;
    for (let i = 0; i < n; i++) H[j * n + i] = baseHeight(c, -c.ext + i * s, z);
  }
  return { H, n, s };
}
