// Passe 5 — végétation de l'île (grands éléments, identifiants stables) : tirage par
// zone avec bosquets, haies le long des chemins, vergers en rangées, cultures.
// La petite végétation dense (herbe, fleurs des champs, roseaux, blé) est tirée
// par tuile au moment de construire le relief au mètre (voir surface.js).
import { makeNoise, fbm } from '../../../core/noise.js';
import { mulberry32 } from '../../../core/random.js';
import { bilinear, stableId, smooth } from './grid.js';
import { Z } from './zones.js';
import { KIND_INDEX, KIND_RADIUS, STRIDE, TREES } from './kinds.js';
import { bloomBand, BLOOM_IDS } from './zones.js';

// densités : éléments pour 100 m² ; « g » = 1 : espèce en bosquets épars, 2 : futaie continue
const FOREST_TREES = {
  prairie: [['arbre_pompon', 1.6, 1], ['bouleau', 0.5, 1], ['erable', 0.25, 1], ['arbre_fruitier', 0.08, 0]],
  pins: [['pin', 2.4, 1], ['bouleau', 0.3, 1]],
  tropical: [['palmier', 0.8, 1], ['fougere_arbo', 0.6, 1], ['bambou', 0.6, 1]],
  glace: [['sapin_neige', 1.6, 1], ['pin_givre', 0.6, 1]],
  champignons: [['champi_geant', 1.0, 1], ['erable', 0.2, 1]],
  volcan: [['fougere_arbo', 0.5, 1], ['pin', 0.6, 1]],
  dunes: [['palmier', 0.4, 1]],
  atoll: [['palmier', 1.0, 1]],
};
const ZONE_TABLE = {
  [Z.PRAIRIE]: [['arbre_pompon', 0.3, 1], ['bouleau', 0.07, 1], ['arbuste', 0.4, 0], ['buisson_fleuri', 0.18, 0], ['rocher', 0.1, 0], ['souche', 0.02, 0], ['filon_cuivre', 0.03, 0]],
  [Z.FLEURS]: [['arbre_cerisier', 0.04, 1], ['buisson_fleuri', 0.08, 0], ['rocher', 0.02, 0]],
  [Z.LISIERE]: [['arbuste', 0.8, 0], ['buisson_baies', 0.35, 0], ['bouleau', 0.15, 1], ['TREE', 0.7, 2]],
  [Z.CLAIRIERE]: [['souche', 0.05, 0], ['buisson_fleuri', 0.15, 0], ['rocher_mousse', 0.08, 0]],
  [Z.MARAIS]: [['saule', 0.15, 1], ['arbuste', 0.1, 0]],
  [Z.ROSELIERE]: [['saule', 0.08, 1]],
  [Z.MAQUIS]: [['arbuste', 0.5, 0], ['rocher', 0.35, 0], ['lavande', 0.4, 1], ['cactus', 0.12, 0], ['bois_mort', 0.06, 0], ['filon_cuivre', 0.06, 0]],
  [Z.ROCHE]: [['rocher', 0.4, 0], ['rocher_mousse', 0.15, 0], ['filon_cuivre', 0.12, 0], ['filon_fer', 0.08, 0]],
  [Z.ALPAGE]: [['rocher', 0.25, 0], ['sapin_neige', 0.05, 1], ['filon_fer', 0.05, 0]],
  [Z.NEIGE]: [['sapin_neige', 0.08, 1], ['cristal', 0.12, 0], ['rocher', 0.08, 0]],
  [Z.LAVE]: [['obsidienne', 0.4, 0], ['rocher', 0.25, 0]],
  [Z.CHAMPIGNONS]: [['champi_geant', 0.5, 1], ['champi_petit', 1.2, 1]],
  [Z.VILLAGE]: [['arbre_fruitier', 0.03, 0], ['buisson_fleuri', 0.08, 0]],
  [Z.PLAGE]: [['PALM', 0.25, 1], ['rocher', 0.03, 0], ['bois_mort', 0.03, 0]],
  [Z.DUNE]: [['cactus', 0.15, 0], ['cactus_fleur', 0.08, 0], ['bois_mort', 0.06, 0]],
  [Z.FORET]: [['TREE', 2.2, 2], ['fougere', 1.6, 0], ['arbuste', 0.4, 0], ['champi_petit', 0.4, 0], ['rocher_mousse', 0.18, 0], ['souche', 0.05, 0]],
};
// limites par espèce : pente max, hauteur min
const SLOPE_MAX = { rocher: 1.2, rocher_mousse: 1.0, filon_cuivre: 1.3, filon_fer: 1.3, cristal: 1.3, obsidienne: 1.3, cactus: 0.6 };

