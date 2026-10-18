// Monde fini (v3) : l'archipel (neuf îles fixes), la limite du large, la migration v3, puis la
// chaîne de génération éprouvée sur les îles de l'archipel et des variantes (graines, tailles) :
// plan déterministe, eau, lieux, chemins, identifiants, budget du Worker.
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';

const ARCHETYPES9 = ['village', 'montagne', 'foret', 'fleurs', 'lagon', 'dunes', 'falaises', 'cratere', 'curiosite'];
const BUILDINGS = new Set(['maison', 'moulin', 'moulin_eau', 'phare', 'tour_guet', 'temple', 'cabane', 'observatoire']);

// module « neuf » (caches vides) : le résultat ne doit pas dépendre de l'historique
async function fresh(path) {
  vi.resetModules();
  return import(path);
}

const hash = (arr) => {
  let h = 2166136261;
  const u = new Uint32Array(arr.buffer, arr.byteOffset, arr.byteLength >> 2);
  for (let i = 0; i < u.length; i++) h = Math.imul(h ^ u[i], 16777619);
  return h >>> 0;
};
const digest = (p) => [hash(p.H), hash(p.Z), hash(p.C), hash(p.items), hash(p.ids), JSON.stringify(p.pois), JSON.stringify(p.pathParts), JSON.stringify(p.micro), JSON.stringify(p.spawners), p.paths.map((q) => hash(q.pts)).join(','), p.rivers.map((q) => hash(q.pts)).join(','), p.name].join('|');

// îles de l'archipel et cinq variantes de chacune (autre graine, autre taille) : la chaîne
// doit rester saine si l'on retouche une île à la main
let shared = null;
async function samplePlans() {
  if (shared) return shared;
  const { ARCHIPEL } = await import('../src/world/archipel.js');
  const { islandDesc } = await import('../src/world/islands/regions.js');
  const { buildPlan } = await import('../src/world/islands/gen/plan.js');
  const descs = ARCHIPEL.islands.flatMap((isl) => Array.from({ length: 6 }, (_, k) => islandDesc({ ...isl, id: k ? `${isl.id}~${k}` : isl.id, seed: (isl.seed + k * 7919) >>> 0, r: Math.round(isl.r * (k ? 0.85 + 0.06 * k : 1)) })));
  shared = descs.map((d) => ({ d, p: buildPlan(d) }));
  return shared;
}

