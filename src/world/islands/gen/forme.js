// Passe 1a des îles de la carte (open world) : relief de base tracé à la main. La côte suit la
// silhouette de l'île (polygone de archipel.js) déformée par du bruit (côte érodée, anses, caps) ; les
// terres montent depuis la plage, puis les reliefs posés s'ajoutent : monts, chaînes, collines,
// plateaux à falaises, cuvettes (lacs), volcans, pitons, dunes. Chaque case appartient à une zone de
// l'île (biome, forêt, arbres) : la plus proche, au bord légèrement bruité.
// Module pur et déterministe (Worker, carte, minicarte, tests).
import { makeNoise, fbm } from '../../../core/noise.js';
import { BIOMES } from '../biomes.js';
import { ZONE_BY_ID } from '../../archipel.js';
import { smooth, clamp } from './grid.js';

export const SEA_FLOOR = -16;
export const CELL = 4;
// côté des sections des grandes îles (m) : chaque section est une île du moteur taillée dans le plan
export const SECTION = 512;
export const SECTION_MIN_R = 420;

// biomes connus, dans un ordre fixe : indice par case (plan.B)
export const BIOME_IDS = Object.keys(BIOMES);
const BIOME_INDEX = Object.fromEntries(BIOME_IDS.map((b, i) => [b, i]));

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz || 1e-9;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
  return [Math.hypot(px - (ax + dx * t), pz - (az + dz * t)), t];
}

// distance signée au polygone (positive dedans)
function polyDist(P, x, z) {
  let dmin = Infinity;
  let inside = false;
  const k = P.length;
  for (let a = 0, b = k - 2; a < k; b = a, a += 2) {
    const ax = P[a];
    const az = P[a + 1];
    const bx = P[b];
    const bz = P[b + 1];
    if (az > z !== bz > z && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside;
    const dx = bx - ax;
    const dz = bz - az;
    const l2 = dx * dx + dz * dz || 1e-9;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1);
    const ex = x - ax - dx * t;
    const ez = z - az - dz * t;
    const d = ex * ex + ez * ez;
    if (d < dmin) dmin = d;
  }
  return inside ? Math.sqrt(dmin) : -Math.sqrt(dmin);
}

// les grandes îles sont découpées en sections : leur grille couvre un nombre entier de sections
export function formeExt(desc) {
  const F = desc.forme;
  const amp = warpAmp(F.rEq);
  const need = desc.r + amp + 70;
  return desc.r >= SECTION_MIN_R ? Math.ceil(need / (SECTION / 2)) * (SECTION / 2) : Math.ceil(need / CELL) * CELL;
}
const warpAmp = (rEq) => Math.min(55, 6 + rEq * 0.07);

export function formeContext(desc) {
  const F = desc.forme;
  const s = desc.seed;
  const ext = formeExt(desc);
  const zones = F.zones.map((z) => {
    const src = ZONE_BY_ID.get(z.id) || {};
    const biome = src.biome || desc.biome;
    return { ...z, biome, bi: BIOME_INDEX[biome] ?? 0, foret: src.foret ?? 0.3, fleurs: src.fleurs ?? 0.06, arbres: src.arbres || null, palmiers: !!src.palmiers, collines: src.collines || null, decor: src.decor || null };
  });
  const c = {
    desc,
    forme: true,
    arch: 'forme',
    biome: BIOMES[desc.biome] || BIOMES.prairie,
    r: desc.r,
    ext,
    n: (2 * ext) / CELL + 1,
    P: Float64Array.from(F.cote.flat()),
    amp: warpAmp(F.rEq),
    F,
    zones,
    reliefs: F.reliefs,
    volcan: F.reliefs.find((f) => f.t === 'volcan') || null,
    // îles faites d'un piton ou d'un plateau seulement : dessus lisse
    flat: F.reliefs.length > 0 && F.reliefs.every((f) => f.t === 'piton' || f.t === 'plateau'),
    n1: makeNoise(s ^ 0x11111111),
    n2: makeNoise(s ^ 0x22222222),
    n3: makeNoise(s ^ 0x33333333),
    n4: makeNoise(s ^ 0x44444444),
    n5: makeNoise(s ^ 0x55555555),
    n6: makeNoise(s ^ 0x66666666),
    nz: makeNoise(s ^ 0x20e5),
  };
  // hauteur maximale attendue (repère des altitudes : alpages, roche)
  let top = F.base.h;
  for (const f of F.reliefs) if (f.h) top = Math.max(top, f.h + F.base.h);
  c.top = top;
  return c;
}