export function placeFlora(P, pois, paths) {
  const { H, n, s, ext, zone, slope, water, wetDist, desc } = P;
  const biome = desc.biome;
  const rng = mulberry32(desc.seed ^ 0xf10a17);
  const nc = makeNoise(desc.seed ^ 0xc1a5e7);
  const items = [];
  const ids = [];
  const occN = Math.ceil(2 * ext);
  const occ = new Uint8Array(occN * occN);
  const hAt = (x, z) => bilinear(H, n, (x + ext) / s, (z + ext) / s);
  const occupied = (x, z, rad) => {
    const i0 = Math.floor(x + ext - rad);
    const i1 = Math.floor(x + ext + rad);
    const j0 = Math.floor(z + ext - rad);
    const j1 = Math.floor(z + ext + rad);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (i >= 0 && j >= 0 && i < occN && j < occN && occ[j * occN + i]) return true;
    return false;
  };
  const mark = (x, z, rad) => {
    const i0 = Math.floor(x + ext - rad);
    const i1 = Math.floor(x + ext + rad);
    const j0 = Math.floor(z + ext - rad);
    const j1 = Math.floor(z + ext + rad);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (i >= 0 && j >= 0 && i < occN && j < occN) occ[j * occN + i] = 1;
  };
  // emprises des lieux et des chemins : rien n'y pousse
  const blockers = [];
  for (const p of pois) if (p.r) blockers.push({ x: p.x, z: p.z, r: p.r * (p.type === 'village' ? 0.92 : 1) });
  for (const p of pois) for (const pt of p.parts) if (['maison', 'moulin', 'moulin_eau', 'phare', 'tour_guet', 'cabane', 'temple', 'puits', 'etal', 'jetee', 'epave', 'epave_geante'].includes(pt.t)) blockers.push({ x: pt.x, z: pt.z, r: pt.t === 'maison' ? 4.2 : pt.t === 'jetee' ? 2 : 4 });
  for (const b of blockers) mark(b.x, b.z, b.r);
  // distance aux chemins, tramée au mètre (0 = sur le chemin, 255 = loin)
  const pathD = new Uint8Array(occN * occN).fill(255);
  for (const p of paths) {
    const pts = p.pts;
    const reach = p.w / 2 + 3;
    for (let q = 0; q < pts.length - 2; q += 2) {
      const ax = pts[q];
      const az = pts[q + 1];
      const dx = pts[q + 2] - ax;
      const dz = pts[q + 3] - az;
      const l2 = dx * dx + dz * dz || 1e-9;
      const i0 = Math.max(0, Math.floor(Math.min(ax, ax + dx) - reach + ext));
      const i1 = Math.min(occN - 1, Math.ceil(Math.max(ax, ax + dx) + reach + ext));
      const j0 = Math.max(0, Math.floor(Math.min(az, az + dz) - reach + ext));
      const j1 = Math.min(occN - 1, Math.ceil(Math.max(az, az + dz) + reach + ext));
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const x = i - ext + 0.5;
          const z = j - ext + 0.5;
          const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
          const ex = x - ax - dx * t;
          const ez = z - az - dz * t;
          const d = Math.sqrt(ex * ex + ez * ez) - p.w / 2;
          const v = Math.max(0, Math.min(254, Math.round(d * 20)));
          const o = j * occN + i;
          if (v < pathD[o]) pathD[o] = v;
        }
      }
    }
  }
  const pathNear = (x, z, pad) => {
    const i = Math.floor(x + ext);
    const j = Math.floor(z + ext);
    if (i < 0 || j < 0 || i >= occN || j >= occN) return false;
    return pathD[j * occN + i] < pad * 20;
  };
  const push = (kind, x, z, rot, scale, variant, rad) => {
    const ki = KIND_INDEX[kind];
    if (ki === undefined) return false;
    if (rad > 0) {
      if (occupied(x, z, rad + 0.3)) return false;
      mark(x, z, rad);
    }
    items.push(ki, x, hAt(x, z), z, rot, scale, variant);
    ids.push(stableId(desc.seed, ki, x, z));
    return true;
  };
  const forest = FOREST_TREES[biome] || FOREST_TREES.prairie;
  const palms = biome === 'tropical' || biome === 'atoll' || desc.archetype === 'lagon';
  // tables développées une fois : [espèce, densité, bosquet]
  const tables = {};
  for (const [zk, table] of Object.entries(ZONE_TABLE)) {
    const out = [];
    for (const [kind0, dens, grove] of table) {
      if (kind0 === 'TREE') for (const [k2, d2] of forest) out.push([k2, d2 * dens, grove]);
      else if (kind0 === 'PALM') {
        if (palms) out.push(['palmier', dens, grove]);
      } else out.push([kind0, dens, grove]);
    }
    tables[zk] = out;
  }
  const coral = [['corail', 1.2, 0]];
  // bosquets : bruit à grande échelle précalculé sur la grille de 4 m
  const cl = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) cl[j * n + i] = smooth(-0.15, 0.45, fbm(nc, (-ext + i * s) / 46, (-ext + j * s) / 46, 2));
  const STEP = 2.5;
  const area = STEP * STEP;
  for (let gz = -ext; gz < ext; gz += STEP) {
    for (let gx = -ext; gx < ext; gx += STEP) {
      const x = gx + rng() * STEP;
      const z = gz + rng() * STEP;
      const roll = rng();
      const rot = rng() * Math.PI * 2;
      const vr = rng();
      const sr = rng();
      const fi = (x + ext) / s;
      const fj = (z + ext) / s;
      const i = Math.round(fi);
      const j = Math.round(fj);
      if (i < 1 || j < 1 || i >= n - 1 || j >= n - 1) continue;
      const k = j * n + i;
      const zn = zone[k];
      let table = tables[zn];
      const h = H[k];
      // corail : eau peu profonde des îles chaudes
      if (!table && zn === Z.MER && (biome === 'tropical' || biome === 'atoll') && h > -0.7 && h < 0.15) table = coral;
      if (!table || water[k]) continue;
      const cluster = bilinear(cl, n, fi, fj);
      let acc = 0;
      let chosen = null;
      for (let q = 0; q < table.length; q++) {
        const t = table[q];
        // bosquets : fortement modulés par le bruit ; futaie : canopée continue, à peine modulée
        acc += (t[1] / 100) * area * (t[2] === 2 ? 0.75 + cluster * 0.7 : t[2] ? 0.25 + cluster * 1.9 : 1);
        if (roll < acc) {
          chosen = t[0];
          break;
        }
      }
      // palmiers autour de l'oasis
      if (!chosen && zn === Z.PRAIRIE && desc.archetype === 'dunes' && wetDist[k] < 25 && roll > 0.93) chosen = 'palmier';
      if (!chosen) continue;
      if (slope[k] > (SLOPE_MAX[chosen] ?? (TREES.has(chosen) ? 0.55 : 0.75))) continue;
      if (chosen !== 'corail' && h < 0.6) continue;
      if (pathNear(x, z, TREES.has(chosen) ? 1.4 : 0.6)) continue;
      const scale = TREES.has(chosen) ? 0.78 + sr * 0.55 : 0.7 + sr * 0.6;
      push(chosen, x, z, rot, scale, vr, KIND_RADIUS[chosen] * scale);
    }
  }
  // haies le long des chemins
  for (const p of paths) {
    const pts = p.pts;
    let acc = 0;
    for (let q = 0; q < pts.length - 2; q += 2) {
      const ax = pts[q];
      const az = pts[q + 1];
      const dx = pts[q + 2] - ax;
      const dz = pts[q + 3] - az;
      const len = Math.hypot(dx, dz);
      for (let t = 0; t < len; t += 0.5) {
        acc += 0.5;
        if (acc < 3.5) continue;
        acc = 0;
        const x0 = ax + (dx * t) / len;
        const z0 = az + (dz * t) / len;
        const zn = zone[Math.round((z0 + ext) / s) * n + Math.round((x0 + ext) / s)];
        if (zn !== Z.PRAIRIE && zn !== Z.VILLAGE && zn !== Z.FLEURS && zn !== Z.CULTURES && zn !== Z.VERGER) continue;
        for (const side of [-1, 1]) {
          if (rng() > 0.32) continue;
          const off = p.w / 2 + 1.3;
          const x = x0 - (dz / len) * off * side;
          const z = z0 + (dx / len) * off * side;
          if (pathNear(x, z, 0.4)) continue;
          push(rng() < 0.6 ? 'arbuste' : 'buisson_fleuri', x, z, rng() * 6.28, 0.7 + rng() * 0.3, rng(), 0.4);
        }
      }
    }
  }
  // vergers : arbres fruitiers en rangées ; champs : tournesols et potirons alignés
  for (const p of pois) {
    if (p.orchard) {
      const o = p.orchard;
      const ca = Math.cos(o.rot);
      const sa = Math.sin(o.rot);
      for (let u = -o.r; u <= o.r; u += 5) {
        for (let v = -o.r; v <= o.r; v += 5) {
          if (u * u + v * v > o.r * o.r) continue;
          const x = o.x + u * ca - v * sa;
          const z = o.z + u * sa + v * ca;
          push(rng() < 0.8 ? 'arbre_fruitier' : 'arbre_cerisier', x, z, rng() * 6.28, 0.85 + rng() * 0.2, rng(), 0.5);
        }
      }
    }
    for (const f of p.fields || []) {
      if (f.crop === 'ble') continue; // le blé est dense : tiré par tuile
      const step = f.crop === 'tournesol' ? 1.6 : 2.4;
      const ca = Math.cos(f.rot);
      const sa = Math.sin(f.rot);
      for (let u = -f.w / 2 + 1; u < f.w / 2 - 0.5; u += step) {
        for (let v = -f.d / 2 + 1; v < f.d / 2 - 0.5; v += step) {
          const x = f.x + u * ca - v * sa + (rng() - 0.5) * 0.3;
          const z = f.z + u * sa + v * ca + (rng() - 0.5) * 0.3;
          push(f.crop, x, z, rng() * 6.28, 0.85 + rng() * 0.3, rng(), 0);
        }
      }
    }
  }
  // lavande et tournesols dans les bandes de fleurs assorties
  const nb = makeNoise(desc.seed ^ 0x0b100);
  for (let gz = -ext; gz < ext; gz += 3) {
    for (let gx = -ext; gx < ext; gx += 3) {
      const x = gx + rng() * 3;
      const z = gz + rng() * 3;
      const k = Math.round((z + ext) / s) * n + Math.round((x + ext) / s);
      if (k < 0 || k >= n * n || zone[k] !== Z.FLEURS) continue;
      const band = BLOOM_IDS[bloomBand(P.traits, x, z, nb)];
      const kind = band === 'mauve' ? 'lavande' : band === 'jaune' ? 'tournesol' : null;
      if (!kind || rng() > 0.55) continue;
      push(kind, x, z, rng() * 6.28, 0.8 + rng() * 0.4, rng(), 0);
    }
  }
  return { items: Float32Array.from(items), ids: Uint32Array.from(ids) };
}

