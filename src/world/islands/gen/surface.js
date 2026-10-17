// Relief au mètre et maillages d'une île. Le même code tourne dans le Worker
// (construction des tuiles) et sur le fil principal (sol pour la marche) : les
// deux voient exactement le même terrain.
//  - hauteur = bicubique de la grille de 4 m + relief fin (amplitude par zone)
//    + lit des rivières au mètre + terrassements du joueur
//  - LOD1 : grille de 4 m ; LOD2 : silhouette 32 × 32 ; LOD0 : tuiles de 64 m
import { makeNoise, fbm } from '../../../core/noise.js';
import { mulberry32 } from '../../../core/random.js';
import { bilinear, bicubic, stableId, smooth } from './grid.js';
import { Z, bloomBand, BLOOM_IDS, bloomColorOf } from './zones.js';
import { KINDS, KIND_INDEX, STRIDE } from './kinds.js';
import { reliefContext, baseHeight } from './relief.js';
import { BIOMES } from '../biomes.js';

export const TILE = 64;
const BUCKET = 16;

export class Surface {
  // d : { H, A, n, s, ext, seed, rivers: [{ pts }], lakes: [{ level, cells }], Z? }
  constructor(d, terra = null) {
    this.H = d.H;
    this.A = d.A;
    this.n = d.n;
    this.s = d.s;
    this.ext = d.ext;
    this.Z = d.Z || null;
    this.noise = makeNoise(d.seed ^ 0xde7a11);
    // différences de terrassement (objet vivant de la sauvegarde) ; compteur pour éviter tout coût sans elles
    this.terra = terra || null;
    this.terraCount = terra ? Object.keys(terra).length : 0;
    // lacs : niveau par cellule
    this.lakeLevel = new Float32Array(this.n * this.n).fill(NaN);
    for (const L of d.lakes || []) for (const c of L.cells) this.lakeLevel[c] = L.level;
    // segments de rivière rangés par cases de 16 m
    this.bn = Math.ceil((2 * this.ext) / BUCKET) + 1;
    this.buckets = new Map();
    for (const rv of d.rivers || []) {
      const p = rv.pts;
      for (let a = 0; a < p.length - 4; a += 4) {
        const half = Math.max(p[a + 3], p[a + 7]) * 0.75 + 1;
        const x0 = Math.min(p[a], p[a + 4]) - half;
        const x1 = Math.max(p[a], p[a + 4]) + half;
        const z0 = Math.min(p[a + 1], p[a + 5]) - half;
        const z1 = Math.max(p[a + 1], p[a + 5]) + half;
        for (let bj = this.bk(z0); bj <= this.bk(z1); bj++) {
          for (let bi = this.bk(x0); bi <= this.bk(x1); bi++) {
            const key = bj * this.bn + bi;
            let l = this.buckets.get(key);
            if (!l) this.buckets.set(key, (l = []));
            l.push(p, a);
          }
        }
      }
    }
  }

  bk(v) {
    return Math.max(0, Math.min(this.bn - 1, Math.floor((v + this.ext) / BUCKET)));
  }

  // segment de rivière le plus proche : { d, level, half } ou null
  river(lx, lz) {
    const l = this.buckets.get(this.bk(lz) * this.bn + this.bk(lx));
    if (!l) return null;
    let best = null;
    for (let q = 0; q < l.length; q += 2) {
      const p = l[q];
      const a = l[q + 1];
      const ax = p[a];
      const az = p[a + 1];
      const dx = p[a + 4] - ax;
      const dz = p[a + 5] - az;
      const l2 = dx * dx + dz * dz || 1e-9;
      const t = Math.max(0, Math.min(1, ((lx - ax) * dx + (lz - az) * dz) / l2));
      const ex = lx - ax - dx * t;
      const ez = lz - az - dz * t;
      const d = Math.sqrt(ex * ex + ez * ez);
      if (!best || d < best.d) best = { d, level: p[a + 2] + (p[a + 6] - p[a + 2]) * t, half: (p[a + 3] + (p[a + 7] - p[a + 3]) * t) * 0.5 };
    }
    return best;
  }