describe('archipel', () => {
  it('compte neuf îles, une par archétype, aux identifiants stables, dans l’emprise', async () => {
    const { ARCHIPEL } = await import('../src/world/archipel.js');
    const { ISLANDS } = await import('../src/world/islands/regions.js');
    const B = ARCHIPEL.bounds;
    expect(ISLANDS).toHaveLength(9);
    expect(ISLANDS.map((d) => d.archetype).sort()).toEqual([...ARCHETYPES9].sort());
    expect(new Set(ISLANDS.map((d) => d.id)).size).toBe(9);
    for (const d of ISLANDS) {
      expect(d.id).toMatch(/^[a-z]+(-[a-z]+)+$/);
      expect(d.name).toMatch(/^[A-ZÉÎ]/);
      expect(d.x - d.r).toBeGreaterThan(B.minX);
      expect(d.x + d.r).toBeLessThan(B.maxX);
      expect(d.z - d.r).toBeGreaterThan(B.minZ);
      expect(d.z + d.r).toBeLessThan(B.maxZ);
      // toute l'île reste en deçà de la brume du large
      expect(Math.hypot(d.x, d.z) + d.r).toBeLessThan(ARCHIPEL.limit.mist);
    }
    expect(B.maxX - B.minX).toBe(2400);
    expect(B.maxZ - B.minZ).toBe(2400);
  });

  it('espace les îles (250 m au moins, sans chevauchement) et dégage 300 m autour du départ', async () => {
    const { ISLANDS } = await import('../src/world/islands/regions.js');
    for (let i = 0; i < ISLANDS.length; i++) {
      const a = ISLANDS[i];
      expect(Math.hypot(a.x, a.z), a.id).toBeGreaterThanOrEqual(300);
      for (let j = i + 1; j < ISLANDS.length; j++) {
        const b = ISLANDS[j];
        const d = Math.hypot(a.x - b.x, a.z - b.z);
        expect(d, `${a.id} / ${b.id}`).toBeGreaterThanOrEqual(250);
        expect(d, `${a.id} / ${b.id}`).toBeGreaterThan(a.r + b.r + 90);
      }
    }
  });

  it('montre au moins deux îles depuis le bout du ponton', async () => {
    const { ISLANDS } = await import('../src/world/islands/regions.js');
    const { LAYOUT } = await import('../src/world/home/terrain.js');
    const P = LAYOUT.pier;
    const seen = ISLANDS.filter((d) => {
      const dx = d.x - P.x;
      const dz = d.z - P.z1;
      // devant le ponton (vers +z), à portée de vue
      return Math.hypot(dx, dz) < 700 && Math.abs(Math.atan2(dx, dz)) < Math.PI / 3;
    });
    expect(seen.length).toBeGreaterThanOrEqual(2);
  });

  it('donne à chaque île un plan déterministe, avec les lieux de son archétype', async () => {
    const { ISLANDS } = await import('../src/world/islands/regions.js');
    const A = await fresh('../src/world/islands/gen/plan.js');
    const first = ISLANDS.map((d) => digest(A.buildPlan(d)));
    const B = await fresh('../src/world/islands/gen/plan.js');
    const plans = ISLANDS.slice().reverse().map((d) => B.buildPlan(d)).reverse();
    plans.forEach((p, i) => expect(digest(p), ISLANDS[i].id).toBe(first[i]));
    const types = Object.fromEntries(ISLANDS.map((d, i) => [d.archetype, plans[i].pois.map((q) => q.type)]));
    expect(types.village).toEqual(expect.arrayContaining(['village', 'moulin_vent']));
    expect(types.falaises).toContain('phare');
    expect(types.fleurs).toEqual(expect.arrayContaining(['rucher', 'arche_fleurie']));
    expect(types.foret).toContain('arbre_geant');
    expect(types.cratere).toContain('sources_chaudes');
    expect(types.dunes).toContain('oasis');
    expect(types.lagon).toContain('recif');
    expect(types.curiosite).toContain('arche');
    expect(plans[ISLANDS.findIndex((d) => d.archetype === 'montagne')].stats.hmax).toBeGreaterThan(80);
  });

  it('applique les retouches à la main : lieux interdits et lieux imposés', async () => {
    const { ARCHIPEL } = await import('../src/world/archipel.js');
    const { islandDesc } = await import('../src/world/islands/regions.js');
    const { buildPlan } = await import('../src/world/islands/gen/plan.js');
    const cliffs = ARCHIPEL.islands.find((i) => i.archetype === 'falaises');
    const sans = buildPlan(islandDesc({ ...cliffs, overrides: { ...cliffs.overrides, pois: [], removePois: ['phare'] } }));
    expect(sans.pois.map((q) => q.type)).not.toContain('phare');
    const forest = ARCHIPEL.islands.find((i) => i.archetype === 'foret');
    const avec = buildPlan(islandDesc({ ...forest, overrides: { pois: ['puits_isole'] } }));
    expect(avec.pois.map((q) => q.type)).toContain('puits_isole');
    // le nom imposé l'emporte
    expect(islandDesc({ ...forest, overrides: { name: 'Bois Joli' } }).name).toBe('Bois Joli');
  });

  it('place les éléments de la mer en eau libre, à positions fixes et identifiants uniques', async () => {
    const { ARCHIPEL } = await import('../src/world/archipel.js');
    const { MARINE_TYPES } = await import('../src/models/objets/index.js');
    const ids = new Set();
    for (const m of ARCHIPEL.marine) {
      expect(ids.has(m.id)).toBe(false);
      ids.add(m.id);
      expect(MARINE_TYPES).toContain(m.type);
      expect(Math.hypot(m.x, m.z)).toBeLessThan(ARCHIPEL.limit.mist);
      for (const isl of [...ARCHIPEL.islands, ARCHIPEL.home]) expect(Math.hypot(m.x - isl.x, m.z - isl.z), `${m.id} près de ${isl.id}`).toBeGreaterThan(isl.r * 1.3);
    }
    expect(ARCHIPEL.marine.length).toBeGreaterThanOrEqual(40);
  });
});

