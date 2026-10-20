// Passe 2 — micro-zones écologiques (grille de 4 m) : plage, prairie, champ de fleurs,
// forêt et lisière, clairière, marais, roselière, maquis, roche, alpage, neige, lave,
// jardin de champignons ; puis couleurs peintes et amplitude du relief fin par zone.
import { makeNoise, fbm } from '../../../core/noise.js';
import { slopeAt, distanceField, smooth } from './grid.js';

export const Z = {
  MER: 0, PLAGE: 1, DUNE: 2, PRAIRIE: 3, FLEURS: 4, VERGER: 5, FORET: 6, LISIERE: 7, CLAIRIERE: 8, MARAIS: 9,
  ROSELIERE: 10, MAQUIS: 11, ROCHE: 12, ALPAGE: 13, NEIGE: 14, LAVE: 15, CHAMPIGNONS: 16, CULTURES: 17, VILLAGE: 18,
  LAC: 19, RIVIERE: 20,
};
export const ZONE_NAMES = Object.keys(Z);

const FOREST = { foret: 0.68, montagne: 0.42, village: 0.2, fleurs: 0.1, falaises: 0.3, cratere: 0.22, jumelles: 0.34, curiosite: 0.18, dunes: 0.02, lagon: 0.12 };
// part visée des prés ouverts réellement convertie en fleurs, distincte par archétype
const BLOOM = { fleurs: 0.5, village: 0.18, foret: 0.18, montagne: 0.07, falaises: 0.16, jumelles: 0.16, curiosite: 0.14, cratere: 0.12, dunes: 0.12, lagon: 0.13 };

// seuil tel qu'une fraction « frac » des valeurs soit au-dessus
function quantile(values, frac) {
  if (!values.length) return Infinity;
  const v = Float32Array.from(values).sort();
  return v[Math.max(0, Math.min(v.length - 1, Math.floor(v.length * (1 - frac))))];
}