  // hauteur du sol (m) en coordonnées locales à l'île
  height(lx, lz) {
    const fi = (lx + this.ext) / this.s;
    const fj = (lz + this.ext) / this.s;
    let h = bicubic(this.H, this.n, fi, fj);
    const amp = bilinear(this.A, this.n, fi, fj) / 100;
    if (amp > 0.005) h += amp * (fbm(this.noise, lx / 6.5, lz / 6.5, 2) * 0.75 + this.noise(lx / 2.3, lz / 2.3) * 0.25);
    const rv = this.river(lx, lz);
    if (rv && rv.d < rv.half * 1.5) {
      const depth = 0.35 + rv.half * 0.18;
      const bed = rv.level - depth + Math.pow(Math.min(1.5, rv.d / rv.half), 2) * depth * 1.05;
      if (bed < h) h = bed;
    }
    if (this.terraCount) h += this.terraAt(lx, lz);
    return h;
  }

  // terrassements : un décalage par point entier du maillage au mètre
  terraAt(lx, lz) {
    const i = Math.floor(lx);
    const j = Math.floor(lz);
    const u = lx - i;
    const v = lz - j;
    const t = this.terra;
    const g = (a, b) => t[`${a},${b}`] || 0;
    return (g(i, j) * (1 - u) + g(i + 1, j) * u) * (1 - v) + (g(i, j + 1) * (1 - u) + g(i + 1, j + 1) * u) * v;
  }

  // niveau de l'eau douce (lac, rivière) au-dessus de ce point, sinon la mer (0)
  waterLevel(lx, lz) {
    const i = Math.round((lx + this.ext) / this.s);
    const j = Math.round((lz + this.ext) / this.s);
    if (i >= 0 && j >= 0 && i < this.n && j < this.n) {
      const L = this.lakeLevel[j * this.n + i];
      if (L === L) return L;
    }
    const rv = this.river(lx, lz);
    if (rv && rv.d < rv.half) return rv.level;
    return 0;
  }

  zoneAt(lx, lz) {
    if (!this.Z) return -1;
    const i = Math.max(0, Math.min(this.n - 1, Math.round((lx + this.ext) / this.s)));
    const j = Math.max(0, Math.min(this.n - 1, Math.round((lz + this.ext) / this.s)));
    return this.Z[j * this.n + i];
  }
}

// ---------------------------------------------------------------------------
// Peinture des chemins (couleur terre, bord irrégulier, lisière plus foncée)
const PATH = [0.93, 0.85, 0.7];
const PATH_EDGE = [0.8, 0.7, 0.55];
function pathPaint(paths, x, z, noise, out) {
  let dmin = Infinity;
  let w = 0;
  for (const p of paths) {
    const pts = p.pts;
    const reach = p.w / 2 + 1.2;
    if (x < p.box[0] - reach || x > p.box[2] + reach || z < p.box[1] - reach || z > p.box[3] + reach) continue;
    for (let q = 0; q < pts.length - 2; q += 2) {
      const ax = pts[q];
      const az = pts[q + 1];
      const dx = pts[q + 2] - ax;
      const dz = pts[q + 3] - az;
      if (Math.abs(ax - x) > 8 + Math.abs(dx) && Math.abs(az - z) > 8 + Math.abs(dz)) continue;
      const l2 = dx * dx + dz * dz || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
      const ex = x - ax - dx * t;
      const ez = z - az - dz * t;
      const d = Math.sqrt(ex * ex + ez * ez) - p.w / 2;
      if (d < dmin) {
        dmin = d;
        w = p.w;
      }
    }
  }
  if (dmin > 1.2) return 0;
  const wob = (noise(x / 1.7, z / 1.7) - 0) * 0.35;
  const inner = smooth(0.15, -0.15, dmin + wob);
  const rim = smooth(0.9, 0.1, dmin + wob) - inner;
  for (let c = 0; c < 3; c++) out[c] = out[c] * (1 - rim * 0.45) + PATH_EDGE[c] * rim * 0.45;
  for (let c = 0; c < 3; c++) out[c] = out[c] * (1 - inner) + PATH[c] * inner;
  return inner;
}
export function prepPaths(paths) {
  return paths.map((p) => {
    let x0 = Infinity;
    let z0 = Infinity;
    let x1 = -Infinity;
    let z1 = -Infinity;
    for (let q = 0; q < p.pts.length; q += 2) {
      x0 = Math.min(x0, p.pts[q]);
      x1 = Math.max(x1, p.pts[q]);
      z0 = Math.min(z0, p.pts[q + 1]);
      z1 = Math.max(z1, p.pts[q + 1]);
    }
    return { ...p, box: [x0, z0, x1, z1] };
  });
}

