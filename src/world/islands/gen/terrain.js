// Passes 1a à 1c réunies : relief de base, érosion, hydrologie (rivières, lacs, cascades).
import { reliefContext, baseGrid } from './relief.js';
import { thermal, hydraulic } from './erosion.js';
import { priorityFlood, accumulate, findLakes, traceRivers, chaikin, carveRivers, findWaterfalls } from './hydro.js';

const EROSION = {
  montagne: { thermal: 14, talus: 0.8, drops: 1.1 },
  cratere: { thermal: 10, talus: 0.85, drops: 0.7 },
  falaises: { thermal: 4, talus: 1.2, drops: 0.35 },
  foret: { thermal: 6, talus: 0.7, drops: 0.5 },
  village: { thermal: 6, talus: 0.6, drops: 0.35 },
  fleurs: { thermal: 6, talus: 0.6, drops: 0.3 },
  jumelles: { thermal: 6, talus: 0.75, drops: 0.45 },
  dunes: { thermal: 10, talus: 0.55, drops: 0 },
  lagon: { thermal: 2, talus: 0.6, drops: 0 },
  curiosite: { thermal: 3, talus: 1.0, drops: 0.25 },
  // îles de la carte : éboulis légers (les falaises et les pitons tracés restent debout)
  forme: { thermal: 5, talus: 1.15, drops: 0.45 },
};

export function buildTerrain(desc, timings = {}) {
  let t = performance.now();
  const lap = (name) => {
    const now = performance.now();
    timings[name] = (timings[name] || 0) + now - t;
    t = now;
  };
  const c = reliefContext(desc);
  const { H, n, s } = baseGrid(c);
  lap('relief');
  const ex = c.forme && c.F.falaise >= 0.8 ? { thermal: 0, drops: 0.2 } : EROSION[c.arch] || EROSION.foret;
  let land = 0;
  let hmax = 0;
  for (let k = 0; k < H.length; k++) {
    if (H[k] > 0) land++;
    if (H[k] > hmax) hmax = H[k];
  }
  if (ex.thermal) thermal(H, n, s, ex.thermal, ex.talus);
  if (ex.drops) hydraulic(H, n, s, Math.round(Math.min(c.forme ? 24000 : 6000, land * 0.9 * ex.drops)), desc.seed);
  lap('erosion');
  // hydrologie
  const { F, dir, order } = priorityFlood(H, n);
  hmax = 0;
  land = 0;
  for (let k = 0; k < H.length; k++) {
    if (H[k] > hmax) hmax = H[k];
    if (H[k] > 0) land++;
  }
  const acc = accumulate(H, dir, order, hmax);
  let { lakes, lakeOf } = findLakes(H, F, n, s);
  if (c.forme) {
    // îles de la carte : seuls les lacs voulus restent (ceux qui couvrent le fond d'une cuvette
    // tracée) ; les autres creux du relief se comblent (replats, prés)
    const keep = [];
    const wanted = new Set();
    for (const f of c.reliefs) {
      if (f.t !== 'cuvette') continue;
      const i = Math.round((f.x + c.ext) / s);
      const j = Math.round((f.z + c.ext) / s);
      if (i >= 0 && j >= 0 && i < n && j < n) wanted.add(j * n + i);
    }
    for (const L of lakes) {
      if (L.depth >= 1 && L.cells.some((k) => wanted.has(k))) {
        L.id = keep.length;
        for (const k of L.cells) lakeOf[k] = L.id;
        keep.push(L);
      } else {
        for (const k of L.cells) {
          H[k] = F[k] - 0.02;
          lakeOf[k] = -1;
        }
      }
    }
    lakes = keep;
  }
  // seuil de débit : plus bas sur les îles hautes (plus de pluie, plus de rivières)
  const relief = Math.min(1, hmax / 60);
  // les volcans boivent la pluie (roche poreuse) : peu de ruisseaux
  const T = Math.max(14, land * (0.06 - relief * 0.035)) * (c.arch === 'cratere' ? 2.6 : 1);
  let rivers = [];
  const dry = c.arch === 'lagon' || c.arch === 'dunes' || (c.forme && (c.desc.biome === 'dunes' || c.desc.biome === 'atoll' || c.F.immerge));
  if (hmax > 7 && !dry) rivers = traceRivers(H, F, dir, acc, lakeOf, n, s, c.ext, T).rivers;
  // on garde les plus grosses rivières (débit à l'embouchure)
  rivers.sort((a, b) => acc[b.cells[b.cells.length - 1]] - acc[a.cells[a.cells.length - 1]]);
  // îles de la carte : nombre de rivières selon la surface des terres (aucune sous 0,15 km²)
  const landKm2 = (land * s * s) / 1e6;
  const cap = c.forme ? (landKm2 < 0.15 ? 0 : Math.min(16, Math.round(1 + landKm2 * 3.5))) : c.r > 150 ? 9 : 6;
  rivers = rivers.slice(0, cap).filter((rv, i) => i === 0 || rv.cells.length >= 10);
  rivers.forEach((rv, i) => (rv.id = i));
  for (const rv of rivers) rv.pts = chaikin(rv.pts, 4, 2);
  const water = new Uint8Array(n * n); // 1 lac, 2 rivière
  for (const L of lakes) for (const k of L.cells) water[k] = 1;
  carveRivers(H, n, s, c.ext, rivers, water);
  const falls = findWaterfalls(rivers);
  lap('hydro');
  return { ctx: c, H, n, s, ext: c.ext, F, acc, lakes, lakeOf, rivers, falls, water, hmax };
}