export function computeZones(T, desc) {
  const { H, n, s, ext, water, hmax } = T;
  const arch = T.ctx.arch;
  const biome = desc.biome;
  const N = n * n;
  const nz = makeNoise(desc.seed ^ 0x2017e5);
  const nf = makeNoise(desc.seed ^ 0x5f10e1);
  const zone = new Uint8Array(N);
  const slope = new Float32Array(N);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) slope[j * n + i] = slopeAt(H, n, s, i, j);
  const coastDist = distanceField(n, s, (k) => H[k] < 0 && water[k] === 0);
  const wetDist = distanceField(n, s, (k) => water[k] > 0);
  const forestN = new Float32Array(N);
  const bloomN = new Float32Array(N);
  const cand = [];
  const bcand = [];
  let openCells = 0;
  const hRef = Math.max(12, hmax);
  // première passe : eau, plages, roche, altitude
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const x = -ext + i * s;
      const z = -ext + j * s;
      const h = H[k];
      const sl = slope[k];
      const alt = h / hRef;
      let zn = Z.PRAIRIE;
      if (water[k] === 1) zn = Z.LAC;
      else if (water[k] === 2) zn = Z.RIVIERE;
      else if (h < -0.3) zn = Z.MER;
      else if (h < 1.45 && sl < 0.5 && coastDist[k] < 45) zn = biome === 'dunes' ? Z.DUNE : Z.PLAGE;
      else if ((arch === 'montagne' && alt > 0.7) || (biome === 'glace' && alt > 0.42 && h > 10)) zn = sl > 1.1 ? Z.ROCHE : Z.NEIGE;
      else if (sl > 0.68) zn = Z.ROCHE;
      else if (arch === 'cratere' && alt > 0.25) {
        // coulées de lave refroidie : rubans rayonnants depuis le cratère
        const a = Math.atan2(z, x);
        const flow = Math.sin(a * 5 + fbm(nz, x / 60, z / 60, 2) * 4);
        zn = flow > 0.55 ? Z.LAVE : alt > 0.6 ? Z.ROCHE : Z.MAQUIS;
      } else if (arch === 'montagne' && alt > 0.5) zn = Z.ALPAGE;
      else if (arch === 'dunes' || (biome === 'dunes' && h < 6)) zn = wetDist[k] < 28 ? Z.PRAIRIE : Z.DUNE;
      else if (wetDist[k] < 4.5 && sl < 0.3) zn = Z.ROSELIERE;
      else if (wetDist[k] < 12 && sl < 0.12 && h < hRef * 0.5) zn = Z.MARAIS;
      else if (sl > 0.34 && wetDist[k] > 30 && (biome === 'tropical' || biome === 'dunes' || biome === 'volcan' || nz(x / 90, z / 90) > 0.2)) zn = Z.MAQUIS;
      zone[k] = zn;
      if (zn === Z.PRAIRIE || zn === Z.MAQUIS) {
        forestN[k] = fbm(nz, x / 75 + 11, z / 75 - 7, 3) + (arch === 'montagne' && alt > 0.42 ? -1 : 0);
        cand.push(forestN[k]);
      }
    }
  }
  // forêt : une part exacte de la terre (quantile), lisières et clairières
  const fq = quantile(cand, FOREST[arch] ?? 0.25);
  for (let k = 0; k < N; k++) {
    if ((zone[k] === Z.PRAIRIE || zone[k] === Z.MAQUIS) && forestN[k] >= fq) zone[k] = Z.FORET;
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
      else if (biome === 'champignons' && fbm(nf, x / 50, z / 50, 2) > 0) zone[k] = Z.CHAMPIGNONS;
    }
  }
  // champs de fleurs : grandes taches sur les pentes douces
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      if (zone[k] !== Z.PRAIRIE) continue;
      openCells++;
      if (slope[k] > 0.28) continue;
      const x = -ext + i * s;
      const z = -ext + j * s;
      bloomN[k] = fbm(nf, x / 55 - 5, z / 55 + 13, 3);
      bcand.push(bloomN[k]);
    }
  }
  // Convertit la part visée des prés ouverts en quantile des seules cellules assez
  // douces pour recevoir un champ. Ainsi une île pentue ne perd pas ses fleurs.
  const bloomShare = BLOOM[arch] ?? 0.12;
  const candidateShare = bcand.length ? Math.min(1, bloomShare * openCells / bcand.length) : 0;
  const bq = quantile(bcand, candidateShare);
  for (let k = 0; k < N; k++) if (zone[k] === Z.PRAIRIE && slope[k] <= 0.28 && bloomN[k] >= bq && bloomN[k] !== 0) zone[k] = Z.FLEURS;
  return { zone, slope, coastDist, wetDist };
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

export function zoneColors(P, desc) {
  const { zone, H, n, s, ext, slope } = P;
  const pal = P.pal;
  const C = new Float32Array(n * n * 3);
  const A = new Uint8Array(n * n);
  const nn = makeNoise(desc.seed ^ 0x6a1e77);
  const nb = makeNoise(desc.seed ^ 0x0b100);
  const g0 = hex(pal.grass[0]);
  const g1 = hex(pal.grass[1]);
  const acc = hex(pal.accent);
  const sand = hex(pal.sand);
  const wet = hex(pal.wet);
  const rock = hex(pal.rock);
  const cliff = hex(pal.cliff);
  const snow = hex(pal.snow || '#f7fbff');
  const lava = hex('#8a7a96');
  const forestFloor = [g1[0] * 0.82, g1[1] * 0.9, g1[2] * 0.86];
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
      const patch = 0.5 + 0.5 * fbm(nn, x / 30, z / 30, 2);
      mix(g0, g1, smooth(0.35, 0.7, patch), c);
      mix(c, acc, smooth(0.62, 0.82, 0.5 + 0.5 * nn(x / 18 + 4, z / 18 - 2)) * 0.5, c);
      switch (zone[k]) {
        case Z.MER: mix(hex(pal.floor), wet, Math.max(0, Math.min(1, (h + 3) / 3)) * 0.5, c); break;
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
      // pentes raides de toute zone : roche qui affleure
      const cl = smooth(0.62, 0.9, slope[k]);
      if (cl > 0 && zone[k] !== Z.ROCHE) mix(c, mix(cliff, rock, 0.5, t2), cl * 0.8, c);
      C[k * 3] = c[0];
      C[k * 3 + 1] = c[1];
      C[k * 3 + 2] = c[2];
      A[k] = AMP[zone[k]] ?? 30;
    }
  }
  return { C, A };
}
