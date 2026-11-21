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
//   A part du biome secondaire de la tuile (biomesTuile ; 0 sur les îles d'un seul biome)
import { makeNoise, fbm } from '../../../core/noise.js';
import { distanceField, smooth } from './grid.js';
import { Z, ZONE_HERBE } from './zones.js';
import { KINDS, KIND_RADIUS, STRIDE } from './kinds.js';
import { SHAPES } from '../farveg.js';
import { densiteHerbeBiome } from '../biomes.js';
import { BIOME_IDS } from './forme.js';
import { MURS } from '../../../models/batiments/maison-village/physique.js';

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
const BUILT = { moulin: 4, moulin_eau: 4, phare: 3.5, tour_guet: 2.5, cabane: 2.5, temple: 4, puits: 1.2, etal: 1.8, jetee: 2, epave: 3, epave_geante: 5, observatoire: 3.5 };
// maison : cercle de ses murs (0,62 fois le plus grand côté, selon sa taille) ; l'herbe pousse
// jusqu'au pied des murs, autour du village
const maisonR = (v) => Math.max(MURS.w[v || 0], MURS.d[v || 0]) * 0.62;
const GROUND_PARTS = { tente: 1.3, feu_camp: 0.8, bois_pile: 0.6, rondin: 0.6, ruche: 0.45, coffre: 0.5, potager: 1.4, barque_echouee: 1.3 };
// lieux sans piétinement : verger (règle des rangs), eau, rivage, arbre géant (ombre de couronne)
const NO_TRAMPLE = new Set(['verger', 'recif', 'epave_immergee', 'rocher_baleine', 'oasis', 'cascade', 'arbre_geant', 'arche', 'grotte']);

