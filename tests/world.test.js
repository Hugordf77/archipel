// Génération du monde (v2) : placement des îles, plan d'île déterministe, eau, lieux,
// chemins, identifiants, budget du Worker, migration et statistiques sur 1 000 îles.
import { describe, it, expect, vi } from 'vitest';

const SEED = 'coquille-azur-4821';
const SEEDS = [SEED, 'ancre-nacre-2203', 'galet-opale-7777', 'brume-aube-1001', 'embrun-ambre-5555'];
const WRECKS = new Set(['epave', 'epave_geante', 'barque_echouee', 'cimetiere_bateaux']);
const BUILDINGS = new Set(['maison', 'moulin', 'moulin_eau', 'phare', 'tour_guet', 'temple', 'cabane', 'observatoire']);

// module « neuf » (caches vides) : le résultat ne doit pas dépendre de l'historique
async function fresh(path) {
  vi.resetModules();
  return import(path);
}

const ring = (n) => {
  const out = [];
  for (let rx = -n; rx < n; rx++) for (let rz = -n; rz < n; rz++) out.push([rx, rz]);
  return out;
};

const hash = (arr) => {
  let h = 2166136261;
  const u = new Uint32Array(arr.buffer, arr.byteOffset, arr.byteLength >> 2);
  for (let i = 0; i < u.length; i++) h = Math.imul(h ^ u[i], 16777619);
  return h >>> 0;
};
const digest = (p) => [hash(p.H), hash(p.Z), hash(p.C), hash(p.items), hash(p.ids), JSON.stringify(p.pois), JSON.stringify(p.pathParts), JSON.stringify(p.micro), JSON.stringify(p.spawners), p.paths.map((q) => hash(q.pts)).join(','), p.rivers.map((q) => hash(q.pts)).join(','), p.name].join('|');

// plans mis en commun entre les tests (construits une fois)
let shared = null;
async function samplePlans() {
  if (shared) return shared;
  const { islandsInRange } = await import('../src/world/regions.js');
  const { buildPlan } = await import('../src/world/gen/plan.js');
  const descs = [SEED, 'ancre-nacre-2203'].flatMap((s) => islandsInRange(s, 0, 0, 4000));
  shared = descs.map((d) => ({ d, p: buildPlan(d) }));
  return shared;
}

describe('placement des îles', () => {
  it('est déterministe sur 200 régions, quel que soit l’ordre des requêtes', async () => {
    const regions = ring(8).slice(0, 200);
    const a = await fresh('../src/world/regions.js');
    const first = regions.map(([x, z]) => a.regionIslands(SEED, x, z));
    const b = await fresh('../src/world/regions.js');
    const second = regions.slice().reverse().map(([x, z]) => b.regionIslands(SEED, x, z)).reverse();
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    const other = regions.map(([x, z]) => b.regionIslands('perle-lune-1234', x, z));
    expect(JSON.stringify(other)).not.toBe(JSON.stringify(first));
  });

  it('espace les îles, respecte leur taille et la zone libre autour du départ', async () => {
    const { islandsInRange, HOME_CLEAR, minGap } = await fresh('../src/world/regions.js');
    const list = islandsInRange(SEED, 0, 0, 4000);
    expect(list.length).toBeGreaterThan(100);
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      expect(a.r * 2).toBeGreaterThanOrEqual(60);
      expect(a.r * 2).toBeLessThanOrEqual(a.big ? 480 : 260);
      if (!a.guaranteed) expect(Math.hypot(a.x, a.z)).toBeGreaterThanOrEqual(HOME_CLEAR);
      for (let j = i + 1; j < list.length; j++) expect(Math.hypot(a.x - list[j].x, a.z - list[j].z)).toBeGreaterThanOrEqual(minGap(a, list[j]) - 1e-6);
    }
  });

  it('garantit trois îles de biomes différents entre 300 et 600 m, dont un village', async () => {
    const { guaranteedIslands, seedInt } = await fresh('../src/world/regions.js');
    for (const seed of SEEDS.slice(0, 3)) {
      const near = guaranteedIslands(seedInt(seed)).filter((i) => i.dist <= 600);
      expect(near).toHaveLength(3);
      expect(new Set(near.map((i) => i.biome)).size).toBe(3);
      for (const i of near) expect(i.dist).toBeGreaterThanOrEqual(300);
      expect(near.some((i) => i.forceArchetype === 'village')).toBe(true);
    }
  });

  it('place les 8 biomes à moins de 6 km', async () => {
    const { islandsInRange } = await fresh('../src/world/regions.js');
    const { BIOME_IDS } = await import('../src/world/biomes.js');
    for (const seed of SEEDS.slice(0, 3)) {
      const found = new Set(islandsInRange(seed, 0, 0, 6000).map((i) => i.biome));
      for (const b of BIOME_IDS) expect(found.has(b), `${b} absent (graine ${seed})`).toBe(true);
    }
  });

  it('nomme chaque île d’après son archétype, en bon français', async () => {
    const { islandsInRange } = await fresh('../src/world/regions.js');
    for (const i of islandsInRange(SEED, 0, 0, 4000)) {
      expect(i.name).toMatch(/^[A-ZÉÎ]/);
      expect(i.name, i.name).not.toMatch(/\bde [AEIOUÉÎ]|\bde le\b|\bde les\b/);
    }
  });
});