// ---------------------------------------------------------------------------
// LOD1 : grille de 4 m, couleurs des zones + chemins
export function buildLOD1(plan) {
  const { H, C, n, s, ext } = plan;
  const N = n * n;
  const positions = new Float32Array(N * 3);
  const normals = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const noise = makeNoise(plan.seed ^ 0x9a7);
  const paths = plan._paths || (plan._paths = prepPaths(plan.paths));
  const col = [0, 0, 0];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const x = -ext + i * s;
      const z = -ext + j * s;
      const h = H[k];
      const hl = H[j * n + Math.max(0, i - 1)];
      const hr = H[j * n + Math.min(n - 1, i + 1)];
      const hd = H[Math.max(0, j - 1) * n + i];
      const hu = H[Math.min(n - 1, j + 1) * n + i];
      let nx = (hl - hr) / (2 * s);
      let nz = (hd - hu) / (2 * s);
      const inv = 1 / Math.sqrt(nx * nx + 1 + nz * nz);
      positions.set([x, h, z], k * 3);
      normals.set([nx * inv, inv, nz * inv], k * 3);
      col[0] = C[k * 3];
      col[1] = C[k * 3 + 1];
      col[2] = C[k * 3 + 2];
      pathPaint(paths, x, z, noise, col);
      colors.set(col, k * 3);
    }
  }
  // (pas de « heights » ici : le tableau du plan reste dans le cache du Worker, il ne doit pas être transféré)
  return { n, s, ext, positions, normals, colors, index: gridIndex(H, n, -1.2) };
}

function gridIndex(H, n, minTop) {
  const all = n * n > 65535 ? new Uint32Array((n - 1) * (n - 1) * 6) : new Uint16Array((n - 1) * (n - 1) * 6);
  let m = 0;
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      const b = a + 1;
      const d = a + n;
      const e = d + 1;
      if (Math.max(H[a], H[b], H[d], H[e]) < minTop) continue;
      all[m++] = a;
      all[m++] = d;
      all[m++] = b;
      all[m++] = b;
      all[m++] = d;
      all[m++] = e;
    }
  }
  return all.slice(0, m);
}

// ---------------------------------------------------------------------------
// LOD2 : silhouette 32 × 32 depuis le relief de base (pas besoin du plan complet).
// Les sommets prennent un mélange moyenne / maximum : les pics restent visibles de loin.
const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
export function buildLOD2(desc) {
  const c = reliefContext(desc);
  const n = 32;
  const ext = c.ext;
  const s = (2 * ext) / (n - 1);
  const H = new Float32Array(n * n);
  const pal = (BIOMES[desc.biome] || BIOMES.prairie).pal;
  const sand = hex(pal.sand);
  const grass = hex(pal.grass[1]);
  const rock = hex(pal.rock);
  const snow = hex(pal.snow || '#f7fbff');
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = -ext + i * s;
      const z = -ext + j * s;
      let mx = -99;
      let sum = 0;
      for (const [ox, oz] of [[0, 0], [0.35, 0.35], [-0.35, 0.35], [0.35, -0.35], [-0.35, -0.35]]) {
        const h = baseHeight(c, x + ox * s, z + oz * s);
        mx = Math.max(mx, h);
        sum += h;
      }
      const avg = sum / 5;
      H[j * n + i] = avg > 1 ? avg * 0.35 + mx * 0.65 : avg;
    }
  }
  const N = n * n;
  const positions = new Float32Array(N * 3);
  const normals = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  let hmax = 1;
  for (let k = 0; k < N; k++) hmax = Math.max(hmax, H[k]);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const h = H[k];
      const nx = (H[j * n + Math.max(0, i - 1)] - H[j * n + Math.min(n - 1, i + 1)]) / (2 * s);
      const nz = (H[Math.max(0, j - 1) * n + i] - H[Math.min(n - 1, j + 1) * n + i]) / (2 * s);
      const inv = 1 / Math.sqrt(nx * nx + 1 + nz * nz);
      positions.set([-ext + i * s, h, -ext + j * s], k * 3);
      normals.set([nx * inv, inv, nz * inv], k * 3);
      let cc = h < 1.4 ? sand : grass;
      if (h > 40 || 1 - inv > 0.5) cc = rock;
      if ((c.arch === 'montagne' && h > hmax * 0.7) || (desc.biome === 'glace' && h > 12)) cc = snow;
      colors.set(cc, k * 3);
    }
  }
  return { n, s, ext, positions, normals, colors, index: gridIndex(H, n, -1.2) };
}

