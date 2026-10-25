// Passe 2 — micro-zones écologiques (grille de 4 m) : plage, prairie, champ de fleurs,
// forêt et lisière, clairière, marais, roselière, maquis, roche, alpage, neige, lave,
// jardin de champignons ; puis couleurs peintes et amplitude du relief fin par zone.
import { makeNoise, fbm } from '../../../core/noise.js';
import { slopeAt, distanceField, smooth } from './grid.js';
import { BIOMES, paletteHerbe, densiteHerbeBiome } from '../biomes.js';
import { BIOME_IDS, formeZone, snowLine } from './forme.js';

export const Z = {
  MER: 0, PLAGE: 1, DUNE: 2, PRAIRIE: 3, FLEURS: 4, VERGER: 5, FORET: 6, LISIERE: 7, CLAIRIERE: 8, MARAIS: 9,
  ROSELIERE: 10, MAQUIS: 11, ROCHE: 12, ALPAGE: 13, NEIGE: 14, LAVE: 15, CHAMPIGNONS: 16, CULTURES: 17, VILLAGE: 18,
  LAC: 19, RIVIERE: 20,
};
export const ZONE_NAMES = Object.keys(Z);

// Herbe en tapis par zone : [densité (0 à 1), hauteur des brins (m), sécheresse (0 à 1), touffes
// (contraste du bruit fin)], avant le facteur du biome (densiteHerbeBiome). Partagé par la couleur
// du sol sous l'herbe (zoneColors) et la carte d'herbe des tuiles (gen/herbe.js). Hauteurs pour un
// personnage de 1,1 m : prairie au mollet, alpage et bords de chemin ras.
export const ZONE_HERBE = {
  [Z.PRAIRIE]: [0.95, 0.37, 0.08, 0],
  [Z.FLEURS]: [0.75, 0.32, 0.06, 0],
  [Z.CLAIRIERE]: [0.9, 0.37, 0.06, 0],
  [Z.VERGER]: [0.85, 0.32, 0.08, 0],
  [Z.MARAIS]: [0.9, 0.55, 0, 0],
  [Z.LISIERE]: [0.7, 0.42, 0.06, 0],
  [Z.FORET]: [0.15, 0.28, 0.12, 0],
  [Z.CHAMPIGNONS]: [0.15, 0.25, 0.04, 0],
  [Z.MAQUIS]: [0.3, 0.32, 0.45, 1],
  [Z.ALPAGE]: [0.7, 0.18, 0.2, 0],
  [Z.VILLAGE]: [0.85, 0.26, 0.1, 0],
  [Z.ROSELIERE]: [0.2, 0.55, 0.02, 0],
  [Z.DUNE]: [0.08, 0.32, 0.85, 1],
  [Z.CULTURES]: [0.2, 0.2, 0.3, 0],
  // sans herbe : hauteur et sécheresse ne servent qu'au fondu avec les zones voisines
  [Z.PLAGE]: [0, 0.25, 0.75, 0],
  [Z.ROCHE]: [0, 0.2, 0.4, 0],
  [Z.NEIGE]: [0, 0.15, 0.35, 0],
  [Z.LAVE]: [0, 0.2, 0.6, 0],
  [Z.LAC]: [0, 0.55, 0, 0],
  [Z.RIVIERE]: [0, 0.55, 0, 0],
  [Z.MER]: [0, 0.25, 0.7, 0],
};

// seuil tel qu'une fraction « frac » des valeurs soit au-dessus
function quantile(values, frac) {
  if (!values.length) return Infinity;
  const v = Float32Array.from(values).sort();
  return v[Math.max(0, Math.min(v.length - 1, Math.floor(v.length * (1 - frac))))];
}

// ---------------------------------------------------------------------------
// Couleurs peintes par zone
const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
export const BLOOM_COLORS = { rose: '#ed78a5', jaune: '#ffd34f', bleue: '#72b5ed', blanche: '#fff8e8', mauve: '#b887e8' };
const BLOOM_ORDER = ['rose', 'jaune', 'bleue', 'blanche', 'mauve'];

// couleur (indice) de la bande de fleurs à cet endroit : bandes orientées par le vent
export function bloomBand(traits, x, z, nb) {
  const a = traits.windAngle;
  const alongWind = x * -Math.sin(a) + z * Math.cos(a);
  const curved = alongWind + nb(x / 48, z / 48) * 7.5;
  const k = curved / 22;
  const idx = Math.floor(k);
  const main = BLOOM_ORDER.indexOf(traits.bloom);
  // une bande sur deux reprend la couleur dominante de l'île
  return idx % 2 === 0 ? main : (main + 1 + (((idx >> 1) % 4) + 4) % 4) % 5;
}
export const bloomColorOf = (i) => BLOOM_COLORS[BLOOM_ORDER[i]];
export const BLOOM_IDS = BLOOM_ORDER;

