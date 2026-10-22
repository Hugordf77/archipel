// Îles célestes : îles flottantes au-dessus de la mer (archipel.js, ARCHIPEL.ciel). Chaque île est un
// pain de roche suspendu : dessus herbeux et vallonné (marchable), lèvre arrondie, dessous en cône de
// roche déchiqueté qui pend dans le vide ; arbres et décor sur le dessus, un ruisseau qui se jette
// dans le vide en cascade. Module pur et déterministe (maillage, sol marchable, tests).
import { makeNoise, fbm } from '../../core/noise.js';
import { mulberry32 } from '../../core/random.js';
import { ARCHIPEL } from '../archipel.js';
import { KIND_INDEX, KIND_RADIUS, STRIDE } from '../islands/gen/kinds.js';
import { stableId } from '../islands/gen/grid.js';

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const cache = new Map();
export function cielContext(c) {
  let k = cache.get(c.id);
  if (k) return k;
  k = { c, n1: makeNoise(c.seed ^ 0x51e1), n2: makeNoise(c.seed ^ 0x7a11), n3: makeNoise(c.seed ^ 0x3c3c), n4: makeNoise(c.seed ^ 0x9d9d) };
  cache.set(c.id, k);
  return k;
}

// rayon du contour (m) dans la direction a : bords festonnés, boucle fermée (bruit pris sur un cercle)
export function rayonAt(k, a) {
  const v = fbm(k.n1, Math.cos(a) * 1.4 + 3, Math.sin(a) * 1.4 - 2, 3);
  return k.c.r * (0.82 + 0.2 * v);
}

// position relative au contour : q = 0 au centre, 1 au bord
function qAt(k, lx, lz) {
  const d = Math.hypot(lx, lz);
  return d / rayonAt(k, Math.atan2(lz, lx));
}

// hauteur du dessus (m, absolue) à la position relative q : vallons doux, bombé, lèvre arrondie
function dessusQ(k, lx, lz, q) {
  const c = k.c;
  const hills = 3.5 * fbm(k.n2, lx / 42, lz / 42, 3) * smooth(1, 0.55, q);
  return c.alt + hills + 2.5 * smooth(0.75, 0, q) - 3.5 * smooth(0.8, 1.02, q);
}

// hauteur du dessous (m, absolue) : cône de roche déchiqueté, plus profond au centre
function dessousQ(k, lx, lz, q) {
  const c = k.c;
  const rag = 0.72 + 0.28 * (0.5 + 0.5 * fbm(k.n3, lx / 14, lz / 14, 3));
  const depth = c.r * 1.05 * Math.pow(Math.max(0, 1 - q), 0.62) * rag;
  return c.alt - 4 - depth;
}

export function dessusAt(k, lx, lz) {
  const q = qAt(k, lx, lz);
  return q <= 1 ? dessusQ(k, lx, lz, q) : null;
}
export function dessousAt(k, lx, lz) {
  const q = qAt(k, lx, lz);
  return q <= 1 ? dessousQ(k, lx, lz, q) : null;
}

// île céleste au-dessus du point (x, z) du monde : { top, bottom, ile } ou null
export function cielAt(x, z) {
  for (const c of ARCHIPEL.ciel) {
    const lx = x - c.x;
    const lz = z - c.z;
    if (Math.abs(lx) > c.r * 1.05 || Math.abs(lz) > c.r * 1.05) continue;
    const k = cielContext(c);
    const q = qAt(k, lx, lz);
    if (q > 1) continue;
    return { top: dessusQ(k, lx, lz, q), bottom: dessousQ(k, lx, lz, q), ile: c };
  }
  return null;
}

const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const HERBE = [hex('#9cd6a3'), hex('#82c690')];
const TERRE = hex('#d8c0a0');
const ROCHE_HAUT = hex('#d9b69c');
const ROCHE_BAS = hex('#a596b6');

