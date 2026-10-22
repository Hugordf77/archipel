// Worker de génération (v2) : plans d'îles en cache, maillages LOD1 / LOD2, tuiles
// au mètre (LOD0) et fenêtre de profondeur. Les tableaux sont transférés au fil principal.
import { buildPlan } from './gen/plan.js';
import { Surface, buildLOD1, buildLOD2, buildTile, buildDepthWindow } from './gen/surface.js';
import { buildFarVeg } from './farveg.js';
import { BIOMES } from './biomes.js';
import { cropPlan } from './gen/sections.js';
import { GEN_VERSION, ILE_BY_ID } from './regions.js';

const plans = new Map();
// plans des grandes îles entières : gardés tant que le Worker vit (leurs sections s'y taillent)
const parents = new Map();
const keyOf = (d) => `${d.id}:${d.seed}:${GEN_VERSION}`;
function planOf(desc) {
  const key = keyOf(desc);
  let p = plans.get(key);
  if (p) {
    plans.delete(key);
    plans.set(key, p);
    return p;
  }
  if (desc.parent) {
    let whole = parents.get(desc.parent);
    if (!whole) parents.set(desc.parent, (whole = buildPlan(ILE_BY_ID.get(desc.parent))));
    p = cropPlan(whole, desc);
  } else p = buildPlan(desc);
  plans.set(key, p);
  // assez large pour toutes les îles en LOD1 (≤ 600 m) : une tuile ne doit jamais reconstruire son plan
  if (plans.size > 40) plans.delete(plans.keys().next().value);
  return p;
}

const views = (o, out = []) => {
  for (const v of Object.values(o)) if (ArrayBuffer.isView(v)) out.push(v.buffer);
  return out;
};

// ce que le jeu doit connaître du plan (copies : le cache du Worker garde les originaux)
function publicPlan(p) {
  return {
    n: p.n, s: p.s, ext: p.ext, seed: p.seed, core: p.core, tmax: p.tmax, ox: p.ox, oz: p.oz, zones: p.zones, archetype: p.archetype, traits: p.traits, stats: p.stats, timings: p.timings,
    H: p.H.slice(), A: p.A.slice(), Z: p.Z.slice(),
    rivers: p.rivers.map((rv) => ({ id: rv.id, end: rv.end, pts: rv.pts.slice() })),
    lakes: p.lakes.map((L) => ({ id: L.id, level: L.level, cells: L.cells.slice(), box: L.box, area: L.area })),
    falls: p.falls, pois: p.pois, micro: p.micro, pathParts: p.pathParts, landing: p.landing, spawners: p.spawners,
    paths: p.paths.map((q) => ({ w: q.w, kind: q.kind, pts: q.pts.slice() })),
    items: p.items.slice(), ids: p.ids.slice(),
  };
}

self.onmessage = (e) => {
  const m = e.data;
  const t0 = performance.now();
  try {
    if (m.type === 'island') {
      let out;
      if (m.lod === 2) out = { mesh: buildLOD2(m.desc, m.desc.parent ? ILE_BY_ID.get(m.desc.parent) : null) };
      else {
        const p = planOf(m.desc);
        const mesh = buildLOD1(p);
        out = { mesh, far: buildFarVeg(p.items, BIOMES[m.desc.biome].pal), plan: publicPlan(p) };
      }
      out.type = 'island';
      out.id = m.desc.id;
      out.lod = m.lod;
      out.req = m.req;
      out.ms = performance.now() - t0;
      const list = views(out.mesh);
      if (out.far) views(out.far, list);
      if (out.plan) {
        const pp = out.plan;
        list.push(pp.H.buffer, pp.A.buffer, pp.Z.buffer, pp.items.buffer, pp.ids.buffer);
        for (const rv of pp.rivers) list.push(rv.pts.buffer);
        for (const L of pp.lakes) list.push(L.cells.buffer);
        for (const q of pp.paths) list.push(q.pts.buffer);
      }
      self.postMessage(out, list);
    } else if (m.type === 'tile') {
      const hit = plans.has(keyOf(m.desc));
      const p = planOf(m.desc);
      const tp = performance.now();
      const surf = m.terra && Object.keys(m.terra).length ? new Surface(p, m.terra) : (p._surf ||= new Surface(p));
      const tile = buildTile(p, surf, m.tx, m.tz);
      const list = views(tile);
      for (const gq of tile.groups) list.push(gq.offs.buffer, gq.mats.buffer, gq.cols.buffer);
      // carte d'herbe (RGBA par sommet) : déjà relevée par views() ; jamais deux fois dans la liste
      if (!list.includes(tile.herbe.buffer)) list.push(tile.herbe.buffer);
      self.postMessage({ type: 'tile', id: m.desc.id, req: m.req, tile, ms: performance.now() - tp, planMs: hit ? 0 : tp - t0 }, list);
    } else if (m.type === 'depth') {
      const data = buildDepthWindow(m.islands, m.cx, m.cz, m.size, m.res, (d) => plans.get(keyOf(d)), (d) => ILE_BY_ID.get(d.parent));
      self.postMessage({ type: 'depth', req: m.req, data, cx: m.cx, cz: m.cz, size: m.size, res: m.res, ms: performance.now() - t0 }, [data.buffer]);
    }
  } catch (err) {
    self.postMessage({ type: 'error', req: m.req, id: m.desc?.id, lod: m.lod, tx: m.tx, tz: m.tz, message: String(err && err.stack ? err.stack : err) });
  }
};