// ---------------------------------------------------------------------------
// LOD0 : tuile de 64 m au mètre (+ jupe contre les fissures) et petite végétation
// petite végétation au mètre carré (tuiles LOD0) : herbe dense, vraies nappes de fleurs
const SMALL_TABLE = {
  [Z.PRAIRIE]: [['herbe', 0.32], ['fleur_champ', 0.05]],
  [Z.FLEURS]: [['fleur_champ', 1.1], ['herbe', 0.12]],
  [Z.CLAIRIERE]: [['herbe', 0.26], ['fleur_champ', 0.1]],
  [Z.LISIERE]: [['herbe', 0.16], ['fleur_champ', 0.02]],
  [Z.VILLAGE]: [['herbe', 0.1], ['fleur_champ', 0.03]],
  [Z.VERGER]: [['herbe', 0.26], ['fleur_champ', 0.08]],
  [Z.ALPAGE]: [['herbe', 0.22], ['fleur_champ', 0.08]],
  [Z.MARAIS]: [['herbe', 0.16], ['roseau', 0.12]],
  [Z.ROSELIERE]: [['roseau', 0.45]],
  [Z.MAQUIS]: [['herbe', 0.08]],
  [Z.DUNE]: [['herbe', 0.03]],
  [Z.FORET]: [['herbe', 0.06]],
  [Z.CULTURES]: [['herbe', 0.03]],
};

