// Plan d'île (Worker) : enchaîne toutes les passes et renvoie une description complète et
// déterministe — relief, eau douce, zones, végétation ; et, pour une île qui décrit ses lieux
// (desc.lieux, voir pois.js), lieux, chemins, petites découvertes et faune. Aucune île du jeu n'en
// décrit encore (étape « bases » : leurs listes restent vides). Le plan garde aussi le biome (B) et
// la zone de l'île (ZI) de chaque case.
import { buildTerrain } from './terrain.js';
import { computeZonesForme, zoneColors, Z } from './zones.js';
import { placePOIs, placeMicro, applyStamps, traitsLieux, poserLieux } from './pois.js';
import { buildPaths } from './paths.js';
import { sealLakes } from './hydro.js';
import { placeFloraForme } from './flora.js';
import { placeSpawners } from './spawns.js';
import { slopeAt } from './grid.js';

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
  const lieux = desc.lieux || null;
  const traits = { windAngle: ((desc.seed % 6283) / 1000), bloom: 'rose', ...(lieux ? traitsLieux(lieux) : {}) };
  const P = {
    desc, ctx: T.ctx, traits,
    H: T.H, n: T.n, s: T.s, ext: T.ext, water: T.water, lakes: T.lakes, rivers: T.rivers, falls: T.falls, hmax: T.hmax,
  };
  Object.assign(P, computeZonesForme(T, desc));
  lap('zones');
  let pois = [];
  let net = null;
  if (lieux) {
    // plage d'arrivée prévue (repère de l'île) : celle de la description, sinon face au départ
    const a = Math.atan2(-desc.z, -desc.x);
    P.accostage = lieux.accostage ? { x: lieux.accostage[0], z: lieux.accostage[1] } : { x: Math.cos(a) * desc.r, z: Math.sin(a) * desc.r };
    pois = placePOIs(P);
  }
  // lieux posés à la main (desc.poses), aplanis avec ceux du tirage
  if (desc.poses) pois.push(...poserLieux(P));
  if (lieux || desc.poses) {
    applyStamps(P);
    lap('lieux');
  }
  if (lieux) net = buildPaths(P, pois);
  const rim = sealLakes(P.H, P.n, P.lakes, P.water);
  // pentes à jour après aplanissement et chemins (la végétation en dépend)
  for (let j = 0; j < P.n; j++) for (let i = 0; i < P.n; i++) P.slope[j * P.n + i] = slopeAt(P.H, P.n, P.s, i, j);
  lap('chemins');
  const { C, A } = zoneColors(P, desc);
  // pas de relief fin sur les plates-formes ni sur les chemins
  if (P.stamps) {
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
  }
  if (net) for (let k = 0; k < A.length; k++) if (net.pathMask[k]) A[k] = Math.min(A[k], 4);
  for (const k of rim) A[k] = 0;
  P.A = A;
  lap('couleurs');
  const micro = lieux ? placeMicro(P, pois) : [];
  const paths = net ? net.paths : [];
  const flora = placeFloraForme(P, pois, paths);
  lap('végétation');
  const spawners = lieux ? placeSpawners(P, pois) : [];
  lap('faune');
  let flowerCells = 0;
  for (let k = 0; k < P.zone.length; k++) if (P.zone[k] === Z.FLEURS) flowerCells++;
  let hmax = 0;
  for (let k = 0; k < P.H.length; k++) hmax = Math.max(hmax, P.H[k]);
  return {
    id: desc.id,
    seed: desc.seed,
    archetype: 'forme',
    biome: desc.biome,
    name: desc.name,
    // vrai si l'île décrit ses lieux : lieux, chemins et petite végétation des tuiles (surface.js)
    lieux: !!lieux,
    n: P.n,
    s: P.s,
    ext: P.ext,
    H: P.H,
    A,
    Z: P.zone,
    C,
    B: P.B,
    ZI: P.ZI,
    zones: T.ctx.zones.map((z) => z.id),
    rivers: T.rivers.map((rv) => ({ id: rv.id, end: rv.end, pts: Float32Array.from(rv.pts) })),
    lakes: T.lakes.map((L) => ({ id: L.id, level: L.level, cells: L.cells, box: L.box, area: L.area })),
    falls: T.falls,
    pois,
    micro,
    paths: paths.map((p) => ({ ...p, pts: Float32Array.from(p.pts) })),
    pathParts: net ? net.parts : [],
    landing: net ? net.landing : null,
    items: flora.items,
    ids: flora.ids,
    spawners,
    traits,
    // distances (m) à l'eau douce et à la mer sur la grille de 4 m : carte d'herbe des tuiles
    // (restent dans le cache du Worker, comme H et C)
    wetDist: P.wetDist,
    coastDist: P.coastDist,
    failedLinks: P.failedLinks || [],
    stats: { hmax, flowerCells, pathFailed: net ? net.failed : 0, nodes: net ? net.nodes : 0, rivers: T.rivers.length, lakes: T.lakes.length, falls: T.falls.length, pois: pois.length, micro: micro.length, items: flora.ids.length, spawners: spawners.length },
    timings: tm,
  };
}
