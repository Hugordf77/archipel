// Carte d'herbe d'une tuile (Worker) : pour chaque nœud de la grille au mètre (les sommets du
// maillage LOD0), densité relative du tapis de brins, hauteur et sécheresse. Tout est calculé en
// coordonnées de l'île à partir du plan, jamais de valeurs propres à la tuile : deux tuiles voisines
// donnent exactement les mêmes valeurs sur leur bord commun.
//   densité = base(zone, fondu) × biome × pente × eau × ombre × chemin × lieu × altitude × massif
// Module pur (ni THREE ni DOM). Bruits propres, dérivés de la graine de l'île : le tirage de la
// petite végétation (surface.js) n'est pas touché.
//
// Sortie : Uint8Array(V × V × 4), nœud k = j × V + i (x = x0 + i, z = z0 + j), RGBA :
//   R densité relative (0–255 ↔ 0–1 ; prairie ≈ 0,9, massif de hautes herbes = 1)
//   G hauteur des brins (G / 255 × HERBE_HMAX m)
//   B sécheresse (0 vert vif, 255 paille)
//   A réservé (0)
import { makeNoise, fbm } from '../../../core/noise.js';
import { distanceField, smooth } from './grid.js';
import { Z, ZONE_HERBE } from './zones.js';
import { KINDS, KIND_RADIUS, STRIDE } from './kinds.js';
import { SHAPES } from '../farveg.js';
import { densiteHerbeBiome } from '../biomes.js';

export const HERBE_HMAX = 1.2;

// base par zone : ZONE_HERBE (zones.js : densité, hauteur, sécheresse, touffes), partagée avec la
// couleur du sol sous l'herbe ; la forêt reçoit en plus la rampe de lisière (0,35 à l'orée → 0,15 à
// 8 m sous le couvert)
const NONE = [0, 0.25, 0.3, 0];
// sécheresse ajoutée et hauteur relative par biome (densité : densiteHerbeBiome de biomes.js)
const BIOME_DRY = { prairie: 0, pins: 0.04, tropical: 0, champignons: 0, atoll: 0.15, volcan: 0.3, dunes: 0.35, glace: 0.25 };
const BIOME_TALL = { glace: 0.7, volcan: 0.85, dunes: 0.9, atoll: 0.9 };
const CONIFERS = new Set(['pin', 'pin_givre', 'sapin_neige']);

// couronnes (m, à l'échelle 1) tirées des formes lointaines (farveg.js) : ombre sous les arbres
// et les buissons ; les formes « rock » (rochers, filons) n'ont pas de couronne
const CROWN = {};
for (const [kind, shapes] of Object.entries(SHAPES)) {
  if (shapes.some((sh) => sh[6] === 'rock')) continue;
  let r = 0;
  for (const [, cx, , cz, rr] of shapes) r = Math.max(r, Math.hypot(cx, cz) + rr);
  if (r > (KIND_RADIUS[kind] || 0) + 0.2) CROWN[kind] = r;
}

// emprises bâties (m), comme flora.js : rien n'y pousse ; quelques pièces au sol en plus
// (rayon d'obstacle de leur physique.js)
const BUILT = new Set(['maison', 'moulin', 'moulin_eau', 'phare', 'tour_guet', 'cabane', 'temple', 'puits', 'etal', 'jetee', 'epave', 'epave_geante', 'observatoire']);
const GROUND_PARTS = { tente: 1.3, feu_camp: 0.8, bois_pile: 0.6, rondin: 0.6, ruche: 0.45, coffre: 0.5, potager: 1.4, barque_echouee: 1.3 };
// lieux sans piétinement : verger (règle des rangs), eau, rivage, arbre géant (ombre de couronne)
const NO_TRAMPLE = new Set(['verger', 'recif', 'epave_immergee', 'rocher_baleine', 'oasis', 'cascade', 'arbre_geant', 'arche', 'grotte']);