export function buildTile(plan, surf, tx, tz) {
  const T = TILE;
  const x0 = tx * T;
  const z0 = tz * T;
  const V = T + 1;
  const W = V + 2; // bordure d'un sommet pour les normales
  const Hb = new Float32Array(W * W);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) Hb[j * W + i] = surf.height(x0 + i - 1, z0 + j - 1);
  const NS = 4 * T; // sommets de jupe
  const NV = V * V + NS;
  const positions = new Float32Array(NV * 3);
  const normals = new Float32Array(NV * 3);
  const colors = new Float32Array(NV * 3);
  const { C, n, s, ext } = plan;
  const noise = makeNoise(plan.seed ^ 0x51ab);
  const paths = plan._paths || (plan._paths = prepPaths(plan.paths));
  const col = [0, 0, 0];
  // poids « chemin » de chaque sommet : la petite végétation l'évite sans recalculer les distances
  const pathW = new Float32Array(V * V);
  let minTop = Infinity;
  let maxTop = -Infinity;
  for (let j = 0; j < V; j++) {
    for (let i = 0; i < V; i++) {
      const k = j * V + i;
      const b = (j + 1) * W + (i + 1);
      const h = Hb[b];
      const x = x0 + i;
      const z = z0 + j;
      const nx = (Hb[b - 1] - Hb[b + 1]) / 2;
      const nz = (Hb[b - W] - Hb[b + W]) / 2;
      const inv = 1 / Math.sqrt(nx * nx + 1 + nz * nz);
      positions[k * 3] = x;
      positions[k * 3 + 1] = h;
      positions[k * 3 + 2] = z;
      normals[k * 3] = nx * inv;
      normals[k * 3 + 1] = inv;
      normals[k * 3 + 2] = nz * inv;
      minTop = Math.min(minTop, h);
      maxTop = Math.max(maxTop, h);
      // couleur des zones, échantillonnée avec un léger décalage bruité : bords peints
      const jx = noise(x / 3.1, z / 3.1) * 1.8;
      const jz = noise(z / 3.1 + 7, x / 3.1 - 4) * 1.8;
      const fi = (x + jx + ext) / s;
      const fj = (z + jz + ext) / s;
      sampleColor(C, n, fi, fj, col);
      // roche qui affleure sur les fortes pentes au mètre
      const slope = 1 - inv;
      if (slope > 0.25 && h > 1) {
        const k2 = smooth(0.25, 0.45, slope) * 0.6;
        col[0] = col[0] * (1 - k2) + 0.8 * k2;
        col[1] = col[1] * (1 - k2) + 0.74 * k2;
        col[2] = col[2] * (1 - k2) + 0.78 * k2;
      }
      pathW[k] = pathPaint(paths, x, z, noise, col);
      colors[k * 3] = col[0];
      colors[k * 3 + 1] = col[1];
      colors[k * 3 + 2] = col[2];
    }
  }
  // jupe : on duplique le bord 1,5 m plus bas (aucune fissure avec le LOD1 voisin)
  const edge = [];
  for (let i = 0; i < T; i++) edge.push(i);
  for (let j = 0; j < T; j++) edge.push(j * V + T);
  for (let i = T; i > 0; i--) edge.push(T * V + i);
  for (let j = T; j > 0; j--) edge.push(j * V);
  edge.forEach((src, q) => {
    const d = V * V + q;
    positions[d * 3] = positions[src * 3];
    positions[d * 3 + 1] = positions[src * 3 + 1] - 1.5;
    positions[d * 3 + 2] = positions[src * 3 + 2];
    normals.set(normals.subarray(src * 3, src * 3 + 3), d * 3);
    colors.set(colors.subarray(src * 3, src * 3 + 3), d * 3);
  });
  const idx = [];
  for (let j = 0; j < T; j++) {
    for (let i = 0; i < T; i++) {
      const a = j * V + i;
      const b = a + 1;
      const d = a + V;
      const e = d + 1;
      if (Math.max(positions[a * 3 + 1], positions[b * 3 + 1], positions[d * 3 + 1], positions[e * 3 + 1]) < -1.5) continue;
      idx.push(a, d, b, b, d, e);
    }
  }
  for (let q = 0; q < NS; q++) {
    const a = edge[q];
    const b = edge[(q + 1) % NS];
    const sa = V * V + q;
    const sb = V * V + ((q + 1) % NS);
    idx.push(a, b, sa, b, sb, sa);
  }
  const index = NV > 65535 ? new Uint32Array(idx) : new Uint16Array(idx);
  // petite végétation de la tuile
  const small = smallVegetation(plan, surf, x0, z0, T, Hb, W, pathW, V);
  const groups = instanceGroups(small.items, colors, x0, z0, V);
  return { tx, tz, x0, z0, positions, normals, colors, index, items: small.items, ids: small.ids, groups, minTop, maxTop };
}

function sampleColor(C, n, fi, fj, out) {
  const i = Math.max(0, Math.min(n - 1.0001, fi));
  const j = Math.max(0, Math.min(n - 1.0001, fj));
  const i0 = Math.floor(i);
  const j0 = Math.floor(j);
  const u = i - i0;
  const v = j - j0;
  const k = (j0 * n + i0) * 3;
  const k1 = k + 3;
  const k2 = k + n * 3;
  const k3 = k2 + 3;
  for (let c = 0; c < 3; c++) out[c] = (C[k + c] * (1 - u) + C[k1 + c] * u) * (1 - v) + (C[k2 + c] * (1 - u) + C[k3 + c] * u) * v;
}