// sous ce niveau (m) : mer et estran, aucune herbe ; hauteur et sécheresse par défaut
const SEA_H = 0.3;
// altitude (m) où l'herbe commence à se raréfier, et où elle est au plus rare
const ALT_A = 90;
const ALT_B = 180;
const G_NONE = Math.round((0.2 / 1.2) * 255);
const B_NONE = Math.round(0.7 * 255);
// pente au mètre : l'herbe se raréfie un peu de SLOPE_A à SLOPE_B (collines herbues, comme dans
// BotW), et disparaît de 1 à 1,15 (falaises)
const SLOPE_A = 0.55;
const SLOPE_B = 0.95;
// canaux de la base : densité, hauteur, sécheresse, touffes, roche, plage, distance à l'herbe, distance à la
// forêt (hors forêt), courbure du relief (creux > 0, crête < 0)
const CH = 9;
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
    // sous-bois herbu, façon BotW (21/11/2026 : 0,15 à 0,35 auparavant)
    if (zn === Z.FORET) r = 0.5 + 0.3 * Math.max(0, Math.min(1, (8 - deep[k]) / 4));
    // pré fourni partout : aucune zone herbeuse sous 0,85 (forêt à part)
    else if (r > 0 && r < 0.85 && zn !== Z.DUNE && zn !== Z.CULTURES && zn !== Z.ROSELIERE) r = 0.85 + 0.1 * r;
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
  // distance (m) à la forêt, hors de la forêt : frange d'herbe haute à la lisière
  const fd = distanceField(n, s, (k) => zone[k] === Z.FORET || zone[k] === Z.CHAMPIGNONS);
  for (let k = 0; k < N; k++) base[k * CH + 7] = fd[k];
  // courbure du relief au pas du plan (4 m) : écart moyen des quatre voisines à la case, en m, ramené à
  // −1…1 (0,8 m) ; creux (> 0) plus herbus, crêtes (< 0) plus ras et plus secs. Bords du plan : voisine
  // répétée (la marge des sections couvre les nœuds lus)
  const Hp = plan.H;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const a = Hp[j * n + Math.max(0, i - 1)] + Hp[j * n + Math.min(n - 1, i + 1)] + Hp[Math.max(0, j - 1) * n + i] + Hp[Math.min(n - 1, j + 1) * n + i];
      base[k * CH + 8] = Math.max(-1, Math.min(1, (a / 4 - Hp[k]) / 0.8));
    }
  }

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
      if (pt.t === 'maison' || BUILT[pt.t]) {
        const rb = pt.t === 'maison' ? maisonR(pt.v) : BUILT[pt.t];
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
// Réseaux de bruit alignés sur la tuile (donc sur le monde : les origines des tuiles sont des
// multiples de LM et de LT), interpolés au mètre : massifs et bruit fin au pas de 2 m, trouées au pas
// de 4 m. Le bruit fin (3,5 m) était tiré à chaque nœud : au pas de 2 m, 3,7 fois moins de tirages.
const LM = 2; // pas du réseau des massifs et du bruit fin (m)
const LT = 4; // pas du réseau des trouées (m)
let latM = null;
let latF = null;
let latS = null;
let latT = null;
let latO = null; // première octave des massifs, au pas de LT
// index de maille et poids d'interpolation de chaque rang 0…V−1 (identiques en x et en z)
let iM = null;
let uM = null;
let iT = null;
let uT = null;
function scratch(V) {
  if (scrV === V) return;
  scrV = V;
  occ = new Float32Array(V * V);
  ring = new Float32Array(V * V);
  lieu = new Float32Array(V * V);
  const nm = Math.ceil((V - 1) / LM) + 2;
  const nt = Math.ceil((V - 1) / LT) + 2;
  latM = new Float32Array(nm * nm);
  latF = new Float32Array(nm * nm);
  latS = new Float32Array(nm * nm);
  latT = new Float32Array(nt * nt);
  latO = new Float32Array(nt * nt);
  iM = new Int32Array(V);
  uM = new Float32Array(V);
  iT = new Int32Array(V);
  uT = new Float32Array(V);
  for (let i = 0; i < V; i++) {
    iM[i] = Math.floor(i / LM);
    uM[i] = (i - iM[i] * LM) / LM;
    iT[i] = Math.floor(i / LT);
    uT[i] = (i - iT[i] * LT) / LT;
  }
}

// bornes des nœuds de la tuile touchés par un disque (x, z, rayon)
function span(c, r, o, T) {
  return [Math.max(0, Math.ceil(c - r - o)), Math.min(T, Math.floor(c + r - o))];
}

// interpolation bilinéaire d'un réseau de largeur w, maille k (coin bas), poids u (x) et v (z)
function lattice(arr, w, k, u, v) {
  return (arr[k] * (1 - u) + arr[k + 1] * u) * (1 - v) + (arr[k + w] * (1 - u) + arr[k + w + 1] * u) * v;
}

// Biomes mêlés (îles à plusieurs biomes, plan.B) : pour chaque biome présent, sa part lissée par case
// du plan (tente 1-2-3-2-1 de ± 2 cases, soit environ ± 8 m ; la marge des sections est de 2 cases :
// deux sections voisines trouvent la même part sur leur bord commun). Gardé dans le plan.
const TENT = [1, 2, 3, 2, 1].map((v) => v / 9);
export function poidsBiomes(plan) {
  if (plan._bw !== undefined) return plan._bw;
  const { n, B } = plan;
  const ids = B ? [...new Set(B)] : [];
  if (ids.length < 2) return (plan._bw = null);
  const tmp = new Float32Array(n * n);
  const w = {};
  const cl = (v) => (v < 0 ? 0 : v > n - 1 ? n - 1 : v);
  for (const id of ids) {
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        let a = 0;
        for (let k = -2; k <= 2; k++) if (B[j * n + cl(i + k)] === id) a += TENT[k + 2];
        tmp[j * n + i] = a;
      }
    }
    const out = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        let a = 0;
        for (let k = -2; k <= 2; k++) a += tmp[cl(j + k) * n + i] * TENT[k + 2];
        out[j * n + i] = a;
      }
    }
    w[id] = out;
  }
  return (plan._bw = w);
}