describe('limite du monde', () => {
  // bateau réel (Sailing) piloté par une partie factice : plein gaz, barre droite
  async function sail(type, x, z, heading, aboard, seconds) {
    const { Sailing } = await import('../src/entities/Sailing.js');
    const game = {
      state: { boat: { type, owned: [type], x, z, heading } },
      scene: { add() {}, remove() {} },
      ui: { toast() {}, panelOpen: false },
      player: { pos: new THREE.Vector3() },
      weather: null,
      audio: null,
    };
    const s = new Sailing(game);
    s.aboard = aboard;
    const input = { axes: () => ({ x: 0, y: 1 }), held: () => false };
    let far = 0;
    for (let t = 0; t < seconds; t += 1 / 30) {
      s.update(1 / 30, input);
      far = Math.max(far, Math.hypot(s.pos.x, s.pos.z));
    }
    return { d: Math.hypot(s.pos.x, s.pos.z), far, s };
  }

  it('décrit brume, courant et demi-tour selon la distance au centre', async () => {
    const { worldLimit } = await import('../src/world/archipel.js');
    expect(worldLimit(900, 0).pull).toBe(0);
    expect(worldLimit(900, 0).mist).toBe(0);
    expect(worldLimit(0, 1300).pull).toBeGreaterThan(0.3);
    expect(worldLimit(0, 1300).uz).toBeCloseTo(-1);
    expect(worldLimit(1300, 0).turn).toBe(false);
    expect(worldLimit(1000, 1000).turn).toBe(true);
  });

  it('ramène le bateau au-delà de 1,2 km et fait demi-tour au-delà de 1,4 km', async () => {
    // à la dérive, moteur coupé : le courant du large le ramène vers 1,2 km
    const drift = await sail('voilier', 1340, 0, Math.PI / 2, false, 300);
    expect(drift.d).toBeLessThan(1260);
    // plein gaz vers le large : il ne dépasse guère 1,4 km, vire et revient
    const run = await sail('voilier', 1150, 0, Math.PI / 2, true, 150);
    expect(run.far).toBeLessThan(1480);
    expect(run.d).toBeLessThan(1200);
    expect(run.s.uTurn).toBe(false);
  }, 30000);
});

describe('migration v3', () => {
  it('rattache le journal à l’île du même archétype et vide récoltes et terrassements des îles changées', async () => {
    const { migrate, relinkDiscoveries } = await import('../src/core/state.js');
    const { GEN_VERSION, ISLANDS } = await import('../src/world/islands/regions.js');
    const village = ISLANDS.find((d) => d.archetype === 'village');
    const old = {
      version: 2,
      world: { seed: 'coquille-azur-4821', name: 'Vieux monde', createdAt: 1, genVersion: 2 },
      harvest: { '3_4_0': { 12: 1 }, [village.id]: { 7: 1 } },
      terra: { '3_4_0': { '5,6': -1 } },
      marine: { taken: ['marin_x_1_2_0', 'mer-03'] },
      boat: { type: 'barque', owned: ['radeau', 'barque'], x: 4800, z: -2200, heading: 1 },
      explorer: {
        islands: {
          '3_4_0': { name: 'Île du Moulin Bleu', archetype: 'village', x: 1900, z: 700, t: 5, visited: true },
          '9_1_0': { name: 'Bourg-Nacre', archetype: 'village', x: 300, z: 300, t: 9 },
          '-2_2_0': { name: 'Les Sœurs Jumelles', archetype: 'jumelles', x: -900, z: 900, t: 7 },
        },
        fog: { '0,0': 'f'.repeat(64), '9,9': 'f'.repeat(64) },
        pins: [{ x: 10, z: 20 }, { x: 5000, z: 0 }],
        pois: { 123: { name: 'Moulin', island: '3_4_0', x: 1, z: 2 } },
      },
    };
    const s = migrate(old);
    // seules les îles inchangées gardent leurs récoltes (ici, aucune île v2 ne subsiste)
    expect(s.harvest).toEqual({ [village.id]: { 7: 1 } });
    expect(s.terra).toEqual({});
    expect(s.marine.taken).toEqual(['mer-03']);
    expect(s.boat.x).toBe(null);
    expect(Object.keys(s.explorer.fog)).toEqual(['0,0']);
    expect(s.explorer.pins).toEqual([{ x: 10, z: 20 }]);
    expect(s.explorer.pois).toEqual({});
    expect(relinkDiscoveries(s)).toBe(true);
    expect(s.world.genVersion).toBe(GEN_VERSION);
    // deux villages notés : le plus ancien prend le village de l'archipel ; les jumelles n'ont pas d'équivalent
    expect(Object.keys(s.explorer.islands)).toEqual([village.id]);
    const rec = s.explorer.islands[village.id];
    expect(rec.name).toBe(village.name);
    expect(rec.visited).toBe(true);
    expect(rec.x).toBe(Math.round(village.x));
    // une seconde passe ne change plus rien
    expect(relinkDiscoveries(s)).toBe(false);
    // une sauvegarde à jour garde ses récoltes
    const cur = migrate({ ...old, world: { ...old.world, genVersion: GEN_VERSION } });
    expect(cur.harvest).toEqual(old.harvest);
    expect(cur.terra).toEqual(old.terra);
  });
});