// matrices et couleurs d'instances par espèce, prêtes pour les InstancedMesh du jeu
const GRASSY = new Set(['herbe']);
// couleurs de palette utilisées telles quelles (ColorManagement désactivé, voir setup.js)
const BLOOM_RGB = BLOOM_IDS.map((_, i) => {
  const h = bloomColorOf(i);
  return [1, 3, 5].map((o) => parseInt(h.slice(o, o + 2), 16) / 255);
});
function instanceGroups(items, colors, x0, z0, V) {
  const byKind = new Map();
  for (let k = 0; k < items.length; k += STRIDE) {
    let l = byKind.get(items[k]);
    if (!l) byKind.set(items[k], (l = []));
    l.push(k);
  }
  const out = [];
  for (const [ki, list] of byKind) {
    const kind = KINDS[ki];
    const grass = GRASSY.has(kind);
    const n = list.length;
    const mats = new Float32Array(n * 16);
    const cols = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const k = list[i];
      const sc = items[k + 5];
      const vr = items[k + 6];
      const c = Math.cos(items[k + 4]);
      const sn = Math.sin(items[k + 4]);
      const sx = grass ? sc * 1.3 : sc;
      const sy = grass ? sc * (1.1 + vr * 0.5) : sc;
      // rotation autour de y, échelle, translation (même convention que Matrix4.compose)
      const m = i * 16;
      mats[m] = c * sx;
      mats[m + 2] = -sn * sx;
      mats[m + 5] = sy;
      mats[m + 8] = sn * sx;
      mats[m + 10] = c * sx;
      mats[m + 12] = items[k + 1];
      mats[m + 13] = items[k + 2] - 0.04;
      mats[m + 14] = items[k + 3];
      mats[m + 15] = 1;
      let r;
      let g;
      let b;
      if (kind === 'fleur_champ') [r, g, b] = BLOOM_RGB[Math.floor(vr * 5) % 5];
      else if (grass) {
        // la touffe prend la couleur du sol sous elle
        const ci = Math.max(0, Math.min(V - 1, Math.round(items[k + 1] - x0))) + Math.max(0, Math.min(V - 1, Math.round(items[k + 3] - z0))) * V;
        const f = 0.94 + (vr % 0.1);
        r = colors[ci * 3] * f;
        g = colors[ci * 3 + 1] * f;
        b = colors[ci * 3 + 2] * f;
      } else r = g = b = 0.92 + vr * 0.12;
      cols[i * 3] = r;
      cols[i * 3 + 1] = g;
      cols[i * 3 + 2] = b;
    }
    out.push({ ki, offs: Uint32Array.from(list), mats, cols });
  }
  return out;
}

