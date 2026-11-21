// Herbe en tapis (refonte « façon Breath of the Wild ») : placement pur des brins, sans THREE.
// Les brins sont générés par le shader (render/herbe/materiau.js) à partir de leur indice dans une
// cellule de CELL m et d'un hachage de la cellule : aucune donnée n'est stockée par brin. Les brins
// d'une cellule suivent une suite R2, dont tout préfixe reste bien réparti : un anneau de densité
// dessine seulement les premiers brins de chaque cellule (drawRange), et la densité locale (carte
// d'herbe de la tuile) en efface d'autres, sans changer la place de ceux qui restent.

export const CELL = 2; // m, côté d'une cellule
export const BLADES = 384; // brins par cellule au plus (96 par m²)
export const BLADE_VERTS = 7; // 3 tronçons et une pointe
export const BLADE_TRIS = 5;

// Forme d'un brin : largeur au pied (m) avec tous les brins d'une cellule, rétrécie de TAPER à la
// pointe ; moins de brins au loin, donc plus larges (part de BLADES à la puissance −WIDEN_EXP, au
// plus × WIDEN_MAX) : en 1/√part, la surface des brins par m² tomberait comme √n au loin et le sol
// percerait aux anneaux B et C. Le shader fait le même calcul (render/herbe/materiau.js).
export const BLADE_WIDTH = 0.1;
export const TAPER = 0.7;
export const WIDEN_EXP = 0.72;
export const WIDEN_MAX = 10;
export function bladeWidth(n) {
  return BLADE_WIDTH * Math.min(WIDEN_MAX, Math.pow(Math.max(n, 1e-6) / BLADES, -WIDEN_EXP));
}
// surface d'un brin de largeur 1 et de longueur 1 (profil : pied, 1/3, 2/3, pointe nulle)
const a1 = 1 - TAPER / 3;
const a2 = 1 - (2 * TAPER) / 3;
export const BLADE_AREA = ((1 + a1) / 2 + (a1 + a2) / 2 + a2 / 2) / 3;

// Couverture : surface des brins (largeur × longueur, la longueur d'un brin incliné restant celle
// de sa tige) par m² de sol à la distance d du joueur, pour une densité R et une longueur L (m).
export function couverture(d, P, R, L) {
  const n = bladesAt(d, P);
  if (n <= 0) return 0;
  return (n / (CELL * CELL)) * R * bladeWidth(n) * L * BLADE_AREA;
}

// Préréglages par qualité : anneaux centrés sur le joueur (distance horizontale, m) et brins par
// cellule de chaque anneau (A près, B à mi-distance, C loin) ; fade : part de chaque anneau où la
// densité glisse vers celle de l'anneau suivant (ni saut d'anneau ni pop de densité).
// 384 / 128 / 32 brins par cellule = 96 / 32 / 8 brins par m² ; fondus longs : le bord d'un anneau
// ne suit pas le joueur.
export const HERBE_PRESETS = {
  // pré fourni façon BotW (21/11/2026) : Moyen reprend l'ancien Haut, Haut va plus loin et plus dense
  high: { rings: [12, 38, 72], blades: [384, 160, 40], fade: 0.4 },
  medium: { rings: [10, 32, 60], blades: [384, 128, 32], fade: 0.4 },
  low: { rings: [7, 22, 22], blades: [128, 48, 0], fade: 0.4 },
};

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// Nombre continu de brins par cellule à la distance d du joueur (le shader fait le même calcul).
export function bladesAt(d, P) {
  const [rA, rB, rC] = P.rings;
  const [nA, nB, nC] = P.blades;
  const f = P.fade;
  const ramp = (r, n0, n1) => n0 + (n1 - n0) * smooth((d - r * (1 - f)) / (r * f));
  if (d <= rA * (1 - f)) return nA;
  if (d <= rA) return ramp(rA, nA, nB);
  if (d <= rB * (1 - f)) return nB;
  if (d <= rB) return ramp(rB, nB, nC);
  if (d <= rC * (1 - f)) return nC;
  if (d <= rC) return ramp(rC, nC, 0);
  return 0;
}

// Position (0 à 1 dans la cellule) du brin i selon la suite R2, avant le décalage propre à la cellule.
const R2X = 0.7548776662466927;
const R2Y = 0.5698402909980532;
export function r2(i, out = [0, 0]) {
  out[0] = (0.5 + i * R2X) % 1;
  out[1] = (0.5 + i * R2Y) % 1;
  return out;
}

// Touffes et clairières : des centres tirés au hasard sur une grille de TOUFFE m (coordonnées de
// l'île) ; chaque brin glisse de PULL vers le centre le plus proche. La touffe donne sa hauteur (en
// dôme, plus basse au bord), son penchant et sa valeur à ses brins ; une touffe sur dix environ reste
// rase (petite clairière). Avant cela, le motif R2 de chaque cellule est tourné ou retourné (8
// symétries) et chaque brin bougé de ±JIT de la cellule : plus de motif qui se répète de cellule en
// cellule. Le shader (materiau.js) fait le même calcul ; ce miroir sert aux tests.
export const TOUFFE = 1.1;
// tapis uniforme (21/11/2026, demande de l'utilisateur : plus de groupes ronds) : les brins ne
// glissent plus vers leur touffe ; la touffe ne garde qu'un léger penchant commun
export const PULL = 0;
export const JIT = 0.08;
const fract = (x) => x - Math.floor(x);
// même hachage que hash12 de shaders/chunks.js (sans sinus)
export function hash12(x, y) {
  let a = fract(x * 0.1031);
  let b = fract(y * 0.1031);
  let c = fract(x * 0.1031);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d;
  b += d;
  c += d;
  return fract((a + b) * c);
}