describe('plan d’île', () => {
  it('garde tous les éléments dans l’emprise de leur île', async () => {
    for (const { d, p } of await samplePlans()) {
      for (const q of [...p.pois.flatMap((x) => x.parts), ...p.pathParts, ...p.micro]) {
        expect(Math.hypot(q.x, q.z), `${d.id} ${q.t}`).toBeLessThan(p.ext + 5);
        expect(Number.isFinite(q.y ?? 0)).toBe(true);
      }
    }
  });
});

describe('eau douce', () => {
  it('fait toujours descendre les rivières jusqu’à la mer, un lac ou un confluent', async () => {
    let n = 0;
    for (const { d, p } of await samplePlans()) {
      for (const rv of p.rivers) {
        n++;
        expect(['mer', 'lac', 'confluent']).toContain(rv.end);
        for (let q = 4; q < rv.pts.length; q += 4) expect(rv.pts[q + 2], `${d.id} rivière ${rv.id}`).toBeLessThanOrEqual(rv.pts[q - 2] + 1e-4);
        const last = rv.pts[rv.pts.length - 2];
        if (rv.end === 'mer') expect(last).toBeLessThan(0.8);
        if (rv.end === 'lac') expect(p.lakes.some((lk) => Math.abs(last - lk.level) < 1.5)).toBe(true);
      }
    }
    expect(n).toBeGreaterThan(50);
  });

  it('ne laisse fuir aucun lac (seule la rivière exutoire descend sous son niveau)', async () => {
    const { Z } = await import('../src/world/islands/gen/zones.js');
    let lakes = 0;
    for (const { d, p } of await samplePlans()) {
      const { H, n } = p;
      for (const lk of p.lakes) {
        lakes++;
        const own = new Set(lk.cells);
        for (const k of lk.cells) {
          for (const q of [k - 1, k + 1, k - n, k + n, k - n - 1, k - n + 1, k + n - 1, k + n + 1]) {
            if (own.has(q) || p.Z[q] === Z.RIVIERE || p.Z[q] === Z.LAC) continue;
            expect(H[q], `${d.id} lac ${lk.id}`).toBeGreaterThanOrEqual(lk.level);
          }
        }
      }
    }
    expect(lakes).toBeGreaterThan(5);
  });
});