// palette peinte d'un biome (couleurs du sol, sol sous l'herbe, densité d'herbe)
function palSet(pal, biome) {
  const g1 = hex(pal.grass[1]);
  return {
    g0: hex(pal.grass[0]),
    g1,
    acc: hex(pal.accent),
    sand: hex(pal.sand),
    wet: hex(pal.wet),
    rock: hex(pal.rock),
    cliff: hex(pal.cliff),
    snow: hex(pal.snow || '#f7fbff'),
    floor: hex(pal.floor),
    forestFloor: [g1[0] * 0.82, g1[1] * 0.9, g1[2] * 0.86],
    // sol sous l'herbe en tapis : « milieu ombré » de la palette, en proportion de la densité
    solH: paletteHerbe(biome).sol,
    fH: densiteHerbeBiome(biome),
  };
}

// P.B : un biome par case (celui de la zone de l'île)
export function zoneColors(P, desc) {
  const { zone, H, n, s, ext, slope } = P;
  const C = new Float32Array(n * n * 3);
  const A = new Uint8Array(n * n);
  const nn = makeNoise(desc.seed ^ 0x6a1e77);
  const nb = makeNoise(desc.seed ^ 0x0b100);
  const sets = BIOME_IDS.map((b) => palSet(BIOMES[b].pal, b));
  const lava = hex('#8a7a96');
  const marsh = hex('#a8c8a0');
  const reeds = hex('#c9d39a');
  const maquis = hex('#c4c79a');
  const alp = hex('#bfe0c4');
  const mush = hex('#c7b6e0');
  const crop = hex('#e8d494');
  const soil = hex('#cfae86');
  const villageG = hex('#d6d9a6');
  const orchard = hex('#bfdc9c');
  const bed = hex('#bcd9cf');
  const AMP = [0, 12, 25, 40, 30, 35, 50, 45, 35, 15, 20, 55, 100, 50, 40, 80, 40, 6, 5, 10, 10];
  const mix = (a, b, t, o) => {
    o[0] = a[0] + (b[0] - a[0]) * t;
    o[1] = a[1] + (b[1] - a[1]) * t;
    o[2] = a[2] + (b[2] - a[2]) * t;
    return o;
  };
  const c = [0, 0, 0];
  const t2 = [0, 0, 0];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const x = -ext + i * s;
      const z = -ext + j * s;
      const h = H[k];
      const q = sets[P.B[k]];
      const { g0, g1, acc, sand, wet, rock, cliff, snow, forestFloor, solH } = q;
      const patch = 0.5 + 0.5 * fbm(nn, x / 30, z / 30, 2);
      mix(g0, g1, smooth(0.35, 0.7, patch), c);
      mix(c, acc, smooth(0.62, 0.82, 0.5 + 0.5 * nn(x / 18 + 4, z / 18 - 2)) * 0.5, c);
      const dH = Math.min(1, (ZONE_HERBE[zone[k]]?.[0] ?? 0) * q.fH);
      // champs de fleurs : le sol herbeux d'abord, puis les bandes colorées par-dessus
      if (zone[k] === Z.FLEURS) mix(c, solH, dH, c);
      switch (zone[k]) {
        case Z.MER: mix(q.floor, wet, Math.max(0, Math.min(1, (h + 3) / 3)) * 0.5, c); break;
        case Z.PLAGE: mix(wet, sand, smooth(0.05, 0.6, h), c); break;
        case Z.DUNE: mix(sand, c, 0.12 * patch, c); c[0] *= 1.02; break;
        case Z.FLEURS: {
          const band = hex(bloomColorOf(bloomBand(P.traits, x, z, nb)));
          mix(c, band, 0.7 + 0.1 * patch, c);
          break;
        }
        case Z.VERGER: mix(c, orchard, 0.5, c); break;
        case Z.FORET: mix(c, forestFloor, 0.7, c); break;
        case Z.LISIERE: mix(c, forestFloor, 0.35, c); break;
        case Z.CLAIRIERE: mix(c, acc, 0.25, c); break;
        case Z.MARAIS: mix(c, marsh, 0.65, c); break;
        case Z.ROSELIERE: mix(c, reeds, 0.6, c); break;
        case Z.MAQUIS: mix(c, maquis, 0.55, c); break;
        case Z.ROCHE: {
          const strata = 0.5 + 0.5 * Math.sin(h * 0.9 + nn(x / 25, z / 25) * 3);
          mix(cliff, rock, 0.3 + strata * 0.4, c);
          // parois au-dessus de la ligne des neiges : roche givrée
          if (P.givre?.[k]) mix(c, snow, 0.55, c);
          break;
        }
        case Z.ALPAGE: mix(c, alp, 0.55, c); break;
        case Z.NEIGE: mix(snow, rock, slope[k] > 0.8 ? 0.4 : 0.05, c); break;
        case Z.LAVE: mix(lava, rock, 0.25 * patch, c); break;
        case Z.CHAMPIGNONS: mix(c, mush, 0.6, c); break;
        case Z.CULTURES: {
          // sillons : rangées alternées blé / terre retournée
          const rows = Math.sin((x * Math.cos(P.traits.windAngle) + z * Math.sin(P.traits.windAngle)) * 1.6) > 0;
          mix(rows ? crop : soil, c, 0.15, c);
          break;
        }
        case Z.VILLAGE: mix(c, villageG, 0.5, c); break;
        case Z.LAC:
        case Z.RIVIERE: mix(bed, sand, 0.3, c); break;
        default: break;
      }
      if (zone[k] !== Z.FLEURS) mix(c, solH, dH, c);
      // pentes raides de toute zone : roche qui affleure
      // (la neige tient jusqu'à des pentes plus fortes)
      const cl = zone[k] === Z.NEIGE ? smooth(1.3, 1.9, slope[k]) * 0.6 : smooth(0.62, 0.9, slope[k]);
      if (cl > 0 && zone[k] !== Z.ROCHE) mix(c, mix(cliff, rock, 0.5, t2), cl * (P.givre?.[k] ? 0.45 : 0.8), c);
      C[k * 3] = c[0];
      C[k * 3 + 1] = c[1];
      C[k * 3 + 2] = c[2];
      A[k] = AMP[zone[k]] ?? 30;
    }
  }
  blendBiomes(C, P.B, n);
  return { C, A };
}

