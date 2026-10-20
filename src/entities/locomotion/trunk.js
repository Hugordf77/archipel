// Géométrie pure d'un tronc grimpable (ni THREE ni DOM), partagée par le moteur (locomotion/motor.js)
// et la pose. Le tronc est une polyligne monde pts = [[x, y, z, r], …] du pied vers le haut (format
// grimpe des physique.js, passé au monde par troncMonde de world/navigation.js) : entre deux points,
// l'axe et le rayon d'écorce r varient linéairement. Unités : m, rad, coordonnées monde.
//
// - s : abscisse curviligne le long de l'axe depuis le pied (m), bornée à [0, longueur].
// - A(s) : point de l'axe ; r(s) : rayon de l'écorce.
// - tangente t(s) : unitaire et continue. Aux points de la polyligne, moyenne des deux tronçons ; entre
//   eux, interpolation normalisée : le corps s'incline sans à-coup au passage d'un coude (le stipe du
//   palmier tourne de 2 à 4° à chaque point, celui de l'île de départ de 7°).
// - n(θ) : unitaire, ⟂ à t(s), d'azimut monde θ : sa projection horizontale est ∝ (sin θ, 0, cos θ),
//   même convention que le cap du moteur (avant = (sin cap, cos cap)). Avec h = (sin θ, 0, cos θ) :
//   n = (sin θ, b, cos θ) / √(1 + b²), b = −(tx sin θ + tz cos θ) / ty (un tronc n'est jamais
//   horizontal : ty > 0). La projection horizontale de n a pour norme 1 / √(1 + b²) (cos de l'inclinaison
//   du tronc dans la direction θ).
// - Corps qui grimpe : racine en A(s) + (r(s) + écart) · n(θ), cap θ + π (face au tronc). θ croissant
//   déplace la racine de dA/dθ ∝ (cos θ, 0, −sin θ) : vers la droite de l'écran quand la caméra est
//   derrière le personnage, c'est-à-dire vers son x local − (le x local + du modèle, côté HAND_R, est
//   (cos cap, −sin cap) = (−cos θ, sin θ)).

// longueurs cumulées et tangentes lissées aux points, calculées une fois par polyligne
const CACHE = new WeakMap();

function geo(pts) {
  let g = CACHE.get(pts);
  if (g) return g;
  const n = pts.length;
  const cum = new Float64Array(n);
  const seg = new Float64Array(3 * Math.max(1, n - 1)); // tangente unitaire de chaque tronçon
  for (let i = 1; i < n; i++) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dy = pts[i][1] - pts[i - 1][1];
    const dz = pts[i][2] - pts[i - 1][2];
    const l = Math.hypot(dx, dy, dz);
    cum[i] = cum[i - 1] + l;
    const k = 3 * (i - 1);
    if (l > 1e-9) {
      seg[k] = dx / l;
      seg[k + 1] = dy / l;
      seg[k + 2] = dz / l;
    } else seg[k + 1] = 1;
  }
  if (n < 2) seg[1] = 1;
  // tangente aux points : premier et dernier tronçons aux extrémités, moyenne des voisins ailleurs
  const vt = new Float64Array(3 * n);
  for (let i = 0; i < n; i++) {
    const a = 3 * Math.max(0, Math.min(i - 1, n - 2));
    const b = 3 * Math.max(0, Math.min(i, n - 2));
    let x = seg[a] + seg[b];
    let y = seg[a + 1] + seg[b + 1];
    let z = seg[a + 2] + seg[b + 2];
    const l = Math.hypot(x, y, z) || 1;
    vt[3 * i] = x / l;
    vt[3 * i + 1] = y / l;
    vt[3 * i + 2] = z / l;
  }
  g = { n, cum, vt, len: cum[n - 1] };
  CACHE.set(pts, g);
  return g;
}

// Longueur de l'axe (m)
export function trunkLength(pts) {
  return geo(pts).len;
}