export { STRIDE };

// ---------------------------------------------------------------------------
// Îles de la carte (open world) : arbres par zone nommée (table d'arbres de la zone, sinon celle de
// son biome ; forêts en futaie, arbres épars en bosquets ailleurs) et décor naturel de chaque
// micro-zone (buissons, rochers, fougères, souches…), simple décor : rien ne s'y récolte (Gather.js).
// DENSITE : facteur commun des densités (budget de rendu d'un monde de 6 × 4 km).
export const DENSITE_FORME = 0.5;
export const DENSITE_DECOR = 0.55;
// décor des îles de la carte (ni ressources, ni nourriture : pas de filons, de cristaux, de baies)
export const DECOR = new Set(['arbuste', 'buisson_fleuri', 'rocher', 'rocher_mousse', 'fougere', 'souche', 'champi_petit', 'lavande']);
// décor lourd (triangles par pièce : fougère 600, petits champignons 600, rochers et buissons fleuris
// 360 à 380, contre 32 pour l'arbuste) : moins dense
const POIDS = { fougere: 0.22, champi_petit: 0.3, rocher: 0.6, rocher_mousse: 0.6, buisson_fleuri: 0.6 };
// espèces trop lourdes pour une forêt continue (bouleau : environ 1 800 triangles, les autres arbres
// 100 à 180) : écartées en attendant les arbres V2 (branche claude/arbres-v2-11841d)
const LOURDS = new Set(['bouleau']);
const OUVERT = new Set([Z.PRAIRIE, Z.FLEURS, Z.CLAIRIERE, Z.ALPAGE, Z.MAQUIS, Z.MARAIS, Z.ROSELIERE]);

