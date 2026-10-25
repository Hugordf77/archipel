// Passe 4 — chemins : réseau reliant chaque lieu à la plage d'accostage (arbre couvrant
// + quelques boucles), tracé A* sur la grille de 4 m (pente, eau, falaises), lissage,
// ponts sur les rivières, escaliers dans les pentes, panneaux aux carrefours.
import { MinHeap, bilinear, stableId } from './grid.js';
import { Z } from './zones.js';
import { chaikin } from './hydro.js';

const DI = [1, -1, 0, 0, 1, 1, -1, -1];
const DJ = [0, 0, 1, -1, 1, -1, 1, -1];
const DC = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2];

function costGrid(P) {
  const { H, n, zone, slope, water } = P;
  const C = new Float32Array(n * n);
  for (let k = 0; k < n * n; k++) {
    const h = H[k];
    if (h < -0.6 || water[k] === 1) C[k] = Infinity;
    else {
      let c = 1 + slope[k] * 9 + Math.max(0, slope[k] - 0.6) * 30;
      if (water[k] === 2) c += 7; // gué ou pont
      if (h < 0.3) c += 2.5;
      const zn = zone[k];
      if (zn === Z.ROCHE) c += 3;
      else if (zn === Z.FORET) c += 0.5;
      else if (zn === Z.CULTURES) c += 4;
      else if (zn === Z.VILLAGE) c -= 0.3;
      C[k] = c;
    }
  }
  return C;
}

function astar(C, n, a, b, prev) {
  const g = new Float32Array(n * n).fill(Infinity);
  const heap = new MinHeap(1024);
  const bi = b % n;
  const bj = (b - bi) / n;
  const hfun = (k) => {
    const i = k % n;
    return Math.hypot(i - bi, (k - i) / n - bj);
  };
  g[a] = 0;
  prev[a] = -1;
  heap.push(hfun(a), a);
  const closed = new Uint8Array(n * n);
  while (heap.size) {
    const c = heap.pop();
    if (c === b) return true;
    if (closed[c]) continue;
    closed[c] = 1;
    const ci = c % n;
    const cj = (c - ci) / n;
    for (let d = 0; d < 8; d++) {
      const i = ci + DI[d];
      const j = cj + DJ[d];
      if (i < 0 || j < 0 || i >= n || j >= n) continue;
      const k = j * n + i;
      const w = C[k];
      if (w === Infinity || closed[k]) continue;
      const ng = g[c] + w * DC[d];
      if (ng < g[k]) {
        g[k] = ng;
        prev[k] = c;
        heap.push(ng + hfun(k), k);
      }
    }
  }
  return false;
}