// Biomes d'une tuile (indices de BIOME_IDS) : p, celui de son centre (palette principale) ; s, le
// biome voisin le plus présent dans la tuile (p si aucun), mêlé au nœud par le canal A de la carte
// d'herbe. Deux tuiles voisines de biomes p et s échangés donnent le même mélange sur leur bord.
export function biomesTuile(plan, x0, z0, T) {
  if (!plan.B) return { p: -1, s: -1 };
  const { n, s, ext } = plan;
  const ci = (v) => Math.max(0, Math.min(n - 1, Math.round((v + ext) / s)));
  const p = plan.B[ci(z0 + T / 2) * n + ci(x0 + T / 2)];
  const bw = poidsBiomes(plan);
  if (!bw) return { p, s: p };
  const lo = (v) => Math.max(0, Math.floor((v + ext) / s));
  const hi = (v) => Math.min(n - 1, Math.ceil((v + ext) / s) + 1);
  let best = p;
  let bestW = 0;
  for (const key of Object.keys(bw)) {
    const id = +key;
    if (id === p) continue;
    const w = bw[id];
    let m = 0;
    for (let j = lo(z0); j <= hi(z0 + T); j++) for (let i = lo(x0); i <= hi(x0 + T); i++) if (w[j * n + i] > m) m = w[j * n + i];
    if (m > bestW) {
      bestW = m;
      best = id;
    }
  }
  return { p, s: best };
}

