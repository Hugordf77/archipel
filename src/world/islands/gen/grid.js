// Outils de grille partagés par les passes de génération (Worker) et par le
// relief au mètre (fil principal). Grille carrée n × n couvrant [-ext, ext]².

export class Grid {
  constructor(n, ext) {
    this.n = n;
    this.ext = ext;
    this.s = (2 * ext) / (n - 1);
    this.N = n * n;
  }
  x(i) {
    return -this.ext + i * this.s;
  }
  // coordonnées locales → indices fractionnaires
  fi(lx) {
    return (lx + this.ext) / this.s;
  }
  inside(i, j) {
    return i >= 0 && j >= 0 && i < this.n && j < this.n;
  }
}

// interpolation bilinéaire d'un champ scalaire
export function bilinear(arr, n, fi, fj) {
  const i = Math.max(0, Math.min(n - 1.0001, fi));
  const j = Math.max(0, Math.min(n - 1.0001, fj));
  const i0 = Math.floor(i);
  const j0 = Math.floor(j);
  const u = i - i0;
  const v = j - j0;
  const k = j0 * n + i0;
  return (arr[k] * (1 - u) + arr[k + 1] * u) * (1 - v) + (arr[k + n] * (1 - u) + arr[k + n + 1] * u) * v;
}

// interpolation bicubique (Catmull-Rom) : relief lisse au mètre à partir de la grille de 4 m
function cr(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
export function bicubic(arr, n, fi, fj) {
  const i = Math.max(0, Math.min(n - 1.0001, fi));
  const j = Math.max(0, Math.min(n - 1.0001, fj));
  const i0 = Math.floor(i);
  const j0 = Math.floor(j);
  const u = i - i0;
  const v = j - j0;
  const row = (jj) => {
    const jc = Math.max(0, Math.min(n - 1, jj)) * n;
    const a = arr[jc + Math.max(0, i0 - 1)];
    const b = arr[jc + i0];
    const c = arr[jc + Math.min(n - 1, i0 + 1)];
    const d = arr[jc + Math.min(n - 1, i0 + 2)];
    return cr(a, b, c, d, u);
  };
  return cr(row(j0 - 1), row(j0), row(j0 + 1), row(j0 + 2), v);
}

// pente (norme du gradient, m/m) d'une cellule
export function slopeAt(H, n, s, i, j) {
  const il = Math.max(0, i - 1);
  const ir = Math.min(n - 1, i + 1);
  const jd = Math.max(0, j - 1);
  const ju = Math.min(n - 1, j + 1);
  const gx = (H[j * n + ir] - H[j * n + il]) / ((ir - il) * s);
  const gz = (H[ju * n + i] - H[jd * n + i]) / ((ju - jd) * s);
  return Math.sqrt(gx * gx + gz * gz);
}

// file de priorité (tas binaire) sur clés flottantes, sans allocation par élément
export class MinHeap {
  constructor(cap) {
    this.k = new Float64Array(cap);
    this.v = new Int32Array(cap);
    this.size = 0;
  }
  push(key, val) {
    if (this.size >= this.k.length) {
      const k = new Float64Array(this.k.length * 2);
      k.set(this.k);
      const v = new Int32Array(this.v.length * 2);
      v.set(this.v);
      this.k = k;
      this.v = v;
    }
    let i = this.size++;
    const { k, v } = this;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p];
      v[i] = v[p];
      i = p;
    }
    k[i] = key;
    v[i] = val;
  }
  // renvoie la valeur du plus petit élément (sa clé reste lisible dans lastKey)
  pop() {
    const { k, v } = this;
    const top = v[0];
    this.lastKey = k[0];
    const n = --this.size;
    if (n > 0) {
      const key = k[n];
      const val = v[n];
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && k[c + 1] < k[c]) c++;
        if (k[c] >= key) break;
        k[i] = k[c];
        v[i] = v[c];
        i = c;
      }
      k[i] = key;
      v[i] = val;
    }
    return top;
  }
}

// distance (m) au plus proche « germe » : transformée de distance chanfrein 8 voisins
export function distanceField(n, s, isSeed) {
  const D = new Float32Array(n * n).fill(1e9);
  for (let k = 0; k < n * n; k++) if (isSeed(k)) D[k] = 0;
  const a = s;
  const b = s * Math.SQRT2;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      let d = D[k];
      if (i > 0) d = Math.min(d, D[k - 1] + a);
      if (j > 0) {
        d = Math.min(d, D[k - n] + a);
        if (i > 0) d = Math.min(d, D[k - n - 1] + b);
        if (i < n - 1) d = Math.min(d, D[k - n + 1] + b);
      }
      D[k] = d;
    }
  }
  for (let j = n - 1; j >= 0; j--) {
    for (let i = n - 1; i >= 0; i--) {
      const k = j * n + i;
      let d = D[k];
      if (i < n - 1) d = Math.min(d, D[k + 1] + a);
      if (j < n - 1) {
        d = Math.min(d, D[k + n] + a);
        if (i < n - 1) d = Math.min(d, D[k + n + 1] + b);
        if (i > 0) d = Math.min(d, D[k + n - 1] + b);
      }
      D[k] = d;
    }
  }
  return D;
}

export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// identifiant stable (32 bits) d'un élément : graine d'île, type, position au décimètre
export function stableId(seed, type, x, z) {
  let h = (seed ^ Math.imul(type + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ Math.round(x * 10), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13) ^ Math.round(z * 10), 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}