// centre (x, z) et identifiant (i, j) de la touffe la plus proche du point (x, z), distance en m
export function touffe(x, z) {
  const gi = Math.floor(x / TOUFFE);
  const gj = Math.floor(z / TOUFFE);
  let best = null;
  for (let b = -1; b <= 1; b++) {
    for (let a = -1; a <= 1; a++) {
      const i = gi + a;
      const j = gj + b;
      const hc = hash12(i * 1.11 + 3.3, j * 1.11 + 3.3);
      const cx = (i + hc) * TOUFFE;
      const cz = (j + fract(hc * 11.7 + 0.37)) * TOUFFE;
      const d = Math.hypot(cx - x, cz - z);
      if (!best || d < best.d) best = { x: cx, z: cz, i, j, d };
    }
  }
  return best;
}

// place du brin i d'une cellule d'origine (ax, az) : avant les touffes (x0, z0) et après (x, z)
export function placeBrin(ax, az, i) {
  const ci = Math.floor(ax * 0.5 + 0.5);
  const cj = Math.floor(az * 0.5 + 0.5);
  const jx = hash12(ci * 1.37 + 11, cj * 1.37 + 11);
  const jz = hash12(ci * 1.91 - 7, cj * 1.91 - 7);
  let px = fract(0.5 + i * R2X + jx) - 0.5;
  let pz = fract(0.5 + i * R2Y + jz) - 0.5;
  const sym = Math.floor(hash12(ci * 0.53 + 2, cj * 0.53 + 2) * 8);
  if (sym % 2 >= 1) [px, pz] = [pz, px];
  if (Math.floor(sym / 2) % 2 >= 1) px = -px;
  if (sym >= 4) pz = -pz;
  px += (hash12(ci * 3.1 + i * 0.37, cj * 3.1 + i * 0.37) - 0.5) * 2 * JIT;
  pz += (hash12(ci * 2.3 - i * 0.53, cj * 2.3 - i * 0.53) - 0.5) * 2 * JIT;
  const x0 = ax + CELL / 2 + px * CELL;
  const z0 = az + CELL / 2 + pz * CELL;
  const t = touffe(x0, z0);
  return { x0, z0, x: x0 + (t.x - x0) * PULL, z: z0 + (t.z - z0) * PULL, touffe: t };
}

// Anneau d'une cellule dont le centre est à la distance dc du joueur : celui de son point le plus
// proche (la densité ne fait que décroître avec la distance), -1 au-delà du dernier anneau.
const HALF_DIAG = (CELL * Math.SQRT2) / 2;
export function ringOf(dc, P) {
  const d = Math.max(0, dc - HALF_DIAG);
  const [rA, rB, rC] = P.rings;
  if (d <= rA && P.blades[0] > 0) return 0;
  if (d <= rB && P.blades[1] > 0) return 1;
  if (d <= rC && P.blades[2] > 0) return 2;
  return -1;
}

// Cellules d'une tuile (origine x0, z0, côté size, coordonnées de l'île) à dessiner autour du
// joueur (fx, fz), réparties par anneau dans out[0..2] (origines x, z à la suite). visible(cx, cz),
// facultatif, écarte les cellules hors du champ de la caméra. Renvoie le nombre de cellules gardées.
export function cellsForTile(x0, z0, size, fx, fz, P, out, visible = null) {
  for (const o of out) o.length = 0;
  const rMax = Math.max(...P.rings) + HALF_DIAG;
  const n = Math.round(size / CELL);
  const i0 = Math.max(0, Math.floor((fx - rMax - x0) / CELL));
  const i1 = Math.min(n - 1, Math.floor((fx + rMax - x0) / CELL));
  const j0 = Math.max(0, Math.floor((fz - rMax - z0) / CELL));
  const j1 = Math.min(n - 1, Math.floor((fz + rMax - z0) / CELL));
  let kept = 0;
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const cx = x0 + i * CELL;
      const cz = z0 + j * CELL;
      const ring = ringOf(Math.hypot(cx + CELL / 2 - fx, cz + CELL / 2 - fz), P);
      if (ring < 0) continue;
      if (visible && !visible(cx + CELL / 2, cz + CELL / 2)) continue;
      out[ring].push(cx, cz);
      kept++;
    }
  }
  return kept;
}

// Brins dessinés pour des listes de cellules par anneau (budget).
export function bladesDrawn(out, P) {
  let n = 0;
  for (let r = 0; r < 3; r++) n += (out[r].length / 2) * P.blades[r];
  return n;
}