// fondu des couleurs aux frontières des biomes (deux flous 3 × 3 sur une bande de 3 cases)
function blendBiomes(C, B, n) {
  const edge = new Uint8Array(n * n);
  for (let j = 1; j < n - 1; j++) {
    for (let i = 1; i < n - 1; i++) {
      const k = j * n + i;
      if (B[k] !== B[k + 1] || B[k] !== B[k + n]) {
        for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) {
          const ii = i + di;
          const jj = j + dj;
          if (ii > 0 && jj > 0 && ii < n - 1 && jj < n - 1) edge[jj * n + ii] = 1;
        }
      }
    }
  }
  const tmp = new Float32Array(C.length);
  for (let pass = 0; pass < 2; pass++) {
    tmp.set(C);
    for (let k = 0; k < edge.length; k++) {
      if (!edge[k]) continue;
      for (let ch = 0; ch < 3; ch++) {
        let sum = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) sum += tmp[(k + dj * n + di) * 3 + ch];
        C[k * 3 + ch] = sum / 9;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Micro-zones des îles de la carte : biome, forêt et fleurs de la zone nommée de chaque case
// (forme.js), neige sous la ligne des neiges de la latitude, coulées autour du volcan.
// Renvoie aussi B (indice du biome par case) et ZI (indice de la zone de l'île par case).
export function computeZonesForme(T, desc) {
  const { H, n, s, ext, water } = T;
  const c = T.ctx;
  const N = n * n;
  const nz = makeNoise(desc.seed ^ 0x2017e5);
  const nf = makeNoise(desc.seed ^ 0x5f10e1);
  const zone = new Uint8Array(N);
  const slope = new Float32Array(N);
  const B = new Uint8Array(N);
  const ZI = new Uint8Array(N);
  // au-dessus de la ligne des neiges (les parois y sont peintes en roche givrée)
  const givre = new Uint8Array(N);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) slope[j * n + i] = slopeAt(H, n, s, i, j);
  const coastDist = distanceField(n, s, (k) => H[k] < 0 && water[k] === 0);
  const wetDist = distanceField(n, s, (k) => water[k] > 0);
  const forestN = new Float32Array(N);
  const bloomN = new Float32Array(N);
  const nzn = c.zones.length;
  const cand = c.zones.map(() => []);
  const bcand = c.zones.map(() => []);
  const open = new Float64Array(nzn);
  const V = c.volcan;
  // zone de l'île : calculée au pas de 8 m (frontières bruitées à grande échelle), case la plus proche
  const m = Math.ceil(n / 2);
  const Z8 = new Uint8Array(m * m);
  if (nzn > 1) for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) Z8[j * m + i] = formeZone(c, -ext + (i * 2 + 0.5) * s, -ext + (j * 2 + 0.5) * s);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const x = -ext + i * s;
      const z = -ext + j * s;
      const zi = Z8[(j >> 1) * m + (i >> 1)];
      const zd = c.zones[zi];
      ZI[k] = zi;
      B[k] = zd.bi;
      const biome = zd.biome;
      const h = H[k];
      const sl = slope[k];
      // ligne des neiges irrégulière (langues de neige dans les combes)
      const snow = snowLine(desc.z + z, biome) + 14 * fbm(nz, x / 45 + 7, z / 45, 2);
      let zn = Z.PRAIRIE;
      if (water[k] === 1) zn = Z.LAC;
      else if (water[k] === 2) zn = Z.RIVIERE;
      else if (h < -0.3) zn = Z.MER;
      else if (h < 1.45 && sl < 0.5 && coastDist[k] < 45) zn = biome === 'dunes' ? Z.DUNE : Z.PLAGE;
      // neige : tient jusqu'à des pentes fortes (sommets givrés), la roche seulement sur les parois
      else if (h > snow) {
        zn = sl > 1.7 ? Z.ROCHE : Z.NEIGE;
        givre[k] = 1;
      }
      else if (sl > 0.68) zn = Z.ROCHE;
      else if (V && biome === 'volcan' && h > 28 && Math.hypot(x - V.x, z - V.z) < V.r * 0.8) {
        // coulées de lave refroidie : rubans rayonnants depuis le cratère
        const a = Math.atan2(z - V.z, x - V.x);
        const flow = Math.sin(a * 5 + fbm(nz, x / 60, z / 60, 2) * 4);
        zn = flow > 0.55 ? Z.LAVE : h > V.h * 0.55 ? Z.ROCHE : Z.MAQUIS;
      } else if (h > snow * 0.72 && h > 45) zn = Z.ALPAGE;
      else if (biome === 'dunes') zn = wetDist[k] < 28 ? Z.PRAIRIE : Z.DUNE;
      else if (wetDist[k] < 4.5 && sl < 0.3) zn = Z.ROSELIERE;
      else if (wetDist[k] < 12 && sl < 0.12 && h < 30) zn = Z.MARAIS;
      else if (sl > 0.34 && wetDist[k] > 30 && (biome === 'tropical' || biome === 'volcan' || nz(x / 90, z / 90) > 0.2)) zn = Z.MAQUIS;
      zone[k] = zn;
      if (zn === Z.PRAIRIE || zn === Z.MAQUIS || zn === Z.ALPAGE) {
        forestN[k] = fbm(nz, x / 75 + 11, z / 75 - 7, 3) - (zn === Z.ALPAGE ? 0.25 : 0);
        cand[zi].push(forestN[k]);
      }
    }
  }
  // forêt : une part exacte des terres de chaque zone (quantile), lisières et clairières
  const fq = c.zones.map((zd, zi) => quantile(cand[zi], zd.foret));
  for (let k = 0; k < N; k++) {
    const zn = zone[k];
    if ((zn === Z.PRAIRIE || zn === Z.MAQUIS || zn === Z.ALPAGE) && forestN[k] >= fq[ZI[k]]) zone[k] = Z.FORET;
  }
  for (let j = 1; j < n - 1; j++) {
    for (let i = 1; i < n - 1; i++) {
      const k = j * n + i;
      if (zone[k] !== Z.FORET) continue;
      const x = -ext + i * s;
      const z = -ext + j * s;
      if (fbm(nf, x / 34 + 3, z / 34 - 9, 2) > 0.42) {
        zone[k] = Z.CLAIRIERE;
        continue;
      }
      const edge = [k - 1, k + 1, k - n, k + n].some((q) => zone[q] === Z.PRAIRIE || zone[q] === Z.MAQUIS || zone[q] === Z.PLAGE);
      if (edge) zone[k] = Z.LISIERE;
      else if (c.zones[ZI[k]].biome === 'champignons' && fbm(nf, x / 50, z / 50, 2) > 0) zone[k] = Z.CHAMPIGNONS;
    }
  }
  // champs de fleurs (couleur du sol) : grandes taches sur les pentes douces, part propre à chaque zone
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      if (zone[k] !== Z.PRAIRIE) continue;
      open[ZI[k]]++;
      if (slope[k] > 0.28) continue;
      bloomN[k] = fbm(nf, (-ext + i * s) / 55 - 5, (-ext + j * s) / 55 + 13, 3);
      bcand[ZI[k]].push(bloomN[k]);
    }
  }
  const bq = c.zones.map((zd, zi) => {
    const share = bcand[zi].length ? Math.min(1, (zd.fleurs * open[zi]) / bcand[zi].length) : 0;
    return quantile(bcand[zi], share);
  });
  for (let k = 0; k < N; k++) if (zone[k] === Z.PRAIRIE && slope[k] <= 0.28 && bloomN[k] !== 0 && bloomN[k] >= bq[ZI[k]]) zone[k] = Z.FLEURS;
  return { zone, slope, coastDist, wetDist, B, ZI, givre };
}