// distance (m) à la côte, positive sur l'île, côte déformée par le bruit
export function coastDist(c, x, z) {
  const a = c.amp;
  const wx = x + a * fbm(c.n1, x / 190 + 3.1, z / 190 - 1.7, 2) + a * 0.35 * c.n2(x / 60, z / 60);
  const wz = z + a * fbm(c.n2, x / 190 - 5.3, z / 190 + 2.9, 2) + a * 0.35 * c.n1(x / 60 + 9, z / 60);
  return polyDist(c.P, wx, wz) + a * 0.25 * fbm(c.n3, x / 45, z / 45, 2);
}

// Relief alpin : bruit « en crêtes » multifractal (chaque octave pondérée par la précédente) :
// arêtes vives, vallées douces qui descendent en arbre, comme une montagne érodée. 0 à 1 environ.
function alpine(n, x, z) {
  let sum = 0;
  let amp = 0.55;
  let freq = 1;
  let w = 1;
  let norm = 0;
  for (let o = 0; o < 6; o++) {
    let v = 1 - Math.abs(n(x * freq, z * freq));
    v *= v;
    sum += v * amp * w;
    norm += amp;
    w = clamp(v * 1.7, 0, 1);
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum / norm;
}

// collines de chaque zone [hauteur (m), échelle (m)] : celles de la zone, sinon celles de son biome
const COLLINES = { prairie: [12, 180], pins: [22, 170], tropical: [14, 150], glace: [16, 170], volcan: [8, 150], dunes: [0, 100], champignons: [14, 160], atoll: [2, 80] };
export function collinesZone(z) {
  return z.collines || COLLINES[z.biome] || COLLINES.prairie;
}

// poids doux des zones de l'île au point (somme 1) : les reliefs propres aux zones se fondent
function zoneWeights(c, x, z, out) {
  const Z = c.zones;
  let sum = 0;
  for (let k = 0; k < Z.length; k++) {
    const zn = Z[k];
    const d = Math.hypot((x - zn.x) / zn.rx, (z - zn.z) / zn.rz);
    out[k] = Math.exp(-3 * d * d) + 1e-6;
    sum += out[k];
  }
  for (let k = 0; k < Z.length; k++) out[k] /= sum;
  return out;
}

// reliefs posés (m au-dessus de la plaine), sur des coordonnées déformées : bords organiques
const W8 = new Float64Array(16);
function reliefs(c, x, z) {
  // déformation commune des formes (plateaux, cuvettes, masses des montagnes)
  const wx = x + 55 * fbm(c.n5, x / 260 + 1.3, z / 260 - 4.1, 2) + 16 * c.n6(x / 70, z / 70);
  const wz = z + 55 * fbm(c.n5, x / 260 - 7.7, z / 260 + 2.2, 2) + 16 * c.n6(x / 70 + 5, z / 70 - 3);
  let massif = 0;
  let summit = 0;
  let peak = 0;
  let add = 0;
  let sub = 0;
  for (const f of c.reliefs) {
    switch (f.t) {
      case 'mont': {
        // enveloppe du massif, sommet pointu
        const d = Math.hypot(wx - f.x, wz - f.z) / f.r;
        if (d < 1) {
          massif = Math.max(massif, f.h * Math.pow(1 - d, 1.15));
          summit = Math.max(summit, f.h * 0.3 * Math.pow(Math.max(0, 1 - d * 2.6), 2));
        }
        break;
      }
      case 'chaine': {
        // une chaîne élargit le massif dans sa direction (ses arêtes viennent du relief alpin)
        for (let k = 0; k < f.pts.length - 1; k++) {
          const a = f.pts[k];
          const b = f.pts[k + 1];
          const [d, t] = segDist(wx, wz, a[0], a[1], b[0], b[1]);
          if (d > f.l * 3) continue;
          const hh = a[2] + (b[2] - a[2]) * t;
          massif = Math.max(massif, hh * Math.exp(-0.7 * (d / f.l) ** 2));
        }
        break;
      }
      case 'colline': {
        const d = Math.hypot(wx - f.x, wz - f.z) / f.r;
        if (d < 1.6) add += f.h * Math.exp(-2.4 * d * d);
        break;
      }
      case 'plateau': {
        // table aux bords découpés : escarpement net, dessus doucement vallonné
        const e = Math.hypot((wx - f.x) / f.rx, (wz - f.z) / f.rz);
        if (e > 1.6) break;
        const din = (1 - e) * Math.min(f.rx, f.rz);
        const top = f.h * (0.9 + 0.1 * fbm(c.n6, x / 60, z / 60, 2));
        peak = Math.max(peak, top * smooth(-f.bord * 0.15, f.bord, din));
        break;
      }
      case 'cuvette': {
        const d = Math.hypot(wx - f.x, wz - f.z) / f.r;
        if (d < 1) sub += f.p * smooth(1, 0.5, d);
        break;
      }
      case 'volcan': {
        const dd = Math.hypot(x - f.x, z - f.z);
        const d = dd / f.r;
        if (d >= 1) break;
        const u = 1 - d;
        let h = f.h * (0.1 * u + 0.9 * Math.pow(u, 2.2));
        // ravines rayonnantes sur les flancs
        const a = Math.atan2(z - f.z, x - f.x);
        h *= 1 - 0.12 * Math.pow(Math.abs(Math.sin(a * 9 + fbm(c.n4, x / 90, z / 90, 2) * 3)), 3) * smooth(0.15, 0.6, d);
        const dc = dd / f.cratere;
        if (dc < 1.35) {
          const rim = f.h * Math.pow(1 - f.cratere / f.r, 2.2) * 0.98;
          h = Math.max(h, rim * smooth(1.35, 1.0, dc));
          if (dc < 1) h = rim - Math.pow(1 - dc, 1.1) * f.h * 0.22;
        }
        peak = Math.max(peak, h);
        break;
      }
      case 'piton': {
        const d = Math.hypot(x - f.x, z - f.z);
        if (d > f.r * 1.3) break;
        // sommet presque plat (on y marche, les arbres y poussent), parois verticales
        const top = f.h * (0.97 + 0.03 * fbm(c.n6, x / 30, z / 30, 2));
        peak = Math.max(peak, top * smooth(f.r, f.r * 0.8, d));
        break;
      }
      case 'dunes': {
        const k = x * Math.cos(f.dir) + z * Math.sin(f.dir);
        const ridge = Math.pow(Math.max(0, Math.sin((k / 46 + fbm(c.n4, x / 140, z / 140, 2) * 2.2) * Math.PI)), 2);
        add += ridge * f.h;
        break;
      }
      default:
        break;
    }
  }
  // massif : arêtes et vallées du relief alpin, plus marquées vers le haut
  if (massif > 1) {
    const a = alpine(c.n4, wx / 280, wz / 280);
    const k = smooth(0, 60, massif);
    peak = Math.max(peak, massif * (0.42 + 0.78 * a * k + 0.42 * (1 - k)) + summit);
  }
  // collines propres à chaque zone (bruit arrondi, fondu entre zones) ; ni sur les pitons et
  // plateaux seuls, ni sur les hauts-fonds
  if (c.flat || c.F.immerge) return peak + add - sub;
  const wts = zoneWeights(c, x, z, W8);
  let ch = 0;
  let cs = 0;
  for (let q = 0; q < c.zones.length; q++) {
    const [h, sc] = collinesZone(c.zones[q]);
    ch += wts[q] * h;
    cs += wts[q] * sc;
  }
  if (ch > 0.5) {
    const v = 0.5 + 0.5 * fbm(c.n2, wx / cs + 9.1, wz / cs - 3.7, 3);
    add += ch * Math.pow(v, 1.7) * 1.6;
  }
  return peak + add - sub;
}

// hauteur de base (m) en coordonnées locales à l'île, avant érosion et rivières
export function formeHeight(c, x, z) {
  return formeHeightL(c, x, z, coastDist(c, x, z));
}

// même chose, la distance à la côte L étant déjà connue (grille : coastGrid)
export function formeHeightL(c, x, z, L) {
  const F = c.F;
  if (F.immerge) {
    // haut-fond : sable sous 1 à 3 m d'eau, seuls les reliefs percent
    if (L < 0) return Math.max(SEA_FLOOR, -2.6 + L * 0.06);
    const u = smooth(0, F.base.larg, L);
    return -2.6 + 1.4 * u + 0.35 * fbm(c.n3, x / 20, z / 20, 2) + reliefs(c, x, z);
  }
  if (L < 0) return Math.max(SEA_FLOOR, -0.35 + L * 0.055);
  const cliff = clamp(smooth(-0.15, 0.3, c.n5(x / 260 + 7, z / 260 - 3)) * F.falaise * 1.6, 0, 1);
  const bw = F.plage * (1 - cliff * 0.95);
  if (L < bw) return -0.35 + (L / Math.max(bw, 1e-3)) * 1.55;
  const u = smooth(0, F.base.larg, L - bw);
  const env = smooth(0, 44 - cliff * 38, L - bw);
  const v = 0.5 + 0.5 * fbm(c.n4, x / 260, z / 260, 3);
  const plain = F.base.h * u * (0.7 + 0.6 * v);
  const bumps = (fbm(c.n3, x / 26, z / 26, 3) * 0.9 + fbm(c.n6, x / 9, z / 9, 2) * 0.25) * Math.min(1, u * 3);
  return 1.2 + Math.max(0, plain + reliefs(c, x, z)) * env + bumps * env;
}

// distance à la côte sur toute la grille de 4 m de l'île, calculée au pas de 8 m puis interpolée
// (la côte est lisse à cette échelle) : quatre fois moins de calculs de polygone
export function coastGrid(c) {
  const n = c.n;
  const m = (n - 1) / 2 + 1;
  const G = new Float32Array(m * m);
  for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) G[j * m + i] = coastDist(c, -c.ext + i * 2 * CELL, -c.ext + j * 2 * CELL);
  const L = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    const j0 = j >> 1;
    const j1 = Math.min(m - 1, j0 + (j & 1));
    for (let i = 0; i < n; i++) {
      const i0 = i >> 1;
      const i1 = Math.min(m - 1, i0 + (i & 1));
      L[j * n + i] = (G[j0 * m + i0] + G[j0 * m + i1] + G[j1 * m + i0] + G[j1 * m + i1]) / 4;
    }
  }
  return L;
}