describe('points d’intérêt', () => {
  it('ne se chevauchent pas', async () => {
    const SOFT = new Set(['recif', 'epave_immergee', 'rocher_baleine']);
    for (const { d, p } of await samplePlans()) {
      const list = p.pois.filter((q) => q.r > 0 && !SOFT.has(q.type));
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          // le moulin peut se poser en lisière du village : il évite alors la place et chaque maison
          if ((a.type === 'village' && b.type === 'moulin_vent') || (b.type === 'village' && a.type === 'moulin_vent')) {
            const [vil, mill] = a.type === 'village' ? [a, b] : [b, a];
            for (const h of vil.parts.filter((q) => q.t === 'maison')) expect(Math.hypot(h.x - mill.x, h.z - mill.z)).toBeGreaterThan(4 + mill.r);
            continue;
          }
          expect(Math.hypot(a.x - b.x, a.z - b.z), `${d.id} ${a.type}/${b.type}`).toBeGreaterThanOrEqual(a.r + b.r - 0.01);
        }
      }
    }
  });

  it('pose les bâtiments sur un sol aplani (pente maximale respectée)', async () => {
    const { Surface } = await import('../src/world/islands/gen/surface.js');
    let n = 0;
    let steep = 0;
    for (const { p } of await samplePlans()) {
      const surf = new Surface(p);
      for (const q of p.pois.flatMap((x) => x.parts)) {
        if (!BUILDINGS.has(q.t) || (q.y !== undefined && q.y < 0.5)) continue;
        n++;
        const h0 = surf.height(q.x, q.z);
        let worst = 0;
        for (let a = 0; a < 8; a++) worst = Math.max(worst, Math.abs(surf.height(q.x + Math.cos(a * 0.785) * 2, q.z + Math.sin(a * 0.785) * 2) - h0) / 2);
        if (worst > 0.35) steep++;
      }
    }
    expect(n).toBeGreaterThan(60);
    expect(steep / n).toBeLessThan(0.03);
  });

  it('installe le moulin à vent sur un point haut et dégagé', async () => {
    const { Z } = await import('../src/world/islands/gen/zones.js');
    const ranks = [];
    for (const { p } of await samplePlans()) {
      const m = p.pois.find((q) => q.type === 'moulin_vent');
      if (!m) continue;
      const y = m.parts[0].y;
      const land = [];
      for (let k = 0; k < p.H.length; k++) if (p.H[k] > 0.5) land.push(p.H[k]);
      ranks.push(land.filter((h) => h < y).length / land.length);
      const k = Math.round((m.z + p.ext) / p.s) * p.n + Math.round((m.x + p.ext) / p.s);
      expect(p.Z[k]).not.toBe(Z.FORET);
    }
    ranks.sort((a, b) => a - b);
    expect(ranks.length).toBeGreaterThanOrEqual(10);
    expect(ranks[0]).toBeGreaterThan(0.35); // jamais dans le tiers le plus bas
    expect(ranks[ranks.length >> 1]).toBeGreaterThan(0.85);
  });

  it('bâtit chaque village près d’une anse, avec sa jetée et ses barques', async () => {
    const { bilinear } = await import('../src/world/islands/gen/grid.js');
    let n = 0;
    for (const { d, p } of await samplePlans()) {
      const vil = p.pois.find((q) => q.type === 'village');
      if (!vil) continue;
      n++;
      expect(vil.jetty, d.id).toBeTruthy();
      const { x, z, rot, len } = vil.jetty;
      expect(Math.hypot(x - vil.x, z - vil.z), d.id).toBeLessThan(vil.r + 40);
      // la jetée part du rivage et s'avance dans l'eau
      const hAt = (px, pz) => bilinear(p.H, p.n, (px + p.ext) / p.s, (pz + p.ext) / p.s);
      expect(hAt(x, z)).toBeLessThan(1.5);
      expect(hAt(x + Math.cos(rot) * len, z + Math.sin(rot) * len), d.id).toBeLessThan(0);
      expect(vil.parts.filter((q) => q.t === 'maison').length).toBeGreaterThanOrEqual(4);
      expect(vil.parts.some((q) => q.t === 'barque_amarree')).toBe(true);
      const mill = p.pois.some((q) => q.type === 'moulin_vent' || q.type === 'moulin_eau');
      if (d.archetype === 'village') expect(mill, d.id).toBe(true);
    }
    expect(n).toBeGreaterThanOrEqual(6);
  });
});

describe('chemins', () => {
  it('relient les lieux de chaque île de l’archipel à l’accostage', async () => {
    for (const { d, p } of (await samplePlans()).filter(({ d }) => !d.id.includes('~'))) {
      expect(p.failedLinks, d.id).toEqual([]);
      expect(p.stats.pathFailed, d.id).toBe(0);
      expect(p.pois.filter((q) => q.byBoat), d.id).toEqual([]);
      if (p.pois.length > 1) expect(p.paths.length, d.id).toBeGreaterThan(0);
    }
  });

  it('restent sains sur les variantes (îles retouchées)', async () => {
    let boat = 0;
    let total = 0;
    for (const { d, p } of await samplePlans()) {
      expect(p.failedLinks, d.id).toEqual([]);
      expect(p.stats.pathFailed).toBe(0);
      total += p.pois.length;
      boat += p.pois.filter((q) => q.byBoat).length;
    }
    expect(boat / total).toBeLessThan(0.02);
  });
});