// src : { Hb, W (relief au mètre avec bordure), zfi, zfj (indices du fondu bruité de la peinture),
//         pathW (poids de peinture des chemins), pathD (distance au bord des chemins, m) }
export function herbeTile(plan, surf, x0, z0, T, src) {
  const P = prepare(plan);
  const V = T + 1;
  scratch(V);
  const { Hb, W, zfi, zfj, pathW, pathD } = src;
  const { n, s, ext } = plan;
  const { base } = P;
  // sections des grandes îles : bruits de l'île entière ; îles à plusieurs biomes : celui de la tuile
  const sx = plan.ox || 0;
  const sz = plan.oz || 0;
  let { biomeF, dry, tall } = P;
  // biome principal de la tuile (celui de son centre) et biome secondaire mêlé au nœud (biomesTuile)
  const bt = biomesTuile(plan, x0, z0, T);
  const mixB = bt.s !== bt.p;
  let wP = null;
  let wS = null;
  let fS = 0;
  let dS = 0;
  let tS = 1;
  if (plan.B) {
    const b = BIOME_IDS[bt.p];
    biomeF = densiteHerbeBiome(b);
    dry = BIOME_DRY[b] ?? 0;
    tall = BIOME_TALL[b] ?? 1;
    if (mixB) {
      const bw = poidsBiomes(plan);
      wP = bw[bt.p];
      wS = bw[bt.s];
      const b2 = BIOME_IDS[bt.s];
      fS = densiteHerbeBiome(b2);
      dS = BIOME_DRY[b2] ?? 0;
      tS = BIOME_TALL[b2] ?? 1;
    }
  }
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
        const d2 = dx * dx + dz * dz;
        if (d2 > RI * RI) continue;
        const d = Math.sqrt(d2);
        let f = d <= r0 ? 0 : d >= r1 ? 1 : smooth(r0, r1, d);
        if (cr > 0 && d < cr + 0.25) {
          // ombre : c0 au pied, c1 au bord de la couronne, puis fondu vers 1 sur ± 0,25 m
          const t = Math.min(1, d / cr);
          const cin = c0 + (c1 - c0) * t * t;
          f *= cin + (1 - cin) * smooth(cr - 0.25, cr + 0.25, d);
        }
        const k = j * V + i;
        if (f < occ[k]) occ[k] = f;
        // anneau plus dense : 1 hors de sa bande (ra − 0,25 à rb + 0,3), inutile de le calculer
        if (d > ra - 0.25 && d < rb + 0.3) {
          const g = 1 + gain * smooth(ra - 0.25, ra + 0.25, d) * (1 - smooth(rb - 0.3, rb + 0.3, d));
          if (g > ring[k]) ring[k] = g;
        }
      }
    }
  }
  // lieux : disque de 0,6 r à peine piétiné (× 0,85), puis × 0,92 jusqu'au bord
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
        const f = 0.85 + 0.075 * smooth(0.5 * r, 0.7 * r, d) + 0.075 * smooth(0.9 * r, 1.1 * r, d);
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

  // 2. massifs (réseau de 2 m, allongés 1,5:1 dans le sens du vent), bruit fin (3,5 m, même réseau)
  // et trouées (réseau de 4 m)
  const wM = Math.ceil(T / LM) + 2;
  // massifs : fbm de deux octaves, la première (formes de 7 à 11 m) tirée au pas de 4 m puis
  // interpolée, la seconde au pas de 2 m
  const wT = Math.ceil(T / LT) + 2;
  const { wc, ws } = P;
  for (let b = 0; b < wT; b++) {
    for (let a = 0; a < wT; a++) {
      const x = x0 + a * LT + sx;
      const z = z0 + b * LT + sz;
      latO[b * wT + a] = P.nMassif((x * wc + z * ws) / 11, (-x * ws + z * wc) / 7.35);
    }
  }
  for (let b = 0; b < wM; b++) {
    const kb = (b >> 1) * wT;
    const vb = (b & 1) * 0.5;
    for (let a = 0; a < wM; a++) {
      const x = x0 + a * LM + sx;
      const z = z0 + b * LM + sz;
      const o1 = lattice(latO, wT, kb + (a >> 1), (a & 1) * 0.5, vb);
      const o2 = P.nMassif(((x * wc + z * ws) / 11) * 2, ((-x * ws + z * wc) / 7.35) * 2);
      latM[b * wM + a] = smooth(0.17, 0.5, (o1 + 0.5 * o2) / 1.5);
      latF[b * wM + a] = P.nFin(x / 3.5, z / 3.5);
    }
  }
  for (let b = 0; b < wT; b++) {
    for (let a = 0; a < wT; a++) {
      latT[b * wT + a] = smooth(-0.36, -0.5, fbm(P.nTrou, (x0 + a * LT + sx) / 23, (z0 + b * LT + sz) / 23, 2));
    }
  }

  // 3. ce que la tuile contient, sur les cellules du plan qu'elle lit (bornes exactes) : de la roche
  // (fissures), de l'eau douce à moins de 24 m, la côte à moins de 25 m
  const n1 = n - 1.0001;
  const wet = plan.wetDist;
  const coast = plan.coastDist;
  let fi0 = n1;
  let fi1 = 0;
  let fj0 = n1;
  let fj1 = 0;
  for (let k = 0; k < V * V; k++) {
    const a = zfi[k];
    const b = zfj[k];
    if (a < fi0) fi0 = a;
    if (a > fi1) fi1 = a;
    if (b < fj0) fj0 = b;
    if (b > fj1) fj1 = b;
  }
  let rocky = false;
  const cl = (v) => Math.floor(Math.max(0, Math.min(n1, v)));
  for (let cj = cl(fj0); cj <= Math.min(n - 1, cl(fj1) + 1) && !rocky; cj++) {
    for (let ci = cl(fi0); ci <= Math.min(n - 1, cl(fi1) + 1); ci++) {
      if (base[(cj * n + ci) * CH + 4] > 0) {
        rocky = true;
        break;
      }
    }
  }
  let wetMin = Infinity;
  let coastMin = Infinity;
  const cw = (v) => Math.floor(Math.max(0, Math.min(n1, (v + ext) / s)));
  for (let cj = cw(z0); cj <= Math.min(n - 1, cw(z0 + T) + 1); cj++) {
    for (let ci = cw(x0); ci <= Math.min(n - 1, cw(x0 + T) + 1); ci++) {
      if (wet && wet[cj * n + ci] < wetMin) wetMin = wet[cj * n + ci];
      if (coast && coast[cj * n + ci] < coastMin) coastMin = coast[cj * n + ci];
    }
  }
  const nearWet = wetMin < 24;
  const nearCoast = coastMin < 25;
  // fissures : bruit de 5 m sur le réseau de 2 m, pour les seules tuiles rocheuses
  if (rocky) {
    for (let b = 0; b < wM; b++) {
      for (let a = 0; a < wM; a++) latS[b * wM + a] = P.nFente((x0 + a * LM + sx) / 5, (z0 + b * LM + sz) / 5);
    }
  }

  // 4. nœuds
  const lakeLevel = surf.lakeLevel;
  for (let j = 0; j <= T; j++) {
    const z = z0 + j;
    const rowM = iM[j] * wM;
    const vM = uM[j];
    const rowT = iT[j] * wT;
    const vT = uT[j];
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
      // biomes mêlés : part du biome secondaire (canal A), densité, sécheresse et hauteur du mélange
      let bF = biomeF;
      let bD = dry;
      let bT = tall;
      if (mixB) {
        const mfi = Math.max(0, Math.min(n1, (x + ext) / s));
        const mfj = Math.max(0, Math.min(n1, (z + ext) / s));
        const mi = Math.floor(mfi);
        const mj = Math.floor(mfj);
        const mu = mfi - mi;
        const mv = mfj - mj;
        const m0 = mj * n + mi;
        const p = (wP[m0] * (1 - mu) + wP[m0 + 1] * mu) * (1 - mv) + (wP[m0 + n] * (1 - mu) + wP[m0 + n + 1] * mu) * mv;
        const q = (wS[m0] * (1 - mu) + wS[m0 + 1] * mu) * (1 - mv) + (wS[m0 + n] * (1 - mu) + wS[m0 + n + 1] * mu) * mv;
        const a = p + q > 1e-6 ? q / (p + q) : 0;
        out[o + 3] = Math.round(a * 255);
        bF += (fS - biomeF) * a;
        bD += (dS - dry) * a;
        bT += (tS - tall) * a;
      }
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
      let R = (base[o00] * w00 + base[o10] * w10 + base[o01] * w01 + base[o11] * w11) * bF;
      let G = (base[o00 + 1] * w00 + base[o10 + 1] * w10 + base[o01 + 1] * w01 + base[o11 + 1] * w11) * bT;
      let B = base[o00 + 2] * w00 + base[o10 + 2] * w10 + base[o01 + 2] * w01 + base[o11 + 2] * w11 + bD;
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
      const kM = rowM + iM[i];
      const nf = lattice(latF, wM, kM, uM[i], vM);
      R *= tuft > 0 ? (1 - tuft) * (1 + 0.25 * nf) + tuft * 3.3 * smooth(0.05, 0.6, nf) : 1 + 0.25 * nf;
      // massifs de hautes herbes et trouées
      const m = lattice(latM, wM, kM, uM[i], vM);
      const gp = lattice(latT, wT, rowT + iT[i], uT[i], vT);
      R *= (1 + 0.43 * m) * (1 - 0.3 * gp);
      G *= (1 + m * (0.9 + 0.3 * nf)) * (1 - 0.25 * gp);
      // pente au mètre (gradient du relief) : moins d'herbe là où la roche affleure, rien au-delà de 0,9
      const gx = (Hb[bk + 1] - Hb[bk - 1]) * 0.5;
      const gz = (Hb[bk + W] - Hb[bk - W]) * 0.5;
      const g = Math.sqrt(gx * gx + gz * gz);
      let cut = 1;
      if (g > SLOPE_A) {
        const sl = smooth(SLOPE_A, SLOPE_B, g);
        cut = 1 - smooth(1, 1.15, g);
        R *= (1 - 0.6 * sl) * cut;
        G *= 1 - 0.3 * sl;
      }
      // fissures herbeuses sur la roche
      if (rock > 0.01 && cut > 0) {
        const fente = smooth(0.82, 0.95, 1 - Math.abs(lattice(latS, wM, kM, uM[i], vM)));
        const r2 = 0.08 * bF * rock * fente * cut;
        if (r2 > R) R = r2;
      }
      // eau douce (distance au bord ≈ distance aux centres des cellules d'eau − 2 m) et côte, si la
      // tuile en approche (sinon ni lecture ni interpolation)
      let wd = 1e9;
      let cd = 1e9;
      let q0 = 0;
      if (nearWet || nearCoast) {
        const wfi = Math.max(0, Math.min(n1, (x + ext) / s));
        const wfj = Math.max(0, Math.min(n1, (z + ext) / s));
        const wi = Math.floor(wfi);
        const wj = Math.floor(wfj);
        const wu = wfi - wi;
        const wv = wfj - wj;
        q0 = wj * n + wi;
        if (nearWet) wd = (wet[q0] * (1 - wu) + wet[q0 + 1] * wu) * (1 - wv) + (wet[q0 + n] * (1 - wu) + wet[q0 + n + 1] * wu) * wv;
        if (nearCoast) cd = (coast[q0] * (1 - wu) + coast[q0 + 1] * wu) * (1 - wv) + (coast[q0 + n] * (1 - wu) + coast[q0 + n + 1] * wu) * wv;
      }
      if (wd < 24) {
        const e = wd - 2;
        const near = smooth(0, 1.5, e) * (1 - smooth(7, 9, e));
        const mid = smooth(7, 9, e) * (1 - smooth(18, 22, e));
        R *= 1 + 0.4 * near + 0.15 * mid;
        G *= 1 + 0.3 * near;
        if (e < 10) B *= smooth(0, 10, e);
      }
      if (cd < 25) {
        const c = smooth(10, 25, cd);
        R *= 0.75 + 0.25 * c;
        G *= 0.65 + 0.35 * c;
        B += 0.35 * (1 - c);
      }
      // altitude : plus rare, plus courte et plus sèche de ALT_A à ALT_B m (seuils absolus, les mêmes
      // pour toutes les sections : le Plateau venté, à 60 m, reste une prairie)
      if (h > ALT_A) {
        const al = smooth(ALT_A, ALT_B, h);
        R *= 1 - 0.5 * al;
        G *= 1 - 0.4 * al;
        B += 0.3 * al;
      }
      // oyats en haut de plage, près de l'herbe
      if (beach > 0.01 && h > 0.95) {
        const gdist = base[o00 + 6] * w00 + base[o10 + 6] * w10 + base[o01 + 6] * w01 + base[o11 + 6] * w11;
        const oy = 0.1 * bF * beach * smooth(0.95, 1.25, h) * (1 - smooth(4, 6, gdist)) * cut;
        if (oy > R) {
          R = oy;
          G = 0.3 * bT;
          B = Math.max(B, 0.8);
        }
      }
      // lisière : frange d'herbe haute sur 6 m hors de la forêt
      const fdist = base[o00 + 7] * w00 + base[o10 + 7] * w10 + base[o01 + 7] * w01 + base[o11 + 7] * w11;
      if (fdist > 0 && fdist < 6) {
        const fr = 1 - smooth(1.5, 6, fdist);
        R *= 1 + 0.15 * fr;
        G *= 1 + 0.45 * fr;
      }
      // relief : creux plus herbus et plus hauts, crêtes plus rases et plus sèches
      const cv = base[o00 + 8] * w00 + base[o10 + 8] * w10 + base[o01 + 8] * w01 + base[o11 + 8] * w11;
      R *= 1 + 0.1 * cv;
      G *= cv > 0 ? 1 + 0.3 * cv : 1 + 0.25 * cv;
      if (cv < 0) B -= 0.12 * cv;
      // chemins : rien au centre, ras et clairsemé au bord, plus haut et plus dense à 2–4 m
      const pd = pathD[k];
      if (pd < 4.5) {
        R *= (1 - smooth(0.3, 0.6, pathW[k])) * (0.3 + 0.4 * smooth(0.4, 0.8, pd) + 0.5 * smooth(1.6, 2.4, pd) - 0.2 * smooth(3.4, 4.4, pd));
        G *= 0.45 + 0.55 * smooth(0.4, 1.8, pd) + 0.25 * smooth(1.6, 2.4, pd) - 0.25 * smooth(3.4, 4.4, pd);
      }
      // arbres, rochers, bâtiments, lieux ; l'anneau plus dense au pied est aussi plus haut
      R *= occ[k] * ring[k] * lieu[k];
      G *= 1 + 1.5 * (ring[k] - 1);
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