// zone de l'île au point (indice dans c.zones) : la plus proche, bord bruité
export function formeZone(c, x, z) {
  const Z = c.zones;
  if (Z.length === 1) return 0;
  const j = 0.18 * fbm(c.nz, x / 150, z / 150, 2);
  let best = 0;
  let bd = Infinity;
  for (let k = 0; k < Z.length; k++) {
    const zn = Z[k];
    const d = Math.hypot((x - zn.x) / zn.rx, (z - zn.z) / zn.rz) + (k % 2 ? j : -j);
    if (d < bd) {
      bd = d;
      best = k;
    }
  }
  return best;
}

// ligne des neiges (m) selon la latitude (z du monde) : plus basse au nord ; jamais sur un volcan
export function snowLine(worldZ, biome) {
  const t = clamp((worldZ + 2700) / 4000, 0, 1);
  if (biome === 'volcan') return Infinity;
  return biome === 'glace' ? 34 + t * 30 : 82 + t * 150;
}

// ---------------------------------------------------------------------------
// Terrassements posés à la main (desc.terrassements, repère de l'île, m) : retouches du relief appliquées
// à la grille après l'érosion et les rivières, avant les zones (plan.js). Seules les cases de la zone
// nommée `zone` sont touchées ; partout ailleurs H reste identique octet pour octet.
//   corniche : { t: 'corniche', zone, pts: [[x, z]…] du pied vers l'arrivée, h: [pied, arrivée],
//                demi (bande de roulement, m), talus (m), palier: r (disque à la hauteur d'arrivée) }
// La polyligne est arrondie (Chaikin, 3 passes : virages de plus de 10 m de rayon) puis la hauteur visée
// monte linéairement sur la longueur ; bande à la hauteur visée, talus fondu (smoothstep) vers le relief
// naturel sur une largeur fixe (pas proportionnelle à l'écart, qui remblaierait le pied de l'escarpement).
// Renvoie le poids de la retouche par case (0 hors emprise ; 1 sur la bande), ou null sans terrassement :
// plan.js coupe le relief fin (A) en proportion.