describe('plan d’île', () => {
  it('est identique sur 200 îles, modules rechargés à neuf et requêtes en ordre inverse', async () => {
    const R = await fresh('../src/world/regions.js');
    const descs = R.islandsInRange(SEED, 0, 0, 6000).slice(0, 200);
    expect(descs).toHaveLength(200);
    const A = await fresh('../src/world/gen/plan.js');
    const first = descs.map((d) => digest(A.buildPlan(d)));
    const B = await fresh('../src/world/gen/plan.js');
    const second = descs.slice().reverse().map((d) => digest(B.buildPlan(d))).reverse();
    first.forEach((f, i) => expect(second[i], descs[i].id).toBe(f));
  }, 60000);

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
    const { Z } = await import('../src/world/gen/zones.js');
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
    const { Surface } = await import('../src/world/gen/surface.js');
    let n = 0;
    let steep = 0;
    for (const { p } of (await samplePlans()).slice(0, 150)) {
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
    expect(n).toBeGreaterThan(100);
    expect(steep / n).toBeLessThan(0.03);
  });

  it('installe le moulin à vent sur un point haut et dégagé', async () => {
    const { Z } = await import('../src/world/gen/zones.js');
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
    expect(ranks.length).toBeGreaterThan(30);
    expect(ranks[0]).toBeGreaterThan(0.35); // jamais dans le tiers le plus bas
    expect(ranks[Math.floor(ranks.length * 0.1)]).toBeGreaterThan(0.6); // 90 % dans les 40 % les plus hauts
    expect(ranks[ranks.length >> 1]).toBeGreaterThan(0.85);
  });

  it('bâtit chaque village près d’une anse, avec sa jetée et ses barques', async () => {
    const { bilinear } = await import('../src/world/gen/grid.js');
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
    expect(n).toBeGreaterThan(20);
  });
});

describe('chemins', () => {
  it('relient tous les points d’intérêt à l’accostage (sauf les îlots qu’on visite en barque)', async () => {
    let boat = 0;
    let total = 0;
    for (const { d, p } of await samplePlans()) {
      expect(p.failedLinks, d.id).toEqual([]);
      expect(p.stats.pathFailed).toBe(0);
      total += p.pois.length;
      boat += p.pois.filter((q) => q.byBoat).length;
      if (p.pois.length > 1) expect(p.paths.length, d.id).toBeGreaterThan(0);
    }
    expect(boat / total).toBeLessThan(0.02);
  });
});

