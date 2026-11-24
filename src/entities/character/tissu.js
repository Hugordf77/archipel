// Tissu simulé (pur, sans THREE ni DOM) : un ruban de particules (lignes × colonnes) intégré par Verlet à
// pas fixe, tenu par des contraintes de distance (le long, en travers, en diagonale : il ne s'étire pas ;
// à deux rangs : il résiste un peu au pli), poussé par la gravité et par le vent (pression sur la face,
// avec battement), arrêté par des sphères (le corps, la tête, le sac). La première ligne est épinglée à sa
// cible (le nœud de l'écharpe, porté par le torse). Positions en m, repère du monde (de la scène).
//   repos : positions au repos (repère de liaison du personnage), ligne par ligne, [x, y, z] à la suite
//   M     : matrice 4 × 4 (colonnes, comme THREE.Matrix4.elements) du repère de liaison vers le monde

export const TISSU = {
  pas: 1 / 120, // s : même mouvement quelle que soit la cadence d'image
  maxPas: 8, // au plus par image (au-delà, le temps est perdu : pas de rattrapage en cascade)
  iter: 6, // passes de contraintes par pas
  gravite: 9.8,
  amorti: 0.015, // part de la vitesse perdue par pas (l'air, le frottement du tissu)
  pression: 2.2, // poussée du vent sur la face (m/s² par m/s de vent perpendiculaire)
  frottement: 0.5, // entraînement le long de la face (m/s² par m/s) : un tissu léger part avec le vent
  battement: 0.55, // part du vent qui bat (rafales courtes, propres à chaque particule)
  pli: 0.25, // raideur des contraintes à deux rangs (0 : chiffon, 1 : carton)
  marge: 0.012, // m : le tissu reste à cette distance des sphères
  saut: 1.0, // m : une épingle qui saute plus loin en une image (téléportation) replace le ruban au repos
};

function versMonde(M, x, y, z, out, o) {
  out[o] = M[0] * x + M[4] * y + M[8] * z + M[12];
  out[o + 1] = M[1] * x + M[5] * y + M[9] * z + M[13];
  out[o + 2] = M[2] * x + M[6] * y + M[10] * z + M[14];
}

// Ruban de lignes × colonnes particules ; epingles : lignes tenues (1 : la première)
export function creerRuban(repos, lignes, colonnes, { epingles = 1 } = {}) {
  const n = lignes * colonnes;
  const t = {
    lignes,
    colonnes,
    n,
    repos: Float32Array.from(repos),
    p: new Float32Array(n * 3),
    q: new Float32Array(n * 3),
    nrm: new Float32Array(n * 3),
    tenu: new Uint8Array(n),
    contraintes: [],
    reste: 0,
    pret: false,
  };
  for (let i = 0; i < epingles * colonnes; i++) t.tenu[i] = 1;
  const id = (l, c) => l * colonnes + c;
  const lien = (a, b, k) => {
    const dx = repos[a * 3] - repos[b * 3];
    const dy = repos[a * 3 + 1] - repos[b * 3 + 1];
    const dz = repos[a * 3 + 2] - repos[b * 3 + 2];
    t.contraintes.push([a, b, Math.hypot(dx, dy, dz), k]);
  };
  for (let l = 0; l < lignes; l++) {
    for (let c = 0; c < colonnes; c++) {
      if (c + 1 < colonnes) lien(id(l, c), id(l, c + 1), 1);
      if (l + 1 < lignes) lien(id(l, c), id(l + 1, c), 1);
      if (l + 1 < lignes && c + 1 < colonnes) {
        lien(id(l, c), id(l + 1, c + 1), 0.8);
        lien(id(l, c + 1), id(l + 1, c), 0.8);
      }
      if (l + 2 < lignes) lien(id(l, c), id(l + 2, c), TISSU.pli);
      if (c + 2 < colonnes) lien(id(l, c), id(l, c + 2), TISSU.pli);
    }
  }
  return t;
}

// Replace tout le ruban à sa forme de repos, portée par M (et sans vitesse)
export function placer(t, M) {
  for (let i = 0; i < t.n; i++) {
    versMonde(M, t.repos[i * 3], t.repos[i * 3 + 1], t.repos[i * 3 + 2], t.p, i * 3);
    t.q[i * 3] = t.p[i * 3];
    t.q[i * 3 + 1] = t.p[i * 3 + 1];
    t.q[i * 3 + 2] = t.p[i * 3 + 2];
  }
  t.pret = true;
}

// normales des particules (pour la pression du vent et l'éclairage) : produit des écarts aux voisines
export function normales(t, out = t.nrm) {
  const { lignes, colonnes, p } = t;
  for (let l = 0; l < lignes; l++) {
    for (let c = 0; c < colonnes; c++) {
      const i = l * colonnes + c;
      const g = l * colonnes + Math.max(c - 1, 0);
      const d = l * colonnes + Math.min(c + 1, colonnes - 1);
      const h = Math.max(l - 1, 0) * colonnes + c;
      const b = Math.min(l + 1, lignes - 1) * colonnes + c;
      const ux = p[d * 3] - p[g * 3];
      const uy = p[d * 3 + 1] - p[g * 3 + 1];
      const uz = p[d * 3 + 2] - p[g * 3 + 2];
      const vx = p[b * 3] - p[h * 3];
      const vy = p[b * 3 + 1] - p[h * 3 + 1];
      const vz = p[b * 3 + 2] - p[h * 3 + 2];
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      const L = Math.hypot(nx, ny, nz) || 1;
      out[i * 3] = nx / L;
      out[i * 3 + 1] = ny / L;
      out[i * 3 + 2] = nz / L;
    }
  }
  return out;
}