// sous ce niveau (m) : mer et estran, aucune herbe ; hauteur et sécheresse par défaut
const SEA_H = 0.3;
const G_NONE = Math.round((0.2 / 1.2) * 255);
const B_NONE = Math.round(0.7 * 255);
// pente au mètre : l'herbe se raréfie de SLOPE_A à SLOPE_B (la roche commence à affleurer à la
// peinture vers 0,62), et disparaît à 0,9
const SLOPE_A = 0.45;
const SLOPE_B = 0.8;
const CH = 7; // canaux de la base : densité, hauteur, sécheresse, touffes, roche, plage, distance à l'herbe
const OB = 10; // obstacle : x, z, r0 (nul), r1 (fin de rampe), couronne, c0, c1, anneau a, anneau b, gain

// données de l'île, préparées une fois (gardées dans le plan, comme plan._paths)
function prepare(plan) {
  if (plan._herbe) return plan._herbe;
  const { n, s, Z: zone } = plan;
  const N = n * n;
  const base = new Float32Array(N * CH);
  // profondeur sous le couvert (m) : rampe de lisière
  const deep = distanceField(n, s, (k) => zone[k] !== Z.FORET && zone[k] !== Z.CHAMPIGNONS);
  for (let k = 0; k < N; k++) {
    const zn = zone[k];
    const e = ZONE_HERBE[zn] || NONE;
    let r = e[0];
    if (zn === Z.FORET) r = 0.15 + 0.2 * Math.max(0, Math.min(1, (8 - deep[k]) / 4));
    const o = k * CH;
    base[o] = r;
    base[o + 1] = e[1];
    base[o + 2] = e[2];
    base[o + 3] = e[3];
    base[o + 4] = zn === Z.ROCHE ? 1 : 0;
    base[o + 5] = zn === Z.PLAGE ? 1 : 0;
  }
  // distance (m) aux cellules herbeuses : bande d'oyats en haut de plage
  const gd = distanceField(n, s, (k) => base[k * CH] > 0.2);
  for (let k = 0; k < N; k++) base[k * CH + 6] = gd[k];

  // arbres, buissons et rochers de l'île : emprise nulle, ombre de couronne, anneau plus dense
  const obs = [];
  const items = plan.items;
  for (let q = 0; q < items.length; q += STRIDE) {
    const kind = KINDS[items[q]];
    const sc = items[q + 5];
    const rf = (KIND_RADIUS[kind] || 0) * sc;
    const cr = (CROWN[kind] || 0) * sc;
    if (rf <= 0 && cr <= 0) continue;
    const r0 = rf > 0 ? rf + 0.35 : 0;
    const r1 = rf > 0 ? rf + 0.85 : 0;
    const conifer = CONIFERS.has(kind);
    const ra = Math.max(cr, r1);
    obs.push(items[q + 1], items[q + 3], r0, r1, cr, conifer ? 0.3 : 0.5, conifer ? 0.55 : 0.8, ra, ra + 1.5, 1.2);
  }
  // lieux : emprises bâties (pied de mur plus dense), arbre géant ; disques piétinés ; champs ; vergers
  const trample = [];
  const fields = [];
  const orchards = [];
  for (const p of plan.pois) {
    for (const pt of p.parts || []) {
      if (BUILT.has(pt.t)) {
        const rb = pt.t === 'maison' ? 4.2 : pt.t === 'jetee' ? 2 : 4;
        obs.push(pt.x, pt.z, rb, rb + 0.3, 0, 1, 1, rb + 0.3, rb + 1, 1.3);
      } else if (GROUND_PARTS[pt.t]) {
        const rb = GROUND_PARTS[pt.t];
        obs.push(pt.x, pt.z, rb, rb + 0.3, 0, 1, 1, rb + 0.3, rb + 1, 1.2);
      } else if (pt.t === 'arbre_geant') {
        const rf = pt.kind === 'champi' ? 1.6 : 2;
        obs.push(pt.x, pt.z, rf + 0.35, rf + 0.85, 6, 0.5, 0.8, 6, 7.5, 1.2);
      } else if (pt.t === 'bassin_chaud') {
        const rb = 1.3 * (pt.size || 1);
        obs.push(pt.x, pt.z, rb, rb + 0.3, 0, 1, 1, rb + 0.3, rb + 1, 1.3);
      }
    }
    if (p.r > 0 && !NO_TRAMPLE.has(p.type)) trample.push(p.x, p.z, p.r);
    for (const f of p.fields || []) if (f.crop === 'ble') fields.push(f.x, f.z, Math.cos(f.rot), Math.sin(f.rot), f.w / 2, f.d / 2);
    if (p.orchard) orchards.push(p.orchard.x, p.orchard.z, p.orchard.r, Math.cos(p.orchard.rot), Math.sin(p.orchard.rot));
  }
  const wind = plan.traits?.windAngle ?? 0;
  plan._herbe = {
    base,
    obs: Float64Array.from(obs),
    trample: Float64Array.from(trample),
    fields: Float64Array.from(fields),
    orchards: Float64Array.from(orchards),
    biomeF: densiteHerbeBiome(plan.biome),
    dry: BIOME_DRY[plan.biome] ?? 0,
    tall: BIOME_TALL[plan.biome] ?? 1,
    hRef: Math.max(12, plan.stats?.hmax ?? 12),
    wc: Math.cos(wind),
    ws: Math.sin(wind),
    // bruits propres à l'herbe
    nMassif: makeNoise(plan.seed ^ 0x4e7b01),
    nTrou: makeNoise(plan.seed ^ 0x7a0e53),
    nFin: makeNoise(plan.seed ^ 0x35b1c9),
    nFente: makeNoise(plan.seed ^ 0xc4ac2d),
  };
  return plan._herbe;
}