// polyligne arrondie : coins coupés au quart (Chaikin), extrémités gardées
export function arrondir(pts, passes = 3) {
  let p = pts.map((q) => [q[0], q[1]]);
  for (let k = 0; k < passes; k++) {
    const o = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const [ax, az] = p[i];
      const [bx, bz] = p[i + 1];
      if (i > 0) o.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25]);
      if (i < p.length - 2) o.push([ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]);
    }
    o.push(p[p.length - 1]);
    p = o;
  }
  return p;
}

// tracé d'une corniche : points arrondis avec leur hauteur visée [x, z, h] et longueur totale ; la hauteur
// d'arrivée est atteinte au bord du palier (plat : rayon du palier plus une case de la grille de 4 m, pour que
// le relief interpolé reste plat sur tout le rayon du palier)
export function traceCorniche(tr) {
  const p = arrondir(tr.pts);
  let L = 0;
  const cum = [0];
  for (let i = 1; i < p.length; i++) cum.push((L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])));
  const [h0, h1] = tr.h;
  const Lm = L - (tr.palier ? tr.palier + CELL : 0);
  return { pts: p.map((q, i) => [q[0], q[1], h0 + (h1 - h0) * Math.min(1, cum[i] / Lm)]), L };
}

const lisse = (t) => t * t * (3 - 2 * t);