describe('identifiants', () => {
  it('sont stables et uniques (arbres, lieux, petite végétation des tuiles)', async () => {
    const { ISLANDS } = await import('../src/world/islands/regions.js');
    const { buildPlan } = await fresh('../src/world/islands/gen/plan.js');
    const { Surface, buildTile, TILE } = await import('../src/world/islands/gen/surface.js');
    const d = ISLANDS.slice().sort((a, b) => b.r - a.r)[0];
    const a = buildPlan(d);
    const b = buildPlan({ ...d });
    expect(hash(b.ids)).toBe(hash(a.ids));
    expect(b.pois.map((q) => q.id)).toEqual(a.pois.map((q) => q.id));
    const seen = new Set(a.ids);
    expect(seen.size).toBe(a.ids.length);
    for (const q of a.pois) {
      expect(seen.has(q.id)).toBe(false);
      seen.add(q.id);
    }
    // les tuiles donnent les mêmes identifiants à chaque construction, sans collision
    const surf = new Surface(a);
    const nt = Math.ceil(a.ext / TILE);
    let small = 0;
    for (let tz = -nt; tz < nt; tz++) {
      for (let tx = -nt; tx < nt; tx++) {
        const t1 = buildTile(a, surf, tx, tz);
        const t2 = buildTile(a, surf, tx, tz);
        expect(hash(t2.ids)).toBe(hash(t1.ids));
        for (const id of t1.ids) {
          expect(seen.has(id)).toBe(false);
          seen.add(id);
          small++;
        }
      }
    }
    expect(small).toBeGreaterThan(1000);
  }, 30000);
});

describe('budget du Worker', () => {
  it('construit plan + LOD1 en moins de 60 ms en moyenne, 120 ms pour la grande île, une tuile en moins de 15 ms', async () => {
    const { ISLANDS } = await import('../src/world/islands/regions.js');
    const { buildPlan } = await import('../src/world/islands/gen/plan.js');
    const { Surface, buildLOD1, buildTile, TILE } = await import('../src/world/islands/gen/surface.js');
    for (const d of ISLANDS) buildLOD1(buildPlan(d)); // chauffe du compilateur
    const time = (d) => {
      const t0 = performance.now();
      buildLOD1(buildPlan({ ...d, id: `${d.id}-bench` }));
      return performance.now() - t0;
    };
    const all = ISLANDS.map(time);
    const big = ISLANDS.filter((d) => d.big).map(time);
    const avg = all.reduce((a, b) => a + b, 0) / all.length;
    // tuiles de la plus grande île
    const p = buildPlan(ISLANDS.slice().sort((a, b) => b.r - a.r)[0]);
    const surf = new Surface(p);
    const nt = Math.ceil(p.ext / TILE);
    const tiles = [];
    for (let tz = -nt; tz < nt; tz++) {
      for (let tx = -nt; tx < nt; tx++) {
        const t0 = performance.now();
        buildTile(p, surf, tx, tz);
        tiles.push(performance.now() - t0);
      }
    }
    tiles.sort((a, b) => a - b);
    console.info(`Worker : plan + LOD1 moyenne ${avg.toFixed(1)} ms (9 îles), grande île ${Math.max(...big).toFixed(1)} ms, tuile médiane ${tiles[tiles.length >> 1].toFixed(1)} ms, p95 ${tiles[Math.floor(tiles.length * 0.95)].toFixed(1)} ms`);
    expect(avg).toBeLessThan(60);
    expect(Math.max(...big)).toBeLessThan(120);
    expect(tiles[Math.floor(tiles.length * 0.95)]).toBeLessThan(15);
  }, 60000);
});

describe('fenêtre de profondeur', () => {
  it('encode les hauteurs en demi-flottants', async () => {
    const { toHalf, halfToFloat } = await import('../src/world/islands/gen/surface.js');
    expect(toHalf(0)).toBe(0);
    expect(toHalf(1)).toBe(0x3c00);
    expect(toHalf(-2)).toBe(0xc000);
    expect(toHalf(0.5)).toBe(0x3800);
    expect(halfToFloat(toHalf(-12.5))).toBeCloseTo(-12.5, 2);
  });
});