// tampons réutilisés d'une tuile à l'autre (le Worker construit une tuile à la fois)
let scrV = 0;
let occ = null;
let ring = null;
let lieu = null;
const LM = 2; // pas du réseau des massifs (m)
const LT = 4; // pas du réseau des trouées (m)
let latM = null;
let latT = null;
function scratch(V) {
  if (scrV === V) return;
  scrV = V;
  occ = new Float32Array(V * V);
  ring = new Float32Array(V * V);
  lieu = new Float32Array(V * V);
  const nm = Math.ceil((V - 1) / LM) + 2;
  const nt = Math.ceil((V - 1) / LT) + 2;
  latM = new Float32Array(nm * nm);
  latT = new Float32Array(nt * nt);
}

// bornes des nœuds de la tuile touchés par un disque (x, z, rayon)
function span(c, r, o, T) {
  return [Math.max(0, Math.ceil(c - r - o)), Math.min(T, Math.floor(c + r - o))];
}

// interpolation bilinéaire d'un réseau aligné sur la tuile (pas « step », largeur « w »)
function lattice(arr, w, step, i, j) {
  const a = Math.floor(i / step);
  const b = Math.floor(j / step);
  const u = (i - a * step) / step;
  const v = (j - b * step) / step;
  const k = b * w + a;
  return (arr[k] * (1 - u) + arr[k + 1] * u) * (1 - v) + (arr[k + w] * (1 - u) + arr[k + w + 1] * u) * v;
}