describe('identifiants', () => {
  it('sont stables et uniques (arbres, lieux, petite végétation des tuiles)', async () => {
    const { islandsInRange } = await import('../src/world/regions.js');
    const { buildPlan } = await fresh('../src/world/gen/plan.js');
    const { Surface, buildTile, TILE } = await import('../src/world/gen/surface.js');
    const d = islandsInRange(SEED, 0, 0, 3000).sort((a, b) => b.r - a.r)[0];
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
  it('construit plan + LOD1 en moins de 60 ms en moyenne, 120 ms pour une grande île, une tuile en moins de 15 ms', async () => {
    const { islandsInRange } = await import('../src/world/regions.js');
    const { buildPlan } = await import('../src/world/gen/plan.js');
    const { Surface, buildLOD1, buildTile, TILE } = await import('../src/world/gen/surface.js');
    const all = islandsInRange(SEED, 0, 0, 6000);
    for (const d of all.slice(0, 10)) buildLOD1(buildPlan(d)); // chauffe du compilateur
    const time = (d) => {
      const t0 = performance.now();
      buildLOD1(buildPlan({ ...d, id: `${d.id}-bench` }));
      return performance.now() - t0;
    };
    const sample = all.filter((_, i) => i % 4 === 0).map(time);
    const big = all.filter((d) => d.big).map(time);
    const avg = sample.reduce((a, b) => a + b, 0) / sample.length;
    const bigAvg = big.reduce((a, b) => a + b, 0) / big.length;
    // tuiles de la plus grande île
    const p = buildPlan(all.slice().sort((a, b) => b.r - a.r)[0]);
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
    console.info(`Worker : plan + LOD1 moyenne ${avg.toFixed(1)} ms (${sample.length} îles), grandes îles ${bigAvg.toFixed(1)} ms (pire ${Math.max(...big).toFixed(1)}), tuile médiane ${tiles[tiles.length >> 1].toFixed(1)} ms, p95 ${tiles[Math.floor(tiles.length * 0.95)].toFixed(1)} ms`);
    expect(avg).toBeLessThan(60);
    expect(bigAvg).toBeLessThan(120);
    expect(tiles[Math.floor(tiles.length * 0.95)]).toBeLessThan(15);
  }, 60000);
});

describe('migration', () => {
  it('vide récoltes et terrassements d’une sauvegarde de l’ancien générateur et rattache le journal', async () => {
    const { migrate, relinkDiscoveries } = await import('../src/game/state.js');
    const { GEN_VERSION, islandsInRange } = await import('../src/world/regions.js');
    const target = islandsInRange(SEED, 0, 0, 2000)[0];
    const old = {
      version: 2,
      world: { seed: SEED, name: 'Vieux monde', createdAt: 1 },
      harvest: { '3_4_0': { 12: 1 } },
      terra: { '3_4_0': { '5,6': -1 } },
      explorer: { islands: { ancienne: { name: 'Île des Brises', x: Math.round(target.x) + 20, z: Math.round(target.z) - 10, firstSeen: 5, visited: true } } },
    };
    const s = migrate(old);
    expect(s.harvest).toEqual({});
    expect(s.terra).toEqual({});
    expect(relinkDiscoveries(s)).toBe(true);
    expect(s.world.genVersion).toBe(GEN_VERSION);
    const rec = s.explorer.islands[target.id];
    expect(rec).toBeTruthy();
    expect(rec.name).toBe(target.name);
    expect(rec.visited).toBe(true);
    expect(rec.archetype).toBe(target.archetype);
    // une seconde passe ne change plus rien
    expect(relinkDiscoveries(s)).toBe(false);
    // une sauvegarde à jour garde ses récoltes
    const cur = migrate({ ...old, world: { ...old.world, genVersion: GEN_VERSION } });
    expect(cur.harvest).toEqual(old.harvest);
    expect(cur.terra).toEqual(old.terra);
  });
});

describe('statistiques sur 1 000 îles à moins de 6 km', () => {
  it('atteint les cibles de richesse', async () => {
    const { islandsInRange, NEIGHBOR_RANGE } = await fresh('../src/world/regions.js');
    const { buildPlan } = await fresh('../src/world/gen/plan.js');
    const rows = [];
    let dup = 0;
    for (const seed of SEEDS) {
      const list = islandsInRange(seed, 0, 0, 6000);
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (list[i].archetype === list[j].archetype && Math.hypot(list[i].x - list[j].x, list[i].z - list[j].z) <= NEIGHBOR_RANGE) dup++;
      for (const d of list) {
        if (rows.length >= 1000) break;
        const p = buildPlan(d);
        const types = p.pois.map((q) => q.type);
        rows.push({ diam: d.r * 2, biome: d.biome, pois: p.pois.length, types, hmax: p.stats.hmax, flowerArea: p.stats.flowerCells * p.s * p.s, animals: p.spawners.length, rivers: p.rivers.length });
      }
      if (rows.length >= 1000) break;
    }
    expect(rows).toHaveLength(1000);
    const share = (list, f) => list.filter(f).length / list.length;
    const medium = rows.filter((r) => r.diam >= 100); // îles moyennes et grandes
    const meadows = rows.filter((r) => r.biome === 'prairie');
    const stats = {
      unLieu: share(rows, (r) => r.pois >= 1),
      quatreLieux: share(rows.filter((r) => r.diam > 120), (r) => r.pois >= 4),
      villages: share(medium, (r) => r.types.includes('village')),
      plus60m: share(rows, (r) => r.hmax > 60),
      plus100m: share(rows, (r) => r.hmax > 100),
      // champ de fleurs : au moins 200 m² en zone fleurie (une tache de 14 × 14 m)
      fleurs: share(meadows, (r) => r.flowerArea >= 200),
      epaves: share(rows, (r) => r.types.some((t) => WRECKS.has(t))),
      animaux: share(rows.filter((r) => r.diam > 80), (r) => r.animals > 0),
      rivieres: share(rows.filter((r) => r.diam > 150), (r) => r.rivers > 0),
    };
    console.info('statistiques sur 1 000 îles :', Object.entries(stats).map(([k, v]) => `${k} ${(v * 100).toFixed(1)} %`).join(', '), `· doublons voisins ${dup}`);
    expect(stats.unLieu).toBe(1);
    expect(stats.quatreLieux).toBe(1);
    expect(stats.villages).toBeGreaterThanOrEqual(0.12);
    expect(stats.villages).toBeLessThanOrEqual(0.2);
    expect(stats.plus60m).toBeGreaterThanOrEqual(0.1);
    expect(stats.plus100m).toBeGreaterThanOrEqual(0.02);
    expect(stats.fleurs).toBeGreaterThanOrEqual(0.5);
    expect(stats.epaves).toBeGreaterThanOrEqual(0.25);
    expect(stats.animaux).toBe(1);
    expect(stats.rivieres).toBeGreaterThanOrEqual(0.3);
    expect(dup).toBe(0);
  }, 120000);
});

describe('fenêtre de profondeur', () => {
  it('encode les hauteurs en demi-flottants', async () => {
    const { toHalf, halfToFloat } = await import('../src/world/gen/surface.js');
    expect(toHalf(0)).toBe(0);
    expect(toHalf(1)).toBe(0x3c00);
    expect(toHalf(-2)).toBe(0xc000);
    expect(toHalf(0.5)).toBe(0x3800);
    expect(halfToFloat(toHalf(-12.5))).toBeCloseTo(-12.5, 2);
  });
});