// Maillage d'une île (coordonnées locales, y absolu) : anneaux concentriques du dessus (centre →
// bord), lèvre, puis dessous (bord → pointe). Couleurs : herbe, terre au bord, roche à strates.
export function buildCielMesh(c, NR = 20, NS = 120) {
  const k = cielContext(c);
  const rows = [];
  // profil : [q, surface] — 'top' de 0 à 1, lèvre, 'bot' de 1 à 0
  for (let i = 0; i <= NR; i++) rows.push([i / NR, 'top']);
  rows.push([1.04, 'lip']);
  for (let i = NR; i >= 0; i--) rows.push([i / NR, 'bot']);
  const nv = rows.length * NS;
  const positions = new Float32Array(nv * 3);
  const colors = new Float32Array(nv * 3);
  const rad = new Float32Array(NS);
  for (let s = 0; s < NS; s++) rad[s] = rayonAt(k, (s / NS) * Math.PI * 2);
  rows.forEach(([q, kind], r) => {
    for (let s = 0; s < NS; s++) {
      const a = (s / NS) * Math.PI * 2;
      // le centre de chaque surface est un point : léger décalage pour garder des triangles valides
      const qq = Math.max(q, 0.002);
      const x = Math.cos(a) * rad[s] * qq;
      const z = Math.sin(a) * rad[s] * qq;
      let y;
      if (kind === 'top') y = dessusQ(k, x, z, Math.min(q, 1));
      else if (kind === 'lip') y = c.alt - 4.6;
      else y = dessousQ(k, x, z, q);
      const o = (r * NS + s) * 3;
      positions[o] = x;
      positions[o + 1] = y;
      positions[o + 2] = z;
      let col;
      if (kind === 'top') {
        const t = 0.5 + 0.5 * fbm(k.n4, x / 18, z / 18, 2);
        col = HERBE[0].map((v, ch) => v + (HERBE[1][ch] - v) * t);
        const edge = smooth(0.86, 1, q);
        col = col.map((v, ch) => v + (TERRE[ch] - v) * edge);
      } else {
        // roche : chaude en haut, lavande vers la pointe, strates horizontales
        const t = smooth(c.alt - 2, c.alt - c.r * 0.9, y);
        const strate = 0.92 + 0.08 * Math.sin(y * 1.3 + fbm(k.n3, x / 20, z / 20, 2) * 2);
        col = ROCHE_HAUT.map((v, ch) => (v + (ROCHE_BAS[ch] - v) * t) * strate);
      }
      colors[o] = col[0];
      colors[o + 1] = col[1];
      colors[o + 2] = col[2];
    }
  });
  const index = new Uint32Array((rows.length - 1) * NS * 6);
  let m = 0;
  for (let r = 0; r < rows.length - 1; r++) {
    for (let s = 0; s < NS; s++) {
      const a = r * NS + s;
      const b = r * NS + ((s + 1) % NS);
      const d = (r + 1) * NS + s;
      const e = (r + 1) * NS + ((s + 1) % NS);
      // dessus vu d'en haut, dessous vu d'en bas : même sens de parcours, l'ordre suit le profil
      index[m++] = a;
      index[m++] = b;
      index[m++] = d;
      index[m++] = b;
      index[m++] = e;
      index[m++] = d;
    }
  }
  // normales : somme des normales des faces
  const normals = new Float32Array(nv * 3);
  for (let t = 0; t < index.length; t += 3) {
    const i0 = index[t] * 3;
    const i1 = index[t + 1] * 3;
    const i2 = index[t + 2] * 3;
    const ux = positions[i1] - positions[i0];
    const uy = positions[i1 + 1] - positions[i0 + 1];
    const uz = positions[i1 + 2] - positions[i0 + 2];
    const vx = positions[i2] - positions[i0];
    const vy = positions[i2 + 1] - positions[i0 + 1];
    const vz = positions[i2 + 2] - positions[i0 + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const i of [i0, i1, i2]) {
      normals[i] += nx;
      normals[i + 1] += ny;
      normals[i + 2] += nz;
    }
  }
  for (let i = 0; i < nv; i++) {
    const o = i * 3;
    const l = Math.hypot(normals[o], normals[o + 1], normals[o + 2]) || 1;
    normals[o] /= l;
    normals[o + 1] /= l;
    normals[o + 2] /= l;
  }
  return { positions, normals, colors, index };
}