// src : { Hb, W (relief au mètre avec bordure), zfi, zfj (indices du fondu bruité de la peinture),
//         pathW (poids de peinture des chemins), pathD (distance au bord des chemins, m) }
export function herbeTile(plan, surf, x0, z0, T, src) {
  const P = prepare(plan);
  const V = T + 1;
  scratch(V);
  const { Hb, W, zfi, zfj, pathW, pathD } = src;
  const { n, s, ext } = plan;
  const { base, biomeF, dry, tall, hRef } = P;
  const out = new Uint8Array(V * V * 4);

  // 1. ombres et emprises (minimum), anneaux plus denses (maximum), lieux piétinés (minimum)
  occ.fill(1);
  ring.fill(1);
  lieu.fill(1);
  const ob = P.obs;
  for (let q = 0; q < ob.length; q += OB) {
    const ox = ob[q];
    const oz = ob[q + 1];
    const r0 = ob[q + 2];
    const r1 = ob[q + 3];
    const cr = ob[q + 4];
    const ra = ob[q + 7];
    const rb = ob[q + 8];
    const RI = Math.max(cr + 0.25, rb + 0.3);
    if (ox + RI < x0 || ox - RI > x0 + T || oz + RI < z0 || oz - RI > z0 + T) continue;
    const c0 = ob[q + 5];
    const c1 = ob[q + 6];
    const gain = ob[q + 9] - 1;
    const [i0, i1] = span(ox, RI, x0, T);
    const [j0, j1] = span(oz, RI, z0, T);
    for (let j = j0; j <= j1; j++) {
      const dz = z0 + j - oz;
      for (let i = i0; i <= i1; i++) {
        const dx = x0 + i - ox;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d > RI) continue;
        let f = d <= r0 ? 0 : d >= r1 ? 1 : smooth(r0, r1, d);
        if (cr > 0 && d < cr + 0.25) {
          // ombre : c0 au pied, c1 au bord de la couronne, puis fondu vers 1 sur ± 0,25 m
          const t = Math.min(1, d / cr);
          const cin = c0 + (c1 - c0) * t * t;
          f *= cin + (1 - cin) * smooth(cr - 0.25, cr + 0.25, d);
        }
        const k = j * V + i;
        if (f < occ[k]) occ[k] = f;
        const g = 1 + gain * smooth(ra - 0.25, ra + 0.25, d) * (1 - smooth(rb - 0.3, rb + 0.3, d));
        if (g > ring[k]) ring[k] = g;
      }
    }
  }
  // lieux : disque de 0,6 r piétiné (× 0,3), puis × 0,7 jusqu'au bord
  const tr = P.trample;
  for (let q = 0; q < tr.length; q += 3) {
    const ox = tr[q];
    const oz = tr[q + 1];
    const r = tr[q + 2];
    const RI = r * 1.1;
    if (ox + RI < x0 || ox - RI > x0 + T || oz + RI < z0 || oz - RI > z0 + T) continue;
    const [i0, i1] = span(ox, RI, x0, T);
    const [j0, j1] = span(oz, RI, z0, T);
    for (let j = j0; j <= j1; j++) {
      const dz = z0 + j - oz;
      for (let i = i0; i <= i1; i++) {
        const dx = x0 + i - ox;
        const d = Math.sqrt(dx * dx + dz * dz);
        const f = 0.3 + 0.4 * smooth(0.5 * r, 0.7 * r, d) + 0.3 * smooth(0.9 * r, 1.1 * r, d);
        const k = j * V + i;
        if (f < lieu[k]) lieu[k] = f;
      }
    }
  }
  // champs de blé : rien sous les épis
  const fl = P.fields;
  for (let q = 0; q < fl.length; q += 6) {
    const fx = fl[q];
    const fz = fl[q + 1];
    const ca = fl[q + 2];
    const sa = fl[q + 3];
    const hw = fl[q + 4];
    const hd = fl[q + 5];
    const RI = Math.hypot(hw, hd) + 0.5;
    if (fx + RI < x0 || fx - RI > x0 + T || fz + RI < z0 || fz - RI > z0 + T) continue;
    const [i0, i1] = span(fx, RI, x0, T);
    const [j0, j1] = span(fz, RI, z0, T);
    for (let j = j0; j <= j1; j++) {
      const dz = z0 + j - fz;
      for (let i = i0; i <= i1; i++) {
        const dx = x0 + i - fx;
        const u = dx * ca + dz * sa;
        const v = -dx * sa + dz * ca;
        const inside = smooth(-0.2, 0.4, hw - Math.abs(u)) * smooth(-0.2, 0.4, hd - Math.abs(v));
        const k = j * V + i;
        if (1 - inside < lieu[k]) lieu[k] = 1 - inside;
      }
    }
  }
  // vergers : herbe plus rase sous les rangs d'arbres (rangées tous les 5 m, comme flora.js)
  const orc = P.orchards;
  for (let q = 0; q < orc.length; q += 5) {
    const ox = orc[q];
    const oz = orc[q + 1];
    const r = orc[q + 2];
    const ca = orc[q + 3];
    const sa = orc[q + 4];
    const RI = r + 1.5;
    if (ox + RI < x0 || ox - RI > x0 + T || oz + RI < z0 || oz - RI > z0 + T) continue;
    const [i0, i1] = span(ox, RI, x0, T);
    const [j0, j1] = span(oz, RI, z0, T);
    for (let j = j0; j <= j1; j++) {
      const dz = z0 + j - oz;
      for (let i = i0; i <= i1; i++) {
        const dx = x0 + i - ox;
        const u = dx * ca + dz * sa;
        const v = -dx * sa + dz * ca;
        // les arbres sont en v = -r + 5 m × q
        const m = (((v + r) % 5) + 5) % 5;
        const dv = Math.min(m, 5 - m);
        const row = (1 - smooth(0.9, 1.5, dv)) * (1 - smooth(r, r + 1.5, Math.hypot(u, v)));
        const f = 1 - (1 - 0.35 / 0.6) * row;
        const k = j * V + i;
        if (f < lieu[k]) lieu[k] = f;
      }
    }
  }

  // tuile sans terre émergée : ni herbe ni bruit à calculer
  let top = -Infinity;
  for (let q = 0; q < Hb.length; q++) if (Hb[q] > top) top = Hb[q];
  if (top < SEA_H) {
    for (let k = 0; k < V * V; k++) {
      out[k * 4 + 1] = G_NONE;
      out[k * 4 + 2] = B_NONE;
    }
    return out;
  }

  // 2. massifs (réseau de 2 m, allongés 1,5:1 dans le sens du vent) et trouées (réseau de 4 m)
  const wM = Math.ceil(T / LM) + 2;
  for (let b = 0; b < wM; b++) {
    for (let a = 0; a < wM; a++) {
      const x = x0 + a * LM;
      const z = z0 + b * LM;
      const along = x * P.wc + z * P.ws;
      const across = -x * P.ws + z * P.wc;
      latM[b * wM + a] = smooth(0.17, 0.5, fbm(P.nMassif, along / 11, across / 7.35, 2));
    }
  }
  const wT = Math.ceil(T / LT) + 2;
  for (let b = 0; b < wT; b++) {
    for (let a = 0; a < wT; a++) {
      latT[b * wT + a] = smooth(-0.36, -0.5, fbm(P.nTrou, (x0 + a * LT) / 23, (z0 + b * LT) / 23, 2));
    }
  }

  // 3. nœuds
  const wet = plan.wetDist;
  const coast = plan.coastDist;
  const lakeLevel = surf.lakeLevel;
  const n1 = n - 1.0001;
  const hAlt = 0.5 * hRef;
  for (let j = 0; j <= T; j++) {
    const z = z0 + j;
    for (let i = 0; i <= T; i++) {
      const k = j * V + i;
      const o = k * 4;
      const bk = (j + 1) * W + (i + 1);
      const h = Hb[bk];
      // mer et estran : rien
      if (h < SEA_H) {
        out[o + 1] = G_NONE;
        out[o + 2] = B_NONE;
        continue;
      }
      const x = x0 + i;
      // base des zones, au même fondu bruité que la peinture du sol
      const fi = Math.max(0, Math.min(n1, zfi[k]));
      const fj = Math.max(0, Math.min(n1, zfj[k]));
      const ci = Math.floor(fi);
      const cj = Math.floor(fj);
      const u = fi - ci;
      const v = fj - cj;
      const w00 = (1 - u) * (1 - v);
      const w10 = u * (1 - v);
      const w01 = (1 - u) * v;
      const w11 = u * v;
      const o00 = (cj * n + ci) * CH;
      const o10 = o00 + CH;
      const o01 = o00 + n * CH;
      const o11 = o01 + CH;
      let R = (base[o00] * w00 + base[o10] * w10 + base[o01] * w01 + base[o11] * w11) * biomeF;
      let G = (base[o00 + 1] * w00 + base[o10 + 1] * w10 + base[o01 + 1] * w01 + base[o11 + 1] * w11) * tall;
      let B = base[o00 + 2] * w00 + base[o10 + 2] * w10 + base[o01 + 2] * w01 + base[o11 + 2] * w11 + dry;
      const rock = base[o00 + 4] * w00 + base[o10 + 4] * w10 + base[o01 + 4] * w01 + base[o11 + 4] * w11;
      const beach = base[o00 + 5] * w00 + base[o10 + 5] * w10 + base[o01 + 5] * w01 + base[o11 + 5] * w11;
      // aucune herbe possible (roche pleine, neige, lave, plage, eau) : hauteur et sécheresse seules
      if (R === 0 && rock < 0.01 && beach < 0.01) {
        out[o + 1] = Math.round(Math.max(0, Math.min(1, G / HERBE_HMAX)) * 255);
        out[o + 2] = Math.round(Math.max(0, Math.min(1, B)) * 255);
        continue;
      }
      const tuft = base[o00 + 3] * w00 + base[o10 + 3] * w10 + base[o01 + 3] * w01 + base[o11 + 3] * w11;
      // bruit fin (3,5 m) : × 0,75 à 1,25 ; touffes franches dans le maquis et les dunes
      const nf = P.nFin(x / 3.5, z / 3.5);
      R *= tuft > 0 ? (1 - tuft) * (1 + 0.25 * nf) + tuft * 3.3 * smooth(0.05, 0.6, nf) : 1 + 0.25 * nf;
      // massifs de hautes herbes et trouées
      const m = lattice(latM, wM, LM, i, j);
      const gp = lattice(latT, wT, LT, i, j);
      R *= (1 + 0.43 * m) * (1 - 0.6 * gp);
      G *= (1 + m * (0.9 + 0.3 * nf)) * (1 - 0.45 * gp);
      // pente au mètre (gradient du relief) : moins d'herbe là où la roche affleure, rien au-delà de 0,9
      const gx = (Hb[bk + 1] - Hb[bk - 1]) * 0.5;
      const gz = (Hb[bk + W] - Hb[bk - W]) * 0.5;
      const g = Math.sqrt(gx * gx + gz * gz);
      let cut = 1;
      if (g > SLOPE_A) {
        const sl = smooth(SLOPE_A, SLOPE_B, g);
        cut = 1 - smooth(0.8, 0.9, g);
        R *= (1 - 0.9 * sl) * cut;
        G *= 1 - 0.3 * sl;
      }
      // fissures herbeuses sur la roche
      if (rock > 0.01 && cut > 0) {
        const fente = smooth(0.82, 0.95, 1 - Math.abs(P.nFente(x / 5, z / 5)));
        const r2 = 0.08 * biomeF * rock * fente * cut;
        if (r2 > R) R = r2;
      }
      // eau douce (distance au bord ≈ distance aux centres des cellules d'eau − 2 m) et côte
      const wfi = Math.max(0, Math.min(n1, (x + ext) / s));
      const wfj = Math.max(0, Math.min(n1, (z + ext) / s));
      const wi = Math.floor(wfi);
      const wj = Math.floor(wfj);
      const wu = wfi - wi;
      const wv = wfj - wj;
      const q0 = wj * n + wi;
      const wd = wet ? (wet[q0] * (1 - wu) + wet[q0 + 1] * wu) * (1 - wv) + (wet[q0 + n] * (1 - wu) + wet[q0 + n + 1] * wu) * wv : 1e9;
      if (wd < 24) {
        const e = wd - 2;
        const near = smooth(0, 1.5, e) * (1 - smooth(7, 9, e));
        const mid = smooth(7, 9, e) * (1 - smooth(18, 22, e));
        R *= 1 + 0.4 * near + 0.15 * mid;
        G *= 1 + 0.3 * near;
        if (e < 10) B *= smooth(0, 10, e);
      }
      const cd = coast ? (coast[q0] * (1 - wu) + coast[q0 + 1] * wu) * (1 - wv) + (coast[q0 + n] * (1 - wu) + coast[q0 + n + 1] * wu) * wv : 1e9;
      if (cd < 25) {
        const c = smooth(10, 25, cd);
        R *= 0.6 + 0.4 * c;
        G *= 0.65 + 0.35 * c;
        B += 0.35 * (1 - c);
      }
      // altitude : plus rare, plus courte et plus sèche au-dessus de la moitié du relief
      if (h > hAlt) {
        const al = smooth(0.5, 1, h / hRef);
        R *= 1 - 0.5 * al;
        G *= 1 - 0.4 * al;
        B += 0.3 * al;
      }
      // oyats en haut de plage, près de l'herbe
      if (beach > 0.01 && h > 0.95) {
        const gdist = base[o00 + 6] * w00 + base[o10 + 6] * w10 + base[o01 + 6] * w01 + base[o11 + 6] * w11;
        const oy = 0.1 * biomeF * beach * smooth(0.95, 1.25, h) * (1 - smooth(4, 6, gdist)) * cut;
        if (oy > R) {
          R = oy;
          G = 0.3 * tall;
          B = Math.max(B, 0.8);
        }
      }
      // chemins : rien au centre, ras et clairsemé au bord, plus haut et plus dense à 2–4 m
      const pd = pathD[k];
      if (pd < 4.5) {
        R *= (1 - smooth(0.3, 0.6, pathW[k])) * (0.3 + 0.4 * smooth(0.4, 0.8, pd) + 0.5 * smooth(1.6, 2.4, pd) - 0.2 * smooth(3.4, 4.4, pd));
        G *= 0.5 + 0.5 * smooth(0.4, 1.6, pd) + 0.25 * smooth(1.6, 2.4, pd) - 0.25 * smooth(3.4, 4.4, pd);
      }
      // arbres, rochers, bâtiments, lieux
      R *= occ[k] * ring[k] * lieu[k];
      // rien dans l'eau : mer, puis eau douce (niveau exact près des rives)
      if (h < 0.6) R *= smooth(SEA_H, 0.6, h);
      if (wd < 8 && R > 0) {
        let lvl = surf.waterLevel(x, z);
        // bord des lacs au mètre : niveau des quatre cellules voisines
        const L0 = lakeLevel[q0];
        const L1 = lakeLevel[q0 + 1];
        const L2 = lakeLevel[q0 + n];
        const L3 = lakeLevel[q0 + n + 1];
        if (L0 > lvl) lvl = L0;
        if (L1 > lvl) lvl = L1;
        if (L2 > lvl) lvl = L2;
        if (L3 > lvl) lvl = L3;
        if (lvl > 0) R *= smooth(0.03, 0.15, h - lvl);
      }
      out[o] = Math.round(Math.max(0, Math.min(1, R)) * 255);
      out[o + 1] = Math.round(Math.max(0, Math.min(1, G / HERBE_HMAX)) * 255);
      out[o + 2] = Math.round(Math.max(0, Math.min(1, B)) * 255);
    }
  }
  return out;
}
