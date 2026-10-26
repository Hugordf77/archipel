// Sections des grandes îles : un plan de section est taillé dans le plan de l'île entière (même grille
// de 4 m, même relief, mêmes arbres), recentré sur la section. Pour le moteur, une section est une île
// comme une autre (LOD1, végétation complète, tuiles au mètre, eau douce), limitée à son carré de
// 512 m (« core ») : rien n'est dessiné deux fois aux raccords. La grille garde une marge de deux
// cases pour que le relief au mètre (bicubique) soit identique des deux côtés d'un raccord ; ox, oz
// (centre de la section dans l'île) recalent les bruits du relief fin et de l'herbe.
// Module pur (Worker, tests).
import { SECTION } from './forme.js';
import { STRIDE } from './kinds.js';

const MARGE = 2; // cases de 4 m autour du carré de la section

export function cropPlan(P, sec) {
  const { cx, cz } = sec.section;
  const half = SECTION / 2;
  const s = P.s;
  const ext = half + MARGE * s;
  const n = Math.round((2 * ext) / s) + 1;
  const i0 = Math.round((cx - ext + P.ext) / s);
  const j0 = Math.round((cz - ext + P.ext) / s);
  const N = n * n;
  const src = (i, j) => Math.max(0, Math.min(P.n - 1, j0 + j)) * P.n + Math.max(0, Math.min(P.n - 1, i0 + i));
  const crop = (arr, Ctor, w = 1) => {
    if (!arr) return null;
    const out = new Ctor(N * w);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a = src(i, j) * w;
        const b = (j * n + i) * w;
        for (let c = 0; c < w; c++) out[b + c] = arr[a + c];
      }
    }
    return out;
  };
  const inCore = (lx, lz) => lx >= -half && lx < half && lz >= -half && lz < half;
  // arbres du carré seulement, recentrés
  const items = [];
  const ids = [];
  for (let k = 0, q = 0; k < P.items.length; k += STRIDE, q++) {
    const x = P.items[k + 1] - cx;
    const z = P.items[k + 3] - cz;
    if (!inCore(x, z)) continue;
    items.push(P.items[k], x, P.items[k + 2], z, P.items[k + 4], P.items[k + 5], P.items[k + 6]);
    ids.push(P.ids[q]);
  }
  // rivières qui touchent le carré (+ 16 m), points recentrés ; on coupe ce qui sort trop loin
  const rivers = [];
  for (const rv of P.rivers) {
    const pts = [];
    let inside = false;
    for (let a = 0; a < rv.pts.length; a += 4) {
      const x = rv.pts[a] - cx;
      const z = rv.pts[a + 1] - cz;
      const near = Math.abs(x) < half + 16 && Math.abs(z) < half + 16;
      if (near) inside = true;
      if (near || (pts.length && Math.abs(x) < half + 40 && Math.abs(z) < half + 40)) pts.push(x, z, rv.pts[a + 2], rv.pts[a + 3]);
      else if (pts.length) break;
    }
    if (inside && pts.length >= 8) rivers.push({ id: rv.id, end: rv.end, pts: Float32Array.from(pts) });
  }
  // lacs : cases de la grille de section ; clip : cases dessinées (le carré seulement)
  const lakes = [];
  for (const L of P.lakes) {
    const cells = [];
    for (const k of L.cells) {
      const i = (k % P.n) - i0;
      const j = Math.floor(k / P.n) - j0;
      if (i < 0 || j < 0 || i >= n || j >= n) continue;
      cells.push(j * n + i);
    }
    if (!cells.length) continue;
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    for (const k of cells) {
      const i = k % n;
      const j = (k - i) / n;
      x0 = Math.min(x0, i);
      x1 = Math.max(x1, i);
      z0 = Math.min(z0, j);
      z1 = Math.max(z1, j);
    }
    lakes.push({ id: L.id, level: L.level, cells: Int32Array.from(cells), box: [x0, z0, x1, z1], area: L.area, clip: [MARGE, MARGE, n - 2 - MARGE, n - 2 - MARGE] });
  }
  const falls = (P.falls || []).filter((f) => inCore(f.x - cx, f.z - cz)).map((f) => ({ ...f, x: f.x - cx, z: f.z - cz }));
  // lieux dont le point d'ancrage est dans le carré, recentrés avec leurs éléments (lieux posés à la main)
  const pois = (P.pois || []).filter((p) => inCore(p.x - cx, p.z - cz)).map((p) => ({ ...p, x: p.x - cx, z: p.z - cz, parts: p.parts.map((q) => ({ ...q, x: q.x - cx, z: q.z - cz })) }));
  let hmax = 0;
  const H = crop(P.H, Float32Array);
  for (let k = 0; k < N; k++) hmax = Math.max(hmax, H[k]);
  return {
    id: sec.id,
    seed: P.seed,
    archetype: P.archetype,
    biome: P.biome,
    name: P.name,
    n,
    s,
    ext,
    core: half,
    tmax: half / 64,
    ox: cx,
    oz: cz,
    H,
    A: crop(P.A, Uint8Array),
    Z: crop(P.Z, Uint8Array),
    C: crop(P.C, Float32Array, 3),
    B: crop(P.B, Uint8Array),
    ZI: crop(P.ZI, Uint8Array),
    zones: P.zones,
    rivers,
    lakes,
    falls,
    pois,
    micro: [],
    paths: [],
    pathParts: [],
    landing: null,
    items: Float32Array.from(items),
    ids: Uint32Array.from(ids),
    spawners: [],
    traits: P.traits,
    wetDist: crop(P.wetDist, Float32Array),
    coastDist: crop(P.coastDist, Float32Array),
    failedLinks: [],
    stats: { ...P.stats, hmax, items: ids.length },
    timings: {},
  };
}