function smallVegetation(plan, surf, x0, z0, T, Hb, W, pathW, V) {
  const rng = mulberry32(plan.seed ^ Math.imul(x0 + 7919, 31) ^ Math.imul(z0 + 104729, 17));
  const nb = makeNoise(plan.seed ^ 0x0b100);
  const items = [];
  const ids = [];
  const { Z: zone, n, s, ext } = plan;
  const fields = [];
  for (const p of plan.pois) for (const f of p.fields || []) if (f.crop === 'ble') fields.push(f);
  const inField = (x, z) => fields.find((f) => {
    const dx = x - f.x;
    const dz = z - f.z;
    const u = dx * Math.cos(f.rot) + dz * Math.sin(f.rot);
    const v = -dx * Math.sin(f.rot) + dz * Math.cos(f.rot);
    return Math.abs(u) < f.w / 2 - 0.6 && Math.abs(v) < f.d / 2 - 0.6;
  });
  const hAt = (x, z) => {
    const fi = Math.max(0, Math.min(W - 1.001, x - x0 + 1));
    const fj = Math.max(0, Math.min(W - 1.001, z - z0 + 1));
    return bilinear(Hb, W, fi, fj);
  };
  for (let j = 0; j < T; j++) {
    for (let i = 0; i < T; i++) {
      const cx = x0 + i;
      const cz = z0 + j;
      const zi = Math.max(0, Math.min(n - 1, Math.round((cx + ext) / s)));
      const zj = Math.max(0, Math.min(n - 1, Math.round((cz + ext) / s)));
      const zn = zone[zj * n + zi];
      let table = SMALL_TABLE[zn];
      const f = zn === Z.CULTURES ? inField(cx, cz) : null;
      if (f) table = [['ble', 1.1]];
      if (zn === Z.LAC) table = [['nenuphar', 0.03]];
      if (!table) continue;
      for (const [kind, dens] of table) {
        let count = Math.floor(dens) + (rng() < dens - Math.floor(dens) ? 1 : 0);
        while (count-- > 0) {
          const x = cx + rng();
          const z = cz + rng();
          const rot = rng() * Math.PI * 2;
          const sc = 0.75 + rng() * 0.6;
          let vr = rng();
          let y = hAt(x, z);
          if (kind === 'nenuphar') {
            const lvl = surf.waterLevel(x, z);
            if (lvl - y < 0.3 || lvl - y > 2.5) continue;
            y = lvl + 0.02;
          } else {
            if (y < 0.5) continue;
            if (surf.waterLevel(x, z) > y - 0.05 && surf.waterLevel(x, z) > 0) continue;
            // pas d'herbe ni de fleurs sur les chemins
            if (pathW[Math.round(z - z0) * V + Math.round(x - x0)] > 0.3) continue;
          }
          if (kind === 'fleur_champ') vr = (bloomBand(plan.traits, x, z, nb) + vr * 0.9) / BLOOM_IDS.length;
          if (kind === 'ble') vr = 0.5 + vr * 0.5;
          const ki = KIND_INDEX[kind];
          items.push(ki, x, y, z, rot, sc, vr);
          ids.push(stableId(plan.seed, ki, x, z));
        }
      }
    }
  }
  return { items: Float32Array.from(items), ids: Uint32Array.from(ids) };
}

// ---------------------------------------------------------------------------
// Fenêtre de profondeur (demi-flottants) : relief des plans en cache, sinon relief de base
const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);
export function toHalf(v) {
  f32[0] = v;
  const x = u32[0];
  const sign = (x >>> 16) & 0x8000;
  const e = ((x >>> 23) & 0xff) - 112;
  if (e <= 0) return sign;
  if (e >= 31) return sign | 0x7c00;
  return sign | (e << 10) | ((x & 0x7fffff) >>> 13);
}
export function halfToFloat(hv) {
  const sg = hv & 0x8000 ? -1 : 1;
  const e = (hv >> 10) & 0x1f;
  const m = hv & 0x3ff;
  if (e === 0) return sg * m * 2 ** -24;
  if (e === 31) return sg * Infinity;
  return sg * (1 + m / 1024) * 2 ** (e - 15);
}
export function buildDepthWindow(islands, cx, cz, size, res, planOf) {
  const out = new Uint16Array(res * res);
  const sc = size / res;
  const x0 = cx - size / 2;
  const z0 = cz - size / 2;
  const low = toHalf(-16);
  out.fill(low);
  const vals = new Float32Array(res * res).fill(-16);
  for (const desc of islands) {
    const plan = planOf(desc);
    const c = plan ? null : reliefContext(desc);
    const reach = desc.r * 1.38;
    const i0 = Math.max(0, Math.floor((desc.x - reach - x0) / sc));
    const i1 = Math.min(res - 1, Math.ceil((desc.x + reach - x0) / sc));
    const j0 = Math.max(0, Math.floor((desc.z - reach - z0) / sc));
    const j1 = Math.min(res - 1, Math.ceil((desc.z + reach - z0) / sc));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const lx = x0 + (i + 0.5) * sc - desc.x;
        const lz = z0 + (j + 0.5) * sc - desc.z;
        const h = plan ? bilinear(plan.H, plan.n, (lx + plan.ext) / plan.s, (lz + plan.ext) / plan.s) : baseHeight(c, lx, lz);
        const k = j * res + i;
        if (h > vals[k]) {
          vals[k] = h;
          out[k] = toHalf(h);
        }
      }
    }
  }
  return out;
}