export function placeFloraForme(P) {
  const { H, n, s, ext, zone, slope, water, wetDist, desc, ZI } = P;
  const zones = P.ctx.zones;
  const rng = mulberry32(desc.seed ^ 0xf10a17);
  const nc = makeNoise(desc.seed ^ 0xc1a5e7);
  const items = [];
  const ids = [];
  const occN = Math.ceil(2 * ext);
  const occ = new Uint8Array(occN * occN);
  const hAt = (x, z) => bilinear(H, n, (x + ext) / s, (z + ext) / s);
  const free = (x, z, rad) => {
    const i0 = Math.floor(x + ext - rad);
    const i1 = Math.floor(x + ext + rad);
    const j0 = Math.floor(z + ext - rad);
    const j1 = Math.floor(z + ext + rad);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (i >= 0 && j >= 0 && i < occN && j < occN && occ[j * occN + i]) return false;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (i >= 0 && j >= 0 && i < occN && j < occN) occ[j * occN + i] = 1;
    return true;
  };
  // tables par zone de l'île et par micro-zone : [espèce, densité, bosquet]
  const tables = zones.map((zd) => {
    const forest = (zd.arbres || FOREST_TREES[zd.biome] || FOREST_TREES.prairie).map(([k, d]) => [k, d, 1]);
    const palms = zd.palmiers || zd.biome === 'tropical' || zd.biome === 'atoll';
    const out = {};
    for (const [zk, table] of Object.entries(ZONE_TABLE)) {
      const list = [];
      for (const [kind, dens, grove] of table) {
        if (kind === 'TREE') for (const [k2, d2] of forest) list.push([k2, d2 * dens, grove]);
        else if (kind === 'PALM') {
          if (palms) list.push(['palmier', dens, grove]);
        } else if (TREES.has(kind) && !zd.arbres) list.push([kind, dens, grove]);
        else if (DECOR.has(kind)) list.push([kind, dens * (POIDS[kind] ?? 1) * (DENSITE_DECOR / DENSITE_FORME), grove]);
      }
      // prés et landes : quelques arbres de la zone, en bosquets ; décor propre à la zone
      if (OUVERT.has(Number(zk))) for (const [k2, d2] of forest) list.push([k2, d2 * 0.12, 1]);
      for (const [k2, d2] of zd.decor || []) if (OUVERT.has(Number(zk)) || Number(zk) === Z.FORET) list.push([k2, d2 * (POIDS[k2] ?? 1) * (DENSITE_DECOR / DENSITE_FORME), 1]);
      out[zk] = list.filter(([k]) => !LOURDS.has(k)).map(([k, d, g]) => [k, d * DENSITE_FORME, g]);
    }
    return out;
  });
  const cl = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) cl[j * n + i] = smooth(-0.15, 0.45, fbm(nc, (-ext + i * s) / 46, (-ext + j * s) / 46, 2));
  const STEP = 2.5;
  const area = STEP * STEP;
  for (let gz = -ext; gz < ext; gz += STEP) {
    for (let gx = -ext; gx < ext; gx += STEP) {
      const x = gx + rng() * STEP;
      const z = gz + rng() * STEP;
      const roll = rng();
      const rot = rng() * Math.PI * 2;
      const vr = rng();
      const sr = rng();
      const fi = (x + ext) / s;
      const fj = (z + ext) / s;
      const i = Math.round(fi);
      const j = Math.round(fj);
      if (i < 1 || j < 1 || i >= n - 1 || j >= n - 1) continue;
      const k = j * n + i;
      if (water[k] || H[k] < 0.6) continue;
      const zn = zone[k];
      const table = tables[ZI[k]][zn];
      if (!table || !table.length) continue;
      const cluster = bilinear(cl, n, fi, fj);
      let acc = 0;
      let chosen = null;
      for (let q = 0; q < table.length; q++) {
        const t = table[q];
        acc += (t[1] / 100) * area * (t[2] === 2 ? 0.75 + cluster * 0.7 : t[2] ? 0.25 + cluster * 1.9 : 1);
        if (roll < acc) {
          chosen = t[0];
          break;
        }
      }
      // palmiers autour des oasis du désert
      if (!chosen && zones[ZI[k]].biome === 'dunes' && zn === Z.PRAIRIE && wetDist[k] < 25 && roll > 0.9) chosen = 'palmier';
      if (!chosen) continue;
      const tree = TREES.has(chosen);
      if (slope[k] > (SLOPE_MAX[chosen] ?? (tree ? 0.55 : 0.75))) continue;
      const scale = tree ? 0.78 + sr * 0.55 : 0.7 + sr * 0.6;
      const ki = KIND_INDEX[chosen];
      if (ki === undefined || !free(x, z, KIND_RADIUS[chosen] * scale + 0.3)) continue;
      items.push(ki, x, hAt(x, z), z, rot, scale, vr);
      ids.push(stableId(desc.seed, ki, x, z));
    }
  }
  return { items: Float32Array.from(items), ids: Uint32Array.from(ids) };
}