// Fait avancer le tissu de dt secondes. M : repère des épingles ; vent : [x, y, z] (m/s, monde) ;
// temps : horloge (s, pour le battement) ; spheres : [[x, y, z, r], …] (monde)
export function pasTissu(t, { M, vent, temps = 0, spheres = [], dt }) {
  const R = TISSU;
  const { p, q, tenu, repos, n } = t;
  if (!t.pret) placer(t, M);
  // épingles : cible de la première ligne ; un saut (téléportation, recentrage du monde) replace tout
  const cible = (t._cible ||= new Float32Array(n * 3));
  let saut = 0;
  for (let i = 0; i < n; i++) {
    if (!tenu[i]) continue;
    versMonde(M, repos[i * 3], repos[i * 3 + 1], repos[i * 3 + 2], cible, i * 3);
    saut = Math.max(saut, Math.hypot(cible[i * 3] - p[i * 3], cible[i * 3 + 1] - p[i * 3 + 1], cible[i * 3 + 2] - p[i * 3 + 2]));
  }
  if (saut > R.saut) {
    placer(t, M);
    return t;
  }
  t.reste = Math.min(t.reste + Math.max(dt, 0), R.pas * R.maxPas);
  // départ des épingles (interpolées sur les pas de l'image : pas d'à-coup à basse cadence)
  const depart = (t._depart ||= new Float32Array(n * 3));
  for (let i = 0; i < n; i++) {
    if (!tenu[i]) continue;
    depart[i * 3] = p[i * 3];
    depart[i * 3 + 1] = p[i * 3 + 1];
    depart[i * 3 + 2] = p[i * 3 + 2];
  }
  const nPas = Math.floor(t.reste / R.pas + 1e-9);
  const h = R.pas;
  const garde = 1 - R.amorti;
  for (let s = 0; s < nPas; s++) {
    const u = (s + 1) / nPas;
    const ts = temps - (nPas - 1 - s) * h;
    normales(t);
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      if (tenu[i]) {
        q[o] = p[o];
        q[o + 1] = p[o + 1];
        q[o + 2] = p[o + 2];
        p[o] = depart[o] + (cible[o] - depart[o]) * u;
        p[o + 1] = depart[o + 1] + (cible[o + 1] - depart[o + 1]) * u;
        p[o + 2] = depart[o + 2] + (cible[o + 2] - depart[o + 2]) * u;
        continue;
      }
      const vx = (p[o] - q[o]) / h;
      const vy = (p[o + 1] - q[o + 1]) / h;
      const vz = (p[o + 2] - q[o + 2]) / h;
      // vent propre à la particule : rafales courtes, décalées d'une particule à l'autre (le tissu bat)
      const b = 1 + R.battement * (Math.sin(ts * 9.3 + i * 1.7) * 0.6 + Math.sin(ts * 15.1 + i * 2.9) * 0.4);
      const wx = vent[0] * b - vx;
      const wy = vent[1] * b - vy + R.battement * 0.5 * Math.sin(ts * 11.7 + i * 0.9) * Math.hypot(vent[0], vent[2]);
      const wz = vent[2] * b - vz;
      const nx = t.nrm[o];
      const ny = t.nrm[o + 1];
      const nz = t.nrm[o + 2];
      const wn = wx * nx + wy * ny + wz * nz;
      const ax = R.pression * wn * nx + R.frottement * wx;
      const ay = R.pression * wn * ny + R.frottement * wy - R.gravite;
      const az = R.pression * wn * nz + R.frottement * wz;
      const px = p[o];
      const py = p[o + 1];
      const pz = p[o + 2];
      p[o] = px + (px - q[o]) * garde + ax * h * h;
      p[o + 1] = py + (py - q[o + 1]) * garde + ay * h * h;
      p[o + 2] = pz + (pz - q[o + 2]) * garde + az * h * h;
      q[o] = px;
      q[o + 1] = py;
      q[o + 2] = pz;
    }
    for (let it = 0; it < R.iter; it++) {
      for (const [a, b, L, k] of t.contraintes) {
        const ax = a * 3;
        const bx = b * 3;
        const dx = p[bx] - p[ax];
        const dy = p[bx + 1] - p[ax + 1];
        const dz = p[bx + 2] - p[ax + 2];
        const d = Math.hypot(dx, dy, dz) || 1e-6;
        const ta = tenu[a] ? 0 : 1;
        const tb = tenu[b] ? 0 : 1;
        const w = ta + tb;
        if (!w) continue;
        const f = (((d - L) / d) * k) / w;
        p[ax] += dx * f * ta;
        p[ax + 1] += dy * f * ta;
        p[ax + 2] += dz * f * ta;
        p[bx] -= dx * f * tb;
        p[bx + 1] -= dy * f * tb;
        p[bx + 2] -= dz * f * tb;
      }
      // collisions : le tissu glisse sur les sphères du corps
      for (const [cx, cy, cz, r] of spheres) {
        const rr = r + R.marge;
        for (let i = 0; i < n; i++) {
          if (tenu[i]) continue;
          const o = i * 3;
          const dx = p[o] - cx;
          const dy = p[o + 1] - cy;
          const dz = p[o + 2] - cz;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 >= rr * rr) continue;
          const d = Math.sqrt(d2) || 1e-6;
          p[o] = cx + (dx / d) * rr;
          p[o + 1] = cy + (dy / d) * rr;
          p[o + 2] = cz + (dz / d) * rr;
        }
      }
    }
  }
  t.reste -= nPas * h;
  normales(t);
  return t;
}