// n(θ) pour une tangente unitaire (tx, ty, tz) : unitaire, ⟂ à la tangente, d'azimut monde θ
export function trunkNormal(tx, ty, tz, theta, out) {
  const sx = Math.sin(theta);
  const sz = Math.cos(theta);
  const b = -(tx * sx + tz * sz) / Math.max(ty, 1e-6);
  const k = 1 / Math.sqrt(1 + b * b);
  out.nx = sx * k;
  out.ny = b * k;
  out.nz = sz * k;
  return out;
}

// Repère du tronc en s pour un corps d'azimut θ : point de l'axe (x, y, z), rayon r, tangente unitaire
// (tx, ty, tz) et n(θ) (nx, ny, nz). s est borné à [0, longueur] (out.s).
export function trunkFrame(pts, s, theta, out) {
  const g = geo(pts);
  const n = g.n;
  const cum = g.cum;
  const sc = s < 0 ? 0 : s > g.len ? g.len : s;
  out.s = sc;
  if (n < 2) {
    const p = pts[0];
    out.x = p[0];
    out.y = p[1];
    out.z = p[2];
    out.r = p[3];
    out.tx = out.tz = 0;
    out.ty = 1;
    return trunkNormal(0, 1, 0, theta, out);
  }
  let i = 0;
  while (i < n - 2 && cum[i + 1] < sc) i++;
  const l = cum[i + 1] - cum[i];
  const f = l > 1e-9 ? (sc - cum[i]) / l : 0;
  const a = pts[i];
  const b = pts[i + 1];
  out.x = a[0] + (b[0] - a[0]) * f;
  out.y = a[1] + (b[1] - a[1]) * f;
  out.z = a[2] + (b[2] - a[2]) * f;
  out.r = a[3] + (b[3] - a[3]) * f;
  const vt = g.vt;
  const tx = vt[3 * i] + (vt[3 * i + 3] - vt[3 * i]) * f;
  const ty = vt[3 * i + 1] + (vt[3 * i + 4] - vt[3 * i + 1]) * f;
  const tz = vt[3 * i + 2] + (vt[3 * i + 5] - vt[3 * i + 2]) * f;
  const tl = Math.hypot(tx, ty, tz) || 1;
  out.tx = tx / tl;
  out.ty = ty / tl;
  out.tz = tz / tl;
  return trunkNormal(out.tx, out.ty, out.tz, theta, out);
}

// Point de l'axe le plus proche de (x, y, z) : abscisse s, distance d, rayon r et point (x, y, z)
export function trunkClosest(pts, x, y, z, out) {
  const g = geo(pts);
  let best = Infinity;
  out.s = 0;
  out.d = Infinity;
  if (pts.length < 2) {
    const p = pts[0];
    out.x = p[0];
    out.y = p[1];
    out.z = p[2];
    out.r = p[3];
    out.d = Math.hypot(x - p[0], y - p[1], z - p[2]);
    return out;
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const l2 = ux * ux + uy * uy + uz * uz;
    let f = l2 > 1e-18 ? ((x - a[0]) * ux + (y - a[1]) * uy + (z - a[2]) * uz) / l2 : 0;
    f = f < 0 ? 0 : f > 1 ? 1 : f;
    const px = a[0] + ux * f;
    const py = a[1] + uy * f;
    const pz = a[2] + uz * f;
    const d = Math.hypot(x - px, y - py, z - pz);
    if (d < best) {
      best = d;
      out.d = d;
      out.s = g.cum[i] + (g.cum[i + 1] - g.cum[i]) * f;
      out.x = px;
      out.y = py;
      out.z = pz;
      out.r = a[3] + (b[3] - a[3]) * f;
    }
  }
  return out;
}

// Abscisse où l'axe atteint la hauteur y (l'axe monte toujours : y croît d'un point au suivant), bornée
export function trunkSAtY(pts, y) {
  const g = geo(pts);
  if (y <= pts[0][1]) return 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i][1];
    const b = pts[i + 1][1];
    if (y <= b) return g.cum[i] + (g.cum[i + 1] - g.cum[i]) * (b > a ? (y - a) / (b - a) : 0);
  }
  return g.len;
}