// Ruisseau du dessus jusqu'au bord (cascade) : points [x, z, niveau, largeur] locaux, et la chute
export function ruisseauDe(c) {
  if (c.cascade === null || c.cascade === undefined) return null;
  const k = cielContext(c);
  const a = c.cascade;
  const R = rayonAt(k, a);
  const pts = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = 0.25 + (i / steps) * 0.75;
    const wob = 0.06 * Math.sin(t * 9 + (c.seed % 7));
    const x = Math.cos(a + wob) * R * t * 0.995;
    const z = Math.sin(a + wob) * R * t * 0.995;
    const q = Math.min(1, qAt(k, x, z));
    pts.push(x, z, dessusQ(k, x, z, q) + 0.08, 2.2 + t * 1.2);
  }
  const near = (x, z) => {
    let d = Infinity;
    for (let i = 0; i < pts.length; i += 4) d = Math.min(d, Math.hypot(x - pts[i], z - pts[i + 1]));
    return d;
  };
  return { pts, near, chute: { x: pts[pts.length - 4], z: pts[pts.length - 3], y: pts[pts.length - 2], dir: a, w: 3.6, h: Math.min(110, c.alt * 0.75) } };
}

// Arbres et décor du dessus (format des îles : espèce, x, y, z, rotation, échelle, variante ;
// x, z locaux, y absolu), loin du bord et du ruisseau
const DECOR = [['arbuste', 0.5], ['buisson_fleuri', 0.15], ['rocher_mousse', 0.12], ['souche', 0.04]];
export function placeCiel(c) {
  const k = cielContext(c);
  const rng = mulberry32(c.seed ^ 0xa4b1e5);
  const items = [];
  const ids = [];
  const pts = [];
  const ruisseau = ruisseauDe(c);
  const table = [...c.arbres.map(([kind, d]) => [kind, d * 0.55]), ...DECOR];
  const STEP = 2.5;
  for (let gz = -c.r; gz < c.r; gz += STEP) {
    for (let gx = -c.r; gx < c.r; gx += STEP) {
      const x = gx + rng() * STEP;
      const z = gz + rng() * STEP;
      const roll = rng();
      const rot = rng() * Math.PI * 2;
      const sr = rng();
      const vr = rng();
      if (qAt(k, x, z) > 0.8) continue;
      if (ruisseau && ruisseau.near(x, z) < 3) continue;
      // bosquets : densité modulée à grande échelle
      const g = 0.35 + 1.3 * smooth(-0.3, 0.4, fbm(k.n4, x / 30 + 4, z / 30 - 2, 2));
      let acc = 0;
      let kind = null;
      for (const [kd, d] of table) {
        acc += (d / 100) * STEP * STEP * g;
        if (roll < acc) {
          kind = kd;
          break;
        }
      }
      if (!kind || KIND_INDEX[kind] === undefined) continue;
      const sc = 0.75 + sr * 0.5;
      const rr = (KIND_RADIUS[kind] || 0.4) * sc + 0.4;
      if (pts.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + rr)) continue;
      pts.push([x, z, rr]);
      const ki = KIND_INDEX[kind];
      items.push(ki, x, dessusAt(k, x, z), z, rot, sc, vr);
      ids.push(stableId(c.seed, ki, x, z));
    }
  }
  return { items: Float32Array.from(items), ids: Uint32Array.from(ids) };
}
export { STRIDE };
