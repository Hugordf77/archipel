// Plan d'île (Worker) : enchaîne toutes les passes et renvoie une description
// complète et déterministe — relief, eau, zones, lieux, chemins, végétation, faune.
import { buildTerrain } from './terrain.js';
import { computeZones, zoneColors, Z } from './zones.js';
import { placePOIs, placeMicro, applyStamps } from './pois.js';
import { buildPaths } from './paths.js';
import { sealLakes } from './hydro.js';
import { placeFlora } from './flora.js';
import { placeSpawners } from './spawns.js';
import { slopeAt } from './grid.js';
import { BIOMES } from '../biomes.js';
import { islandTraits } from '../archetypes.js';

export function buildPlan(desc) {
  const tm = {};
  let t = performance.now();
  const lap = (name) => {
    const now = performance.now();
    tm[name] = (tm[name] || 0) + now - t;
    t = now;
  };
  const T = buildTerrain(desc, tm);
  t = performance.now();
  const traits = desc.traits || islandTraits(desc, desc.archetype);
  const P = {
    desc, ctx: T.ctx, traits, pal: (BIOMES[desc.biome] || BIOMES.prairie).pal,
    H: T.H, n: T.n, s: T.s, ext: T.ext, water: T.water, lakes: T.lakes, rivers: T.rivers, falls: T.falls, hmax: T.hmax,
  };
  Object.assign(P, computeZones(T, desc));
  lap('zones');
  const pois = placePOIs(P);
  applyStamps(P);
  lap('pois');
  const net = buildPaths(P, pois);
  const rim = sealLakes(P.H, P.n, P.lakes, P.water);
  // pentes à jour après aplanissement et chemins (la végétation en dépend)
  for (let j = 0; j < P.n; j++) for (let i = 0; i < P.n; i++) P.slope[j * P.n + i] = slopeAt(P.H, P.n, P.s, i, j);
  lap('chemins');
  const { C, A } = zoneColors(P, desc);
  P.A = A;
  // pas de relief fin sur les plates-formes ni sur les chemins
  for (const st of P.stamps) {
    const reach = st.r + 2;
    for (let j = Math.max(0, Math.floor((st.z - reach + P.ext) / P.s)); j <= Math.min(P.n - 1, Math.ceil((st.z + reach + P.ext) / P.s)); j++) {
      for (let i = Math.max(0, Math.floor((st.x - reach + P.ext) / P.s)); i <= Math.min(P.n - 1, Math.ceil((st.x + reach + P.ext) / P.s)); i++) {
        const dx = -P.ext + i * P.s - st.x;
        const dz = -P.ext + j * P.s - st.z;
        if (dx * dx + dz * dz < reach * reach) A[j * P.n + i] = 0;
      }
    }
  }
  for (let k = 0; k < A.length; k++) if (net.pathMask[k]) A[k] = Math.min(A[k], 4);
  for (const k of rim) A[k] = 0;
  lap('couleurs');
  const micro = placeMicro(P, pois);
  const flora = placeFlora(P, pois, net.paths);
  lap('végétation');
  const spawners = placeSpawners(P, pois);
  lap('faune');
  let flowerCells = 0;
  for (let k = 0; k < P.zone.length; k++) if (P.zone[k] === Z.FLEURS) flowerCells++;
  let hmax = 0;
  for (let k = 0; k < P.H.length; k++) hmax = Math.max(hmax, P.H[k]);
  return {
    id: desc.id,
    seed: desc.seed,
    archetype: T.ctx.arch,
    biome: desc.biome,
    name: desc.name,
    n: P.n,
    s: P.s,
    ext: P.ext,
    H: P.H,
    A,
    Z: P.zone,
    C,
    rivers: T.rivers.map((rv) => ({ id: rv.id, end: rv.end, pts: Float32Array.from(rv.pts) })),
    lakes: T.lakes.map((L) => ({ id: L.id, level: L.level, cells: L.cells, box: L.box, area: L.area })),
    falls: T.falls,
    pois,
    micro,
    paths: net.paths.map((p) => ({ ...p, pts: Float32Array.from(p.pts) })),
    pathParts: net.parts,
    landing: net.landing,
    items: flora.items,
    ids: flora.ids,
    spawners,
    traits,
    // distances (m) à l'eau douce et à la mer sur la grille de 4 m : carte d'herbe des tuiles
    // (restent dans le cache du Worker, comme H et C)
    wetDist: P.wetDist,
    coastDist: P.coastDist,
    failedLinks: P.failedLinks || [],
    stats: { hmax, flowerCells, pathFailed: net.failed, nodes: net.nodes, rivers: T.rivers.length, lakes: T.lakes.length, falls: T.falls.length, pois: pois.length, micro: micro.length, items: flora.ids.length, spawners: spawners.length },
    timings: tm,
  };
}
