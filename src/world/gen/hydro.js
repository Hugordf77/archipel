// Passe 1c — hydrologie sur la grille de 4 m : remplissage des cuvettes
// (priority-flood), directions d'écoulement, accumulation, lacs, rivières
// (niveau toujours décroissant jusqu'à la mer ou un lac), lits creusés, cascades.
import { MinHeap } from './grid.js';

const DI = [1, -1, 0, 0, 1, 1, -1, -1];
const DJ = [0, 0, 1, -1, 1, -1, 1, -1];

export function priorityFlood(H, n) {
  const N = n * n;
  const F = new Float32Array(N);
  const dir = new Int32Array(N).fill(-2); // -2 non visité, -1 mer (exutoire)
  const order = new Int32Array(N);
  let ord = 0;
  const heap = new MinHeap(N);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      if (H[k] <= 0 || i === 0 || j === 0 || i === n - 1 || j === n - 1) {
        dir[k] = -1;
        F[k] = Math.max(0, H[k]);
        heap.push(F[k], k);
      }
    }
  }
  while (heap.size) {
    const c = heap.pop();
    order[ord++] = c;
    const ci = c % n;
    const cj = (c - ci) / n;
    const fc = F[c];
    for (let d = 0; d < 8; d++) {
      const i = ci + DI[d];
      const j = cj + DJ[d];
      if (i < 0 || j < 0 || i >= n || j >= n) continue;
      const k = j * n + i;
      if (dir[k] !== -2) continue;
      dir[k] = c;
      F[k] = Math.max(H[k], fc + (d < 4 ? 1e-3 : 1.4e-3));
      heap.push(F[k], k);
    }
  }
  return { F, dir, order: order.subarray(0, ord) };
}

// écoulement cumulé : chaque cellule de terre reçoit un peu de pluie (plus en altitude)
export function accumulate(H, dir, order, hmax) {
  const acc = new Float32Array(H.length);
  for (let k = 0; k < H.length; k++) if (H[k] > 0) acc[k] = 1 + 1.5 * Math.max(0, H[k] / Math.max(1, hmax));
  for (let o = order.length - 1; o >= 0; o--) {
    const c = order[o];
    const d = dir[c];
    if (d >= 0) acc[d] += acc[c];
  }
  return acc;
}

// lacs : cuvettes assez grandes et profondes une fois remplies
export function findLakes(H, F, n, s) {
  const N = n * n;
  const lakeOf = new Int32Array(N).fill(-1);
  const lakes = [];
  const seen = new Uint8Array(N);
  const stack = new Int32Array(N);
  for (let k0 = 0; k0 < N; k0++) {
    if (seen[k0] || F[k0] - H[k0] < 0.25 || F[k0] < 0.3) continue;
    let sp = 0;
    stack[sp++] = k0;
    seen[k0] = 1;
    const cells = [];
    let level = 0;
    let depth = 0;
    while (sp) {
      const c = stack[--sp];
      cells.push(c);
      level = Math.max(level, F[c]);
      depth = Math.max(depth, F[c] - H[c]);
      const ci = c % n;
      const cj = (c - ci) / n;
      for (let d = 0; d < 8; d++) {
        const i = ci + DI[d];
        const j = cj + DJ[d];
        if (i < 0 || j < 0 || i >= n || j >= n) continue;
        const k = j * n + i;
        if (seen[k] || F[k] - H[k] < 0.25 || F[k] < 0.3) continue;
        seen[k] = 1;
        stack[sp++] = k;
      }
    }
    if (cells.length >= 8 && depth >= 0.8) {
      const id = lakes.length;
      let x0 = Infinity;
      let x1 = -Infinity;
      let z0 = Infinity;
      let z1 = -Infinity;
      for (const c of cells) {
        lakeOf[c] = id;
        const ci = c % n;
        const cj = (c - ci) / n;
        x0 = Math.min(x0, ci);
        x1 = Math.max(x1, ci);
        z0 = Math.min(z0, cj);
        z1 = Math.max(z1, cj);
      }
      lakes.push({ id, level: level - 0.05, depth, cells: Int32Array.from(cells), box: [x0, z0, x1, z1], area: cells.length * s * s });
    }
  }
  return { lakes, lakeOf };
}

// Rives des lacs : après toutes les passes qui creusent le relief (lits, plates-formes, chemins),
// aucune cellule voisine d'un lac ne doit passer sous son niveau, sauf l'exutoire (rivière).
// Renvoie les cellules de rive (le relief fin y est coupé).
export function sealLakes(H, n, lakes, water) {
  const rim = [];
  for (const lk of lakes) {
    const own = new Set(lk.cells);
    for (const k of lk.cells) {
      const ci = k % n;
      const cj = (k - ci) / n;
      for (let d = 0; d < 8; d++) {
        const i = ci + DI[d];
        const j = cj + DJ[d];
        if (i < 0 || j < 0 || i >= n || j >= n) continue;
        const q = j * n + i;
        if (own.has(q) || water[q]) continue;
        if (H[q] < lk.level + 0.1) H[q] = lk.level + 0.1;
        rim.push(q);
      }
    }
  }
  return rim;
}