export function terrasser(T, desc) {
  const liste = desc.terrassements;
  if (!liste || !liste.length) return null;
  const { H, n, s, ext } = T;
  const c = T.ctx;
  const W = new Float32Array(n * n);
  // relief naturel des cases déjà retouchées
  const nat = new Map();
  for (const tr of liste) {
    if (tr.t !== 'corniche') continue;
    const zi = c.zones.findIndex((z) => z.id === tr.zone);
    const { pts } = traceCorniche(tr);
    const demi = tr.demi ?? 6;
    const talus = tr.talus ?? 8;
    const reach = demi + talus;
    const [ax, az, ah] = pts[pts.length - 1];
    const rp = tr.palier || 0;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of pts) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      z0 = Math.min(z0, z); z1 = Math.max(z1, z);
    }
    const marge = reach + rp;
    const i0 = Math.max(0, Math.floor((x0 - marge + ext) / s));
    const i1 = Math.min(n - 1, Math.ceil((x1 + marge + ext) / s));
    const j0 = Math.max(0, Math.floor((z0 - marge + ext) / s));
    const j1 = Math.min(n - 1, Math.ceil((z1 + marge + ext) / s));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const x = -ext + i * s;
        const z = -ext + j * s;
        // projection sur la polyligne : distance et hauteur visée
        let d = Infinity;
        let hv = 0;
        for (let k = 1; k < pts.length; k++) {
          const [px, pz, ph] = pts[k - 1];
          const [qx, qz, qh] = pts[k];
          const dx = qx - px, dz = qz - pz;
          const l2 = dx * dx + dz * dz || 1e-9;
          const t = Math.max(0, Math.min(1, ((x - px) * dx + (z - pz) * dz) / l2));
          const dd = Math.hypot(x - px - dx * t, z - pz - dz * t);
          if (dd < d) {
            d = dd;
            hv = ph + (qh - ph) * t;
          }
        }
        // palier d'arrivée : disque plat à la hauteur d'arrivée (rayon + une case), prioritaire sur la route
        if (rp) {
          const dp = Math.max(0, Math.hypot(x - ax, z - az) - rp - s + demi);
          if (dp <= demi || dp < d) {
            d = dp;
            hv = ah;
          }
        }
        if (d >= reach) continue;
        // même découpage des zones que computeZonesForme (pas de 8 m)
        if (c.zones.length > 1 && formeZone(c, -ext + ((i >> 1) * 2 + 0.5) * s, -ext + ((j >> 1) * 2 + 0.5) * s) !== zi) continue;
        const k = j * n + i;
        const w = d <= demi ? 1 : lisse((reach - d) / talus);
        if (w <= W[k]) continue;
        // retouche depuis le relief naturel (pas d'empilement si deux emprises se recouvrent)
        if (!nat.has(k)) nat.set(k, H[k]);
        H[k] = nat.get(k) * (1 - w) + hv * w;
        W[k] = w;
      }
    }
  }
  return W;
}