export function buildPaths(P, pois) {
  const { H, n, s, ext, zone, water, desc } = P;
  const C = costGrid(P);
  const cellOf = (x, z) => Math.max(0, Math.min(n - 1, Math.round((z + ext) / s))) * n + Math.max(0, Math.min(n - 1, Math.round((x + ext) / s)));
  // cellule praticable la plus proche
  const snap = (x, z) => {
    const k0 = cellOf(x, z);
    if (C[k0] < Infinity && H[k0] > 0.2) return k0;
    const i0 = k0 % n;
    const j0 = (k0 - i0) / n;
    for (let rr = 1; rr < 8; rr++) {
      for (let j = j0 - rr; j <= j0 + rr; j++) {
        for (let i = i0 - rr; i <= i0 + rr; i++) {
          if (i < 0 || j < 0 || i >= n || j >= n) continue;
          const k = j * n + i;
          if (C[k] < Infinity && H[k] > 0.2) return k;
        }
      }
    }
    return -1;
  };
  // terre principale : la composante qui porte le plus de lieux (à défaut, la plus grande)
  const comp = P.comp;
  let home = -1;
  if (comp) {
    const votes = new Map();
    for (const p of pois) {
      const c = comp[snap(p.x, p.z)] ?? -1;
      if (c >= 0) votes.set(c, (votes.get(c) || 0) + 1);
    }
    let bv = 0;
    for (const [c, v] of votes) if (v > bv) [home, bv] = [c, v];
    if (home < 0) {
      const sizes = new Map();
      for (let k = 0; k < n * n; k++) if (comp[k] >= 0) sizes.set(comp[k], (sizes.get(comp[k]) || 0) + 1);
      for (const [c, v] of sizes) if (v > bv) [home, bv] = [c, v];
    }
  }
  // plage d'accostage : la plage de la terre principale la plus proche du point prévu (P.accostage)
  let landing = null;
  for (const strict of [true, false]) {
    if (landing) break;
    const { x: tx, z: tz } = P.accostage;
    let bd = Infinity;
    for (let k = 0; k < n * n; k++) {
      if (zone[k] !== Z.PLAGE && zone[k] !== Z.DUNE) continue;
      if (H[k] < 0.3 || H[k] > 1.2) continue;
      if (strict && home >= 0 && comp[k] !== home) continue;
      const x = -ext + (k % n) * s;
      const z = -ext + Math.floor(k / n) * s;
      const d = Math.hypot(x - tx, z - tz);
      if (d < bd) {
        bd = d;
        landing = { x, z, k };
      }
    }
    const vil = pois.find((p) => p.type === 'village' && p.jetty);
    if (vil) landing = { x: vil.jetty.x, z: vil.jetty.z, k: cellOf(vil.jetty.x, vil.jetty.z) };
  }
  const nodes = [];
  if (landing) nodes.push({ x: landing.x, z: landing.z, label: 'Plage', k: snap(landing.x, landing.z) });
  for (const p of pois) {
    if (['recif', 'epave_immergee', 'oasis'].includes(p.type)) continue;
    if (p.bridge) {
      nodes.push({ x: p.bridge.x0, z: p.bridge.z0, label: p.label, k: snap(p.bridge.x0, p.bridge.z0), bridge: 0, poi: p });
      nodes.push({ x: p.bridge.x1, z: p.bridge.z1, label: p.label, k: snap(p.bridge.x1, p.bridge.z1), bridge: 1, poi: p });
      continue;
    }
    const door = p.door || p;
    const k = snap(door.x, door.z);
    if (k >= 0) nodes.push({ x: door.x, z: door.z, label: p.name || p.label, k, poi: p });
  }
  const all = nodes.filter((nd) => nd.k >= 0);
  // déclarée plus bas (pont de corde) ; hissée pour l'accessibilité des terres
  let valid = all;
  const edges = [];
  const spanning = () => {
  if (valid.length > 1) {
    const inTree = new Set([0]);
    while (inTree.size < valid.length) {
      let best = null;
      for (const a of inTree) {
        for (let b = 0; b < valid.length; b++) {
          if (inTree.has(b)) continue;
          const d = Math.hypot(valid[a].x - valid[b].x, valid[a].z - valid[b].z);
          if (!best || d < best.d) best = { a, b, d };
        }
      }
      inTree.add(best.b);
      edges.push([best.a, best.b]);
    }
    for (let a = 0; a < valid.length; a++) {
      let b2 = -1;
      let d2 = Infinity;
      for (let b = 0; b < valid.length; b++) {
        if (b === a || edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) continue;
        const d = Math.hypot(valid[a].x - valid[b].x, valid[a].z - valid[b].z);
        if (d < d2) {
          d2 = d;
          b2 = b;
        }
      }
      if (b2 >= 0 && d2 < 90 && edges.length < valid.length + 3) edges.push([a, b2]);
    }
  }
  };
  // les deux bouts d'un pont de corde sont reliés par le pont lui-même
  const prev = new Int32Array(n * n);
  const paths = [];
  const parts = [];
  const pathMask = new Uint8Array(n * n);
  let failed = 0;
  // deux terres séparées par un bras de mer (îles jumelles…) : pont de corde au plus court
  const bridged = new Set();
  const bridgeBetween = (ca, cb) => {
    const key = ca < cb ? `${ca}:${cb}` : `${cb}:${ca}`;
    if (bridged.has(key)) return false;
    bridged.add(key);
    let best = null;
    const R = Math.ceil(60 / s);
    for (let k = 0; k < n * n; k++) {
      if (comp[k] !== ca || H[k] < 1.2) continue;
      const i0 = k % n;
      const j0 = (k - i0) / n;
      for (let j = Math.max(0, j0 - R); j <= Math.min(n - 1, j0 + R); j++) {
        for (let i = Math.max(0, i0 - R); i <= Math.min(n - 1, i0 + R); i++) {
          const q = j * n + i;
          if (comp[q] !== cb || H[q] < 1.2) continue;
          const d = (i - i0) ** 2 + (j - j0) ** 2;
          if (!best || d < best.d) best = { d, a: k, b: q };
        }
      }
    }
    if (!best || Math.sqrt(best.d) * s > 60) return false;
    const xa = -ext + (best.a % n) * s;
    const za = -ext + Math.floor(best.a / n) * s;
    const xb = -ext + (best.b % n) * s;
    const zb = -ext + Math.floor(best.b / n) * s;
    parts.push({ t: 'pont_corde', x: xa, z: za, y: H[best.a], x1: xb, z1: zb, y1: H[best.b], rot: Math.atan2(zb - za, xb - xa), id: stableId(desc.seed, 122, xa, za) });
    bridges.push({ x0: xa, z0: za, x1: xb, z1: zb, y0: H[best.a], y1: H[best.b] });
    // les cellules sous le pont deviennent praticables pour le tracé
    const steps = Math.ceil(Math.hypot(xb - xa, zb - za) / (s * 0.5));
    for (let q = 0; q <= steps; q++) {
      const t = q / steps;
      const k = cellOf(xa + (xb - xa) * t, za + (zb - za) * t);
      C[k] = 1.5;
    }
    return true;
  };
  const bridges = [];
  // terres accessibles à pied depuis l'accostage : la terre principale, les terres reliées par un
  // pont de corde (lieu « pont de corde » ou pont construit ici) ; les autres îlots se visitent en barque
  if (comp && home >= 0) {
    const reach = new Set([home]);
    const compOf = (nd) => comp[nd.k];
    let grew = true;
    while (grew) {
      grew = false;
      for (const nd of all) {
        const c = compOf(nd);
        if (c < 0 || reach.has(c)) continue;
        const twin = nd.bridge !== undefined && all.find((o) => o !== nd && o.poi === nd.poi && reach.has(compOf(o)));
        let ok = !!twin;
        for (const r of reach) {
          if (ok) break;
          ok = bridgeBetween(r, c);
        }
        if (ok) {
          reach.add(c);
          grew = true;
        }
      }
    }
    valid = all.filter((nd) => {
      const c = compOf(nd);
      if (c < 0 || reach.has(c)) return true;
      if (nd.poi) nd.poi.byBoat = true;
      return false;
    });
  }
  spanning();
  const degree = new Int32Array(valid.length);
  for (const [a, b] of edges) {
    const A = valid[a];
    const B = valid[b];
    if (A.poi && A.poi === B.poi && A.bridge !== undefined) continue;
    let ok = astar(C, n, A.k, B.k, prev);
    if (!ok && comp && comp[A.k] >= 0 && comp[B.k] >= 0 && comp[A.k] !== comp[B.k] && bridgeBetween(comp[A.k], comp[B.k])) ok = astar(C, n, A.k, B.k, prev);
    if (!ok) {
      failed++;
      (P.failedLinks ||= []).push([A.label, B.label, comp?.[A.k], comp?.[B.k], H[A.k], H[B.k]]);
      continue;
    }
    degree[a]++;
    degree[b]++;
    const cells = [];
    for (let k = B.k; k !== -1; k = prev[k]) cells.push(k);
    cells.reverse();
    const pts = [];
    for (const k of cells) {
      pts.push(-ext + (k % n) * s, -ext + Math.floor(k / n) * s, 0, 0);
      pathMask[k] = 1;
      C[k] = Math.min(C[k], 1.2); // les chemins suivants réutilisent les anciens
    }
    const sm = chaikin(pts, 4, 2);
    const flat = [];
    for (let q = 0; q < sm.length; q += 4) flat.push(sm[q], sm[q + 1]);
    const main = A.poi?.type === 'village' || B.poi?.type === 'village' || A.label === 'Plage' || B.label === 'Plage';
    const width = main ? 2.4 : 1.7;
    paths.push({ pts: flat, w: width, kind: main ? 'grand' : 'sentier' });
    // ponts sur les rivières, escaliers dans les pentes raides
    let inRiver = -1;
    for (let q = 0; q < cells.length; q++) {
      const k = cells[q];
      if (water[k] === 2 && inRiver < 0) inRiver = q;
      if ((water[k] !== 2 || q === cells.length - 1) && inRiver >= 0) {
        const k0 = cells[Math.max(0, inRiver - 1)];
        const k1 = cells[Math.min(cells.length - 1, q)];
        const x0 = -ext + (k0 % n) * s;
        const z0 = -ext + Math.floor(k0 / n) * s;
        const x1 = -ext + (k1 % n) * s;
        const z1 = -ext + Math.floor(k1 / n) * s;
        parts.push({ t: 'pont', x: (x0 + x1) / 2, z: (z0 + z1) / 2, y: Math.max(H[k0], H[k1]) + 0.1, rot: Math.atan2(z1 - z0, x1 - x0), len: Math.hypot(x1 - x0, z1 - z0) + 2, id: stableId(desc.seed, 120, x0, z0) });
        inRiver = -1;
      }
    }
    // les segments raides consécutifs (même cap, même sens) forment une seule volée de marches
    let run = null;
    const flush = () => {
      if (!run) return;
      const len = Math.hypot(run.x1 - run.x0, run.z1 - run.z0);
      const rise = Math.abs(run.h1 - run.h0);
      // y = 0 : posée sur le relief au mètre en son milieu
      if (len > 0.5) parts.push({ t: 'escalier', x: (run.x0 + run.x1) / 2, z: (run.z0 + run.z1) / 2, y: 0, rot: Math.atan2(run.z1 - run.z0, run.x1 - run.x0) + (run.h1 < run.h0 ? Math.PI : 0), len, rise });
      run = null;
    };
    for (let q = 0; q + 2 < flat.length - 2; q += 2) {
      const x0 = flat[q];
      const z0 = flat[q + 1];
      const x1 = flat[q + 2];
      const z1 = flat[q + 3];
      const h0 = bilinear(H, n, (x0 + ext) / s, (z0 + ext) / s);
      const h1 = bilinear(H, n, (x1 + ext) / s, (z1 + ext) / s);
      const len = Math.hypot(x1 - x0, z1 - z0);
      const steep = len > 0.3 && Math.abs(h1 - h0) / len > 0.38;
      if (!steep) {
        flush();
        continue;
      }
      const dir = Math.atan2(z1 - z0, x1 - x0);
      const up = h1 > h0;
      if (run) {
        let dd = Math.abs(dir - run.dir);
        if (dd > Math.PI) dd = Math.PI * 2 - dd;
        if (dd > 0.35 || up !== run.up || Math.hypot(x1 - run.x0, z1 - run.z0) > 7) flush();
      }
      if (!run) run = { x0, z0, h0, dir, up, x1, z1, h1 };
      else Object.assign(run, { x1, z1, h1 });
    }
    flush();
  }
  // panneaux indicateurs aux carrefours
  valid.forEach((nd, i) => {
    if (degree[i] >= 3 || (nd.poi?.type === 'village' && degree[i] >= 2)) {
      const off = nd.poi?.type === 'village' ? 6 : 3;
      parts.push({ t: 'panneau', x: nd.x + off, z: nd.z + 1.5, y: 0, rot: 0, id: stableId(desc.seed, 121, nd.x, nd.z) });
    }
  });
  // aplanir doucement l'emprise des chemins (sans relief fin)
  for (let j = 1; j < n - 1; j++) {
    for (let i = 1; i < n - 1; i++) {
      const k = j * n + i;
      if (!pathMask[k] || water[k]) continue;
      H[k] = H[k] * 0.5 + (H[k - 1] + H[k + 1] + H[k - n] + H[k + n]) * 0.125;
      if (P.A) P.A[k] = Math.min(P.A[k], 4);
    }
  }
  return { paths, parts, landing, pathMask, nodes: valid.length, failed, bridges };
}