// rivières : cellules à fort débit, tracées de la source jusqu'à la mer, un lac ou un confluent
export function traceRivers(H, F, dir, acc, lakeOf, n, s, ext, T) {
  const N = n * n;
  const isRiv = (k) => acc[k] >= T && lakeOf[k] < 0 && H[k] > 0.3;
  const upRiver = new Uint8Array(N);
  for (let k = 0; k < N; k++) {
    if (!isRiv(k)) continue;
    const d = dir[k];
    if (d >= 0) upRiver[d] = 1;
  }
  const sources = [];
  for (let k = 0; k < N; k++) if (isRiv(k) && !upRiver[k]) sources.push(k);
  sources.sort((a, b) => H[b] - H[a]);
  const owner = new Int32Array(N).fill(-1);
  const rivers = [];
  for (const src of sources) {
    const cells = [];
    let k = src;
    let end = 'mer';
    let join = -1;
    while (k >= 0) {
      if (owner[k] >= 0) {
        end = 'confluent';
        join = owner[k];
        cells.push(k);
        break;
      }
      if (lakeOf[k] >= 0) {
        end = 'lac';
        join = lakeOf[k];
        cells.push(k);
        break;
      }
      cells.push(k);
      if (H[k] <= 0.15) break;
      const d = dir[k];
      if (d < 0) break;
      k = d;
    }
    if (cells.length < 8) continue;
    const id = rivers.length;
    for (let c = 0; c < cells.length - (end === 'mer' ? 0 : 1); c++) if (owner[cells[c]] < 0) owner[cells[c]] = id;
    rivers.push({ id, cells, end, join });
  }
  // points : centre des cellules, niveau toujours décroissant, largeur selon le débit
  for (const rv of rivers) {
    const pts = [];
    let lvl = Infinity;
    for (let c = 0; c < rv.cells.length; c++) {
      const k = rv.cells[c];
      const i = k % n;
      const j = (k - i) / n;
      const w = Math.min(9, 1.5 + Math.sqrt(acc[k] / T) * 1.4);
      const target = rv.end === 'lac' && c === rv.cells.length - 1 ? F[k] - 0.05 : H[k] - 0.22;
      lvl = Math.min(lvl - 0.03, target);
      pts.push(-ext + i * s, -ext + j * s, Math.max(0.04, lvl), w);
    }
    rv.pts = pts;
  }
  return { rivers, owner };
}

// lissage de Chaikin (x, z, niveau, largeur par point), extrémités conservées
export function chaikin(pts, stride = 4, passes = 2) {
  let p = pts;
  for (let pass = 0; pass < passes; pass++) {
    const m = p.length / stride;
    if (m < 3) return p;
    const out = [];
    for (let q = 0; q < stride; q++) out.push(p[q]);
    for (let i = 0; i < m - 1; i++) {
      for (const t of [0.25, 0.75]) {
        for (let q = 0; q < stride; q++) out.push(p[i * stride + q] * (1 - t) + p[(i + 1) * stride + q] * t);
      }
    }
    for (let q = 0; q < stride; q++) out.push(p[(m - 1) * stride + q]);
    p = out;
  }
  // le niveau reste strictement décroissant après lissage
  for (let i = stride; i < p.length; i += stride) p[i + 2] = Math.min(p[i + 2], p[i - stride + 2] - 0.005);
  return p;
}

// creuse les lits (profil parabolique) et marque les cellules d'eau
export function carveRivers(H, n, s, ext, rivers, waterMask) {
  for (const rv of rivers) {
    const p = rv.pts;
    for (let a = 0; a < p.length - 4; a += 4) {
      const ax = p[a];
      const az = p[a + 1];
      const bx = p[a + 4];
      const bz = p[a + 5];
      const w = Math.max(p[a + 3], p[a + 7]);
      const reach = w * 0.75 + s * 1.5;
      const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - reach + ext) / s));
      const i1 = Math.min(n - 1, Math.ceil((Math.max(ax, bx) + reach + ext) / s));
      const j0 = Math.max(0, Math.floor((Math.min(az, bz) - reach + ext) / s));
      const j1 = Math.min(n - 1, Math.ceil((Math.max(az, bz) + reach + ext) / s));
      const dx = bx - ax;
      const dz = bz - az;
      const l2 = dx * dx + dz * dz || 1e-9;
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const x = -ext + i * s;
          const z = -ext + j * s;
          const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
          const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
          const half = (p[a + 3] * (1 - t) + p[a + 7] * t) * 0.5;
          if (d > half * 1.5 + s * 0.5) continue;
          const lvl = p[a + 2] * (1 - t) + p[a + 6] * t;
          const depth = 0.35 + half * 0.18;
          const k = j * n + i;
          const bed = lvl - depth + Math.pow(Math.min(1.5, d / half), 2) * depth * 1.05;
          if (bed < H[k]) H[k] = bed;
          if (d < half) waterMask[k] = 2;
        }
      }
    }
  }
}

// cascades : le niveau chute d'au moins 3,5 m sur moins de 8 m ; au plus deux par
// rivière (à 40 m d'écart au moins) et six par île, les plus hautes d'abord
export function findWaterfalls(rivers) {
  const out = [];
  for (const rv of rivers) {
    const p = rv.pts;
    let lastS = -Infinity;
    let along = 0;
    let found = 0;
    for (let a = 0; a < p.length - 8 && found < 2; a += 4) {
      if (a > 0) along += Math.hypot(p[a] - p[a - 4], p[a + 1] - p[a - 3]);
      for (let b = a + 4; b < p.length; b += 4) {
        const hd = Math.hypot(p[b] - p[a], p[b + 1] - p[a + 1]);
        if (hd > 8) break;
        const drop = p[a + 2] - p[b + 2];
        if (drop >= 3.5) {
          if (along - lastS > 40) {
            out.push({ river: rv.id, x: (p[a] + p[b]) / 2, z: (p[a + 1] + p[b + 1]) / 2, top: p[a + 2], bottom: p[b + 2], drop, dx: p[b] - p[a], dz: p[b + 1] - p[a + 1], w: p[a + 3] });
            lastS = along;
            found++;
          }
          break;
        }
      }
    }
  }
  out.sort((a, b) => b.drop - a.drop);
  return out.slice(0, 6);
}
